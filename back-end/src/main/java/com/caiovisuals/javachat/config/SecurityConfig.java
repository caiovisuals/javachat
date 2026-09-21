package com.caiovisuals.javachat.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.caiovisuals.javachat.auth.jwt.JwtAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtAuthenticationFilter jwtFilter)
            throws Exception {

        return http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(
                        auth ->
                                auth.requestMatchers(
                                                "/api/auth/register",
                                                "/api/auth/login",
                                                "/api/auth/refresh",
                                                "/api/auth/logout",
                                                "/api/health",
                                                "/actuator/health/**",
                                                "/swagger-ui.html",
                                                "/swagger-ui/**",
                                                "/v3/api-docs/**")
                                        .permitAll()
                                        .anyRequest()
                                        .authenticated())
                .exceptionHandling(
                        handling ->
                                handling
                                        .authenticationEntryPoint(
                                                (request, response, e) ->
                                                        writeError(response, HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED"))
                                        .accessDeniedHandler(
                                                (request, response, e) ->
                                                        writeError(response, HttpStatus.FORBIDDEN, "FORBIDDEN")))
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    private static void writeError(
            jakarta.servlet.http.HttpServletResponse response, HttpStatus status, String code)
            throws java.io.IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(java.nio.charset.StandardCharsets.UTF_8.name());
        response
                .getWriter()
                .write(
                        """
                        {"status":%d,"code":"%s","message":"Autenticação necessária."}"""
                                .formatted(status.value(), code));
    }
}