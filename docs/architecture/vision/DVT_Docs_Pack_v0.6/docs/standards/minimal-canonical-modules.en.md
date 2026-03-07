# Minimal Canonical Project Modules (domain-first)

> **Status**: Proposed for incremental adoption
> **Purpose**: Define the canonical set of modules, separating domain and infrastructure to maintain strict boundaries.

---

## 1) Core domains (must exist)

### `@dvt/planner`

- **Role**: Pure determinism.
- **Exports**: `ExecutionPlan`, `PlannerInputEnvelope`, `PlannerPolicies`, hashing/canonicalization of `planId`.
- **Restrictions**: No I/O, no runtime dependencies.

### `@dvt/engine`

- **Role**: Sovereignty of execution semantics.
- **Exports**: Lifecycle contracts, command contracts, event types (schemas + generated TS).
- **Restrictions**: No direct imports to Postgres/Kafka/Temporal.

### `@dvt/run-state-store`

- **Role**: Source-of-truth persistence contracts.
- **Exports**: `appendEventsTx`, `bootstrapRunTx`, read interfaces for reconciliation/backfill, `seq` rules.
- **Restrictions**: Contracts + invariants; no vendor implementation.

### `@dvt/projector`

- **Role**: CQRS projection framework + gap handling.
- **Exports**: Projector interfaces, checkpointing contracts, reconciliation hooks, dual-read helpers.
- **Restrictions**: No domain semantics; only projection mechanics.

### `@dvt/contracts-core` (optional, useful if kept minimal)

- **Role**: Domain-agnostic primitives.
- **Exports**: `OpaqueId`, `Result<T>`, `UtcTimestamp`, `Hash256`, schema utilities without business semantics.
- **Warning**: Keep it small to avoid "mega contracts" anti-pattern.

---
