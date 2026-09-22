import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'

import { AuthService } from './auth-service'

const ME = {
    id: 'u1',
    username: 'caio',
    displayName: 'Caio',
    avatarUrl: null,
    lastSeenAt: null,
}

const SESSION = { accessToken: 'token-1', expiresIn: 900, user: ME }

describe('AuthService', () => {
    let http: HttpTestingController
    let auth: AuthService

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        })

        http = TestBed.inject(HttpTestingController)
        auth = TestBed.inject(AuthService)
    })

    afterEach(() => http.verify())

    it('guarda a sessão ao entrar', () => {
        auth.login({ login: 'caio', password: 'segredo123' }).subscribe()
        http.expectOne((req) => req.url.endsWith('/api/auth/login')).flush(SESSION)

        expect(auth.isAuthenticated()).toBe(true)
        expect(auth.accessToken()).toBe('token-1')
        expect(auth.user()?.username).toBe('caio')
    })

    it('recupera a sessão pelo cookie de refresh', () => {
        let authenticated: boolean | undefined
        auth.resolveSession().subscribe((value) => (authenticated = value))

        const request = http.expectOne((req) => req.url.endsWith('/api/auth/refresh'))
        expect(request.request.withCredentials).toBe(true)
        request.flush(SESSION)

        expect(authenticated).toBe(true)
        expect(auth.isAuthenticated()).toBe(true)
    })

    it('trata refresh recusado como visitante, sem estourar erro', () => {
        let authenticated: boolean | undefined
        auth.resolveSession().subscribe((value) => (authenticated = value))

        http.expectOne((req) => req.url.endsWith('/api/auth/refresh')).flush(null, {
            status: 401,
            statusText: 'Unauthorized',
        })

        expect(authenticated).toBe(false)
        expect(auth.isAuthenticated()).toBe(false)
    })

    it('resolve a sessão uma vez só, mesmo com várias rotas esperando', () => {
        auth.resolveSession().subscribe()
        auth.resolveSession().subscribe()

        // `expectOne` falharia se a segunda rota tivesse aberto outra requisição
        http.expectOne((req) => req.url.endsWith('/api/auth/refresh')).flush(SESSION)
    })

    it('renova o access token uma única vez para chamadas simultâneas', () => {
        const renovados: string[] = []
        auth.renewAccessToken().subscribe((token) => renovados.push(token))
        auth.renewAccessToken().subscribe((token) => renovados.push(token))

        http.expectOne((req) => req.url.endsWith('/api/auth/refresh')).flush({
            ...SESSION,
            accessToken: 'token-2',
        })

        expect(renovados).toEqual(['token-2', 'token-2'])
        expect(auth.accessToken()).toBe('token-2')
    })

    it('permite uma nova renovação depois de a anterior terminar', () => {
        auth.renewAccessToken().subscribe()
        http.expectOne((req) => req.url.endsWith('/api/auth/refresh')).flush({
            ...SESSION,
            accessToken: 'token-2',
        })

        auth.renewAccessToken().subscribe()
        http.expectOne((req) => req.url.endsWith('/api/auth/refresh')).flush({
            ...SESSION,
            accessToken: 'token-3',
        })

        expect(auth.accessToken()).toBe('token-3')
    })

    it('esquece a sessão ao sair', () => {
        auth.login({ login: 'caio', password: 'segredo123' }).subscribe()
        http.expectOne((req) => req.url.endsWith('/api/auth/login')).flush(SESSION)

        auth.logout().subscribe()
        http.expectOne((req) => req.url.endsWith('/api/auth/logout')).flush(null)

        expect(auth.isAuthenticated()).toBe(false)
        expect(auth.accessToken()).toBeNull()
        expect(auth.user()).toBeNull()
    })

    it('derruba a sessão local mesmo se o logout não chegar ao servidor', () => {
        auth.login({ login: 'caio', password: 'segredo123' }).subscribe()
        http.expectOne((req) => req.url.endsWith('/api/auth/login')).flush(SESSION)

        auth.logout().subscribe()
        http.expectOne((req) => req.url.endsWith('/api/auth/logout')).error(
            new ProgressEvent('error'),
            { status: 0, statusText: 'offline' },
        )

        expect(auth.isAuthenticated()).toBe(false)
    })
})