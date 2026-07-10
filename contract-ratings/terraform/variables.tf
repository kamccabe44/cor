variable "aws_region" {
  description = "AWS region to deploy DynamoDB, Lambda, and API Gateway into."
  type        = string
  default     = "us-east-1"
}

variable "root_domain" {
  description = "Root domain already hosted in Route53 in this account, e.g. 1136mpco.com (no trailing dot)."
  type        = string
  default     = "1136mpco.com"
}

variable "subdomain" {
  description = "Subdomain label the app is served on, e.g. cor for cor.1136mpco.com. This stack takes over cor.1136mpco.com from the old EC2/k3s deployment in ../../terraform — see README.md for the migration steps."
  type        = string
  default     = "cor"
}

variable "route53_zone_id" {
  description = "Override the Route53 hosted zone ID instead of looking it up by root_domain. Leave blank to look it up."
  type        = string
  default     = ""
}

variable "cognito_user_pool_id" {
  description = "Existing Cognito User Pool ID to authenticate against (e.g. the pool already used by os_alerts), formatted like us-east-1_XXXXXXXXX. This stack creates its own App Client inside this pool — it does not create or modify the pool itself."
  type        = string
}

variable "tags" {
  description = "Common tags applied to all resources."
  type        = map(string)
  default = {
    Project = "contract-ratings"
  }
}
