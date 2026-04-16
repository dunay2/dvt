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
    - `RC-G1-B1`: docs/contracts-first inventory freeze + residual-import baseline
    - `RC-G1-B2`: owner-package move inside `@dvt/engine`
    - `RC-G1-B3`: downstream imports cutover in adapters + state-store
    - `RC-G1-B4`: guards, ARC-2, and closeout validation
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

### Fase 0 - Preparacion y baseline de move-and-cut

- Inventariar imports actuales y fijar el owner package destino antes del corte.
- Asegurar tests de equivalencia estructural y validacion por paquetes tocados.
- Prohibir dual exports owner+shared en el slice de engine ownership.

### Fase 1 - Engine ownership

- Mover `IProviderAdapter`, `IRunStateStore`, `IStartRunIntentStore`,
  `IRunSnapshotStalenessQuery`, `IProjector`, `StartRunIntentPolicy` a `@dvt/engine`.
- Tratar esa lista como el scope minimo obligatorio de `RC-G1-B`; cualquier puerto adicional solo
  entra en la slice si el inventario de imports residuales demuestra que tambien es un behavioral
  port engine-owned bajo la regla de ADR-0018 §2/§2-b.
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

### Fase 4 - Endurecimiento y cierre del corte

- Restringir imports con `no-restricted-imports` y/o arch tests.
- Ajustar `exports` por paquete para exponer solo superficies aprobadas.
- Cerrar el source package con referencias residuales = 0 en el mismo slice; no dejar re-exports
  transicionales en `@dvt/contracts`.
- Confirmar que `@dvt/contracts` queda limitado a DTOs serializables cross-package, esquemas y
  parsers de frontera, y refs/event shapes realmente shared.

## Sub-slices ejecutables de `RC-G1-B`

### `RC-G1-B1` - Docs/contracts-first inventory freeze

- touched scope:
  - `docs/planning/proposals/mandatory/runtime-and-contracts`
  - `docs/planning/state`
  - `docs/contracts`
  - `docs/architecture/components/engine/contracts`
- objective:
  - congelar el inventario exacto de puertos engine-owned que salen de `@dvt/contracts`
  - fijar path origen -> owner path destino
  - medir el baseline de imports residuales que la slice debe llevar a cero
- definition of done:
  - la lista minima obligatoria de `RC-G1-B` queda cerrada sin ambiguedad
  - cualquier puerto adicional solo entra con evidencia de inventario residual y regla ADR-0018
  - los docs/contratos activos describen el corte antes de tocar codigo
- validation baseline:
  - `pnpm docs:workboard:generate`
  - `pnpm verify:prepush`

#### Frozen mandatory scope manifest

- `IProviderAdapter`
  - source path: `packages/@dvt/contracts/src/adapters/IProviderAdapter.v1.ts`
  - owner path target: `packages/@dvt/engine/src/adapters/IProviderAdapter.ts`
  - residual-import baseline: `31` TypeScript files still import the symbol from `@dvt/contracts`
  - package split:
    - `@dvt/engine`: `22`
    - `@dvt/adapter-temporal`: `2`
    - `apps/api` (`src` + `test`): `6`
    - `@dvt/contracts`: `1`
- `IRunStateStore`
  - source path: `packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts`
  - owner path target: `packages/@dvt/engine/src/ports/IRunStateStore.ts`
  - residual-import baseline: `24` TypeScript files
  - package split:
    - `@dvt/engine`: `14`
    - `@dvt/adapter-postgres`: `3`
    - `@dvt/adapter-temporal`: `1`
    - `apps/api` (`src` + `test`): `5`
    - `@dvt/contracts`: `1`
- `IStartRunIntentStore`
  - source path: `packages/@dvt/contracts/src/contracts/engine/IStartRunIntentStore.v1.ts`
  - owner path target: `packages/@dvt/engine/src/ports/IStartRunIntentStore.ts`
  - residual-import baseline: `11` TypeScript files
  - package split:
    - `@dvt/engine`: `8`
    - `@dvt/adapter-postgres`: `1`
    - `@dvt/contracts`: `2`
- `IRunSnapshotStalenessQuery`
  - source path: `packages/@dvt/contracts/src/engine/IRunSnapshotStalenessQuery.v1.ts`
  - owner path target: `packages/@dvt/engine/src/ports/IRunSnapshotStalenessQuery.ts`
  - residual-import baseline: `5` TypeScript files
  - package split:
    - `@dvt/adapter-postgres`: `3`
    - `@dvt/engine`: `2`
- `IProjector`
  - source path: `packages/@dvt/contracts/src/contracts/engine/IProjector.v1.ts`
  - owner path target: `packages/@dvt/engine/src/ports/IProjector.ts`
  - residual-import baseline: `0` downstream TypeScript files
  - note: the owner-local path already exists; `RC-G1-B2/B4` still need to retire the shared source/export surface
