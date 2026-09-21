package com.caiovisuals.javachat.auth;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
    Optional<RefreshToken> findByTokenHash(String tokenHash);

    /** Usada quando se detecta reuso: derruba todas as sessões daquela cadeia de uma vez. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(
            """
            update RefreshToken t
               set t.revokedAt = :now,
                   t.revokedReason = com.caiovisuals.javachat.auth.RevokedReason.SECURITY
             where t.familyId = :familyId and t.revokedAt is null
            """)
    int revokeFamily(@Param("familyId") UUID familyId, @Param("now") Instant now);
}