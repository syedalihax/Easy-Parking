# easyParking frontend

The frontend is a Vite-based React application for the easyParking parking management workflow. It includes a public landing experience, login/signup flow, and an authenticated app shell for parking operations.

## App flow

| Route | Screen |
|---|---|
| `/` | Public landing page |
| `/privacy-policy` | Privacy policy / public legal page |
| `/terms` | Terms page |
| `/login` | Sign in |
| `/signup` | Create an account |
| `/app` | Authenticated workspace shell |
| `/app/dashboard` | Parking overview and operational metrics |
| `/app/customers` | Customer list |
| `/app/customers/:customerId` | Customer details, vehicles, dues, and payments |
| `/app/vehicles` | Search and view vehicles |
| `/app/vehicles/:vehicleId` | Vehicle details |
| `/app/dues` | Dues review |
| `/app/payments` | Payment review and transaction history |
| `/app/daily-parking` | Daily parking entry and exit workflows |
| `/app/reports` | Dashboard and CSV report views |
| `/app/team` | Parking access and invitations |
| `/app/settings` | Parking configuration |
| `/app/profile` | User profile and preference details |

The public landing pages are separate from the authenticated `/app` workspace. Non-home pages are kept out of search indexing via metadata and robots settings.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- A running backend API on the local network or a configured `VITE_API_BASE_URL`

## Install and run

```powershell
npm install
npm run dev -- --host
```

Vite prints a local network URL after startup. Use that URL from a phone on the same Wi-Fi, not `localhost` from the device itself. If you need a different API host, create `frontend/.env.local`:

```env
VITE_API_BASE_URL=http://192.168.1.23:5000/api
```

The backend expects a trusted same-site cookie session and responds with `credentials: 'include'` requests. No JWT token is stored in browser localStorage.

## Production build

```powershell
npm run build
```

The generated `dist/` folder includes the installable PWA assets. Use `npm run preview` to preview the production bundle locally.

## Scripts

| Command | Description |
|---|---|
| `npm run dev -- --host` | Start the Vite dev server |
| `npm run lint` | Run static lint checks |
| `npm run build` | Build production assets |
| `npm run preview` | Preview the built app |

## Frontend structure

```text
src/
  App.jsx                    Public/authenticated route shell and app layout
  api.js                     API requests with cookie-based session support
  components/
    LandingPage.jsx          Landing and legal-information pages
    CustomersWorkspace.jsx   Customer, vehicle, due, and payment screens
    OperationsWorkspace.jsx  Dashboard, reports, and secondary workspace views
    DailyParkingWorkspace.jsx Daily parking operations
  i18n.js                    Locale setup and browser-language detection
  index.css                  Tailwind import, theme tokens, and custom styles
  main.jsx                   BrowserRouter bootstrap
public/                      PWA icons and static assets
vite.config.js               Vite, Tailwind, and PWA configuration
```

## Notes

- JWTs are stored in secure HttpOnly cookies; localStorage is not used for authentication.
- Auth screens include a home/back action, password show/hide controls, and stronger card elevation.
- The app is online-first and shows an offline banner instead of queuing writes for offline sync.
- Backend setup, MongoDB configuration, and API routes are documented in [../backend/README.md](../backend/README.md).
