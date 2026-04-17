---
title: 20260314 Domain Cohesion Review
status: Approved
owner: docs
last_reviewed: 2026-04-17
planning_type: review
---

# 20260314 Domain Cohesion Review

## Scope

Review focused on the current high-impact execution path:

- `packages/@dvt/engine/src/core/WorkflowEngine.ts`
- `packages/@dvt/engine/src/core/SnapshotProjector.ts`
- `packages/@dvt/engine/src/services/RunMaintenanceService.ts`
- `packages/@dvt/adapter-temporal/src/TemporalAdapter.ts`
- `packages/@dvt/adapter-temporal/src/activities/stepActivities.ts`
- `apps/api/src/app.ts`
- `apps/api/src/application/services/startRunAuthorizedFacade.ts`
- `apps/api/src/application/ports/auth.ts`
- `apps/api/src/entrypoints/http/startRunRoute.ts`

This is not a full-repo review. The goal is to identify current cohesion
problems, domain ownership gaps, missing aggregate boundaries, coupling,
SRP/SOLID violations, complex functions, DDD gaps, and missing negative-path
coverage.

## Findings By Priority

### P1. There is no clear aggregate root for `Run`; invariants are split across engine, projector, and activities

**Evidence**

- `WorkflowEngine.startRun()` decides bootstrap, intent log, compensation, and
  emission of `RunQueued` and `RunFailed` in
  `packages/@dvt/engine/src/core/WorkflowEngine.ts`.
- `SnapshotProjector.applyRunEvent()` contains run and step status-transition
  rules in `packages/@dvt/engine/src/core/SnapshotProjector.ts`.
- Temporal activities still emit events into the same stream through a
  different path in
  `packages/@dvt/adapter-temporal/src/activities/stepActivities.ts`.
- The activities also try to bootstrap metadata defensively.

**Why this matters**

The real business aggregate is `Run`, but it does not currently have a single
owner. Creation policy lives in the engine, transition invariants live in the
projector, and part of stream writing lives in the activities. That fragments
aggregate semantics.

This is not just an aesthetic issue:

- multiple places must change to evolve one lifecycle rule
- order and atomicity become harder to reason about
- domain rules mix with projection mechanics
- the DDD aggregate-root concept weakens

**Impact**

High regression risk when extending lifecycle, retries, or reconciliation.
Every new transition or event requires coordination across multiple logical
owners.

**Recommendation**

Extract an explicit `RunLifecycle` or `RunAggregate` that owns:

- valid transition decisions
- allowed domain events
- bootstrap and lifecycle compensation

Activities should report technical facts or execution results, not redefine
aggregate ownership.

### P1. `WorkflowEngine` is still a god service that mixes domain, application, and infrastructure

**Evidence**

- `packages/@dvt/engine/src/core/WorkflowEngine.ts` is 851 lines long.
- Its constructor depends on `stateStore`, `projector`, `idempotency`,
  `clock`, `authorizer`, `planRefPolicy`, `intentStore`, `adapters`,
  `observability`, and multiple options.
- The same class handles start/cancel/status/enrich/signal/health, timeouts,
  dependency validation, telemetry, compensation, and intent-log
  reconciliation hooks.

**Why this matters**

The class no longer has a single responsibility. It mixes:

- lifecycle domain rules
- use-case coordination
- infrastructure adaptation
- observability
- health reporting
- policy enforcement

That violates SRP and makes Open/Closed harder to preserve. Every new feature
tends to land in the same class because it is already the center of everything.

**Impact**

Change cost is high. Unit-test surface area also grows out of proportion
because one service concentrates too many branches and dependencies.

**Recommendation**

Split at least these responsibilities:

- `StartRunCoordinator`
- `RunStatusReader`
- `RunSignalService`
- `EngineHealthReporter`

`WorkflowEngine` should become a thin facade, or disappear in favor of explicit
use cases.

### P1. The pre-bootstrap path leaves an open invariant: `providerRunId` can be persisted with an approximate value

**Evidence**

- `TemporalAdapter.estimateRunRef()` returns an estimated `runId` based on the
  caller.
- `TemporalAdapter.startRun()` switches to the real `firstExecutionRunId` when
  Temporal returns it.
- `WorkflowEngine` builds `RunMetadata` with the estimated ref before
  `startRun()` and does not reconcile the persisted `providerRunId`
  afterward.

**Why this matters**

The system ends up with partially correct metadata: `workflowId`, `namespace`,
and `taskQueue` may be stable, but `providerRunId` may not represent the real
execution. That degrades traceability, operational correlation, and diagnosis.

**Missing negative-path coverage**

The suite covers pre-bootstrap ordering and post-bootstrap failure, but it does
not cover the non-happy path where
`estimateRunRef().runId !== startRun().runId`.

**Recommendation**

Choose one of these paths and make it explicit:

1. persist `requestedRunId` and `providerExecutionRunId` as separate fields
2. introduce a post-dispatch metadata update
3. formally declare that `providerRunId` is approximate for providers with late
   execution IDs

Today the meaning is ambiguous and the code invites silent drift.

### P2. `buildApp()` does too much and couples the API to the concrete runtime

**Evidence**

