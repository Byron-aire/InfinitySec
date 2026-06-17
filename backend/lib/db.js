/**
 * MongoDB connection with exponential backoff.
 *
 * Atlas free-tier clusters cold-start and the network blips; a single-shot
 * connect turns a transient hiccup into a crash loop. Retry a few times with
 * growing backoff, then hard-fail so the platform restarts us cleanly.
 * Ported from ByronaireTV's apps/api/src/lib/db.ts.
 */
const mongoose = require('mongoose');
const logger = require('../utils/logger');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function connectDB(uri, maxAttempts = 5) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await mongoose.connect(uri);
      logger.info('db.connected', { attempt });
      return;
    } catch (err) {
      lastErr = err;
      const backoff = Math.min(1000 * 2 ** (attempt - 1), 15000);
      logger.warn('db.connect_retry', { attempt, maxAttempts, backoffMs: backoff, message: err.message });
      if (attempt < maxAttempts) await sleep(backoff);
    }
  }
  logger.error('db.connect_failed', { message: lastErr?.message });
  throw lastErr;
}

module.exports = { connectDB };
