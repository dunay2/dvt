# DVT+ - System Delivery Status

<!-- markdownlint-disable MD060 -->

- **Fecha**: 2026-03-08 (revisado 2026-03-08 - G1 closed after runtime hardening)
- **VersiÃ³n**: 1.2.0
- **Alcance**: Todos los mÃ³dulos del monorepo (`packages/@dvt/*`, `apps/*`)
- **Tests engine**: 151/151 âœ… (153 â†’ 151 tras limpieza de fixtures huÃ©rfanos)

---

## Traceability Anchors

This document is the cross-system status board, not the canonical behavioral spec.

Use it together with:

- [Glossary](../concepts/glossary.md) for shared meanings of terms like `run`,
  `plan`, `adapter`, `status`, and `roadmap`
- [Domain Language](../concepts/domain-language.md) for the naming discipline
  used across planning, code, and architecture
- [Canonical Doc Code Matrix](../planning/status/canonical-doc-code-matrix.md) for the curated topic -> doc -> code -> test -> command mapping
- [Gap Execution Plans](../planning/gaps/GAP_EXECUTION_PLANS.md) for the active execution-gap breakdown

Minimum tuple for this document:

- `canonical_spec`: topic-specific. See the matrix and linked specs.
- `status_doc`: [`docs/architecture/system-delivery-status.md`](system-delivery-status.md)
- `code_paths`: summarized by module here; curated paths live in [Canonical Doc Code Matrix](../planning/status/canonical-doc-code-matrix.md)
- `test_paths`: summarized by module here; exact tests live in [Canonical Doc Code Matrix](../planning/status/canonical-doc-code-matrix.md) and linked evidence docs
- `verification_cmd`: `pnpm test:engine`, `pnpm test:adapter-postgres`, `pnpm test:adapter-temporal`, `pnpm test:adapter-temporal:integration`, `pnpm validate:contracts`
- `evidence_or_risk`: use linked evidence docs for closed gaps and risk-register entries for open hardening debt

---

## Leyenda

| SÃ­mbolo | Significado                                                           |
| -------- | --------------------------------------------------------------------- |
| âœ…      | Implementado y testeado â€” listo para producciÃ³n                    |
| ðŸŸ¡     | Parcial â€” puerto/contrato existe, implementaciÃ³n stub o incompleta |
| âŒ       | Ausente â€” no existe implementaciÃ³n ni decisiÃ³n firme              |

---

## Diagrama del sistema

