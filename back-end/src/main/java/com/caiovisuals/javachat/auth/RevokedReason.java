package com.caiovisuals.javachat.auth;

public enum RevokedReason {
    /** A pessoa saiu. Sessão encerrada normalmente */
    LOGOUT,
    /** Trocado por um sucessor da mesma família. Reapresentá-lo indica cópia roubada */
    ROTATED,
    /** Derrubado junto com a família por suspeita de roubo */
    SECURITY
}