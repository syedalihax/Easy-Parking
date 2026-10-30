# easyParking — Phase 9: PWA, Testing & Deployment

> **Instruction to AI coding assistant (GitHub Copilot):** Only work on this phase. Phases 1–8 must already be complete. Read `PROJECT_CONTEXT.md` and the original spec's PWA/Security sections before starting. This is the final phase before this version is considered production-ready.

---

## Goal of This Phase

By the end of this phase:
1. The app is properly installable as a PWA on mobile devices
2. Core security requirements are verified (not just assumed)
3. Key flows are tested across both roles
4. The app is deployed with HTTPS and automated backups configured

---

## 1. PWA Finalization

Revisit the `vite-plugin-pwa` config from Phase 1:
- Replace placeholder icons with real app icons (multiple sizes: 192x192, 512x512, and a maskable variant) using the brand color/style from `DESIGN.md`
- Confirm `manifest.webmanifest` is generated correctly (`name`, `short_name`, `theme_color`, `background_color`, `display: standalone`, icons)
- Add a basic service worker caching strategy for static assets (the `vite-plugin-pwa` default `generateSW` strategy is sufficient for v1 — don't hand-roll a custom service worker)
- **Do not implement offline write support** — per `PROJECT_CONTEXT.md`/original spec, this version is online-first. If the device is offline, show a clear "You're offline — please reconnect to continue" message rather than letting the user submit forms that will silently fail or queue unpredictably.
- Test installability: on a mobile browser (Chrome on Android is the easiest to test), confirm the "Add to Home Screen" / install prompt appears and the installed app opens correctly in standalone mode

---

## 2. Security Review Checklist

Go through each of these and verify (don't just assume Phase 2's middleware handles everything — actually re-check):

- [ ] Passwords are hashed with bcrypt, never stored or logged in plain text
- [ ] Every data route (`customers`, `vehicles`, `dues`, `payments`, `daily-parking`, `reports`) runs through `requireAuth` + `requireParkingMembership`
- [ ] Owner-only routes (parking settings if built, invitations, payment correction approval) run through `requireOwnerRole`
- [ ] `parkingId` is never taken on faith from the request body for determining access — it's always cross-checked against the authenticated user's active membership
- [ ] JWTs have a reasonable expiry (`JWT_EXPIRES_IN` from `.env`) and the frontend handles an expired/invalid token by redirecting to login, not crashing
- [ ] Add basic rate limiting on `/api/auth/login` and `/api/auth/signup` (use `express-rate-limit` — a simple IP-based limit like 10 requests per 15 minutes is enough for v1) to reduce brute-force risk
- [ ] Error responses don't leak internal details (stack traces, database error messages) to the frontend in production — add a generic error-handling middleware in Express that logs full details server-side but returns a clean generic message to the client when `NODE_ENV === 'production'`
- [ ] `.env` is in `.gitignore` and was never committed

---

## 3. Testing Pass

This is a junior-friendly project, so full automated test coverage isn't required for v1 — but these **manual test scenarios** must be walked through and confirmed working before deployment:

### Multi-tenant isolation
- [ ] Create two separate parkings with two separate owners. Confirm neither owner can see the other's customers/vehicles/payments even by guessing/modifying IDs in API calls.

### Role permissions
- [ ] Confirm a Manager cannot access Parking Settings or approve a payment correction
- [ ] Confirm a Manager CAN do everything else (customers, vehicles, payments, daily parking, daily rate)

### Billing & payment math (the most important scenarios — walk through the exact examples from `PROJECT_CONTEXT.md`/original spec)
- [ ] A vehicle starting mid-month generates correct billing periods
- [ ] A vehicle starting on the 31st generates correct periods through February
- [ ] A customer with 3 months owed (1,500 each = 4,500) who pays 3,000 ends up with October+November paid, December still showing 1,500 due (oldest-first allocation)
- [ ] A partial payment (e.g. 1,000 against a 1,500 due) correctly leaves 500 outstanding and marks status "Partially Paid"
- [ ] A payment correction request by a Manager does not change any balance until the Owner approves it; once approved, the original payment is marked reversed (not deleted) and a new corrected payment exists
- [ ] An immediate rate change affects the next-generated due; a scheduled rate change only takes effect from the specified next cycle

### Daily parking
- [ ] Changing the daily rate does not retroactively change the fee on already-created entries

### Localization
- [ ] Switching language mid-session updates all visible text and layout direction without needing a reload
- [ ] Two different browser sessions (Owner in English, Manager in Urdu) can use the same parking simultaneously without one affecting the other's language

---

## 4. Deployment

- [ ] Choose a hosting provider for the backend (any Node-friendly host) and for MongoDB (MongoDB Atlas is the simplest managed option for a small project like this)
- [ ] Set all required environment variables (`JWT_SECRET`, `MONGODB_URI`, `NODE_ENV=production`) on the hosting platform — never hardcode them
- [ ] Deploy the frontend as a static build (`npm run build` in `frontend/`) to a static host or served via the backend/CDN
- [ ] Enforce HTTPS (most hosting providers handle this automatically — confirm it's actually active, PWAs require HTTPS to install correctly)
- [ ] Configure automated database backups (MongoDB Atlas has this built in on most tiers — enable it, don't skip this, per the original spec's explicit requirement)
- [ ] After deployment, repeat the installability test from section 1 on the live URL, not just localhost

---

## 5. What NOT to Do in This Phase

- Do not build offline write queues/sync — explicitly out of scope for v1
- Do not add native Android/iOS app wrappers — PWA only
- Do not add a full automated test suite (unit/integration/E2E frameworks) unless the developer specifically wants to learn that separately — the manual checklist above is sufficient for this version

---

## 6. Definition of Done for Phase 9 (= Definition of Done for v1 overall)

- [ ] App installs correctly as a PWA on a mobile device from the live deployed URL
- [ ] All security checklist items confirmed
- [ ] All manual test scenarios in section 3 pass
- [ ] Backend deployed with HTTPS and environment variables properly set
- [ ] Database backups are configured and active
- [ ] The core success criterion from the original spec is demonstrably true: an Owner can open any customer's profile and get an accurate answer to "how many months do they owe" without relying on memory

This completes version 1 of easyParking.
