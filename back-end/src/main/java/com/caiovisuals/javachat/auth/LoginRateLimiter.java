package com.caiovisuals.javachat.auth;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;
import com.caiovisuals.javachat.common.exception.ApiException;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;

@Component
public class LoginRateLimiter {
    private static final int MAX_BUCKETS = 10_000;

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final RateLimitProperties properties;

    public LoginRateLimiter(RateLimitProperties properties) {
        this.properties = properties;
    }

    public void check(String key) {
        if (!bucketFor(key).tryConsume(1)) {
            throw ApiException.tooManyRequests("Muitas tentativas. Tente novamente em instantes.");
        }
    }

    private Bucket bucketFor(String key) {
        // Sem expiração individual, o mapa cresceria sem limite sob varredura de IPs.
        if (buckets.size() > MAX_BUCKETS) {
            buckets.clear();
        }
        return buckets.computeIfAbsent(key, ignored -> newBucket());
    }

    private Bucket newBucket() {
        return Bucket.builder()
                .addLimit(
                        Bandwidth.builder()
                                .capacity(properties.attempts())
                                .refillGreedy(properties.attempts(), properties.window())
                                .build())
                .build();
    }
}