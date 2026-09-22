import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core'
import { RouterLink, RouterLinkActive } from '@angular/router'

import { AuthService } from '../../core/auth/auth-service'
import { ChatService } from '../../core/chat/chat-service'
import { Conversation, peerOf, titleOf } from '../../core/chat/chat.model'
import { User } from '../../core/user/user.model'
import { AppShell } from '../../shared/layout/app-shell'
import { RelativeTimePipe } from '../../shared/time/relative-time-pipe'
import { Avatar } from '../../shared/ui/avatar'
import { EmptyState } from '../../shared/ui/empty-state'
import { Icon } from '../../shared/ui/icon'
import { Spinner } from '../../shared/ui/spinner'
import { ConversationView } from './conversation-view'
import { NewConversation } from './new-conversation'

@Component({
    selector: 'app-chat-page',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        RouterLink,
        RouterLinkActive,
        AppShell,
        Avatar,
        EmptyState,
        Icon,
        Spinner,
        RelativeTimePipe,
        ConversationView,
        NewConversation,
    ],
    templateUrl: './chat-page.html',
})
export class ChatPage {
    private readonly auth = inject(AuthService)
    private readonly chat = inject(ChatService)

    /** Vem de `c/:conversationId`, em `/chats` fica indefinido e mostramos só a lista */
    readonly conversationId = input<string>()

    protected readonly status = this.chat.status
    protected readonly searchOpen = signal(false)
    protected readonly filter = signal('')

    private readonly me = this.auth.user

    protected readonly visible = computed(() => {
        const term = this.filter().trim().toLowerCase()
        const conversations = this.chat.conversations()

        if (!term) {
            return conversations
        }
        return conversations.filter((conversation) => {
            const peer = peerOf(conversation, this.me()?.id)
            return (
                titleOf(conversation, this.me()?.id).toLowerCase().includes(term) ||
                (peer?.username.toLowerCase().includes(term) ?? false)
            )
        })
    })

    protected titleOf(conversation: Conversation): string {
        return titleOf(conversation, this.me()?.id)
    }

    protected peerOf(conversation: Conversation): User | null {
        return peerOf(conversation, this.me()?.id)
    }

    protected isOnline(conversation: Conversation): boolean {
        return this.chat.isOnline(this.peerOf(conversation)?.id)
    }

    protected preview(conversation: Conversation): string {
        const message = conversation.lastMessage

        if (!message) {
            return 'Nenhuma mensagem ainda'
        }
        const prefix = message.author.id === this.me()?.id ? 'Você: ' : ''
        return prefix + message.content
    }

    protected onFilter(event: Event): void {
        this.filter.set((event.target as HTMLInputElement).value)
    }

    protected retry(): void {
        this.chat.loadConversations()
    }
}