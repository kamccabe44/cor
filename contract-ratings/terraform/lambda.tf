data "archive_file" "api" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/api"
  output_path = "${path.module}/.build/api.zip"
}

resource "aws_iam_role" "api" {
  name = "contract-ratings-api-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "api_logs" {
  role       = aws_iam_role.api.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "api_dynamodb" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
      "dynamodb:Query",
      "dynamodb:Scan",
    ]
    resources = [
      aws_dynamodb_table.contractors.arn,
      "${aws_dynamodb_table.contractors.arn}/index/*",
      aws_dynamodb_table.contracts.arn,
      aws_dynamodb_table.ratings.arn,
    ]
  }
}

resource "aws_iam_role_policy" "api_dynamodb" {
  name   = "dynamodb-access"
  role   = aws_iam_role.api.id
  policy = data.aws_iam_policy_document.api_dynamodb.json
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/lambda/contract-ratings-api"
  retention_in_days = 30
  tags              = var.tags
}

resource "aws_lambda_function" "api" {
  function_name    = "contract-ratings-api"
  role             = aws_iam_role.api.arn
  handler          = "index.handler"
  runtime          = "nodejs22.x"
  timeout          = 10
  memory_size      = 256
  filename         = data.archive_file.api.output_path
  source_code_hash = data.archive_file.api.output_base64sha256

  environment {
    variables = {
      CONTRACTORS_TABLE = aws_dynamodb_table.contractors.name
      CONTRACTS_TABLE   = aws_dynamodb_table.contracts.name
      RATINGS_TABLE     = aws_dynamodb_table.ratings.name
    }
  }

  tags = var.tags

  depends_on = [aws_cloudwatch_log_group.api]
}
