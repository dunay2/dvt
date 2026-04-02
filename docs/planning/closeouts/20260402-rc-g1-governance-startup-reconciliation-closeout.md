---
slice: 20260402-rc-g1-governance-startup-reconciliation
date: 2026-04-02
work_item: RC-G1 / GOV-S1
status: Done
---

# Closeout: RC-G1 Governance Startup Reconciliation

## Think-First Analysis

### Problem summary

The repository had three simultaneous drift signals around the same topic:

1. `packages/@dvt/engine/src/adapters/mock/MockAdapter.ts` contained a typo that
   blocked the `dvt-api` validation chain.
2. `docs/planning/reviews/20260326-reconciler-runtime-solid-qa-review.md`
   claimed `RC-G1` was open in the workboard, but no such tracker existed in
   Lane A.
3. `LOCAL_EXECUTION_LOG_20260401.md` reintroduced already-closed
   health/readiness work as if it were still open and proposed a governance
   startup improvement outside the canonical planning surfaces.

### Root cause

The health/readiness slice had already landed in code, but the planning state
was not fully reconciled:

- the review still pointed to a non-existent tracker;
- the ownership proposal was active but not linked to a live workboard task;
- the governance inventory still lacked a quick-start router, so a local note
  became the de facto startup aid;
- an unrelated typo in `MockAdapter` made the real validation baseline look
  broken even though the health code itself was sound.

### Constraints and invariants

- `AGENTS.md`: inventory-first startup, real validation, no hidden debt, no
  stubs, no hook bypass, and evidence-backed closeout.
- `docs/guides/ai-work-protocol.md`: planning changes must update canonical
  planning surfaces in the same task; closeout is mandatory.
- `docs/planning/state/planning-control-tower.md`: planning work must land in
  proposal/review/lane/closeout surfaces, not in ad hoc notes.
- `ADR-0041`: runtime vocabulary and boundary contracts remain separated and
  connected only through explicit mapping.
- `ADR-0041A`: reconciler health already requires a discriminated union,
  contract-first schema, and explicit mapping.
- `ADR-0018`, `ADR-0034`, `ADR-0035`: shared-kernel ownership and bounded
  context boundaries govern `RC-G1`.

### Options considered

- Keep `LOCAL_EXECUTION_LOG_20260401.md` as the active execution note and only
  fix the build blocker.
  - Rejected because it preserves a non-canonical planning surface.
- Open new parallel proposal/review files for ownership and health.
  - Rejected because the repo already contains the right proposal and review
    surfaces for both topics.
- Reconcile the existing review and proposal, register `RC-G1` in Lane A, add a
  governance startup router, and delete the local note after extracting the
  useful content.
  - Selected because it restores one canonical source per topic.

### Selected option and rationale

Use the existing review and proposal as the canonical surfaces, register
`RC-G1`/`GOV-S1` in Lane A, implement the startup card directly in the
inventory and AI protocol, and remove the local execution note once the content
has been absorbed.

### Rejected alternatives

- Reopen health/readiness implementation work that already exists in `apps/api`.
- Create a second ownership proposal competing with
  `contracts-domain-ownership-migration-plan-20260327.md`.
- Leave the governance startup improvement only as a planning note without
  touching the actual inventory/protocol entry points.

## Pre-Implementation Brief

- Mode: Full
- Scope:
  - `packages/@dvt/engine/src/adapters/mock/MockAdapter.ts`
  - `docs/planning/state/agent-lane-a.yaml`
  - `docs/planning/proposals/contracts-domain-ownership-migration-plan-20260327.md`
  - `docs/planning/reviews/20260326-reconciler-runtime-solid-qa-review.md`
  - `docs/planning/proposals/governance-startup-card-router-plan-20260402.md`
  - `docs/planning/status/governance-document-rule-inventory.md`
  - `docs/guides/ai-work-protocol.md`
  - supporting evidence/risk/closeout docs
- Expected outcome:
  - `MockAdapter` no longer blocks the validation baseline
  - health/readiness stays closed as implemented work
  - `RC-G1` exists as a live Lane A tracker with sequenced subtasks
  - governance startup routing is explicit in the inventory and AI protocol
- Risks and mitigations:
  - Risk: documentation claims drift from the real code baseline.
    - Mitigation: validate `@dvt/engine`, `dvt-api`, docs generation, and
      `verify:prepush`.
  - Risk: the new tracker reintroduces a parallel ownership plan.
    - Mitigation: reuse the existing proposal and declare it the canonical
      `RC-G1` execution surface.
