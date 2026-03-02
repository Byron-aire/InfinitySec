# InfinitySec

> A personal cybersecurity toolkit — check password strength, scan for data breaches, generate secure passwords, and stay sharp with security tips.

**[Live Demo →](https://securecheck-nu.vercel.app)**
&nbsp;&nbsp;|&nbsp;&nbsp;
Demo login: `demo@infinitysec.io` / `Demo1234!`

---

## What it does

| Feature | Description |
|---------|-------------|
| **Password Checker** | Live strength analysis as you type — circular gauge, score 0–100, criteria breakdown. Runs entirely in the browser. Your password is never sent anywhere. |
| **Breach Checker** | Checks your email against the HaveIBeenPwned database server-side. Your email is never stored. |
| **Password Generator** | Cryptographically secure (`crypto.getRandomValues()`), configurable length (8–64 chars), character sets, copy to clipboard, save with a custom label. |
| **Security Tips** | 24 tips across Passwords, Phishing, Privacy, and AI categories. Keyword search + category filter. |
| **Dashboard** | Check history, stat counts, recent activity. |
| **GDPR Controls** | Export your full data as JSON, or permanently delete your account and all associated data in one click. |

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
| Security | helmet, express-rate-limit, CORS locked to origin |
| External API | HaveIBeenPwned v3 |
| Deployment | Vercel (frontend) + Railway (backend) |

---

## Security design

- Strength analysis is entirely client-side — passwords are never transmitted
- Breach check emails are never stored — only the anonymised result is saved to history
- HTTP security headers via `helmet` (XSS protection, HSTS, CSP)
- Rate limiting: 20 req / 15 min on auth routes, 30 req / hr on breach checks
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
git clone https://github.com/Byron-aire/securecheck.git
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
```

> Port 5001 is used locally to avoid a conflict with macOS AirPlay Receiver on port 5000.

### 3. Seed the database

```bash
cd backend && node seed.js
```

Inserts 24 security tips across 4 categories.

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
| GET | `/api/history` | Yes | Get check history |
| POST | `/api/history` | Yes | Save a check result |
| DELETE | `/api/history/:id` | Yes | Delete one history entry |
| POST | `/api/breach/check` | No | Check email against HIBP |
| GET | `/api/tips` | No | All tips (optional `?category=`) |
| GET | `/api/tips/:id` | No | Single tip |

Protected routes require `Authorization: Bearer <token>`.

---

## Roadmap

| Version | Status | What's planned |
|---------|--------|----------------|
| v1.0 | ✅ Done | Core MERN app — all 6 features, local only |
| v1.5 | ✅ Live | Security hardening, GDPR controls, Gojo UI rebrand, deployed to Vercel + Railway + Atlas |
| v2.0 | 🔲 Summer 2026 | URL/phishing scanner, SSL checker, dark web monitoring, 2FA checklist, session management |
| v2.5 | 🔲 Sept 2026 | AI security assistant (Claude), domain security score, weekly digest emails, threat feed |
| v3.0 | 🔲 2027 | React Native mobile app (Expo) with biometric unlock and remote wipe |

---

*Built by Byron Aire · Griffith College Cork · BSc Web Technologies 2026*
