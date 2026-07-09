#!/usr/bin/env bash
# Build the Docker image and push it to ECR.
# Run this from the repo root before (or after) terraform apply.
#
# Usage:
#   ./scripts/build_and_push.sh                      # push :latest
#   ./scripts/build_and_push.sh 20260629-1            # push specific tag
#   IMAGE_TAG=abc ./scripts/build_and_push.sh         # tag via env var
#
# Prerequisites: docker, aws CLI, and valid AWS credentials (us-east-1).

set -euo pipefail

AWS_REGION="${AWS_REGION:-us-east-1}"
ECR_REPO="${ECR_REPO:-cor}"
AWS_ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
IMAGE_TAG="${1:-${IMAGE_TAG:-latest}}"
FULL_IMAGE="${ECR_REGISTRY}/${ECR_REPO}:${IMAGE_TAG}"

echo "==> Authenticating with ECR"
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ECR_REGISTRY"

echo "==> Building image: $FULL_IMAGE"
docker build --platform linux/amd64 -t "$FULL_IMAGE" .

echo "==> Pushing image: $FULL_IMAGE"
docker push "$FULL_IMAGE"

# Also tag/push :latest if a specific tag was requested.
if [ "$IMAGE_TAG" != "latest" ]; then
  LATEST_IMAGE="${ECR_REGISTRY}/${ECR_REPO}:latest"
  echo "==> Also tagging as :latest"
  docker tag "$FULL_IMAGE" "$LATEST_IMAGE"
  docker push "$LATEST_IMAGE"
fi

echo ""
echo "==> Done! Image pushed:"
echo "    $FULL_IMAGE"
