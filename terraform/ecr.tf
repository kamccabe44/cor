# Looks up the ECR repository created by the standalone terraform/ecr/
# module -- that module is applied separately (see its own header comment
# and terraform/README.md) so the repo and its images survive a `destroy`
# of this stack. This fails clearly at plan time if it hasn't been
# applied yet: "repository ... not found".
data "aws_ecr_repository" "app" {
  name = var.ecr_repo_name
}

locals {
  ecr_registry = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"

  container_image  = var.container_image != "" ? var.container_image : "${local.ecr_registry}/${var.ecr_repo_name}:latest"
  image_repository = split(":", local.container_image)[0]
  image_tag        = split(":", local.container_image)[1]
}
