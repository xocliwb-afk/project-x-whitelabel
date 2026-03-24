import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@project-x/shared-types';

function respondRoleFailure(
  res: Response,
  status: number,
  message: string,
  code: string,
) {
  return res.status(status).json({
    error: true,
    message,
    code,
    status,
  });
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return respondRoleFailure(res, 401, 'Authentication required', 'UNAUTHENTICATED');
    }
    if (!roles.includes(req.user.role)) {
      return respondRoleFailure(res, 403, 'Insufficient permissions', 'INSUFFICIENT_ROLE');
    }
    return next();
  };
}

export const requireAdmin = requireRole('ADMIN');
