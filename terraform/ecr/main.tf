# ── Shared ECR repository (standalone) ────────────────────────────────────────
# Managed on its own so it survives teardown of any app stack. Not required by
# the current k3s deployments (they build images locally and import into k3s),
# but kept available for pushing/pulling the app image when wanted.

terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.82"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "ecr_repo_name" {
  type    = string
  default = "cor"
}

resource "aws_ecr_repository" "app" {
  name                 = var.ecr_repo_name
  image_tag_mutability = "MUTABLE"
  # force_delete = false so a stray `terraform destroy` can't wipe a repo that
  # still holds images — protect the thing we're deliberately keeping.
  force_delete = false

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = { Name = var.ecr_repo_name }
}

resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name
  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 10
        }
        action = { type = "expire" }
      }
    ]
  })
}

output "repository_url" {
  value = aws_ecr_repository.app.repository_url
}
