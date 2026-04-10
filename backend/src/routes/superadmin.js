/**
 * Super-Admin Routes
 * /api/superadmin/*
 *
 * All routes require a valid JWT with is_super_admin = true.
 * These routes operate across all tenants — no tenant scoping.
 *
 * Endpoints:
 *   GET    /api/superadmin/tenants                          — list all tenants
 *   POST   /api/superadmin/tenants                          — create tenant + subscription + first admin
 *   GET    /api/superadmin/tenants/:id                      — tenant detail with usage
 *   PATCH  /api/superadmin/tenants/:id                      — update tenant profile/status
 *   PATCH  /api/superadmin/tenants/:id/subscription         — change plan / extend trial
 *   GET    /api/superadmin/tenants/:id/users                — list tenant admin users
 *   POST   /api/superadmin/tenants/:id/users/:uid/reset-password — reset user password
 */

import { Router } from 'express';
import { asyncHandler, AppError } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { hashPassword } from '../lib/auth.js';
import { query, withTenantContext } from '../lib/db.js';

const router = Router();

// ─── Super-admin guard ─────────────────────────────────────────────────────────

function requireSuperAdmin(req, _res, next) {
  if (!req.auth)              return next(new AppError(401, 'Authentication required.'));
  if (!req.auth.is_super_admin) return next(new AppError(403, 'Super-admin access required.'));
  next();
}

// Apply auth + super-admin guard to all routes in this file
router.use(requireAuth, requireSuperAdmin);

// ─── Helpers ───────────────────────────────────────────────────────────────────

function validateSubdomain(subdomain) {
  if (!subdomain) return 'Subdomain is required.';
  if (!/^[a-z0-9][a-z0-9-]{0,28}[a-z0-9]$/.test(subdomain)) {
    return 'Subdomain must be 2-30 characters, lowercase alphanumeric and hyphens only, no leading/trailing hyphens.';
  }
  return null;
}

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
}

// ─── GET /api/superadmin/tenants ───────────────────────────────────────────────

