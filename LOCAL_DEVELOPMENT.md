# Local development & testing

How to run the COR Tracker on your own machine and actually exercise it
— not just start it and stare at an empty dashboard. For AWS/k3s
deployment, see [`helm/README.md`](helm/README.md) and
[`terraform/README.md`](terraform/README.md) instead; this doc is about
running the Next.js app directly.

## Prerequisites

- **Node.js 22.5 or later** — the data layer uses Node's built-in
  [`node:sqlite`](https://nodejs.org/api/sqlite.html) module, which
  doesn't exist before that. Check with `node -v`.
- No database server, no Docker, no other services required for plain
  local dev. SQLite is a file (`data/cor.db`), created automatically.

## Quick start

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. You'll see:

```
node:X (node:sqlite) ExperimentalWarning: SQLite is an experimental feature and might change at any time
```

That's expected and harmless — ignore it. First load, with no data yet,
shows a welcome screen with two options: **Add a contract** or **Import
from USASpending.gov**. That confirms the app booted and the SQLite file
was created correctly at `data/cor.db`.

## Walkthrough: exercise every part of the app

This is the fastest way to confirm a change didn't break anything —
it touches every module and every dashboard signal.

### 1. Create a contract

Go to **Contracts → Add Contract**. Minimum required fields are
Contract Number and Title; fill in more for a realistic test:

| Field | Value |
| --- | --- |
| Contract Number | `W91QF1-26-C-0001` |
| Title | `Base Operations Support Services` |
| Vendor Name | `Acme Logistics LLC` |
| Status | `ACTIVE` |
| PoP Start | today |
| PoP End | **30 days from today** (triggers the "PoP expiring" dashboard alert — see below) |
| Obligated Amount | `500000` |
| Invoiced-to-Date | `460000` (92% utilized — triggers the funding-risk alert) |

Submitting redirects to the contract detail page — that's the
`createContract` server action + redirect working.

### 2. Add one entry to each module

The detail page has a collapsible **+ Add new entry** form under each
section. Add one of each:

- **Deliverable** — due date **yesterday**, status `PENDING` (triggers the
  overdue alert). Add a second one due in 10 days for the "due soon" alert.
- **Surveillance event** — result `UNSATISFACTORY`, check "corrective
  action required", give it a due date (triggers the open-corrective-action
  alert).
- **Invoice** — status `PENDING_REVIEW` (triggers the pending-invoice
  alert).
- **GFP item**, **Correspondence entry**, **Key personnel** — no dashboard
  signal tied to these, just confirm the add-and-list flow works.
- **Modification** — set a dollar change (e.g. `50000`); confirm the
  contract's Obligated Amount on the detail page updates automatically
  after you submit.

### 3. Check the dashboard

Go to **Dashboard**. With the data above you should see all six panels
populated: Overdue Deliverables, Due in Next 30 Days, PoP Expiring (60
days), Invoices Pending Review, Open Corrective Actions, and Funding
Utilization Risk (≥85%) showing your 92%. If any panel that should have
an entry is empty, something regressed in `lib/dashboard.ts`.

### 4. Set up the COR profile

Go to **COR Profile**, fill it in, and set **Certification Expiration
Date** to within 60 days. Save, then go back to **Dashboard** — you
should see an amber banner: "Your COR certification is expiring within
60 days." That's `corCertExpiringSoon` working.

### 5. Edit and delete

- **Contracts → [your contract] → Edit Contract**, change the title,
  save, confirm it's reflected on the detail page and the contracts list.
- Delete one of the child records you added (e.g. a GFP item) with its
  row's **Delete** button and confirm dialog — confirms the per-entity
  delete server actions.

## Testing authentication locally

Auth is off by default in dev (fast iteration matters more than a login
screen on your own machine). To test the login flow itself:

```bash
AUTH_PASSWORD=devpass npm run dev
```

