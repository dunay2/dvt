---
slice: 20260316-platform-baseline-lock
date: 2026-03-16
last_reviewed: 2026-03-16
gap: M01
author: AI (GPT-5)
---

# Closeout: M01 - Platform baseline lock

## Think-First Analysis

### Problem summary

The repository has no explicit monorepo platform baseline even though local and
CI tooling already depend on one. Local development is currently on Node 22 and
pnpm 10, while CI defaults to Node 20 and pnpm 9, and the root manifest does
not declare `packageManager`.

### Root cause

The repository evolved package-by-package without a single declared platform
contract. Tooling assumptions are split between local installs, CI defaults,
and package-specific runtime requirements.

### Constraints and invariants

- `AGENTS.md` requires root-cause repair rather than continuing with ad hoc
  environment fixes.
- `docs/guides/ai-work-protocol.md` requires think-first before config changes.
- `docs/guides/testing-and-ci-capabilities.md` makes root commands and CI setup
  part of the operational baseline.
- This slice is only `M01`; it must not mix in peer/hoist policy from `M02`.

### Options considered

- Lock the platform baseline explicitly with `packageManager`, root engines,
  a CI setup action that defers to `packageManager`, and a minimal `.npmrc`
  documenting engine behavior.
  - Accepted. Smallest slice that turns implicit baseline into explicit contract.
- Fix only the CI action and leave root manifest unchanged.
  - Rejected. That preserves ambiguity for local development.
- Add full pnpm peer/hoist policy now.
  - Rejected. That belongs to `M02`, not `M01`.

Libraries evaluated:

- None. This is baseline/tooling configuration, not library adoption.

### Selected option and rationale

Declare the actual baseline directly:

- `packageManager: pnpm@10.28.0`
- root Node floor `>=20.0.0`
- CI setup action stops passing its own pnpm version and defers to
  `packageManager`
- minimal `.npmrc` documenting engine strictness
- restore the repository lint baseline to the last known compatible ESLint 9
  line so the declared platform still installs with
  `pnpm install --frozen-lockfile`

This gives one platform contract without prematurely deciding linker or peer
resolution policy. It also closes the existing manifest/lock drift instead of
leaving `M01` as a declared-but-uninstallable baseline.

### Rejected alternatives

- leaving pnpm major ambiguous
- leaving Node floor below package runtime reality
- bundling peer-resolution policy into this first slice
- keeping ESLint 10 while the repo still depends on a plugin combination that
  was already proven incompatible in CI and precommit

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - `package.json`
  - `.github/actions/setup-node-pnpm/action.yml`
  - new `.npmrc`
  - `pnpm-lock.yaml`
  - this closeout file
- Expected outcome:
  - local and CI baseline stop drifting on Node/pnpm
  - the repo declares a platform contract explicitly
  - the root lockfile becomes installable again with `--frozen-lockfile`
- Risks and mitigations:
- risk: reusable workflows may still hardcode pnpm separately from the
  repository contract
  - mitigation: remove the duplicate pnpm version from the shared setup action
  - risk: raising Node floor breaks unsupported local environments
  - mitigation: Node 20 is already the CI default and Temporal worker already
    requires `>=20`
- Out-of-scope items:
  - peer/hoist/linker policy
  - workspace script graph cleanup
  - TypeScript alias restructuring
- Validation plan:
  - `pnpm docs:sync`
  - `pnpm lint:md`
  - `pnpm docs:quality:check`
  - `pnpm docs:canonical:check`
  - verify `pnpm --version` locally
- Test coverage plan:
  - configuration slice; validation is static/tooling, not runtime feature tests
- Libraries evaluated:
  - None

## Changes made

| File                                                                  | Change                                                                           | Why                                                                              |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `package.json`                                                        | Added `packageManager`, raised engine floors, and restored `eslint` to `^9.39.4` | Lock the platform baseline and keep lint on the last known compatible major line |
| `.github/actions/setup-node-pnpm/action.yml`                          | Removed the duplicated pnpm version input                                        | Keep the reusable CI setup aligned with the single declared root baseline        |
| `.npmrc`                                                              | Added explicit `engine-strict=false`                                             | Make engine behavior explicit instead of relying on local defaults               |
| `pnpm-lock.yaml`                                                      | Regenerated from the aligned manifest baseline                                   | Remove manifest/lock drift so `--frozen-lockfile` works again                    |
| `docs/planning/closeouts/20260316-platform-baseline-lock-closeout.md` | Recorded think-first, scope, validation, and evidence                            | Required closeout for `M01`                                                      |

## Libraries evaluated

- None.

## Docs synced

- [x] `docs/planning/proposals/monorepo-platform-optimization-plan-20260316.md` - implementation follows `M01`
- [x] `docs/planning/index.md` - checked via `docs:sync`

## Test evidence

| Command                             | Result                                                           |
| ----------------------------------- | ---------------------------------------------------------------- |
| `pnpm --version`                    | Passed (`10.28.0`)                                               |
| `node --version`                    | Passed (`v22.19.0`)                                              |
| `pnpm install --no-frozen-lockfile` | Passed                                                           |
| `pnpm install --frozen-lockfile`    | Passed                                                           |
| `pnpm docs:sync`                    | Passed                                                           |
| `pnpm lint:md`                      | Passed                                                           |
| `pnpm docs:quality:check`           | Passed with pre-existing non-English warnings outside this slice |
| `pnpm docs:canonical:check`         | Passed                                                           |

## Debt introduced

None.
