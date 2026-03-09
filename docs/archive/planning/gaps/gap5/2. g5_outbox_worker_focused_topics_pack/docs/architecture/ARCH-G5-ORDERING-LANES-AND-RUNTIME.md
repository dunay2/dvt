---
title: Architecture — G5 Ordering Lanes and Runtime
status: Draft
owner: docs
last_reviewed: 2026-03-08
---

# Architecture — G5 Ordering Lanes and Runtime

## 1. Purpose

This document specifies:

- the runtime flow relevant to the focused review,
- ordered lane design,
- `LISTEN/NOTIFY` integration,
- why the dedicated lane lease table is retained.

---

## 2. Runtime flow

### 2.1 Main loop

The runtime owns the loop.

```ts
export interface IOutboxWorkerRuntime {
  run(signal: AbortSignal): Promise<void>;
  tickOnce(signal: AbortSignal): Promise<BatchProcessingReport>;
}
```

### 2.2 Flow

1. wait until next wake condition:
   - poll interval elapsed, or
   - `LISTEN/NOTIFY` wake signal arrives,
2. claim batch of unordered records, and/or claim lane leases + lane records if ordered mode is enabled,
3. process claimed records with bounded concurrency,
4. persist results,
5. update metrics,
6. sleep or wait for next wake signal.

### 2.3 `LISTEN/NOTIFY`

`LISTEN/NOTIFY` is a latency optimization only.
It never replaces polling as the safety net.

The runtime must behave correctly if notifications are delayed, dropped, or never received.

---

## 3. Bounded concurrency

The implementation should use a standard library such as `p-limit` instead of a custom queue worker helper.

```ts
import pLimit from 'p-limit';

const limit = pLimit(maxConcurrency);
const tasks = records.map((record) => limit(() => coordinator.execute(record)));
await Promise.allSettled(tasks);
```

---

## 4. Ordered lanes

## 4.1 Two execution modes

### Unordered mode

Default mode.
No lane lease table is used.
Records are claimed directly from the outbox table.

### Ordered mode

Enabled only for topics/subscribers that require serial processing by `orderingKey`.

A dedicated lane lease table is used.

---

## 5. Schema sketch

```sql
create table outbox_record (
  outbox_record_id uuid primary key,
  topic text not null,
  delivery_channel text not null,
  side_effect_class text not null,
  ordering_key text null,
  payload jsonb not null,
  attempt_count integer not null default 0,
  available_at timestamptz not null,
  lease_owner text null,
  lease_expires_at timestamptz null,
  status text not null
);

create table outbox_lane_lease (
  lane_key text primary key,
  topic text not null,
  lease_owner text null,
  lease_expires_at timestamptz null,
  updated_at timestamptz not null
);
```

---

## 6. Claim strategy

### 6.1 Unordered claim

```sql
select outbox_record_id
from outbox_record
where status = 'pending'
  and available_at <= now()
  and (lease_expires_at is null or lease_expires_at <= now())
order by available_at asc, outbox_record_id asc
for update skip locked
limit $1;
```

Then update the claimed rows with `lease_owner` and `lease_expires_at`.

### 6.2 Ordered lane claim

Step 1: claim lanes

```sql
select lane_key
from outbox_lane_lease
where topic = $1
  and (lease_expires_at is null or lease_expires_at <= now())
order by lane_key asc
for update skip locked
limit $2;
```

Step 2: update claimed lanes with owner + expiry.

Step 3: claim records only for owned lanes.

```sql
select outbox_record_id
from outbox_record
where topic = $1
  and ordering_key = any($2)
  and status = 'pending'
  and available_at <= now()
  and (lease_expires_at is null or lease_expires_at <= now())
order by ordering_key asc, available_at asc, outbox_record_id asc
for update skip locked
limit $3;
```

---

## 7. Why keep the lane lease table

The dedicated lane lease table remains justified for ordered mode because it gives:

- explicit owner visibility per lane,
- clean lease expiry semantics,
- better hot-lane debugging,
- simpler operational metrics,
- less repeated scanning for distinct ordering keys.

Without it, ordered mode is cheaper to start but harder to operate.

---

## 8. Important limits

- The system guarantees **serial processing per lane**, not global order.
- Two different lanes may be processed concurrently.
- If the same topic uses unordered and ordered subscribers, that must be modeled as distinct delivery configurations.

---

## 9. Class collaboration

```ts
export interface IOutboxWorkerEngine {
  processBatch(signal: AbortSignal): Promise<BatchProcessingReport>;
}

export interface IOrderedLaneClaimer {
  claimAvailableLanes(input: {
    readonly topic: string;
    readonly ownerId: string;
    readonly maxLanes: number;
    readonly leaseDurationMs: number;
  }): Promise<readonly string[]>;
}

export interface IOutboxRecordClaimer {
  claimUnorderedBatch(input: ClaimUnorderedBatchInput): Promise<readonly ClaimedOutboxRecord[]>;
  claimOrderedBatch(input: ClaimOrderedBatchInput): Promise<readonly ClaimedOutboxRecord[]>;
}
```

The engine orchestrates claimers and the delivery coordinator.
