---
title: DVT Atomic Publication Red-Phase Fowler Review
status: Review
owner: Architecture / Product Delivery
reviewed_repository: dunay2/dvt
reviewed_main_sha: 8c098d6e35ce874efae81609814d99e8e60091f7
reviewed_at: 2026-07-25T04:40:00+02:00
planning_type: architecture-and-governance-review
---

# DVT Atomic Publication Red-Phase Fowler Review

## 1. Executive verdict

There is **no material implementation delta** since the preceding review.

The exact reviewed `main` remains:

```text
8c098d6e35ce874efae81609814d99e8e60091f7
chore(main): Release 0.5.3 (#2037)
```

The current product lane is correctly focused, but stalled in its red phase:

1. PR #2040 contains graph-owned DBT model SQL authority correctly and is green.
2. PR #2055 proves that graph-derived DBT artifact publication is not atomic.
3. No server-owned green implementation has been added.
4. The P1 on #2055 remains valid and unresolved.
5. Planning DB sequencing has not legitimately changed.

The next useful code is not another review, release, dependency update, UI framework, migration for nonexistent legacy data, or generic batch endpoint. It is one protected application transaction implementing the existing graph-derived artifact publication intent through the existing workspace batch mutation authority.

## 2. Exact repository state

### 2.1 Main

| Ref | Exact SHA | State |
| --- | --- | --- |
| `main` | `8c098d6e35ce874efae81609814d99e8e60091f7` | Release `0.5.3`; unchanged |

Recent product commits on main remain:

- `9bc344578ca3ed45d09924dba4341ba41eff9b38` — unified run operational truth;
- `8a39d19ec0d6b2abedfe7ce313ac4e7c53d9b3d8` — preserved pending reconciliation receipt truth.

No later product commit exists on main.

### 2.2 Open pull requests

