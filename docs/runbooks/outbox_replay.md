# Runbook: Outbox Replay

Owner: TBD (SRE)
Severity: P1

Goal: Recover and replay events from StateStore `outbox` table to the external EventBus without duplicating state or losing ordering for a given runId.

Preconditions:
- Access to StateStore (read/write)
- Access to EventBus publisher credentials
- Maintenance window or operator approval for high-impact replays

Steps:
1. Identify symptom and scope
   - Alert: `eventbus_publish_failures_total` or DLQ entries
   - Query: `SELECT count(*) FROM outbox WHERE status IN ('pending','retry')` to estimate work

2. Verify StateStore integrity
   - Check latest transaction IDs and idempotency keys
   - Export a sample of outbox rows for a single runId to validate order

3. Dry-run: prepare replay plan
   - Use `outbox_replayer --dry-run --limit 100 --filter status=pending` to simulate publishes
   - Verify no schema mismatches for event payloads (validate against `contracts/events/*.schema.json`)

4. Execute replay (small batch)
   - Run with conservative rate: `outbox_replayer --limit 100 --rate 10/s`
   - Monitor `eventbus_publish_failures_total` and DLQ growth

5. Full replay
   - Increase concurrency after pilot validated
   - Use idempotencyKey in envelope to avoid duplicate processing semantics downstream

6. Post-replay validation
   - Confirm DLQ drained
   - Spot-check downstream consumers for processing errors
   - Create postmortem if > X% events failed

Rollback / stop criteria
- Stop if DLQ grows or `eventbus_publish_failures_total` increases

Notes:
- Always prefer incremental replays and avoid time-order changes per `runId`.
- If schema mismatches are common, halt replay and fix producer or migration.
