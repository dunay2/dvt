---
title: WorkflowEngine target architecture v1
status: Draft
owner: Architecture / Engine / API
last_reviewed: 2026-04-10
---

# WorkflowEngine target architecture v1

## Purpose

Define the target architecture for the full `WorkflowEngine` subsystem as a
hexagonal derivation path that narrows the engine facade to commands plus
canonical read while moving optional enrichment behind a separate service
boundary.

## Target shape

The target keeps `IWorkflowEngine` as the command plus canonical-read facade
and moves actual behavior into narrow application services.

Target inbound use-case services:

- `IStartRunUseCase`
- `ICancelRunUseCase`
- `IRunStatusQueryService`
- `IRunSignalUseCase`
- `IRunEnrichmentService`

Target outbound engine-owned ports:

- run state read
- run state write
- intent log
- provider adapter resolution
- run execution context resolution
- status projection
- observability/telemetry policy
- execution capability dispatch inside provider-owned runtime internals

```mermaid
flowchart LR
  Facade["IWorkflowEngine public facade"] --> U1["IStartRunUseCase"]
  Facade --> U2["ICancelRunUseCase"]
  Facade --> U3["IRunStatusQueryService"]
  Facade --> U4["IRunSignalUseCase"]
  Caller["Enrichment callers"] --> U5["IRunEnrichmentService"]

  U1 --> P1["IRunStateReadPort + IRunStateWritePort"]
  U1 --> P2["IStartRunIntentPort"]
  U1 --> P3["IProviderResolverPort"]
  U1 --> P4["IRunExecutionContextResolverPort"]
  U1 --> P5["IObservabilityPolicyPort"]

  U2 --> P1
  U2 --> P3
  U3 --> P1
  U3 --> P6["IStatusProjectionPort"]
  U4 --> P1
  U4 --> P3
  U5 --> P1
  U5 --> P3

  P1 --> Ad1["State adapters"]
  P2 --> Ad2["Intent adapters"]
  P3 --> Ad3["Provider adapters"]
  P4 --> Ad4["Run execution context adapter"]
  P5 --> Ad5["Observability adapter"]
  P6 --> Ad6["Projection adapter"]
```

## Boundary and ownership rule

Boundary rule to lock:

- `@dvt/artifacts` owns artifact-reading behavior and reader contracts.
- `@dvt/engine` owns execution use-case needs and may define an engine-facing
  resolver port.
- composition root adapts artifacts-owned reader to engine-owned resolver.
- peer-domain runtime logic must not leak into engine internals.

Additional target rule for the first transformation runtime vertical:

- the core runtime must depend on execution capability, not on a vendor name
- a whole-plan provider or executor profile may select a capability and then a
  concrete implementation
- PostgreSQL is the first implementation of the relational SQL execution
  capability
- future relational implementations such as Oracle may fit the same capability
- non-relational systems such as Kafka do not automatically fit the same
  contract and must be introduced as a different capability or provider
  profile

## Inbound/outbound port model

```mermaid
flowchart TB
  Inbound["Inbound: API/use-case callers"] --> Facade["IWorkflowEngine facade"]
  Facade --> UseCases["Narrow use-case services"]
  UseCases --> OutPorts["Outbound engine-owned ports"]
  OutPorts --> Adapters["Adapters wired in composition root"]
  Adapters --> Runtime["Provider runtimes + stores + artifacts + telemetry backends"]
```

## Target execution capability seam

This target architecture keeps the run-driven adapter model from `ADR-0014`,
but it narrows the runtime internals so execution semantics are capability-led
instead of vendor-led.

That means:

- the engine still starts a run by `PlanRef`
- the provider-owned runtime still owns step dispatch
- executor selection inside that runtime should be modeled by capability first
- vendor implementations sit behind that capability boundary

```mermaid
flowchart LR
  Plan["Persisted plan plus provider profile"] --> Adapter["Run-driven provider adapter"]
  Adapter --> Capability["Relational SQL execution capability"]
  Capability --> Pg["PostgreSQL implementation"]
  Capability -. future .-> Ora["Oracle implementation"]
  Adapter -. separate capability or profile .-> Other["Non-relational path, for example Kafka"]
```

Mainline now partially realizes this seam:

- `@dvt/adapter-temporal` dispatches runtime task steps through
  `StepActivityDispatcher`
- provider-owned capability registries can register non-dbt step activity
  implementations
- `@dvt/adapter-postgres` supplies the first relational implementation through
  `PostgresRelationalExecutionCapability`

What remains target-state rather than normative public contract is the broader
promotion of this seam into a repository-wide adapter policy or ADR-backed
contract.

If a future slice promotes this distinction into a normative public contract or
repo-wide adapter policy, that change should be captured in an ADR. At this
stage, the architecture document is enough because it is refining target shape
under already accepted principles from `ADR-0003` and `ADR-0014`.

## Cutover strategy

1. Narrow `IWorkflowEngine` to commands plus canonical read.
2. Move enrichment to `IRunEnrichmentService`.
3. Move method internals to dedicated use-case services.
4. Keep current tests green with facade delegation checks and service-level
   query coverage.
5. Deprecate internal wide services only after functional parity and
   architecture fitness checks pass.

## Class responsibility rules (target)

- `WorkflowEngine`: only public contract normalization + delegation.
- use-case services: one lifecycle operation family each.
- admission policies: one policy concern per class.
- failure policies: isolated from admission and execution dispatch.
- telemetry decorators: outside core business decisions.

