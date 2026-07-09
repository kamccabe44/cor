data "aws_vpc" "default" {
  count   = var.vpc_id == "" ? 1 : 0
  default = true
}

locals {
  vpc_id = var.vpc_id != "" ? var.vpc_id : data.aws_vpc.default[0].id
}

# Auto-pick a subnet only when subnet_id isn't given explicitly. Filters on
# map-public-ip-on-launch as a proxy for "this is a public subnet" — good
# enough for a typical VPC, but not a guarantee of an Internet Gateway
# route. If it picks wrong (or finds none), set subnet_id explicitly.
data "aws_subnets" "public_candidates" {
  count = var.subnet_id == "" ? 1 : 0

  filter {
    name   = "vpc-id"
    values = [local.vpc_id]
  }

  filter {
    name   = "map-public-ip-on-launch"
    values = ["true"]
  }

  lifecycle {
    postcondition {
      condition     = length(self.ids) > 0
      error_message = "No subnet with map_public_ip_on_launch=true was found in VPC ${local.vpc_id}. Run `aws ec2 describe-subnets --filters Name=vpc-id,Values=${local.vpc_id} --output table` to see what's available, then set subnet_id explicitly (e.g. TF_VAR_subnet_id=subnet-xxxx, or ./deploy.sh --subnet-id subnet-xxxx)."
    }
  }
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

data "aws_route53_zone" "root" {
  count        = var.route53_zone_id == "" ? 1 : 0
  name         = "${var.root_domain}."
  private_zone = false
}

locals {
  zone_id   = var.route53_zone_id != "" ? var.route53_zone_id : data.aws_route53_zone.root[0].zone_id
  fqdn      = "${var.subdomain}.${var.root_domain}"
  subnet_id = var.subnet_id != "" ? var.subnet_id : data.aws_subnets.public_candidates[0].ids[0]
}
