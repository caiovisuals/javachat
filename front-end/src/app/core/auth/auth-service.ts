import { HttpClient } from '@angular/common/http'
import { Injectable, computed, inject, signal } from '@angular/core'
import { Observable, catchError, finalize, map, of, shareReplay, tap, throwError } from 'rxjs'

import { environment } from '../../../environments/environment'
import { User } from '../user/user.model'
import { AuthResponse, LoginPayload, RegisterPayload } from './auth.model'

type SessionState = 'unknown' | 'authenticated' | 'anonymous'

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly http = inject(HttpClient)
    private readonly base = `${environment.apiBaseUrl}/api/auth`

    /**
     * O access token mora só em memória
     */
    private readonly token = signal<string | null>(null)
    private readonly currentUser = signal<User | null>(null)
    private readonly state = signal<SessionState>('unknown')

    private restoring?: Observable<boolean>
    private renewing?: Observable<string>

    readonly user = this.currentUser.asReadonly()
    readonly isAuthenticated = computed(() => this.state() === 'authenticated')

    accessToken(): string | null {
        return this.token()
    }

    /**
     * Descobre, na primeira rota protegida, se o cookie de refresh ainda vale
     */
    resolveSession(): Observable<boolean> {
        if (this.state() !== 'unknown') {
            return of(this.isAuthenticated())
        }

        this.restoring ??= this.renew().pipe(
            map(() => true),
            catchError(() => of(false)),
            shareReplay({ bufferSize: 1, refCount: false }),
        )
        return this.restoring
    }

    login(payload: LoginPayload): Observable<User> {
        return this.http
            .post<AuthResponse>(`${this.base}/login`, payload, { withCredentials: true })
            .pipe(
                tap((session) => this.open(session)),
                map((session) => session.user),
            )
    }

    register(payload: RegisterPayload): Observable<User> {
        return this.http
            .post<AuthResponse>(`${this.base}/register`, payload, { withCredentials: true })
            .pipe(
                tap((session) => this.open(session)),
                map((session) => session.user),
            )
    }

    /** A sessão local cai mesmo se o servidor não responder: o cookie expira sozinho */
    logout(): Observable<void> {
        return this.http.post<void>(`${this.base}/logout`, {}, { withCredentials: true }).pipe(
            catchError(() => of(undefined)),
            map(() => undefined),
            tap(() => this.close()),
        )
    }

    /** Recarrega o perfil da sessão corrente */
    refreshProfile(): Observable<User> {
        return this.http
            .get<User>(`${this.base}/me`)
            .pipe(tap((user) => this.currentUser.set(user)))
    }

    /**
     * Troca o refresh token por um access token novo
     */
    renewAccessToken(): Observable<string> {
        this.renewing ??= this.renew().pipe(
            map((session) => session.accessToken),
            finalize(() => (this.renewing = undefined)),
            shareReplay({ bufferSize: 1, refCount: false }),
        )
        return this.renewing
    }

    /** Esquece a sessão sem falar com o servidor, quando o refresh já foi recusado */
    abandonSession(): void {
        this.close()
    }

    private renew(): Observable<AuthResponse> {
        return this.http
            .post<AuthResponse>(`${this.base}/refresh`, {}, { withCredentials: true })
            .pipe(
                tap((session) => this.open(session)),
                catchError((error: unknown) => {
                    this.close()
                    return throwError(() => error)
                }),
            )
    }

    private open(session: AuthResponse): void {
        this.token.set(session.accessToken)
        this.currentUser.set(session.user)
        this.state.set('authenticated')
    }

    private close(): void {
        this.token.set(null)
        this.currentUser.set(null)
        this.state.set('anonymous')
    }
}