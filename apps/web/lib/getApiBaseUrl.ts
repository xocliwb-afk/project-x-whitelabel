export function getApiBaseUrl(): string {
  const explicit =
    process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL;

  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }

  // Default to relative; Next rewrites proxy to the API.
  return "";
}
