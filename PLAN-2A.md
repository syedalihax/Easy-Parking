# Phase 2A — daily parking into the single ledger

**Decision from Ali (6 Nov 2026):** monthly billing stays **arrears** (bill after the period ends,
as the code already does). All money — monthly and walk-in — is recorded in **one ledger**.

## Why
`DailyParkingRecord.fee` is real money, but `PATCH /:recordId/payment` only flips
`paymentStatus` to `paid`. No `Payment` document is written, so:
- dashboard "Collected this month" ignores walk-in cash,
- "Still to collect" ignores unpaid walk-in fees,
- reports and CSV show nothing,
- a Rs. 50 entry sits unpaid forever once the car exits (history rows have no action).

## Changes

### Backend
1. `models/Payment.js`
   - `customerId` becomes conditional: required only when `source === 'monthly'`.
   - new `source` enum `monthly | daily` (default `monthly`), indexed.
   - new `dailyRecordId` ref, `sparse` unique index — one payment per walk-in record.
2. `controllers/dailyParkingController.js` → `recordPayment`
   - runs in a transaction: mark record paid + create `Payment { source:'daily', dailyRecordId }`.
   - idempotent: second call → 409, duplicate key → 409.
   - `fee <= 0` → mark paid, no payment document (nothing to collect).
   - keeps method validation, parking scoping, `receivedBy`.
3. `controllers/dashboardController.js`
   - `totalOutstandingAmount` = monthly outstanding + unpaid walk-in fees.
   - new fields: `dailyOutstandingAmount`, `dailyUnpaidCount`.
   - `paymentsReceivedThisPeriod` picks up walk-in cash automatically (single ledger).
4. `controllers/reportController.js`
   - Outstanding report: add walk-in rows (`source: 'daily'`, vehicle number instead of customer).
   - Payment history: expose `source`, and for daily rows the vehicle number.
5. `backend/test/dailyPayment.test.js` — new unit tests (no DB): payment shape/branching helper,
   and `Payment` schema validation for both sources.

### Frontend
6. `DailyParkingWorkspace.jsx`
   - unpaid history rows get a *Collect* action (method choice + confirm), calling the same endpoint.
   - currently-parked card keeps "Mark paid" (now writes a payment too).
   - status label uses one vocabulary: `Unpaid` / `Paid`.

## Out of scope (later PRs)
- Advance billing (rejected by Ali).
- Manual "create bill" for early leavers.
- Invitations query fix, form error system, settings editability, design pass.

## Done means
- Walk-in entry → exit → collect → `Payment` row exists, dashboard collected +0, outstanding -0.
- Unpaid walk-in shows in dashboard outstanding and in the outstanding report/CSV.
- `npm test` green, plus a live browser pass on the local stack showing the money moving.
