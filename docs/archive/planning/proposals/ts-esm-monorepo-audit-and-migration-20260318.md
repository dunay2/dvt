---
title: TS + ESM Monorepo â€” Audit and Migration Execution Plan
status: Archived
owner: Core Architecture
last_reviewed: 2026-03-20
planning_type: proposal
---

# TS + ESM Monorepo â€” Audit and Migration Execution Plan

Historical implemented proposal retained for reference. Active policy lives in
[Package Module Build Policy v2](../../../planning/proposals/package-module-build-policy-v2-20260317.md),
and closure evidence lives in
[ED-20260319 - TS + ESM Monorepo Migration](../../../evidence/supporting/ED-20260319-ts-esm-monorepo-migration.md).

## Governing Sources

- [Package Module Build Policy v2](../../../planning/proposals/package-module-build-policy-v2-20260317.md) - target model
- [Repository Governance Proposal Set 2026-03-17](../../../planning/proposals/repository-governance-proposal-set-20260317.md) - proposal context
- AGENTS.md â€” agent operational rules
- Root `tsconfig.json`, `tsconfig.base.json`, `tsconfig.package-bundler.base.json`, `tsconfig.app-node.base.json`

## Purpose

This document records:

1. The current state of TypeScript and ESM configuration across all workspaces
   as of 2026-03-18.
2. Flagged deviations from the canonical model defined in the Build Policy v2.
3. A sequenced migration execution plan organized by cohort and risk.

This document does not supersede `package-module-build-policy-v2-20260317.md`.
It implements it.

---

## 1. Module Strategy Fragmentation â€” Current State

Three distinct module resolution strategies coexist in the monorepo.

| Chain                          | Base config                          | `module`   | `moduleResolution` | `target` | Workspaces                                                                                                                                   |
| ------------------------------ | ------------------------------------ | ---------- | ------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| A â€” CJS legacy               | `tsconfig.base.json`                 | `commonjs` | `node`             | `ES2021` | adapter-postgres, adapter-temporal, canonical, cli, dsl, observability, observability-otel, plan-interpreter, planner-contracts, state-store |
| B â€” ESM/Bundler (shared)     | `tsconfig.package-bundler.base.json` | `ES2022`   | `Bundler`          | `ES2022` | engine, delivery, run-domain                                                                                                                 |
| C â€” ESM/Bundler (standalone) | none / base+override                 | `ES2022`   | `Bundler`          | `ES2022` | contracts, planner, plan-verifier, traceability-service                                                                                      |
| D â€” NodeNext (apps)          | `tsconfig.app-node.base.json`        | `NodeNext` | `NodeNext`         | `ES2022` | api, lineage-worker, outbox-worker, projector-worker                                                                                         |
| E â€” ESNext/Bundler (web)     | `tsconfig.base.json` + overrides     | `ESNext`   | `Bundler`          | `ES2022` | web                                                                                                                                          |
| F â€” Root type-check          | `tsconfig.json`                      | `commonjs` | `node`             | `ES2022` | root tsc only                                                                                                                                |

The target model defined in Build Policy v2 is **Chain B/C** (ESM/Bundler) for
library packages and **Chain D** (NodeNext) for Node.js app entrypoints.

Chain A (10 packages) represents the primary migration surface.

---

## 2. Flagged Issues

Issues are classified by severity: **critical** (runtime failure or broken
artifact), **structural** (build integrity or policy deviation), **minor**
(inconsistency without active breakage).

### 2.1 Critical

| ID   | Workspace               | Issue                                                                                                                                                                                     |
| ---- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-03 | `@dvt/state-store`      | `"type": "module"` in package.json but tsconfig inherits `module: commonjs` from Chain A base. Node.js treats `dist/*.js` as ESM; tsc emits CJS syntax. Guaranteed runtime `SyntaxError`. |
| F-04 | `@dvt/dsl`              | `main`, `types`, and all `exports` conditions point to `src/index.ts` (raw source), not `dist/`. Consumers receive the uncompiled TypeScript file.                                        |
| F-05 | `@dvt/adapter-temporal` | `tsconfig.json` `include` references `"vitest.config.cjs"` which does not exist. Only `vitest.config.ts` is present.                                                                      |
| F-06 | `@dvt/dsl`              | `scripts.test` calls `vitest run --config vitest.config.cjs`. File does not exist.                                                                                                        |
| F-07 | `@dvt/plan-interpreter` | Same as F-06.                                                                                                                                                                             |

