---
title: Contracts Domain Ownership Migration Plan
status: Active
owner: Architecture / Contracts / Engine / Planner / Delivery / Artifacts / Traceability
last_reviewed: 2026-04-02
planning_type: proposal
---

# Contracts Domain Ownership Migration Plan

## Contexto

La base actual centraliza en `@dvt/contracts` contratos que son de dos tipos:

1. Tipos serializables cross-context (shared kernel real).
2. Puertos de comportamiento y politicas de dominio (no shared).

Segun ADR-0018 y ADR-0034, el punto 2 debe vivir en el paquete dueno del dominio.
Segun ADR-0035, los contratos publicos de planner (`ExecutionPlanV2`,
`PlannerInputEnvelopeV2`, `IExecutionPlanner`) se mantienen en `@dvt/contracts`.

## Objetivo

Separar ownership fisico y semantico de contratos para que:

1. `@dvt/contracts` retenga solo shared serializable contracts.
2. Los puertos no-shared se muevan a su bounded context dueno.
3. El grafo de dependencias refleje dominio real y no conveniencia historica.

## Tracker operativo activo

Este documento es la propuesta canonica activa para `RC-G1`.

- tracker operativo: `docs/planning/state/agent-lane-a.yaml`
- tarea paraguas: `RC-G1`
- slices activos:
  - `RC-G1-A`: freeze de ownership matrix
  - `RC-G1-B`: engine ports migration
  - `RC-G1-C`: delivery / traceability / artifacts migration
  - `RC-G1-D`: planner-private migration + final shared-kernel cleanup

No se debe abrir una segunda propuesta paralela para este mismo trabajo.

## Regla de clasificacion (por que se mueve y por que no)

Se mueve un contrato fuera de `@dvt/contracts` cuando:

1. Expresa comportamiento de dominio (puerto, policy o workflow contract).
2. Define operaciones y side effects (metodos), no solo shape serializable.
3. Su evolucion semantica depende del owner del bounded context.

No se mueve un contrato cuando:

1. Es shape serializable cross-context (DTO, ref, envelope, id, schema).
2. Es contrato de compatibilidad y validacion de frontera entre contextos.
3. ADR vigente fija su hogar canonico en shared (`@dvt/contracts`).

## Freeze de taxonomia por familia

| Familia                   | Disposicion     | Hogar canonico              | Regla de decision                                                           |
| ------------------------- | --------------- | --------------------------- | --------------------------------------------------------------------------- |
| `shared` serializable     | `stay shared`   | `@dvt/contracts`            | DTOs, refs, envelopes, ids, schemas y contratos publicos cross-context      |
| `engine` behavioral ports | `move to owner` | `@dvt/engine`               | puertos/policies cuyo significado semantico depende de engine               |
| `planner` private ports   | `move to owner` | `@dvt/planner`              | puertos/policies privados de planner que no son contratos publicos ADR-0035 |
| `delivery` ports          | `move to owner` | `@dvt/delivery`             | puertos operativos de outbox/delivery que no son shape shared               |
| `traceability` ports      | `move to owner` | `@dvt/traceability-service` | puertos de emision/publicacion de lineage                                   |
| `artifacts` ports         | `move to owner` | `@dvt/artifacts`            | puertos hexagonales de storage/reader/writer de artefactos                  |

La decision binaria permitida para cada contrato afectado por `RC-G1` es solo:

1. `stay shared`
2. `move to owner`

No se usan categorias intermedias, "semi-shared", ni wrappers permanentes de
conveniencia.

## Que

### Contratos no-shared a trasladar

