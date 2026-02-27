# Mapa del Repositorio y Relaciones (Base de Conocimiento)

## 1. Contexto rápido

- Workspace monorepo con [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml).
- Paquetes canónicos en [`packages/*`](../../packages).
- Contratos/documentación como fuente de verdad en [`docs/`](../INDEX.md).

---

## 2. Capas principales

### 2.1 Contratos (`@dvt/contracts`)

- Paquete: [`packages/contracts/package.json`](../../packages/contracts/package.json)
- Exporta tipos, esquemas y validación en [`packages/contracts/index.ts`](../../packages/contracts/index.ts)
- Es dependencia transversal de engine/adapters/cli.

### 2.2 Núcleo engine (`@dvt/engine`)

- Paquete: [`packages/engine/package.json`](../../packages/engine/package.json)
- API pública en [`packages/engine/src/index.ts`](../../packages/engine/src/index.ts)
- Orquestador central en [`WorkflowEngine`](../../packages/engine/src/core/WorkflowEngine.ts:93)
- Proyección determinista en [`SnapshotProjector`](../../packages/engine/src/core/SnapshotProjector.ts:7)
- Idempotencia en [`IdempotencyKeyBuilder`](../../packages/engine/src/core/idempotency.ts:19)

### 2.3 Adaptador Temporal (`@dvt/adapter-temporal`)

- Paquete: [`packages/adapter-temporal/package.json`](../../packages/adapter-temporal/package.json)
- Implementación principal en [`TemporalAdapter`](../../packages/adapter-temporal/src/TemporalAdapter.ts:47)
- Worker host en [`TemporalWorkerHost`](../../packages/adapter-temporal/src/TemporalWorkerHost.ts:22)
- Actividades en [`createActivities()`](../../packages/adapter-temporal/src/activities/stepActivities.ts:67)
- Workflow en [`RunPlanWorkflow`](../../packages/adapter-temporal/src/workflows/RunPlanWorkflow.ts:31)

### 2.4 Adaptador Postgres (`@dvt/adapter-postgres`)

- Paquete: [`packages/adapter-postgres/package.json`](../../packages/adapter-postgres/package.json)
- Implementación principal en [`PostgresStateStoreAdapter`](../../packages/adapter-postgres/src/PostgresStateStoreAdapter.ts:24)
- Estado actual: base MVP con cobertura smoke.

### 2.5 CLI / tooling (`@dvt/cli`)

- Paquete: [`packages/cli/package.json`](../../packages/cli/package.json)
- Scripts operativos/validación en [`packages/cli/*.cjs`](../../packages/cli).

---

## 3. Relaciones entre paquetes (dependencias)

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

Evidencia en:

- [`packages/engine/package.json`](../../packages/engine/package.json)
- [`packages/adapter-temporal/package.json`](../../packages/adapter-temporal/package.json)
- [`packages/adapter-postgres/package.json`](../../packages/adapter-postgres/package.json)
- [`packages/cli/package.json`](../../packages/cli/package.json)

---

## 4. Relaciones clase/archivo más relevantes

### 4.1 Flujo de inicio de ejecución

1. [`WorkflowEngine.startRun()`](../../packages/engine/src/core/WorkflowEngine.ts:102)
2. validaciones de contrato (`parse*` desde `@dvt/contracts`)
3. autorización [`assertTenantAccess()`](../../packages/engine/src/security/authorizer.ts:2)
4. integridad de plan [`PlanIntegrityValidator.fetchAndValidate()`](../../packages/engine/src/security/planIntegrity.ts:9)
5. delegación a adapter (`startRun`)
6. persistencia metadata/eventos en StateStore/Outbox

### 4.2 Estado y proyección

- Motor consulta eventos y reconstruye snapshot vía [`SnapshotProjector.rebuild()`](../../packages/engine/src/core/SnapshotProjector.ts:8)
- Idempotencia para eventos/señales con [`IdempotencyKeyBuilder`](../../packages/engine/src/core/idempotency.ts:19)

### 4.3 Adapter selection

- Resolución de proveedor en [`resolveEngineProvider()`](../../packages/engine/src/application/providerSelection.ts:14)
- Contrato de provider en [`IProviderAdapter`](../../packages/engine/src/adapters/IProviderAdapter.ts:10)

---

## 5. Documentación/ADRs conectados a código

- ADR Temporal tests: [`ADR-0001`](../decisions/ADR-0001-temporal-integration-test-policy.md)
  - conecta con [`packages/adapter-temporal/test/integration.time-skipping.test.ts`](../../packages/adapter-temporal/test/integration.time-skipping.test.ts)
- ADR Neo4j KG: [`ADR-0002`](../decisions/ADR-0002-neo4j-knowledge-graph-context-repository.md)
  - conecta con [`docker-compose.neo4j.yml`](../../docker-compose.neo4j.yml)
  - y scripts en [`scripts/neo4j`](../../scripts/neo4j)

---

## 6. Legacy y frontera canónica

- Zona legacy explícita en [`packages/engine/legacy-top-level-engine`](../../packages/engine/legacy-top-level-engine).
- La ruta activa/canónica está en [`packages/engine/src`](../../packages/engine/src).

Referencia de consolidación: [`docs/REPO_STRUCTURE_SUMMARY.md`](../REPO_STRUCTURE_SUMMARY.md)
