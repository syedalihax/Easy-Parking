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
- Installable PWA interface

Daily parking, reports, and localization are described in the project phase documents and are not represented here as finished features.

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

Install each application's dependencies:

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Set `JWT_SECRET` in `backend/.env` to a long random secret, then open a second terminal:

```powershell
cd frontend
npm install
```

Start the backend:

```powershell
cd backend
npm run dev
```

Start the frontend in a second terminal:

```powershell
cd frontend
npm run dev -- --host
```

The Vite development server prints the local URL. The API listens on `http://localhost:5000` by default; health check: `http://localhost:5000/api/health`.

For frontend/API environment variables and backend MongoDB configuration, follow the respective folder guides. Never commit `.env` files or real credentials.

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

## Project references

- [Project context](./PROJECT_CONTEXT.md) — business rules and architecture
- [Database schema](./DATABASE_SCHEMA.md) — data model
- [Design guide](./DESIGN.md) — palette and UI conventions
- [Phase specifications](.) — scope and status of planned phases