### 2.2 Structural

| ID   | Workspace                            | Issue                                                                                                                                                                      |
| ---- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-01 | root `tsconfig.json`                 | `module: commonjs` + `moduleResolution: node` on the root type-check config, while root `package.json` declares `"type": "module"`.                                        |
| F-02 | `tsconfig.base.json`                 | Root base used by 10 packages. Sets `module: commonjs`, `moduleResolution: node`, `target: ES2021`. This is the origin of all Chain A issues.                              |
| F-08 | `@dvt/adapter-postgres`              | No `"type"` field. No `exports` map. Inherits CJS. Module intent is implicit.                                                                                              |
| F-09 | `@dvt/adapter-temporal`              | Same as F-08.                                                                                                                                                              |
| F-10 | `@dvt/canonical`                     | No `"type"` field. Dual `require`/`import` exports without a stated dual-mode policy. Inherits CJS.                                                                        |
| F-11 | `@dvt/cli`                           | `private: false` (published) but no `"type"` and no `exports` map. Inherits CJS.                                                                                           |
| F-12 | `@dvt/observability`                 | No `"type"` field. Dual exports. Inherits CJS.                                                                                                                             |
| F-13 | `@dvt/observability-otel`            | No `"type"` field. Dual exports. Inherits CJS.                                                                                                                             |
| F-14 | `@dvt/plan-interpreter`              | No `"type"` field. No `exports` map. Inherits CJS.                                                                                                                         |
| F-15 | `@dvt/planner-contracts`             | No `"type"` field. Dual exports. Inherits CJS.                                                                                                                             |
| F-16 | `@dvt/planner`                       | No `composite: true`. `vitest: "^1.6.0"` in devDependencies â€” semver incompatible with monorepo pin 3.2.4; only resolves via root `pnpm.overrides`.                      |
| F-17 | `@dvt/plan-verifier`                 | Same composite and vitest issues as F-16. `typescript: "^5.4.0"` â€” outdated range.                                                                                       |
| F-18 | `@dvt/traceability-service`          | No `composite: true`. No `exports` field. `vitest` absent from devDependencies. Standalone tsconfig not aligned with shared bases.                                         |
| F-22 | `tsconfig.package-bundler.base.json` | Includes `"DOM"` in `lib`. This base is used exclusively by Node.js packages (engine, delivery, run-domain).                                                               |
| F-23 | `tsconfig.base.json`                 | Alias `@dvt/crypto` is absent in `tsconfig.base.json`. Packages that extend the base cannot resolve `@dvt/crypto` via paths. Only the root `tsconfig.json` has this alias. |
| F-27 | root `tsconfig.json`                 | No `references` field. `tsc -b` at root is not usable for incremental cross-package builds.                                                                                |

### 2.3 Minor

| ID   | Workspace                            | Issue                                                                                                                                    |
| ---- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| F-19 | `apps/projector-worker`              | `rootDir: "."` with `include: ["src/**/*.ts", "test/**/*.test.ts"]`. Test files emitted to `dist/test/`.                                 |
| F-20 | `@dvt/web`                           | `allowImportingTsExtensions: true` without `noEmit` in the tsconfig file. `noEmit` only passed via CLI flag in the typecheck script.     |
| F-21 | `@dvt/web`                           | `module: ESNext` while all other bundler-mode packages use `module: ES2022`.                                                             |
| F-24 | `@dvt/engine`, `@dvt/delivery`       | `@types/node: 25.5.0` in devDependencies vs root-pinned `25.3.5`. The root override wins at install time; the declared version is stale. |
| F-25 | api, outbox-worker, projector-worker | Test runner is `node --import tsx --test` (Node built-in). All packages use Vitest. Incompatible APIs and reporting.                     |
| F-26 | `apps/lineage-worker`                | No `test` script.                                                                                                                        |

