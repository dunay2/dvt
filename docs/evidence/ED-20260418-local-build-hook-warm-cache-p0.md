---
title: Local build hook warm-cache P0 ARC-2 evidence
status: Accepted
date: 2026-04-18
owners:
  - '@dvt/contracts'
  - apps/lineage-worker
  - apps/outbox-worker
  - apps/projector-worker
  - apps/temporal-worker
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/package.json
  - apps/lineage-worker/package.json
  - apps/outbox-worker/package.json
  - apps/projector-worker/package.json
  - apps/temporal-worker/package.json
  - scripts/README.md
  - docs/guides/testing-and-ci-capabilities.md
evidence:
  tests:
    - pnpm --filter @dvt/contracts build
    - pnpm --filter dvt-lineage-worker build
    - pnpm --filter dvt-lineage-worker typecheck
    - pnpm --filter dvt-lineage-worker test
    - pnpm --filter dvt-projector-worker build
    - pnpm --filter dvt-projector-worker typecheck
    - pnpm --filter dvt-projector-worker test
    - pnpm --filter dvt-temporal-worker build
    - pnpm --filter dvt-temporal-worker typecheck
    - pnpm --filter dvt-temporal-worker test
    - pnpm --filter dvt-outbox-worker build
    - pnpm --filter dvt-outbox-worker typecheck
    - pnpm --filter dvt-outbox-worker test
    - pnpm docs:sync
    - pnpm verify:prepush
---

# Summary

This slice extends the existing `DVT_CI` hook-short-circuit model to the four
worker apps that still rebuilt their dependency closure unconditionally during
`prebuild` and `pretypecheck`.

It also removes `--force` from `@dvt/contracts` so normal TypeScript project
incrementality can participate in repeated warm local builds, and documents the
guardrail that `DVT_CI=1` is only safe on already-built worktrees or after an
explicit graph build.

# Key checks

- Worker-app `prebuild` and `pretypecheck` now use the same
  `skip-pretest-if-ci.cjs` guard already used elsewhere in the repo.
- `@dvt/contracts` no longer forces a rebuild on every package build
  invocation.
- Canonical operator docs state when `DVT_CI=1` is safe locally and when it is
  not.
- Validation evidence covers the touched workspaces plus the repo pre-push
  gate.

# Risk posture

Residual risk is tracked in
`docs/risk-register/quality/R-20260418-LOCAL-BUILD-HOOK-WARM-CACHE-P0.yaml`.
