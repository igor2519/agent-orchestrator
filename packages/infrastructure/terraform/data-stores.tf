# --- Postgres ---

resource "random_password" "database" {
  length  = 32
  special = false # RDS rejects several punctuation characters in master passwords
}

resource "aws_db_subnet_group" "main" {
  name       = local.name
  subnet_ids = aws_subnet.private[*].id

  tags = { Name = local.name }
}

resource "aws_db_instance" "main" {
  identifier     = local.name
  engine         = "postgres"
  engine_version = "16"

  instance_class        = var.db_instance_class
  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_allocated_storage * 4
  storage_type          = "gp3"
  storage_encrypted     = true

  # Only the API's database is created here. The three worker databases are
  # created by the bootstrap task in ecs-bootstrap.tf, mirroring the init script
  # the local Docker Compose stack runs.
  db_name  = local.service_databases["api"]
  username = "postgres"
  password = random_password.database.result
  port     = 5432

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.database.id]
  multi_az               = var.db_multi_az
  publicly_accessible    = false

  backup_retention_period = var.environment == "prod" ? 30 : 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  deletion_protection       = var.db_deletion_protection
  skip_final_snapshot       = !var.db_deletion_protection
  final_snapshot_identifier = var.db_deletion_protection ? "${local.name}-final" : null

  performance_insights_enabled    = true
  enabled_cloudwatch_logs_exports = ["postgresql"]

  # Minor versions are picked up in the maintenance window; major upgrades stay
  # deliberate, because they can require migration changes.
  auto_minor_version_upgrade = true
  apply_immediately          = var.environment != "prod"

  tags = { Name = local.name }
}

# --- RabbitMQ ---

resource "random_password" "broker" {
  length  = 32
  special = false # Amazon MQ rejects commas, colons, equals signs and spaces
}

resource "aws_mq_broker" "main" {
  broker_name = local.name

  engine_type        = "RabbitMQ"
  engine_version     = "3.13"
  host_instance_type = var.mq_instance_type
  deployment_mode    = var.mq_deployment_mode

  # A private broker has no public endpoint; the management console is reachable
  # only from inside the VPC.
  publicly_accessible = false
  subnet_ids          = var.mq_deployment_mode == "SINGLE_INSTANCE" ? [aws_subnet.private[0].id] : slice(aws_subnet.private[*].id, 0, 2)
  security_groups     = [aws_security_group.broker.id]

  user {
    username = "orchestrator"
    password = random_password.broker.result
  }

  maintenance_window_start_time {
    day_of_week = "MONDAY"
    time_of_day = "04:00"
    time_zone   = "UTC"
  }

  auto_minor_version_upgrade = true
  apply_immediately          = var.environment != "prod"

  tags = { Name = local.name }
}

# --- Uploads bucket ---

resource "aws_s3_bucket" "uploads" {
  bucket = "${local.name}-uploads"

  tags = { Name = "${local.name}-uploads" }
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Uploaded documents are inputs to a pipeline, not archives. Old versions and
# aborted multipart uploads are cleaned up so they stop accruing cost.
resource "aws_s3_bucket_lifecycle_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    id     = "expire-noncurrent-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }

  rule {
    id     = "abort-incomplete-uploads"
    status = "Enabled"

    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}
