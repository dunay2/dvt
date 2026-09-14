---
title: Explicit Transform result destination authoring
status: Accepted
date: 2026-09-14
owners:
  - '@dvt/contracts'
  - '@dvt/web'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/DvtTransformResultTarget.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/WorkspaceGraphDvtNodeFieldPolicy.v1.ts
  - apps/web/src/app/views/canvas/canvasDvtTransformAuthoring.ts
  - apps/web/src/app/views/canvas/DvtTransformResultTargetFields.tsx
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/web typecheck
    - pnpm --filter @dvt/web lint
    - pnpm verify:prepush
---

# Explicit Transform result destination authoring

## Authority and scope

[Issue #3115](https://github.com/dunay2/dvt/issues/3115),
[the target contract](../contracts/planner/DvtTransformResultTarget.v1.md),
ADR-0035 and the existing `ConfigureCanvasDvtNode` rail govern this slice.
Planning DB design `GH-3115-EXPLICIT-RESULT-TARGET` and feature
`CANVAS-TRANSFORM-RESULT-TARGET-3115` precede implementation. The issue carries
the preimplementation Fowler matrix and the chronological validation journal.

The shared value object reuses ConnectionRef and PostgreSQL identifier policy.
Graph and node-command validation use one extracted DVT field policy. The Web
form edits the existing Inspector draft; existing protected Graph Draft CAS
owns persistence. No new route, storage authority, SQL or worker is introduced.

## Regression evidence

- Existing field-policy tests: 52 passed before and after extraction.
- Target graph/command tests: 24 rejection cases failed before implementation;
  all 32 target tests then passed. Full contracts suite: 613 passed.
- Metadata tests cover explicit save/removal, absent-target compatibility,
  malformed persisted state, unrelated semantic edits and canonical identities.
- Connection tests cover all JOIN inputs, chains, conflicting/malformed/missing
  bindings, broken edges and cycles. No source-derived default is persisted.
- Form tests cover explicit selection, blank identifiers, read-only mode and
  preservation of a saved reference after input bindings change.
- Cypress `canvas-transform-result-target.cy.ts`: 1 passed, no forced actions,
  retries or skips. It exercises Apply validation, graph save/read restoration,
  removal and the Transform double-click Data gesture. The existing stateful
  API test adapter is test-only, not runtime execution evidence.
- Real authenticated browser at `127.0.0.1:5173/canvas`: selected
  `local-postgres-proof`, authored `public.dvt_transform_proof_3115`, applied
  through `PUT /workspace/graph/draft` (200), reloaded and reopened Properties.
  The destination was restored. This authored metadata only; no table was created.

The first Cypress attempt used a raw reload, which lost its fetch test adapter
and reached the real configured API. Reusing the existing session-aware visit
helper fixed the test lifecycle; product authentication was not bypassed or changed.

## Limits and no-debt posture

Authoring a destination is not executing a Transform. Run workload admission,
ADR-0066 publication, completed-result evidence and Transform samples remain
the subsequent #2524/#2723/#2582 vertical. Source samples retain their existing
query. No fake rows, stubs, TODO bypasses or parallel commands were added.
Hooks and quality rules remain enabled. Final delivery requires the committed,
hook-formatted tree to pass `pnpm verify:prepush` and PR CI.
