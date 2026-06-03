---
title: How To Add A New StepKind
status: Active
owner: Product / Architecture / Runtime
last_reviewed: 2026-04-19
---

# How To Add A New StepKind

This guide defines the governed protocol for adding a new `StepKind` end to end.

Use this for examples like `PYTHON_SCRIPT`, `SPARK_JOB`, or `API_CALL`.

If the work introduces a new step family, a plugin-backed catalog contribution,
or a new plan compile profile, also follow
[Plan Compile Catalog Extension Technical Manual](plan-compile-catalog-extension-technical-manual-20260417.md).

## Prerequisites

- A concrete execution owner for the new kind.
- A target adapter plan (`temporal`, `conductor`, or another supported
  real provider adapter).
- A clear artifact story (what `stepArtifactRef.artifactKind` is emitted, if any).

## Protocol

1. Define schema and execution profile in contracts:
   - Add schema in [StepTypeRegistry.ts](../../packages/@dvt/contracts/src/step-registry/StepTypeRegistry.ts).
   - Register kind using `createDefaultStepTypeRegistry(...)` extension path.
   - Set `supportedAdapters` and `requiredCapabilities` for the new kind.
2. Add contract tests:
   - Extend [step-registry.test.ts](../../packages/@dvt/contracts/test/step-registry.test.ts) for schema/profile validation.
   - Add event payload tests if the kind emits artifacts (StepStarted payload shape).
3. Planner integration:
   - Ensure planner build path accepts the kind via injected/registered registry.
   - Validate required capabilities projection into `RunExecutionPolicy.requiresCapabilities`.
   - Add planner integration tests in [step-registry-integration.test.ts](../../packages/@dvt/planner/test/unit/step-registry-integration.test.ts).
4. Admission and executability checks:
   - Ensure executability gate rejects unsupported adapter-kind combinations.
   - Ensure capabilities are enforced through validator in [StoredPlanExecutabilityValidator.ts](../../apps/api/src/application/services/StoredPlanExecutabilityValidator.ts).
   - Add negative-path tests for unsupported adapter and missing capability.
5. Adapter implementation:
   - Implement step execution path in the adapter runtime.
   - If step emits artifacts, emit `StepStarted.payload.stepArtifactRef` with a stable `artifactKind`.
6. Lineage and artifact consumption:
   - If lineage is required, add mapping/parsing for the new artifact kind.
   - Keep compatibility behavior explicit when supporting legacy payload shapes.
7. Documentation and planning:
   - Update lane status in `docs/planning/state/agent-lane-a.yaml`.
   - Add a closeout file under `docs/planning/closeouts/`.
   - Run `pnpm docs:workboard:generate` and `pnpm docs:sync`.

## Required Tests

- Contracts:
  - schema accepts valid config
  - schema rejects invalid config
  - execution profile is present and deterministic
- Planner:
  - known-kind invalid config rejects
  - registry-required capabilities are projected
- Admission/API:
  - adapter-kind incompatibility rejects with explicit cause
  - missing capability rejects with explicit cause
- Adapter runtime:
  - step execution path works for the new kind
  - emitted payload uses canonical artifact shape when applicable

## Required Validation Commands

- `pnpm --filter @dvt/contracts test`
- `pnpm --filter @dvt/planner test`
- `pnpm --filter dvt-api test`
- adapter package tests for the touched adapter (for example `@dvt/adapter-temporal`)
- `pnpm verify:prepush`

## Rules

- Do not add runtime-local allowlists outside the contracts registry.
- Do not skip negative-path tests.
- Do not introduce a new step kind without adapter support declaration.
- Do not bypass docs/planning updates for step-kind slices.
