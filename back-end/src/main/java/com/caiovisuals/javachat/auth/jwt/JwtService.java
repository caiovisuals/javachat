package com.caiovisuals.javachat.auth.jwt;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;

import javax.crypto.SecretKey;

import org.springframework.stereotype.Service;

import com.caiovisuals.javachat.user.User;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Service
public class JwtService {
    private static final String CLAIM_USERNAME = "username";

    private final JwtProperties properties;
    private final SecretKey key;

    public JwtService(JwtProperties properties) {
        this.properties = properties;
        byte[] secret = properties.secret().getBytes(StandardCharsets.UTF_8);
        if (secret.length < 32) {
            throw new IllegalStateException(
                    "app.jwt.secret precisa de pelo menos 32 bytes para HS256 (veja JWT_SECRET)");
        }
        this.key = Keys.hmacShaKeyFor(secret);
    }

    public String issueAccessToken(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .issuer(properties.issuer())
                .subject(user.getId().toString())
                .claim(CLAIM_USERNAME, user.getUsername())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(properties.accessTokenTtl())))
                .signWith(key)
                .compact();
    }

    /** Devolve vazio para token inválido, expirado ou adulterado */
    public Optional<AuthenticatedUser> parse(String token) {
        try {
            Claims claims =
                    Jwts.parser()
                            .verifyWith(key)
                            .requireIssuer(properties.issuer())
                            .build()
                            .parseSignedClaims(token)
                            .getPayload();

            return Optional.of(
                    new AuthenticatedUser(
                            UUID.fromString(claims.getSubject()), claims.get(CLAIM_USERNAME, String.class)));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    public long accessTokenTtlSeconds() {
        return properties.accessTokenTtl().toSeconds();
    }
}