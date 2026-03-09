---
title: RISKS G5 — Hot Lane Saturation
status: Accepted Known Risk
owner: docs
last_reviewed: 2026-03-08
---

# RISKS G5 — Hot Lane Saturation

## Risk

In ordered mode, a small number of very active ordering keys may monopolize a lane lease and reduce effective fleet parallelism.

## Why accepted now

The current design prefers operational clarity and deterministic ownership over adaptive redistribution complexity.

## Detection signals

- high `outbox_lane_backlog{lane}` on a single lane,
- rising `outbox_lane_oldest_record_age_seconds{lane}` with low fleet CPU,
- repeated lease renewal for the same lane with slow backlog drain.

## Deferred mitigations

- lane subdivision,
- lease preemption,
- adaptive lease duration,
- hot-key quarantine policies.
