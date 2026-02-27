# ADR-0004: Security Guardrails via Limits

Decision:

- Planner enforces configurable limits:
  - maxNodes, maxEdges, maxDepth, maxPlanSizeBytes, timeoutMs

Rationale:

- Protects planner against hostile or accidental oversized inputs.
- Ensures predictable resource usage.
