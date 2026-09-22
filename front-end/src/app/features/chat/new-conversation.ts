import { CdkTrapFocus } from '@angular/cdk/a11y'
import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { Router } from '@angular/router'
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs'

import { mensagemDeErro } from '../../core/api/api-error'
import { ChatService } from '../../core/chat/chat-service'
import { User } from '../../core/user/user.model'
import { Avatar } from '../../shared/ui/avatar'
import { Icon } from '../../shared/ui/icon'
import { Spinner } from '../../shared/ui/spinner'

/** Menos que isso devolveria metade da base de usuários a cada tecla */
const MIN_QUERY = 2

@Component({
    selector: 'app-new-conversation',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CdkTrapFocus, Avatar, Icon, Spinner],
    templateUrl: './new-conversation.html',
})
export class NewConversation {
    private readonly chat = inject(ChatService)
    private readonly router = inject(Router)

    readonly closed = output<void>()

    protected readonly query = signal('')
    protected readonly results = signal<User[]>([])
    protected readonly searching = signal(false)
    protected readonly opening = signal<string | null>(null)
    protected readonly failure = signal<string | null>(null)

    private readonly terms = new Subject<string>()

    constructor() {
        this.terms
            .pipe(
                debounceTime(300),
                distinctUntilChanged(),
                switchMap((term) => {
                    if (term.trim().length < MIN_QUERY) {
                        return of<User[]>([])
                    }
                    return this.chat.searchUsers(term.trim()).pipe(
                        catchError((error: unknown) => {
                            this.failure.set(mensagemDeErro(error))
                            return of<User[]>([])
                        }),
                    )
                }),
                takeUntilDestroyed(),
            )
            .subscribe((users) => {
                this.results.set(users)
                this.searching.set(false)
            })
    }

    protected search(event: Event): void {
        const term = (event.target as HTMLInputElement).value

        this.query.set(term)
        this.failure.set(null)
        this.searching.set(term.trim().length >= MIN_QUERY)
        this.terms.next(term)
    }

    protected start(user: User): void {
        if (this.opening()) {
            return
        }
        this.opening.set(user.id)

        this.chat.startDirect(user.id).subscribe({
            next: (conversation) => {
                this.closed.emit()
                void this.router.navigate(['/c', conversation.id])
            },
            error: (error: unknown) => {
                this.opening.set(null)
                this.failure.set(mensagemDeErro(error))
            },
        })
    }

    protected close(): void {
        this.closed.emit()
    }
}