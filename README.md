# COR Contract Tracker

A self-hosted web app for a Contracting Officer's Representative (COR)
supporting an Army CENTCOM unit to track contracting data end to end:
contracts, deliverables (CDRLs), QASP surveillance, invoices/WAWF review,
Government Furnished Property, correspondence, key personnel, and
modifications — plus a dashboard that surfaces what needs attention
(overdue deliverables, expiring periods of performance, invoices awaiting
review, open corrective actions, funding-ceiling risk, and COR
certification expiration).

It also includes a lookup/import tool against the public
[USASpending.gov](https://api.usaspending.gov) API to pre-populate a
contract record from already-reported federal award data (PIID, vendor,
NAICS/PSC, period of performance, obligated/potential value, place of
performance) — no API key required.

**This is a personal tracking aid, not a system of record.** Your
command's official COR file (designation letter, QASP, and documented COR
actions) governs — keep this in sync with it, not the other way around.

## Stack

- Next.js 16 (App Router, Server Components + Server Actions)
- TypeScript, Tailwind CSS
- SQLite via Node's built-in [`node:sqlite`](https://nodejs.org/api/sqlite.html)
  module — no external database, no native module compilation, no
  additional services to run. Data is stored in `data/cor.db`, created
  automatically on first run.

`node:sqlite` is still an experimental Node API (stable since Node 22.5+,
Node 22 or later required). You'll see an `ExperimentalWarning` in the
console on startup — that's expected and harmless.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The first time you
load the dashboard with no contracts, you'll be prompted to add one
manually or import one from USASpending.gov.

For a production build:

```bash
npm run build
npm run start
```

## Authentication

There's no login by default in local dev — the whole point is a fast
`npm install && npm run dev` loop. Set `AUTH_PASSWORD` to turn on a
login page (a single shared password, checked by `proxy.ts` against
a signed session cookie) in front of every route except `/api/health`:

```bash
AUTH_PASSWORD=devpass npm run dev
```

The k3s deployment sets this from a Secret so the app is gated by
default whenever it's reachable from outside your machine — see
[`k8s/README.md`](k8s/README.md#3-set-the-login-password).

## Running on Kubernetes (k3s)

See [`k8s/README.md`](k8s/README.md) for a Dockerfile + manifests to run
this on a personal/dev k3s cluster, locally or on a single AWS Ubuntu box.

For a hands-off AWS deployment that stops itself when idle and wakes back
up on access, see [`terraform/README.md`](terraform/README.md) — it
provisions that same EC2/k3s setup plus a Lambda that starts the
instance and shows a splash page while it boots, and a scheduled Lambda
that stops it again after 20 minutes of inactivity.

## Data model

Everything hangs off a `Contract` (one row per contract or task order you
are the COR for). Each contract has:

| Module | Purpose |
| --- | --- |
| Deliverables | CDRL-style tracking: CLIN, due date, frequency, acceptance status |
| Surveillance events | QASP log: method, performance standard, result, corrective actions |
| Invoices | WAWF/PIEE receiving-report tracking: amount, status, review date |
| GFP items | Government Furnished Property: NSN/serial, condition, issue/return |
| Correspondence | Documented contact log with contractors/stakeholders |
| Key personnel | Required labor categories, clearances, status |
| Modifications | Mod history; funding/PoP/value changes auto-roll into the contract totals |

A separate `COR Profile` page tracks your own appointment/certification
info (COR level, CLC 106 completion, certification expiration, ethics/CTIP
training, supervising KO) independent of any single contract.

## USASpending.gov integration

`lib/usaspending.ts` calls the public v2 API
(`/api/v2/search/spending_by_award/` and `/api/v2/awards/<id>/`), which
requires no authentication. It was implemented against the documented API
contract at <https://api.usaspending.gov/docs/endpoints>; outbound network
access was blocked in the sandbox this app was developed in, so the calls
could not be live-tested during development. Field extraction is written
defensively (optional chaining, multiple fallback field names) to tolerate
minor schema drift, but if results look wrong, check the field names
against the live docs.

## Reference Library

The `/reference` page is a working summary of COR responsibilities
compiled from publicly available FAR (Subpart 1.6, 1.602-2), DFARS
(201.602-2), and common DoD COR practice (COR certification levels, QASP,
WAWF, GFP, CENTCOM/contingency-specific considerations). It's background
orientation, not legal advice — your designation letter, contract clauses,
and command policy always govern.

## Notes on scope and honesty about testing

- Server Actions handle all create/update/delete operations with
  progressive-enhancement `<form action={...}>` — no separate REST layer
  was needed for CRUD.
- The app was exercised end-to-end with a headless browser during
  development (create a contract → add a deliverable/invoice → confirm
  the dashboard reflects overdue/pending/funding-risk alerts → edit → COR
  profile save → COR-cert-expiration banner) rather than relying on
  build/typecheck alone.
- The USASpending import flow's live network call was **not** exercised
  in the same way, for the network-access reason noted above — verify it
  against a real search once you have outbound internet access.
