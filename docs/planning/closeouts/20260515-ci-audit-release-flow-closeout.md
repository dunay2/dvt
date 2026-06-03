---
title: CI audit release flow closeout
status: Accepted
owner: CI / Delivery
last_reviewed: 2026-05-15
planning_type: closeout
---

# CI Audit Release Flow Closeout

## Task

`C/CI-AUDIT-RELEASE-FLOW` asked whether `.github/workflows/release.yml` should
adopt the repository checkout and shared Node/pnpm setup action, or whether the
current `release-please` workflow is intentionally action-only.

## Decision

The current release workflow remains action-only by design.

`release.yml` delegates release PR, changelog, tag, and GitHub release
generation to `googleapis/release-please-action`. It does not execute
repository-local scripts, read generated artifacts, install dependencies, or
publish packages. Adding checkout and `.github/actions/setup-node-pnpm` now
would make the workflow look consistent while adding no executable requirement.

If release automation later grows repository-local behavior, such as package
builds, generated artifact checks, npm publication, or repo scripts, that slice
must add `actions/checkout` and the shared setup action together with the new
release behavior.

## Fowler Review

| Scenario                     | Opportunity         | Fowler pattern                  | DDD owner          | Command/query rail                      | Implementation surfaces                                                                                                           | Test                 |
| ---------------------------- | ------------------- | ------------------------------- | ------------------ | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| Release workflow consistency | Documentation drift | Explicit Policy / Separate Ways | CI delivery policy | none - operational workflow policy only | `.github/workflows/release.yml`, `docs/planning/status/release-please-continuous.md`, `tools/ci/workflow-pattern-parity.test.mjs` | `pnpm test:ci-tools` |

## Evidence

- `docs/planning/status/release-please-continuous.md` now records the
  action-only release posture and the condition that would require checkout and
  shared Node/pnpm setup.
- `tools/ci/workflow-pattern-parity.test.mjs` now guards that `release.yml`
  uses `release-please-action` without `actions/checkout`, the shared setup
  action, or `pnpm` commands.

## Validation

- `pnpm test:ci-tools`
- `pnpm lint:md:changed`
- `pnpm verify:prepush`

## No-Debt Closeout

No workflow shortcut, stub, placeholder, or hidden release behavior was added.
The task closes as an explicit exception with an executable CI-tools guard.
