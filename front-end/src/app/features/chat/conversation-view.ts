import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    afterRenderEffect,
    computed,
    effect,
    inject,
    input,
    signal,
    untracked,
    viewChild,
} from '@angular/core'
import { RouterLink } from '@angular/router'

import { AuthService } from '../../core/auth/auth-service'
import { CallService } from '../../core/call/call-service'
import { CallMedia } from '../../core/call/call.model'
import { ChatService } from '../../core/chat/chat-service'
import { Message, peerOf, sameBlock, titleOf } from '../../core/chat/chat.model'
import { Avatar } from '../../shared/ui/avatar'
import { Icon } from '../../shared/ui/icon'
import { Spinner } from '../../shared/ui/spinner'
import { RelativeTimePipe } from '../../shared/time/relative-time-pipe'

/** Distância do fim a partir da qual paramos de acompanhar a rolagem automaticamente */
const PINNED_THRESHOLD = 120

@Component({
    selector: 'app-conversation-view',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, Avatar, Icon, Spinner, RelativeTimePipe],
    templateUrl: './conversation-view.html',
})
export class ConversationView {
    private readonly chat = inject(ChatService)
    private readonly auth = inject(AuthService)
    private readonly calls = inject(CallService)

    readonly conversationId = input.required<string>()

    protected readonly me = this.auth.user
    protected readonly draft = signal('')

    protected readonly conversation = computed(() => this.chat.find(this.conversationId()))
    protected readonly messages = computed(() => this.chat.history()[this.conversationId()] ?? [])
    protected readonly typingUsers = computed(() => this.chat.typing()[this.conversationId()] ?? [])
    protected readonly loading = computed(
        () => this.chat.loadingHistory()[this.conversationId()] === 'loading',
    )
    protected readonly failed = computed(
        () => this.chat.loadingHistory()[this.conversationId()] === 'failed',
    )
    protected readonly hasOlder = computed(() => !!this.chat.cursors()[this.conversationId()])

    protected readonly peer = computed(() => {
        const conversation = this.conversation()
        return conversation ? peerOf(conversation, this.me()?.id) : null
    })
    protected readonly title = computed(() => {
        const conversation = this.conversation()
        return conversation ? titleOf(conversation, this.me()?.id) : 'Conversa'
    })
    protected readonly peerOnline = computed(() => this.chat.isOnline(this.peer()?.id))
    protected readonly canCall = computed(() => !!this.peer() && !this.calls.onCall())

    protected readonly typingLabel = computed(() => {
        const users = this.typingUsers()
        if (users.length === 0) {
            return ''
        }
        if (users.length === 1) {
            return `${users[0].displayName} está digitando…`
        }
        return 'Várias pessoas estão digitando…'
    })

    private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller')

    /** Enquanto o usuário está no fim da conversa, a tela acompanha as mensagens novas */
    private pinned = true

    constructor() {
        effect(() => {
            const id = this.conversationId()

            untracked(() => {
                this.pinned = true
                this.draft.set('')
                this.chat.open(id)
            })
        })

        afterRenderEffect(() => {
            // Depende das mensagens de propósito: cada nova bolha reposiciona a rolagem
            this.messages()
            if (this.pinned) {
                this.scrollToBottom()
            }
        })

        inject(DestroyRef).onDestroy(() => this.chat.close())
    }

    protected onScroll(): void {
        const element = this.scroller()?.nativeElement
        if (!element) {
            return
        }

        const distance = element.scrollHeight - element.scrollTop - element.clientHeight
        this.pinned = distance < PINNED_THRESHOLD

        if (element.scrollTop < PINNED_THRESHOLD && this.hasOlder() && !this.loading()) {
            this.loadOlder()
        }
    }

    protected loadOlder(): void {
        const element = this.scroller()?.nativeElement
        const anchor = element ? element.scrollHeight - element.scrollTop : 0

        this.chat.loadOlder(this.conversationId())

        // Mantém a mensagem que o usuário está lendo no lugar quando a página antiga entra
        queueMicrotask(() => {
            const scroller = this.scroller()?.nativeElement
            if (scroller && anchor) {
                scroller.scrollTop = scroller.scrollHeight - anchor
            }
        })
    }

    protected onDraft(event: Event): void {
        const textarea = event.target as HTMLTextAreaElement
        this.draft.set(textarea.value)

        textarea.style.height = 'auto'
        textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`

        if (textarea.value.trim()) {
            this.chat.notifyTyping(this.conversationId())
        }
    }

    protected submit(event: Event): void {
        event.preventDefault()

        const content = this.draft().trim()
        if (!content) {
            return
        }

        this.chat.send(this.conversationId(), content)
        this.chat.stopTyping(this.conversationId())
        this.draft.set('')
        this.pinned = true

        const textarea = (event.target as HTMLElement).closest('form')?.querySelector('textarea')
        if (textarea) {
            textarea.style.height = 'auto'
            textarea.focus()
        }
    }

    protected retry(message: Message): void {
        this.chat.resend(message)
    }

    protected startCall(media: CallMedia): void {
        const peer = this.peer()
        if (peer) {
            void this.calls.call(this.conversationId(), peer, media)
        }
    }

    protected mine(message: Message): boolean {
        return message.author.id === this.me()?.id
    }

    protected grouped(index: number): boolean {
        const list = this.messages()
        return sameBlock(list[index - 1], list[index])
    }

    protected trackMessage(_index: number, message: Message): string {
        return message.clientId ?? message.id
    }

    private scrollToBottom(): void {
        const element = this.scroller()?.nativeElement
        if (element) {
            element.scrollTop = element.scrollHeight
        }
    }
}