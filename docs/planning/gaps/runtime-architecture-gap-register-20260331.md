---
title: Runtime Architecture Gap Register 2026-03-31
status: Review
owner: Lane C / Architecture
last_reviewed: 2026-03-31
planning_type: status
---

# Runtime Architecture Gap Register 2026-03-31

This register tracks high-impact runtime architecture gaps identified from
code-level verification on 2026-03-31.

It does not reopen legacy G1-G10 program gaps. It captures current tactical
gaps for future PR slicing.

## Gap list (validated)

| Gap                                                                            | Validation status                                                               | Evidence                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core service remains broad (lifecycle + query + signal + observability)        | Confirmed (partial decomposition, still broad)                                  | `packages/@dvt/engine/src/core/WorkflowEngineCoreService.ts`                                                                                                                                                            |
| Workflow runtime mixes lifecycle/query/signal with telemetry concerns          | Confirmed                                                                       | `packages/@dvt/engine/src/core/WorkflowEngineCoreService.ts`                                                                                                                                                            |
| State-store "god interface" risk                                               | Confirmed as partial (segregated interfaces exist, aggregate still used)        | `packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts`                                                                                                                                                               |
| `StartRunCoordinator` still constructs collaborators directly                  | Confirmed                                                                       | `packages/@dvt/engine/src/application/StartRunCoordinator.ts`                                                                                                                                                           |
| Observability patterns are repeated across flows                               | Confirmed as partial (maintenance already has facade)                           | `packages/@dvt/engine/src/core/WorkflowEngineCoreService.ts`, `packages/@dvt/engine/src/application/StartRunCoordinator.ts`, `packages/@dvt/engine/src/services/runMaintenance/RunMaintenanceObservabilityFacade.ts`    |
| Typed-error coverage is incomplete (`new Error(...)` in production paths)      | Confirmed                                                                       | multiple runtime files under `apps/api/src`, `packages/@dvt/engine/src`, `packages/@dvt/adapter-postgres/src`                                                                                                           |
| Freshness provenance not fully exposed (`snapshot` vs `rebuild` vs `provider`) | Confirmed as partial (`snapshotStaleness` is exposed, provenance source is not) | `apps/api/src/application/services/getRunStatusUseCase.ts`, `apps/api/src/application/ports/runtime.ts`, `packages/@dvt/contracts/src/types/contracts.ts`, `packages/@dvt/engine/src/core/WorkflowEngineCoreService.ts` |

## Scope guidance

Prioritize in this order:

1. Extract lifecycle/query/signal concerns from core runtime service.
2. Introduce explicit error taxonomy migration plan for `new Error(...)` paths.
3. Add status provenance field design (`snapshot`/`rebuild`/`provider`) behind
   a backward-compatible contract strategy.
4. Move start-run collaborator composition to an assembler/factory boundary.
5. Continue observability consolidation with reusable facades/policies.

## Notes

- This register is intended for incremental PR planning, not for one-shot
  refactors.
- Ownership routing should follow lane scope and CODEOWNERS boundaries.

---

title: Engine Class Review And Gap Analysis V2
status: Draft
owner: docs
last_reviewed: 2026-03-31
category: architecture

---

# Engine Class Review And Gap Analysis V2

## Scope

This document reviews the current `@dvt/engine` application and core classes using repository source code verified on `main` as of 2026-03-31.

The objective is to:

1. document the principal engine classes and their responsibilities,
2. identify architectural strengths,
3. document gaps, missing coverage, and structural risks,
4. propose concrete improvement opportunities.

## Evidence Basis

This review is grounded in verified repository paths and recent engine commit evidence:

- `packages/@dvt/engine/src/core/WorkflowEngine.ts`
- `packages/@dvt/engine/src/core/WorkflowEngineCoreService.ts`
- `packages/@dvt/engine/src/application/StartRunCoordinator.ts`
- `packages/@dvt/engine/src/application/StartRunAdmissionGuard.ts`
- `packages/@dvt/engine/src/state/InMemoryRunStateStore.ts`
- `packages/@dvt/engine/src/state/InMemoryTxStore.ts`
- `packages/@dvt/engine/src/security/planRefPolicy.ts`
- `packages/@dvt/engine/src/application/providerSelection.ts`
- `packages/@dvt/engine/src/contracts/PlanVersionPolicy.ts`
- `packages/@dvt/engine/src/contracts/errors.ts`

