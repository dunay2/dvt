# DVT+ MVP — Postgres Append Log + Outbox→Kafka + Kafka Tail→SSE (Catch-up + Live)

This repository is a **complete, runnable MVP** implementing:

**Postgres (append authority + projection) → transactional outbox → Kafka (distribution) → tail consumer → SSE (catch-up + live)**

## References

- SSE (MDN): https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
- EventSource: https://developer.mozilla.org/en-US/docs/Web/API/EventSource
- Kafka docs: https://kafka.apache.org/documentation/
- Transactional outbox: https://microservices.io/patterns/data/transactional-outbox.html
- Postgres INSERT/UPSERT: https://www.postgresql.org/docs/current/sql-insert.html
- Node Docker images: https://hub.docker.com/_/node

## Quickstart

### 1) Start infra

```bash
docker compose up -d
```

### 2) Apply migration

```bash
psql -h localhost -U dvt -d dvt -f migrations/001_init.sql
```

Password: `dvt`

### 3) Run API (Node 22)

```bash
cd apps/api
corepack enable
corepack prepare pnpm@latest --activate
pnpm install
pnpm dev
```

### 4) Validate SSE

Create run:

```bash
curl -s -X POST http://localhost:3000/runs
```

Stream:

```bash
curl -N http://localhost:3000/runs/<RUN_ID>/stream
```

Append event:

```bash
curl -s -X POST http://localhost:3000/runs/<RUN_ID>/node-status   -H "content-type: application/json"   -d '{"nodeId":"model.alpha","status":"RUNNING","attempt":1}'
```

Runbook: `docs/ai/AI-OPERATIONS.md`
