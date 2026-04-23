---
title: Environment Configuration Audit - DVT Monorepo
status: Active
owner: CI / Delivery
last_reviewed: 2026-04-22
planning_type: review
---

# Environment Configuration Audit - DVT Monorepo

## Scope

This review captures an operator-provided environment and configuration audit
for the DVT monorepo and reconciles it with the current repository state.

It is intended to:

- preserve the audit in a canonical planning review surface
- separate confirmed findings from outdated or already-resolved observations
- identify the highest-return follow-ups without creating parallel planning truth

## Source and verification posture

- Source material: operator-authored environment audit shared on 2026-04-22;
  the original input was in Spanish and has been normalized to English for the
  canonical repo docs surface
- Verification method: direct read of `package.json`, `turbo.json`,
  `.github/actions/setup-node-pnpm/action.yml`, `.github/workflows/*.yml`,
  `eslint.config.cjs`, `vitest.config.ts`, `pnpm-lock.yaml`, and
  [`docs/guides/testing-and-ci-capabilities.md`](../../../guides/testing-and-ci-capabilities.md)
- Related prior art:
  - [20260328 Lane C AI efficiency and cost review](./20260328-lane-c-ai-efficiency-and-cost-review.md)
  - [20260330 CI performance review and action plan](./20260330-ci-performance-review-and-action-plan.md)
  - [20260401 CI process review](./20260401-ci-process-review.md)

This review complements those earlier CI reviews. It does not supersede them.

## Executive summary

The audit is directionally strong and worth preserving. Its highest-value points
are still:

1. align the local Node baseline with the real runtime and CI baseline
2. expand Turbo beyond `build`
3. reduce avoidable local and CI work on non-runtime changes

Two important caveats emerged during verification:

1. some findings are already partially addressed in the current repo state
2. a few proposed fixes need deeper integration work than the audit implies

Most notably, the shared CI setup already caches both the pnpm store and
`node_modules`, and workflow scope logic is more centralized than older CI
reviews implied. By contrast, the Node version drift, limited Turbo graph, root
type-check orchestration, permanent pre-commit determinism rebuild, and low
coverage thresholds remain real concerns.

## Finding-by-finding assessment

### 1. Package manager and workspace baseline

| Topic                 | Operator claim                                                 | Current repo state                                                                                              | Assessment |
| --------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------- |
| pnpm version          | `pnpm@10.28.0`                                                 | `packageManager: "pnpm@10.28.0"` in `package.json`                                                              | Confirmed  |
| Node pin file         | missing `.nvmrc` / `.node-version`                             | neither file exists at repo root                                                                                | Confirmed  |
| `engines.node`        | says `>=20.19.0`, while CI uses 22.x and real stack expects 22 | `package.json` still declares `>=20.19.0`; shared CI setup defaults to Node `22`; multiple workflows pin `22.x` | Confirmed  |
| frozen lockfile in CI | present                                                        | shared setup action defaults `install-args` to `--frozen-lockfile`                                              | Confirmed  |

Assessment:

- This is a good catch and a clean candidate for follow-up work.
- The repo currently advertises a broader Node compatibility range than the
  effective toolchain it actually exercises.
- The cheapest improvement is to add a root Node pin file and align
  `engines.node` with the CI/runtime baseline.

Recommendation:

- Add `.node-version` with `22`.
- Consider adding `.nvmrc` as well if the team relies on `nvm`.
- Tighten `engines.node` to a Node 22 baseline instead of leaving the repo at
  `>=20.19.0`.

### 2. Turbo usage

| Topic                             | Operator claim | Current repo state                                                  | Assessment |
| --------------------------------- | -------------- | ------------------------------------------------------------------- | ---------- |
| Turbo installed                   | yes            | `turbo: 2.9.6` in `package.json`                                    | Confirmed  |
| Turbo task coverage               | only `build`   | `turbo.json` defines only `build`                                   | Confirmed  |
| test/typecheck/lint outside Turbo | yes            | root scripts still orchestrate them outside `turbo`                 | Confirmed  |
| remote cache absent               | yes            | no `TURBO_TOKEN`, `TURBO_TEAM`, or `.turbo` cache step in workflows | Confirmed  |

Assessment:

- This remains the highest-return technical recommendation in the audit.
- The repo already treats `pnpm build` as the canonical Turbo-backed root
  build, but `type-check`, `test`, and docs flows still use custom orchestration.
- The proposed `turbo.json` expansion is directionally right.

Caution:

