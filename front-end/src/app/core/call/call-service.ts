import { HttpClient } from '@angular/common/http'
import { Injectable, computed, inject, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'

import { environment } from '../../../environments/environment'
import { AuthService } from '../auth/auth-service'
import { RealtimeService } from '../realtime/realtime-service'
import { User } from '../user/user.model'
import { CallEndReason, CallMedia, CallSignal, CallStatus, IceServers } from './call.model'

/** Quanto tempo o telefone toca antes de desistir */
const RING_TIMEOUT = 45_000

/** Sem TURN do servidor ainda dá para conectar na mesma rede */
const FALLBACK_ICE: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }]

@Injectable({ providedIn: 'root' })
export class CallService {
    private readonly http = inject(HttpClient)
    private readonly auth = inject(AuthService)
    private readonly realtime = inject(RealtimeService)

    private readonly state = signal<CallStatus>('idle')
    private readonly other = signal<User | null>(null)
    private readonly kind = signal<CallMedia>('audio')
    private readonly localStream = signal<MediaStream | null>(null)
    private readonly remoteStream = signal<MediaStream | null>(null)
    private readonly micEnabled = signal(true)
    private readonly cameraEnabled = signal(true)
    private readonly failure = signal<string | null>(null)
    private readonly elapsed = signal(0)
    private readonly lastReason = signal<CallEndReason>('hangup')

    readonly status = this.state.asReadonly()
    readonly peer = this.other.asReadonly()
    readonly media = this.kind.asReadonly()
    readonly local = this.localStream.asReadonly()
    readonly remote = this.remoteStream.asReadonly()
    readonly micOn = this.micEnabled.asReadonly()
    readonly cameraOn = this.cameraEnabled.asReadonly()
    readonly error = this.failure.asReadonly()
    readonly seconds = this.elapsed.asReadonly()
    readonly endedBecause = this.lastReason.asReadonly()
    readonly onCall = computed(() => this.state() !== 'idle')

    private connection?: RTCPeerConnection
    private callId?: string
    private conversationId?: string
    private incomingOffer?: string
    private queuedCandidates: RTCIceCandidateInit[] = []
    private ringTimer?: ReturnType<typeof setTimeout>
    private tick?: ReturnType<typeof setInterval>
    private listening = false

    /** Passa a aceitar convites de chamada */
    listen(): void {
        if (this.listening) {
            return
        }
        this.listening = true

        this.realtime.watch<CallSignal>('/user/queue/call').subscribe((signal) => {
            void this.onSignal(signal)
        })
    }

    stopListening(): void {
        this.hangup()
        this.listening = false
    }

    async call(conversationId: string, peer: User, media: CallMedia): Promise<void> {
        if (this.state() !== 'idle') {
            return
        }

        this.failure.set(null)
        this.callId = crypto.randomUUID()
        this.conversationId = conversationId
        this.other.set(peer)
        this.kind.set(media)
        this.state.set('dialing')

        try {
            await this.capture(media)
            const connection = await this.openConnection()
            const offer = await connection.createOffer()
            await connection.setLocalDescription(offer)

            this.send({
                type: 'offer',
                callId: this.callId,
                conversationId,
                to: peer.id,
                media,
                sdp: offer.sdp ?? '',
            })
            this.ringTimer = setTimeout(() => this.hangup('unanswered'), RING_TIMEOUT)
        } catch (error) {
            this.fail(error)
        }
    }

    async accept(): Promise<void> {
        const offer = this.incomingOffer
        const peer = this.other()

        if (this.state() !== 'ringing' || !offer || !peer) {
            return
        }
        this.state.set('connecting')

        try {
            await this.capture(this.kind())
            const connection = await this.openConnection()
            await connection.setRemoteDescription({ type: 'offer', sdp: offer })
            await this.drainCandidates()

            const answer = await connection.createAnswer()
            await connection.setLocalDescription(answer)

            this.send({
                type: 'answer',
                callId: this.callId ?? '',
                conversationId: this.conversationId ?? '',
                to: peer.id,
                sdp: answer.sdp ?? '',
            })
        } catch (error) {
            this.fail(error)
        }
    }

    decline(): void {
        this.hangup('declined')
    }

    hangup(reason: CallEndReason = 'hangup'): void {
        const peer = this.other()

        if (this.state() === 'idle') {
            return
        }
        if (peer && this.callId) {
            this.send({
                type: 'hangup',
                callId: this.callId,
                conversationId: this.conversationId ?? '',
                to: peer.id,
                reason,
            })
        }
        this.finish(reason)
    }

    toggleMic(): void {
        const enabled = !this.micEnabled()
        this.localStream()
            ?.getAudioTracks()
            .forEach((track) => (track.enabled = enabled))
        this.micEnabled.set(enabled)
    }

    toggleCamera(): void {
        const enabled = !this.cameraEnabled()
        this.localStream()
            ?.getVideoTracks()
            .forEach((track) => (track.enabled = enabled))
        this.cameraEnabled.set(enabled)
    }

    /** Fecha o aviso de chamada encerrada */
    dismiss(): void {
        if (this.state() === 'ended') {
            this.state.set('idle')
            this.failure.set(null)
        }
    }

