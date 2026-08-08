/**
 * Rate Limit Configuration
 *
 * This is the SINGLE toggle for all rate limiting in the application.
 *
 *   RATE_LIMIT_ENABLED=false  →  ALL rate limiting is DISABLED (development)
 *   RATE_LIMIT_ENABLED=true   →  rate limiting is ENABLED (production)
 *
 * Every rate limiter (client-side, server middleware, API endpoints, edge
 * functions, RPC wrappers, etc.) MUST check `shouldRateLimit()` and bail out
 * immediately when it returns `false`, e.g.:
 *
 *   if (!shouldRateLimit()) {
 *     return next();
 *   }
 *
 * Do NOT hardcode rate limiting on/off anywhere else. Always route through
 * this helper so production can simply set RATE_LIMIT_ENABLED=true without
 * rewriting code.
 */

// Read from the Vite client env (build-time) or from the server env (runtime).
// Defaults to FALSE so development is unrestricted until explicitly enabled.
const clientEnabled = import.meta.env.VITE_RATE_LIMIT_ENABLED === "true";
const serverEnabled = (typeof process !== "undefined" && process.env?.RATE_LIMIT_ENABLED === "true");

export const RATE_LIMIT_ENABLED = clientEnabled || serverEnabled;

/**
 * Returns true only when rate limiting is enabled.
 * Every limiter should short-circuit on this.
 */
export function shouldRateLimit(): boolean {
  return RATE_LIMIT_ENABLED;
}

/**
 * Central rate-limit tuning values. Only consulted when RATE_LIMIT_ENABLED=true.
 */
export function getRateLimitConfig() {
  return {
    enabled: RATE_LIMIT_ENABLED,
    // These values are only used when RATE_LIMIT_ENABLED=true
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per window
    cooldownMs: 60000, // 1 minute cooldown
  };
}
