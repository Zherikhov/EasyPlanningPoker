package com.zherikhov.easyplanningpoker.infrastructure.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;

@Component
public class JwtProvider {

    private final Key key;
    private final long expirationMillis;

    public JwtProvider(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-ms}") long expirationMillis
    ) {
        // HS256 requires at least 256-bit (32-byte) key length
        if (secret == null || secret.trim().length() < 32) {
            throw new IllegalStateException("JWT secret must be at least 32 characters long. Set 'app.jwt.secret' property.");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMillis = expirationMillis;
    }

    public String generateToken(String subject) {
        return generateTokenWithTtl(subject, expirationMillis);
    }

    public String generateTokenWithTtl(String subject, long ttlMillis) {
        Date now = new Date();
        io.jsonwebtoken.JwtBuilder builder = Jwts.builder()
                .setSubject(subject)
                .setIssuedAt(now)
                .signWith(key, SignatureAlgorithm.HS256);
        // If ttlMillis <= 0, do not set expiration -> non-expiring token
        if (ttlMillis > 0) {
            Date expiry = new Date(now.getTime() + ttlMillis);
            builder.setExpiration(expiry);
        }
        return builder.compact();
    }

    public String getSubject(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .setAllowedClockSkewSeconds(60)
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }

    public long getExpirationMillis() {
        return expirationMillis;
    }
}
