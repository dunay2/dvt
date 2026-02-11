# Postgres State Store Adapter

**Status**: Implementation Guide  
**Version**: 1.0  
**Backend**: PostgreSQL 14+  
**Contract**: [State Store Contract](../../../contracts/state-store/README.md)  

---

## Purpose

This document specifies how to implement the [State Store Contract](../../../contracts/state-store/README.md) using **PostgreSQL** as the persistence backend.

**Key design decisions**:
- ✅ Use `SERIAL` or `SEQUENCE` for runSeq assignment (native atomic increment)
- ✅ Enforce `UNIQUE` constraints at database level (vs Snowflake logical-only)
- ✅ Use `JSONB` for flexible event schema evolution
- ✅ Leverage `ON CONFLICT` for idempotent upserts
- ✅ Use `GENERATED ALWAYS AS IDENTITY` for modern Postgres (v10+)

---

## 1) Physical Schema (DDL)

### 1.1 RUN_EVENTS Table

```sql
-- Core event log (append-only, source of truth)
CREATE TABLE IF NOT EXISTS run_events (
  -- Identity
  run_id             TEXT          NOT NULL,
  run_seq            BIGINT        NOT NULL,  -- Assigned by sequence or app logic
  event_id           UUID          NOT NULL DEFAULT gen_random_uuid(),
  
  -- Step context
  step_id            TEXT,
  engine_attempt_id  TEXT,
  logical_attempt_id TEXT,
  
  -- Event payload
  event_type         TEXT          NOT NULL,
  event_data         JSONB,
  
  -- Idempotency & causality
  idempotency_key    TEXT          NOT NULL,
  caused_by_signal_id UUID,
  parent_event_id    UUID,
  
  -- Timestamps
  emitted_at         TIMESTAMPTZ   NOT NULL,
  persisted_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  
  -- Metadata
  adapter_version    TEXT,
  engine_run_ref     JSONB,
  
  -- Constraints
  PRIMARY KEY (run_id, run_seq),
  UNIQUE (run_id, idempotency_key)
);

-- Indexes for common queries
CREATE INDEX idx_run_events_runid_runseq ON run_events(run_id, run_seq);
CREATE INDEX idx_run_events_idempotency ON run_events(run_id, idempotency_key);
CREATE INDEX idx_run_events_eventtype ON run_events(event_type) WHERE event_type IN ('RunCompleted', 'RunFailed');

-- Comments
COMMENT ON TABLE run_events IS 'Append-only event log (source of truth for all execution state)';
COMMENT ON COLUMN run_events.run_seq IS 'Monotonic sequence per run_id (gaps allowed, assigned by append authority)';
COMMENT ON COLUMN run_events.idempotency_key IS 'SHA256(runId | stepId | logicalAttemptId | eventType | planVersion)';
```

---

## 2) Append Authority Implementation

### 2.1 Strategy A: Application-Managed Sequence

**Use case**: Full control, easier to add business logic

```typescript
async function appendEvent(event: CanonicalEngineEvent): Promise<AppendResult> {
  return await db.transaction(async (tx) => {
    // Check idempotency
    const existing = await tx.oneOrNone<{ run_seq: number }>(
      `SELECT run_seq FROM run_events 
       WHERE run_id = $1 AND idempotency_key = $2`,
      [event.runId, event.idempotencyKey]
    );
    
    if (existing) {
      return { runSeq: existing.run_seq, idempotent: true, persisted: false };
    }
    
    // Get next runSeq
    const { max_seq } = await tx.one<{ max_seq: number }>(
      `SELECT COALESCE(MAX(run_seq), 0) AS max_seq 
       FROM run_events 
       WHERE run_id = $1 
       FOR UPDATE`,  -- Lock to prevent race conditions
      [event.runId]
    );
    
    const newSeq = max_seq + 1;
    
    // Insert
    await tx.none(
      `INSERT INTO run_events (
        run_id, run_seq, event_id, step_id, engine_attempt_id, logical_attempt_id,
        event_type, event_data, idempotency_key, caused_by_signal_id, parent_event_id,
        emitted_at, adapter_version, engine_run_ref
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [event.runId, newSeq, event.eventId, ...]
    );
    
    return { runSeq: newSeq, idempotent: false, persisted: true };
  });
}
```

### 2.2 Strategy B: Database Sequence (Advanced)

**Challenge**: Postgres sequences are global, not per-group (no "sequence per runId").

**Workaround**: Use a **sequence registry table**:

```sql
-- Registry: one sequence per runId
CREATE TABLE run_sequence_registry (
  run_id TEXT PRIMARY KEY,
  seq_name TEXT UNIQUE NOT NULL
);

-- Function: get or create sequence for runId
CREATE OR REPLACE FUNCTION get_run_sequence(p_run_id TEXT)
RETURNS TEXT AS $$
DECLARE
  v_seq_name TEXT;
BEGIN
  -- Check if sequence exists
  SELECT seq_name INTO v_seq_name
  FROM run_sequence_registry
  WHERE run_id = p_run_id;
  
  IF v_seq_name IS NULL THEN
    -- Create new sequence
    v_seq_name := 'run_seq_' || REPLACE(p_run_id, '-', '_');
    EXECUTE format('CREATE SEQUENCE IF NOT EXISTS %I', v_seq_name);
    
    INSERT INTO run_sequence_registry (run_id, seq_name)
    VALUES (p_run_id, v_seq_name);
  END IF;
  
  RETURN v_seq_name;
