data "aws_caller_identity" "current" {}

# ---------- EC2 instance role ----------

data "aws_iam_policy_document" "ec2_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ec2" {
  name               = "cor-tracker-ec2"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
  tags               = var.tags
}

resource "aws_iam_role_policy_attachment" "ec2_ssm_core" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

data "aws_iam_policy_document" "ec2_read_auth_password" {
  statement {
    sid       = "ReadAuthPasswordParameter"
    actions   = ["ssm:GetParameter"]
    resources = [aws_ssm_parameter.auth_password.arn]
  }

  statement {
    sid       = "DecryptViaSSM"
    actions   = ["kms:Decrypt"]
    resources = ["*"]
    condition {
      test     = "StringEquals"
      variable = "kms:ViaService"
      values   = ["ssm.${var.aws_region}.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy" "ec2_read_auth_password" {
  name   = "read-auth-password"
  role   = aws_iam_role.ec2.id
  policy = data.aws_iam_policy_document.ec2_read_auth_password.json
}

data "aws_iam_policy_document" "ec2_read_helm_chart" {
  statement {
    sid       = "ListChartBucket"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.helm_chart.arn]
  }

  statement {
    sid       = "ReadChartObject"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.helm_chart.arn}/*"]
  }
}

resource "aws_iam_role_policy" "ec2_read_helm_chart" {
  name   = "read-helm-chart"
  role   = aws_iam_role.ec2.id
  policy = data.aws_iam_policy_document.ec2_read_helm_chart.json
}

data "aws_iam_policy_document" "ec2_pull_ecr" {
  statement {
    sid       = "GetAuthToken"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"] # ECR API requirement -- this action does not support resource-level restriction
  }

  statement {
    sid = "PullThisRepo"
    actions = [
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchCheckLayerAvailability",
    ]
    resources = [data.aws_ecr_repository.app.arn]
  }
}

resource "aws_iam_role_policy" "ec2_pull_ecr" {
  name   = "ecr-pull"
  role   = aws_iam_role.ec2.id
  policy = data.aws_iam_policy_document.ec2_pull_ecr.json
}

data "aws_iam_policy_document" "ec2_tag_self" {
  statement {
    sid       = "TagSelfForActivityTracking"
    actions   = ["ec2:CreateTags"]
    resources = [local.instance_arn]
  }
}

resource "aws_iam_role_policy" "ec2_tag_self" {
  name   = "tag-self"
  role   = aws_iam_role.ec2.id
  policy = data.aws_iam_policy_document.ec2_tag_self.json
}

resource "aws_iam_instance_profile" "ec2" {
  name = "cor-tracker-ec2"
  role = aws_iam_role.ec2.name
}
