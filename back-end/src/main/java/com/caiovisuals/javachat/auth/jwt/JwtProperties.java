package com.caiovisuals.javachat.auth.jwt;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * @param secret segredo HMAC, (precisa de pelo menos 32 bytes para HS256)
 * @param accessTokenTtl validade do access token
 * @param refreshTokenTtl validade do refresh token
 * @param issuer identificação de quem emitiu
 */
@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(
        String secret, Duration accessTokenTtl, Duration refreshTokenTtl, String issuer) {}