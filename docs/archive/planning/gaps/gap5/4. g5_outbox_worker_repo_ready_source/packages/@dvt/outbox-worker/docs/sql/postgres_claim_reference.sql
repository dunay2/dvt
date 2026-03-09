-- Reference SQL only. This file documents the intended claim shape for a Postgres adapter.
-- It is not executed by the package directly.

-- Unordered claim with cooperative locking.
WITH next_records AS (
  SELECT record_id
  FROM dvt_outbox_records
  WHERE status IN ('pending', 'retry_scheduled')
    AND due_at <= NOW()
  ORDER BY created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT $1
)
UPDATE dvt_outbox_records AS r
SET status = 'leased',
    lease_owner_id = $2,
    lease_expires_at = NOW() + ($3 || ' milliseconds')::interval,
    attempt_count = attempt_count + 1
FROM next_records nr
WHERE r.record_id = nr.record_id
RETURNING r.*;

-- Ordered lane lease reference.
-- This lane table is optional and belongs to the adapter layer.
WITH next_lane AS (
  SELECT lane_key
  FROM dvt_outbox_lane_leases
  WHERE (lease_expires_at IS NULL OR lease_expires_at <= NOW())
    AND backlog_count > 0
  ORDER BY oldest_record_created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
UPDATE dvt_outbox_lane_leases l
SET lease_owner_id = $1,
    lease_expires_at = NOW() + ($2 || ' milliseconds')::interval
FROM next_lane nl
WHERE l.lane_key = nl.lane_key
RETURNING l.lane_key;
