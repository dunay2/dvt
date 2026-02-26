# ADR-0019 — Adapter Equivalence and Maintenance Boundary

Status: Accepted  
Date: 2026-02-26

## Context

El review 2026-02-25 detecta ambigüedad en 3 puntos de contrato:

1. **Equivalencia de adapters**: se estaba leyendo como “Temporal y Conductor se comportan igual internamente”, lo cual no es cierto (replay, scheduling y ciclo de vida difieren).
2. **`logicalAttemptId`**: debe permanecer como autoridad del adapter/runtime (alineado con determinismo en Temporal).
3. **`detectStuckRuns`**: es mantenimiento operativo batch, no operación core del contrato `IWorkflowEngine`.

## Decision

1. **Adapter equivalence** se redefine como **state-equivalent**, no execution-equivalent:
   - Dado el mismo `ExecutionPlan` y mismos resultados de steps, el Store debe converger al mismo estado/catálogo de eventos canónicos.
   - No se exige equivalencia de traza interna del runtime (Temporal != Conductor).

2. **`logicalAttemptId` authority** permanece en adapters/runtime:
   - Se ratifica ADR-0016.
   - El engine no infiere `logicalAttemptId` por lecturas DB en tiempo de emisión.

3. **Mantenimiento operacional** sale del contrato core:
   - `detectStuckRuns` pasa a un puerto dedicado (`IRunMaintenanceService`) y no forma parte del API esencial de `IWorkflowEngine`.
   - `IWorkflowEngine` queda centrado en lifecycle de ejecución (start/cancel/status/signal).

## Consequences

- Se reduce sobrepromesa entre adapters y se clarifica el alcance real de portabilidad.
- Se evita mezclar responsabilidades de operación batch con contrato de ejecución.
- Se prepara un camino limpio para implementar maintenance jobs con políticas y límites independientes.

## Validation

- Contratos/documentación reflejan explícitamente “state-equivalent”.
- `IWorkflowEngine` deja de exponer mantenimiento batch en una revisión contractual posterior (target P0-13).
- Tests de conformance se enfocan en estado/eventos canónicos en Store, no en equivalencia de runtime interno.

## Related

- ADR-0003 (Execution model)
- ADR-0015 (status read-model separation)
- ADR-0016 (`logicalAttemptId` ownership)
- ADR-0018 (Shared Kernel ownership)
