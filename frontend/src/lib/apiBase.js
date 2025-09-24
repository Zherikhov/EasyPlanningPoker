const isBrowser = typeof window !== 'undefined';
let DEFAULT_API_BASE = 'http://localhost:3344';

if (isBrowser) {
  if (window.location.protocol === 'https:') {
    // If the app is served over HTTPS (e.g., https://easysprintpoker.com),
    // always use the same origin to avoid Mixed Content and CORS issues.
    DEFAULT_API_BASE = window.location.origin;
  } else {
    // In local development (Vite runs on http), talk to backend on 3344.
    const host = window.location.hostname || 'localhost';
    DEFAULT_API_BASE = `http://${host}:3344`;
  }
}

// Prefer env var, but never allow an insecure (http) API base when page is served via HTTPS.
function resolveApiBase() {
  let base = (import.meta?.env?.VITE_API_BASE) ? import.meta.env.VITE_API_BASE : DEFAULT_API_BASE;

  if (isBrowser && window.location.protocol === 'https:') {
    try {
      const url = new URL(base, window.location.origin);
      // If provided base is not https or points to a different host, force same-origin https.
      if (url.protocol !== 'https:' || url.hostname !== window.location.hostname) {
        return window.location.origin;
      }
      // normalize to https://host[:port]
      return `https://${url.host}`;
    } catch {
      return window.location.origin;
    }
  }

  return base;
}

export const API_BASE = resolveApiBase();
export const apiUrl = (path) => `${API_BASE}${path}`;