```mermaid
flowchart TB

%% â”€â”€â”€ ENTRY LAYER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
subgraph ENTRY["Entry Layer"]
  direction LR
  API["apps/api\nðŸŸ¡ Fastify + routes\nno auth real\nno prod-ready"]
  WEB["apps/web\nðŸŸ¡ UI existe\nparcialmente funcional"]
end

%% â”€â”€â”€ PLANNING LAYER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
subgraph PLANNING["Planning Layer"]
  direction TB
  MANIFEST["dbt manifest.json\nâœ… grafo + metadata"]
  RUNRESULTS["dbt run_results.json\nâœ… compiled_code"]
  PLANNER["@dvt/planner\nðŸŸ¡ contracts + domain + runtime\ncontract tests âœ…\nsin integraciÃ³n dbt real"]
  PLANVERIF["@dvt/plan-verifier\nðŸŸ¡ existe\ncobertura de tests âŒ"]
  COMPILED_DEC["compiledCodeRef ownership\nâœ… ADR-0032 accepted\nimplemented end-to-end"]
end

%% â”€â”€â”€ EXECUTION LAYER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
subgraph EXEC["Execution Layer"]
  direction TB
  ENGINE["@dvt/engine\nðŸŸ¡ WorkflowEngine âœ…\n153 tests âœ…\nPostgres adapter ðŸŸ¡\nscheduler âŒ"]
  INTENT["IStartRunIntentStore\nâœ… InMemory + Postgres\nreconciler runtime âœ…\nADR-0030"]
  MAINT["RunMaintenanceService\nâœ… reconcileOrphanedIntents\ndetectStuckRuns"]
  CONTRACTS["@dvt/contracts\nâœ… tipos compartidos\nZod schemas"]
end

subgraph ADAPTERS["Provider Adapters"]
  direction LR
  TEMPORAL["@dvt/adapter-temporal\n? SDK real + lookupRunRef ?\nintegration suite ?\noperational hardening ?"]
  POSTGRES_A["@dvt/adapter-postgres\nâœ… IMPL 100%\nbootstrapRunTx âœ… outbox âœ…\nDLQ âœ… listEvents(opts) âœ…\nlistRuns status-filter âœ…"]
  MOCK["MockAdapter (test)\nâœ… lookupRunRef âœ…"]
end

%% â”€â”€â”€ PERSISTENCE LAYER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
subgraph PERSIST["Persistence Layer"]
  direction TB
  STATESTORE["@dvt/state-store\nâœ… IRunStateStore âœ…\nInMemoryTxStore âœ…\nPostgresStateStore âœ… 100%"]
  OUTBOX["Outbox (dominio)\nðŸŸ¡ patrÃ³n âœ…\nlistPending + DLQ âœ…\nworker polling âŒ\nshards âŒ"]
  KAFKA["Event Bus (Kafka)\nâŒ solo local-compose\nworker producciÃ³n âŒ"]
end

%% â”€â”€â”€ READ / PROJECTION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
subgraph READ["Read & Projection"]
  direction TB
  PROJECTOR["SnapshotProjector\nðŸŸ¡ en engine âœ…\nservicio standalone âŒ"]
  READMODELS["Read Models\nâŒ MISSING\nsin Ã­ndice denorm prod"]
end

%% â”€â”€â”€ OBSERVABILITY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
subgraph OBS["Observability"]
  direction LR
  OBS_PORT["@dvt/observability\nâœ… IObservability port\nnoop implementation âœ…"]
  OBS_OTEL["@dvt/observability-otel\nðŸŸ¡ OtelObservability.ts\nintegraciÃ³n prod âŒ"]
end

%% â”€â”€â”€ TRACEABILITY / OPENLINEAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
subgraph TRACE["Traceability / OpenLineage"]
  direction TB
  TRACSVC["@dvt/traceability-service\nðŸŸ¡ service + lineage mapper\ncompiledCodeRef path âœ…\nschema pin/delivery pending"]
  OL_MAP["RunEvents â†’ OL mapping\nðŸŸ¡ TypeScript impl âœ…\npackage tests âœ…\nCI/schema pin âŒ"]
  OLSPEC["OL spec pin _schemaURL\nâŒ MISSING"]
  OUTBOXL["outbox_lineage table\nâŒ MISSING\nsolo intenciÃ³n de diseÃ±o"]
  OUTBOXLW["outbox_lineage Worker\nâŒ MISSING\nfail-open DLQ âŒ"]
  COST["dvt_cost attributor\nâŒ Phase 3 (2027)"]
  MARQUEZ["Marquez\nðŸŸ¡ consumidor externo\ndeployment = riesgo externo"]
end

%% â”€â”€â”€ FLUJOS PRINCIPALES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
MANIFEST --> PLANNER
RUNRESULTS --> COMPILED_DEC
PLANNER --> ENGINE

API --> ENGINE
API --> PLANNER
WEB --> API

ENGINE --> ADAPTERS
ENGINE --> INTENT
ENGINE --> STATESTORE
MAINT --> INTENT
MAINT --> ADAPTERS
MAINT --> STATESTORE

STATESTORE --> OUTBOX
OUTBOX --> KAFKA
KAFKA --> PROJECTOR
PROJECTOR --> READMODELS
READMODELS --> WEB

ENGINE --> OBS_PORT
MAINT --> OBS_PORT
OBS_PORT --> OBS_OTEL

STATESTORE --> OL_MAP
OL_MAP --> OUTBOXL
OUTBOXL --> OUTBOXLW
OUTBOXLW --> MARQUEZ
COST -. "debe pasar por" .-> OUTBOXL
TRACSVC --> OL_MAP
```

---

## Estado por mÃ³dulo

### Entry Layer

| MÃ³dulo    | Paquete    | Estado | Notas                                                                          |
| ---------- | ---------- | ------ | ------------------------------------------------------------------------------ |
| API Server | `apps/api` | ðŸŸ¡   | Fastify + routes + plugins. Sin autenticaciÃ³n real. No production-ready       |
| Web UI     | `apps/web` | ðŸŸ¡   | Frontend existe con UI parcialmente funcional. DocumentaciÃ³n de sprint pesada |

---

### Planning Layer