Now every route redirects to `/login` except `/api/health`. Log in with
`devpass`, confirm you land back on the page you originally requested,
and confirm **Log out** (bottom of the sidebar) clears the session and
redirects to `/login` again. Stop the server (Ctrl-C) and restart it
*without* `AUTH_PASSWORD` to confirm the app goes back to no-login mode
— this is the behavior the k3s/Helm deployment relies on (`helm install`
without `--set-string auth.password=...` fails the render entirely,
specifically so this footgun doesn't happen there; in local dev it's
just "unset the env var").

## Testing the USASpending.gov import

Go to **Import from USASpending.gov**, search for something like a
vendor name, a PIID, or a keyword. This calls the public
`api.usaspending.gov` API directly (no key needed) — it needs real
outbound internet access from wherever `npm run dev` is running. If you
get a network error here, that's your environment's connectivity, not
the app (this exact call couldn't be tested from the sandbox this app
was originally built in, for the same reason — see the root
`README.md`'s USASpending section).

A successful search shows a results table; click **Import** on one to
create a new Contract pre-filled from the award data, then confirm it
shows up in **Contracts** and that PIID/vendor/NAICS/dates/values look
right on its detail page.

## Resetting local data

Delete the SQLite file and restart:

```bash
rm -rf data
npm run dev
```

You're back to the empty-state welcome screen. `data/` is gitignored,
so this never touches version control.

## Production build

```bash
npm run build
npm run start
```

`npm run build` runs the TypeScript check and produces the same
standalone output the Docker image uses (`output: "standalone"` in
`next.config.ts`). If this fails, `npm run dev` working isn't enough —
always run this before considering a change done. `npm run lint` too:

```bash
npm run lint
```

## Testing the Docker image locally

```bash
docker build -t cor-tracker:local .
docker run --rm -p 3000:3000 \
  -e AUTH_PASSWORD=devpass \
  -v cor-tracker-data:/app/data \
  cor-tracker:local
```

Open <http://localhost:3000> — same app, same login-gate behavior as
above, running from the actual production container image rather than
`next dev`. Use a named volume (`cor-tracker-data`), not a bind mount to
a host folder — the container runs as a non-root user (uid 1001) that
owns `/app/data` *inside* the image, and a host bind mount would shadow
that ownership and likely fail to write. A named volume inherits the
image's permissions on first use instead. `docker volume rm
cor-tracker-data` to reset it.

## Testing the Helm chart / k3s deployment locally

That's a bigger setup (a k3s cluster, `helm`, `kubectl`) — see
[`helm/README.md`](helm/README.md) for the full instructions. The short
version, if you already have a local k3s cluster running:

```bash
docker build -t cor-tracker:local .
docker save cor-tracker:local | sudo k3s ctr images import -

cd helm
helm upgrade --install cor-tracker ./cor-tracker \
  --namespace cor-tracker --create-namespace \
  --set-string auth.password=devpass \
  --set image.repository=cor-tracker --set image.tag=local \
  --set ingress.enabled=false \
  --wait --timeout 5m

kubectl -n cor-tracker port-forward svc/cor-tracker 8080:80
```

Open <http://localhost:8080>. `helm lint ./cor-tracker` and
`helm template ./cor-tracker --set-string auth.password=x` are useful
for checking chart changes without a cluster at all.

## Troubleshooting

- **`ExperimentalWarning: SQLite is an experimental feature`** — expected,
  see Prerequisites above. Not a bug.
- **Port 3000 already in use** — `npm run dev -- -p 3001` (or
  `npm run start -- -p 3001` for the production server).
- **Stale data after pulling changes that touched the schema** — the
  schema in `lib/db.ts` uses `CREATE TABLE IF NOT EXISTS`, so it won't
  auto-migrate existing columns. Delete `data/` and restart (see above)
  rather than debugging a half-migrated local database.
- **Login loop that never accepts the right password** — you're probably
  testing against a stale build; `rm -rf .next` and restart `npm run dev`.
