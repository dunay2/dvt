# ADR-0003: Typed Error Taxonomy

Decision:

- All errors thrown by planner MUST be `PlannerError`.
- `PlannerErrorCode` enumerates error categories.

Rationale:

- Deterministic handling in orchestrator.
- Avoid brittle string matching and stage inference.
