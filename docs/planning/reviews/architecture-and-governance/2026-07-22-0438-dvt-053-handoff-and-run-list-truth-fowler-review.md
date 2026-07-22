---
title: DVT 0.5.3 Handoff, Run Listing Truth, and Product Authority Fowler Review
status: Review
reviewed_repository: dunay2/dvt
reviewed_main_sha: 8c098d6e35ce874efae81609814d99e8e60091f7
reviewed_at: 2026-07-22T04:38:00+02:00
scope: documentation-only
---

# DVT 0.5.3 Handoff, Run Listing Truth, and Product Authority Fowler Review

## 1. Executive verdict

DVT advanced materially since the preceding review:

- PR #2035, `fix(api): Unify run operational truth`, was corrected, merged, and released;
- the P2 review finding about non-terminal materialization appearing in list but not detail is fixed in the shared operational read model;
- all six standard workflows passed on the final PR head;
- release PR #2037 passed the six standard workflows and published `v0.5.3`;
- there are no open pull requests before this review branch is created.

The implementation result is technically stronger than the previous reviewed head. The previous blocking correction is no longer active.

The delivery process, however, still violated the requested handoff contract:

```text
DELIVERY-HANDOFF-MISSING
```

PR #2035 was merged and released without a complete `## Iteration Handoff`. The PR body, review reply, commits, tests, Planning DB migrations, and CI allow much of the implementation to be reconstructed, but they do not provide the required single, explicit account of what was done, how, why, with what rollback and compatibility posture, what deviated, and what iteration must follow.

A new concrete product bug was also found in the merged run-list query:

> `ListRunsUseCase` applies `limit` in the tenant-level state-store read before filtering by authorized project/environment, then derives `nextCursor` from the filtered subset even though `ListRunsQuery` has no cursor input.

This can return an empty or short page and `nextCursor: null` while additional authorized runs exist after excluded rows. It is not a security leak—the post-read filter prevents cross-project results from being emitted—but it is stale/incomplete operational truth and a broken pagination contract.

The next implementation work must therefore follow this order:

1. publish the missing retrospective handoff for #2035;
2. close the run-list scoped pagination defect as a narrow correction on the existing `ListRuns` rail;
3. return to the canonical dbt route: model SQL authority;
4. then atomic publication and exact project revision identity;
5. then workspace capability truth, recovery, and non-functional gates.

No new DSL, query rail, persistence repository, browser-owned runtime truth, or parallel architecture authority is justified.

---

## 2. Exact repository snapshot

### 2.1 Main

Reviewed exact `main`:

```text
8c098d6e35ce874efae81609814d99e8e60091f7
chore(main): Release 0.5.3 (#2037)
```

Recent product delta:

```text
591a1ecde7a43fefa5206f55bb446dd84da5f2dc  Release 0.5.2
9bc344578ca3ed45d09924dba4341ba41eff9b38  Merge PR #2035
8c098d6e35ce874efae81609814d99e8e60091f7  Release 0.5.3
```

### 2.2 Pull requests

Open PRs before this review: none.

Recently merged:

- #2035 — `fix(api): Unify run operational truth`
- #2037 — `chore(main): Release 0.5.3`

Recently closed review evidence:

- #2036 was closed as superseded after #2035 corrected the reported P2;
- #2034 and earlier point-in-time reviews remain closed and must not be treated as Planning DB authority;
- #2033, the unmerged paper handoff protocol, is not repository authority.

### 2.3 CI and release

Final #2035 head:

```text
40c78ee9e3d873c9306732773206dfcfa9a775eb
```

Successful workflows:

- Contracts & Determinism
- Dependency Review
- CodeQL
- Test Suite
- CI - Code Quality
- PR Quality Gate

Release #2037 head:

```text
45a77d61304aad601465adb461aa2752115bfdf1
```

The same six workflows completed successfully. The release conversation records publication of `v0.5.3`.

The merge/release SHA `8c098d6e...` has no pull-request-triggered workflow runs exposed by the connector. Exact-head confidence therefore comes from the final #2035 head and the release candidate head, not from a run directly attached to the squash/release SHA.

---

## 3. Implementation handoff audit

### 3.1 Status

