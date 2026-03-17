/**
 * Minimal structured JSON logger — writes to stderr.
 * Railway captures stderr and makes entries searchable.
 * Never log passwords, tokens, full emails, or full user agents.
 */

function write(level, event, data) {
  const entry = JSON.stringify({
    ts:    new Date().toISOString(),
    level,
    event,
    ...data,
  });
  process.stderr.write(entry + '\n');
}

module.exports = {
  info:  (event, data = {}) => write('info',  event, data),
  warn:  (event, data = {}) => write('warn',  event, data),
  error: (event, data = {}) => write('error', event, data),
};
