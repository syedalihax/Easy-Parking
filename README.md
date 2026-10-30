# easyParking

easyParking is a mobile-first parking management PWA for small and medium parking businesses. It replaces a paper register with shared customer, vehicle, subscription, dues, and payment records.

The application is split into a React frontend and an Express + MongoDB backend. Each parking business is treated as a separate tenant, so customer, vehicle, billing, payment, and access records are scoped to that parking. Monthly dues are generated after each vehicle's billing period closes, and payments are applied to oldest outstanding dues by default.

## Current features

- Secure signup and login flow with JWT stored in an HttpOnly cookie
- Parking membership creation and team invitation workflow
- Parking-scoped customer and vehicle records
- Subscription setup, rate changes, due generation, and payment allocation
- Daily parking entries, exits, and payment tracking
- Dashboard metrics, reminders, and report exports in CSV format
- English, Persian, Urdu, and Roman Urdu localization with RTL support
- PWA installability, online-first offline notices, and mobile-friendly layout
- IP-based auth rate limiting and production-safe generic API errors

## Technology stack

- Frontend: React, Vite, React Router, Tailwind CSS, i18n, and PWA support
- Backend: Node.js, Express, Mongoose, and JWT authentication
- Database: MongoDB with replica-set support for transactional billing operations
- Security: bcrypt password hashing and HttpOnly cookie-based JWT sessions
- Billing logic: `date-fns` and UTC-safe date handling

## Repository layout

```text
frontend/  React PWA, routes, screens, and Tailwind styling
backend/   Express API, MongoDB models, business services, and tests
```

See the [frontend guide](./frontend/README.md) and [backend guide](./backend/README.md) for detailed setup and development notes.

## Prerequisites

- Node.js 20.19+ or 22.12+
- npm
- MongoDB running with a replica set named `rs0` for local development

MongoDB transactions are required for atomic customer, subscription, and payment operations. A standalone MongoDB server is not sufficient.

## Local setup

From the root folder:

```powershell
npm install
```

Then create `backend/.env` manually and set the required values:

```env
PORT=5000
HOST=0.0.0.0
MONGODB_URI=mongodb://127.0.0.1:27017/easyparking?replicaSet=rs0
NODE_ENV=development
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d
TRUST_PROXY_HOPS=1
```

If you are running the frontend against a different local API host, create `frontend/.env.local` with a value like:

```env
VITE_API_BASE_URL=http://192.168.1.23:5000/api
```

Then start both apps together:

```powershell
npm run dev
```

The root script runs the backend and frontend concurrently. Open the Vite printed `Network` URL on a phone instead of using `localhost` from mobile devices. The API listens on the local machine's network interface and can be checked at `http://localhost:5000/api/health` from the host machine or `http://<computer-LAN-IP>:5000/api/health` from the same network.

## Root scripts

| Command | Description |
|---|---|
| `npm run i` | Install root tooling |
| `npm run start` | Install backend and frontend dependencies |
| `npm run dev` | Run backend and frontend together |

## Validation

```powershell
cd backend
npm test
```

```powershell
cd frontend
npm run build
```

The frontend also supports `npm run lint` for static checks when needed.

## Project references

- [Project context](./PROJECT_CONTEXT.md)
- [Database schema](./DATABASE_SCHEMA.md)
- [Design guide](./DESIGN.md)
- [Phase 6: Daily Parking](./PHASE6_DAILY_PARKING.md)
- [Phase 7: Dashboard & Reports](./PHASE7_DASHBOARD_REPORTS.md)
- [Phase 8: UI/UX & Localization](./PHASE8_UI_LOCALIZATION.md)
- [Phase 9: PWA, Testing & Deployment](./PHASE9_PWA_TESTING_DEPLOYMENT.md)
