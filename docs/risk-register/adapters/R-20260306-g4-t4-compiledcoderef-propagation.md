---
id: R-20260306-G4-T4-01
title: StepStarted compiledCodeRef propagation drift
status: Mitigating
date: 2026-03-06
owners:
  - adapter-temporal
severity: Medium
probability: Medium
---

# R-20260306-G4-T4-01 - StepStarted compiledCodeRef propagation drift

## Context

T4-3 introduces extraction and type-guard validation for `compiledCodeRef` in the
Temporal adapter execution path and propagates it into `StepStarted` when valid.

## Risk

If extraction logic or guards drift from event contract expectations, `StepStarted`
events can lose lineage metadata or emit invalid references. That can break
traceability joins and downstream compiled-code attribution.

## Mitigation

- Centralized extraction and guard logic for `compiledCodeRef` in adapter flow.
- Added workflow and activity tests that assert propagation only when valid.
- Preserved existing behavior when `compiledCodeRef` is absent or invalid.

## Evidence

- `packages/@dvt/adapter-temporal/src/activities/stepActivities.ts`
- `packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts`
- `packages/@dvt/adapter-temporal/test/activities.test.ts`
- `packages/@dvt/adapter-temporal/test/workflow-compiled-code-ref.test.ts`
