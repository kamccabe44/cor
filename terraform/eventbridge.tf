resource "aws_cloudwatch_event_rule" "idle_check" {
  name                = "cor-tracker-idle-check"
  description         = "Periodically checks whether the COR Tracker EC2 instance has been idle long enough to stop."
  schedule_expression = "rate(${var.idle_check_rate_minutes} minutes)"
  tags                = var.tags
}

resource "aws_cloudwatch_event_target" "idle_check" {
  rule = aws_cloudwatch_event_rule.idle_check.name
  arn  = aws_lambda_function.idle_stopper.arn
}

resource "aws_lambda_permission" "events_invoke_idle_stopper" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.idle_stopper.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.idle_check.arn
}
