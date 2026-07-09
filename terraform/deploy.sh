#!/usr/bin/env bash
# Deploys (or destroys) the COR Tracker AWS infra with verbose,
# saved-to-disk Terraform logging. See ./deploy.sh --help.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ACTION="apply"
AUTO_APPROVE=0
FORCE_DESTROY=0
PLAN_ONLY=0
LOG_LEVEL="DEBUG"

usage() {
  cat <<'EOF'
Usage: ./deploy.sh [options]

  --auto-approve    Skip the interactive confirmation before applying.
  --plan-only       Run init + plan and stop there (no apply).
  --destroy         Run 'terraform destroy' instead of apply. Always
                     asks for confirmation, even with --auto-approve.
  --force-destroy   Also skip the destroy confirmation. This deletes
                     the EC2 instance and its EBS volume (including the
                     SQLite database) with no prompt at all. Back up
                     your data first — see ../k8s/README.md#7-backing-up-the-data.
  --log-level LVL   TF_LOG level: TRACE, DEBUG, INFO, WARN, ERROR.
                     Default: DEBUG.
  -h, --help        Show this help and exit.

Every run writes two logs under ./deploy-logs/:
  run-<timestamp>.log        this script's own output
  terraform-<timestamp>.log  Terraform's internal debug log (TF_LOG)

Both are gitignored, but treat them like secrets, not just logs:
Terraform's debug/trace logging includes provider request bodies,
which means your auth_password shows up in plaintext in the
Terraform log whenever the SSM parameter is created or updated.
Don't paste these unredacted into a bug report; delete them once
you're done troubleshooting.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --auto-approve) AUTO_APPROVE=1 ;;
    --plan-only) PLAN_ONLY=1 ;;
    --destroy) ACTION="destroy" ;;
    --force-destroy) ACTION="destroy"; FORCE_DESTROY=1 ;;
    --log-level)
      LOG_LEVEL="${2:-}"
      [[ -n "$LOG_LEVEL" ]] || { echo "--log-level needs a value" >&2; exit 1; }
      shift
      ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage; exit 1 ;;
  esac
  shift
done

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
LOG_DIR="${SCRIPT_DIR}/deploy-logs"
mkdir -p "$LOG_DIR"
chmod 700 "$LOG_DIR"

RUN_LOG="${LOG_DIR}/run-${TIMESTAMP}.log"
PLAN_FILE="${LOG_DIR}/tfplan-${TIMESTAMP}"

export TF_LOG="$LOG_LEVEL"
export TF_LOG_PATH="${LOG_DIR}/terraform-${TIMESTAMP}.log"
export TF_IN_AUTOMATION=1

log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$RUN_LOG"; }

fail() {
  log "ERROR: $*"
  log "Script log:      $RUN_LOG"
  log "Terraform log:    $TF_LOG_PATH"
  exit 1
}

trap 'fail "unexpected failure (see the two log files above for detail)"' ERR

log "==> COR Tracker Terraform deploy — action: $ACTION"
log "    Script log:     $RUN_LOG"
log "    Terraform log:  $TF_LOG_PATH (level $LOG_LEVEL)"
log "    NOTE: the Terraform log will likely contain your auth_password in plaintext. Treat it as a secret."

# ---------- Preflight ----------

log "==> Checking required tools"
command -v terraform >/dev/null 2>&1 || fail "terraform not found on PATH. Install: https://developer.hashicorp.com/terraform/install"
command -v aws >/dev/null 2>&1 || fail "AWS CLI not found on PATH. Install: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
log "    terraform: $(terraform version -json | grep -o '"terraform_version":"[^"]*"' | cut -d'"' -f4)"
log "    aws-cli:   $(aws --version 2>&1)"

log "==> Checking AWS credentials"
if ! CALLER_JSON="$(aws sts get-caller-identity --output json 2>>"$RUN_LOG")"; then
  fail "AWS credentials are not configured or are invalid. Run 'aws configure' (or set AWS_PROFILE / AWS_ACCESS_KEY_ID etc.) and retry."
fi
echo "$CALLER_JSON" >>"$RUN_LOG"
CALLER_ARN="$(echo "$CALLER_JSON" | grep -o '"Arn": *"[^"]*"' | head -1 | cut -d'"' -f4)"
log "    Authenticated as: $CALLER_ARN"

if [[ "$ACTION" == "apply" ]]; then
  if [[ -z "${TF_VAR_auth_password:-}" ]] && ! grep -rlqs '^[[:space:]]*auth_password[[:space:]]*=' -- *.tfvars *.auto.tfvars 2>/dev/null; then
    log "==> auth_password is not set via TF_VAR_auth_password or a *.tfvars file."
    read -r -s -p "Enter a login password for the app (input hidden): " AUTH_PASSWORD_INPUT
    echo
    [[ -n "$AUTH_PASSWORD_INPUT" ]] || fail "A non-empty auth_password is required."
    export TF_VAR_auth_password="$AUTH_PASSWORD_INPUT"
    unset AUTH_PASSWORD_INPUT
    log "    Password captured for this run only (not written to disk)."
  fi
fi

# ---------- Terraform ----------

log "==> terraform init"
terraform init -input=false 2>&1 | tee -a "$RUN_LOG"

if [[ "$ACTION" == "destroy" ]]; then
  log "==> terraform plan -destroy"
  terraform plan -destroy -input=false -out="$PLAN_FILE" 2>&1 | tee -a "$RUN_LOG"

  log ""
  log "This will DELETE the EC2 instance and its EBS volume — including the"
  log "SQLite database on it — plus both Lambdas, the API Gateway domain,"
  log "and the ACM certificate. Back it up first if you haven't:"
  log "  see ../k8s/README.md#7-backing-up-the-data"

  if [[ "$FORCE_DESTROY" -eq 0 ]]; then
    read -r -p "Type 'destroy' to proceed: " CONFIRM
    [[ "$CONFIRM" == "destroy" ]] || fail "Aborted — confirmation did not match."
  else
    log "--force-destroy given, skipping confirmation."
  fi

  log "==> terraform apply (destroy plan)"
  terraform apply -input=false "$PLAN_FILE" 2>&1 | tee -a "$RUN_LOG"
  log "==> Destroy complete."
  exit 0
fi

log "==> terraform validate"
terraform validate 2>&1 | tee -a "$RUN_LOG"

log "==> terraform plan"
terraform plan -input=false -out="$PLAN_FILE" 2>&1 | tee -a "$RUN_LOG"

if [[ "$PLAN_ONLY" -eq 1 ]]; then
  log "==> --plan-only given, stopping before apply. Plan saved at: $PLAN_FILE"
  exit 0
fi

if [[ "$AUTO_APPROVE" -eq 0 ]]; then
  read -r -p "Apply the plan above? Type 'yes' to continue: " CONFIRM
  [[ "$CONFIRM" == "yes" ]] || fail "Aborted — confirmation did not match."
fi

log "==> terraform apply"
terraform apply -input=false "$PLAN_FILE" 2>&1 | tee -a "$RUN_LOG"

log "==> Apply complete. Outputs:"
terraform output 2>&1 | tee -a "$RUN_LOG"

log ""
log "First boot takes a few minutes after this point — EC2 boots, then"
log "user_data installs k3s and pulls the container image before the app"
log "is actually reachable. If the URL above 404s or times out at first,"
log "give it 2-5 minutes and try again."
