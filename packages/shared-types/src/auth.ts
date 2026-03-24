export type UserRole = 'CONSUMER' | 'AGENT' | 'ADMIN';

export interface AuthUser {
  id: string;
  supabaseId: string;
  tenantId: string;
  email: string;
  displayName: string | null;
  phone: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  displayName?: string;
  phone?: string;
}

export interface RegisterResponse {
  user: AuthUser;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface UpdateProfileRequest {
  displayName?: string;
  phone?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number | null;
}

export interface AuthResponse extends AuthTokens {
  user: AuthUser;
}

export interface LogoutResponse {
  success: true;
}
