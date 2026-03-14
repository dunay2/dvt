WITH seed AS (
  SELECT 'g5-canary-local-docker-' || to_char(clock_timestamp(),'YYYYMMDDHH24MISSMS') AS run_id,
         to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD""T""HH24:MI:SS.MS""Z""') AS emitted_at
),
inserted AS (
  INSERT INTO dvt.outbox (
    id, run_id, shard_id, run_seq, created_at, idempotency_key, payload,
    attempts, last_error, delivered_at, next_attempt_at, claimed_at
  )
  SELECT
    md5(random()::text || clock_timestamp()::text),
    seed.run_id,
    0,
    1,
    now(),
    seed.run_id || ':RunQueued:1',
    jsonb_build_object(
      'eventId', 'evt-' || seed.run_id || '-1',
      'eventType', 'RunQueued',
      'runId', seed.run_id,
      'tenantId', 'tenant-canary',
      'projectId', 'project-canary',
      'environmentId', 'local-docker',
      'planId', 'plan-canary',
      'planVersion', '1.0.0',
      'logicalAttemptId', 1,
      'engineAttemptId', 1,
      'emittedAt', seed.emitted_at,
      'persistedAt', seed.emitted_at,
      'idempotencyKey', seed.run_id || ':RunQueued:1',
      'runSeq', 1
    ),
    0, NULL, NULL, NULL, NULL
  FROM seed
  RETURNING id, run_id, shard_id
)
SELECT row_to_json(inserted) FROM inserted;