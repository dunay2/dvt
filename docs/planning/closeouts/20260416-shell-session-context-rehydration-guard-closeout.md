---
slice: shell-session-context-rehydration-guard
date: 2026-04-16
lane: E
author: AI (Codex)
last_reviewed: 2026-04-16
---

# Closeout: Shell session-context rehydration guard

## Think-First Analysis

### Problem summary

The first persistence pass for `useSessionStore` solved reload continuity, but
it also allowed stale browser state to override the active runtime mode and the
current workspace bootstrap scope.

### Root cause

The persisted payload was rehydrated with no reconciliation step. That meant a
stored `targetAdapter` or stale tenant/project/environment values could win
over the current runtime-owned defaults and current bootstrap option set.

### Constraints and invariants

- `AGENTS.md`: inventory-first startup, no hidden debt, full validation, and no
  hook bypasses.
- `docs/guides/ai-work-protocol.md`: this is a `Slim` bug-fix slice and still
  requires think-first analysis, negative-path coverage, and governed closeout.
- `docs/architecture/reference-architecture.md`: tenant context must stay
  explicit and boundary ownership must remain mechanical rather than inferred
  from stale client state.
- `docs/planning/state/agent-lane-e.yaml`: Lane E may persist shell-level UX
  context, but it must not invent cross-mode or stale-scope behavior that can
  drift from the real backend-facing runtime boundary.

### Selected option and rationale

Keep shell selector persistence, but guard rehydration:

- `targetAdapter` remains runtime-owned and is no longer restored from browser
  storage.
- persisted `tenantId`, `projectId`, and `environmentId` are only accepted when
  they still exist in the current bootstrap option set.

This preserves reload continuity without letting stale local state override the
active runtime contract.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - `apps/web/src/app/stores/sessionStore.ts`
  - `apps/web/src/app/stores/sessionStore.test.ts`
  - `docs/planning/closeouts/20260416-shell-session-context-rehydration-guard-closeout.md`
- Expected outcome:
  - valid persisted shell selectors still rehydrate
  - stale persisted scope falls back to current bootstrap values
  - stale persisted `targetAdapter` never overrides the current runtime mode
- Risks and mitigations:
  - Risk: regress the original reload fix
  - Mitigation: retain positive-path rehydrate coverage for valid selectors
  - Risk: keep stale cross-checkout state alive
  - Mitigation: merge persisted scope only after validating against current
    bootstrap options
- Out of scope:
  - graph draft persistence
  - API-owned workspace authorization
  - shell selector redesign

## Implementation Summary

- Added a validated `merge` step to `useSessionStore` persistence.
- Dropped `targetAdapter` from the persisted payload and kept it owned by the
  current runtime mode.
- Added tests for:
  - positive-path rehydrate of valid selectors
  - rejection of stale `targetAdapter`
  - fallback from invalid persisted scope to bootstrap defaults

## Validation Run

- `pnpm exec eslint apps/web/src/app/stores/sessionStore.ts apps/web/src/app/stores/sessionStore.test.ts --max-warnings 0` - PASS
- `pnpm --filter @dvt/web test -- src/app/stores/sessionStore.test.ts` - PASS
- `pnpm --filter @dvt/web typecheck` - PASS
- `pnpm docs:sync` - PASS
- `pnpm verify:prepush` - PASS
- `pnpm exec markdownlint-cli2 docs/planning/closeouts/20260416-shell-session-context-rehydration-guard-closeout.md --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc` - PASS
- `pnpm exec prettier --check docs/planning/closeouts/20260416-shell-session-context-rehydration-guard-closeout.md` - PASS

## Debt introduced

None.

## Residuals

- This guard only reconciles against the current client bootstrap option set. It
  does not replace backend-owned authorization or protected workspace-boundary
  validation.
