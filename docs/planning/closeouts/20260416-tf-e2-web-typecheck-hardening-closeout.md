---
slice: tf-e2-web-typecheck-hardening
date: 2026-04-16
lane: E
author: AI (Codex)
last_reviewed: 2026-04-16
---

# Closeout: TF-E2 web typecheck hardening

## Think-First Analysis

### Problem summary

The active `TF-E2` web slice is close to PR-ready, but the affected workspace
type-check still fails in two test files inside `apps/web`.

The failures are not product-runtime defects. They are test-shape mismatches
against the governed TypeScript contracts now used by the web workspace.

### Root cause

Two test helpers drifted behind the current type surfaces:

- `dbtContributions.connectionRules.test.ts` still accepts `kind: string`
  although `CanonicalNode.kind` is now the governed template-literal
  `PluginNodeKind`
- `useCanvasGraphHandlers.test.tsx` constructs an incomplete connection with
  `source: null`, while the typed connection surface used by the test no longer
  accepts `null` there

That drift is enough to fail `@dvt/web` type-check and the affected-workspace
type-check gate even though runtime tests still pass.

### Constraints and invariants

- `AGENTS.md`: inventory-first startup, no hidden debt, no fake completion,
  mandatory validation evidence, mandatory closeout.
- `docs/guides/ai-work-protocol.md`: this is a Slim maintenance slice, so the
  work must follow think-first, pre-implementation brief, then touched-scope
  validation plus `pnpm verify:prepush`.
- `docs/guides/pr-preflight-and-ci-triage.md`: the slice must be verified with
  package validation first and the repository pre-push gate before calling it
  PR-ready.
- `docs/guides/testing-and-ci-capabilities.md`: the canonical local commands
  for this slice are `pnpm --filter @dvt/web typecheck`,
  `pnpm --filter @dvt/web test`, `pnpm ci:affected:typecheck`, and
  `pnpm verify:prepush`.
- `docs/planning/proposals/mandatory/frontend-and-ux/tf-e2-production-node-authoring-and-persistence-plan-20260416.md`:
  this fix must harden the existing `TF-E2` authoring slice rather than widen
  scope or invent a new planning surface.

### Options considered

- Relax the test types with broad casts.
  - Rejected because it would hide the drift instead of aligning the tests with
    the governed contracts.
- Change product code to fit the old tests.
  - Rejected because the reported failures are test-shape issues, not runtime
    behavior regressions.
- Tighten the tests to the current contract shapes and re-run the actual PR
  gates.
  - Accepted because it closes the real blocker with minimal scope and no fake
    green output.

### Selected option and rationale

Patch only the failing test inputs so they satisfy the current web type
contracts, then re-run the affected package and PR gates to confirm the slice is
actually ready for review.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - `apps/web/src/app/plugins/dbt/dbtContributions.connectionRules.test.ts`
  - `apps/web/src/app/views/canvas/useCanvasGraphHandlers.test.tsx`
  - `apps/outbox-worker/src/ops/OutboxWorkerMonitor.ts`
  - `apps/outbox-worker/test/**`
  - this closeout file
- Expected outcome:
  - `@dvt/web` type-check passes
  - `pnpm ci:affected:typecheck` passes for the active worktree
  - the existing runtime test suite and `pnpm verify:prepush` remain green
- Risks and mitigations:
  - Risk: the test fix could paper over a real runtime contract mismatch
  - Mitigation: keep the change constrained to typed test inputs and rerun both
    runtime tests and affected-workspace type-check
  - Risk: docs drift after adding this governed closeout
  - Mitigation: run `pnpm docs:sync` and the pre-push gate after the content is
    complete
- Out of scope:
  - new product behavior
  - PR creation, branch cleanup, or commit creation
  - unrelated untracked files already present in the worktree
- Validation plan:
  - `pnpm --filter @dvt/web typecheck`
  - `pnpm ci:affected:typecheck`
  - `pnpm --filter @dvt/web test`
  - `pnpm docs:sync`
  - `pnpm docs:status:generate`
  - `pnpm verify:prepush`
- Test coverage plan:
  - preserve the existing `@dvt/web` runtime test pass
  - prove the negative-path incomplete-connection guard remains covered after
    the typed test adjustment
- Libraries evaluated:
  - None evaluated -- this is contract alignment inside existing tests

## Implementation Summary

- tightened `dbtContributions.connectionRules.test.ts` so the local `buildNode`
  helper accepts `CanonicalNode['kind']` instead of an unconstrained `string`
- updated the incomplete-connection negative-path in
  `useCanvasGraphHandlers.test.tsx` to use a falsey string source that still
  exercises the same guard while matching the current typed connection surface
- fixed one strict-nullability branch in
  `apps/outbox-worker/src/ops/OutboxWorkerMonitor.ts` so histogram bucket
  increments no longer rely on unchecked indexed access
- aligned six `outbox-worker` test fixtures with the current
  `IsoUtcString` contract by converting raw timestamp literals to
  `asIsoUtcString(...)`
- added this governed closeout and regenerated `docs/planning/status/generated-code-state.md`
  for the new tracked source/doc additions already present in the slice

## Validation Evidence

- `pnpm --filter @dvt/web typecheck` — passed
- `pnpm --filter @dvt/web test` — passed
- `pnpm --filter dvt-outbox-worker typecheck` — passed
- `pnpm ci:affected:typecheck` — passed
- `pnpm docs:sync` — passed
- `pnpm docs:status:generate` — passed
- `pnpm verify:prepush` — passed
