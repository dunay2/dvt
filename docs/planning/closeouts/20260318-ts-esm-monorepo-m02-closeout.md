---
slice: ts-esm-monorepo-m02
date: 2026-03-18
gap: monorepo-platform
author: AI (Codex)
---

# Closeout: TS + ESM Monorepo M-02 Structural Cleanup

## Think-First

### Problem summary

The `ts-esm-monorepo-audit-and-migration-20260318.md` plan shows that the
critical slice M-01 is already largely reflected in the worktree, but the
structural M-02 slice remains open across:

- `@dvt/planner`
- `@dvt/plan-verifier`
- `@dvt/traceability-service`
- `tsconfig.package-bundler.base.json`
- `tsconfig.base.json`
- `@dvt/engine`
- `@dvt/delivery`

The repo also still mixes two package-consumption models:

- source aliases inherited from `tsconfig.base.json`
- package-boundary overrides to built `dist/*.d.ts`

That mixture must be handled carefully so the cleanup does not silently switch
packages from boundary consumption to cross-package source compilation.

### Root cause

The monorepo moved part of the package family to the shared bundler base, but
the remaining ESM/Bundler packages still carry local config drift:

- standalone tsconfig files duplicate shared compiler policy
- tool versions drift from the root baseline
- `tsconfig.package-bundler.base.json` still carries a Node-inappropriate `DOM`
  lib
- `tsconfig.base.json` still lacks the `@dvt/crypto` alias expected by packages
  that inherit the base

Separately, package-local overrides to built declarations still exist because
`tsconfig.package-bundler.base.json` inherits the repo-wide source alias map
from `tsconfig.base.json`. Removing those overrides without a broader alias or
project-reference migration causes TypeScript to resolve `@dvt/*` imports back
to package source files and breaks package isolation.

### Constraints and invariants

- `AGENTS.md` requires inventory-first work, real validation, and explicit
  no-debt/no-stub evidence.
- `docs/guides/ai-work-protocol.md` requires think-first and a pre-implementation
  brief before edits.
- `docs/guides/testing-and-ci-capabilities.md` governs which commands count as
  canonical validation.
- `docs/planning/proposals/package-module-build-policy-v2-20260317.md` defines
  the target library model as `type: "module"` plus `moduleResolution:
"Bundler"` and explicit package metadata.
- `docs/planning/proposals/ts-esm-monorepo-audit-and-migration-20260318.md`
  defines the execution order and keeps project references as a post-M-03 /
  M-05 decision, not an implicit local rewrite.
- `docs/planning/closeouts/20260317-package-tsconfig-base-closeout.md` already
  recorded that immediate replacement of built-package alias overrides with
  project references or export-map-only resolution was rejected for the earlier
  shared-base slice.
- This slice must stay structural: no semantic runtime module change, no hidden
  package-boundary rewrite, and no fake completion of M-03.

### Options considered

1. Leave M-02 untouched and jump directly to M-03.
   Rejected: it preserves known structural drift and makes the semantic CJS to
   ESM migration harder to validate.
2. Apply only the package metadata/version cleanup and leave tsconfig drift in
   place.
   Rejected: partial cleanup would keep duplicated compiler policy and the
   wrong shared `DOM` lib.
3. Complete M-02 as written, while documenting that built-package alias
   overrides remain necessary until a broader alias/reference migration.
   Selected: this advances the plan without smuggling M-05 into a structural
   slice.
4. Replace package-boundary overrides with project references right now.
   Rejected for this slice: the repo does not yet have a root project-reference
   build graph, and local verification showed that removing the overrides under
   the current inherited alias model breaks package isolation.

### Selected option and rationale

Execute M-02 cleanly and explicitly:

- align the already-ESM/Bundler packages with the shared bundler base
- remove tool-version drift against the root baseline
- correct the shared base library/alias drift
- keep boundary-preserving `dist/*.d.ts` overrides where they are still required
  by the current alias model

That narrows the remaining work before M-03 without introducing a second
migration inside this slice.

### Rejected alternatives

