package com.caiovisuals.javachat.auth;

import java.time.Instant;
import java.util.UUID;

import com.caiovisuals.javachat.user.User;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * Uma sessão de longa duração. Guarda o hash do token, nunca o token!!
 */
@Entity
@Table(name = "refresh_tokens")
public class RefreshToken {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "token_hash", nullable = false, length = 64)
    private String tokenHash;

    @Column(name = "family_id", nullable = false)
    private UUID familyId;

    @Column(name = "replaced_by")
    private UUID replacedBy;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "revoked_reason", length = 16)
    private RevokedReason revokedReason;

    @Column(name = "user_agent", length = 255)
    private String userAgent;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected RefreshToken() {
        // exigido pelo JPA
    }

    static RefreshToken issue(
            User user,
            String tokenHash,
            UUID familyId,
            Instant expiresAt,
            String userAgent,
            String ipAddress) {
        RefreshToken token = new RefreshToken();
        token.user = user;
        token.tokenHash = tokenHash;
        token.familyId = familyId;
        token.expiresAt = expiresAt;
        token.userAgent = userAgent;
        token.ipAddress = ipAddress;
        token.createdAt = Instant.now();
        return token;
    }

    public boolean isActive(Instant now) {
        return revokedAt == null && expiresAt.isAfter(now);
    }

    void revoke(Instant now, RevokedReason reason) {
        if (revokedAt == null) {
            this.revokedAt = now;
            this.revokedReason = reason;
        }
    }

    void replacedBy(UUID successorId) {
        this.replacedBy = successorId;
    }

    public UUID getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public UUID getFamilyId() {
        return familyId;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public Instant getRevokedAt() {
        return revokedAt;
    }

    public RevokedReason getRevokedReason() {
        return revokedReason;
    }

    public UUID getReplacedBy() {
        return replacedBy;
    }
}