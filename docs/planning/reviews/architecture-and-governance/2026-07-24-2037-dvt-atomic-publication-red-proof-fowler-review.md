---
title: DVT Atomic Publication Red Proof and Delivery Handoff Fowler Review
status: Review
owner: Architecture / Product / Delivery
reviewed_repository: dunay2/dvt
reviewed_ref: main
reviewed_commit: 8c098d6e35ce874efae81609814d99e8e60091f7
reviewed_at: 2026-07-24T20:37:00+02:00
planning_type: architecture-governance-review
---

# DVT Atomic Publication Red Proof and Delivery Handoff Fowler Review

## 1. Executive verdict

This cycle contains a real material delta even though `main` has not moved.

The repository remains published at `0.5.3`, but two delivery events changed the product route:

1. PR #2040 now has a complete retrospective `## Iteration Handoff`, reconstructed from repository evidence and explicitly marking unrecoverable red-first chronology as not proven.
2. PR #2055 introduces an executable red test for the next approved task, `E-WEB-DBT-ATOMIC-PUBLICATION-1`. GitHub CI fails the governed Web test exactly because the current publisher can persist the first artifact and then fail on the second, leaving a partially generated dbt project.

This is the first cycle in the recent sequence that moves beyond repeated state review and produces executable evidence for the next implementation slice.

The immediate route is now unambiguous:

```text
PR #2040 closes SQL authority containment
  -> PR #2055 proves sequential publication is non-atomic
  -> dedicated server-owned publication command
  -> existing workspace batch mutation port
  -> immutable publication receipt
  -> exact project content-set and analysis identity
  -> Preview and Run admission against that identity
```

PR #2055 is intentionally red and must not merge in its current state.

## 2. Exact reviewed state

### 2.1 Main

- Repository: `dunay2/dvt`
- Exact reviewed `main`: `8c098d6e35ce874efae81609814d99e8e60091f7`
- Commit: `chore(main): Release 0.5.3 (#2037)`
- Current published release line: `0.5.3`
- Product commits after this SHA: none

Main link:

- https://github.com/dunay2/dvt/commit/8c098d6e35ce874efae81609814d99e8e60091f7

### 2.2 Open pull requests

| PR | Head | State | Purpose | Current gate |
| --- | --- | --- | --- | --- |
| #2040 | `6257745ed1ec91f1a1415585d24e319905966931` | open, mergeable | SQL authority containment | six standard workflows green; retrospective handoff present |
| #2055 | `58fb694ce7602d5ae3942b5ff83881e2c3e7ec43` | open, mergeable, intentionally red | executable atomic-publication gap proof | Web Test Suite fails as expected; P1 open |
| #2054 | documentation-only review | open draft | superseded previous current-state review | should close after this report opens |

### 2.3 Release state

No new release candidate or release PR is open. `0.5.3` remains the latest repository release state. The next release must not be cut from the intentionally failing #2055 head.

## 3. Implementation handoff status

### 3.1 Latest completed implementation iteration: PR #2040

Handoff:

- https://github.com/dunay2/dvt/pull/2040#issuecomment-5072979847

Status:

```text
DELIVERY-HANDOFF-RETROSPECTIVE
```

The handoff is sufficiently complete to audit the iteration, but it was reconstructed by the reviewer after the implementation agent stopped. This is a process exception, not evidence that the implementer followed the required closeout protocol.

The handoff identifies:

- exact base and final head SHA;
- branch, PR, commit and Planning DB work item;
- iteration goal;
- what changed;
- implementation structure and rationale;
- owners, commands, queries, ports, adapters and contracts;
- touched runtime, test and migration surfaces;
- user-visible behavior;
- CI evidence;
- protected live-browser proof;
- security, data-integrity and observability posture;
- compatibility decision;
- rollback posture;
- residual risks;
- next iteration.

It also explicitly records:

```text
red-first chronology: NOT PROVEN
```

