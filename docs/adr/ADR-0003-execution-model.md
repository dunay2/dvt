```markdown
# ADR-0003: Execution Model Sovereignty

- **Status**: Accepted
- **Date**: 2026-02-16
- **Owners**: Architecture / Engine Domain
- **Related files**:
  - [`IWorkflowEngine.v2.0.md`](../architecture/engine/contracts/engine/IWorkflowEngine.v2.0.md)
  - [`RunEvents.v2.0.md`](../architecture/engine/contracts/engine/RunEvents.v2.0.md)
  - [`ExecutionSemantics.v2.0.md`](../architecture/engine/contracts/engine/ExecutionSemantics.v2.0.md)

---

## Context

The platform is evolving into:

- an orchestration abstraction layer,
- a multi-tenant execution runtime,
- a domain with explicit execution semantics,
- a system targeting multiple engines (Temporal, Conductor, future runtimes).

Ambiguity repeatedly appeared when semantics were inferred from engine behavior instead of being domain-defined first.

---

## Decision

DVT+ will maintain **execution semantics sovereignty**, independent of any specific workflow engine.

### 1) Domain-owned lifecycle

DVT+ MUST own the lifecycle state machine and valid transitions.

### 2) Domain-owned invariants

DVT+ MUST define step-level and run-level execution invariants.

### 3) Adapter translation boundary

Adapters MUST translate DVT+ semantics into engine APIs. Engines MUST NOT define DVT+ semantics.

---

## Consequences

### Positive

- Consistent behavior across runtimes.
- Engine migration without changing business workflows.
- Clear separation of domain semantics vs infrastructure implementation.

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

## References

- [`ADR-0004-event-sourcing-strategy.md`](./ADR-0004-event-sourcing-strategy.md)
- Temporal docs: <https://docs.temporal.io/>
- Conductor docs: <https://conductor.netflix.com/>
```