```text
DELIVERY-HANDOFF-MISSING
```

No complete top-level report beginning `## Iteration Handoff` exists for #2035.

### 3.2 What can be reconstructed

From repository evidence, the iteration:

- introduced `RunOperationalTruthDto` as the shared list/detail projection;
- combined persisted `RunMetadata` identity with canonical engine status;
- stopped fabricating timestamps and durations when evidence is absent;
- bounded list-side status reads to eight concurrent calls;
- added runtime JSON decoders and shared Web mapping;
- hardened public warehouse connection projection;
- adjusted active-run and broad-list polling behavior;
- extended the protected browser proof around Preview/Run and source import;
- recorded design, ownership, tests, evidence, and feature mechanization in migrations 792–796;
- corrected the review finding by moving materialization sanitization into the shared read model;
- released the result as `v0.5.3`.

### 3.3 Required fields still absent from one authoritative handoff

The delivery record does not explicitly provide, in one auditable report:

- observed red-test chronology before implementation;
- exact final inventory of DDD owners, rails, ports, adapters, contracts, and changed paths;
- direct CI links associated with the final head;
- direct live-proof run/artifact link;
- compatibility statement for API and Web consumers;
- rollback procedure and data consequences;
- observability signals and operator lookup path;
- security threat statement and secrets/logging assessment;
- unresolved risks after merge;
- explicit scope deviation from the approved dbt priority route;
- reason for combining run truth, warehouse projection, Source Import presentation, and Cypress support in one delivery;
- recommended next bounded product iteration.

### 3.4 Mandatory retrospective correction

Before unrelated implementation starts, add a top-level comment to #2035:

```markdown
## Iteration Handoff
```

It must document the final merged head and the released result, not the earlier reviewed head. The report must distinguish:

- executed evidence;
- repository-derived inference;
- design rationale;
- unresolved risk;
- follow-up recommendation.

This is a delivery-record correction. It must not modify runtime code or invent a new governance rail.

---

## 4. Claim-to-evidence matrix for PR #2035

| Claim | Status | Evidence | Assessment |
| --- | --- | --- | --- |
| Persisted run identity is separated from canonical runtime state | VERIFIED | `runOperationalTruth.ts` takes `RunMetadata` and `CanonicalRunStatus`; identity fields come from metadata | Correct boundary |
| List and detail share one operational truth projector | VERIFIED | `ListRunsUseCase` and `GetRunStatusUseCase` both call `projectRunOperationalTruth` | No third query rail introduced |
| Non-terminal materialization is suppressed consistently | VERIFIED | `sanitizeCanonicalRunStatus` is called inside `projectRunOperationalTruth`; list passes raw status through that projector | Previous P2 fixed |
| Failure evidence remains after materialization removal | VERIFIED | sanitizer removes only `materialization`; tests retain `failure` or `activeStepId` | Correct lifecycle semantics |
| Completed materialization remains supported | PARTIAL | implementation preserves it by condition; focused visible test proves failed path, while broader suites/CI pass | Code is clear, but dedicated positive test should be named in handoff |
| The projector does not mutate input | PARTIAL | implementation uses object rest/spread and returns original only when no change is required | Strong source evidence, but no explicit named test found in the focused file |
| List status reads are bounded | VERIFIED | `RUN_STATUS_READ_CONCURRENCY = 8`; test checks max concurrent reads | Appropriate operability guard |
| List and detail no longer fabricate browser/runtime time | VERIFIED | API projection omits absent fields; Web mapping changes are covered by tests and CI | Correct stale-truth correction |
| Warehouse catalog internals are excluded from public output | VERIFIED | migration 794 records allow-list and negative test; dedicated catalog test exists | Valid security boundary |
| Protected live Preview/Run proof exists | PARTIAL | Planning DB records the exact Cypress spec, command, no interception, Temporal and PostgreSQL, and `2 passed` | Evidence exists, but handoff lacks a direct run/artifact URL |
| Planning DB closeout reflects the final sanitizer | VERIFIED | migration 795 includes `sanitizeCanonicalRunStatus`, owner, rails, unit test and Cypress proof | Previous premature-closeout concern superseded |
| Six final-head workflows passed | VERIFIED | GitHub workflow runs on `40c78ee...` all succeeded | Exact PR-head confidence |
| A complete iteration handoff exists | CONTRADICTED | no `## Iteration Handoff` comment or merged report exists | Delivery process failure |
| Tests were written and observed failing first | NOT PROVEN | migration 796 may record intended red/green cycles, but the handoff does not distinguish planned from observed | Do not infer tests-first execution |
| Rollback is documented | NOT PROVEN | no explicit rollback section | Required for a 42-file cross-layer change |
| Scope expansion was justified | NOT PROVEN | PR body does not explain why warehouse projection and Source Import presentation were inseparable from run truth | Delivery slice remains difficult to audit |
| Next implementation iteration is bounded | NOT PROVEN | no handoff recommendation | The agent may drift again |

