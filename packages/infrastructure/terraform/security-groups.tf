resource "aws_security_group" "alb" {
  name        = "${local.name}-alb"
  description = "Public entry point. Terminates TLS and forwards to the ECS tasks."
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${local.name}-alb" }
}

resource "aws_vpc_security_group_ingress_rule" "alb_https" {
  security_group_id = aws_security_group.alb.id
  description       = "HTTPS from anywhere"
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
}

resource "aws_vpc_security_group_ingress_rule" "alb_http" {
  security_group_id = aws_security_group.alb.id
  description       = "HTTP from anywhere, redirected to HTTPS by the listener"
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"
}

resource "aws_vpc_security_group_egress_rule" "alb_all" {
  security_group_id = aws_security_group.alb.id
  description       = "To the service tasks"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

resource "aws_security_group" "service" {
  name        = "${local.name}-service"
  description = "ECS tasks. Only the two public services accept traffic, and only from the ALB."
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${local.name}-service" }
}

# One rule per public service rather than a port range: the workers must not
# become reachable by widening a range later.
resource "aws_vpc_security_group_ingress_rule" "service_from_alb" {
  for_each = local.public_services

  security_group_id            = aws_security_group.service.id
  description                  = "${each.key} from the load balancer"
  referenced_security_group_id = aws_security_group.alb.id
  from_port                    = each.value.port
  to_port                      = each.value.port
  ip_protocol                  = "tcp"
}

resource "aws_vpc_security_group_egress_rule" "service_all" {
  security_group_id = aws_security_group.service.id
  description       = "Outbound to the database, broker, S3, ECR and customer webhook endpoints"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

resource "aws_security_group" "database" {
  name        = "${local.name}-database"
  description = "Postgres. Reachable only from the service tasks."
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${local.name}-database" }
}

resource "aws_vpc_security_group_ingress_rule" "database_from_services" {
  security_group_id            = aws_security_group.database.id
  description                  = "Postgres from the ECS tasks"
  referenced_security_group_id = aws_security_group.service.id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
}

resource "aws_security_group" "broker" {
  name        = "${local.name}-broker"
  description = "RabbitMQ. Reachable only from the service tasks."
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${local.name}-broker" }
}

resource "aws_vpc_security_group_ingress_rule" "broker_from_services" {
  security_group_id            = aws_security_group.broker.id
  description                  = "AMQPS from the ECS tasks"
  referenced_security_group_id = aws_security_group.service.id
  from_port                    = 5671
  to_port                      = 5671
  ip_protocol                  = "tcp"
}
