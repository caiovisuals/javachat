import { User } from '../user/user.model'

export type ConversationType = 'DIRECT' | 'GROUP'

export interface Conversation {
    id: string
    type: ConversationType
    /** Só grupos têm título próprio, conversas diretas usam o nome do outro participante */
    title: string | null
    participants: User[]
    lastMessage: Message | null
    unreadCount: number
    updatedAt: string
}

/** Estado local da entrega: a bolha aparece na tela antes de o servidor confirmar */
export type Delivery = 'sending' | 'sent' | 'failed'

export interface Message {
    id: string
    conversationId: string
    author: User
    content: string
    createdAt: string
    /** Gerado no cliente para casar o eco do servidor com a bolha otimista */
    clientId: string | null
    delivery?: Delivery
}

/** Histórico volta em páginas por cursor: `nextCursor` aponta para mensagens mais antigas */
export interface MessagePage {
    items: Message[]
    nextCursor: string | null
}

export interface TypingEvent {
    conversationId: string
    user: User
    typing: boolean
}

export interface PresenceEvent {
    userId: string
    online: boolean
    lastSeenAt: string | null
}

export function peerOf(conversation: Conversation, viewerId: string | undefined): User | null {
    if (conversation.type !== 'DIRECT') {
        return null
    }
    return conversation.participants.find((participant) => participant.id !== viewerId) ?? null
}

export function titleOf(conversation: Conversation, viewerId: string | undefined): string {
    return conversation.title ?? peerOf(conversation, viewerId)?.displayName ?? 'Conversa'
}

/** Duas mensagens seguidas do mesmo autor em poucos minutos viram um bloco só */
export function sameBlock(previous: Message | undefined, message: Message): boolean {
    if (!previous || previous.author.id !== message.author.id) {
        return false
    }
    const gap = Date.parse(message.createdAt) - Date.parse(previous.createdAt)
    return Number.isFinite(gap) && gap < 5 * 60 * 1000
}