---
slice: 20260423-iworkflowengine-contract-ownership-cleanup
date: 2026-04-23
last_reviewed: 2026-04-23
work_item: fix(engine)
status: Done
author: AI (Codex)
---

# Closeout: IWorkflowEngine contract ownership cleanup

## Think-First Analysis

### Problem summary

`IWorkflowEngine` was documented as if its physical contract source lived under
`@dvt/contracts`, while the actual interface and active consumer imports lived
under `@dvt/engine`.

### Root cause

Two different governance surfaces drifted apart:

- generated contract inventory pages still enumerated
  `packages/@dvt/contracts/src/contracts/engine/IWorkflowEngine.v1.ts`
  as a normative engine-contract source
- the real behavior port remained defined and consumed from
  `packages/@dvt/engine/src/ports/IWorkflowEngine.ts`
- `@dvt/engine` still published a contract subpath export, leaving a second
  plausible public import route

### Constraints and invariants

- `AGENTS.md` requires root-cause fixes, no hidden debt, and real validation.
- `docs/guides/ai-work-protocol.md` requires TDD, touched-scope validation, and
  closeout evidence.
- `docs/adr/ADR-0018_Shared_Kernel_Ownership_Governance.md` states that
  `IWorkflowEngine` is a behavior port owned by `@dvt/engine`, while
  `@dvt/contracts` owns serializable cross-package shapes.
- The fix must not move behavior ports into `@dvt/contracts`.

### Options considered

1. Move `IWorkflowEngine` into `@dvt/contracts`.
   - Rejected: contradicts ADR-0018 and would blur behavior vs shape ownership.

2. Leave exports as-is and fix docs only.
   - Rejected: documentation would improve, but the package would still expose
     two plausible import routes.

3. Keep `IWorkflowEngine` owned by `@dvt/engine`, hard-cut it into
   `src/ports`, remove the package subpath export, add a regression test, and
   update governed docs.
   - Selected: aligns code, exports, and documentation with ADR-0018.

### Selected option and rationale

Treat `@dvt/engine` root as the single canonical consumer import path for
`IWorkflowEngine`, enforce that via package exports plus a regression test, and
update generated/manual docs so they stop claiming that the behavior port lives
in `@dvt/contracts`.

## Pre-Implementation Brief

- **Mode**: Slim
- **Scope**:
  - add a failing regression test for the `@dvt/engine` package surface
  - remove the `./contracts/engine/*` subpath export from `@dvt/engine`
  - hard-cut `IWorkflowEngine` from `src/contracts` into `src/ports`
  - teach `docs:sync` to classify `IWorkflowEngine` as an engine-owned behavior
    port rather than a `@dvt/contracts` normative source
  - update the canonical matrix and engine docs to state the canonical import
    path explicitly and point to the engine-owned ports location
- **Touched files or paths**:
  - `packages/@dvt/engine/package.json`
  - `packages/@dvt/engine/test/contracts/package-surface.test.ts`
  - `packages/@dvt/engine/src/ports/IWorkflowEngine.ts`
  - `packages/@dvt/engine/src/contracts/IWorkflowEngine.v1.ts`
  - `packages/@dvt/engine/src/contracts/engine/IWorkflowEngine.v1.ts`
  - `packages/@dvt/engine/src/contracts/engine/index.ts`
  - `packages/@dvt/engine/src/core/WorkflowEngine.ts`
  - `packages/@dvt/engine/src/core/buildWorkflowEngineFacade.ts`
  - `packages/@dvt/engine/src/index.ts`
  - `scripts/sync-docs.cjs`
  - `docs/contracts/engine/index.md`
  - `docs/planning/status/canonical-doc-code-matrix.md`
  - `docs/planning/status/generated-code-state.md`
  - `docs/architecture/components/engine/contracts/engine/index.md`
  - `docs/architecture/components/engine/index.md`
  - this closeout file
- **Expected outcome**:
  - repo docs and package exports agree that callers import `IWorkflowEngine`
    from `@dvt/engine`
  - the behavior port physically lives under `packages/@dvt/engine/src/ports`
  - the generated contract inventory no longer attributes the behavior port to
    `@dvt/contracts`
