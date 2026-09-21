package com.caiovisuals.javachat.common.health;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.test.web.servlet.MockMvc;

import com.caiovisuals.javachat.auth.jwt.JwtAuthenticationFilter;

@WebMvcTest(
        controllers = HealthController.class,
        excludeFilters =
                @ComponentScan.Filter(
                        type = FilterType.ASSIGNABLE_TYPE,
                        classes = JwtAuthenticationFilter.class))
@AutoConfigureMockMvc(addFilters = false)
class HealthControllerTest {
    @Autowired
    private MockMvc mvc;

    @Test
    void respondeUpComIdentificacaoDaAplicacao() throws Exception {
        mvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.application").value("javachat"))
                .andExpect(jsonPath("$.version").isNotEmpty())
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
    }
}