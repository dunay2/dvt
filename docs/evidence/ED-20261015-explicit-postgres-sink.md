---
title: One explicit PostgreSQL Sink publication
status: final
date: 2026-10-15
owners:
  - Contracts
  - API
  - Web
  - PostgreSQL publication
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/DvtOperationalWorkload.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/postgres/DvtPostgresPublicationBoundary.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/postgres/DvtPostgresRelationTarget.v1.ts
  - apps/api/src/application/services/dvtWorkloadPublication.ts
  - apps/api/src/infrastructure/workspaceGraphDraft/PostgresWorkspaceGraphDraftStore.ts
  - apps/web/src/app/views/canvas/dvtDestinationBinding.ts
  - apps/web/src/app/views/canvas/DvtPostgresDestinationFields.tsx
  - packages/@dvt/temporal-dvt-postgres-plugin/src/DvtPostgresPluginRunner.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts exec vitest run --maxWorkers=1 --no-file-parallelism
    - pnpm --filter @dvt/contracts build
    - pnpm --filter dvt-api exec tsc -p tsconfig.json --noEmit
    - pnpm --filter dvt-api exec tsc -p test/tsconfig.json --noEmit
    - pnpm --filter @dvt/temporal-dvt-postgres-plugin exec vitest run --maxWorkers=1 --no-file-parallelism
    - pnpm --filter @dvt/temporal-dvt-postgres-plugin exec tsc -p tsconfig.test.json --noEmit
    - pnpm --filter @dvt/web typecheck
    - pnpm --filter dvt-api exec vitest run --config vitest.integration.config.ts test/integration/dvtSinkPublication.integration.test.ts --maxWorkers=1 --no-file-parallelism
    - pnpm --filter dvt-api exec vitest run --config vitest.integration.config.ts test/integration/workspaceGraphDraftSemanticPersistence.test.ts --maxWorkers=1 --no-file-parallelism
    - pnpm --filter @dvt/adapter-postgres exec vitest run test/PostgresDvtStableTablePublisher.integration.test.ts --maxWorkers=1 --no-file-parallelism
    - pnpm --filter @dvt/web test:e2e:selected-closure:live --spec apps/web/cypress/e2e/canvas/canvas-dvt-sink-publication-live.cy.ts,apps/web/cypress/e2e/canvas/canvas-dvt-join-preview-live.cy.ts
    - pnpm validate:contracts
    - pnpm arch:deps
---

# One Explicit PostgreSQL Sink Publication

## Authority And Scope

