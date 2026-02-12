# Incident Response Runbook

**Audience**: On-call SRE, engineers  
**Purpose**: Step-by-step procedures for common incidents  
**Owner**: Platform Stability team  
**Last Updated**: 2026-02-11

---

## 1) Adapter Heartbeat Lost (P1)

**Detection**: Alert `AdapterHeartbeatLost` (Temporal cluster offline)

### 1.1 Immediate Actions (0-2 minutes)

```bash
# 1. Verify cluster status externally
curl -s https://temporal-admin.prod:7233/health

# 2. Declare incident
slack_post "#incidents" "🔴 P1: Temporal adapter heartbeat lost. Investigating..."

# 3. Page on-call Temporal SRE
pagerduty_trigger "temporal_heartbeat_lost" severity=P1

# 4. Check active runs
psql production -c "
SELECT COUNT(*) as in_flight_runs
FROM runs_archive
WHERE status = 'IN_FLIGHT';"

# Sample output:
# in_flight_runs = 127
```

### 1.2 Diagnosis (2-5 minutes)

**If cluster is reachable**:

```bash
# Check worker registration
tctl --namespace production namespace describe

# List active workers
tctl --namespace production worker describe

# If workers missing → restart worker deployment
kubectl rollout restart deployment/dvt-workers-control -n production
```

**If cluster is unreachable**:

```bash
# Check infrastructure
kubectl get nodes
kubectl get pod -n temporal-cluster

# If pods down → Infrastructure incident (page Infra SRE)
```

### 1.3 Recovery (5-15 minutes)

```bash
# Restart Temporal cluster (if transient failure)
kubectl rollout restart deployment/temporal -n temporal-cluster
kubectl rollout status deployment/temporal -n temporal-cluster --timeout=5m

# Monitor heartbeat recovery
watch -n 2 'curl -s https://temporal-admin.prod:7233/health | jq .status'

# Once recovered, resume pending runs
psql production -c "
UPDATE runs_archive
SET status = 'IN_FLIGHT',
    resumed_at = NOW()
WHERE status = 'PAUSED_SYSTEM'
  AND paused_reason = 'ADAPTER_UNAVAILABLE'
RETURNING runId;"
```

### 1.4 Post-Incident (15+ minutes)

```bash
# Close incident
slack_post "#incidents" "✅ P1 recovery complete. Postmortem scheduled 24h."

# Capture metrics for postmortem
curl -s "http://prometheus:9090/api/v1/query_range?query=up{job='temporal'}&start=...&end=..."

# RCA: Document root cause in incident ticket
```

---

## 2) Projection Gap Detected (P1)

**Detection**: Alert `ProjectionGapDetected` + high lag in `dvt_projection_lag_events`

### 2.1 Immediate Actions (0-1 minute)

```bash
# 1. Verify gap
psql production -c "
SELECT
  runId,
  MAX(runSeq) as latest_seq,
  COUNT(*) as event_count
FROM run_events
GROUP BY runId
HAVING COUNT(*) > 0
ORDER BY MAX(runSeq) DESC
LIMIT 5;"

# 2. Check snapshots
psql production -c "
SELECT
  runId,
  snapshotSeq,
  generatedAt
FROM snapshots
WHERE generatedAt > NOW() - INTERVAL '5 minutes'
ORDER BY generatedAt DESC
LIMIT 10;"

# 3. If gap confirmed → Declare P1 incident
slack_post "#incidents" "🔴 P1: Projection gap in statestore. Reconciler may be stuck."
```

### 2.2 Investigation (1-5 minutes)

```bash
# Check reconciler (SnapshotProjector) health
kubectl logs deployment/snapshot-projector -n production --tail=50 --since=5m | grep -i error

# Check lag backlog
psql production -c "
SELECT
  runId,
  (SELECT MAX(runSeq) FROM run_events WHERE runId = snapshots.runId) - snapshotSeq as lag
FROM snapshots
WHERE snapshotSeq < (SELECT MAX(runSeq) FROM run_events)
ORDER BY lag DESC
LIMIT 20;"

# If reconciler stuck (no recent logs)
kubectl describe pod -n production -l app=snapshot-projector | grep -A 5 "Conditions:"
```

### 2.3 Recovery (5-15 minutes)

**Option A: Reconciler is slow (not stuck)**

