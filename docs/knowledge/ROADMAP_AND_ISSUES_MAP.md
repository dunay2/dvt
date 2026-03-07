# Roadmap, Status, And Issues Knowledge Map

## 1. Primary Sources

- Global roadmap: [`ROADMAP.md`](../../ROADMAP.md)
- Documentation index: [`docs/index.md`](../index.md)
- Planning index: [`docs/planning/index.md`](../planning/index.md)
- Generated code state: [`docs/planning/status/generated-code-state.md`](../planning/status/generated-code-state.md)
- Generated spec traceability: [`docs/planning/status/generated-spec-traceability.md`](../planning/status/generated-spec-traceability.md)
- Canonical doc-code matrix: [`docs/planning/status/canonical-doc-code-matrix.md`](../planning/status/canonical-doc-code-matrix.md)
- Repository structure map: [`docs/knowledge/REPOSITORY_MAP.md`](./REPOSITORY_MAP.md)
- Local issue-refresh evidence: [`.gh-comments`](../../.gh-comments)

---

## 2. Strategic State Summary

According to [`ROADMAP.md`](../../ROADMAP.md):

- Phase 1 MVP is in progress with several closed milestones and remaining critical gaps.
- Phase 1.5 hardening is planned.
- Phase 2 tooling remains partially planned, with determinism and adapter parity still carrying debt.
- The DVT+ frontend track exists, but remains structurally separate from the engine roadmap.

According to the generated status docs:

- core contract and traceability automation are active
- major engine and hardening work has already landed
- adapter parity and cross-adapter deterministic coverage remain open gaps

---

## 3. Key Issues And Dependencies

### 3.1 Historical MVP chain

The historical critical chain is still anchored in [`ROADMAP.md`](../../ROADMAP.md): `#8 -> #9 -> #2 -> #14 -> #15 -> #5/#6 -> #16 -> #10 -> #17`.

### 3.2 Evidence snapshot

- `#14`: closed. `IWorkflowEngine` and `SnapshotProjector` are implemented and tested.
- `#15`: closed. Temporal interpreter workflow exists as a stub with full signatures.
- `#68`: closed. Temporal adapter stub exists; the remaining gap is real Temporal SDK behavior plus production `lookupRunRef`.
- `#6`: closed. Postgres state-store work is largely complete, with follow-up gaps around `listEvents` pagination and `listRuns` status filtering.
- `#69/#71`: Conductor expansion is still effectively Phase 2 work.
- `#72/#73`: version binding and cross-adapter determinism enforcement remain incomplete.
- ADR-0030 follow-up evidence lives in [`docs/archive/CHANGE_IMPACT_ADR0030_20260304.md`](../archive/CHANGE_IMPACT_ADR0030_20260304.md).

---

## 4. Current Planning Entry Points

The historical `BACKLOG_V2_*` documents are no longer in the active tree.

Use these current entry points instead:

- [`docs/planning/index.md`](../planning/index.md) for active proposals, reviews, status, gaps, and reference packs
- [`docs/planning/status/generated-code-state.md`](../planning/status/generated-code-state.md) for current generated implementation status
- [`docs/planning/status/generated-spec-traceability.md`](../planning/status/generated-spec-traceability.md) for spec-to-code traceability coverage
- [`docs/planning/status/canonical-doc-code-matrix.md`](../planning/status/canonical-doc-code-matrix.md) for the curated mapping from active topics to docs, code, tests, and verification commands
- [`docs/planning/proposals/documentation-restructuring-diagnostic-and-roadmap.md`](../planning/proposals/documentation-restructuring-diagnostic-and-roadmap.md) for the documentation restructuring backlog

---

## 5. Management Risks

1. **Documentation -> issue -> code drift**
   Implemented behavior can remain misaligned with issue state or acceptance notes.

2. **Adapter parity as bottleneck**
   This still blocks full deterministic end-to-end validation.

3. **Roadmap versus operational planning split**
   Strategic roadmap and day-to-day execution need explicit traceability to stay reportable.

---

## 6. Recommended Operating Sync

Keep these sources aligned on a regular cadence:

- [`ROADMAP.md`](../../ROADMAP.md)
- [`docs/planning/status/generated-code-state.md`](../planning/status/generated-code-state.md)
- [`docs/planning/status/generated-spec-traceability.md`](../planning/status/generated-spec-traceability.md)
- [`docs/planning/status/canonical-doc-code-matrix.md`](../planning/status/canonical-doc-code-matrix.md)
- [`docs/planning/index.md`](../planning/index.md)
