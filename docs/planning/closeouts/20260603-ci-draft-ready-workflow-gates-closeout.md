---
title: CI draft-ready workflow gates closeout
status: Accepted
owner: engineering
last_reviewed: 2026-06-03
planning_type: closeout
---

# CI Draft-Ready Workflow Gates Closeout

## Think-First Analysis

- Problem summary: several pull-request workflows either spent detector runners
  on draft PRs or skipped draft PRs without listening for reviewability changes.
  That created both avoidable CI cost while a PR is not reviewable and coverage
  risk when a draft becomes reviewable without another synchronize event.
- Root cause: draft posture was encoded independently per workflow instead of
  as a consistent CI scope-policy rule. `Test Suite` already has a
  `ready_for_review` route. `PR Quality Gate`, `CodeQL`, and
  `Dependency Review` had draft skip guards without that route, while
  `Contracts & Determinism` still ran its detector for drafts. Remote PR
  validation also exposed that ARC docs checks used raw triple-dot diffs against
  a shallow merge checkout, which can lack a local merge base.
- Constraints and invariants: GitHub workflows remain authoritative merge
  gates; heavy gates may be skipped for drafts but must reopen before merge and
  close again when a ready PR is converted back to draft; security gates must
  keep public/GHAS availability guards; package tests remain owned by
  `Test Suite`; the change must stay under the existing
  `EmitWorkflowCapabilityScopes` rail and architecture test contracts.
- Options considered:
  - Keep current behavior: rejected because it preserves draft runner cost in
    Contracts and can leave security/quality gates skipped after draft-to-ready.
  - Remove draft skips everywhere: rejected because it restores unnecessary
    runner use for work that is not yet reviewable.
  - Normalize draft-aware triggers and detector guards: selected because it
    keeps drafts cheap, restores coverage automatically on `ready_for_review`,
    and cancels ready-PR work when `converted_to_draft` makes the PR
    non-reviewable again.
- Selected option and rationale: add explicit `pull_request` activity types with
  `ready_for_review` and `converted_to_draft` to draft-aware workflows, add a
  draft guard to the Contracts detector, and prove the policy through the
  workflow architecture test. This is a small CI-policy change with direct cost
  and coverage impact.

## Fowler Opportunity Matrix

| Scenario                            | Opportunity                             | Fowler signal                             | DDD owner                  | Rail                           | Surfaces                                                                                                           | Tests                                                   | Out of scope                    |
| ----------------------------------- | --------------------------------------- | ----------------------------------------- | -------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- | ------------------------------- |
| Draft PR opens while still changing | Avoid runner spend before reviewability | Duplicate Work / Over-eager Resource Use  | Repository CI scope policy | `EmitWorkflowCapabilityScopes` | `.github/workflows/contracts.yml`                                                                                  | `node --test tools/ci/workflow-pattern-parity.test.mjs` | Removing merge gates            |
| Draft PR becomes ready              | Restore skipped merge-gate coverage     | Hidden Coverage Gap                       | Repository CI scope policy | `EmitWorkflowCapabilityScopes` | `.github/workflows/pr-quality-gate.yml`, `.github/workflows/codeql.yml`, `.github/workflows/dependency-review.yml` | `node --test tools/ci/workflow-pattern-parity.test.mjs` | Running heavy lanes while draft |
| Ready PR returns to draft           | Cancel stale ready-PR gate work         | Cancellation Gap                          | Repository CI scope policy | `EmitWorkflowCapabilityScopes` | draft-aware workflows                                                                                              | `node --test tools/ci/workflow-pattern-parity.test.mjs` | Cancelling push/manual runs     |
| Shallow PR merge checkout           | Keep ARC/docs diff reliable             | Shallow Checkout Fragility                | Repository CI scope policy | `EmitWorkflowCapabilityScopes` | `tools/ci/git-diff-files.mjs`, `tools/ci/arc-check.mjs`, `tools/ci/doc-check.mjs`                                  | `node --test tools/ci/git-diff-files.test.mjs`          | Full-history checkout           |
| CI policy evolves                   | Prevent drift between workflows         | Primitive obsession / duplicate semantics | Repository CI scope policy | `EmitWorkflowCapabilityScopes` | `tools/ci/workflow-pattern-parity.test.mjs`, docs                                                                  | `pnpm verify:changed`                                   | New CI orchestration service    |

## Pre-Implementation Brief

- Mode: Slim.
- Scope: normalize draft-aware pull-request activity types and draft guards for
  CI/CD workflows; update docs and plan evidence.
- Touched paths: `.github/workflows/contracts.yml`,
  `.github/workflows/pr-quality-gate.yml`, `.github/workflows/codeql.yml`,
  `.github/workflows/dependency-review.yml`,
  `tools/ci/workflow-pattern-parity.test.mjs`,
  `tools/ci/git-diff-files.mjs`, `tools/ci/arc-check.mjs`,
  `tools/ci/doc-check.mjs`,
  `docs/guides/testing-and-ci-capabilities.md`, and the AI CI preflight plan.
- Expected outcome: draft PRs avoid Contracts detector runners, all
  draft-skipped quality/security workflows rerun automatically when marked
  ready for review, and ready-to-draft transitions re-evaluate the draft guard
  through `converted_to_draft`.
- Risks and mitigations: workflow trigger drift is mitigated with a static
  architecture test; security workflow availability guards remain unchanged.
- Out of scope: branch protection changes, billing failures, changing Code
  Quality/Test Suite ownership, or replacing GitHub Actions.

## Validation Plan

- `node --test tools/ci/workflow-pattern-parity.test.mjs`
- `node --test tools/ci/git-diff-files.test.mjs`
- `pnpm verify:changed`
- `pnpm governance:refresh`
- `pnpm verify:prepush`

## No-Debt And No-Stub Evidence

- No check is disabled for ready pull requests.
- No hook or validation shortcut is required.
- No placeholder, TODO, fake success path, or new debt item is introduced.
