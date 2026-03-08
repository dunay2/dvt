---
title: ARCH-OUTBOX-POLLING-SQL v1
status: Draft
owner: architecture
last_reviewed: 2026-03-08
---

# ARCH-OUTBOX-POLLING-SQL v1

## 1. Purpose

This document fixes the reference SQL shape for the polling worker family.

It is intentionally practical.

## 2. Reference outbox table

```sql
create table if not exists outbox_message (
  id uuid primary key,
  tenant_id text not null,
  topic text not null,
  event_type text not null,
  payload jsonb not null,
  headers jsonb not null,

  delivery_family text not null default 'polling',
  delivery_state text not null default 'PENDING',

  ordering_key text null,
  lane_key text null,
  sequence_in_lane bigint null,

  next_attempt_at timestamptz not null default now(),
  attempt_count integer not null default 0,
  max_attempts integer not null default 10,

  claim_owner text null,
  claimed_until timestamptz null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

## 3. Indexes

```sql
create index if not exists idx_outbox_polling_claim
  on outbox_message (delivery_family, delivery_state, next_attempt_at, created_at)
  where lane_key is null;

create index if not exists idx_outbox_polling_lane_claim
  on outbox_message (lane_key, delivery_family, delivery_state, next_attempt_at, sequence_in_lane)
  where lane_key is not null;

create index if not exists idx_outbox_claim_expiry
  on outbox_message (claimed_until)
  where delivery_state = 'CLAIMED';
```

## 4. Unordered claim query

This is the baseline concurrency-safe claim path using row locking.

```sql
with candidate as (
  select m.id
  from outbox_message m
  where m.delivery_family = 'polling'
    and m.lane_key is null
    and m.delivery_state in ('PENDING', 'RETRY_SCHEDULED')
    and m.next_attempt_at <= now()
    and (m.claimed_until is null or m.claimed_until < now())
    and m.topic = any($1)
  order by m.created_at, m.id
  for update skip locked
  limit $2
)
update outbox_message m
set delivery_state = 'CLAIMED',
    claim_owner = $3,
    claimed_until = now() + ($4::text || ' milliseconds')::interval,
    attempt_count = m.attempt_count + 1,
    updated_at = now()
from candidate c
where m.id = c.id
returning m.*;
```

## 5. Ordered lane lease query

See `SPEC-OUTBOX-ORDERING-LANES.v1.md` for the full explanation.

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

## 6. Ordered lane record claim

```sql
with candidate_records as (
  select m.id
  from outbox_message m
  where m.delivery_family = 'polling'
    and m.lane_key = any($1)
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

## 7. Delivery outcome writeback

### Delivered

```sql
update outbox_message
set delivery_state = 'DELIVERED',
    claim_owner = null,
    claimed_until = null,
    updated_at = now()
where id = $1;
```

### Ignored

```sql
update outbox_message
set delivery_state = 'IGNORED',
    claim_owner = null,
    claimed_until = null,
    updated_at = now()
where id = $1;
```

### Retry scheduled

```sql
update outbox_message
set delivery_state = 'RETRY_SCHEDULED',
    claim_owner = null,
    claimed_until = null,
    next_attempt_at = $2,
    updated_at = now()
where id = $1;
```

### Dead-lettered

```sql
update outbox_message
set delivery_state = 'DEAD_LETTERED',
    claim_owner = null,
    claimed_until = null,
    updated_at = now()
where id = $1;
```

## 8. Notes

- `FOR UPDATE SKIP LOCKED` is the basis for cooperative claiming.
- Claim lease expiry is required for crash recovery.
- `LISTEN/NOTIFY` may reduce latency but does not replace these queries.