| Contrato actual                                             | Owner actual (fisico) | Owner destino (dominio)     | Razon de mover (no-shared)                                                    |
| ----------------------------------------------------------- | --------------------- | --------------------------- | ----------------------------------------------------------------------------- |
| `src/adapters/IProviderAdapter.v1.ts`                       | `@dvt/contracts`      | `@dvt/engine`               | Puerto de comportamiento del dominio de ejecucion; no es DTO compartido       |
| `src/engine/IRunStateStore.v1.ts` (puerto)                  | `@dvt/contracts`      | `@dvt/engine`               | Puerto write/read/maintenance del agregado Run; ownership semantico de engine |
| `src/engine/IRunSnapshotStalenessQuery.v1.ts`               | `@dvt/contracts`      | `@dvt/engine`               | Query port operativo de engine, no contrato serializable cross-context        |
| `src/contracts/engine/IStartRunIntentStore.v1.ts`           | `@dvt/contracts`      | `@dvt/engine`               | Puerto de crash-consistency/startRun intent lifecycle (ADR-0030)              |
| `src/contracts/engine/StartRunIntentPolicy.v1.ts`           | `@dvt/contracts`      | `@dvt/engine`               | Policy de transicion de estado de intent; comportamiento de dominio           |
| `src/contracts/engine/IProjector.v1.ts`                     | `@dvt/contracts`      | `@dvt/engine`               | Puerto de proyeccion ligado al modelo de ejecucion                            |
| `src/contracts/engine/IOutboxStorage.v1.ts` (interfaces)    | `@dvt/contracts`      | `@dvt/delivery`             | Puerto operativo de delivery/outbox worker; no shape compartido puro          |
| `src/contracts/lineage/ILineageSink.v1.ts` (interfaces)     | `@dvt/contracts`      | `@dvt/traceability-service` | Puerto de publicacion lineage del bounded context de traceabilidad            |
| `src/ports/artifact-store.ts`                               | `@dvt/contracts`      | `@dvt/artifacts`            | Puerto hexagonal de almacenamiento de artefactos; ownership de artifacts      |
| `src/contracts/planner/PlanExecutabilityValidation.v1.ts`   | `@dvt/contracts`      | `@dvt/planner`              | Puerto de validacion de ejecutabilidad del flujo planner->engine              |
| `src/contracts/planner/ExecutionBindingVerification.v1.ts`  | `@dvt/contracts`      | `@dvt/planner`              | Puerto/policy de verificacion de binding de plan en lifecycle de planner      |
| `src/contracts/planner/PlanValidationLifecycle.v1.ts`       | `@dvt/contracts`      | `@dvt/planner`              | Puerto de lifecycle store para estados de validacion de plan                  |
| `src/contracts/planner/CustomPolicyNamespaceRegistry.v1.ts` | `@dvt/contracts`      | `@dvt/planner`              | Puerto de registro y gobernanza de custom policy namespace                    |

### Contratos que NO se mueven

| Contrato                 | Motivo de NO mover                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------ |
| `ExecutionPlanV2`        | Contrato publico cross-context; ADR-0035 define `@dvt/contracts` como hogar canonico |
| `PlannerInputEnvelopeV2` | Contrato publico de borde planner; ADR-0035 fija shared kernel como home             |
| `IExecutionPlanner`      | Contrato publico de integracion; ADR-0035 fija shared kernel como home               |

## Donde

### Origen y destino de paths

| Dominio             | Paths origen                                                                                                                                                           | Paths destino                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Engine              | `packages/@dvt/contracts/src/{adapters,engine,contracts/engine}/*`                                                                                                     | `packages/@dvt/engine/src/{adapters,ports,domain}/*` |
| Planner (no-public) | `packages/@dvt/contracts/src/contracts/planner/{PlanExecutabilityValidation,ExecutionBindingVerification,PlanValidationLifecycle,CustomPolicyNamespaceRegistry}.v1.ts` | `packages/@dvt/planner/src/contracts/*`              |
| Delivery            | `packages/@dvt/contracts/src/contracts/engine/IOutboxStorage.v1.ts`                                                                                                    | `packages/@dvt/delivery/src/contracts/*`             |
| Traceability        | `packages/@dvt/contracts/src/contracts/lineage/ILineageSink.v1.ts`                                                                                                     | `packages/@dvt/traceability-service/src/contracts/*` |
| Artifacts           | `packages/@dvt/contracts/src/ports/artifact-store.ts`                                                                                                                  | `packages/@dvt/artifacts/src/ports/*`                |

## Impacto

### Impacto tecnico (uso actual en repositorio)

Conteo de archivos que referencian cada contrato principal:

| Contrato                                                 | Archivos consumidores |
| -------------------------------------------------------- | --------------------- |
| `IRunStateStore`                                         | 44                    |
| `IProviderAdapter`                                       | 38                    |
| `IOutboxStorage`                                         | 19                    |
| `IStartRunIntentStore`                                   | 14                    |
| `IRunSnapshotStalenessQuery`                             | 10                    |
| `IEventBus`                                              | 9                     |
| `IPlanExecutabilityValidator`                            | 6                     |
| `ILineageSink`                                           | 5                     |
| `ILineageOutboxStore`                                    | 5                     |
| `IStepTypeRegistry`                                      | 5                     |
| `IPlanValidationLifecycleStore`                          | 4                     |
| `IProjector`                                             | 2                     |
| `IExecutionBindingVerifier`                              | 2                     |
| `ICustomPolicyNamespaceRegistry`                         | 2                     |
| `IArtifactStore` / `IArtifactReader` / `IArtifactWriter` | 1 c/u                 |

### Impacto por sistema

| Sistema                                             | Impacto esperado                                              |
| --------------------------------------------------- | ------------------------------------------------------------- |
| `@dvt/engine`                                       | Alto: principal receptor de puertos de comportamiento         |
| `@dvt/adapter-postgres`                             | Alto: implementa puertos engine/delivery/planner lifecycle    |
| `@dvt/adapter-temporal`                             | Medio-alto: implementa `IProviderAdapter` y mappers de policy |
| `apps/api`                                          | Medio: wiring y casos de uso de plan validation               |
| `@dvt/delivery` + `apps/outbox-worker`              | Medio: consolidacion de outbox contracts                      |
| `@dvt/traceability-service` + `apps/lineage-worker` | Medio: ownership de lineage sink/outbox contracts             |
| `@dvt/artifacts`                                    | Medio: ownership de artifact store ports                      |

