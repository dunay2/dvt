-- =============================================================================
-- Admission Control — Emergency Stuck-Event Cleanup
-- =============================================================================
-- Purpose: Diagnose and resolve stuck outbox events that are causing
--          system backpressure (SYSTEM_BACKPRESSURE / high outbox_oldest_age_ms).
--
-- IMPORTANT:
--   1. Replace :schema with the actual schema name (e.g. 'dvt').
--   2. Run all diagnostic queries READ-ONLY first (Steps 1–3).
--   3. Confirm findings with the on-call engineer before running any DML.
--   4. Wrap all DML in a transaction and review before committing.
--
-- Runbook: docs/runbooks/admission-control-runbook.md
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Step 1 — Diagnose: how many undelivered events are there and how old?
-- -----------------------------------------------------------------------------

SELECT
  COUNT(*)                                           AS total_pending,
  MIN(created_at)                                    AS oldest_created_at,
  NOW() - MIN(created_at)                            AS oldest_age,
  MAX(attempts)                                      AS max_attempts,
  COUNT(*) FILTER (WHERE attempts > 3)               AS retried_more_than_3x,
  COUNT(*) FILTER (WHERE claimed_at IS NOT NULL
                     AND claimed_at < NOW() - INTERVAL '10 minutes') AS stale_claims
FROM :schema.outbox
WHERE delivered_at IS NULL;


-- -----------------------------------------------------------------------------
-- Step 2 — Identify the oldest stuck events (inspect before acting)
-- -----------------------------------------------------------------------------

SELECT
  id,
  run_id,
  shard_id,
  created_at,
  NOW() - created_at  AS age,
  attempts,
  claimed_at,
  last_error
FROM :schema.outbox
WHERE delivered_at IS NULL
ORDER BY created_at ASC
LIMIT 20;


-- -----------------------------------------------------------------------------
-- Step 3 — Per-run_id backlog summary (identify problematic runs)
-- -----------------------------------------------------------------------------

SELECT
  run_id,
  COUNT(*)            AS pending_count,
  MIN(created_at)     AS oldest_event,
  MAX(attempts)       AS max_attempts,
  MAX(last_error)     AS last_error
FROM :schema.outbox
WHERE delivered_at IS NULL
GROUP BY run_id
ORDER BY oldest_event ASC
LIMIT 20;


-- -----------------------------------------------------------------------------
-- Step 4a — Release stale claims (allow worker to retry)
--           Use when: events are stuck because claimed_at is old but not cleared.
-- -----------------------------------------------------------------------------

-- DRY RUN first:
SELECT COUNT(*) AS stale_claims_to_release
FROM :schema.outbox
WHERE delivered_at IS NULL
  AND claimed_at IS NOT NULL
  AND claimed_at < NOW() - INTERVAL '10 minutes';

-- Execute (wrap in transaction, review before COMMIT):
/*
BEGIN;

UPDATE :schema.outbox
SET claimed_at = NULL
WHERE delivered_at IS NULL
  AND claimed_at IS NOT NULL
  AND claimed_at < NOW() - INTERVAL '10 minutes';

-- Review rows updated, then COMMIT or ROLLBACK.
ROLLBACK; -- change to COMMIT when confirmed
*/


-- -----------------------------------------------------------------------------
-- Step 4b — Quarantine a specific run's events (mark as delivered to unblock)
--           Use when: a single run's events are permanently stuck / poisoned.
--           NOTE: this is a lossy operation — the engine will NOT receive these events.
--           Only use after confirming the run is already in a terminal state.
-- -----------------------------------------------------------------------------

-- Verify the run is terminal before quarantining:
SELECT status FROM :schema.run_snapshots WHERE run_id = '<TARGET_RUN_ID>';

-- DRY RUN:
SELECT COUNT(*) AS events_to_quarantine
FROM :schema.outbox
WHERE run_id = '<TARGET_RUN_ID>'
  AND delivered_at IS NULL;

-- Execute (wrap in transaction):
/*
BEGIN;

UPDATE :schema.outbox
SET
  delivered_at = NOW(),
  last_error   = 'QUARANTINED: manual emergency cleanup ' || NOW()
WHERE run_id = '<TARGET_RUN_ID>'
  AND delivered_at IS NULL;

-- Review, then COMMIT or ROLLBACK.
ROLLBACK; -- change to COMMIT when confirmed
*/


-- -----------------------------------------------------------------------------
-- Step 5 — Verify backlog after cleanup
-- -----------------------------------------------------------------------------

SELECT
  COUNT(*)           AS remaining_pending,
  MIN(created_at)    AS new_oldest,
  NOW() - MIN(created_at) AS new_oldest_age
FROM :schema.outbox
WHERE delivered_at IS NULL;