router.get('/tenants', asyncHandler(async (req, res) => {
  const { status, plan, search, page = 1, per_page = 25 } = req.query;
  const offset = (Number(page) - 1) * Number(per_page);

  const conditions = [];
  const params     = [];

  if (status) {
    params.push(status);
    conditions.push(`t.status = $${params.length}`);
  }

  if (plan) {
    params.push(plan);
    conditions.push(`p.code = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(t.name ILIKE $${params.length} OR t.subdomain ILIKE $${params.length})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count query
  const countResult = await query(
    `SELECT COUNT(*) FROM public.tenants t
     LEFT JOIN public.tenant_subscriptions s ON s.tenant_id = t.id AND s.status IN ('trial','active','past_due')
     LEFT JOIN public.plans p ON p.id = s.plan_id
     ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Main query with stats
  params.push(Number(per_page));
  params.push(offset);

  const { rows } = await query(
    `SELECT
       t.id,
       t.name,
       t.display_name,
       t.subdomain,
       t.status,
       t.timezone,
       t.contact_email,
       t.created_at,

       s.status           AS subscription_status,
       s.current_period_end,
       p.code             AS plan_code,
       p.name             AS plan_name,

       (SELECT COUNT(*) FROM public.resources   r WHERE r.tenant_id = t.id)           AS resource_count,
       (SELECT COUNT(*) FROM public.users       u WHERE u.tenant_id = t.id AND u.is_active = true) AS user_count,
       (SELECT COUNT(*) FROM public.bookings    b WHERE b.tenant_id = t.id)            AS booking_count

     FROM public.tenants t
     LEFT JOIN public.tenant_subscriptions s ON s.tenant_id = t.id AND s.status IN ('trial','active','past_due')
     LEFT JOIN public.plans p ON p.id = s.plan_id
     ${where}
     ORDER BY t.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return res.json({
    data: rows,
    pagination: {
      page:        Number(page),
      per_page:    Number(per_page),
      total,
      total_pages: Math.ceil(total / Number(per_page)),
    },
  });
}));

// ─── POST /api/superadmin/tenants ─────────────────────────────────────────────

router.post('/tenants', asyncHandler(async (req, res) => {
  const {
    name,
    subdomain,
    display_name,
    contact_email,
    timezone       = 'Europe/London',
    plan_code      = 'trial',
    trial_days     = 14,
    admin_full_name,
    admin_email,
    admin_password,
  } = req.body || {};

  // Validate required fields
  if (!name)            throw new AppError(400, 'name is required.');
  if (!admin_full_name) throw new AppError(400, 'admin_full_name is required.');
  if (!admin_email)     throw new AppError(400, 'admin_email is required.');
  if (!admin_password)  throw new AppError(400, 'admin_password is required.');
  if (admin_password.length < 8) throw new AppError(400, 'admin_password must be at least 8 characters.');

  // Validate subdomain
  const subdomainError = validateSubdomain(subdomain);
  if (subdomainError) throw new AppError(400, subdomainError);

  // Check subdomain uniqueness
  const existing = await query(
    `SELECT id FROM public.tenants WHERE subdomain = $1 LIMIT 1`,
    [subdomain]
  );
  if (existing.rows.length > 0) throw new AppError(409, 'Subdomain is already in use.');

  // Check admin email uniqueness within subdomain scope (will be checked inside transaction)
  // Resolve plan
  const planResult = await query(
    `SELECT id, code FROM public.plans WHERE code = $1 AND is_active = true LIMIT 1`,
    [plan_code]
  );
  if (planResult.rows.length === 0) throw new AppError(400, `Plan '${plan_code}' not found.`);
  const plan = planResult.rows[0];

  const passwordHash = await hashPassword(admin_password);
  const slug         = generateSlug(name);

  // Everything in a single transaction
  const result = await query('BEGIN');

  try {
    // 1. Create tenant
    const tenantResult = await query(
      `INSERT INTO public.tenants
         (name, display_name, slug, subdomain, status, timezone, contact_email)
       VALUES ($1, $2, $3, $4, 'active', $5, $6)
       RETURNING id, name, display_name, slug, subdomain, status, timezone, contact_email, created_at`,
      [name, display_name || null, slug, subdomain, timezone, contact_email || null]
    );
    const tenant = tenantResult.rows[0];

    // 2. Set RLS context for subsequent inserts
    await query(`SELECT app.set_current_tenant($1)`, [tenant.id]);

    // 3. Create subscription
    const now          = new Date();
    const periodEnd    = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + Number(trial_days));

    await query(
      `INSERT INTO public.tenant_subscriptions
         (tenant_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end, overrides)
       VALUES ($1, $2, $3, $4, $5, false, '{}')`,
      [tenant.id, plan.id, plan.code === 'trial' ? 'trial' : 'active', now, periodEnd]
    );

    // 4. Create first admin user
    const userResult = await query(
      `INSERT INTO public.users
         (tenant_id, email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, $3, $4, 'owner', true)
       RETURNING id, email, full_name, role`,
      [tenant.id, admin_email.toLowerCase(), passwordHash, admin_full_name]
    );
    const adminUser = userResult.rows[0];

    await query('COMMIT');

    return res.status(201).json({
      tenant,
      subscription: {
        plan_code:   plan.code,
        status:      plan.code === 'trial' ? 'trial' : 'active',
        period_end:  periodEnd,
      },
      admin_user: {
        id:        adminUser.id,
        email:     adminUser.email,
        full_name: adminUser.full_name,
        role:      adminUser.role,
      },
      // Handover summary — everything needed to give to the customer
      handover: {
        login_url:  `http://${subdomain}.availio.co/login`,
        email:      adminUser.email,
        password:   admin_password,
        subdomain,
        trial_ends: plan.code === 'trial' ? periodEnd : null,
      },
    });
  } catch (err) {
    await query('ROLLBACK');
    if (err.code === '23505') throw new AppError(409, 'A tenant or user with those details already exists.');
    throw err;
  }
}));

