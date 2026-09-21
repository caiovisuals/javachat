package com.caiovisuals.javachat.auth.jwt;

import java.io.IOException;
import java.util.List;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Traduz {@code Authorization: Bearer <token>} em autenticação do Spring Security
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private static final String HEADER = "Authorization";
    private static final String PREFIX = "Bearer ";

    private final JwtService jwtService;

    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        String header = request.getHeader(HEADER);
        if (header != null && header.startsWith(PREFIX)) {
            jwtService
                    .parse(header.substring(PREFIX.length()))
                    .ifPresent(user -> authenticate(user, request));
        }

        chain.doFilter(request, response);
    }

    private void authenticate(AuthenticatedUser user, HttpServletRequest request) {
        var authentication = new UsernamePasswordAuthenticationToken(user, null, List.of());
        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}