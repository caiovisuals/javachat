package com.caiovisuals.javachat.common.health;

import java.time.Instant;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Sinal de vida público da API
 */
@RestController
@RequestMapping("/api/health")
public class HealthController {
    private final String applicationName;
    private final String version;

    public HealthController(
            @Value("${spring.application.name}") String applicationName,
            @Value("${spring.application.version}") String version) {
        this.applicationName = applicationName;
        this.version = version;
    }

    @GetMapping
    public HealthResponse health() {
        return new HealthResponse("UP", applicationName, version, Instant.now());
    }

    public record HealthResponse(String status, String application, String version, Instant timestamp) {}
}