---

## 5. Previous findings disposition

### 5.1 Fixed

#### CODE-RECON-03 — pending reconciliation receipt truth

Status: fixed by #2030. Do not reopen.

#### RUN-TRUTH-01 — list/detail operational truth duplication

Status: fixed by #2035.

`RunOperationalTruthDto` and `projectRunOperationalTruth` now form the common projection.

#### RUN-TRUTH-02 — non-terminal materialization contradiction

Status: fixed before #2035 merged.

The shared sanitizer removes materialization unless status is `COMPLETED`. The review thread is resolved and non-outdated.

#### RUN-TRUTH-03 — browser-fabricated runtime timestamps

Status: fixed within the scope demonstrated by #2035.

Absent timestamps remain absent and duration is calculated only from valid canonical start/end values.

#### RELEASE-053 — release state

Status: completed.

`v0.5.3` contains #2035 and is published after successful release-head workflows.

### 5.2 Superseded

#### Previous instruction: do not merge #2035

Status: superseded by the corrected final head.

The P2 was fixed, CI reran successfully, the thread was resolved, and #2035 merged. It must not be repeated as an active code defect.

#### Previous assertion: Planning DB closeout is stale on #2035

Status: superseded for the reported materialization defect.

The final mechanization includes `sanitizeCanonicalRunStatus`. The remaining problem is missing delivery handoff, not the closed lifecycle invariant.

### 5.3 Still active

- model SQL authority transition;
- multi-file atomic publication;
- exact publication/analysis/Preview/Run revision identity;
- workspace inventory completeness and typed oversized-file semantics;
- durable authoring recovery;
- Web/API non-functional gates and generated current-state truth;
- iteration handoff discipline.

### 5.4 Newly identified

- scoped run-list pagination is incomplete and internally contradictory.

---

## 6. New finding: scoped run-list pagination is not truthful

### 6.1 Severity

**P2 — operator-visible data completeness and contract defect.**

It does not expose unauthorized records, but it can hide authorized runs and report that no further page exists.

### 6.2 Evidence

`ListRunsUseCase.execute` performs:

```text
stateStore.listRuns({ tenantId, limit })
-> filter project/environment in memory
-> project filtered rows
-> build nextCursor from filtered rows
```

`ListRunsQuery` contains only:

```ts
interface ListRunsQuery {
  limit: number;
}
```

Yet `ListRunsResult` exposes `nextCursor`.

Therefore:

1. no cursor can be supplied to request the next page;
2. limit is applied before project/environment authorization filtering;
3. if the first tenant-level page contains mostly other project/environment runs, the authorized result may be short or empty;
4. `buildNextCursor(filtered, limit)` returns `null` whenever the filtered count is below the limit, even when more tenant-level rows exist;
5. the UI receives false completion.

### 6.3 Root cause

Pagination ownership is split incorrectly:

- the state-store query owns ordering and limit;
- application code owns project/environment filtering;
- the result advertises a cursor that the query cannot consume.

This is **primitive obsession and leaky abstraction**: a string cursor is emitted without a complete pagination protocol, while authorization scope is applied after the bounded read.

### 6.4 User and product impact

An operator scoped to one project/environment can see:

- zero runs despite existing authorized runs;
- fewer runs than requested with no way to continue;
- inconsistent counts between screens or refreshes;
- false confidence that run history is complete.

