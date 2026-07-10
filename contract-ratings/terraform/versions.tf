terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# CloudFront requires ACM certificates to exist in us-east-1 specifically,
# regardless of which region the distribution's origins live in. Kept as
# an explicit alias so this doesn't silently break if aws_region is ever
# set to something other than us-east-1.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}
