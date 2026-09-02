---
title: Canvas edge execution gate evidence
status: Accepted
date: 2026-09-02
owners:
  - contracts
  - api
  - web
planning_type: evidence
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/WorkspaceGraphAuthoringEdgeExecution.v1.ts
  - apps/api/src/application/services/resolveAuthorizedExecutableSubgraph.ts
  - apps/web/src/app/views/canvas/canvasDraftEdgeExecutionGate.ts
  - apps/web/src/app/views/canvas/useCanvasEdgeCommandRunner.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter dvt-api exec vitest run test/application/services/resolveAuthorizedExecutableSubgraph.test.ts
    - pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasDraftExecutionGate.test.ts src/app/views/canvas/useCanvasEdgeCommandRunner.test.tsx
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter dvt-api typecheck
    - pnpm --filter @dvt/web typecheck
    - pnpm docs:feature-mechanization:implementation -- --feature FLOW1-EDGE-EXECUTION-GATE-2579
    - pnpm verify:prepush
---

# Canvas edge execution gate evidence

## Scope

Issue #2579 adds one bounded `open | closed` authoring command to an existing
Canvas edge. Closing an edge keeps its topology but excludes it from executable
subgraph derivation. Reopening deletes the exceptional gate property.

## Semantic boundary

The shared contracts package owns parsing, mutation and effective-execution
policy. Structural `executionDependency: false` is independent and remains
non-executable after reopening. An unknown persisted gate fails closed.

The Canvas working set carries only the typed exceptional `closed` value. It
preserves that value through React Flow edge replacement and draft persistence,
does not transfer it during reconnection, and performs a three-way reload merge:
local changes win; otherwise the remote gate is adopted. The existing edge
command runner is the sole mutation entry point.

## Product evidence

Contract tests cover open, closed, malformed and structurally disabled edges.
API tests prove filtering happens before planner derivation. Canvas behavior
tests cover hydration, close/reopen, missing-edge rejection, replacement,
reconnection, persistence and concurrent reload reconciliation.

No parallel endpoint, store, command bus, renderer state, generic metadata
editor, placeholder or compatibility path was added.