This directly weakens the operational-truth product outcome delivered by #2035.

### 6.5 Exact domain owner

- Query rail: existing `ListRuns`
- Application owner: Run Listing / RunOperationalReadModel collaboration
- Storage owner: `IRunStateStoreRead`
- Authorization owner: runtime query scope

Do not create `ListScopedRuns`, `ListRunPage`, or another HTTP route.

### 6.6 Correct implementation route

Extend the existing `ListRuns` query end to end so authorization predicates and cursor are applied before the limit is finalized.

Preferred contract shape:

```ts
type ListRunsCursor = Readonly<{
  createdAt: string;
  runId: string;
}>;

interface ListRunsQuery {
  limit: number;
  cursor?: string;
}

interface ListRunMetadataInput {
  tenantId: string;
  projectId?: string;
  environmentId?: string;
  limit: number;
  cursor?: ListRunsCursor;
}
```

The cursor needs a validated codec at the HTTP/application boundary. Internally it should be a value object, not an ad-hoc string concatenation spread across components.

`IRunStateStoreRead.listRuns` must apply:

- tenant scope;
- optional project scope;
- optional environment scope;
- stable ordering;
- cursor predicate;
- limit.

Then `ListRunsUseCase` may retain a defensive scope assertion, but it must not rely on post-limit filtering for normal behavior.

### 6.7 Likely files/components

- `apps/api/src/application/ports/runtime.ts`
- `apps/api/src/application/services/listRunsUseCase.ts`
- the `IRunStateStoreRead` contract in `@dvt/engine`
- every concrete run-state-store adapter
- protected runtime route decoder for `ListRuns`
- API tests for use case and route
- Web runs query/service if pagination is exposed now
- Planning DB design/evidence for the existing `ListRuns` rail

### 6.8 What must not be introduced

- no third run listing query;
- no client-side loop that repeatedly overfetches tenant pages until enough authorized rows are found;
- no cursor built from unvalidated string concatenation in multiple layers;
- no browser-side authorization filtering;
- no total count fabricated from one page;
- no weakening of project/environment scope.

### 6.9 Red tests

1. 25 earlier tenant rows belong to another project; the 26th belongs to the authorized project; authorized listing must return it through correct scoped pagination.
2. A page containing fewer than `limit` authorized rows but more matching rows after the cursor must not report completion.
3. The returned cursor can be submitted and yields the next stable page without duplicates or omissions.
4. Equal `createdAt` values are ordered deterministically by `runId`.
5. Invalid cursor fails with typed client error and does not hit the store.
6. Project/environment predicates reach the store before limit.
7. No record outside the authorization scope is returned.
8. Empty authorized history returns `items=[]` and `nextCursor=null` only when the scoped store proves exhaustion.

### 6.10 Green and live proof

Required:

- focused `ListRunsUseCase` tests;
- state-store adapter pagination tests against the real database;
- protected route test with encoded cursor;
- Web service test if it consumes cursor;
- live browser proof with more than one page and mixed project/environment data;
- exact-head six-lane CI.

### 6.11 Migration and compatibility

- preserve requests with only `limit` as first-page requests;
- add cursor as optional;
- preserve existing response shape;
- document cursor opacity for clients;
- avoid changing list item fields delivered by #2035;
- update generated docs and Planning DB in the same implementation PR.

### 6.12 Rollback

The change is query-only and should require no stored-data migration. Rollback is reverting the query/adapter/codec changes. If a new cursor encoding has been exposed, decoder compatibility must accept cursors issued by the released version until no clients can retain them.

### 6.13 Observability

Record bounded metrics without identifiers or secrets:

- requested page size;
- returned page size;
- scoped exhaustion yes/no;
- cursor decode failure count;
- state-store latency;
- status-enrichment latency and failure count.

Do not log raw tenant/project/environment IDs at broad log levels.

### 6.14 Acceptance criteria

The correction is complete only when:

- authorization scope is part of the store query before limit;
- cursor is accepted and validated;
- cursor ordering is stable;
- no duplicate or missing run appears across pages;
- mixed-scope live proof passes;
- existing list/detail operational fields remain identical for the same run;
- Planning DB names the same `ListRuns` rail and no parallel rail exists;
- exact-head CI is green;
- a complete `## Iteration Handoff` is published.

