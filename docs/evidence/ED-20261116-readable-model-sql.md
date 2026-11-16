---
title: Governed readable Model SQL inspection
status: draft
date: 2026-11-16
owners:
  - API
  - Web
  - Adapters
arc_level: ARC-2
breaking: false
code_refs:
  - apps/web/cypress.supportCapabilities.ts
  - apps/web/src/testing/vitestSuites.browserRouting.ownership.test-cases.ts
  - packages/@dvt/contracts/src/contracts/canvas/TransformSqlProjection.v1.ts
  - packages/@dvt/postgres-projection/src/sqlPresentation/admission.ts
  - apps/api/src/application/services/projectCanvasSqlPresentation.ts
  - apps/api/src/application/services/admitPostgresSqlPresentationViews.ts
  - apps/api/src/infrastructure/warehouseSourceImport/PostgresSqlPresentationEvidenceReader.ts
  - apps/web/src/app/views/canvas/CanvasSqlPresentationResult.tsx
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/postgres-projection build
    - pnpm exec vitest run packages/@dvt/postgres-projection/test/sqlSimplificationAdmission.test.ts
    - pnpm --filter dvt-api exec vitest run --config vitest.integration.config.ts test/integration/sqlReadProof
    - pnpm --filter dvt-api exec vitest run --config vitest.integration.config.ts test/integration/sqlReadProof/presentation.test.ts --sequence.shuffle --sequence.seed=3786
---

# Readable Model SQL

[#3786](https://github.com/dunay2/dvt/issues/3786) owns delivery under ADR-0064,
the command/query governance and the
[SQL presentation component](../architecture/components/adapters/postgres-sql-presentation.md).
Planning DB admitted the consumer, native evidence boundary, same-database view
continuation and observed scalar subset before their respective implementations.
`ProjectCanvasTransformSql` and `SimplifyPostgresSqlPresentation` remain the rails.

The canonical ARC evaluator compared main `b8b082c2f0d6030207037184658024392a2863e6`
with checkpoint `ae339f718328cd663d9787e4df68fe13230e7b00`: 44 paths, ARC-2,
evidence and risk required, no rollout or compatibility matrix required.
Final readiness and merge evidence must use the final complete candidate.

## Behavior and boundaries

Explicit readable inspection preserves original SQL and provenance, returning
actual ordered rewrite steps or a typed whole-candidate retention. Original
inspection adds no warehouse access. The existing source-import permission
precedes all metadata credentials and I/O. A read-only native snapshot supplies
complete names, admitted scalar columns, exact database and bounded view closure.
Views remain opaque; unsupported references, functions, security options, RLS,
FDW and uncertified inheritance retain the original. Original native preflight
follows complete admission. Shared projection, Preview, publication and Run
bytes are unchanged.

Model and operation inspectors share one SQL presentation with local
original/derived selection and progressive trace details. Generate is explicit;
hidden or obsolete completions cannot become current. No browser optimizer,
second tab rail, SQL type IR or persistent derived authority was added.

The Workbench reuses the existing native keyboard adapter for complete trusted
Enter and Escape. Its actual available-runtime consumer extends that adapter's
existing controlled ownership. The same support registry and exact import-closure
guard now retain both complete baselines. Changing the registry itself retains
the existing all-runtime pre-push obligation, including unavailable. No selector
algorithm, catalog assignment, runtime, workflow or keyboard helper was added.

## Observed evidence

The real Model query on the existing localhost runtime returned HTTP 200,
`rewritten`, six ordered steps and six SELECTs reduced to two, preserving its
dbt view references. Consecutive observations were 8,324 ms with compilation and
248 ms with existing compilation reuse. This does not establish physical query
optimization or reduce dbt compilation time.

The native suite passed 348 cases: the maintained 326-case oracle, five oracle
metadata tests and 17 consumer/provider cases. Paired manual and canonical
client/orders inputs use the same rules and compare output names, native types,
NULLs and multiplicity through the existing PostgreSQL oracle. New cases cover
opaque same-database views, unused non-primitive columns, unsupported referenced
columns, custom resolution and security barriers. The 17 cases also passed with
shuffled order after isolating their DDL. All DDL is confined to disposable
databases, retired by the canonical lease; no user warehouse object was changed.

Local scope checks are iteration evidence. The governing issue/PR records final
lint, types, native browser proof, pre-push, fresh Planning DB base/head validation
and required current-head hosted checks. No debt, stub, hook bypass or lowered
rule is authorized by this evidence.