That distinction is correct and must be preserved. A retrospective handoff may reconstruct final evidence but cannot manufacture development chronology.

### 3.2 Current in-progress iteration: PR #2055

PR #2055 is the red phase of `E-WEB-DBT-ATOMIC-PUBLICATION-1`, not a completed iteration. A final handoff is not required until the green vertical is complete, but the PR body already states the intended owner, forbidden shortcuts and validation posture.

At green closeout, #2055 must publish its own complete `## Iteration Handoff`; the retrospective exception used for #2040 must not become the normal process.

## 4. Material delta since the previous review

### 4.1 Verified retrospective closeout for SQL authority

PR #2040 implements the following end-to-end behavior:

```text
graph-draft Canvas owns model SQL
  -> graph-derived artifact projection
  -> complete artifact preflight
  -> divergent external SQL detected before first write
  -> Preview rejected
  -> external bytes preserved
  -> Project Code shows graph-owned generated SQL read-only
```

The head has six successful workflows:

- Test Suite;
- CI - Code Quality;
- Contracts & Determinism;
- CodeQL;
- Dependency Review;
- PR Quality Gate.

The sole historical compatibility thread is resolved. Its premise — a supported deployed population of pre-marker artifacts — remains disproved because DVT is pre-product and no merged preservation contract establishes that obligation.

### 4.2 Executable red proof for partial publication

PR #2055 adds a focused test to:

`apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.test.ts`

The test models:

```text
existing dbt_project.yml
existing models/orders.sql
complete preflight succeeds
save dbt_project.yml succeeds
save models/orders.sql throws
expected: both original files remain unchanged
actual: dbt_project.yml has already changed
```

The repository Test Suite fails in `Web Frontend Tests`, at the governed changed-suite step. The failure is expected and supports the P1 identified by both the review and Codex.

This is valid red evidence because:

- the failure is on the exact branch head;
- the production publisher still contains a sequential `saveFileContent` loop;
- the assertion requires a transaction invariant the production implementation cannot currently satisfy;
- other independent checks — Contracts, Dependency Review, CodeQL and Quality Gate — pass.

The test must remain red until the production path moves behind a server-owned atomic mutation.

## 5. Claim-to-evidence matrix

| Claim | Status | Evidence | Disposition |
| --- | --- | --- | --- |
| `main` is still release `0.5.3` | VERIFIED | exact main SHA and commit message | no release delta |
| #2040 prevents divergent Project Code SQL overwrite | VERIFIED | policy, publisher, Canvas integration and protected Cypress changes | ready for normal closeout |
| #2040 uses complete preflight before first write | VERIFIED | `publishGraphDbtWorkspaceArtifacts` reads all artifacts before mutation | containment, not atomicity |
| #2040 six standard workflows are green | VERIFIED | exact-head workflow runs | CI credible |
| #2040 has a complete handoff | PARTIAL | retrospective `## Iteration Handoff` exists and is comprehensive | auditable, but not implementer-authored |
| #2040 tests were written before implementation | NOT PROVEN | retrospective report explicitly cannot reconstruct chronology | do not claim |
| sequential publication can leave a partial project | VERIFIED | #2055 red test plus failing Web Test Suite and existing mutation loop | active P1 |
| #2055 Test Suite failure is an unrelated regression | DISPROVED | failure is the intentionally added atomicity invariant on the changed suite | expected red phase |
| Web preflight makes the writes atomic | CONTRADICTED | per-file command loop remains after preflight | replace with one batch command |
| the existing API already has atomic file infrastructure | VERIFIED | `IWorkspaceFileBatchMutationPort`, gateway and existing application consumers | reuse required |
| browser compensation is an acceptable fix | CONTRADICTED | partial writes and concurrent mutation make compensation another race | forbidden |
| generic batch mutation should be exposed directly to Web | CONTRADICTED | repository rails are product commands, not storage-shaped UI commands | use dedicated application command |
| publication receipt is already bound to exact project analysis identity | NOT PROVEN | current per-file receipts and refresh reads do not form one publication identity | next vertical scope |
| legacy artifact migration is required | DISPROVED | no product dataset or merged compatibility obligation | out of scope |

