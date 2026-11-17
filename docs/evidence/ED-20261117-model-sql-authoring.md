---
title: Explicit Model SQL authoring
status: draft
date: 2026-11-17
owners:
  - API
  - Web
  - Adapters
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/canvas/ModelSqlCompilation.v1.ts
  - packages/@dvt/postgres-projection/src/sqlSource/compile.ts
  - packages/@dvt/postgres-projection/src/relationalSql/modelSource.ts
  - apps/api/src/application/services/projectCanvasModelSqlContextQuery.ts
  - apps/api/src/application/services/prepareCanvasSqlDraftProjection.ts
  - apps/web/src/app/views/canvas/model-sql/CanvasModelSqlPanel.tsx
  - apps/web/src/app/views/canvas/model-sql/modelSqlApplyCommand.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/postgres-projection test
    - pnpm --filter dvt-api exec vitest run test/application/services/resolveCanvasModelSqlInputs.test.ts test/application/services/compileCanvasModelSqlQuery.test.ts test/entrypoints/http/canvasModelSqlRoutes.test.ts
    - pnpm --filter dvt-api exec vitest run --config vitest.integration.config.ts test/integration/sqlReadProof/modelSqlSource.test.ts test/integration/sqlReadProof/modelSqlQueries.test.ts
    - pnpm --filter @dvt/web exec vitest run src/app/views/canvas/model-sql src/app/services/canvas/canvasModelSql.api.test.ts src/app/components/monaco/monacoVisualTokens.architecture.test.ts src/app/views/canvas/CanvasModelEditor.navigation.test.tsx
---

# Explicit Model SQL authoring

