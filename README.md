# easyParking

easyParking is a mobile-first parking management PWA for small and medium parking businesses. It replaces a paper register with shared customer and vehicle records, monthly subscription dues, and payment history.

The app supports an owner and managers. Each parking business is a separate tenant, so its customer, vehicle, billing, and payment records are scoped to that parking. Monthly dues are generated after a vehicle's billing period ends, and payments are allocated to the oldest outstanding dues by default.

## Features

- Account signup/login and parking membership management
- Parking-scoped customer profiles and vehicle records
- Monthly subscriptions, dues, rate changes, and outstanding totals
- Cash, Easypaisa, and JazzCash payment recording
- Oldest-first and manual payment allocation, with unallocated excess reported
- Owner approval for payment correction requests
- Daily parking with rate snapshots, entry/exit, and payment tracking
- Operational dashboard, reminders, customer statements, and filterable CSV reports
- English, Iranian Persian, Urdu, and Roman Urdu, including RTL layout
- Installable PWA with static-asset caching and an explicit online-first offline notice
- IP-based signup/login rate limiting and production-safe generic API error responses

## Technology

- Frontend: React, Vite, React Router DOM, Tailwind CSS, and `vite-plugin-pwa`
- Backend: Node.js and Express REST API
- Database: MongoDB with Mongoose
- Authentication: JWT and bcrypt
- Billing dates: `date-fns` with UTC date support

## Repository layout

```text
frontend/  React PWA, routes, screens, and Tailwind styling
backend/   Express API, MongoDB models, business services, and tests
```

See the [frontend guide](./frontend/README.md) and [backend guide](./backend/README.md) for setup and development details.

## Prerequisites

- Node.js 20.19+ (or 22.12+) and npm
- MongoDB running as a replica set (the local example uses `rs0`)

MongoDB transactions are required for atomic vehicle/subscription and payment operations. A standalone MongoDB server is not sufficient.

## Run locally

Install the root tooling, then install the frontend and backend dependencies:

```powershell
npm run i
npm run start
Copy-Item backend\.env.example backend\.env
```

Set `JWT_SECRET` in `backend/.env` to a long random secret, then start both development servers:

```powershell
npm run dev
```

The root `dev` script starts the backend and Vite frontend together; both listen on local network interfaces for trusted-Wi-Fi mobile testing. Open Vite's printed `Network` URL on the phone, not `localhost`; the API helper uses the same computer hostname on port `5000`. Check `http://<computer-LAN-IP>:5000/api/health` from the phone if requests fail. Allow both development servers through Windows Firewall for private networks when prompted. Stop either process with `Ctrl+C`; the other is stopped with it.

For frontend/API environment variables and backend MongoDB configuration, follow the respective folder guides. Never commit `.env` files or real credentials.

## Root scripts

| Command | Description |
|---|---|
| `npm run i` | Install root development tooling |
| `npm run start` | Install backend dependencies, then frontend dependencies |
| `npm run dev` | Run backend and frontend concurrently |

## Validation

```powershell
cd backend
npm test
```

```powershell
cd frontend
npm run lint
npm run build
```

The PWA is configured to cache static build assets; it does not queue writes while offline. Before production, complete the manual role/isolation and billing scenarios in [Phase 9](./PHASE9_PWA_TESTING_DEPLOYMENT.md), deploy over HTTPS, and verify database backups and mobile installation. Those external checks have not been performed by the local build.

## Project references

- [Project context](./PROJECT_CONTEXT.md) — business rules and architecture
- [Database schema](./DATABASE_SCHEMA.md) — data model
- [Design guide](./DESIGN.md) — palette and UI conventions
- [Phase 6: Daily Parking](./PHASE6_DAILY_PARKING.md)
- [Phase 7: Dashboard & Reports](./PHASE7_DASHBOARD_REPORTS.md)
- [Phase 8: UI/UX & Localization](./PHASE8_UI_LOCALIZATION.md)
- [Phase 9: PWA, Testing & Deployment](./PHASE9_PWA_TESTING_DEPLOYMENT.md)
