# On-demand billing throughout: this is a low-traffic internal tool, and
# pay-per-request avoids babysitting provisioned capacity for what will
# mostly be idle tables.

resource "aws_dynamodb_table" "contractors" {
  name         = "contract-ratings-contractors"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  tags = var.tags
}

resource "aws_dynamodb_table" "contracts" {
  name         = "contract-ratings-contracts"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "contractorId"
    type = "S"
  }

  global_secondary_index {
    name            = "byContractor"
    hash_key        = "contractorId"
    projection_type = "ALL"
  }

  tags = var.tags
}

# One rating per user per target (contractor or contract). targetKey is
# "CONTRACTOR#<id>" or "CONTRACT#<id>" so both share a table; userSub is
# the Cognito subject claim, giving each user exactly one upsertable
# rating per target via PutItem.
resource "aws_dynamodb_table" "ratings" {
  name         = "contract-ratings-ratings"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "targetKey"
  range_key    = "userSub"

  attribute {
    name = "targetKey"
    type = "S"
  }

  attribute {
    name = "userSub"
    type = "S"
  }

  tags = var.tags
}
