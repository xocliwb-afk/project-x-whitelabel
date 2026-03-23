import { jwtVerify } from 'jose';

let secret: Uint8Array | null = null;

function getSecret(): Uint8Array {
  if (!secret) {
    const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
    if (!SUPABASE_JWT_SECRET) {
      throw new Error('Missing SUPABASE_JWT_SECRET env var');
    }
    secret = new TextEncoder().encode(SUPABASE_JWT_SECRET);
  }
  return secret;
}

export interface VerifiedToken {
  sub: string;       // Supabase user ID
  email: string;
  role: string;      // Supabase role (not our app role)
  exp: number;
  [key: string]: unknown;
}

export async function verifySupabaseToken(token: string): Promise<VerifiedToken> {
  const { payload } = await jwtVerify(token, getSecret(), {
    issuer: `https://${process.env.SUPABASE_URL?.replace('https://', '')}/auth/v1`,
  });

  if (!payload.sub || !payload.email) {
    throw new Error('Invalid token payload: missing sub or email');
  }

  return payload as unknown as VerifiedToken;
}
