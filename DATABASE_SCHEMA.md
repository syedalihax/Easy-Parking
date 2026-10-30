# easyParking — Database Schema

> **Instruction to AI coding assistant (GitHub Copilot):** Use this file to generate Mongoose models in a `models/` folder, one file per collection (e.g. `models/User.js`, `models/Parking.js`). Use `mongoose.Schema` with `timestamps: true` on every model (this automatically gives `createdAt`/`updatedAt`, so you don't need to add those fields manually unless noted otherwise). Use `mongoose.Schema.Types.ObjectId` with a `ref` for every relationship field. Add the indexes listed at the bottom of each model. Do not add fields that aren't listed here without flagging it with a `// TODO: confirm` comment.

---

## 1. `User`

Personal login account. Not tied to a specific parking.

| Field | Type | Notes |
|---|---|---|
| fullName | String | required |
| email | String | optional, unique if present |
| phone | String | optional, unique if present |
| passwordHash | String | required, bcrypt hashed, never return in API responses |
| preferredLanguage | String enum | `en`, `fa-IR`, `ur`, `ur-Latn` — default `en` |
| status | String enum | `active`, `disabled` — default `active` |
| createdAt / updatedAt | Date | via timestamps |

Validation rule: at least one of `email` or `phone` must be present.

Indexes: unique index on `email` (sparse), unique index on `phone` (sparse).

---

## 2. `Parking`

A parking business (the tenant).

| Field | Type | Notes |
|---|---|---|
| name | String | required |
| address | String | optional |
| contactInfo | String | optional |
| currency | String | default `PKR` |
| timezone | String | default `Asia/Karachi` |
| defaultLanguage | String enum | default `en` |
| dailyParkingRate | Number | fixed daily rate, settable by Owner or Manager (see PROJECT_CONTEXT.md section 8) |
| createdBy | ObjectId ref `User` | |
| createdAt / updatedAt | Date | via timestamps |

Indexes: none beyond default `_id`.

---

## 3. `Membership`

Links a User to a Parking with a role. Many-to-many.

| Field | Type | Notes |
|---|---|---|
| userId | ObjectId ref `User` | required |
| parkingId | ObjectId ref `Parking` | required |
| role | String enum | `owner`, `manager` — required |
| status | String enum | `active`, `removed` — default `active` |
| createdAt / updatedAt | Date | via timestamps |

Indexes:
- Compound unique index on `{ userId, parkingId, status }` scoped so a user cannot have two *active* memberships for the same parking (but allow historical "removed" rows).

---

## 4. `Invitation`

Pending invite to join a parking.

| Field | Type | Notes |
|---|---|---|
| parkingId | ObjectId ref `Parking` | required |
| invitedBy | ObjectId ref `User` | required (must be an Owner) |
| emailOrPhone | String | required |
| role | String enum | `owner`, `manager` |
| status | String enum | `pending`, `accepted`, `expired`, `cancelled` — default `pending` |
| createdAt / updatedAt | Date | via timestamps |

Indexes: index on `emailOrPhone`, index on `parkingId`.

---

## 5. `Customer`

A customer profile — belongs to exactly one parking (see PROJECT_CONTEXT.md section 3 — profiles are NOT shared across parkings).

| Field | Type | Notes |
|---|---|---|
| parkingId | ObjectId ref `Parking` | required — always filter by this |
| fullName | String | required |
| primaryPhone | String | required |
| secondaryPhone | String | optional |
| address | String | optional |
| notes | String | optional |
| registrationDate | Date | default now |
| status | String enum | `active`, `inactive` — default `active`. Never hard-delete a customer that has financial history. |
| createdBy | ObjectId ref `User` | |
| createdAt / updatedAt | Date | via timestamps |

Indexes: index on `parkingId`, text index on `fullName`, index on `primaryPhone`.

---

## 6. `Vehicle`

| Field | Type | Notes |
|---|---|---|
| parkingId | ObjectId ref `Parking` | required |
| customerId | ObjectId ref `Customer` | required |
| registrationNumber | String | required |
| vehicleType | String | e.g. `car`, `bike` |
| makeModel | String | optional |
| color | String | optional |
| parkingStartDate | Date | required — this is the billing cycle anchor, see `ParkingSubscription` |
| status | String enum | `active`, `inactive` — default `active` |
| notes | String | optional |
| createdAt / updatedAt | Date | via timestamps |

Indexes: compound unique index on `{ parkingId, registrationNumber }` for *active* vehicles only (allow historical duplicates if a plate is re-registered after being inactive — confirm this edge case before enforcing a hard unique constraint across all statuses).

---

## 7. `ParkingSubscription`

One active subscription per vehicle at a time. Ending a subscription does not delete it — it just gets a new `status`.

| Field | Type | Notes |
|---|---|---|
| parkingId | ObjectId ref `Parking` | required |
| customerId | ObjectId ref `Customer` | required |
| vehicleId | ObjectId ref `Vehicle` | required |
| monthlyRate | Number | required |
| startDate | Date | required — anchor date for billing periods |
| endedAt | Date | optional — records when billing stopped so the final full period can be generated once |
| billingCycleDay | Number | derived from `startDate`'s day-of-month, used for period math |
| status | String enum | `active`, `paused`, `ended` — default `active` |
| pendingRateChange | Object | optional — `{ newRate: Number, effectiveFrom: Date }` used when Owner schedules a rate change for "next cycle" instead of applying immediately (see PROJECT_CONTEXT.md section 5.3) |
| createdBy | ObjectId ref `User` | |
| createdAt / updatedAt | Date | via timestamps |

Indexes: index on `{ parkingId, vehicleId, status }`.

---

## 8. `MonthlyDue`

One record per completed billing period. This is the core of the whole app — get this right.

| Field | Type | Notes |
|---|---|---|
| parkingId | ObjectId ref `Parking` | required |
| customerId | ObjectId ref `Customer` | required |
| vehicleId | ObjectId ref `Vehicle` | required |
| subscriptionId | ObjectId ref `ParkingSubscription` | required |
| billingPeriodStart | Date | required |
| billingPeriodEnd | Date | required |
| dueDate | Date | typically same as `billingPeriodEnd` |
| amountDue | Number | required |
| amountPaid | Number | default 0 |
| outstandingAmount | Number | derived = `amountDue - amountPaid`, keep stored and recalculated on every payment allocation (don't rely only on a virtual, since reports need to query/filter on it) |
| status | String enum | `pending`, `partially_paid`, `paid` — see PROJECT_CONTEXT.md section 6 for UI labels. **Do not add a separate `overdue` enum value** — overdue is just a pending/partially_paid due whose `dueDate` has passed; compute that at query/display time. |
| createdAt / updatedAt | Date | via timestamps |

Indexes: compound index on `{ parkingId, customerId, status }`, compound unique index on `{ subscriptionId, billingPeriodStart }` (prevents duplicate dues for the same period).

---

## 9. `Payment`

The actual money received. Never edit or delete after creation — corrections are separate adjustment records (see section 11, `AuditLog`, and the correction flow below).

| Field | Type | Notes |
|---|---|---|
| parkingId | ObjectId ref `Parking` | required |
| customerId | ObjectId ref `Customer` | required |
| amount | Number | required |
| paymentDate | Date | default now |
| method | String enum | `cash`, `easypaisa`, `jazzcash` |
| receivedBy | ObjectId ref `User` | required |
| referenceNumber | String | optional |
| notes | String | optional |
| status | String enum | `active`, `reversed` — default `active`. A correction creates a reversal entry, it never deletes the original (see PROJECT_CONTEXT.md / original spec section 9). |
| createdAt / updatedAt | Date | via timestamps |

Indexes: index on `{ parkingId, customerId }`, index on `paymentDate`.

---

## 10. `PaymentAllocation`

Links a Payment to one or more MonthlyDues. This is what makes "one payment covers multiple months" work.

| Field | Type | Notes |
|---|---|---|
| parkingId | ObjectId ref `Parking` | required |
| paymentId | ObjectId ref `Payment` | required |
| monthlyDueId | ObjectId ref `MonthlyDue` | required |
| allocatedAmount | Number | required — sum of all allocations for a payment must never exceed that payment's `amount` |
| createdAt | Date | via timestamps |

Indexes: index on `paymentId`, index on `monthlyDueId`.

---

## 11. `AuditLog`

Tracks important changes — especially payment corrections and manual adjustments, per the "no silent modifications" rule.

| Field | Type | Notes |
|---|---|---|
| parkingId | ObjectId ref `Parking` | required |
| actionType | String enum | e.g. `payment_correction`, `manual_due_adjustment`, `membership_change` |
| performedBy | ObjectId ref `User` | who requested it |
| approvedBy | ObjectId ref `User` | null while a correction is pending; set to an Owner when approved (see PROJECT_CONTEXT.md section 4) |
| targetCollection | String | e.g. `Payment`, `MonthlyDue` |
| targetId | ObjectId | the record affected |
| reason | String | required |
| previousValue | Mixed | snapshot before change |
| newValue | Mixed | snapshot after change |
| createdAt | Date | via timestamps |

Indexes: index on `{ parkingId, targetCollection, targetId }`; only one pending correction is allowed per payment.

---

## 12. `DailyParkingRecord`

Completely separate from monthly subscriptions — do not join this into due/outstanding calculations.

| Field | Type | Notes |
|---|---|---|
| parkingId | ObjectId ref `Parking` | required |
| vehicleNumber | String | required |
| vehicleType | String | optional |
| customerName | String | optional |
| customerPhone | String | optional |
| entryDateTime | Date | required |
| exitDateTime | Date | optional, set on exit |
| fee | Number | pulled from `Parking.dailyParkingRate` at time of entry/exit, but stored on the record itself so historical rate changes don't retroactively change past records |
| paymentStatus | String enum | `unpaid`, `paid` |
| paymentMethod | String enum | `cash`, `easypaisa`, `jazzcash` |
| receivedBy | ObjectId ref `User` | |
| notes | String | optional |
| createdAt / updatedAt | Date | via timestamps |

Indexes: index on `{ parkingId, entryDateTime }`, index on `vehicleNumber`.

---

## General Rules for Every Model

1. Every collection that belongs to a parking **must** have `parkingId` and it must be indexed.
2. Never hard-delete a `Customer`, `Payment`, `MonthlyDue`, or `ParkingSubscription` if financial history exists — use a `status` field instead.
3. Use Mongoose transactions (`session.startTransaction()`) whenever a `Payment` and its `PaymentAllocation`s are saved together.
4. All monetary fields are `Number` in whole PKR (no decimals needed, but don't hardcode that assumption into validation — just don't build currency conversion logic, there isn't any).
