import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'

import { StatusPage } from './status-page'

describe('StatusPage', () => {
    let http: HttpTestingController

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [StatusPage],
            providers: [provideHttpClient(), provideHttpClientTesting()],
        }).compileComponents()

        http = TestBed.inject(HttpTestingController)
    })

    afterEach(() => http.verify())

    it('mostra a identificação da API quando ela responde', async () => {
        const fixture = TestBed.createComponent(StatusPage)

        http
        .expectOne((req) => req.url.endsWith('/api/health'))
        .flush({
            status: 'UP',
            application: 'javachat',
            version: '0.1.0-SNAPSHOT',
            timestamp: '2026-09-21T20:00:00Z',
        })
        await fixture.whenStable()

        const text = (fixture.nativeElement as HTMLElement).textContent ?? ''
        expect(text).toContain('API respondendo')
        expect(text).toContain('0.1.0-SNAPSHOT')
    })

    it('orienta o desenvolvedor quando a API não responde', async () => {
        const fixture = TestBed.createComponent(StatusPage)

        http
        .expectOne((req) => req.url.endsWith('/api/health'))
        .error(new ProgressEvent('error'), { status: 0, statusText: 'offline' })
        await fixture.whenStable()

        const text = (fixture.nativeElement as HTMLElement).textContent ?? ''
        expect(text).toContain('API fora do ar')
        expect(text).toContain('docker compose up -d')
    })
})