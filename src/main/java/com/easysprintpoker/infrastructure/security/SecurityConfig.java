package com.easysprintpoker.infrastructure.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtService jwtService, GoogleOAuth2SuccessHandler oAuth2SuccessHandler, com.easysprintpoker.infrastructure.persistence.repository.AuthSessionJpaRepository authSessions, @org.springframework.beans.factory.annotation.Value("${security.jwt.refresh-cookie-name:pp-refresh}") String refreshCookieName) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(reg -> reg
                        // Публичные API-эндпойнты аутентификации
                        .requestMatchers("/api/v1/auth/login", "/api/v1/auth/register", "/api/v1/auth/refresh").permitAll()
                        .requestMatchers("/oauth2/**", "/login/oauth2/**").permitAll()

                        // Публичные ресурсы SPA (статические файлы Vite build)
                        .requestMatchers(
                                "/", 
                                "/index.html",
                                "/favicon.ico",
                                "/manifest*",
                                "/robots.txt",
                                "/assets/**",
                                "/image/**",
                                "/static/**",
                                "/login",
                                "/login/**",
                                "/register",
                                "/register/**",
                                // SPA маршруты приложения (должны быть публичными, чтобы страница загружалась, а API останутся защищёнными)
                                "/boards",
                                "/boards/**"
                        ).permitAll()

                        // Остальные запросы защищены
                        .anyRequest().authenticated()
                )
                .oauth2Login(oauth -> oauth.successHandler(oAuth2SuccessHandler))
                // Сначала пробуем Bearer; если не удалось аутентифицировать — фоллбэк на refresh-cookie
                .addFilterBefore(new BearerAuthFilter(jwtService), UsernamePasswordAuthenticationFilter.class)
                .addFilterAfter(new RefreshCookieAuthFilter(authSessions, refreshCookieName), BearerAuthFilter.class)
                .exceptionHandling(c -> c
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.getWriter().write("{\"error\":{\"code\":\"UNAUTHORIZED\",\"message\":\"Unauthorized\"}}\n");
                        })
                );
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    static class BearerAuthFilter extends OncePerRequestFilter {
        private final JwtService jwtService;

        public BearerAuthFilter(JwtService jwtService) {this.jwtService = jwtService;}

        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
            String auth = request.getHeader(HttpHeaders.AUTHORIZATION);
            if (auth != null && auth.startsWith("Bearer ")) {
                String token = auth.substring(7);
                jwtService.parse(token).ifPresent(claims -> {
                    String sub = claims.getSubject();
                    if (sub != null) {
                        Authentication a = new SimpleAuthToken(sub);
                        SecurityContextHolder.getContext().setAuthentication(a);
                    }
                });
            }
            filterChain.doFilter(request, response);
        }
    }

    static class SimpleAuthToken extends AbstractAuthenticationToken {
        private final String subject;

        public SimpleAuthToken(String subject) {
            super(List.of(new SimpleGrantedAuthority("ROLE_USER")));
            this.subject = subject;
            setAuthenticated(true);
        }

        @Override
        public Object getCredentials() { return ""; }

        @Override
        public Object getPrincipal() { return Map.of("userId", subject); }
    }

    static class RefreshCookieAuthFilter extends OncePerRequestFilter {
        private final com.easysprintpoker.infrastructure.persistence.repository.AuthSessionJpaRepository authSessions;
        private final String refreshCookieName;

        public RefreshCookieAuthFilter(com.easysprintpoker.infrastructure.persistence.repository.AuthSessionJpaRepository authSessions, String refreshCookieName) {
            this.authSessions = authSessions;
            this.refreshCookieName = refreshCookieName;
        }

        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
            // Если уже аутентифицировано — пропускаем
            if (SecurityContextHolder.getContext().getAuthentication() != null) {
                filterChain.doFilter(request, response);
                return;
            }
            // Не обращаем внимания на наличие заголовка Authorization —
            // Bearer-фильтр уже отработал и, если токен невалиден/просрочен, аутентификация не установлена.

            String refresh = readCookie(request, refreshCookieName);
            if (refresh != null && !refresh.isBlank()) {
                String hash = sha256(refresh);
                try {
                    authSessions.findByRefreshTokenHash(hash).ifPresent(session -> {
                        var revokedAt = session.getRevokedAt();
                        var expiresAt = session.getExpiresAt();
                        var now = java.time.OffsetDateTime.now().withNano(0);
                        if (revokedAt == null && (expiresAt == null || !expiresAt.isBefore(now))) {
                            var userId = session.getUser().getId().toString();
                            Authentication a = new SimpleAuthToken(userId);
                            SecurityContextHolder.getContext().setAuthentication(a);
                        }
                    });
                } catch (Exception ignore) {
                    // Никоим образом не прерываем запрос, чтобы не ломать публичные страницы/логи
                }
            }

            filterChain.doFilter(request, response);
        }

        private static String readCookie(HttpServletRequest request, String name) {
            if (request.getCookies() == null) return null;
            for (jakarta.servlet.http.Cookie c : request.getCookies()) {
                if (name.equals(c.getName())) return c.getValue();
            }
            return null;
        }

        private static String sha256(String input) {
            try {
                java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
                byte[] hash = md.digest(input.getBytes(java.nio.charset.StandardCharsets.UTF_8));
                return java.util.HexFormat.of().formatHex(hash);
            } catch (java.security.NoSuchAlgorithmException e) {
                throw new IllegalStateException("SHA-256 not available", e);
            }
        }
    }
}
