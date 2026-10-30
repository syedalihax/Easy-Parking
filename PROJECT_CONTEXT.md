# easyParking — Project Context (Read This First)

> **Instruction to AI coding assistant (GitHub Copilot):** This file is the source of truth for the easyParking project. Read this file fully before writing any code. Refer back to it whenever a business rule is unclear. Do not invent features that are not described here or in the other project files (`DATABASE_SCHEMA.md`, `DESIGN.md`, and the active phase file). If something is ambiguous, leave a `// TODO: confirm with product owner` comment instead of guessing.

---

## 1. What is easyParking?

easyParking is a **mobile-first, installable PWA (Progressive Web App)** that replaces a paper-based parking register for small/medium parking businesses. It is built for a **non-technical parking owner** in Quetta, Pakistan, and his son (the manager).

**Core problem it solves:** The owner currently has to remember how many months each customer owes. This causes disputes. easyParking keeps a reliable digital record so no one has to rely on memory.

**This is NOT an accounting app.** Do not add: business expenses, profit/loss, owner withdrawals, cash balance accounting, or any complex financial reporting. Keep it strictly to: customers, vehicles, subscriptions, dues, payments, daily parking.

---

## 2. Tech Stack (confirmed)

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| PWA | vite-plugin-pwa |
| Backend | Node.js + Express |
| Database | MongoDB |
| ODM | Mongoose |
| Auth | JWT-based authentication |
| Password hashing | bcrypt |
| API style | REST |
| Styling | Tailwind CSS utilities and theme tokens (see `DESIGN.md`) — no heavy generic UI kit that looks "default AI generated" |

Architecture flow:

```
React (Vite PWA) → REST API → Express → Business Logic Layer → MongoDB (Mongoose)
```

**Critical rule:** All money/due/payment calculations happen on the **backend only**. The frontend only displays what the backend sends. Never trust `parkingId` sent from the frontend — always verify it against the logged-in user's membership on the server.

---

## 3. Multi-Tenant Model (very important, read twice)

There are three separate concepts — do not merge them:

1. **User** — a person's login account (email/phone + password). A user can belong to multiple parkings.
2. **Parking** — a parking business (the tenant). Owns all customers, vehicles, dues, payments.
3. **Membership** — links a User to a Parking with a role (`owner` or `manager`).

Every data record that belongs to a parking (customers, vehicles, dues, payments, daily parking records) **must store `parkingId`** and every query must filter by it after verifying the logged-in user has a membership for that `parkingId`.

**Customer profiles are per-parking, not global.** If the same real-world person parks at two different parking businesses using easyParking, they will have two separate, unrelated customer records. Do not try to merge or share customer profiles across parkings.

---

## 4. Roles & Permissions (confirmed)

- **Owner**
  - Full access to everything.
  - Only the Owner can access and change **Parking Settings** (parking name, address, default rates config, business settings).
  - Only the Owner can approve a payment correction/adjustment after a dispute.
- **Manager**
  - Can access and manage everything the Owner can **except** Parking Settings.
  - Can add/edit customers, vehicles, subscriptions, receive payments, do daily parking entries, view all reports.
  - Can request a payment correction, but cannot approve it — only the Owner approves corrections.

There is no third role in v1. Do not build a generic permissions/roles engine — just these two fixed roles (`owner`, `manager`).

---

## 5. Billing & Subscription Rules (confirmed)

1. Monthly parking is **postpaid** — due is generated when the billing period ends, customer pays after.
2. Each vehicle has its own subscription and its own billing cycle, anchored to that vehicle's `startDate`.
   - Example: vehicle starts Oct 15 → periods are Oct 15–Nov 14, Nov 15–Dec 14, etc.
   - Handle short months (e.g. a subscription starting Jan 31) in a predictable, consistent way (use a date library's month-add logic, don't hand-roll date math).
