# Contract Ratings

A slim app for logging contracts and contractors and rating them 1–5
stars. One shared API core, one primary way to run it:

- **Self-contained container** (primary) — one Node process backed by
  `node:sqlite`, local disk, and a shared password. No AWS at runtime.
  Runs as an add-on pod alongside the **ALERTS** (`os_alerts`) app — either
  in the same Kubernetes cluster or provisioned per tenant by ALERTS via
  the Helm chart. See
  [`contract-ratings/DOCKER_K8S.md`](contract-ratings/DOCKER_K8S.md) and
  the `os_alerts` repo's `COR_ADDON.md`.
- **AWS serverless** (archived) — Cognito + API Gateway + Lambda +
  DynamoDB + S3, fronted by CloudFront. Parked, intact, in
  [`contract-ratings/archive/aws/`](contract-ratings/archive/aws/) in case
  the standalone stack is ever needed again.

Both share the route logic in
[`contract-ratings/api/core.mjs`](contract-ratings/api/core.mjs);
everything else is a thin per-environment adapter. Full details:
[`contract-ratings/README.md`](contract-ratings/README.md).

Deployment targets are compared in [DEPLOYMENTS.md](DEPLOYMENTS.md)
(same three-target layout as the `os_alerts` repo).

## Repository layout

```
contract-ratings/
  api/          core.mjs — shared route logic (used by both variants)
  frontend/     Vite + React + TypeScript SPA (shared-password or Cognito auth)
  server/       container HTTP server (node:sqlite + disk + password)
  docker/       Dockerfile — container image (the primary deployment)
  deploy/
    k8s/        kustomize base + overlays (docker-desktop | cloud) — standalone
    helm/       Helm chart (used by os_alerts per-tenant provisioning)
  scripts/      seed documents + importer, ECR publish script
  archive/aws/  parked AWS serverless variant (Lambda handler, terraform, DynamoDB seeder)
```

> The top-level `terraform/` directory is the **legacy** EC2/k3s COR
> Tracker stack, retained only until its AWS resources are destroyed. It
> is not part of any current deployment and will be removed.
