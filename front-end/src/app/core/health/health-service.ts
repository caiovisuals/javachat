import { HttpClient } from '@angular/common/http'
import { Injectable, inject } from '@angular/core'
import { Observable } from 'rxjs'

import { environment } from '../../../environments/environment'

/** Resposta de `GET /api/health`. */
export interface ApiHealth {
    status: string
    application: string
    version: string
    timestamp: string
}

@Injectable({ providedIn: 'root' })
export class HealthService {
    private readonly http = inject(HttpClient)

    check(): Observable<ApiHealth> {
        return this.http.get<ApiHealth>(`${environment.apiBaseUrl}/api/health`)
    }
}