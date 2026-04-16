/**
 * POST /api/tenant/logo  — upload a logo for the current tenant
 *
 * Accepts: multipart/form-data with field name "logo"
 * Allowed:  image/webp, image/png, image/jpeg, image/svg+xml
 * Max size: 2MB
 * Saves to: /opt/booking-platform/uploads/logos/<tenant-id>.<ext>
 * Updates:  tenants.logo_url
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { asyncHandler, AppError } from '../lib/errors.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { query } from '../lib/db.js';

const router = Router();

const UPLOAD_DIR = '/opt/booking-platform/uploads/logos';
const MAX_SIZE   = 2 * 1024 * 1024; // 2MB

const ALLOWED_MIME_TYPES = new Set([
  'image/webp',
  'image/png',
  'image/jpeg',
  'image/svg+xml',
]);

const MIME_TO_EXT = {
  'image/webp':    'webp',
  'image/png':     'png',
  'image/jpeg':    'jpg',
  'image/svg+xml': 'svg',
};

// Multer — memory storage so we can validate before writing to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(400, 'Invalid file type. Allowed: webp, png, jpg, svg.'));
    }
  },
});

router.use(requireAuth, requireAdmin);

router.post('/', upload.single('logo'), asyncHandler(async (req, res) => {
  const tenantId = req.tenant?.id;
  if (!tenantId) throw new AppError(400, 'Tenant not resolved.');
  if (!req.file)  throw new AppError(400, 'No file uploaded.');

  const ext      = MIME_TO_EXT[req.file.mimetype];
  const filename = `${tenantId}.${ext}`;
  const filepath = path.join(UPLOAD_DIR, filename);

  // Remove any existing logo file for this tenant (different extension)
  for (const e of Object.values(MIME_TO_EXT)) {
    const old = path.join(UPLOAD_DIR, `${tenantId}.${e}`);
    if (old !== filepath && fs.existsSync(old)) {
      fs.unlinkSync(old);
    }
  }

  // Write new file
  fs.writeFileSync(filepath, req.file.buffer);

  // Update tenant record
  const logoUrl = `/uploads/logos/${filename}`;
  const { rows } = await query(
    `UPDATE public.tenants
     SET logo_url   = $1,
         updated_at = now()
     WHERE id = $2
     RETURNING id, logo_url`,
    [logoUrl, tenantId]
  );

  if (rows.length === 0) throw new AppError(404, 'Tenant not found.');

  return res.json({ logo_url: rows[0].logo_url });
}));

export default router;