| MÃ³dulo          | Paquete              | Estado | Notas                                                                                                  |
| ---------------- | -------------------- | ------ | ------------------------------------------------------------------------------------------------------ |
| dbt manifest     | â€”                  | âœ…    | Input canÃ³nico â€” grafo de nodos y metadata                                                          |
| dbt run_results  | â€”                  | âœ…    | Fuente de `compiled_code` por nodo                                                                     |
| Planner          | `@dvt/planner`       | ðŸŸ¡   | Contracts + domain + runtime existen. Contract tests con engine âœ…. Sin integraciÃ³n real con dbt CLI |
| Plan Verifier    | `@dvt/plan-verifier` | ðŸŸ¡   | Estructura existe. Cobertura de tests âŒ                                                               |
| StepTypeRegistry | â€”                  | âŒ     | No existe. `stepTypeConfig` permanece opaco (`Record<string, unknown>`)                                |
| compiledCodeRef  | â€”                  | âœ…    | ADR-0032 aceptado e implementado extremo a extremo; queda deuda separada por el transporte opaco       |

---

### Execution Layer

| MÃ³dulo               | Paquete                 | Estado | Notas                                                                                                                                                                                                                                   |
| --------------------- | ----------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WorkflowEngine        | `@dvt/engine`           | ðŸŸ¡   | `startRun`, `cancelRun`, `signal`, `getRunStatus`, `enrichRunStatus` âœ… Â· 153 tests âœ… Â· usa Postgres adapter vÃ­a contrato Â· Scheduler âŒ                                                                                         |
| IStartRunIntentStore  | `@dvt/engine`           | âœ…    | Puerto âœ… Â· InMemory âœ… Â· Postgres âœ… Â· reconciler/runtime periÃ³dico âœ… (ADR-0030)                                                                                                                                              |
| RunMaintenanceService | `@dvt/engine`           | âœ…    | `reconcileOrphanedIntents`, `detectStuckRuns`, `detectStuckCancellingRuns` Â· 151 tests âœ…                                                                                                                                             |
| Contracts             | `@dvt/contracts`        | âœ…    | Tipos compartidos, Zod schemas, interfaces                                                                                                                                                                                              |
| Temporal Adapter      | `@dvt/adapter-temporal` | ?      | Temporal SDK real + `lookupRunRef` ? + suite time-skipping ? ? connect timeout and runtime observability hardening landed                                                                                                               |
| Postgres Adapter      | `@dvt/adapter-postgres` | âœ…    | **100% implementado** â€” `bootstrapRunTx`, `appendAndEnqueueTx`, `getSnapshot`, `listEvents(options)` con cursor/paginaciÃ³n âœ…, `listRuns` con filtro `status` âœ…, outbox completo, DLQ + `replayDeadLetters`, tenant isolation RLS |
| MockAdapter           | `@dvt/engine` (test)    | âœ…    | Test adapter completo con `lookupRunRef`                                                                                                                                                                                                |

---

### Persistence Layer

| MÃ³dulo           | Paquete                 | Estado | Notas                                                                                                                                                          |
| ----------------- | ----------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| IRunStateStore    | `@dvt/state-store`      | âœ…    | Puerto completo âœ… Â· `InMemoryTxStore` âœ… Â· `PostgresStateStoreAdapter` âœ… 100% (G2 cerrado)                                                              |
| Outbox (dominio)  | `@dvt/adapter-postgres` | ðŸŸ¡   | `appendAndEnqueueTx` âœ… Â· `listPending`/`markDelivered`/`markFailed` âœ… Â· DLQ + `replayDeadLetters` âœ… Â· Worker de polling independiente âŒ Â· shards âŒ |
| Event Bus (Kafka) | infra                   | âŒ     | `local-compose.yaml` existe Â· Worker producciÃ³n âŒ Â· NingÃºn publicador real                                                                                |

---

### Read & Projection

| MÃ³dulo           | Paquete       | Estado | Notas                                                                                                |
| ----------------- | ------------- | ------ | ---------------------------------------------------------------------------------------------------- |
| SnapshotProjector | `@dvt/engine` | ðŸŸ¡   | Proyector in-process âœ… Â· Servicio standalone âŒ                                                   |
| Read Models       | â€”           | âŒ     | Sin servicio standalone ni Ã­ndices denormalizados de producciÃ³n; el proyector actual es in-process |

---

### Observability

| MÃ³dulo             | Paquete                   | Estado | Notas                                                                 |
| ------------------- | ------------------------- | ------ | --------------------------------------------------------------------- |
| IObservability port | `@dvt/observability`      | âœ…    | Counters, histograms, traces, logs â€” puerto + noop                  |
| OTel implementation | `@dvt/observability-otel` | ðŸŸ¡   | `OtelObservability.ts` existe Â· IntegraciÃ³n producciÃ³n no validada |

