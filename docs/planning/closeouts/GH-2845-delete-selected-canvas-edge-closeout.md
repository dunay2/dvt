---
slice: GH-2845
date: 2026-09-02
last_reviewed: 2026-09-02
issue: 2845
author: Codex
---

# Closeout: GH-2845 — delete a selected Canvas edge

## Governing sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md`

Planning DB returned `reuse-existing-rail`. The implementation therefore extends
`RemoveCanvasEdgeFromContext`; it does not introduce another mutation.

## Work performed

- Editable Canvas elements accept both `Backspace` and the platform `Delete`/`Supr` key.
- A selected dependency edge now has a distinct visible stroke.
- Existing React Flow edge changes continue through `canvasGraphLifecycle.edge`, including
  draft persistence.
- Read-only deletion remains disabled and derived non-removable lineage remains protected.

## Validation evidence

| Command                                                        | Result         |
| -------------------------------------------------------------- | -------------- |
| Focused `CanvasViewport` and `CanvasDependencyEdge` Vitest run | PASS — 18/18   |
| `pnpm --filter @dvt/web test:canvas-presentation:run`          | PASS — 507/507 |
| `pnpm --filter @dvt/web typecheck`                             | PASS           |
| Focused ESLint over the four changed TypeScript files          | PASS           |

## Debt and stubs

No debt, stub, placeholder, fallback mutation, disabled rule, relaxed check, or bypassed hook
was introduced. Browser automation could not claim the already-open Chrome tab, so the
browser check is not presented as evidence; the governed presentation suite is the runtime
interaction evidence for this slice.
