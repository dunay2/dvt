---
slice: shell-session-context-persistence
date: 2026-04-16
lane: E
author: AI (Codex)
last_reviewed: 2026-04-16
---

# Closeout: Shell session-context persistence

## Think-First Analysis

### Problem summary

A hard reload resets the selected tenant, project, environment, and target
adapter back to bootstrap defaults even when the operator intentionally changed
that shell context.

### Root cause

`useSessionStore` kept the active session context only in in-memory Zustand
state. Reloading the browser recreated the store from bootstrap config instead
of the user's last selected shell context.

### Constraints and invariants

- `AGENTS.md`: inventory-first startup, no hidden debt, required validation,
  and no hook bypasses.
- `docs/guides/ai-work-protocol.md`: this is a `Slim` slice and still requires
  think-first analysis, concrete validation, and a governed closeout.
- `docs/planning/state/agent-lane-e.yaml`: Lane E owns shell-level UX polish and
  frontend state behavior, but `TF-E2` explicitly forbids treating browser-local
  graph draft state as canonical persistence.
- `docs/architecture/system-delivery-status.md`: the web shell is the shipped
  operator context surface, so losing workspace selectors on reload is a real UX
  defect.

### Selected option and rationale

Persist only the shell session-context fields (`tenantId`, `projectId`,
`environmentId`, `targetAdapter`) in the session store.

This fixes reload continuity for the shell without pretending that browser-local
storage is a valid persistence boundary for graph authoring or other protected
product data.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - `apps/web/src/app/stores/sessionStore.ts`
  - `apps/web/src/app/stores/sessionStore.test.ts`
- Expected outcome:
  - shell workspace selectors and target adapter survive a hard reload
  - non-session store behavior stays unchanged
  - no graph-draft persistence is introduced or expanded
- Risks and mitigations:
  - Risk: over-persist more state than intended
  - Mitigation: use `partialize` to persist only shell session-context fields
  - Risk: confuse this with product persistence
  - Mitigation: keep the change limited to `sessionStore` and document that the
    graph draft boundary remains governed elsewhere
- Out of scope:
  - canvas node or edge persistence
  - inspector property persistence
  - shell selector visual redesign

## Implementation Summary

- Wrapped `useSessionStore` with Zustand `persist` middleware.
- Persisted only `tenantId`, `projectId`, `environmentId`, and `targetAdapter`
  under the `dvt-web-session` key.
- Added a focused store test proving that selector changes are written to
  `localStorage`.

## Validation Run

- `pnpm exec eslint apps/web/src/app/stores/sessionStore.ts apps/web/src/app/stores/sessionStore.test.ts --max-warnings 0` - PASS
- `pnpm --filter @dvt/web test -- src/app/stores/sessionStore.test.ts` - PASS
- `pnpm --filter @dvt/web typecheck` - PASS
- `pnpm docs:sync` - PASS
- `pnpm verify:prepush` - PASS
- `pnpm exec markdownlint-cli2 docs/planning/closeouts/20260416-shell-session-context-persistence-closeout.md --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc` - PASS
- `pnpm exec prettier --check docs/planning/closeouts/20260416-shell-session-context-persistence-closeout.md` - PASS

## Debt introduced

None.

## Residuals

- This slice does not change the governed `TF-E2` position: graph draft
  persistence still requires the shared `TF-A2 -> TF-C4` boundary.
