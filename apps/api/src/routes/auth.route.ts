import { Router } from 'express';
import type {
  RegisterRequest,
  LoginRequest,
  RefreshTokenRequest,
  UpdateProfileRequest,
} from '@project-x/shared-types';
import * as authService from '../services/auth.service';
import { requireAuth } from '../middleware/auth';
import { resolveTenant } from '../middleware/tenant';

const router = Router();

/**
 * POST /api/auth/register
 * Create a new user account.
 */
router.post('/register', resolveTenant, async (req, res) => {
  try {
    const { email, password, displayName, phone } = req.body as RegisterRequest;

    if (!email || !password) {
      return res.status(400).json({ error: true, message: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: true, message: 'Password must be at least 6 characters' });
    }

    const result = await authService.register(
      email,
      password,
      req.tenantId!,
      displayName,
      phone,
    );

    return res.status(201).json(result);
  } catch (err: any) {
    const status = err.status ?? 500;
    const message = status < 500 ? err.message : 'Registration failed';
    if (status >= 500) console.error('[auth] Register error:', err);
    return res.status(status).json({ error: true, message });
  }
});

/**
 * POST /api/auth/login
 * Authenticate an existing user.
 */
router.post('/login', resolveTenant, async (req, res) => {
  try {
    const { email, password } = req.body as LoginRequest;

    if (!email || !password) {
      return res.status(400).json({ error: true, message: 'Email and password are required' });
    }

    const result = await authService.login(email, password, req.tenantId!);

    return res.status(200).json(result);
  } catch (err: any) {
    const status = err.status ?? 500;
    const message = status < 500 ? err.message : 'Login failed';
    if (status >= 500) console.error('[auth] Login error:', err);
    return res.status(status).json({ error: true, message });
  }
});

/**
 * GET /api/auth/me
 * Get the current authenticated user's profile.
 */
router.get('/me', requireAuth, (req, res) => {
  return res.status(200).json(req.user);
});

/**
 * PATCH /api/auth/me
 * Update the current user's profile.
 */
router.patch('/me', requireAuth, async (req, res) => {
  try {
    const { displayName, phone } = req.body as UpdateProfileRequest;

    const updated = await authService.updateProfile(req.user!.id, {
      displayName,
      phone,
    });

    return res.status(200).json(updated);
  } catch (err: any) {
    console.error('[auth] Update profile error:', err);
    return res.status(500).json({ error: true, message: 'Failed to update profile' });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh an access token using a refresh token.
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body as RefreshTokenRequest;

    if (!refreshToken) {
      return res.status(400).json({ error: true, message: 'Refresh token is required' });
    }

    const tokens = await authService.refresh(refreshToken);

    return res.status(200).json(tokens);
  } catch (err: any) {
    const status = err.status ?? 500;
    const message = status < 500 ? err.message : 'Token refresh failed';
    if (status >= 500) console.error('[auth] Refresh error:', err);
    return res.status(status).json({ error: true, message });
  }
});

/**
 * POST /api/auth/logout
 * Log out the current user.
 */
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') ?? '';
    await authService.logout(token);
    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('[auth] Logout error:', err);
    return res.status(500).json({ error: true, message: 'Logout failed' });
  }
});

export default router;
