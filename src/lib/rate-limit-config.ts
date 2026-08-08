/**
 * Rate Limit Configuration
 * 
 * Set RATE_LIMIT_ENABLED=false to disable all rate limiting during development.
 * In production, set RATE_LIMIT_ENABLED=true to enable rate limiting.
 */

export const RATE_LIMIT_ENABLED = import.meta.env.VITE_RATE_LIMIT_ENABLED === 'true';

export function shouldRateLimit(): boolean {
  return RATE_LIMIT_ENABLED;
}

export function getRateLimitConfig() {
  return {
    enabled: RATE_LIMIT_ENABLED,
    // These values are only used when RATE_LIMIT_ENABLED=true
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per window
    cooldownMs: 60000, // 1 minute cooldown
  };
}