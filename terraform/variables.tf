variable "aws_region" {
  description = "AWS region to deploy into. The ACM certificate and API Gateway custom domain must be in this same region (REGIONAL endpoint, not edge-optimized)."
  type        = string
  default     = "us-east-1"
}

variable "root_domain" {
  description = "Root domain already hosted in Route53 in this account, e.g. 1136mpco.com (no trailing dot)."
  type        = string
  default     = "1136mpco.com"
}

variable "subdomain" {
  description = "Subdomain label the app is served on, e.g. cor for cor.1136mpco.com."
  type        = string
  default     = "cor"
}

variable "route53_zone_id" {
  description = "Override the Route53 hosted zone ID instead of looking it up by root_domain. Leave blank to look it up."
  type        = string
  default     = ""
}

variable "vpc_id" {
  description = "Existing VPC to launch the instance in. Leave blank to use the account's default VPC — but many accounts don't have one anymore, in which case this must be set. List candidates with: aws ec2 describe-vpcs --query 'Vpcs[].{ID:VpcId,CIDR:CidrBlock,IsDefault:IsDefault,Name:Tags[?Key==`Name`]|[0].Value}' --output table"
  type        = string
  default     = ""
}

variable "subnet_id" {
  description = "Existing subnet (within vpc_id) to launch the instance in. Must have a route to an Internet Gateway — the instance needs outbound internet to install k3s and pull the container image. Leave blank to auto-pick a subnet in vpc_id with map_public_ip_on_launch=true."
  type        = string
  default     = ""
}

variable "instance_type" {
  description = "EC2 instance size. t3.small (2GB RAM) is the practical minimum for k3s + the app container; t3.micro can be tight."
  type        = string
  default     = "t3.small"
}

variable "root_volume_size_gb" {
  description = "Root EBS volume size in GB. Holds the OS, k3s, the container image, and the SQLite data file."
  type        = number
  default     = 20
}

variable "container_image" {
  description = "Container image reference as repository:tag. Split apart in ec2.tf and passed to Helm as image.repository/image.tag when user_data runs `helm upgrade --install`."
  type        = string
  default     = "ghcr.io/kamccabe44/cor:latest"
}

variable "auth_password" {
  description = "Shared login password for the app (see AUTH_PASSWORD in the app README). Stored as an SSM SecureString, never written to state in plaintext beyond the parameter resource itself. Set via TF_VAR_auth_password or a gitignored .tfvars file — do not hardcode it."
  type        = string
  sensitive   = true
}

variable "idle_shutdown_minutes" {
  description = "Stop the EC2 instance after this many minutes with no proxied request."
  type        = number
  default     = 20
}

variable "idle_check_rate_minutes" {
  description = "How often the idle-stopper Lambda runs to check for inactivity. Should be meaningfully smaller than idle_shutdown_minutes."
  type        = number
  default     = 5
}

variable "ssh_key_name" {
  description = "Existing EC2 key pair name for SSH access. Leave blank to rely on SSM Session Manager only (no inbound port 22 needed)."
  type        = string
  default     = ""
}

variable "tags" {
  description = "Common tags applied to all resources."
  type        = map(string)
  default = {
    Project = "cor-tracker"
  }
}