- Adding `typecheck` and `test` tasks is not just a config flip. The repo also
  has governed affected-workspace logic under `tools/ci/scope-config.mjs`,
  `emit-workspace-matrix.mjs`, and `emit-scope.mjs`.
- Any Turbo expansion should be aligned with those existing CI scope surfaces
  rather than accidentally creating a second affected-workspace truth.

Recommendation:

- Treat this as a planned CI/tooling slice, not a quick tweak.
- Prioritize `test` and `typecheck` before `lint`.
- Decide explicitly whether the source of truth for affected execution becomes
  Turbo filters, the existing scope emitters, or a hybrid model.

### 3. TypeScript project references and incremental graphing

| Topic                         | Operator claim                      | Current repo state                                                                                        | Assessment |
| ----------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------- |
| strict TS baseline            | strong                              | root and package TS usage remains strict                                                                  | Confirmed  |
| project references absent     | no `references` / `composite` graph | no package-level `references` graph was found                                                             | Confirmed  |
| incremental benefit underused | partial                             | Turbo stores `*.tsbuildinfo`, but root type-check still builds selected packages then runs `tsc --noEmit` | Confirmed  |

Assessment:

- The diagnosis is fair.
- The specific proposal needs more depth than "turn on `composite: true` in
  each package".

Caution:

- `composite: true` without a coherent `references` graph and `tsc -b` adoption
  does not deliver the full benefit.
- The repo currently mixes package-local builds, root `tsc --noEmit`, and
  Turbo-backed build orchestration. Project references need to fit that model.

Recommendation:

- Run this as a scoped design/proof slice before rollout.
- Start with a small package cluster and validate build-mode behavior, emitted
  artifacts, IDE ergonomics, and interaction with existing package build scripts.

### 4. ESLint posture

| Topic                             | Operator claim | Current repo state                                                                                 | Assessment |
| --------------------------------- | -------------- | -------------------------------------------------------------------------------------------------- | ---------- |
| flat config                       | yes            | `eslint.config.cjs` is flat-config based                                                           | Confirmed  |
| TypeScript-aware linting          | yes            | parser uses `tsconfig.eslint.json`                                                                 | Confirmed  |
| determinism rules                 | strong         | determinism-specific linting remains part of root scripts and docs                                 | Confirmed  |
| `eslint-plugin-import` still used | yes            | config imports `eslint-plugin-import` and package depends on it                                    | Confirmed  |
| apps/web rules relaxed            | yes            | `apps/web` explicitly disables about seven rules, including `no-explicit-any` and `no-unused-vars` | Confirmed  |

Assessment:

- The audit is accurate here.
- Migrating from `eslint-plugin-import` to `eslint-plugin-import-x` is a valid
  performance idea, but it is not as high-value as the Node/Turbo items.

Caution:

- This repo uses `@eslint/compat` with `fixupPluginRules(importPlugin)`.
- A drop-in migration should be benchmarked and smoke-tested rather than
  assumed risk-free.

Recommendation:

- Treat `import-x` as a low-risk, medium-value optimization candidate.
- Keep the `apps/web` relaxed rules visible as explicit technical debt instead
  of hiding them behind the global lint posture.

### 5. CI workflows and caching

| Topic                                    | Operator claim | Current repo state                                                             | Assessment       |
| ---------------------------------------- | -------------- | ------------------------------------------------------------------------------ | ---------------- |
| actions pinned to SHAs                   | yes            | workflows and composite action are SHA pinned                                  | Confirmed        |
| concurrency/cancel-in-progress           | good           | current workflows use concurrency controls                                     | Confirmed        |
| pnpm store cache present                 | yes            | shared setup action caches pnpm store                                          | Confirmed        |
| `node_modules` cache absent              | no             | shared setup action already caches `node_modules`                              | Outdated         |
| Turbo cache absent                       | yes            | no Turbo cache layer is configured in CI                                       | Confirmed        |
| push-to-main full suite is costly        | yes            | `test.yml` still includes a full recursive push lane                           | Mostly confirmed |
| pre-commit determinism rebuild is costly | yes            | `precommit` still runs `lint-staged && pnpm lint:determinism` for every commit | Confirmed        |

Assessment:

- The audit is partly stale here, but still useful.
- The repo has already implemented a dual cache in the shared setup action:
  pnpm store plus `node_modules`.
- The stronger remaining CI observations are the lack of Turbo cache and the
  unconditional local pre-commit determinism build.

Additional nuance:

