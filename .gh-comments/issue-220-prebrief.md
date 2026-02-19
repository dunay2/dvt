## Think-First Analysis

### Problem summary (facts only)

- US-1.1 requires a `CanvasState JSON Schema` and tracks it via issue `#220` in [`docs/architecture/engine/contracts/README.md`](../docs/architecture/engine/contracts/README.md).
- Contracts schemas currently include [`logical-graph.schema.json`](../docs/architecture/engine/contracts/schemas/logical-graph.schema.json), but there was no `CanvasState` schema artifact.
- Planning source defines baseline `CanvasState` concepts (`posiciones`, `zoom`, `grupos`, `colapsos`) in [`docs/planning/DBT_CLOUD_EXTENDIDO_V2_SPEC_SOURCE.md`](../docs/planning/DBT_CLOUD_EXTENDIDO_V2_SPEC_SOURCE.md).

### Constraints and invariants

- Scope limited to contracts/docs for issue slice `#220`.
- Keep schema deterministic and versioned (`schemaVersion`) for stable reads/writes.
- Avoid runtime behavior changes and avoid over-modeling future UI details.
- Preserve forward compatibility for follow-up contracts (`#221`, `#222`, `#223`).

### Options considered

A) Minimal strict schema with required deterministic core (`viewport`, node positions, revision) and extensible metadata.

B) UI-heavy schema including advanced presentation settings and transient interaction state.

C) Very permissive schema with weak validation to avoid future migrations.

### Selected option + rationale

- Selected: **A**.
- Rationale: gives immediate validation value for US-1.1 while keeping risk low and allowing incremental evolution.

### Alternatives rejected + why

- B rejected: introduces unstable UI semantics too early and increases churn risk.
- C rejected: insufficient guarantees for deterministic persistence contracts.

### Expected validation evidence

- Contract index generation/check passes.
- Contracts markdown lint passes.
- New schema file is valid JSON.

---

## Pre-implementation brief

### Suitability

- A schema-first docs-only slice is suitable for `#220` and aligns with playbook low-risk scope.

### Blockers

- No blockers identified.

### Opportunities

- Reuse `revision` field as baseline for optimistic-locking workflows in later issues.

### WHAT

- Add `CanvasState v1` JSON Schema under contracts schemas path.
- Regenerate contracts index for discoverability.

### FOR (goal)

- Establish canonical canvas/workspace state shape for deterministic reads/writes.

### HOW

1. Define required deterministic fields and structural definitions.
2. Keep metadata extensible and non-breaking.
3. Regenerate contracts index and run targeted validations.

### WHY

- Smallest safe change-set that directly satisfies issue acceptance intent.

### Scope touched

- `docs/architecture/engine/contracts/schemas/canvas-state.schema.json` (new)
- `docs/architecture/engine/contracts/README.md` (generated index update)

### Risk

- Classification: **Low**.

### Risks & Mitigation

- Risk: naming drift vs planning docs.
  - Mitigation: align with documented terms (`positions`, `zoom`, `groups`, `collapsed`).
- Risk: excessive strictness limiting future evolution.
  - Mitigation: keep strict core + extensible metadata.

### Impact (affected areas)

- Contracts validation and schema discoverability.
- No runtime or adapter behavior impact.

### Validation plan

- `pnpm contracts:index:check`
- `pnpm exec markdownlint-cli2 "docs/architecture/engine/contracts/**/*.md"`
- JSON parse check on new schema file.

### Unknowns / maintainer decisions needed

- None for this baseline v1 schema slice.
