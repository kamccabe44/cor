# Contract Ratings — container build (Docker Desktop Kubernetes)

The same app that runs serverless on AWS (Cognito + API Gateway + Lambda +
DynamoDB + S3) also runs as a **single self-contained container** with no
AWS and no network dependencies — for local use, demos, or a disconnected
environment. It's the same API route logic (`lambda/api/core.mjs`), wired
to local backends instead of AWS.

| Concern   | AWS build                     | Container build              |
| --------- | ----------------------------- | ---------------------------- |
| Data      | DynamoDB                      | `node:sqlite` file on a PVC  |
| PWS files | S3 + presigned URLs           | local disk on the same PVC   |
| Auth      | Cognito (JWT)                 | one shared password (cookie) |
| Serving   | CloudFront + API Gateway      | one Node process (SPA + API) |

Nothing is shared at runtime between the two; the container needs only a
container runtime and Kubernetes.

## What runs in the container

One Node process (`server/server.mjs`) that:

- serves the built SPA (built with `VITE_LOCAL_MODE=1`, so it uses the
  password login instead of Cognito),
- serves `/api/*` by handing requests to the shared `createRouter(...)`
  core with a `node:sqlite` store and a local-disk file store,
- serves PWS uploads/downloads at `/__pws/*` (the browser's
  presigned-URL flow points back here instead of S3),
- gates everything behind `APP_PASSWORD` via an HttpOnly session cookie.

All state (the SQLite DB and PWS files) lives under `/data`, mounted from
a PersistentVolumeClaim.

## Run without Kubernetes (quick check)

```bash
cd frontend && VITE_LOCAL_MODE=1 npm ci && npm run build && cd ..
cd server && APP_PASSWORD=changeme STATIC_DIR=../frontend/dist DATA_DIR=./.local node server.mjs
# open http://localhost:8080, sign in with: changeme
```

## Build the image

```bash
# from the repo root
docker build -t contract-ratings:local contract-ratings
```

The multi-stage `Dockerfile` builds the SPA in local mode and assembles it
with the server and the shared core into a small `node:22-slim` image.

## Deploy to Docker Desktop Kubernetes

1. Enable Kubernetes in Docker Desktop (Settings → Kubernetes → Enable).
   The image you built is already in Docker Desktop's image store, and the
   Deployment uses `imagePullPolicy: IfNotPresent`, so nothing is pulled.

2. Set the password, then apply the manifests:

   ```bash
   # create the password secret (don't commit a real one)
   kubectl create secret generic contract-ratings \
     --from-literal=APP_PASSWORD='your-strong-password'

   # apply the rest (kustomization pulls in pvc + deployment + service;
   # the committed secret.yaml is a placeholder — the line above wins if
   # you skip applying it)
   kubectl apply -f contract-ratings/k8s/pvc.yaml \
                 -f contract-ratings/k8s/deployment.yaml \
                 -f contract-ratings/k8s/service.yaml
   ```

   Or apply everything (including the placeholder secret) at once with
   `kubectl apply -k contract-ratings/k8s` — just edit `secret.yaml` first.

3. Reach the app. The Service is `type: LoadBalancer`, which Docker Desktop
   maps to `localhost`:

   ```
   http://localhost/
   ```

   If your cluster has no LoadBalancer, port-forward instead:

   ```bash
   kubectl port-forward deploy/contract-ratings 8080:8080
   # then open http://localhost:8080/
   ```

   Sign in with the password you set.

## Notes

- **Single replica.** SQLite is a single-writer store on a ReadWriteOnce
  volume, so the Deployment runs one replica with a `Recreate` strategy.
  It's sized for a small team; it is not a horizontally-scaled service.
- **Data persistence.** Everything survives pod restarts via the PVC.
  Deleting the PVC deletes all data.
- **Backups / moving data.** The whole dataset is the `/data` directory
  (`contract-ratings.db` plus the `pws/` folder) — copy it out with
  `kubectl cp` to back up or migrate.
- **Multiple replicas** would need a fixed `APP_SESSION_SECRET` (so cookies
  validate across pods) and a real database — out of scope for this
  single-box build.

## Using it as an `os_alerts` add-on

The `os_alerts` app offers this app as an optional, per-customer **COR**
add-on, in two modes:

- **Link-only** — point `CONTRACT_RATINGS_URL` at a running instance (like the
  one above) and os_alerts shows a link. Simplest; works anywhere.
- **Provisioning** — os_alerts deploys a dedicated instance *per tenant* on
  demand, at `cor.<subdomain>.<base_domain>`. That path uses the Helm chart in
  [`helm/contract-ratings/`](helm/contract-ratings/) and the image/chart pushed
  to ECR by [`scripts/publish-ecr.sh`](scripts/publish-ecr.sh).

Either way the apps stay fully independent — just a link or a separate
deployment, no shared auth, session, or data. See the `os_alerts`
`COR_ADDON.md` for the full runbook.
