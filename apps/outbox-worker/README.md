# dvt-outbox-worker

Standalone host for the current `OutboxWorker` runtime.

Current scope:

- bootstrap PostgreSQL storage when explicitly enabled
- run the polling loop independently from `apps/api`
- make ownership explicit at host level through `active` / `passive` mode
- publish envelopes through an explicit bus adapter
- expose `/healthz`, `/readyz`, and `/metrics`
- stop cleanly on `SIGINT` / `SIGTERM`
- abort active bootstrap work when shutdown lands during runtime creation or migrations

Current bus modes are intentionally narrow:

- `http`: posts singleton outbox envelopes to a configured downstream HTTP endpoint
- `log`: emits one structured log record per published envelope for controlled local runs

`http` is the default because the worker should fail fast without a real publisher.

Duplicate-handling contract:

- worker delivery remains `at-least-once`
- downstream HTTP consumers must absorb duplicate delivery by existing envelope identity, using `eventId` and/or `idempotencyKey`
- a redelivery after publish success but local ack failure is expected behavior, not protocol breakage

Operational endpoints:

- `/healthz`: liveness probe for the worker process
- `/readyz`: readiness probe based on runtime state (`idle` / `draining` are ready only when no retry backlog is pending) and the effective `owner` flag
- `/metrics`: Prometheus-style metrics for runtime state, effective ownership, lag, retries, deliveries, DLQ, and errors

Ownership modes:

- `active`: the standalone worker is the explicit owner of outbox polling and downstream publication
- `passive`: the process exposes operational endpoints but does not start the polling runtime

`DVT_OUTBOX_OWNERSHIP_MODE` is required. Set it explicitly in every environment so process start never implies ownership by omission.

Ownership safety rule:

- `active` declares rollout intent, not multi-worker safety by itself
- dual-active ownership is still unsupported in this slice
- if a future ownership gate or lease refuses active ownership, the host stays passive and does not start delivery

Core env vars:

- `DVT_OUTBOX_OWNERSHIP_MODE`: required `active` or `passive`
- `DVT_OUTBOX_ADMIN_HOST` / `DVT_OUTBOX_ADMIN_PORT`: bind address for health and metrics endpoints
- `DATABASE_URL` plus bus/runtime settings: required only when ownership mode is `active`
- `DVT_OUTBOX_WORKER_RUN_MIGRATIONS`: set `true` only in environments where the worker role is allowed to run DDL
- `DVT_OUTBOX_EVENT_BUS_MODE`: `http` or `log`
- `DVT_OUTBOX_HTTP_TARGET_URL`: downstream HTTP sink when bus mode is `http`

Shutdown behavior:

- `SIGINT` / `SIGTERM` keep passive mode observable long enough for a clean stop
- in `active` mode, shutdown also interrupts runtime bootstrap and pending migrations before the polling loop starts
- if runtime creation completes after shutdown was requested, the host cleans up that runtime instead of starting it

Ownership observability:

- `/readyz` includes `owner=true|false` so operators can distinguish an active owner from a passive or refused process
- `/metrics` exposes `dvt_outbox_runtime_owner`

Operator guidance lives in [`docs/runbooks/outbox-worker-g5.md`](../../docs/runbooks/outbox-worker-g5.md).
