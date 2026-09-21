package com.caiovisuals.javachat.common.exception;

import java.time.Instant;
import java.util.Map;

/** Corpo único de toda falha da API */
public record ErrorResponse(
        Instant timestamp,
        int status,
        String code,
        String message,
        String path,
        Map<String, String> errors) {

    public static ErrorResponse of(int status, String code, String message, String path) {
        return new ErrorResponse(Instant.now(), status, code, message, path, null);
    }

    public static ErrorResponse validation(String path, Map<String, String> errors) {
        return new ErrorResponse(
                Instant.now(),
                400,
                "VALIDATION_FAILED",
                "Alguns campos estão inválidos.",
                path,
                errors);
    }
}