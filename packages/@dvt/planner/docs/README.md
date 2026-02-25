# @dvt/planner (v2.3.1)

A pure deterministic planner that compiles a dependency graph into an immutable, content-addressed execution plan.

## Determinism guarantees

- Canonicalization: RFC 8785 JCS
- Ordering: binary comparison only
- Plan identity:

  planId = sha256(JCS(planCore))

Where:

planCore = { metadata: { planVersion, inputHashSha256 }, steps }

**Not included in the hash**:

- planId
- createdAtIso
- observability

The planner returns:

- `plan` (ExecutionPlanV2) — includes provenance fields for orchestrator usage
- `canonicalPlanJson` — exactly `JCS(planCore)`

Caller verification:

- sha256(canonicalPlanJson) === plan.metadata.planId

## Integration flow (expected orchestration)

1. Orchestrator calls `planner.buildPlan(input)`.
2. On success, orchestrator persists `canonicalPlanJson` in `execution_plans` keyed by `planId`.
3. Orchestrator bootstraps a run in the state store with:
   - planId
   - inputHashSha256
   - run metadata
4. Engine receives plan reference and executes steps, emitting run events elsewhere.

## Limits

Planner limits are configurable:

- maxNodes
- maxEdges
- maxDepth
- maxPlanSizeBytes
- timeoutMs

Example:
