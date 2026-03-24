---
title: Agent Lane D - Scale And Go-To-Market
status: Active
owner: Product / Architecture / Delivery / Docs
last_reviewed: 2026-03-24
planning_type: status
---

# Agent Lane D - Scale And Go-To-Market

Unassigned lane for parallel work. Use this file when assigning Agent D.

## Goal

Prepare the system for scale and for the first enterprise customer.

## Tasks

> Source of truth: `agent-lane-d.yaml`. Edit the YAML and run `pnpm docs:sync`.

- [ ] `P1` `run event log retention + TTL`: bound storage growth and automate archival.
- [ ] `P1` `G5-PR2`: add deferred deletion and restore flow for archived events.
- [ ] `P1` `S15`: add monotonic CAS guard on run_snapshots.last_run_seq upsert to prevent snapshot regression under concurrency.
- [ ] `P1` `S15-F1`: surface CAS no-op outcome for stale snapshot writes so repair callers can observe discard.
- [ ] `P1` `S14`: preserve gateway evaluation context across `continueAsNew` segments.
- [ ] `P2` `cost attribution model`: support billing and finance reporting.
- [ ] `P2` `run_events partitioning`: reduce storage and write-path pressure.
- [ ] `P2` `read replica query path`: offload read traffic from primary.
- [ ] `P2` `projector event-driven invalidation`: remove polling bottlenecks.
- [ ] `P2` `Temporal -> API backpressure`: protect admission under saturation.
- [ ] `P3` `first enterprise pilot`: validate product-market fit.
- [ ] `P3` `billing integration`: turn usage into invoicing.
- [ ] `P3` `compliance documentation pack`: prepare regulated customer onboarding.
- [ ] `P3` `acquisition positioning deck`: support GTM narrative and exit positioning.

## Dependencies

- `G5-PR2` depends on the archival prerequisite chain already tracked in the workboard.
- `S15-F1` depends on `S15`.
- `cost attribution model` depends on `S05`, `S02`, and retention.
- `read replica query path` depends on `run_events partitioning`.
- `projector event-driven invalidation` depends on `read-your-writes contract`.
- `Temporal -> API backpressure` depends on the projector lane.
- `first enterprise pilot` depends on SLOs and RBAC.

## Expected Outcome

- storage and read-path scale are bounded
- snapshot correctness is preserved
- GTM work is separated from code execution
