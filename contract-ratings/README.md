# Contract Ratings

A slim companion app: contracting officers and CORs log contracts and
contractors and rate them 1–5 stars. One shared API core
([`api/core.mjs`](api/core.mjs)) behind thin per-environment adapters.

**The primary deployment is the self-contained container** — one Node
process serving the built SPA and `/api`, backed by `node:sqlite` and
local disk, gated by a shared password. No AWS at runtime. It runs as an
add-on pod for the **ALERTS** (`os_alerts`) app:

- **In-cluster pod** — deployed next to ALERTS by the `os_alerts` repo's
  `k8s/` manifests (`cor-*.yaml`); ALERTS links to it via
  `CONTRACT_RATINGS_URL`.
- **Per-tenant provisioning** — ALERTS Helm-installs
  [`helm/contract-ratings/`](helm/contract-ratings/) per customer at
  `cor.<subdomain>.<base_domain>` (see `os_alerts` `COR_ADDON.md`).
- **Standalone** — [`k8s/`](k8s/) deploys it by itself on Docker Desktop
  Kubernetes, or run it directly with Node.

Building the image, running without Kubernetes, and the k8s/Helm details
are in [DOCKER_K8S.md](DOCKER_K8S.md).

## Architecture (container)

```
Browser → http(s)://<host>/          one Node process (server/server.mjs)
              ├─ static SPA          built with VITE_LOCAL_MODE=1
              ├─ /api/*              shared core (api/core.mjs) → node:sqlite
              ├─ /__pws/*            PWS uploads/downloads on local disk
              └─ shared password     HttpOnly session cookie (APP_PASSWORD)
```

All state lives under `DATA_DIR` (`/data` in the container): the SQLite
database plus the `pws/` folder. Copy that directory to back up or move
an instance.

## Local development

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api/*` to `http://localhost:3001` — run the
container server there (`cd server && APP_PASSWORD=changeme PORT=3001 node
server.mjs`) for a fully local loop.

## Seed / demo data

[`scripts/`](scripts/) holds JSON seed documents (e.g.
`seed-data-kuwait.json`, sample contracts for Camp Arifjan / Camp
Buehring) and `import-local.mjs`, which imports a document into a
**running** instance through its HTTP API:

```bash
cd scripts
node import-local.mjs --file seed-data-kuwait.json \
  --url http://localhost:8080 --password '<APP_PASSWORD>'
```

Re-runs skip contracts that already exist, so importing is idempotent.

## Archived: AWS serverless variant

The original serverless deployment (Cognito + API Gateway + Lambda +
DynamoDB + S3/CloudFront at `cor.1136mpco.com`) is **parked** in
[`archive/aws/`](archive/aws/) — handler, full terraform (with
`deploy.sh`), and the DynamoDB seeder — in case the standalone stack is
ever wanted again. It reuses the same `api/core.mjs` (packaged in at
deploy time) and the frontend's Cognito build mode. See
[`archive/aws/README.md`](archive/aws/README.md) for what's there and how
to revive it.