This is not claimed as a full inventory of every engine class under `packages/@dvt/engine/src`. It is a code-grounded review of the classes directly evidenced during inspection.

---

# Architectural Reading

The engine has clearly moved away from a monolithic orchestration class toward a more structured split:

- `WorkflowEngine` as application-facing facade
- `StartRunCoordinator` as `startRun` use-case coordinator
- `StartRunAdmissionGuard` as admission gate
- `WorkflowEngineCoreService` as runtime lifecycle service
- supporting state stores, projector, idempotency, provider adapters, and policy objects

That direction is correct. It is a real architectural improvement over a single overloaded engine class. The engine is no longer conceptually naive.

The remaining problem is not absence of structure. The problem is that several classes are still too broad and several boundaries are still only partially hardened.

---

# Class Documentation

## 1. `WorkflowEngine`

**Path**  
`packages/@dvt/engine/src/core/WorkflowEngine.ts`

### Role

Primary external entry point implementing `IWorkflowEngine`.

### Current responsibilities

- Parses and normalizes inbound `PlanRef` and `RunContext`
- Resolves the initial run context
- Builds observability trace context
- Delegates `startRun()` to `StartRunCoordinator`
- Delegates `cancelRun()`, `getRunStatus()`, `enrichRunStatus()`, and `signal()` to `WorkflowEngineCoreService`
- Validates required dependencies and required providers
- Exposes `healthCheck()` over state store and adapters that support `ping()`

### What is good

- The facade is materially thinner than a god-object design.
- Input parsing through contracts-level parsers is correct.
- Public methods are coherent and operationally clear.
- Observability wrapping is systematic.

### Gaps

- `validateDependencies()` still throws raw `Error` for missing dependencies. That is inconsistent with the rest of the typed-error direction.
- The constructor dependency surface is still broad.
- `WorkflowEngine` still owns context bootstrap details that could be composition-root concerns.

### Opportunity

Introduce a dedicated engine assembler or factory that validates dependency graphs and constructs the runtime object graph outside `WorkflowEngine` itself.

---

## 2. `WorkflowEngineCoreService`

**Path**  
`packages/@dvt/engine/src/core/WorkflowEngineCoreService.ts`

### Role

Runtime lifecycle service for non-`startRun` operations.

### Current responsibilities

- `cancel()`
- `getStatus()`
- `enrichStatus()`
- `signal()`

### What it actually does

- Checks tenant access
- Resolves run metadata from state
- Resolves provider adapter
- Reads snapshot or rebuilds from event history
- Enriches status with provider runtime information
- Emits derived run events for signal operations
- Wraps adapter calls in timeout protection
- Emits traces, logs, counters, and histograms

### What is good

- The split away from `startRun` is correct.
- `getStatus()` vs `enrichStatus()` is a sound distinction.
- Provider status is layered on top of internal state, not used as the sole source of truth.
- Timeout protection is explicit.

### Gaps

- This class is still too wide. It mixes runtime orchestration, query logic, event emission, observability, and provider integration.
- `getStatus()` and `enrichStatus()` duplicate parts of their read/rebuild path.
- Signal-to-event mapping is embedded in the service, which makes domain policy stick to orchestration code.
- Returned status does not explicitly communicate freshness or projection lag.

### Opportunity

Split the class into narrower services such as:

- `RunStatusQueryService`
- `RunSignalService`
- `RunCancellationService`

That would improve testability and reduce responsibility clustering.

---

## 3. `StartRunCoordinator`

**Path**  
`packages/@dvt/engine/src/application/StartRunCoordinator.ts`

### Role

Application-layer coordinator for the `startRun` use case.

### Current responsibilities

