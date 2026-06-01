---
title: Local DB-First Command Dedupe Closeout
status: Draft
owner: ci
last_reviewed: 2026-06-01
planning_type: closeout
---

# Local DB-First Command Dedupe Closeout

## Think-First Analysis

- Problem summary: local pre-push validation duplicated
  `planning:db:inventory:check` for planning/governance script changes because
  `verify:prepush` ran `verify:changed`, which already executes the scoped
  planning DB inventory check, and then ran the inventory check again as a
  separate default pre-push step. Separately, `governance:refresh` imported
  governance into the DB but still regenerated final coverage/remediation
  reports from local files instead of exercising the DB query projection.
- Root cause: the local validation router mixed delegated changed-slice checks
  with a second default pre-push planning DB inventory step. The governance
  refresh sequence had DB import/check/export validation, but the final report
  generation stayed local even though DB readers already existed.
- Constraints and invariants: default local pre-push must stay fast and must
  not remove changed-slice checks. Full pre-push mode must retain explicit DB
  closeout checks. `governance:refresh` must not run DB-sourced reports until
  after `governance:db:import` and `governance:db:check`, and generated
  outputs must remain export-equivalent to the imported DB sources.
- Selected option and rationale: remove the default duplicate
  `planning:db:inventory:check` from the outer pre-push plan while preserving
  it inside `verify:changed`; then move final governance coverage/remediation
  report generation after governance DB import/check and run those reports with
  `DVT_GOVERNANCE_REPORT_SOURCE=db`.

## Pre-Implementation Brief

- Mode: Slim.
- Scope: local validation planning, governance refresh stage ordering,
  DB-sourced governance report output equivalence, CI capability docs, and
  closeout evidence.
- Touched files or paths:
  - `scripts/local-validation-plan.cjs`
  - `scripts/planning-db-surface-inventory-check.test.cjs`
  - `scripts/verify-prepush.test.cjs`
  - `scripts/governance-refresh.cjs`
  - `scripts/governance-refresh.test.cjs`
  - `scripts/generate-governance-remediation-queue.cjs`
  - `scripts/generate-governance-remediation-queue.test.cjs`
  - `docs/guides/testing-and-ci-capabilities.md`
  - `docs/planning/closeouts/20260601-local-dbfirst-command-dedupe-closeout.md`
- Expected outcome: default pre-push planning/governance script changes run one
  effective planning DB inventory check through `verify:changed`; full pre-push
  still runs explicit closeout inventory validation; `governance:refresh`
  validates final governance coverage/remediation reports from DB query views.
- Command/query rail impact: none. This is repository validation workflow
  orchestration, not product command/query behavior.

## Closeout Evidence

### Implementation

- Removed the default outer `planning:db:inventory:check` from
  `verify:prepush`; changed-slice planning DB inventory validation remains
  owned by `verify:changed`, and full pre-push mode still includes an explicit
  planning DB inventory closeout step.
- Reordered `governance:refresh` database stages so final governance
  coverage/remediation report generation runs after `governance:db:import` and
  `governance:db:check`.
- Set final governance coverage/remediation report stages to
  `DVT_GOVERNANCE_REPORT_SOURCE=db`.
- Normalized DB remediation task payload key order before rendering YAML so
  PostgreSQL JSONB key ordering cannot create byte drift against exported DB
  sources.
- Updated the Testing and CI Capabilities guide with the local dedupe and
  DB-sourced report posture.
- Updated the planning DB surface inventory contract so the default pre-push
  path is verified as delegated through `verify:changed`, while full pre-push
  remains verified as an explicit inventory closeout gate.

### Validation

- `node --test scripts/verify-prepush.test.cjs`
  - First run failed as expected because default pre-push still planned both
    `verify-changed` and `planning-db-inventory-check`.
  - Final targeted run passed, 20/20 tests.
- `node --test scripts/governance-refresh.test.cjs`
  - First run failed as expected because final coverage/remediation report
    stages still ran before governance DB import/check and without DB source.
  - Final targeted run passed, 7/7 tests.
- `node --test scripts/generate-governance-remediation-queue.test.cjs`
  - First DB-source equivalence run failed because JSONB task key order was not
    normalized.
  - Final targeted run passed, 6/6 tests.
- `node --test scripts/generate-governance-coverage-report.test.cjs` passed,
  4/4 tests.
- `node --test scripts/planning-db-surface-inventory-check.test.cjs`
  - First `pnpm test:planning:db` run failed because the inventory contract
    still expected default pre-push to call `planning:db:inventory:check`
    directly.
  - Final targeted run passed, 4/4 tests.
- `pnpm docs:feature-mechanization:implementation`
  - First `pnpm verify:prepush` run failed because
    `remediationGeneratedSources` and `normalizeTaskPayload` were not declared
    in the planning-state query-store feature mechanization symbols.
  - Final targeted run passed after updating the owning manifest.
- `node --test scripts/verify-prepush.test.cjs scripts/governance-refresh.test.cjs scripts/generate-governance-remediation-queue.test.cjs`
  passed, 32/32 tests.
- `pnpm test:planning:db` passed, 250/250 tests.
- `pnpm docs:sync` passed.
- `pnpm governance:refresh`
  - First run reached DB-sourced final reports but failed
    `governance:db:export:check` on
    `system-governance-remediation-queue.queue.yaml`, exposing DB JSONB key
    order drift.
  - Final run passed: generated surfaces stabilized after two passes,
    `governance:db:import` imported 5205 governance files and 58 components,
    `governance:db:check` passed, DB-sourced final coverage/remediation reports
    ran, and `governance:db:export:check` passed.
- `pnpm fix:changed` passed after `verify:prepush` exposed a Prettier-only
  formatting issue in `scripts/planning-db-surface-inventory-check.test.cjs`.
- `node --test scripts/planning-db-surface-inventory-check.test.cjs` passed
  after formatting, 4/4 tests.
- `pnpm verify:prepush` passed after the feature mechanization and formatting
  fixes.

### No-Debt / No-Stub Evidence

- No validation command, hook, or governance check was removed or relaxed.
- No stub, placeholder, fake success path, TODO, or debt entry was added.
- No product command/query rail changed; this is local validation and
  governance workflow orchestration only.