[#3944](https://github.com/dunay2/dvt/issues/3944) and the native
`GH-3944-MODEL-SQL-AUTHORING` design govern this additive source language and
Workbench interaction under ADR-0064 and ADR-0069. The
[component design](../architecture/components/adapters/postgres-model-sql-source.md)
and [data access contract](../contracts/data-access-modes.md) define its limits.

The canonical evaluator compared base
`4a14b1b7dfcb51d49af0d02722c9428e6ececedf` with hook-normalized implementation
checkpoint `758310ab1`: 83 paths, ARC-2, evidence and risk required; no rollout
notes or compatibility matrix required. Final readiness and merge acceptance
must use the complete final candidate, not this checkpoint.

## Behavior and authority

One resizable SQL pane sits between the semantic canvas and existing data
drawer. A single toolbar offers Validate, Execute and Generate Model. Monaco
uses common typography tokens, logical-input completions, diagnostics and
Ctrl+Enter. Typing performs no query. The semantic canvas stays mounted and
only one preview owner renders into the data host.

The two new queries prepare an authorized revision-bound namespace and a
complete pinned Substrait proposal. Execute extends the existing
`PreviewCanvasTransformRows` rail with an explicit POST DTO, recompiles on the
server and uses the existing bounded read-only PostgreSQL probe. It does not
save, Apply, materialize or start a Run. Generate uses the existing Model Apply,
dependency rejection, autosave and CAS transaction. SQL is local source state;
there is no new persisted aggregate or warehouse DDL.

The compiler admits only the documented SELECT profile. It rejects unsupported
meaning atomically, rather than returning partial semantics. Existing Read
occurrences and unique direct output provenance preserve opaque canonical IDs.
Names and ordinals never create identity. Restricted publications are projected
before consuming operations. Logical SQL seeds preserve canonical ordinals while
omitting unavailable outputs, and reject unavailable row dependencies.

## Executed proof

- Contracts: 1,047 tests passed. PostgreSQL projection: 356 tests passed,
  including existing physical-renderer regressions.
- Native PostgreSQL: 57 tests passed with zero skips using the repository's
  disposable database lease. The independent oracle compares original SQL,
  canonical rendering and logical-seed recompilation across empty rows,
  duplicates, NULLs, quoted names, all admitted join kinds, ordering, limits and
  native types. The composed application/query/probe case verifies exact rows,
  truncation and an unchanged incomplete saved Model.
- API focused tests cover protected scope, exact physical object identity,
  unavailable types, stale context, Source publication restrictions, zero
  graph writes and unused external-producer provenance. API production/test
  types and the official Web typecheck passed.
- Web focused tests: 33 passed, including query transport identity, navigation,
  stale results, visual conflicts, typography and an Apply acknowledgement that
  survives its own graph revision. Affected ESLint passed without warnings.
- A subsequent workspace review reproduced six additional failures: visual
  authoring remained enabled during SQL Apply, and input identity changes did not
  refresh the namespace. All six now pass, including cancellation that retains
  the lock until actual settlement. Two file-input regressions and the existing
  30 Input binding tests also pass. Shared validated protocol fixtures keep the
  panel and workspace proofs separate from their DOM lifetime setup.
- Complete-scope validation found two obsolete Shell expectations and a real
  passive-layout violation. The footer proof now checks the accessible SQL
  disclosure and its controlled panel; the data proof requires exactly one
  existing host. Resize effects belong to the workspace's focused layout hook.
  Both Monaco isolation proofs share one finite leaf catalog, with the SQL
  authoring leaf explicitly admitted and all other isolation rules retained.
  All 1,105 architecture cases and 35 composed presentation cases passed after
  these corrections. Failed gate attempts are not acceptance evidence.
- The retained SQL section now has native hidden state when collapsed. Thirty
  affected composed cases passed; the three affected Chrome specs passed all
  eight cases, including existing Model navigation and footer geometry. SQL
  collapse preserves visible data in the external host and exact source on
  reopen. A Cypress attribute/visibility subject error was corrected before
  the successful SQL rerun. An earlier complete prepush was deliberately
  interrupted to reconcile the old browser expectations; it is not acceptance.
- Chrome on the existing `http://localhost:5173/canvas`: one controlled journey
  passed, with no pending or skipped tests. Real Monaco input and native
  Ctrl+Enter lead to rows in the existing data drawer. Keep-editing navigation
  preserves SQL. Generate uses the real UI command and stateful save protocol;
  an acknowledged save survives reload with canonical output and positions.
  This is controlled browser transport proof, not a live API claim. The native
  application/probe test separately establishes real PostgreSQL execution.

The actual browser capture is retained under
`.dvt/evidence/gh3944/sql-final-screenshots/canvas-model-sql-authoring.cy.ts/gh3944-model-sql-data.png`.
An independent read-only review identified and re-reviewed three corrected
defects: query/Apply fencing, restricted-publication seed generation and unused
file provenance. A brittle Monaco whitespace assertion was corrected; a reload
proof run concurrent with formatter changes failed and was rerun successfully
against the stable normalized commit. Neither failed run is acceptance evidence.

## Inspection entry and retained runtime proof

- Edit SQL opens the existing Model authoring panel through a scoped presentation
  action. The entry shares its controlled section identifier and expanded state.
  Copy belongs to the English/Spanish catalog and rendering uses shared tokens.
- The new behavioral case failed with an absent action before wiring. The focused
  inspection and Shell run passed 27 cases after wiring. The official Web
  typecheck passed after projecting both initial and persisted fixture nodes
  through the existing canonical-node mapper.
- The controlled Chrome journey passed its complete SQL, Apply, data, navigation
  and reload flow with the direct inspection entry. It asserts retained SQL text,
  coherent expansion and explicit action counts. The inspection unit harness and
  browser protocol fixture have separate physical owners from their assertions.
- Automatic review rejected replacing an SQL-content assertion with visibility.
  The assertion is retained. The fixture now reads the actual saved draft and
  derives the next context identity, semantic digest and SQL seed from that Model.
- A complete gate passed all 6,857 selected Vitest cases and 59 controlled Chrome
  specs with 177 passing cases. Its real-stack plan passed 83 of 85 cases and
  exposed two retained proof failures. This failed gate is diagnostic evidence.
- The Run controls fixture declared static materialization through Jinja, forcing
  repeated native analysis beyond its existing Preview deadline. Project YAML now
  declares table materialization and SQL retains pg_sleep(20). An isolated RED
  run reproduced the failure. The real-stack GREEN run passed cancellation,
  recovery and project creation with zero pending or skipped cases. Run controls
  decreased from 77 seconds to 39 seconds in those recorded executions.
- The project proof synchronizes with observable menu expansion, visibility and
  closure during scope selection. Its single-POST, empty-project, identity and
  reload assertions remain exercised. Independent read-only review found the
  retained proof corrections equivalent and identified the subsequently corrected
  fixture type mismatch.

## Compact SQL results

The existing `PreviewCanvasTransformRows` result projection now reuses the
shared compact sample-grid variant. Search and refresh remain directly above
the rows; identity, authoritative counts and LIVE provenance use its footer.
Revision, semantic digest and the execution explanation remain in the existing
information disclosure. Truncated samples retain their `+` indicator.

- `pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/views/canvas/model-sql/CanvasModelSqlPanel.test.tsx`
  reproduced the oversized header before the change (one failed, five passed).
- The same command with `src/app/views/canvas/CanvasOperationDataPreview.test.tsx`
  passed all 19 cases after the change, including refresh, retained disclosure
  metadata, counts and the existing operation result lifecycle.
- `pnpm --filter @dvt/web lint` and `pnpm --filter @dvt/web typecheck` passed.
- `pnpm --filter @dvt/web test:e2e:native --browser chrome --spec cypress/e2e/canvas/canvas-model-sql-authoring.cy.ts`
  passed the complete authoring journey with zero skipped or pending cases. Its
  relative geometry assertion bounds the space before the table by twice the
  toolbar height; its real Chrome screenshot shows the compact result grid.
  This uses the controlled browser transport, independently of the earlier
  native PostgreSQL execution evidence.

The running application remains at `http://localhost:5173/canvas`. The shared
VS Code browser reports hidden visibility and suspended animation frames even
after browser activation, so its click stability wait is not live UI evidence.
No forced click or operating-system permission change was used.

## Single authoring entry and native proof ownership

The first button-unification implementation removed the generated-SQL viewer
from the authoring inspector. Cross-consumer review found that this exceeded
the user's action-unification choice and broke the retained physical SQL and
simplification workflow. That interpretation was corrected: one explicit action
requests the protected readable SQL and opens logical authoring independently.
The inspector retains its original/readable viewer and evidence; physical SQL
is never copied into the editable logical source.

- The existing inspection test reproduced two actions before the change (one
  failed, eight passed). The composed run with SQL panel and operation data
  tests passed all 28 cases after the change.
- Native Chrome passed the complete SQL authoring, data, Apply and reload
  journey with zero pending or skipped cases. It checks one inspector action,
  no second Monaco view, retained text and unchanged explicit action counts.
  Captures: `gh3944-model-sql-data.png` and `gh3944-model-sql-single-entry.png`.
- The user explicitly authorized the native reconciliation described in
  [the issue record](https://github.com/dunay2/dvt/issues/3944#issuecomment-6953788477).
  Official operators revised the cohesive SQL component's exact ownership for
  the unit harness and browser fixture, completed existing context symbol
  declarations, and registered a reference-only native-browser proof consumer.
  The primary Preview rail remains in place; no product command was added.
- The native check passed 813 manifests for `97abab83a` after that correction.
  Its first run rejected the proof consumer's missing Fowler citation and
  unit-test references pruned by forbidden product paths. The consumer now
  cites the governing policy and the existing package-level test command,
  consistent with canonical runner consumers. Implementation surfaces and
  forbidden product paths were unchanged. A missing operation-type invocation
  rolled back before retry; neither failed attempt is acceptance evidence.

## Extracted browser fixture admission

The full prepush for `3bcb7ba9e` passed native mechanization, documentation,
format and changed-file lint, then rejected the extracted SQL fixture before
browser execution because it was absent from `cypress.supportCapabilities.ts`.
The existing fixture-closure table now includes that helper and reproduces the
failure (one failed, 139 passed). One exact controlled-runtime registry entry
fixes admission; the scenario catalog, runtime selection, unknown-path rejection
and execution budgets remain unchanged. The shared test discovers actual
transitive consumers and checks their complete, disjoint runtime coverage.

`pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/testing/vitestSuites.browserRouting.architecture.test.ts src/testing/vitestSuites.browserCatalog.architecture.test.ts src/testing/vitestSuites.browserCatalogReadiness.architecture.test.ts`
passed all 210 contracts after that correction. This failed prepush remains
diagnostic evidence, not an acceptance receipt.

## Inspector edit cancellation and unified SQL action

`RenderCanvasContextualGraphSurface` retains the inspector's presentation
ownership. Closing clears local edit mode and selected-only state before
unmounting its form. Pointer close prevents a focused field from committing
through blur. It does not settle the Workbench's separate staged transaction.

- The close/reopen regression reproduced persistent editing (one failed, seven
  passed). After correction, the composed inspection/Apply/output-order run
  passed 18 cases, including the existing close-before-Model-Apply contract.
- The single-action regression reproduced the missing protected SQL query (one
  failed, eight passed). The final combined run passed all 34 cases across SQL
  inspection/panel and Workbench composition/Apply/output ordering. It includes
  projection failure with authoring still available.
- `pnpm --filter @dvt/web test:e2e:native --browser chrome --spec 'cypress/e2e/canvas/canvas-model-sql-authoring.cy.ts,cypress/e2e/canvas/canvas-relational-tree-workbench.cy.ts'`
  passed four cases across both specs, zero pending/skipped. A focused valid
  alias is typed and discarded by Close, with unchanged PUT count and enabled
  SQL on reopen. The retained projection proof keeps original/readable SQL,
  simplification evidence, exactly two explicit GET requests and no writes/runs.
  A first PowerShell invocation lacked quotes around the spec list and was
  rejected before execution; it is not product-failure or acceptance evidence.
- The complete gate for `a97b49e85` was interrupted for the user's new Close
  requirement during early selected Vitest execution. It produced no acceptance
  receipt. No source was modified until the execution tree had stopped.

## Inspection contract ownership

The exact-head native check for `2d4814dea` rejected a stale authority hash after
inspection prose was added to the global command/query catalog. No command or
rail declaration had changed. That presentation contract is now in the
[existing Workbench's dedicated guide](../architecture/components/web/graph/relational-workbench-inspection-component.md).
The global catalog is restored byte-for-byte to its admitted content. The
existing Workbench component's governance references were extended through
`ReviseGovernanceComponent` with revision CAS; ownership, parent and command/query
rails were unchanged. No Planning DB import, rebuild or declaration-check bypass
was performed. The fresh final-head native check remains an integration gate.

## Completion boundary

Native component, port, contract, test and query records describe actual
implementation. The issue/PR must retain exact final prepush, required CI,
review and base/head implementation-validation results before integration.
These focused executions do not substitute for that acceptance boundary.
No hook bypass, relaxed rule, stub, placeholder, hidden skip or new debt entry
is part of this implementation. Profile limitations are explicit product
admission boundaries, not unimplemented success branches.
