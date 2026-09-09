data "aws_iam_policy_document" "ecs_tasks_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# The execution role belongs to the ECS agent, not the application: it pulls the
# image, resolves secrets and writes logs before the container starts.
resource "aws_iam_role" "execution" {
  name               = "${local.name}-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json
}

resource "aws_iam_role_policy_attachment" "execution_managed" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "execution_secrets" {
  statement {
    sid     = "ReadInjectedSecrets"
    actions = ["secretsmanager:GetSecretValue"]

    resources = [
      aws_secretsmanager_secret.app.arn,
      aws_secretsmanager_secret.database.arn,
      aws_secretsmanager_secret.broker.arn,
    ]
  }
}

resource "aws_iam_role_policy" "execution_secrets" {
  name   = "read-secrets"
  role   = aws_iam_role.execution.id
  policy = data.aws_iam_policy_document.execution_secrets.json
}

# The task role is what the application code itself can do. Only the API touches
# S3, so only its role gets those permissions - a compromised worker cannot read
# customer documents.
resource "aws_iam_role" "task" {
  for_each = var.services

  name               = "${local.name}-${each.key}-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json
}

data "aws_iam_policy_document" "api_uploads" {
  statement {
    sid       = "ReadWriteUploads"
    actions   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:AbortMultipartUpload"]
    resources = ["${aws_s3_bucket.uploads.arn}/*"]
  }

  statement {
    sid       = "ListUploadsBucket"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.uploads.arn]
  }
}

resource "aws_iam_role_policy" "api_uploads" {
  name   = "uploads-bucket"
  role   = aws_iam_role.task["api"].id
  policy = data.aws_iam_policy_document.api_uploads.json
}

# Lets `aws ecs execute-command` open a shell in a running task, which is the
# only practical way to inspect a private-subnet container.
data "aws_iam_policy_document" "task_exec_command" {
  statement {
    sid = "SSMSessionChannel"

    actions = [
      "ssmmessages:CreateControlChannel",
      "ssmmessages:CreateDataChannel",
      "ssmmessages:OpenControlChannel",
      "ssmmessages:OpenDataChannel",
    ]

    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "task_exec_command" {
  for_each = var.services

  name   = "ecs-exec"
  role   = aws_iam_role.task[each.key].id
  policy = data.aws_iam_policy_document.task_exec_command.json
}
