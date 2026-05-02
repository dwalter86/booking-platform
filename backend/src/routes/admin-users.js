import { Router } from 'express';
import { asyncHandler, AppError } from '../lib/errors.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { withTenantContext } from '../lib/db.js';
import { hashPassword } from '../lib/auth.js';
import { writeAudit } from '../services/audit-service.js';
import { getTenantEntitlements, checkAbsoluteLimit } from '../services/entitlements-service.js';

const router = Router();

router.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const rows = await withTenantContext(req.auth.tenant_id, async (client) => {
    const result = await client.query(
      `SELECT id, tenant_id, email, full_name, role, is_active, last_login_at, created_at, updated_at
         FROM public.users
      WHERE is_super_admin = false
        ORDER BY created_at DESC`
    );
    return result.rows;
  });
  res.json(rows);
}));

router.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { email, password, full_name, role = 'admin' } = req.body || {};
  if (!email || !password || !full_name) throw new AppError(400, 'email, password and full_name are required.');
  const created = await withTenantContext(req.auth.tenant_id, async (client) => {
    const entitlements = await getTenantEntitlements(client, req.auth.tenant_id);
    const currentCountResult = await client.query(
      `SELECT COUNT(*)::int AS total FROM public.users WHERE is_super_admin = false`
    );
    const limit = entitlements.limits['admin_users_count:absolute'];
    if (!checkAbsoluteLimit(currentCountResult.rows[0].total, limit)) {
      throw new AppError(402, 'Admin user limit reached for your current plan. Upgrade to add more users.');
    }

    const passwordHash = await hashPassword(password);
    const result = await client.query(
      `INSERT INTO public.users (tenant_id, email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, tenant_id, email, full_name, role, is_active, created_at, updated_at`,
      [req.auth.tenant_id, String(email).toLowerCase(), passwordHash, full_name, role]
    );
    await writeAudit(client, req.auth.tenant_id, req.auth.sub, 'user', result.rows[0].id, 'created', { email, full_name, role });
    return result.rows[0];
  });
  res.status(201).json(created);
}));

router.patch('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const user = await withTenantContext(req.auth.tenant_id, async (client) => {
    const currentResult = await client.query(`SELECT * FROM public.users WHERE id = $1`, [req.params.id]);
    const current = currentResult.rows[0];
    if (!current) throw new AppError(404, 'User not found.');
    const next = { ...current, ...(req.body || {}) };
    let passwordHash = current.password_hash;
    if (req.body?.password) passwordHash = await hashPassword(req.body.password);
    const result = await client.query(
      `UPDATE public.users
          SET email = $2,
              password_hash = $3,
              full_name = $4,
              role = $5,
              is_active = $6
        WHERE id = $1
      RETURNING id, tenant_id, email, full_name, role, is_active, last_login_at, created_at, updated_at`,
      [req.params.id, next.email, passwordHash, next.full_name, next.role, next.is_active]
    );
    await writeAudit(client, req.auth.tenant_id, req.auth.sub, 'user', req.params.id, 'updated', req.body || {});
    return result.rows[0];
  });
  res.json(user);
}));

export default router;