3. **Rate changes:** When the Owner changes a customer's monthly rate, they must be given **two options**:
   - "Apply from next billing cycle" (scheduled)
   - "Apply immediately" (affects the current/in-progress period)
4. **Vehicle replaced:** If a customer swaps their vehicle for a new one, the old vehicle's record and billing history stay untouched (read-only history). The customer's profile is updated, and billing continues under the new vehicle starting the **next billing period** — not retroactively.
5. **Customer leaves mid-period:** They still owe the **full month**, even if they only used part of the billing period. Do not prorate.

---

## 6. Due / Payment Status Labels (confirmed — use these exact labels, not generic ones)

Do **not** use a separate "Overdue" badge/status as a distinct state. Keep it simple, two outcomes per due:

| Internal status | Label shown in UI (English) | Label shown in UI (Roman Urdu / Urdu, if that language is active) |
|---|---|---|
| `pending` / `partially_paid` | **Due** | **Baqaya** |
| `paid` | **Received** | **Wasool Shuda** |

The system can still privately track *how old* an unpaid due is (for sorting/highlighting older dues in red, for example), but there is no separate "Overdue" status value shown to the user — it's just "Due" that's been outstanding longer. Keep the data model simple: a due is either fully settled or it isn't.

---

## 7. Payment Allocation Rule (confirmed, from original spec — unchanged)

- A single payment can cover one or multiple monthly dues, or be a partial amount against one due.
- Default allocation order: **oldest unpaid due first.**
- An authorized user can manually choose which due(s) a payment applies to.
- A payment can never be allocated for more than the amount actually received, and never more than a due's outstanding amount.
- Save the payment + its allocations together as one atomic operation (use a MongoDB transaction) — never leave a half-saved payment.

---

## 8. Daily Parking Rule (confirmed)

- Daily parking uses a **fixed rate** (not per-vehicle-type calculated automatically in v1).
- That fixed rate is configurable, and **both Owner and Manager can set/update it** (this is one exception — rate setting itself is allowed for Manager, even though broader "Parking Settings" is Owner-only. Keep the daily rate setting as its own simple control, separate from the main settings page, OR inside settings but with Manager access explicitly allowed for this one field — confirm placement with product owner when building Phase 6).
- Daily parking records are completely separate from monthly subscriptions/dues — never mix them in the same collection or the same balance calculation.

---

## 9. Payment Methods (confirmed, unchanged from spec)

Only three, manually recorded, no gateway integration:
- Cash
- Easypaisa
- JazzCash

---

## 10. Languages (unchanged from spec)

Exactly four languages must be supported via a proper i18n system (translation JSON files, not hardcoded strings):

| Language | Locale | Direction |
|---|---|---|
| English | en | LTR |
| Iranian Persian | fa-IR | RTL |
| Urdu | ur | RTL |
| Roman Urdu | ur-Latn | LTR |

Each user sets their own language preference independently (Owner and Manager can use different languages at the same time).

---

## 11. Explicitly Out of Scope for v1 (do not build these)

- Online payment gateway
- Automatic WhatsApp/SMS reminders
- Business expenses / profit-loss / owner withdrawals / cash accounting
- Parking capacity limits
- RFID / ANPR / hardware integration
- Native Android/iOS apps (PWA only)
- Staff payroll/attendance
- A generic multi-role permissions engine (only Owner/Manager, hardcoded)

---

## 12. How to Work Through This Project

This project is built **one phase at a time**. Do not try to generate the entire app in one go.

1. Read `DATABASE_SCHEMA.md` before writing any Mongoose model.
2. Read `DESIGN.md` before writing any UI component — the UI must NOT look like a generic default AI-generated app.
3. Work only from the currently active phase file (e.g. `PHASE1_FOUNDATION.md`). Do not jump ahead to features from later phases.
4. Keep code simple and readable — this project is maintained by a junior-level developer. Avoid over-engineering, avoid unnecessary abstraction layers, avoid advanced patterns that aren't needed yet.
