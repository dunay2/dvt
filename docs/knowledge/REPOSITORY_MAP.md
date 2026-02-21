# Repository Map and Relationships (Knowledge Base)

## 1. Quick context

- Monorepo workspace with [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml).
- Canonical packages live under [`packages/*`](../../packages).
- Contracts/documentation are the source of truth under [`docs/`](../INDEX.md).

---

## 2. Primary layers

### 2.1 Contracts (`@dvt/contracts`)

- Package: [`packages/@dvt/contracts/package.json`](../../packages/@dvt/contracts/package.json)
- Exports types, schemas, and runtime validation in [`packages/@dvt/contracts/index.ts`](../../packages/@dvt/contracts/index.ts)
- Shared dependency across engine/adapters/cli.

### 2.2 Engine core (`@dvt/engine`)

- Package: [`packages/@dvt/engine/package.json`](../../packages/@dvt/engine/package.json)
- Public API in [`packages/@dvt/engine/src/index.ts`](../../packages/@dvt/engine/src/index.ts)
- Central orchestrator: [`WorkflowEngine`](../../packages/@dvt/engine/src/core/WorkflowEngine.ts:93)
- Deterministic projection: [`SnapshotProjector`](../../packages/@dvt/engine/src/core/SnapshotProjector.ts:7)
- Idempotency: [`IdempotencyKeyBuilder`](../../packages/@dvt/engine/src/core/idempotency.ts:19)

### 2.3 Temporal adapter (`@dvt/adapter-temporal`)

- Package: [`packages/@dvt/adapter-temporal/package.json`](../../packages/@dvt/adapter-temporal/package.json)
- Primary implementation: [`TemporalAdapter`](../../packages/@dvt/adapter-temporal/src/TemporalAdapter.ts:47)
- Worker host: [`TemporalWorkerHost`](../../packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts:22)
- Activities: [`createActivities()`](../../packages/@dvt/adapter-temporal/src/activities/stepActivities.ts:67)
- Workflow: [`RunPlanWorkflow`](../../packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts:31)

### 2.4 Postgres adapter (`@dvt/adapter-postgres`)

- Package: [`packages/@dvt/adapter-postgres/package.json`](../../packages/@dvt/adapter-postgres/package.json)
- Primary implementation: [`PostgresStateStoreAdapter`](../../packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts:24)
- Current status: MVP baseline with smoke coverage.

### 2.5 CLI / tooling (`@dvt/cli`)

- Package: [`packages/cli/package.json`](../../packages/cli/package.json)
- Operational/validation scripts: [`packages/cli/*.cjs`](../../packages/cli).

---

## 3. Cross-package relationships (dependencies)

```mermaid
graph TD
  C[@dvt/contracts] --> E[@dvt/engine]
  C --> T[@dvt/adapter-temporal]
  C --> P[@dvt/adapter-postgres]
  C --> L[@dvt/cli]
  E --> T
  E --> P
  E --> L
```

Evidence:

- [`packages/@dvt/engine/package.json`](../../packages/@dvt/engine/package.json)
- [`packages/@dvt/adapter-temporal/package.json`](../../packages/@dvt/adapter-temporal/package.json)
- [`packages/@dvt/adapter-postgres/package.json`](../../packages/@dvt/adapter-postgres/package.json)
- [`packages/cli/package.json`](../../packages/cli/package.json)

---

## 4. Key class/file relationships

### 4.1 Execution start flow

1. [`WorkflowEngine.startRun()`](../../packages/@dvt/engine/src/core/WorkflowEngine.ts:102)
2. Contract validation (`parse*` from `@dvt/contracts`)
3. Authorization: [`assertTenantAccess()`](../../packages/@dvt/engine/src/security/authorizer.ts:2)
4. Plan integrity: [`PlanIntegrityValidator.fetchAndValidate()`](../../packages/@dvt/engine/src/security/planIntegrity.ts:9)
5. Delegation to adapter (`startRun`)
6. Persist metadata/events into StateStore/Outbox

### 4.2 State and projection

- Engine reads events and rebuilds snapshot via [`SnapshotProjector.rebuild()`](../../packages/@dvt/engine/src/core/SnapshotProjector.ts:8)
- Idempotency for events/signals via [`IdempotencyKeyBuilder`](../../packages/@dvt/engine/src/core/idempotency.ts:19)

### 4.3 Adapter selection

- Provider resolution: [`resolveEngineProvider()`](../../packages/@dvt/engine/src/application/providerSelection.ts:14)
- Provider contract: [`IProviderAdapter`](../../packages/@dvt/engine/src/adapters/IProviderAdapter.ts:10)

---

## 5. Documentation/ADRs connected to code

- ADR Temporal tests: [`ADR-0001`](../decisions/ADR-0001-temporal-integration-test-policy.md)
  - connected to [`packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts`](../../packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts)
- ADR Neo4j KG: [`ADR-0002`](../decisions/ADR-0002-neo4j-knowledge-graph-context-repository.md)
  - connected to [`docker-compose.neo4j.yml`](../../docker-compose.neo4j.yml)
  - and scripts under [`scripts/neo4j`](../../scripts/neo4j)

---

## 6. Legacy and canonical boundaries

- Explicit legacy zone: [`packages/@dvt/engine/legacy-top-level-engine`](../../packages/@dvt/engine/legacy-top-level-engine).
- Active/canonical path: [`packages/@dvt/engine/src`](../../packages/@dvt/engine/src).

Consolidation reference: [`docs/REPO_STRUCTURE_SUMMARY.md`](../REPO_STRUCTURE_SUMMARY.md)
