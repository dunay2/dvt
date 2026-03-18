---
slice: typescript-package-classification
date: 2026-03-18
gap: monorepo-platform
author: AI (Codex)
---

# Closeout: TypeScript Package Classification And Legacy Base Removal

## Think-First

### Problem summary

The repo currently mixes three concerns into confusing base-config inheritance:

- a legacy CommonJS base in `tsconfig.base.json`
- an ESM/Bundler package base in `tsconfig.package-bundler.base.json`
- a NodeNext app base in `tsconfig.app-node.base.json`

Several library packages still extend the legacy base while overriding
themselves back to ESM/Bundler, which obscures their actual lane. The repo also
lacks a canonical package-by-package classification document that states which
workspaces are internal libraries, which are runtime entrypoints, and which
validation each lane requires.

### Root cause

The repo migrated incrementally from a CommonJS-centered baseline. As a result:

- `tsconfig.base.json` kept a misleading canonical-sounding name while carrying
  legacy CJS semantics
- ESM migration happened package by package, so some packages now inherit the
  wrong base and override their way out of it
- the lane distinction already implicit in proposals and app configs was not
  made explicit in one canonical matrix

### Constraints and invariants

- `AGENTS.md` requires governance-first work, real validation, and explicit
  evidence in the closeout.
- `docs/guides/ai-work-protocol.md` requires think-first and a pre-implementation
  brief before edits.
- `docs/guides/testing-and-ci-capabilities.md` defines the validation commands
  that count.
- `docs/planning/proposals/package-module-build-policy-v2-20260317.md` sets the
  default target for library packages to `type: "module"`, `module: "ES2022"`,
  `moduleResolution: "Bundler"`.
- `docs/planning/proposals/ts-esm-monorepo-audit-and-migration-20260318.md`
  already distinguishes ESM/Bundler library packages from NodeNext app
  entrypoints and explicitly deprecates `tsconfig.base.json` after migration.
- Package-boundary consumption must remain explicit; we must not regress to
  cross-package source imports as an accidental side effect of base-config
  cleanup.

### Options considered

1. Keep the current mixed-base state and only add a document.
   Rejected: documentation without base cleanup leaves the misleading legacy
   inheritance pattern in place.
2. Force a single `Bundler` strategy on every workspace.
   Rejected: true Node runtime entrypoints already have a working NodeNext lane,
   and collapsing them would hide runtime resolution differences.
3. Adopt a two-lane ESM model: `Bundler` for internal libraries and `NodeNext`
   for direct Node entrypoints, then remove the legacy base from active package
   inheritance.
   Selected: this aligns with the current policy direction while making the
   classification explicit and falsifiable.
4. Keep `tsconfig.base.json` but repurpose it in place.
   Rejected: the filename already carries misleading legacy meaning in the repo;
   preserving it would keep review ambiguity alive.

### Selected option and rationale

Create a canonical classification document and apply the lane split directly:

- `tsconfig.package-bundler.base.json` becomes a standalone ESM/Bundler base for
  internal library packages
- `tsconfig.node-runtime.base.json` becomes the explicit NodeNext base for true
  Node entrypoints
- packages that still extend `tsconfig.base.json` move to the correct lane
- `tsconfig.base.json` is removed from active workspace inheritance

Runtime-sensitive libraries such as adapters remain in the library lane unless
they prove they need promotion to NodeNext, but their document row must record
the extra runtime validation requirement.

### Rejected alternatives

- Treat all adapters as NodeNext by category.
  Rejected because adapter identity alone does not determine runtime contract.
- Keep `traceability-service` in the Node runtime lane solely because it exposes
  a `bin`.
  Rejected for this slice; it remains a library-first package with an explicit
  runtime-smoke note rather than an automatic lane promotion.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - create a canonical TypeScript package-classification document
  - add an explicit Node runtime base
  - remove the legacy base from active workspace inheritance
  - migrate the remaining legacy-base packages and the web app to the correct
    lane
  - remove `tsconfig.base.json`
- Touched files or paths:
  - `docs/architecture/typescript-package-classification.md`
  - `docs/planning/closeouts/20260318-typescript-package-classification-closeout.md`
  - `tsconfig.package-bundler.base.json`
  - `tsconfig.node-runtime.base.json`
  - `tsconfig.app-node.base.json` or app consumers of it
  - `tsconfig.base.json`
  - affected `packages/@dvt/*/tsconfig.json`
  - affected `apps/*/tsconfig.json`
