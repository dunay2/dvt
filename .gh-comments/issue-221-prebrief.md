## Think-First Analysis

### Problem summary (facts only)

- US-1.1 still tracks `ProvenanceEvent JSON Schema` as pending in [`docs/architecture/engine/contracts/README.md`](../docs/architecture/engine/contracts/README.md).
- The schema directory currently has [`logical-graph.schema.json`](../docs/architecture/engine/contracts/schemas/logical-graph.schema.json) and [`canvas-state.schema.json`](../docs/architecture/engine/contracts/schemas/canvas-state.schema.json), but no provenance artifact.
- Planning source defines provenance baseline as immutable events with actor, timestamp, action, and context in [`docs/planning/DBT_CLOUD_EXTENDIDO_V2_SPEC_SOURCE.md`](../docs/planning/DBT_CLOUD_EXTENDIDO_V2_SPEC_SOURCE.md).

### Constraints and invariants

- Scope must stay contracts/docs-only for issue `#221`.
- Event envelope must be immutable and auditable.
- Keep schema deterministic and versioned (`schemaVersion`).
- Avoid encoding runtime policies that belong to later implementation slices.

### Options considered

A) Define a minimal strict provenance envelope (identity, actor, action, context, integrity metadata) with extensible payload fields.

B) Reuse AuditLog event shape directly as ProvenanceEvent schema.

C) Create a very permissive schema with open object structure.

### Selected option + rationale

- Selected: **A**.
- Rationale: provides canonical machine validation now while keeping separation between generic provenance and security audit specifics.

### Alternatives rejected + why

- B rejected: couples provenance contract too tightly to audit-log domain semantics.
- C rejected: weak validation value and higher long-term drift risk.

### Expected validation evidence

- Contract index generation/check is consistent.
- New schema parses as valid JSON.
- Contracts docs validation commands executed with output captured.

---

## Pre-implementation brief

### Suitability

- A schema-first docs slice is the smallest and safest closure path for `#221`.

### Blockers

- No blockers identified.

### Opportunities

- Reuse this envelope in future policy/version binding for `#222`.

### WHAT

- Add `ProvenanceEvent v1` JSON Schema under contracts schemas.
- Regenerate contract registry index.

### FOR (goal)

- Establish auditable, immutable provenance envelope for domain events in US-1.1.

### HOW

1. Define strict required envelope fields and enums.
2. Keep event payload extensible via `data` object.
3. Regenerate index and capture validation evidence.

### WHY

- Chosen for low risk, high traceability, and direct acceptance alignment.

### Scope touched

- `docs/architecture/engine/contracts/schemas/provenance-event.schema.json` (new)
- `docs/architecture/engine/contracts/README.md` (generated update)
- `.gh-comments/issue-221-prebrief.md`

### Risk

- Classification: **Low**.

### Risks & Mitigation

- Risk: overlap confusion with security `AuditLog` contract.
  - Mitigation: describe ProvenanceEvent as generic envelope and keep audit-specific constraints out of scope.
- Risk: under-specification of integrity metadata.
  - Mitigation: include required digest + emitted timestamp + producer identity.

### Impact (affected areas)

- Contracts validation surface and documentation discoverability.
- No runtime behavior change.

### Validation plan

- `pnpm contracts:index:generate`
- `pnpm contracts:index:check`
- JSON parse check for new schema file.

### Unknowns / maintainer decisions needed

- None for this baseline v1 schema slice.
