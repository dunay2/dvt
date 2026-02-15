## Pre-implementation brief

### Suitability

- A quick audit shows issue #9 scope is already substantially implemented in the existing run events contract and cross-referenced from engine contracts.
- Suitable approach: perform a gap-closure update (file naming alignment + explicit acceptance mapping) instead of recreating overlapping content.

### Blockers

- Potential blocker: issue requests `RunEventCatalog.v1.md` while repository currently uses `RunEvents.v1.1.md` as canonical event catalog.

### Opportunities

- Close #9 with minimal doc churn by preserving current normative contract and adding explicit traceability to acceptance criteria.

### WHAT

- Audit and align documentation so issue #9 acceptance criteria are unambiguous and fully mapped.

### FOR (goal)

- Close roadmap critical-path issue #9 with evidence-based, low-risk documentation alignment.

### HOW

1. Audit current `RunEvents.v1.1.md` and `ExecutionSemantics.v1.md` coverage against #9 criteria.
2. Apply minimal naming/index/traceability adjustments if required.
3. Validate markdown consistency.
4. Open PR and publish explicit criteria mapping in issue comment.

### WHY

- Reusing existing canonical contract prevents duplicate sources of truth and reduces semantic drift.

### Scope touched

- `docs/architecture/engine/contracts/engine/*` and relevant index references only.

### Risk

- Low.

### Risks & Mitigation

- Risk: introducing duplicate or conflicting catalog docs.
  - Mitigation: keep a single canonical contract and link aliases if needed.

### Impact (affected areas)

- Documentation governance and contract discoverability.

### Validation plan

- `pnpm lint:md` and review of acceptance criteria mapping in issue + PR.

### Unknowns / maintainer decisions needed

- Confirm whether to keep canonical filename `RunEvents.v1.1.md` with alias/reference, or introduce a new `RunEventCatalog.v1.md` alias doc.
