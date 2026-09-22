import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { Router, RouterLink, RouterLinkActive } from '@angular/router'

import { CallOverlay } from '../../features/call/call-overlay'
import { AuthService } from '../../core/auth/auth-service'
import { CallService } from '../../core/call/call-service'
import { ChatService } from '../../core/chat/chat-service'
import { Avatar } from '../ui/avatar'
import { Icon } from '../ui/icon'

/**
 * É aqui que o tempo real sobe, para que o chat continue chegando mesmo quando o usuário está em outra página do aplicativo
 */
@Component({
    selector: 'app-shell',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, RouterLinkActive, Avatar, Icon, CallOverlay],
    templateUrl: './app-shell.html',
})
export class AppShell {
    private readonly auth = inject(AuthService)
    private readonly chat = inject(ChatService)
    private readonly calls = inject(CallService)
    private readonly router = inject(Router)

    protected readonly user = this.auth.user
    protected readonly unread = this.chat.unreadTotal
    protected readonly connection = this.chat.connection
    protected readonly menuOpen = signal(false)

    constructor() {
        this.chat.start()
        this.calls.listen()
    }

    protected toggleMenu(): void {
        this.menuOpen.update((open) => !open)
    }

    protected closeMenu(): void {
        this.menuOpen.set(false)
    }

    protected logout(): void {
        this.closeMenu()
        this.calls.stopListening()

        this.auth.logout().subscribe(() => {
            this.chat.stop()
            void this.router.navigate(['/entrar'])
        })
    }
}