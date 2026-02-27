# CLAUDE.md — SecureCheck Project Briefing

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> This file is automatically read by Claude Code at the start of every session.
> Do not delete it. Update it as the project evolves.

---
# SecureCheck — Full Build Guide for Claude Code Terminal
### From College Assignment → Portfolio → Final Year Project → Mobile App
> Open this file beside your VS Code terminal every single session.
> Work through it phase by phase. Never skip ahead.

---

## YOUR CURRENT STATUS ✅
- VS Code installed with all 7 extensions
- Claude Code installed and running
- GitHub private repo created
- CLAUDE.md ready to drop into project root

---

## HOW TO USE THIS GUIDE

Every numbered prompt below gets pasted **directly into your Claude Code terminal**.
Claude Code will read your CLAUDE.md first, so it already knows your project.
You just paste, review what it builds, test it, then move to the next prompt.

**Golden rules:**
- Never skip a prompt — each one builds on the previous
- Always test before moving on
- Commit after every prompt that works
- If something breaks, paste the error straight into Claude Code

---

## PHASE 0 — PROJECT FOUNDATION
> Do this once. Today. Right now.

---

### PROMPT 0.1 — Drop CLAUDE.md and scaffold the project

Before running Claude Code, manually place your `CLAUDE.md` file in your project root folder. Then open Claude Code in that folder and paste:

```
Read the CLAUDE.md file in this folder carefully.
Then scaffold the full SecureCheck MERN project with this exact structure:

securecheck/
├── CLAUDE.md
├── README.md
├── .gitignore
├── backend/
│   ├── server.js
│   ├── seed.js
│   ├── package.json
│   ├── models/
│   │   ├── User.js
│   │   ├── PasswordCheck.js
│   │   └── Tip.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── history.js
│   │   ├── breach.js
│   │   └── tips.js
│   └── middleware/
│       └── auth.js
└── frontend/
    ├── index.html
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── context/
        │   └── AuthContext.jsx
        ├── pages/
        │   ├── HomePage.jsx
        │   ├── LoginPage.jsx
        │   ├── RegisterPage.jsx
        │   ├── DashboardPage.jsx
        │   ├── PasswordCheckerPage.jsx
        │   ├── BreachCheckerPage.jsx
        │   ├── GeneratorPage.jsx
        │   └── TipsPage.jsx
        ├── components/
        │   ├── Navbar.jsx
        │   ├── ProtectedRoute.jsx
        │   ├── Spinner.jsx
        │   └── ErrorMessage.jsx
        └── utils/
            ├── api.js
            └── passwordStrength.js

Install all backend dependencies: express mongoose dotenv cors bcryptjs jsonwebtoken axios
Install all frontend dependencies: react react-dom react-router-dom axios

Create .gitignore excluding: node_modules .env dist .DS_Store
Create a placeholder README.md with the project name and tech stack.
Do not write any application logic yet — structure and dependencies only.
```

---

### PROMPT 0.2 — Connect to GitHub and make first commit

```
Initialise a git repository in the project root.
Connect it to my existing GitHub repo at [PASTE YOUR REPO URL HERE].
Stage all files, make an initial commit with message "feat: initial MERN scaffold",
and push to main.
Then create a new branch called assignment-2 and switch to it.
```

---

### PROMPT 0.3 — Create the .env file template

```
Create a file called backend/.env.example (NOT .env) with this content:
PORT=5000
MONGODB_URI=mongodb://localhost:27017/securecheck
JWT_SECRET=your_jwt_secret_replace_this
HIBP_API_KEY=your_hibp_api_key_here

Then tell me exactly what I need to do to create my real .env file from this.
Confirm .env is in .gitignore and will never be committed.
```

> ⚠️ After this prompt: manually create `backend/.env` with your real values. Never paste real secrets into Claude Code.

---

## PHASE 1 — BACKEND (Assignment 2)
> Build the entire Node/Express/MongoDB backend.

---

### PROMPT 1.1 — Express server setup

```
Build the backend/server.js file.
It should:
- Import and configure dotenv
- Import express, cors, mongoose
- Connect to MongoDB using MONGODB_URI from .env
- Log "MongoDB connected" on success or the error on failure
- Mount these routes:
    /api/auth    → routes/auth.js
    /api/history → routes/history.js
    /api/breach  → routes/breach.js
    /api/tips    → routes/tips.js
- Use express.json() middleware
- Use cors() middleware
- Start server on PORT from .env
- GET / returns JSON: { message: "SecureCheck API running", version: "1.0.0" }

Use async/await throughout. Follow the CLAUDE.md coding rules.
```

**Test:** `cd backend && node server.js` → visit http://localhost:5000 in browser → should see the JSON message.

---

### PROMPT 1.2 — User model with auth

