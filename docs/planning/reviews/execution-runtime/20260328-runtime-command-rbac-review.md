---
title: 20260328 Runtime Command RBAC Review
status: Active
owner: API / Architecture
last_reviewed: 2026-03-28
planning_type: review
---

# 20260328 Runtime Command RBAC Review

## Scope

Runtime command slice in `apps/api`:

- `POST /runs/:runId/signal`
- `POST /runs/:runId/cancel`
- shared command-route orchestration and parsing helpers

Governance baseline used:

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/planning/state/agent-lane-c.yaml` (runtime safety / RBAC)
- `docs/architecture/reference-architecture.md`
- `docs/planning/status/canonical-doc-code-matrix.md`

## Problem Statement and Root Cause

The runtime command behavior is correct and covered, but this slice evolved through multiple PR rounds where design intent, parser-executor boundaries, and doc traceability were not captured in one current artifact.

Root cause: extraction happened incrementally (route split, shared executor, parser helper consolidation) while rationale and review notes lived in branch-local or superseded files.

## Current Mainline Design (As Implemented)

### Entrypoint layer

- `signalRunRoute.ts` and `cancelRunRoute.ts` are thin HTTP adapters.
- They parse request + scope intent and delegate execution to shared command orchestration.

### Shared command orchestration

- `runCommandRouteExecutor.ts` is the command executor for runtime route adapters.
- Responsibilities:
  - short-circuit on parser errors
  - run authn/authz boundary (`authorizeExecutionScope`)
  - execute command use-case
  - map known domain errors via `mapRuntimeDomainError`

### Parser and command input boundary

- `runCommandFieldParsers.ts` centralizes shared field parsing:
  - `normalizeRunId`
  - `isBodyObject`
  - `parseTenantId`
  - `parseOptionalReason`
  - `badRequest` / `forbidden`
- `signalRunRouteParser.ts` and `cancelRunRouteParser.ts` specialize command payload and action mapping.
- `runCommandRoute.constants.ts` contains neutral command action + parse-error constants.

### Use-case boundary

- `CancelRunUseCase` exists explicitly (`application/services/cancelRunUseCase.ts`) and delegates to `SignalRunUseCase`.
- This keeps composition in `app.ts` explicit without leaking inline policy objects in the composition root.

## Fowler / SOLID / DDD / CQRS Assessment

### SRP

- Route handlers: single reason to change (transport adaptation).
- Shared executor: orchestration concern only, with auth and domain mapping delegated.
- Field parser helper: shared parsing primitives only.

### DDD

- Domain/application errors are surfaced and mapped at boundary (`authErrorMapper`).
- HTTP layer does not implement business rules.

### CQRS

- This slice stays command-side; no query-path behavior mixed in.

### Fowler style decisions

- Keep common behavior explicit via extracted helper/executor modules.
- Avoid generic `shared` buckets without responsibility naming; prefer intent-revealing module names.

## Superseded vs Reusable From Earlier Branch Review

Superseded items from prior branch notes:

- references to `signalCommandRouteExecutor.ts` (current mainline uses `runCommandRouteExecutor.ts`)
- references to `runCommandRouteParser.shared.ts` (current mainline uses `runCommandFieldParsers.ts`)
- pre-mainline parser constant wiring assumptions

Reusable and now retained:

- explicit tests for executor seam behavior
- parser helper direct tests as specification
- rationale that cancel/signal are route specializations over a shared command execution pattern

## Test Coverage That Documents The Slice

Primary executable specification files:

- `apps/api/test/entrypoints/http/runCommandRouteExecutor.test.ts`
- `apps/api/test/entrypoints/http/runCommandFieldParsers.test.ts`
- `apps/api/test/entrypoints/http/signalRunRouteParser.test.ts`
- `apps/api/test/entrypoints/http/cancelRunRouteParser.test.ts`
- `apps/api/test/entrypoints/http/signalRunRoute.test.ts`
- `apps/api/test/entrypoints/http/cancelRunRoute.test.ts`
- `apps/api/test/application/services/signalRunUseCase.test.ts`
- `apps/api/test/application/services/cancelRunUseCase.test.ts`

## Guardrails for Next Iteration

1. Keep wire contracts stable for `signal` and `cancel` routes unless ADR/contract process says otherwise.
2. If command family expands, prefer extending `runCommandRoute.constants.ts` and parser specializations instead of per-route ad-hoc constants.
3. Keep executor parser-error typing command-neutral to avoid route-specific coupling.
4. Keep API component docs and matrix references synced when entrypoint file structure changes.

## Verification Baseline

- `pnpm --filter dvt-api test -- test/entrypoints/http/runCommandRouteExecutor.test.ts test/entrypoints/http/runCommandFieldParsers.test.ts test/entrypoints/http/signalRunRouteParser.test.ts test/entrypoints/http/cancelRunRouteParser.test.ts test/entrypoints/http/signalRunRoute.test.ts test/entrypoints/http/cancelRunRoute.test.ts test/application/services/signalRunUseCase.test.ts test/application/services/cancelRunUseCase.test.ts`
- `pnpm --filter dvt-api typecheck`
- `pnpm verify:prepush`
