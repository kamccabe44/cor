#!/usr/bin/env bash
# Build the contract-ratings image and push it + the Helm chart (as an OCI
# artifact) to ECR, so the os_alerts COR add-on provisioner can deploy per-tenant
# instances. Image and chart share one ECR repo ("contract-ratings"): the image
# uses a moving tag (e.g. latest / a git sha), the chart uses its Chart version
# (e.g. 0.1.0), so they never collide.
#
# Prereqs: docker, helm, and aws CLI with permission to push to ECR.
# The ECR repo is created by deploy/k3s-demo/cor.tf (or auto-created below).
#
#   AWS_REGION=us-east-1 IMAGE_TAG=latest ./scripts/publish-ecr.sh
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
REPO="contract-ratings"
TAG="${IMAGE_TAG:-latest}"

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"                     # contract-ratings/
CHART_DIR="$ROOT/helm/contract-ratings"

ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
REGISTRY="${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com"

echo "== ECR login (${REGISTRY}) =="
aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin "$REGISTRY"
aws ecr describe-repositories --repository-names "$REPO" --region "$REGION" >/dev/null 2>&1 \
  || aws ecr create-repository --repository-name "$REPO" --region "$REGION" >/dev/null

echo "== Build + push image ${REGISTRY}/${REPO}:${TAG} =="
# Build from the repo root so the Dockerfile's COPY paths (server/, api/,
# frontend/) resolve — same as `docker build ... contract-ratings`.
docker build --platform linux/amd64 -t "${REGISTRY}/${REPO}:${TAG}" "$ROOT"
docker push "${REGISTRY}/${REPO}:${TAG}"

echo "== Package + push Helm chart =="
helm registry login "$REGISTRY" -u AWS -p "$(aws ecr get-login-password --region "$REGION")"
CHART_VER="$(awk '/^version:/{print $2; exit}' "$CHART_DIR/Chart.yaml")"
helm package "$CHART_DIR" -d /tmp
helm push "/tmp/${REPO}-${CHART_VER}.tgz" "oci://${REGISTRY}"

cat <<EOF

Done. Configure the os_alerts (alerts-training) chart values:

  cor.imageRepository = ${REGISTRY}/${REPO}
  cor.imageTag        = ${TAG}
  cor.helmChartRef    = oci://${REGISTRY}/${REPO}
  cor.helmChartVersion= ${CHART_VER}
EOF
