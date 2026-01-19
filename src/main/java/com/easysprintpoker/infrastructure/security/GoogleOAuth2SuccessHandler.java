package com.easysprintpoker.infrastructure.security;

import com.easysprintpoker.domain.entity.AuthIdentityEntity;
import com.easysprintpoker.domain.entity.AuthSessionEntity;
import com.easysprintpoker.domain.entity.UserEntity;
import com.easysprintpoker.domain.enums.AuthProvider;
import com.easysprintpoker.infrastructure.persistence.repository.AuthIdentityJpaRepository;
import com.easysprintpoker.infrastructure.persistence.repository.AuthSessionJpaRepository;
import com.easysprintpoker.infrastructure.persistence.repository.UserJpaRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Component
public class GoogleOAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final UserJpaRepository users;
    private final AuthIdentityJpaRepository identities;
    private final AuthSessionJpaRepository sessions;
    private final JwtService jwtService;
    private final long accessTtlSeconds;
    private final long refreshTtlDays;
    private final String refreshCookieName;
    private final boolean cookieSecure;
    private final String configuredFrontendBaseUrl;

    public GoogleOAuth2SuccessHandler(UserJpaRepository users,
                                      AuthIdentityJpaRepository identities,
                                      AuthSessionJpaRepository sessions,
                                      JwtService jwtService,
                                      @Value("${security.jwt.access-ttl-seconds:900}") long accessTtlSeconds,
                                      @Value("${security.jwt.refresh-ttl-days:30}") long refreshTtlDays,
                                      @Value("${security.jwt.refresh-cookie-name:pp-refresh}") String refreshCookieName,
                                      @Value("${security.cookie.secure:false}") boolean cookieSecure,
                                      @Value("${app.frontend-url:http://localhost:5173}") String frontendBaseUrl) {
        this.users = users;
        this.identities = identities;
        this.sessions = sessions;
        this.jwtService = jwtService;
        this.accessTtlSeconds = accessTtlSeconds;
        this.refreshTtlDays = refreshTtlDays;
        this.refreshCookieName = refreshCookieName;
        this.cookieSecure = cookieSecure;
        this.configuredFrontendBaseUrl = trimTrailingSlash(frontendBaseUrl);
    }

    @Override
    @Transactional
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {
        Map<String, Object> attrs = extractAttributes(authentication);
        String sub = str(attrs.get("sub"));
        String email = str(attrs.get("email"));
        String name = firstNonBlank(str(attrs.get("name")), str(attrs.get("given_name")), "User");
        String picture = str(attrs.get("picture"));
        boolean emailVerified = Boolean.parseBoolean(String.valueOf(attrs.getOrDefault("email_verified", "false")));

        if (sub == null || sub.isBlank()) {
            response.sendError(401, "No Google sub");
            return;
        }

        // find or create identity/user
        AuthIdentityEntity identity = identities.findByProviderAndProviderSubject(AuthProvider.GOOGLE, sub).orElseGet(() -> {
            // try find user by email
            UserEntity user = null;
            if (email != null) {
                String norm = email.trim().toLowerCase();
                Optional<UserEntity> byEmail = users.findAll().stream().filter(u -> norm.equals(u.getEmailNormalized())).findFirst();
                user = byEmail.orElse(null);
            }
            if (user == null) {
                user = new UserEntity();
                user.setEmail(email);
                user.setDisplayName(name);
                user.setAvatarUrl(picture);
                user.setLastLoginAt(OffsetDateTime.now().withNano(0));
                user.setCreatedAt(OffsetDateTime.now().withNano(0));
                user.setUpdatedAt(OffsetDateTime.now().withNano(0));
                if (emailVerified && email != null) {
                    user.setEmailVerifiedAt(OffsetDateTime.now().withNano(0));
                }
                users.save(user);
            }
            AuthIdentityEntity id = new AuthIdentityEntity();
            id.setUser(user);
            id.setProvider(AuthProvider.GOOGLE);
            id.setProviderSubject(sub);
            id.setEmailAtProvider(email);
            id.setLastLoginAt(OffsetDateTime.now().withNano(0));
            return identities.save(id);
        });

        // update login times and data
        UserEntity user = identity.getUser();
        user.setLastLoginAt(OffsetDateTime.now().withNano(0));
        if (name != null && (user.getDisplayName() == null || user.getDisplayName().isBlank())) {
            user.setDisplayName(name);
        }
        if (picture != null && (user.getAvatarUrl() == null || user.getAvatarUrl().isBlank())) {
            user.setAvatarUrl(picture);
        }
        users.save(user);

        identity.setLastLoginAt(OffsetDateTime.now().withNano(0));
        if (email != null) identity.setEmailAtProvider(email);
        identities.save(identity);

        // issue tokens
        String access = jwtService.generate(user.getId().toString(), accessTtlSeconds);
        String refresh = generateRandom256bit();
        String refreshHash = sha256(refresh);

        AuthSessionEntity s = new AuthSessionEntity();
        s.setUser(user);
        s.setRefreshTokenHash(refreshHash);
        s.setCreatedAt(OffsetDateTime.now().withNano(0));
        s.setExpiresAt(OffsetDateTime.now().withNano(0).plus(refreshTtlDays, ChronoUnit.DAYS));
        s.setIp(getClientIp(request));
        s.setUserAgent(Optional.ofNullable(request.getHeader("User-Agent")).orElse(""));
        sessions.save(s);

        // set HTTP-only cookie with refresh
        Cookie cookie = new Cookie(refreshCookieName, refresh);
        cookie.setHttpOnly(true);
        cookie.setSecure(cookieSecure);
        cookie.setPath("/");
        cookie.setMaxAge((int) (refreshTtlDays * 24 * 60 * 60));
        // SameSite set via header (Spring Cookie doesn't expose)
        response.addCookie(cookie);
        response.addHeader("Set-Cookie", refreshCookieName + "=" + refresh + "; Path=/; HttpOnly; Max-Age=" + cookie.getMaxAge() + "; SameSite=Lax" + (cookieSecure ? "; Secure" : ""));

        // redirect back to SPA login handler (absolute URL)
        String baseUrl = resolveFrontendBaseUrl(request);
        String redirect = baseUrl + "/login?token=" + access;
        response.sendRedirect(redirect);
    }

    /**
     * Пытается определить базовый URL фронтенда для редиректа после OAuth2:
     * 1) Origin или Referer заголовок (приоритетно — соответствует домену, где открыта SPA).
     * 2) X-Forwarded-Proto/Host (если есть прокси/ингресс перед приложением).
     * 3) scheme + serverName (+port, если нестандартный).
     * 4) Fallback на app.frontend-url из конфигурации.
     */
    private String resolveFrontendBaseUrl(HttpServletRequest request) {
        // 1) Origin/Referer
        String origin = safeOrigin(request.getHeader("Origin"));
        if (origin == null) origin = safeOrigin(request.getHeader("Referer"));
        if (origin != null) return trimTrailingSlash(origin);

        // 2) X-Forwarded-*
        String proto = headerOrNull(request, "X-Forwarded-Proto");
        String host = headerOrNull(request, "X-Forwarded-Host");
        String port = headerOrNull(request, "X-Forwarded-Port");
        if (proto != null && host != null) {
            String h = host;
            if (port != null && !host.contains(":")) {
                if (!("http".equalsIgnoreCase(proto) && "80".equals(port)) &&
                    !("https".equalsIgnoreCase(proto) && "443".equals(port))) {
                    h = host + ":" + port;
                }
            }
            return proto.toLowerCase() + "://" + trimTrailingSlash(h);
        }

        // 3) request scheme + host
        String scheme = request.getScheme();
        String serverName = request.getServerName();
        int serverPort = request.getServerPort();
        if (scheme != null && serverName != null) {
            boolean isDefaultPort = ("http".equalsIgnoreCase(scheme) && serverPort == 80)
                    || ("https".equalsIgnoreCase(scheme) && serverPort == 443)
                    || serverPort <= 0;
            String hostPort = serverName + (isDefaultPort ? "" : ":" + serverPort);
            return scheme.toLowerCase() + "://" + hostPort;
        }

        // 4) fallback to configured value
        return configuredFrontendBaseUrl;
    }

    private static String headerOrNull(HttpServletRequest req, String name) {
        String v = req.getHeader(name);
        return (v == null || v.isBlank()) ? null : v.trim();
    }

    private static String safeOrigin(String url) {
        if (url == null || url.isBlank()) return null;
        try {
            java.net.URI u = java.net.URI.create(url.trim());
            String scheme = u.getScheme();
            String host = u.getHost();
            int port = u.getPort();
            if (scheme == null || host == null) return null;
            boolean isDefault = ("http".equalsIgnoreCase(scheme) && port == 80)
                    || ("https".equalsIgnoreCase(scheme) && port == 443)
                    || (port == -1);
            String hostPort = host + (isDefault ? "" : ":" + port);
            return scheme + "://" + hostPort;
        } catch (Exception ignored) {
            return null;
        }
    }

    private static Map<String, Object> extractAttributes(Authentication authentication) {
        Object principal = authentication.getPrincipal();
        if (principal instanceof DefaultOAuth2User u) {
            return u.getAttributes();
        }
        if (principal instanceof Map<?,?> m) {
            //noinspection unchecked
            return (Map<String, Object>) m;
        }
        return Map.of();
    }

    private static String str(Object o) { return o == null ? null : String.valueOf(o); }

    private static String trimTrailingSlash(String s) {
        if (s == null) return "";
        return s.endsWith("/") ? s.substring(0, s.length() - 1) : s;
    }

    private static String generateRandom256bit() {
        byte[] b = new byte[32];
        new SecureRandom().nextBytes(b);
        return HexFormat.of().formatHex(b);
    }

    private static String sha256(String s) {
        try {
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(s.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) { throw new IllegalStateException(e); }
    }

    private static String firstNonBlank(String... vals) {
        for (String v : vals) if (v != null && !v.isBlank()) return v;
        return null;
    }

    private static String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return Optional.ofNullable(request.getRemoteAddr()).orElse("");
    }
}
