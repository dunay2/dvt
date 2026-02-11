# Snowflake State Store Adapter

**Status**: Implementation Guide  
**Version**: 1.0  
**Backend**: Snowflake  
**Contract**: [State Store Contract](../../../contracts/state-store/README.md)  

---

## Purpose

This document specifies how to implement the [State Store Contract](../../../contracts/state-store/README.md) using **Snowflake** as the persistence backend.

**Key design decisions**:

- ✅ Leverage `VARIANT` for flexible event schema evolution
- ✅ Use `MERGE` for idempotent appends (upsert pattern)
- ✅ Cluster by `(RUN_ID, PERSISTED_AT)` for polling/projection queries
- ⚠️ Snowflake does NOT enforce `PRIMARY KEY` or `UNIQUE` constraints (logical only)
- ⚠️ `runSeq` assignment requires application-side or stored procedure logic

---

## 1) Physical Schema (DDL)

### 1.1 RUN_EVENTS Table

```sql
-- Core event log (append-only, source of truth)
CREATE TABLE IF NOT EXISTS RUN_EVENTS (
  -- Identity
  RUN_ID             STRING        NOT NULL,
  RUN_SEQ            NUMBER(38,0)  NOT NULL,  -- Assigned by Append Authority (monotonic per RUN_ID)
  EVENT_ID           STRING        NOT NULL,  -- UUID as string
  
  -- Step context
  STEP_ID            STRING,                  -- NULL for run-level events
  ENGINE_ATTEMPT_ID  STRING,                  -- Platform-level retry counter (Temporal attemptNumber)
  LOGICAL_ATTEMPT_ID STRING,                  -- Business-level retry counter
  
  -- Event payload
  EVENT_TYPE         STRING        NOT NULL,  -- "RunStarted", "StepCompleted", etc.
  EVENT_DATA         VARIANT,                 -- Event-specific payload (JSON)
  
  -- Idempotency & causality
  IDEMPOTENCY_KEY    STRING        NOT NULL,  -- SHA256 hex (unique per runId)
  CAUSED_BY_SIGNAL_ID STRING,                 -- UUID as string
  PARENT_EVENT_ID    STRING,                  -- UUID as string
  
  -- Timestamps
  EMITTED_AT         TIMESTAMP_NTZ NOT NULL,  -- When activity emitted
  PERSISTED_AT       TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  
  -- Metadata
  ADAPTER_VERSION    STRING,                  -- Engine adapter version (e.g., "temporal-v1.2.3")
  ENGINE_RUN_REF     VARIANT                  -- Platform-specific reference (Temporal WorkflowId, etc.)
);

-- Performance optimization: cluster by runId + time for polling/projection
ALTER TABLE RUN_EVENTS CLUSTER BY (RUN_ID, PERSISTED_AT);

-- Comments (documentation in schema)
COMMENT ON TABLE RUN_EVENTS IS 'Append-only event log (source of truth for all execution state)';
COMMENT ON COLUMN RUN_EVENTS.RUN_SEQ IS 'Monotonic sequence per RUN_ID (gaps allowed, assigned by Append Authority)';
COMMENT ON COLUMN RUN_EVENTS.IDEMPOTENCY_KEY IS 'SHA256(runId | stepId | logicalAttemptId | eventType | planVersion)';
```

**Logical constraints** (NOT enforced by Snowflake, must be enforced by application logic):

- **Unique key**: `(RUN_ID, RUN_SEQ)`
- **Uniqueness**: `(RUN_ID, IDEMPOTENCY_KEY)`

### 1.2 RUN_SNAPSHOTS Table (Materialized View)

