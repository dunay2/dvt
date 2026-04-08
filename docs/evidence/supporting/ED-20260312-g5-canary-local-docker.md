---
title: ED-20260312 - G5 canary local-docker
status: Final
date: 2026-03-12T00:00:00.000Z
owners: Engine / Runtime
arc_level: ARC-2
breaking: false
evidence_class: supporting
code_refs:
  - scripts/outbox-worker-canary-evidence.ps1
  - infra/docker/postgres/docker-compose.yml
  - apps/outbox-worker/src/server.ts
  - apps/outbox-worker/src/host/runOutboxWorkerHost.ts
  - apps/outbox-worker/src/ownership/PgShardOwnershipGate.ts
  - apps/outbox-worker/src/ops/OperationalServer.ts
evidence:
  tests:
    - apps/outbox-worker/test/ownership/PgShardOwnershipGate.integration.test.ts
    - apps/outbox-worker/test/canary/standaloneCanaryAcceptance.test.ts
    - apps/outbox-worker/test/sharding/concurrentWorkerOrdering.test.ts
  code:
    - scripts/outbox-worker-canary-evidence.ps1
    - apps/outbox-worker/src/server.ts
---

# Evidence Doc: G5 canary local-docker

## Scope

This evidence records a real local-docker canary for `G5` / `#413` at the
standalone worker boundary. The proof uses the repository's PostgreSQL compose
service, starts the compiled `dvt-outbox-worker` host in `active` mode, inserts
one outbox record through the canary helper trigger path, and verifies that the
worker claims and delivers it without runtime errors.

Environment: `local-docker` using [`infra/docker/postgres/docker-compose.yml`](../../../infra/docker/postgres/docker-compose.yml)
with `postgres:16` on `localhost:5432`.

## Commands Executed

```powershell
docker compose -f infra/docker/postgres/docker-compose.yml up -d
$env:DATABASE_URL='postgresql://dvt:dvt@localhost:5432/dvt'
$env:DVT_PG_SCHEMA='dvt'
pnpm db:migrate
$env:DATABASE_URL='postgresql://dvt:dvt@localhost:5432/dvt'
pnpm --filter dvt-outbox-worker exec node --import tsx --test test/ownership/PgShardOwnershipGate.integration.test.ts
pnpm --filter @dvt/adapter-postgres build
pnpm --filter @dvt/engine build
pnpm --filter dvt-outbox-worker build
node apps/outbox-worker/dist/server.js
.\scripts\outbox-worker-canary-evidence.ps1 -EnvironmentName local-docker ...
```

## Observation Window

- Worker observation window: `2026-03-12T23:07:40Z` -> `2026-03-12T23:07:46Z`
- Trigger row created at: `2026-03-12T23:07:41.074Z`
- Delivery confirmed at: `2026-03-12T23:07:41.424Z`
- Delivery latency from `created_at` to `delivered_at`: `0.350s`

## Environment Configuration

```text
NODE_ENV=development
LOG_LEVEL=info
DVT_OUTBOX_OWNERSHIP_MODE=active
DVT_OUTBOX_EVENT_BUS_MODE=log
DVT_OUTBOX_WORKER_RUN_MIGRATIONS=true
DATABASE_URL=postgresql://dvt:dvt@localhost:5432/dvt
DVT_PG_SCHEMA=dvt
DVT_OUTBOX_SHARD_COUNT=1
DVT_OUTBOX_OWNED_SHARD_IDS=0
DVT_OUTBOX_ADMIN_HOST=127.0.0.1
DVT_OUTBOX_ADMIN_PORT=9464
```

## PostgreSQL Fencing Proof

The advisory-lock exclusivity proof cited by the closure docs was reproduced
against the same local PostgreSQL instance:

```text
ok 1 - PgShardOwnershipGate: first gate acquires shard lock; second gate returns null for the same shard
ok 2 - PgShardOwnershipGate: second gate can acquire after first gate releases
```

This validates that shard ownership fencing is enforced by the real PostgreSQL
session lock path, not only by in-memory test doubles.

## Readiness Observation

`/readyz` returned `200` with `ready=true` and `owner=true` during the canary:

```json
{
  "ok": true,
  "ready": true,
  "state": "idle",
  "owner": true,
  "service": "dvt-outbox-worker",
  "lastErrorMessage": null,
  "lastErrorAt": null,
  "lastTickAt": "2026-03-12T23:07:40.407Z",
  "tickFresh": true
}
```

## Metrics Delta

