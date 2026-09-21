package com.caiovisuals.javachat.auth;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * @param attempts tentativas permitidas dentro da janela
 * @param window tempo para repor as tentativas
 */
@ConfigurationProperties(prefix = "app.rate-limit")
public record RateLimitProperties(int attempts, Duration window) {}