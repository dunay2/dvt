# Repository Map and Relationships (Knowledge Base)

## 1. Quick context

- Monorepo workspace with [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml).
- Canonical packages live under [`packages/*`](../../packages).
- Contracts/documentation are the source of truth under [`docs/`](../INDEX.md).

---

## 2. Primary layers

### 2.1 Contracts (`@dvt/contracts`)

- Package: [`packages/contracts/package.json`](../../packages/contracts/package.json)
- Exports types, schemas, and runtime validation in [`packages/contracts/index.ts`](../../packages/contracts/index.ts)
- Shared dependency across engine/adapters/cli.

### 2.2 Engine core (`@dvt/engine`)

- Package: [`packages/engine/package.json`](../../packages/engine/package.json)
- Public API in [`packages/engine/src/index.ts`](../../packages/engine/src/index.ts)
- Central orchestrator: [`WorkflowEngine`](../../packages/engine/src/core/WorkflowEngine.ts:93)
- Deterministic projection: [`SnapshotProjector`](../../packages/engine/src/core/SnapshotProjector.ts:7)
- Idempotency: [`IdempotencyKeyBuilder`](../../packages/engine/src/core/idempotency.ts:19)

### 2.3 Temporal adapter (`@dvt/adapter-temporal`)

- Package: [`packages/adapter-temporal/package.json`](../../packages/adapter-temporal/package.json)
- Primary implementation: [`TemporalAdapter`](../../packages/adapter-temporal/src/TemporalAdapter.ts:47)
- Worker host: [`TemporalWorkerHost`](../../packages/adapter-temporal/src/TemporalWorkerHost.ts:22)
- Activities: [`createActivities()`](../../packages/adapter-temporal/src/activities/stepActivities.ts:67)
- Workflow: [`RunPlanWorkflow`](../../packages/adapter-temporal/src/workflows/RunPlanWorkflow.ts:31)

### 2.4 Postgres adapter (`@dvt/adapter-postgres`)

- Package: [`packages/adapter-postgres/package.json`](../../packages/adapter-postgres/package.json)
- Primary implementation: [`PostgresStateStoreAdapter`](../../packages/adapter-postgres/src/PostgresStateStoreAdapter.ts:24)
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

- [`packages/engine/package.json`](../../packages/engine/package.json)
- [`packages/adapter-temporal/package.json`](../../packages/adapter-temporal/package.json)
- [`packages/adapter-postgres/package.json`](../../packages/adapter-postgres/package.json)
- [`packages/cli/package.json`](../../packages/cli/package.json)

---

## 4. Key class/file relationships

### 4.1 Execution start flow

1. [`WorkflowEngine.startRun()`](../../packages/engine/src/core/WorkflowEngine.ts:102)
2. Contract validation (`parse*` from `@dvt/contracts`)
3. Authorization: [`assertTenantAccess()`](../../packages/engine/src/security/authorizer.ts:2)
4. Plan integrity: [`PlanIntegrityValidator.fetchAndValidate()`](../../packages/engine/src/security/planIntegrity.ts:9)
5. Delegation to adapter (`startRun`)
6. Persist metadata/events into StateStore/Outbox

### 4.2 State and projection

- Engine reads events and rebuilds snapshot via [`SnapshotProjector.rebuild()`](../../packages/engine/src/core/SnapshotProjector.ts:8)
- Idempotency for events/signals via [`IdempotencyKeyBuilder`](../../packages/engine/src/core/idempotency.ts:19)

### 4.3 Adapter selection

- Provider resolution: [`resolveEngineProvider()`](../../packages/engine/src/application/providerSelection.ts:14)
- Provider contract: [`IProviderAdapter`](../../packages/engine/src/adapters/IProviderAdapter.ts:10)

---

## 5. Documentation/ADRs connected to code

- ADR Temporal tests: [`ADR-0001`](../decisions/ADR-0001-temporal-integration-test-policy.md)
  - connected to [`packages/adapter-temporal/test/integration.time-skipping.test.ts`](../../packages/adapter-temporal/test/integration.time-skipping.test.ts)
- ADR Neo4j KG: [`ADR-0002`](../decisions/ADR-0002-neo4j-knowledge-graph-context-repository.md)
  - connected to [`docker-compose.neo4j.yml`](../../docker-compose.neo4j.yml)
  - and scripts under [`scripts/neo4j`](../../scripts/neo4j)

---

## 6. Legacy and canonical boundaries

- Explicit legacy zone: [`packages/engine/legacy-top-level-engine`](../../packages/engine/legacy-top-level-engine).
- Active/canonical path: [`packages/engine/src`](../../packages/engine/src).

Consolidation reference: [`docs/REPO_STRUCTURE_SUMMARY.md`](../REPO_STRUCTURE_SUMMARY.md)
