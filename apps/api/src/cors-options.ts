import type { CorsOptions } from "cors";

export const parseAllowedOrigins = () => {
  const raw = process.env.ALLOWED_ORIGINS;
  if (raw) {
    return raw
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
  }
  // default: allow localhost/127.* for dev
  return undefined;
};

export const buildCorsOptions = (origins = parseAllowedOrigins()): CorsOptions => ({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // non-browser or curl

    if (!origins) {
      // dev/default: allow localhost/127.*
      if (
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:")
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    }

    if (origins.includes(origin)) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-tenant-id"],
});
