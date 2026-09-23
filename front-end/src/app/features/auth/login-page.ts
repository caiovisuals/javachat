import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core'
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { Router, RouterLink } from '@angular/router'

import { mensagemDeErro } from '../../core/api/api-error'
import { safeRedirect } from '../../core/api/redirect'
import { AuthService } from '../../core/auth/auth-service'
import { Spinner } from '../../shared/ui/spinner'

@Component({
    selector: 'app-login-page',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ReactiveFormsModule, RouterLink, Spinner],
    templateUrl: './login-page.html',
})
export class LoginPage {
    private readonly auth = inject(AuthService)
    private readonly router = inject(Router)

    /** Vem de `?destino=` quando o guard barrou uma rota protegida */
    readonly destino = input<string>()

    protected readonly form = inject(NonNullableFormBuilder).group({
        login: ['', Validators.required],
        password: ['', Validators.required],
    })

    protected readonly submitting = signal(false)
    protected readonly failure = signal<string | null>(null)

    protected invalid(field: 'login' | 'password'): boolean {
        const control = this.form.controls[field]
        return control.invalid && control.touched
    }

    protected submit(): void {
        if (this.submitting()) {
            return
        }
        if (this.form.invalid) {
            this.form.markAllAsTouched()
            return
        }

        this.submitting.set(true)
        this.failure.set(null)

        const { login, password } = this.form.getRawValue()

        this.auth.login({ login: login.trim(), password }).subscribe({
            next: () => void this.router.navigateByUrl(safeRedirect(this.destino())),
            error: (error: unknown) => {
                this.submitting.set(false)
                this.failure.set(mensagemDeErro(error))
                this.form.controls.password.reset()
            },
        })
    }
}