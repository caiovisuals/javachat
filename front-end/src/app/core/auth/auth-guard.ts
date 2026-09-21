import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { AuthService } from './auth-service'

export const authGuard: CanActivateFn = (_route, state) => {
    const auth = inject(AuthService)
    const router = inject(Router)

    return (
        auth.isAuthenticated() ||
        router.createUrlTree(['/entry'], { queryParams: { destination: state.url } })
    )
}

/** Mantém quem já está logado fora das telas de entrada. */
export const guestGuard: CanActivateFn = () => {
    const auth = inject(AuthService)
    const router = inject(Router)

    return !auth.isAuthenticated() || router.createUrlTree(['/'])
}