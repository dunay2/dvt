---
title: AR-C2 Prometheus SLA Hardcut Closeout
status: Draft
owner: Runtime / SRE / Docs
last_reviewed: 2026-05-14
planning_type: closeout
---

# AR-C2 Prometheus SLA Hardcut Closeout

## Scope

This slice hard-cuts AR-C2 SLA latency metrics to Prometheus base-unit seconds
names without legacy aliases.

## Work performed

- Added Fowler analysis to
  `buzon/20260514-codex-fowler-ar-c2-prometheus-sla-hardcut-analysis.md`.
- Added the AR-C2 Prometheus SLA component guide and user stories.
- Added a semantic architecture test for metric identity, unit drift, module
  owned concerns, and bounded labels.
- Renamed API start-run and plan-compile latency metrics to
  `dvt_api_run_start_latency_seconds` and
  `dvt_api_plan_compile_latency_seconds`.
- Renamed outbox event delivery latency to
  `dvt_delivery_event_delivery_latency_seconds`.
- Added `elapsedSlaSecondsSince` so API use cases do not carry inline unit
  conversion.
- Updated AR-C2 runbooks, evidence artifact, observability docs, and incident
  response references to the current metric version.
- Fixed `WorkflowEngine.helpers.ts` to pass a branded ISO UTC value to
  `SequenceClock`.

## Validation

Validation evidence is recorded in
`docs/evidence/ED-20260514-ar-c2-prometheus-sla-hardcut.md`.

## Residual risk

Legacy dashboard and alert queries must be updated to the `_seconds` metric
names before AR-C2 operational closure. The risk is tracked in
`docs/risk-register/quality/R-20260514-AR-C2-PROM-SLA-HARDCUT.yaml`.
