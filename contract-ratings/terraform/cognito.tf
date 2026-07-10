# Reuses the existing User Pool (from os_alerts) via var.cognito_user_pool_id
# rather than creating a new pool -- this app just gets its own App Client
# inside it, scoped for direct SRP sign-in (no Hosted UI/OAuth redirect
# needed) with no client secret, since a browser SPA can't keep one.
resource "aws_cognito_user_pool_client" "spa" {
  name         = "contract-ratings-spa"
  user_pool_id = var.cognito_user_pool_id

  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  access_token_validity  = 1
  id_token_validity      = 1
  refresh_token_validity = 30

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  prevent_user_existence_errors = "ENABLED"
}