| PR | Head | Purpose | Current judgment |
| --- | --- | --- | --- |
| [#2040](https://github.com/dunay2/dvt/pull/2040) | `6257745ed1ec91f1a1415585d24e319905966931` | contain DBT model SQL authority | functionally credible; six workflows green; no open thread |
| [#2055](https://github.com/dunay2/dvt/pull/2055) | `58fb694ce7602d5ae3942b5ff83881e2c3e7ec43` | executable red proof of publication atomicity gap | intentionally red; one unresolved P1; must not merge |
| [#2057](https://github.com/dunay2/dvt/pull/2057) | `0dd622889412e2f84e1348759e5afb38dc513abb` | prior point-in-time review | superseded by this report; documentation only |

### 2.3 Relevant branch delta

The actual delta from #2040 to #2055 is narrow:

```text
base: 6257745ed1ec91f1a1415585d24e319905966931
head: 58fb694ce7602d5ae3942b5ff83881e2c3e7ec43
ahead: 2 commits
changed files: 1
```

Only this file changes relative to #2040:

```text
apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.test.ts
```

The PR appears large against `main` only because it is temporarily stacked over unmerged #2040 while targeting `main` to exercise the full CI matrix.

## 3. Implementation handoff audit

### 3.1 PR #2040

Status:

```text
IMPLEMENTER-HANDOFF-MISSING
REVIEWER-RECONSTRUCTED-HANDOFF-AVAILABLE
```

A retrospective handoff exists at:

- <https://github.com/dunay2/dvt/pull/2040#issuecomment-5072979847>

It is useful and evidence-backed, but it was reconstructed by the reviewer after the implementer stopped working. It therefore does not prove the implementer followed the required closeout protocol or wrote the tests first in red.

### 3.2 PR #2055

Status:

```text
ITERATION-IN-PROGRESS
RED-PROOF-AVAILABLE
FINAL-HANDOFF-NOT-YET-DUE
```

#2055 is intentionally an incomplete red phase. Its body is not a final handoff, nor should it claim completion. A final `## Iteration Handoff` becomes mandatory only when the same branch contains the green implementation and final CI/integration proof.

### 3.3 Required final handoff for #2055

The implementing agent must leave one top-level `## Iteration Handoff` containing:

1. exact base SHA and final head SHA;
2. branch and PR;
3. Planning DB work item and design IDs;
4. user transaction closed;
5. what changed;
6. how the server-owned transaction works;
7. why existing batch authority was reused;
8. exact DDD owner;
9. retained command/query rails;
10. Web ports, API ports, adapters and contracts;
11. all files and migrations touched;
12. red test chronology with failing CI link;
13. green test chronology with final CI links;
14. live browser or protected integration proof;
15. security, data-integrity and observability posture;
16. pre-product compatibility decision;
17. rollback posture;
18. residual risks;
19. deviations from this route;
20. next bounded iteration.

## 4. Claim-to-evidence matrix

| Claim | Evidence | Status |
| --- | --- | --- |
| `main` remains on release 0.5.3 | exact commit search | VERIFIED |
| #2040 contains graph-owned SQL authority | source policy, publisher, Code posture and live test | VERIFIED |
| #2040 CI is green | six completed successful workflow runs on exact head | VERIFIED |
| #2040 has no unresolved review threads | GitHub review-thread query | VERIFIED |
| #2040 was written test-first | no red chronology from implementer | NOT PROVEN |
| #2040 has a usable handoff | reviewer reconstruction | PARTIAL |
| #2055 changes only the atomicity test relative to #2040 | exact commit comparison | VERIFIED |
| #2055 proves partial publication | governed Web test fails on exact head | VERIFIED |
| all non-test quality checks on #2055 are green | workflow runs on exact head | VERIFIED |
| #2055 contains an atomic implementation | no runtime delta relative to #2040 | CONTRADICTED |
| #2055 can merge | Test Suite fails and P1 is unresolved | CONTRADICTED |
| legacy migration is required | no deployed contract or supported population exists | DISPROVED |
| existing batch infrastructure can own the transaction | Source Import and YAML description commands already use it | VERIFIED |
| Preview/Run are bound to one exact published project identity | no green receipt/admission implementation exists | NOT PROVEN |

## 5. Material delta since the previous cycle

There is no new code, contract, migration, workflow, test, review-thread resolution or CI result beyond the already established red phase.

The current head positions are unchanged:

```text
#2040: 6257745ed1ec91f1a1415585d24e319905966931
#2055: 58fb694ce7602d5ae3942b5ff83881e2c3e7ec43
main:  8c098d6e35ce874efae81609814d99e8e60091f7
```

No new finding is introduced merely to create activity.

## 6. Fixed, active, superseded and disproved findings

### 6.1 Fixed

#### F-01 — Code reconciliation receipt race

Status: **FIXED** by #2030.

Do not reopen it.

#### F-02 — Non-terminal run materialization divergence

Status: **FIXED** by #2035.

List and detail now use a common operational truth projector for terminal materialization posture.

#### F-03 — Graph Preview silently overwrites divergent model SQL

Status: **FIXED IN OPEN PR #2040**, not yet on main.

Evidence:

- graph-managed model SQL carries a deterministic payload-integrity marker;
- the publisher preflights all candidate artifacts before the first write;
- divergent or malformed model SQL blocks Preview;
- graph-owned Project Code surfaces are read-only;
- file-authoritative DBT projects remain editable;
- protected Cypress proof preserves external SQL byte-for-byte after rejected Preview.

### 6.2 Active

#### A-01 — Graph-derived project publication is not atomic

Status: **ACTIVE P1**.

The publisher still calls `saveFileContent` in a loop after preflight. A later failure leaves earlier writes applied.

#2055 now proves this directly.

#### A-02 — Published project identity is not the authority admitted by Preview and Run

Status: **ACTIVE P1**.

A file save receipt is insufficient to identify a whole project. The current Code reconciliation callback historically ignores the individual receipt and refetches the latest projection. The missing authority chain is:

```text
publication request
  -> atomic batch receipt
  -> projectContentSetSha256
  -> analysisSha256
  -> Preview provenance
  -> Run provenance
  -> reopen posture
```

#### A-03 — Workspace capability truth is incomplete

Status: **ACTIVE P1 after atomic publication**.

`LocalWorkspaceFileRepository`:

- caps inventory at 500 files;
- returns no cursor or complete/partial posture;
- caps files at 1 MB;
- reports oversized files through `InvalidWorkspacePathError`;
- silently stops traversal when the cap is reached.

This is hidden capacity, primitive error semantics and stale product truth.

#### A-04 — `ListRuns` pagination is not a real scoped keyset operation

Status: **ACTIVE P2 after the current DBT integrity transaction**.

`ListRunsUseCase`:

- asks the store for a tenant-limited page;
- filters project and environment afterward;
- builds a cursor after filtering;
- returns a cursor string while the query shape does not establish the full keyset contract.

Authorized runs can be hidden behind unrelated rows.

#### A-05 — Generic Web JSON decoding trusts casts

Status: **ACTIVE P2**.

`createApiClient` returns:

```ts
return parsedBody as TResponse;
```

New publication and revision receipts must be parsed with shared runtime schemas at the HTTP boundary rather than relying on TypeScript assertions.

#### A-06 — Browser warning is not durable recovery

Status: **ACTIVE P2**.

Flush-before-navigation and `beforeunload` warnings do not restore buffers after process, browser or power failure. Durable authoring recovery belongs after publication and workspace truth.

#### A-07 — Product quality gates remain uneven

Status: **ACTIVE FOLLOW-UP**.

The repository has substantial test governance, but product-wide release confidence remains weaker for:

- Web/API coverage ratchets;
- accessibility automation;
- bundle budgets;
- large-graph interaction performance;
- load, concurrency and injected-failure scenarios;
- current-status generation.

### 6.3 Superseded

#### S-01 — Separate Code persistence and reconciliation before all other work

Status: **SUPERSEDED**.

The concrete reconciliation race was fixed by receipt authority. A larger state refactor is no longer the immediate product blocker.

#### S-02 — More release governance before product work

Status: **SUPERSEDED**.

Release governance is sufficiently mature for the present stage. The product integrity transaction has higher value.

### 6.4 Disproved

#### D-01 — DVT must migrate pre-marker production artifacts

Status: **DISPROVED**.

DVT is pre-product. No merged compatibility contract, deployed user population or product-owner preservation decision was identified. Unknown divergent artifacts must fail closed; speculative migration machinery is out of scope.

## 7. Brutally honest Fowler review

### 7.1 Transaction Script without transaction ownership

The current browser publisher contains a correct all-artifact preflight followed by independent writes. This is an improved transaction script, not a transaction.

The smell is not “missing rollback code.” The smell is ownership in the wrong process.

A browser cannot guarantee multipath filesystem atomicity. Adding compensation there would create:

- more failure modes;
- duplicate state restoration semantics;
- partial rollback ambiguity;
- race windows;
- responsibility overload;
- test-only confidence.

The server batch gateway already owns the correct primitive.

### 7.2 Hidden authority

Without a command receipt carrying exact project and analysis identity, Preview can still reason from “whatever the latest project projection is now.” That is stale truth masquerading as reproducibility.

A mature authoring system must distinguish:

- candidate artifact set;
- committed artifact set;
- analyzed project revision;
- previewed plan revision;
- running revision.

### 7.3 Duplicate authority risk

The next implementation must not create:

- `SaveDbtProjectFiles` alongside `GenerateDbtWorkspaceArtifacts`;
- a generic browser-visible batch mutation rail;
- another repository abstraction for the same workspace root;
- a second project hash calculation in Web;
- a plan-local project identity unrelated to analysis identity.

### 7.4 Responsibility overload

`DbtGraphWorkspaceArtifactPublisher` may own graph-derived projection and preflight policy in Web. It must not own filesystem transaction semantics, durable idempotency or analysis receipts.

The API application command owns the product transaction.

### 7.5 Primitive obsession

A collection of `path`, `content`, `expectedSha`, `projectHash` and `analysisHash` strings is not enough when passed independently.

The application needs one validated command-specific receipt that states:

- which request was admitted;
- which paths and hashes were committed;
- whether the request was deduplicated;
- which complete project content set was analyzed;
- which analysis produced the Preview/Run authority.

### 7.6 Shotgun surgery risk

The likely implementation touches contracts, API application, HTTP composition, Web ports/adapters, Canvas orchestration, tests and Planning DB. That does not automatically make it shotgun surgery: it is a cross-layer user transaction.

It becomes shotgun surgery if the same semantics are reimplemented separately in each layer instead of projected from one command receipt.

### 7.7 Test-only confidence

The red unit test is valuable because it models actual mutation. It is not sufficient completion evidence.

Green completion requires:

- batch adapter failure-injection tests;
- protected HTTP integration;
- Web command-adapter test;
- browser flow;
- Preview/Run identity rejection tests;
- final exact-head CI.

## 8. Priority 1 — atomic project publication and exact revision identity

### 8.1 Severity and evidence

Severity: **P1 / release blocking for graph-derived DBT Preview**.

Evidence:

- `publishGraphDbtWorkspaceArtifacts` performs writes in a loop;
- #2055 simulates a failure on the second artifact;
- the first artifact remains changed;
- the governed Web changed-suite fails on the exact PR head;
- the review thread is intentionally unresolved.

### 8.2 Root cause

The browser owns an effect sequence whose atomicity primitive exists only behind the API infrastructure boundary.

Preflight establishes expected revisions, but independent command calls cannot commit as one unit.

### 8.3 User and product impact

A user can receive a failed Preview while the workspace now contains a hybrid project:

- some files represent the new graph;
- other files remain on the previous revision;
- no valid Preview was produced;
- a retry may see a different set of preconditions;
- later Code, analysis or Run behavior becomes difficult to explain.

This is data-integrity loss, not merely poor UX.

### 8.4 Exact domain ownership

| Concern | Owner |
| --- | --- |
| graph-derived artifact projection and divergence preflight | `DbtGraphWorkspaceArtifactPublisher` in Web |
| product command admission | existing `GenerateDbtWorkspaceArtifacts` command intent |
| multipath CAS transaction | `WorkspaceFileBatchMutation` / `IWorkspaceFileBatchMutationPort` |
| filesystem implementation | `LocalWorkspaceFileBatchMutationGateway` |
| project analysis identity | `ProjectDbtGraphFromFiles` / `DbtProjectGraphProjection` |
| Preview authority | existing `PreviewExecutionPlan` rail |
| Run authority | existing `StartRun` and execution binding |

### 8.5 Proposed contracts and domain objects

Do not expose the generic batch gateway contract directly to the browser.

Introduce a command-specific versioned envelope, named according to repository conventions, equivalent to:

```ts
type PublishGraphDbtWorkspaceArtifactsRequestV1 = Readonly<{
  schemaVersion: 'publish-graph-dbt-workspace-artifacts.request.v1';
  canvasId: string;
  idempotencyKey: string;
  artifacts: readonly Readonly<{
    path: string;
    content: string;
    expectedRevision:
      | { kind: 'absent' }
      | { kind: 'content_sha256'; value: string };
  }>[];
}>;
```

The response must be a product receipt, not a screen model:

```ts
type GraphDbtWorkspacePublicationReceiptV1 = Readonly<{
  schemaVersion: 'graph-dbt-workspace-publication-receipt.v1';
  operationId: string;
  requestHash: string;
  idempotencyKey: string;
  deduplicated: boolean;
  files: readonly Readonly<{
    path: string;
    contentSha256: string;
  }>[];
  projectContentSetSha256: string;
  analysisSha256: string;
}>;
```

This envelope should reuse or project fields from `WorkspaceFileBatchReceipt`; it must not duplicate batch persistence logic.

The repository may choose a different final type name after Planning DB design approval. The invariants are mandatory; the spelling is not.

### 8.6 Command/query and port changes

Retain existing product language:

- `GenerateDbtWorkspaceArtifacts` — command intent;
- `ProjectDbtGraphFromFiles` — analysis query;
- `PreviewExecutionPlan` — Preview command;
- `StartRun` — Run command.

Required boundaries:

1. Web gains a capability-specific command port for graph-derived artifact publication.
2. The live Web API adapter maps that port to one protected endpoint implementing the existing command intent.
3. API application service validates scope, request schema, unique paths, limits and idempotency.
4. API maps the request to one `WorkspaceFileBatchMutation`.
5. API invokes `ProjectDbtGraphFromFiles` after successful application.
6. API verifies the analyzed project content-set corresponds to committed file hashes.
7. API returns the versioned publication receipt.
8. Web passes that receipt into Preview provenance/admission.
9. Run uses the persisted Preview/plan provenance and rejects mismatched project identity.

### 8.7 Likely files and components

Contracts:

- `packages/@dvt/contracts/src/contracts/planner/**Publication*.v1.ts`
- `packages/@dvt/contracts/src/index.ts`
- contract tests.

API application:

- `apps/api/src/application/ports/**graphDbtWorkspacePublication*.ts`
- `apps/api/src/application/services/**PublishGraphDbtWorkspaceArtifactsCommand*.ts`
- existing `apps/api/src/application/ports/workspaceFiles.ts`
- existing `projectDbtGraphFromFilesUseCase.ts`.

API HTTP/composition:

- dedicated protected route and route group;
- protected runtime rail vocabulary/catalog update;
- error-reason catalog;
- route and architecture tests.

Web:

- `apps/web/src/app/ports/workspace.ts` or a dedicated DBT publication capability port;
- live API adapter;
- `dbtGraphWorkspaceArtifactPublisher.ts`;
- `canvasPlanAction.ts`;
- plan provenance/readiness components;
- current red test and integration tests.

Planning DB:

- design migration for `E-WEB-DBT-ATOMIC-PUBLICATION-1`;
- implementation closeout only after green evidence;
- component/rail/evidence records without parallel semantic authority.

### 8.8 Migration and compatibility strategy

DVT is pre-product.

Therefore:

- no compatibility adapter for previous unpublished command payloads;
- no migration of branch-local receipts;
- no dual-write period;
- no version negotiation for nonexistent clients;
- remove obsolete browser per-file publication when the vertical is green.

Persisted Planning DB migrations remain append-only according to repository governance.

### 8.9 Rollback posture

Code rollback:

- revert the implementation PR;
- the previous browser publisher returns, but the P1 returns as known debt;
- do not leave both implementations selectable.

Data rollback:

- an atomic batch conflict performs zero writes;
- injected replacement failure restores original entries in the existing gateway;
- successful publication is a committed project revision and is not automatically compensated because Preview later fails;
- a future explicit revert operation must be a separate domain command, not hidden rollback.

### 8.10 Observability

Emit or record:

- operation ID;
- request hash;
- idempotency key hash or safe identifier;
- tenant/project/environment scope identifiers according to existing logging policy;
- artifact count;
- committed path names and content hashes;
- conflict paths and current hashes;
- deduplicated posture;
- batch duration;
- analysis duration;
- `projectContentSetSha256`;
- `analysisSha256`;
- Preview/Run rejection reason.

Never log:

- SQL bodies;
- YAML bodies;
- credentials;
- profiles contents;
- bearer tokens.

### 8.11 Security implications

The command must:

- use protected runtime authentication and authorization;
- derive scope from the granted session, not request-controlled tenant identifiers alone;
- apply workspace path normalization;
- enforce per-file and batch byte limits;
- reject duplicate paths;
- reject parent traversal and absolute paths;
- use bounded artifact counts;
- keep dbt profiles/credentials server-owned;
- parse response contracts at runtime in Web.

The graph-owned marker remains an integrity convention, not origin authentication.

### 8.12 PR decomposition

Prefer one user-complete PR with reviewable internal commits:

1. **Design and red contracts**
   - Planning DB design row;
   - shared request/receipt schemas;
   - API red tests;
   - retain the existing Web red test.
2. **Server transaction**
   - application command;
   - batch gateway reuse;
   - protected route;
   - idempotency and conflict tests.
3. **Analysis identity and Web integration**
   - `ProjectDbtGraphFromFiles` after commit;
   - Web command port/adapter;
   - Preview provenance binding;
   - Run mismatch rejection.
4. **Live proof and closeout**
   - protected browser test;
   - failure injection;
   - Planning DB evidence;
   - final handoff.

Do not merge intermediate red-only commits independently.

### 8.13 Red/green tests

Current red proof:

- second artifact fails after first mutation;
- all original bytes must remain.

Additional required red tests:

1. conflict on the first path returns zero writes;
2. conflict on a middle path returns zero writes;
3. all conflicting paths are reported;
4. duplicate paths are rejected before adapter invocation;
5. retry with the same key and same request returns the same receipt;
6. same key with another request fails closed;
7. injected replace failure restores every original entry;
8. response write hashes match actual files;
9. analysis content-set hash matches committed paths and hashes;
10. concurrent mutation of an analyzed but unwritten project file invalidates admission;
11. Preview rejects a different content-set hash;
12. Run rejects or requires a new Preview after project drift;
13. logs omit SQL bodies.

### 8.14 Live browser or integration proof

Required protected flow:

```text
open graph-draft Canvas
  -> edit model SQL
  -> request Preview
  -> one protected publication command
  -> atomic batch receipt
  -> fresh project analysis
  -> Preview displays exact publication identity
  -> Start Run
  -> Run displays the same project content-set and analysis identity
```

Negative live flow:

```text
prepare two artifact writes
  -> mutate one expected file concurrently
  -> request Preview
  -> publication conflicts
  -> no file changes
  -> no Preview
  -> no Run
  -> actionable conflict path shown
```

### 8.15 Acceptance criteria

The slice is complete only when:

- no Web loop calls `saveFileContent` per generated artifact;
- one server-owned batch owns all writes;
- any conflict or adapter failure leaves all original files intact;
- idempotent retry returns the same receipt;
- request-key reuse mismatch fails;
- the receipt lists exact committed paths and hashes;
- `projectContentSetSha256` is derived from the committed project;
- `analysisSha256` corresponds to that content set;
- Preview stores and displays the receipt identity;
- Run uses the Preview identity;
- reopen reports exact, stale or conflict explicitly;
- protected integration and browser proof pass;
- Planning DB status is implemented only on final green evidence;
- final handoff exists.

### 8.16 Release gates

Required before merge:

- contracts tests;
- API unit and architecture tests;
- workspace batch gateway failure-injection tests;
- Web unit/presentation/architecture tests;
- exact current red test becomes green;
- protected HTTP integration;
- protected Cypress proof;
- typecheck and lint;
- Planning DB migration and integrity checks;
- feature mechanization validation;
- `verify:prepush`;
- six standard workflows on the exact final head;
- zero unresolved P1/P2 threads for the slice.

## 9. Priority 2 — workspace capability truth

This begins only after Priority 1 is green.

### Required product shape

```ts
type WorkspaceFileInventoryPage = Readonly<{
  entries: readonly WorkspaceFileEntry[];
  completeness: 'complete' | 'partial';
  nextCursor: string | null;
  limits: Readonly<{
    maxFileBytes: number;
    supportedExtensions: readonly string[];
  }>;
}>;
```

Typed file read outcomes should distinguish:

- `not_found`;
- `oversized`;
- `unsupported`;
- `invalid_path`;
- `unavailable`.

Do not merely raise the numeric limits. Make capability explicit and observable.

## 10. Priority 3 — cohesive authoring recovery

After inventory truth:

- durable local journal keyed by scope, authority, path and base revision;
- restoration prompt after crash;
- explicit discard/rebase/restore choices;
- no silent replay over a changed authoritative file;
- no duplicate persistence rail.

This should be a cohesive authoring-session boundary, not more route-local effects.

## 11. Priority 4 — product-wide quality gates

After the user transaction is durable:

- Web/API coverage ratchets;
- accessibility checks for Canvas, Code, dialogs, keyboard and focus;
- bundle-size budgets;
- large graph interaction budgets;
- API latency and payload budgets;
- multi-worker and concurrency tests;
- injected infrastructure failures;
- current status generated from Planning DB and exact Git evidence.

## 12. Mature-system comparison

### 12.1 dbt Studio

Official dbt documentation describes Studio IDE as one interface for building, testing, running and version-controlling dbt projects.

DVT should match:

- normal dbt files;
- honest file state;
- build/test/run linkage;
- revision-aware execution.

DVT should differ:

- graph-draft bootstrap is a first-class temporary authority;
- heterogeneous plugins remain broader than dbt.

DVT should defer:

- broad collaboration and hosted lifecycle parity until authority and revision identity are correct.

Reference: <https://docs.getdbt.com/>

### 12.2 Airflow

Airflow DAG Bundles version the complete set of files required by a DAG and allow a run to retain the same bundle version while code changes elsewhere.

DVT should match the invariant, not the Python/DAG implementation:

```text
one execution -> one complete immutable project identity
```

Reference: <https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/dag-bundles.html>

### 12.3 Prefect

Prefect deployment versions support history, rollback/promotion and exact code versions through commit or image identity.

DVT should match:

- version provenance;
- exact code identity;
- explicit promotion/rollback later.

Reference: <https://docs.prefect.io/v3/how-to-guides/deployments/versioning>

### 12.4 Dagster

Dagster emphasizes declarative assets, lineage, observability and testability.

DVT should use this as a later product direction after project authority is safe. Adding richer lineage before atomic publication would decorate unstable truth.

Reference: <https://docs.dagster.io/>

### 12.5 Temporal

Temporal guarantees durable workflow resumption after failures.

DVT should borrow:

- durable identities;
- idempotency;
- explicit recovery;
- replay-safe state transitions.

DVT should not embed a workflow engine inside the editor.

Reference: <https://docs.temporal.io/>

### 12.6 NiFi

Apache NiFi Registry is deprecated following a February 2026 community vote, and NiFi 2 provides Git-based Flow Registry Clients.

DVT should not build a parallel proprietary registry merely to compensate for missing project identity. Git remains the long-term review/history surface; DVT receipts provide immediate transaction identity.

References:

- <https://nifi.apache.org/projects/registry/>
- <https://nifi.apache.org/components/org.apache.nifi.github.GitHubFlowRegistryClient/>

### 12.7 Professional IDE and version-control workflows

A professional IDE distinguishes:

- editor buffer;
- saved working-tree file;
- staged change;
- commit;
- branch;
- remote synchronization;
- conflict.

DVT must not label a successful workspace write as broader synchronization. The same discipline applies to project publication, Preview and Run.

## 13. Current CI and review-thread state

### 13.1 PR #2040

Exact head:

```text
6257745ed1ec91f1a1415585d24e319905966931
```

Workflow posture:

- Contracts & Determinism: success;
- Dependency Review: success;
- Test Suite: success;
- CI - Code Quality: success;
- CodeQL: success;
- PR Quality Gate: success.

Review threads:

- unresolved: 0;
- resolved: 1 compatibility claim, disposition `DISPROVED / not applicable`.

### 13.2 PR #2055

Exact head:

```text
58fb694ce7602d5ae3942b5ff83881e2c3e7ec43
```

Workflow posture:

- Contracts & Determinism: success;
- Dependency Review: success;
- CodeQL: success;
- CI - Code Quality: success;
- PR Quality Gate: success;
- Test Suite: **failure**, intentionally exposing the atomicity gap.

Failed job:

```text
Web Frontend Tests
  -> Run governed web Vitest changed suites (PR)
```

Review threads:

- unresolved P1: 1;
- reason: per-file writes can partially publish;
- required disposition: remain unresolved until the same test is green through server-owned batch publication.

### 13.3 Release state

Latest main release remains `0.5.3`.

There is no active release PR. Do not create a release while the current product branch is intentionally red.

## 14. Required corrective instruction for the implementing agent

### Blocking correction

What is wrong:

- Web preflights all artifacts but persists them independently.

Why it matters:

- project files can become mutually inconsistent after a failed Preview request.

Exact owner:

- Web keeps projection/preflight;
- API application command owns transaction;
- workspace batch gateway owns atomic filesystem effect;
- project analysis owns revision identity.

How to correct:

1. approve the Planning DB design for `E-WEB-DBT-ATOMIC-PUBLICATION-1`;
2. retain the existing `GenerateDbtWorkspaceArtifacts` command intent;
3. add shared request/receipt schemas;
4. implement one protected API command;
5. map the full prepared artifact set to one `batchMutation.apply`;
6. run fresh project analysis after commit;
7. verify content-set identity;
8. return the exact receipt;
9. pass it to Preview;
10. persist it in plan provenance;
11. enforce it at Run;
12. make the current red test green;
13. add protected live proof;
14. close the P1 only on final head evidence;
15. leave the final handoff.

What must not be introduced:

- generic browser batch endpoint;
- React compensation loop;
- second workspace repository;
- dbt-specific save synonym;
- legacy migration;
- hidden latest-read authority;
- SQL body logging.

### Follow-up improvements

Only after the blocking correction:

- workspace inventory truth;
- durable recovery;
- `ListRuns` keyset pagination;
- HTTP runtime parsing;
- accessibility/performance/coverage gates.

## 15. Next implementation slice

The next code commit must start the green route, not add more red-only commentary.

Minimum useful commit:

```text
shared request/receipt schema
+ API application command skeleton
+ API red tests proving command uses one batch apply
+ no Web switch yet
```

The next commit then wires Web and makes the existing atomicity test green.

The slice must close this real user transaction:

```text
Canvas edit
  -> generated complete DBT artifact set
  -> one atomic project publication
  -> exact project analysis
  -> Preview of that identity
  -> Run of that identity
```

## 16. Required next iteration handoff

The next cycle should reject completion unless the implementation agent provides:

- link to #2055 final head;
- exact commits implementing the server command;
- Planning DB task/design proof;
- request/receipt schemas;
- command/query and port inventory;
- batch gateway reuse evidence;
- current red test green;
- API idempotency and conflict tests;
- Preview/Run mismatch tests;
- protected live proof;
- logs/observability evidence without source bodies;
- rollback and security posture;
- six workflows on exact head;
- zero unresolved P1/P2 threads;
- next bounded route.

## 17. Final decision

The repository has enough architecture and governance to implement the current transaction. The bottleneck is delivery, not design discovery.

Do not create another lateral initiative.

Make #2055 green by moving the artifact publication effect behind one server-owned, idempotent, multipath batch command and bind Preview/Run to its exact project analysis identity.
