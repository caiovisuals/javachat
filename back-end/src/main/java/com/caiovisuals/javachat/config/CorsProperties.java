package com.caiovisuals.javachat.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Origens autorizadas a chamar a API
 */
@ConfigurationProperties(prefix = "app.cors")
public record CorsProperties(List<String> allowedOrigins) {
    public CorsProperties {
        allowedOrigins = allowedOrigins == null ? List.of() : List.copyOf(allowedOrigins);
    }
}