export function getApiBaseUrl(): string {
  // Browser requests should stay same-origin so Next rewrites can proxy `/api`
  // traffic without tripping local/prod CORS differences.
  if (typeof window !== 'undefined') {
    return '';
  }

  const explicit =
    process.env.API_PROXY_TARGET ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL;

  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }

  // Default to relative; Next rewrites proxy to the API.
  return "";
}
