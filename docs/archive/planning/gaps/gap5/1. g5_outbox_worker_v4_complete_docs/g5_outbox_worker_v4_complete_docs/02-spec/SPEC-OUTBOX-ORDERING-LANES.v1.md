---
title: SPEC-OUTBOX-ORDERING-LANES v1
status: Draft
owner: architecture
last_reviewed: 2026-03-08
---

# SPEC-OUTBOX-ORDERING-LANES v1

## 1. Purpose

This specification defines how ordering is implemented in the polling worker
family when ordering matters.

It exists because the worker does not and should not claim global ordering.

## 2. When ordering lanes are required

Ordering lanes are required only for topics whose subscribers depend on
per-key sequencing.

Typical examples:

- workflow snapshot projection per `runId`,
- status compaction per aggregate identifier,
- side-effecting delivery where the downstream system requires key-local order.

If a topic does not require sequencing, `laneKey` is `NULL` and the unordered
claim path is used.

## 3. Lane data model

```ts
export interface OrderedOutboxRecord extends OutboxRecord {
  readonly orderingKey: string;
  readonly laneKey: string;
  readonly sequenceInLane: number;
}
```

### Database requirements

For ordered topics, the enqueue path must write:

- `ordering_key`
- `lane_key`
- `sequence_in_lane`

Recommended rule for MVP:

- `lane_key = ordering_key`

This avoids an extra hashing layer unless proven necessary.

## 4. Lane ownership model

Lane ordering is preserved by a separate lane lease table.

```sql
create table if not exists outbox_lane_lease (
  lane_key text primary key,
  lease_owner text null,
  lease_expires_at timestamptz null,
  last_claimed_at timestamptz null,
  updated_at timestamptz not null default now()
);
```

### Why a lane table exists

Without lane ownership, two workers could claim rows from the same logical key
and process them concurrently, which would break ordering.

## 5. Lane claim protocol

### Step 1 — claim lanes

A worker claims candidate lanes whose lease is absent or expired.

Reference SQL shape:

```sql
with candidate_lanes as (
  select l.lane_key
  from outbox_lane_lease l
  join lateral (
    select 1
    from outbox_message m
    where m.lane_key = l.lane_key
      and m.delivery_family = 'polling'
      and m.delivery_state in ('PENDING', 'RETRY_SCHEDULED')
      and m.next_attempt_at <= now()
      and m.topic = any($1)
    limit 1
  ) pending on true
  where l.lease_expires_at is null
     or l.lease_expires_at < now()
  order by l.last_claimed_at nulls first, l.lane_key
  for update skip locked
  limit $2
)
update outbox_lane_lease l
set lease_owner = $3,
    lease_expires_at = now() + ($4::text || ' milliseconds')::interval,
    last_claimed_at = now(),
    updated_at = now()
from candidate_lanes c
where l.lane_key = c.lane_key
returning l.lane_key;
```

### Step 2 — claim records inside owned lanes

Only records from lanes already leased to the worker may be claimed.

```sql
with candidate_records as (
  select m.id
  from outbox_message m
  where m.lane_key = any($1)
    and m.delivery_family = 'polling'
    and m.delivery_state in ('PENDING', 'RETRY_SCHEDULED')
    and m.next_attempt_at <= now()
    and (m.claimed_until is null or m.claimed_until < now())
    and m.topic = any($2)
  order by m.lane_key, m.sequence_in_lane
  for update skip locked
  limit $3
)
update outbox_message m
set delivery_state = 'CLAIMED',
    claim_owner = $4,
    claimed_until = now() + ($5::text || ' milliseconds')::interval,
    attempt_count = m.attempt_count + 1,
    updated_at = now()
from candidate_records c
where m.id = c.id
returning m.*;
```

## 6. In-process execution rule

Within one lane, records must be delivered serially in ascending
`sequenceInLane`.

Pseudo-code:

```ts
for (const laneGroup of groupByLane(records)) {
  await processLaneSerially(laneGroup);
}
```

Parallelism is allowed only **across lanes**.

## 7. Lane release rules

A lane lease is not released on every successful record. It expires naturally or
is explicitly released when a worker finishes its current lane batch.

Reference rule for MVP:

- explicit release after a lane batch is fully processed,
- fallback cleanup through lease expiry.

## 8. Failure behavior

- If a worker crashes after claiming a lane, another worker may take the lane
  after lease expiry.
- Because delivery is at-least-once, the downstream subscriber must still be
  idempotent even inside an ordered lane.
- Ordering is per lane, not across lanes.

## 9. What this does not solve

- cross-lane ordering,
- exactly-once delivery,
- automatic repartitioning of hot keys.

## 10. Lane selection criteria

A topic must document one of these modes:

- `UNORDERED`
- `ORDERED_BY_RUN_ID`
- `ORDERED_BY_AGGREGATE_ID`
- `ORDERED_BY_CUSTOM_KEY`

That topic-level declaration is configuration, not runtime guesswork.
