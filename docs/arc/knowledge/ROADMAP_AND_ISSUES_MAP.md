# Roadmap, Status, and Issues — Knowledge Map

## 1. Primary sources

- Global roadmap: [`ROADMAP.md`](../../ROADMAP.md)
- Docs index: [`docs/INDEX.md`](../INDEX.md)
- Implementation status: [`docs/status/IMPLEMENTATION_SUMMARY.md`](../status/IMPLEMENTATION_SUMMARY.md)
- Backlog V2 (stories): [`docs/planning/BACKLOG_V2_EPICS_AND_STORIES.md`](../planning/BACKLOG_V2_EPICS_AND_STORIES.md)
- Backlog V2 (GitHub execution): [`docs/planning/BACKLOG_V2_GITHUB_EXECUTION.md`](../planning/BACKLOG_V2_GITHUB_EXECUTION.md)
- Evidence / issue refresh (local): [`.gh-comments`](../../.gh-comments)

---

## 2. Strategic status (summary)

Per [`ROADMAP.md`](../../ROADMAP.md):

- Phase 1 MVP: in progress with milestones closed and critical blockers still open.
- Phase 1.5 Hardening: planned.
- Phase 2 Tooling: partially planned; determinism/adapters debt remains.
- Frontend DVT+ track: backlog and GitHub structure created.

### 2.1 Unblock update (2026-02-16)

Status published after completing ADR-0002 Phase 2 (Knowledge Graph automation):

- ✅ Dynamic Cypher generation enabled (`kg:generate`).
- ✅ Snapshot versioned and validated (`scripts/neo4j/generated-repo.cypher`).
- ✅ Sync gate enabled in CI (`kg-cypher-sync` running `kg:check`).
- ✅ Pre-commit auto-regeneration for relevant changes (ADRs/KG scripts).

Immediate impact:

- Removes silent drift between local docs and the executed graph snapshot.
- PR fails early if the graph snapshot is out of date.
- Reduces friction for ADR→code traceability during AI sessions and technical reviews.

Per [`docs/status/IMPLEMENTATION_SUMMARY.md`](../status/IMPLEMENTATION_SUMMARY.md):

- Contract + golden-path baseline working in CI.
- Engine core and key hardening already merged.
- Adapter parity and cross-adapter determinism coverage remain a gap.

---

## 3. Key issues and dependencies (operational view)

### 3.1 Historical critical chain (MVP)

Documented in [`ROADMAP.md`](../../ROADMAP.md): #8 → #9 → #2 → #14 → #15 → #5/#6 → #16 → #10 → #17.

### 3.2 Status summary (internal evidence)

- #14: mostly implemented, with checklist/naming drift (see [`.gh-comments/issue-14-status-refresh-2026-02-15.md`](../../.gh-comments/issue-14-status-refresh-2026-02-15.md)).
- #68: Temporal adapter close to completion (pending final tracking alignment).
- #6: Postgres adapter MVP baseline implemented; full hardening pending.
- #69/#71: Conductor expansion still blocked/not started.
- #72/#73: enforcement/version-binding and cross-adapter determinism incomplete.

---

## 4. Backlog V2 (product/platform)

### Functional alignment status

Source: [`docs/planning/BACKLOG_V2_EPICS_AND_STORIES.md`](../planning/BACKLOG_V2_EPICS_AND_STORIES.md)

- Partial/high alignment: core contracts, part of execution planning, baseline security.
- Low alignment: dbt ingestion, isolated dbt runner, UI workspace, controlled roundtrip, 50k performance.

### GitHub execution status

Source: [`docs/planning/BACKLOG_V2_GITHUB_EXECUTION.md`](../planning/BACKLOG_V2_GITHUB_EXECUTION.md)

- Defines 10 milestones + 26 stories as an executable plan.
- Evidence table still marked as pending.

---

## 5. Management risks detected

1. **Doc ↔ issue ↔ code drift**
   - Some functionality is implemented while issues remain open or misaligned with acceptance.

2. **Adapter parity as a bottleneck**
   - Risk of blocking real deterministic e2e validation.

3. **Technical roadmap vs product backlog duality**
   - Needs an explicit traceability bridge for prioritization and reporting.

---

## 6. Immediate operational recommendation

1. Normalize critical issue states based on current evidence.
2. Convert Backlog V2 into real GitHub milestones/issues with UTC evidence.
3. Maintain weekly sync between:
   - [`ROADMAP.md`](../../ROADMAP.md)
   - [`docs/status/IMPLEMENTATION_SUMMARY.md`](../status/IMPLEMENTATION_SUMMARY.md)
   - [`docs/planning/BACKLOG_V2_GITHUB_EXECUTION.md`](../planning/BACKLOG_V2_GITHUB_EXECUTION.md)