```
Build backend/models/User.js with:
- username: String, required, unique, trimmed, 3-20 chars
- email: String, required, unique, lowercase, trimmed
- password: String, required, minimum 6 chars
- createdAt: Date, default now
- A pre-save hook that hashes password with bcryptjs (10 salt rounds)
  but ONLY if the password field was modified
- An instance method called comparePassword(candidatePassword)
  that uses bcrypt.compare and returns a boolean

Then build backend/routes/auth.js with:
- POST /api/auth/register
  Validates that username, email, password are all present
  Checks email is not already registered — returns 400 if duplicate
  Creates new User — password hashed automatically via pre-save hook
  Returns 201 with JWT token (signed with JWT_SECRET, expires in 7 days)
  and user object (without password field)

- POST /api/auth/login
  Validates email and password present
  Finds user by email
  Uses comparePassword() to verify
  Returns 400 with "Invalid credentials" for any failure (never specify which field is wrong)
  Returns 200 with JWT token and user object on success

Use async/await and try/catch on all routes. Return consistent error format: { message: "..." }
```

**Test:** Use Thunder Client in VS Code:
- POST http://localhost:5000/api/auth/register with `{ "username": "testuser", "email": "test@test.com", "password": "Test1234!" }`
- POST http://localhost:5000/api/auth/login with same credentials
- Confirm you get a token back

---

### PROMPT 1.3 — Auth middleware

```
Build backend/middleware/auth.js:
- Extracts JWT from Authorization header (Bearer token format)
- Returns 401 with { message: "No token, authorisation denied" } if missing
- Verifies token using JWT_SECRET
- Attaches decoded payload to req.user
- Returns 401 with { message: "Token is not valid" } if verification fails
- Calls next() if valid

This middleware will be imported and used on all protected routes.
```

---

### PROMPT 1.4 — History routes (CRUD)

```
Build backend/models/PasswordCheck.js with:
- userId: ObjectId, ref User, required
- type: String, enum ['strength', 'breach', 'generated'], required
- input: String (store anonymised data only — never raw passwords for strength checks)
- result: Object (flexible schema to store different result types)
- createdAt: Date, default now

Build backend/routes/history.js with the auth middleware protecting all routes:
- GET /api/history
  Returns all PasswordCheck documents for req.user.id
  Sorted by createdAt descending
  Returns 200 with array (empty array if none found)

- POST /api/history
  Validates type is one of the three enum values
  Creates new PasswordCheck with userId: req.user.id
  Returns 201 with created document

- DELETE /api/history/:id
  Finds document by id AND userId: req.user.id (prevents deleting other users' records)
  Returns 404 if not found or not owned by user
  Deletes and returns 200 with { message: "Entry deleted" }
```

**Test with Thunder Client:**
- Add `Authorization: Bearer [your token]` header
- GET http://localhost:5000/api/history → should return empty array
- POST with `{ "type": "strength", "input": "anonymised", "result": { "score": 85 } }`
- GET again → should return the entry
- DELETE using the _id from the POST response

---

### PROMPT 1.5 — Breach checker route

```
Build backend/routes/breach.js:
- POST /api/breach/check
  Validates email is present and matches basic email regex
  Returns 400 if invalid
  Makes a GET request to https://haveibeenpwned.com/api/v3/breachedaccount/{email}
  with headers:
    hibp-api-key: process.env.HIBP_API_KEY
    user-agent: SecureCheck-App
  If HIBP returns 404: email is clean, return { breached: false, count: 0, breaches: [] }
  If HIBP returns 200: return { breached: true, count: breaches.length, breaches: array }
  Each breach object should include: Name, Domain, BreachDate, DataClasses
  Handle network errors gracefully with 500 and { message: "Breach check service unavailable" }
  Do NOT store the email address in MongoDB — only store anonymised results in history
```

**Test with Thunder Client:**
- POST http://localhost:5000/api/breach/check with `{ "email": "test@example.com" }`
- Try with a known breached email to confirm results return correctly

---

### PROMPT 1.6 — Tips model and routes

```
Build backend/models/Tip.js with:
- title: String, required
- content: String, required
- category: String, enum ['Passwords', 'Phishing', 'Privacy'], required
- createdAt: Date, default now

Build backend/routes/tips.js:
- GET /api/tips
  If ?category= query param present, filter by category
  Returns all matching tips sorted by createdAt descending
  No auth required — tips are public

- GET /api/tips/:id
  Returns single tip by id
  Returns 404 if not found

Build backend/seed.js:
A standalone script that:
- Connects to MongoDB
- Clears the existing Tips collection
- Inserts exactly 12 tips — 4 per category:

Passwords tips: using a password manager, avoiding password reuse,
why length matters more than complexity, how to remember strong passwords

Phishing tips: recognising suspicious sender addresses, hovering over links before clicking,
what urgent language in emails means, how to verify a website is legitimate

Privacy tips: enabling 2FA on important accounts, what to do after a data breach,
reviewing app permissions on your phone, using different emails for different services

Each tip should have a realistic title and 2-3 sentences of helpful content.
After inserting, log "Seeded X tips" and disconnect from MongoDB.
```