- Expected outcome:
  - one canonical package-by-package lane matrix exists
  - no package or app extends `tsconfig.base.json`
  - `tsconfig.base.json` is removed
  - library packages use the Bundler lane and true Node entrypoints use the
    NodeNext lane
- Risks and mitigations:
  - risk: removing source-alias inheritance may break packages that were
    compiling against other packages' source
  - mitigation: preserve or add explicit package-boundary `dist/*.d.ts` paths
    where validation proves they are still needed
  - risk: moving a runtime-sensitive package to the wrong lane
  - mitigation: classify by effective contract, not by name, and record
    exceptions in the document
  - risk: removing `tsconfig.base.json` may break docs or tooling references
  - mitigation: update the new document and validate affected builds/type-checks
- Out-of-scope items:
  - full project references rollout
  - changing package behavior beyond module-lane alignment
  - promoting runtime-sensitive libraries to NodeNext without evidence
- Validation plan:
  - package-level build/test commands for every touched package
  - `pnpm type-check`
  - `pnpm docs:sync`
  - `pnpm docs:canonical:check`
- Test coverage plan:
  - no new runtime behavior is introduced
  - acceptance is package build/test/typecheck plus docs validation
  - runtime-sensitive packages must at least retain their current integration
    validation hooks
- Libraries evaluated:
  - None added

## Implementation

