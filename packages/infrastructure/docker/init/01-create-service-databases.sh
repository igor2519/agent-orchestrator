#!/bin/bash
# Each microservice owns its own database. They share one Postgres instance
# locally for convenience only - no service reads another's schema, so splitting
# them onto separate instances later needs no code change, just new env values.
set -e

for db in ocr_db processing_db notification_db; do
  echo "Creating database $db"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-SQL
    SELECT 'CREATE DATABASE $db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$db')\gexec
SQL
done
