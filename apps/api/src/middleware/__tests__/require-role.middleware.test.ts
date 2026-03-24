import { describe, expect, it, vi } from 'vitest';

import { requireAdmin, requireRole } from '../require-role';

function createResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as any;
}

describe('require-role middleware', () => {
  it('returns UNAUTHENTICATED when no user context is present', () => {
    const middleware = requireRole('ADMIN');
    const req = {} as any;
    const res = createResponse();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: true,
      message: 'Authentication required',
      code: 'UNAUTHENTICATED',
      status: 401,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns INSUFFICIENT_ROLE when the authenticated user lacks the required role', () => {
    const middleware = requireRole('ADMIN');
    const req = {
      user: {
        role: 'AGENT',
      },
    } as any;
    const res = createResponse();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: true,
      message: 'Insufficient permissions',
      code: 'INSUFFICIENT_ROLE',
      status: 403,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next when the user has the required role', () => {
    const middleware = requireAdmin;
    const req = {
      user: {
        role: 'ADMIN',
      },
    } as any;
    const res = createResponse();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