END;
$$ LANGUAGE plpgsql;

-- Usage: get next runSeq
SELECT nextval(get_run_sequence('run-12345'));  -- Returns: 1, 2, 3, ...
```

**Trade-off**:
- ✅ True atomic increment (no locks needed)
- ❌ Sequence proliferation (1 sequence per run, could be millions)
- ⚠️ Cleanup required (drop sequences for archived runs)

---

## 3) Idempotent Append (ON CONFLICT)

```sql
-- Insert with idempotency (ON CONFLICT DO NOTHING)
WITH new_event AS (
  SELECT 
    $1::TEXT AS run_id,
    COALESCE((SELECT MAX(run_seq) FROM run_events WHERE run_id = $1), 0) + 1 AS run_seq,
    $2::UUID AS event_id,
    $3::TEXT AS idempotency_key,
    -- ... other fields
)
INSERT INTO run_events (run_id, run_seq, event_id, idempotency_key, ...)
SELECT * FROM new_event
ON CONFLICT (run_id, idempotency_key) DO NOTHING;

-- Return result (existing or new runSeq)
SELECT run_seq, (persisted_at < NOW() - INTERVAL '1 second') AS idempotent
FROM run_events
WHERE run_id = $1 AND idempotency_key = $2;
```

**Important**: Wrap in transaction with `FOR UPDATE` lock to prevent race conditions on `MAX(run_seq)`.

---

## 4) Fetch Events (Watermark Pattern)

```sql
-- Fetch events for projection (paginated, watermark-based)
SELECT 
  run_id,
  run_seq,
  event_id,
  step_id,
  engine_attempt_id,
  logical_attempt_id,
  event_type,
  event_data,
  idempotency_key,
  emitted_at,
  persisted_at,
  adapter_version,
  engine_run_ref,
  caused_by_signal_id,
  parent_event_id
FROM run_events
WHERE run_id = $1
  AND run_seq > $2  -- Watermark filter
ORDER BY run_seq ASC
LIMIT $3;
```

**Index usage**: `idx_run_events_runid_runseq` (Index-only scan for most queries).

---

## 5) Snapshot Projection

### 5.1 Materialized View (Auto-Refresh)

```sql
CREATE MATERIALIZED VIEW run_snapshots AS
SELECT 
  run_id,
  MAX(run_seq) AS last_event_seq,
  jsonb_build_object(
    'runId', run_id,
    'status', (
      SELECT event_data->>'status' 
      FROM run_events e2 
      WHERE e2.run_id = e1.run_id 
        AND event_type IN ('RunStarted', 'RunCompleted', 'RunFailed')
      ORDER BY run_seq DESC 
      LIMIT 1
    ),
    'steps', (
      SELECT jsonb_object_agg(step_id, event_data)
      FROM run_events e3
      WHERE e3.run_id = e1.run_id AND event_type LIKE 'Step%'
    )
  ) AS snapshot_data
FROM run_events e1
GROUP BY run_id;

-- Refresh (manual or via cron)
REFRESH MATERIALIZED VIEW CONCURRENTLY run_snapshots;
```

### 5.2 Incremental Update (Trigger-Based)

```sql
-- Projector table
CREATE TABLE run_snapshots (
  run_id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  last_event_seq BIGINT NOT NULL,
  snapshot_data JSONB NOT NULL,
  projected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version BIGINT DEFAULT 0
);

-- Trigger: update snapshot on new event
CREATE OR REPLACE FUNCTION update_snapshot_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO run_snapshots (run_id, last_event_seq, snapshot_data, status)
  VALUES (NEW.run_id, NEW.run_seq, project_snapshot(NEW.run_id), 'RUNNING')
  ON CONFLICT (run_id) DO UPDATE SET
    last_event_seq = GREATEST(run_snapshots.last_event_seq, NEW.run_seq),
    snapshot_data = project_snapshot(NEW.run_id),
    projected_at = NOW(),
    version = run_snapshots.version + 1;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_snapshot
AFTER INSERT ON run_events
FOR EACH ROW
EXECUTE FUNCTION update_snapshot_trigger();
```

---

## 6) Performance Tuning

### 6.1 Partitioning (Large Workloads)

```sql
-- Partition by run_id hash (distribute load)
CREATE TABLE run_events (
  -- ... columns
) PARTITION BY HASH (run_id);

CREATE TABLE run_events_p0 PARTITION OF run_events FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE run_events_p1 PARTITION OF run_events FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE run_events_p2 PARTITION OF run_events FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE run_events_p3 PARTITION OF run_events FOR VALUES WITH (MODULUS 4, REMAINDER 3);
```

### 6.2 JSONB Indexing

```sql
-- Index on event_type (frequent filter)
CREATE INDEX idx_run_events_event_type ON run_events USING BTREE(event_type);

-- GIN index on event_data (full-text search)
CREATE INDEX idx_run_events_event_data_gin ON run_events USING GIN(event_data);
```

---

## 7) Limitations & Trade-offs

| Aspect | Limitation | Mitigation |
|--------|-----------|------------|
| **Sequence per run** | Not natively supported | Use application-side `MAX + 1` OR sequence registry |
| **Contention on MAX(run_seq)** | High-frequency writers may conflict | Use `FOR UPDATE` lock + retry logic |
| **JSONB vs VARIANT** | Less flexible than Snowflake VARIANT | Use jsonb_set() for schema evolution |

---

## Change Log

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2026-02-11 | Initial Postgres adapter (parallel to Snowflake adapter) |