```sql
-- Derived state (immutable snapshots, not source of truth)
CREATE TABLE IF NOT EXISTS RUN_SNAPSHOTS (
  RUN_ID             STRING        NOT NULL,
  STATUS             STRING        NOT NULL,  -- "PENDING", "RUNNING", "COMPLETED", etc.
  LAST_EVENT_SEQ     NUMBER(38,0)  NOT NULL,  -- High-water mark (projection watermark)
  
  -- Snapshot payload
  SNAPSHOT_DATA      VARIANT       NOT NULL,  -- RunSnapshot JSON
  
  -- Timestamps
  STARTED_AT         TIMESTAMP_NTZ,
  COMPLETED_AT       TIMESTAMP_NTZ,
  PROJECTED_AT       TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  
  -- Version control
  VERSION            NUMBER(38,0)  DEFAULT 0  -- Optimistic concurrency control
);

-- Primary access pattern: lookup by runId
ALTER TABLE RUN_SNAPSHOTS CLUSTER BY (RUN_ID);

COMMENT ON TABLE RUN_SNAPSHOTS IS 'Materialized snapshots (derived from RUN_EVENTS, updated by projector)';
COMMENT ON COLUMN RUN_SNAPSHOTS.LAST_EVENT_SEQ IS 'Watermark: highest runSeq applied to this snapshot';
```

---

## 2) Append Authority Implementation

**Challenge**: Snowflake does NOT support `AUTO_INCREMENT` with grouping (e.g., "per RUN_ID").

**Solution**: Assign `runSeq` using `MAX(runSeq) + 1` within a transaction-like scope.

### 2.1 Stored Procedure (Recommended)

```sql
CREATE OR REPLACE PROCEDURE APPEND_EVENT(
  p_runId STRING,
  p_eventId STRING,
  p_stepId STRING,
  p_engineAttemptId STRING,
  p_logicalAttemptId STRING,
  p_eventType STRING,
  p_eventData VARIANT,
  p_idempotencyKey STRING,
  p_causedBySignalId STRING,
  p_parentEventId STRING,
  p_emittedAt TIMESTAMP_NTZ,
  p_adapterVersion STRING,
  p_engineRunRef VARIANT
)
RETURNS TABLE (RUN_SEQ NUMBER, IDEMPOTENT BOOLEAN, PERSISTED BOOLEAN)
LANGUAGE SQL
AS
$$
DECLARE
  v_existingSeq NUMBER;
  v_newSeq NUMBER;
BEGIN
  -- Check if idempotencyKey already exists (idempotent append)
  SELECT RUN_SEQ INTO :v_existingSeq
  FROM RUN_EVENTS
  WHERE RUN_ID = :p_runId AND IDEMPOTENCY_KEY = :p_idempotencyKey
  LIMIT 1;
  
  IF (:v_existingSeq IS NOT NULL) THEN
    -- Duplicate: return existing runSeq
    RETURN TABLE(SELECT :v_existingSeq AS RUN_SEQ, TRUE AS IDEMPOTENT, FALSE AS PERSISTED);
  END IF;
  
  -- Assign new runSeq (monotonic: MAX + 1)
  SELECT COALESCE(MAX(RUN_SEQ), 0) + 1 INTO :v_newSeq
  FROM RUN_EVENTS
  WHERE RUN_ID = :p_runId;
  
  -- Insert new event
  INSERT INTO RUN_EVENTS (
    RUN_ID, RUN_SEQ, EVENT_ID, STEP_ID, ENGINE_ATTEMPT_ID, LOGICAL_ATTEMPT_ID,
    EVENT_TYPE, EVENT_DATA, IDEMPOTENCY_KEY, CAUSED_BY_SIGNAL_ID, PARENT_EVENT_ID,
    EMITTED_AT, ADAPTER_VERSION, ENGINE_RUN_REF
  ) VALUES (
    :p_runId, :v_newSeq, :p_eventId, :p_stepId, :p_engineAttemptId, :p_logicalAttemptId,
    :p_eventType, :p_eventData, :p_idempotencyKey, :p_causedBySignalId, :p_parentEventId,
    :p_emittedAt, :p_adapterVersion, :p_engineRunRef
  );
  
  RETURN TABLE(SELECT :v_newSeq AS RUN_SEQ, FALSE AS IDEMPOTENT, TRUE AS PERSISTED);
END;
$$;
```

