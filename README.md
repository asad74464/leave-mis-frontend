# Leave MIS — Frontend

React + Vite + Tailwind CSS + shadcn-style components, built against the
`leave-mis` Express/Prisma backend from the earlier steps.

## Setup

```bash
cd leave-mis-frontend
npm install
cp .env.example .env      # point VITE_API_URL at your running backend
npm run dev                # http://localhost:5173
```

The backend must be running (`npm run dev` in `leave-mis/`) and reachable at
whatever `VITE_API_URL` points to (defaults to `http://localhost:4000/api`).
Log in with a seeded account (`admin@test.com` / `admin123` or
`jane@test.com` / `jane1234`) or register a new one.

## Design system

The brief was "modern," but generic SaaS defaults (rounded cards with soft
grey shadows, a purple/blue gradient accent, a bright acid accent on black)
would have made this look like every other AI-generated dashboard. Instead
this leans into what the app actually *is* — an official leave register for
government/enterprise use — with a "ledger and seal" identity:

- **Ink navy** (`--primary`, `#16233B`-ish) for the sidebar and primary
  actions — authority, structure.
- **Cool paper** background (`--background`, a pale green-grey, not the
  common warm cream) — the page itself.
- **Brass/amber accent** (`--accent`, `~#C98A3E`) standing in for an
  official stamp — used for primary CTAs and the "pending" status.
- **Status colors follow the stamp metaphor**: amber = awaiting the stamp
  (pending), pine green = stamped/cleared (approved), brick red = stamp
  withheld (rejected).
- **Fraunces** (serif, a little characterful) for headings and big numbers;
  **IBM Plex Sans** for body/UI text — two typefaces with a clear, deliberate
  contrast rather than one default sans everywhere.
- **Cards are flat**: a hairline border, no drop shadow — reads like a page
  in a register rather than a floating SaaS tile.
- **Status badges are small rectangular tags with a colored left edge**
  (like a tab on a paper file), not filled pills.
- The one deliberate "hero" moment is the login screen's split panel — an
  ink-navy panel with a single serif headline, paired with the sign-in form
  on paper. Everywhere else stays quiet and functional.

All of this lives in `src/index.css` (CSS variables) and
`tailwind.config.js` (mapping them into Tailwind's color scale) — change the
values there to re-theme the whole app.

## Structure

```
src/
  lib/
    utils.js       cn() class-merging helper (standard shadcn utility)
    api.js          fetch wrapper: attaches the JWT, unwraps { success, data }
  context/
    AuthContext.jsx  session state (user, login, register, logout)
  components/
    ui/               shadcn-style primitives (button, input, dialog, select, tabs, table...)
    layout/            Sidebar, Topbar, AppShell
    *Dialog.jsx        the three write actions: new request, reject, new leave type
    RequestsTable.jsx  shared table used by both Overview and the full Requests page
  pages/
    LoginPage / RegisterPage
    DashboardPage      "Overview" — different content for employee vs admin
    RequestsPage        full list with status tabs; admin gets approve/reject
    LeaveTypesPage       list + admin-only create
    BalancesPage          admin-only, every employee's balances
```

## How it maps to the backend

| Page | Endpoint(s) |
|---|---|
| Login / Register | `POST /api/auth/login`, `POST /api/auth/register` |
| Overview (employee) | `GET /api/leave-balances`, `GET /api/leave-requests` |
| Overview (admin) | same, filtered to `PENDING` client-side for the action list |
| Leave requests | `GET/POST /api/leave-requests`, `PATCH /:id/approve`, `PATCH /:id/reject` |
| Leave types | `GET/POST /api/leave-types` |
| Team balances (admin) | `GET /api/leave-balances` (returns all when `req.user.role === 'ADMIN'`) |

Role-based UI is intentionally *not* the source of truth for authorization —
every write action still hits an endpoint protected by the backend's
`protect` + `restrictTo('ADMIN')` middleware. Hiding the "Approve" button
from an employee is a UX nicety; the 403 from the API is what actually
enforces it.

## Notes / things left out on purpose (to keep scope matched to the backend)

- No dark mode — the token system supports adding one (a `.dark` class with
  a second set of CSS variables is the standard shadcn approach), just not
  built here.
- No pagination on the requests table — fine at demo scale, would matter
  once an organization has hundreds of requests.
- Toasts and inline errors are the only feedback UI; there's no global
  loading skeleton, just a plain "Loading…" line.
