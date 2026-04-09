---
slice: engine-deps-refactor
date: 2026-03-14
last_reviewed: 2026-03-14
gap: none (maintenance + architecture)
author: AI (claude-sonnet-4-6)
---

# Closeout: WorkflowEngine God Object — Factory + Policy Extraction

## Think-First Analysis

### Problem summary

`WorkflowEngine` has 9 required + 2 optional constructor deps passed as a flat
object. Three of them (`authorizer`, `planRefPolicy`, `outboxRateLimiter`) govern
the same concern — whether a run is allowed to start or proceed — yet they are
separate fields with no explicit grouping. The assembly in `app.ts` constructs all
deps inline with no explicit validation beyond TypeScript's static check, which
only holds when the engine's own dist is fresh. If adapters is empty, the engine
accepts construction and fails only at runtime.

### Root cause

Deps have been added incrementally over time — each feature adds a field without
considering whether existing fields already represent the same concern at a higher
level of abstraction. No factory exists that understands the subsystem groupings
or validates invariants at construction time.

### Constraints and invariants

- ADR-0003: Execution model sovereignty — the engine must not acquire dependencies
  that serve no behavioral role; conversely, all deps must be justified.
- ADR-0018: Shared kernel change propagation — if `IRunAccessPolicy` is added to
  the public engine index, it becomes part of the engine's public surface and all
  downstream users must adopt it.
- No change to external behavior — this is a structural refactor. All engine
  operations must behave identically after the change.
- `authorizer.deny.test.ts` tests RBAC denial paths — these must remain green
  after the refactor.

### Options considered

- **Libraries evaluated**: No library covers DI container needs in a way compatible
  with the repo's constraint of zero runtime DI framework coupling. The grouping
  is done manually — this is appropriate for a bounded context with a known surface.

- **Option 1 (selected)**: Extract `IRunAccessPolicy` interface + `RunAccessPolicy`
  class from `authorizer + planRefPolicy + outboxRateLimiter?`. Add smart factory
  `buildWorkflowEngine(EngineConfig)` in `apps/api` that groups deps by subsystem,
  hides `projector`/`idempotency` construction, and validates `adapters.size > 0`
  at construction time.

- **Option 2**: Keep flat deps, add a validator factory that just checks invariants
  before calling `new WorkflowEngine`. Does not reduce surface or express grouping —
  deferred, not solved.

- **Option 3**: Full DI container (InversifyJS, TSyringe). Overengineered for a
  bounded context with a single composition root.

### Selected option and rationale

Option 1. Grouping `authorizer + planRefPolicy + outboxRateLimiter?` into a
`RunAccessPolicy` is semantically correct — all three answer "is this operation
allowed?". The factory then hides the construction of `SnapshotProjector` and
`IdempotencyKeyBuilder` (which have no configuration) from the composition root.

### Rejected alternatives

Option 2 defers the coupling problem. Option 3 introduces a framework dependency.

---

## Pre-Implementation Brief

### Mode: Full (new public interface `IRunAccessPolicy` exported from engine)

### Scope

**Part A — Smart factory (apps/api only, engine interface unchanged mid-flight)**

- Replace `createWorkflowEngine` flat call in `app.ts` with `buildWorkflowEngine(EngineConfig)`
- `EngineConfig` groups deps: `persistence`, `security`, `runtime`, `infrastructure`
- Factory constructs `SnapshotProjector`, `IdempotencyKeyBuilder`, `PlanRefPolicy`,
  and `RunAccessPolicy` internally
- Factory validates `adapters.size > 0` before construction

**Part B — Policy extraction (engine interface changes)**

- New file: `packages/@dvt/engine/src/security/RunAccessPolicy.ts`
  - `IRunAccessPolicy` interface: `assertTenantAccess`, `validatePlanRef`, `checkRateLimit`
  - `RunAccessPolicy` class: wraps `IAuthorizer + PlanRefPolicy + IOutboxRateLimiter?`
- `WorkflowEngineDeps`: remove `authorizer`, `planRefPolicy`, `outboxRateLimiter?`; add `policy: IRunAccessPolicy`
- `WorkflowEngine`: update all 6 `this.deps.authorizer`, 1 `this.deps.planRefPolicy`,
  and 2 `this.deps.outboxRateLimiter` usages
- Update all test call sites (12 constructor invocations across 9 test files)
- Export `IRunAccessPolicy`, `RunAccessPolicy` from engine index

### Touched files

**Engine package:**

