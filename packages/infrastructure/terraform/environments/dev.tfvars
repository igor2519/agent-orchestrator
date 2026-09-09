environment = "dev"
aws_region  = "eu-central-1"

domain_name    = "dev.example.com"
hosted_zone_id = "Z0000000000000000000"

# Cheap and disposable: one NAT, no standby, destroyable database.
single_nat_gateway     = true
db_instance_class      = "db.t4g.micro"
db_multi_az            = false
db_deletion_protection = false

mq_instance_type   = "mq.t3.micro"
mq_deployment_mode = "SINGLE_INSTANCE"

log_retention_days = 7
