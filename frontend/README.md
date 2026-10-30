# easyParking frontend

The frontend is a React single-page application with URL-based pages, built with Vite and styled using Tailwind CSS. It is also configured as an installable Progressive Web App (PWA).

## Pages

| Route | Screen |
|---|---|
| `/login` | Sign in |
| `/signup` | Create an account |
| `/app/customers` | Customer list |
| `/app/customers/:customerId` | Customer profile, vehicles, subscriptions, dues, and payments |
| `/app/vehicles` | Search vehicles by registration number |
| `/app/vehicles/:vehicleId` | Vehicle details and related customer link |
| `/app/dues` | Select a customer and view monthly dues |
| `/app/payments` | Select a customer and view or receive payments |
| `/app/team` | Invitations and team access |

Authenticated routes require a valid session and parking membership. The dashboard has responsive navigation, a parking switcher, and a payment shortcut.

## Requirements

- Node.js 20.19+ (or 22.12+) and npm
- Backend API running locally, unless configured to use another API

## Install and run

```powershell
npm install
npm run dev -- --host
```

Vite prints the local development URL after startup. The `--host` option makes the development server available on the local network.

By default, the API helper calls `http://localhost:5000/api`. To use another API URL, create `.env.local` in the `frontend` folder:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

Restart Vite after changing environment variables. Only expose API servers that you trust on your network.

## Scripts

| Command | Description |
|---|---|
| `npm run dev -- --host` | Start the Vite development server |
| `npm run lint` | Run Oxlint |
| `npm run build` | Create the production/PWA build in `dist/` |
| `npm run preview` | Preview the production build |

## Frontend structure

```text
src/
  App.jsx                    Application routes and shared workspace layout
  api.js                     Authenticated REST API helper
  components/
    CustomersWorkspace.jsx   Customer, vehicle, dues, and payment screens
  index.css                  Tailwind import, theme tokens, component utilities
  main.jsx                   React and BrowserRouter entry point
public/                      PWA icons and static assets
vite.config.js               Vite, Tailwind, and PWA configuration
```

## Notes

- Authentication currently stores the access token in browser local storage.
- Billing amounts and payment allocation decisions come from the backend API.
- PWA settings and the brand palette are configured in `vite.config.js` and `src/index.css`.
- Backend setup, MongoDB configuration, and API routes are documented in [../backend/README.md](../backend/README.md).
