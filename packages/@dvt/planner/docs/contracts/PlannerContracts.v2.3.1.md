# Planner Contracts v2.3.1

## Identity

### planCore (hashed)

planCore = {
metadata: { planVersion: "2.3", inputHashSha256 },
steps: ExecutionStepV2[]
}

### planId

planId = sha256(JCS(planCore))

### canonicalPlanCoreJson

canonicalPlanCoreJson = JCS(planCore)

### Verification

sha256(canonicalPlanCoreJson) === plan.metadata.planId

## Input hash

inputHashSha256 = sha256(JCS({
nodes,
selection,
policies
}))

Excluded:

- requestedBy
- requestId
- requestedAtIso
- observability

## Determinism constraints (MUST)

- No localeCompare.
- Sort keys and arrays deterministically using binary compare.
- No runtime-dependent ordering (Map iteration order is insertion order; avoid depending on non-deterministic insertions).

## Error taxonomy (MUST)

All thrown errors MUST be PlannerError with a valid PlannerErrorCode.

## Limits (MUST)

Planner MUST enforce:

- maxNodes on manifest and selection size
- maxEdges during graph build
- maxDepth on selected subgraph
- maxPlanSizeBytes after canonicalization
- timeoutMs via checkAbort

## Extensibility

- StepKind is string.
- Planner resolves known policies.
- Planner passes custom policies via ResolvedPolicies.custom to StepFactory.
