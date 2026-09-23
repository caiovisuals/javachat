import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { Router, RouterLink } from '@angular/router'

import { apiError, errosDeCampo, mensagemDeErro } from '../../core/api/api-error'
import { safeRedirect } from '../../core/api/redirect'
import { AuthService } from '../../core/auth/auth-service'
import { Spinner } from '../../shared/ui/spinner'

type Field = 'displayName' | 'username' | 'email' | 'password'

const USERNAME = /^[a-zA-Z0-9_]{3,20}$/

@Component({
    selector: 'app-register-page',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ReactiveFormsModule, RouterLink, Spinner],
    templateUrl: './register-page.html',
})
export class RegisterPage {
    private readonly auth = inject(AuthService)
    private readonly router = inject(Router)

    readonly destino = input<string>()

    protected readonly form = inject(NonNullableFormBuilder).group({
        displayName: ['', [Validators.required, Validators.maxLength(60)]],
        username: ['', [Validators.required, Validators.pattern(USERNAME)]],
        email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
        password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
    })

    protected readonly submitting = signal(false)
    protected readonly failure = signal<string | null>(null)
    /** Erros que só o servidor conhece, como usuário ou e-mail já em uso */
    protected readonly serverErrors = signal<Partial<Record<Field, string>>>({})

    constructor() {
        this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
            if (Object.keys(this.serverErrors()).length > 0) {
                this.serverErrors.set({})
            }
        })
    }

    protected error(field: Field): string | null {
        const server = this.serverErrors()[field]
        if (server) {
            return server
        }

        const control = this.form.controls[field]
        if (!control.touched || control.valid) {
            return null
        }
        if (control.hasError('required')) {
            return 'Campo obrigatório.'
        }

        switch (field) {
            case 'displayName':
                return 'Use no máximo 60 caracteres.'
            case 'username':
                return 'Use de 3 a 20 caracteres entre letras, números e _.'
            case 'email':
                return control.hasError('maxlength')
                    ? 'E-mail longo demais.'
                    : 'Não parece um e-mail válido.'
            case 'password':
                return control.hasError('maxlength')
                    ? 'Use no máximo 72 caracteres.'
                    : 'Precisa de pelo menos 8 caracteres.'
        }
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

        const value = this.form.getRawValue()

        this.auth
            .register({
                displayName: value.displayName.trim(),
                username: value.username.trim(),
                email: value.email.trim(),
                password: value.password,
            })
            .subscribe({
                next: () => void this.router.navigateByUrl(safeRedirect(this.destino())),
                error: (error: unknown) => {
                    this.submitting.set(false)
                    this.failure.set(mensagemDeErro(error))
                    this.serverErrors.set(this.fieldErrors(error))
                },
            })
    }

    private fieldErrors(error: unknown): Partial<Record<Field, string>> {
        const errors: Partial<Record<Field, string>> = {}

        for (const [field, message] of Object.entries(errosDeCampo(error))) {
            if (field in this.form.controls) {
                errors[field as Field] = capitalize(message) + '.'
            }
        }

        const code = apiError(error)?.code
        if (code === 'USERNAME_TAKEN') {
            errors.username = 'Este nome de usuário já está em uso.'
        }
        if (code === 'EMAIL_TAKEN') {
            errors.email = 'Este e-mail já está cadastrado.'
        }
        return errors
    }
}

function capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1)
}