import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http'
import { inject } from '@angular/core'
import { Router } from '@angular/router'
import { catchError, switchMap, throwError } from 'rxjs'

import { AuthService } from './auth-service'

/** Rotas do próprio fluxo de sessão: anexar o token aqui só criaria recursão no 401 */
const SEM_TOKEN = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh', '/api/auth/logout']

export const authInterceptor: HttpInterceptorFn = (request, next) => {
    const auth = inject(AuthService)
    const router = inject(Router)

    if (SEM_TOKEN.some((path) => request.url.includes(path))) {
        return next(request)
    }

    const token = auth.accessToken()
    const authorized = token ? withBearer(request, token) : request

    return next(authorized).pipe(
        catchError((error: unknown) => {
            if (!(error instanceof HttpErrorResponse) || error.status !== 401 || !token) {
                return throwError(() => error)
            }

            // O access token é curto por escolha: quando ele vence no meio da navegação
            return auth.renewAccessToken().pipe(
                catchError(() => {
                    auth.abandonSession()
                    void router.navigate(['/entrar'], { queryParams: { destino: router.url } })
                    return throwError(() => error)
                }),
                switchMap((renewed) => next(withBearer(request, renewed))),
            )
        }),
    )
}

function withBearer(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
    return request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
}