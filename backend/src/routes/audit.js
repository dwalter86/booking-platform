import { Router } from 'express';
import { asyncHandler } from '../lib/errors.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { withTenantContext } from '../lib/db.js';

const router = Router();

router.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query?.page ?? '1', 10) || 1);
  const perPage = Math.min(100, Math.max(1, Number.parseInt(req.query?.per_page ?? '50', 10) || 50));
  const offset = (page - 1) * perPage;

  const result = await withTenantContext(req.auth.tenant_id, async (client) => {
    const query = await client.query(
      `SELECT *, COUNT(*) OVER() AS total_count
         FROM public.audit_log
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2`,
      [perPage, offset]
    );
    const totalCount = query.rows.length > 0 ? Number(query.rows[0].total_count) : 0;
    const rows = query.rows.map(({ total_count, ...row }) => row);
    return { rows, totalCount };
  });

  res.json({
    data: result.rows,
    pagination: {
      page,
      per_page: perPage,
      total_count: result.totalCount,
      total_pages: Math.ceil(result.totalCount / perPage)
    }
  });
}));

export default router;
