import { HttpErrorResponse } from '@angular/common/http'

export interface ApiError {
    timestamp: string
    status: number
    code: string
    message: string
    path: string
    errors?: Record<string, string>
}

const MENSAGENS: Record<string, string> = {
    INVALID_CREDENTIALS: 'E-mail, usuário ou senha incorretos.',
    USERNAME_TAKEN: 'Este nome de usuário já está em uso.',
    EMAIL_TAKEN: 'Este e-mail já está cadastrado.',
    TOO_MANY_ATTEMPTS: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
    VALIDATION_FAILED: 'Confira os campos destacados.',
}

export function apiError(error: unknown): ApiError | null {
    if (!(error instanceof HttpErrorResponse)) {
        return null
    }

    const body: unknown = error.error

    if (!body || typeof body !== 'object' || typeof (body as ApiError).code !== 'string') {
        return null
    }
    return body as ApiError
}

export function mensagemDeErro(error: unknown): string {
    const body = apiError(error)

    if (!body) {
        return 'Não foi possível falar com o servidor. Verifique sua conexão.'
    }
    return MENSAGENS[body.code] ?? body.message ?? 'Algo deu errado. Tente novamente.'
}

/** Erros por campo, quando a falha foi de validação */
export function errosDeCampo(error: unknown): Record<string, string> {
    return apiError(error)?.errors ?? {}
}