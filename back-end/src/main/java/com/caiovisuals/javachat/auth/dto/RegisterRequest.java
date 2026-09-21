package com.caiovisuals.javachat.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "é obrigatório")
                @Pattern(
                        regexp = "^[a-zA-Z0-9_]{3,20}$",
                        message = "use de 3 a 20 caracteres entre letras, números e _")
                String username,
        @NotBlank(message = "é obrigatório")
                @Email(message = "não parece um e-mail válido")
                @Size(max = 254, message = "é longo demais")
                String email,
        @NotBlank(message = "é obrigatória")
                @Size(min = 8, max = 72, message = "precisa de pelo menos 8 caracteres")
                String password,
        @NotBlank(message = "é obrigatório")
                @Size(max = 60, message = "é longo demais")
                String displayName) {}