- `StartRunIntentPolicy`
  - source path: `packages/@dvt/contracts/src/contracts/engine/StartRunIntentPolicy.v1.ts`
  - owner path target: `packages/@dvt/engine/src/domain/startRunIntentPolicy.ts`
  - residual-import baseline: `2` TypeScript files
  - package split:
    - `@dvt/engine`: `1`
    - `@dvt/contracts`: `1`

#### Residual-import baseline method

- scan scope:
  - `packages/**`
  - `apps/**`
- included files:
  - `*.ts`
- excluded files:
  - `dist/**`
  - `node_modules/**`
- counting rule:
  - a file is counted for a symbol when it imports from `@dvt/contracts` and references that
    symbol name
- purpose:
  - `RC-G1-B3` closes only when this baseline for the moved symbol set reaches `0` outside the
    permitted shared-kernel surfaces that remain after the cut

### `RC-G1-B2` - Owner-package move in `@dvt/engine`

- touched scope:
  - `packages/@dvt/engine`
  - `packages/@dvt/contracts`
  - docs contract surfaces touched by the move
- objective:
  - mover `IProviderAdapter`, `IRunStateStore`, `IStartRunIntentStore`,
    `IRunSnapshotStalenessQuery`, `IProjector`, `StartRunIntentPolicy`
    a `@dvt/engine`
  - cortar imports internos de `@dvt/engine` hacia los paths owner-local
- definition of done:
  - los puertos obligatorios viven fisicamente en `@dvt/engine`
  - `@dvt/engine` ya no importa esos puertos desde `@dvt/contracts`
  - no aparecen aliases duales owner+shared
- validation baseline:
  - package-level build/test para `@dvt/engine` y `@dvt/contracts`
  - `pnpm verify:prepush`

#### Current repo-state closure note

- mandatory owner-local targets already exist:
  - `packages/@dvt/engine/src/adapters/IProviderAdapter.ts`
  - `packages/@dvt/engine/src/ports/IRunStateStore.ts`
  - `packages/@dvt/engine/src/ports/IStartRunIntentStore.ts`
  - `packages/@dvt/engine/src/ports/IRunSnapshotStalenessQuery.ts`
  - `packages/@dvt/engine/src/ports/IProjector.ts`
  - `packages/@dvt/engine/src/domain/startRunIntentPolicy.ts`
- direct-import verification:
  - no TypeScript file under `packages/@dvt/engine/src/**` imports the moved port set from
    `@dvt/contracts`
- consequence:
  - `RC-G1-B2` is materially satisfied by current repo state; the remaining cleanup is not the
    owner-local move but the legacy shared-kernel publication surface closed in `RC-G1-B4`

### `RC-G1-B3` - Downstream imports cutover

- touched scope:
  - `packages/@dvt/adapter-postgres`
  - `packages/@dvt/adapter-temporal`
  - `packages/@dvt/state-store`
  - cualquier consumidor adicional gobernado que aparezca en el inventario residual
- objective:
  - cortar imports de adapters y state-store hacia los puertos owner-local
  - cerrar referencias residuales desde `@dvt/contracts` a cero para el set movido
- definition of done:
  - adapters, state-store y consumidores gobernados importan desde `@dvt/engine`
  - residual imports of the moved port set from `@dvt/contracts` = `0`
  - el shared kernel ya no actua como host fisico de esos behavioral ports
- validation baseline:
  - package-level build/test para los paquetes tocados
  - `pnpm verify:prepush`

#### Current repo-state closure note

- direct-import verification:
  - no TypeScript file under
    `packages/@dvt/adapter-postgres/src/**`,
    `packages/@dvt/adapter-temporal/src/**`,
    `packages/@dvt/state-store/src/**`,
    or `apps/api/src/**`
    imports the moved engine-owned port set from `@dvt/contracts`
- consequence:
  - governed downstream consumers are already cut over to `@dvt/engine`
  - the remaining work is hardening and removal of the legacy shared-kernel publication path in
    `RC-G1-B4`

### `RC-G1-B4` - Hardening and closeout

- touched scope:
  - export maps / barrels de `@dvt/engine` y `@dvt/contracts`
  - docs/contracts/planning surfaces touched by the cutover
  - ARC-2 evidence + risk updates
- objective:
  - impedir regresion de imports
  - cerrar exports legacy de los puertos movidos y de los engine-owned behavioral ports
    equivalentes detectados durante el cierre
  - publicar evidence/risk del corte atomico
- definition of done:
  - no legacy exports remain for the moved ports ni para los engine-owned behavioral ports
    equivalentes que seguian publicados desde `@dvt/contracts`
  - import guards or equivalent enforcement prevent regression
  - ARC-2 evidence and risk update are committed
  - docs/contracts/planning remain in sync
  - `pnpm verify:prepush` closes green
- validation baseline:
  - `GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs`
  - `pnpm docs:sync` when docs structure changes
  - `pnpm verify:prepush`

