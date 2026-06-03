---
title: Workspace authoring draft aggregate contract evidence
status: Accepted
date: 2026-04-23
owners:
  - packages/@dvt/contracts
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/WorkspaceGraphAuthoringDraft.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/WorkspaceGraphAuthoringCommand.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/WorkspaceGraphDraft.v1.ts
  - packages/@dvt/contracts/test/workspace-graph-authoring-draft.contract.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts build
    - pnpm --filter @dvt/contracts test
    - pnpm verify:prepush
---

# Summary

This evidence records the ARC-2 validation for the workspace authoring draft
aggregate contract slice.

# What changed

- Added a graph-first `WorkspaceGraphAuthoringDraft` aggregate for editable
  persisted drafts.
- Added explicit authoring commands and execution selection semantics so a
  selected executable subgraph can run while unrelated loose nodes remain in
  the draft.
- Repointed the persisted workspace graph draft payload away from the
  compile-ready `DesignGraphDraft` artifact.
- Updated TF-A2 and TF-E2 planning docs to separate authoring state from
  compile/execution state.

# Validation

- `pnpm --filter @dvt/contracts build`
- `pnpm --filter @dvt/contracts test`
- `pnpm verify:prepush`
