# Docs archive old documents — planner batch

Branch: `docs/archive-old-documents-20260531`

## Scope

Archive planner-local documents that were already classified by
`docs/planning/status/planner-local-doc-triage-20260320.md` as historical,
duplicated, stale, or superseded.

## Completed

- Added `docs/archive/planner/index.md`.
- Moved the planner implementation review out of the package-local docs surface.
- Moved local planner ADR snapshots `ADR-0000` through `ADR-0006` into `docs/archive/planner/` and removed the package-local copies.
- Moved local planner contract/schema snapshots into `docs/archive/planner/contracts/`:
  - `PlannerContracts.v2.3.1.md`
  - `ExecutionPlanV2.schema.json`
  - `PlanCore.schema.json`
  - `PlannerInputEnvelopeV2.schema.json`
  - `PlannerPolicyClassSet.schema.json`
- Moved branch/slice planner proposal snapshots into `docs/archive/planner/proposals/`:
  - `planner-corrected-baseline-facade-branch.md`
  - `planner-slice3-physical-reorganization-plan.md`
  - `planner-slice4-artifact-boundary-extraction-plan.md`
- Indexed archived ADR, contract/schema, and proposal snapshots from `docs/archive/planner/index.md`.

## Rationale

The planner-local triage marks these artifacts as `archive` because they are
historical, duplicated, stale, or superseded and should not remain on the primary
planner reader path. The repo-level planner contracts, ADRs, status docs, and
planning surfaces remain the active authority.

## Deliberately retained

- `packages/@dvt/planner/docs/README.md`
- `packages/@dvt/planner/docs/grimorio.md`
- `packages/@dvt/planner/docs/audit/planner_v2_3_2_audit.commented.ts`

These were classified as package-local maintainer notes, not archive candidates.

## Still not handled in this batch

- `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md` was classified as `promote`, not archive, so it was not moved in this archival-only pass.
- Local validation commands were not run from this connector session.
- The branch is behind current `main` and needs update/rebase before PR/merge.

## Suggested validation

```bash
pnpm lint:md:changed
pnpm docs:sync
pnpm verify:prepush
```
