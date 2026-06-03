---
slice: 20260420-temporal-fowler-architecture-drift-follow-up
date: 2026-04-20
author: AI (GPT-5)
last_reviewed: 2026-04-20
status: Completed
---

# Closeout: Temporal Fowler Architecture Drift Follow-Up

## Think-First Analysis

- Problem summary:
  The current branch materially improved `@dvt/adapter-temporal` by splitting
  the monolithic Temporal workflow/runtime code into smaller modules and by
  hardening tests, but the branch still leaves two visible seams unresolved:
  repeated workflow payload-shaping logic across multiple workflow modules, and
  documentation that overstates how cleanly DBT has been separated from the
  Temporal adapter.
- Root cause:
  The branch optimized first for structural decomposition and test recovery.
  That improved local SRP, but some shared workflow semantics remained copied
  into neighboring files, and top-level status/review docs continued to describe
  the worker/plugin split more cleanly than the adapter public surface
  currently supports.
- Constraints and invariants:
  `AGENTS.md`;
  `docs/planning/status/governance-document-rule-inventory.md`;
  `docs/guides/ai-work-protocol.md`;
  `docs/architecture/reference-architecture.md`;
  `docs/architecture/system-delivery-status.md`;
  `docs/planning/state/planning-control-tower.md`;
  `docs/adr/ADR-0003-execution-model.md`;
  `docs/adr/ADR-0019_Adapter_Equivalence_and_Maintenance_Boundary.md`;
  `docs/adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md`.
- Options considered:
  1. Leave the branch as-is and only produce a chat-only architecture opinion.
  2. Write a new review document without changing code or canonical status
     surfaces.
  3. Apply a narrow code refactor that removes duplicated workflow payload
     shaping, and truth-sync the canonical architecture/status/planning docs so
     the remaining DBT coupling is explicit.
- Selected option and rationale:
  Option 3. The branch already has enough architectural value to warrant a
  canonical write-up, but leaving the mechanical repetition and doc overstatement
  intact would preserve avoidable drift.
- Rejected alternatives:
  Option 1 would leave no durable repository truth. Option 2 would document the
  problem while knowingly leaving duplicated workflow policy in code.

## Pre-Implementation Brief

- Mode:
  Slim
- Scope:
  Centralize repeated runtime payload helper logic in Temporal workflow helper
  seams; update the existing principal architecture review, runtime status
  surfaces, and lane/domain planning surfaces to record the Fowler-style branch
  assessment, the remaining DBT built-in coupling risk, and the resulting
  follow-up posture.
- Touched files or paths:
  `packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts`,
  `packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.layerResults.ts`,
  `packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.lifecycle.ts`,
  `packages/@dvt/adapter-temporal/src/workflows/workflowHelpers.ts`,
  `packages/@dvt/adapter-temporal/src/workflows/workflowRuntimePayloadHelpers.ts`,
  `docs/architecture/system-delivery-status.md`,
  `docs/planning/reviews/architecture-and-governance/20260420-dvt-plus-system-architecture-review.md`,
  `docs/planning/state/agent-lane-d.yaml`,
  `docs/planning/state/domain-status-board.md`,
  `docs/planning/closeouts/20260420-temporal-fowler-architecture-drift-follow-up-closeout.md`,
  `docs/planning/closeouts/index.md`.
- Expected outcome:
  Runtime payload semantics stop being duplicated across neighboring workflow
  modules, and the canonical docs accurately state that DBT is out of
  engine-kernel semantics but still partially embedded in the Temporal adapter
  default surface as an open risk.
- Risks and mitigations:
  Small refactors in workflow helpers can accidentally change emitted payload
  shapes. Mitigation: keep the refactor behavior-preserving, reuse the same
  payload structure, and run package tests plus pre-push verification.
- Out-of-scope:
  Full extraction of DBT step activity and plugin runner from
  `@dvt/adapter-temporal`, second-runtime/provider work, or any broad redesign
  of planner contracts.
- Validation plan:
  `pnpm --filter @dvt/adapter-temporal typecheck:test`;
  `pnpm --filter @dvt/adapter-temporal test`;
  `pnpm docs:workboard:generate`;
  `pnpm docs:sync`;
  `pnpm verify:prepush`.
- Test coverage plan:
  Rely on existing adapter-temporal unit coverage around workflow lifecycle,
  layer results, signals, and integration harnesses. The code refactor is
  intentionally semantics-preserving, so the main regression proof is package
  test execution plus type-checking.
- Libraries evaluated:
  None evaluated - no custom implementation.

## Implementation Outcome