- Creates `StartRunEventFactory`
- Creates `StartRunFailurePolicy`
- Creates `StartRunExecutionService`
- Logs start intent through observability
- Emits success metrics
- Delegates admission checks to `StartRunAdmissionGuard`
- Creates deterministic intent IDs
- Delegates actual run start to `StartRunExecutionService`
- Centralizes error handling through `StartRunFailurePolicy`

### What is good

- This extraction is one of the best changes in the current engine.
- The engine facade no longer directly owns the full `startRun` flow.
- Intent creation is deterministic and audit-oriented.

### Gaps

- The coordinator still constructs important collaborators internally instead of receiving them from composition root.
- Intent creation is embedded as a private concern despite being operationally important.
- Observability failure swallowing exists here but is not obviously standardized across the use case layer.

### Opportunity

Pull collaborator construction up one level and introduce narrower services for:

- intent creation
- metrics/reporting
- failure handling

---

## 4. `StartRunAdmissionGuard`

**Path**  
`packages/@dvt/engine/src/application/StartRunAdmissionGuard.ts`

### Role

Pre-flight gate for `startRun`.

### Current responsibilities

- Validates start-run preconditions via `StartRunValidationPolicy`
- Enforces tenant rate limit via `IRunAccessPolicy`
- Resolves provider adapter
- Validates required capabilities against adapter capabilities

### What is good

- Admission and execution are separated.
- Missing adapters fail with a typed `AdapterNotRegisteredError`.
- Capability validation occurs before execution begins.

### Gaps

- The class combines validation policy, rate limiting, and adapter resolution.
- The internal construction of `StartRunValidationPolicy` reduces substitution flexibility.
- It is part guard, part resolver, part validator.

### Opportunity

Split admission policy from provider resolution.

---

## 5. `InMemoryRunStateStore`

**Path**  
`packages/@dvt/engine/src/state/InMemoryRunStateStore.ts`

### Role

In-memory implementation of run state persistence plus snapshot staleness-related behavior.

### Evidenced responsibilities

Recent verified diffs show support for:

- `saveProviderRef()`
- `bootstrapRunTx()`
- `rebuildSnapshot()`
- `reserveRetryAttempt()`

### What is good

- The move from raw string-matched errors to typed errors is correct.
- The store appears broad enough to exercise real engine flows in tests.

### Gaps

- In-memory semantics are not a trustworthy proxy for production transactional guarantees.
- The store surface is still broad and mirrors the larger store-interface bloat problem.
- There is risk of over-trusting test behavior that does not model contention or isolation correctly.

### Opportunity

Use this as one contract-test implementation, not as the semantic truth source.

---

## 6. `InMemoryTxStore`

**Path**  
`packages/@dvt/engine/src/state/InMemoryTxStore.ts`

### Role

In-memory transactional-style store for engine tests and transactional simulation.

### What is good

- Useful in tests that need metadata + event append + transactional bootstrap behavior.
- Recent engine hardening also moved some failure cases here toward typed errors.

### Gaps

- The class name implies stronger semantics than an in-memory object can guarantee.
- Recent diff evidence still showed a raw `Error('INVALID_RUN_ID')` path, which is inconsistent with the typed-error direction.
- Its distinction from `InMemoryRunStateStore` is not sufficiently explicit at architectural level.

### Opportunity

Document the precise difference in intended use and back both stores with the same contract suite.

---

## 7. `PlanRefPolicy`

**Path**  
`packages/@dvt/engine/src/security/planRefPolicy.ts`

### Role

Security policy for validating whether a `PlanRef.uri` is allowed.

### Current responsibilities

- Rejects dangerous explicit schemes such as `file://`, `ftp://`, `gopher://`
- Validates allowlisted `http/https` schemes and hosts
- Blocks link-local or localhost-like hosts
- Validates opaque URI schemes and optional allowed prefixes
- Raises typed `PlanUriNotAllowedError`

### What is good

- Security enforcement is explicit and not implicit.
- Malformed URLs are handled deterministically.
- Transition from raw errors to typed errors is correct.

### Gaps

