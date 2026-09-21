package com.caiovisuals.javachat.auth.jwt;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.caiovisuals.javachat.user.User;

class JwtServiceTest {
    private static final String SECRET = "segredo-de-teste-com-mais-de-32-bytes-aqui";

    private final JwtService jwtService = serviceWith(SECRET, Duration.ofMinutes(15));

    private static JwtService serviceWith(String secret, Duration ttl) {
        return new JwtService(new JwtProperties(secret, ttl, Duration.ofDays(7), "javachat"));
    }

    private static User umUsuario() {
        User user = User.create("caio", "caio@exemplo.com", "hash", "Caio");
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        return user;
    }

    @Test
    void emiteTokenQueVoltaComOMesmoUsuario() {
        User user = umUsuario();

        String token = jwtService.issueAccessToken(user);

        assertThat(jwtService.parse(token))
                .hasValueSatisfying(
                        authenticated -> {
                            assertThat(authenticated.id()).isEqualTo(user.getId());
                            assertThat(authenticated.username()).isEqualTo("caio");
                        });
    }

    @Test
    void recusaTokenAdulterado() {
        String token = jwtService.issueAccessToken(umUsuario());
        String adulterado = token.substring(0, token.length() - 4) + "aaaa";

        assertThat(jwtService.parse(adulterado)).isEmpty();
    }

    @Test
    void recusaTokenAssinadoComOutroSegredo() {
        JwtService outroServidor =
                serviceWith("um-segredo-completamente-diferente-de-32-bytes", Duration.ofMinutes(15));

        String token = outroServidor.issueAccessToken(umUsuario());

        assertThat(jwtService.parse(token)).isEmpty();
    }

    @Test
    void recusaTokenExpirado() {
        JwtService expiraNaHora = serviceWith(SECRET, Duration.ofSeconds(-1));

        String token = expiraNaHora.issueAccessToken(umUsuario());

        assertThat(jwtService.parse(token)).isEmpty();
    }

    @Test
    void recusaLixoNoLugarDoToken() {
        assertThat(jwtService.parse("isto-nao-e-um-jwt")).isEmpty();
    }

    @Test
    void naoSobeComSegredoCurtoDemais() {
        assertThatThrownBy(() -> serviceWith("curto-demais", Duration.ofMinutes(15)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("32 bytes");
    }
}