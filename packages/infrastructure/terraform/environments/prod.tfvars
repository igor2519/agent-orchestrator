environment = "prod"
aws_region  = "eu-central-1"

domain_name    = "example.com"
hosted_zone_id = "Z0000000000000000000"

# One NAT per AZ so a zone failure does not take egress with it.
single_nat_gateway     = false
db_instance_class      = "db.m7g.large"
db_allocated_storage   = 100
db_multi_az            = true
db_deletion_protection = true

mq_instance_type   = "mq.m5.large"
mq_deployment_mode = "CLUSTER_MULTI_AZ"

log_retention_days = 90
