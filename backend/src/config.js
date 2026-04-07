import dotenv from 'dotenv';
dotenv.config();

function toInt(value, fallback) {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: toInt(process.env.PORT, 3001),
  appTimezone: process.env.APP_TIMEZONE || 'UTC',
  databaseUrl: process.env.DATABASE_URL || '',
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: toInt(process.env.DB_PORT, 5432),
    database: process.env.DB_NAME || 'booking_platform',
    user: process.env.DB_USER || 'booking_app',
    password: process.env.DB_PASSWORD || ''
  },
  jwtSecret: process.env.JWT_SECRET || 'change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  trustProxy: process.env.TRUST_PROXY || '1',
  tenantBaseDomain: process.env.TENANT_BASE_DOMAIN || ''
};

if (config.env === 'production' && config.jwtSecret.startsWith('change')) {
  throw new Error('JWT_SECRET must be set to a secure random value in production. Generate one with: node -e "require(\'crypto\').randomBytes(64).toString(\'hex\')"');
}

if (config.env === 'production' && config.corsOrigin === '*') {
  console.warn('[SECURITY WARNING] CORS_ORIGIN is set to "*" in production. Set it to your actual frontend origin(s) in the .env file.');
}
