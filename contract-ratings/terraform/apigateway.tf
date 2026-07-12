resource "aws_apigatewayv2_api" "this" {
  name          = "contract-ratings"
  protocol_type = "HTTP"
  tags          = var.tags
}

resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id           = aws_apigatewayv2_api.this.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "cognito-jwt"

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.spa.id]
    issuer   = local.cognito_issuer
  }
}

resource "aws_apigatewayv2_integration" "api" {
  api_id                 = aws_apigatewayv2_api.this.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.api.invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds   = 10000
}

locals {
  api_routes = [
    "GET /api/contractors/{id}",
    "PUT /api/contractors/{id}",
    "DELETE /api/contractors/{id}",
    "POST /api/contractors/{id}/rating",
    "GET /api/contracts",
    "POST /api/contracts",
    "GET /api/contracts/{id}",
    "PUT /api/contracts/{id}",
    "DELETE /api/contracts/{id}",
    "POST /api/contracts/{id}/rating",
    "GET /api/contracts/{id}/contractors",
    "POST /api/contracts/{id}/contractors",
  ]
}

resource "aws_apigatewayv2_route" "api" {
  for_each = toset(local.api_routes)

  api_id             = aws_apigatewayv2_api.this.id
  route_key          = each.value
  target             = "integrations/${aws_apigatewayv2_integration.api.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.this.id
  name        = "$default"
  auto_deploy = true
  tags        = var.tags
}

resource "aws_lambda_permission" "apigw_invoke_api" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.this.execution_arn}/*/*"
}
