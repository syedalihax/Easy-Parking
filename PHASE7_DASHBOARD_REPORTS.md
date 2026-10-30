# easyParking — Phase 7: Dashboard & Reports

> **Instruction to AI coding assistant (GitHub Copilot):** Only work on this phase. Phases 1–6 must already be complete — dashboard and reports are read-only views built on top of data created in earlier phases. Read `PROJECT_CONTEXT.md` and the original spec sections on Dashboard/Reports before starting. Do not add any new data-entry features in this phase — this is purely about summarizing and displaying existing data.

---

## Implementation status

The dashboard, reminders, the seven report routes listed in this specification, CSV export, and the reports UI are implemented and included in the Phase 7 commit. Backend tests and frontend lint/build passed during implementation. The Definition of Done says “all 8 reports” while the route list specifies seven; reconcile that count before claiming the eighth report is covered. Verify report contents against live sample data before release.

## Goal of This Phase

By the end of this phase:
1. A dashboard shows key operational numbers at a glance
2. Quick action buttons link to the relevant screens from earlier phases
3. A set of simple, exportable reports are available

---

## 1. Backend — Dashboard Summary Endpoint

### `GET /api/parkings/:parkingId/dashboard`

Returns one combined response (simpler for the frontend than many separate calls):

```json
{
  "totalActiveVehicles": 0,
  "totalActiveCustomers": 0,
  "customersWithPendingDues": 0,
  "customersWithOverdueDues": 0,
  "totalOutstandingAmount": 0,
  "paymentsReceivedThisPeriod": 0,
  "dailyVehiclesCurrentlyParked": 0
}
```

Notes on calculating each field:
- `totalActiveVehicles` / `totalActiveCustomers`: simple counts where `status: 'active'`
- `customersWithPendingDues`: distinct count of customers who have at least one due with `status` in `pending`/`partially_paid`
- `customersWithOverdueDues`: same, but additionally `dueDate` is older than some reasonable threshold (e.g. more than 7 days past `dueDate` — this is just for dashboard highlighting, remember per `PROJECT_CONTEXT.md` section 6 there's no separate stored "overdue" status, this is computed here at query time only)
- `totalOutstandingAmount`: sum of `outstandingAmount` across all non-paid dues for this parking
- `paymentsReceivedThisPeriod`: sum of `Payment.amount` where `status: 'active'` and `paymentDate` is within the current calendar month (keep this simple — "this period" = current calendar month for v1)
- `dailyVehiclesCurrentlyParked`: count of `DailyParkingRecord` with no `exitDateTime`, for this parking

### `GET /api/parkings/:parkingId/dashboard/reminders`

Returns simple lists for the dashboard's reminders section (per original spec section 11 — dashboard-only, no SMS/WhatsApp):

```json
{
  "pendingDues": [ /* customers with pending/partially_paid dues, newest-due-first */ ],
  "overdueDues": [ /* same, filtered to the overdue threshold */ ],
  "partialPayments": [ /* dues with status: partially_paid */ ],
  "upcomingBillingPeriods": [ /* subscriptions whose current period ends within the next 7 days */ ]
}
```

---

## 2. Backend — Reports Endpoints

Keep each report as a simple, separate `GET` endpoint that accepts filter query params and returns a flat array suitable for both displaying in a table and exporting to CSV. All under `/api/parkings/:parkingId/reports/`:

| Route | Returns |
|---|---|
| `GET /customers` | Full customer list, filterable by `status` |
| `GET /active-vehicles` | All active vehicles with their customer name and current subscription rate |
| `GET /pending-dues` | All non-paid dues across the parking, with customer/vehicle info joined in |
| `GET /outstanding-balances` | One row per customer with an outstanding balance > 0, with their total |
| `GET /payment-history` | All payments, filterable by `startDate`/`endDate`/`method` |
| `GET /daily-parking-history` | All daily parking records, filterable by date range |
| `GET /customer-statement/:customerId` | One customer's full due + payment timeline combined, chronological — this is the report that directly solves the core business problem, make sure it's clear and complete |

### CSV export
Add a shared utility `backend/src/utils/toCsv.js` that converts an array of flat objects to CSV text. Add a `?format=csv` query option on each report route that, when present, sets the response `Content-Type: text/csv` and `Content-Disposition: attachment; filename=...` instead of returning JSON. Keep this generic/reusable rather than writing separate CSV logic per report.

**Do not build full accounting-style reports** (profit/loss, expense breakdowns, etc.) — per `PROJECT_CONTEXT.md` section 1, this stays strictly a parking register.

---

## 3. Frontend — Dashboard Screen

Per `DESIGN.md`:
- Summary numbers shown as a grid of simple stat cards — each with a label, a large bold number (money figures use `--text-2xl` or `--text-3xl`), and where relevant a small icon (Lucide icon set, not emoji)
- "Quick Actions" section below the stats: Add Customer, Add Vehicle, Receive Payment, Search Customer, Search Vehicle, View Pending Payments, View Payment History, Daily Parking Entry — each a clearly labeled button/tile, not a cramped icon-only toolbar
- "Reminders" section: simple grouped lists (Pending, Overdue, Partial Payments, Upcoming Billing) each tappable to jump to the relevant customer

## 4. Frontend — Reports Screen

- A simple list/menu of available reports
- Each report screen: a date-range filter where relevant, a table view (scrollable on mobile), and an "Export CSV" button that triggers the `?format=csv` download
- Keep the table design clean and scannable per `DESIGN.md` — status badges reused from earlier phases, money columns right-aligned with tabular numerals

---

## 5. What NOT to Do in This Phase

- Do not add new ways to create/edit data here — dashboard and reports are read-only
- Do not build automatic reminders via WhatsApp/SMS — dashboard display only, per confirmed scope
- Do not build complex charting/analytics — simple numbers and tables are sufficient per the original spec's "keep reports simple and operational" instruction

---

## 6. Definition of Done for Phase 7

- [ ] Dashboard shows accurate, live-calculated numbers (not cached/manually maintained counters)
- [ ] Quick actions correctly link to the right screens from earlier phases
- [ ] Reminders section correctly separates pending vs overdue vs partial vs upcoming
- [ ] All 8 reports from the original spec are available and filterable by date where relevant
- [ ] Every report can be exported as CSV
- [ ] The customer statement report clearly shows a full timeline — this is the feature that solves the core "owner doesn't remember how many months are owed" problem, double check it reads clearly

Once confirmed working, stop and wait before starting Phase 8 (UI/UX Polish & Localization).