```bash
# Scale up reconciler workers
kubectl scale deployment snapshot-projector --replicas=10 -n production

# Monitor progress
watch -n 1 'psql production -c "SELECT COUNT(DISTINCT runId) as gap_count FROM run_events re
WHERE NOT EXISTS (SELECT 1 FROM snapshots s WHERE s.runId = re.runId AND s.snapshotSeq >= re.runSeq);"'

# Once caught up, scale back
kubectl scale deployment snapshot-projector --replicas=3 -n production
```

**Option B: Reconciler is stuck (no logs, no progress)**

```bash
# 1. Restart reconciler
kubectl rollout restart deployment/snapshot-projector -n production
kubectl rollout status deployment/snapshot-projector -n production --timeout=5m

# 2. Force replay from last consistent snapshot
psql production -c "
BEGIN;
DELETE FROM snapshots
WHERE snapshotSeq < (SELECT MAX(snapshotSeq) - 100 FROM snapshots);
COMMIT;"

# 3. Monitor reconciler logs
kubectl logs deployment/snapshot-projector -n production --follow --since=1m
```

### 2.4 Verification (15+ minutes)

```bash
# Confirm gap closed
psql production -c "
SELECT COUNT(*) as remaining_gaps
FROM run_events re
WHERE NOT EXISTS (SELECT 1 FROM snapshots s WHERE s.runId = re.runId AND s.snapshotSeq >= re.runSeq)"

# Should be 0. If still > 0 after restart, escalate to database team.

# Resume affected runs
psql production -c "
UPDATE runs_archive
SET status = 'IN_FLIGHT'
WHERE status = 'WAITING_FOR_SNAPSHOT'
  AND runId IN (SELECT runId FROM snapshots WHERE snapshotSeq > 0)
RETURNING runId, status;"
```

---

## 3) High Error Rate > 5% (P2)

**Detection**: Alert `HighErrorRate` (10-minute window)

### 3.1 Investigation (0-5 minutes)

```bash
# 1. Identify top failing plans
curl -s 'http://prometheus:9090/api/v1/query' \
  --data-urlencode 'query=topk(5, rate(dvt_runs_completed_total{status="failed"}[10m]) / rate(dvt_runs_completed_total[10m]))' \
  | jq '.data.result[] | {planId: .metric.planId, errorRate: .value[1]}'

# Example output:
# { "planId": "plan-dbt-01", "errorRate": "0.087" }  ← 8.7% fail rate

# 2. Check error codes
curl -s 'http://prometheus:9090/api/v1/query' \
  --data-urlencode 'query=topk(3, rate(dvt_runs_completed_total{status="failed", planId="plan-dbt-01"}[10m]))' \
  | jq '.data.result[] | {errorCode: .metric.error_code, rate: .value[1]}'

# 3. Sample logs
kibana_query "planId:plan-dbt-01 AND level:ERROR" timerange="last 10 minutes" limit=20

# 4. Sample failing runs
psql production -c "
SELECT
  runId,
  planId,
  status,
  error_code,
  error_message,
  completedAt
FROM runs_archive
WHERE planId = 'plan-dbt-01'
  AND status = 'FAILED'
  AND completedAt > NOW() - INTERVAL '10 minutes'
ORDER BY completedAt DESC
LIMIT 5;"
```

### 3.2 Diagnosis (5-15 minutes)

**Scenario A: Step timeout**

```bash
# Check if data.dbt-run timeout
psql production -c "
SELECT
  status,
  error_code,
  COUNT(*) as count
FROM runs_archive
WHERE planId = 'plan-dbt-01'
  AND completedAt > NOW() - INTERVAL '10 minutes'
GROUP BY status, error_code;"

# If many TIMEOUT errors → Check step timeout config
grep -r "timeout" plans/plan-dbt-01.json | head -5

# If timeout is too short, contact plan owner to increase
```

**Scenario B: Resource exhaustion (task queue)**

```bash
# Check worker queue depth
curl -s 'http://prometheus:9090/api/v1/query' \
  --data-urlencode 'query=dvt_workers_available{domain="tq-data"}' | jq

# If workers unavailable → scale up
kubectl scale deployment dvt-workers-data --replicas=15 -n production
```

**Scenario C: Plugin permission denied**

```bash
# Check plugin errors
curl -s 'http://prometheus:9090/api/v1/query' \
  --data-urlencode 'query=dvt_plugin_invocations_total{status="permission_denied"}[10m]' | jq

# Review plugin trust tier
psql production -c "
SELECT
  pluginId,
  trustTier,
  allowedCapabilities
FROM plugins
WHERE pluginId = 'plugin-xyz';

# If trust tier is LOW, contact security team for review
```

