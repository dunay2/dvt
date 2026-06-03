---
title: Governance Refresh DB-First Import Gate Closeout
status: Draft
owner: governance
last_reviewed: 2026-06-01
planning_type: closeout
---

# Governance Refresh DB-First Import Gate Closeout

## Think-First Analysis

- Problem summary: `pnpm governance:refresh` runs `governance:db:import`
  during generation passes and again during final DB validation. Each import can
  take several minutes, so ordinary refreshes pay the heavy DB import cost
  multiple times even when generated governance surfaces are not yet stable.
- Root cause: the refresh sequence treats generated file surfaces as the primary
  convergence mechanism and imports those surfaces into the DB before and after
  coverage/remediation report generation. That makes the DB a repeated mirror
  of file-state churn instead of a final validated projection.
- Constraints and invariants: the governance inventory, AI work protocol, and
  Governance Refresh Rule require generated surfaces, governance indexes,
  planning/governance DB imports/checks, and pre-push validation to remain
  aligned. The change must not skip final DB import/check/export, must not relax
  drift checks, and must keep generation passes closed until the worktree
  fingerprint stabilizes.
- Options considered:
  - Optimize SQL import internals first: rejected for this slice because the
    bigger local cost is repeated invocation, not a proven query hot spot.
  - Remove DB validation from refresh: rejected because DB-backed projections
    are part of the closeout contract.
  - Move all governance report generation to DB reads immediately: rejected as
    too broad for a safe incremental slice.
  - Remove generation-pass governance imports and retain one final import after
    stable generated surfaces: selected because it reduces repeated heavy work
    without weakening final DB validation.
- Selected option and rationale: keep local generation/report convergence
  file-based for now, but import governance into the DB only after generated
  surfaces stabilize and final reports are regenerated. This moves the refresh
  posture closer to DB-first by making DB import a final authoritative
  projection step instead of a mid-generation stabilizer.
- Rejected alternatives: hidden skip flags, deleting governance DB checks,
  changing the database import schema, and introducing an unmeasured cache of
  DB import outputs.

## Pre-Implementation Brief

- Mode: Slim.
- Scope: `governance:refresh` stage ordering, its contract tests, and CI/docs
  capability documentation.
- Touched files or paths:
  - `scripts/governance-refresh.cjs`
  - `scripts/governance-refresh.test.cjs`
  - `docs/guides/testing-and-ci-capabilities.md`
  - `docs/planning/closeouts/20260601-governance-refresh-db-first-import-gate-closeout.md`
- Expected outcome: `governance:refresh` no longer runs
  `governance:db:import` inside generation passes; after generated surfaces
  stabilize, it still runs final governance coverage/remediation reports,
  imports governance once, checks the DB, and verifies export parity.
- Risks and mitigations:
  - Risk: a report might implicitly rely on a pre-imported DB snapshot.
    Mitigation: keep report generation before the final import and validate
    with existing governance refresh tests plus `governance:refresh`.
  - Risk: final DB drift could be hidden if import is removed entirely.
    Mitigation: retain final `governance:db:import`,
    `governance:db:check`, and `governance:db:export:check`.
- Out-of-scope items: DB-read implementations for coverage/remediation
  reports, SQL-level import optimization, schema changes, and removing
  file-based generated surfaces.
- Validation plan:
  - `node --test scripts/governance-refresh.test.cjs`
  - `pnpm governance:refresh`
  - `pnpm verify:prepush`
- Test coverage plan: update governance refresh contract tests to fail while
  generation stages contain `governance:db:import`, and to prove the final DB
  stages still include the governance import/check/export sequence.
- Libraries evaluated: None evaluated - no custom implementation.
- Command/query rail impact: none. This is governance workflow orchestration,
  not externally observable product behavior.
- Fowler planning impact: reduces repeated file-to-DB mirror work and moves the
  workflow toward a single authoritative DB projection phase.

## Closeout Evidence

### Governing Sources Used

- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/guides/testing-and-ci-capabilities.md`
- `scripts/governance-refresh.cjs`
- `scripts/governance-refresh.test.cjs`
- `scripts/governance-db-import.cjs`
- `scripts/governance-db-check.cjs`
- `package.json`

### Real Work Performed

- Removed the two `governance:db:import` stages from
  `governance:refresh` generation passes.
- Kept the final database-validation sequence:
  `governance:db:import`, `governance:db:check`, and
  `governance:db:export:check`.
- Updated the governance refresh contract test so generation passes fail if
  they reintroduce heavy governance DB imports before generated surfaces are
  stable.
- Updated the Testing and CI Capabilities guide to document the new DB import
  posture.

### Validation Evidence

- `node --test scripts/governance-refresh.test.cjs`
  - First run: failed as expected because generation stages still contained two
    `governance:db:import` calls.
  - Final run: passed, 7/7 tests.
- `pnpm docs:sync`
  - Passed.
- `pnpm governance:refresh`
  - Passed.
  - Observed generation passes without any `governance:db:import`.
  - Observed one final governance import after generated surfaces stabilized:
    `governanceFiles=5193`, `governanceComponents=58`,
    `governanceRemediationTasks=39`.
  - `governance:db:check` passed.
  - `governance:db:export:check` passed.
- `pnpm verify:prepush`
  - Run after this closeout update so the final gate validates the final
    worktree state.

### No-Debt Evidence

- No new debt entry was created.
- No governance DB check, export check, docs sync, or pre-push rule was removed
  or relaxed.
- No hook bypass was used.
- No skipped checks are hidden; remaining DB-first work is explicitly scoped as
  future work: make coverage/remediation report generation read from DB when
  the DB projection is fresh.

### No-Stub Evidence

- No stub, placeholder, fake implementation, TODO/FIXME marker, or unfinished
  branch was added.