## 6. Fowler review

### 6.1 Transaction Script without transaction ownership — active P1

The current Web publisher owns:

- artifact enumeration;
- preflight reads;
- SQL ownership classification;
- expected-revision capture;
- mutation ordering;
- partial-success accumulation.

The last two responsibilities do not belong in a browser orchestration loop. The loop is a Transaction Script pretending a sequence of independently successful commands is one product transaction.

Failure mode:

```text
artifact A committed
artifact B conflicts
Preview not created
workspace now represents neither previous nor proposed project
```

This is a data-integrity defect, not merely a poor error message.

### 6.2 Leaky abstraction — active

`IWorkspaceFileContentCommandPort.saveFileContent` is a correct single-file command. Reusing it in a loop for a multi-file product operation leaks the storage granularity into the product transaction.

The solution is not to weaken the single-file port. It is to introduce a specific application command that owns one complete graph-derived dbt project publication and delegates its storage transaction to the existing internal batch port.

### 6.3 Hidden authority — SQL containment fixed, revision authority active

PR #2040 fixes the hidden authority between graph SQL and workspace SQL for graph-draft Preview.

The remaining hidden authority is temporal:

- one set of files is published;
- a later `ProjectDbtGraphFromFiles` query observes whatever is current then;
- Preview and Run can therefore be attributed to a project state other than the publication operation that triggered them.

The receipt must carry exact project and analysis identity. A later uncorrelated read is not proof.

### 6.4 Test-only confidence — improved but still incomplete

The red proof is valuable because it executes the actual Web publisher policy. It does not yet prove the final runtime path because the server-owned application command does not exist.

Green confidence requires:

- API command tests;
- real batch gateway tests;
- HTTP adapter tests;
- Web adapter tests;
- Canvas integration tests;
- protected browser proof;
- injected failure before and during replacement;
- exact receipt and analysis identity checks.

### 6.5 Shotgun surgery risk — guard before implementation

The green change can easily spread across:

- contracts;
- Web ports;
- Web API adapter;
- Canvas publisher;
- API routes;
- application services;
- workspace gateway;
- dbt analyzer;
- plan preview and run provenance;
- Planning DB migrations;
- Cypress.

This scope is justified only if decomposed around one user transaction and one owner. Do not distribute project identity assembly across Web, API route and analyzer helpers.

## 7. Blocking correction for PR #2055

### 7.1 What is wrong

`DbtGraphWorkspaceArtifactPublisher` invokes `saveFileContent` once per artifact. A later failure leaves earlier writes persisted.

### 7.2 Why it matters

User impact:

- the workspace can contain a mixed old/new dbt project;
- Preview is absent, so the user has no accepted result representing that state;
- retry semantics become ambiguous;
- subsequent analysis may report a graph for a state the user never successfully published;
- Run reproducibility is impossible.

### 7.3 Exact domain owner

Recommended aggregate/application owner:

```text
GraphDbtWorkspacePublication
```

Existing Web owner retained for projection/preflight:

```text
DbtGraphWorkspaceArtifactPublisher
```

Infrastructure owner reused:

```text
WorkspaceFileBatchMutation
```

Analysis owner reused:

```text
DbtProjectGraphProjection / ProjectDbtGraphFromFiles
```

### 7.4 Proposed contract

Add one versioned receipt contract; final naming should follow the current contract catalogue:

```ts
type GraphDbtWorkspacePublicationReceiptV1 = Readonly<{
  schemaVersion: 'graph-dbt-workspace-publication-receipt.v1';
  operationId: string;
  idempotencyKey: string;
  requestHash: string;
  deduplicated: boolean;
  canvasId: string;
  writtenFiles: readonly Readonly<{
    path: string;
    contentSha256: string;
  }>[];
  projectContentSetSha256: string;
  analysisSha256: string;
  freshness: 'fresh';
}>;
```

