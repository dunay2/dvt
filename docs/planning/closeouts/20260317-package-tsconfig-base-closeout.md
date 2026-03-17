---
slice: package-tsconfig-base
date: 2026-03-17
gap: monorepo-platform
author: AI (Codex)
---

# Closeout: Shared Package Tsconfig Base

## Think-First

### Problem summary

Several core packages still duplicate the same TypeScript package compiler
policy and the same `dist/*.d.ts` alias strategy in their local
`tsconfig.json` files.

The duplication is concentrated in:

- `packages/@dvt/run-domain/tsconfig.json`
- `packages/@dvt/engine/tsconfig.json`
- `packages/@dvt/delivery/tsconfig.json`

### Root cause

The repo already separated app-level TypeScript policy, but package-level
configs still carry copy-pasted compiler settings and package-consumption alias
maps. That means any future alias or compiler policy shift requires repeated
manual edits across multiple packages that share the same bundler-oriented
build model.

### Constraints and invariants

- `AGENTS.md` requires think-first before edits, real validation, and no hidden
  debt.
- `docs/guides/ai-work-protocol.md` requires options considered before
  implementation.
- `docs/guides/testing-and-ci-capabilities.md` governs what validations count.
- `ADR-0018` keeps shared-kernel ownership explicit, so any shared base must
  preserve declared package boundaries and must not invent undeclared import
  shortcuts.
- This slice must not change package runtime format, emitted files, or export
  maps. It is config deduplication only.
- This slice must not force unlike package families together. `Bundler`
  packages and special cases such as `@dvt/adapter-postgres`,
  `@dvt/adapter-temporal`, `@dvt/traceability-service`, and `@dvt/planner`
  stay outside this first cut.

### Options considered

1. Keep package-local duplication.
   Rejected: it preserves drift and repeated maintenance in the exact area the
   monorepo cleanup is targeting.
2. Extract a shared base for the homogeneous `Bundler` package family and let
   each package keep only its package-specific alias additions.
   Selected: lowest-risk slice that reduces duplication without crossing into
   package-specific behavior.
3. Move all package alias policy into `tsconfig.base.json`.
   Rejected: `tsconfig.base.json` remains the source-alias baseline for package
   development against `src/**`; this slice is about package consumption of
   built `dist/**`.
4. Rebuild package resolution around project references or export-map-only
   resolution immediately.
   Rejected for this slice: directionally interesting, but broader than needed
   and likely to entangle CI and package build semantics.

Libraries evaluated:

- None added. The relevant established pattern is shared TypeScript base
  configs, not a missing dependency.

### Selected option and rationale

Create a root package-focused shared base for the common `Bundler` package
policy and the most common `dist/*.d.ts` aliases, then migrate the first
homogeneous package family to extend it:

- `@dvt/run-domain`
- `@dvt/engine`
- `@dvt/delivery`

Packages that only partially match the pattern stay untouched in this slice.

### Rejected alternatives

- Fold package and app policies into one universal base.
  Rejected because apps are `NodeNext` consumers while this package family is
  `Bundler`-based and emits declarations for other workspaces.
- Include `@dvt/adapter-temporal` in the first package base.
  Rejected because its config differs materially and already avoided local
  alias duplication.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - add a shared package tsconfig base for the first homogeneous package family
  - migrate `run-domain`, `engine`, and `delivery`
  - leave special-case packages unchanged
- Touched files or paths:
  - `tsconfig.package-bundler.base.json`
  - `packages/@dvt/run-domain/tsconfig.json`
  - `packages/@dvt/engine/tsconfig.json`
  - `packages/@dvt/delivery/tsconfig.json`
  - this closeout
- Expected outcome:
  - one shared package base reduces repeated compiler policy and common aliases
  - package-local tsconfigs keep only their package-specific differences
