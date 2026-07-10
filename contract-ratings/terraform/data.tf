data "aws_caller_identity" "current" {}

data "aws_route53_zone" "root" {
  count        = var.route53_zone_id == "" ? 1 : 0
  name         = "${var.root_domain}."
  private_zone = false
}

data "aws_cognito_user_pool" "existing" {
  user_pool_id = var.cognito_user_pool_id
}

locals {
  zone_id = var.route53_zone_id != "" ? var.route53_zone_id : data.aws_route53_zone.root[0].zone_id
  fqdn    = "${var.subdomain}.${var.root_domain}"

  cognito_issuer = "https://cognito-idp.${var.aws_region}.amazonaws.com/${var.cognito_user_pool_id}"
}
