# CLAUDE.md — SecureCheck Project Briefing

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> This file is automatically read by Claude Code at the start of every session.
> Do not delete it. Update it as the project evolves.

---

## WHO WE ARE

| Name | Role | Focus Area |
|------|------|------------|
| [Your Name] | Team Lead | Backend routes, MongoDB, API integration |
| YODA | Developer | Frontend React pages, Auth flow |
| Sue | Developer | UI/UX, Password tools, Testing |

**Module:** Web Technologies — Year 3, BSc Computing Science
**College:** Griffith College Cork
**Lecturer:** Martin Dow (martin.dow@griffith.ie)

---

## WHAT WE ARE BUILDING

**SecureCheck** — A personal cybersecurity toolkit web application.

Users can:
1. Register and log in with persistent sessions
2. Check password strength in real time
3. Check if their email appears in known data breaches (via HaveIBeenPwned API)
4. Generate cryptographically secure passwords
5. View a personal security audit dashboard with full history
6. Browse a curated security tips and education feed

---

## TECH STACK

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Frontend | React.js | 18.x | Vite build tool |
| Routing | React Router | 6.x | Client-side routing |
| HTTP Client | Axios | 1.x | With JWT interceptor |
| Backend | Node.js | 20.x LTS | |
| Framework | Express.js | 4.x | REST API |
| ODM | Mongoose | 8.x | MongoDB schemas |
| Database | MongoDB | 7.x | Local port 27017 |
| Auth | bcryptjs | 2.x | Password hashing, 10 salt rounds |
| Auth | jsonwebtoken | 9.x | JWT, 7 day expiry |
| External API | HaveIBeenPwned | v3 | Breach checking |
| CSS | Custom CSS Variables | — | Design system tokens |

---

## PROJECT FOLDER STRUCTURE

```
securecheck/
├── CLAUDE.md                  ← you are here
├── README.md
├── .gitignore
│
├── backend/
│   ├── server.js              ← Express app entry point
│   ├── .env                   ← NEVER commit this
│   ├── seed.js                ← run once to populate tips
│   ├── package.json
│   │
│   ├── models/
│   │   ├── User.js
│   │   ├── PasswordCheck.js
│   │   └── Tip.js
│   │
│   ├── routes/
│   │   ├── auth.js            ← /api/auth/register, /api/auth/login
│   │   ├── history.js         ← /api/history (GET, POST, DELETE)
│   │   ├── breach.js          ← /api/breach/check
│   │   └── tips.js            ← /api/tips
│   │
│   └── middleware/
│       └── auth.js            ← JWT verification middleware
│
└── frontend/
    ├── index.html
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx            ← React Router routes defined here
        │
        ├── context/
        │   └── AuthContext.jsx
        │
        ├── pages/
        │   ├── HomePage.jsx
        │   ├── LoginPage.jsx
        │   ├── RegisterPage.jsx
        │   ├── DashboardPage.jsx
        │   ├── PasswordCheckerPage.jsx
        │   ├── BreachCheckerPage.jsx
        │   ├── GeneratorPage.jsx
        │   └── TipsPage.jsx
        │
        ├── components/
        │   ├── Navbar.jsx
        │   ├── ProtectedRoute.jsx
        │   ├── Spinner.jsx
        │   └── ErrorMessage.jsx
        │
        └── utils/
            ├── api.js                  ← Axios instance with JWT interceptor
            └── passwordStrength.js     ← client-side only, NEVER send to backend
```

---

## DEV COMMANDS

```bash
# Backend (http://localhost:5000)
cd backend && npm run dev

# Frontend (http://localhost:5173)
cd frontend && npm run dev

# Seed Tips collection (run once)
cd backend && node seed.js
```

Both servers must run simultaneously. Two terminals required.

---