- The repeated Temporal workflow runtime payload shaping is now centralized in
  `packages/@dvt/adapter-temporal/src/workflows/workflowRuntimePayloadHelpers.ts`.
  `RunPlanWorkflow`, `runPlanWorkflow.lifecycle.ts`, and
  `runPlanWorkflow.layerResults.ts` now share one source of truth for
  `TransformationExecutor` typing and optional payload emission instead of
  repeating the same contract semantics in neighboring files.
- The canonical architecture/status/planning surfaces were truth-synced to the
  code actually shipped in this branch:
  `docs/architecture/system-delivery-status.md`,
  `docs/planning/reviews/architecture-and-governance/20260420-dvt-plus-system-architecture-review.md`,
  `docs/planning/state/agent-lane-d.yaml`,
  `docs/planning/state/domain-status-board.md`,
  `docs/planning/roadmap/roadmap-by-domain.md`,
  and `docs/planning/closeouts/index.md`.
- The principal architecture review now records the branch delta explicitly from
  a Fowler perspective:
  extract-module progress in the Temporal workflow is a real improvement, while
  DBT remaining inside the adapter default surface is still an open boundary
  smell rather than a closed plugin extraction.
- The residual adapter coupling was promoted from implicit concern to explicit
  repository debt in
  `docs/risk-register/quality/R-20260420-TEMPORAL-DBT-BUILTIN-COUPLING.yaml`,
  and the risk index was regenerated.
- The slice now carries the required ARC-2 evidence companion in
  `docs/evidence/ED-20260420-temporal-fowler-branch-drift-follow-up.md`, so the
  adapter-temporal changes are backed by both an explicit risk entry and a
  validation artifact.

## Fowler-Style Assessment Snapshot

- Patterns improved:
  Extract Module / Split Phase in the Temporal workflow helper seams; thinner
  orchestrator around focused collaborators; better policy locality for
  workflow payload shaping.
- Antipatterns still present:
  Partially pluginized adapter default surface; executor-specific behavior still
  built into the adapter barrel/default registry; portability still stronger in
  narrative than in implementation.
- Repetitions fixed:
  duplicated `runtimeExecutor` unions and repeated optional payload helpers in
  multiple workflow modules.
- Drift fixed:
  top-level/runtime planning docs no longer imply that DBT is fully external to
  the Temporal adapter package just because the worker composition root is now
  separate.
- Opportunities left open:
  full extraction of DBT step activity and runner from the adapter default
  surface, plus continued progress on pointer-only workflow input and mature
  read-side contracts.

## Actual Files Changed In This Slice

- `packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts`
- `packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.layerResults.ts`
- `packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.lifecycle.ts`
- `packages/@dvt/adapter-temporal/src/workflows/workflowHelpers.ts`
- `packages/@dvt/adapter-temporal/src/workflows/workflowRuntimePayloadHelpers.ts`
- `docs/architecture/system-delivery-status.md`
- `docs/planning/reviews/architecture-and-governance/20260420-dvt-plus-system-architecture-review.md`
- `docs/planning/state/agent-lane-d.yaml`
- `docs/planning/state/domain-status-board.md`
- `docs/planning/roadmap/roadmap-by-domain.md`
- `docs/planning/closeouts/index.md`
- `docs/planning/closeouts/20260420-temporal-fowler-architecture-drift-follow-up-closeout.md`
- `docs/planning/status/generated-code-state.md`
- `docs/evidence/ED-20260420-temporal-fowler-branch-drift-follow-up.md`
- `docs/risk-register/quality/R-20260420-TEMPORAL-DBT-BUILTIN-COUPLING.yaml`
- `docs/risk-register/quality/index.md`

## Validation Results

- Passed: `pnpm docs:workboard:generate`
- Passed: `pnpm docs:status:generate`
- Passed: `pnpm docs:sync`
- Passed: `pnpm exec eslint packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.layerResults.ts packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.lifecycle.ts packages/@dvt/adapter-temporal/src/workflows/workflowHelpers.ts packages/@dvt/adapter-temporal/src/workflows/workflowRuntimePayloadHelpers.ts`
- Passed: `pnpm --filter @dvt/adapter-temporal typecheck:test`
- Passed: `pnpm --filter @dvt/adapter-temporal test`
- Passed: `$env:GIT_BASE='origin/main'; $env:GIT_HEAD='HEAD'; node tools/ci/arc-check.mjs`
- Passed: `pnpm verify:prepush`

## No-Debt / No-Stub Evidence

- No runtime rule, lint gate, or hook was bypassed.
- No placeholder implementation or fake success path was introduced.
- ARC-2 repository evidence is now complete for this slice: risk entry plus
  evidence document.
- The remaining DBT boundary issue was not hidden; it was recorded as explicit
  open risk instead of being narrated as complete.