**Usage**:

```sql
CALL APPEND_EVENT(
  p_runId => 'run-12345',
  p_eventId => 'evt-abc',
  p_stepId => 'step-dbt-run',
  p_engineAttemptId => '1',
  p_logicalAttemptId => '1',
  p_eventType => 'StepCompleted',
  p_eventData => PARSE_JSON('{"exitCode":0,"durationMs":1234}'),
  p_idempotencyKey => 'sha256...',
  p_causedBySignalId => NULL,
  p_parentEventId => 'evt-xyz',
  p_emittedAt => CURRENT_TIMESTAMP(),
  p_adapterVersion => 'temporal-v1.2.3',
  p_engineRunRef => PARSE_JSON('{"workflowId":"wf-12345","runId":"run-abc"}')
);
-- Returns: { RUN_SEQ: 10, IDEMPOTENT: false, PERSISTED: true }
```

### 2.2 Application-Side (Alternative)

For lighter-weight implementations, assign `runSeq` in application code:

```typescript
async function appendEvent(event: CanonicalEngineEvent): Promise<AppendResult> {
  // Check for existing event (idempotency)
  const existing = await snowflake.query<{ RUN_SEQ: number }>(
    `SELECT RUN_SEQ FROM RUN_EVENTS 
     WHERE RUN_ID = ? AND IDEMPOTENCY_KEY = ? 
     LIMIT 1`,
    [event.runId, event.idempotencyKey]
  );
  
  if (existing.length > 0) {
    return { runSeq: existing[0].RUN_SEQ, idempotent: true, persisted: false };
  }
  
  // Acquire lock (critical section per runId to prevent race conditions)
  await acquireLock(event.runId); // Redis lock, DB advisory lock, etc.
  
  try {
    // Get next runSeq
    const maxSeqResult = await snowflake.query<{ MAX_SEQ: number }>(
      `SELECT COALESCE(MAX(RUN_SEQ), 0) AS MAX_SEQ 
       FROM RUN_EVENTS 
       WHERE RUN_ID = ?`,
      [event.runId]
    );
    const newSeq = maxSeqResult[0].MAX_SEQ + 1;
    
    // Insert
    await snowflake.execute(
      `INSERT INTO RUN_EVENTS (...) VALUES (?, ?, ...)`,
      [event.runId, newSeq, ...]
    );
    
    return { runSeq: newSeq, idempotent: false, persisted: true };
  } finally {
    await releaseLock(event.runId);
  }
}
```

**Trade-offs**:

- ✅ More flexible (easier to add business logic)
- ⚠️ Requires distributed lock (Redis, ZooKeeper, etc.)
- ⚠️ More network round-trips vs stored procedure

---

## 3) Fetch Events (Watermark Pattern)

```sql
-- Fetch events for projection (paginated, watermark-based)
SELECT 
  RUN_ID,
  RUN_SEQ,
  EVENT_ID,
  STEP_ID,
  ENGINE_ATTEMPT_ID,
  LOGICAL_ATTEMPT_ID,
  EVENT_TYPE,
  EVENT_DATA,
  IDEMPOTENCY_KEY,
  EMITTED_AT,
  PERSISTED_AT,
  ADAPTER_VERSION,
  ENGINE_RUN_REF,
  CAUSED_BY_SIGNAL_ID,
  PARENT_EVENT_ID
FROM RUN_EVENTS
WHERE RUN_ID = :runId
  AND RUN_SEQ > :lastEventSeq  -- Watermark filter
ORDER BY RUN_SEQ ASC
LIMIT :limit;
```

**Clustering benefit**: `CLUSTER BY (RUN_ID, PERSISTED_AT)` optimizes this query (single micro-partition scan for most cases).

---

## 4) Snapshot Projection (Materialized View)

### 4.1 Incremental Update Pattern

