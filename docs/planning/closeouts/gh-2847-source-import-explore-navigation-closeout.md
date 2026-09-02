---
slice: GH-2847
date: 2026-09-02
last_reviewed: 2026-09-02
issue: 2847
author: Codex
---

# Closeout: GH-2847 — advance source import after connection selection

## Governing sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/components/web/frontend-component-inventory.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/source-import-provider-extensibility-debt-plan-20260503.md`

Planning DB returned `reuse-existing-rail`. The interaction continues through
`ListWarehouseConnectionSourceObjects`; it does not add another query or mutation.

## Work performed

- Selecting a governed warehouse connection now opens the Browse section immediately.
- The existing source-object loader receives the selected connection identity and resolves the
  available objects through the established port.
- Connection rename and health-check scenarios explicitly return to Connections before using
  connection-owned actions.
- A focused behavioral test covers both the guarded pre-selection state and the automatic
  post-selection transition.

## Validation evidence

| Command                                                                                | Result         |
| -------------------------------------------------------------------------------------- | -------------- |
| Focused `SourceImportWizard` Vitest run                                                | PASS — 26/26   |
| `pnpm --filter @dvt/web typecheck`                                                     | PASS           |
| `pnpm --filter @dvt/web lint`                                                          | PASS           |
| `pnpm --filter @dvt/web test:presentation:run`                                         | 996/999 passed |
| Isolated retry of the three unrelated Canvas context-menu failures from the full suite | PASS — 20/20   |

The three full-suite failures were transient portal-discovery failures in unchanged Canvas
context-menu tests. All three files passed together on the immediate isolated retry.

## Debt and stubs

No debt, stub, placeholder, parallel rail, disabled rule, relaxed check, or bypassed hook was
introduced.
