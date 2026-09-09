data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  name = "${var.project_name}-${var.environment}"

  azs = slice(data.aws_availability_zones.available.names, 0, var.az_count)

  # /20 per subnet out of a /16: room to grow without renumbering.
  public_subnet_cidrs  = [for i in range(var.az_count) : cidrsubnet(var.vpc_cidr, 4, i)]
  private_subnet_cidrs = [for i in range(var.az_count) : cidrsubnet(var.vpc_cidr, 4, i + 8)]

  # An empty frontend_subdomain serves the app at the apex, which is a common
  # setup; the API always sits on its own host.
  frontend_host = var.frontend_subdomain == "" ? var.domain_name : "${var.frontend_subdomain}.${var.domain_name}"
  api_host      = "${var.api_subdomain}.${var.domain_name}"

  # Each service owns its database exclusively; they share one instance for cost.
  # Splitting them onto separate instances later is an env-var change, not a code
  # change - which is what the service boundaries were designed for.
  service_databases = {
    api                  = "boilerplate"
    ocr-service          = "ocr_db"
    processing-service   = "processing_db"
    notification-service = "notification_db"
  }

  # Services that talk to Postgres and RabbitMQ. The frontend does neither: it
  # only calls the API over HTTP.
  backend_services = [for k, v in var.services : k if k != "frontend"]

  public_services = { for k, v in var.services : k => v if v.public }
}