### 3.3 Mitigation (15+ minutes)

```bash
# Option A: Scale resources
kubectl scale deployment dvt-workers-control --replicas=8 -n production

# Option B: Increase timeouts (if plan-owned)
git checkout plans/plan-dbt-01.json
# Edit timeouts manually
git commit -am "Increase timeouts for plan-dbt-01 (P2 incident)"
git push origin main

# Option C: Prevent cascade (if widespread)
# Reduce ingestion rate or reject new runs
curl -X POST https://engine-api.prod/admin/throttle \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"targetRPS": 10, "reason": "P2 incident mitigation"}'
```

---

## 4) Stuck Workflow (In-flight > 30 minutes, no progress)

**Detection**: Manual investigation or alert `WorkflowNoProgressFor30m`

### 4.1 Diagnosis (0-5 minutes)

```bash
# 1. Find stuck runs
psql production -c "
SELECT
  runId,
  planId,
  startedAt,
  NOW() - startedAt as duration_hours,
  status,
  lastEventAt
FROM runs_archive
WHERE status = 'IN_FLIGHT'
  AND NOW() - startedAt > INTERVAL '30 minutes'
  AND NOW() - lastEventAt > INTERVAL '5 minutes'
ORDER BY startedAt ASC;"

# 2. Check in-flight step
psql production -c "
SELECT
  stepId,
  startedAt,
  engineAttemptId,
  logicalAttemptId,
  status
FROM step_snapshots
WHERE runId = 'run-stuck-001'
  AND status = 'IN_PROGRESS'
ORDER BY startedAt DESC
LIMIT 1;"

# 3. Check Temporal/Conductor activity status
tctl --namespace production workflow show -w run-stuck-001

# 4. Check logs
kubectl logs deployment/dvt-workers-control -n production \
  --selector=app=workflow-runner \
  | grep "run-stuck-001" | tail -20
```

### 4.2 Investigation Path

**If activity is running**:

```bash
# Activity may be legitimately slow (DBT, large compute)
# Check:
# 1. Timeout configuration (increase if needed)
# 2. Worker resource availability
# 3. External service (DB, cloud, API) availability

# Keep monitoring
watch -n 10 'psql production -c "SELECT NOW() - lastEventAt as quiet_duration FROM runs_archive WHERE runId = '"'"'run-stuck-001'"'"';"'
```

**If activity is stuck (no heartbeat)**:

```bash
# 1. Check Temporal activity details
tctl --namespace production activity describe \
  -w run-stuck-001 \
  -r 1

# 2. If activity abandoned → force timeout
tctl --namespace production workflow terminate \
  -w run-stuck-001 \
  -r "0" \
  -c "TIMEOUT after 30m inactivity"
```

### 4.3 Recovery (5-15 minutes)

```bash
# 1. Manual termination (if confirmed stuck)
psql production -c "
BEGIN;
UPDATE runs_archive
SET status = 'FAILED',
    error_code = 'TERMINATED_BY_OPERATOR',
    error_message = 'Manual termination due to 30m inactivity',
    completedAt = NOW()
WHERE runId = 'run-stuck-001';

INSERT INTO run_events (runId, eventType, engineAttemptId, logicalAttemptId, runSeq, idempotencyKey, data, emittedAt)
VALUES ('run-stuck-001', 'RunFailed', ...);
COMMIT;"

# 2. Notify user
slack_post "@user-email" "Run run-stuck-001 was terminated due to 30-minute inactivity. Please investigate plan or restart."

# 3. RCA
# Create postmortem: Why was the activity stuck?
```

---

## 5) StateStore Write Errors (P1)

**Detection**: Alert `StateStoreWriteFailure`

### 5.1 Immediate Check (0-1 minute)

```bash
# 1. Verify database connectivity
psql production -c "SELECT NOW();"

# 2. Check write queue
psql production -c "
SELECT
  COUNT(*) as pending_writes,
  MAX(createdAt) as oldest_write
FROM write_queue
WHERE processed = false;"

# 3. If write_queue has old entries → Database may be slow
```

### 5.2 Diagnosis (1-5 minutes)

