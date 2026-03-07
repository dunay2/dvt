---
id: R-20260307-TEMPORAL-WORKFLOW-HELPERS-01
title: Temporal workflow helper drift can emit invalid StepStarted payloads
status: Mitigating
date: 2026-03-07
owners:
  - adapter-temporal
  - plan-interpreter
severity: Medium
probability: Medium
---

# R-20260307-TEMPORAL-WORKFLOW-HELPERS-01 - Temporal workflow helper drift can emit invalid StepStarted payloads

## Context

`RunPlanWorkflow` now delegates DAG traversal, continue-as-new state building, and
`StepStarted` payload construction to deterministic helpers extracted into a dedicated
module.

## Risk

If helper logic drifts from the current workflow step contract, the Temporal adapter can
either lose `compiledCodeRef` metadata or emit invalid payloads into `StepStarted`
events, breaking downstream traceability and replay assumptions.

## Mitigation

- Extracted helper logic into a focused deterministic module with direct unit coverage.
- Hardened compiled-code extraction against malformed payload shapes.
- Made continue-as-new helper output explicit and preserved skipped-step state across
  rollover.
- Reused plan-interpreter downstream traversal instead of duplicating graph traversal
  inside the workflow.

## Evidence

- `packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts`
- `packages/@dvt/adapter-temporal/src/workflows/workflowHelpers.ts`
- `packages/@dvt/adapter-temporal/test/workflow-compiled-code-ref.test.ts`
- `packages/@dvt/adapter-temporal/test/workflow-continue-as-new.test.ts`
- `packages/@dvt/plan-interpreter/src/dagAnalyzer.ts`
