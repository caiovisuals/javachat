import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'

import { AuthService } from './auth-service'
import { authInterceptor } from './auth-interceptor'

const ME = {
    id: 'u1',
    username: 'caio',
    displayName: 'Caio',
    avatarUrl: null,
    lastSeenAt: null,
}

describe('authInterceptor', () => {
    let http: HttpTestingController
    let client: HttpClient
    let auth: AuthService

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withInterceptors([authInterceptor])),
                provideHttpClientTesting(),
                provideRouter([]),
            ],
        })

        http = TestBed.inject(HttpTestingController)
        client = TestBed.inject(HttpClient)
        auth = TestBed.inject(AuthService)

        auth.login({ login: 'caio', password: 'segredo123' }).subscribe()
        http.expectOne((req) => req.url.endsWith('/api/auth/login')).flush({
            accessToken: 'token-1',
            expiresIn: 900,
            user: ME,
        })
    })

    afterEach(() => http.verify())

    it('anexa o access token nas chamadas da API', () => {
        client.get('/api/conversations').subscribe()

        const request = http.expectOne('/api/conversations')
        expect(request.request.headers.get('Authorization')).toBe('Bearer token-1')
        request.flush([])
    })

    it('não anexa token no próprio fluxo de sessão', () => {
        auth.renewAccessToken().subscribe()

        const request = http.expectOne((req) => req.url.endsWith('/api/auth/refresh'))
        expect(request.request.headers.has('Authorization')).toBe(false)
        request.flush({ accessToken: 'token-2', expiresIn: 900, user: ME })
    })

    it('renova o token e repete a chamada depois de um 401', () => {
        let conversas: unknown

        client.get('/api/conversations').subscribe((value) => (conversas = value))
        http.expectOne('/api/conversations').flush(null, {
            status: 401,
            statusText: 'Unauthorized',
        })

        http.expectOne((req) => req.url.endsWith('/api/auth/refresh')).flush({
            accessToken: 'token-2',
            expiresIn: 900,
            user: ME,
        })

        const retry = http.expectOne('/api/conversations')
        expect(retry.request.headers.get('Authorization')).toBe('Bearer token-2')
        retry.flush([{ id: 'c1' }])

        expect(conversas).toEqual([{ id: 'c1' }])
    })

    it('desiste da sessão quando o refresh também é recusado', () => {
        let status: number | undefined

        client.get('/api/conversations').subscribe({
            error: (error: { status: number }) => (status = error.status),
        })
        http.expectOne('/api/conversations').flush(null, {
            status: 401,
            statusText: 'Unauthorized',
        })

        http.expectOne((req) => req.url.endsWith('/api/auth/refresh')).flush(null, {
            status: 401,
            statusText: 'Unauthorized',
        })

        // O erro que chega a quem chamou é o original, não o do refresh
        expect(status).toBe(401)
        expect(auth.isAuthenticated()).toBe(false)
    })

    it('não tenta renovar quando ainda não havia token', () => {
        auth.abandonSession()

        let status: number | undefined
        client.get('/api/conversations').subscribe({
            error: (error: { status: number }) => (status = error.status),
        })
        http.expectOne('/api/conversations').flush(null, {
            status: 401,
            statusText: 'Unauthorized',
        })

        expect(status).toBe(401)
    })
})