**Test:**
- `node backend/seed.js` → should log "Seeded 12 tips"
- GET http://localhost:5000/api/tips → should return all 12
- GET http://localhost:5000/api/tips?category=Phishing → should return 4

---

### PROMPT 1.7 — Backend review and hardening

```
Review the entire backend codebase for:
1. Any route missing input validation — add it
2. Any route missing try/catch — add it
3. Any place a raw password could accidentally be returned in a response — remove it
4. Any hardcoded values that should be in .env — move them
5. Consistent error response format: { message: "..." } on all errors
6. Console.log statements that should be removed for production

List everything you find and fix it all.
Then run a final check that all 8 API endpoints work correctly.
```

---

### PROMPT 1.8 — Commit backend complete

```
Stage all backend files.
Write a conventional commit message summarising all backend work completed.
Push to the assignment-2 branch on GitHub.
```

---

## PHASE 2 — FRONTEND (Assignment 3)
> Build the React frontend. Backend must be running on port 5000 while testing.

---

### PROMPT 2.1 — React Router and app shell

```
Build the frontend application shell:

In frontend/src/index.css:
Define these CSS variables and apply base styles:
:root {
  --color-bg: #0D1B2A;
  --color-accent: #00C9A7;
  --color-blue: #1E90FF;
  --color-danger: #FF6B6B;
  --color-surface: #F0F4F8;
  --color-muted: #6C757D;
  --color-text: #1A1A2E;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'Source Code Pro', monospace;
}
Apply a dark navy background, Inter font from Google Fonts, and Source Code Pro from Google Fonts.
Basic reset: margin 0, box-sizing border-box.

In frontend/src/App.jsx:
Set up React Router v6 with these routes:
/ → HomePage (public)
/login → LoginPage (public)
/register → RegisterPage (public)
/dashboard → DashboardPage (protected)
/checker → PasswordCheckerPage (protected)
/breach → BreachCheckerPage (protected)
/generator → GeneratorPage (protected)
/tips → TipsPage (public)
* → 404 page with "Page not found" message and link back to home

Protected routes use the ProtectedRoute component.
Include Navbar on all pages.

Build frontend/src/components/ProtectedRoute.jsx:
Reads JWT from localStorage key 'securecheck_token'
If no token: redirect to /login
If token exists: render the child component
```

---

### PROMPT 2.2 — Auth context and Axios instance

```
Build frontend/src/context/AuthContext.jsx:
- Creates AuthContext with createContext
- AuthProvider component that wraps the app
- State: user (object), token (string), loading (boolean)
- On mount: reads 'securecheck_token' and 'securecheck_user' from localStorage
  Sets them in state if found (persistent session on page refresh)
- login(token, user) function:
  Saves token and user to localStorage with keys securecheck_token and securecheck_user
  Updates state
- logout() function:
  Removes both localStorage items
  Clears state
  Redirects to /login
- Exports useAuth() custom hook for easy access
- Wrap App.jsx with AuthProvider in main.jsx

Build frontend/src/utils/api.js:
- Creates Axios instance with baseURL: http://localhost:5000
- Request interceptor that reads securecheck_token from localStorage
  and attaches it as Authorization: Bearer [token] header automatically
- Response interceptor that catches 401 errors and calls logout()
```

---

### PROMPT 2.3 — Navbar component

```
Build frontend/src/components/Navbar.jsx:
- Fixed top navbar with dark navy background using --color-bg
- Left side: "🔐 SecureCheck" logo/brand link to /
- Right side links depend on auth state (use useAuth()):
  Not logged in: Tips, Login, Register
  Logged in: Dashboard, Checker, Breach, Generator, Tips, and a Logout button
- Active link highlighted with --color-accent colour
- Logout button calls logout() from useAuth()
- Mobile responsive: hamburger menu on small screens
- Use CSS variables throughout — no hardcoded colours
```

---

### PROMPT 2.4 — Login and Register pages

```
Build frontend/src/pages/LoginPage.jsx:
- Centered card layout on dark background
- Email and password inputs with labels
- Show/hide password toggle button
- Client-side validation: both fields required, email format check
- Error message displayed if validation fails or API returns error
- On submit: POST to /api/auth/login via api.js instance
- On success: call login(token, user) from useAuth() then redirect to /dashboard
- Link to RegisterPage: "Don't have an account? Register here"
- Loading state on submit button

Build frontend/src/pages/RegisterPage.jsx:
- Same card layout
- Username, email, password, confirm password inputs
- Validation: all required, email format, passwords match, password min 6 chars
- On submit: POST to /api/auth/register
- On success: call login(token, user) then redirect to /dashboard
- Link to LoginPage: "Already have an account? Login here"
- Loading state on submit button

Use --color-accent for primary buttons, --color-danger for error messages.
Use CSS variables throughout.
```

---

### PROMPT 2.5 — Dashboard page

