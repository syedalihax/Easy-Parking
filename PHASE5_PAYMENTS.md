# easyParking — Phase 5: Payments

> **Instruction to AI coding assistant (GitHub Copilot):** Only work on this phase. Phases 1–4 must already be complete and working (customers, vehicles, subscriptions, and dues must exist and be calculable). Read `PROJECT_CONTEXT.md` (sections 4, 7) and `DATABASE_SCHEMA.md` (sections 9, 10, 11) before starting. This phase handles real money records — be extra careful with transactions and validation, this is the most important correctness-critical phase in the app.

---

## Goal of This Phase

By the end of this phase:
1. Owner/Manager can record a payment from a customer
2. A payment is automatically allocated to the customer's oldest unpaid dues first, or manually to chosen dues
3. Partial and advance payments work correctly
4. Payments are never silently edited or deleted — corrections go through a request → Owner-approval flow with a full audit trail

---

## 1. Backend — Payment Allocation Service

Build this as its own service function, not inline in a route handler — it will be reused and needs to be easy to test.

Create `backend/src/services/paymentAllocation.js`:

### `allocatePayment({ parkingId, customerId, amount, method, receivedBy, referenceNumber, notes, manualDueOrder })`

Steps (per `PROJECT_CONTEXT.md` section 7 and `DATABASE_SCHEMA.md` section 9/10):

1. Start a Mongoose transaction (`session.startTransaction()`).
2. Create the `Payment` record first (`status: 'active'`).
3. Determine which dues to allocate against:
   - If `manualDueOrder` (an array of due IDs) is provided, use that order.
   - Otherwise, fetch all this customer's `pending`/`partially_paid` dues sorted by `billingPeriodStart` ascending (oldest first) — this is the default rule.
4. Loop through the dues in order:
   - `allocateAmount = Math.min(remainingPayment, due.outstandingAmount)`
   - Create a `PaymentAllocation` record `{ paymentId, monthlyDueId: due._id, allocatedAmount: allocateAmount }`
   - Update the due: `amountPaid += allocateAmount`, recalculate `outstandingAmount`, set `status` to `'paid'` if `outstandingAmount === 0` else `'partially_paid'`
   - `remainingPayment -= allocateAmount`
   - Stop looping once `remainingPayment === 0`
