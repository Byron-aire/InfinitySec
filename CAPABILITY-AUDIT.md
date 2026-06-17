# Byronaire Security — Capability Audit

> Inventory + recommendations from the June 2026 rebrand. **This is a decision aid, not a
> change.** Nothing here has been implemented — pick what you want and it becomes its own task.
> Goal: sharpen ~18 surfaces down to ~8–9 strong, non-overlapping tools.

## Full inventory (current)

| # | Tool | Route | Kind | Verdict |
|---|------|-------|------|---------|
| 1 | Password Checker | `/checker` | client-side | **Keep** — flagship, instant value |
| 2 | Password Generator | `/generator` | client-side | **Merge** → into Passwords (tabs) |
| 3 | Breach Checker | `/breach` | HIBP | **Keep** (hub anchor) |
| 4 | Breach Monitor (was Void Watch) | `/voidwatch` | cron email | **Merge** → Breach hub |
| 5 | Breach Impact (was Cursed Intel) | breach page | AI | **Merge** → Breach hub |
| 6 | SSL Checker | `/ssl` | cert | **Merge** → Domain hub |
| 7 | URL Scanner (was Convergence) | `/convergence` | Safe Browsing | **Merge** → Domain hub |
| 8 | Domain Strength | `/domain-strength` | AI multi-stage | **Keep** as Domain hub flagship |
| 9 | AI Security Assistant (was Six Eyes) | `/six-eyes` | AI chat | **Keep** — strongest AI feature |
| 10 | AI Activity Log | `/six-eyes/log` | audit | **Keep** (supports #9; GDPR) |
| 11 | Phishing Analyser | `/phishing` | AI vision | **Keep** — strong, distinctive |
| 12 | Supply Chain Scanner | `/supply-chain` | AI | **Cut / demote** — see note |
| 13 | MFA Fatigue Checker | `/mfa-fatigue` | AI quiz | **Merge** → Two-Factor Tracker |
| 14 | Two-Factor Tracker (was The Barrier) | `/barrier` | checklist | **Keep** (absorbs #13) |
| 15 | Weekly Security Digest (was The Briefing) | `/briefing` | AI email | **Keep** (or merge w/ Breach Monitor emails) |
| 16 | Security Learning Hub + News | `/tips` | content | **Keep** — already cohesive |
| 17 | Sessions | `/sessions` | account | **Keep** |
| 18 | Privacy Dashboard + Passkeys | `/account` | account | **Keep** |
| 19 | Security Score dashboard | `/dashboard` | aggregate | **Keep** — home base |

## The overlaps, and what to do

### 1. Domain/URL trio → one "Domain Inspector"  ✅ DONE (June 2026)
SSL Checker, URL Scanner, and Domain Strength all take a domain/URL and inspect it. **Domain
Strength already runs SSL + headers + RDAP + Safe Browsing** — it technically subsumes the other
two.
- **Shipped:** Domain Strength is now **Domain Inspector** with a **Quick scan** (deterministic
  SSL + headers + Safe Browsing, instant, no AI consent — `POST /api/domain-strength/quick`, 50/hr)
  vs **Deep scan** (full AI synthesis — `/check`, 10/hr). SSL Checker + URL Scanner tiles retired
  from nav/palette/home/dashboard; `/ssl` and `/convergence` redirect to `/domain-strength`. The old
  `/api/ssl` and `/api/convergence` endpoints and page files remain (unrouted) for now.
- *Result:* 3 tiles → 1, no capability lost.

### 2. Breach trio → one "Breach Center"
Breach Checker (one-off), Breach Monitor (recurring), Breach Impact (AI analysis) are three views
of the same concern.
- **Recommended:** one page, three stages — **Check** (enter email) → **Monitor** (toggle weekly)
  → **Impact** (AI reading of what showed up). A natural funnel instead of three separate tiles.
- *Effort:* medium. *Payoff:* tighter story, higher engagement per visit.

### 3. Passwords pair → one "Passwords" tool
Checker + Generator are the classic pair.
- **Recommended:** one page, two tabs (Check / Generate). *Effort:* low.

### 4. MFA Fatigue → fold into Two-Factor Tracker
Both are about 2FA quality. The Tracker says *which* accounts have 2FA; Fatigue Checker scores *how
good* that 2FA is. Same mental model.
- **Recommended:** add a "Score my setup" mode to the Two-Factor Tracker; retire the standalone
  MFA Fatigue tile. *Effort:* low–medium.

### 5. Supply Chain Scanner → cut or move to a "Dev" corner
It's the one tool that doesn't fit a *personal* security toolkit — it needs a `package.json` and
only helps developers. Strong feature, wrong audience for the front door.
- **Recommended:** either cut it, or tuck it behind a "Developer tools" section so it stops diluting
  the main grid. *Effort:* trivial (hide) / low (relocate).

### 6. Weekly Security Digest vs Breach Monitor emails
Both send Monday emails. They're distinct (digest = news + posture; monitor = breach alerts) but a
user sees "two weekly emails from the same app."
- **Recommended:** keep both, but present as one "Weekly email" preference with two toggles, so it
  reads as one subscription. *Effort:* low (copy/UX only).

## Net result if all adopted

**From 18 tiles → 9 surfaces:** Passwords · Breach Center · Domain Inspector · Two-Factor Tracker ·
AI Security Assistant (+ Activity Log) · Phishing Analyser · Learning Hub & News · Account
(Sessions/Privacy/Passkeys) · Dashboard. Supply Chain optional in a Dev corner.

Sharper grid, every tile distinct, nothing meaningful lost. **Your call which of the six moves to
make** — each is independent and can be done in any order.
