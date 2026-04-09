---
title: observability Constraints & Invariants
status: Draft
owner: Shared Boundary Domain
last_reviewed: 2026-03-28
---

# observability Constraints & Invariants

## Constraints and Invariants

| Constraint / Invariant                                            | Where Enforced                  | Description                                                                                                                  |
| ----------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Must comply with observability standards and contract governance  | ObservabilityAggregate          | All metrics and log operations must conform to the observability standards defined in the Shared Boundary Domain governance. |
| Only interacts with Shared Boundary domain, contracts, and engine | ObservabilityAggregate boundary | ObservabilityAggregate must not reach into delivery, planning, or infra domains directly.                                    |
| Metrics must include a timestamp and source label                 | MetricsAggregate                | Every stored metric must carry a valid timestamp and an identifying source label; unlabelled metrics are rejected.           |
| Log entries must be structured (key-value pairs)                  | LogAggregate                    | Free-form unstructured log strings are not accepted; all entries must be structured log records.                             |
| Observability must not block the engine's critical path           | ObservabilityAggregate          | Observability collection is asynchronous and must not introduce latency on workflow execution in `@dvt/engine`.              |

## Validation Examples

- Storing a metric without a timestamp raises a `MetricValidationError` in MetricsAggregate.
- Submitting an unstructured string to `LogAggregate.storeLog` raises a `LogFormatError`.
- An observability call that blocks the engine's main execution loop violates the non-blocking constraint and must be reworked to use an async buffer or queue.
- Reporting observability status when no metrics or logs have been collected must return an empty-state summary rather than throwing an error.

## Key Files

- `packages/@dvt/observability/src/` — Observability aggregate implementations and validation logic
