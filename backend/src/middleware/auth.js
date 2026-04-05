import { verifyToken } from '../lib/auth.js';
import { AppError } from '../lib/errors.js';

export function requireAuth(req, _res, next) {
  try {
    const header = req.header('authorization') || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new AppError(401, 'Missing bearer token.');
    }
    req.auth = verifyToken(token);
    next();
  } catch (_error) {
    next(new AppError(401, 'Invalid or expired token.'));
  }
}

export function requireTenant(req, _res, next) {
  if (!req.tenant) return next(new AppError(400, 'Unable to resolve tenant from subdomain/header.'));
  if (req.tenant.status !== 'active') return next(new AppError(403, 'Tenant is not active.'));
  next();
}

export function requireAdmin(req, _res, next) {
  if (!req.auth) return next(new AppError(401, 'Authentication required.'));
  if (!['owner', 'admin'].includes(req.auth.role)) return next(new AppError(403, 'Admin role required.'));
  next();
}
