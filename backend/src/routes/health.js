import { Router } from 'express';
import { query } from '../lib/db.js';
import { asyncHandler } from '../lib/errors.js';

const router = Router();

router.get('/', asyncHandler(async (_req, res) => {
  const db = await query('SELECT now() AS database_time');
  res.json({
    ok: true,
    database_time: db.rows[0].database_time
  });
}));

export default router;
