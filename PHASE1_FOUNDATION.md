# easyParking — Phase 1: Foundation

> **Instruction to AI coding assistant (GitHub Copilot):** This is the ONLY phase to work on right now. Do not build authentication, customers, payments, or any other feature yet — those come in later phase files. Read `PROJECT_CONTEXT.md` and `DATABASE_SCHEMA.md` first. Your job in this phase is purely structural: project setup, folder structure, and the first three models. Keep everything simple — the developer maintaining this is junior-level, so avoid unnecessary abstraction, avoid advanced design patterns, and comment your code clearly.

---

## Goal of This Phase

Set up a clean, working project skeleton with:
1. Backend folder structure + Express server that runs
2. MongoDB connection via Mongoose
3. Frontend folder structure + Vite + React + PWA plugin, that runs
4. The first 3 database models only: `User`, `Parking`, `Membership` (from `DATABASE_SCHEMA.md`)

No business logic, no auth, no UI screens yet. Just a working, well-organized starting point.

---

## 1. Folder Structure

Create this structure at the project root:

```
easyparking/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Parking.js
│   │   │   └── Membership.js
│   │   ├── middleware/           (empty for now, used in Phase 2)
│   │   ├── routes/               (empty for now, used in Phase 2)
│   │   ├── controllers/          (empty for now, used in Phase 2)
│   │   └── app.js
│   ├── server.js
│   ├── .env.example
│   ├── .gitignore
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/           (empty for now)
│   │   ├── pages/                (empty for now)
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   ├── index.html
│   ├── vite.config.js
│   ├── .gitignore
│   └── package.json
│
├── PROJECT_CONTEXT.md
├── DATABASE_SCHEMA.md
├── DESIGN.md
└── PHASE1_FOUNDATION.md
```

---

## 2. Backend Setup

### Dependencies to install

```
npm init -y
npm install express mongoose dotenv cors
npm install --save-dev nodemon
```

(bcrypt and jsonwebtoken are not needed yet — those come in Phase 2 with authentication.)

### `backend/.env.example`

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/easyparking
NODE_ENV=development
```

### `backend/src/config/db.js`

Connect to MongoDB using Mongoose and the `MONGODB_URI` from `.env`. Log a clear success message on connect, and exit the process with an error message if the connection fails — don't let the app run silently without a database.

### `backend/src/app.js`

Set up the Express app:
- `cors()` middleware
- `express.json()` for parsing request bodies
- A single test route: `GET /api/health` that returns `{ status: "ok" }` — this is just to confirm the server is alive, nothing more.
- Export the app.

### `backend/server.js`

- Load `.env` via `dotenv`
- Call the DB connection function
- Start the Express app listening on `PORT`
- Log `easyParking backend running on port <PORT>` on success

### Models

Create `User.js`, `Parking.js`, and `Membership.js` in `backend/src/models/` exactly per the field definitions in `DATABASE_SCHEMA.md` sections 1, 2, and 3. Use `timestamps: true` on each schema. Add the indexes listed for each model.

### `package.json` scripts

```json
{
  "scripts": {
    "dev": "nodemon server.js",
    "start": "node server.js"
  }
}
```

### Check this phase works by:
Running `npm run dev` in `backend/`, confirming the console shows both "MongoDB connected" and "easyParking backend running on port 5000", then visiting `http://localhost:5000/api/health` in a browser and seeing `{"status":"ok"}`.

---

## 3. Frontend Setup

### Create the project

```
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm install -D vite-plugin-pwa
```

### `frontend/vite.config.js`

Set up `vite-plugin-pwa` with a basic manifest:
- `name`: "easyParking"
- `short_name`: "easyParking"
- `theme_color`: `#0F6B4C` (the primary brand color from `DESIGN.md`)
- `background_color`: `#FAFBF9`
- `display`: `standalone`
- Basic icon entries (use placeholder icon files for now — real icon design comes later; just make sure the manifest structure is correct and installable)
- `registerType: 'autoUpdate'`

### `frontend/src/App.jsx`

Keep this minimal for now — a simple page that says "easyParking — Phase 1 Setup Complete" styled using the color/typography variables described in `DESIGN.md` section 3 and 4 (set these as CSS custom properties in a global stylesheet, e.g. `frontend/src/index.css`, even though there's no real UI yet — this establishes the design tokens early so every later phase just uses them).

### Check this phase works by:
Running `npm run dev` in `frontend/`, opening the local URL, and seeing the "Phase 1 Setup Complete" message styled with the brand green, not default browser styling.

---

## 4. What NOT to Do in This Phase

- Do not add login/signup screens yet (Phase 2)
- Do not add Customer, Vehicle, Subscription, or any other model yet (Phase 3+)
- Do not add real navigation/routing yet beyond the single placeholder page
- Do not connect frontend to backend with real API calls yet — that starts meaningfully in Phase 2
- Do not deploy anything yet — this phase is local-only setup

---

## 5. Definition of Done for Phase 1

- [ ] `backend/` runs with `npm run dev`, connects to MongoDB, `/api/health` responds
- [ ] `User`, `Parking`, `Membership` models exist exactly per `DATABASE_SCHEMA.md`
- [ ] `frontend/` runs with `npm run dev`, shows a styled placeholder page
- [ ] PWA manifest is configured (installability can be properly tested once there's real content, but the config should be in place)
- [ ] `.env.example` exists in backend, real `.env` is in `.gitignore`

Once all of these are checked, stop and wait for confirmation before starting Phase 2 (Authentication and Parking setup).
