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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Component
/**
 * AuthenticationSuccessHandler for Google OAuth2 login.
 *
 * Responsibilities:
 * - Find or create the application user mapped to Google identity.
 * - Issue access JWT and create a refresh session with an HttpOnly cookie.
 * - Redirect the browser back to the SPA with the access token in the query string.
 *
 * Security and robustness notes:
 * - The redirect base URL is resolved with a strict preference to the configured
 *   "app.frontend-url". When that value accidentally points to localhost on a
 *   production host, we attempt a safe override using X-Forwarded-* headers to the
 *   public host (if present), preventing redirects to http://localhost:5173 in PROD.
 * - We never fall back to backend host to avoid redirecting SPA flows to API domain.
 */
public class GoogleOAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final UserJpaRepository users;
    private final AuthIdentityJpaRepository identities;
    private final AuthSessionJpaRepository sessions;
    private final JwtService jwtService;
    private final long accessTtlSeconds;
    private final long refreshTtlDays;
    private final String refreshCookieName;
    private final boolean cookieSecure;
    private final String cookieSameSite;
    private final String configuredFrontendBaseUrl;
    private final boolean behindProxyEnabled;

    private static final Logger log = LoggerFactory.getLogger(GoogleOAuth2SuccessHandler.class);

    public GoogleOAuth2SuccessHandler(UserJpaRepository users,
                                      AuthIdentityJpaRepository identities,
                                      AuthSessionJpaRepository sessions,
                                      JwtService jwtService,
                                      @Value("${security.jwt.access-ttl-seconds:900}") long accessTtlSeconds,
                                      @Value("${security.jwt.refresh-ttl-days:30}") long refreshTtlDays,
                                      @Value("${security.jwt.refresh-cookie-name:pp-refresh}") String refreshCookieName,
                                      @Value("${security.cookie.secure:false}") boolean cookieSecure,
                                      @Value("${security.cookie.same-site:Lax}") String cookieSameSite,
                                      @Value("${app.frontend-url:}") String frontendBaseUrl,
                                      @Value("${app.behind-proxy-enabled:false}") boolean behindProxyEnabled) {
         this.users = users;
         this.identities = identities;
         this.sessions = sessions;
         this.jwtService = jwtService;
         this.accessTtlSeconds = accessTtlSeconds;
         this.refreshTtlDays = refreshTtlDays;
         this.refreshCookieName = refreshCookieName;
         this.cookieSecure = cookieSecure;
         this.cookieSameSite = normalizeSameSite(cookieSameSite);
         this.configuredFrontendBaseUrl = trimTrailingSlash(frontendBaseUrl);
         this.behindProxyEnabled = behindProxyEnabled;
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
                user = users.findByEmailNormalized(norm).orElse(null);
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
        response.addHeader("Set-Cookie", refreshCookieName + "=" + refresh + "; Path=/; HttpOnly; Max-Age=" + cookie.getMaxAge() + "; SameSite=" + cookieSameSite + (cookieSecure ? "; Secure" : ""));

        // redirect back to SPA login handler (absolute URL)
        var resolution = resolveFrontendBaseUrl(request);
        if (resolution.baseUrl == null || resolution.baseUrl.isBlank()) {
            // Явная конфигурационная ошибка — не редиректим на backend host.
            String msg = "Frontend base URL is not configured. Set app.frontend-url or enable app.behind-proxy-enabled with proper X-Forwarded headers";
            log.warn("OAuth2 redirect resolution failed: source={}, reason={}", resolution.source, msg);
            response.setStatus(500);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":{\"code\":\"CONFIG_ERROR\",\"message\":\"" + msg + "\"}}\n");
            return;
        }

        String baseUrl = resolution.baseUrl;
        String redirect = baseUrl + "/?token=" + access;
        // Логируем источник и конечный base URL (без полного токена)
        String tokenPreview = access.length() > 12 ? access.substring(0, 12) + "…" : access;
        log.info("OAuth2 redirect: source={}, baseUrl={}, tokenPreview={}", resolution.source, baseUrl, tokenPreview);
        response.sendRedirect(redirect);
    }

    /**
     * Resolves the SPA base URL for post-OAuth2 redirection.
     * Priority:
     * 1) app.frontend-url (single source of truth).
     *    If it points to a localhost host but the request carries public X-Forwarded-*
     *    headers, we safely override to forwarded host to avoid redirecting to localhost in PROD.
     * 2) X-Forwarded-Proto/Host (when behind a proxy) if configured or needed for localhost override.
     * 3) Otherwise: return null (we never fall back to backend host to avoid SPA misrouting).
     */
    private RedirectResolution resolveFrontendBaseUrl(HttpServletRequest request) {
        // 1) Configured value dominates, with a localhost safety override using X-Forwarded-*
        if (configuredFrontendBaseUrl != null && !configuredFrontendBaseUrl.isBlank()) {
            if (isLocalhostUrl(configuredFrontendBaseUrl)) {
                String forwarded = forwardedBaseUrl(request);
                if (forwarded != null && !isLocalhostUrl(forwarded)) {
                    return new RedirectResolution(forwarded, "X_FORWARDED_OVERRIDE_LOCALHOST");
                }
            }
            return new RedirectResolution(configuredFrontendBaseUrl, "CONFIG");
        }

        // 2) If explicitly allowed to trust proxy headers — use them
        if (behindProxyEnabled) {
            String forwarded = forwardedBaseUrl(request);
            if (forwarded != null) {
                return new RedirectResolution(forwarded, "X_FORWARDED");
            }
        }

        // 3) No unsafe fallbacks
        return new RedirectResolution(null, "ERROR");
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

    /**
     * Проверяет, что origin относится к нашему фронтенду. Это защищает от случаев,
     * когда Referer/Origin приходят от *.google.com в OAuth-флоу и мы по ошибке
     * редиректим пользователя обратно в Google (myaccount.google.com).
     */
    private boolean isTrustedFrontendOrigin(String origin, HttpServletRequest request) {
        try {
            java.net.URI o = java.net.URI.create(origin);
            String oHost = o.getHost();
            if (oHost == null) return false;

            // 1) Отсекаем заведомо посторонние домены (google, facebook и т.д.)
            String lower = oHost.toLowerCase();
            if (lower.endsWith(".google.com") || lower.equals("google.com")) return false;

            // 2) Сравниваем с хостом из конфигурации app.frontend-url
            java.net.URI cfg = java.net.URI.create(configuredFrontendBaseUrl);
            String cfgHost = cfg.getHost();
            if (cfgHost != null && cfgHost.equalsIgnoreCase(oHost)) return true;

            // 3) Сравниваем с текущим хостом запроса (или X-Forwarded-Host)
            String xfHost = headerOrNull(request, "X-Forwarded-Host");
            if (xfHost != null && !xfHost.isBlank()) {
                // берём первый хост, если их несколько через запятую
                String first = xfHost.split(",")[0].trim();
                if (!first.isEmpty() && first.equalsIgnoreCase(oHost)) return true;
            }

            String reqHost = request.getServerName();
            if (reqHost != null && reqHost.equalsIgnoreCase(oHost)) return true;

            // Не узнали — не доверяем
            return false;
        } catch (Exception e) {
            return false;
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

    private static String normalizeSameSite(String v) {
        if (v == null) return "Lax";
        String x = v.trim();
        if (x.equalsIgnoreCase("None")) return "None";
        if (x.equalsIgnoreCase("Strict")) return "Strict";
        return "Lax";
    }

    private static boolean isLocalhostUrl(String url) {
        try {
            java.net.URI u = java.net.URI.create(url);
            String host = u.getHost();
            if (host == null) return false;
            String h = host.toLowerCase();
            return h.equals("localhost") || h.equals("127.0.0.1") || h.equals("::1");
        } catch (Exception e) {
            return false;
        }
    }

    private static String forwardedBaseUrl(HttpServletRequest request) {
        String proto = headerOrNull(request, "X-Forwarded-Proto");
        String host = headerOrNull(request, "X-Forwarded-Host");
        String port = headerOrNull(request, "X-Forwarded-Port");
        if (proto == null || host == null) return null;
        // If multiple hosts are present, use the first one
        String hostOnly = host.contains(",") ? host.split(",")[0].trim() : host;
        String h = hostOnly;
        if (port != null && !hostOnly.contains(":")) {
            boolean isDefault = ("http".equalsIgnoreCase(proto) && "80".equals(port)) ||
                    ("https".equalsIgnoreCase(proto) && "443".equals(port));
            if (!isDefault) h = hostOnly + ":" + port;
        }
        return proto.toLowerCase() + "://" + trimTrailingSlash(h);
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

    /**
     * Результат вычисления адреса редиректа и источник, откуда он получен.
     */
    private static final class RedirectResolution {
        final String baseUrl;
        final String source; // CONFIG | X_FORWARDED | X_FORWARDED_OVERRIDE_LOCALHOST | ERROR

        RedirectResolution(String baseUrl, String source) {
            this.baseUrl = baseUrl == null ? null : trimTrailingSlash(baseUrl);
            this.source = source;
        }
    }
}
