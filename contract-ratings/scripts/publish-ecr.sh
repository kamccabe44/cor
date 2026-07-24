#!/usr/bin/env bash
# Build the contract-ratings image and push it + the Helm chart (as an OCI
# artifact) to ECR, so the os_alerts COR add-on provisioner can deploy per-tenant
# instances. Image and chart share one ECR repo ("contract-ratings"): the image
# is tagged with the git short SHA it was built from (immutable — so a deployed
# pod's image tag identifies the exact code, and a stale checkout can't silently
# overwrite a good build), the chart uses its Chart version (e.g. 0.1.0), so
# they never collide.
#
# Prereqs: docker, helm, and aws CLI with permission to push to ECR.
# The ECR repo is created by deploy/k3s-demo/cor.tf (or auto-created below).
#
#   AWS_REGION=us-east-1 ./scripts/publish-ecr.sh          # tag = git short SHA
#   IMAGE_TAG=my-tag ./scripts/publish-ecr.sh              # explicit override
#
# After publishing, roll existing tenant instances to the new tag with the
# os_alerts repo's scripts/cor-update-image.sh (exact command printed below).
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
REPO="contract-ratings"

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"                     # contract-ratings/
CHART_DIR="$ROOT/deploy/helm/contract-ratings"

# Default tag: the git short SHA of HEAD, with "-dirty" appended when the
# working tree has uncommitted changes (a dirty tag is NOT reproducible —
# commit first for anything that matters).
if [[ -z "${IMAGE_TAG:-}" ]]; then
  IMAGE_TAG="$(git -C "$ROOT" rev-parse --short=12 HEAD)"
  git -C "$ROOT" diff-index --quiet HEAD -- 2>/dev/null || IMAGE_TAG="${IMAGE_TAG}-dirty"
fi
TAG="$IMAGE_TAG"

ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
REGISTRY="${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com"

echo "== ECR login (${REGISTRY}) =="
aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin "$REGISTRY"
aws ecr describe-repositories --repository-names "$REPO" --region "$REGION" >/dev/null 2>&1 \
  || aws ecr create-repository --repository-name "$REPO" --region "$REGION" >/dev/null

echo "== Build + push image ${REGISTRY}/${REPO}:${TAG} =="
# Build with the app dir as context so the Dockerfile's COPY paths (server/,
# api/, frontend/) resolve; the Dockerfile itself lives in docker/.
docker build --platform linux/amd64 -f "$ROOT/docker/Dockerfile" -t "${REGISTRY}/${REPO}:${TAG}" "$ROOT"
docker push "${REGISTRY}/${REPO}:${TAG}"

echo "== Package + push Helm chart =="
helm registry login "$REGISTRY" -u AWS -p "$(aws ecr get-login-password --region "$REGION")"
CHART_VER="$(awk '/^version:/{print $2; exit}' "$CHART_DIR/Chart.yaml")"
helm package "$CHART_DIR" -d /tmp
helm push "/tmp/${REPO}-${CHART_VER}.tgz" "oci://${REGISTRY}"

cat <<EOF

Done. Published image tag: ${TAG}

1. Roll EXISTING tenant instances to this build (from the os_alerts repo,
   on the k3s box):

     COR_HELM_CHART_REF=oci://${REGISTRY}/${REPO} \\
     COR_HELM_CHART_VERSION=${CHART_VER} \\
       ./scripts/cor-update-image.sh ${TAG}

2. Make NEW tenants provision this build — set in the os_alerts
   (alerts-training) chart values and redeploy ALERTS:

     cor.imageRepository = ${REGISTRY}/${REPO}
     cor.imageTag        = ${TAG}
     cor.helmChartRef    = oci://${REGISTRY}/${REPO}
     cor.helmChartVersion= ${CHART_VER}
EOF
