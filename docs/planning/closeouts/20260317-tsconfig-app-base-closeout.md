---
slice: tsconfig-app-base
date: 2026-03-17
last_reviewed: 2026-03-17
gap: monorepo-platform
author: AI (Codex)
---

# Closeout: Shared App Tsconfig Base

## Think-First

### Problem summary

`apps/api`, `apps/outbox-worker`, `apps/lineage-worker`, and
`apps/projector-worker` each carry a near-duplicate `tsconfig.json` with the
same NodeNext compiler policy and repeated workspace `dist/*.d.ts` alias maps.

### Root cause

The repo cleaned up script graphs first, but the TypeScript layer still encodes
monorepo structure through copied app-local `paths` blocks. That makes every
alias or package move a four-file edit even when the policy is identical.

### Constraints and invariants

- `AGENTS.md` requires think-first before edits, real validation, and no hidden
  debt.
- `docs/guides/ai-work-protocol.md` requires options considered before
  implementation.
- `docs/guides/testing-and-ci-capabilities.md` governs what validations count.
- `ADR-0018` keeps shared-kernel package boundaries explicit, so alias policy
  must not blur ownership or invent undeclared cross-package shortcuts.
- This slice must not change runtime module format or package build outputs; it
  only removes duplicated config.

### Options considered

1. Keep app-local `tsconfig` files duplicated.
   Rejected: cheap now, expensive forever; every alias drift becomes repeated
   maintenance.
2. Introduce a shared app-focused tsconfig base for the NodeNext apps and move
   common workspace `dist` aliases there.
   Selected: minimal blast radius and direct reduction in duplication.
3. Replace aliases immediately with project references or package export based
   resolution everywhere.
   Rejected for this slice: right direction long-term, but broader and riskier
   than needed for the first app-focused cleanup.

Libraries evaluated:

- None added. The established pattern here is TypeScript shared base configs,
  not a missing dependency.

### Selected option and rationale

Add a root `tsconfig.app-node.base.json` that captures the common NodeNext app
policy and shared workspace `dist` aliases. Then make the four NodeNext apps
extend it and keep only their app-specific `rootDir`, `outDir`, and `include`
settings locally.

### Rejected alternatives

- Put the app aliases into `tsconfig.base.json`.
  Rejected because `tsconfig.base.json` currently serves package development
  aliases to `src/**`, not app consumption of built `dist/**`.
- Create a universal base for apps and packages together.
  Rejected because the packages use different module resolution modes
  (`Bundler` vs `NodeNext`) and would force unrelated coupling.

## Changes made

| File                                  | Change                                                                                                         | Why                                                                                                               |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `tsconfig.app-node.base.json`         | Added a shared NodeNext app base with the common workspace `dist/*.d.ts` alias map and strict compiler policy. | Removes duplicated app-local alias policy while keeping app consumption pointed at built package outputs.         |
| `apps/api/tsconfig.json`              | Reduced local config to `extends`, `outDir`, `rootDir`, and `include`.                                         | Keeps API app-specific settings only and moves shared policy into the base config.                                |
| `apps/outbox-worker/tsconfig.json`    | Reduced local config to `extends`, `outDir`, `rootDir`, and `include`.                                         | Keeps worker-specific settings only and removes duplicated NodeNext alias configuration.                          |
| `apps/lineage-worker/tsconfig.json`   | Reduced local config to `extends`, `outDir`, `rootDir`, and `include`.                                         | Keeps worker-specific settings only and removes duplicated NodeNext alias configuration.                          |
| `apps/projector-worker/tsconfig.json` | Reduced local config to `extends`, `outDir`, `rootDir`, and `include`.                                         | Keeps projector-specific settings only and preserves its wider `rootDir` while removing duplicated shared policy. |

## Libraries evaluated

None added.

## Docs synced

- [x] `docs/planning/closeouts/20260317-tsconfig-app-base-closeout.md` - think-first and evidence for this slice

## Test evidence

| Command                                        | Result                                                                             |
| ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| `pnpm --filter dvt-api typecheck`              | Passed                                                                             |
| `pnpm --filter dvt-api build`                  | Passed                                                                             |
| `pnpm --filter dvt-api test`                   | Passed                                                                             |
| `pnpm --filter dvt-outbox-worker typecheck`    | Passed                                                                             |
| `pnpm --filter dvt-outbox-worker build`        | Passed                                                                             |
| `pnpm --filter dvt-outbox-worker test`         | Passed on rerun after one transient `@dvt/delivery build` failure inside `pretest` |
| `pnpm --filter dvt-lineage-worker typecheck`   | Passed                                                                             |
| `pnpm --filter dvt-lineage-worker build`       | Passed                                                                             |
| `pnpm --filter dvt-projector-worker typecheck` | Passed                                                                             |
| `pnpm --filter dvt-projector-worker build`     | Passed                                                                             |
| `pnpm --filter dvt-projector-worker test`      | Passed                                                                             |
| `pnpm exec prettier --write ...`               | Passed                                                                             |
| `pnpm docs:sync`                               | Passed                                                                             |
| `pnpm docs:quality:check`                      | Passed with pre-existing non-blocking warnings outside this slice                  |
| `pnpm docs:canonical:check`                    | Passed                                                                             |
| `pnpm exec markdownlint-cli2 ...`              | Passed                                                                             |

## Debt introduced

None.

## No-stub evidence

No stubs, placeholders, fake adapters, or partial implementations were added.
This slice only centralizes duplicated TypeScript app config into a shared base.
