bucket         = "agent-orchestrator-tfstate"
key            = "agent-orchestrator/prod/terraform.tfstate"
region         = "eu-central-1"
dynamodb_table = "agent-orchestrator-tflock"
encrypt        = true
