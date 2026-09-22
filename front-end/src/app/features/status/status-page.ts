import { DatePipe } from '@angular/common'
import { Component, inject, signal } from '@angular/core'

import { ApiHealth, HealthService } from '../../core/health/health-service'

type ConnectionState = 'checking' | 'online' | 'offline'

/**
 * Página temporária da Fase 0: existe para provar que o front-end fala com o back-end
 */
@Component({
    selector: 'app-status-page',
    imports: [DatePipe],
    templateUrl: './status-page.html',
})
export class StatusPage {
    private readonly health = inject(HealthService)

    protected readonly state = signal<ConnectionState>('checking')
    protected readonly api = signal<ApiHealth | null>(null)

    constructor() {
        this.check()
    }

    protected check(): void {
        this.state.set('checking')
        this.health.check().subscribe({
            next: (api) => {
                this.api.set(api)
                this.state.set('online')
            },
            error: () => {
                this.api.set(null)
                this.state.set('offline')
            },
        })
    }
}