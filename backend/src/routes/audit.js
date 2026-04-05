import { Router } from 'express';
import { asyncHandler } from '../lib/errors.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { withTenantContext } from '../lib/db.js';

const router = Router();

router.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const rows = await withTenantContext(req.auth.tenant_id, async (client) => {
    const result = await client.query(
      `SELECT * FROM public.audit_log ORDER BY created_at DESC LIMIT 500`
    );
    return result.rows;
  });
  res.json(rows);
}));

export default router;
