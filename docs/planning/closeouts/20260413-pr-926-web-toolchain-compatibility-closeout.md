---
slice: PR-926
date: 2026-04-13
last_reviewed: 2026-04-13
author: AI (Codex)
---

# Closeout: PR-926 - Web toolchain compatibility for `@vitejs/plugin-react` 6

## Think-First Analysis

- Problem summary: PR 926 bumped `@vitejs/plugin-react` from `4.7.0` to `6.0.1`, but the web workspace still pinned `vite` to `6.3.5`, so the web build failed in CI.
- Root cause: `@vitejs/plugin-react@6.0.1` is a Vite 8 plugin and imports Vite internals that are not exported by Vite 6. The PR upgraded only the React plugin, not the rest of the web build stack required by that major line.
- Constraints and invariants: keep the fix real and mergeable under `AGENTS.md`; validate against the actual failing CI surface first per `docs/guides/pr-preflight-and-ci-triage.md`; preserve a canonical dependency graph rather than masking peer incompatibility with overrides.
- Options considered:
  - revert the plugin bump or pin it indirectly: rejected because it makes the PR green by undoing its purpose
  - add a pnpm override to force an older runtime under a newer specifier: rejected as hidden debt and misleading compatibility
  - align the web workspace to the major line required by the new plugin: selected
- Selected option and rationale: upgrade the `apps/web` Vite stack to versions compatible with `@vitejs/plugin-react@6.0.1`, validate the affected workspace locally, then run the repository pre-push gate.
- Rejected alternatives: broad repository-wide Vitest migration was not needed because the affected web workspace validated cleanly without it.

## Pre-Implementation Brief

- Mode: Slim
- Scope: `apps/web/package.json`, `pnpm-lock.yaml`, and this closeout record
- Expected outcome: PR 926 stops failing `Workspace CI (web)` and remains a truthful dependency update instead of a suppressed incompatibility
- Risks and mitigations:
  - risk: Vite 8 could break the web workspace build or tests
  - mitigation: run `build`, `typecheck`, and `test` for `@dvt/web` before `pnpm verify:prepush`
- Out-of-scope items: repository-wide Vite/Vitest modernization outside the affected web workspace
- Validation plan: `pnpm --filter @dvt/web build`, `pnpm --filter @dvt/web typecheck`, `pnpm --filter @dvt/web test`, `pnpm docs:sync`, `pnpm verify:prepush`
- Test coverage plan: rely on the existing `@dvt/web` suite to cover both UI happy paths and negative-path state handling after the toolchain alignment
- Libraries evaluated: `@vitejs/plugin-react`, `vite`, `@tailwindcss/vite`, `vitest`

## Changes Made

| File                                                                              | Change                                                                                   | Why                                                          |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `apps/web/package.json`                                                           | Upgraded `vite` to `8.0.8`, `@tailwindcss/vite` to `4.2.2`, and `tailwindcss` to `4.2.2` | Align the web build stack with `@vitejs/plugin-react@6.0.1`  |
| `pnpm-lock.yaml`                                                                  | Refreshed the lockfile for the updated web toolchain                                     | Keep the workspace graph deterministic and installable in CI |
| `docs/planning/closeouts/20260413-pr-926-web-toolchain-compatibility-closeout.md` | Recorded root cause, decision, and validation evidence                                   | Meet canonical closeout and traceability requirements        |

## Validation Evidence

| Command                                           | Result                                                                                                                 |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `gh run view 24351741267 --job 71107761705 --log` | PASS - root cause identified as `ERR_PACKAGE_PATH_NOT_EXPORTED` from `@vitejs/plugin-react@6.0.1` against `vite@6.3.5` |
| `pnpm --filter @dvt/web build`                    | PASS                                                                                                                   |
| `pnpm --filter @dvt/web typecheck`                | PASS                                                                                                                   |
| `pnpm --filter @dvt/web test`                     | PASS - 74 files, 354 tests                                                                                             |

## Debt Introduced

None. No version masking, compatibility shims, stubs, or hidden overrides were added.

## Known Residuals

- The repository still contains Vitest 3.x in the shared toolchain, but the affected web workspace validated cleanly after the Vite alignment, so no broader test-runner migration was required for this slice.