```
Build frontend/src/pages/DashboardPage.jsx:
- On mount: GET /api/history via api.js (JWT attached automatically)
- Derive three stats from the history array:
    Strength checks: count of items where type === 'strength'
    Breach checks: count where type === 'breach'
    Saved passwords: count where type === 'generated'
- Display three stat cards with icons, counts, and labels
  Use --color-accent for strength, --color-blue for breach, a purple for generated
- "Recent Activity" section showing last 5 history entries:
    Icon for type, human readable description, date formatted as "27 Feb 2026"
    Colour-coded badge: green for safe results, red for flagged
    Delete button (X) on each entry that calls DELETE /api/history/:id
    List updates immediately after deletion without page reload
- "Welcome back, [username]" heading
- Loading spinner while fetching
- Empty state message if no history yet: "No security checks yet — get started below"
- Quick action buttons linking to /checker, /breach, /generator
```

---

### PROMPT 2.6 — Password strength checker page

```
Build frontend/src/utils/passwordStrength.js:
A pure function analysePassword(password) that returns:
{
  score: 0-100,
  label: 'Weak' | 'Fair' | 'Strong' | 'Very Strong',
  color: CSS variable string,
  feedback: array of { criterion: string, met: boolean }
}

Scoring:
- Length >= 8: +10, >= 12: +20, >= 16: +30
- Has uppercase: +10
- Has lowercase: +10  
- Has numbers: +10
- Has symbols (!@#$%^&* etc): +10
- Extra variety bonus up to +10

Labels: 0-39 Weak, 40-59 Fair, 60-79 Strong, 80-100 Very Strong

Build frontend/src/pages/PasswordCheckerPage.jsx:
- Password input field with show/hide toggle
- Runs analysePassword() on every keystroke via onChange — no API call
- Animated colour-coded progress bar that fills based on score
- Strength label displayed prominently
- Feedback list showing 5-6 criteria with green tick or red cross
- "Save to History" button (disabled if input empty):
    POSTs to /api/history with type: 'strength', anonymised input, result: { score, label }
    Does NOT send the actual password to the backend
    Shows success message on save
- Password input uses font-family: var(--font-mono)
```

---

### PROMPT 2.7 — Breach checker page

```
Build frontend/src/pages/BreachCheckerPage.jsx:
- Email input with label "Check your email address"
- Client-side email format validation before submitting
- On submit: POST to /api/breach/check
- Loading spinner while waiting (HIBP can be slow)
- If breached: true response:
    Red alert box: "⚠️ Found in X data breaches"
    Card for each breach showing: service name, breach date, data types exposed
    "Save to History" button
- If breached: false response:
    Green success box: "✅ Good news — no breaches found for this email"
    "Save to History" button
- Error handling: show friendly message if service is unavailable
- Explainer text: "We check securely using the HaveIBeenPwned database.
  Your email is never stored."
```

---

### PROMPT 2.8 — Password generator page

```
Build frontend/src/pages/GeneratorPage.jsx:
- Length slider: min 8, max 64, default 16, shows current value
- Four checkboxes: Uppercase (A-Z), Lowercase (a-z), Numbers (0-9), Symbols (!@#$%^&*)
  All checked by default. At least one must always be checked.
- Generate button — regenerates a new password
- Password display box using font-family: var(--font-mono), font size 18px
  Shows the generated password in a prominent styled box
- Copy to clipboard button:
    Uses navigator.clipboard.writeText()
    Shows "✅ Copied!" confirmation for 2 seconds, then resets
- Password generated using window.crypto.getRandomValues() — never Math.random()
- "Save Password" button: POSTs to /api/history with type: 'generated', result: { password, length, options }
- Saved passwords list below the generator:
    GETs /api/history filtered to type === 'generated'
    Shows each saved password in monospace font with date and delete button
- Auto-generates a password on page load
```

---

### PROMPT 2.9 — Tips feed page

```
Build frontend/src/pages/TipsPage.jsx:
- On mount: GET /api/tips — no auth required
- Three filter buttons: All, Passwords, Phishing, Privacy
  Clicking a filter re-fetches with ?category= query param
  Active filter button highlighted with --color-accent
- Tips displayed in responsive CSS grid:
    2 columns on desktop, 1 column on mobile
    Each card: title, content, colour-coded category badge, date
    Category colours: Passwords → --color-accent, Phishing → --color-danger, Privacy → --color-blue
- Skeleton loading state (grey placeholder cards) while fetching
- Empty state if no tips match filter
- Tips page accessible without login — no auth check
```

---

### PROMPT 2.10 — Home page

```
Build frontend/src/pages/HomePage.jsx:
A landing page for non-logged-in visitors:
- Hero section: "🔐 SecureCheck" heading, tagline "Your personal cybersecurity toolkit"
  Two CTA buttons: "Get Started Free" → /register, "View Security Tips" → /tips
- Features section: 6 feature cards in a grid, one per tool with icon and brief description
- How it works: 3 steps (Create account, Run checks, Stay protected)
- Dark theme using --color-bg, --color-accent for highlights
If user is already logged in (check useAuth()), redirect to /dashboard automatically
```

