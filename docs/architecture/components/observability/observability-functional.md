---
title: observability Functionalities
status: Draft
owner: Shared Boundary Domain
last_reviewed: 2026-03-28
---

# observability Functionalities

## Functionalities

| #   | Functionality                  | Description                                                                                                        |
| --- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| 1   | Metrics Collection             | Ingests and stores system metrics emitted by the engine, contracts, and other DVT components.                      |
| 2   | Log Collection                 | Ingests and stores structured log entries produced during workflow execution and validation.                       |
| 3   | Observability Status Reporting | Aggregates metrics and log health data and reports the overall observability status to the Shared Boundary Domain. |
| 4   | Contract Validation Support    | Provides observability hooks used by `@dvt/contracts` during contract validation to record validation outcomes.    |
| 5   | Workflow Monitoring            | Provides monitoring hooks used by `@dvt/engine` to track workflow execution progress and detect anomalies.         |

## Main Methods

- `ObservabilityAggregate.collectMetrics()`: Triggers ingestion of all pending metrics from registered sources.
- `ObservabilityAggregate.collectLogs()`: Triggers ingestion of all pending log entries from registered sources.
- `ObservabilityAggregate.reportObservabilityStatus()`: Computes and returns the current monitoring health summary.
- `MetricsAggregate.storeMetric(metric)`: Persists a single metric data point with its timestamp and labels.
- `MetricsAggregate.manageMetricsOperations()`: Handles aggregation, retention, and pruning of stored metrics.
- `MetricsAggregate.reportMetricsStatus()`: Returns current metrics storage and ingestion status.
- `LogAggregate.storeLog(entry)`: Persists a structured log entry.
- `LogAggregate.manageLogOperations()`: Handles log rotation, indexing, and retention policies.
- `LogAggregate.reportLogStatus()`: Returns current log storage and ingestion status.

## Key Files

- `packages/@dvt/observability/src/` — Observability, metrics, and log aggregate implementations
