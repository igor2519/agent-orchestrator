# Secrets are generated here and injected into containers by the ECS agent, so
# they never appear in a task definition, an image, or a repository. They do land
# in Terraform state - keep the state bucket encrypted and access-controlled.

resource "random_password" "api_key" {
  length  = 32
  special = false
}

resource "random_password" "jwt_secret" {
  length = 64
}

resource "random_password" "otp_jwt_secret" {
  length = 64
}

# The API's mock receiver verifies the HMAC the notification service signs with,
# so both services must be handed the same value.
resource "random_password" "webhook_signing_secret" {
  length = 48
}

resource "aws_secretsmanager_secret" "app" {
  name                    = "${local.name}/app"
  description             = "Application secrets shared across the orchestrator services"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id

  secret_string = jsonencode({
    API_KEY                = random_password.api_key.result
    JWT_SECRET             = random_password.jwt_secret.result
    OTP_JWT_SECRET         = random_password.otp_jwt_secret.result
    WEBHOOK_SIGNING_SECRET = random_password.webhook_signing_secret.result
  })
}

resource "aws_secretsmanager_secret" "database" {
  name                    = "${local.name}/database"
  description             = "Postgres master credentials"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0
}

resource "aws_secretsmanager_secret_version" "database" {
  secret_id = aws_secretsmanager_secret.database.id

  secret_string = jsonencode({
    DATABASE_USERNAME = aws_db_instance.main.username
    DATABASE_PASSWORD = random_password.database.result
    DATABASE_HOST     = aws_db_instance.main.address
    DATABASE_PORT     = tostring(aws_db_instance.main.port)
  })
}

resource "aws_secretsmanager_secret" "broker" {
  name                    = "${local.name}/broker"
  description             = "RabbitMQ connection URL"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0
}

resource "aws_secretsmanager_secret_version" "broker" {
  secret_id = aws_secretsmanager_secret.broker.id

  # Amazon MQ speaks AMQP over TLS only. The endpoint already carries the
  # amqps:// scheme and port, so credentials are spliced in after it.
  secret_string = jsonencode({
    RABBITMQ_URL = replace(
      tolist(aws_mq_broker.main.instances)[0].endpoints[0],
      "amqps://",
      "amqps://orchestrator:${urlencode(random_password.broker.result)}@"
    )
  })
}
