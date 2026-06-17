/**
 * SSRF guard — blocks scanners from being pointed at internal infrastructure.
 *
 * The SSL / Domain Inspector tools connect to a user-supplied host. Without this,
 * a user could submit `localhost`, `169.254.169.254` (cloud metadata), or an
 * internal `10.x` address and have the server fetch it on their behalf.
 *
 * We resolve the hostname (DNS) and reject if ANY resolved address falls in a
 * private / loopback / link-local / reserved range. Resolving first also defends
 * against DNS-rebinding to an internal IP.
 *
 * Dependency-free: self-contained IPv4/IPv6 range checks.
 */
const dns = require('dns').promises;

// IPv4 helpers ────────────────────────────────────────────────────────────────
function ipv4ToInt(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => Number.isNaN(p) || p < 0 || p > 255)) return null;
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

// [startCIDR, prefixBits] ranges that must never be reachable.
const BLOCKED_V4 = [
  ['0.0.0.0', 8],        // "this" network
  ['10.0.0.0', 8],       // private
  ['100.64.0.0', 10],    // CGNAT
  ['127.0.0.0', 8],      // loopback
  ['169.254.0.0', 16],   // link-local (incl. 169.254.169.254 metadata)
  ['172.16.0.0', 12],    // private
  ['192.0.0.0', 24],     // IETF protocol assignments
  ['192.168.0.0', 16],   // private
  ['198.18.0.0', 15],    // benchmarking
  ['224.0.0.0', 4],      // multicast
  ['240.0.0.0', 4],      // reserved
];

function isPrivateV4(ip) {
  const addr = ipv4ToInt(ip);
  if (addr === null) return true; // unparseable → treat as unsafe
  return BLOCKED_V4.some(([base, bits]) => {
    const baseInt = ipv4ToInt(base);
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (addr & mask) === (baseInt & mask);
  });
}

function isPrivateV6(ip) {
  const a = ip.toLowerCase();
  if (a === '::1' || a === '::') return true;          // loopback / unspecified
  if (a.startsWith('fe80') || a.startsWith('fec0')) return true; // link/site-local
  if (a.startsWith('fc') || a.startsWith('fd')) return true;     // unique local (fc00::/7)
  // IPv4-mapped (::ffff:a.b.c.d) — unwrap and check as v4
  const mapped = a.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateV4(mapped[1]);
  return false;
}

function isPrivateAddress(ip, family) {
  return family === 6 ? isPrivateV6(ip) : isPrivateV4(ip);
}

/**
 * Throws an Error('SSRF_BLOCKED') if the host resolves to (or is) a non-public
 * address. Returns silently when the host is safe to fetch.
 */
async function assertPublicHost(hostname) {
  if (!hostname || typeof hostname !== 'string') {
    const e = new Error('SSRF_BLOCKED');
    e.reason = 'empty host';
    throw e;
  }
  const host = hostname.trim().toLowerCase();

  // Reject obvious local names outright (no DNS round-trip needed).
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) {
    const e = new Error('SSRF_BLOCKED');
    e.reason = 'local hostname';
    throw e;
  }

  let addresses;
  try {
    addresses = await dns.lookup(host, { all: true });
  } catch {
    const e = new Error('SSRF_BLOCKED');
    e.reason = 'unresolvable host';
    throw e;
  }

  for (const { address, family } of addresses) {
    if (isPrivateAddress(address, family)) {
      const e = new Error('SSRF_BLOCKED');
      e.reason = `resolves to non-public address ${address}`;
      throw e;
    }
  }
}

module.exports = { assertPublicHost, isPrivateAddress };
