# dvt-outbox-worker

Standalone host for the current `OutboxWorker` runtime.

Current scope:

- bootstrap PostgreSQL storage
- run the polling loop independently from `apps/api`
- publish envelopes through an explicit bus adapter
- expose `/healthz`, `/readyz`, and `/metrics`
- stop cleanly on `SIGINT` / `SIGTERM`

Current bus modes are intentionally narrow:

- `http`: posts singleton outbox envelopes to a configured downstream HTTP endpoint
- `log`: emits one structured log record per published envelope for controlled local runs

`http` is the default because the worker should fail fast without a real publisher.

Operational endpoints:

- `/healthz`: liveness probe for the worker process
- `/readyz`: readiness probe based on runtime state (`idle` / `draining` are ready)
- `/metrics`: Prometheus-style metrics for runtime state, lag, retries, deliveries, DLQ, and errors

Core env vars:

- `DVT_OUTBOX_ADMIN_HOST` / `DVT_OUTBOX_ADMIN_PORT`: bind address for health and metrics endpoints
- `DVT_OUTBOX_EVENT_BUS_MODE`: `http` or `log`
- `DVT_OUTBOX_HTTP_TARGET_URL`: downstream HTTP sink when bus mode is `http`

Operator guidance lives in [`docs/runbooks/outbox-worker-g5.md`](../../docs/runbooks/outbox-worker-g5.md).
