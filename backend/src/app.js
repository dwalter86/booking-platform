import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { resolveTenant } from './middleware/tenant.js';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import resourceRoutes from './routes/resources.js';
import bookingRoutes from './routes/bookings.js';
import unavailabilityRoutes from './routes/unavailability.js';
import availabilityRoutes from './routes/availability.js';
import adminUserRoutes from './routes/admin-users.js';
import planRoutes from './routes/plans.js';
import calendarConnectionRoutes from './routes/calendar-connections.js';
import auditRoutes from './routes/audit.js';
import publicBookingsRoutes from './routes/public-bookings.js';
import availabilityRulesRouter from './routes/availability-rules.js';
import availabilityExceptionsRouter from './routes/availability-exceptions.js';

const app = express();

if (config.trustProxy) app.set('trust proxy', config.trustProxy);
app.use(helmet());
app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',').map((v) => v.trim()) }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('combined'));
app.use(resolveTenant);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' }
});

const publicBookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many booking requests. Please try again later.' }
});

app.get('/', (_req, res) => {
  res.json({
    service: 'booking-platform-api',
    status: 'ok'
  });
});

app.use('/health', healthRoutes);
app.use('/api/auth', loginLimiter, authRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/unavailability-blocks', unavailabilityRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/calendar-connections', calendarConnectionRoutes);
app.use('/api/admin/audit-log', auditRoutes);
app.use('/api/public-bookings', publicBookingLimiter, publicBookingsRoutes);
app.use('/api/availability-rules', availabilityRulesRouter);
app.use('/api/availability-exceptions', availabilityExceptionsRouter);

app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  const payload = {
    error: error.message || 'Internal server error'
  };
  if (error.details) payload.details = error.details;
  if (config.env !== 'production' && error.stack) payload.stack = error.stack;
  res.status(status).json(payload);
});

export default app;