- Out-of-scope items:
  - full package migrations for `RC-G1-B`, `RC-G1-C`, and `RC-G1-D`
  - new runtime behavior in `apps/api`
  - changes to public planner contracts governed by ADR-0035
- Validation plan:
  - `pnpm --filter @dvt/engine build`
  - `pnpm --filter dvt-api typecheck`
  - `pnpm --filter dvt-api test`
  - `pnpm docs:sync`
  - `pnpm docs:workboard:generate`
  - `GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs`
  - `pnpm verify:prepush`
- Test coverage plan:
  - preserve existing negative-path health assertions in `apps/api`
  - preserve `MockAdapter` compile-time contract narrowing behavior
  - ensure planning generation and changed-file governance checks still pass
- Libraries evaluated:
  - None evaluated - this slice is reconciliation and repo-local governance
    hardening.

## Traceability

- Baseline ADRs:
  - `ADR-0018`
  - `ADR-0034`
  - `ADR-0035`
  - `ADR-0041`
  - `ADR-0041A`
- Canonical planning sources:
  - `docs/planning/state/agent-lane-a.yaml`
  - `docs/planning/proposals/contracts-domain-ownership-migration-plan-20260327.md`
  - `docs/planning/reviews/20260326-reconciler-runtime-solid-qa-review.md`
  - `docs/planning/proposals/governance-startup-card-router-plan-20260402.md`

## Real Work Performed

- Fixed the `MockAdapter` typo that broke the engine build and blocked `dvt-api`
  validation.
- Registered `RC-G1` plus `RC-G1-A..D` and `GOV-S1` in Lane A, with updated lane
  progress and generated workboard targets.
- Reused the existing ownership proposal as the canonical `RC-G1` plan and
  froze the family taxonomy to `stay shared` versus `move to owner`.
- Reconciled the existing reconciler runtime review so the health/readiness
  implementation stays closed and the only open follow-up is `RC-G1`.
- Added a new governance startup-card proposal and implemented the quick-start
  router directly in the governance inventory and AI work protocol.
- Removed the local execution log after its useful content was migrated into the
  canonical proposal/review/governance surfaces.

## Governing sources used

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/planning/state/planning-control-tower.md`
- `docs/planning/state/how-to-add-tasks.md`
- `docs/adr/ADR-0018_Shared_Kernel_Ownership_Governance.md`
- `docs/adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md`
- `docs/adr/ADR-0035-planner-public-contract-evolution-protocol.md`
- `docs/adr/ADR-0041-global-domain-state-model-and-boundary-contracts.md`
- `docs/adr/ADR-0041a-reconciler-health-state-and-readiness-port-semantics.md`

## Validation evidence

- `pnpm --filter @dvt/engine build`
  - Passed.
- `pnpm --filter dvt-api typecheck`
  - Passed.
- `pnpm --filter dvt-api test`
  - Passed.
  - Result: `49` test files passed, `1` skipped; `280` tests passed, `6`
    skipped.
- `pnpm docs:sync`
  - Passed and regenerated `docs/planning/index.md`,
    `docs/planning/proposals/index.md`, `docs/evidence/index.md`, and
    `docs/planning/state/agent-lane-a.md`.
- `pnpm docs:workboard:generate`
  - Passed and regenerated `docs/planning/state/execution-workboard.md` plus
    `docs/planning/state/open-task-route.md`.
- `GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs`
  - Executed with PowerShell environment syntax.
  - Returned `ARC-0` because the tool compares `origin/main...HEAD` and does
    not see uncommitted worktree changes.
  - This slice still added ARC-2 evidence and a risk update proactively because
    it touched `packages/@dvt/engine/**`.
- `pnpm verify:prepush`
  - Passed.
  - `docs:gov:locations -- --changed-only`,
    `docs:arc:evidence:check -- --changed-only`, and `lint:md:changed` reported
    no changed files because those checks also operate on committed diff inputs.

## No-debt evidence

- No rule was disabled or relaxed.
- No hook was bypassed.
- No duplicate active proposal or review was introduced.
- `RC-G1-B/C/D` remain explicitly queued work; they were not represented as
  completed.
- ARC-2 evidence and risk files were added even though `arc-check` did not see
  the uncommitted engine change.

## No-stub evidence

- No placeholder runtime implementation was introduced.
- `MockAdapter` keeps the real contract-narrowing validation path.
- The startup card/router is implemented in the actual inventory and protocol,
  not as an orphan note.
