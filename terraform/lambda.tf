locals {
  instance_arn = "arn:aws:ec2:${var.aws_region}:${data.aws_caller_identity.current.account_id}:instance/${aws_instance.cor.id}"
}

data "archive_file" "proxy" {
  type        = "zip"
  source_dir  = "${path.module}/lambda/proxy"
  output_path = "${path.module}/.build/proxy.zip"
}

data "archive_file" "idle_stopper" {
  type        = "zip"
  source_dir  = "${path.module}/lambda/idle-stopper"
  output_path = "${path.module}/.build/idle-stopper.zip"
}

data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

# ---------- Proxy / auto-start Lambda ----------

resource "aws_iam_role" "proxy" {
  name               = "cor-tracker-proxy-lambda"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
  tags               = var.tags
}

resource "aws_iam_role_policy_attachment" "proxy_logs" {
  role       = aws_iam_role.proxy.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "proxy_ec2" {
  statement {
    sid       = "DescribeInstances"
    actions   = ["ec2:DescribeInstances"]
    resources = ["*"] # DescribeInstances does not support resource-level restriction
  }

  statement {
    sid       = "StartAndTagThisInstance"
    actions   = ["ec2:StartInstances", "ec2:CreateTags"]
    resources = [local.instance_arn]
  }
}

resource "aws_iam_role_policy" "proxy_ec2" {
  name   = "ec2-start-and-tag"
  role   = aws_iam_role.proxy.id
  policy = data.aws_iam_policy_document.proxy_ec2.json
}

resource "aws_cloudwatch_log_group" "proxy" {
  name              = "/aws/lambda/cor-tracker-proxy"
  retention_in_days = 14
  tags              = var.tags
}

resource "aws_lambda_function" "proxy" {
  function_name    = "cor-tracker-proxy"
  role             = aws_iam_role.proxy.arn
  handler          = "index.handler"
  runtime          = "nodejs22.x"
  filename         = data.archive_file.proxy.output_path
  source_code_hash = data.archive_file.proxy.output_base64sha256
  timeout          = 10
  memory_size      = 256

  environment {
    variables = {
      INSTANCE_ID     = aws_instance.cor.id
      EC2_HOST        = aws_eip.cor.public_ip
      APP_HOST_HEADER = local.fqdn
    }
  }

  depends_on = [aws_cloudwatch_log_group.proxy]
  tags       = var.tags
}

# ---------- Idle-stopper Lambda ----------

resource "aws_iam_role" "idle_stopper" {
  name               = "cor-tracker-idle-stopper-lambda"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
  tags               = var.tags
}

resource "aws_iam_role_policy_attachment" "idle_stopper_logs" {
  role       = aws_iam_role.idle_stopper.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "idle_stopper_ec2" {
  statement {
    sid       = "DescribeInstances"
    actions   = ["ec2:DescribeInstances"]
    resources = ["*"]
  }

  statement {
    sid       = "StopThisInstance"
    actions   = ["ec2:StopInstances"]
    resources = [local.instance_arn]
  }
}

resource "aws_iam_role_policy" "idle_stopper_ec2" {
  name   = "ec2-stop"
  role   = aws_iam_role.idle_stopper.id
  policy = data.aws_iam_policy_document.idle_stopper_ec2.json
}

resource "aws_cloudwatch_log_group" "idle_stopper" {
  name              = "/aws/lambda/cor-tracker-idle-stopper"
  retention_in_days = 14
  tags              = var.tags
}

resource "aws_lambda_function" "idle_stopper" {
  function_name    = "cor-tracker-idle-stopper"
  role             = aws_iam_role.idle_stopper.arn
  handler          = "index.handler"
  runtime          = "nodejs22.x"
  filename         = data.archive_file.idle_stopper.output_path
  source_code_hash = data.archive_file.idle_stopper.output_base64sha256
  timeout          = 10
  memory_size      = 128

  environment {
    variables = {
      INSTANCE_ID  = aws_instance.cor.id
      IDLE_MINUTES = tostring(var.idle_shutdown_minutes)
    }
  }

  depends_on = [aws_cloudwatch_log_group.idle_stopper]
  tags       = var.tags
}
