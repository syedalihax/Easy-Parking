# easyParking backend

The backend is a Node.js and Express REST API. Mongoose models persist parking-scoped records in MongoDB. Authentication uses JWT, passwords are hashed with bcrypt, and billing periods use `date-fns` plus UTC date support.

## Requirements

- Node.js 20.19+ (or 22.12+) and npm
- MongoDB running as a replica set

MongoDB transactions are used for payment recording/correction and operations that update a vehicle together with its subscription. A standalone MongoDB instance cannot support these operations. The example URI expects a replica set named `rs0`.

## Setup

```powershell
npm install
Copy-Item .env.example .env
```

Set a long, unique `JWT_SECRET` in `.env`. Review the other values:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/easyparking?replicaSet=rs0
NODE_ENV=development
JWT_SECRET=replace_with_a_long_random_string
JWT_EXPIRES_IN=7d
```

If the API is behind a trusted reverse proxy, set `TRUST_PROXY_HOPS` to the exact number of trusted proxy hops so IP-based authentication throttling uses the client address. Do not set it to an unbounded trust value.

Do not commit `.env` or share its secret. Ensure MongoDB is available at the configured URI, then run:

```powershell
npm run dev
```

The API listens on port `5000` by default. Verify startup at `http://localhost:5000/api/health`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the API with Nodemon |
| `npm start` | Start the API without Nodemon |
| `npm test` | Run backend tests with Node's built-in test runner |

## API overview

Every parking-scoped endpoint authenticates the user and verifies active membership for the requested parking. Owner-only operations also enforce the membership role.

| Prefix | Purpose |
|---|---|
| `/api/health` | Health check |
| `/api/auth` | Signup, login, logout, and current user; signup/login share a limit of 10 requests per IP per 15 minutes |
| `/api/parkings` | Create a parking and list the current user's parkings |
| `/api/invitations` | Create, list, and accept team invitations |
| `/api/parkings/:parkingId/customers` | Customer and vehicle records |
| `/api/parkings/:parkingId/customers/:customerId/subscriptions` | Subscription listing and rate management |
| `/api/parkings/:parkingId/customers/:customerId/dues` | Generate missing completed dues and read balances |
| `/api/parkings/:parkingId/customers/:customerId/payments` | Payment preview, receive, history, and details |
| `/api/parkings/:parkingId/payments/:paymentId/corrections/request` | Request a payment correction |
| `/api/parkings/:parkingId/payments/:paymentId/corrections/:auditLogId/approve` | Owner approves a correction |
| `/api/parkings/:parkingId/payments/:paymentId/corrections/:auditLogId/reject` | Owner rejects a correction |
| `/api/parkings/:parkingId/daily-rate` and `/api/parkings/:parkingId/daily-parking` | Daily rate, entry, active list, exit, payment, and history |
| `/api/parkings/:parkingId/dashboard` and `/reminders` | Dashboard metrics and due reminders |
| `/api/parkings/:parkingId/reports` | Filterable JSON reports and CSV downloads |

The API expects a bearer token in the `Authorization` header for protected routes. All money and due calculations are performed server-side. Payment allocation uses MongoDB transactions, defaults to oldest outstanding dues, and reports any unallocated remainder.

Unhandled Express errors are logged server-side and return a generic message in production; unknown API paths return JSON `404` responses. Set `NODE_ENV=production` in the hosting environment. The built-in rate-limit store is process-local, so deployments with multiple backend instances should configure a shared store before scaling horizontally.

## Structure

```text
src/
  app.js                    Express middleware and route registration
  config/db.js              MongoDB connection
  controllers/              HTTP request handlers
  middleware/               JWT, parking-membership, and owner checks
  models/                   Mongoose schemas and indexes
  routes/                   REST route definitions
  services/                 Due generation and payment allocation logic
  utils/                    Billing-period and MongoDB helpers
test/                       Node.js tests
server.js                   Environment loading and HTTP server startup
```

See [../DATABASE_SCHEMA.md](../DATABASE_SCHEMA.md) for the data model and [../PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md) for business rules.