Do not return a full screen-shaped graph projection from the command. Return the receipt and let existing queries provide the read model.

### 7.5 Command/query and port changes

Add one command rail specific to this product operation, subject to live Planning DB authority confirmation before implementation:

```text
PublishGraphDbtWorkspaceArtifacts
```

Input:

- authorized workspace scope;
- canvas ID;
- complete artifact proposal;
- expected revision for every affected path;
- idempotency key;
- request/proposal digest.

Internal dependencies:

- `IWorkspaceFileBatchMutationPort`;
- read capability for precondition verification if not already fully supplied by trusted proposal;
- `ProjectDbtGraphFromFiles` after successful mutation;
- publication receipt store if durable replay is required beyond batch receipts.

Web must consume one dedicated command port. Do not expose `WorkspaceFileBatchMutation` as a generic presentation DTO.

### 7.6 Likely files/components

Contracts:

- `packages/@dvt/contracts/src/contracts/...GraphDbtWorkspacePublication*.ts`
- contract tests and index export.

API application:

- new application command under a dbt publication owner;
- application port types only where current ports do not already suffice;
- tests for conflict, idempotency, receipt and analysis binding.

API entrypoint:

- protected route and route group;
- authentication and scope authorization reused;
- rate limiting reused;
- canonical error envelope mapping.

Infrastructure:

- reuse `LocalWorkspaceFileBatchMutationGateway` unchanged unless a proven missing postcondition exists;
- reuse existing project graph analyzer/query;
- do not construct a second filesystem repository.

Web:

- add a dedicated `IGraphDbtWorkspacePublicationCommandPort` or equivalent capability-specific port;
- API adapter with runtime schema validation;
- replace mutation loop in `DbtGraphWorkspaceArtifactPublisher` with one command call;
- keep SQL classification and complete preflight policy in Web only if the server command independently validates every trusted invariant.

Planning DB:

- reopen/claim `E-WEB-DBT-ATOMIC-PUBLICATION-1`;
- design record before runtime implementation;
- component/rail/contract/test/evidence mappings;
- close `GAP-DBT-GRAPH-WORKSPACE-ATOMIC-PUBLICATION` only after live proof.

### 7.7 Migration and compatibility strategy

DVT is pre-product. No migration of historical published project receipts is required unless a concrete deployed-state obligation is introduced.

Compatibility requirements that do apply:

- current graph-draft artifacts remain accepted as command input;
- current single-file Code editing remains on `SaveWorkspaceFileContent`;
- file-authoritative dbt projects remain unaffected by graph-draft publication;
- existing API routes remain stable until consumers migrate;
- no automatic authority fallback.

### 7.8 Rollback posture

Before merge:

- revert restores the old sequential publisher behavior;
- no data migration should make rollback irreversible.

At runtime:

- atomic gateway failure restores or retains all original files;
- no browser compensation;
- if batch succeeds but analysis fails, files remain published and the receipt reports analysis failure/degraded posture rather than silently rolling back an accepted project mutation, unless the approved design explicitly defines publication+analysis as one compensable transaction.

The design must choose and document this boundary before coding. Preferred posture:

```text
file batch commit is authoritative publication
analysis is correlated postcondition/evidence
analysis failure yields published-but-unavailable/degraded, not hidden rollback
Preview admission requires fresh analysis receipt
```

### 7.9 Observability

Emit structured fields only:

- operation ID;
- idempotency key hash, not the raw user key if sensitive;
- tenant/project/environment IDs under existing audit policy;
- canvas ID;
- artifact count;
- paths if current audit policy allows them;
- expected/current/applied hashes;
- conflict count;
- deduplicated flag;
- project content-set hash;
- analysis hash;
- duration and result kind.

