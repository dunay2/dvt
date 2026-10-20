---
id: R-20261015-PLAN-CONCURRENCY
title: Per-plan admission changes Temporal command ordering
status: Mitigating
date: 2026-10-15
owners:
  - adapter-temporal
severity: High
probability: Medium
---

# Per-Plan Admission Changes Temporal Command Ordering

## Risk

Enforcing K and emitting StepStarted at admission changes activity and event
ordering. Old histories must not be silently replayed by the new worker line.
Mixed step-level policies previously ignored by Temporal now fail closed before
execution; importing inconsistent plans is not a supported compatibility path.

## Mitigation

- Development hard cut is explicitly approved in #2819. The user confirms test
  execution data, but this implementation does not require deleting it.
- Follow the existing
  [drained cutover runbook](../runbooks/temporal-planref-drained-cutover-20260427.md)
  for activation. Code integration alone does not restart shared workers or
  authorize broad cleanup of source, configuration or Planning DB.
- Resolve one policy from all immutable plan steps using the common schema.
  Preserve planner defaults, explicit unbounded behavior and PlanRef integrity.
- Drain admitted activities on fatal publication failure or cancellation. Do not
  emit starts for queued work or fabricate a terminal over failed publication.
- Keep ordered result application, gateway facts, skip and continuation at the
  existing layer boundary. No continuation occurs with active slots.
- Verify measured K and replay all new-history executions, including technical
  retry and continuation, using the real Temporal service.

## Evidence And Limits

[ED-20261015-plan-concurrency](../evidence/ED-20261015-plan-concurrency.md)
records the actual checks and measured maxima. New-history replay is not an
old-history compatibility claim. Worker capacity, throughput benchmarking and
native plural PostgreSQL publication are not established by controlled-activity
fixtures. No new debt is accepted by leaving those existing scopes on their issues.

This risk remains open until the operator records the actual drained activation.
