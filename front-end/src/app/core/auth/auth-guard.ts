import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { map } from 'rxjs'
import { AuthService } from './auth-service'

export const authGuard: CanActivateFn = (_route, state) => {
    const auth = inject(AuthService)
    const router = inject(Router)

    return auth
        .resolveSession()
        .pipe(
            map(
                (authenticated) =>
                    authenticated ||
                    router.createUrlTree(['/entrar'], { queryParams: { destino: state.url } }),
            ),
        )
}

/** Mantém quem já está logado fora das telas de entrada */
export const guestGuard: CanActivateFn = () => {
    const auth = inject(AuthService)
    const router = inject(Router)

    return auth
        .resolveSession()
        .pipe(map((authenticated) => !authenticated || router.createUrlTree(['/'])))
}