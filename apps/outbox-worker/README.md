# dvt-outbox-worker

Standalone host for the current `OutboxWorker` runtime.

Current scope:

- bootstrap PostgreSQL storage
- run the polling loop independently from `apps/api`
- publish envelopes through an explicit bus adapter
- stop cleanly on `SIGINT` / `SIGTERM`

Current bus mode is intentionally narrow:

- `log`: emits one structured log record per published envelope for controlled local runs

This package scaffolds `G5.1`. Health endpoints, metrics, and production bus wiring stay in follow-up work.