// ─── GET /api/superadmin/tenants/:id ──────────────────────────────────────────

router.get('/tenants/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { rows } = await query(
    `SELECT
       t.id, t.name, t.display_name, t.slug, t.subdomain,
       t.status, t.timezone, t.contact_email, t.logo_url,
       t.brand_colour, t.public_booking_enabled,
       t.booking_confirmation_message, t.metadata,
       t.created_at, t.updated_at,

       s.id                 AS subscription_id,
       s.status             AS subscription_status,
       s.current_period_start,
       s.current_period_end,
       s.cancel_at_period_end,
       s.overrides,

       p.id                 AS plan_id,
       p.code               AS plan_code,
       p.name               AS plan_name

     FROM public.tenants t
     LEFT JOIN public.tenant_subscriptions s ON s.tenant_id = t.id AND s.status IN ('trial','active','past_due')
     LEFT JOIN public.plans p ON p.id = s.plan_id
     WHERE t.id = $1
     ORDER BY s.created_at DESC
     LIMIT 1`,
    [id]
  );

  if (rows.length === 0) throw new AppError(404, 'Tenant not found.');
  const row = rows[0];

  // Set RLS context to read tenant-scoped stats
  await query(`SELECT app.set_current_tenant($1)`, [id]);

  const [resources, users, bookings, usageCounters] = await Promise.all([
    query(`SELECT COUNT(*) FROM public.resources WHERE tenant_id = $1`, [id]),
    query(`SELECT COUNT(*) FROM public.users WHERE tenant_id = $1 AND is_active = true`, [id]),
    query(`SELECT COUNT(*) FROM public.bookings WHERE tenant_id = $1`, [id]),
    query(
      `SELECT metric_key, usage_value, period_start, period_end
       FROM public.tenant_usage_counters
       WHERE tenant_id = $1
         AND period_start = date_trunc('month', now())
       ORDER BY metric_key`,
      [id]
    ),
  ]);

  return res.json({
    id:                          row.id,
    name:                        row.name,
    display_name:                row.display_name,
    slug:                        row.slug,
    subdomain:                   row.subdomain,
    status:                      row.status,
    timezone:                    row.timezone,
    contact_email:               row.contact_email,
    logo_url:                    row.logo_url,
    brand_colour:                row.brand_colour,
    public_booking_enabled:      row.public_booking_enabled,
    booking_confirmation_message:row.booking_confirmation_message,
    created_at:                  row.created_at,
    updated_at:                  row.updated_at,
    subscription: row.subscription_id ? {
      id:                  row.subscription_id,
      status:              row.subscription_status,
      plan_id:             row.plan_id,
      plan_code:           row.plan_code,
      plan_name:           row.plan_name,
      current_period_start:row.current_period_start,
      current_period_end:  row.current_period_end,
      cancel_at_period_end:row.cancel_at_period_end,
      overrides:           row.overrides,
    } : null,
    stats: {
      resource_count: parseInt(resources.rows[0].count, 10),
      user_count:     parseInt(users.rows[0].count, 10),
      booking_count:  parseInt(bookings.rows[0].count, 10),
    },
    usage_this_month: usageCounters.rows,
  });
}));

// ─── PATCH /api/superadmin/tenants/:id ────────────────────────────────────────