## Como

### Fase 0 - Preparacion y alias de compatibilidad

- Crear contratos en paquete owner sin borrar aun export en `@dvt/contracts`.
- Publicar alias de transicion owner -> shared o shared -> owner segun corte elegido.
- Anadir tests de equivalencia de tipos/export surface.

### Fase 1 - Engine ownership

- Mover `IProviderAdapter`, `IRunStateStore`, `IStartRunIntentStore`,
  `IRunSnapshotStalenessQuery`, `IProjector`, `StartRunIntentPolicy` a `@dvt/engine`.
- Migrar imports internos de `engine` para consumir `src/ports` y `src/adapters`.
- Migrar implementaciones en `adapter-postgres`, `adapter-temporal`, `state-store`.

### Fase 2 - Delivery / Traceability / Artifacts ownership

- Mover puertos outbox a `@dvt/delivery`.
- Mover puertos lineage a `@dvt/traceability-service`.
- Mover `artifact-store` port a `@dvt/artifacts`.
- Mantener DTOs serializables (`EventEnvelope`, `OutboxRecord`, refs) en shared kernel.

### Fase 3 - Planner no-shared ownership

- Mover `IPlanExecutabilityValidator`, `IExecutionBindingVerifier`,
  `IPlanValidationLifecycleStore`, `ICustomPolicyNamespaceRegistry` a `@dvt/planner`.
- Mantener en `@dvt/contracts` los 3 contratos publicos fijados por ADR-0035.

### Fase 4 - Endurecimiento y corte final

- Restringir imports con `no-restricted-imports` y/o arch tests.
- Ajustar `exports` por paquete para exponer solo superficies aprobadas.
- Eliminar re-exports transicionales en `@dvt/contracts` cuando referencias residuales sean cero.

## Tracker operativo de ejecucion

Este documento actua como tracker dedicado para el trabajo bajo ADR-0034.

| Slice     | Owner                                           | Target date | Touched packages                                                                                                              | Validation baseline                                                     | Rollback note                                       |
| --------- | ----------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------- |
| `RC-G1-A` | Architecture + Contracts + Docs                 | 2026-04-02  | `docs/planning/proposals`, `docs/planning/reviews`, `docs/planning/state`, `docs/contracts`                                   | `pnpm docs:sync`, `pnpm docs:workboard:generate`, `pnpm verify:prepush` | N/A - doc and tracker freeze only                   |
| `RC-G1-B` | Engine + Contracts                              | 2026-04-03  | `@dvt/engine`, `@dvt/contracts`, `@dvt/adapter-postgres`, `@dvt/adapter-temporal`, `@dvt/state-store`                         | ARC-2 evidence + touched-package tests + `pnpm verify:prepush`          | mantener alias de compat hasta residual imports = 0 |
| `RC-G1-C` | Delivery + Traceability + Artifacts + Contracts | 2026-04-10  | `@dvt/delivery`, `@dvt/traceability-service`, `@dvt/artifacts`, `@dvt/contracts`, `apps/outbox-worker`, `apps/lineage-worker` | ARC-2 evidence + touched-package tests + `pnpm verify:prepush`          | revertir uso a alias shared temporalmente           |
| `RC-G1-D` | Planner + Contracts + API + Adapter-postgres    | 2026-04-24  | `@dvt/planner`, `@dvt/contracts`, `apps/api`, `@dvt/adapter-postgres`, docs governance                                        | ARC-2 evidence + touched-package tests + `pnpm verify:prepush`          | conservar dual export hasta cierre total            |

## Riesgos y mitigaciones

| Riesgo                                         | Severidad | Mitigacion                                                       |
| ---------------------------------------------- | --------- | ---------------------------------------------------------------- |
| Ruptura de imports transversales               | Alta      | fases con alias temporales y corte por residual imports          |
| Drift de ownership entre docs y codigo         | Media     | actualizar docs contracts por fase y forzar `docs:sync`          |
| Wrapper/satellite packages reintroducidos      | Media     | bloquear por ADR-0034 + revision de export maps                  |
| Cambios semanticos accidentales al mover tipos | Alta      | tests de equivalencia + validacion de comportamiento por paquete |

## Criterio de cierre

1. Todos los puertos no-shared listados estan en su paquete owner.
2. `@dvt/contracts` conserva solo shared serializable contracts y validadores de frontera.
3. No hay imports residuales invalidos entre bounded contexts.
4. Validaciones por slice y `pnpm verify:prepush` pasan.
5. Documentacion de contratos y planning sync sin drift.

## Referencias

- `docs/adr/ADR-0018_Shared_Kernel_Ownership_Governance.md`
- `docs/adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md`
- `docs/adr/ADR-0035-planner-public-contract-evolution-protocol.md`
- `docs/contracts/index.md`
- `docs/planning/status/governance-document-rule-inventory.md`
