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
AUTO_TFVARS_FILE="${SCRIPT_DIR}/local.auto.tfvars"

# Remembers a value in local.auto.tfvars (gitignored -- matches *.tfvars)
# so a later run -- especially --destroy -- doesn't need the same flag
# typed again. Terraform loads *.auto.tfvars files on its own, no flag
# needed on our end either.
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

  --auto-approve    Skip the interactive confirmation before applying.
  --plan-only       Run init + plan and stop there (no apply).
  --destroy         Run 'terraform destroy' instead of apply. Always
                     asks for confirmation, even with --auto-approve.
  --force-destroy   Also skip the destroy confirmation. This deletes
                     the EC2 instance and its EBS volume (including the
                     SQLite database) with no prompt at all. Back up
                     your data first — see README.md#destroying.
  --log-level LVL   TF_LOG level: TRACE, DEBUG, INFO, WARN, ERROR.
                     Default: DEBUG.
  --vpc-id ID       Existing VPC to launch into (sets TF_VAR_vpc_id).
                     Needed if the account has no default VPC. List
                     candidates with:
                       aws ec2 describe-vpcs --query 'Vpcs[].{ID:VpcId,CIDR:CidrBlock,IsDefault:IsDefault,Name:Tags[?Key==`Name`]|[0].Value}' --output table
                     Remembered in local.auto.tfvars after first use, so
                     you don't need to pass it again on a later
                     apply/destroy -- delete that file to forget it.
  --subnet-id ID    Existing subnet within --vpc-id (sets TF_VAR_subnet_id).
                     Leave unset to auto-pick a public subnet in that VPC.
                     Also remembered in local.auto.tfvars.
  --ssh-key-name N  Existing EC2 key pair name. Attaches it to the
                     instance AND opens port 22 to it (both are gated on
                     this one value -- an open port 22 with no key
                     attached wouldn't let you in anyway). Leave unset to
                     rely on SSM Session Manager only (no port 22, no
                     key needed -- see the ssm_session_command output).
                     Also remembered in local.auto.tfvars.
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
    --vpc-id)
      export TF_VAR_vpc_id="${2:-}"
      [[ -n "$TF_VAR_vpc_id" ]] || { echo "--vpc-id needs a value" >&2; exit 1; }
      persist_tfvar vpc_id "$TF_VAR_vpc_id"
      shift
      ;;
    --subnet-id)
      export TF_VAR_subnet_id="${2:-}"
      [[ -n "$TF_VAR_subnet_id" ]] || { echo "--subnet-id needs a value" >&2; exit 1; }
      persist_tfvar subnet_id "$TF_VAR_subnet_id"
      shift
      ;;
    --ssh-key-name)
      export TF_VAR_ssh_key_name="${2:-}"
      [[ -n "$TF_VAR_ssh_key_name" ]] || { echo "--ssh-key-name needs a value" >&2; exit 1; }
      persist_tfvar ssh_key_name "$TF_VAR_ssh_key_name"
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
[[ -n "${TF_VAR_vpc_id:-}" ]] && log "    vpc_id override:      $TF_VAR_vpc_id (this run's flag)"
[[ -n "${TF_VAR_subnet_id:-}" ]] && log "    subnet_id override:   $TF_VAR_subnet_id (this run's flag)"
[[ -n "${TF_VAR_ssh_key_name:-}" ]] && log "    ssh_key_name override: $TF_VAR_ssh_key_name (this run's flag)"
if [[ -f "$AUTO_TFVARS_FILE" ]]; then
  log "    Also using remembered values from local.auto.tfvars:"
  sed 's/^/      /' "$AUTO_TFVARS_FILE" | tee -a "$RUN_LOG"
fi

# ---------- Preflight ----------

log "==> Checking required tools"
command -v terraform >/dev/null 2>&1 || fail "terraform not found on PATH. Install: https://developer.hashicorp.com/terraform/install"
command -v aws >/dev/null 2>&1 || fail "AWS CLI not found on PATH. Install: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
log "    terraform: $(terraform version -json | grep -o '"terraform_version": *"[^"]*"' | cut -d'"' -f4)"
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

  ECR_REPO_NAME="${TF_VAR_ecr_repo_name:-cor}"
  ECR_REGION="${TF_VAR_aws_region:-us-east-1}"
  log "==> Checking ECR repository exists: $ECR_REPO_NAME ($ECR_REGION)"
  if ! aws ecr describe-repositories --repository-names "$ECR_REPO_NAME" --region "$ECR_REGION" >>"$RUN_LOG" 2>&1; then
    fail "ECR repository '$ECR_REPO_NAME' not found in $ECR_REGION. This stack pulls the app image from ECR by default and expects it to already exist (it's managed separately so it survives a destroy of this stack). Create it first: cd ecr && terraform init && terraform apply -var ecr_repo_name=$ECR_REPO_NAME -var aws_region=$ECR_REGION -- then push an image from the repo root (./scripts/build_and_push.sh) before applying here."
  fi
fi

if [[ "$ACTION" == "destroy" && -z "${TF_VAR_auth_password:-}" ]]; then
  # Terraform requires every variable without a default to have a value
  # even for a -destroy plan (it still evaluates the full configuration,
  # it just won't create anything) -- but the actual value is irrelevant
  # here, nothing new gets built with it. Skip bothering the user for a
  # password they're about to throw away.
  export TF_VAR_auth_password="destroying"
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
  log "  see README.md#destroying"

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
