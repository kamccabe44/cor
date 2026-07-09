resource "aws_s3_bucket" "helm_chart" {
  bucket        = "cor-tracker-helm-chart-${data.aws_caller_identity.current.account_id}"
  force_destroy = true
  tags          = var.tags
}

resource "aws_s3_bucket_public_access_block" "helm_chart" {
  bucket                  = aws_s3_bucket.helm_chart.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

data "archive_file" "helm_chart" {
  type        = "zip"
  source_dir  = "${path.module}/../helm/cor-tracker"
  output_path = "${path.module}/.build/cor-tracker-chart.zip"
}

resource "aws_s3_object" "helm_chart" {
  bucket = aws_s3_bucket.helm_chart.id
  key    = "cor-tracker-chart.zip"
  source = data.archive_file.helm_chart.output_path
  etag   = data.archive_file.helm_chart.output_md5
}
