# ADR-0029 — Run Maintenance Service Extraction

- Status: Accepted
- Date: 2026-03-03
- Owners: Engine Domain

---

## Context

Operational maintenance responsibilities (`detectStuckRuns`, batch health/reconciliation checks) were mixed into execution-facing contracts.

This created boundary drift:

- `IWorkflowEngine` mixed interactive lifecycle operations with background batch concerns.
- Maintenance jobs have different SLOs, retry policies, and failure domains than `startRun/cancelRun/getRunStatus/signal`.
- Adapter equivalence (state-equivalent behavior) became harder to reason about when operational scans lived in lifecycle APIs.

---

## Decision

Create a dedicated maintenance boundary and move operational scans out of core lifecycle contracts.

1. Introduce `IRunMaintenanceService` as a dedicated port for operational/batch workflows.
2. Keep `IWorkflowEngine` focused on run lifecycle operations.
3. Implement maintenance logic in a dedicated service (`RunMaintenanceService`).
4. Allow future maintenance extensions (e.g., orphan intent reconciliation) through this service instead of inflating `IWorkflowEngine`.

---

## Consequences

### Positive

- Clearer contract boundaries between lifecycle API and operations.
- Easier testing and scheduling of maintenance jobs.
- Better alignment with adapter state-equivalence goals.
- Lower risk of accidental coupling between online request paths and background remediation tasks.

### Trade-offs

- Additional service and dependency wiring in composition roots.
- Operational jobs now require explicit orchestration/scheduling.

---

## Validation

- `IRunMaintenanceService` exists and is exported.
- `RunMaintenanceService` encapsulates maintenance logic.
- `IWorkflowEngine` no longer serves as dumping ground for operational batch concerns.
- Tests cover service behavior independently from lifecycle flow.

---

## Related

- [ADR-0019 — Adapter Equivalence and Maintenance Boundary](ADR-0019_Adapter_Equivalence_and_Maintenance_Boundary.md)
- [ADR-0030 — Pre-Dispatch Intent Log for startRun Crash Consistency](ADR-0030-pre-dispatch-intent-log.md)
