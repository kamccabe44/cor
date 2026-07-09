resource "aws_ssm_parameter" "auth_password" {
  name        = "/cor-tracker/auth_password"
  description = "Shared login password consumed by the EC2 instance's user_data to create the k8s cor-auth secret."
  type        = "SecureString"
  value       = var.auth_password
  tags        = var.tags
}
