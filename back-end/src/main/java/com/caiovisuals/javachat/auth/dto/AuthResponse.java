package com.caiovisuals.javachat.auth.dto;

import com.caiovisuals.javachat.user.dto.UserSummary;

/**
 * @param expiresIn validade do access token em segundos, para o cliente se antecipar ao 401
 */
public record AuthResponse(String accessToken, long expiresIn, UserSummary user) {}