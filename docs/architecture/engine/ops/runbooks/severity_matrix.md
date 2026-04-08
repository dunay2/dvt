---
title: Engine Severity Matrix
status: Active
owner: Architecture / Engine / SRE
last_reviewed: 2026-04-09
---

# Engine Severity Matrix

This is the current severity interpretation surface for engine and runtime
operations.

Canonical threshold and signal sources live in:

- [Engine SLO Posture](../SLOs.md)
- [API Runtime SLA Canonical](../../../../runbooks/api-runtime-sla-canonical-20260404.md)
- [AR-C2 SLA signal threshold mapping](../../../../runbooks/ar-c2-sla-signal-threshold-mapping-20260404.md)
- [Incident response runbook](./incident_response.md)

## Current posture

- Only one implemented provider runtime exists today: Temporal.
- Outbox delivery and snapshot freshness are first-class runtime concerns.
- Severity decisions should be driven by the current SLA signal set, not by old
  phase labels or imagined multi-provider failover.

## Severity definitions

| Severity | Meaning now                                                                       | Response posture                    |
| -------- | --------------------------------------------------------------------------------- | ----------------------------------- |
| Sev0     | Control plane unavailable or state integrity at risk                              | Immediate incident command          |
| Sev1     | Major runtime degradation or sustained SLA breach with user impact                | On-call response and mitigation     |
| Sev2     | Limited degradation, noisy but bounded failures, or partial loss of observability | Business-hours operational response |
| Sev3     | Documentation drift, low-risk tooling issues, or cosmetic observability gaps      | Backlog or next-sprint cleanup      |

## Current examples

### Sev0

- API or protected runtime unavailable for all callers
- state store unavailable for engine writes or authoritative reads
- confirmed state corruption or projector/replay divergence that invalidates run truth

### Sev1

- Temporal runtime unavailable or unable to accept validated commands
- outbox delivery failure causing sustained downstream event lag
- snapshot freshness or unknown-rate breach at the canonical SLA thresholds
- start-run or plan-compile latency sustained above critical threshold

### Sev2

- single worker degradation with bounded impact and available mitigation
- transient latency spike above warning thresholds without full user-facing outage
- claimed-lag or drain-lag growth without crossing the canonical critical posture
- partial dashboard or alert degradation when the underlying signal still exists

### Sev3

- stale or contradictory documentation
- missing non-critical dashboard panel
- noisy logging or low-risk ops ergonomics issue

## Alert interpretation

| Signal or event                                       | Default severity posture | Canonical threshold source                                                                     |
| ----------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------- |
| API unavailable                                       | Sev0                     | incident + health policy                                                                       |
| State-store unavailable                               | Sev0                     | incident + health policy                                                                       |
| Start-run latency critical breach                     | Sev1                     | [API Runtime SLA Canonical](../../../../runbooks/api-runtime-sla-canonical-20260404.md)        |
| Plan-compile latency critical breach                  | Sev1                     | [API Runtime SLA Canonical](../../../../runbooks/api-runtime-sla-canonical-20260404.md)        |
| Snapshot stale-ratio or unknown-ratio critical breach | Sev1                     | [AR-C2 threshold mapping](../../../../runbooks/ar-c2-sla-signal-threshold-mapping-20260404.md) |
| Outbox drain-lag critical breach                      | Sev1                     | [AR-C2 threshold mapping](../../../../runbooks/ar-c2-sla-signal-threshold-mapping-20260404.md) |
| Event-delivery latency critical breach                | Sev1                     | [AR-C2 threshold mapping](../../../../runbooks/ar-c2-sla-signal-threshold-mapping-20260404.md) |
| Warning-threshold breach with bounded impact          | Sev2                     | canonical SLA docs above                                                                       |
| Documentation drift                                   | Sev3                     | docs governance process                                                                        |

## What is not current severity logic

Do not use these outdated assumptions:

- `Temporal offline, but Conductor available` as a Sev1 example;
- phase-based escalation text from the February MVP plan;
- quarter-specific budget examples as if they were the live incident policy.

## Escalation rule

- use the incident response runbook for any Sev0 or Sev1 event
- use the canonical SLA documents for threshold ownership
- if the event is caused by stale or misleading documentation, treat the doc
  correction itself as part of the incident follow-up
