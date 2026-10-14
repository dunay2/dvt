---
id: R-20260327-ESLINT9-ENGINE-01
title: ESLint 9 stabilization introduces engine surface churn with no functional risk
status: Open
date: 2026-03-27
owners:
  - engine
  - ci
severity: Low
probability: Low
---

# R-20260327-ESLINT9-ENGINE-01 - ESLint 9 stabilization introduces engine surface churn with no functional risk

## Context

PR `chore-eslint9-stabilization` resolves all lint errors introduced after
pinning ESLint to v9. The changes span:

- `packages/@dvt/engine` — `WorkflowEngine` refactored to delegate to a new
  `WorkflowEngineCoreService`; `StartRunCoordinator` moved from `services/` to
  `application/`; `StartRunAdmissionGuard` added; lifecycle helpers extracted
  to `core/lifecycle/`.
- `apps/api` — `StartRunAdmissionGuard` wired into `buildProtectedRuntimeModule`;
  admission telemetry observability classes added.
- CI workflows — Node.js runtime upgraded from 20.x to 22.x to match the
  declared `engines: { node: ">=22" }` constraint.

All changes are import-order and structural refactors. No event-processing
logic, state-store contracts, or adapter semantics were modified.

## Risk

The engine surface refactor increases the number of export paths from
`@dvt/engine`. If a consumer imports an internal name that was relocated, a
build break at the consumer is possible without a breaking-change notice.

The risk is mitigated by the fact that all public exports are preserved in
`src/index.ts` and the engine's `dist/index.d.ts` continues to re-export
everything through stable alias names.

## Mitigation

- All previous public exports remain accessible via `@dvt/engine` — verified by
  the unchanged `test/contracts/IWorkflowEngine.types.test.ts` contract suite.
- `Workspace CI (engine)` typecheck passes, confirming the public surface is
  consistent.
- No ADR or contract version bump is required; the refactor is internal to the
  engine package boundary.
