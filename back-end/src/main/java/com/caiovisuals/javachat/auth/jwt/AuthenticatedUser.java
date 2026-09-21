package com.caiovisuals.javachat.auth.jwt;

import java.util.UUID;

/**
 * Quem está fazendo a requisição, extraído do access token
 */
public record AuthenticatedUser(UUID id, String username) {}