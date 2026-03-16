---
slice: outbox-cleanup-serialization
date: 2026-03-16
gap: maintenance
author: AI (Codex)
---

# Closeout: Outbox Cleanup Serialization

## Think-First

### Problem summary

`stopRuntimeAndOperationalServer()` logs cleanup failures while handling a primary
failure, but its fallback serialization path for non-`Error` values is weaker than
other outbox-worker surfaces and the dirty-root patch is not publishable as-is.

### Root cause

This lifecycle helper kept a local `toErrorLike()` implementation that only handled
`Error`, `string`, `null`, and serializable objects. Primitive, symbol, and function
values fell back to generic `String(error)`, and the pending root diff tried to patch
that with a one-off `Object.prototype.toString.call()` fallback rather than aligning
with the already-established unknown-error formatting pattern used elsewhere in the
worker runtime.

### Constraints and invariants

- `ADR-0034` - `apps/outbox-worker` is a composition root for the delivery context;
  operational runtime helpers should stay focused and consistent with delivery-owned
  behavior rather than inventing divergent local semantics.
- `AGENTS.md` - think-first before edits, no hidden debt, no stubs, and mandatory
  closeout evidence.
- `docs/guides/ai-work-protocol.md` - this is a `Slim` maintenance slice and must
  include a negative-path test.

### Options considered

- Reuse the local outbox unknown-error formatting pattern already present in
  `runOutboxWorkerHost.ts` and `PgShardOwnershipGate.ts`.
- Apply the dirty-root patch and use `Object.prototype.toString.call(error)` for every
  non-object fallback.
- Extract a shared error-serialization utility for all outbox/delivery surfaces.

Libraries evaluated:

- None evaluated - this is a small internal maintenance fix, and the repository
  already contains the formatting pattern needed for the slice.

### Selected option and rationale

Reuse the existing outbox-worker formatting semantics inside this lifecycle helper:
keep structured JSON for objects, preserve special handling for `Error` and `string`,
and format primitives, symbols, functions, and `undefined` explicitly. This keeps the
slice small, removes the one-off fallback, and adds the missing negative-path test for
primitive cleanup failures.

### Rejected alternatives

- Dirty-root one-off fallback: rejected because it degrades primitive values such as
  `false` or `123` into object-tag strings only in this helper and adds non-canonical
  comment/style drift.
- Shared utility extraction: rejected for this slice because it expands scope beyond a
  small bug fix and would require touching multiple bounded-context surfaces.

## Pre-Implementation Brief

- Mode: `Slim`
- Scope: align unknown cleanup error serialization in
  `stopRuntimeAndOperationalServer()` with existing outbox-worker semantics and add the
  missing negative-path test.
- Touched files or paths:
  - `apps/outbox-worker/src/lifecycle/stopRuntimeAndOperationalServer.ts`
  - `apps/outbox-worker/test/lifecycle/stopRuntimeAndOperationalServer.test.ts`
  - `docs/planning/closeouts/20260316-outbox-cleanup-serialization-closeout.md`
- Expected outcome: cleanup logging preserves useful messages for primitive and
  non-`Error` values without introducing divergent formatting rules.
- Risks and mitigations:
  - Risk: change log payload shape unexpectedly.
  - Mitigation: add a focused test that asserts the new fallback behavior.
- Out-of-scope items:
  - shared helper extraction across `apps/outbox-worker` and `@dvt/delivery`
  - unrelated runtime cleanup semantics
- Validation plan:
  - `pnpm exec eslint ...`
  - `pnpm exec prettier --check ...`
  - focused outbox-worker lifecycle test run
  - `pnpm docs:quality:check`
  - `pnpm docs:canonical:check`
- Test coverage plan:
  - keep existing happy-path and aggregate cleanup tests
  - add a negative-path assertion for a primitive cleanup failure while a primary
    failure is already being handled
- Libraries evaluated:
  - None evaluated - no custom subsystem or dependency decision is being introduced.

## Changes made

| File                                                                        | Change                                                                                                                                                       | Why                                                                                                                |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `apps/outbox-worker/src/lifecycle/stopRuntimeAndOperationalServer.ts`       | Replaced the primitive fallback in `toErrorLike()` with explicit unknown-error formatting for numbers, booleans, bigint, `undefined`, symbols, and functions | Align cleanup logging with the existing outbox-worker error-formatting pattern instead of using a one-off fallback |
| `apps/outbox-worker/test/lifecycle/stopRuntimeAndOperationalServer.test.ts` | Added a negative-path test for a primitive cleanup failure while a primary failure is already being handled                                                  | Proves the new fallback behavior and guards against regression                                                     |
| `docs/planning/closeouts/20260316-outbox-cleanup-serialization-closeout.md` | Added think-first analysis, implementation brief, and validation evidence                                                                                    | Required governance closeout for the slice                                                                         |

## Libraries evaluated

None evaluated - internal maintenance fix using an existing repository pattern.

## Docs synced

- [x] `docs/planning/closeouts/20260316-outbox-cleanup-serialization-closeout.md` - think-first, implementation brief, and validation evidence for this slice

## Test evidence

| Command                                                                                                                                                                                                                                              | Result                                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                                                                                                                                                                                                                     | Passed                                                                    |
| `pnpm exec eslint apps/outbox-worker/src/lifecycle/stopRuntimeAndOperationalServer.ts apps/outbox-worker/test/lifecycle/stopRuntimeAndOperationalServer.test.ts`                                                                                     | Passed                                                                    |
| `pnpm exec prettier --write apps/outbox-worker/src/lifecycle/stopRuntimeAndOperationalServer.ts apps/outbox-worker/test/lifecycle/stopRuntimeAndOperationalServer.test.ts`                                                                           | Passed                                                                    |
| `pnpm exec prettier --check apps/outbox-worker/src/lifecycle/stopRuntimeAndOperationalServer.ts apps/outbox-worker/test/lifecycle/stopRuntimeAndOperationalServer.test.ts docs/planning/closeouts/20260316-outbox-cleanup-serialization-closeout.md` | Passed                                                                    |
| `pnpm --dir apps/outbox-worker exec node --import tsx --test test/lifecycle/stopRuntimeAndOperationalServer.test.ts`                                                                                                                                 | Passed outside sandbox after the in-sandbox run hit Windows `spawn EPERM` |
| `pnpm exec markdownlint-cli2 "docs/planning/closeouts/20260316-outbox-cleanup-serialization-closeout.md" --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc`                                                                        | Passed                                                                    |
| `pnpm docs:sync`                                                                                                                                                                                                                                     | Passed                                                                    |
| `pnpm docs:quality:check`                                                                                                                                                                                                                            | Passed with pre-existing non-English-content warnings outside this slice  |
| `pnpm docs:canonical:check`                                                                                                                                                                                                                          | Passed                                                                    |

Additional baseline validation notes:

- `pnpm --filter dvt-outbox-worker test` failed before the focused test run because the
  package `pretest` currently builds `@dvt/adapter-postgres` and `@dvt/delivery`, and
  this worktree baseline has unrelated unresolved workspace/dependency issues there.
- `pnpm --filter dvt-outbox-worker typecheck` also failed on pre-existing unresolved
  workspace imports outside the touched lifecycle files.

## Debt introduced

None.
