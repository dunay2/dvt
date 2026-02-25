# ADR-0006: Extensibility Model

Decision:

- StepKind is `string`.
- Step creation via injected `StepFactory`.
- Policies include `custom` passthrough without interpretation.

Rationale:

- Planner supports domains beyond dbt without modifying core.
- Keeps default dbt behavior via dbtStepFactory.
