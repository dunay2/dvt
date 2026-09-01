---
title: AI-Targeted Governance Report Test Routing Closeout
status: Draft
owner: ci
last_reviewed: 2026-06-01
planning_type: closeout
---

# AI-Targeted Governance Report Test Routing Closeout

## Think-First Analysis

- Problem summary: after the local DB-first command dedupe, AI-sized edits to
  governance report generators still lacked an exact changed-slice test route.
  That left agents choosing between generic changed-file checks and running the
  full planning DB suite for small report-rendering or DB-source normalization
  changes.
- Root cause: `verify:changed` had adjacent routing for planning workflow
  scripts such as `governance-refresh.cjs`, but not for
  `generate-governance-coverage-report.cjs` or
  `generate-governance-remediation-queue.cjs`.
- Selected option: add exact adjacent test routing for the two governance report
  generators and their test files. This optimizes for AI agents by preserving a
  short, deterministic feedback loop while still proving the changed generator
  behavior directly.
- Command/query rail impact: none. This changes local validation routing only;
  no product command or query semantics changed.

## Closeout Evidence

### Implementation

- Added `verify:changed` tests proving governance coverage/remediation report
  generator changes run their exact `node --test scripts/generate-governance-*`
  suites and do not escalate to `pnpm test:planning:db`.
- Added routing entries in `scripts/local-validation-plan.cjs` for both report
  generator sources and their test files.
- Updated `docs/guides/testing-and-ci-capabilities.md` to document the
  AI-targeted adjacent-test posture.

### Validation

- `node --test scripts/verify-changed.test.cjs`
  - First run failed as expected because report generator changes did not route
    to their adjacent tests.
  - Final targeted run passed, 11/11 tests.
- `node --test scripts/generate-governance-coverage-report.test.cjs` passed,
  4/4 tests.
- `node --test scripts/generate-governance-remediation-queue.test.cjs` passed,
  6/6 tests.
- `pnpm docs:sync` passed.
- `pnpm verify:prepush` passed. The changed-slice plan ran docs/metadata gates,
  feature mechanization implementation, `verify-changed` and `verify-prepush`
  self-tests, formatting, ESLint, and forbidden-file checks without escalating
  to `pnpm test:planning:db`.

### No-Debt / No-Stub Evidence

- No validation command, hook, or governance check was removed or relaxed.
- No stub, placeholder, fake success path, TODO, or debt entry was added.
- No product command/query rail changed; this is local validation routing only.
- The AGENTS-cited Lane C AI efficiency review path
  `docs/planning/reviews/ci-and-delivery/20260328-lane-c-ai-efficiency-and-cost-review.md` was
  not present in this checkout, so the active governance inventory and testing
  guide governed this slice.