```sql
-- Projector reconciler: update snapshot with new events
MERGE INTO RUN_SNAPSHOTS AS target
USING (
  -- Aggregate new events since last projection
  SELECT 
    RUN_ID,
    MAX(RUN_SEQ) AS LAST_EVENT_SEQ,
    MAX(CASE WHEN EVENT_TYPE = 'RunCompleted' THEN PERSISTED_AT END) AS COMPLETED_AT,
    -- ... more derived fields
    PROJECT_SNAPSHOT(ARRAY_AGG(OBJECT_CONSTRUCT(*))) AS SNAPSHOT_DATA  -- UDF
  FROM RUN_EVENTS
  WHERE RUN_ID = :runId
    AND RUN_SEQ > (SELECT LAST_EVENT_SEQ FROM RUN_SNAPSHOTS WHERE RUN_ID = :runId)
  GROUP BY RUN_ID
) AS source
ON target.RUN_ID = source.RUN_ID
WHEN MATCHED THEN UPDATE SET
  target.LAST_EVENT_SEQ = source.LAST_EVENT_SEQ,
  target.SNAPSHOT_DATA = source.SNAPSHOT_DATA,
  target.COMPLETED_AT = COALESCE(source.COMPLETED_AT, target.COMPLETED_AT),
  target.PROJECTED_AT = CURRENT_TIMESTAMP(),
  target.VERSION = target.VERSION + 1
WHEN NOT MATCHED THEN INSERT (
  RUN_ID, LAST_EVENT_SEQ, SNAPSHOT_DATA, PROJECTED_AT, VERSION
) VALUES (
  source.RUN_ID, source.LAST_EVENT_SEQ, source.SNAPSHOT_DATA, CURRENT_TIMESTAMP(), 0
);
```

### 4.2 On-Demand Projection (Cold Start)

```sql
-- Project snapshot from scratch (replay all events)
SELECT PROJECT_SNAPSHOT(ARRAY_AGG(OBJECT_CONSTRUCT(*) ORDER BY RUN_SEQ)) AS snapshot
FROM RUN_EVENTS
WHERE RUN_ID = :runId;
```

**`PROJECT_SNAPSHOT` UDF** (JavaScript in Snowflake or application-side):

```javascript
// Snowflake JavaScript UDF (example)
CREATE OR REPLACE FUNCTION PROJECT_SNAPSHOT(events ARRAY)
RETURNS VARIANT
LANGUAGE JAVASCRIPT
AS $$
  let snapshot = { runId: null, status: "PENDING", steps: {}, artifacts: [] };
  
  for (const evt of EVENTS) {
    snapshot.runId = evt.RUN_ID;
    
    switch (evt.EVENT_TYPE) {
      case "RunStarted":
        snapshot.status = "RUNNING";
        snapshot.startedAt = evt.EMITTED_AT;
        break;
      case "StepCompleted":
        snapshot.steps[evt.STEP_ID] = { status: "SUCCESS", ... };
        break;
      // ... other event types
      case "RunCompleted":
        snapshot.status = "COMPLETED";
        snapshot.completedAt = evt.EMITTED_AT;
        break;
    }
  }
  
  return snapshot;
$$;
```

---

## 5) Idempotency Handling

### 5.1 MERGE Pattern (Upsert)

```sql
-- Idempotent append: MERGE ensures duplicate idempotencyKey returns existing runSeq
MERGE INTO RUN_EVENTS AS target
USING (
  SELECT 
    :runId AS RUN_ID,
    :idempotencyKey AS IDEMPOTENCY_KEY,
    :eventId AS EVENT_ID,
    -- ... other fields
    COALESCE(
      (SELECT MAX(RUN_SEQ) FROM RUN_EVENTS WHERE RUN_ID = :runId),
      0
    ) + 1 AS RUN_SEQ
) AS source
ON target.RUN_ID = source.RUN_ID 
   AND target.IDEMPOTENCY_KEY = source.IDEMPOTENCY_KEY
WHEN NOT MATCHED THEN INSERT (
  RUN_ID, RUN_SEQ, EVENT_ID, IDEMPOTENCY_KEY, ...
) VALUES (
  source.RUN_ID, source.RUN_SEQ, source.EVENT_ID, source.IDEMPOTENCY_KEY, ...
);

-- Return result (existing or new)
SELECT RUN_SEQ, 
       (PERSISTED_AT < CURRENT_TIMESTAMP() - INTERVAL '1 second') AS IDEMPOTENT
FROM RUN_EVENTS
WHERE RUN_ID = :runId AND IDEMPOTENCY_KEY = :idempotencyKey;
```