- **Risks and mitigations**:
  - Risk: an internal consumer depends on the contract subpath export.
    Mitigation: verify repo-wide search shows no active imports from
    `@dvt/engine/contracts/engine/*`.
  - Risk: generated docs drift from the new ownership rule.
    Mitigation: change `scripts/sync-docs.cjs` and run `pnpm docs:sync`.
- **Out-of-scope items**:
  - broader `IProviderAdapter` ownership reconciliation
  - planner/read-side contract family work
- **Validation plan**:
  - targeted red-green test for the package surface
  - `pnpm --filter @dvt/engine test`
  - `pnpm --filter @dvt/engine typecheck`
  - `pnpm docs:sync`
  - `pnpm docs:status:generate`
  - `pnpm verify:prepush`
- **Test coverage plan**:
  - prove that `@dvt/engine/package.json` no longer publishes the
    `./contracts/engine/*` route
  - prove that `IWorkflowEngine` no longer exists under `src/contracts`
- **Libraries evaluated**:
  - None evaluated; the fix is package-surface and docs governance only.

## Implementation Log

- Added `packages/@dvt/engine/test/contracts/package-surface.test.ts` to lock
  the `IWorkflowEngine` public import route to the `@dvt/engine` root package.
- Removed `./contracts/engine/*` from `packages/@dvt/engine/package.json`
  exports so the package no longer publishes a second contract import path.
- Updated `scripts/sync-docs.cjs` so the generated engine contracts index lists
  `IWorkflowEngine` under engine-owned behavior ports and excludes the
  misleading `@dvt/contracts` entry for that symbol.
- Regenerated `docs/contracts/engine/index.md` through `pnpm docs:sync`.
- Hard-cut `IWorkflowEngine` from `packages/@dvt/engine/src/contracts/` into
  `packages/@dvt/engine/src/ports/IWorkflowEngine.ts` and removed the old
  source file plus the `contracts/engine` alias re-export.
- Updated `docs/planning/status/canonical-doc-code-matrix.md` so the primary
  code path points at `packages/@dvt/engine/src/ports/IWorkflowEngine.ts` and
  the new package-surface regression test is part of the tuple.
- Documented the canonical import path in
  `docs/architecture/components/engine/contracts/engine/index.md` and
  `docs/architecture/components/engine/index.md`.
- Kept `docs/architecture/components/engine/contracts/engine/IWorkflowEngine.v1.md`
  untouched because changed-file docs governance rejects modified non-kebab-case
  filenames even when they are tracked historical contract docs.

## Validation Evidence

- `pnpm --filter @dvt/engine test -- test/contracts/package-surface.test.ts`
  - red 1: failed because `@dvt/engine/package.json` still exported
    `./contracts/engine/*`
  - red 2: after extending the regression, failed because
    `src/ports/IWorkflowEngine.ts` did not exist yet
  - final green: passed with both package-surface assertions
- `pnpm docs:sync`
  - passed and regenerated `docs/contracts/engine/index.md`
- `pnpm docs:status:generate`
  - passed and regenerated `docs/planning/status/generated-code-state.md`
- `pnpm --filter @dvt/engine test`
  - passed with `42/42` files and `369/369` tests green
- `pnpm --filter @dvt/engine typecheck`
  - passed
- `pnpm verify:prepush`
  - passed
  - note: the diff-based subchecks reported "No changed files detected", so the
    authoritative scope evidence for this slice remains the explicit package
    test/typecheck commands above
- `$env:GIT_BASE='origin/main'; $env:GIT_HEAD='HEAD'; node tools/ci/arc-check.mjs`
  - returned `ARC-0` with no evidence or risk update required in the current
    ref-based comparison

## No-Debt / No-Stub Evidence

- No hooks were bypassed.
- No quality gate was relaxed or disabled.
- No stub, placeholder, or fake implementation was introduced.
- The fix removed an alternate public route instead of adding a compatibility
  alias that would preserve ownership drift.
