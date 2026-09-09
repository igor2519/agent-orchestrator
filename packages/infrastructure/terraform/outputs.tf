output "frontend_url" {
  description = "Public address of the web app."
  value       = "https://${local.frontend_host}"
}

output "api_url" {
  description = "Public address of the API."
  value       = "https://${local.api_host}"
}

output "alb_dns_name" {
  description = "Load balancer hostname, for a CNAME if DNS is managed elsewhere."
  value       = aws_lb.main.dns_name
}

output "ecs_cluster_name" {
  description = "ECS cluster name, needed by deploy commands."
  value       = aws_ecs_cluster.main.name
}

output "ecr_repository_urls" {
  description = "Where CI should push each service image."
  value       = { for name, repository in aws_ecr_repository.service : name => repository.repository_url }
}

output "database_endpoint" {
  description = "Postgres endpoint. Reachable only from inside the VPC."
  value       = aws_db_instance.main.endpoint
}

output "broker_console_url" {
  description = "RabbitMQ management console. Private broker, so this needs VPC access."
  value       = tolist(aws_mq_broker.main.instances)[0].console_url
}

output "uploads_bucket" {
  description = "S3 bucket holding uploaded documents."
  value       = aws_s3_bucket.uploads.bucket
}

output "secret_arns" {
  description = "Secrets Manager entries. Values are not exposed here; read them with the AWS CLI if needed."
  value = {
    app      = aws_secretsmanager_secret.app.arn
    database = aws_secretsmanager_secret.database.arn
    broker   = aws_secretsmanager_secret.broker.arn
  }
}

output "db_bootstrap_command" {
  description = "Run once after the first apply to create the per-service databases."
  value       = <<-CMD
    aws ecs run-task \
      --cluster ${aws_ecs_cluster.main.name} \
      --task-definition ${aws_ecs_task_definition.db_bootstrap.family} \
      --launch-type FARGATE \
      --region ${var.aws_region} \
      --network-configuration 'awsvpcConfiguration={subnets=[${join(",", aws_subnet.private[*].id)}],securityGroups=[${aws_security_group.service.id}],assignPublicIp=DISABLED}'
  CMD
}