```bash
# Check database logs
kubectl logs statefulset/postgres -n production --tail=100 --since=5m | grep -i error

# Check connection pool
psql production -c "SELECT * FROM pg_stat_activity WHERE state != 'idle';"

# Check disk space
kubectl exec -it postgres-0 -n production -- df -h /pgdata

# Check replication lag
psql production -c "SELECT * FROM pg_stat_replication;"
```

### 5.3 Mitigation (5-15 minutes)

**If database is slow**:

```bash
# Scale read replicas
kubectl scale deployment postgres-replica --replicas=5 -n production

# Kill long-running queries
psql production -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active' AND query_start < NOW() - INTERVAL '2 minutes';"
```

**If disk is full**:

```bash
# Archive old events (if safe)
psql production -c "
BEGIN;
CREATE TABLE run_events_archive AS
SELECT * FROM run_events
WHERE emittedAt < NOW() - INTERVAL '90 days';

DELETE FROM run_events
WHERE emittedAt < NOW() - INTERVAL '90 days';
COMMIT;"

# Expand volume
kubectl patch pvc postgres-pvc -n production -p '{"spec":{"resources":{"requests":{"storage":"2Ti"}}}}'
```

---

## 6) Deferred Signals Queue Buildup (P2)

**Detection**: Alert `DeferredSignalsQueueBuildup` (> 1000 signals)

### 6.1 Diagnosis (0-5 minutes)

```bash
# 1. Check queue size and age
psql production -c "
SELECT
  signal_type,
  status,
  COUNT(*) as count,
  MIN(createdAt) as oldest,
  MAX(createdAt) as newest
FROM deferred_signals
GROUP BY signal_type, status
ORDER BY count DESC;"

# 2. Check processor health
kubectl logs deployment/signal-processor -n production --tail=50 --since=10m | grep -i error

# 3. Identify problematic run
psql production -c "
SELECT
  runId,
  COUNT(*) as deferred_count
FROM deferred_signals
WHERE status = 'DEFERRED'
GROUP BY runId
ORDER BY deferred_count DESC
LIMIT 5;"
```

### 6.2 Recovery (5-15 minutes)

```bash
# Option A: Restart processor
kubectl rollout restart deployment/signal-processor -n production

# Option B: Retry stuck signals
psql production -c "
UPDATE deferred_signals
SET status = 'PENDING',
    retryCount = retryCount + 1,
    lastRetryAt = NOW()
WHERE status = 'FAILED'
  AND retryCount < 3
  AND lastRetryAt < NOW() - INTERVAL '1 minute';"

# Option C: Check run state (may be completed)
psql production -c "
SELECT status FROM runs_archive WHERE runId = 'run-xyz';"

# If completed, delete old deferred signals
psql production -c "
DELETE FROM deferred_signals
WHERE runId = 'run-xyz'
  AND createdAt < NOW() - INTERVAL '1 hour';"
```

---

## Escalation Matrix

| Alert                    | Severity | Escalation                      |
| ------------------------ | -------- | ------------------------------- |
| Adapter Heartbeat Lost   | P1       | Temporal SRE (on-call)          |
| Projection Gap           | P1       | Database SRE + Platform eng     |
| StateStore Write Failure | P1       | Database SRE (page immediately) |
| Error Rate > 5%          | P2       | Platform on-call (Slack first)  |
| Projection Lag > 100     | P2       | Platform on-call (investigate)  |
| Stuck Workflow (30m)     | P2       | Plan owner + platform eng       |

---

## Post-Incident

For **all P1 incidents**: Create postmortem within 24 hours.

```markdown
# Postmortem: [Incident Title]

**Date**: 2026-02-11  
**Duration**: 2026-02-11 14:25:00 UTC to 14:42:00 UTC (17 minutes)  
**Severity**: P1  
**Impact**: 127 in-flight runs blocked (median delay 15 minutes)

## Root Cause

[Describe what went wrong]

## Timeline

- 14:25:00: Alert `AdapterHeartbeatLost` fired
- 14:27:00: On-call acknowledged; found Temporal cluster offline
- 14:30:00: Infrastructure team identified network issue
- 14:42:00: Cluster recovered; runs resumed

## Contributing Factors

1. [Single point of failure]
2. [Lack of monitoring for X]

## Fixes

- [ ] Implement metrics for X
- [ ] Add redundancy for Y
- [ ] Update runbook with Z

## Owner

@platform-eng (due by 2026-02-13)
```
