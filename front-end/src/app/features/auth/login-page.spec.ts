import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Router, provideRouter } from '@angular/router'

import { LoginPage } from './login-page'

const SESSION = {
    accessToken: 'token-1',
    expiresIn: 900,
    user: { id: 'u1', username: 'caio', displayName: 'Caio', avatarUrl: null, lastSeenAt: null },
}

describe('LoginPage', () => {
    let fixture: ComponentFixture<LoginPage>
    let http: HttpTestingController
    let router: Router

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [LoginPage],
            providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
        })

        http = TestBed.inject(HttpTestingController)
        router = TestBed.inject(Router)
        vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true)

        fixture = TestBed.createComponent(LoginPage)
        fixture.detectChanges()
    })

    afterEach(() => http.verify())

    function fill(login: string, password: string): void {
        const element: HTMLElement = fixture.nativeElement
        const loginInput = element.querySelector<HTMLInputElement>('#login')!
        const passwordInput = element.querySelector<HTMLInputElement>('#password')!

        loginInput.value = login
        loginInput.dispatchEvent(new Event('input'))
        passwordInput.value = password
        passwordInput.dispatchEvent(new Event('input'))
    }

    function submit(): void {
        fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'))
        fixture.detectChanges()
    }

    it('não envia o formulário vazio e aponta os campos', () => {
        submit()

        http.expectNone((req) => req.url.endsWith('/api/auth/login'))
        expect(fixture.nativeElement.textContent).toContain('Informe seu e-mail ou usuário.')
        expect(fixture.nativeElement.textContent).toContain('Informe sua senha.')
    })

    it('entra e volta para o destino pedido', () => {
        fixture.componentRef.setInput('destino', '/chats')
        fill('  caio ', 'segredo123')
        submit()

        const request = http.expectOne((req) => req.url.endsWith('/api/auth/login'))
        expect(request.request.body).toEqual({ login: 'caio', password: 'segredo123' })
        request.flush(SESSION)

        expect(router.navigateByUrl).toHaveBeenCalledWith('/chats')
    })

    it('ignora destinos externos', () => {
        fixture.componentRef.setInput('destino', '//malicioso.com')
        fill('caio', 'segredo123')
        submit()

        http.expectOne((req) => req.url.endsWith('/api/auth/login')).flush(SESSION)

        expect(router.navigateByUrl).toHaveBeenCalledWith('/')
    })

    it('mostra a mensagem do servidor quando as credenciais falham', () => {
        fill('caio', 'errada123')
        submit()

        http.expectOne((req) => req.url.endsWith('/api/auth/login')).flush(
            { status: 401, code: 'INVALID_CREDENTIALS', message: 'x', path: '', timestamp: '' },
            { status: 401, statusText: 'Unauthorized' },
        )
        fixture.detectChanges()

        expect(fixture.nativeElement.textContent).toContain('E-mail, usuário ou senha incorretos.')
        expect(router.navigateByUrl).not.toHaveBeenCalled()
    })
})