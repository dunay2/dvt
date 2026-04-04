---
title: Run-status write-boundary user manual
status: Draft
owner: API / Runtime / Docs
last_reviewed: 2026-04-04
---

# Run-status write-boundary user manual

## Who this is for

Operators and integrators consuming run lifecycle APIs and troubleshooting
transition failures.

## What changes with AR-B1

The system now rejects invalid lifecycle sequences at write time.

Before:

- some invalid sequences could be discovered later during projection.

After:

- invalid sequences fail immediately with `INVALID_STATE_TRANSITION`.
- for `PAUSE`/`RESUME` signals, transition legality is checked before provider
  signal dispatch, so invalid requests are rejected without external side
  effects.

## Typical rejection cases

- `StepCompleted` sent before `StepStarted`.
- `StepFailed` sent while step is still `PENDING`.
- `RunPaused` sent when run is not `RUNNING`.
- `RunResumed` sent when run is not `PAUSED`.
- `RunCancelled` sent without cancellation-intent state.

## Operational behavior on rejection

- no new event is persisted for rejected transition.
- snapshot state is unchanged.
- outbox is not enqueued for rejected event.
- caller receives typed error details to fix producer ordering.

## Recommended response playbook

1. inspect event producer ordering and idempotency key generation.
2. replay corrected events in legal order.
3. verify run timeline through `listEvents` and `getSnapshot`.

## Error shape

`INVALID_STATE_TRANSITION` includes stable context:

- `runId`
- `eventType`
- `fromStatus`
- optional `stepId`

Use those fields for dashboards, alerts, and support triage.