**Caveat**: `MERGE` in Snowflake does NOT guarantee atomicity with concurrent `MAX(RUN_SEQ)` queries. Use stored procedure or application-side locking.

---

## 6) Performance Tuning

### 6.1 Clustering Strategy

**Recommendation**: Cluster by `(RUN_ID, PERSISTED_AT)`

```sql
ALTER TABLE RUN_EVENTS CLUSTER BY (RUN_ID, PERSISTED_AT);
```

**Rationale**:

- ✅ Co-locates all events for a run (single micro-partition scan for projection)
- ✅ Time-ordering enables efficient watermark queries (`RUN_SEQ > lastSeq`)
- ⚠️ Automatic clustering maintenance (Snowflake reclusters periodically)

### 6.2 Search Optimization Service

For high-cardinality lookups (e.g., `WHERE IDEMPOTENCY_KEY = ?`):

```sql
ALTER TABLE RUN_EVENTS ADD SEARCH OPTIMIZATION ON EQUALITY(IDEMPOTENCY_KEY);
```

### 6.3 Retention & Archival

```sql
-- Archive completed runs older than 90 days
CREATE TABLE RUN_EVENTS_ARCHIVE LIKE RUN_EVENTS;

INSERT INTO RUN_EVENTS_ARCHIVE
SELECT * FROM RUN_EVENTS
WHERE RUN_ID IN (
  SELECT DISTINCT RUN_ID FROM RUN_SNAPSHOTS
  WHERE STATUS IN ('COMPLETED', 'FAILED', 'CANCELLED')
    AND COMPLETED_AT < DATEADD(day, -90, CURRENT_TIMESTAMP())
);

DELETE FROM RUN_EVENTS
WHERE RUN_ID IN (SELECT RUN_ID FROM RUN_EVENTS_ARCHIVE);
```

---

## 7) Limitations & Trade-offs

| Aspect | Limitation | Mitigation |
|--------|-----------|------------|
| **No PK enforcement** | Snowflake does NOT enforce uniqueness | Application logic + idempotency checks |
| **runSeq assignment** | Requires `MAX(runSeq) + 1` (not atomic without lock) | Use stored procedure OR application-side lock |
| **Concurrent writes** | Multiple writers can create gaps | Expected behavior (see [ExecutionSemantics.v1.md § 1.0](../../../contracts/engine/ExecutionSemantics.v1.md#10-runseq-design-decision)) |
| **Cost** | Clustering maintenance incurs credits | Monitor with `SYSTEM$CLUSTERING_INFORMATION()` |

---

## 8) Migration from Other Backends

### 8.1 From Postgres

**Key differences**:

- Postgres `SERIAL` → Snowflake stored procedure with `MAX + 1`
- Postgres `ON CONFLICT` → Snowflake `MERGE`
- Postgres transactions → Snowflake stored procedure (implicit transaction per statement)

**Migration script**:

```sql
-- Export from Postgres
COPY (SELECT * FROM run_events) TO '/tmp/run_events.csv' WITH CSV HEADER;

-- Import to Snowflake
PUT file:///tmp/run_events.csv @my_stage;
COPY INTO RUN_EVENTS FROM @my_stage/run_events.csv.gz FILE_FORMAT = (TYPE = CSV SKIP_HEADER = 1);
```

---

## Change Log

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2026-02-11 | Initial Snowflake adapter (extracted from ExecutionSemantics.v1.md) |
