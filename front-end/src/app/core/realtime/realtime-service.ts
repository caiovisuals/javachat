import { Injectable, inject, signal } from '@angular/core'
import { Client, IMessage, ReconnectionTimeMode, StompSubscription } from '@stomp/stompjs'
import { Observable, Subject, firstValueFrom } from 'rxjs'

import { environment } from '../../../environments/environment'
import { AuthService } from '../auth/auth-service'

export type RealtimeState = 'offline' | 'connecting' | 'online'

/**
 * As assinaturas ficam registradas por destino e são refeitas a cada reconexão: quem chamou `watch()` continua recebendo sem saber que o socket caiu
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
    private readonly auth = inject(AuthService)

    private readonly state = signal<RealtimeState>('offline')
    readonly connection = this.state.asReadonly()

    private client?: Client
    private readonly channels = new Map<string, Subject<unknown>>()
    private readonly active = new Map<string, StompSubscription>()

    connect(): void {
        if (this.client) {
            return
        }

        const client = new Client({
            brokerURL: brokerUrl(environment.wsUrl),
            heartbeatIncoming: 10_000,
            heartbeatOutgoing: 10_000,
            // Backoff exponencial com teto: uma API reiniciando não precisa levar uma reconexão por segundo de cada aba aberta
            reconnectDelay: 1_000,
            maxReconnectDelay: 30_000,
            reconnectTimeMode: ReconnectionTimeMode.EXPONENTIAL,
            beforeConnect: async (self) => {
                const token = await this.currentToken()
                if (!token) {
                    // Sem sessão não há o que assinar, insistir só geraria laço de reconexão
                    void self.deactivate()
                    this.state.set('offline')
                    return
                }
                this.state.set('connecting')
                self.connectHeaders = { Authorization: `Bearer ${token}` }
            },
            onConnect: () => {
                this.state.set('online')
                this.active.clear()
                for (const destination of this.channels.keys()) {
                    this.bind(destination)
                }
            },
            onWebSocketClose: () => {
                this.active.clear()
                this.state.set(this.client ? 'connecting' : 'offline')
            },
            onStompError: (frame) => {
                console.error('STOMP', frame.headers['message'], frame.body)
            },
        })

        this.client = client
        client.activate()
    }

    disconnect(): void {
        const client = this.client
        this.client = undefined
        this.active.clear()
        this.channels.forEach((channel) => channel.complete())
        this.channels.clear()
        this.state.set('offline')
        void client?.deactivate()
    }

    /** Fluxo do destino; a assinatura no broker acontece assim que a conexão estiver de pé. */
    watch<T>(destination: string): Observable<T> {
        let channel = this.channels.get(destination)

        if (!channel) {
            channel = new Subject<unknown>()
            this.channels.set(destination, channel)
        }

        this.bind(destination)
        return channel.asObservable() as Observable<T>
    }

    unwatch(destination: string): void {
        this.active.get(destination)?.unsubscribe()
        this.active.delete(destination)
        this.channels.get(destination)?.complete()
        this.channels.delete(destination)
    }

    /**
     * Publica só com o socket de pé
     */
    publish(destination: string, body: unknown): void {
        if (!this.client?.connected) {
            return
        }
        this.client.publish({ destination, body: JSON.stringify(body) })
    }

    private bind(destination: string): void {
        const client = this.client

        if (!client?.connected || this.active.has(destination)) {
            return
        }

        const subscription = client.subscribe(destination, (frame: IMessage) => {
            this.channels.get(destination)?.next(parse(frame))
        })
        this.active.set(destination, subscription)
    }

    private async currentToken(): Promise<string | null> {
        const token = this.auth.accessToken()

        if (token) {
            return token
        }
        
        return firstValueFrom(this.auth.renewAccessToken()).catch(() => null)
    }
}

function brokerUrl(configured: string): string {
    if (/^wss?:\/\//i.test(configured)) {
        return configured
    }

    const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const path = configured.startsWith('/') ? configured : `/${configured}`
    return `${scheme}//${location.host}${path}`
}

function parse(frame: IMessage): unknown {
    try {
        return JSON.parse(frame.body)
    } catch {
        return frame.body
    }
}