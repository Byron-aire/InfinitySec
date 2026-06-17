/**
 * Startup environment validation — fail fast, before any route or DB call.
 *
 * Required vars hard-fail the process with a clear message (no cryptic crash
 * 30 minutes into a request). Optional vars only warn and let the related
 * feature degrade gracefully. Ported from ByronaireTV's apps/api/src/lib/env.ts.
 */
const logger = require('../utils/logger');

// Always required — the app cannot function without these.
const REQUIRED = ['JWT_SECRET', 'MONGODB_URI'];

// Optional vars → the feature each one gates (warn-and-degrade).
const OPTIONAL = {
  ANTHROPIC_API_KEY:        'AI features (assistant, analysers, digests)',
  HIBP_API_KEY:             'breach checking',
  GOOGLE_SAFE_BROWSING_KEY: 'URL / domain threat scanning',
  SMTP_HOST:                'transactional email (verification, reset, digests)',
  RP_ID:                    'passkeys / WebAuthn',
};

function validateEnv() {
  const isProd = process.env.NODE_ENV === 'production';

  const missing = REQUIRED.filter(k => !process.env[k] || !process.env[k].trim());
  if (missing.length) {
    logger.error('env.missing_required', { missing });
    // eslint-disable-next-line no-console
    console.error(`FATAL: missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }

  // A weak/short JWT secret is as bad as a missing one.
  if (process.env.JWT_SECRET.length < 16) {
    logger.error('env.weak_jwt_secret', {});
    // eslint-disable-next-line no-console
    console.error('FATAL: JWT_SECRET must be at least 16 characters (use 32+ random bytes).');
    process.exit(1);
  }

  // In production these would silently break core flows — fail instead.
  if (isProd) {
    if (!process.env.CLIENT_ORIGIN) {
      logger.error('env.prod_missing_client_origin', {});
      // eslint-disable-next-line no-console
      console.error('FATAL: CLIENT_ORIGIN is required in production (CORS would reject the frontend).');
      process.exit(1);
    }
    if (!process.env.SMTP_HOST) {
      logger.error('env.prod_missing_smtp', {});
      // eslint-disable-next-line no-console
      console.error('FATAL: SMTP_HOST is required in production (email verification would be bypassed).');
      process.exit(1);
    }
    if (!process.env.FRONTEND_URL && !process.env.CLIENT_ORIGIN) {
      logger.error('env.prod_missing_frontend_url', {});
      // eslint-disable-next-line no-console
      console.error('FATAL: FRONTEND_URL / CLIENT_ORIGIN required in production (email links would point at localhost).');
      process.exit(1);
    }
  }

  for (const [key, feature] of Object.entries(OPTIONAL)) {
    if (!process.env[key]) {
      logger.warn('env.optional_missing', { key, disables: feature });
    }
  }

  logger.info('env.validated', { env: process.env.NODE_ENV || 'development' });
}

module.exports = { validateEnv };
