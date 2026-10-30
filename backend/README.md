# easyParking backend

The backend is a Node.js and Express REST API. Mongoose models persist parking-scoped records in MongoDB. Authentication uses JWTs stored inside secure HttpOnly cookies, passwords are hashed with bcrypt, and billing periods use `date-fns` plus UTC-safe date handling.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- MongoDB running as a replica set

MongoDB transactions are used for payment recording/correction and operations that update a vehicle together with its subscription. A standalone MongoDB instance cannot support these operations. The local example expects a replica set named `rs0`.

## Setup

```powershell
npm install
```

Create a `backend/.env` file and set the required values:

```env
PORT=5000
HOST=0.0.0.0
MONGODB_URI=mongodb://127.0.0.1:27017/easyparking?replicaSet=rs0
NODE_ENV=development
JWT_SECRET=replace_with_a_long_random_string
JWT_EXPIRES_IN=7d
TRUST_PROXY_HOPS=1
```

If the API is behind a trusted reverse proxy, set `TRUST_PROXY_HOPS` to the exact number of trusted proxy hops so IP-based authentication throttling uses the real client address. Do not set it to an unbounded trust value.

Do not commit `.env` or share its secret. Ensure MongoDB is available at the configured URI, then run:

```powershell
npm run dev
```

The API listens on all network interfaces at port `5000` by default. Verify on the host at `http://localhost:5000/api/health`; from a phone on the same trusted Wi-Fi use `http://<computer-LAN-IP>:5000/api/health`.

## Security model

- JWTs are stored in HttpOnly cookies instead of browser localStorage
- Frontend requests are sent with `credentials: 'include'`
- Server auth middleware accepts either a cookie JWT or a fallback bearer token for compatibility
- Login and signup are rate-limited to prevent brute force attempts
- Generic error responses are returned in production mode

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the API with Nodemon |
| `npm start` | Start the API without Nodemon |
| `npm test` | Run backend tests with Node's built-in test runner |
| `npm run import:demo` | Validate the synthetic demo dataset and show a dry-run summary |

The demo importer defaults to the included `data/easyParking_50_Customers_Demo_Data.json`, targets the only parking in the configured MongoDB database, and never overwrites existing records. Review its dry-run before applying:

```powershell
npm run import:demo
npm run import:demo -- --apply
```

If the database contains multiple parkings, provide `--parking-id <id>` after `--` to both commands. The importer refuses remote MongoDB writes unless `--allow-remote` is explicitly supplied. It inserts customers, vehicles, subscriptions, monthly dues, payments, and allocations in one transaction; the database must support MongoDB transactions.

## API overview

Every parking-scoped endpoint authenticates the user and verifies active membership for the requested parking. Owner-only operations also enforce the membership role.

| Prefix | Purpose |
|---|---|
| `/api/health` | Health check |
| `/api/auth` | Signup, login, logout, and current user |
| `/api/parkings` | Create a parking and list the current user's parkings |
| `/api/invitations` | Create, list, and accept team invitations |
| `/api/parkings/:parkingId/customers` | Customer and vehicle records |
| `/api/parkings/:parkingId/customers/:customerId/subscriptions` | Subscription listing and rate management |
| `/api/parkings/:parkingId/customers/:customerId/dues` | Generate missing completed dues and read balances |
| `/api/parkings/:parkingId/customers/:customerId/payments` | Payment preview, receive, history, and details |
| `/api/parkings/:parkingId/daily-rate` and `/api/parkings/:parkingId/daily-parking` | Daily rate, entry, active list, exit, payment, and history |
| `/api/parkings/:parkingId/dashboard` and `/reminders` | Dashboard metrics and due reminders |
| `/api/parkings/:parkingId/reports` | Filterable JSON reports and CSV downloads |

Protected routes verify the user from the JWT cookie or bearer token. All money and due calculations are performed server-side. Payment allocation uses MongoDB transactions, defaults to oldest outstanding dues, and reports any unallocated remainder.

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
  utils/                    Billing period and MongoDB helpers
test/                       Node.js tests
server.js                   Environment loading and HTTP server startup
```

See [../DATABASE_SCHEMA.md](../DATABASE_SCHEMA.md) for the data model and [../PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md) for business rules.