---

## 3. Migration Execution Plan

Migration follows the three-group order established in Build Policy v2:

1. Critical bug fixes (no module format change)
2. Structural cleanup for packages already on ESM/Bundler
3. Semantic migration for Chain A packages (CJS â†’ ESM)
4. Apps and workers cleanup

Each slice must not be merged without running the validation commands listed.

---

### Slice M-01 â€” Critical Fixes

**Scope:** Fix active breakage. No module format change. No semantic change.

**Target:**

| Package                 | Fix                                                                                                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@dvt/state-store`      | Either: extend `tsconfig.package-bundler.base.json` (preferred) OR remove `"type": "module"` from package.json if CJS is intentional. Decision required. |
| `@dvt/dsl`              | Change `main`, `types`, and all `exports` conditions from `src/index.ts` to `dist/index.js` and `dist/index.d.ts`.                                       |
| `@dvt/adapter-temporal` | Remove `"vitest.config.cjs"` from `tsconfig.json` `include` array.                                                                                       |
| `@dvt/dsl`              | Change `scripts.test` from `vitest.config.cjs` to `vitest.config.ts`.                                                                                    |
| `@dvt/plan-interpreter` | Change `scripts.test` from `vitest.config.cjs` to `vitest.config.ts`.                                                                                    |

**Risk:** Low. These are configuration bugs, not semantic module changes.

**Validation per package:**

```bash
pnpm --filter @dvt/state-store build
pnpm --filter @dvt/state-store test
pnpm --filter @dvt/dsl build
pnpm --filter @dvt/dsl test
pnpm --filter @dvt/adapter-temporal build
pnpm --filter @dvt/adapter-temporal test
pnpm --filter @dvt/plan-interpreter test
```

---

### Slice M-02 â€” Cohort 1 Structural Cleanup

**Scope:** Packages already on ESM/Bundler (Chain B and C). Fix structural
issues without changing module format.

**Target:**

| Package                              | Fix                                                                                                                     |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `@dvt/planner`                       | Add `composite: true`. Remove `vitest: "^1.6.0"` from devDependencies (rely on root pnpm.overrides).                    |
| `@dvt/plan-verifier`                 | Add `composite: true`. Remove `vitest: "^1.6.0"`. Update `typescript` range to `"^5.9.0"`.                              |
| `@dvt/traceability-service`          | Add `composite: true`. Add `exports` field to package.json. Add `vitest` to devDependencies or remove and rely on root. |
| `tsconfig.package-bundler.base.json` | Remove `"DOM"` from `lib`. Replace with `["ES2022"]`.                                                                   |
| `tsconfig.base.json`                 | Add `@dvt/crypto` path alias (mirrors root tsconfig.json mapping).                                                      |
| `@dvt/engine`, `@dvt/delivery`       | Remove stale `@types/node: 25.5.0` from devDependencies â€” rely on root pin.                                           |

**Risk:** Low. No module format or export interface changes.

**Validation:**

```bash
pnpm --filter @dvt/planner build
pnpm --filter @dvt/planner test
pnpm --filter @dvt/plan-verifier build
pnpm --filter @dvt/plan-verifier test
pnpm --filter @dvt/traceability-service build
pnpm --filter @dvt/traceability-service test
pnpm --filter @dvt/engine typecheck
pnpm --filter @dvt/delivery typecheck
pnpm type-check
```

---

### Slice M-03 â€” Chain A Semantic Migration (CJS â†’ ESM)

**Scope:** Migrate Chain A packages from `module: commonjs` to `module: ES2022`

- `moduleResolution: Bundler`. This is a **semantic module format change** â€” it
  must not be merged as a "cleanup".

**Pre-condition:** Verify that no package currently requires these packages via
CJS `require()`. Run:

```bash
grep -r "require(" packages/*/src packages/@dvt/*/src apps/*/src \
  --include="*.ts" -l
```

If CJS callers exist, they must be migrated or isolated before this slice runs.

**Per-package changes:**

| Package                   | `package.json` changes                                                                        | `tsconfig.json` changes                                                      |
| ------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `@dvt/adapter-postgres`   | Add `"type": "module"`. Add `exports` map.                                                    | Extend `tsconfig.package-bundler.base.json` instead of `tsconfig.base.json`. |
| `@dvt/adapter-temporal`   | Add `"type": "module"`. Add `exports` map.                                                    | Same tsconfig base change.                                                   |
| `@dvt/canonical`          | Add `"type": "module"`. Decide: keep dual `require`/`import` exports or simplify to ESM-only. | Change tsconfig base or standalone ESM config.                               |
| `@dvt/cli`                | Add `"type": "module"`. Add `exports` map.                                                    | Change tsconfig base.                                                        |
| `@dvt/observability`      | Add `"type": "module"`. Review dual exports.                                                  | Change tsconfig base.                                                        |
| `@dvt/observability-otel` | Add `"type": "module"`. Review dual exports.                                                  | Change tsconfig base.                                                        |
| `@dvt/plan-interpreter`   | Add `"type": "module"`. Add `exports` map.                                                    | Change tsconfig base.                                                        |
| `@dvt/planner-contracts`  | Add `"type": "module"`. Review dual exports.                                                  | Change tsconfig base.                                                        |

**Note on `.js` import extensions:** All source files in Chain A already use
`.js` extensions on relative imports. No source file changes needed for the
import style.

**Note on `tsconfig.base.json`:** After completing this slice, `tsconfig.base.json`
should only be used by packages that have an explicit, documented reason to
remain CJS. If no such packages remain, `tsconfig.base.json` can be deprecated
in favor of `tsconfig.package-bundler.base.json`.

**Risk:** HIGH. Module format change affects:

- Whether `dist/*.js` files are treated as ESM or CJS by Node.js
- Any downstream package that uses `require()`
- Temporal worker bundles (temporal adapter uses Temporal SDK bundler pipeline)

Adapter-temporal requires special attention: the Temporal worker build pipeline
(which bundles workflows) may have specific module requirements. Validate
against the Temporal build chain before merging.

**Validation per package:**

```bash
pnpm --filter @dvt/<package> build
pnpm --filter @dvt/<package> test
# For adapter-temporal: also validate
pnpm --filter @dvt/adapter-temporal test:integration  # if available
```

**Full regression after all packages in this slice:**

```bash
pnpm build
pnpm type-check
pnpm test
```

---

### Slice M-04 â€” Apps and Workers Cleanup

**Scope:** Fix minor issues in the `apps/*` layer without changing the NodeNext
strategy.

**Target:**

| App                     | Fix                                                                                                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/projector-worker` | Change `rootDir: "."` to `rootDir: "src"`. Remove test files from the build tsconfig include. Add separate `tsconfig.test.json` if tests need compilation.                                                               |
| `@dvt/web`              | Add `"noEmit": true` to `tsconfig.json` (currently only passed via CLI). Change `module: ESNext` to `module: ES2022` for consistency.                                                                                    |
| `apps/lineage-worker`   | Add `test` script.                                                                                                                                                                                                       |
| All apps                | Document decision on `node --import tsx --test` vs Vitest. If Vitest is chosen, migrate test runner. If the Node built-in test runner is intentional for apps, document as an explicit exception under the Build Policy. |

**Risk:** Low for projector-worker and web. Medium for test runner migration if
chosen.

**Validation:**

```bash
pnpm --filter dvt-projector-worker build
pnpm --filter dvt-projector-worker test
pnpm --filter @dvt/web typecheck
pnpm --filter @dvt/web build
```

---

### Slice M-05 â€” Root tsconfig and Project References (optional, post-M-03)

**Scope:** After Chain A migration completes, evaluate whether to introduce
TypeScript project references for incremental build support.

**Decision required:** Whether the root `tsconfig.json` should:

- Option A: Serve only as a type-check config (current use). Fix `module` and
  `moduleResolution` to match the monorepo's actual module strategy. Remove
  the stale CJS settings.
- Option B: Become a project references root. Add `references` for all
  `composite: true` packages. Enable `tsc -b` for incremental CI builds.

Option B requires all packages to have `composite: true` (completed in M-02)
and consistent `outDir`/`declaration` settings.

---

## 4. Execution Order Summary

```
M-01  Critical fixes           Low risk     Required before merging any other slice
M-02  Cohort 1 structural      Low risk     Can run in parallel with M-01 for different packages
M-03  Chain A CJS â†’ ESM        HIGH risk    Requires pre-condition check + post-merge regression
M-04  Apps cleanup             Low/medium   Can run independently after M-01
M-05  Root tsconfig/refs       Low risk     After M-02 + M-03 complete
```

---

## 5. Decisions

Decisions resolved 2026-03-18.

### D-01 â€” `@dvt/state-store` intent

**Decision: Option A â€” Migrate to ESM/Bundler.**

Rationale: consistent with the Chain B/C target. Resolves the runtime
`SyntaxError` without maintaining an isolated CJS package.

Pre-condition before M-01: verify no consumer calls `require('@dvt/state-store')`.

Action: change `tsconfig.json` to extend `tsconfig.package-bundler.base.json`.
Adjust `exports` in `package.json` to canonical ESM shape.

### D-02 â€” `@dvt/canonical` dual-mode

**Decision: Option A â€” ESM-only, unless reverse dependency analysis reveals
CJS consumers that cannot be migrated in the M-03 window.**

Rationale: dual-mode exports without a documented policy are undeclared
exceptions under Build Policy v2 and are not allowed.

Action before M-03: run `pnpm list --depth=1 --filter=@dvt/canonical` to
enumerate reverse dependencies. If all consumers are internal monorepo packages,
migrate to ESM-only. If an external CJS consumer exists that cannot be migrated,
document a dual-mode exception explicitly in `package.json` and Build Policy v2,
and add tests for both formats.

### D-03 â€” Apps test runner

**Decision: Option A â€” Migrate all apps to Vitest.**

Rationale: Vitest is the monorepo standard. Maintaining `node --import tsx --test`
alongside Vitest creates inconsistency in reporting, watch mode, and CI
integration. Migration cost is low.

Action in M-04: for each affected app (api, outbox-worker, projector-worker),
convert test files to Vitest APIs, add `vitest.config.ts`, and update the `test`
script. Remove `tsx` test runner invocations.

### D-04 â€” `tsconfig.base.json` retirement

**Decision: Option A â€” Deprecate after M-03 completes.**

Rationale: once all Chain A packages migrate to ESM/Bundler, `tsconfig.base.json`
serves no active purpose. Retaining it risks future accidental re-adoption of
CJS settings.

Action post-M-03: audit for any remaining `extends: ../../tsconfig.base.json`
references. If none remain, remove the file and update
`governance-document-rule-inventory.md`. If a package requires CJS for a
documented external reason, retain the file for that case only with an
explanatory comment block.

---

## 6. Relationship to Existing Proposals

| Document                                                                                                             | Relationship                                                                              |
| -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [package-module-build-policy-v2-20260317.md](../../../planning/proposals/package-module-build-policy-v2-20260317.md) | Defines the target model. This document implements it.                                    |
| [phase2-arch-debt-roadmap-20260315.md](../../../planning/proposals/phase2-arch-debt-roadmap-20260315.md)             | Architectural debt context. M-03 is a significant debt slice.                             |
| [ci-workflow-deduplication-plan-20260307.md](../../../planning/proposals/ci-workflow-deduplication-plan-20260307.md) | CI enforcement is a post-migration gate. M-05 aligns with its project references section. |
