/**
 * Shared domain parsing + validation, used by the SSL and Domain Inspector
 * scanners (previously duplicated in both controllers).
 */

// RFC 1123 hostname — each label 1-63 chars, no leading/trailing hyphen, max 253 total.
const DOMAIN_REGEX = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/**
 * Strip scheme/path, lowercase, trim, and validate. Returns the clean hostname
 * or null if it isn't a valid public-looking domain.
 */
function cleanDomain(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const clean = raw
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .trim()
    .toLowerCase();
  if (!clean || clean.length > 253 || !DOMAIN_REGEX.test(clean)) return null;
  return clean;
}

module.exports = { DOMAIN_REGEX, cleanDomain };
