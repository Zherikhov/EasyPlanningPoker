package com.zherikhov.easyplanningpoker.infrastructure.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.NonNull;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.Optional;

/**
 * JWT auth filter: picks access token from HttpOnly cookie (ACCESS_TOKEN) or Authorization: Bearer ...
 * Validates via JwtProvider and sets SecurityContext.
 */
@Component
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    public static final String ACCESS_COOKIE = "ACCESS_TOKEN";

    private final JwtProvider jwtProvider;
    private final UserDetailsService userDetailsService;

    public JwtAuthenticationFilter(JwtProvider jwtProvider, UserDetailsService userDetailsService) {
        this.jwtProvider = jwtProvider;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        // Skip auth endpoints entirely to avoid interfering with login/registration
        return path != null && path.startsWith("/api/auth/");
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response, @NonNull FilterChain filterChain)
            throws IOException {

        try {
            String token = resolveToken(request);
            if (StringUtils.hasText(token)) {
                String username = jwtProvider.getSubject(token);
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        } catch (io.jsonwebtoken.ExpiredJwtException e) {
            SecurityContextHolder.clearContext();
            log.warn("JWT expired: {}", e.getMessage());
            // Do not write to response here; let the chain continue so exceptionHandling can respond uniformly
        } catch (io.jsonwebtoken.JwtException e) {
            SecurityContextHolder.clearContext();
            log.warn("Invalid JWT: {}", e.getMessage());
        } catch (Exception e) {
            SecurityContextHolder.clearContext();
            log.error("Authentication filter error: {}", e.getMessage());
        } finally {
            try {
                filterChain.doFilter(request, response);
            } catch (Exception chainEx) {
                // If downstream fails, just log; container will handle
                log.debug("Filter chain terminated with exception: {}", chainEx.getMessage());
            }
        }
    }


    private String resolveToken(HttpServletRequest request) {
        // 1) Cookie
        if (request.getCookies() != null) {
            Optional<Cookie> optionalCookie = Arrays.stream(request.getCookies())
                    .filter(it -> ACCESS_COOKIE.equals(it.getName()))
                    .findFirst();
            if (optionalCookie.isPresent() && StringUtils.hasText(optionalCookie.get().getValue())) {
                return optionalCookie.get().getValue();
            }
        }
        // 2) Authorization header
        String authHeader = request.getHeader("Authorization");
        if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        // 3) Query param for SSE fallback
        String accessToken = request.getParameter("access_token");
        if (StringUtils.hasText(accessToken)) return accessToken;
        return null;
    }
}
