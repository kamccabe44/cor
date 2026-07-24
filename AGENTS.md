# Repository guide for agents

This repo is the **Contract Ratings** app (`contract-ratings/`). One shared
API core (`contract-ratings/api/core.mjs`) with a thin adapter per
environment.

**Primary deployment — self-contained container** —
`contract-ratings/server/` (node:sqlite, local disk, shared password),
built by `contract-ratings/docker/Dockerfile`. It runs as an add-on pod
for the **ALERTS/PEACEMAKER** app (`os_alerts` repo): in-cluster next to
it via that repo's `deploy/k8s/` overlays, or provisioned per tenant using
`contract-ratings/deploy/helm/contract-ratings/` (see `os_alerts`
`COR_ADDON.md`). The kustomize overlays under `contract-ratings/deploy/k8s/`
(base + `docker-desktop` | `cloud`) also deploy it standalone — the same
three-target layout as the `os_alerts` repo; see the root `DEPLOYMENTS.md`.

**Archived — AWS serverless** — `contract-ratings/archive/aws/` (Lambda
handler, terraform for DynamoDB/S3/Cognito/CloudFront, DynamoDB seeder).
Parked intact for possible standalone reuse; not deployed. Its terraform
packages the live `api/core.mjs` in at deploy time, so core changes don't
need mirroring into the archive.

The frontend (`contract-ratings/frontend/`) is a Vite + React + TypeScript
SPA that talks to the same `/api` in both modes (shared-password session
with `VITE_LOCAL_MODE=1` — what the container uses — vs Cognito for the
archived serverless variant).

Seed/demo data: `contract-ratings/scripts/` has JSON seed documents (e.g.
`seed-data-kuwait.json`) and `import-local.mjs`, which imports a document
into a running container instance through its HTTP API.

See `contract-ratings/README.md` and `contract-ratings/DOCKER_K8S.md`.

The top-level `terraform/` directory is the **legacy** EC2/k3s COR Tracker
stack, kept only until its AWS resources are torn down; it is not part of
any current deployment.
