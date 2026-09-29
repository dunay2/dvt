---
title: Catalog SQL expression authoring and progressive PostgreSQL verticals
status: Verified
date: 2026-09-29
owners:
  - apps/web
  - packages/@dvt/postgres-projection
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitSupportedCapabilities.v1.ts
  - packages/@dvt/postgres-projection/src/substraitColumnFunctionCatalog.ts
  - packages/@dvt/postgres-projection/src/relationalSql/scalarBindings.ts
  - packages/@dvt/postgres-projection/src/substrait-profile/sum.ts
  - packages/@dvt/postgres-projection/src/dvtPostgresOutputSchema.ts
  - apps/web/src/app/views/canvas/canvasDerivedOutputFormula.ts
  - apps/web/src/app/views/canvas/canvasSelectedRelationAggregate.ts
evidence:
  tests:
    - pnpm exec vitest run packages/@dvt/contracts/test packages/@dvt/postgres-projection/test
    - pnpm --filter @dvt/contracts schema:verify
    - pnpm --filter @dvt/web test:unit:run
    - pnpm --filter @dvt/web test:presentation:run
    - pnpm --filter @dvt/web test:architecture:run
    - pnpm --filter dvt-api test:integration:ci test/integration/dvtScalarSql.integration.test.ts test/integration/dvtSumSql.integration.test.ts
    - pnpm --filter @dvt/web test:e2e:selected-closure:live --spec apps/web/cypress/e2e/canvas/canvas-sql-progressive-live.cy.ts
---

# Catalog SQL expression authoring and progressive PostgreSQL verticals

## Authority and scope

Issue [#3456](https://github.com/dunay2/dvt/issues/3456), ADR-0064, ADR-0066,
the canonical capability catalog and the
[active design](../planning/proposals/mandatory/frontend-and-ux/semantic-field-transformation-stage-plan-20260925.md)
govern this slice. It reuses ConfigureCanvasDvtNode, ProjectCanvasRelationalTree,
SaveWorkspaceGraphDraft, PreviewCanvasTransformRows, PreviewPlan and StartRun.
No second AST, function registry, command, DTO, provider connection authority or
SQL passthrough is introduced. Substrait remains pinned to v0.101.0.

The shared PostgreSQL bindings now also drive formula admission. Comparisons,
AND/OR, IS NULL/IS NOT NULL, typed COALESCE and UTC YEAR extraction are reachable
from the editor. New canonical admissions are CONCAT_WS and SUM(i64/fp64).
SUM remains an Aggregate operation; JOIN predicates and scalar Transform
expressions stay separate. Decimal SUM, arbitrary casts and unadmitted PostgreSQL
builtins are not claimed as supported by this evidence.

## Root causes and fixes

- Formula authoring had a narrower parallel admission path than executable SQL.
  The editor now consumes the shared binding result type and signature.
- PostgreSQL SUM(bigint) widens to numeric. The admitted Substrait i64 result
  instead uses an explicit bigint cast, preserving overflow ERROR. Both overloads
  reject DISTINCT, filtered aggregates, unsupported phases/options and required
  result types. Empty/all-NULL inputs produce NULL.
- Protected Run rejected a valid empty-string output because logical REQUIRED
  was fingerprinted as physical NOT NULL. PostgreSQL CREATE TABLE AS creates
  nullable columns. The physical schema projector now describes those columns,
  while semantic analysis retains REQUIRED. Candidate and target digest checks
  remain exact; schema migration remains unavailable.
- Existing architecture guards exposed oversized presentation composition and
  stale overlay/controller expectations. Expression slicing and unavailable
  relation projection have pure owners; Preview scope is composed by its existing
  provider. Redundant non-compact branches were removed after the compact renderer's
  early return. No threshold or boundary rule was relaxed.

## Progressive browser proof

The test imports only the source/JOIN starting document with an empty Transform.
It authors formulas through Monaco and structural operations through the actual
inspector and explicit output-to-input gestures. Imported setup is not represented
as from-scratch user authoring. Each level checks zero row queries during editing,
durable save/reopen, exact semantic SHA, Preview schema/rows, protected plan
admission, Run completion evidence and the published PostgreSQL relation.

| Level | Composition                                                                 | Expected result                                               |
| ----- | --------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 1     | Client → Transform with TRIM/UPPER/COALESCE, empty text and NULL            | Two rows; empty text and NULL remain distinct                 |
| 2     | LEFT JOIN → composed text, arithmetic and nullable boolean expressions      | Three rows, including the unmatched client and fallback label |
| 3     | LEFT JOIN → Transform → GROUP BY/SUM → ROW_NUMBER → descending Sort → Fetch | Region ES, revenue 50, rank 2                                 |

Each level uses a separate result table. The harness allocates its own application
schema in the explicitly selected database `dvt_sql_vertical_3456_20260929`.
No existing user database tables are seeded, recreated or deleted. Real PostgreSQL,
API authorization, Temporal and browser execution are used; no data-response mocks.

## Recorded validation

- Contracts and PostgreSQL projection: 98 files, 960 tests passed.
- Contract schema verification: 25 tests passed.
- Web unit and architecture suites passed; architecture: 109 files, 329 tests.
- Web presentation: 337 files, 1389 tests passed; 18 affected presentation tests
  passed again after the final projection/provider simplification.
- API PostgreSQL integration: 17 tests passed on PostgreSQL 16.12, including
  physical CTAS metadata, NULL behavior and both SUM overflow cases.
- Target projection publisher: four API application tests passed.
- Web and API-test typechecks, contract/projection typechecks and scoped lint passed.
- All three browser verticals passed end-to-end: 3 passed, 0 failed, 0 pending,
  0 skipped in 1 minute 55 seconds (browser execution, excluding stack startup).
  Nine screenshots record reopen, Preview and publication for each level.
  The third level reuses `unit_price` and `quantity` in `line_total`, then proves
  SUM, ROW_NUMBER, descending Sort and Fetch through protected Run and actual
  PostgreSQL output: `region = ES`, `revenue = 50`, `rank = 2`.

The first browser attempts failed on stale test assumptions about autosave and
operation wiring. A subsequent attempt exposed the real CTAS mismatch above.
Failed attempts are not counted as successful proof. The final successful run
includes the corrected physical schema boundary and stronger boolean/derived-field
reuse assertions, not a reduced scenario.

ARC evaluated the actual branch diff against main
`26b111afadb07bc5e516ad2a84876d665acc714c` as ARC-2, requiring this evidence and
a risk update. No new debt, stub, mock success, disabled rule or bypassed hook was
introduced. Final pre-push and remote integration gates remain required.
