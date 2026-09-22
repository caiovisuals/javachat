import { HttpClient, HttpParams } from '@angular/common/http'
import { Injectable, computed, inject, signal } from '@angular/core'
import { Observable, tap } from 'rxjs'

import { environment } from '../../../environments/environment'
import { AuthService } from '../auth/auth-service'
import { RealtimeService } from '../realtime/realtime-service'
import { User } from '../user/user.model'
import { Conversation, Message, MessagePage, PresenceEvent, TypingEvent } from './chat.model'

const PAGE_SIZE = 40
const TYPING_TTL = 4_000
const TYPING_THROTTLE = 2_000

type LoadState = 'idle' | 'loading' | 'ready' | 'failed'

/**
 * Os componentes só leem daqui: REST e STOMP escrevem no mesmo lugar, então uma mensagem vinda do socket e outra vinda do POST não brigam na tela
 */
@Injectable({ providedIn: 'root' })
export class ChatService {
    private readonly http = inject(HttpClient)
    private readonly auth = inject(AuthService)
    private readonly realtime = inject(RealtimeService)
    private readonly base = `${environment.apiBaseUrl}/api`

    private readonly list = signal<Conversation[]>([])
    private readonly byConversation = signal<Record<string, Message[]>>({})
    private readonly olderCursor = signal<Record<string, string | null>>({})
    private readonly typingUsers = signal<Record<string, User[]>>({})
    private readonly onlineIds = signal<ReadonlySet<string>>(new Set<string>())
    private readonly listState = signal<LoadState>('idle')
    private readonly historyState = signal<Record<string, LoadState>>({})
    private readonly active = signal<string | null>(null)

    readonly conversations = this.list.asReadonly()
    readonly history = this.byConversation.asReadonly()
    readonly cursors = this.olderCursor.asReadonly()
    readonly typing = this.typingUsers.asReadonly()
    readonly status = this.listState.asReadonly()
    readonly loadingHistory = this.historyState.asReadonly()
    readonly connection = this.realtime.connection

    readonly unreadTotal = computed(() =>
        this.list().reduce((total, conversation) => total + conversation.unreadCount, 0),
    )

    private started = false
    private readonly typingTopics = new Set<string>()
    private readonly typingTimers = new Map<string, ReturnType<typeof setTimeout>>()
    private lastTypingSentAt = 0

    start(): void {
        if (this.started) {
            return
        }
        this.started = true

        this.realtime.connect()
        this.realtime.watch<Message>('/user/queue/messages').subscribe((message) => {
            this.receive(message)
        })
        this.realtime.watch<Conversation>('/user/queue/conversations').subscribe((conversation) => {
            this.upsert(conversation)
        })
        this.realtime.watch<PresenceEvent>('/user/queue/presence').subscribe((event) => {
            this.applyPresence(event)
        })

        this.loadConversations()
    }

    stop(): void {
        this.started = false
        this.typingTopics.clear()
        this.typingTimers.forEach((timer) => clearTimeout(timer))
        this.typingTimers.clear()
        this.realtime.disconnect()

        this.list.set([])
        this.byConversation.set({})
        this.olderCursor.set({})
        this.typingUsers.set({})
        this.onlineIds.set(new Set<string>())
        this.listState.set('idle')
        this.historyState.set({})
        this.active.set(null)
    }

    loadConversations(): void {
        this.listState.set('loading')

        this.http.get<Conversation[]>(`${this.base}/conversations`).subscribe({
            next: (conversations) => {
                this.list.set([...conversations].sort(byRecent))
                this.listState.set('ready')
            },
            error: () => this.listState.set('failed'),
        })
    }

    find(conversationId: string): Conversation | undefined {
        return this.list().find((conversation) => conversation.id === conversationId)
    }

    isOnline(userId: string | undefined): boolean {
        return !!userId && this.onlineIds().has(userId)
    }

    open(conversationId: string): void {
        this.active.set(conversationId)

        if (!this.typingTopics.has(conversationId)) {
            this.typingTopics.add(conversationId)
            this.realtime
                .watch<TypingEvent>(`/topic/conversation.${conversationId}.typing`)
                .subscribe((event) => this.applyTyping(event))
        }

        if (this.byConversation()[conversationId]) {
            this.markRead(conversationId)
            return
        }
        this.loadHistory(conversationId)
    }

