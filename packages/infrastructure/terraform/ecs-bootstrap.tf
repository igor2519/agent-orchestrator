# RDS creates exactly one database at launch. The three worker databases are made
# here instead, by the same `CREATE DATABASE ... WHERE NOT EXISTS` the local
# Compose stack runs in docker/init/01-create-service-databases.sh.
#
# This is a run-once task rather than a service. It is idempotent, so re-running
# it after adding a service is safe:
#
#   aws ecs run-task \
#     --cluster <cluster> \
#     --task-definition <family> \
#     --launch-type FARGATE \
#     --network-configuration "awsvpcConfiguration={subnets=[...],securityGroups=[...]}"
#
# The outputs in outputs.tf print the exact command with the values filled in.

resource "aws_cloudwatch_log_group" "db_bootstrap" {
  name              = "/ecs/${local.name}/db-bootstrap"
  retention_in_days = var.log_retention_days

  tags = { Name = "${local.name}-db-bootstrap" }
}

resource "aws_ecs_task_definition" "db_bootstrap" {
  family                   = "${local.name}-db-bootstrap"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.execution.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "ARM64"
  }

  container_definitions = jsonencode([
    {
      name      = "db-bootstrap"
      image     = "public.ecr.aws/docker/library/postgres:16-alpine"
      essential = true

      environment = [
        {
          name  = "TARGET_DATABASES"
          value = join(" ", [for service, database in local.service_databases : database if service != "api"])
        },
      ]

      secrets = local.database_secrets

      command = [
        "sh", "-c",
        <<-SH
          set -e
          export PGPASSWORD="$DATABASE_PASSWORD"
          for db in $TARGET_DATABASES; do
            echo "Ensuring database $db"
            psql -v ON_ERROR_STOP=1 -h "$DATABASE_HOST" -p "$DATABASE_PORT" \
                 -U "$DATABASE_USERNAME" -d "${local.service_databases["api"]}" \
                 -c "SELECT 'CREATE DATABASE $db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$db')\gexec"
          done
          echo "All databases present"
        SH
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.db_bootstrap.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = { Name = "${local.name}-db-bootstrap" }
}
