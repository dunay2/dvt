# Repository Map and Relationships

## 1. Quick context

- Monorepo workspace defined in [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml).
- Canonical packages live in [`packages/`](../../packages).
- Contracts and architecture docs live in [`docs/`](../index.md).

---

## 2. Main layers

### 2.1 Contracts (`@dvt/contracts`)

- Package: [`packages/@dvt/contracts/package.json`](../../packages/@dvt/contracts/package.json)
- Shared types, schemas and validation used by engine and adapters.

### 2.2 Engine core (`@dvt/engine`)

- Package: [`packages/@dvt/engine/package.json`](../../packages/@dvt/engine/package.json)
- Public API: [`packages/@dvt/engine/src/index.ts`](../../packages/@dvt/engine/src/index.ts)
- Central orchestrator: [`WorkflowEngine`](../../packages/@dvt/engine/src/core/WorkflowEngine.ts:93)
- Deterministic projection: [`SnapshotProjector`](../../packages/@dvt/engine/src/core/SnapshotProjector.ts:7)

### 2.3 Temporal adapter (`@dvt/adapter-temporal`)

- Package: [`packages/@dvt/adapter-temporal/package.json`](../../packages/@dvt/adapter-temporal/package.json)
- Main adapter: [`TemporalAdapter`](../../packages/@dvt/adapter-temporal/src/TemporalAdapter.ts:47)
- Workflow host: [`TemporalWorkerHost`](../../packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts:22)
- Workflow entrypoint: [`RunPlanWorkflow`](../../packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts:118)

### 2.4 Postgres adapter (`@dvt/adapter-postgres`)

- Package: [`packages/@dvt/adapter-postgres/package.json`](../../packages/@dvt/adapter-postgres/package.json)
- State store adapter: [`PostgresStateStoreAdapter`](../../packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts:24)

### 2.5 CLI and tooling

- Package: [`packages/@dvt/cli/package.json`](../../packages/@dvt/cli/package.json)
- Traceability tooling: [`packages/@dvt/traceability-service`](../../packages/@dvt/traceability-service)

---

## 3. Package relationships

```mermaid
graph TD
  C[@dvt/contracts] --> E[@dvt/engine]
  C --> T[@dvt/adapter-temporal]
  C --> P[@dvt/adapter-postgres]
  C --> L[@dvt/cli]
  C --> R[@dvt/traceability-service]
  E --> T
  E --> P
  E --> L
```

---

## 4. High-value execution flow

1. [`WorkflowEngine.startRun()`](../../packages/@dvt/engine/src/core/WorkflowEngine.ts:102)
2. Contract parsing and validation from `@dvt/contracts`
3. Authorization checks
4. Plan integrity validation
5. Delegation to provider adapter
6. Event and state persistence through the state store and outbox

---

## 5. ADRs connected to active code

- [ADR-0001](../adr/ADR-0001-temporal-integration-test-policy.md) aligns with Temporal integration tests.
- [ADR-0014](../adr/ADR-0014-run-driven-adapter-model.md) aligns with adapter-first run execution.
- [ADR-0030](../adr/ADR-0030-pre-dispatch-intent-log.md) aligns with crash-consistency startup flow.
- [ADR-0002](../adr/ADR-0002-neo4j-knowledge-graph-context-repository.md) is historical and superseded.

---

## 6. Canonical boundary

- Active code path: [`packages/@dvt/engine/src`](../../packages/@dvt/engine/src)
- Legacy area: `packages/@dvt/engine/legacy-top-level-engine` (historical path, not present in the current tree)
