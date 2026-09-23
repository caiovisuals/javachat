import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { RouterLink } from '@angular/router'

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
import { NewConversation } from '../chat/new-conversation'

const RECENT_LIMIT = 5

@Component({
    selector: 'app-home-page',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        RouterLink,
        AppShell,
        Avatar,
        EmptyState,
        Icon,
        Spinner,
        RelativeTimePipe,
        NewConversation,
    ],
    templateUrl: './home-page.html',
})
export class HomePage {
    private readonly auth = inject(AuthService)
    private readonly chat = inject(ChatService)

    protected readonly user = this.auth.user
    protected readonly status = this.chat.status
    protected readonly unread = this.chat.unreadTotal
    protected readonly searchOpen = signal(false)

    protected readonly headline = computed(() => {
        const greeting = greetingFor(new Date())
        const name = this.user()?.displayName.trim().split(/\s+/)[0]
        return name ? `${greeting}, ${name}` : greeting
    })

    protected readonly total = computed(() => this.chat.conversations().length)

    /** Não lidas primeiro, depois as mais recentes: é o que a pessoa quer ver ao chegar */
    protected readonly recent = computed(() =>
        [...this.chat.conversations()]
            .sort((a, b) => Number(b.unreadCount > 0) - Number(a.unreadCount > 0))
            .slice(0, RECENT_LIMIT),
    )

    protected readonly online = computed(() => {
        const me = this.user()?.id
        const seen = new Map<string, { user: User; conversationId: string }>()

        for (const conversation of this.chat.conversations()) {
            const peer = peerOf(conversation, me)
            if (peer && !seen.has(peer.id) && this.chat.isOnline(peer.id)) {
                seen.set(peer.id, { user: peer, conversationId: conversation.id })
            }
        }
        return [...seen.values()]
    })

    protected titleOf(conversation: Conversation): string {
        return titleOf(conversation, this.user()?.id)
    }

    protected peerOf(conversation: Conversation): User | null {
        return peerOf(conversation, this.user()?.id)
    }

    protected preview(conversation: Conversation): string {
        const message = conversation.lastMessage

        if (!message) {
            return 'Nenhuma mensagem ainda'
        }
        const prefix = message.author.id === this.user()?.id ? 'Você: ' : ''
        return prefix + message.content
    }

    protected retry(): void {
        this.chat.loadConversations()
    }
}

function greetingFor(now: Date): string {
    const hour = now.getHours()

    if (hour < 5 || hour >= 18) {
        return 'Boa noite'
    }
    return hour < 12 ? 'Bom dia' : 'Boa tarde'
}