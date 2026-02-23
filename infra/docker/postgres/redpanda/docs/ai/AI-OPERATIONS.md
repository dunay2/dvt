# AI Operations — DVT+ MVP Stream Gateway

## Start infra

```bash
docker compose up -d
```

## Apply migration

```bash
psql -h localhost -U dvt -d dvt -f migrations/001_init.sql
```

Password: `dvt`

## Run API

```bash
cd apps/api
corepack enable
corepack prepare pnpm@latest --activate
pnpm i
pnpm dev
```

## Validate end-to-end

Create run:

```bash
curl -s -X POST http://localhost:3000/runs
```

Stream (terminal A):

```bash
curl -N http://localhost:3000/runs/<RUN_ID>/stream
```

Append event (terminal B):

```bash
curl -s -X POST http://localhost:3000/runs/<RUN_ID>/node-status   -H "content-type: application/json"   -d '{"nodeId":"model.alpha","status":"RUNNING","attempt":1}'
```

### Catch-up test

1. Stop stream (Ctrl+C)
2. Append more events
3. Reconnect with:

```bash
curl -N http://localhost:3000/runs/<RUN_ID>/stream -H "Last-Event-ID: 1"
```

## References

- SSE: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
- EventSource: https://developer.mozilla.org/en-US/docs/Web/API/EventSource
- Kafka: https://kafka.apache.org/documentation/
- Outbox: https://microservices.io/patterns/data/transactional-outbox.html
- Postgres UPSERT: https://www.postgresql.org/docs/current/sql-insert.html