- Treat `state-store`'s local `paths` override as isolated debt and remove it in
  place.
  Rejected because verification shows the inherited source alias map then pulls
  `@dvt/contracts` source into the project and breaks `rootDir`/file-list
  isolation.
- Fold root `tsconfig.json` project references into this slice.
  Rejected because the plan explicitly places that evaluation in M-05.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - finish M-02 structural cleanup
  - document the verified reason package-boundary `dist/*.d.ts` overrides remain
    in place for now
  - run package-level validation for the touched packages and root type-check
- Touched files or paths:
  - `docs/planning/closeouts/20260318-ts-esm-monorepo-m02-closeout.md`
  - `tsconfig.package-bundler.base.json`
  - `tsconfig.base.json`
  - `packages/@dvt/planner/package.json`
  - `packages/@dvt/planner/tsconfig.json`
  - `packages/@dvt/plan-verifier/package.json`
  - `packages/@dvt/plan-verifier/tsconfig.json`
  - `packages/@dvt/traceability-service/package.json`
  - `packages/@dvt/traceability-service/tsconfig.json`
  - `packages/@dvt/engine/package.json`
  - `packages/@dvt/delivery/package.json`
- Expected outcome:
  - M-02 completes without changing runtime module semantics
  - already-ESM/Bundler packages converge on one shared base
  - root-pinned tool versions stop drifting in the affected packages
  - the repo keeps current package-boundary behavior explicit rather than
    accidentally falling back to cross-package source compilation
- Risks and mitigations:
  - risk: removing `DOM` from the shared bundler base may expose an implicit
    browser dependency in a Node package
  - mitigation: validate the affected packages individually and at root
  - risk: migrating standalone package tsconfigs to the shared base may drop a
    needed local compiler option
  - mitigation: preserve package-specific options and validate each package
  - risk: tool-version cleanup could surface scripts that rely on undeclared
    binaries
  - mitigation: run package tests/builds directly after each config family
    change
- Out-of-scope items:
  - M-03 CJS to ESM semantic migration
  - root project references and `tsc -b`
  - removal of package-boundary `dist/*.d.ts` overrides
  - app/worker cleanup from M-04
- Validation plan:
  - `pnpm --filter @dvt/planner build`
  - `pnpm --filter @dvt/planner test`
  - `pnpm --filter @dvt/plan-verifier build`
  - `pnpm --filter @dvt/plan-verifier test`
  - `pnpm --filter @dvt/traceability-service build`
  - `pnpm --filter @dvt/traceability-service test`
  - `pnpm --filter @dvt/engine typecheck`
  - `pnpm --filter @dvt/delivery typecheck`
  - `pnpm type-check`
  - `pnpm docs:sync`
- Test coverage plan:
  - no new runtime behavior is introduced
  - existing package build/type/test commands are the acceptance gate
  - any package that begins compiling another package's source is a failure for
    this slice
- Libraries evaluated:
  - None added

## Changes made