---

## 7. Active dbt authority findings

### 7.1 P1 — model SQL authority remains the canonical next product milestone

ADR-0060 defines two mutually exclusive modes:

```text
graph-draft
dbt-project-files
```

In graph-draft mode, nodes/edges may generate files. In file-backed mode, SQL/YAML/etc. are authoritative and Canvas is a projection. Adoption must durably write, analyze, prove parity, and atomically switch authority.

The next vertical must prove:

```text
Canvas-authored SQL G1
-> materialize project files
-> switch to dbt-project-files authority
-> edit models/x.sql to F2 in Project Code
-> reopen Canvas
-> Preview
-> Run
-> reload
-> F2 remains authoritative and G1 cannot silently overwrite it
```

Owner and existing semantics:

- `CanvasAuthoringAuthorityBinding`
- `SaveWorkspaceFileContent`
- `ProjectDbtGraphFromFiles`
- existing Code workbench CAS lifecycle
- accepted dbt round-trip plan

Do not introduce a new language or parallel graph/file SQL store.

### 7.2 P1 — graph-first Preview still writes artifacts sequentially

Current `executeCanvasPlanAction` loops over generated artifacts and calls `saveFileContent` once per path before Preview.

A conflict or failure after the first write can leave:

- updated `dbt_project.yml`;
- only some SQL files updated;
- stale `schema.yml`;
- Preview not created.

This violates the cross-file transaction requirement in ADR-0060.

### 7.3 Existing atomic authority must be reused

The repository already has:

- `WorkspaceFileBatchMutation`;
- full expected-file revisions;
- writes and deletes;
- idempotency key;
- applied/conflict results;
- per-path conflict evidence;
- request hashing;
- multipath locking;
- receipt persistence;
- atomic replacement.

The next atomic-publication slice should extend this authority, not invent another transaction service.

### 7.4 P1 — exact save/project analysis identity is still not correlated

`useDbtProjectFileCanvasController` receives a `WorkspaceFileSaveReceipt` in `reconcileCodeFilePersistence`, names it `_receipt`, and refetches the latest project graph.

That proves that a graph was read after a save, not that the graph represents the exact whole-project revision caused by that save. A concurrent write to another file can move the project content set between operations.

The required chain remains:

```text
atomic publication receipt
-> exact projectContentSetSha256
-> analysisSha256
-> Preview provenance
-> Run provenance
-> reopen/recovery identity
```

Airflow DAG Bundles provide the relevant benchmark: a run can stay pinned to one versioned set of files even when the source changes mid-run. DVT should match exact revision reproducibility, while retaining dbt-native files and its own governed visual-authoring model.

---

## 8. Workspace, API, recovery, and non-functional posture

### 8.1 P1 — workspace inventory truth

`LocalWorkspaceFileRepository` still:

- caps visible files at 500;
- returns no cursor or completeness state;
- truncates recursively and silently;
- limits files to 1 MB;
- maps oversized files to `InvalidWorkspacePathError`.

A professional IDE distinguishes not-found, unsupported, binary, oversized, permission denied, and partial inventory. DVT currently overloads path validity and does not tell the user that the tree is incomplete.

Next after atomic publication:

- paginated or streamed inventory;
- explicit `complete | partial`;
- continuation cursor;
- typed `oversized | not_found | unsupported | denied` results;
- shared capability policy across import, analysis, Explorer, Code, and publication.

### 8.2 P2 — browser crash recovery

Navigation flush and `beforeunload` warnings are not a durable journal. DVT should defer a generic authoring-session abstraction until authority and publication identity are stable, then add a scoped recovery record keyed by workspace, project, file revision, and buffer identity.

### 8.3 P2 — accessibility and performance evidence

The run UI now has stronger state truth, but product-wide release gates still need explicit evidence for:

- keyboard and screen-reader workflows;
- accessible status/error announcements;
- graph sizes beyond happy-path fixtures;
- bundle budget;
- large run histories;
- request payload and polling cost;
- injected adapter/database/network failures.

