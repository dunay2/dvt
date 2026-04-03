---
title: TypeScript 6 Migration Defer Decision
status: Draft
owner: Product / Architecture / Delivery
last_reviewed: 2026-04-03
planning_type: proposal
---

# TypeScript 6 Migration Defer Decision

## Goal

Decide whether migrating the repository from `TypeScript 5.9.3` to `TypeScript 6`
is worth doing now.

## Current Baseline

- Repository baseline is healthy on `TypeScript 5.9.3`.
- `pnpm verify:prepush` currently passes.
- `baseUrl` deprecation cleanup is already handled in `tsconfig` surfaces
  without requiring a compiler major upgrade.

## Decision

Defer the TypeScript 6 migration for now.

This is a defer decision, not a rejection. The migration is considered valid but
not justified at this time against current product and delivery priorities.

## Why Not Now

The expected change is repo-wide and cross-cutting:

- manifest and lockfile churn across many workspaces
- lint/parser compatibility movement and possible policy drift
- potential `tsc`, lint, and test fallout across packages and apps
- broad review and CI noise during active runtime and contract work

At this point, that cost is high while product-facing gain is limited.

## Tradeoff Matrix

| Option            | Benefit                                                                     | Cost                                                                       | Risk                                                                                    | Recommendation                                |
| ----------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------- |
| Migrate now       | Modernize compiler baseline immediately; reduce future TS7 distance         | High repo-wide churn in manifests, lockfile, and validation surfaces       | Medium-high cross-package breakage and CI instability while active slices are in flight | Not recommended now                           |
| Prepare and defer | Preserves optionality with lower immediate disruption                       | Moderate planning and maintenance overhead without immediate runtime value | Medium risk of partial prep drift if not re-evaluated with clear trigger                | Secondary option if prep is explicitly funded |
| Defer fully now   | Keeps focus on active product/runtime priorities and avoids migration churn | No immediate modernization step                                            | Low short-term risk; medium long-term risk if never revisited                           | Recommended now                               |

## Cost

Expected migration cost if executed now:

- workspace manifest churn (`typescript` pins and ranges)
- `pnpm-lock.yaml` regeneration and review noise
- parser/plugin alignment changes for `@typescript-eslint/*`
- potential resolution or diagnostics differences in `tsc --noEmit`
- package and app-level lint/test stabilization work
- expanded PR review burden and CI runtime variance

## Impact

- Primary impact is internal engineering and toolchain operations.
- Direct product impact is near zero for current user-facing capabilities.
- No clear runtime or API feature unlock has been identified that depends on
  TypeScript 6 in this repository today.

## Gain

Real gains exist, but are currently non-urgent:

- cleaner forward path toward TS7 readiness
- newer compiler baseline with stricter behavior in some diagnostics areas
- reduced future migration delta

These gains are recognized, but they do not currently outweigh migration cost
and risk.

## Risks

If migration is attempted now:

- cross-package breakage due to compiler/toolchain behavior changes
- urgency bias causing low-value churn to displace higher-value slices
- review bandwidth diversion from active contractual/runtime tasks
- merge conflicts and instability from concurrent large-scope refactors

If migration is deferred:

- delayed modernization and postponed compiler uplift
- future migration window may still require coordination effort

## Recommendation

Keep the repository on `TypeScript 5.9.3` until a concrete trigger appears.

This is not "never migrate". This is "do not spend repo-wide migration budget
until the gain is concrete".

## Revisit Triggers

Re-open the migration when at least one of these is true:

1. TS5 blocks a dependency or platform upgrade needed by the repo.
2. TS6 fixes a concrete compiler or tooling issue affecting this repo.
3. A roadmap slice requires TS6-only capability.
4. A later approved TS7 preparation plan makes TS6 a required stepping stone.

## Governance Note

This document is intentionally kept as a proposal-only record at user direction.
`planning-control-tower.md` normally prefers linking proposals to an execution
work item, but that linkage is intentionally deferred in this slice.

## References

- [`package.json`](../../../package.json)
- [`tsconfig.json`](../../../tsconfig.json)
- [`tsconfig.package-bundler.base.json`](../../../tsconfig.package-bundler.base.json)
- [`tsconfig.node-runtime.base.json`](../../../tsconfig.node-runtime.base.json)
- [`docs/architecture/typescript-package-classification.md`](../../architecture/typescript-package-classification.md)
- [`docs/planning/closeouts/20260318-typescript-package-classification-closeout.md`](../closeouts/20260318-typescript-package-classification-closeout.md)
- TypeScript 6 migration assessment discussed in planning session dated 2026-04-03.
