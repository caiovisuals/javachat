package com.caiovisuals.javachat.auth;

import java.time.Instant;
import java.util.UUID;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Revoga uma família de refresh tokens em transação própria
 */
@Component
class RefreshTokenFamilyRevoker {
    private final RefreshTokenRepository repository;

    RefreshTokenFamilyRevoker(RefreshTokenRepository repository) {
        this.repository = repository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    int revokeFamily(UUID familyId, Instant now) {
        return repository.revokeFamily(familyId, now);
    }
}