    close(): void {
        this.active.set(null)
    }

    loadOlder(conversationId: string): void {
        const cursor = this.olderCursor()[conversationId]

        if (cursor && this.historyState()[conversationId] !== 'loading') {
            this.loadHistory(conversationId, cursor)
        }
    }

    send(conversationId: string, content: string): void {
        const author = this.auth.user()
        const text = content.trim()

        if (!author || !text) {
            return
        }

        const clientId = newClientId()
        this.put({
            id: clientId,
            conversationId,
            author,
            content: text,
            createdAt: new Date().toISOString(),
            clientId,
            delivery: 'sending',
        })
        this.deliver(conversationId, clientId, text)
    }

    resend(message: Message): void {
        if (!message.clientId) {
            return
        }
        this.patch(message.conversationId, message.id, { delivery: 'sending' })
        this.deliver(message.conversationId, message.clientId, message.content)
    }

    /** Avisa o outro lado que estamos digitando, no máximo uma vez a cada poucos segundos */
    notifyTyping(conversationId: string): void {
        const now = Date.now()

        if (now - this.lastTypingSentAt < TYPING_THROTTLE) {
            return
        }
        this.lastTypingSentAt = now
        this.realtime.publish(`/app/conversation.${conversationId}.typing`, { typing: true })
    }

    stopTyping(conversationId: string): void {
        this.lastTypingSentAt = 0
        this.realtime.publish(`/app/conversation.${conversationId}.typing`, { typing: false })
    }

    searchUsers(query: string): Observable<User[]> {
        const params = new HttpParams().set('q', query).set('limit', 10)
        return this.http.get<User[]>(`${this.base}/users`, { params })
    }

    startDirect(userId: string): Observable<Conversation> {
        return this.http
            .post<Conversation>(`${this.base}/conversations`, {
                type: 'DIRECT',
                participantIds: [userId],
            })
            .pipe(tap((conversation) => this.upsert(conversation)))
    }

    markRead(conversationId: string): void {
        if (this.find(conversationId)?.unreadCount === 0) {
            return
        }

        this.list.update((conversations) =>
            conversations.map((conversation) =>
                conversation.id === conversationId
                    ? { ...conversation, unreadCount: 0 }
                    : conversation,
            ),
        )
        this.http.post(`${this.base}/conversations/${conversationId}/read`, {}).subscribe({
            error: () => {
                // Não lido é conforto, não dado crítico, a próxima abertura tenta de novo
            },
        })
    }

    private loadHistory(conversationId: string, before?: string): void {
        this.historyState.update((current) => ({ ...current, [conversationId]: 'loading' }))

        let params = new HttpParams().set('limit', PAGE_SIZE)
        if (before) {
            params = params.set('before', before)
        }

        this.http
            .get<MessagePage>(`${this.base}/conversations/${conversationId}/messages`, { params })
            .subscribe({
                next: (page) => {
                    this.byConversation.update((current) => ({
                        ...current,
                        [conversationId]: mergeMessages(current[conversationId] ?? [], page.items),
                    }))
                    this.olderCursor.update((current) => ({
                        ...current,
                        [conversationId]: page.nextCursor,
                    }))
                    this.historyState.update((current) => ({
                        ...current,
                        [conversationId]: 'ready',
                    }))

                    if (!before) {
                        this.markRead(conversationId)
                    }
                },
                error: () =>
                    this.historyState.update((current) => ({
                        ...current,
                        [conversationId]: 'failed',
                    })),
            })
    }

    private deliver(conversationId: string, clientId: string, content: string): void {
        this.http
            .post<Message>(`${this.base}/conversations/${conversationId}/messages`, {
                content,
                clientId,
            })
            .subscribe({
                next: (saved) => this.put({ ...saved, clientId, delivery: 'sent' }),
                error: () => this.patch(conversationId, clientId, { delivery: 'failed' }),
            })
    }

