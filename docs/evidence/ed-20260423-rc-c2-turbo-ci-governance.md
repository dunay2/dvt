---
title: RC-C2 Turbo CI and docs governance ARC-2 evidence
status: Accepted
date: 2026-04-23
owners:
  - '@dvt/contracts'
  - '@dvt/engine'
  - '@dvt/planner'
  - '@dvt/adapter-temporal'
  - ci
  - docs
arc_level: ARC-2
breaking: false
code_refs:
  - turbo.json
  - package.json
  - .github/actions/setup-node-pnpm/action.yml
  - .github/workflows/ci.yml
  - scripts/run-turbo-workspace-task.cjs
  - scripts/type-check-prepush.cjs
  - scripts/run-determinism-precommit.cjs
  - scripts/check-generated-docs-policy.cjs
  - tools/ci/turbo-workspace-task-contract.test.mjs
  - tools/ci/prepush-typecheck-scope.test.mjs
  - tools/ci/generated-docs-single-writer-policy.test.mjs
  - docs/generated-docs-policy.json
  - docs/guides/testing-and-ci-capabilities.md
evidence:
  tests:
    - pnpm test:ci-tools
    - pnpm verify:prepush
    - pnpm build
    - pnpm ci:affected:typecheck
    - pnpm ci:affected:test
    - GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs
---

# Summary

This evidence covers the RC-C2 Turbo and CI governance integration PR. The
change expands Turbo from a build-only local helper into a governed task graph
for affected build, type-check, and test paths, and it hardens the surrounding
CI and documentation gates so the optimized paths cannot silently skip contract
or governance checks.

# Runtime and contract impact

The PR touches `package.json` files under contract, engine, planner, and
adapter workspaces to expose consistent `typecheck` task contracts. The change
does not alter runtime APIs or contract schemas; it changes the repository
validation surface used by CI, pre-push, and Turbo task routing.

# Validation results

Fresh local validation for the integrated branch showed:

- `pnpm test:ci-tools` passed with 62 tests.
- `pnpm verify:prepush` passed, including generated-doc policy validation,
  changed-doc gates, forbidden generated-file checks, and full root
  `pnpm type-check` for global graph inputs.
- `pnpm build` completed through Turbo with 24 of 24 build tasks restored from
  local cache on the warm-cache measurement path.
- `pnpm ci:affected:typecheck` completed through the governed Turbo wrapper.
- `pnpm ci:affected:test` completed through the governed Turbo wrapper.
- `GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs` classified
  the integrated PR as ARC-2 and confirmed evidence and risk artifacts are
  required for the contract, engine, planner, and adapter package-script touch
  points.

# Risk posture

Residual risk is tracked in
`docs/risk-register/quality/R-20260423-RC-C2-TURBO-CI-GOVERNANCE.yaml`.
