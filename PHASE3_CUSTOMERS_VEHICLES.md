# easyParking — Phase 3: Customers & Vehicles

> **Instruction to AI coding assistant (GitHub Copilot):** Only work on this phase. Phases 1–2 (project setup, auth, parking, membership) must already be complete and working. Read `PROJECT_CONTEXT.md` and `DATABASE_SCHEMA.md` before starting. Every route in this phase must go through `requireAuth` → `requireParkingMembership` middleware from Phase 2. Do not build Subscriptions/Dues/Payments yet.

---

## Goal of This Phase

By the end of this phase:
1. Owner/Manager can add, view, edit, search, and deactivate customers
2. Owner/Manager can add, view, edit, and deactivate vehicles under a customer
3. A customer can have multiple vehicles
4. Search works by customer name, phone, or vehicle registration number

---

## 1. Backend Routes — Customers

All under `/api/parkings/:parkingId/customers` (so `parkingId` is always explicit in the URL and gets verified by middleware).

| Method | Route | Notes |
|---|---|---|
| POST | `/` | Create customer. Set `createdBy` from `req.user.id`. |
| GET | `/` | List customers for this parking. Support query params: `search` (matches name/phone), `status` (`active`/`inactive`), pagination (`page`, `limit`). |
| GET | `/:customerId` | Full customer profile, including their vehicles (populate). |
| PATCH | `/:customerId` | Edit customer fields. |
| PATCH | `/:customerId/deactivate` | Sets `status: 'inactive'`. **Never actually delete** a customer record — see `DATABASE_SCHEMA.md` general rules. |

Validation:
- `fullName` and `primaryPhone` required
- Every query/update must be scoped by `parkingId` from the URL — never allow a customer from one parking to be fetched/edited via another parking's route

---

## 2. Backend Routes — Vehicles

All under `/api/parkings/:parkingId/customers/:customerId/vehicles`.

| Method | Route | Notes |
|---|---|---|
| POST | `/` | Create vehicle for this customer. |
| GET | `/` | List this customer's vehicles. |
| PATCH | `/:vehicleId` | Edit vehicle fields. |
| PATCH | `/:vehicleId/deactivate` | Sets `status: 'inactive'`. |

Also add a **parking-wide vehicle search** (not nested under a customer) since the original spec requires searching by registration number directly:

| Method | Route | Notes |
|---|---|---|
| GET | `/api/parkings/:parkingId/vehicles?search=` | Search across all vehicles in this parking by registration number, returns vehicle + its customer's basic info so the UI can jump straight to the customer profile. |

Validation:
- `registrationNumber` and `parkingStartDate` required
- Per `DATABASE_SCHEMA.md` section 6: enforce uniqueness of `registrationNumber` among **active** vehicles within the same parking — don't block re-registering a plate that belonged to a now-inactive vehicle, but do block two simultaneously-active vehicles with the same plate.

---

## 3. Vehicle Replacement Flow (per confirmed business rule)

Per `PROJECT_CONTEXT.md` section 5.4: when a customer swaps their vehicle, do **not** delete or overwrite the old vehicle. Build this as an explicit action:

### `POST /api/parkings/:parkingId/customers/:customerId/vehicles/:oldVehicleId/replace`
- Body: the new vehicle's details
- Sets the old vehicle's `status: 'inactive'`
- Creates a new `Vehicle` record for the same customer
- **Does not touch the old vehicle's subscription/billing history** — that stays exactly as it was
- (The new vehicle's subscription setup happens in Phase 4 — this route only handles the vehicle record itself. Leave a clear comment noting that a new `ParkingSubscription` for the replacement vehicle gets created in the next phase, starting from the next billing period, per the confirmed rule.)

---

## 4. Frontend Screens to Build

Per `DESIGN.md` — cards with name + key info dominant, large tap targets, search accessible from the top of each list screen.

1. **Customers list screen**
   - Search bar at top (name/phone)
   - Filter chips: Active / Inactive
   - Each row: customer name, phone, a quick glance indicator (we don't have outstanding balance yet until Phase 4/5 — for now just show basic info + vehicle count)
   - Floating/primary "Add Customer" button

2. **Add/Edit Customer form**
   - Fields per `DATABASE_SCHEMA.md` section 5
   - Simple, short form, label-above-input per `DESIGN.md`

3. **Customer profile screen**
   - Customer details at top
   - List of their vehicles below, each with an "Edit" and "Replace Vehicle" action
   - "Add Vehicle" button
   - (Dues/payment history sections will be added to this same screen in later phases — leave a clearly commented placeholder section so it's easy to extend)

4. **Add/Edit Vehicle form**
   - Fields per `DATABASE_SCHEMA.md` section 6

5. **Vehicle search screen** (or integrated into a global search bar — simplest to build as its own simple screen for now)
   - Search by registration number, tapping a result goes to that vehicle's customer profile

---

## 5. What NOT to Do in This Phase

- Do not build subscriptions, billing periods, or dues (Phase 4)
- Do not show any balance/outstanding figures yet — there's no due data yet to calculate them from
- Do not build payments (Phase 5)

---

## 6. Definition of Done for Phase 3

- [ ] Owner/Manager can add, search, edit, and deactivate customers, scoped correctly to their parking
- [ ] A customer can have multiple vehicles, each independently addable/editable
- [ ] Searching by registration number works and leads to the right customer
- [ ] The "replace vehicle" flow preserves the old vehicle record untouched and creates a new one
- [ ] All routes correctly reject access to another parking's customers/vehicles

Once confirmed working, stop and wait before starting Phase 4 (Subscriptions & Dues).
