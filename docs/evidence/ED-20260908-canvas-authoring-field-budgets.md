---
title: Bound Canvas authoring fields across UI, contract, API and PostgreSQL
status: Accepted
date: 2026-09-08
owners:
  - packages/@dvt/contracts
  - apps/api
  - apps/web
arc_level: ARC-2
breaking: true
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/CanvasAuthoringFieldPolicy.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/WorkspaceGraphAuthoringDraft.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitSemanticDocument.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitPlanFieldPolicy.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitSupportedCapabilities.v1.ts
  - packages/@dvt/substrait-analysis/src/relationChangeSet.ts
  - packages/@dvt/postgres-projection/src/relationalSql/project.ts
  - apps/api/src/infrastructure/workspaceGraphDraft/PostgresWorkspaceGraphDraftStore.ts
  - apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/entrypoints/http/workspaceGraphDraftRoutes.test.ts
    - DVT_PG_URL=<postgres> pnpm --filter dvt-api exec vitest run --config vitest.integration.config.ts test/integration/workspaceGraphDraftSemanticPersistence.test.ts
    - pnpm --filter @dvt/web test
    - node ../../tools/ci/run-web-cypress-native.mjs --headed --browser chrome --spec cypress/e2e/canvas/canvas-authoring-field-budgets.cy.ts
    - pnpm verify:prepush
---

Issue #3019 gives every editable field in the PCV1-I1 Canvas journey one
contract-owned category and limit. Human names, descriptions and tags use
Unicode code points. PostgreSQL identifiers and string literals use UTF-8
bytes. Timestamps and choices use closed semantic validation. This denominator covers
the enumerated fields exposed by PCV1 editors; opaque plugin metadata and binary
semantic documents remain outside recursive text limits.

The Web keeps rejected text visible, reports an accessible error and prevents
Apply. The shared v1 draft and Substrait schemas reject direct API bypasses.
PostgreSQL adds a named CHECK for the visible JSONB fields, so a caller cannot
persist an oversized draft by bypassing the HTTP boundary.

The cut removes the UTF-16 tag truncation helper. It adds no parallel profile,
compatibility parser, fallback enum, stub or fake persistence path. Existing
stored rows that violate the new policy fail closed at the v1 read boundary
until an explicit operator cleanup; they are never silently rewritten.

## Native Transform discriminator regression — 2026-09-14

Issue #3167 extends the existing materialization predicate to the native
`pluginId: dvt, kind: transform` identity used by protected Preview. The namespaced
identity keeps its existing policy; other plugins are not constrained by DVT enums.
No new enum, default, property, runtime descriptor or persistence owner is added.

RED reproduced twelve contract failures and a real PostgreSQL write accepting
unsupported `incremental`. GREEN covers 52 field-policy cases, protected HTTP
rejection before persistence, and real PostgreSQL refusal of invalid direct writes
including nested Canvas nodes. Valid `table` configuration reloads unchanged;
rejected writes preserve the prior draft and revision. The existing 1/2/3-input
Preview persistence/replay suite remains green.

The full semantic-persistence suite also exposed a separate native-kind mismatch
in semantic authority validation and its test helpers. That finding is not hidden
by the focused materialization evidence and needs its own correction before full
suite closeout. No native Run or publication is claimed here.

## Native semantic authority follow-up — 2026-09-14

Issue #3168 corrects that separate discriminator mismatch. Native DVT Transforms
now reuse canonical semantic validation/canonicalization on save and reload, and
the existing PostgreSQL sidecar budget predicate. The persistence test helpers
inspect and mutate the actual native fixture instead of missing it by kind name.
The original namespaced behavior and foreign-plugin ownership remain unchanged.

RED: three native semantic contract cases failed (canonicalized label, corrupt
bytes, retired authority). GREEN: all 581 contract tests pass, including both node
kinds and schema synchronization. The complete affected PostgreSQL suites pass
all nine cases, including exact semantic save/reload, corrupted-payload rejection,
direct invalid writes and the 1/2/3-input protected Preview replay regression.

