---
title: Engine Class Review And Gap Analysis 2026-03-31
status: Draft
owner: docs
last_reviewed: 2026-03-31
category: architecture
---

# Engine Class Review And Gap Analysis 2026-03-31

## Consolidation Note

This document consolidates the initial short review and the later v2 expansion
into one canonical engine review. The short review's conclusion is preserved:
the engine is no longer architecturally crude, but it still needs narrower
boundaries, stronger error discipline, and clearer freshness/provenance
modeling.

## Scope

This review covers the current `@dvt/engine` application and core classes as
verified on `main` as of 2026-03-31. It is intentionally code-grounded, not a
full catalog of every engine class.

## Evidence Basis

The analysis is grounded in these paths:

- `packages/@dvt/engine/src/core/WorkflowEngine.ts`
- `packages/@dvt/engine/src/core/WorkflowEngineCoreService.ts`
- `packages/@dvt/engine/src/application/StartRunCoordinator.ts`
- `packages/@dvt/engine/src/application/StartRunAdmissionGuard.ts`
- `packages/@dvt/engine/src/state/InMemoryRunStateStore.ts`
- `packages/@dvt/engine/src/state/InMemoryTxStore.ts`
- `packages/@dvt/engine/src/security/planRefPolicy.ts`
- `packages/@dvt/engine/src/application/providerSelection.ts`
- `packages/@dvt/engine/src/contracts/PlanAdmissionPolicy.ts`
- `packages/@dvt/engine/src/contracts/errors.ts`

## Executive Summary

The engine has a real architecture now. The facade/use-case/runtime split is
meaningful, and the system is better than a single orchestration monolith.

The remaining problem is width. Several classes still mix orchestration,
validation, provider selection, observability, and state/model logic. That
creates maintenance drag and makes invariants harder to prove.

## Class Review

### `WorkflowEngine`

Primary facade implementing `IWorkflowEngine`.

What it does well:

- Keeps the public entry point thin enough to be understandable.
- Normalizes inbound plan and run context values.
- Delegates `startRun()` to `StartRunCoordinator`.
- Delegates lifecycle/query/signal operations to `WorkflowEngineCoreService`.

Open gaps:

- Dependency validation still throws raw `Error` in some paths.
- The constructor surface is still broad.
- Context bootstrap behavior still lives too close to the runtime object.

### `WorkflowEngineCoreService`

Runtime service for `cancel()`, `getStatus()`, `enrichStatus()`, and `signal()`.

What it does well:

- Separates runtime operations from `startRun`.
- Treats provider data as enrichment, not source of truth.
- Makes timeout protection explicit.

Open gaps:

- The class still mixes query logic, event emission, observability, and
  provider integration.
- `getStatus()` and `enrichStatus()` share too much path logic.
- Freshness/provenance is not exposed as first-class status metadata.

### `StartRunCoordinator`

Application-layer coordinator for `startRun`.

What it does well:

- Makes the `startRun` path explicit and testable.
- Centralizes deterministic intent creation and failure policy handling.

Open gaps:

- It still constructs key collaborators internally.
- Observability concerns are not yet standardized across the use-case layer.

### `StartRunAdmissionGuard`

Pre-flight gate for `startRun`.

What it does well:

- Separates admission from execution.
- Fails missing adapters with typed errors.

Open gaps:

- It mixes validation policy, rate limiting, and provider resolution.
- The internal construction of its validation policy reduces substitution
  flexibility.

### `InMemoryRunStateStore` and `InMemoryTxStore`

Useful test doubles, but not semantic truth sources.

Open gaps:

- Their names imply stronger guarantees than in-memory structures can provide.
- They are broad enough to overstate confidence if used as the only proof of
  correctness.

### `PlanRefPolicy`

Security policy for `PlanRef.uri`.

What it does well:

- Applies typed errors.
- Hardens obvious SSRF-style cases and invalid schemes.

Open gaps:

- It is still only a URI validator.
- It does not yet express a fuller provenance or tenancy-aware trust policy.

### `PlanAdmissionPolicy` and provider selection helpers

What they do well:

- Keep version support and provider lookup moving toward typed, shared
  abstractions.

Open gaps:

- Version support is still binary instead of compatibility-state driven.
- Provider resolution is still repeated in more than one place.

## Cross-Cutting Gaps

1. The engine is structured, but not yet narrow enough.
2. Store interfaces still bundle too many roles.
3. Observability policy is scattered across orchestration code.
4. Freshness/provenance is under-modeled.
5. Typed-error migration is incomplete.

## Priorities

1. Finish the typed-error sweep.
2. Split `WorkflowEngineCoreService` into narrower services.
3. Canonicalize provider resolution.
4. Narrow store interfaces per service boundary.
5. Move collaborator construction out of `StartRunCoordinator`.
6. Add explicit freshness metadata to status reads.

## Bottom Line

The engine is now credible and directionally correct. The next gain comes from
boundary narrowing, explicit status provenance, and completing the typed-error
transition so runtime behavior is easier to prove and safer to evolve.
