package com.caiovisuals.javachat.auth;

import com.caiovisuals.javachat.auth.dto.AuthResponse;

/**
 * Resultado de um login, registro ou renovação
 */
public record AuthSession(AuthResponse response, String refreshToken) {}