- Risks and mitigations:
  - risk: over-generalizing aliases and breaking a package-specific import path
  - mitigation: keep package-specific alias extensions local and validate each
    affected package individually
  - risk: conflating `Bundler` packages with special-case packages
  - mitigation: keep `adapter-temporal`, `traceability-service`, and `planner`
    out of this slice
- Out-of-scope items:
  - CI graph simplification
  - project references
  - export-map-only resolution
  - non-homogeneous package families
  - `@dvt/adapter-postgres` module/runtime baseline changes
- Validation plan:
  - `pnpm --filter @dvt/run-domain build`
  - `pnpm --filter @dvt/run-domain test`
  - `pnpm --filter @dvt/engine build`
  - `pnpm --filter @dvt/engine test`
  - `pnpm --filter @dvt/delivery build`
  - `pnpm --filter @dvt/delivery test`
  - `pnpm docs:sync`
  - `pnpm docs:quality:check`
  - `pnpm docs:canonical:check`
  - `markdownlint` for this closeout
- Test coverage plan:
  - no new runtime behavior is introduced
  - validate build and existing test entry points for every touched package
  - treat any package-specific break as a reason to narrow the shared base
- Libraries evaluated:
  - None added

## Changes made

| File                                                                 | Change                                                                                                                            | Why                                                                                                                            |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `tsconfig.package-bundler.base.json`                                 | Added a shared base for the first homogeneous package family using `ES2022` + `Bundler` with the repeated strict compiler policy. | Centralizes repeated package compiler policy without changing package-local alias intent.                                      |
| `packages/@dvt/run-domain/tsconfig.json`                             | Reduced local config to `extends`, package-specific `paths`, and package-local include/exclude settings.                          | Removes duplicated compiler policy while preserving the package's explicit dependency on built `@dvt/contracts` declarations.  |
| `packages/@dvt/engine/tsconfig.json`                                 | Reduced local config to `extends`, package-specific `paths`, and package-local include/exclude settings.                          | Removes duplicated compiler policy while preserving explicit built-package aliases for `@dvt/contracts` and `@dvt/run-domain`. |
| `packages/@dvt/delivery/tsconfig.json`                               | Reduced local config to `extends`, package-specific `paths`, and package-local include/exclude settings.                          | Removes duplicated compiler policy while preserving the package's explicit built-package alias for `@dvt/contracts`.           |
| `docs/planning/closeouts/20260317-package-tsconfig-base-closeout.md` | Recorded think-first, narrowed scope, and validation evidence.                                                                    | Keeps the slice compliant with repo governance and explicit about excluded special cases.                                      |

## Libraries evaluated

None added.

## Docs synced

- [x] `docs/planning/closeouts/20260317-package-tsconfig-base-closeout.md` - think-first and planned evidence for this slice

## Test evidence

| Command                               | Result                                                                                                                        |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @dvt/run-domain build` | Passed                                                                                                                        |
| `pnpm --filter @dvt/run-domain test`  | Passed                                                                                                                        |
| `pnpm --filter @dvt/engine build`     | Passed                                                                                                                        |
| `pnpm --filter @dvt/engine test`      | Passed                                                                                                                        |
| `pnpm --filter @dvt/delivery build`   | Passed                                                                                                                        |
| `pnpm --filter @dvt/delivery test`    | Passed                                                                                                                        |
| `pnpm exec prettier --write ...`      | Passed; `packages/@dvt/delivery/tsconfig.json` required an outside-sandbox rerun after a Windows `EPERM` on the first attempt |
| `pnpm docs:sync`                      | Passed                                                                                                                        |
| `pnpm docs:quality:check`             | Passed with pre-existing non-blocking warnings outside this slice                                                             |
| `pnpm docs:canonical:check`           | Passed                                                                                                                        |
| `pnpm exec markdownlint-cli2 ...`     | Passed                                                                                                                        |

## Debt introduced

None.

## No-stub evidence

No stubs, placeholders, fake adapters, or partial implementations were added.