## Policy decomposition rules

- separate admission policy from adapter resolution policy
- separate capability policy from rate-limit policy
- separate run execution context provenance policy from generic start-run guards
- separate query policy from enrichment policy

## Composition-root rules

- concrete adapters are created only in app/runtime composition roots
- no domain service creates concrete infrastructure clients
- no use-case service constructs other concrete use-case services internally
- dependency graphs are explicit at wiring boundary

## Patterns used and why

- Narrow Facade: keep the public engine surface small while behavior moves into
  dedicated services.
- Use Case Interactor: keep orchestration explicit and testable per behavior.
- Policy Objects: isolate rules and keep logic composable.
- Adapter + Port: enforce hexagonal boundary and replaceability.
- Projection/Reducer: preserve event-sourced read determinism.
- Decorator for telemetry: keep instrumentation out of business decisions.

## Anti-patterns to avoid

- god facade with policy + orchestration + runtime concerns
- peer-domain direct imports to bypass composition roots
- mixing persisted read model and provider enrichment by default
- infrastructure selection inside domain policies
- hidden collaborator construction inside orchestration classes

## Current vs target gaps

- Public boundary
  Current: `WorkflowEngine` now exposes commands plus canonical read only.
  Target: facade-only delegation plus separate enrichment/query services with no
  residual mixed responsibility in current docs.
  Gap signal: start-run/control decomposition convergence.
- `startRun` application flow
  Current: coordinator/guard mix concerns.
  Target: split into narrow use cases plus policies.
  Gap signal: SRP drift.
- status/read path
  Current: dedicated canonical query and enrichment services are now shipped,
  but control operations still share one runtime-control service.
  Target: dedicated query vs enrichment services plus narrower control and
  telemetry seams.
  Gap signal: residual control-service breadth.
- provider resolution
  Current: repeated in multiple paths.
  Target: single resolver seam.
  Gap signal: duplication.
- telemetry handling
  Current: spread across core services.
  Target: decorator/policy boundary.
  Gap signal: cross-cutting noise.
- artifacts/engine seam
  Current: partially explicit.
  Target: documented adapter seam in composition root.
  Gap signal: ownership ambiguity.

## Retain vs improve

Retain:

- event-sourced execution authority
- CQRS split between stored status and enrichment
- intent-log crash consistency
- provider adapter boundary
- `PlanRef` trust boundary
- existing policy-object direction

Improve:

- reduce facade width
- remove internal collaborator construction
- split mixed admission concerns
- split mixed query/enrichment concerns
- formalize engine/artifacts seam
- replace stale docs with one canonical reading path

## Target sequences

### Target `startRun` sequence

```mermaid
sequenceDiagram
  participant Client as Caller
  participant Facade as IWorkflowEngine facade
  participant Start as IStartRunUseCase
  participant Admission as StartRunAdmissionPolicy
  participant Resolve as ProviderResolverPort
  participant Intent as StartRunIntentPort
  participant State as RunStateWritePort

  Client->>Facade: startRun(planRef, context)
  Facade->>Start: execute(planRef, context)
  Start->>Admission: assertAllowed(...)
  Start->>Resolve: resolveProvider(...)
  Start->>Intent: createIntent(...)
  Start->>State: persist bootstrap/events
  Start-->>Facade: EngineRunRef
  Facade-->>Client: EngineRunRef
```

### Target status/enrichment split

```mermaid
sequenceDiagram
  participant Client as Caller
  participant Facade as IWorkflowEngine facade
  participant Query as IRunStatusQueryService
  participant State as RunStateReadPort

  Client->>Facade: getRunStatus(runRef)
  Facade->>Query: execute(runRef)
  Query->>State: snapshot/events only
  Query-->>Facade: CanonicalRunStatus
  Facade-->>Client: CanonicalRunStatus
```

```mermaid
sequenceDiagram
  participant Client as Caller
  participant Enrich as IRunEnrichmentService
  participant State as RunStateReadPort
  participant Provider as ProviderAdapter

  Client->>Enrich: getRunEnrichment(runRef)
  Enrich->>State: CanonicalRunStatus
  Enrich->>Provider: getProviderStatusView(runRef)
  Provider-->>Enrich: ProviderRunStatusView
  Enrich-->>Client: RunStatusEnrichment
```

Target model note:

- `CanonicalRunStatus` is the only canonical caller-visible lifecycle object
- `ProviderRunStatusView` remains diagnostic-only
- `RunStatusEnrichment` is engine-owned composition, not a second canonical
  status source
- `IRunEnrichmentService` is the only target boundary that may return
  `RunStatusEnrichment`

## Derivation roadmap

```mermaid
flowchart LR
  A["WE-HX-0 docs replacement"] --> B["WE-HX-1 boundary ownership"]
  B --> C["WE-HX-2 compatibility facade narrowing"]
  C --> D["WE-HX-3 startRun decomposition"]
  C --> E["WE-HX-4 query/command decomposition"]
  D --> F["WE-HX-5 provider + telemetry standardization"]
  E --> F
  F --> G["WE-HX-6 test doubles + fitness checks"]
```

## Governing references

- `ADR-0003`
- `ADR-0004`
- `ADR-0012`
- `ADR-0015`
- `ADR-0030`
- `ADR-0034`
- `ADR-0042`
