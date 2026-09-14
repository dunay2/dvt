---
title: N-input INNER JOIN Preview through the protected workload rail
status: Accepted
date: 2026-09-14
owners:
  - '@dvt/contracts'
  - '@dvt/postgres-projection'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/DvtOperationalWorkload.v1.ts
  - packages/@dvt/postgres-projection/src/substraitJoinReader.ts
  - packages/@dvt/postgres-projection/src/joinPostgresProjection.ts
  - apps/api/src/application/services/dvtPostgresTargetProjectionPublisher.ts
  - apps/api/src/application/services/dvtOperationalWorkloadProjector.ts
  - apps/web/src/app/views/canvas/canvasDvtPreviewProjection.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts exec vitest run test/dvt-operational-workload.contract.test.ts
    - pnpm --filter @dvt/postgres-projection test
    - pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/dvtNInputPreview.test.ts
    - pnpm --filter dvt-api exec vitest run --config vitest.integration.config.ts test/integration/dvtProtectedPreview.integration.test.ts
    - pnpm --filter @dvt/web exec cypress run --browser electron --config baseUrl=http://127.0.0.1:5173 --spec cypress/e2e/canvas/canvas-dvt-join-preview-live.cy.ts
---

# Scope and authority

Implements the bounded Preview extension in [#2524](https://github.com/dunay2/dvt/issues/2524),
not the whole workload program. Governing sources: ADR-0064, the
[workload projection plan](../planning/proposals/mandatory/runtime-and-contracts/vtx2-generic-execution-workload-projection-plan-20260903.md),
the command/query rail governance, `.arc-policy.yaml`, and Planning DB design
`GH-2524-N-INPUT-JOIN-PREVIEW`, referencing existing `PreviewPlan`/`CompilePlan`.

The change moves the existing read-only JOIN expression inspection and PostgreSQL
AST construction from Canvas to its shared projection package. Authoring remains
in Web. API closure validation binds all selected Sources and effective edges to
one exact semantic document and connection. ProjectRel cardinality remains strict;
the new INNER JOIN profile lowers to one ephemeral workload, never operator steps.

## Evidence

- RED: two/three-source workload contract, API closure and Web intent rejected by
  previous single-source admission. A changed physical table binding initially
  published SQL; it now rejects before CAS.
- GREEN: 16 workload contract tests; 66 existing Web JOIN/expression/SQL regressions;
  10 Web Preview-intent/action tests; shared projection and API focused suites.
- Real PostgreSQL integration: one, two and three Sources, real filesystem CAS,
  Planner and plan store; all three cases persist exactly one workload.
- Live Cypress: one test passes with zero skipped tests. It imports a canonical
  three-source snapshot through the UI and calls the real protected HTTP Preview.
  The response preserves every selected node/edge and a persisted plan identity.
- Manual browser proof used a separate `Preview 2524` project on port 5173.
  Preview `f8a2a48a7b36a00df006dcae3aca44850478a980bdc0ffe16f3b659c563407e1`
  shows three dependencies and one `DVT_POSTGRES_OPERATIONAL_WORKLOAD` step.

The live command used the existing local bearer refresh and Cypress process-env
helpers; credentials were not written to the repository. No runtime response was
stubbed. The pre-existing Cypress harness warns about `allowCypressEnv`; this slice
does not change its security configuration.

## Explicit limits and no-debt statement

The real executor still reports `MISSING_CAPABILITY`; Run remains disabled. SQL
execution belongs to #2723 and disposition/publication to #3115. Preview does not
mutate configured disposition or promise result rows. No new stub, private IR,
duplicate rail, debt item, hook bypass or relaxed validation rule was introduced.
The issue closeout records final lint/typecheck/pre-push results, including any
pre-existing gate failure; this evidence does not assert merge readiness alone.