---

### Traceability / OpenLineage

| MÃ³dulo                  | Paquete                     | Estado | Notas                                                                                                   |
| ------------------------ | --------------------------- | ------ | ------------------------------------------------------------------------------------------------------- |
| Traceability Service     | `@dvt/traceability-service` | ðŸŸ¡   | `service.ts` + lineage resolver/mapper existen Â· package tests âœ… Â· `_schemaURL`/delivery runtime âŒ |
| RunEvents â†’ OL mapping | â€”                         | ðŸŸ¡   | Mapping TypeScript âœ… + tests de paquete âœ… Â· CI/pin de spec âŒ                                      |
| OL spec pin `_schemaURL` | â€”                         | âŒ     | Sin versiÃ³n OL fijada en cÃ³digo â€” riesgo de drift silencioso                                        |
| `outbox_lineage` table   | â€”                         | âŒ     | No existe implementaciÃ³n en repo; solo intenciÃ³n de diseÃ±o                                           |
| `outbox_lineage` Worker  | â€”                         | âŒ     | No existe. fail-open DLQ policy sin definir                                                             |
| `dvt_cost attributor`    | â€”                         | âŒ     | Phase 3 (Q1 2027) Â· **invariante**: MUST usar `outbox_lineage`                                         |
| Marquez                  | externo                     | ðŸŸ¡   | Consumidor externo de OpenLineage Â· Deployment = riesgo externo                                        |

---

## Gaps crÃ­ticos por fase

| #   | Gap                                                               | MÃ³dulo afectado                   | Estado                                                                                                                               | Fase      |
| --- | ----------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| G1  | **Temporal Adapter real** (SDK, namespace, tasks, `lookupRunRef`) | `adapter-temporal`                 | ? Closed ? runtime hardening implemented and verified by unit + time-skipping integration; residual load evidence tracked separately | Phase 1   |
| G2  | **PostgresStateStoreAdapter** completo                            | `state-store` / `adapter-postgres` | âœ… Cerrado â€” `listEvents(options)` con `afterSeq`/`limit` âœ… Â· `listRuns` con filtro `status` âœ…                               | Phase 1   |
| G3  | **IStartRunIntentStore Postgres** + scheduler de reconciliaciÃ³n  | `engine`                           | âœ… Cerrado â€” store Postgres + reconciler worker + wiring runtime                                                                  | Phase 1   |
| G4  | **compiledCodeRef ownership** â€” decisiÃ³n de arquitectura       | planner / traceability             | âœ… Cerrado â€” ADR-0032 implementado extremo a extremo                                                                              | Phase 1   |
| G5  | **Outbox Worker** (polling independiente, shards)                 | infra + engine                     | ðŸŸ¡ Parcial â€” worker core y storage APIs existen; falta runtime standalone y shards                                               | Phase 1.5 |
| G6  | **OL translation tests CI** + `_schemaURL` spec pin               | traceability-service               | ðŸŸ¡ Parcial â€” mapper/resolver/tests existen; falta pin de spec y hardening de CI                                                  | Phase 1.5 |
| G7  | **Read Models** + proyector standalone                            | state-store / infra                | ðŸŸ¡ Parcial â€” `SnapshotProjector` in-process existe; faltan servicio/read models                                                  | Phase 1.5 |
| G8  | **Auth real** en `apps/api`                                       | api                                | âŒ Pendiente                                                                                                                         | Phase 1.5 |
| G9  | **StepTypeRegistry** + tipado `stepTypeConfig`                    | planner / engine                   | âŒ Pendiente                                                                                                                         | Phase 2   |
| G10 | **outbox_lineage Worker** + fail-open DLQ                         | traceability-service               | âŒ Pendiente                                                                                                                         | Phase 2   |

---

## Referencias

- [ADR Index](../adr/ADR-Index.md)
- [ADR-0030 â€” Pre-Dispatch Intent Log](../adr/ADR-0030-pre-dispatch-intent-log.md)
- [ADR-0020/ADR-0021 â€” OpenLineage](../adr/)
- [engine-phases.md (roadmap)](engine/roadmap/engine-phases.md)
- [metrics-catalog.md](engine/metrics-catalog.md)
- [Historical DVT Blueprint v0.6](vision/DVT_Docs_Pack_v0.6/docs/DVT_Blueprint_v0.6_MASTER.md)