[#3115](https://github.com/dunay2/dvt/issues/3115) owns the bounded slice. The
[preimplementation design](https://github.com/dunay2/dvt/issues/3115#issuecomment-6202986156)
records current/solution diagrams, alternatives, Fowler analysis, negative paths
and allowed surfaces. Planning DB designs `GH-3115-EXPLICIT-SINK`,
`GH-3115-SINK-CONSUMERS`, `GH-3115-SINK-EVIDENCE`, `GH-3115-SINK-PERSISTENCE`
`GH-3115-SINK-BROWSER-ADMISSION` and `GH-3115-SINK-CLOSEOUT` admit the implementation and the subsequent
consumer, persistence and browser-catalog corrections
before those edits. The local feature references existing ConfigureCanvasDvtNode,
PreviewPlan and StartRun authorities; persistence retains SaveWorkspaceGraphDraft.

Governing sources are AGENTS.md, command/query rail and Fowler governance,
ADR-0035/0064/0066, the
[workload contract](../contracts/planner/dvt-operational-workload-v1.md),
[result-target contract](../contracts/planner/dvt-transform-result-target-v1.md)
and existing protected lowering and PostgreSQL publication boundaries.

The Transform owns its semantic result and ephemeral disposition. One explicit
terminal Sink owns a same-connection table/replace publication. The Sink is the
workload step identity; the Transform remains the semantic identity. Existing
terminal table publication remains admitted. There is no additional durable
intermediate table, executor, command, query, wire version or dependency.

## Implementation Boundaries

- A neutral physical PostgreSQL target replaces Transform-only typing in the
  publisher ports. The versioned Transform target extends that same value object.
- Protected selection checks the exact terminal closure. Shared publication
  intent rejects invalid configurations before SQL artifact publication/lowering.
  A shared contract selector supplies context admission and plugin execution.
- Web uses bounded destination/choice bindings and shared passive fields. CSS
  belongs to its module; no inline styles or extra effect/state authority is added.
  Switching explicitly to ephemeral removes the Transform target atomically.
- Existing draft persistence projects the canonical disposition catalog into its
  SQL constraint. It rejects a target on an ephemeral result without rewriting
  existing drafts or deleting data.
- The retained and new LIVE proofs share public authoring gestures and the row
  oracle, removing duplicated setup from the older long test file.

## Observed RED And GREEN

- Initial contract, protected lowering and authoring RED rejected the new Sink
  shape. The focused positive and negative cases pass after implementation.
- Full Contracts suite initially exposed two obsolete ephemeral-rejection cases.
  Reconciled positive/negative matrices, including both Sink spellings, now pass
  all 840 tests in 76 files.
- API publication/context/projector tests pass 34 cases; the PostgreSQL plugin
  package passes all 14 tests. Production/test type checks passed at that stage.
- The full API unit command passes 1,347 cases. Its existing environment-gated
  PostgreSQL authority/import, onboarding and audit cases skip 27 tests; they are
  not counted as proof. The affected draft and publisher boundaries are exercised
  separately against real PostgreSQL, as listed below.
- Web binding/authoring tests pass seven cases; preview selection and retained
  JOIN/ordering tests pass 14; passive authoring presentation passes seven.
- Real PostgreSQL publication passes the canonical JOIN row oracle, NULL values,
  idempotency and stale fencing, with only the Sink table in the output schema.
  This proof uses the real publisher but an artifact receipt test double; it does
  not alone establish browser-to-Run acceptance.
- Retained stable-table integration passes three cases, including replacement
  with stable table identity and rejection of unmanaged/stale destinations.
- Initial LIVE exposed SQL 23514 on ephemeral draft persistence. The expanded
  persistence matrix reproduced two failures before correction and passes all
  11 real PostgreSQL cases after using the canonical catalog in the constraint.
- Subsequent LIVE exposed the persisted `sink` / projected `dvt:sink` boundary:
  the new selection and pre-existing field policy recognized only the qualified
  spelling. A contract-owned kind catalog now governs selection, metadata checks
  and SQL field-budget projection. Both spellings have positive/negative tests;
  the fixture uses the actual persisted spelling, not a UI-only representation.
  The final focused checks pass eight authoring-contract cases, 15 lowering/context
  cases, 13 real draft-persistence cases and the real Sink-publication case.
- LIVE public UI authoring, Apply, reload, immutable PlanRef, Temporal Run and
  published-row loading pass all three cases across the new Sink and retained
  JOIN specs. The Sink creates its explicit destination and returns the same
  three-row/NULL oracle. The retained terminal path still proves publication A/B
  stale fencing. Provider preflight also executes four real PostgreSQL checks.
  Save-wait interception was subsequently removed to satisfy the draft-boundary
  guard; the final gate repeats that proof using canonical draft GETs only.
- The changed production Web exact-body duplicate guard reports zero candidates.
  Initial lint findings were corrected rather than waived.
- Browser-routing architecture passes 100 cases after explicitly admitting the
  new LIVE spec and shared helper. No capability partition or fail-closed rule is
  relaxed; the retained JOIN proof and the Sink proof are both required consumers.
- Full presentation validation exposed two retained provenance assertions tied
  to the last `code` element instead of the connection selector. Reconciled tests
  observe the named control: common connections are offered but not selected,
  conflicting provenance offers no candidate, and neither edge order mutates the
  draft. Existing explicit-destination preservation assertions remain unchanged.
- Golden contract fixtures pass 25 checks and architecture dependencies pass.
  JSON schemas compile with the same draft/strict settings as CI. An exploratory
  broad Cypress ESLint-project TypeScript invocation exposed existing test-chain
  typing failures; it is not presented as a passing package typecheck. The
  canonical Web typecheck and production build pass separately.

## Integration Boundary

The complete committed implementation diff was classified ARC-2 by
`tools/ci/arc-check.mjs`: evidence/risk plus lint, test, schema and golden checks.
Final full-flow evidence, hook-normalized prepush, exact-SHA Planning DB validation,
review and CI are recorded on the implementation PR and governing issue. This
record does not infer those results from the earlier focused checks.

The existing environment is development/test data, but this cut needs no reset.
Integration is not worker activation. Native plural workloads remain on #3207;
broader result dispositions/publications and integral acceptance remain on issues
3115, 2524 and 2599. No new debt, stub, fake executor, rule relaxation or bypassed
hook is accepted. See the
[rollout risk](../risk-register/explicit-postgres-sink-20261015.md).
