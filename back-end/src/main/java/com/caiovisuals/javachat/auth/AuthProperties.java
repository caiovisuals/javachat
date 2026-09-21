package com.caiovisuals.javachat.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * @param cookieName nome do cookie que carrega o refresh token
 * @param secureCookie exige HTTPS. Precisa ser {@code false} em desenvolvimento, senão o
 *     navegador descarta o cookie em {@code http://localhost}
 * @param cookieSameSite {@code Strict} por padrão; só afrouxar se front e API ficarem em sites
 *     diferentes de verdade
 * @param cookiePath caminho em que o cookie é enviado — restrito ao que precisa dele
 */
@ConfigurationProperties(prefix = "app.auth")
public record AuthProperties(
    String cookieName, boolean secureCookie, String cookieSameSite, String cookiePath
) {}