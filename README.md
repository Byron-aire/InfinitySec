# InfinitySec

> A personal cybersecurity toolkit — check passwords, scan for breaches, inspect SSL certs, scan URLs for threats, monitor your email weekly, and stay sharp with live security news and expert tips.

**[Live Demo →](https://securecheck-nu.vercel.app)**
&nbsp;&nbsp;|&nbsp;&nbsp;
Demo login: `demo@infinitysec.io` / `Demo1234!`

---

## What it does

| Feature | Description |
|---------|-------------|
| **Password Checker** | Live strength analysis as you type — circular gauge, score 0–100, criteria breakdown. Runs entirely in the browser. Your password is never sent anywhere. |
| **Breach Checker** | Checks your email against the HaveIBeenPwned database server-side. Dramatic safe/breached result states. Your email is never stored. |
| **Password Generator** | Cryptographically secure (`crypto.getRandomValues()`), configurable length (8–64 chars), character sets, copy to clipboard, save with a custom label. |
| **Security Learning Hub** | 56 expert tips across 6 categories (Passwords, Phishing, Privacy, AI, Network, Devices) — expandable cards, featured tip, stats bar, keyword search, category filter. Plus a live **Security Feed** tab pulling from Krebs on Security, The Hacker News, Troy Hunt, and SANS ISC — cached and refreshed hourly. |
| **Dashboard** | Security Score gauge (0–100, Gojo-graded), color-coded stat cards, quick-access tools grid, check history, recent activity. |
| **The Barrier** | 2FA readiness checklist for 27 platforms across 6 categories. Tracks which accounts have App, SMS, or Hardware key 2FA enabled. Progress saved per user. |
| **SSL Checker** | Inspect any domain's SSL certificate — validity, days until expiry (with lifetime progress bar), issuer, and dates. Colour-coded status. |
| **Convergence** | URL scanner backed by Google Safe Browsing API. Checks for malware, phishing, and unwanted software server-side. |
| **Void Watch** | Weekly automated breach monitoring. Subscribes your email to a cron job that checks HaveIBeenPwned every Monday and emails you if new breaches are found. |
| **Sessions** | View every device with an active session. Each entry is a live JWT — revoke individual devices instantly or use the panic button to sign out everywhere. |
| **Privacy Dashboard** | Full data transparency — see exactly what's stored, download your data as JSON, manage sessions, delete your account. |
| **Six Eyes** | Streaming AI security assistant powered by Claude. Answers security questions with context from your account's security posture. Requires explicit consent — no PII is sent to the AI. Full audit trail with SHA-256 prompt hashing. |
| **Six Eyes Log** | AI audit trail — view every Six Eyes session with token usage, model, and timestamp. Withdraw AI consent from this page. |
| **Domain Strength** | Multi-stage AI domain security analysis — SSL certificate, HTTP security headers, RDAP registration data, and Google Safe Browsing combined into a Claude-synthesised score (0–100), grade (A–F), findings, and recommendations. 24hr cache. |
| **The Briefing** | Weekly AI security digest emailed every Monday — personalised breach status, synthesis of the week's top security headlines, and a concrete action item. Powered by Claude Haiku. |
| **Cursed Intel** | AI-powered personalised breach impact analysis. Given your breach history, Claude analyses the exposed data types, estimates real-world risk, and recommends targeted remediation steps. |
| **Passkeys** | Register Face ID, Touch ID, or a hardware security key as a passwordless sign-in method. Manage passkeys (add / remove) from the Privacy Dashboard. Powered by WebAuthn via SimpleWebAuthn. |

---

## Tech Stack

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black&style=flat-square)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white&style=flat-square)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white&style=flat-square)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white&style=flat-square)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white&style=flat-square)
![Deployed on Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?logo=vercel&logoColor=white&style=flat-square)
![Deployed on Railway](https://img.shields.io/badge/Backend-Railway-0B0D0E?logo=railway&logoColor=white&style=flat-square)

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router 6, Axios, Vite 5 |
| Backend | Node.js 20, Express 4, Mongoose 8 |
| Database | MongoDB Atlas (M0 free tier) |
| Auth | bcryptjs, jsonwebtoken (7-day expiry, UUID jti per device) |
| Security | helmet, express-rate-limit, CORS locked to origin, tokenVersion + jti session invalidation |
| AI | Anthropic SDK (`@anthropic-ai/sdk`), Claude Sonnet — streaming SSE via fetch |
| External APIs | HaveIBeenPwned v3, Google Safe Browsing v4, Anthropic Claude API |
| Email | nodemailer (SMTP), node-cron (weekly digest) |
| RSS | rss-parser — Krebs on Security, The Hacker News, Troy Hunt, SANS ISC |
| Deployment | Vercel (frontend) + Railway (backend) |

---

## Security design

- Strength analysis is entirely client-side — passwords are never transmitted
- Breach check emails are never stored — only the anonymised result is saved to history
- URL scanning is server-side only — Google Safe Browsing key never exposed to the client
- RSS news feed is fetched server-side and cached — no external calls from the browser
- HTTP security headers via `helmet` with explicit CSP on API responses
- Frontend security headers (CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) applied via Vercel on all HTML responses
- Email verification — registration requires a verified email before login is permitted; tokens are SHA-256 hashed (24hr expiry), raw token sent only in email
- Password reset — SHA-256 hashed token (1hr expiry), invalidates all active sessions on success; no user enumeration (identical response whether email exists or not)
- Account lockout — 5 consecutive failed logins triggers a 15-minute lock; counter resets on successful login
- Timing attack prevention — `bcrypt.compare` always runs (against a dummy hash when user not found) to prevent email enumeration via response timing
- Rate limiting on every route — auth (20/15min), email actions (5/hr), breach/SSL (30/hr), URL scan (50/hr), history (200/15min), tips (120/15min), news (30/15min), voidwatch (30/15min), Six Eyes chat (15/hr), domain strength (10/hr); global backstop at 500 req/15min per IP
- Real active session tracking via JWT `jti` (UUID) — every token is individually tracked and revocable; revoking a session kills that device immediately, not on next request
- Session invalidation via `tokenVersion` — panic button revokes all active tokens instantly across all devices
- Session TTL — sessions older than 7 days are pruned automatically on every successful login
- HTTPS enforced in production — HTTP requests redirected 301; HSTS header (`max-age=63072000; includeSubDomains; preload`) on all responses
- Login alerts sent by email when a sign-in is detected from a new IP address
- Input validated on all endpoints — RFC 5321-compliant email validation, RFC 1123-compliant domain validation, result object fields whitelisted per history type
- Request body size capped at 10kb (`express.json({ limit: '10kb' })`)
- CORS locked to the production frontend origin in deployment
- Structured JSON logging to stderr — all auth events, rate limit hits, and errors captured; Railway aggregates stderr as searchable logs
- All secrets via environment variables — never hardcoded, never logged
- Six Eyes AI — explicit consent gate, no PII sent to Claude, prompt hashed with SHA-256 before audit log storage, full audit trail exportable via GDPR export
- AI-generated email content HTML-escaped before template interpolation to prevent XSS via LLM output

---

## Running locally

### Prerequisites

- Node.js 20+
- MongoDB running locally, or a [MongoDB Atlas](https://www.mongodb.com/atlas) URI
- [HaveIBeenPwned API key](https://haveibeenpwned.com/API/Key) for the breach checker

### 1. Clone and install

```bash
git clone https://github.com/Byron-aire/infinitysec.git
cd securecheck

cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
```

Fill in `backend/.env`:

```
PORT=5001
MONGODB_URI=mongodb://localhost:27017/infinitysec
JWT_SECRET=<a long random string>
HIBP_API_KEY=<your HaveIBeenPwned API key>
GOOGLE_SAFE_BROWSING_KEY=<your Google Safe Browsing API key>
ANTHROPIC_API_KEY=<your Anthropic API key>
FRONTEND_URL=http://localhost:5173
SMTP_HOST=<smtp host>
SMTP_PORT=587
SMTP_USER=<smtp username>
SMTP_PASS=<smtp password or app password>
SMTP_FROM=InfinitySec <noreply@yourdomain.com>
CLIENT_ORIGIN=http://localhost:5173
```

> `HIBP_API_KEY`, `GOOGLE_SAFE_BROWSING_KEY`, `ANTHROPIC_API_KEY`, `FRONTEND_URL`, and SMTP vars are optional for local dev — the features degrade gracefully without them. Without SMTP, email verification is skipped and users are auto-verified.

> Port 5001 is used locally to avoid a conflict with macOS AirPlay Receiver on port 5000.

### 3. Seed the database

```bash
cd backend && node seed.js
```

Inserts 56 security tips across 6 categories (Passwords, Phishing, Privacy, AI, Network, Devices).

### 4. Start development servers

```bash
# Terminal 1 — backend (http://localhost:5001)
cd backend && npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd frontend && npm run dev
```

The Vite dev server proxies `/api` requests to the backend — no CORS config needed locally.

---

## API reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Create account; issues JWT immediately if no SMTP, else sends verification email |
| POST | `/api/auth/login` | No | Login, receive JWT; blocked if email unverified or account locked |
| GET | `/api/auth/verify-email` | No | Validate email verification token (`?token=`) |
| POST | `/api/auth/resend-verification` | No | Resend verification email (5/hr) |
| POST | `/api/auth/forgot-password` | No | Send password reset email — no user enumeration (5/hr) |
| POST | `/api/auth/reset-password` | No | Set new password via token; invalidates all sessions |
| DELETE | `/api/auth/account` | Yes | Delete account and all data — requires password in body |
| GET | `/api/auth/export` | Yes | Export account + full history as JSON |
| GET | `/api/auth/sessions` | Yes | List active sessions |
| DELETE | `/api/auth/sessions/:jti` | Yes | Revoke a single session by device |
| DELETE | `/api/auth/sessions` | Yes | Panic button — revoke all sessions |
| GET | `/api/auth/account-summary` | Yes | Account + data summary for privacy dashboard |
| GET | `/api/history` | Yes | Get check history |
| POST | `/api/history` | Yes | Save a check result |
| DELETE | `/api/history/:id` | Yes | Delete one history entry |
| POST | `/api/breach/check` | No | Check email against HIBP |
| GET | `/api/tips` | No | All tips (optional `?category=`) |
| GET | `/api/tips/:id` | No | Single tip |
| GET | `/api/news` | No | Live security news from RSS feeds (1hr cache) |
| POST | `/api/ssl/check` | No | Inspect SSL cert for a domain |
| POST | `/api/convergence/check` | Yes | Scan URL via Google Safe Browsing |
| GET | `/api/voidwatch/status` | Yes | Get monitoring subscription status |
| POST | `/api/voidwatch/toggle` | Yes | Enable/disable weekly monitoring |
| POST | `/api/six-eyes/consent` | Yes | Give consent to use AI assistant |
| DELETE | `/api/six-eyes/consent` | Yes | Withdraw AI consent |
| POST | `/api/six-eyes/chat` | Yes | Stream Claude AI response (SSE, 15/hr) |
| GET | `/api/six-eyes/log` | Yes | View AI audit log (last 100 entries) |
| POST | `/api/domain-strength/check` | Yes | Multi-stage domain analysis — SSL + headers + RDAP + Safe Browsing → Claude score (10/hr) |
| POST | `/api/auth/passkeys/register/options` | Yes | Generate WebAuthn registration options |
| POST | `/api/auth/passkeys/register/verify` | Yes | Verify attestation and save passkey |
| POST | `/api/auth/passkeys/login/options` | No | Generate WebAuthn authentication options |
| POST | `/api/auth/passkeys/login/verify` | No | Verify assertion and issue JWT |
| GET | `/api/auth/passkeys` | Yes | List registered passkeys |
| DELETE | `/api/auth/passkeys/:id` | Yes | Remove a passkey |
| GET | `/api/health` | No | Server health check |

Protected routes require `Authorization: Bearer <token>`.

---

## Roadmap

The web app is the primary, always-accessible version. The mobile app (v3.0) is a second frontend on the same API — no backend changes required. Mobile unlocks push notifications, biometric unlock, and secure on-device storage.

| Version | Status | What's included |
|---------|--------|-----------------|
| v1.0 | ✅ Done | Core MERN app — all 6 features, local only |
| v1.5 | ✅ Done | Security hardening, GDPR controls, Gojo UI, deployed to Vercel + Railway + Atlas |
| v2.0 | ✅ Live | 2FA checklist, SSL checker, URL scanner, Void Watch, real active session tracking (JWT jti), login alerts, privacy dashboard, security score gauge, design overhaul, security learning hub with live RSS feed |
| v2.5 | ✅ Done | AI security layer — **Six Eyes** ✅, **Domain Strength** ✅, **The Briefing** ✅, **Cursed Intel** ✅, **Passkeys / WebAuthn** ✅, full auth hardening ✅ (email verification, password reset, account lockout, HTTPS/HSTS, structured logging) |
| v3.0 | 🔲 2027 | React Native (Expo) — same backend, biometric unlock, push notifications, remote wipe |

---

## License

MIT — see [LICENSE](./LICENSE) for details.

---

*Built by Byron Gift Ochieng Makasembo · Griffith College Cork · 2026*
