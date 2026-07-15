---
title: DVT Repository Review — 2026-07-15 14:14
status: Draft
owner: Product Architecture / Web API Runtime
date: 2026-07-15
last_reviewed: 2026-07-15
planning_type: review
reviewed_repository: dunay2/dvt
reviewed_ref: main
reviewed_commit: daeea0bbbbb30ee87b493bad57198791363580d2
supersedes_review_pr: 1957
---

# DVT Repository Review — 2026-07-15 14:14

## Executive verdict

`main` has not moved since the previous repository review. The latest functional dbt import merge remains [PR #1956](https://github.com/dunay2/dvt/pull/1956), followed by the unrelated `actions/labeler` dependency merge [PR #1950](https://github.com/dunay2/dvt/pull/1950).

The repository is not ready to extend the dbt project import product surface. One unresolved post-merge P2 correctness thread still exposes an incomplete durable boundary between Canvas authority binding and completed import-result persistence. A worker can bind file authority, die before recording the completed receipt, and leave a retry unable to compensate safely.

There is also a material correction to the previous review in [draft PR #1957](https://github.com/dunay2/dvt/pull/1957): `CreateWarehouseConnection` and `TestWarehouseConnection` are **already implemented across contracts, Web ports, API adapters, protected routes, UI controls, controller logic, and a live Cypress flow**. They must not remain listed as product gaps. PR #1957 should therefore not be merged as written.

The recommended route is:

1. fix the incomplete dbt import operation as an explicit durable saga/process boundary;
2. correct or supersede PR #1957 and refresh the stale frontend rail inventory;
3. reconcile phase-three server completion with the still-proposed browser import surface;
4. implement the browser dbt project validate/import interaction with strict protected-runtime proof;
5. implement file-backed Preview/Run;
6. add authoritative Canvas execution-readiness diagnostics.

Do not add the browser import caller on top of the current recovery semantics.

## Delta from the 08:12 review

| Observation | Current result | Consequence |
| --- | --- | --- |
| `main` HEAD | Still `daeea0bbbbb30ee87b493bad57198791363580d2` | No runtime correction has landed since the earlier review. |
| Open PRs | Only draft PR #1957 | There is no open implementation PR carrying the P2 recovery fix. |
| PR #1957 | Mergeable, documentation-only, no review threads | Its primary correctness finding remains useful, but one product-gap claim is false and must be removed. |
| PR #1956 unresolved thread | Still open and non-outdated | The import recovery defect remains actionable repository state. |
| Warehouse connection onboarding | Implemented and live-proved | Previous PG-03 was derived from stale inventory rather than current source. |
| Browser dbt project import | Still proposed/absent | This remains a genuine product gap. |

## Repository state

| Item | Observed state | Assessment |
| --- | --- | --- |
| Default branch | `main` | Canonical base for all new work. |
| Reviewed HEAD | [`daeea0bbbbb30ee87b493bad57198791363580d2`](https://github.com/dunay2/dvt/commit/daeea0bbbbb30ee87b493bad57198791363580d2) | Merge of Dependabot PR #1950. |
| Latest functional merge | [PR #1956](https://github.com/dunay2/dvt/pull/1956) | Large phase-three server foundation with one unresolved P2 recovery thread. |
| Open pull requests | [PR #1957](https://github.com/dunay2/dvt/pull/1957), draft, docs-only | Must be corrected before merge because it reopens implemented connection rails. |
| Main combined status | No legacy commit statuses returned for the merge SHA | Use PR-head GitHub Actions evidence rather than interpreting absence as failure. |
| Functional branch | `feat/dbt-project-import-phase3` | `0` ahead and `3` behind `main`; fully merged. |
| Previous review branch | `agent/dvt-review-20260715-0812` | `1` ahead and `0` behind; only the PR #1957 report. |
| Older product-gap branch | `agent/dbt-import-product-gap-study-20260715` | `0` ahead and `30` behind; stale and contains no unmerged value. |

## Recent commit posture

The recent functional sequence is concentrated on hardening dbt import, Canvas authority, retries, source publication, and path partitioning:

- replay completed dbt imports before mutable validation;
- exclude generated dbt artifacts from source revision hashes;
- retain materialized dbt dependencies for isolated parsing;
- separate source limits from bounded inventory traversal;
- enforce exclusive Canvas authoring authority;
- rate-limit graph-draft routes;
- preserve Source Import retries after file publication;
- verify deduplicated graph-draft postconditions;
- include CAS preconditions in file-batch idempotency identity;
- normalize configured dbt runtime paths.

This work is valuable, but the concentration of late fixes around idempotency, compensation, ownership, and path semantics is a strong stabilization signal. The next slice should reduce transactional ambiguity instead of adding another retry-producing caller.

## Pull request and review status

### PR #1957 — current open review report

[PR #1957](https://github.com/dunay2/dvt/pull/1957) is a mergeable draft with one documentation file and no unresolved review threads.

Its CI posture is narrow:

- `CI - Code Quality`: success;
- `PR Quality Gate`: success;
- changed-slice verification: success;
- no affected workspaces: success;
- `Dependency Review`: skipped;
- `CodeQL`: skipped;
- `Test Suite`: skipped;
- `Contracts & Determinism`: skipped;
- `Markdown Documentation`: skipped;
- full CI: skipped.

This is acceptable evidence for a documentation-only PR, but it is not runtime validation and it does not validate the report's factual product inventory. A green gate cannot compensate for a stale source assessment.

### PR #1956 — merged functional slice

The final head of [PR #1956](https://github.com/dunay2/dvt/pull/1956), `94e4745cdb3b49db5785f459a5bdbceba8df8dbc`, completed all six exposed workflows successfully:

- Dependency Review;
- Contracts & Determinism;
- Test Suite;
- CodeQL;
- CI - Code Quality;
- PR Quality Gate.

All earlier review findings were resolved except one late P2 thread. Green CI therefore supports the checked-in test matrix, but does not prove crash recovery across separate authority and completed-receipt transactions.

## Blocking bug

### BUG-01 — incomplete idempotent dbt import can strand Canvas authority

**Source:** unresolved P2 thread on [PR #1956](https://github.com/dunay2/dvt/pull/1956), against [`ImportDbtProjectUseCase`](https://github.com/dunay2/dvt/blob/main/apps/api/src/application/services/importDbtProjectUseCase.ts).

The application service performs durable work in separate boundaries:

1. read a completed import receipt;
2. validate mutable project state;
3. bind Canvas authority;
4. project the file-backed graph;
5. record the completed import result.

The catch block compensates authority only for a binding created by the current invocation:

```ts
if (!bindResult.deduplicated) {
  await authorityStore.release(...)
}
```

[`PostgresCanvasAuthoringAuthorityStore.bind`](https://github.com/dunay2/dvt/blob/main/apps/api/src/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.ts) commits the authority row and its idempotency row in one transaction. A later equivalent bind returns `deduplicated: true`. [`PostgresDbtProjectImportReceiptStore`](https://github.com/dunay2/dvt/blob/main/apps/api/src/infrastructure/dbt/PostgresDbtProjectImportReceiptStore.ts) records the completed result separately.

#### Failure sequence

1. Worker A reads no completed receipt.
2. Worker A validates the project.
3. Worker A commits the authority and authority-idempotency rows.
4. Worker A dies before the completed import receipt is committed.
5. Worker B retries the same command and still reads no completed receipt.
6. Worker B validates and receives a deduplicated authority bind.
7. Projection or completed-receipt persistence fails.
8. The catch block skips release because the bind was deduplicated.
9. The Canvas remains file-authoritative without a replayable completed command result.
10. Graph-draft authoring and a clean replacement import can remain blocked.

#### Why an unconditional release is unsafe

Always releasing a deduplicated binding is not a correct fix. Worker A may still be projecting or persisting its completed receipt. A retry must not delete authority owned by an in-flight original worker or compensate a command that has actually completed.

The missing concept is durable operation ownership, not another catch-block condition.

## Required recovery design

Model one import operation keyed by tenant, project, environment, Canvas, and idempotency key. The implementation may be a dedicated operation store/process manager or one repository operation that owns the cross-table transition, but it must establish equivalent safety.

Recommended state model:

- `started`: request hash accepted and one worker owns or leases progress;
- `authority_bound`: authority committed, projection/receipt not yet terminal;
- `completed`: exact accepted result persisted and replayable;
- `failed` or `compensated`: operation reached a safe terminal state;
- optional lease/heartbeat metadata for orphan detection and recovery.

Required properties:

- serialize original execution and recovery for the same operation key;
- preserve request-hash mismatch as fail-closed;
- distinguish a completed retry from an orphaned authority binding;
- allow only the recovery owner to resume or compensate an orphan;
- prevent the original and retry worker from both completing or compensating;
- make completed result persistence and terminal operation state atomic where possible;
- never delete authority after a completed receipt exists;
- allow a safely compensated Canvas to accept a new import.

A sequence of independent reads followed by deletes is not sufficient. Use one PostgreSQL transaction, row lock/advisory lock, or a rigorously defined lease protocol across the operation state.

### Required regression evidence

1. no receipt + deduplicated authority + projection failure reaches a recoverable terminal state;
2. no receipt + deduplicated authority + receipt-store failure reaches a recoverable terminal state;
3. original and retry workers cannot both compensate;
4. original and retry workers cannot publish different terminal outcomes;
5. completed receipt wins and replays before mutable validation;
6. request-hash mismatch remains fail-closed;
7. compensation cannot remove authority belonging to another completed operation;
8. after safe compensation, a new import can bind the Canvas;
9. a real PostgreSQL integration test proves lock/transaction/lease behavior;
10. protected-route tests preserve precise conflict and retry semantics.

## Corrected product status

### Implemented — warehouse connection creation and test

The previous review incorrectly listed first-use warehouse connection onboarding as missing. Current source proves the complete path:

- [`IWarehouseSourceImportPort`](https://github.com/dunay2/dvt/blob/main/apps/web/src/app/ports/workspace.ts) exposes `createWarehouseConnection` and `testWarehouseConnection`;
- [`createApiWarehouseSourceImportPort`](https://github.com/dunay2/dvt/blob/main/apps/web/src/app/services/workspace/workspacePorts.api.ts) calls the protected create and test routes;
- [`ConnectionStep`](https://github.com/dunay2/dvt/blob/main/apps/web/src/app/components/sourceImportWizard/ConnectionStep.tsx) presents New connection and Test connection actions;
- [`useSourceImportWizard`](https://github.com/dunay2/dvt/blob/main/apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts) owns real asynchronous create/test state and invokes the port;
- [`warehouseSourceImportRoutes`](https://github.com/dunay2/dvt/blob/main/apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts) implements protected create/test routes, authorization, validation, conflict handling, and forbidden-secret-field rejection;
- [`canvas-source-import-live-clean.cy.ts`](https://github.com/dunay2/dvt/blob/main/apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts) creates a Postgres connection using a credential reference, tests it, discovers objects, and imports a source through the live protected runtime.

Therefore:

- `CreateWarehouseConnection`: implemented;
- `TestWarehouseConnection`: implemented;
- first-use source onboarding: materially implemented for the governed supported provider path;
- the old `gap-needed` labels in the frontend rail inventory are documentation drift, not current product truth.

## Genuine product gaps

### PG-01 — browser dbt project validate/import interaction is absent

A repository search for `DbtProjectImportDialog` finds architecture and Planning DB design records, but no Web implementation. Migration [`673_dbt_project_import_planned_web_integrity.sql`](https://github.com/dunay2/dvt/blob/main/tools/planning-db/migrations/673_dbt_project_import_planned_web_integrity.sql) explicitly clears repo paths and removes planned tests while the Web components remain proposed.

Missing product closure includes:

- typed browser gateway for validation and import;
- validate-before-confirm controller state machine;
- compatibility diagnostics and inventory presentation;
- stable retry/idempotency identity for the user session;
- explicit import confirmation;
- navigation from the real command receipt;
- strict Cypress proof against protected API, PostgreSQL, workspace files, and real dbt parsing.

### PG-02 — file-backed Preview and Run remain unavailable

The canonical architecture component explicitly places file-backed Preview/Run in phase 4. The product does not yet close:

```text
dbt files -> Canvas projection -> persisted preview -> PlanRef -> StartRun
```

The import foundation must not be described as an end-to-end dbt workflow until planning and execution consume the same content-addressed project revision.

### PG-03 — authoritative Canvas execution-readiness query remains absent

`ValidateCanvasExecutionReadiness` appears only in planning and inventory documents; no current implementation source was found. Canvas readiness remains distributed across local projection state and downstream plan-preview rejection.

A mature read model should explain, before preview, missing or stale:

- source configuration;
- transform configuration;
- sink configuration;
- workspace scope;
- artifacts and revisions;
- permissions;
- runtime capabilities;
- provider/adapter availability.

### PG-04 — generic DVT authoring closure must remain visible

The dbt round-trip should not hide broader product gaps such as thin generic source/transform/sink configuration, incomplete field-level authoring, generic DVT plan proof, run-to-node evidence navigation, and user-visible cancel/recovery controls.

## Architecture and governance drift

### AD-01 — “closes phase 3” conflicts with an absent browser definition of done

[`dbt-project-import-and-source-authority-component.md`](https://github.com/dunay2/dvt/blob/main/docs/architecture/components/web/graph/dbt-project-import-and-source-authority-component.md) says the component “closes phase 3”, while its definition of done requires browser presentation tests and a strict Cypress import/source flow. The repository simultaneously records the browser component as proposed and absent.

Use one consistent status:

- **phase-three server foundation implemented; browser closure pending**, or
- split server foundation and browser interaction into separate feature IDs and completion gates.

### AD-02 — parent mechanization overstates closure

Migration [`674_dbt_project_import_phase3_feature_mechanization.sql`](https://github.com/dunay2/dvt/blob/main/tools/planning-db/migrations/674_dbt_project_import_phase3_feature_mechanization.sql) records:

- `mechanizationStatus: implemented`;
- `noHumanDecisionsRemaining: true`;
- browser import remains proposed until strict Cypress evidence exists.

The server rails may be implemented, but the parent product feature cannot simultaneously be complete with no decisions remaining and still lack its required browser closure.

### AD-03 — two durable repositories have no operation owner

`CanvasAuthoringAuthorityStore` and `DbtProjectImportReceiptStore` have valid local responsibilities. `ImportDbtProjectUseCase`, however, coordinates them with projection in a distributed unit of work without durable operation state. BUG-01 is the direct result.

Use an explicit Saga/Process Manager, operation aggregate, or transactional repository boundary. Repeated compensating catch blocks are no longer an adequate ownership model.

### AD-04 — frontend command/query inventory is stale

[`frontend-command-query-rail-inventory.md`](https://github.com/dunay2/dvt/blob/main/docs/architecture/components/web/frontend-command-query-rail-inventory.md) was last reviewed on 2026-06-02 and presents itself as current. It still classifies at least these rails incorrectly:

- `CreateWarehouseConnection`: shown as `gap-needed`, implemented in current source;
- `TestWarehouseConnection`: shown as `gap-needed`, implemented in current source;
- `SaveCodeWorkspaceFileBuffer`: shown as absent despite the later revisioned autosync/persistence work in PRs #1945 and #1946.

`ValidateCanvasExecutionReadiness` remains a plausible real gap, but the document must be refreshed rail by rail rather than treated as an authoritative current snapshot.

### AD-05 — the open review inherited stale inventory as product truth

PR #1957 correctly identified the import saga defect, but copied the obsolete connection gap from the June inventory. This demonstrates why repository reviews must triangulate Planning DB, current code, tests, and live proof rather than quote one inventory document.

### AD-06 — risk record mitigation is behind the known failure mode

[`R-20260714-DBT-PROJECT-IMPORT-AUTHORITY.yaml`](https://github.com/dunay2/dvt/blob/main/docs/risk-register/quality/R-20260714-DBT-PROJECT-IMPORT-AUTHORITY.yaml) remains Open/High and records local mitigations, but does not model orphaned authority or operation-state recovery explicitly. The known P2 should update the risk now rather than wait for the scheduled 2026-08-14 review.

## Regression risks

1. **Idempotency mistaken for command completion.** A local idempotency row proves one durable mutation, not successful completion of the whole application command.
2. **Compensation of another invocation.** A retry must not roll back work owned by an original or already-completed worker.
3. **Browser expansion before saga closure.** Navigation interruption, duplicate submission, timeout, and lost response will make the failure window more frequent.
4. **Stale governance reopens delivered work.** Treating implemented connection rails as gaps can waste delivery capacity and create duplicate commands.
5. **Green docs CI interpreted as runtime proof.** Most #1957 workflows were skipped because no workspace code changed.
6. **Generated artifacts and dependencies conflated.** `target`/`logs` must remain excluded while materialized packages remain present for `dbt parse` and revision identity.
7. **Phase labels hide incomplete product closure.** Server mechanization must not be used as evidence for missing browser and execution slices.

## Recommended next route

### Route 1 — focused recovery hotfix

Create a fresh branch from `main` for API, PostgreSQL, tests, Planning DB, and risk evidence only.

Deliver:

- durable import operation ownership/state;
- safe orphan detection and recovery;
- real PostgreSQL concurrency/crash tests;
- exact completed-result replay;
- fail-closed request-hash mismatch;
- risk-register update;
- a new PR that references and resolves the unresolved #1956 thread.

Do not mix the browser component into this branch.

### Route 2 — governance correction

Correct or close/supersede PR #1957, then:

- remove the false warehouse connection gap;
- refresh the frontend rail inventory against current code and live proofs;
- rename current phase status to server-foundation completion;
- keep Web import components proposed until files and strict evidence exist;
- mark the parent feature partial/open or split it into server and browser feature IDs;
- remove `noHumanDecisionsRemaining: true` from product-level closure while recovery and browser decisions remain.

### Route 3 — browser dbt import closure

After Route 1:

- implement typed validate/import ports and API adapter;
- implement controller state for idle, validating, rejected, accepted, importing, conflict, failed, and completed;
- keep one stable idempotency key for equivalent retries;
- render actionable diagnostics and inventory;
- confirm explicitly before mutation;
- trust only the real command receipt for success;
- navigate to the file-backed Canvas;
- prove the flow with protected runtime, PostgreSQL, workspace files, dbt CLI, and authority-aware Source Import;
- assert file-backed Source Import never appends graph-draft semantic nodes.

### Route 4 — file-backed execution

Implement planner/runtime projection from the same content-addressed dbt project revision:

- produce executable planner input;
- persist preview evidence and PlanRef;
- align Canvas projection, preview, and StartRun revisions;
- reject stale revisions precisely;
- expose unavailable diagnostics;
- prove browser Preview and Run without falling back to graph-draft authority.

### Route 5 — readiness and operational closure

Implement `ValidateCanvasExecutionReadiness`, then close remaining generic authoring and operational gaps with one server-owned diagnostic vocabulary.

## Acceptance gates for the next implementation PR

- [ ] no completed receipt + existing equivalent authority can recover safely;
- [ ] completed result always replays before mutable validation;
- [ ] request-hash mismatch fails closed;
- [ ] concurrent original/retry execution has one terminal owner;
- [ ] compensation cannot delete completed authority;
- [ ] a compensated orphan permits a new import;
- [ ] real PostgreSQL test covers lock/transaction/lease semantics;
- [ ] API tests cover route error mapping and retry behavior;
- [ ] Planning DB names the operation owner and evidence;
- [ ] risk register records orphaned authority and recovery mitigation;
- [ ] no Web/browser changes in the hotfix;
- [ ] `pnpm verify:prepush`, governance, Planning DB integrity, contracts, API tests, typecheck, lint, and architecture tests pass.

## Handoff to the next GPT

1. Base new implementation work on current `main`, not `feat/dbt-project-import-phase3` and not the stale `agent/dbt-import-product-gap-study-20260715` branch.
2. Read the unresolved thread on PR #1956 before changing the catch block.
3. Do not implement “always release deduplicated authority” without operation ownership.
4. Do not merge PR #1957 until its false connection gap is removed or superseded.
5. Treat current source and live Cypress proof as authoritative over the June frontend inventory.
6. Keep the recovery hotfix small and independently reviewable.
7. Implement the browser import only after the recovery invariant is proven.

## Decision

**Decision: stabilize the import operation boundary before expanding the product surface.**

The immediate product priority is not another dbt UI feature. It is converting the current multi-transaction orchestration into a recoverable, single-owner operation. In parallel, correct governance so delivered warehouse onboarding is not reopened and server-foundation completion is not confused with browser/product completion.
