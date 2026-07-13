# Contract Ratings

A slim app for logging contracts and contractors and rating them 1–5
stars. One shared API core, two ways to run it:

- **AWS serverless** — Cognito + API Gateway + Lambda + DynamoDB + S3,
  fronted by CloudFront. Code in [`contract-ratings/lambda/`](contract-ratings/lambda/),
  infra in [`contract-ratings/terraform/`](contract-ratings/terraform/).
- **Self-contained container** — one Node process backed by `node:sqlite`,
  local disk, and a shared password. No AWS, no network. Deployable on
  Kubernetes (Docker Desktop). See
  [`contract-ratings/DOCKER_K8S.md`](contract-ratings/DOCKER_K8S.md).

The two deployments share the route logic in
`contract-ratings/lambda/api/core.mjs`; everything else is a thin
per-environment adapter. Full details:
[`contract-ratings/README.md`](contract-ratings/README.md).

## Repository layout

```
contract-ratings/
  frontend/     Vite + React + TypeScript SPA (Cognito or shared-password auth)
  lambda/api/   core.mjs (shared route logic) + index.mjs (AWS Lambda handler)
  server/       container HTTP server (node:sqlite + disk + password)
  terraform/    AWS infra for the serverless deployment
  Dockerfile    container image for the k8s deployment
  k8s/          Kubernetes manifests (Docker Desktop)
  scripts/      seed data
```

> The top-level `terraform/` directory is the **legacy** EC2/k3s COR
> Tracker stack, retained only until its AWS resources are destroyed. It
> is not part of either current deployment and will be removed.