    private async onSignal(signal: CallSignal): Promise<void> {
        switch (signal.type) {
            case 'offer':
                this.onOffer(signal)
                return
            case 'answer':
                if (signal.callId === this.callId) {
                    clearTimeout(this.ringTimer)
                    await this.connection?.setRemoteDescription({
                        type: 'answer',
                        sdp: signal.sdp,
                    })
                    await this.drainCandidates()
                }
                return
            case 'ice':
                if (signal.callId === this.callId) {
                    await this.addCandidate(signal.candidate)
                }
                return
            case 'hangup':
                if (signal.callId === this.callId) {
                    this.finish(signal.reason)
                }
                return
        }
    }

    private onOffer(signal: CallSignal & { type: 'offer' }): void {
        // Já estamos em outra chamada: o convite é recusado na hora, em vez de atropelar a atual
        if (this.state() !== 'idle') {
            this.send({
                type: 'hangup',
                callId: signal.callId,
                conversationId: signal.conversationId,
                to: signal.from?.id ?? '',
                reason: 'busy',
            })
            return
        }

        this.callId = signal.callId
        this.conversationId = signal.conversationId
        this.incomingOffer = signal.sdp
        this.other.set(signal.from ?? null)
        this.kind.set(signal.media)
        this.state.set('ringing')
        this.ringTimer = setTimeout(() => this.hangup('unanswered'), RING_TIMEOUT)
    }

    private async capture(media: CallMedia): Promise<void> {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: media === 'video' ? { width: 1280, height: 720 } : false,
        })
        this.localStream.set(stream)
        this.micEnabled.set(true)
        this.cameraEnabled.set(media === 'video')
    }

    private async openConnection(): Promise<RTCPeerConnection> {
        const connection = new RTCPeerConnection({ iceServers: await this.iceServers() })
        const remote = new MediaStream()
        this.remoteStream.set(remote)

        this.localStream()
            ?.getTracks()
            .forEach((track) => connection.addTrack(track, this.localStream() as MediaStream))

        connection.ontrack = (event) => {
            event.streams[0]?.getTracks().forEach((track) => remote.addTrack(track))
            this.remoteStream.set(remote)
        }

        connection.onicecandidate = (event) => {
            const peer = this.other()
            if (!event.candidate || !peer || !this.callId) {
                return
            }
            this.send({
                type: 'ice',
                callId: this.callId,
                conversationId: this.conversationId ?? '',
                to: peer.id,
                candidate: event.candidate.toJSON(),
            })
        }

        connection.onconnectionstatechange = () => {
            if (connection.connectionState === 'connected') {
                clearTimeout(this.ringTimer)
                this.state.set('active')
                this.startClock()
            }
            if (connection.connectionState === 'failed') {
                this.finish('failed')
            }
        }

        this.connection = connection
        return connection
    }

    /**
     * Candidatos podem chegar antes da descrição remota, guardá-los evita perder caminhos de rede e a chamada ficar muda de um lado só
     */
    private async addCandidate(candidate: RTCIceCandidateInit): Promise<void> {
        if (!this.connection?.remoteDescription) {
            this.queuedCandidates.push(candidate)
            return
        }
        await this.connection.addIceCandidate(candidate).catch(() => undefined)
    }

    private async drainCandidates(): Promise<void> {
        const queued = this.queuedCandidates
        this.queuedCandidates = []

        for (const candidate of queued) {
            await this.connection?.addIceCandidate(candidate).catch(() => undefined)
        }
    }

    private async iceServers(): Promise<RTCIceServer[]> {
        try {
            const response = await firstValueFrom(
                this.http.get<IceServers>(`${environment.apiBaseUrl}/api/calls/ice-servers`),
            )
            return response.iceServers?.length ? response.iceServers : FALLBACK_ICE
        } catch {
            return FALLBACK_ICE
        }
    }

    private send(signal: CallSignal): void {
        this.realtime.publish('/app/call.signal', { ...signal, from: this.auth.user() })
    }

    private fail(error: unknown): void {
        this.failure.set(
            error instanceof DOMException && error.name === 'NotAllowedError'
                ? 'Precisamos da permissão do microfone e da câmera para chamar.'
                : 'Não foi possível iniciar a chamada.',
        )
        this.finish('failed')
    }

    private startClock(): void {
        clearInterval(this.tick)
        this.elapsed.set(0)
        this.tick = setInterval(() => this.elapsed.update((value) => value + 1), 1_000)
    }

    private finish(reason: CallEndReason): void {
        clearTimeout(this.ringTimer)
        clearInterval(this.tick)
        this.ringTimer = undefined
        this.tick = undefined

        this.localStream()
            ?.getTracks()
            .forEach((track) => track.stop())
        this.connection?.close()

        this.connection = undefined
        this.callId = undefined
        this.conversationId = undefined
        this.incomingOffer = undefined
        this.queuedCandidates = []

        this.localStream.set(null)
        this.remoteStream.set(null)
        this.state.set(reason === 'hangup' ? 'idle' : 'ended')
        this.lastReason.set(reason)
    }
}