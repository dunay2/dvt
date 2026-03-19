# DVT Planner � Technical Vision

## What it actually is

A compiler of DBT intentions into runtime-neutral execution plans.  
It takes a manifest + selection + policies and produces a deterministic, immutable, content-addressed `ExecutionPlanV2`.  
It does not execute anything � it only plans.

---

## Strengths

### 1. Clean separation of concerns

- `PlannerFacade` is the only entry point.
- Internal domain (`Planner`) is not exposed externally.
- Separation between plan construction and artifact enrichment (`attachCompiledCodeRefs`) is correct.
- The plan exists without compiled code references; enrichment is optional and fail-open.

### 2. Deterministic identity

- `inputHashSha256` over canonicalized input enables idempotency and external caching.
- Identical inputs always produce the same plan.
- This is non-trivial and correctly implemented.

### 3. Runtime-neutral policy vocabulary

- `PlannerPolicyClassSet` (retry, timeout, concurrency) abstracts runtime concerns.
- Adapters translate policies into Temporal, Kubernetes jobs, etc.
- The planner is completely unaware of runtime specifics.

### 4. Governed Step Kind Registry

- `KNOWN_STEP_KINDS` + `STEP_KIND_BRIDGE_REGISTRY` in `@dvt/contracts`.
- Prevents arbitrary step kinds from reaching the engine without review.
- Strong extensibility governance mechanism.

### 5. Contracts in shared kernel

- `ExecutionPlanV2`, `CompiledCodeRef`, policies defined in `@dvt/contracts`.
- Bounded contexts consume contracts without coupling to planner implementation.

### 6. Executability validation

- `IPlanExecutabilityValidator` allows adapters to reject unsupported plans pre-execution.
- Well-designed pre-execution gate.

---

## Gaps

### 1. No caching by inputHashSha256

- Hash exists but planner always recomputes.
- Composition root must implement caching externally.
- Missing optional port like `ICachedPlanStore` in `PlannerFacade`.

### 2. Policies are plan-wide, not per step-kind

- Cannot express differentiated retry strategies (e.g. models vs tests).
- `PlannerPolicyClassSet` applies globally.
- Limitation for heterogeneous workflows.

### 3. No conditional branching

- Static DAG only.
- No conditional execution (if A succeeds ? B, else ? C).
- Complex workflows require external orchestration logic.

### 4. Fixed backoff (backoffMs: 0)

- Backoff strategy delegated to adapters.
- Leads to inconsistent retry behavior across runtimes.
- No way to express exponential backoff in contracts.

### 5. No plan diff / incremental planning

- Full recomputation on any manifest change.
- No delta between plans.
- Inefficient for large manifests.

### 6. Limited graph validation

- Detects missing nodes.
- No explicit cycle detection.
- Undefined behavior if manifest is cyclic.

### 7. Opaque selection

- `PlannerSelection` is not externally inspectable.
- No dry-run / preview mode.
- Cannot list selected nodes without full plan materialization.

### 8. No planning traceability

- No record of:
  - Why a step was included/excluded
  - Policy resolution details
- Debugging plan composition is difficult.

---

## Comparison with other planners

| Dimension              | DVT Planner  | Airflow            | Prefect/Dagster | Native dbt   |
| ---------------------- | ------------ | ------------------ | --------------- | ------------ |
| Runtime-neutral        | ? explicit   | ? executor-coupled | ?? partial      | ? direct run |
| Typed policies         | ?            | ? ad hoc           | ??              | ?            |
| Content-addressed      | ?            | ?                  | ?               | ?            |
| Conditional branching  | ?            | ?                  | ?               | ?            |
| Dynamic fan-out        | ?            | ?                  | ?               | ?            |
| Plan caching           | ? (external) | N/A                | ?               | N/A          |
| Governed extensibility | ? registry   | ?                  | ??              | ?            |

Positioning is correct:

- Specialized DBT workflow planner
- Strong contracts
- Runtime-neutral
- Better type governance than native dbt

---

## Verdict

The planner is fit for its current use case.

- Architecture is solid
- Contracts are clear
- Separation of concerns holds under refactoring (Slices 3 and 4)

### Most critical gaps (scaling phase)

1. Input-hash-based caching (avoid unnecessary replanning)
2. Per step-kind policies (increase expressiveness)

Other limitations are conscious design trade-offs.
