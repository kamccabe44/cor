# Archived: AWS serverless deployment

This directory holds the **parked** AWS serverless variant of the Contract
Ratings app. It is not deployed anywhere. The live deployment is the
self-contained container (`../../server` + `../../Dockerfile`) running as an
add-on pod alongside the `os_alerts` (ALERTS) app — see `../../DOCKER_K8S.md`
and the `os_alerts` repo's `COR_ADDON.md`.

It is kept intact so the standalone serverless stack can be revived later
for something else.

## What's here

| Path            | What it is |
| --------------- | ---------- |
| `lambda/index.mjs` | Lambda handler: adapts the shared route core to DynamoDB, S3 presigned URLs, and Cognito JWT claims |
| `terraform/`    | Full stack: DynamoDB, Lambda, API Gateway (JWT authorizer), Cognito app client, S3 + CloudFront, Route53 — with `deploy.sh` |
| `seed.mjs` + `package.json` | DynamoDB demo-data seeder (`node seed.mjs [--file <doc.json>] [--wipe]`) |

Two pieces of the serverless variant intentionally live *outside* the
archive, because the live app still uses them:

- **`../../api/core.mjs`** — the shared route logic. `terraform/lambda.tf`
  packages it into the Lambda zip next to `index.mjs` at deploy time, so
  reviving this stack automatically picks up the current core.
- **The frontend's Cognito mode** — `../../frontend` builds for either auth
  mode; `VITE_LOCAL_MODE=1` (container, shared password) is what the
  Dockerfile uses, while the default/Cognito mode is what
  `terraform/deploy.sh` builds and ships to S3.

## Reviving it

Nothing was destroyed by archiving — this is only a code move. If the AWS
resources still exist, `cd terraform && ./deploy.sh` works as before (the
`cognito_user_pool_id` is remembered in the gitignored `local.auto.tfvars`;
pass `--cognito-user-pool-id` on a fresh checkout). `./deploy.sh --destroy`
tears the stack down.

Seed/demo data for DynamoDB:

```bash
cd contract-ratings/archive/aws
npm install
node seed.mjs --file ../../scripts/seed-data-kuwait.json
```

(For the container deployment, seed through the HTTP API instead with
`../../scripts/import-local.mjs`.)