- `packages/@dvt/engine/src/security/RunAccessPolicy.ts` (new)
- `packages/@dvt/engine/src/core/WorkflowEngine.ts`
- `packages/@dvt/engine/src/index.ts`
- `packages/@dvt/engine/test/contracts/engine.test.ts`
- `packages/@dvt/engine/test/contracts/capabilities.contract.test.ts`
- `packages/@dvt/engine/test/contracts/executionPlan.contract.test.ts`
- `packages/@dvt/engine/test/core/WorkflowEngine.test.ts`
- `packages/@dvt/engine/test/core/WorkflowEngine.intentLog.test.ts`
- `packages/@dvt/engine/test/security/authorizer.deny.test.ts`
- `packages/@dvt/engine/test/services/RunMaintenanceService.test.ts`
- `packages/@dvt/engine/test/services/RunMaintenanceService.intentReconciliation.test.ts`

**API package:**

- `apps/api/src/application/services/WorkflowEngineFactory.ts`
- `apps/api/test/application/services/WorkflowEngineFactory.test.ts`
- `apps/api/src/app.ts`

### Expected outcome

- `WorkflowEngineDeps` has 7 required + 1 optional = 8 fields (was 9 req + 2 opt = 11)
- `app.ts` engine construction is grouped by subsystem, readable without comments
- `adapters.size === 0` fails at `buildWorkflowEngine` call, not at runtime
- engine and API suites stay green after the refactor

### Risks and mitigations

- `authorizer.deny.test.ts` uses `as unknown as ConstructorParameters<...>[0]` cast
  to inject a bad authorizer. After refactor, it passes an `IRunAccessPolicy`
  directly — the cast can be removed or simplified.
- `RunMaintenanceService` also takes `authorizer` as a dep — do NOT touch that;
  only `WorkflowEngine` constructor call sites are in scope.

### Out-of-scope

- Removing `projector` and `idempotency` from `WorkflowEngineDeps` (Part C, separate)
- Refactoring `RunMaintenanceService`'s deps

### Libraries evaluated

None — no library covers this grouping need within repo constraints.

### Test coverage plan

- Existing engine tests cover all paths including authorization denial (`authorizer.deny.test.ts`)
- No new behavior is introduced; tests verify structural equivalence

---

## Changes made

| File                                                               | Change                                                                                                      | Why                                                            |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `packages/@dvt/engine/src/security/RunAccessPolicy.ts`             | New — `IRunAccessPolicy` interface + `RunAccessPolicy` class                                                | Groups the three access/policy deps into a single collaborator |
| `packages/@dvt/engine/src/core/WorkflowEngine.ts`                  | Remove `authorizer`, `planRefPolicy`, `outboxRateLimiter?`; add `policy: IRunAccessPolicy`; update 9 usages | Enforce the grouping at the type level                         |
| `packages/@dvt/engine/src/index.ts`                                | Export `IRunAccessPolicy`, `RunAccessPolicy`                                                                | Make policy available to factory and downstream consumers      |
| 9 test files in `packages/@dvt/engine/test/`                       | Replace flat `authorizer + planRefPolicy` with `policy: new RunAccessPolicy(...)`                           | Match new interface                                            |
| `apps/api/src/application/services/WorkflowEngineFactory.ts`       | Add `EngineConfig` types and `buildWorkflowEngine`                                                          | Provide structured, validated construction                     |
| `apps/api/test/application/services/WorkflowEngineFactory.test.ts` | Cover constructor seam and empty-adapter rejection                                                          | Prove factory behavior and invariant                           |
| `apps/api/test/integration/plannerEngineContract.test.ts`          | Adopt `RunAccessPolicy` in integration wiring                                                               | Keep planner→engine contract path aligned                      |
| `apps/api/src/app.ts`                                              | Replace `createWorkflowEngine({flat})` with `buildWorkflowEngine({grouped})`                                | Apply the factory                                              |

## Libraries evaluated

None — grouping done manually; no DI framework introduced.

## Docs synced

- [x] No gap tracker entry — maintenance task
- [x] `GAP_EXECUTION_PLANS.md` — no gap entry to update
- [x] `system-delivery-status.md` — no delivery status change

## Test evidence

| Command                           | Result         |
| --------------------------------- | -------------- |
| `pnpm --filter @dvt/engine build` | PASS           |
| `pnpm --filter @dvt/engine test`  | PASS — 165/165 |
| `pnpm --filter dvt-api test`      | PASS — 35/35   |

## Debt introduced

None.
