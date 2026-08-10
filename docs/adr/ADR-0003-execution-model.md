# ADR-0003: Execution Model Sovereignty

- **Status**: Accepted
- **Date**: 2026-02-16
- **Owners**: Architecture / Engine Domain
- **Related files**:
  - [`IWorkflowEngine.v1.md`](../architecture/components/engine/contracts/engine/IWorkflowEngine.v1.md)
  - [`RunEvents.v1.md`](../architecture/components/engine/contracts/engine/RunEvents.v1.md)
  - [`ExecutionSemantics.v1.md`](../architecture/components/engine/contracts/engine/ExecutionSemantics.v1.md)

---

## Context

The platform is evolving into:

- an orchestration abstraction layer,
- a multi-tenant execution runtime,
- a domain with explicit execution semantics,
- a provider-neutral port that can admit future runtimes without changing
  domain semantics.

Ambiguity repeatedly appeared when semantics were inferred from engine
behavior instead of being domain-defined first.

## Current Applicability

Current production composition supports Temporal only. The provider-neutral
ports and domain-owned semantics are delivered, but a second provider and its
cross-provider conformance evidence are not.

A future workflow provider is conditional until an ADR admits it and the
repository contains its real adapter package, capability conformance,
production composition, and documentation evidence. Naming or diagramming a
runtime does not make it an implemented capability.

---

## Decision

DVT+ will maintain **execution semantics sovereignty**, independent of
any specific workflow engine.

### 1) Domain-owned lifecycle

DVT+ MUST own the lifecycle state machine and valid transitions.

### 2) Domain-owned invariants

DVT+ MUST define step-level and run-level execution invariants.

### 3) Adapter translation boundary

Adapters MUST translate DVT+ semantics into engine APIs. Engines MUST
NOT define DVT+ semantics.

---

## Consequences

### Positive

- Consistent behavior across runtimes.
- Engine migration without changing business workflows.
- Clear separation of domain semantics vs infrastructure
  implementation.

### Trade-offs

- Additional abstraction layer to maintain.
- Semantic mapping maintenance cost per adapter.
- Potential performance overhead in translation boundaries.

---

## Acceptance Criteria

1. Run and step transitions are defined by DVT+ contracts, not adapter internals.
2. Adapter specs map to domain semantics without introducing engine-specific lifecycle semantics.
3. Deterministic replay and audit behavior are engine-agnostic by contract.

---

## Architecture Diagram (Detailed)

```mermaid
graph TD
    subgraph "Domain Layer (DVT+ Sovereignty)"
        A[ADR-0003: Execution Model Sovereignty]
        A --> B[Defines lifecycle states<br/>PENDING, RUNNING, COMPLETED]
        A --> C[Defines valid transitions<br/>RunQueued to RunStarted to RunCompleted]
        A --> D[Defines execution semantics<br/>Meaning of lifecycle events]
        A --> E[Defines invariants<br/>Retry, ordering, idempotency rules]
    end

    subgraph "Engine Layer (Orchestration Boundary)"
        F[WorkflowEngine]
        F --> G[Emits domain events<br/>RunQueued, StepStarted]
        F --> H[Validates metadata<br/>PlanRef, schema version]
        F --> I[Delegates execution to adapter]
    end

    subgraph "Adapter Layer (Infrastructure Mapping)"
        J[TemporalAdapter]
        K[FutureProviderAdapter<br/>conditional]

        J --> M[Maps to Temporal primitives<br/>Workflow + Activities]
        K -. admission criteria .-> N[Maps admitted provider primitives]
    end

    subgraph "Execution Runtime (Engine Specific)"
        O[Temporal Runtime]
        P[Future Provider Runtime<br/>conditional]
    end

    subgraph "Event Store (Source of Truth)"
        S[(PostgreSQL)]
        S --> T[Append-only log<br/>RunEventPersisted]
        S --> U[Monotonic runSeq]
        S --> V[Idempotency via keys]
    end

    subgraph "Projection Layer"
        W[Projector]
        W --> X[Rebuilds state]
        W --> Y[Enforces invariants]
        W --> Z[Produces read models]
    end

    A -.-> F
    F --> J
    F -. after admission .-> K
    J --> O
    K -.-> P
    O --> S
    P -.-> S
    S --> W
```

---

## Architecture Diagram (Conceptual Loop)

```mermaid
graph LR
    A[Domain<br/>Defines Semantics]
    B[Engine<br/>Orchestrates]
    C[Adapter<br/>Maps to APIs]
    D[Execution Runtime]
    E[Event Store]
    F[Projection / Read Model]

    A --> B --> C --> D --> E --> F --> A
```

---

## Code Ownership Example

```typescript
// Incorrect: Engine defines behavior by I/O side effects
class Engine_OLD {
  async startRun(planRef: PlanRef, ctx: RunContext) {
    const bytes = await this.planFetcher.fetch(planRef.uri);
    return this.adapter.executePlan(bytes, ctx);
  }
}

// Correct: Domain defines semantics, adapter handles infrastructure
class Engine {
  async startRun(planRef: PlanRef, ctx: RunContext): Promise<RunRef> {
    this.validateMetadata(planRef); // domain rule
    return this.adapter.executePlan(planRef, ctx);
  }
}

class TemporalAdapter implements IWorkflowAdapter {
  async executePlan(planRef: PlanRef, ctx: RunContext): Promise<RunRef> {
    const bytes = await this.fetch(planRef.uri);
    if (sha256(bytes) !== planRef.sha256) {
      throw new Error('PLAN_HASH_MISMATCH');
    }
    return this.startWorkflow(bytes, ctx);
  }
}
```

---

## Additional Commentary

- The **Engine does not fetch plans** --- that is infrastructure.
- The **Planner defines ordering and retry policy** --- not the
  engine.
- The **State Store is the single source of truth** --- not Temporal
  nor any workflow provider.
- Engine adapters must remain stateless regarding business semantics.
- Replacing Temporal with a future admitted provider must not alter domain
  contracts.

---

## References

- [`ADR-0004-event-sourcing-strategy.md`](./ADR-0004-event-sourcing-strategy.md)
- Temporal docs: https://docs.temporal.io/
- ADR-0011-run-started-ownership.md
- ADR-0012-plan-integrity-ownership.md
- ADR-0010-run-event-envelope-split.md
