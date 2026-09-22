import { User } from '../user/user.model'

/** Resposta de `/api/auth/login`, `/register` e `/refresh` */
export interface AuthResponse {
    accessToken: string
    /** Validade do access token em segundos */
    expiresIn: number
    user: User
}

/** `login` aceita username ou e-mail, como no back-end */
export interface LoginPayload {
    login: string
    password: string
}

export interface RegisterPayload {
    username: string
    email: string
    password: string
    displayName: string
}