Never log SQL, YAML bodies, secrets, profiles or connection credentials.

### 7.10 Security implications

- retain protected scope authorization before any file read or mutation;
- validate paths server-side;
- keep size/file-count limits explicit;
- reject duplicate paths;
- bound total payload bytes;
- use runtime schemas at the HTTP boundary;
- do not accept arbitrary delete lists from the browser for this command;
- derive permitted write set from the accepted graph artifact proposal;
- never include `profiles.yml` credentials in portable project content.

### 7.11 Required red/green tests

Blocking tests:

1. Current #2055 test becomes green: second-artifact failure leaves all original bytes intact.
2. Conflict on any expected path returns conflict and zero writes.
3. All conflicting paths are returned or captured in typed evidence.
4. Batch retry with same idempotency key and request returns identical receipt with `deduplicated=true`.
5. Same key with different request fails closed.
6. Duplicate proposal paths fail before storage.
7. Oversized proposal fails before mutation.
8. Successful receipt lists every changed path and exact hash.
9. Unchanged files are represented consistently and do not cause false conflicts.
10. Analyzer receives the post-publication project content set.
11. Receipt `projectContentSetSha256` equals the projection used for Preview.
12. Preview rejects a stale/different publication identity.
13. Run rejects or requires a new Preview after project identity changes.
14. Logs and audit events contain no SQL bodies.
15. In-memory/test adapters and local gateway pass shared conformance vectors.

### 7.12 Live browser/integration proof

Required protected flow:

```text
Canvas graph-draft
  -> create/edit at least two artifacts
  -> Preview publishes one batch
  -> inspect files through protected file query
  -> verify publication receipt hashes
  -> Preview identity matches analysis identity
  -> Start Run
  -> Run provenance references same identity
  -> inject one stale path
  -> next publication conflicts
  -> verify all files remain unchanged
```

No route interception or direct filesystem assertion may substitute for protected API reads.

### 7.13 Acceptance criteria

- no per-file mutation loop remains in the graph publication transaction;
- one server-owned command applies all writes atomically;
- any conflict means zero writes;
- idempotent retry is deterministic;
- receipt is versioned and runtime-validated;
- receipt binds exact content-set and analysis identity;
- Preview and Run admit only matching identity;
- Project Code authority behavior from #2040 remains intact;
- Planning DB gap is closed only after tests and live evidence;
- all workflows green on final head;
- complete implementer-authored handoff is posted.

### 7.14 Release gates

Do not merge while:

- #2055 red test fails;
- P1 review thread is unresolved;
- #2040 dependency is unmerged or the stacked diff is not reconciled;
- exact-head Test Suite is red;
- receipt/analysis identity is unproven;
- protected live evidence is missing;
- Planning DB claims implemented before evidence is current;
- iteration handoff is absent.

## 8. Non-blocking findings retained

These remain real but must not displace the atomic publication slice:

### 8.1 Workspace capability truth — P1 after atomic publication

- inventory truncates at 500 files;
- no cursor or `complete | partial` posture;
- 1 MB file limit is represented as invalid path;
- dbt-compatible file classes remain incomplete.

### 8.2 ListRuns pagination — P2

The run list still needs storage-level scope and keyset pagination. This is separate from the dbt authoring transaction and should not be folded into #2055.

### 8.3 Durable authoring recovery — P2

Navigation flush and `beforeunload` warning do not recover buffers after browser/system failure.

### 8.4 HTTP runtime validation — P2

Generic `as TResponse` trust remains a weak boundary. New publication contracts must not repeat it.

### 8.5 Product-wide quality gates — later

Web/API coverage ratchets, accessibility, graph performance, bundle budgets and failure-injection suites remain behind the current transactional priorities.

## 9. Fixed, active, superseded and disproved findings

### Fixed

- #2030 pending reconciliation receipt race.
- #2035 list/detail materialization truth divergence.
- #2040 graph Preview overwrite of divergent model SQL, subject to merge.
- marker terminology corrected from creator authentication to payload integrity.

