import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core'
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http'
import { provideRouter, withComponentInputBinding } from '@angular/router'

import { routes } from './app.routes'
import { authInterceptor } from './core/auth/auth-interceptor'

export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        provideRouter(routes, withComponentInputBinding()),
        provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    ],
}