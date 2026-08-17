/** Resolve a relative API path to an absolute URL (preserving the origin in SSR/builds). */
export function toApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}${path}`;
}
