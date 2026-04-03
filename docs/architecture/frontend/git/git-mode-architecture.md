---
title: Git Mode Architecture
document_type: architecture_note
status: Active
owner: Frontend / Architecture
last_updated: 2026-04-03
---

# Git Mode Architecture

## Purpose

Git Mode is the frontend review surface for repository-backed change awareness.

Today the active implementation is the `/diff` route rather than a full
repository workbench. The architecture needs to describe that real state
clearly.

## Current Implementation

Primary code anchors:

- [DiffView.tsx](../../../../apps/web/src/app/views/DiffView.tsx)
- [workspaceService.ts](../../../../apps/web/src/app/services/workspace/workspaceService.ts)
- [TopAppBar.tsx](../../../../apps/web/src/app/components/TopAppBar.tsx)

Current route:

- `/diff`

Current surface:

- compare mode selector;
- severity filters;
- summary cards;
- `Graph Diff`, `SQL Diff`, and `Catalog Diff` tabs.

That means the current Git-review story is a domain-aware diff surface, not yet
an embedded full Git client.

## UX Rules

- summary and severity should appear before raw diff detail;
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
- there is no staged/unstaged/conflict workbench yet;
- change review is present, but repository operations are not yet modeled as a
  full frontend subsystem.

## Related Pages

- [UX Implementation Guide](../ux-implementation-guide.md)
- [Library And Open-Source Reference Stack](../library-and-open-source-reference-stack.md)
