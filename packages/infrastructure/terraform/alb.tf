# Looked up so a hosted_zone_id that belongs to a different domain fails at plan
# time. Without this the validation records are written into the wrong zone and
# aws_acm_certificate_validation simply waits ~45 minutes before timing out.
data "aws_route53_zone" "main" {
  zone_id = var.hosted_zone_id
}

resource "aws_acm_certificate" "main" {
  domain_name               = local.frontend_host
  subject_alternative_names = [local.api_host]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true

    precondition {
      condition     = trimsuffix(data.aws_route53_zone.main.name, ".") == var.domain_name
      error_message = "hosted_zone_id belongs to a different domain than domain_name; the certificate would never validate."
    }
  }

  tags = { Name = local.name }
}

resource "aws_route53_record" "certificate_validation" {
  for_each = {
    for option in aws_acm_certificate.main.domain_validation_options :
    option.resource_record_name => {
      name   = option.resource_record_name
      record = option.resource_record_value
      type   = option.resource_record_type
    }
  }

  zone_id         = var.hosted_zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  ttl             = 60
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.certificate_validation : record.fqdn]
}

resource "aws_lb" "main" {
  name               = local.name
  load_balancer_type = "application"
  internal           = false
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = var.environment == "prod"
  drop_invalid_header_fields = true

  tags = { Name = local.name }
}

resource "aws_lb_target_group" "service" {
  for_each = local.public_services

  name        = "${local.name}-${each.key}"
  port        = each.value.port
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = aws_vpc.main.id

  # Fargate replaces tasks rather than draining them for long; a short delay
  # keeps deployments from stalling on connections that have already finished.
  deregistration_delay = 30

  health_check {
    path                = coalesce(each.value.health_path, "/")
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200-399"
  }

  tags = { Name = "${local.name}-${each.key}" }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.main.certificate_arn

  # Anything that does not match a host rule below is not ours to serve.
  default_action {
    type = "fixed-response"

    fixed_response {
      content_type = "text/plain"
      message_body = "Not found"
      status_code  = "404"
    }
  }
}

resource "aws_lb_listener_rule" "frontend" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service["frontend"].arn
  }

  condition {
    host_header {
      values = [local.frontend_host]
    }
  }
}

resource "aws_lb_listener_rule" "api" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 200

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service["api"].arn
  }

  condition {
    host_header {
      values = [local.api_host]
    }
  }
}

resource "aws_route53_record" "frontend" {
  zone_id = var.hosted_zone_id
  name    = local.frontend_host
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "api" {
  zone_id = var.hosted_zone_id
  name    = local.api_host
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}
