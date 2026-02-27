# InfinitySec

A full-stack MERN web application for personal cybersecurity — password strength checking, data breach detection, secure password generation, and security education.

## Prerequisites

- Node.js 20.x LTS
- MongoDB 7.x running locally (or a MongoDB Atlas URI)
- A HaveIBeenPwned API key (v3) for the breach checker

## Setup

### 1. Clone and install

```bash
# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Configure environment

Copy the template and fill in your values:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/infinitysec
JWT_SECRET=<a long random string>
HIBP_API_KEY=<your HaveIBeenPwned API key>
```

### 3. Seed the database

Run once to insert the 12 security tips:

```bash
cd backend && node seed.js
```

### 4. Start development servers

Two terminals required:

```bash
# Terminal 1 — backend (http://localhost:5000)
cd backend && npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd frontend && npm run dev
```

The Vite dev server proxies all `/api` requests to the backend, so no CORS config is needed in development.

## API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | No | Register new user |
| POST | /api/auth/login | No | Login, receive JWT |
| GET | /api/history | Yes | Get user's check history |
| POST | /api/history | Yes | Save a check result |
| DELETE | /api/history/:id | Yes | Delete one history entry |
| POST | /api/breach/check | No | Check email against HIBP |
| GET | /api/tips | No | Get all tips (optional ?category=) |
| GET | /api/tips/:id | No | Get single tip |

`Authorization: Bearer <token>` header required for protected routes.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router 6, Axios, Vite 5 |
| Backend | Node.js 20, Express 4, Mongoose 8 |
| Database | MongoDB 7 |
| Auth | bcryptjs, jsonwebtoken (7-day expiry) |
| External API | HaveIBeenPwned v3 |
