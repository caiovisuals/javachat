package com.caiovisuals.javachat.auth;

import java.time.Duration;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.caiovisuals.javachat.auth.dto.AuthResponse;
import com.caiovisuals.javachat.auth.dto.LoginRequest;
import com.caiovisuals.javachat.auth.dto.RegisterRequest;
import com.caiovisuals.javachat.auth.jwt.AuthenticatedUser;
import com.caiovisuals.javachat.auth.jwt.JwtProperties;
import com.caiovisuals.javachat.common.exception.ApiException;
import com.caiovisuals.javachat.user.dto.UserSummary;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;
    private final LoginRateLimiter rateLimiter;
    private final AuthProperties authProperties;
    private final JwtProperties jwtProperties;

    public AuthController(
            AuthService authService,
            LoginRateLimiter rateLimiter,
            AuthProperties authProperties,
            JwtProperties jwtProperties) {
        this.authService = authService;
        this.rateLimiter = rateLimiter;
        this.authProperties = authProperties;
        this.jwtProperties = jwtProperties;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request, HttpServletRequest http) {

        rateLimiter.check("register:ip:" + clientIp(http));

        AuthSession session = authService.register(request, userAgent(http), clientIp(http));
        return respond(session, HttpStatus.CREATED);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request, HttpServletRequest http) {

        rateLimiter.check("login:ip:" + clientIp(http));
        rateLimiter.check("login:account:" + request.login().toLowerCase());

        AuthSession session = authService.login(request, userAgent(http), clientIp(http));
        return respond(session, HttpStatus.OK);
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @CookieValue(name = "${app.auth.cookie-name}", required = false) String refreshToken,
            HttpServletRequest http) {

        if (refreshToken == null || refreshToken.isBlank()) {
            throw ApiException.unauthorized("REFRESH_MISSING", "Sessão ausente. Entre novamente.");
        }

        AuthSession session = authService.refresh(refreshToken, userAgent(http), clientIp(http));
        return respond(session, HttpStatus.OK);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @CookieValue(name = "${app.auth.cookie-name}", required = false) String refreshToken) {

        authService.logout(refreshToken);

        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, refreshCookie("", Duration.ZERO).toString())
                .build();
    }

    @GetMapping("/me")
    public UserSummary me(@AuthenticationPrincipal AuthenticatedUser authenticated) {
        return authService.me(authenticated);
    }

    private ResponseEntity<AuthResponse> respond(AuthSession session, HttpStatus status) {
        return ResponseEntity.status(status)
                .header(
                        HttpHeaders.SET_COOKIE,
                        refreshCookie(session.refreshToken(), jwtProperties.refreshTokenTtl()).toString())
                .body(session.response());
    }

    /**
     * O refresh token só existe como cookie {@code httpOnly}: um XSS na página não consegue lê-lo,
     * e o caminho restrito faz o navegador só enviá-lo para os endpoints que precisam dele.
     */
    private ResponseCookie refreshCookie(String value, Duration maxAge) {
        return ResponseCookie.from(authProperties.cookieName(), value)
                .httpOnly(true)
                .secure(authProperties.secureCookie())
                .sameSite(authProperties.cookieSameSite())
                .path(authProperties.cookiePath())
                .maxAge(maxAge)
                .build();
    }

    private static String clientIp(HttpServletRequest request) {
        return request.getRemoteAddr();
    }

    private static String userAgent(HttpServletRequest request) {
        String value = request.getHeader(HttpHeaders.USER_AGENT);
        if (value == null) {
            return null;
        }
        return value.length() > 255 ? value.substring(0, 255) : value;
    }
}