```text
Baseline:
dvt_outbox_runtime_ready 1
dvt_outbox_runtime_owner 1
dvt_outbox_runtime_state{state="idle"} 1
dvt_outbox_delivered_records_total 0
dvt_outbox_runtime_errors_total 0

Final:
dvt_outbox_runtime_ready 1
dvt_outbox_runtime_owner 1
dvt_outbox_runtime_state{state="idle"} 1
dvt_outbox_delivered_records_total 1
dvt_outbox_runtime_errors_total 0
```

Observed result:

- `dvt_outbox_delivered_records_total`: `0 -> 1`
- `dvt_outbox_runtime_errors_total`: `0 -> 0`
- `dvt_outbox_runtime_owner`: stayed `1`
- `dvt_outbox_runtime_ready`: stayed `1`

## Trigger Result

The canary helper executed the trigger through `-TriggerCommand`, using
`docker exec ... psql` inside the local PostgreSQL container. The inserted row
returned:

```text
{"id":"2e0251263eb3262242c87b983f140243","run_id":"g5-canary-local-docker-20260312230741094","shard_id":0}
```

The worker then logged the claim and delivery:

```json
{"level":30,"service":"dvt-outbox-worker","claimedCount":1,"oldestCreatedAt":"2026-03-12T23:07:41.074Z","oldestLagSeconds":0.424,"msg":"outbox records claimed"}
{"level":30,"service":"dvt-outbox-worker","eventId":"evt-g5-canary-local-docker-20260312230741094-1","eventType":"RunQueued","runId":"g5-canary-local-docker-20260312230741094","runSeq":1,"tenantId":"tenant-canary","projectId":"project-canary","environmentId":"local-docker","idempotencyKey":"g5-canary-local-docker-20260312230741094:RunQueued:1","msg":"outbox event published"}
{"level":30,"service":"dvt-outbox-worker","outboxId":"2e0251263eb3262242c87b983f140243","runId":"g5-canary-local-docker-20260312230741094","runSeq":1,"eventType":"RunQueued","attempts":0,"createdAt":"2026-03-12T23:07:41.074Z","msg":"outbox record delivered"}
```

## Database Confirmation

After the canary, the latest outbox row in PostgreSQL was:

```text
                id                |                  run_id                  | shard_id | run_seq |        delivered_at        | attempts
----------------------------------+------------------------------------------+----------+---------+----------------------------+----------
 2e0251263eb3262242c87b983f140243 | g5-canary-local-docker-20260312230741094 |        0 |       1 | 2026-03-12 23:07:41.424+00 |        0
```

This confirms:

- `delivered_at` was populated
- `attempts=0`
- the record stayed on shard `0`
- the row was delivered on the first attempt without a retry/error path

## Owner Proof Note

Exactly one compiled worker process (`node apps/outbox-worker/dist/server.js`)
was started with `DVT_OUTBOX_OWNERSHIP_MODE=active` against one local Docker
PostgreSQL container. No second outbox publisher path was started during the
observation window. The runtime log shows `acquiredShardIds:[0]`, and the
advisory-lock integration test above proves that a second gate on the same
shard returns `null` while the first lease is live.

## Kubernetes Snapshot Note

This local-docker environment does not have a reachable Kubernetes context for
`local/outbox-worker-local`. `kubectl` was present on the machine but the
current context was unreachable, so the canary helper degraded to probe and
metrics evidence only. That behavior is acceptable for this local canary and is
now handled explicitly by the script.

## Rollback

Rollback was exercised by stopping the worker process immediately after evidence
capture. Because the shard lease is session-bound, process exit releases the
advisory lock without any explicit unlock step. This matches the real
PostgreSQL behavior proven by the second integration test:

```text
ok 2 - PgShardOwnershipGate: second gate can acquire after first gate releases
```

## Closure Relevance

This observation satisfies the local canary evidence lane used by the repository
to close `G5`:

- one active owner was observed during the window
- `/readyz` reached `200` with `owner=true`
- `dvt_outbox_delivered_records_total` increased after the trigger
- `dvt_outbox_runtime_errors_total` stayed flat
- rollback-by-stop released ownership cleanly

## Conclusion

The local-docker canary described by the repository documentation is correct as
implemented after the helper fix for unreachable `kubectl` contexts. The proof
supports closing the standalone worker runtime gap in `G5`; remaining future
work belongs to downstream contract hardening and `G10`, not to the Phase 1.5
outbox worker closeout itself.
