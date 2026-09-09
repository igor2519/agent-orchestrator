# State is kept remotely so more than one person - and CI - can apply safely.
# The bucket and lock table are deliberately not managed here: Terraform cannot
# create the store it needs before it has one. Create them once per account, then
# `terraform init -backend-config=environments/<env>.backend.hcl`.
#
#   aws s3api create-bucket --bucket <state-bucket> --region <region> \
#     --create-bucket-configuration LocationConstraint=<region>
#   aws s3api put-bucket-versioning --bucket <state-bucket> \
#     --versioning-configuration Status=Enabled
#   aws s3api put-bucket-encryption --bucket <state-bucket> \
#     --server-side-encryption-configuration \
#     '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
#   aws dynamodb create-table --table-name <lock-table> \
#     --attribute-definitions AttributeName=LockID,AttributeType=S \
#     --key-schema AttributeName=LockID,KeyType=HASH \
#     --billing-mode PAY_PER_REQUEST
#
# State contains generated passwords in plain text. Keep the bucket private,
# encrypted and versioned.

terraform {
  backend "s3" {
    key     = "agent-orchestrator/terraform.tfstate"
    encrypt = true
    # bucket, region and dynamodb_table come from the -backend-config file.
  }
}
