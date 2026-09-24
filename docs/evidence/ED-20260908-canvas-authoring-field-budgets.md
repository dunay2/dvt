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
