resource "aws_apigatewayv2_api" "cor" {
  name          = "cor-tracker"
  protocol_type = "HTTP"
  tags          = var.tags
}

resource "aws_apigatewayv2_integration" "proxy" {
  api_id                 = aws_apigatewayv2_api.cor.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.proxy.invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds   = 29000
}

resource "aws_apigatewayv2_route" "root" {
  api_id    = aws_apigatewayv2_api.cor.id
  route_key = "ANY /"
  target    = "integrations/${aws_apigatewayv2_integration.proxy.id}"
}

resource "aws_apigatewayv2_route" "proxy" {
  api_id    = aws_apigatewayv2_api.cor.id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.proxy.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.cor.id
  name        = "$default"
  auto_deploy = true
  tags        = var.tags
}

resource "aws_lambda_permission" "apigw_invoke_proxy" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.proxy.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.cor.execution_arn}/*/*"
}

resource "aws_apigatewayv2_domain_name" "cor" {
  domain_name = local.fqdn

  domain_name_configuration {
    certificate_arn = aws_acm_certificate_validation.cor.certificate_arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }

  tags = var.tags
}

resource "aws_apigatewayv2_api_mapping" "cor" {
  api_id      = aws_apigatewayv2_api.cor.id
  domain_name = aws_apigatewayv2_domain_name.cor.id
  stage       = aws_apigatewayv2_stage.default.id
}

resource "aws_route53_record" "cor" {
  zone_id = local.zone_id
  name    = local.fqdn
  type    = "A"

  alias {
    name                   = aws_apigatewayv2_domain_name.cor.domain_name_configuration[0].target_domain_name
    zone_id                = aws_apigatewayv2_domain_name.cor.domain_name_configuration[0].hosted_zone_id
    evaluate_target_health = false
  }
}