- This is still a URI validator, not a full trust/provenance policy.
- It does not, from the evidenced code, cover tenant-bound artifact provenance, signed URL policy, or stronger source trust classification.
- Basic SSRF hardening exists, but edge-case coverage depends on helper completeness.

### Opportunity

Evolve toward a broader `PlanReferenceSecurityPolicy` with provenance and tenancy-aware checks.

---

## 8. `PlanVersionPolicy`

**Path**  
`packages/@dvt/engine/src/contracts/PlanVersionPolicy.ts`

### Role

Plan version support validation.

### Current responsibilities

- Delegates support truth to `@dvt/contracts`
- Raises `UnsupportedPlanVersionError` as typed `DvtError`
- Surfaces supported versions in structured form

### What is good

- Contracts package is now the single source of truth for supported execution plan versions.
- Unsupported plans are rejected before state or adapter interaction.
- The change removes duplicated local version registries.

### Gaps

- Support is still binary rather than compatibility-state based.
- There is no evidenced transition policy for deprecated but temporarily accepted versions.

### Opportunity

Move from boolean support to a richer compatibility registry.

---

## 9. `providerSelection` helpers

**Path**  
`packages/@dvt/engine/src/application/providerSelection.ts`

### Role

Utility-level provider adapter lookup.

### What is good

- Now uses typed `AdapterNotRegisteredError` instead of raw error.

### Gaps

- Provider resolution appears in more than one place. That should become canonical.

### Opportunity

Introduce a single provider resolver/registry abstraction reused across engine services.

---

## 10. `errors.ts`

**Path**  
`packages/@dvt/engine/src/contracts/errors.ts`

### Role

Typed engine error catalog.

### What is good

- The error model is improving in the right direction.
- Structured errors support API translation, logging, and safer call-site handling.

### Gaps

- Migration is incomplete.
- Remaining raw errors degrade consistency and force callers toward mixed handling styles.

### Opportunity

Finish the typed-error sweep and enforce it in CI.

---

# Cross-Cutting Gaps

## A. The engine is structured, but not yet narrow

The problem is no longer absence of architecture. The problem is residual width inside several orchestrator classes.

### Main symptoms

- `WorkflowEngineCoreService` still owns too much
- `StartRunCoordinator` still constructs collaborators internally
- `StartRunAdmissionGuard` mixes multiple concerns

## B. Store interfaces remain too broad

Even from evidenced files, the store contract still spans too many roles:

- metadata
- event append
- snapshot/rebuild
- retry reservation
- provider ref persistence
- staleness or maintenance behavior

This is still a persistence boundary that wants to be split.

## C. Observability policy is scattered

Observability exists across the right paths, but the reporting logic is embedded in operational services rather than consistently abstracted.

## D. Freshness is under-modeled

The distinction between snapshot state, rebuilt state, and provider-enriched state is operationally meaningful but not clearly surfaced as contract metadata.

## E. Typed-error hardening is still unfinished

The direction is correct, but it is not done.

---

# Improvement Priorities

## Priority 1

1. Finish typed-error migration.
2. Split `WorkflowEngineCoreService`.
3. Canonicalize provider resolution.
4. Narrow state store interfaces consumed by each service.

## Priority 2

1. Move collaborator construction out of `StartRunCoordinator`.
2. Add freshness metadata to status reads.
3. Centralize observability helpers.

## Priority 3

1. Expand `PlanRefPolicy` into a fuller trust policy.
2. Evolve `PlanVersionPolicy` into a compatibility registry.
3. Add stronger conformance tests between in-memory and production stores.

---

# Overall Assessment

## Strong points

- Correct refactoring direction
- Meaningful facade/use-case/runtime split
- Better typed-error model
- Clearer security and version preconditions
- Better separation between internal status and provider-enriched status

## Weak points

- Core runtime service remains too broad
- Store boundary remains too fat
- In-memory stores risk overstating confidence
- Observability and hardening remain only partially consolidated

## Bottom line

The engine is now in a credible, serious refactoring state. It is no longer architecturally crude. But it is not yet fully stabilized. The next gains will come from boundary narrowing, store-contract decomposition, completion of typed-error migration, and stronger explicitness around query freshness and provider resolution.
