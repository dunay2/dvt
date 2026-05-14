---
title: F28 Canvas Workbench Sequence Closeout
status: Accepted
date: 2026-05-14
owners:
  - Frontend
  - Architecture
planning_type: closeout
---

# F28 Canvas Workbench Sequence Closeout

## Summary

`E/F-28` is closed as the parent Canvas workbench shell, save, and export/import
sequence.

The parent objective was to execute the sequence in three governed slices:
Stage 1 simplified the Canvas workbench chrome, Stage 2 proved automatic draft
save posture without adding a manual Save command, and Stage 3 proved the
versioned project snapshot export/import round trip through the existing
protected draft authority.

## Governing Sources

- [Governance document and rule inventory](../status/governance-document-rule-inventory.md)
- [Mandatory Work System For AI](../../guides/ai-work-protocol.md)
- [Command and query rail governance](../../architecture/command-query-rail-governance.md)
- [Fowler opportunity planning governance](../../architecture/fowler-opportunity-planning-governance.md)
- [Canvas Workbench shell/save/export sequence plan](../proposals/mandatory/frontend-and-ux/canvas-workbench-shell-save-export-sequence-plan-20260505.md)
- [Canvas Workbench Stage 1 chrome simplification plan](../proposals/mandatory/frontend-and-ux/canvas-workbench-stage-1-chrome-simplification-implementation-plan-20260506.md)
- [Canvas Workbench Stage 2 autosave proof plan](../proposals/mandatory/frontend-and-ux/canvas-workbench-stage-2-autosave-e2e-proof-plan-20260508.md)
- [Canvas Workbench Stage 3 project snapshot roundtrip plan](../proposals/mandatory/frontend-and-ux/canvas-workbench-stage-3-project-snapshot-roundtrip-plan-20260511.md)
- [Canvas Workbench command/query catalog](../../architecture/components/web/graph/canvas-workbench-command-query-catalog.md)

## Closure Evidence

- `F-28-A` is done and records the Stage 1 Fowler implementation plan for
  Canvas chrome simplification.
- `F-28-B` is done and records the Stage 2 automatic-save browser proof without
  introducing a manual Save command.
- `F-28-C` is done and accepted in
  [F28C Canvas Project Snapshot Roundtrip Closeout](./20260511-f28c-project-snapshot-roundtrip-closeout.md).
- The workboard already reports `F-28-C` as `done`, so this closeout reconciles
  the parent task state with the closed child sequence instead of adding new
  product behavior.

## Fowler Reading

- **Presentation Model:** Stage 1 separated Canvas workbench chrome from global
  shell navigation and route-local authoring state.
- **Command Query Separation:** Stage 2 kept save visibility bound to
  `SaveWorkspaceGraphDraft` and `GetWorkspaceGraphDraft` instead of adding a
  duplicate manual save command.
- **Value Object:** Stage 3 introduced `ProjectSnapshot` as a versioned local
  handoff object rather than treating raw JSON as project authority.
- **Anti-corruption Layer:** Stage 3 validates project snapshot imports before
  any imported data can become protected draft state.

## Validation Evidence

This parent closeout is a planning/documentation reconciliation. It does not
change runtime code.

Required closeout validation:

- `pnpm docs:sync`
- `pnpm docs:workboard:generate`
- `pnpm docs:feature-mechanization:implementation`
- `pnpm verify:prepush`

The child closeouts retain their own focused unit, typecheck, and Cypress
evidence.

## Debt And Stub Check

- No new debt entry is created by this parent closeout.
- No lint, type, test, docs, hook, or quality rule is disabled or relaxed.
- No hooks are bypassed.
- No stub, placeholder, fake implementation, TODO marker, or unfinished runtime
  branch is introduced.
- ARC-2 evidence/risk files are not required because this closeout does not
  touch `packages/@dvt/engine/**`, `packages/@dvt/contracts/**`,
  `specs/contracts/**`, `packages/@dvt/adapter-*/**`, or
  `packages/@dvt/planner/**`.

## Outcome

The `F-28` parent no longer points at Stage 3 as remaining executable product
work. The Canvas workbench sequence is closed, and any residual Canvas i18n or
visual-system work must stay in its own tracked task rather than reopening this
parent sequence.
