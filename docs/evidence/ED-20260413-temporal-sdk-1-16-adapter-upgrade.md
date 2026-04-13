---
title: Validate Temporal SDK 1.16 upgrade for adapter-temporal
status: Accepted
date: 2026-04-13
owners:
  - packages/@dvt/adapter-temporal
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-temporal/package.json
  - pnpm-lock.yaml
  - packages/@dvt/adapter-temporal/test
evidence:
  tests:
    - pnpm --filter @dvt/adapter-temporal build
    - pnpm --filter @dvt/adapter-temporal test
    - pnpm docs:sync
    - pnpm verify:prepush
---

## Summary

PR 925 upgrades the Temporal TypeScript SDK packages used by
`@dvt/adapter-temporal` from `1.15.0` to `1.16.0`.

The red CI signal on the PR was not caused by runtime or test failures. The PR
already passed the adapter-temporal workspace CI and related test suites, but
it failed the ARC-2 governance gate because adapter changes require both an
evidence document and a quality risk update.

## What was checked

1. Confirmed ARC policy on the branch with
   `GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs`.
2. Confirmed the PR diff touches `packages/@dvt/adapter-temporal/package.json`
   and `pnpm-lock.yaml`, which is enough to trigger ARC-2 for adapters.
3. Reviewed the Temporal 1.16 release notes carried in the Dependabot PR body
   and checked the repository for `Nexus` usage.
4. Searched the repository for `Nexus` / `nexus` references and found no active
   usage in `@dvt/adapter-temporal`, `@dvt/engine`, or `apps/`.
5. Re-ran adapter-temporal package validation locally to confirm the governed
   dependency bump remains green after adding the required docs.

## Result

The upgrade is acceptable for the current repository usage profile.

- The touched adapter package builds successfully.
- The touched adapter package test suite passes successfully.
- No active repository usage depends on the `Nexus` APIs called out as breaking
  in the upstream `1.16.0` release notes.
- The remaining risk is compatibility drift if future adapter code starts using
  `Nexus`-specific APIs without re-evaluating the pinned SDK line; that residual
  risk is captured in the linked quality risk update.

## Residual risk posture

The main residual risk is not the current bump itself, but future silent use of
Temporal `Nexus` APIs that were not exercised by this repository at the time of
the upgrade. The risk entry records that concern and the mitigation baseline:
package validation, CI coverage, and explicit re-review if Nexus usage is later
introduced.
