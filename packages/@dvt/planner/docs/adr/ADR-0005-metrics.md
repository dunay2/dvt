# ADR-0005: Metrics via Optional Callback Interface

Decision:

- Planner accepts optional `metrics` callbacks.
- Metrics are not part of hash inputs and must not affect determinism.

Rationale:

- Observability without side effects in planner core.
