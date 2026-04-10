/**
 * GET  /api/tenant/profile  — get current tenant's profile
 * PATCH /api/tenant/profile  — update current tenant's profile
 *
 * Tenant admins can read and update their own profile.
 * They cannot change subdomain, slug, or status.
 */

import { Router } from 'express';
import { asyncHandler, AppError } from '../lib/errors.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { query } from '../lib/db.js';

const router = Router();

// All routes require auth
router.use(requireAuth, requireAdmin);

// ─── GET /api/tenant/profile ──────────────────────────────────────────────────

router.get('/', asyncHandler(async (req, res) => {
  const tenantId = req.tenant?.id;
  if (!tenantId) throw new AppError(400, 'Tenant not resolved.');

  const { rows } = await query(
    `SELECT
       id, name, display_name, slug, subdomain, status, timezone,
       logo_url, brand_colour, public_booking_enabled,
       booking_confirmation_message, contact_email,
       created_at, updated_at
     FROM public.tenants
     WHERE id = $1`,
    [tenantId]
  );

  if (rows.length === 0) throw new AppError(404, 'Tenant not found.');
  return res.json(rows[0]);
}));

// ─── PATCH /api/tenant/profile ────────────────────────────────────────────────

router.patch('/', asyncHandler(async (req, res) => {
  const tenantId = req.tenant?.id;
  if (!tenantId) throw new AppError(400, 'Tenant not resolved.');

  const {
    name,
    display_name,
    contact_email,
    timezone,
    logo_url,
    brand_colour,
    public_booking_enabled,
    booking_confirmation_message,
  } = req.body || {};

  // Tenant admins cannot change subdomain, slug, or status
  const { rows } = await query(
    `UPDATE public.tenants SET
       name                         = COALESCE($2, name),
       display_name                 = COALESCE($3, display_name),
       contact_email                = COALESCE($4, contact_email),
       timezone                     = COALESCE($5, timezone),
       logo_url                     = COALESCE($6, logo_url),
       brand_colour                 = COALESCE($7, brand_colour),
       public_booking_enabled       = COALESCE($8, public_booking_enabled),
       booking_confirmation_message = COALESCE($9, booking_confirmation_message),
       updated_at                   = now()
     WHERE id = $1
     RETURNING
       id, name, display_name, slug, subdomain, status, timezone,
       logo_url, brand_colour, public_booking_enabled,
       booking_confirmation_message, contact_email,
       created_at, updated_at`,
    [
      tenantId, name, display_name, contact_email, timezone,
      logo_url, brand_colour, public_booking_enabled,
      booking_confirmation_message,
    ]
  );

  if (rows.length === 0) throw new AppError(404, 'Tenant not found.');
  return res.json(rows[0]);
}));

export default router;
