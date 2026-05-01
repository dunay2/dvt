---
title: Reference Architecture
status: Active
owner: docs
last_reviewed: 2026-04-21
---

# Reference Architecture

Canonical reference for DVT architectural principles, bounded contexts, and top-level runtime shape.

## Principles

- Hexagonal architecture: domain logic depends on ports, adapters depend on the domain boundary.
- Deterministic execution: workflow orchestration must remain replay-safe and side effects must cross activity/adapter boundaries.
- Event-sourced run lifecycle: `Run` is reconstructed from ordered events and optional snapshots; snapshots are derived, never authoritative over events.
- Multi-tenant isolation: tenant context must be explicit in reads, writes, signals, and status queries.
- Replaceable infrastructure: provider/runtime concerns stay behind stable contracts such as `IProviderAdapter`.
- Command/query rail governance: externally observable behavior must be named
  as one command or query before implementation; routes, workers, plugins,
  adapters, and UI actions implement that rail instead of inventing local
  behavior names.
- One runtime truth per boundary: command admission and plan compilation must
  reuse the same supported-adapter truth instead of keeping parallel allowlists.
- Boundary enforcement must be mechanical where the repo can enforce it: `@dvt/engine`
  source depends on ports and shared contracts, not on `@dvt/planner` or concrete
  provider adapters.

## Bounded Contexts

| Context       | Responsibility                                          | Current status                                   |
| ------------- | ------------------------------------------------------- | ------------------------------------------------ |
| Planner       | DAG generation, plan assembly, deterministic hashing    | Implemented in code, partial runtime integration |
| Execution     | Run orchestration, lifecycle state, provider delegation | Implemented in code                              |
| State         | Event persistence, outbox, snapshot reads               | Implemented in code                              |
| Artifacts     | Plan bytes and compiled-code storage/access             | Partial                                          |
| Observability | Metrics, traces, operational signals                    | Partial                                          |
| UX/API        | Runtime endpoints and product surface                   | Partial                                          |

## Core Domain Model

Entities:

- `ExecutionPlan`
- `Run`
- `Step`

Value objects:

- `PlanRef`
- `EngineRunRef`
- `RunId`
- `StepId`
- `RunContext`
- `SignalRequest`
- `CanonicalRunStatus`
- `ProviderRunStatusView`
- `RunStatusEnrichment`

Aggregate:

```text
Run
  |- RunMetadata
  |- RunEvent[]          ordered by runSeq
  |- WorkflowSnapshot    optional, derived
```

## Top-Level Runtime Shape

```mermaid
flowchart TB
User --> UI
UI --> API
API --> Planner["Planner / compile seam"]
API --> StartRun["StartRun boundary"]
API --> Engine["IWorkflowEngine"]
API --> Enrichment["IRunEnrichmentService"]
Planner --> ArtifactBoundary["Artifact + validation boundary"]
Engine --> ProviderPort["IProviderAdapter"]
ProviderPort --> TemporalAdapter
TemporalAdapter --> TemporalWorker["apps/temporal-worker"]
TemporalWorker --> DbtRunner["DBT CLI runner"]
Engine --> StatePort["IRunStateStore / outbox ports"]
StatePort --> PostgresAdapter
Engine --> ObservabilityPort["IObservability"]
```

## Current Truth And Explicit Drift

- `packages/@dvt/contracts/src/contracts/engine/StartRunBoundary.v1.ts`
  is the canonical truth for currently supported start-run target adapters:
  `temporal`.
- `apps/api/src/modules/planCompileBoundary.ts` now reuses that same adapter
  truth for compile-time execution profiles.
- The broader shared `Provider` vocabulary still includes non-start-run
  provider IDs in some contract, schema, or test-harness surfaces. That is
  transitional architecture drift, not proof of implemented runtime support.
- Temporal remains a provider adapter behind `IProviderAdapter` and the API
  provider-adapter factory seam. Naming `temporal` as the active start-run
  adapter ID does not make Temporal part of DVT execution semantics.
- DBT is no longer part of engine-kernel semantics or the Temporal core
  activity registry. DBT step kinds are composed by the standalone worker DBT
  profile when enabled. Temporal step plugin composition is now a generic
  profile seam, and workflow artifact emission is driven by plugin-agnostic
  `compiledCodeRef` payloads instead of DBT step-kind gates. The remaining
  coupling is narrower package-level plugin/CLI surface area tracked as
  explicit repository risk, not hidden cleanup.

## Canonical Companions

- ADRs: [`docs/adr/`](../adr/index.md)
- Command/query rail governance:
  [`docs/architecture/command-query-rail-governance.md`](./command-query-rail-governance.md)
- Engine architecture: [`docs/architecture/components/engine/`](./components/engine/index.md)
- Delivery status: [`docs/architecture/system-delivery-status.md`](./system-delivery-status.md)
- Fowler follow-up review:
  [`docs/planning/reviews/architecture-and-governance/20260421-temporal-fowler-provider-truth-follow-up-review.md`](../planning/reviews/architecture-and-governance/20260421-temporal-fowler-provider-truth-follow-up-review.md)
- Code-aligned snapshot atlas: [`docs/architecture/atlas/`](./atlas/index.md)