router.patch('/tenants/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name, display_name, contact_email, timezone,
    logo_url, brand_colour, public_booking_enabled,
    booking_confirmation_message, status,
  } = req.body || {};

  // Validate status if provided
  const validStatuses = ['active', 'suspended', 'cancelled'];
  if (status && !validStatuses.includes(status)) {
    throw new AppError(400, `status must be one of: ${validStatuses.join(', ')}`);
  }

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
       status                       = COALESCE($10, status),
       updated_at                   = now()
     WHERE id = $1
     RETURNING id, name, display_name, subdomain, status, timezone,
               contact_email, logo_url, brand_colour,
               public_booking_enabled, booking_confirmation_message, updated_at`,
    [id, name, display_name, contact_email, timezone,
     logo_url, brand_colour, public_booking_enabled,
     booking_confirmation_message, status]
  );

  if (rows.length === 0) throw new AppError(404, 'Tenant not found.');
  return res.json(rows[0]);
}));

// ─── PATCH /api/superadmin/tenants/:id/subscription ───────────────────────────

router.patch('/tenants/:id/subscription', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { plan_code, extend_trial_days, status } = req.body || {};

  await query(`SELECT app.set_current_tenant($1)`, [id]);

  // Load current subscription
  const subResult = await query(
    `SELECT id, status, plan_id, current_period_end
     FROM public.tenant_subscriptions
     WHERE tenant_id = $1
     ORDER BY created_at DESC LIMIT 1`,
    [id]
  );
  if (subResult.rows.length === 0) throw new AppError(404, 'No subscription found for tenant.');
  const sub = subResult.rows[0];

  const updates     = [];
  const params      = [sub.id];

  // Plan change — immediate upgrade, deferred downgrade handled by caller
  if (plan_code) {
    const planResult = await query(
      `SELECT id FROM public.plans WHERE code = $1 AND is_active = true LIMIT 1`,
      [plan_code]
    );
    if (planResult.rows.length === 0) throw new AppError(400, `Plan '${plan_code}' not found.`);
    params.push(planResult.rows[0].id);
    updates.push(`plan_id = $${params.length}`);

    // If moving from trial to a paid plan, update status to active
    if (sub.status === 'trial' && plan_code !== 'trial') {
      updates.push(`status = 'active'`);
    }
  }

  // Extend trial
  if (extend_trial_days) {
    const currentEnd = new Date(sub.current_period_end);
    const newEnd     = new Date(currentEnd);
    newEnd.setDate(newEnd.getDate() + Number(extend_trial_days));
    params.push(newEnd);
    updates.push(`current_period_end = $${params.length}`);
  }

  // Manual status override
  if (status) {
    const validStatuses = ['trial', 'active', 'past_due', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new AppError(400, `status must be one of: ${validStatuses.join(', ')}`);
    }
    updates.push(`status = '${status}'`);
  }

  if (updates.length === 0) throw new AppError(400, 'No valid fields to update.');

  updates.push(`updated_at = now()`);

  const { rows } = await query(
    `UPDATE public.tenant_subscriptions
     SET ${updates.join(', ')}
     WHERE id = $1
     RETURNING id, status, plan_id, current_period_start, current_period_end, cancel_at_period_end`,
    params
  );

  return res.json(rows[0]);
}));

// ─── GET /api/superadmin/tenants/:id/users ────────────────────────────────────

router.get('/tenants/:id/users', asyncHandler(async (req, res) => {
  const { id } = req.params;

  await query(`SELECT app.set_current_tenant($1)`, [id]);

  const { rows } = await query(
    `SELECT id, email, full_name, role, is_active, last_login_at, created_at
     FROM public.users
     WHERE tenant_id = $1
     ORDER BY created_at ASC`,
    [id]
  );

  return res.json({ data: rows });
}));

// ─── POST /api/superadmin/tenants/:id/users/:uid/reset-password ───────────────

router.post('/tenants/:id/users/:uid/reset-password', asyncHandler(async (req, res) => {
  const { id, uid } = req.params;
  const { new_password } = req.body || {};

  if (!new_password)              throw new AppError(400, 'new_password is required.');
  if (new_password.length < 8)    throw new AppError(400, 'new_password must be at least 8 characters.');

  await query(`SELECT app.set_current_tenant($1)`, [id]);

  const passwordHash = await hashPassword(new_password);

  const { rows } = await query(
    `UPDATE public.users
     SET password_hash = $1, updated_at = now()
     WHERE id = $2 AND tenant_id = $3
     RETURNING id, email, full_name`,
    [passwordHash, uid, id]
  );

  if (rows.length === 0) throw new AppError(404, 'User not found.');

  return res.json({
    message: `Password reset successfully for ${rows[0].email}`,
    user:    rows[0],
  });
}));

export default router;
