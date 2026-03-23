import { jwtVerify, createRemoteJWKSet } from 'jose';

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!jwks) {
    const supabaseUrl = process.env.SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Missing SUPABASE_URL env var');
    }
    const baseUrl = supabaseUrl.replace(/\/+$/, '');
    jwks = createRemoteJWKSet(new URL(`${baseUrl}/auth/v1/.well-known/jwks.json`));
  }
  return jwks;
}

export interface VerifiedToken {
  sub: string;       // Supabase user ID
  email: string;
  role: string;      // Supabase role (not our app role)
  exp: number;
  [key: string]: unknown;
}

export async function verifySupabaseToken(token: string): Promise<VerifiedToken> {
  const { payload } = await jwtVerify(token, getJWKS(), {
    issuer: `https://${process.env.SUPABASE_URL?.replace('https://', '')}/auth/v1`,
  });

  if (!payload.sub || !payload.email) {
    throw new Error('Invalid token payload: missing sub or email');
  }

  return payload as unknown as VerifiedToken;
}