#### Current repo-state closure note

- root publication cleanup:
  - `packages/@dvt/contracts/src/index.ts` no longer re-exports
    `IPlanFetcher` or `IPlanIntegrityValidator`
  - `packages/@dvt/contracts/src/contracts/engine/ExecutionSemantics.v1.ts`
    no longer re-exports `IClock`, `IIdempotencyKeyBuilder`, `IPlanFetcher`, or
    `IPlanIntegrityValidator`
- residual-import closure:
  - the last direct TypeScript consumer of an equivalent engine-owned behavioral
    port from `@dvt/contracts`
    (`packages/@dvt/adapter-temporal/test/integration.time-skipping.shared.ts`
    importing `RunStateCommandPort`) is now cut over to `@dvt/engine`
  - verification scan result: no TypeScript file under `packages/**` or `apps/**`
    imports `IPlanFetcher`, `IPlanIntegrityValidator`, `IIdempotencyKeyBuilder`,
    `IClock`, or `RunStateCommandPort` from `@dvt/contracts`
- regression guard:
  - `eslint.config.cjs` now blocks imports of the moved engine-owned ports and the
    equivalent behavioral ports from `@dvt/contracts` in `@dvt/engine`,
    `@dvt/adapter-postgres`, `@dvt/adapter-temporal`, `@dvt/state-store`, and
    `apps/api`
- consequence:
  - `RC-G1-B4` is closed
  - `RC-G1-B` is closed
  - the remaining `RC-G1` execution is `RC-G1-C` and `RC-G1-D`

## Tracker operativo de ejecucion

Este documento actua como tracker dedicado para el trabajo bajo ADR-0034.

- `RC-G1-A`
  - owner: Architecture + Contracts + Docs
  - target date: `2026-04-02`
  - touched packages: `docs/planning/proposals`, `docs/planning/reviews`, `docs/planning/state`, `docs/contracts`
  - validation baseline: `pnpm docs:sync`, `pnpm docs:workboard:generate`, `pnpm verify:prepush`
  - rollback note: N/A - doc and tracker freeze only
- `RC-G1-B`
  - owner: Engine + Contracts
  - target date: `2026-04-03`
  - touched packages: `@dvt/engine`, `@dvt/contracts`, `@dvt/adapter-postgres`, `@dvt/adapter-temporal`, `@dvt/state-store`
  - validation baseline: ARC-2 evidence + touched-package tests + `pnpm verify:prepush`
  - rollback note: revertir la slice completa si el cutover no cierra limpio
  - execution order: `RC-G1-B1 -> RC-G1-B2 -> RC-G1-B3 -> RC-G1-B4`
- `RC-G1-C`
  - owner: Delivery + Traceability + Artifacts + Contracts
  - target date: `2026-04-10`
  - touched packages: `@dvt/delivery`, `@dvt/traceability-service`, `@dvt/artifacts`, `@dvt/contracts`, `apps/outbox-worker`, `apps/lineage-worker`
  - validation baseline: ARC-2 evidence + touched-package tests + `pnpm verify:prepush`
  - rollback note: revertir uso a alias shared temporalmente
- `RC-G1-D`
  - owner: Planner + Contracts + API + Adapter-postgres
  - target date: `2026-04-24`
  - touched packages: `@dvt/planner`, `@dvt/contracts`, `apps/api`, `@dvt/adapter-postgres`, docs governance
  - validation baseline: ARC-2 evidence + touched-package tests + `pnpm verify:prepush`
  - rollback note: conservar dual export hasta cierre total

## Riesgos y mitigaciones

- Ruptura de imports transversales
  - severidad: Alta
  - mitigacion: inventario previo, cutover atomico, y cierre con residual imports = 0
- Drift de ownership entre docs y codigo
  - severidad: Media
  - mitigacion: actualizar docs contracts por fase y forzar `docs:sync`
- Wrapper/satellite packages reintroducidos
  - severidad: Media
  - mitigacion: bloquear por ADR-0034 + revision de export maps
- Cambios semanticos accidentales al mover tipos
  - severidad: Alta
  - mitigacion: tests de equivalencia + validacion de comportamiento por paquete

## Criterio de cierre

1. Todos los puertos no-shared listados estan en su paquete owner.
2. `@dvt/contracts` conserva solo DTOs serializables cross-package, esquemas/parsers de frontera,
   y refs/event shapes realmente shared.
3. No hay imports residuales invalidos entre bounded contexts.
4. Validaciones por slice y `pnpm verify:prepush` pasan.
5. Documentacion de contratos y planning sync sin drift.

## Referencias

- `docs/adr/ADR-0018_Shared_Kernel_Ownership_Governance.md`
- `docs/adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md`
- `docs/adr/ADR-0035-planner-public-contract-evolution-protocol.md`
- `docs/contracts/index.md`
- `docs/planning/status/governance-document-rule-inventory.md`
