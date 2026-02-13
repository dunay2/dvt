# Repository structure — current vs recommended

## Purpose

This document summarizes the repository's _current file layout_ and the _recommended monorepo layout_ (Option A). It also includes a short migration checklist and verification commands you can run locally or in CI.

---

## 1) Current structure (high level)

- root/
  - CHANGELOG.md
  - README.md
  - docs/
  - runbooks/
  - .github/
  - engine/ (legacy top-level engine folder — **deprecated**)
  - adapters/ (legacy top-level adapters folder — **deprecated**)
  - packages/
    - adapter-postgres/
    - adapter-temporal/
    - cli/
    - contracts/
    - engine/
    - ...
  - scripts/
  - test/ (legacy)
  - pnpm-workspace.yaml, tsconfig.base.json, vitest.config.ts

Notes:

- `packages/*` already contains canonical packages and most implementation.
- Some legacy folders (`engine/`, `adapters/`, `test/`) remain in the repo and were converted to README/redirects or left for archival.

---

## 2) Recommended canonical structure (monorepo — Option A)

- root/
  - CHANGELOG.md
  - README.md
  - docs/
  - runbooks/
  - .github/
  - packages/
    - @dvt/contracts/ # contract types & normative interfaces
      - src/
      - tsconfig.json
      - package.json
    - @dvt/engine/ # engine core (domain + application + infra adapters stubs)
      - src/
      - test/
      - tsconfig.json
      - package.json
    - @dvt/adapter-postgres/ # adapter implementation / design + tests
      - src/
      - package.json
    - @dvt/adapter-temporal/ # adapter MVP / stubs
      - src/
      - package.json
    - @dvt/cli/ # tooling & scripts as a package
      - src/ or scripts/
      - package.json
    - examples/ (optional)
    - workers/ (optional)
  - scripts/ # dev scripts (can be converted to @dvt/cli)
  - pnpm-workspace.yaml
  - tsconfig.base.json
  - vitest.config.ts

Guiding rules:

- Packages are the single source-of-truth for code and types.
- Top-level `engine/`, `adapters/`, `test/` should be deprecated/archived after migration.
- CI should run `pnpm -r build && pnpm -r test && pnpm -r lint`.

---

## 3) Migration checklist (practical steps)

1. Ensure `@dvt/contracts` is complete and exported — compile & tests. ✅
2. Move engine core to `packages/engine/src` (already done for most files). ✅
3. Move each adapter into `packages/adapter-*` and wire package.json deps. ✅
4. Update root and per-package `tsconfig.json` & `tsconfig.test.json` entries. ✅
5. Update `.eslintrc.json` parserOptions.project to include `./packages/*/tsconfig.json`. ✅
6. Replace top-level implementation copies with deprecation `README.md` (or archive). ✅/follow-up
7. Run full verification: `pnpm -r build && pnpm -r test && pnpm -r lint` in CI. ✅
8. Create small, focused PRs for final cleanup (remove legacy folders, lint/style fixes). recommended.

---

## 4) Acceptance criteria

- `pnpm -r build` completes without TypeScript errors for all packages.
- `pnpm -r test` passes for all packages that contain tests (engine tests green).
- `pnpm -r lint` reports no `parserOptions.project` errors and no blocking errors.
- No duplicate code remains across top-level `engine/` vs `packages/engine` (legacy archived).

---

## 5) Quick verification commands

- pnpm -r build
- pnpm -r test
- pnpm -r lint
- gh pr create --fill (open PR for review)

---

## 6) Recommendation / next PRs

- PR A: final lint/style fixes (import ordering, explicit return types).
- PR B: archive/remove legacy `engine/` and `adapters/` after review.
- PR C: finalize CI workflow enabling (`test.yml`, `contracts.yml`, `golden-paths.yml`).

---

## 7) References

- Migration issue tracking: #76 (monorepo consolidation)
- Current migration PR: see open PR(s) on the branch `refactor/monorepo-packages`.

---

(Generated summary — keep this file under `docs/` or root as a migration reference.)
