import { createRemoteJWKSet, errors as joseErrors, jwtVerify } from 'jose';

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
const SUPABASE_JWT_ALGORITHM = 'ES256';
const SUPABASE_JWT_AUDIENCE = 'authenticated';

export class AuthTokenError extends Error {
  status = 401;

  constructor(message = 'Invalid or expired token') {
    super(message);
    this.name = 'AuthTokenError';
  }
}

export function isAuthTokenError(error: unknown): error is AuthTokenError {
  return error instanceof AuthTokenError;
}

function getSupabaseBaseUrl(): string {
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL env var');
  }
  return supabaseUrl.replace(/\/+$/, '');
}

function getJWKS() {
  if (!jwks) {
    jwks = createRemoteJWKSet(
      new URL(`${getSupabaseBaseUrl()}/auth/v1/.well-known/jwks.json`),
    );
  }
  return jwks;
}

function getIssuer(): string {
  return `${getSupabaseBaseUrl()}/auth/v1`;
}

export interface VerifiedToken {
  aud: string | string[];
  sub: string;
  email: string;
  role: string;
  exp: number;
  tenantId?: string | null;
  [key: string]: unknown;
}

function isAuthVerificationFailure(error: unknown): boolean {
  return (
    error instanceof joseErrors.JWTExpired ||
    error instanceof joseErrors.JWTClaimValidationFailed ||
    error instanceof joseErrors.JWTInvalid ||
    error instanceof joseErrors.JWSInvalid ||
    error instanceof joseErrors.JWSSignatureVerificationFailed ||
    error instanceof joseErrors.JWKSNoMatchingKey ||
    error instanceof joseErrors.JOSEAlgNotAllowed ||
    error instanceof joseErrors.JOSENotSupported
  );
}

export async function verifySupabaseToken(token: string): Promise<VerifiedToken> {
  try {
    const { payload } = await jwtVerify(token, getJWKS(), {
      issuer: getIssuer(),
      audience: SUPABASE_JWT_AUDIENCE,
      algorithms: [SUPABASE_JWT_ALGORITHM],
    });

    const sub = typeof payload.sub === 'string' ? payload.sub : null;
    const email = typeof payload.email === 'string' ? payload.email : null;
    const role = typeof payload.role === 'string' ? payload.role : null;
    const exp = typeof payload.exp === 'number' ? payload.exp : null;
    const aud =
      typeof payload.aud === 'string' ||
      (Array.isArray(payload.aud) &&
        payload.aud.every((value) => typeof value === 'string'))
        ? payload.aud
        : null;
    const tenantId =
      typeof payload.tenant_id === 'string'
        ? payload.tenant_id
        : typeof payload.tenantId === 'string'
          ? payload.tenantId
          : null;

    if (!sub || !email || !role || exp === null || !aud) {
      throw new AuthTokenError('Invalid token claims');
    }

    return {
      ...(payload as Record<string, unknown>),
      aud,
      email,
      exp,
      role,
      sub,
      tenantId,
    };
  } catch (error) {
    if (error instanceof AuthTokenError) {
      throw error;
    }
    if (isAuthVerificationFailure(error)) {
      throw new AuthTokenError(
        error instanceof Error ? error.message : 'Invalid or expired token',
      );
    }
    throw error;
  }
}
