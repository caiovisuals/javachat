package com.caiovisuals.javachat.auth;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.caiovisuals.javachat.auth.dto.AuthResponse;
import com.caiovisuals.javachat.auth.dto.LoginRequest;
import com.caiovisuals.javachat.auth.dto.RegisterRequest;
import com.caiovisuals.javachat.auth.jwt.AuthenticatedUser;
import com.caiovisuals.javachat.auth.jwt.JwtService;
import com.caiovisuals.javachat.common.exception.ApiException;
import com.caiovisuals.javachat.user.User;
import com.caiovisuals.javachat.user.UserRepository;
import com.caiovisuals.javachat.user.dto.UserSummary;

@Service
public class AuthService {
    private final UserRepository users;
    private final RefreshTokenService refreshTokens;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    public AuthService(
            UserRepository users,
            RefreshTokenService refreshTokens,
            JwtService jwtService,
            PasswordEncoder passwordEncoder) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public AuthSession register(RegisterRequest request, String userAgent, String ipAddress) {
        if (users.existsByUsernameIgnoreCase(request.username())) {
            throw ApiException.conflict("USERNAME_TAKEN", "Este nome de usuário já está em uso.");
        }
        if (users.existsByEmailIgnoreCase(request.email())) {
            throw ApiException.conflict("EMAIL_TAKEN", "Este e-mail já está cadastrado.");
        }

        User user =
                User.create(
                        request.username(),
                        request.email(),
                        passwordEncoder.encode(request.password()),
                        request.displayName());

        try {
            users.saveAndFlush(user);
        } catch (DataIntegrityViolationException e) {
            // Dois cadastros simultâneos com o mesmo nome passam pelas checagens acima;
            // quem decide é o índice único.
            throw ApiException.conflict(
                    "USERNAME_TAKEN", "Este nome de usuário ou e-mail já está em uso.");
        }

        return openSession(user, userAgent, ipAddress);
    }

    @Transactional
    public AuthSession login(LoginRequest request, String userAgent, String ipAddress) {
        User user =
                users
                        .findByLogin(request.login())
                        .filter(found -> passwordEncoder.matches(request.password(), found.getPasswordHash()))
                        // Mesma resposta para conta inexistente e senha errada: confirmar quais
                        // contas existem entrega meio caminho a quem está varrendo.
                        .orElseThrow(
                                () ->
                                        ApiException.unauthorized(
                                                "INVALID_CREDENTIALS", "E-mail, usuário ou senha incorretos."));

        return openSession(user, userAgent, ipAddress);
    }

    @Transactional
    public AuthSession refresh(String refreshToken, String userAgent, String ipAddress) {
        RefreshTokenService.Rotation rotation =
                refreshTokens.rotate(refreshToken, userAgent, ipAddress);

        return new AuthSession(
                new AuthResponse(
                        jwtService.issueAccessToken(rotation.user()),
                        jwtService.accessTokenTtlSeconds(),
                        UserSummary.from(rotation.user())),
                rotation.rawToken());
    }

    @Transactional
    public void logout(String refreshToken) {
        if (refreshToken != null && !refreshToken.isBlank()) {
            refreshTokens.revoke(refreshToken);
        }
    }

    @Transactional(readOnly = true)
    public UserSummary me(AuthenticatedUser authenticated) {
        return users
                .findById(authenticated.id())
                .map(UserSummary::from)
                .orElseThrow(
                        () ->
                                ApiException.unauthorized(
                                        "USER_NOT_FOUND", "A conta desta sessão não existe mais."));
    }

    private AuthSession openSession(User user, String userAgent, String ipAddress) {
        String refreshToken = refreshTokens.issueNewFamily(user, userAgent, ipAddress);

        return new AuthSession(
                new AuthResponse(
                        jwtService.issueAccessToken(user),
                        jwtService.accessTokenTtlSeconds(),
                        UserSummary.from(user)),
                refreshToken);
    }
}