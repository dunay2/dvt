# ADR-0018 — Shared Kernel Ownership Governance (`@dvt/contracts`)

- **Status**: Accepted
- **Date**: 2026-02-25
- **Owners**: Engine Domain / Contracts Governance
- **Related**:
  - ADR-0003 (Execution Model Sovereignty)
  - ADR-0005 (Contract Formalization Tooling)
  - ADR-0013 (bootstrapRunTx)
  - ADR-0015 (Read model separation)
  - ADR-0016 (logicalAttemptId ownership)

---

## Context

Durante Hito 0 aparecieron fricciones de ownership entre tipos serializables compartidos y puertos de comportamiento:

- Tipos de snapshot/eventos usados por múltiples paquetes viviendo en engine.
- Riesgo de dependencia circular al implementar adapters externos.
- Duplicación de contratos y drift entre paquetes.

Se necesita una regla de gobernanza explícita para evitar regresiones de estructura tras las migraciones B1/B2/B3.

---

## Decision

### 1) Shared kernel de tipos serializables

`@dvt/contracts` es el **único owner** de tipos serializables cross-package.

Incluye, entre otros:

- IDs y primitivas compartidas (`TenantId`, `RunId`, etc.).
- payloads/refs de frontera (`PlanRef`, `RunContext`, `SignalRequest`).
- eventos persistidos y DTOs de lectura cross-package.
- esquemas y parsers de frontera (`zod` + `z.infer`).

**Aclaración sobre snapshots**:

- Snapshot **interno** del engine (optimización de read model o estado operativo interno) NO pertenece automáticamente al shared kernel.
- Solo snapshots que sean DTOs estables de intercambio cross-package entran en `@dvt/contracts`.

### 2) Puertos de comportamiento en el paquete dueño de dominio

Los puertos que expresan comportamiento de dominio **no** se mueven al shared kernel:

- `IRunStateStore` (puerto engine) pertenece a `@dvt/engine/src/ports`.
- `IWorkflowEngine` (puerto engine) pertenece a `@dvt/engine/src/ports` (target de consolidación).

**Convención unificada en engine**:

- `@dvt/engine/src/ports` → puertos de comportamiento externos del dominio.
- `@dvt/engine/src/core` → implementación del dominio.
- `@dvt/engine/src/contracts` → ubicación legacy/transitoria; no debe crecer para puertos nuevos.

### 2-a) Contratos de Plan (decisión explícita Hito 0)

`ExecutionPlan` y tipos asociados quedan en **ubicación temporal** de shared contracts durante Hito 0.

- **Decisión Hito 0: Opción A** → `@dvt/contracts` (temporal).
- **Razón**: el paquete planner no está operativo como owner implementado en esta iteración.
- **Condición de salida**: al existir owner estable en planner, mover a `@dvt/planner/src/contracts` con la regla de migración segura (§3).
- **Seguimiento**: registrar ADR de transición (`ADR-0019`) para el traslado planner-owned cuando aplique.

### 2-b) Puertos de adapter vs implementaciones

Los puertos que definen lo que el engine espera de adapters son **puertos de dominio engine**.

- Target de estructura: `@dvt/engine/src/ports` para interfaces de contrato de adapter (`IProviderAdapter`, `IWorkflowEngineAdapter`, etc.).
- Implementaciones concretas viven en paquetes de adapter:
  - `@dvt/adapter-temporal/`
  - `@dvt/adapter-conductor/` (futuro)

**Regla**: el puerto pertenece al dominio (engine); la implementación pertenece al adapter.

**Nota transitoria Hito 0**: puede existir ubicación legacy de algunos puertos bajo `@dvt/engine/src/adapters`; no cambia ownership. La consolidación física hacia `src/ports` se ejecuta con la regla §3 para evitar churn innecesario en gate.

Regla: `@dvt/contracts` contiene shape serializable; el dominio define behavior.

### 3) Regla de migración segura (obligatoria)

Para cualquier movimiento de ownership:

0. Validar que no cambia la semántica del tipo (tests estructurales/snapshot de shape y compatibilidad).
1. Redirigir imports hacia el owner objetivo.
2. Validar build/tests de paquetes afectados.
3. Verificar referencias residuales (`refs=0`) en origen.
4. Recién entonces eliminar alias/legacy.

### 3-a) Dirección de dependencias (obligatoria)

- `@dvt/contracts` **MUST NOT** depender de `@dvt/engine` ni de `@dvt/planner`.
- `@dvt/engine` puede depender de `@dvt/contracts`.
- `@dvt/planner` puede depender de `@dvt/contracts`.

Objetivo: preservar dirección unidireccional y evitar dependencias circulares.

### 4) Excepciones y casos frontera

| Tipo                                            | Criterio                                   | Ubicación                          |
| ----------------------------------------------- | ------------------------------------------ | ---------------------------------- |
| `DvtError` y subtipos exportables               | Serializable + mínima jerarquía compartida | `@dvt/contracts/errors`            |
| Validadores de branded / invariantes de dominio | Lógica de dominio y políticas de negocio   | Dominio respectivo (p. ej. engine) |
| Enums/uniones puras                             | Solo valores serializables                 | `@dvt/contracts`                   |
| Tipos con métodos o comportamiento              | Semántica operativa, no shape puro         | Dominio owner correspondiente      |

Estas excepciones no invalidan la regla principal: serializable cross-package en shared kernel; comportamiento en dominio.

### 5) Versionado y compatibilidad del shared kernel

- `@dvt/contracts` se versiona de forma semántica independiente.
- Cambios breaking en tipos/schemas exportados requieren incremento **major**.
- `@dvt/engine` y `@dvt/planner` deben declarar rango compatible de `@dvt/contracts`.
- CI debe validar una matriz mínima de compatibilidad (en Hito 0 puede ser una validación inicial/manual, pero trazable).

---

## Consequences

### Positivas

- Menor acoplamiento entre engine y adapters externos.
- Menor riesgo de drift contractual.
- Fronteras más claras para validación runtime.

### Trade-offs

- Transitoriamente pueden existir aliases de compatibilidad.
- Requiere disciplina de import paths y gates por paquete.

---

## Scope notes for Hito 0

- La migración de `WorkflowSnapshot` se considera completada cuando el consumo se resuelve vía `@dvt/contracts` sin romper build de engine.
- Este ADR formaliza la decisión de estructura; no cambia semántica funcional del runtime.
