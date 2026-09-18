---
title: Authoritative Transform output sample
status: Accepted
date: 2026-09-15
owners:
  - dvt-api
  - dvt-web
  - '@dvt/contracts'
  - '@dvt/adapter-postgres'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/source-import/SourceDataSample.v1.ts
  - packages/@dvt/adapter-postgres/src/index.ts
  - apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts
  - apps/web/src/app/views/canvas/canvasTransformOutputSample.ts
  - apps/web/src/app/views/canvas/useCanvasNodeDataSample.ts
evidence:
  tests:
    - pnpm --filter '@dvt/contracts' test
    - pnpm --filter '@dvt/adapter-postgres' test
    - pnpm --filter dvt-api test
    - pnpm --filter '@dvt/web' test
    - node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/canvas/canvas-dvt-terminal-transform-preview-live.cy.ts
    - pnpm verify:prepush
---

# Authoritative Transform output sample

## Authority and boundary

[Issue #2582](https://github.com/dunay2/dvt/issues/2582), ADR-0064,
ADR-0066, the VTX2 product contract and the Web command/query rail inventory
govern this slice. The existing `PreviewWarehouseSourceObjectRows` query remains
the only row-sample rail; no parallel run-row endpoint was introduced.

A terminal Transform resolves its sample target only from an exact completed-run
publication, current PlanRef, semantic-plan digest, configured result target and
unique governed source connection. The API forwards the publication token to the
PostgreSQL probe, which compares it with the relation marker inside the same
repeatable-read transaction before selecting rows.

## Proof

- Unit tests accept only aligned authoring, plan, publication and connection
  identities and fail closed for stale or ambiguous authority.
- Contract, API and PostgreSQL probe tests cover token parsing, propagation and
  mismatch rejection.
- The headed live proof executes Preview and Run against real Temporal and
  PostgreSQL services, returns to Canvas, double-clicks the terminal Transform and
  reads three published rows through the guarded query.
- The same live proof requires a new Preview after a Transform edit and rejects an
  unsupported view disposition before Run.

## No-debt posture

No compatibility endpoint, inferred catalog, fake row sample, stub, placeholder,
TODO, skipped check or rule relaxation was added. One-click Transform selection
continues to show semantics; double-click alone requests authoritative data.
