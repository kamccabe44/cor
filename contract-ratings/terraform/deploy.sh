#!/usr/bin/env bash
# Deploys the contract-ratings stack: terraform apply (DynamoDB, Lambda,
# API Gateway, Cognito app client, S3, CloudFront, Route53), then builds
# the React frontend against the resulting Cognito/API outputs, syncs it
# to S3, and invalidates CloudFront. See ./deploy.sh --help.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
FRONTEND_DIR="${SCRIPT_DIR}/../frontend"
AUTO_TFVARS_FILE="${SCRIPT_DIR}/local.auto.tfvars"

ACTION="apply"
AUTO_APPROVE=0
PLAN_ONLY=0

persist_tfvar() {
  local name="$1" value="$2"
  touch "$AUTO_TFVARS_FILE"
  grep -v "^${name}[[:space:]]*=" "$AUTO_TFVARS_FILE" > "${AUTO_TFVARS_FILE}.tmp" 2>/dev/null || true
  printf '%s = "%s"\n' "$name" "$value" >> "${AUTO_TFVARS_FILE}.tmp"
  mv "${AUTO_TFVARS_FILE}.tmp" "$AUTO_TFVARS_FILE"
}

usage() {
  cat <<'EOF'
Usage: ./deploy.sh [options]

  --auto-approve            Skip the interactive confirmation before applying.
  --plan-only                Run init + plan and stop there (no apply, no frontend build/deploy).
  --destroy                  Run 'terraform destroy' instead of apply.
  --cognito-user-pool-id ID  Existing Cognito User Pool ID to authenticate against
                              (e.g. us-east-1_XXXXXXXXX). Required on first run;
                              remembered afterward in local.auto.tfvars.
  -h, --help                  Show this help and exit.
EOF
}

log() { printf '\n\033[1;34m==>\033[0m %s\n' "$1"; }
error() { printf '\n\033[1;31mERROR:\033[0m %s\n' "$1" >&2; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --auto-approve) AUTO_APPROVE=1; shift ;;
    --plan-only) PLAN_ONLY=1; shift ;;
    --destroy) ACTION="destroy"; shift ;;
    --cognito-user-pool-id)
      TF_VAR_cognito_user_pool_id="$2"
      export TF_VAR_cognito_user_pool_id
      persist_tfvar "cognito_user_pool_id" "$2"
      shift 2
      ;;
    -h|--help) usage; exit 0 ;;
    *) error "Unknown option: $1"; usage; exit 1 ;;
  esac
done

if [[ -f "$AUTO_TFVARS_FILE" ]]; then
  log "Using remembered values from local.auto.tfvars:"
  sed 's/^/    /' "$AUTO_TFVARS_FILE"
fi

if [[ -z "${TF_VAR_cognito_user_pool_id:-}" ]] && ! grep -q '^cognito_user_pool_id' "$AUTO_TFVARS_FILE" 2>/dev/null; then
  error "cognito_user_pool_id is required. Pass --cognito-user-pool-id us-east-1_XXXXXXXXX (find it with: aws cognito-idp list-user-pools --max-results 20 --query 'UserPools[].{Id:Id,Name:Name}' --output table)."
  exit 1
fi

log "terraform init"
terraform init -upgrade

if [[ "$ACTION" == "destroy" ]]; then
  log "terraform destroy"
  if [[ "$AUTO_APPROVE" == "1" ]]; then
    terraform destroy -auto-approve
  else
    terraform destroy
  fi
  exit 0
fi

log "terraform plan"
terraform plan -out=.tfplan

if [[ "$PLAN_ONLY" == "1" ]]; then
  log "Plan-only requested, stopping here."
  exit 0
fi

if [[ "$AUTO_APPROVE" != "1" ]]; then
  read -r -p "Apply this plan? [y/N] " confirm
  [[ "$confirm" =~ ^[Yy]$ ]] || { log "Aborted."; exit 0; }
fi

log "terraform apply"
terraform apply .tfplan

AWS_REGION="$(terraform output -raw aws_region)"
COGNITO_USER_POOL_ID="$(terraform output -raw cognito_user_pool_id)"
COGNITO_CLIENT_ID="$(terraform output -raw cognito_client_id)"
FRONTEND_BUCKET="$(terraform output -raw frontend_bucket)"
DISTRIBUTION_ID="$(terraform output -raw cloudfront_distribution_id)"
APP_URL="$(terraform output -raw app_url)"

log "Writing frontend/.env.production from terraform outputs"
cat > "${FRONTEND_DIR}/.env.production" <<EOF
VITE_AWS_REGION=${AWS_REGION}
VITE_COGNITO_USER_POOL_ID=${COGNITO_USER_POOL_ID}
VITE_COGNITO_CLIENT_ID=${COGNITO_CLIENT_ID}
EOF

log "Building frontend"
( cd "$FRONTEND_DIR" && npm ci && npm run build )

log "Syncing frontend/dist to s3://${FRONTEND_BUCKET}"
aws s3 sync "${FRONTEND_DIR}/dist" "s3://${FRONTEND_BUCKET}" --delete

log "Invalidating CloudFront distribution ${DISTRIBUTION_ID}"
aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths '/*'

log "Done. App URL: ${APP_URL}"
log "Note: DNS/cert propagation and the CloudFront invalidation can each take a few minutes."
