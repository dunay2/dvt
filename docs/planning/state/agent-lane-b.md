---
title: Agent Lane B - Event Contract And Traceability
status: Active
owner: Product / Architecture / Delivery / Docs
last_reviewed: 2026-03-24
planning_type: status
---

# Agent Lane B - Event Contract And Traceability

Unassigned lane for parallel work. Use this file when assigning Agent B.

## Goal

Stabilize event payload versioning and lineage wiring.

## Tasks

- `P0` `S05`: add `payloadVersion` and per-eventType schema validation.
- `P1` `RC-B1`: decouple lineage worker from adapter internals.
- `P1` `RC-B2`: replace lineage noop resolver with a real resolver.
- `P1` DLQ alerting + automated replay: surface and reduce lineage backlogs.
- `P2` manifest S3 fetch cache: reduce planner egress and build latency.

## Dependencies

- `S05` is the primary contract foundation for this lane.
- `RC-B2` should be wired after the lineage boundary is explicit.
- DLQ replay and alerting depend on `S05` and the retry pacing follow-up.

## Expected Outcome

- event contracts are versioned
- lineage ownership is explicit
- failures are observable and replayable