- `apps/api/src/app.ts` is 234 lines long.
- `buildApp()` loads env, creates observability, registers HTTP hooks, decides
  whether protected routes exist, opens the PG pool, builds auth, dynamically
  imports engine and adapters, registers Temporal, defines `onReady`
  migrations, registers runtime and admin routes, and manages `onClose`.

**Why this matters**

The composition root is no longer only a composition root. It also contains
deployment policy, operational bootstrap, and concrete infrastructure details.
That creates very high coupling between API, auth, storage, and providers.

**Impact**

- new providers or new routes force edits to `buildApp()`
- bootstrap failures concentrate in one large method
- tests become fragile and rely on monkey-patching prototypes

**Missing negative-path coverage**

`apps/api/test/app.test.ts` only covers:

- health happy path
- migration happy path
- missing `DATABASE_URL` with OIDC enabled

Coverage does not currently include:

- `TemporalClientManager.close()` failure
- partial migration failure
- enabled `TEMPORAL_ADDRESS` branches
- dynamic import failure

**Recommendation**

Extract at least:

- `buildProtectedRuntimeModule()`
- `registerOperationalHooks()`
- `buildProviderAdapters()`

`buildApp()` should stay at high-level orchestration, not detailed wiring.

### P2. The shared provider-adapter contract does not match what the engine actually uses

**Evidence**

- The local engine contract adds `ping`, `capabilities`, `estimateRunRef`, and
  `lookupRunRef` in `packages/@dvt/engine/src/adapters/IProviderAdapter.ts`.
- The published contract in `@dvt/contracts` only declares `startRun`,
  `cancelRun`, `getRunStatus`, `signal`, and `estimateRunRef`.

**Why this matters**

There is a real divergence between the "stable" contract and the contract the
runtime actually needs. That breaks substitutability and makes part of the
behavior unofficial.

Examples:

- the reconciler depends on `lookupRunRef`
- `healthCheck()` depends on `ping`
- capability validation depends on `capabilities`

None of that belongs to the published contract today.

**Impact**

Adding a new provider is not just implementing the shared interface. The
provider also needs to know which private extensions the engine expects. That
is hidden coupling.

**Recommendation**

Formalize one of these options:

1. a canonical `IProviderAdapterVNext` that includes these capabilities
2. segregated interfaces such as `IHealthCheckableProvider`,
   `ICapabilityAwareProvider`, and `IIntentReconcilableProvider`

What should not continue is keeping one public interface and one real one.

### P2. The API hard-codes infrastructure detail into its application boundary

**Evidence**

- `StartRunCommand` fixes `targetAdapter` to `'temporal' | 'mock'` in
  `apps/api/src/application/ports/auth.ts`.
- `startRunRoute` duplicates that catalog in `parseTargetAdapter()` in
  `apps/api/src/entrypoints/http/startRunRoute.ts`.
- `StartRunAuthorizedFacade` branches on
  `error.name === 'AdapterNotRegisteredError'`.

**Why this matters**

The API layer knows too much about concrete providers. That pushes
infrastructure detail into the application boundary and forces edits to routes,
ports, and error mapping whenever a new provider is added.

It is also a sign of weak Open/Closed discipline: the adapter catalog is not
modeled as data or capability, but as a hard-coded union.

**Missing negative-path coverage**

`apps/api/test/application/services/startRunAuthorizedFacade.test.ts` covers:

- accepted
- adapter not configured
- unexpected error

It does not cover two important negative branches that exist in production:

- `unauthenticated`
- `unauthorized`

**Recommendation**

Move the provider catalog and capabilities to a dedicated port or injected
configuration, and avoid branching on `error.name` in the facade.

### P3. `SnapshotProjector` is not fully pure because it performs direct I/O through `console.warn`

**Evidence**

- `handleUnknownEvent()` writes to the console in
  `packages/@dvt/engine/src/core/SnapshotProjector.ts`.

**Why this matters**

The file is described as a pure transformation, but the unknown-event branch
introduces an infrastructure side effect. That weakens cohesion and mixes
observability with domain logic implicitly.

**Impact**

- logging becomes inconsistent relative to the rest of the system, which uses
  `IObservability`
- tests become less deterministic if any suite intercepts console output
- reusing the projector in batch processes or tooling becomes harder

**Recommendation**

Keep `applyRunEvent()` fully pure and move the warning to the caller or to an
observability wrapper around reconstruction.

## Overall Assessment

The repo is not moving backward in its base architecture, but it still carries
two central design debts:

1. the `Run` aggregate does not have a single owner
2. `WorkflowEngine` and `buildApp()` still carry too much responsibility

The main risk is not that the system fails today. The main risk is that every
new execution, retry, provider, or reconciliation capability continues to land
in the same hotspots and increases coupling.

## Recommended Next Moves

1. Design the explicit owner of the `Run` aggregate before expanding lifecycle
   further.
2. Resolve `providerRunId` semantics in the pre-bootstrap path.
3. Extract runtime wiring out of `buildApp()` into smaller, testable modules.
4. Formalize the real `IProviderAdapter` contract.
5. Add negative-path tests for `StartRunAuthorizedFacade` and for the mismatch
   between `estimateRunRef` and `startRun`.