---

### PROMPT 2.11 — Polish and production readiness

```
Do a complete frontend polish pass:

1. Build frontend/src/components/Spinner.jsx — a centred loading spinner using CSS animation and --color-accent

2. Build frontend/src/components/ErrorMessage.jsx — 
   a reusable error display component with red styling using --color-danger

3. Add page titles to every page using document.title = "Page Name | SecureCheck"

4. Ensure ALL pages are mobile responsive:
   - Navbar collapses to hamburger on screens under 768px
   - Cards stack to single column
   - Inputs are full width on mobile
   - Buttons are touch-friendly (min height 44px)

5. Add a 404 page component with friendly message and home link

6. Check every component uses CSS variables — no hardcoded hex colours anywhere

7. Confirm the Axios interceptor is correctly attaching JWT to all protected requests

8. Add error boundaries around major page components

List every change made.
```

---

### PROMPT 2.12 — Frontend commit

```
Stage all frontend files.
Write a conventional commit message summarising all frontend work.
Push to the assignment-3 branch.
Then merge assignment-2 and assignment-3 into main.
Tag the merge commit as v1.0.0.
Push everything including tags.
```

---

## PHASE 3 — DEPLOYMENT (Portfolio Ready — v1.5)
> Do this after Assignment 4 is submitted. Makes the app live on the internet.

---

### PROMPT 3.1 — Prepare for cloud deployment

```
Prepare the codebase for cloud deployment:

1. Update backend/server.js to serve the React build folder as static files
   when NODE_ENV === 'production', with a catch-all route returning index.html

2. Add a "start" script to backend/package.json: "node server.js"

3. Update frontend/src/utils/api.js so the Axios baseURL is:
   - http://localhost:5000 in development
   - An empty string '' in production (same-origin requests)
   Use import.meta.env.VITE_API_URL for this.

4. Create frontend/.env.development with:
   VITE_API_URL=http://localhost:5000

5. Create a root-level package.json with scripts:
   "build": "cd frontend && npm install && npm run build && cp -r dist ../backend/public"
   "start": "cd backend && node server.js"

6. Update README.md with:
   - Live demo link placeholder: [LIVE DEMO](https://your-url-here)
   - Tech stack badges
   - Local setup instructions
   - Environment variables table

List all changes made and confirm nothing is broken locally.
```

---

### PROMPT 3.2 — MongoDB Atlas migration

```
Guide me through migrating from local MongoDB to MongoDB Atlas:

1. Show me exactly what to do on atlas.mongodb.com to:
   - Create a free M0 cluster
   - Create a database user
   - Whitelist all IP addresses (0.0.0.0/0) for cloud deployment
   - Get the connection string

2. Update the code so MONGODB_URI in .env is the only thing that needs to change
   to switch between local and Atlas

3. Update seed.js so it can be run against Atlas when I update .env

4. Confirm the connection string format and any Mongoose options needed for Atlas

Give me exact step-by-step instructions, not just general guidance.
```

---

### PROMPT 3.3 — Deploy to Railway (backend)

```
Walk me through deploying the SecureCheck backend to Railway (railway.app):

1. What files Railway needs and any Railway-specific config
2. How to set environment variables on Railway (PORT, MONGODB_URI, JWT_SECRET, HIBP_API_KEY)
3. How to trigger deploys from GitHub automatically
4. How to get the deployed backend URL

Then update frontend/src/utils/api.js with the Railway URL for production.
Give me exact steps — I have never deployed to Railway before.
```

---

### PROMPT 3.4 — Deploy frontend to Vercel

```
Walk me through deploying the SecureCheck React frontend to Vercel (vercel.com):

1. How to connect my GitHub repo to Vercel
2. Build settings: build command, output directory, root directory
3. Environment variables needed on Vercel (VITE_API_URL pointing to Railway backend)
4. How to add a custom domain once I have one
5. How automatic deploys work on git push

Give me exact steps — I have never deployed to Vercel before.
After explaining, update any config files in the codebase that Vercel needs.
```

---

### PROMPT 3.5 — Demo account and final live check

```
Create a script called backend/createDemoUser.js that:
- Connects to the Atlas database
- Creates a demo user: username "demo", email "demo@securecheck.app", password "Demo1234!"
- Creates 10 realistic history entries for this user:
    4 strength checks with varied scores (35, 62, 78, 94)
    3 breach checks (2 clean, 1 breached with realistic data)
    3 saved generated passwords of different lengths
- Logs "Demo account created successfully"
- Disconnects

This lets employers log in and see a fully populated dashboard immediately.
After running it, give me the exact demo credentials to add to the README.
```

---

## PHASE 4 — EXTENDED SECURITY TOOLS (v2.0)
> Summer 2026. Build these one at a time. Each is a standalone feature.

---

### PROMPT 4.1 — URL / Phishing scanner