5. **If `remainingPayment > 0` after all known dues are covered** (an advance payment): do not invent future dues to mark paid. Either:
   - Leave it as unallocated credit (don't create fake `MonthlyDue` records ahead of time — those only get created by the billing-period logic from Phase 4 when their period actually completes), or
   - If the caller explicitly selected specific future-looking dues to pre-allocate against (only possible if those due records already happen to exist, e.g. a vehicle that already had its period complete but hasn't been paid), allocate there.
   - For v1, the simplest correct approach: **just leave leftover amount unallocated** and flag it in the response (e.g. `{ unallocatedAmount: 500 }`) so the UI can tell the Owner/Manager "Rs. 500 could not be allocated — no outstanding dues to apply it to." Don't over-engineer a "customer credit wallet" system unless specifically asked for later.
6. Commit the transaction. If anything fails at any step, abort the transaction — **never leave a half-saved payment** (this is explicitly required in the original spec, section 22).
7. Return the created payment with its allocations and any `unallocatedAmount`.

### Validation (enforce before touching the database):
- `amount` must be a positive number
- Sum of all `allocatedAmount` values must never exceed the payment's `amount`
- A due's `allocatedAmount` must never exceed that due's `outstandingAmount`

---

## 2. Backend Routes — Payments

Under `/api/parkings/:parkingId/customers/:customerId/payments`:

| Method | Route | Notes |
|---|---|---|
| POST | `/` | Body: `amount`, `method`, `referenceNumber` (optional), `notes` (optional), `manualDueOrder` (optional array of due IDs). Calls `allocatePayment`. `receivedBy` is set from `req.user.id`. |
| GET | `/` | List this customer's payment history, newest first, each with its allocations (which dues it covered) per `DATABASE_SCHEMA.md` section 9's audit requirement. |
| GET | `/:paymentId` | Full detail of one payment including all its allocations. |

---

## 3. Backend Routes — Payment Corrections (per confirmed Owner-only approval rule)

Per `PROJECT_CONTEXT.md` section 4: a Manager can **request** a correction, only an **Owner** can **approve** it.

Under `/api/parkings/:parkingId/payments/:paymentId/corrections`:

| Method | Route | Notes |
|---|---|---|
| POST | `/request` | Manager or Owner can call this. Body: `reason`, `correctedAmount` (what it should have been). Creates an `AuditLog` entry with `actionType: 'payment_correction'`, `performedBy: req.user.id`, `approvedBy: null` (pending), `previousValue`/`newValue` snapshots. Does **not** change the payment yet. |
| POST | `/:auditLogId/approve` | **Owner only** (`requireOwnerRole` middleware). Sets the original `Payment.status = 'reversed'`, creates a **new** `Payment` record with the corrected amount (don't edit the original in place — per "no silent modifications," section 9 of the original spec), re-runs allocation for the new payment, and updates the `AuditLog` entry with `approvedBy: req.user.id` and a timestamp. |
| POST | `/:auditLogId/reject` | **Owner only**. Marks the correction request as rejected in the audit log, no changes to the payment. |

**Important:** When a payment is `reversed`, its allocations must also be unwound — the dues it had paid toward go back to their pre-payment `amountPaid`/`outstandingAmount`/`status`. Do this inside the same transaction as creating the reversal.

---

## 4. Disputed Payment Handling (per original spec section 9)

If a customer claims they paid but there's no matching record:
- There is no special "dispute" database record needed for v1 — this is a manual/human process: the Owner reviews the paper register and, if satisfied, either records the payment normally (if it genuinely wasn't recorded) **or** creates a manual due adjustment via a similar `AuditLog`-backed flow.
- **Never** auto-mark a due as paid just because a customer claims so. Don't build any UI shortcut that does this.
- `// TODO: if this becomes a frequent real-world need, consider a dedicated "disputed due" flag in a later version` — leave this as a comment, don't build it now.

---

## 5. Frontend Screens to Build

1. **"Receive Payment" screen** (reachable from a customer profile and from the dashboard quick action)
   - Customer search/select (if not already navigated from their profile)
   - Amount input (large, per `DESIGN.md`)
   - Payment method selector (Cash / Easypaisa / JazzCash — simple icon + label buttons, not a plain dropdown, per the Easypaisa-style clarity goal)
   - Shows the customer's outstanding dues list with checkboxes, defaulting to oldest-first auto-selected up to the entered amount, but lets the user manually change which dues are selected (satisfies "authorized user can select different months")
   - Optional reference number + notes
   - Clear confirmation step before submitting (per `DESIGN.md` destructive/important-action rule — this isn't destructive but it is an important financial action, so a confirm summary screen/modal before final submit is appropriate)

2. **Payment history** (on customer profile, filling in another placeholder from Phase 3)
   - List of payments, each showing amount, date, method, received-by, and which periods it covered
   - Tapping a payment shows full detail

3. **Request Correction** action (on a payment detail view)
   - Simple form: corrected amount + reason
   - If the logged-in user is a Manager, after submitting show "Sent to Owner for approval"
   - If the logged-in user is the Owner, show it immediately with Approve/Reject actions

---

## 6. What NOT to Do in This Phase

- Do not build a general "customer wallet/credit balance" feature — just report unallocated amounts, don't build a stored-credit system unless asked later
- Do not allow editing a payment's amount directly — corrections always go through the request → approve → reversal + new payment flow
- Do not auto-approve anything — every correction needs an explicit Owner action

---

## 7. Definition of Done for Phase 5

- [ ] Recording a payment correctly allocates it across oldest-unpaid dues by default
- [ ] A user can manually choose which dues a payment applies to
- [ ] Partial payments correctly leave the remaining balance outstanding
- [ ] An amount larger than total outstanding is reported back as `unallocatedAmount`, never silently invented into future dues
- [ ] A failed payment operation never leaves a half-saved payment/allocation in the database (test by forcing an error mid-transaction)
- [ ] A Manager can request a correction; only the Owner can approve it; approving creates a reversal + new payment, never edits the original
- [ ] Full payment history with allocations is visible and accurate on the customer profile

Once confirmed working, stop and wait before starting Phase 6 (Daily Parking).
