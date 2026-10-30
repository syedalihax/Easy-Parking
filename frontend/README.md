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
| `/app/daily-parking` | Record daily vehicle entries, exits, and payments |
| `/app/dashboard` | Parking metrics, shortcuts, and due reminders |
| `/app/reports` | Filter and export parking reports |
| `/app/team` | Invitations and team access |

Authenticated routes require a valid session and parking membership. The dashboard has responsive navigation and the parking switcher (shown when the account has more than one parking).

## Requirements

- Node.js 20.19+ (or 22.12+) and npm
- Backend API running locally, unless configured to use another API

## Install and run

```powershell
npm install
npm run dev -- --host
```

Vite prints a `Network` URL after startup. To test on a phone, connect the phone and computer to the same Wi-Fi and open that `Network` URL on the phone. The backend listens on all network interfaces at port `5000`; its development CORS middleware accepts browser origins. The frontend automatically targets port `5000` on the same computer hostname used to open Vite.

Do not use `localhost` on the phone: it points back to the phone itself, not the computer running the API. The frontend rewrites a configured loopback API address to the computer hostname during local development, but remove an old `.env.local` override if it points to the wrong server. If the computer's firewall prompts, allow the backend and Vite on the private network. To use a different API host, create `.env.local` in the `frontend` folder:

```env
VITE_API_BASE_URL=http://192.168.1.23:5000/api
```

Replace the example address with the computer's current LAN IP. Restart Vite after changing environment variables. Only expose development servers on a trusted network.

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
- The generated manifest uses the 192px, 512px, and maskable SVG brand icons. The service worker precaches static build assets.
- The app is online-first: an offline banner appears and API helpers reject requests instead of queuing writes. No offline write/sync support is implemented.
- Backend setup, MongoDB configuration, and API routes are documented in [../backend/README.md](../backend/README.md).