| File                                                               | Change                                                                                                                                                              | Why                                                                                                                                                        |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tsconfig.package-bundler.base.json`                               | Removed `DOM` from `lib` and kept the base Node-oriented.                                                                                                           | M-02 flagged the shared bundler base as carrying a browser lib even though the family is Node-only.                                                        |
| `tsconfig.base.json`                                               | Added `@dvt/crypto` and `@dvt/crypto/*` aliases.                                                                                                                    | Packages inheriting the base need the same alias coverage already present in the root type-check config.                                                   |
| `packages/@dvt/planner/package.json`                               | Removed stale local `vitest` drift and pinned `typescript` to the repo baseline.                                                                                    | Aligns the package with the root toolchain baseline.                                                                                                       |
| `packages/@dvt/planner/tsconfig.json`                              | Migrated to `tsconfig.package-bundler.base.json`, kept planner-only compiler flags, and preserved `@dvt/contracts` boundary resolution through `dist/*.d.ts` paths. | The package can share the common bundler policy, but it still needs the local boundary override to avoid falling back to cross-package source compilation. |
| `packages/@dvt/plan-verifier/package.json`                         | Removed stale `vitest` and pinned `typescript` to the repo baseline.                                                                                                | Fixes the dependency drift called out in M-02.                                                                                                             |
| `packages/@dvt/plan-verifier/tsconfig.json`                        | Migrated to `tsconfig.package-bundler.base.json`.                                                                                                                   | This package already matched the bundler family and did not need package-local path overrides.                                                             |
| `packages/@dvt/plan-verifier/src/planVersion.ts`                   | Stopped materializing `patch: undefined` when the optional field is absent.                                                                                         | Required once the shared base enables `exactOptionalPropertyTypes`.                                                                                        |
| `packages/@dvt/plan-verifier/src/verify.ts`                        | Built the version-check argument object conditionally so optional properties are omitted when absent.                                                               | Same exact-optional fix; keeps the existing API but makes it valid under the shared strict compiler policy.                                                |
| `packages/@dvt/traceability-service/package.json`                  | Added an `exports` map and aligned `typescript` / `vitest` to the repo baseline.                                                                                    | Closes the structural metadata/tooling drift called out in M-02.                                                                                           |
| `packages/@dvt/traceability-service/tsconfig.json`                 | Migrated to `tsconfig.package-bundler.base.json` and preserved `@dvt/contracts` boundary resolution through `dist/*.d.ts` paths.                                    | Shared bundler policy is now centralized, while package-boundary isolation remains explicit.                                                               |
| `packages/@dvt/engine/package.json`                                | Removed stale `@types/node` drift.                                                                                                                                  | The root override already pins `@types/node`; the package-local stale version was unnecessary drift.                                                       |
| `docs/planning/closeouts/20260318-ts-esm-monorepo-m02-closeout.md` | Recorded the analysis, implementation, validation, and residual status of the slice.                                                                                | Required by repo governance.                                                                                                                               |

## M-03 precondition review

- `rg -n 'require\(' packages/@dvt apps -g '*.ts'` returned no matches.
- This removes one stated blocker for M-03, but it does not by itself complete
  the semantic CJS to ESM migration.
- Reverse-dependency review for `@dvt/crypto` / `packages/@dvt/canonical` was
  not expanded into a full M-03 slice in this turn.

## Docs synced

- [x] `docs/planning/closeouts/20260318-ts-esm-monorepo-m02-closeout.md`
- [x] `docs/contracts/engine/index.md`
- [x] `docs/contracts/planner/index.md`
- [x] `docs/contracts/shared/index.md`

## Test evidence

| Command                                         | Result                                                                                              |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `pnpm --filter @dvt/planner build`              | Passed after preserving the local `@dvt/contracts` `dist/*.d.ts` override.                          |
| `pnpm --filter @dvt/planner test`               | Passed.                                                                                             |
| `pnpm --filter @dvt/plan-verifier build`        | Passed after exact-optional fixes in source.                                                        |
| `pnpm --filter @dvt/plan-verifier test`         | Passed with escalated execution because sandboxed Vitest failed to spawn `esbuild` (`spawn EPERM`). |
| `pnpm --filter @dvt/traceability-service build` | Passed after preserving the local `@dvt/contracts` `dist/*.d.ts` override.                          |
| `pnpm --filter @dvt/traceability-service test`  | Passed.                                                                                             |
| `pnpm --filter @dvt/engine build`               | Passed.                                                                                             |
| `pnpm --filter @dvt/delivery build`             | Passed.                                                                                             |
| `pnpm type-check`                               | Passed.                                                                                             |
| `pnpm docs:sync`                                | Passed.                                                                                             |
| `pnpm docs:canonical:check`                     | Passed.                                                                                             |

## No-debt evidence

- No new debt entry was created.
- No hooks were bypassed.
- No rule, lint, or type gate was relaxed.
- Existing planned drift remains open in one place:
  `packages/@dvt/delivery/package.json` still carries the stale local
  `@types/node` entry because `apply_patch` repeatedly failed on that file with
  a sandbox refresh error. This residual was not hidden and was not worked
  around with a policy downgrade.

## No-stub evidence

No stubs, placeholders, fake implementations, or unfinished success paths were
added.
