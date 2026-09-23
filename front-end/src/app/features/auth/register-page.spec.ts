import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Router, provideRouter } from '@angular/router'

import { RegisterPage } from './register-page'

const VALID = {
    displayName: 'Caio Oliveira',
    username: 'caio',
    email: 'caio@exemplo.com',
    password: 'segredo123',
}

describe('RegisterPage', () => {
    let fixture: ComponentFixture<RegisterPage>
    let http: HttpTestingController
    let router: Router

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [RegisterPage],
            providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
        })

        http = TestBed.inject(HttpTestingController)
        router = TestBed.inject(Router)
        vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true)

        fixture = TestBed.createComponent(RegisterPage)
        fixture.detectChanges()
    })

    afterEach(() => http.verify())

    function fill(values: Record<string, string>): void {
        for (const [id, value] of Object.entries(values)) {
            const input = fixture.nativeElement.querySelector(`#${id}`) as HTMLInputElement
            input.value = value
            input.dispatchEvent(new Event('input'))
        }
    }

    function submit(): void {
        fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'))
        fixture.detectChanges()
    }

    it('valida no cliente com as mesmas regras do back-end', () => {
        fill({ ...VALID, username: 'a b', password: 'curta' })
        submit()

        http.expectNone((req) => req.url.endsWith('/api/auth/register'))
        expect(fixture.nativeElement.textContent).toContain(
            'Use de 3 a 20 caracteres entre letras, números e _.',
        )
        expect(fixture.nativeElement.textContent).toContain('Precisa de pelo menos 8 caracteres.')
    })

    it('cria a conta e entra', () => {
        fill(VALID)
        submit()

        const request = http.expectOne((req) => req.url.endsWith('/api/auth/register'))
        expect(request.request.body).toEqual(VALID)
        request.flush({
            accessToken: 'token-1',
            expiresIn: 900,
            user: {
                id: 'u1',
                username: 'caio',
                displayName: 'Caio',
                avatarUrl: null,
                lastSeenAt: null,
            },
        })

        expect(router.navigateByUrl).toHaveBeenCalledWith('/')
    })

    it('marca o campo quando o usuário já existe', () => {
        fill(VALID)
        submit()

        http.expectOne((req) => req.url.endsWith('/api/auth/register')).flush(
            { status: 409, code: 'USERNAME_TAKEN', message: 'x', path: '', timestamp: '' },
            { status: 409, statusText: 'Conflict' },
        )
        fixture.detectChanges()

        const hint = fixture.nativeElement.querySelector('#username-dica') as HTMLElement
        expect(hint.textContent).toContain('Este nome de usuário já está em uso.')
        expect(hint.classList).toContain('hint-error')
    })
})