```
Add a URL phishing and malware scanner feature:

Backend:
- Add backend/routes/urlscan.js
- POST /api/urlscan/check accepts { url: string }
- Validates URL format
- Calls Google Safe Browsing API v4:
  POST https://safebrowsing.googleapis.com/v4/threatMatches:find
  with API key from process.env.GOOGLE_SAFE_BROWSING_KEY
- Returns { safe: boolean, threats: array, url: string }
- Add GOOGLE_SAFE_BROWSING_KEY to .env.example
- Mount route in server.js

Frontend:
- Add /urlscan route in App.jsx
- Build src/pages/UrlScanPage.jsx:
  URL input field with validation
  Scan button with loading state
  Green result for safe URLs
  Red result listing threat types for dangerous URLs
  Explanation of what each threat type means in plain English
  Save to history option
- Add to Navbar for logged-in users
- Add feature card to HomePage
```

---

### PROMPT 4.2 — Dark web monitoring with email alerts

```
Add dark web breach monitoring with scheduled email alerts:

Backend:
1. Install node-cron and nodemailer: npm install node-cron nodemailer

2. Add to User model:
   - monitoredEmails: [String] (list of emails to monitor)
   - emailNotifications: Boolean (default true)
   - lastMonitoredAt: Date

3. New route POST /api/monitor/add — add an email to monitoring list (max 3 per user)
   New route DELETE /api/monitor/remove — remove from list
   New route GET /api/monitor/list — get monitored emails

4. Create backend/services/monitorService.js:
   - Runs every Sunday at 8am using node-cron: '0 8 * * 0'
   - For each user with monitoredEmails and emailNotifications: true
   - Checks each email against HIBP
   - Compares with their last breach history
   - If NEW breaches found since lastMonitoredAt:
     Sends email alert via Nodemailer using Gmail SMTP
   - Update lastMonitoredAt after checking

5. Import and start monitorService in server.js

6. Add EMAIL_USER and EMAIL_PASS to .env.example

Email template should be clean HTML:
"⚠️ SecureCheck Alert: New breach detected for [email]
[Breach name] exposed your [data types] on [date].
Here's what you should do: [AI-generated action steps — leave as placeholder for now]
View your full report: [dashboard link]"

Frontend:
- Add /monitor route
- Build src/pages/MonitorPage.jsx:
  List of currently monitored emails
  Add email form (up to 3 emails)
  Remove button per email
  Toggle for email notifications
  "Next check: Sunday 8:00 AM" indicator
```

---

### PROMPT 4.3 — SSL certificate checker

```
Add an SSL certificate checker tool:

Backend:
- Install ssl-checker: npm install ssl-checker
- Add backend/routes/sslcheck.js
- POST /api/sslcheck/check accepts { domain: string }
  Strips https://, http://, and paths — extracts domain only
  Validates domain format
  Uses ssl-checker to get certificate info
  Returns: { valid, daysRemaining, validFrom, validTo, issuer, domain }
  If daysRemaining < 30: flag as warning
  If daysRemaining < 7: flag as critical
  Handle connection errors gracefully

Frontend:
- Add /sslcheck route
- Build src/pages/SslCheckPage.jsx:
  Domain input (user can paste full URL or just domain)
  Results card showing:
    Green if valid and > 30 days remaining
    Orange warning if < 30 days
    Red critical if < 7 days or invalid
  Days remaining displayed prominently as a countdown
  Certificate details (issuer, valid from/to) in expandable section
```

---

### PROMPT 4.4 — 2FA readiness checklist

```
Build a 2FA readiness interactive checklist tool (no external API needed):

Backend:
- Add a 2fa_progress field to User model: Object (flexible)
- POST /api/twofactor/save accepts { platform: string, enabled: boolean }
  Saves user's 2FA status per platform
- GET /api/twofactor/progress returns user's saved 2FA completion

Frontend:
- Add /2fa route
- Build src/pages/TwoFactorPage.jsx:

The page shows a checklist of 20 major platforms grouped by category:

Email: Gmail, Outlook, Apple Mail
Social: Facebook, Instagram, Twitter/X, LinkedIn, TikTok  
Finance: PayPal, Revolut, AIB, Bank of Ireland, Stripe
Work: Google Workspace, Microsoft 365, Slack, GitHub
Shopping: Amazon, eBay

Each platform shows:
- Platform name and logo (use simple emoji or letter avatars)
- Toggle switch: 2FA enabled / not enabled
- "How to enable" expandable section with 3-step instructions
- Colour-coded status

Top of page: Overall 2FA score X/20 with progress bar
"Excellent", "Good", "Needs Work" based on score ranges
Progress saves to backend automatically on toggle
```

---

## PHASE 5 — AI INTEGRATION (v2.5)
> September 2026 — Final Year Project Phase Begins

---

### PROMPT 5.1 — Claude AI security assistant

