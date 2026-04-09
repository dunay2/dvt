---
slice: mw-a3-step-artifact-ref-generalization
date: 2026-04-06
author: AI (GPT-5)
last_reviewed: 2026-04-06
status: Accepted
---

# Closeout: MW-A3 StepArtifactRef Generalization

## Think-First Analysis

- Problem summary:
  `compiledCodeRef` is DBT/SQL-specific and does not represent non-SQL step
  artifacts for multi-workflow execution.
- Root cause:
  `StepStarted.payload` contract and helper emitters/readers were centered on
  `compiledCodeRef`, leaving no kind-aware generic artifact surface.
- Constraints and invariants:
  `AGENTS.md`; `docs/planning/status/governance-document-rule-inventory.md`;
  `docs/guides/ai-work-protocol.md`;
  `docs/planning/proposals/mandatory/runtime-and-contracts/dvt-dbt-agnostic-generalization-plan-20260403.md`.
- Options considered:
  1. Hard switch to `stepArtifactRef` only (breaking existing payload readers).
  2. Introduce `stepArtifactRef` as canonical and keep read compatibility for
     legacy `compiledCodeRef`.
- Selected option and rationale:
  Option 2. It closes the architectural gap while preserving compatibility in
  current runtime consumers.
- Rejected alternatives:
  Option 1 would force broad simultaneous migrations across all consumers.

## Pre-Implementation Brief

- Mode:
  Full
- Scope:
  Add a step-kind-agnostic artifact reference contract and migrate StepStarted
  runtime emission/consumption to use it.
- Touched files or paths:
  `packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts`,
  `packages/@dvt/contracts/src/step-registry/StepTypeRegistry.ts`,
  `packages/@dvt/contracts/src/schemas.ts`,
  `packages/@dvt/contracts/src/index.ts`,
  `packages/@dvt/contracts/test/fixtures/run-event-compiled-code-ref.fixtures.ts`,
  `packages/@dvt/contracts/test/compiled-code-ref.contract.test.ts`,
  `packages/@dvt/adapter-temporal/src/workflows/workflowHelpers.ts`,
  `packages/@dvt/adapter-temporal/test/workflow-compiled-code-ref.test.ts`,
  `packages/@dvt/traceability-service/src/lineage/compiledCodeRef.ts`,
  `packages/@dvt/traceability-service/test/lineage/compiledCodeRef.test.ts`,
  `docs/planning/state/agent-lane-a.yaml`,
  `docs/planning/closeouts/20260406-mw-a3-step-artifact-ref-generalization-closeout.md`.
- Risks and mitigations:
  Backward compatibility risk was mitigated by schema acceptance for both
  fields and lineage fallback parsing for legacy payloads.
- Out-of-scope:
  Full replacement of all `compiledCodeRef` naming across unrelated artifacts
  and docs (`MW-A4`/future follow-ups).

## Implementation

- Added `StepArtifactRef` as step-kind-agnostic runtime contract in
  `IRunStateStore` and exported it from contracts index.
- Added `StepArtifactRefSchema` and updated `StepStarted` payload schema to
  accept `stepArtifactRef` (canonical) and legacy `compiledCodeRef`.
- Updated Temporal workflow helper to emit:
  `payload.stepArtifactRef = { artifactKind: 'dbt.compiled-sql', ...compiledCodeRef }`.
- Updated lineage extraction to parse `stepArtifactRef` for DBT SQL artifact
  kinds and fallback to `compiledCodeRef` for compatibility.
- Added tests for `stepArtifactRef` write payload acceptance and lineage
  parsing path.

## Validation Evidence

- `pnpm --filter @dvt/contracts test`
- `pnpm --filter @dvt/adapter-temporal test`
- `pnpm --filter @dvt/traceability-service test`
- `pnpm docs:workboard:generate`
- `pnpm docs:sync`
- `pnpm verify:prepush`

## No-Debt / No-Stub Evidence

- No stubs/placeholders/TODO markers were added.
- No rules or checks were bypassed.
- Compatibility fallback is explicit contract handling, not hidden debt.
