# Módulos canónicos mínimos del proyecto (domain-first)

> **Status**: Propuesto para adopción incremental
> **Propósito**: Definir el set canónico de módulos, separando dominio e infraestructura para mantener límites estrictos.

---

## 1) Core domains (deben existir)

### `@dvt/planner`

- **Rol**: determinismo puro.
- **Exporta**: `ExecutionPlan`, `PlannerInputEnvelope`, `PlannerPolicies`, hashing/canonicalización de `planId`.
- **Restricciones**: sin I/O, sin dependencias runtime.

### `@dvt/engine`

- **Rol**: soberanía de semántica de ejecución.
- **Exporta**: contratos de ciclo de vida, contratos de comandos, tipos de evento (schemas + TS generado).
- **Restricciones**: sin imports directos a Postgres/Kafka/Temporal.

### `@dvt/run-state-store`

- **Rol**: contratos de persistencia source-of-truth.
- **Exporta**: `appendEventsTx`, `bootstrapRunTx`, interfaces de lectura para reconciliación/backfill, reglas de `seq`.
- **Restricciones**: contratos + invariantes; sin implementación vendor.

### `@dvt/projector`

- **Rol**: framework de proyección CQRS + manejo de gaps.
- **Exporta**: interfaces de projector, contratos de checkpointing, hooks de reconciliación, helpers de dual-read.
- **Restricciones**: sin semántica de dominio; solo mecánica de proyección.

### `@dvt/contracts-core` (opcional, útil si se mantiene mínimo)

- **Rol**: primitivas agnósticas de dominio.
- **Exporta**: `OpaqueId`, `Result<T>`, `UtcTimestamp`, `Hash256`, utilidades de schema sin semántica de negocio.
- **Advertencia**: mantenerlo pequeño para evitar anti-patrón “mega contracts”.

---

## 2) Platform domains (recomendado)

### `@dvt/artifact-store`

- **Rol**: artefactos inmutables (plan bundles, manifests, SQL compilado, run reports).
- **Exporta**: `putArtifact`, `getArtifact`, política de content-addressing, metadatos de retención.

### `@dvt/traceability-service`

- **Rol**: escaneo ADR/headers de trazabilidad → manifest + publicación en grafo.
- **Exporta**: scanner, validator, manifest builder y contratos de publicación.

### `@dvt/observability`

- **Rol**: convenciones OTel + propagación de correlación.
- **Exporta**: helpers de trace context, nombres de métricas, schema de logging (solo técnico).

### `@dvt/identity-access`

- **Rol**: contratos RBAC + frontera de tenancy (default-deny).
- **Exporta**: `TenantId`, `Principal`, `Permission`, contratos de evaluación de políticas.

### `@dvt/plugin-runtime` (si visión marketplace sigue activa)

- **Rol**: sandbox + declaraciones de capacidades + ABI/versionado.
- **Exporta**: schema de manifest de plugin, contratos de capacidades, interfaces de carga.

---

## 3) Adapters (implementaciones reemplazables)

### Storage / State

- `@dvt/run-state-store-adapter-postgres` (o `-rds`)
- `@dvt/outbox-publisher-adapter-kafka` (puede unificarse con eventbus)

### Event bus

- `@dvt/eventbus-adapter-kafka` (NATS futuro)

### Workflow engines

- `@dvt/engine-adapter-temporal`
- `@dvt/engine-adapter-conductor`

### Artifacts

- `@dvt/artifact-store-adapter-s3` (o compatible MinIO)

---

## 4) Devkits (solo técnico, sin dominio)

- `@dvt/devkit-cli` (helpers CLI compartidos)
- `@dvt/devkit-schemas` (AJV compile/validate, bundling)
- `@dvt/devkit-testing` (harness testcontainers + fixtures)
- `@dvt/devkit-telemetry` (wiring OTel)

**Regla dura**: un devkit NO exporta conceptos de dominio (`RunStatus`, `StepStatus`, etc.).

---

## 5) Apps (capa de entrega)

- `apps/ui` (control plane)
- `apps/api` (gateway/API)
- `apps/worker-outbox` (publisher)
- `apps/worker-projector-*` (por read model o bounded context)

---

## 6) Qué NO añadir al inicio (evitar sprawl)

- Un `@dvt/contracts` global con todo mezclado.
- Un dominio `scheduler` separado sin semántica real diferenciada.
- Un módulo de grafo dedicado hasta justificarlo por trazabilidad/proyecciones.

---

## 7) Minimal runnable slice

Set mínimo recomendado para validar arquitectura:

1. `@dvt/planner`
2. `@dvt/engine`
3. `@dvt/run-state-store` + `@dvt/run-state-store-adapter-postgres`
4. `@dvt/projector` + un worker de proyección
5. `@dvt/traceability-service` (si gobernanza es no-negociable)
6. `apps/api`, `apps/worker-outbox`, `apps/worker-projector`

---

## 8) Mapeo con módulos actuales del repo (snapshot)

Estado basado en estructura actual visible en `packages/@dvt/*` y `apps/*`.

| Módulo canónico             | Estado actual                                | Evidencia                            |
| --------------------------- | -------------------------------------------- | ------------------------------------ |
| `@dvt/planner`              | ✅ Existe                                    | `packages/@dvt/planner`              |
| `@dvt/engine`               | ✅ Existe                                    | `packages/@dvt/engine`               |
| `@dvt/run-state-store`      | 🟡 Parcial (nomenclatura `@dvt/state-store`) | `packages/@dvt/state-store`          |
| `@dvt/projector`            | ❌ No explícito como paquete dedicado        | N/A                                  |
| `@dvt/contracts-core`       | 🟡 Parcial (contratos distribuidos)          | `packages/@dvt/contracts`            |
| `@dvt/traceability-service` | ✅ Existe                                    | `packages/@dvt/traceability-service` |
| `@dvt/artifact-store`       | ❌ No identificado como módulo dedicado      | N/A                                  |
| `@dvt/observability`        | ❌ No identificado como módulo dedicado      | N/A                                  |
| `@dvt/identity-access`      | ❌ No identificado como módulo dedicado      | N/A                                  |
| `@dvt/plugin-runtime`       | ❌ No identificado como módulo dedicado      | N/A                                  |
| Adapter Temporal            | ✅ Existe                                    | `packages/@dvt/adapter-temporal`     |
| Adapter Postgres            | ✅ Existe                                    | `packages/@dvt/adapter-postgres`     |
| `apps/api`                  | ✅ Existe                                    | `apps/api`                           |
| `apps/ui`                   | ❌ No identificado como app activa en raíz   | N/A                                  |

---

## 9) Plan de adopción incremental sugerido

1. **Normalizar nombres canónicos** (`state-store` → `run-state-store`, solo si no rompe contrato público).
2. **Crear `@dvt/projector`** como paquete separado con contratos de gap/checkpoint.
3. **Separar platform modules** de mayor impacto (`artifact-store`, `observability`, `identity-access`).
4. **Mantener adapters desacoplados** del core con reglas de import y lint boundaries.
5. **Revisar en ADR** cada partición nueva para evitar sobre-modularización prematura.

---

## 10) Referencias

- Hexagonal Architecture: <https://alistair.cockburn.us/hexagonal-architecture/>
- Event Sourcing: <https://martinfowler.com/eaaDev/EventSourcing.html>
- Transactional Outbox: <https://microservices.io/patterns/data/transactional-outbox.html>
- ADR practice: <https://adr.github.io/>
