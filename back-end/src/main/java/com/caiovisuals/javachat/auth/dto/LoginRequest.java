package com.caiovisuals.javachat.auth.dto;

import jakarta.validation.constraints.NotBlank;

/** @param login aceita username ou e-mail */
public record LoginRequest(
        @NotBlank(message = "é obrigatório") String login,
        @NotBlank(message = "é obrigatória") String password) {}