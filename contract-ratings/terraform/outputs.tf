output "app_url" {
  value = "https://${local.fqdn}"
}

output "frontend_bucket" {
  value = aws_s3_bucket.frontend.id
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.this.id
}

output "api_endpoint" {
  value = aws_apigatewayv2_api.this.api_endpoint
}

output "cognito_user_pool_id" {
  value = var.cognito_user_pool_id
}

output "cognito_client_id" {
  value = aws_cognito_user_pool_client.spa.id
}

output "aws_region" {
  value = var.aws_region
}

output "frontend_env_reminder" {
  value = "Before building the frontend, generate contract-ratings/frontend/.env.production from these outputs (deploy.sh does this automatically): VITE_AWS_REGION, VITE_COGNITO_USER_POOL_ID, VITE_COGNITO_CLIENT_ID."
}
