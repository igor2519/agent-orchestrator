resource "aws_ecs_cluster" "main" {
  name = local.name

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = { Name = local.name }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
  }
}

resource "aws_cloudwatch_log_group" "service" {
  for_each = var.services

  name              = "/ecs/${local.name}/${each.key}"
  retention_in_days = var.log_retention_days

  tags = { Name = "${local.name}-${each.key}" }
}

locals {
  # Tunables the services read at boot. Values match apps/*/example.env so a
  # container behaves the same way it does locally.
  messaging_env = {
    RABBITMQ_PREFETCH         = "10"
    OUTBOX_RELAY_INTERVAL_MS  = "1000"
    OUTBOX_RELAY_BATCH_SIZE   = "50"
    OUTBOX_RELAY_MAX_ATTEMPTS = "10"
  }

  service_env = {
    api = merge(local.messaging_env, {
      APP_NAME             = var.project_name
      ENABLE_SWAGGER       = var.environment == "prod" ? "false" : "true"
      FRONTEND_HOST_URL    = "https://${local.frontend_host}"
      BACKEND_HOST_URL     = "https://${local.api_host}"
      ALLOWED_CORS_ORIGINS = "https://${local.frontend_host}"
      DATABASE_NAME        = local.service_databases["api"]
      AWS_REGION           = var.aws_region
      AWS_BUCKET_NAME      = aws_s3_bucket.uploads.bucket
      AWS_CDN_DOMAIN       = "https://${aws_s3_bucket.uploads.bucket_regional_domain_name}"
      OTP_TOKEN_EXPIRATION = "2h"
      # Customer callbacks must reach real hosts; loopback and RFC1918 targets are
      # a local-development affordance only.
      ALLOW_PRIVATE_CALLBACK_URLS = "false"
    })

    frontend = {
      NEXT_PUBLIC_APP_NAME     = var.project_name
      NEXT_PUBLIC_BACKEND_URL  = "https://${local.api_host}"
      NEXT_PUBLIC_FRONTEND_URL = "https://${local.frontend_host}"
      CDN_BASE_URL             = "https://${aws_s3_bucket.uploads.bucket_regional_domain_name}"
    }

    ocr-service = merge(local.messaging_env, {
      DATABASE_NAME           = local.service_databases["ocr-service"]
      MAX_PROCESSING_ATTEMPTS = "5"
    })

    processing-service = merge(local.messaging_env, {
      DATABASE_NAME           = local.service_databases["processing-service"]
      MAX_PROCESSING_ATTEMPTS = "5"
    })

    notification-service = merge(local.messaging_env, {
      DATABASE_NAME            = local.service_databases["notification-service"]
      MAX_PROCESSING_ATTEMPTS  = "5"
      WEBHOOK_TIMEOUT_MS       = "5000"
      WEBHOOK_MAX_ATTEMPTS     = "5"
      WEBHOOK_POLL_INTERVAL_MS = "1000"
      WEBHOOK_BATCH_SIZE       = "20"
      PUBLIC_API_URL           = "https://${local.api_host}"
    })
  }

  database_secrets = [
    for key in ["DATABASE_USERNAME", "DATABASE_PASSWORD", "DATABASE_HOST", "DATABASE_PORT"] :
    { name = key, valueFrom = "${aws_secretsmanager_secret.database.arn}:${key}::" }
  ]

  broker_secrets = [
    { name = "RABBITMQ_URL", valueFrom = "${aws_secretsmanager_secret.broker.arn}:RABBITMQ_URL::" }
  ]

  # The signing secret goes to the notification service (which signs) and the API
  # (whose mock receiver verifies). Nothing else needs it.
  service_secrets = {
    api = concat(local.database_secrets, local.broker_secrets, [
      { name = "API_KEY", valueFrom = "${aws_secretsmanager_secret.app.arn}:API_KEY::" },
      { name = "JWT_SECRET", valueFrom = "${aws_secretsmanager_secret.app.arn}:JWT_SECRET::" },
      { name = "OTP_JWT_SECRET", valueFrom = "${aws_secretsmanager_secret.app.arn}:OTP_JWT_SECRET::" },
      { name = "WEBHOOK_SIGNING_SECRET", valueFrom = "${aws_secretsmanager_secret.app.arn}:WEBHOOK_SIGNING_SECRET::" },
    ])

    frontend = [
      { name = "API_KEY", valueFrom = "${aws_secretsmanager_secret.app.arn}:API_KEY::" },
    ]

    ocr-service        = concat(local.database_secrets, local.broker_secrets)
    processing-service = concat(local.database_secrets, local.broker_secrets)

    notification-service = concat(local.database_secrets, local.broker_secrets, [
      { name = "WEBHOOK_SIGNING_SECRET", valueFrom = "${aws_secretsmanager_secret.app.arn}:WEBHOOK_SIGNING_SECRET::" },
    ])
  }
}

resource "aws_ecs_task_definition" "service" {
  for_each = var.services

  family                   = "${local.name}-${each.key}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = each.value.cpu
  memory                   = each.value.memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task[each.key].arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "ARM64"
  }

  container_definitions = jsonencode([
    {
      name      = each.key
      image     = "${aws_ecr_repository.service[each.key].repository_url}:${var.image_tag}"
      essential = true

      # Workers never listen, so they get no mapping at all.
      portMappings = each.value.public ? [
        {
          containerPort = each.value.port
          protocol      = "tcp"
        }
      ] : []

      environment = concat(
        [
          { name = "NODE_ENV", value = "production" },
          { name = "PORT", value = tostring(each.value.port) },
        ],
        [for k, v in local.service_env[each.key] : { name = k, value = v }]
      )

      secrets = local.service_secrets[each.key]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.service[each.key].name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      # Only the HTTP services can answer a probe. A worker's liveness is visible
      # through queue depth and the outbox, not an endpoint.
      healthCheck = each.value.public ? {
        command     = ["CMD-SHELL", "node -e \"fetch('http://127.0.0.1:${each.value.port}${coalesce(each.value.health_path, "/")}').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\""]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 30
      } : null
    }
  ])

  tags = { Name = "${local.name}-${each.key}" }
}

resource "aws_ecs_service" "main" {
  for_each = var.services

  name            = each.key
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.service[each.key].arn
  desired_count   = each.value.desired_count
  launch_type     = "FARGATE"

  enable_execute_command = true

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.service.id]
    assign_public_ip = false
  }

  dynamic "load_balancer" {
    for_each = each.value.public ? [1] : []

    content {
      target_group_arn = aws_lb_target_group.service[each.key].arn
      container_name   = each.key
      container_port   = each.value.port
    }
  }

  # Give a public task time to boot before the ALB starts failing it.
  health_check_grace_period_seconds = each.value.public ? 60 : null

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  # CI deploys by registering a new task definition revision; Terraform should not
  # then drag the service back to the revision recorded in state.
  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }

  depends_on = [aws_lb_listener.https]

  tags = { Name = "${local.name}-${each.key}" }
}
