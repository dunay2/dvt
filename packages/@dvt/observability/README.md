# @dvt/observability

Contract-first observability chassis for DVT runtimes.

## What it provides

- `IObservability` port (`metrics`, `traces`, `logs`)
- Correlation context contract (`ObservabilityContext`)
- Metric cardinality policy and validation helpers

This package contains no vendor SDK dependency and is intended to be stable across adapters.
