variable "project_name" {
  description = "Prefix for every resource name."
  type        = string
  default     = "agent-orchestrator"
}

variable "environment" {
  description = "Deployment environment. Also namespaces resource names."
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be one of: dev, staging, prod."
  }
}

variable "aws_region" {
  description = "Region every resource is created in."
  type        = string
  default     = "eu-central-1"
}

# --- Networking ---

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "az_count" {
  description = "How many availability zones to spread subnets across. RDS multi-AZ and the ALB both need at least two."
  type        = number
  default     = 2

  validation {
    condition     = var.az_count >= 2
    error_message = "az_count must be at least 2: an ALB requires subnets in two availability zones."
  }
}

variable "single_nat_gateway" {
  description = "Route all private egress through one NAT gateway instead of one per AZ. Cheaper, but the NAT's AZ becomes a single point of failure."
  type        = bool
  default     = true
}

# --- DNS and TLS ---

variable "domain_name" {
  description = "Root domain, e.g. example.com. Hosts are built from the subdomain variables below."
  type        = string

  validation {
    # A scheme, a path or a trailing dot here fails deep inside ACM with an
    # unhelpful message; catch it at plan time instead.
    condition     = can(regex("^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$", var.domain_name))
    error_message = "domain_name must be a bare hostname such as example.com - no scheme, path, or trailing dot."
  }
}

variable "hosted_zone_id" {
  description = "Route53 hosted zone for domain_name. Used for the ACM DNS validation records and the ALB aliases."
  type        = string

  validation {
    condition     = can(regex("^Z[A-Z0-9]{4,31}$", var.hosted_zone_id))
    error_message = "hosted_zone_id must be a Route53 zone id such as Z1D633PJN98FT9."
  }
}

variable "frontend_subdomain" {
  description = "Subdomain the web app is served from. Empty string serves it at the apex."
  type        = string
  default     = "app"
}

variable "api_subdomain" {
  description = "Subdomain the API is served from. Must differ from frontend_subdomain."
  type        = string
  default     = "api"

  validation {
    condition     = length(var.api_subdomain) > 0
    error_message = "api_subdomain cannot be empty: the API and the web app need distinct hosts."
  }
}

# --- Database ---

variable "db_instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "RDS storage in GiB."
  type        = number
  default     = 20
}

variable "db_multi_az" {
  description = "Run a standby in a second AZ. Roughly doubles database cost."
  type        = bool
  default     = false
}

variable "db_deletion_protection" {
  description = "Refuse to destroy the database. Should be true anywhere holding real data."
  type        = bool
  default     = true
}

# --- Message broker ---

variable "mq_instance_type" {
  description = "Amazon MQ broker instance type."
  type        = string
  default     = "mq.t3.micro"
}

variable "mq_deployment_mode" {
  description = "SINGLE_INSTANCE or CLUSTER_MULTI_AZ. mq.t3.micro only supports SINGLE_INSTANCE."
  type        = string
  default     = "SINGLE_INSTANCE"

  validation {
    condition     = contains(["SINGLE_INSTANCE", "CLUSTER_MULTI_AZ"], var.mq_deployment_mode)
    error_message = "mq_deployment_mode must be SINGLE_INSTANCE or CLUSTER_MULTI_AZ."
  }
}

# --- Services ---

variable "image_tag" {
  description = "Container image tag deployed to every service. CI should set this to the commit SHA rather than 'latest', so a rollback is a tag change."
  type        = string
  default     = "latest"
}

variable "log_retention_days" {
  description = "CloudWatch log retention."
  type        = number
  default     = 30
}

variable "services" {
  description = <<-EOT
    Per-service sizing and scale. Keys must match the ECR repository and container
    names. `public` decides whether the service gets an ALB target group: only the
    two HTTP-facing apps do. The three workers boot through
    NestFactory.createApplicationContext and never open a socket, so their `port`
    is only the value handed to the process as PORT - no listener binds it and no
    port is mapped or opened in a security group.
  EOT

  type = map(object({
    port          = number
    cpu           = number
    memory        = number
    desired_count = number
    public        = bool
    health_path   = optional(string)
  }))

  default = {
    api = {
      port          = 3001
      cpu           = 512
      memory        = 1024
      desired_count = 2
      public        = true
      # AppController maps the health check onto the root path, not /health.
      health_path = "/"
    }
    frontend = {
      port          = 3000
      cpu           = 512
      memory        = 1024
      desired_count = 2
      public        = true
      health_path   = "/"
    }
    ocr-service = {
      port          = 3011
      cpu           = 1024
      memory        = 2048
      desired_count = 1
      public        = false
    }
    processing-service = {
      port          = 3012
      cpu           = 512
      memory        = 1024
      desired_count = 1
      public        = false
    }
    notification-service = {
      port          = 3013
      cpu           = 512
      memory        = 1024
      desired_count = 1
      public        = false
    }
  }
}
