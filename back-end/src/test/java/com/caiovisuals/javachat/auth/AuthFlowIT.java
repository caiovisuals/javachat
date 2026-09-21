package com.caiovisuals.javachat.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import com.caiovisuals.javachat.user.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.http.Cookie;

/**
 * Fluxo de autenticação ponta a ponta, contra um Postgres de verdade
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers(disabledWithoutDocker = true)
@TestPropertySource(properties = "app.rate-limit.attempts=1000")
class AuthFlowIT {
    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper json;
    @Autowired private UserRepository users;
    @Autowired private RefreshTokenRepository refreshTokens;

    @BeforeEach
    void limparBase() {
        refreshTokens.deleteAll();
        users.deleteAll();
    }

    @Test
    void registraDevolvendoTokenEcookieDeRefresh() throws Exception {
        MvcResult resultado = registrar("caio", "caio@exemplo.com").andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(201);

        Cookie refresh = resultado.getResponse().getCookie("refreshToken");
        assertThat(refresh).isNotNull();
        assertThat(refresh.isHttpOnly()).isTrue();
        assertThat(refresh.getPath()).isEqualTo("/api/auth");
        // O refresh token não pode aparecer no corpo: ele existe só como cookie httpOnly.
        assertThat(resultado.getResponse().getContentAsString()).doesNotContain(refresh.getValue());
    }

    @Test
    void naoAceitaNomeDeUsuarioRepetidoMesmoComOutroCase() throws Exception {
        registrar("caio", "caio@exemplo.com").andExpect(status().isCreated());

        registrar("CAIO", "outro@exemplo.com")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("USERNAME_TAKEN"));
    }

    @Test
    void naoAceitaEmailRepetidoMesmoComOutroCase() throws Exception {
        registrar("caio", "caio@exemplo.com").andExpect(status().isCreated());

        registrar("outro", "CAIO@Exemplo.com")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EMAIL_TAKEN"));
    }

    @Test
    void entraPorEmailOuPorUsername() throws Exception {
        registrar("caio", "caio@exemplo.com").andExpect(status().isCreated());

        login("caio", "senha-forte-123").andExpect(status().isOk());
        login("CAIO@exemplo.com", "senha-forte-123").andExpect(status().isOk());
    }

    @Test
    void naoDistingueContaInexistenteDeSenhaErrada() throws Exception {
        registrar("caio", "caio@exemplo.com").andExpect(status().isCreated());

        String senhaErrada =
                login("caio", "chute").andExpect(status().isUnauthorized()).andReturn()
                        .getResponse()
                        .getContentAsString();
        String contaInexistente =
                login("ninguem", "chute").andExpect(status().isUnauthorized()).andReturn()
                        .getResponse()
                        .getContentAsString();

        assertThat(codigoDe(senhaErrada)).isEqualTo("INVALID_CREDENTIALS");
        assertThat(codigoDe(contaInexistente)).isEqualTo("INVALID_CREDENTIALS");
    }

    @Test
    void exigeTokenParaVerOProprioPerfil() throws Exception {
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void devolveOPerfilComOToken() throws Exception {
        String token = acessoDe(registrar("caio", "caio@exemplo.com").andReturn());

        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("caio"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    void renovarTrocaOCookiePorUmNovo() throws Exception {
        Cookie original = refreshDe(registrar("caio", "caio@exemplo.com").andReturn());

        MvcResult renovado =
                mvc.perform(post("/api/auth/refresh").cookie(original))
                        .andExpect(status().isOk())
                        .andExpect(cookie().exists("refreshToken"))
                        .andReturn();

        assertThat(refreshDe(renovado).getValue()).isNotEqualTo(original.getValue());
    }

    /**
     * Reapresentar um token já rotacionado precisa derrubar também o sucessor
     */
    @Test
    void reusarTokenAntigoDerrubaAFamiliaInteira() throws Exception {
        Cookie antigo = refreshDe(registrar("caio", "caio@exemplo.com").andReturn());

        Cookie sucessor =
                refreshDe(mvc.perform(post("/api/auth/refresh").cookie(antigo)).andReturn());

        mvc.perform(post("/api/auth/refresh").cookie(antigo))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("REFRESH_REUSED"));

        mvc.perform(post("/api/auth/refresh").cookie(sucessor))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("REFRESH_REUSED"));

        assertThat(refreshTokens.findAll()).allMatch(token -> token.getRevokedAt() != null);
    }

    @Test
    void sairInvalidaOCookie() throws Exception {
        Cookie refresh = refreshDe(registrar("caio", "caio@exemplo.com").andReturn());

        mvc.perform(post("/api/auth/logout").cookie(refresh)).andExpect(status().isNoContent());

        mvc.perform(post("/api/auth/refresh").cookie(refresh))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("REFRESH_INVALID"));
    }

    @Test
    void renovarSemCookieFalhaComCodigoProprio() throws Exception {
        mvc.perform(post("/api/auth/refresh"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("REFRESH_MISSING"));
    }

    @Test
    void rotasPublicasSeguemPublicasComSecurityLigado() throws Exception {
        mvc.perform(get("/api/health")).andExpect(status().isOk());
    }

    // Auxiliares 
    private org.springframework.test.web.servlet.ResultActions registrar(
            String username, String email) throws Exception {
        String corpo =
                """
                {"username":"%s","email":"%s","password":"senha-forte-123","displayName":"Caio Oliveira"}"""
                        .formatted(username, email);

        return mvc.perform(
                post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(corpo));
    }

    private org.springframework.test.web.servlet.ResultActions login(String login, String senha)
            throws Exception {
        String corpo = """
                {"login":"%s","password":"%s"}""".formatted(login, senha);

        return mvc.perform(
                post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(corpo));
    }

    private static Cookie refreshDe(MvcResult resultado) {
        Cookie cookie = resultado.getResponse().getCookie("refreshToken");
        assertThat(cookie).as("cookie de refresh na resposta").isNotNull();
        return cookie;
    }

    private String acessoDe(MvcResult resultado) throws Exception {
        return json.readTree(resultado.getResponse().getContentAsString()).get("accessToken").asText();
    }

    private String codigoDe(String corpo) throws Exception {
        return json.readTree(corpo).get("code").asText();
    }
}