import { Router } from 'express';
import { asyncHandler, AppError } from '../lib/errors.js';
import { requireAuth, requireTenant } from '../middleware/auth.js';
import { verifyPassword, signToken } from '../lib/auth.js';
import { withTenantContext } from '../lib/db.js';

const router = Router();

router.post('/login', requireTenant, asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) throw new AppError(400, 'email and password are required.');

  const tenantId = req.tenant.id;
  const user = await withTenantContext(tenantId, async (client) => {
    const result = await client.query(
      `SELECT id, tenant_id, email, password_hash, full_name, role, is_active
         FROM public.users
        WHERE email = $1
        LIMIT 1`,
      [String(email).toLowerCase()]
    );
    return result.rows[0] || null;
  });

  if (!user || !user.is_active) throw new AppError(401, 'Invalid credentials.');
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) throw new AppError(401, 'Invalid credentials.');

  const token = signToken({
    sub: user.id,
    tenant_id: user.tenant_id,
    role: user.role,
    email: user.email,
    name: user.full_name
  });

  res.json({
    token,
    user: {
      id: user.id,
      tenant_id: user.tenant_id,
      email: user.email,
      full_name: user.full_name,
      role: user.role
    },
    tenant: req.tenant
  });
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  res.json({ user: req.auth });
}));

export default router;
