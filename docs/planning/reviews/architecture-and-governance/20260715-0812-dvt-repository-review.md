---
title: DVT Repository Review — 2026-07-15 08:12
status: Draft
owner: Product Architecture / Web API Runtime
date: 2026-07-15
last_reviewed: 2026-07-15
planning_type: review
reviewed_repository: dunay2/dvt
reviewed_ref: main
reviewed_commit: daeea0bbbbb30ee87b493bad57198791363580d2
---

# DVT Repository Review — 2026-07-15 08:12

## Executive verdict

`main` is structurally healthy and the latest pull-request checks are green, but the repository is **not ready to advance the dbt import product slice**. The latest functional merge, [PR #1956](https://github.com/dunay2/dvt/pull/1956), has one unresolved post-merge P2 correctness thread that exposes an incomplete saga boundary between Canvas authority binding and completed import-receipt persistence.

The immediate route is:

1. close the incomplete idempotent-import recovery bug;
2. reconcile Planning DB and architecture claims so the server foundation is not confused with browser/product closure;
3. implement the proposed browser import component and strict protected-runtime Cypress proof;
4. implement file-backed Preview/Run as the next execution phase;
5. then close first-use warehouse connection creation/testing and authoritative Canvas readiness.

Do not merge a browser import implementation on top of the current recovery semantics.

## Repository state

| Item | Observed state | Assessment |
| --- | --- | --- |
| Default branch | `main` | Canonical. |
| Reviewed HEAD | `daeea0bbbbb30ee87b493bad57198791363580d2` | Merge of Dependabot PR #1950 after functional PR #1956. |
| Latest functional merge | [PR #1956 — governed dbt project import runtime](https://github.com/dunay2/dvt/pull/1956) | Substantial server foundation; one unresolved post-merge correctness thread remains. |
| Open pull requests | None | No active integration lane is carrying the required fix. |
| Main combined status | No commit statuses returned for the merge SHA | Do not interpret this as failure; use the PR-head workflow evidence below. |
| Relevant merged branch | `feat/dbt-project-import-phase3` | `0` ahead and `3` behind `main`; all work is merged. |
| Stale agent branch | `agent/dbt-import-product-gap-study-20260715` | `0` ahead and `30` behind `main`; it contains no unmerged value and must not be used as a base. |

## Recent commit and merge posture

The recent sequence is dominated by dbt project import hardening:

- replay completed dbt imports before mutable validation;
- exclude generated dbt artifacts from source revision hashes;
- preserve installed dbt dependencies for isolated parsing;
- separate source and traversal budgets;
- enforce exclusive Canvas authoring authority;
- rate-limit graph-draft routes;
- preserve Source Import retries and postconditions;
- include CAS preconditions in batch mutation identity;
- normalize configured dbt directories.

This is valuable hardening, but the density of retry, idempotency, authority, rollback, and path-policy fixes shows that phase three is still in a stabilization period. The next change should reduce transaction-boundary ambiguity rather than add another UI caller.

## CI status

The final head of [PR #1956](https://github.com/dunay2/dvt/pull/1956), `94e4745cdb3b49db5785f459a5bdbceba8df8dbc`, completed all exposed workflows successfully:

- Dependency Review;
- Contracts & Determinism;
- Test Suite;
- CodeQL;
- CI - Code Quality;
- PR Quality Gate.

The head of [PR #1950](https://github.com/dunay2/dvt/pull/1950), `38eaa34e45d1014ecd657a40371e01403c123af1`, also completed the same six workflows successfully.

CI therefore supports the checked-in behavior, but it does **not** cover the unresolved crash-recovery scenario described below. Green CI is not evidence that the multi-transaction import saga is complete.

## Unresolved review thread

### RV-01 — Incomplete idempotent import can strand Canvas authority

**Source:** unresolved P2 thread on [PR #1956](https://github.com/dunay2/dvt/pull/1956), against `apps/api/src/application/services/importDbtProjectUseCase.ts`.

**Observed code path**

`ImportDbtProjectUseCase.execute` currently performs these durable steps in separate boundaries:

1. read the completed import receipt;
2. validate mutable project state;
3. bind Canvas authority through `ICanvasAuthoringAuthorityStore`;
4. project the file-backed graph;
5. record the completed import result through `IDbtProjectImportReceiptStore`.

The catch block releases authority only when `bindResult.deduplicated` is false:

```ts
if (!bindResult.deduplicated) {
  await authorityStore.release(...)
}
```

`PostgresCanvasAuthoringAuthorityStore.bind` returns `deduplicated: true` when the authority idempotency row already exists with the same request hash. That row is created in the same transaction as the authority binding, before graph projection and before the completed import receipt is recorded.

**Failure scenario**

1. Worker A binds authority successfully.
2. Worker A dies before recording `dbt_project_import_receipts`.
3. Retry worker B reads no completed receipt.
4. Worker B validates and receives a deduplicated authority bind.
5. Projection or completed-receipt persistence fails.
6. The catch block skips release because the bind was deduplicated.
7. The Canvas remains file-authoritative without a replayable completed receipt.
8. Graph-draft authoring and a clean new import remain blocked.

**Severity**

The review labels this P2. Product impact is high because the failure leaves durable ownership state without a completed command outcome and requires manual database repair or a new recovery rail.

**Why the obvious one-line fix is unsafe**

Changing the condition to always release on a deduplicated bind may race with an original worker that is still projecting or recording its receipt. The defect is not merely a boolean condition; it is missing operation-state ownership across multiple transactions.

## Required hotfix design

Introduce one explicit import-operation saga owner keyed by tenant, project, environment, Canvas, and idempotency key.

Recommended model:

- persist an operation state such as `started`, `completed`, or `failed` before or atomically with authority binding;
- serialize recovery for the same operation key with a PostgreSQL transaction/advisory lock or lease;
- make the operation record distinguish a completed replay from an orphaned binding;
- let a retry resume an orphaned operation only after it owns recovery;
- complete the receipt and operation state atomically where possible;
- compensate authority only while holding the same recovery ownership and only when no completed receipt exists;
- preserve request-hash mismatch behavior.

A narrower implementation is acceptable only if it proves equivalent safety across the authority and completed-receipt tables. A new `recoverIncompleteImport` repository operation should not perform independent reads followed by deletes without a shared transaction.

### Required regression evidence

Add tests for all of the following:

1. no completed receipt + deduplicated authority + projection failure does not leave an unrecoverable Canvas;
2. no completed receipt + deduplicated authority + receipt-store failure reaches a recoverable terminal state;
3. original worker and retry worker cannot both compensate or complete the same operation;
4. a completed receipt always wins and replays before mutable validation;
5. request-hash mismatch remains fail-closed;
6. after a safely compensated orphan, a new import can bind the Canvas;
7. real PostgreSQL integration proves the transaction/lock behavior, not only mocked application tests.

## Product gaps

### PG-01 — The user-facing dbt project import flow is still absent

The server rails `ValidateDbtProjectImport` and `ImportDbtProject` are implemented, but the planned browser surfaces do not exist in source:

- `apps/web/src/app/ports/dbtProjectImport.ts`;
- `apps/web/src/app/services/dbtProject/dbtProjectImport.api.ts`;
- `apps/web/src/app/components/dbtProjectImport/DbtProjectImportDialog.tsx`;
- `apps/web/src/app/components/dbtProjectImport/useDbtProjectImportController.ts`;
- `apps/web/src/app/components/dbtProjectImport/DbtProjectImportDialogView.tsx`;
- `apps/web/cypress/e2e/dbt/dbt-project-import-source-live.cy.ts`.

Planning migration `673_dbt_project_import_planned_web_integrity.sql` explicitly removes concrete repo paths and test evidence while those components remain proposed. The product can project already-bound file-backed dbt projects, but a user cannot perform the governed validate-and-import interaction from the browser.

### PG-02 — File-backed Preview and Run remain unavailable

The architecture component explicitly lists file-backed Preview/Run as a phase-four concern. Current file projections expose `canPreview: false` and `canRun: false`. The product therefore does not yet close the expected round trip:

```text
dbt files -> Canvas -> persisted preview -> PlanRef -> StartRun
```

The API import foundation must not be described as an end-to-end dbt workflow until this execution path exists.

### PG-03 — First-time warehouse connection onboarding remains open

The active frontend rail inventory still marks these as `gap-needed`:

- `CreateWarehouseConnection`;
- `TestWarehouseConnection`.

A user can list server-known connections and import source objects but cannot create, authenticate, or verify a new warehouse connection from the product. This blocks the first-use source path even after dbt import UI exists.

### PG-04 — Canvas readiness remains projection-heavy

`ValidateCanvasExecutionReadiness` is still `gap-needed`. Plan and run readiness depend on local projection state and downstream rejection instead of one authoritative server-readable explanation of missing source, transform, sink, scope, artifact, permission, capability, or adapter conditions.

### PG-05 — Broader generic DVT authoring closure remains incomplete

The existing product-flow review still identifies thin source/transform/sink node configuration, incomplete field-level authoring, generic DVT plan proof, run-to-node evidence navigation, and frontend cancel/recover controls. dbt work should not erase these product gaps from the roadmap.

## Architectural and governance drift

### AD-01 — “Phase closed” language conflicts with proposed browser closure

`dbt-project-import-and-source-authority-component.md` says the component “closes phase 3”, while its own definition of done requires browser presentation tests and a strict Cypress import/source flow. The same repository explicitly records the browser component as proposed and absent.

Use one of these consistent descriptions:

- **phase-three server foundation implemented; browser closure pending**, or
- split the work into separate server and browser feature IDs with separate completion gates.

### AD-02 — Feature mechanization overstates completion

Migration `674_dbt_project_import_phase3_feature_mechanization.sql` records:

- `mechanizationStatus: implemented`;
- `noHumanDecisionsRemaining: true`;
- browser component remains proposed until strict Cypress evidence exists.

Those claims are inconsistent at product-feature level. The server rails can remain implemented, but the parent product feature should remain partial/open until browser evidence exists.

### AD-03 — Import completion is modeled as two repositories without one saga owner

`CanvasAuthoringAuthorityStore` and `DbtProjectImportReceiptStore` each have valid local responsibilities, but the application service currently owns a distributed unit of work without a durable operation state. This is the direct architectural cause of RV-01.

The correct Fowler response is an explicit Saga/Process Manager or one repository operation that owns the cross-table state transition. Repeated catch-block compensation is no longer enough.

### AD-04 — Historical inventory drift can mislead implementation agents

The active frontend command/query inventory was last reviewed on 2026-06-02 and still contains older statements, such as Code buffer save being absent, that were subsequently closed by PRs #1945 and #1946. Agents should query current source and Planning DB rather than treat every line in the inventory as current truth.

## Regression risks to watch

1. **Idempotency interpreted as completion.** An idempotency row in one store proves an earlier local mutation, not the success of the whole command.
2. **Compensation of prior successful work.** Recent Source Import fixes already had to prevent rollback of deduplicated file mutations owned by an earlier invocation.
3. **Authority lock scope.** The shared advisory lock protects authority versus graph-draft claims, but it does not span projection and receipt persistence.
4. **Generated artifacts versus dependencies.** `target`/`logs` must remain excluded while materialized packages remain available to `dbt parse` and included in revision identity.
5. **Governance evidence inflation.** Proposed paths and planned tests must never be counted as implemented evidence.
6. **UI expansion before recovery closure.** A browser caller will increase retries, duplicate submissions, navigation interruptions, and lost-response scenarios, making RV-01 more likely.

## Recommended implementation route

### Route 1 — Correctness hotfix

Create a focused API/Planning DB branch that:

- models durable import operation state;
- closes RV-01 with real PostgreSQL concurrency and crash-recovery tests;
- updates the high-severity risk register mitigation;
- resolves the post-merge review thread through a new PR;
- keeps the browser untouched.

### Route 2 — Governance reconciliation

In the same hotfix or a documentation-only follow-up:

- rename the current closeout to “phase-three server foundation”;
- keep browser components `proposed`;
- split server and browser completion gates;
- remove `noHumanDecisionsRemaining: true` from the parent product closure until browser and recovery evidence are complete;
- refresh stale frontend inventory statements affected by PRs #1945–#1956.

### Route 3 — Browser import closure

Implement the already-designed browser boundary:

- typed gateway for validate/import rails;
- controller with validate-before-import state machine;
- explicit confirmation and stable session idempotency key;
- diagnostic-first presentation;
- success only from the real command receipt;
- navigation to the file-backed Canvas;
- strict Cypress flow using protected API, PostgreSQL, real workspace files, dbt CLI, and Source Import;
- assertion that file-backed Source Import does not append graph-draft semantic nodes.

### Route 4 — File-backed execution

Implement phase-four planner/runtime projection:

- build executable planner input from the same content-addressed dbt project revision;
- persist preview proof and PlanRef;
- enforce revision alignment between Canvas projection, preview, and StartRun;
- expose precise unavailable/stale diagnostics;
- prove Preview and Run from the browser without falling back to graph-draft semantics.

### Route 5 — First-use and operational closure

Then close:

- warehouse connection create/test with server-owned secrets and audit;
- authoritative Canvas readiness query;
- run evidence back-navigation to source graph/code;
- governed frontend cancel/recover controls.

## Handoff instructions for the next GPT

1. Base new work on current `main`, not `agent/dbt-import-product-gap-study-20260715` or the merged phase-three branch.
2. Start with the unresolved PR #1956 thread and reproduce the orphaned-authority sequence in a failing test.
3. Do not “fix” it by unconditionally releasing deduplicated bindings.
4. Design the import operation state and ownership boundary before changing the catch block.
5. Keep the first PR limited to API, PostgreSQL adapter/tests, Planning DB evidence, and risk/architecture documentation.
6. Open the browser implementation only after the recovery PR is green and reviewed.

## Source index

- [Current main commit](https://github.com/dunay2/dvt/commit/daeea0bbbbb30ee87b493bad57198791363580d2)
- [PR #1956 — governed dbt project import runtime](https://github.com/dunay2/dvt/pull/1956)
- [PR #1950 — actions/labeler update](https://github.com/dunay2/dvt/pull/1950)
- [`ImportDbtProjectUseCase`](https://github.com/dunay2/dvt/blob/main/apps/api/src/application/services/importDbtProjectUseCase.ts)
- [`PostgresCanvasAuthoringAuthorityStore`](https://github.com/dunay2/dvt/blob/main/apps/api/src/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.ts)
- [dbt import/source authority component](https://github.com/dunay2/dvt/blob/main/docs/architecture/components/web/graph/dbt-project-import-and-source-authority-component.md)
- [phase-three Web design](https://github.com/dunay2/dvt/blob/main/tools/planning-db/migrations/672_dbt_project_import_phase3_web_design.sql)
- [planned Web integrity correction](https://github.com/dunay2/dvt/blob/main/tools/planning-db/migrations/673_dbt_project_import_planned_web_integrity.sql)
- [phase-three feature mechanization](https://github.com/dunay2/dvt/blob/main/tools/planning-db/migrations/674_dbt_project_import_phase3_feature_mechanization.sql)
- [open dbt import authority risk](https://github.com/dunay2/dvt/blob/main/docs/risk-register/quality/R-20260714-DBT-PROJECT-IMPORT-AUTHORITY.yaml)
- [frontend command/query rail inventory](https://github.com/dunay2/dvt/blob/main/docs/architecture/components/web/frontend-command-query-rail-inventory.md)
- [dbt project round-trip product plan](https://github.com/dunay2/dvt/blob/main/docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md)
