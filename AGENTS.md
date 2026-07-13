# Repository guide for agents

This repo is the **Contract Ratings** app (`contract-ratings/`). It has one
shared API core with two deployment targets:

- **AWS serverless** — `contract-ratings/lambda/` (DynamoDB, S3, Cognito),
  deployed by `contract-ratings/terraform/`.
- **Self-contained container** — `contract-ratings/server/` (node:sqlite,
  local disk, shared password), deployed by `contract-ratings/Dockerfile`
  + `contract-ratings/k8s/` (Kubernetes / Docker Desktop).

The route logic is shared in `contract-ratings/lambda/api/core.mjs`; the
Lambda handler and the container server are thin per-environment adapters
over it. The frontend (`contract-ratings/frontend/`) is a Vite + React +
TypeScript SPA that talks to the same `/api` in both modes (Cognito vs a
shared-password session, selected by `VITE_LOCAL_MODE`).

See `contract-ratings/README.md` and `contract-ratings/DOCKER_K8S.md`.

The top-level `terraform/` directory is the **legacy** EC2/k3s COR Tracker
stack, kept only until its AWS resources are torn down; it is not part of
either current deployment.
