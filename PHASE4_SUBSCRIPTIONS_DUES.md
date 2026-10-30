# easyParking — Phase 4: Monthly Subscriptions & Dues

> **Instruction to AI coding assistant (GitHub Copilot):** Only work on this phase. Phases 1–3 must already be complete and working. Read `PROJECT_CONTEXT.md` (especially sections 5 and 6) and `DATABASE_SCHEMA.md` (sections 7 and 8) before starting. This is one of the most important phases — the billing math must be correct. Do not build Payments yet (Phase 5) — dues can exist unpaid for now, that's expected.

---

## Goal of This Phase

By the end of this phase:
1. Every active vehicle has a `ParkingSubscription` with a monthly rate and a start date
2. The system automatically generates a `MonthlyDue` record whenever a billing period completes
3. Outstanding amounts are calculated automatically, never manually
4. Rate changes work with the two confirmed options: immediate or scheduled-for-next-cycle

---

## 1. Billing Period Calculation Logic

This is the core logic of the whole app. Build it as a pure, well-tested utility function — not scattered inline in route handlers.

Create `backend/src/utils/billingPeriods.js`:

### `getCurrentBillingPeriod(subscriptionStartDate, referenceDate = new Date())`
Given a subscription's anchor start date, calculate which billing period `referenceDate` currently falls into.

Logic:
- The period "day of month" is fixed from `subscriptionStartDate` (e.g. if it started on the 15th, every period runs 15th → 14th of the next month).
- **Short month handling (per `PROJECT_CONTEXT.md` section 5.2):** use a date library (`date-fns` is recommended — `npm install date-fns`) and its `addMonths` function, which already correctly clamps dates like Jan 31 → Feb 28/29. Do not hand-write date math for this — it's error-prone.
- Return `{ periodStart, periodEnd }`.

### `getCompletedPeriodsSince(subscriptionStartDate, lastGeneratedDueEndDate, now)`
Returns an array of all billing periods that have fully completed and don't yet have a `MonthlyDue` record, so they can be generated.

**Write unit tests for this function specifically covering:**
- A subscription starting mid-month (e.g. the 15th)
- A subscription starting on the 31st (verify Feb/short-month behavior)
- A subscription starting on the 1st (simplest case, sanity check)

---

## 2. Due Generation

Two acceptable approaches — pick the simpler one for v1:

**Recommended for v1 (simpler, no cron infrastructure needed):** Generate dues **lazily, on read**. Whenever a customer's profile or dues list is requested, the backend checks: "has this subscription's billing period(s) completed since the last due was generated?" If yes, generate the missing `MonthlyDue` record(s) on the fly before returning the response. This avoids needing a scheduled job for v1 and keeps things simple for a junior developer to maintain.

