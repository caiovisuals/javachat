package com.caiovisuals.javachat.user.dto;

import java.time.Instant;
import java.util.UUID;

import com.caiovisuals.javachat.user.User;

/** Formato do usuário em toda listagem e resposta. Nunca expõe o hash da senha */
public record UserSummary(
        UUID id, String username, String displayName, String avatarUrl, Instant lastSeenAt) {
    public static UserSummary from(User user) {
        return new UserSummary(
                user.getId(),
                user.getUsername(),
                user.getDisplayName(),
                user.getAvatarUrl(),
                user.getLastSeenAt());
    }
}