import { AuthUser } from '@project-x/shared-types';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      auth?: {
        supabaseId: string;
        email: string;
        accessTokenClaims: Record<string, unknown>;
      };
      tenantId?: string;
    }
  }
}

export {};