- Workflow scope logic is now more centralized than earlier reviews described.
  The canonical docs point to `tools/ci/scope-config.mjs`,
  `tools/ci/emit-workspace-matrix.mjs`, and `tools/ci/emit-scope.mjs` as the
  shared policy surfaces.
- That means some older "duplication everywhere" concerns have already been
  reduced, even though execution cost is still not where it should be.

Recommendation:

- Keep the Turbo cache proposal.
- Rework the pre-commit determinism gate with path scoping or a split local/CI
  strategy, but only if the deterministic-runtime guard remains blocking for
  engine and Temporal workflow changes.

### 6. Testing and coverage posture

| Topic                        | Operator claim    | Current repo state                                                   | Assessment |
| ---------------------------- | ----------------- | -------------------------------------------------------------------- | ---------- |
| Vitest 3.2.4                 | yes               | root deps pin `vitest` and `@vitest/*` to `3.2.4`                    | Confirmed  |
| coverage provider `v8`       | yes               | root `vitest.config.ts` uses `provider: "v8"`                        | Confirmed  |
| thresholds low               | 65 / 55 / 65 / 65 | root `vitest.config.ts` still uses those thresholds                  | Confirmed  |
| full test runs are expensive | yes               | root `pnpm test` remains recursive and CI still has full-suite lanes | Confirmed  |

Assessment:

- The audit is right that coverage thresholds are modest.
- Raising them is reasonable, but it should follow an explicit package-by-package
  coverage strategy rather than a single repo-wide number bump.

Caution:

- The root coverage config shown here includes `packages/@dvt/engine/src/**`.
- A threshold increase may be easy to set technically but should be justified by
  actual coverage quality and ownership expectations, not only by optics.

Recommendation:

- Keep this as a medium-priority hardening item.
- Tie any threshold uplift to a targeted review of which packages should be
  covered by root policy versus package-local coverage gates.

### 7. Dependency duplication

| Topic                           | Operator claim        | Current repo state                                       | Assessment |
| ------------------------------- | --------------------- | -------------------------------------------------------- | ---------- |
| duplicate `ajv` versions        | `8.17.1` and `8.18.0` | both versions appear in `pnpm-lock.yaml`                 | Confirmed  |
| Vitest overrides already pinned | yes                   | root `pnpm.overrides` pins `vitest` and related packages | Confirmed  |

Assessment:

- This is real but lower priority than the runtime/tooling issues above.
- An override for `ajv` is justified only if the duplication creates concrete
  install, bundle, or validation behavior issues.

Recommendation:

- Do not force an `ajv` override purely for cosmetic dedupe.
- Address it when there is a specific problem or when a broader dependency
  hygiene pass is already underway.

## Updated priority order

| Priority | Recommendation                                               | Impact | Effort | Notes                                                  |
| -------- | ------------------------------------------------------------ | ------ | ------ | ------------------------------------------------------ |
| P1       | Align local Node pin and `engines.node` with Node 22         | High   | Low    | Clear drift between declared and real baseline         |
| P1       | Expand Turbo beyond `build` and decide cache strategy        | High   | Medium | Best return, but must align with current scope tooling |
| P2       | Reduce unconditional `lint:determinism` cost in pre-commit   | Medium | Medium | Keep deterministic-runtime protection intact           |
| P2       | Design TypeScript project references properly before rollout | Medium | Medium | Do not treat `composite: true` as sufficient by itself |
| P3       | Benchmark `eslint-plugin-import-x` migration                 | Medium | Low    | Useful optimization, not first-order                   |
| P3       | Raise coverage thresholds with package ownership plan        | Medium | Low    | Technically easy, policy-sensitive                     |
| P4       | Normalize duplicate `ajv` only if it causes a real issue     | Low    | Low    | Hygiene item, not a forcing function                   |

## Overall judgment

This is a useful audit. The strongest parts are the identification of Node
baseline drift, underused Turbo orchestration, and avoidable CI/pre-commit
costs.

The main thing I would change is not the direction, but the framing:

- treat Turbo expansion and TS project references as designed infrastructure
  changes, not simple toggles
- mark the `node_modules` cache finding as already resolved in current repo state
- treat coverage and dependency cleanup as secondary to runtime/tooling posture

If this audit is used to open work, the best first slice is:

1. pin Node 22 locally and in `engines`
2. write a short design review for Turbo `test` / `typecheck` adoption
3. narrow the unconditional pre-commit determinism cost without weakening the
   deterministic-runtime guard