(A proper daily cron job can be added later once the app is deployed somewhere that supports scheduled jobs — note this as a `// TODO: move to a scheduled job once deployed` comment, but don't build the cron infrastructure now.)

### `generateMissingDues(subscriptionId)` — internal service function
- Fetch the subscription
- Fetch the most recent `MonthlyDue` for it (if any) to know the last completed period
- Use the billing period utility to find any newly-completed periods
- For each one, create a `MonthlyDue` with `amountDue = subscription.monthlyRate` (or the new rate if a scheduled rate change's `effectiveFrom` has passed — see section 4 below), `amountPaid: 0`, `outstandingAmount = amountDue`, `status: 'pending'`
- Use the compound unique index on `{ subscriptionId, billingPeriodStart }` as a safety net against accidental duplicates — if a duplicate-key error occurs, just skip it silently (don't crash)

---

## 3. Backend Routes — Subscriptions

Under `/api/parkings/:parkingId/vehicles/:vehicleId/subscription`:

| Method | Route | Notes |
|---|---|---|
| POST | `/` | Create the subscription for a vehicle (usually done right after adding the vehicle, or as part of the "replace vehicle" flow from Phase 3). `startDate`, `monthlyRate` required. |
| GET | `/` | Get current subscription + its status. |
| PATCH | `/rate` | Body: `{ newRate, applyImmediately: boolean }`. See section 4 below. |
| PATCH | `/end` | Ends the subscription (`status: 'ended'`). Does not delete history. Per confirmed rule: the final period still generates a full due (no prorating), handled naturally since due generation always charges the full `monthlyRate` for a completed period regardless of when the subscription ended within it — just make sure the "ended" period itself still gets its due generated even though the subscription is no longer active. |

---

## 4. Rate Change Logic (per confirmed business rule)

Per `PROJECT_CONTEXT.md` section 5.3, the Owner has two options when changing a rate:

**Option A — Apply immediately:**
- Update `subscription.monthlyRate` directly to the new value right away.
- Any dues already generated keep their original `amountDue` (don't retroactively change past dues).
- The *current, in-progress* period (not yet due since it hasn't completed) will use the new rate when it's eventually generated.

**Option B — Schedule for next cycle:**
- Don't change `monthlyRate` yet.
- Instead set `subscription.pendingRateChange = { newRate, effectiveFrom: <next period start date> }`.
- When `generateMissingDues` creates a new due, check: if `pendingRateChange` exists and the period being generated starts on/after `effectiveFrom`, use `pendingRateChange.newRate` as the `amountDue`, and also update `subscription.monthlyRate` to the new value and clear `pendingRateChange` at that point (so future periods just use the normal `monthlyRate` field going forward).

---

## 5. Backend Routes — Dues

Under `/api/parkings/:parkingId/customers/:customerId/dues`:

| Method | Route | Notes |
|---|---|---|
| GET | `/` | List all dues for this customer, newest first. Before returning, call `generateMissingDues` for each of the customer's active subscriptions (the lazy-generation approach from section 2). |
| GET | `/outstanding-total` | Sum of `outstandingAmount` across all this customer's non-paid dues. Used for the customer profile summary. |

**Reminder:** `status` in the UI maps per `PROJECT_CONTEXT.md` section 6 — `pending`/`partially_paid` both display as **"Due / Baqaya"**, `paid` displays as **"Received / Wasool Shuda"**. There is no separate overdue status stored — if you want to visually highlight old unpaid dues, do that at display time by checking `dueDate` age, not by adding a new status value.

---

## 6. Frontend Additions

1. **Subscription section on the vehicle form** — when adding a vehicle, also capture monthly rate and confirm the start date (reuse `parkingStartDate` from the vehicle as the subscription anchor unless the business ever needs them to differ — for v1, treat them as the same date).

2. **"Change Rate" action** on the vehicle/subscription view — a simple modal with the new rate amount and a toggle/radio: "Apply immediately" vs "Apply from next month," per `DESIGN.md` form conventions.

3. **Customer profile — Dues section** — now fill in the placeholder from Phase 3's customer profile screen:
   - List of billing periods with amount, status badge (Due/Baqaya in red or Received/Wasool Shuda in green, per `DESIGN.md` status component), and dates
   - Outstanding total shown prominently at the top (large bold number, per `DESIGN.md` section 4)

---

## 7. What NOT to Do in This Phase

- Do not build the actual payment-recording UI/logic yet (Phase 5) — dues just sit as `pending` for now, that's fine and expected
- Do not build a scheduled cron job — use the lazy-generation approach described above
- Do not add a stored `overdue` status — compute "how overdue" at display/query time only

---

## 8. Definition of Done for Phase 4

- [ ] Creating a vehicle lets you set its subscription (rate + start date)
- [ ] Viewing a customer's dues automatically generates any newly-completed billing periods' due records
- [ ] A subscription starting on the 31st produces correct, predictable periods through February and beyond (test this specifically)
- [ ] Rate change works both ways: immediate and scheduled
- [ ] Outstanding totals are always calculated from due records, never from a manually maintained counter
- [ ] Ending a subscription doesn't delete its due history, and its final in-progress period still generates a full-amount due

Once confirmed working, stop and wait before starting Phase 5 (Payments).
