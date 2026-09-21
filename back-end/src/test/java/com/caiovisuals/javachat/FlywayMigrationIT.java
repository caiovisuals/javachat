package com.caiovisuals.javachat;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Sobe a aplicação contra um Postgres real e confere que o Flyway deixou o banco utilizável
 */
@SpringBootTest
@Testcontainers(disabledWithoutDocker = true)
class FlywayMigrationIT {
    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void aplicaTodasAsMigracoesComSucesso() {
        Integer falhas = jdbc.queryForObject(
                "SELECT COUNT(*) FROM flyway_schema_history WHERE success = false", Integer.class);
        Integer aplicadas = jdbc.queryForObject(
                "SELECT COUNT(*) FROM flyway_schema_history WHERE success = true", Integer.class);

        assertThat(falhas).isZero();
        assertThat(aplicadas).isPositive();
    }

    @Test
    void habilitaAsExtensoesQueOSchemaUsa() {
        List<String> extensoes = jdbc.queryForList("SELECT extname FROM pg_extension", String.class);

        assertThat(extensoes).contains("pgcrypto", "citext", "pg_trgm");
    }
}