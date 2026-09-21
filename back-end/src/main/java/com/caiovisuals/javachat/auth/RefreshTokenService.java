package com.caiovisuals.javachat.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.caiovisuals.javachat.auth.jwt.JwtProperties;
import com.caiovisuals.javachat.common.exception.ApiException;
import com.caiovisuals.javachat.user.User;

/** Ciclo de vida do refresh token: emissão, rotação e revogação */
@Service
public class RefreshTokenService {
    private static final Logger log = LoggerFactory.getLogger(RefreshTokenService.class);
    private static final int TOKEN_BYTES = 32;

    private final RefreshTokenRepository repository;
    private final RefreshTokenFamilyRevoker familyRevoker;
    private final JwtProperties jwtProperties;
    private final SecureRandom random = new SecureRandom();

    public RefreshTokenService(
            RefreshTokenRepository repository,
            RefreshTokenFamilyRevoker familyRevoker,
            JwtProperties jwtProperties) {
        this.repository = repository;
        this.familyRevoker = familyRevoker;
        this.jwtProperties = jwtProperties;
    }

    /** Abre uma família nova — é o que acontece em todo login e registro */
    @Transactional
    public String issueNewFamily(User user, String userAgent, String ipAddress) {
        return persist(user, UUID.randomUUID(), userAgent, ipAddress);
    }

    /**
     * Troca o token apresentado por um sucessor da mesma família
     */
    @Transactional
    public Rotation rotate(String rawToken, String userAgent, String ipAddress) {
        String hash = hash(rawToken);
        RefreshToken current =
                repository
                        .findByTokenHash(hash)
                        .orElseThrow(
                                () ->
                                        ApiException.unauthorized(
                                                "REFRESH_INVALID", "Sessão inválida. Entre novamente."));

        Instant now = Instant.now();

        if (current.getRevokedAt() != null) {
            throw onRevokedToken(current, now);
        }

        if (!current.isActive(now)) {
            throw ApiException.unauthorized("REFRESH_EXPIRED", "Sessão expirada. Entre novamente.");
        }

        User user = current.getUser();
        current.revoke(now, RevokedReason.ROTATED);

        String raw = randomToken();
        RefreshToken successor =
                RefreshToken.issue(
                        user,
                        hash(raw),
                        current.getFamilyId(),
                        now.plus(jwtProperties.refreshTokenTtl()),
                        userAgent,
                        ipAddress);
        repository.save(successor);
        current.replacedBy(successor.getId());

        return new Rotation(user, raw);
    }

    @Transactional
    public void revoke(String rawToken) {
        repository
                .findByTokenHash(hash(rawToken))
                .ifPresent(token -> token.revoke(Instant.now(), RevokedReason.LOGOUT));
    }

    /**
     * Token revogado reapresentado. O desfecho depende de por que ele caiu
     */
    private ApiException onRevokedToken(RefreshToken current, Instant now) {
        RevokedReason reason = current.getRevokedReason();

        if (reason == RevokedReason.ROTATED) {
            int derrubadas = familyRevoker.revokeFamily(current.getFamilyId(), now);
            log.warn(
                    "Reuso de refresh token detectado na família {}: {} sessões revogadas",
                    current.getFamilyId(),
                    derrubadas);
            return ApiException.unauthorized(
                    "REFRESH_REUSED", "Sessão encerrada por segurança. Entre novamente.");
        }

        if (reason == RevokedReason.SECURITY) {
            return ApiException.unauthorized(
                    "REFRESH_REUSED", "Sessão encerrada por segurança. Entre novamente.");
        }

        return ApiException.unauthorized("REFRESH_INVALID", "Sessão encerrada. Entre novamente.");
    }

    private String persist(User user, UUID familyId, String userAgent, String ipAddress) {
        String raw = randomToken();
        repository.save(
                RefreshToken.issue(
                        user,
                        hash(raw),
                        familyId,
                        Instant.now().plus(jwtProperties.refreshTokenTtl()),
                        userAgent,
                        ipAddress));
        return raw;
    }

    private String randomToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /** SHA-256 basta: o token já é aleatório de 256 bits, não há o que adivinhar por dicionário */
    static String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(rawToken.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 indisponível nesta JVM", e);
        }
    }

    public record Rotation(User user, String rawToken) {}
}