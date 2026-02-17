## Think-First Analysis

### Problem summary (facts only)

- Issue [#219](https://github.com/dunay2/dvt/issues/219) asks to define JSON Schema `LogicalGraph (GCM) v0.1`.
- Contracts area already tracks this need in [`docs/architecture/engine/contracts/README.md`](../docs/architecture/engine/contracts/README.md).
- There is no dedicated `logical-graph.schema.json` in contracts yet.
- Source planning context lists core GCM entities/fields (`node_uuid`, `dbt_unique_id`, `tipo`, `dependencias`, `metadata`) in [`DBT_CLOUD_EXTENDIDO_V2_SPEC_SOURCE.md`](../docs/planning/DBT_CLOUD_EXTENDIDO_V2_SPEC_SOURCE.md).

### Constraints and invariants

- Keep scope minimal and aligned to issue #219 only.
- Deliver deterministic JSON Schema with explicit required fields and invariants.
- Avoid over-modeling runtime/business semantics not yet stabilized.
- Preserve forward evolution path for #220/#221/#222.

### Options considered

A) Minimal but strict schema for graph + nodes + edges with required identity/dependency fields.

B) Very permissive schema (mostly `additionalProperties: true`) to avoid early constraints.

C) Full detailed schema including all future planner/runtime metadata now.

### Selected option + rationale

- Selected: **A**.
- Rationale: enough structural guarantees for validation compatibility without locking premature design details.

### Alternatives rejected + why

- B rejected: too weak, low validation value.
- C rejected: high churn risk and likely rework before adjacent subtasks settle.

### Expected validation evidence

- Schema is valid JSON and passes repo schema-validation job patterns.
- Contracts markdown lint and link checks remain green for touched scope.

---

## Pre-implementation brief

### Suitability

- A focused schema-first slice is the correct next unit from project backlog priority.

### Blockers

- No blocker identified.

### Opportunities

- Reuse node identity rules in upcoming `CanvasState` and `ProvenanceEvent` schemas.

### WHAT

- Add `LogicalGraph` JSON Schema v0.1 under contracts schemas path.
- Register schema in contracts registry.

### FOR (goal)

- Provide canonical, machine-validatable graph shape for ingestion/planning compatibility.

### HOW

1. Define object model (`graphVersion`, `nodes`, `edges`, metadata).
2. Add enums/required fields for node/edge identity.
3. Keep metadata extensible.
4. Update registry entry.

### WHY

- Balances correctness with iterative DRAFT evolution.

### Scope touched

- `docs/architecture/engine/contracts/schemas/logical-graph.schema.json` (new)
- `docs/architecture/engine/contracts/README.md`
- `.gh-comments/issue-219-prebrief.md`

### Risk

- Low.

### Risks & Mitigation

- Risk: under-specifying required graph invariants.
  - Mitigation: encode core mandatory IDs/types/dependencies now; expand in follow-up minor updates.
- Risk: naming drift vs planning docs.
  - Mitigation: align key field names with current source spec wording.

### Impact (affected areas)

- Contracts validation surface and planning/ingestion interoperability.
- No runtime behavior changes.

### Validation plan

- Contracts markdown lint.
- Internal link scan in contracts docs.
- JSON schema validation via existing workflow-compatible checks.

### Unknowns / maintainer decisions needed

- Whether `node_uuid` should be strict UUID format or generic identifier in v0.1.
