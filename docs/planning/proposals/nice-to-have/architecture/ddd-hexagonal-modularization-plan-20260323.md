---
title: DDD Hexagonal Modularization Plan
status: Proposed
owner: Architecture / API / Engine / Adapters
last_reviewed: 2026-03-23
planning_type: proposal
---

# DDD - Hexagonal Modularization Plan

## Problem

Several of the current warning removals and hardening fixes improved local
complexity, but the underlying code still concentrates too many concerns inside
entrypoints, services, and activities.

Observed pressure points:

- HTTP entrypoints still mix parsing, validation, source selection, and command
  mapping.
- Runtime composition still couples config resolution, adapter wiring, and
  worker startup in single entrypoints.
- Temporal activities still mix policy, validation, observability, and
  execution boundaries.
- Maintenance services still combine multiple reconciliation workflows in one
  orchestration surface.
- Engine tests still need broader fixture helpers to avoid oversized call
  signatures and duplicated setup.

The result is acceptable functionally, but the module shape is not yet as
cleanly hexagonal or DDD-oriented as the architecture expects.

## Target Shape

1. Entrypoints should only translate transport/runtime input into use-case
   calls.
2. Policies and parsers should be extracted into dedicated helpers with narrow,
   explicit responsibilities.
3. Services should orchestrate workflows, not embed all branch logic inline.
4. Adapter-specific logic should remain behind adapter factories and ports.
5. Tests should construct collaborators through reusable builders rather than
   ad hoc constructor argument lists.

## Workstreams

### WS1 - HTTP Start-Run Boundary Hardening

Scope:

- `apps/api/src/entrypoints/http/startRunRoute.ts`
- related parser and mapper tests under `apps/api/test/entrypoints/http/`

Tasks:

1. Split request parsing into dedicated helpers:
   - transport body validation
   - scope parsing
   - plan reference parsing
   - planner-envelope mapping
2. Keep route code to orchestration only.
3. Make command construction object-based and readable, not branch-heavy.

Relationships:

- Depends on contract shape from `@dvt/contracts`.
- Feeds the start-run authorization facade and must not duplicate auth policy.

Blockers:

- None hard; only shared parsing ownership with existing contracts validation.

### WS2 - Runtime Composition Root Simplification

Scope:

- `apps/api/src/runtime/intentReconcilerRuntime.ts`
- bootstrap tests under `apps/api/test/`

Tasks:

1. Keep config resolution pure.
2. Move worker assembly to a single composition object.
3. Preserve explicit startup ordering:
   - config resolution
   - store creation
   - adapter resolution
   - maintenance service creation
   - worker creation
   - runtime handle publication

Relationships:

- Depends on `@dvt/engine` maintenance service and worker contracts.
- Should remain the only place that binds runtime config to concrete adapters.

Blockers:

- Changes in runtime env schema or adapter ports must be reflected here.

### WS3 - Temporal Activity Policy Segregation

Scope:

- `packages/@dvt/adapter-temporal/src/activities/stepActivities.ts`
- `packages/@dvt/adapter-temporal/test/activities.test.ts`

Tasks:

1. Separate simulate-error policy from step execution.
2. Separate observability emission from policy decisions.
3. Keep step validation explicit and narrow.
4. Reduce inline object churn in emitted signals.

Relationships:

- Depends on `@dvt/observability` attribute types and `@dvt/dsl` parsing.
- Must preserve Temporal replay-safe behavior and activity boundary semantics.

Blockers:

- Activity contract changes require regression coverage for runtime and policy paths.

### WS4 - Maintenance Workflow Decomposition

Scope:

- `packages/@dvt/engine/src/services/RunMaintenanceService.ts`
- `packages/@dvt/engine/test/services/RunMaintenanceService*.test.ts`

Tasks:

1. Keep each reconciliation mode isolated:
   - detect stuck runs
   - detect stuck cancelling runs
   - reconcile orphaned intents
2. Split intent reconciliation into explicit subflows.
3. Preserve side-effect ordering and failure handling.
4. Keep metrics and logging best-effort but independent.

Relationships:

- Depends on state store and intent store ports.
- Must preserve ADR-0030 and ADR-0004 semantics.

Blockers:

- Any change to intent lifecycle semantics must be reviewed against crash-consistency rules.

### WS5 - Test Fixture Modularization

Scope:

- `packages/@dvt/engine/test/core/WorkflowEngine.helpers.ts`
- `packages/@dvt/engine/test/core/WorkflowEngine.test.ts`
- similar helper-heavy tests in the touched slices

Tasks:

1. Replace large positional setup with object-based builders.
2. Centralize common engine fixtures.
3. Keep tests focused on invariant behavior instead of constructor wiring.

Relationships:

- Supports all other workstreams by reducing test drift.

Blockers:

- None hard; this is a low-risk enabling refactor.

### WS6 - Compiled-Code Resolver Boundary Discipline

Scope:

- `apps/lineage-worker/src/compiledCodeResolver.ts`
- `apps/lineage-worker/test/*.test.ts`

Tasks:

1. Keep resolver configuration typed through a shared env alias.
2. Keep backend selection explicit and testable.
3. Preserve production-only restrictions for `file://`.
4. Keep `s3://` resolution guarded by config and tests.

Relationships:

- Depends on `ADR-0032` and lineage-worker bootstrap ordering.
- Must remain aligned with the worker entrypoint and bootstrap tests.

Blockers:

- Bootstrapping rules and resolver policies must be kept in sync.

## Dependency Graph

1. WS6 and WS2 are the most infrastructure-sensitive.
2. WS1 and WS3 are parser/adapter boundary work.
3. WS4 depends on stability in WS2 for runtime wiring but is otherwise isolated.
4. WS5 can run in parallel with all other slices.

## Recommended Execution Order

1. WS5 - test fixture modularization
2. WS1 - HTTP start-run boundary hardening
3. WS3 - Temporal activity policy segregation
4. WS4 - Maintenance workflow decomposition
5. WS2 - Runtime composition root simplification
6. WS6 - Compiled-code resolver boundary discipline

## Acceptance Criteria

1. Each workstream has narrow ownership and a documented dependency chain.
2. Each refactor keeps behavior identical unless a contract change is explicitly
   approved.
3. Package-level tests, lint, and `pnpm verify:prepush` pass for every slice.
4. No new stubs, placeholders, or hidden bypasses are introduced.
5. Any new architectural boundary is reflected in planning status or review
   documentation.

## Blockers And Risks

- Blocker: `startRunRoute` and planner-envelope mapping should not diverge from
  contract schema evolution.
- Blocker: `stepActivities` changes must remain replay-safe and preserve
  production rejection policy.
- Blocker: maintenance reconciliation must not weaken crash-consistency or
  intent ownership.
- Risk: over-splitting can create helper sprawl if boundaries are not kept
  explicit.
- Risk: test helpers can become a second source of truth if not centralized.

## Next Documents To Update

- `docs/planning/state/planning-control-tower.md`
- `docs/planning/state/agent-lane-*.yaml`
- `docs/planning/reviews/review-status-board.md` after review artifacts are produced
