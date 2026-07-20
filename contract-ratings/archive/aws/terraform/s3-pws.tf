# Private bucket holding uploaded PWS documents. Nothing is public: the
# browser uploads straight to S3 with a short-lived presigned PUT URL the
# Lambda mints, and downloads via a presigned GET URL. The Lambda's role
# (see lambda.tf) is what signs those URLs, so it needs Put/Get/Delete on
# this bucket.
resource "aws_s3_bucket" "pws" {
  bucket        = "contract-ratings-pws-${data.aws_caller_identity.current.account_id}"
  force_destroy = true
  tags          = var.tags
}

resource "aws_s3_bucket_public_access_block" "pws" {
  bucket                  = aws_s3_bucket.pws.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# The browser PUTs the file directly to the S3 host (a different origin
# from the app's custom domain), so the bucket must allow cross-origin
# PUT/GET from the site. Without this, the upload fails the CORS preflight.
resource "aws_s3_bucket_cors_configuration" "pws" {
  bucket = aws_s3_bucket.pws.id

  cors_rule {
    allowed_methods = ["PUT", "GET"]
    allowed_origins = ["https://${local.fqdn}"]
    allowed_headers = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}