The new run-list correction must include multi-page performance evidence because each item triggers canonical status retrieval. Bounding concurrency to eight limits spikes but does not solve N-status-call cost at large page sizes.

### 8.4 Security

Positive progress in #2035:

- public warehouse projection is an explicit allow-list;
- credentials and internal source-object fields are excluded;
- protected live proof avoids API interception.

Remaining requirements:

- cursor decoding must be bounded and fail closed;
- scope must be pushed into the state-store query;
- pagination telemetry must avoid sensitive identifiers;
- dbt analysis remains isolated and bounded;
- atomic publication receipts must not contain file contents, secrets, profile credentials, or unsafe paths.

---

## 9. Fowler assessment

### 9.1 Hidden authority

Active in model SQL and exact project revision. Fixed for list/detail runtime status projection.

### 9.2 Duplicate authority

- reduced in run operational truth;
- still dangerous between graph-authored SQL and editable project SQL until adoption completes;
- must not be reintroduced through review Markdown competing with Planning DB.

### 9.3 Leaky abstraction

`ListRunsResult.nextCursor` leaks the idea of pagination while `ListRunsQuery` cannot consume a cursor and the store query is not scoped before limit.

### 9.4 Primitive obsession

Cursor generation as `${createdAt}:${runId}` without a complete codec/value-object contract is primitive obsession. Replace it inside the existing rail.

### 9.5 Shotgun surgery

#2035 changed API, Web, warehouse projection, Source Import, Cypress support, generated docs, and five migrations. The final behavior is valuable, but the absence of a handoff makes it impossible to distinguish essential vertical closure from opportunistic scope expansion. Future iterations must explain every cross-domain file or split it.

### 9.6 Responsibility overload

`ListRunsUseCase` currently owns:

- tenant retrieval;
- project/environment authorization filtering;
- status fan-out and concurrency;
- DTO projection;
- cursor construction.

Move scoped paging to the store query while retaining orchestration and operational projection in the application layer.

### 9.7 Test-only confidence

The previous #2035 P2 demonstrated that green CI did not prove list/detail parity until review supplied the missing negative scenario. The correction now has evidence. The lesson remains: closeout requires negative lifecycle and mixed-scope tests, not only broad suite counts.

### 9.8 Stale truth

Planning DB is now aligned with the sanitizer. Delivery truth is stale because the iteration was released without the required handoff. Correct the record without creating a second authority.

---

## 10. Mature-system comparison: Match / Differentiate / Defer

### dbt Studio and dbt development workflows

**Match:** normal dbt files, one file authority after adoption, parse/test/run diagnostics, version-control-friendly state, explicit conflicts.

**Differentiate:** Canvas as a governed bidirectional projection where transformations are lossless and code-only fallback is explicit.

**Defer:** broad collaboration and managed-cloud platform breadth until local authority, publication, and recovery are correct.

Official reference: https://docs.getdbt.com/

### Professional IDE and Git workflows

**Match:** distinguish buffer, persisted file, semantic diagnostics, diff, conflict, revision, commit, and remote sync.

**Differentiate:** expose dbt graph semantics and execution provenance, not merely text changes.

**Defer:** full Git client features until real connector rails exist.

Official reference: https://code.visualstudio.com/docs/sourcecontrol/overview/

### Airflow

**Match:** bind execution to a complete versioned collection of required files; preserve the same revision throughout a run.

**Differentiate:** DVT's authority unit is a dbt project plus governed Canvas projection, not Python DAG code.

**Defer:** general-purpose scheduler breadth.

Official reference: https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/dag-bundles.html

### Prefect

**Match later:** version history, exact code/deployment identity, promotion, rollback.

**Differentiate:** DVT should first establish project-content and analysis identity, then build promotion semantics around it.

Official reference: https://docs.prefect.io/v3/how-to-guides/deployments/versioning

### Dagster

**Match later:** asset lineage, checks, freshness, observability, partitions.

**Defer:** these are differentiating capabilities after authoring authority and revision integrity, not substitutes for them.

Official reference: https://docs.dagster.io/

### Temporal

**Match principles:** durable identities, correlated receipts, idempotency, retries, explicit recovery.

**Differentiate:** use Temporal for durable execution where it belongs; do not turn the browser editor into a workflow engine.

