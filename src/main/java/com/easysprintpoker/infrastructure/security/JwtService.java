package com.easysprintpoker.infrastructure.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;

@Component
public class JwtService {

    private final SecretKey key;

    public JwtService(@Value("${jwt.secret}") String secret) {
        // For HS256 secret should be at least 32 bytes; pad if shorter (dev only)
        String normalized = secret;
        if (normalized == null || normalized.isBlank()) {
            normalized = "dev-secret-change-me";
        }
        if (normalized.length() < 32) {
            normalized = normalized.repeat((int) Math.ceil(32.0 / Math.max(1, normalized.length())));
        }
        this.key = Keys.hmacShaKeyFor(normalized.getBytes(StandardCharsets.UTF_8));
    }

    public Optional<Claims> parse(String token) {
        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(key)
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
            return Optional.ofNullable(claims);
        } catch (Exception ex) {
            return Optional.empty();
        }
    }

    public String generate(String subject, long ttlSeconds) {
        Instant now = Instant.now();
        Instant exp = now.plusSeconds(Math.max(60, ttlSeconds));
        return Jwts.builder()
                .setSubject(subject)
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(exp))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }
}
