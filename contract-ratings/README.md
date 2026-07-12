# Contract Ratings

A slim, fully serverless companion app: contracting officers and CORs log
contracts and contractors and rate them 1–5 stars. Separate from the COR
Tracker app in `../app` and `../terraform` — no EC2, no k3s, nothing to
patch or scale-to-zero. Everything here either doesn't run at all until
invoked (Lambda, API Gateway) or is a static file served by CloudFront.

## Architecture

```
Browser → https://cor.1136mpco.com (Route53 alias)
        → CloudFront (one distribution, two origins)
              ├─ default behavior "/*"     → S3 (the built React SPA)
              └─ ordered behavior "/api/*" → API Gateway (HTTP API)
                                                  → JWT authorizer (Cognito)
                                                  → Lambda "contract-ratings-api"
                                                        → DynamoDB (3 tables)
```

- **Auth**: reuses your existing Cognito User Pool (the one already
  backing `os_alerts`) — this stack does not create or modify the pool,
  it only adds its own App Client inside it (`cognito.tf`), scoped for
  direct SRP sign-in (`amazon-cognito-identity-js` in the frontend, no
  Hosted UI redirect). API Gateway validates the resulting ID token
  itself via a JWT authorizer; the Lambda never re-verifies it.
- **One domain, no CORS**: the SPA and the API are both served from
  `cor.1136mpco.com` — CloudFront just routes by path (`/api/*` vs
  everything else), so the browser never makes a cross-origin request.
- **Data model** (`terraform/dynamodb.tf`): `contract-ratings-contractors`,
  `contract-ratings-contracts` (with a `byContractor` GSI), and
  `contract-ratings-ratings` (one item per user per target, PK
  `CONTRACTOR#<id>` / `CONTRACT#<id>`, SK = Cognito `sub`). Rating a
  contract/contractor upserts the caller's rating row, recomputes the
  average from all ratings for that target, and writes `avgRating` /
  `ratingCount` back onto the parent item so list pages don't need an
  extra query per row.

## This takes over `cor.1136mpco.com` from the old EC2/k3s deployment

Both this stack and `../terraform` (the EC2/k3s COR Tracker) try to own
the same Route53 record for `cor.1136mpco.com`. Per the decision to park
the old deployment and move the domain here, **detach the domain from the
old stack before applying this one**:

```bash
cd ../terraform
terraform destroy \
  -target=aws_route53_record.cor \
  -target=aws_apigatewayv2_api_mapping.cor \
  -target=aws_apigatewayv2_domain_name.cor
```

This only removes the DNS record and the API Gateway custom domain
mapping — it does **not** touch the EC2 instance, its EBS volume/data, the
VPC, or anything else in that stack, so it stays available to bring back
later (`terraform apply` there again, then reverse the two `-target`
destroys' effect by re-applying normally). The instance itself is already
scale-to-zero, so leaving it fully intact and just unplugged from DNS
costs nothing while stopped.

## Prerequisites

- An existing Cognito User Pool ID (from `os_alerts` or wherever) —
  find it with:
  ```bash
  aws cognito-idp list-user-pools --max-results 20 --query 'UserPools[].{Id:Id,Name:Name}' --output table
  ```
- Node.js 20+ and npm, for building the frontend.
- Same AWS CLI / Terraform prerequisites as `../terraform` (see that
  README for the local Terraform provider mirror workaround if
  `registry.terraform.io` is unreachable).

## Deploying

```bash
cd terraform
./deploy.sh --cognito-user-pool-id us-east-1_XXXXXXXXX
```

This runs `terraform apply` (DynamoDB, Lambda, API Gateway, the new
Cognito App Client, S3, CloudFront, ACM cert, Route53), then writes
`../frontend/.env.production` from the resulting outputs, builds the SPA,
syncs it to the S3 bucket, and invalidates the CloudFront cache. The
`cognito_user_pool_id` you pass once is remembered in
`terraform/local.auto.tfvars` (gitignored) for later runs — `./deploy.sh`
alone is enough after the first time.

Run `./deploy.sh --plan-only` to see the Terraform plan without applying
or touching the frontend, or `./deploy.sh --destroy` to tear this whole
stack down (does not touch the old EC2 stack).

## Local development

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api/*` to `http://localhost:3001` — either
point that at a local Lambda-invoking shim, or just develop against the
deployed API by setting the proxy target to the deployed `api_endpoint`
Terraform output. There is no local DynamoDB in this setup; it always
talks to the real tables in AWS.

## Seed data (for testing/demo)

`scripts/seed.mjs` writes a few realistic contracts — each with
contract-level leads/POCs/alternate POCs, nested contractors, and
ratings — straight into the DynamoDB tables using your ambient AWS
credentials (it does not go through Cognito/API Gateway):

```bash
cd scripts
npm install
node seed.mjs          # write seed data
node seed.mjs --wipe   # remove everything it created
```

Everything it creates is prefixed `seed-`, so `--wipe` removes exactly
the seed rows and nothing else. Table names/region can be overridden with
`CONTRACTS_TABLE` / `CONTRACTORS_TABLE` / `RATINGS_TABLE` / `AWS_REGION`.

## Cost

Every piece here is pay-per-use with no idle cost: DynamoDB on-demand,
Lambda, API Gateway, and CloudFront/S3 are all effectively free at low
traffic (a handful of CORs logging in occasionally). The only fixed cost
is Route53's per-hosted-zone fee, which you're already paying for
`1136mpco.com`.