### Governing sources used

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/guides/testing-and-ci-capabilities.md`
- `docs/planning/proposals/package-module-build-policy-v2-20260317.md`
- `docs/planning/proposals/ts-esm-monorepo-audit-and-migration-20260318.md`

### Real work performed

- Created the canonical architecture document
  `docs/architecture/typescript-package-classification.md`.
- Made `tsconfig.package-bundler.base.json` standalone and ESM/Bundler-native.
- Added `tsconfig.node-runtime.base.json` as the canonical NodeNext base.
- Retired `tsconfig.base.json` and `tsconfig.app-node.base.json`.
- Moved all package/app inheritance off the retired bases.
- Migrated legacy packages to the Bundler lane:
  - `@dvt/adapter-postgres`
  - `@dvt/adapter-temporal`
  - `@dvt/crypto`
  - `@dvt/cli`
  - `@dvt/contracts`
  - `@dvt/dsl`
  - `@dvt/observability`
  - `@dvt/observability-otel`
  - `@dvt/plan-interpreter`
  - `@dvt/planner-contracts`
- Moved the Node entrypoint apps to `tsconfig.node-runtime.base.json`:
  - `dvt-api`
  - `dvt-lineage-worker`
  - `dvt-outbox-worker`
  - `dvt-projector-worker`
- Moved `@dvt/web` to the Bundler lane with web-specific overrides.
- Added explicit `type: "module"` and ESM `exports` where the legacy packages
  still lacked them.
- Fixed ESM/runtime and type-compatibility fallout required by the migration:
  - type-only imports in `@dvt/contracts`
  - `.js` relative imports in `@dvt/observability` and `@dvt/observability-otel`
  - exact-optional handling in `@dvt/plan-interpreter` and `@dvt/adapter-postgres`
  - named import consumption in `apps/api` and `apps/outbox-worker`
  - null/undefined safety fixes in `apps/web`

### Affected files

- `docs/architecture/typescript-package-classification.md`
- `docs/architecture/index.md`
- `docs/planning/closeouts/20260318-typescript-package-classification-closeout.md`
- `tsconfig.json`
- `tsconfig.package-bundler.base.json`
- `tsconfig.node-runtime.base.json`
- deleted: `tsconfig.base.json`
- deleted: `tsconfig.app-node.base.json`
- `apps/api/tsconfig.json`
- `apps/api/src/plugins/observability.ts`
- `apps/lineage-worker/tsconfig.json`
- `apps/outbox-worker/tsconfig.json`
- `apps/outbox-worker/src/runtime/createOutboxWorkerRuntime.ts`
- `apps/projector-worker/tsconfig.json`
- `apps/web/tsconfig.json`
- `apps/web/src/app/components/DbtExplorer.tsx`
- `apps/web/src/app/components/SourceImportWizard.tsx`
- `apps/web/src/app/stores/appStore.ts`
- `apps/web/src/app/stores/index.ts`
- `packages/@dvt/adapter-postgres/package.json`
- `packages/@dvt/adapter-postgres/tsconfig.json`
- `packages/@dvt/adapter-postgres/src/PostgresOutboxStore.ts`
- `packages/@dvt/adapter-postgres/src/PostgresStartRunIntentStore.ts`
- `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts`
- `packages/@dvt/adapter-temporal/package.json`
- `packages/@dvt/adapter-temporal/tsconfig.json`
- `packages/@dvt/canonical/package.json`
- `packages/@dvt/canonical/tsconfig.json`
- `packages/@dvt/cli/package.json`
- `packages/@dvt/cli/tsconfig.json`
- `packages/@dvt/contracts/tsconfig.json`
- `packages/@dvt/contracts/src/adapters/IOutboxStorageAdapter.v1.ts`
- `packages/@dvt/contracts/src/adapters/IProjectorAdapter.v1.ts`
- `packages/@dvt/contracts/src/adapters/IStateStoreAdapter.v1.ts`
- `packages/@dvt/dsl/tsconfig.json`
- `packages/@dvt/observability/package.json`
- `packages/@dvt/observability/tsconfig.json`
- `packages/@dvt/observability/src/index.ts`
- `packages/@dvt/observability/src/noopObservability.ts`
- `packages/@dvt/observability/src/contracts/IObservability.ts`
- `packages/@dvt/observability/src/policy/cardinalityPolicy.ts`
- `packages/@dvt/observability-otel/package.json`
- `packages/@dvt/observability-otel/tsconfig.json`
- `packages/@dvt/observability-otel/src/index.ts`
- `packages/@dvt/plan-interpreter/package.json`
- `packages/@dvt/plan-interpreter/tsconfig.json`
- `packages/@dvt/plan-interpreter/src/errors.ts`
- `packages/@dvt/planner-contracts/package.json`
- `packages/@dvt/planner-contracts/tsconfig.json`

### Validation evidence

- `pnpm --filter @dvt/contracts build` PASS
- `pnpm --filter @dvt/contracts test` PASS
- `pnpm --filter @dvt/dsl build` PASS
- `pnpm --filter @dvt/dsl test` PASS
- `pnpm --filter @dvt/plan-interpreter build` PASS
- `pnpm --filter @dvt/plan-interpreter test` PASS
- `pnpm --filter @dvt/planner-contracts build` PASS
- `pnpm --filter @dvt/observability build` PASS
- `pnpm --filter @dvt/observability test` PASS
- `pnpm --filter @dvt/observability-otel build` PASS
- `pnpm --filter @dvt/observability-otel test` PASS
- `pnpm --filter @dvt/crypto build` PASS
- `pnpm --filter @dvt/crypto test` PASS
- `pnpm --filter @dvt/cli build` PASS
- `pnpm --filter @dvt/cli test` PASS
- `pnpm --filter @dvt/adapter-postgres build` PASS
- `pnpm --filter @dvt/adapter-postgres test` PASS
- `pnpm --filter @dvt/adapter-temporal build` PASS
- `pnpm --filter @dvt/adapter-temporal test` PASS
- `pnpm --filter @dvt/adapter-temporal test:integration` PASS
- `pnpm --filter @dvt/web typecheck` PASS
- `pnpm --filter @dvt/web build` PASS
- `pnpm --filter dvt-api build` PASS
- `pnpm --filter dvt-lineage-worker build` PASS
- `pnpm --filter dvt-outbox-worker build` PASS
- `pnpm --filter dvt-projector-worker build` PASS
- `pnpm type-check` PASS
- `pnpm docs:sync` PASS
- `pnpm docs:canonical:check` PASS

### No-debt evidence

- No new debt entry was created.
- No rules were disabled repo-wide.
- No hooks were bypassed.
- The only compatibility relaxations introduced are explicit package-local
  `tsconfig` overrides for `@dvt/adapter-temporal` and `@dvt/web`, documented in
  config rather than hidden in shared bases.
- `tsconfig.base.json` was removed instead of left as silent migration residue.

### No-stub evidence

- No new stubs, placeholders, fake adapters, or TODO/FIXME markers were added.
- Existing placeholder code in untouched areas was not expanded or used as fake
  completion.

### Operational note

- `apps/outbox-worker/tsconfig.json` had to be rewritten with escalated shell
  execution after repeated `apply_patch` refresh failures and an `Access denied`
  write from the sandbox. The resulting content matches the intended
  `tsconfig.node-runtime.base.json` migration and was validated by
  `pnpm --filter dvt-outbox-worker build`.
