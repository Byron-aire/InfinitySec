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

  // CORS in production is locked to CLIENT_ORIGIN, so it's genuinely required —
  // without it the deployed frontend can't talk to the API at all.
  if (isProd && !process.env.CLIENT_ORIGIN) {
    logger.error('env.prod_missing_client_origin', {});
    // eslint-disable-next-line no-console
    console.error('FATAL: CLIENT_ORIGIN is required in production (CORS would reject the frontend).');
    process.exit(1);
  }
  // SMTP / FRONTEND_URL are NOT hard-required: the app is designed to degrade
  // gracefully without SMTP (auto-verify mode). They're surfaced as warnings
  // below so a deploy that intentionally runs without email still boots.
  if (isProd && !process.env.SMTP_HOST) {
    logger.warn('env.prod_no_smtp', { note: 'email verification disabled — users auto-verify' });
  }

  for (const [key, feature] of Object.entries(OPTIONAL)) {
    if (!process.env[key]) {
      logger.warn('env.optional_missing', { key, disables: feature });
    }
  }

  logger.info('env.validated', { env: process.env.NODE_ENV || 'development' });
}

module.exports = { validateEnv };