    private receive(message: Message): void {
        this.put({ ...message, delivery: 'sent' })

        const fromMe = message.author.id === this.auth.user()?.id
        if (fromMe || this.active() === message.conversationId) {
            return
        }

        this.list.update((conversations) =>
            conversations.map((conversation) =>
                conversation.id === message.conversationId
                    ? { ...conversation, unreadCount: conversation.unreadCount + 1 }
                    : conversation,
            ),
        )
    }

    private put(message: Message): void {
        this.byConversation.update((current) => {
            const existing = current[message.conversationId] ?? []
            const byClientId = message.clientId
                ? existing.findIndex((candidate) => candidate.clientId === message.clientId)
                : -1
            const index =
                byClientId >= 0
                    ? byClientId
                    : existing.findIndex((candidate) => candidate.id === message.id)

            if (index < 0) {
                return {
                    ...current,
                    [message.conversationId]: [...existing, message].sort(byCreatedAt),
                }
            }

            const next = [...existing]
            next[index] = { ...existing[index], ...message }
            return { ...current, [message.conversationId]: next }
        })

        this.touch(message)
    }

    private patch(conversationId: string, messageId: string, change: Partial<Message>): void {
        this.byConversation.update((current) => ({
            ...current,
            [conversationId]: (current[conversationId] ?? []).map((message) =>
                message.id === messageId || message.clientId === messageId
                    ? { ...message, ...change }
                    : message,
            ),
        }))
    }

    private touch(message: Message): void {
        this.list.update((conversations) =>
            conversations
                .map((conversation) =>
                    conversation.id === message.conversationId
                        ? { ...conversation, lastMessage: message, updatedAt: message.createdAt }
                        : conversation,
                )
                .sort(byRecent),
        )
    }

    private upsert(conversation: Conversation): void {
        this.list.update((conversations) => {
            const index = conversations.findIndex((candidate) => candidate.id === conversation.id)

            if (index < 0) {
                return [conversation, ...conversations].sort(byRecent)
            }

            const next = [...conversations]
            next[index] = { ...next[index], ...conversation }
            return next.sort(byRecent)
        })
    }

    private applyPresence(event: PresenceEvent): void {
        this.onlineIds.update((current) => {
            const next = new Set(current)
            if (event.online) {
                next.add(event.userId)
            } else {
                next.delete(event.userId)
            }
            return next
        })
    }

    private applyTyping(event: TypingEvent): void {
        if (event.user.id === this.auth.user()?.id) {
            return
        }

        const key = `${event.conversationId}:${event.user.id}`
        clearTimeout(this.typingTimers.get(key))
        this.typingTimers.delete(key)

        if (!event.typing) {
            this.removeTyping(event.conversationId, event.user.id)
            return
        }

        this.typingUsers.update((current) => {
            const present = current[event.conversationId] ?? []
            if (present.some((user) => user.id === event.user.id)) {
                return current
            }
            return { ...current, [event.conversationId]: [...present, event.user] }
        })

        this.typingTimers.set(
            key,
            setTimeout(() => {
                this.typingTimers.delete(key)
                this.removeTyping(event.conversationId, event.user.id)
            }, TYPING_TTL),
        )
    }

    private removeTyping(conversationId: string, userId: string): void {
        this.typingUsers.update((current) => ({
            ...current,
            [conversationId]: (current[conversationId] ?? []).filter((user) => user.id !== userId),
        }))
    }
}

function byRecent(a: Conversation, b: Conversation): number {
    return Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
}

function byCreatedAt(a: Message, b: Message): number {
    return Date.parse(a.createdAt) - Date.parse(b.createdAt)
}

/** Junta a página recebida ao que já está na tela, sem duplicar o que se sobrepõe */
function mergeMessages(current: Message[], incoming: Message[]): Message[] {
    const known = new Map(current.map((message) => [message.id, message]))

    for (const message of incoming) {
        known.set(message.id, { ...known.get(message.id), ...message, delivery: 'sent' })
    }
    return [...known.values()].sort(byCreatedAt)
}

function newClientId(): string {
    return crypto.randomUUID()
}