### Active

- atomic multi-file publication P1.
- exact publication/project/analysis/Preview/Run identity P1.
- workspace capability truth P1.
- `ListRuns` pagination P2.
- durable recovery P2.
- runtime HTTP schema validation P2.

### Superseded

- repeated recommendation to refactor Code state as the first product task.
- compatibility-blocking recommendation for pre-marker graph artifacts.
- previous review status `DELIVERY-HANDOFF-MISSING` for #2040; replaced by retrospective handoff status.

### Disproved

- DVT must migrate deployed legacy graph SQL artifacts.
- an unkeyed SHA marker authenticates origin.
- complete preflight alone provides atomic publication.
- browser compensation is equivalent to a server transaction.

## 10. Mature-system comparison

### Match now

- **dbt Studio / professional IDEs:** preserve normal project files, explicit conflicts and clear read-only/editable authority posture.
- **Airflow DAG Bundles:** bind execution to one complete version of all required files; DVT's `projectContentSetSha256` should serve the equivalent reproducibility role for a published dbt project.
- **Prefect:** preserve explicit deployment/code identity and avoid an ambiguous “latest files” execution posture.
- **Temporal:** use durable operation identity and idempotency for retries; do not conflate UI retry with a new transaction.

### Differentiate deliberately

- DVT should provide a graph-first bootstrap and context-sensitive authoring surface while retaining normal dbt files.
- DVT should expose authority, conflict and revision posture directly on Canvas/Code, rather than hiding it behind an orchestration-only UI.

### Defer

- **Dagster:** richer asset catalog, checks, partitions and lineage UX.
- **NiFi:** broad flow registry/collaboration semantics; DVT should prefer Git/revision identity over creating a parallel proprietary registry.
- multi-user collaboration, promotion environments and rollback UX beyond the exact publication receipt.

Official reference used for the immediate reproducibility comparison:

- https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/dag-bundles.html

Airflow's versioned DAG bundles allow a run to retain the same complete code version through execution; DVT should match that invariant before attempting later asset/catalog differentiation.

## 11. Priority impact

The live priority order is unchanged but is now backed by executable evidence:

1. SQL authority containment — implemented in #2040, pending normal merge.
2. Atomic project publication — red proof active in #2055.
3. Exact publication/project/analysis/Preview/Run identity — same vertical, cannot be declared complete with atomic files alone.
4. Workspace capability truth.
5. Cohesive authoring recovery.
6. Product-wide non-functional gates.
7. Later differentiation.

No legitimate Planning DB authority change was observed that would reorder these items.

## 12. Required next implementation handoff

At the end of the green #2055 iteration, the implementer must post `## Iteration Handoff` containing:

- base SHA after #2040 integration and final head SHA;
- branch and PR links;
- Planning DB task and design IDs;
- user transaction closed;
- exact application owner;
- command/query rails reused or added;
- contract and receipt version;
- Web port and adapter changes;
- API command, route, port and adapter changes;
- files and migrations touched;
- red evidence link to Test Suite run `30116154817`;
- green focused tests and full CI links;
- protected live proof;
- idempotency and conflict evidence;
- project content-set and analysis identity evidence;
- observability and no-body-logging proof;
- security limits;
- compatibility/pre-product posture;
- rollback posture;
- residual risks;
- deviations;
- next bounded iteration.

A PR body without these fields is not sufficient.

## 13. Final decision

PR #2040 is auditable through a retrospective handoff and appears functionally ready for normal merge with green CI and no open threads.

PR #2055 has successfully proved the next P1 by failing the exact governed Web suite. It must remain unmerged and its P1 thread unresolved until one server-owned atomic publication command makes the same test green and binds the resulting project revision to analysis, Preview and Run.

The repository has therefore resumed product progress. The next cycle must evaluate green implementation evidence rather than create another equivalent red proof or another lateral governance slice.
