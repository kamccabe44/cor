data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }

  filter {
    name   = "default-for-az"
    values = ["true"]
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
  subnet_id = data.aws_subnets.default.ids[0]
}
