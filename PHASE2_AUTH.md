# easyParking — Phase 2: Authentication & Parking Setup

> **Instruction to AI coding assistant (GitHub Copilot):** Only work on this phase. Phase 1 (project skeleton + User/Parking/Membership models) must already be complete. Read `PROJECT_CONTEXT.md` and `DATABASE_SCHEMA.md` before starting. Do not build Customer/Vehicle/Payment features yet — those are later phases. Keep the code simple and well-commented; the developer is junior-level.

---

## Goal of This Phase

By the end of this phase, a user should be able to:
1. Sign up for a personal account
2. Log in and log out
3. Create a Parking Account (becomes its Owner automatically)
4. Invite another user (by email/phone) to join that parking as Owner or Manager
5. Have every protected route verify the logged-in user's role and parking membership

---

## 1. Backend — Auth Dependencies

```
npm install bcrypt jsonwebtoken
```

Add to `.env`:
```
JWT_SECRET=replace_with_a_long_random_string
JWT_EXPIRES_IN=7d
```

---

## 2. Backend — Routes to Build

All routes live under `/api/auth` and `/api/parkings` and `/api/memberships` / `/api/invitations`.

### `POST /api/auth/signup`
- Body: `fullName`, `email` or `phone`, `password`
- Hash password with bcrypt before saving to `User`
- Return a JWT + basic user info (never return `passwordHash`)

### `POST /api/auth/login`
- Body: `email` or `phone`, `password`
- Verify with bcrypt, return JWT + user info on success
- Generic error message on failure (`"Invalid credentials"`) — do not reveal whether the email/phone exists or the password was wrong, that's a basic security practice

### `POST /api/auth/logout`
- Since this is JWT-based (stateless), logout can simply be handled on the frontend (deleting the stored token). Document this clearly rather than building unnecessary token-blacklisting infrastructure for v1.

### `GET /api/auth/me`
- Protected route, returns the current logged-in user's profile from their JWT

### `POST /api/parkings`
- Protected route. Creates a new `Parking` document.
- Immediately also creates a `Membership` document linking the creator as `role: 'owner'`.
- **Important:** do this in one transaction — a parking should never exist without its owner membership.

### `GET /api/parkings/my`
- Protected route. Returns all parkings the logged-in user has an active membership in, with their role in each.

### `POST /api/invitations`
- Protected route, **Owner only** for the target `parkingId`.
- Body: `emailOrPhone`, `role` (`owner` or `manager`)
- Creates an `Invitation` record with `status: 'pending'`.
- (Actually sending an email/SMS is out of scope for now — just create the record. The invited person can see/accept it once they log in with a matching email/phone — build a simple `GET /api/invitations/pending` for the logged-in user to see invitations matching their email/phone.)

### `POST /api/invitations/:id/accept`
- Protected route. The logged-in user's email/phone must match the invitation's `emailOrPhone`.
- Creates a `Membership` with the role from the invitation.
- Marks invitation `status: 'accepted'`.

---

## 3. Backend — Middleware (this is the most important part of this phase)

Create these in `backend/src/middleware/`:

### `auth.js` — `requireAuth`
- Reads the JWT from the `Authorization: Bearer <token>` header
- Verifies it, attaches `req.user = { id, email, ... }` 
- Returns `401` if missing/invalid

### `requireMembership.js` — `requireParkingMembership`
- Reads `parkingId` from the route params or body
- **Never trusts `parkingId` from the frontend at face value** — looks up a `Membership` where `userId === req.user.id` AND `parkingId === <that id>` AND `status === 'active'`
- If no membership found → `403 Forbidden`
- If found, attaches `req.membership = { role, parkingId }` to the request so downstream route handlers know the role without re-querying

### `requireOwner.js` — `requireOwnerRole`
- Used **after** `requireParkingMembership` on routes that are Owner-only (per `PROJECT_CONTEXT.md` section 4 — e.g. Parking Settings, approving payment corrections, creating invitations)
- Checks `req.membership.role === 'owner'`, else `403`

**Apply this pattern to every single route for the rest of the project, not just this phase.** Every route that touches a specific parking's data must run `requireAuth` → `requireParkingMembership` (→ `requireOwnerRole` if it's an owner-only action) before the actual controller logic runs.

---

## 4. Frontend — Screens to Build

Keep these simple, styled per `DESIGN.md`:

1. **Signup screen** — name, email or phone, password, confirm password
2. **Login screen** — email/phone, password
3. **"Create your Parking" screen** — shown right after signup/login if the user has no parkings yet (name, address, contact info)
4. **Parking switcher** — if a user belongs to multiple parkings, a simple screen/dropdown to pick which one they're working in. Store the selected `parkingId` in frontend state/local storage, and send it with subsequent API calls (the backend will still re-verify it, per the middleware above).
5. **Invite teammate screen** (Owner only) — simple form: email/phone + role dropdown (Owner/Manager)
6. **Pending invitations screen** — if the logged-in user has any pending invitations matching their email/phone, show them with an "Accept" button

### Token storage
Store the JWT in `localStorage` (acceptable for this app's threat model — no highly sensitive financial-institution-grade requirements beyond what's already specified). Attach it as an `Authorization: Bearer <token>` header on every API request via a small shared API helper/fetch wrapper — don't repeat header-setting logic in every component.

---

## 5. What NOT to Do in This Phase

- Do not build Customer/Vehicle/Payment screens yet
- Do not build password reset / forgot password flow yet (not in original spec — flag as a future nice-to-have, don't build it now)
- Do not build email/SMS sending for invitations — just the in-app record + accept flow described above
- Do not build the Parking Settings screen yet (comes with later phases, once there's more to configure)

---

## 6. Definition of Done for Phase 2

- [ ] A new user can sign up and log in
- [ ] A logged-in user can create a Parking and becomes its Owner automatically
- [ ] An Owner can invite another user by email/phone with a chosen role
- [ ] The invited user, once logged in with a matching email/phone, can see and accept the invitation, becoming a Member with the assigned role
- [ ] Every protected route correctly rejects a user who isn't an active member of the `parkingId` they're trying to access
- [ ] Owner-only routes correctly reject Managers

Once confirmed working, stop and wait before starting Phase 3 (Customers & Vehicles).