Official reference: https://docs.temporal.io/

### NiFi

**Match:** visible flow/version differences and explicit update posture.

**Differentiate:** retain Git/dbt files as durable human-readable truth rather than a proprietary flow registry.

**Defer/reject:** a new DVT registry. Apache NiFi Registry was deprecated after the February 2026 vote in favor of Git-based Flow Registry Clients.

Official reference: https://nifi.apache.org/projects/registry/

---

## 11. Corrective implementation instructions

### Blocking correction A — retrospective #2035 handoff

**What is wrong:** merged/released iteration lacks the required handoff.

**Why it matters:** reviewers cannot distinguish actual proof from inference, determine rollback, or reliably constrain the next slice.

**How:** add one complete `## Iteration Handoff` comment to #2035 using final head and released SHA.

**Acceptance:** every required field is present, linked, and classified as executed or inferred.

**No code change required.**

### Blocking correction B — truthful scoped run pagination

**What is wrong:** post-limit filtering and non-consumable cursor can hide authorized runs.

**Why it matters:** run history is incomplete while presenting a terminal pagination result.

**How:** extend existing `ListRuns` rail and state-store query with validated cursor and pre-limit scope predicates.

**Acceptance:** mixed-scope multi-page tests and live proof pass; no third rail exists.

### Product slice C — model SQL authority

Start only after A and B are complete.

**Goal:** Project Code edit remains authoritative through Canvas reopen, Preview, Run, and reload after adoption.

**Owner:** Canvas Authoring / dbt Project Analysis / Workspace File I/O.

**Do not:** combine atomic publication in the same first authority PR unless Planning DB dependency and design explicitly require one inseparable transaction.

### Product slice D — atomic publication and exact revision

Use the existing batch mutation port and bind receipt to whole-project content set, analysis, Preview, Run, and reopen.

---

## 12. Required next iteration handoff

At the end of the pagination correction, the implementation agent must leave:

```markdown
## Iteration Handoff

### Identity
- Planning DB task/design:
- Base SHA:
- Final head SHA:
- Branch:
- PR:

### Goal
- User transaction closed:
- Why this iteration was next:

### What changed
- Product behavior:
- Domain objects/contracts:
- Commands/queries:
- Ports/adapters:
- Migrations:
- Files/components:

### How and why
- Implementation route:
- Existing semantics reused:
- Alternatives rejected:
- Why no duplicate rail/authority was introduced:

### Evidence
- Observed red tests:
- Green focused tests:
- Adapter/database tests:
- Live browser/integration proof:
- Exact-head CI links:

### Safety
- Authorization and security:
- Data integrity:
- Observability:
- Compatibility:
- Rollback:

### Review
- Resolved threads:
- Remaining risks:
- Deviations from approved route:
- Follow-up improvements:

### Next iteration
- Recommended bounded slice:
- Why:
- Explicitly out of scope:
```

A PR body is acceptable only when it contains this complete contract and points to exact evidence.

---

## 13. Release gates

The next runtime PR must not merge until:

- complete handoff exists;
- all review threads are resolved on the final head;
- six standard workflows are green;
- custom required checks are visible on the exact head;
- Planning DB design/task/rail/evidence state matches the final code;
- negative tests cover the failure discovered here;
- live proof executes the real protected path;
- rollback and compatibility are explicit;
- no unrelated release, dependency, governance, or architecture framework work is bundled.

---

## 14. Final decision

DVT 0.5.3 is a real product improvement. The run operational read model is now more honest, the prior P2 is fixed, security projection improved, and the release is green.

The repository is currently idle from an open-PR perspective, but it is not ready to jump directly to another broad feature. Two corrections are required first:

1. repair the missing delivery record for #2035;
2. fix scoped run-list pagination so operational truth is complete, not merely internally consistent per item.

After those corrections, resume the dbt product route with model SQL authority. Then use the existing atomic batch authority to bind publication, analysis, Preview, Run, and reopen to one exact project revision.

Do not reopen #2030. Do not repeat the resolved #2035 materialization finding. Do not create a new query rail or another Markdown authority. Close one real user transaction at a time and leave a verifiable handoff after every iteration.
