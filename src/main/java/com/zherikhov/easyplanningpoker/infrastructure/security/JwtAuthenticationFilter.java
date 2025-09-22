package com.zherikhov.easyplanningpoker.infrastructure.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
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
import java.util.UUID;

/**
 * JWT auth filter: picks access token from HttpOnly cookie (ACCESS_TOKEN) or Authorization: Bearer ...
 * Validates via JwtProvider and sets SecurityContext.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    public static final String ACCESS_COOKIE = "ACCESS_TOKEN";

    private final JwtProvider jwtProvider;
    private final UserDetailsService userDetailsService;

    public JwtAuthenticationFilter(JwtProvider jwtProvider, UserDetailsService userDetailsService) {
        this.jwtProvider = jwtProvider;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        try {
            String token = resolveToken(request);
            if (StringUtils.hasText(token)) {
                String subject = jwtProvider.getSubject(token);
                String username = subject;
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                Authentication auth = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                ((UsernamePasswordAuthenticationToken) auth).setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        filterChain.doFilter(request, response);
    }


    private String resolveToken(HttpServletRequest request) {
        // 1) Cookie
        if (request.getCookies() != null) {
            Optional<Cookie> c = Arrays.stream(request.getCookies())
                    .filter(it -> ACCESS_COOKIE.equals(it.getName()))
                    .findFirst();
            if (c.isPresent() && StringUtils.hasText(c.get().getValue())) {
                return c.get().getValue();
            }
        }
        // 2) Authorization header
        String authHeader = request.getHeader("Authorization");
        if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        // 3) Query param for SSE fallback
        String q = request.getParameter("access_token");
        if (StringUtils.hasText(q)) return q;
        return null;
    }
}
