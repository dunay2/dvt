# DVT+ Infra

## Local PostgreSQL

This Docker Compose setup runs PostgreSQL 16 for local development.

### Start

docker compose -f docker/postgres/docker-compose.yml up

### Stop

docker compose -f docker/postgres/docker-compose.yml down -v

### Connection string

postgresql://dvt:dvt@localhost:5432/dvt

Schemas created:

- core
- eventstore
