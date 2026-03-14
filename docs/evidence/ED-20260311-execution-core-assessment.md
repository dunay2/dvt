---
title: ED-20260311 - Execution core assessment and vertical closure status
status: Final
date: 2026-03-11
owners: Architecture / Engine
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/engine/src/core/WorkflowEngine.ts
  - packages/@dvt/engine/src/adapters/IProviderAdapter.ts
  - packages/@dvt/engine/src/ports/IRunStateStore.ts
  - packages/@dvt/adapter-temporal/src/TemporalAdapter.ts
  - packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts
  - packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts
  - apps/api/src/app.ts
  - apps/api/src/application/services/notImplementedStartRunUseCase.ts
evidence:
  docs:
    - docs/architecture/reference-architecture.md
    - docs/planning/execution-model/dvt-execution-model.md
    - docs/planning/status/canonical-doc-code-matrix.md
    - docs/planning/gaps/G5-US-G5.3-CORRECTNESS-HARDENING-PLAN.md
  code:
    - packages/@dvt/engine/src/core/WorkflowEngine.ts
    - packages/@dvt/adapter-temporal/src/TemporalAdapter.ts
    - packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts
    - apps/api/src/app.ts
---

# Evidence Doc: Execution core assessment and vertical closure status

## Scope

This document records the architectural assessment performed on 2026-03-11 to
answer three practical questions:

1. what is the minimum execution core that already exists in the repository;
2. what is still missing to call the system vertically usable end-to-end; and
3. which module should remain the owner of execution semantics.

This is an assessment snapshot, not a gap-closure declaration.

## Current Status As Of 2026-03-11

| Topic                                              | Status today                  | Notes                                                                                                           |
| -------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Minimal execution core                             | Present                       | Implemented across `@dvt/engine`, `@dvt/adapter-temporal`, and `@dvt/adapter-postgres`                          |
| Provider-backed execution path                     | Present at package level      | `WorkflowEngine`, `TemporalAdapter`, and `PostgresStateStoreAdapter` exist and are tested as package components |
| Product vertical `POST /runs/start` -> real engine | Not closed                    | API route is still wired to `NotImplementedStartRunUseCase`                                                     |
| ExecutionPlan ownership at API boundary            | Not exposed directly          | The runtime start path is `PlanRef`-driven, not `ExecutionPlan`-driven                                          |
| Outbox publication path                            | Present and actively hardened | Standalone outbox worker slice exists, but it is an operational slice, not the main API start-run vertical      |

## Finding 1 - The minimal execution core already exists

The minimum working core is not:

```text
ExecutionPlan -> IWorkflowEngine -> TemporalAdapter -> RunStateStore
```

The repository is actually shaped like this:

```text
PlanRef
  -> WorkflowEngine
      -> IProviderAdapter (TemporalAdapter)
      -> IRunStateStore
```

This matters because `WorkflowEngine.startRun()` is `PlanRef`-driven and does
not receive a resolved `ExecutionPlan` from the caller. That boundary is
intentional, not accidental.

## Finding 2 - ExecutionPlan is resolved inside the provider-side execution path

`ExecutionPlan` exists and is used, but not as the first runtime input to the
engine start boundary.

Current behavior:

1. the engine validates `PlanRef` and `RunContext`;
2. the engine calls `adapter.startRun(planRef, ctx)`;
3. the engine atomically bootstraps run metadata and first events through
   `bootstrapRunTx(...)`;
4. the Temporal workflow later resolves the actual plan through
   `fetchPlan(planRef)`;
5. the workflow interprets the resolved `ExecutionPlan` and emits run/step
   events that flow back into state persistence.

The important architectural consequence is that plan bytes and integrity remain
owned by the adapter side, which matches ADR-0012 and avoids moving provider
trust and plan-fetch semantics into the engine core.

## Finding 3 - The main missing piece is vertical wiring, not missing primitives

The repository is not blocked by lack of core primitives. It is blocked by lack
of end-to-end wiring in the product-facing path.

Today the main blocker is explicit:

- [apps/api/src/application/services/notImplementedStartRunUseCase.ts](../../apps/api/src/application/services/notImplementedStartRunUseCase.ts)

That means the main runtime route can authenticate and authorize, but it still
does not dispatch into a real `WorkflowEngine` composition root.

The missing vertical is:

```text
POST /runs/start
  -> authn/authz
  -> real StartRun use case
  -> WorkflowEngine.startRun(planRef, ctx)
  -> TemporalAdapter.startRun(planRef, ctx)
  -> bootstrapRunTx(...)
  -> Temporal workflow fetches ExecutionPlan
  -> state + outbox + worker publication
```

## Finding 4 - Some transition debt is still visible

The assessment also found active transition seams that should stay visible:

1. stub-vs-real provider overlap:
   - `@dvt/engine` still contains adapter stubs while the real Temporal adapter
     lives in `@dvt/adapter-temporal`;
2. deprecated state-store aliasing:
   - the canonical port is `packages/@dvt/engine/src/ports/IRunStateStore.ts`,
     but deprecated aliases still exist;
3. contract authority drift risk:
   - `ExecutionPlan` is represented across planner/contracts/engine/adapter
     surfaces, so ownership must remain explicit to avoid semantic drift;
4. outbox runtime duplication risk:
   - the standalone outbox worker must remain an operational shell over engine
     semantics rather than becoming a second semantic core.

None of these items blocks the existence of the core, but they do affect
maintainability and ownership clarity.

## Finding 5 - Execution semantics should stay owned by `@dvt/engine`

The correct ownership model, based on current code and architecture rules, is:

- `@dvt/engine` owns execution semantics, lifecycle invariants, idempotency,
  event emission intent, and orchestration policy;
- `@dvt/adapter-temporal` owns provider execution and provider-specific plan
  fetch/integrity workflow behavior;
- `@dvt/adapter-postgres` owns persistence, snapshots, outbox, and tenant-safe
  state storage;
- `apps/api` should compose and expose the vertical;
- `apps/outbox-worker` should operate publication, not define core execution
  semantics.

This should remain the operating rule until a deliberate ADR changes it.

## Recommended Follow-up

The next useful step is not another architectural redesign. The next useful
step is to close the missing vertical wiring:

1. replace `NotImplementedStartRunUseCase` with a real engine-backed use case;
2. create a clear API composition root for `WorkflowEngine + TemporalAdapter +
PostgresStateStoreAdapter + intent store + observability + authorizer`;
3. verify the full `startRun` vertical with an end-to-end acceptance path;
4. keep transition debt visible until stubs, deprecated aliases, and duplicate
   semantic seams are intentionally retired.

## Assessment Decision

As of 2026-03-11:

- the repository already contains a real execution core;
- the core is `PlanRef`-driven, not `ExecutionPlan`-driven at the engine
  boundary;
- the system is not yet vertically closed as product because the API start-run
  path is still not wired to the real engine composition;
- execution ownership should remain centered in `@dvt/engine`.
