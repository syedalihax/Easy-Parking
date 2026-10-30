# easyParking — Phase 6: Daily Parking

> **Instruction to AI coding assistant (GitHub Copilot):** Only work on this phase. Phases 1–5 must already be complete. Read `PROJECT_CONTEXT.md` section 8 and `DATABASE_SCHEMA.md` section 12 before starting. This module is intentionally simple and **completely separate** from the monthly subscription/dues system — do not let the two cross-reference or share balance calculations.

---

## Implementation status

The daily parking API and workspace are implemented and included in the Phase 6 commit. Backend tests and the frontend lint/build passed during implementation. The Definition of Done checklist below remains a manual acceptance checklist; repeat the rate-snapshot and role scenarios against a configured database before release.

## Goal of This Phase

By the end of this phase:
1. Owner/Manager can register a vehicle's daily parking entry
2. Record its exit and payment
3. View currently-parked vehicles and daily parking history
4. The daily rate is a simple fixed value, settable by either Owner or Manager

---

## 1. Backend — Daily Rate Setting

Per the confirmed rule (`PROJECT_CONTEXT.md` section 8), unlike the main Parking Settings (Owner-only), the daily parking rate can be set by **either** Owner or Manager. Keep it as its own small, separate endpoint rather than bundling it into a general "settings" route that's Owner-gated:

### `PATCH /api/parkings/:parkingId/daily-rate`
- Middleware: `requireAuth` → `requireParkingMembership` only (no `requireOwnerRole`)
- Body: `{ dailyParkingRate: Number }`
- Updates `Parking.dailyParkingRate`

### `GET /api/parkings/:parkingId/daily-rate`
- Returns the current rate (any member can view)

---

## 2. Backend Routes — Daily Parking Records

Under `/api/parkings/:parkingId/daily-parking`:

| Method | Route | Notes |
|---|---|---|
| POST | `/entry` | Body: `vehicleNumber`, `vehicleType` (optional), `customerName` (optional), `customerPhone` (optional), `notes` (optional). Sets `entryDateTime: now`, `fee: <copied from Parking.dailyParkingRate at this moment>`, `paymentStatus: 'unpaid'`. **Store the fee on the record itself** (per `DATABASE_SCHEMA.md` section 12) so a later rate change never retroactively alters a past record. |
| PATCH | `/:recordId/exit` | Sets `exitDateTime: now`. Doesn't change the fee (it's fixed-rate, not duration-based, per the confirmed rule — don't build duration-based fee calculation). |
| PATCH | `/:recordId/payment` | Body: `method` (`cash`/`easypaisa`/`jazzcash`). Sets `paymentStatus: 'paid'`, `receivedBy: req.user.id`. |
| GET | `/active` | All records where `exitDateTime` is not yet set — the "currently parked" list. |
| GET | `/` | Full history, filterable by date range and `paymentStatus`. |

Validation:
- `vehicleNumber` is required (customer name/phone are optional since daily customers are often walk-ins without a full profile, per the original spec)
- No duplicate-active-entry check is required unless you want to prevent the same plate having two simultaneous un-exited entries — this is a reasonable simple guard to add: if an active (no `exitDateTime`) record already exists for that `vehicleNumber` in this parking, reject a new entry with a clear error message.

---

## 3. Frontend Screens to Build

Per `DESIGN.md` — this should feel like the fastest, simplest flow in the whole app since it's used for quick walk-in vehicles.

1. **Daily Parking — Entry screen**
   - Big, minimal form: vehicle number (primary field, large input), optional type/name/phone
   - One big primary button: "Register Entry"
   - Shows the current fixed rate clearly so the person at the gate knows what to collect/expect

2. **Active Vehicles screen**
   - List of currently-parked vehicles (no exit yet), each row: vehicle number, entry time, elapsed time (calculated on the frontend from `entryDateTime`, just for display — not used in any fee calculation)
   - Tap a row → quick actions: "Record Exit" and/or "Mark Paid"

3. **Daily Parking History screen**
   - Filterable by date range and payment status
   - Simple list, consistent with the Payment history screen's visual style from Phase 5

4. **Rate setting control**
   - A simple small settings control accessible to both Owner and Manager — e.g. a small "Daily Rate: Rs. X ✏️" line visible on the Daily Parking screen itself, tappable to edit. Keep it visually separate from the main Parking Settings screen (which remains Owner-only, built in a later/earlier phase as needed).

---

## 4. What NOT to Do in This Phase

- Do not calculate fees based on duration/hours — it's a fixed rate per the confirmed rule, keep it simple
- Do not mix daily parking records into the customer/vehicle/subscription/dues data or balance calculations — they are entirely separate concerns
- Do not require a full Customer profile for a daily parking entry — name/phone are optional free-text fields here, not a link to the `Customer` collection

---

## 5. Definition of Done for Phase 6

- [ ] Either Owner or Manager can set/update the fixed daily rate
- [ ] A new daily entry correctly stores the rate at the time of entry (verify by changing the rate after an entry exists — the old entry's fee should not change)
- [ ] Exit and payment can be recorded independently
- [ ] "Currently parked" list correctly shows only vehicles without an exit time
- [ ] Daily parking data never appears in or affects monthly subscription dues/outstanding calculations

Once confirmed working, stop and wait before starting Phase 7 (Dashboard & Reports).