```
Integrate the Anthropic Claude API as an AI security assistant:

1. Install Anthropic SDK: npm install @anthropic-ai/sdk
2. Add ANTHROPIC_API_KEY to .env.example
3. Create backend/services/aiService.js:
   - Import Anthropic SDK
   - Function: getSecurityAdvice(userMessage, userContext)
     userContext includes: breach history summary, password strength history,
     security score, monitored emails count
   - System prompt:
     "You are SecureCheck's AI security assistant. You are an expert in personal
     cybersecurity who explains complex security concepts in plain, friendly English
     for non-technical users. You have access to the user's security history context.
     Always be specific, actionable, and reassuring. Never be alarmist.
     Keep responses under 200 words unless a detailed explanation is explicitly requested."
   - Returns AI response text

4. Create backend/routes/ai.js (protected):
   - POST /api/ai/chat
     Accepts { message: string }
     Fetches user's last 10 history entries for context
     Calls getSecurityAdvice() with message and context
     Returns { response: string }
   - Rate limit: max 20 messages per user per day (track in User model)
   - Mount in server.js

Frontend:
5. Build src/components/AiAssistant.jsx:
   - Chat interface component
   - Message history displayed in chat bubbles (user right, AI left)
   - AI messages use --color-accent, user messages use --color-blue
   - Input field at bottom with send button
   - Loading indicator while waiting for AI response
   - Suggested starter questions as clickable chips:
     "Is my security score good?"
     "What should I do about my breaches?"
     "How do I make stronger passwords?"
   - Message history stored in component state (clears on page refresh)

6. Add /assistant route and AiAssistantPage.jsx that renders the chat component
7. Add floating chat button on Dashboard that opens AI assistant
```

---

### PROMPT 5.2 — AI security score with personalised breakdown

```
Build an AI-powered personalised security score system:

Backend:
1. Create backend/services/scoreService.js:
   
   Function: calculateSecurityScore(userId)
   - Fetches user's full history
   - Fetches user's 2FA progress
   - Fetches monitored emails list
   - Calculates base score (0-100):
     Password strength average: up to 30 points
     Breach response rate (did they act after breach alerts?): up to 20 points
     2FA adoption: up to 20 points
     Dark web monitoring active: up to 10 points
     Generator usage (using strong generated passwords): up to 10 points
     Account age + engagement bonus: up to 10 points
   - Returns { score, breakdown, trend, lastCalculatedAt }

   Function: generateAiScoreReport(score, breakdown, history)
   - Calls Claude API with score data as context
   - Prompts Claude to write a personalised 3-paragraph security report:
     Paragraph 1: What the user is doing well
     Paragraph 2: Specific areas for improvement
     Paragraph 3: Top 3 action items this week
   - Returns report text

2. Add GET /api/score endpoint (protected):
   Calculates score, generates AI report
   Caches result in User model for 24 hours
   Returns { score, breakdown, report, calculatedAt }

Frontend:
3. Build src/pages/SecurityScorePage.jsx:
   - Large circular score display (like a speedometer) with colour coding:
     0-39: red, 40-59: orange, 60-79: green, 80-100: teal
   - Score breakdown as a bar chart (use CSS bars, no library needed)
   - AI-generated report displayed below in a card
   - "Recalculate" button (disabled if calculated within last hour)
   - Score trend: "Up 5 points from last week" or "Down 2 points"
   - Link to each tool to improve weak areas

4. Add Security Score card to Dashboard with score preview and link to full page
```

---

### PROMPT 5.3 — Weekly AI security digest email

```
Build automated weekly AI-generated security digest emails:

Backend:
1. Create backend/services/digestService.js:

   Function: generateUserDigest(user, history, score)
   - Calls Claude API with:
     User's security score and change from last week
     Number of checks run this week
     Any new breaches detected
     Weakest areas from score breakdown
   - Prompts Claude:
     "Write a friendly, personal weekly security digest email for this user.
     Include: a summary of their week in security, one specific thing they did well,
     one specific improvement to make this week, and a security tip they haven't seen.
     Tone: like a knowledgeable friend, not a corporate newsletter. Under 250 words."
   - Returns HTML email content

   Function: sendWeeklyDigests()
   - Runs every Monday at 8am: '0 8 * * 1'
   - Gets all users with emailNotifications: true
   - For each user: generates digest, sends via Nodemailer
   - Logs success/failure per user

2. Import and start digestService in server.js
3. Add GET /api/digest/preview endpoint so users can see this week's digest in the app

Frontend:
4. Add "Email Digest" section to user profile/settings page:
   Toggle to enable/disable weekly digest
   "Preview this week's digest" button that fetches and displays it
   Last sent date
```

---

### PROMPT 5.4 — AI threat intelligence feed

