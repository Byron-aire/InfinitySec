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
| **Dashboard** | Color-coded stat cards (purple/red/cyan per type), quick-access tools grid, check history, recent activity. |
| **The Barrier** | 2FA readiness checklist for 27 platforms across 6 categories. Tracks which accounts have App, SMS, or Hardware key 2FA enabled. Progress saved per user. |
| **SSL Checker** | Inspect any domain's SSL certificate — validity, days until expiry (with lifetime progress bar), issuer, and dates. Colour-coded status. |
| **Convergence** | URL scanner backed by Google Safe Browsing API. Checks for malware, phishing, and unwanted software server-side. |
| **Void Watch** | Weekly automated breach monitoring. Subscribes your email to a cron job that checks HaveIBeenPwned every Monday and emails you if new breaches are found. |
| **Sessions** | View every device that has logged into your account. Panic button invalidates all active tokens instantly via `tokenVersion`. |
| **Privacy Dashboard** | Full data transparency — see exactly what's stored, download your data as JSON, manage sessions, delete your account. |

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
| Auth | bcryptjs, jsonwebtoken (7-day expiry) |
| Security | helmet, express-rate-limit, CORS locked to origin, tokenVersion session invalidation |
| External APIs | HaveIBeenPwned v3, Google Safe Browsing v4 |
| Email | nodemailer (SMTP), node-cron (weekly digest) |
| RSS | rss-parser — Krebs on Security, The Hacker News, Troy Hunt, SANS ISC |
| Deployment | Vercel (frontend) + Railway (backend) |

---

## Security design

- Strength analysis is entirely client-side — passwords are never transmitted
- Breach check emails are never stored — only the anonymised result is saved to history
- URL scanning is server-side only — Google Safe Browsing key never exposed to the client
- RSS news feed is fetched server-side and cached — no external calls from the browser
- HTTP security headers via `helmet` (XSS protection, HSTS, CSP)
- Rate limiting: 20 req / 15 min on auth routes, 30 req / hr on breach and SSL checks, 50 req / hr on URL scans
- Session invalidation via `tokenVersion` — panic button revokes all active tokens instantly
- Login alerts sent by email when a sign-in is detected from a new IP address
- CORS locked to the production frontend origin in deployment
- All secrets via environment variables — never hardcoded, never logged

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
SMTP_HOST=<smtp host>
SMTP_PORT=587
SMTP_USER=<smtp username>
SMTP_PASS=<smtp password or app password>
SMTP_FROM=InfinitySec <noreply@yourdomain.com>
CLIENT_ORIGIN=http://localhost:5173
```

> `HIBP_API_KEY`, `GOOGLE_SAFE_BROWSING_KEY`, and SMTP vars are optional for local dev — the features degrade gracefully without them.

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
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Login, receive JWT |
| DELETE | `/api/auth/account` | Yes | Delete account and all data |
| GET | `/api/auth/export` | Yes | Export account + full history as JSON |
| GET | `/api/auth/sessions` | Yes | List active sessions |
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
| POST | `/api/convergence/check` | No | Scan URL via Google Safe Browsing |
| GET | `/api/voidwatch/status` | Yes | Get monitoring subscription status |
| POST | `/api/voidwatch/toggle` | Yes | Enable/disable weekly monitoring |

Protected routes require `Authorization: Bearer <token>`.

---

## Roadmap

The web app is the primary, always-accessible version. The mobile app (v3.0) is a second frontend on the same API — no backend changes required. Mobile unlocks push notifications, biometric unlock, and secure on-device storage.

| Version | Status | What's included |
|---------|--------|-----------------|
| v1.0 | ✅ Done | Core MERN app — all 6 features, local only |
| v1.5 | ✅ Done | Security hardening, GDPR controls, Gojo UI, deployed to Vercel + Railway + Atlas |
| v2.0 | ✅ Live | 2FA checklist, SSL checker, URL scanner, Void Watch, session management, login alerts, privacy dashboard, design overhaul, security learning hub with live RSS feed |
| v2.5 | 🔲 Aug–Nov 2026 | AI assistant (Claude / Six Eyes), security score, threat feed, phishing analyzer, weekly digest |
| v3.0 | 🔲 2027 | React Native (Expo) — same backend, biometric unlock, push notifications, remote wipe |

---

*Built by Byron Gift Ochieng Makasembo · Griffith College Cork · 2026*
