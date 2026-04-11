---
title: Git Mode Architecture
document_type: architecture_note
status: Active
owner: Frontend / Architecture
last_updated: 2026-04-11
---

# Git Mode Architecture

## Purpose

Git Mode is the frontend review surface for repository-backed change awareness.

Today the active implementation is the `/diff` route rather than a full
repository workbench. The architecture needs to describe that real state
clearly.

## Current Implementation

Primary code anchors:

- [CodeView.tsx](../../../../../apps/web/src/app/views/CodeView.tsx)
- [DiffView.tsx](../../../../../apps/web/src/app/views/DiffView.tsx)
- [workspaceService.ts](../../../../../apps/web/src/app/services/workspace/workspaceService.ts)
- [TopAppBar.tsx](../../../../../apps/web/src/app/components/TopAppBar.tsx)

Current route:

- `/code`
- `/diff`

Current surface:

- file tree and read-only source preview in `Code`;
- shared `WorkbenchReadOnlyState` treatment in `Code` for non-editing posture;
- governed route-root empty and tree-error states in `Code`;
- preview-local error treatment that preserves explorer context when one file
  cannot be loaded;
- preview-local missing-file treatment now comes from a typed workspace-service
  boundary instead of text-based UI inference;
- governed route-level `loading`, `empty`, and `error` treatment in `Diff`;
- SQL review now owns explicit preview loading and error treatment instead of
  silently falling back to compiled SQL;
- SQL and catalog panels preserve graph review when compare context is missing
  by falling back to contextual panel-state treatment instead of a blank pane;
- catalog summary highlights are derived from the real diff document instead of
  placeholder rows;
- compare mode selector;
- severity filters;
- summary cards;
- `Graph Diff`, `SQL Diff`, and `Catalog Diff` tabs.

That means the current Git-review story is a domain-aware diff surface, not yet
an embedded full Git client.

## Target F-23 posture

`F-23` adds one governed review handoff:

- `Code` owns selected-file browsing and recent history entry for that file;
- `Diff` owns revision comparison and rendered review;
- no left-nav Git explorer, staging model, or repository console is introduced.

## UX Rules

- summary and severity should appear before raw diff detail;
- selected-file history should stay scoped to the active file in `Code`;
- revision compare should hand off from `Code` to `Diff`;
- graph, SQL, and catalog deltas should be separate tabs, not collapsed into one
  undifferentiated blob;
- breaking changes must be called out explicitly;
- compare state must remain shareable and route-driven.

## Mature Libraries And References

- code and diff rendering:
  [Monaco Editor](https://github.com/microsoft/monaco-editor)
- workbench review precedent:
  [VS Code](https://github.com/microsoft/vscode)
- dense change tables:
  [TanStack Table](https://tanstack.com/table/latest)

The correct path is to deepen DVT-aware review semantics on top of mature diff
and editor primitives, not to build a bespoke diff engine from scratch.

## Current Constraints

- the current route is still early and partially mock-backed;
- `Code` now has governed read-only treatment, but still stops at browsing and
  has no governed history panel yet;
- route-root and preview-error states are explicit now, but file-history review
  and handoff controls still belong to the later `F-23` slice;
- `Diff` now has governed route-root states, but file-history handoff and richer
  compare presets still belong to `F-23`;
- there is no staged/unstaged/conflict workbench yet;
- change review is present, but repository operations are not yet modeled as a
  full frontend subsystem.

## Related Pages

- [UX Implementation Guide](../ux-implementation-guide.md)
- [Library And Open-Source Reference Stack](../library-and-open-source-reference-stack.md)