```
Build an AI-powered threat intelligence feed:

Backend:
1. Create backend/services/threatIntelService.js:

   Function: fetchRecentBreaches()
   - GET https://haveibeenpwned.com/api/v3/breaches
   - Returns last 10 breaches sorted by AddedDate
   - Cache results in memory for 6 hours (don't hammer the API)

   Function: generateThreatBrief(breaches, userHistory)
   - Calls Claude API with recent breach data and user's service history
   - Prompts:
     "You are a cybersecurity analyst briefing a non-technical user.
     Given these recent data breaches and this user's history,
     write a brief threat intelligence update (max 150 words).
     Highlight any breaches relevant to services this user likely uses.
     Give one clear action item. Plain English only."
   - Returns brief text

2. Add GET /api/threats/feed endpoint (protected):
   Returns last 10 breaches + AI brief for the current user
   Cached for 6 hours

Frontend:
3. Add "Threat Feed" section to Dashboard:
   - "Latest Threats" card showing most recent breach (name, date, records affected)
   - AI brief paragraph personalised to the user
   - "View All" link to /threats page
   
4. Build src/pages/ThreatFeedPage.jsx:
   - List of recent breaches as cards
   - Each card: service name, breach date, number of accounts, data types
   - AI-generated personalised impact assessment per breach
   - Colour coding: red if user likely affected, grey if low relevance
```

---

## PHASE 6 — MOBILE APP (v3.0)
> After FYP submission — Long game

---

### PROMPT 6.1 — React Native project setup

```
Set up the React Native mobile app alongside the existing project:

1. In the project root, create a new folder: mobile/
2. Initialise an Expo project inside it:
   Instructions to run: npx create-expo-app mobile --template blank
3. Install navigation: npm install @react-navigation/native @react-navigation/stack
4. Install Axios: npm install axios
5. Set up the same Axios instance as the web app pointing to the production Railway backend

Create mobile/src/utils/api.js identical to the web version but pointing to the production URL.

Create the same AuthContext pattern adapted for React Native:
- Use AsyncStorage instead of localStorage: npm install @react-native-async-storage/async-storage
- Login/logout functions work the same way

Create the navigation structure with these screens:
- Auth stack: Login, Register
- Main tab navigator: Dashboard, Tools, AI Assistant, Tips, Profile
- Tools stack: PasswordChecker, BreachChecker, Generator, UrlScan, TwoFactor, Monitor

The backend requires ZERO changes — same API, same endpoints, just a new client.
```

---

### PROMPT 6.2 — Core mobile screens

```
Build the core React Native screens.
Adapt the logic from the web pages — same API calls, same business logic,
but use React Native components (View, Text, TextInput, TouchableOpacity, FlatList)
instead of HTML elements.

Build these screens:
1. LoginScreen — TextInput for email/password, TouchableOpacity login button
2. RegisterScreen — same pattern with confirm password
3. DashboardScreen — ScrollView with stat cards using StyleSheet
4. PasswordCheckerScreen — TextInput with live strength analysis, progress bar using View width %
5. BreachCheckerScreen — TextInput, loading indicator, results list with FlatList
6. GeneratorScreen — Slider for length, Switch components for options, large monospace Text display

Use StyleSheet throughout with the same colour palette:
const colors = {
  bg: '#0D1B2A',
  accent: '#00C9A7',
  blue: '#1E90FF',
  danger: '#FF6B6B',
  surface: '#F0F4F8',
}

No CSS — pure React Native StyleSheet.
```

---

## MAINTENANCE PROMPTS
> Use these any time throughout the entire project

---

### When you need to debug something
```
This is broken: [describe what's wrong]
Here is the error: [paste full error message and stack trace]
Here is the relevant code: [paste it or describe which file]
Find the cause and fix it. Explain what was wrong.
```

### Before every assignment submission
```
Do a full pre-submission review of the entire codebase:
1. Any syntax errors or obvious bugs
2. Any console.log() debug statements to remove
3. Any .env values accidentally hardcoded
4. Any routes missing error handling
5. Any components with missing loading or error states
6. Does the app compile and run cleanly from npm install?
List everything found sorted by severity. Fix all critical issues.
```

### When you want to commit
```
Review all changes since the last commit.
Stage everything, write a conventional commit message describing what was built,
and push to [branch name].
```

### When starting a new session
```
Read CLAUDE.md to remind yourself of the project.
Then show me the current git status and the last 3 commits so I know where we left off.
```

### When a teammate causes a merge conflict
```
I have a merge conflict in [filename].
Here is the conflict: [paste the conflicting section with <<<<<<< markers]
The change I want to keep is [describe it].
Show me the resolved version of the file and the git commands to complete the merge.
```

---

## VERSION TRACKER — Update as You Go

| Version | Status | Date | What's Live |
|---------|--------|------|-------------|
| v1.0.0 | ⬜ | | Assignment build — local only |
| v1.5.0 | ⬜ | | Deployed — Vercel + Railway + Atlas |
| v2.0.0 | ⬜ | | URL scanner, dark web monitor, SSL checker, 2FA checklist |
| v2.5.0 | ⬜ | | AI assistant, security score, weekly digest, threat feed |
| v3.0.0 | ⬜ | | React Native mobile app |

---

*SecureCheck | Built by [Your Name], YODA, Sue | Griffith College Cork | Web Technologies 2026*
*Personal project and Final Year Project candidate — Year 4 starting Sept 2026*