Live browser proof uses the existing protected API client in project
`preview-replay-3165-33bdb67b`: unsupported materialization and invalid semantic
authority both return HTTP 400, with unchanged stored draft and revision.
Ordinary Canvas selection still opens the semantic tree; Preview displays
`MISSING_CAPABILITY executor.dvt-postgres-operational-workload` with Run disabled.
This proves validation/persistence, not native provider execution or publication.

## Neutral semantic names and target admission — 2026-09-24

The #3263 / RELINC1 convergence removes the PostgreSQL identifier budget from
semantic field/root display names. The contract owns their limit of 256 Unicode
code points, rejects malformed names instead of trimming, and the PostgreSQL
draft store enforces the same character budget. Physical database identifiers
and generated PostgreSQL output names retain the target's 63-byte limit. A valid
semantic draft can therefore be unavailable for that target without being corrupt.

The implementation follows the boundary correction in
[PCV1](../planning/proposals/mandatory/runtime-and-contracts/pcv1-canvas-authoring-field-budgets-3019-20260908.md)
and the pre-implementation
[convergence journal](https://github.com/dunay2/dvt/issues/3263#issuecomment-5814426257).
Roll out contracts, Web and API together. No stored document is rewritten, no
wire version is invented, and no compatibility reader is retained. Older readers
may reject newly admitted long semantic names; this is an explicit hard cut.

Verified during this cut: the contract suite passed 669 tests; real PostgreSQL
semantic persistence passed all seven cases, including direct-write rejection
and unchanged persisted authority after rejection. The neutral analysis and
PostgreSQL target suites passed 327 tests together. Target tests distinguish
Unicode character budgets from UTF-8 identifier bytes and preserve fail-closed
physical-source validation.

The Web SQL boundary now calls the shared PostgreSQL target, after verifying the
selected graph's source and upstream-document bindings. The four shape-specific
Web SQL renderers were removed. Nullable CONCAT uses PostgreSQL concatenation
with Substrait's null propagation; UTC-year projection is independent of the
database session timezone. Real PostgreSQL scalar and compositional integration
tests passed all 18 cases. This is projection/sample evidence, not operational
Run/publication or completion of every Canvas presentation reader.

Current implementation and behavioral evidence:

- `apps/web/src/app/views/canvas/canvasDvtSubstraitOutputProjection.ts`
- `apps/web/src/app/views/canvas/canvasSubstraitGraphBindings.ts`
- `packages/@dvt/postgres-projection/src/relationalSql/scalarBindings.ts`
- `packages/@dvt/postgres-projection/test/relationalSqlNames.test.ts`
- `apps/api/test/integration/dvtScalarSql.integration.test.ts`
- `apps/api/test/integration/workspaceGraphDraftSemanticPersistence.test.ts`

The `code_refs` of the earlier SQL evidence and the affected open risk entries
now point to the shared target and focused replacement tests. Their original
dated execution commands remain historical evidence, not claims that a deleted
test still runs. Existing proposal snapshots are not the current mechanization
authority: Planning DB records the implemented ConfigureCanvasDvtNode and
PreviewExecutionPlan rails for GH-3263-SELECTED-RELATION-FILTER.

Selected-filter browser proof passed both controlled-boundary cases (left/right
insert, Apply, reload, edit, remove, no implicit sample or Run) and the real
protected-API/PostgreSQL case (filter both operands, save/reload, explicit sample,
LEFT JOIN unmatched rows and matching semantic-plan hash):

```text
pnpm --filter @dvt/web test:e2e:native --spec cypress/e2e/canvas/canvas-selected-relation-filter.cy.ts
DVT_SELECTED_CLOSURE_CYPRESS_RUNTIME=native pnpm --filter @dvt/web test:e2e:selected-closure:live --spec apps/web/cypress/e2e/canvas/canvas-selected-filter-live.cy.ts
```

An additional RED/GREEN component proof holds the schema query pending, then
unmounts the editor or removes edit permission. Both cases now cancel removal
without advancing the document revision; normal completion still applies once.
No global invalidation workaround, stub, alternate authority or rule relaxation
was introduced. The cache's hot relation queries are incremental; the existing
Apply/document export boundary still materializes and hashes the whole document.
That boundary and legacy column-presentation readers are not declared converged.

The approved #3369 presentation migration first closes a neutral-analysis gap:
struct constructors, nested field selections and flattened schema names now
preserve hierarchical types and per-child value dependencies. SET merges child
dependencies from every operand; selection through a null-extended JOIN parent
is nullable without changing the stored child type. Cached schema facts use a
new internal key version; no stored semantic document or public hash changes.
RED reproduced rejected struct schemas and lost right-hand SET dependencies.
GREEN: `pnpm --filter @dvt/substrait-analysis test` passed 98 tests and
`pnpm --filter @dvt/postgres-projection test` passed 236. These are prerequisite
package checks, not evidence that the external Canvas consumer is migrated.

## Canvas field consumers and controller separation — 2026-09-24

The [approved consumer cut](https://github.com/dunay2/dvt/issues/3369#issuecomment-5817197666)
now projects external cards, the inspector and column lineage from the shared
Substrait analysis. Shape-specific presentation branches and the redundant
structured-field presentation/lineage adapters are removed. Types, nullability,
nested fields and multi-input dependencies come from canonical schema facts;
PostgreSQL admission remains a separate, explicit projection.

The [controller design journal](https://github.com/dunay2/dvt/issues/3369#issuecomment-5817924201)
separates card actions, column actions, composition, lineage and transient geometry.
The read-model contract no longer selects a long list from the producer hook's
return type. Its tests are split by behavior; source-text implementation recipes
are removed where command, permission and identity tests already prove the intent.
The viewport also separates card projection from state synchronization and reuses
its computed edge projection rather than computing it twice.

One bounded schema cache is shared by a consumer's sessions through the existing
`RelationAnalysisCache` interface. Independent Canvas inputs are scheduled once
per batch, in dependency order. Geometry-only frames reuse semantic inputs and
results. Replacement, cancellation and unmount cannot publish obsolete results;
pending edge commands recheck draft, catalog and edit permission before mutation.
Receiving a complete document still indexes/hashes that document: this is not a
claim that whole-document receipt or every authoring reader is incremental.

The cache regression was RED with two relations reanalyzed after replacement,
then GREEN with zero analysis and identical fields/bindings. The complete Web unit
suite passed 2,164 cases; the additional cache and selected-operand card assertions
passed six focused cases. The controller split preserved all 18 behavior cases.
Connection routing and lifetime checks passed 24 cases. Web typecheck passed.

Both browser commands above were rerun for this consumer cut. The controlled
suite passed 2/2 and the protected PostgreSQL suite passed 1/1, without skips.
They now assert the external card's output columns before editing and after
Apply/reload, not just the internal relation tree. The live sample preserves
LEFT JOIN unmatched rows, canonical field order and the exact saved plan hash.
No implicit sample or operational Run was introduced.

These results are scope evidence; the complete presentation/architecture suites,
hook-normalized formatting and pre-push gate remain required before integration.

The complete Web primary suites passed in [CI for PR #3405](https://github.com/dunay2/dvt/actions/runs/36036015693).
The earlier complete local presentation runs hit the existing five-second test
budget under parallel load; their affected cases passed together under the
existing serial CI configuration. No timeouts or checks were relaxed.

[PR review corrections](https://github.com/dunay2/dvt/issues/3369#issuecomment-5819285162)
preserve the inspector's Project(Filter(input)) placement by passing its exact
input RelationId to the shared Filter command. Reopening edits that Filter rather
than inserting another. A pending second incoming node blocks the old projection
form until composition is resolved; unrelated edges and read-only permissions
retain their own behavior. Both reported failures were reproduced before fixing
the adapter. All 24 focused component cases passed, including apply/reopen/edit/
remove with stable bindings, pending-composition transitions and selected-relation
editing. The source-filter inspector and selected-left/right Cypress proofs passed
all three cases; the source-filter proof now uses the shared form's visible controls.
The contract traceability header and generated manifest also pass
`pnpm traceability:adr0`. These corrections remain subject to the final committed
pre-push and PR checks.

## Selected-relation authoring hard cut — 2026-09-25

The [approved hard-cut plan](https://github.com/dunay2/dvt/issues/3369#issuecomment-5823167237)
removes shape-specific JOIN, CROSS, SET, aggregate, window and sort/fetch authoring
modules before migrating their consumers. The first typecheck was intentionally
RED on missing imports. The pilot forms, whole-tree command dispatch, seed
hydration and JOIN-only output authoring are deleted, not compatibility wrappers.

Operator forms now edit an exact RelationId at an expected session revision.
Shared selected-relation commands validate the local change, rebind affected
consumer fields and commit through the existing draft/Apply boundary. Source
occurrences, output selection and the semantic lab use those same commands.
Substrait and its sidecar remain the authority; no additional IR or SQL-derived
authoring model was introduced. Existing incremental analysis and its bounded
cache remain behind `CanvasRelationAnalysisSession`. Full document receipt,
serialization and hashing at Apply are still explicit whole-document boundaries.

Asynchronous card queries retain the last ready presentation while pending, but
disable stale field commands. Output controls retain DOM identity and keyboard
focus during that interval. Typed commands reject stale revisions, cancelled
work, foreign fields and invalid output references without publishing edits.
The browser proof also exposed identity aliasing when a pending input shared a
field name with a selected output. Two RED unit cases demonstrated that the card
adapter replaced distinct references with the output's reference. The adapter now
matches identified fields by reference, including pending inherited fields;
display-name matching cannot override an existing identity. Both cases are GREEN.

Validation completed before final closeout:

- `pnpm --filter @dvt/web typecheck`: passed.
- `pnpm --filter @dvt/web test:canvas-unit:run`: 1,283 passed after the pending-field identity correction.
- `pnpm --filter @dvt/web test:canvas-architecture:run`: 143 passed.
- `pnpm --filter @dvt/web test:unit:run src/app/views/canvas/canvasRelationOutputIntent.test.ts`:
  two additional cases passed, including sparse output mappings across persisted
  binary and composed relations.
- `pnpm --filter @dvt/web test:e2e:native --spec cypress/e2e/canvas/canvas-card-field-lifecycle.cy.ts`:
  four passed. Selection, focus, pointer/keyboard reordering, empty outputs,
  disconnected sources and reload are exercised on two- and three-input models.
- `node --test scripts/lib/feature-mechanization-git-diff.test.cjs`: 16 passed.
  The real-Git addition/modification cases were RED on the default 1 MiB stdout
  buffer. The reader now uses a bounded 32 MiB budget and retains fail-closed
  behavior. No added evidence is filtered out to make the gate pass; the bounded
  correction is recorded in the [closeout scope](https://github.com/dunay2/dvt/issues/3369#issuecomment-5826362594).
- With `DVT_SELECTED_CLOSURE_CYPRESS_RUNTIME=native`,
  `pnpm --filter @dvt/web test:e2e:selected-closure:live --spec apps/web/cypress/e2e/canvas/canvas-selected-filter-live.cy.ts`:
  one passed against the protected API and PostgreSQL, with no pending or skipped
  tests. Filters, sorting and limits on both operands preserve LEFT JOIN unmatched
  rows, output order and the saved plan hash after reload.

These are bounded results, not an integration declaration. Remaining browser
cohorts, generated inventories, committed-tree pre-push and PR gates must pass
before integration. Scalar/structured projection primitives outside the removed
operator-authoring family are not claimed to have disappeared. No rule was
relaxed, hook bypassed, new debt approved or stub introduced by this hard cut.

### Capability evidence consumer — 2026-09-25

The [reference audit](https://github.com/dunay2/dvt/issues/3369#issuecomment-5827325181)
identified an admission proof pointing at a deleted JOIN-composition test. Its
replacement is `canvasSelectedJoinConditionPersistence.test.ts`, which exercises
comparison and grouped AND/OR roundtrips with stable relation/field identities.
The catalog must point to that current proof; retaining the old test as an alias
would contradict the hard cut. A catalog-wide contract check requires local
fixture, semantic and negative proof paths to resolve.

Only the evidence reference changes: admitted identities, semantic wire format,
provider status and execution behavior remain unchanged. The complete diff is
therefore routed through ARC-2 because it touches contracts, with the existing
risk entry and schema/golden checks retained. Validation is recorded in the PR
against its committed base/head before integration.