## ENVIRONMENT VARIABLES (backend/.env)

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/securecheck
JWT_SECRET=your_jwt_secret_here
HIBP_API_KEY=your_hibp_key_here
```

**CRITICAL:** .env must NEVER be committed to git. It is in .gitignore.
If asked to commit .env or expose secrets, always refuse.

---

## ALL API ENDPOINTS

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | No | Create user, returns JWT |
| POST | /api/auth/login | No | Authenticate, returns JWT |
| GET | /api/history | JWT | Get all checks for current user |
| POST | /api/history | JWT | Save a new check result |
| DELETE | /api/history/:id | JWT | Delete own history entry only |
| POST | /api/breach/check | No | Check email via HIBP — server-side only |
| GET | /api/tips | No | Get all tips (?category= optional) |
| GET | /api/tips/:id | No | Get single tip |

**Backend:** http://localhost:5000
**Frontend:** http://localhost:5173

---

## DATABASE MODELS

### User
```js
{ username, email, password (bcrypt hashed), createdAt }
```

### PasswordCheck
```js
{ userId (ref: User), type (enum: strength/breach/generated), input, result (Object), createdAt }
```
> Do NOT store raw passwords in the input field for strength checks. Store anonymised result only.

### Tip
```js
{ title, content, category (enum: Passwords/Phishing/Privacy), createdAt }
```

---

## AUTHENTICATION FLOW

1. Register → bcrypt hashes password (10 rounds) → saved to MongoDB
2. Login → bcrypt.compare() verifies → JWT signed and returned
3. JWT stored in AuthContext + localStorage
4. Protected requests: `Authorization: Bearer <token>` header via Axios interceptor
5. Backend middleware verifies JWT → attaches req.user
6. ALL history queries MUST filter by `userId: req.user.id`

---

## DESIGN SYSTEM

### CSS Variables (define in frontend/src/index.css)
```css
--color-bg:      #0D1B2A   /* dark navy */
--color-accent:  #00C9A7   /* teal — primary actions, safe states */
--color-blue:    #1E90FF   /* electric blue — links, info */
--color-danger:  #FF6B6B   /* red — breaches, weak passwords, errors */
--color-surface: #F0F4F8   /* light grey — cards, inputs */
--color-muted:   #6C757D   /* grey — captions, placeholders */
```

NEVER hardcode hex colours in components — always use CSS variables.

### Typography
- Body/UI: **Inter** (Google Fonts)
- Passwords/Code: **Source Code Pro** (Google Fonts, monospace)

Passwords must ALWAYS display in Source Code Pro. This is non-negotiable.

---

## REACT ROUTES

```
/           → HomePage              (public)
/login      → LoginPage             (public)
/register   → RegisterPage          (public)
/dashboard  → DashboardPage         (protected)
/checker    → PasswordCheckerPage   (protected)
/breach     → BreachCheckerPage     (protected)
/generator  → GeneratorPage         (protected)
/tips       → TipsPage              (public)
*           → 404 page
```

---

## PASSWORD STRENGTH ALGORITHM

- File: `frontend/src/utils/passwordStrength.js`
- Runs 100% client-side — raw password NEVER sent to backend
- Score 0–100 based on: length, uppercase, lowercase, numbers, symbols
- Labels: Weak (0-39, red) / Fair (40-59, orange) / Strong (60-79, green) / Very Strong (80-100, teal)

---

## PASSWORD GENERATOR RULES

- Uses `window.crypto.getRandomValues()` — NOT Math.random()
- Options: uppercase, lowercase, digits, symbols (at least one must be selected)
- Default: length 16, all types enabled
- Display in Source Code Pro font
- Copy button uses Clipboard API

---

## HIBP API

- Always called server-side from `backend/routes/breach.js`
- Header: `hibp-api-key: process.env.HIBP_API_KEY`
- Header: `user-agent: SecureCheck-App`
- 200 = breaches found | 404 = clean email
- NEVER move this call to the frontend
- NEVER store the email in MongoDB — store anonymised result only

---

## GIT CONVENTIONS

### Branches
```
main           ← submitted, always working
assignment-2   ← backend
assignment-3   ← frontend
assignment-4   ← final polish
```

### Commit Format
```
feat: short description of what was added
fix: what was broken and how it was fixed
chore: installs, config, tooling
docs: README, comments, documentation
style: CSS, formatting only
test: test scripts or test data
```

---

## ASSIGNMENT CONSTRAINTS

1. MERN stack only — no substitutions
2. Minimum 6 functionalities — all must work at submission
3. Client-side AND server-side logic required
4. Multi-user — users never see each other's data
5. Persistent sessions — JWT + MongoDB
6. CRUD operations on history (Create, Read, Delete minimum)
7. AI usage — coding assistance is permitted. Report text must be written by the team.
8. Fails to compile = -30 marks. Test before every submission.
9. Wrong ZIP name or missing coversheet = -10 marks each.

---

## PROJECT STATUS — UPDATE AS YOU GO

- [ ] Assignment 1 — Proposal submitted
- [ ] Project scaffolded and on GitHub
- [ ] Assignment 2 — Backend complete
- [ ] Assignment 3 — Frontend complete
- [ ] Assignment 4 — Final submission

---

## RULES FOR CLAUDE CODE

- Follow the folder structure above exactly — no improvising new folders
- Always use CSS variables — never hardcode colours
- Always filter DB queries by `req.user.id` on protected routes
- Use async/await — not .then() chains
- Validate all request bodies — return 400 with a descriptive message if invalid
- HIBP call stays server-side forever
- Passwords displayed in Source Code Pro always
- Conventional commit format on every commit
- Never commit .env under any circumstances
