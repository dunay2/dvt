---
title: DVT Atomic Publication Red-Phase Stall and Product Route Fowler Review
status: Review
owner: Architecture / Product / Delivery
reviewed_repository: dunay2/dvt
reviewed_ref: main
reviewed_commit: 8c098d6e35ce874efae81609814d99e8e60091f7
reviewed_at: 2026-07-25T00:40:00+02:00
planning_type: architecture-governance-review
---

# DVT Atomic Publication Red-Phase Stall and Product Route Fowler Review

## 1. Executive verdict

There is **no material repository delta** since the previous review.

`main` remains at release `0.5.3`. PR #2040 remains the completed SQL-authority containment slice with green CI. PR #2055 remains the intentionally red proof for atomic DBT artifact publication and has received no green implementation commit. Its single unresolved P1 is still valid: complete browser preflight followed by sequential file commands is not a transaction.

The current state is therefore:

```text
SQL authority containment: implemented on PR #2040, awaiting normal integration
Atomic publication: executable red proof on PR #2055
Server-owned green implementation: not started
Exact project/analysis identity: not implemented
```

The product route has not legitimately changed:

```text
model SQL authority
  -> atomic project publication and exact revision identity
  -> workspace capability truth
  -> cohesive authoring recovery
  -> product-wide quality gates
  -> later differentiation
```

The next contributor must not open another review, release, dependency, generic framework, compatibility, or governance-only line. The next code commit on the product route must replace the browser mutation loop with one protected application command backed by the existing workspace batch mutation authority.

## 2. Exact reviewed state

### 2.1 Main and release

- Repository: `dunay2/dvt`
- Exact `main`: `8c098d6e35ce874efae81609814d99e8e60091f7`
- Commit: `chore(main): Release 0.5.3 (#2037)`
- Published release line: `0.5.3`
- New product commits on `main`: none
- New release candidate: none

Links:

- https://github.com/dunay2/dvt/commit/8c098d6e35ce874efae81609814d99e8e60091f7
- https://github.com/dunay2/dvt/releases/tag/v0.5.3

### 2.2 Open pull requests

| PR | Exact head | Posture | Product meaning |
| --- | --- | --- | --- |
| #2040 | `6257745ed1ec91f1a1415585d24e319905966931` | open, mergeable, non-draft, six standard workflows green | contains model SQL authority and protects external SQL from Preview overwrite |
| #2055 | `58fb694ce7602d5ae3942b5ff83881e2c3e7ec43` | open, mergeable, non-draft, intentionally failing Web Test Suite | executable red phase for atomic publication; must not merge while red |
| #2056 | `09a0315a885f663d7abb3835b302af175e473114` | open draft, documentation only | previous current-state report; superseded by this cycle |

Links:

- https://github.com/dunay2/dvt/pull/2040
- https://github.com/dunay2/dvt/pull/2055
- https://github.com/dunay2/dvt/pull/2056

### 2.3 Relevant branch work

PR #2055 is logically stacked on PR #2040:

```text
main@8c098d6e
  -> #2040@6257745e
  -> #2055 test-only delta@58fb694c
```

The logical diff from #2040 to #2055 changes only:

```text
apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.test.ts
```

with 46 added lines. The PR currently targets `main` only so GitHub executes the full test matrix; until #2040 integrates, its visible diff includes both slices.

## 3. Implementation handoff audit

### 3.1 Latest completed implementation: PR #2040

Handoff:

- https://github.com/dunay2/dvt/pull/2040#issuecomment-5072979847

Status:

```text
IMPLEMENTER-HANDOFF-MISSING
REVIEWER-RECONSTRUCTED-HANDOFF-AVAILABLE
```

The report is sufficiently complete for retrospective audit, but it was not produced by the implementation agent. It correctly distinguishes final evidence from development chronology and marks red-first chronology as `NOT PROVEN`.

The retrospective handoff identifies:

- exact base and final head SHA;
- branch, PR, task, and design;
- iteration goal;
- changed behavior and implementation structure;
- domain owners;
- commands, queries, ports, adapters, contracts, migrations, and paths;
- user-visible behavior;
- tests and exact-head CI;
- protected browser proof;
- security, integrity, observability, compatibility, and rollback posture;
- residual risks;
- next iteration.

Disposition:

- auditable final state: yes;
- evidence authored by implementer: no;
- red-first chronology proven: no;
- fabricated chronology: none.

### 3.2 Current implementation: PR #2055

PR #2055 is an incomplete iteration and therefore has no final handoff yet.

Its PR body is acceptable as a red-phase statement because it names:

- the task `E-WEB-DBT-ATOMIC-PUBLICATION-1`;
- the exact failing transaction;
- the dependency on #2040;
- the forbidden shortcuts;
- the intended server-owned batch route;
- the fact that the branch must not merge while red.

At green closeout, the implementation agent must publish its own complete `## Iteration Handoff`. Another reviewer-reconstructed report is not an acceptable normal process.

## 4. Material delta since the previous cycle

```text
NO MATERIAL DELTA
```

Validated facts:

- `main` SHA is unchanged;
- PR #2040 head is unchanged;
- PR #2055 head is unchanged;
- no green implementation commit exists;
- #2040 CI remains green;
- #2055 Test Suite remains red on the intended test;
- the #2055 P1 remains open and current;
- no new release or candidate exists;
- no legitimate Planning DB sequencing change is visible.

This review does not fabricate another defect merely because the repository has stalled.

## 5. Claim-to-evidence matrix

| Claim | Status | Evidence | Disposition |
| --- | --- | --- | --- |
| `main` is still release `0.5.3` | VERIFIED | exact main SHA and root package version | no release delta |
| #2040 prevents graph Preview from silently overwriting divergent SQL | VERIFIED | policy, publisher, Canvas integration, Code read-only posture, protected Cypress | SQL authority containment is credible |
| #2040 performs complete preflight before the first write | VERIFIED | `publishGraphDbtWorkspaceArtifacts` reads/classifies all artifacts first | containment only |
| #2040 is multi-file atomic | CONTRADICTED | production code loops over `saveFileContent` | active P1 |
| #2040 has six green standard workflows | VERIFIED | exact-head workflow runs | ready for normal integration subject to repository policy |
| #2040 handoff was produced by the implementation agent | CONTRADICTED | report was reconstructed by the reviewer | process exception |
| #2040 tests were written before implementation | NOT PROVEN | no recoverable chronology | do not claim |
| sequential publication can leave a mixed old/new project | VERIFIED | #2055 failing governed Web test and production loop | active data-integrity defect |
| #2055 failure is an unrelated regression | DISPROVED | failure occurs in the intentionally added atomicity invariant | valid red phase |
| the browser should compensate earlier writes | CONTRADICTED | compensation races with concurrent mutations and duplicates transaction ownership | forbidden route |
| Web should call a generic batch endpoint | CONTRADICTED | batch mutation is an internal storage gateway, not a UI product rail | dedicated product command required |
| the repository already has an atomic storage primitive | VERIFIED | `IWorkspaceFileBatchMutationPort`, gateway, Source Import and YAML edit consumers | reuse required |
| publication is already bound to exact project analysis identity | NOT PROVEN | no publication receipt joins complete content-set and analysis hashes | next transaction scope |
| a later `ProjectDbtGraphFromFiles` read proves the publication state | CONTRADICTED | concurrent project changes can occur between mutation and analysis | exact snapshot/preconditions required |
| legacy artifact migration is required | DISPROVED | DVT is pre-product and no preservation contract or deployed dataset exists | out of scope |
| `ListRuns` pagination is complete | CONTRADICTED | tenant-limited storage page is filtered by project/environment afterward; input has no cursor | later P2 |
| workspace inventory is complete | CONTRADICTED | adapter silently stops at 500 files | later P1 |
| oversized workspace files have a truthful typed outcome | CONTRADICTED | they map to `InvalidWorkspacePathError` | later P1 |
| generic Web JSON responses are runtime-validated | CONTRADICTED | `parsedBody as TResponse` remains | later P2 |
| Code authoring has durable crash recovery | NOT PROVEN | navigation flush and unload warning exist, but no journal | later P2 |

## 6. Previous finding disposition

### Fixed

- PR #2030 edit/revert reconciliation receipt race.
- PR #2035 list/detail non-terminal materialization disagreement.
- Release `0.5.3` packaging of run operational truth.
- PR #2040 containment of graph SQL versus divergent Project Code SQL.
- Graph-owned Project Code read-only posture.
- False legacy-upgrade requirement for pre-marker artifacts.
- Overclaim that an unkeyed SHA-256 marker authenticates its creator; it is described as payload-integrity evidence.

### Still active

- P1: graph-derived DBT artifacts are written sequentially.
- P1: no exact server-owned publication receipt joins file set and analysis identity.
- P1: workspace inventory silently truncates.
- P2: `ListRuns` scope/cursor semantics.
- P2: generic API response casting without runtime schema validation.
- P2: no durable Code buffer recovery journal.
- P2: root coverage ratchet explicitly covers Engine only.
- Stale truth: `system-delivery-status.md` calls itself current while last reviewed on 2026-04-26.
- Stale truth: frontend rail inventory still describes Code save as missing even though working-tree synchronization is implemented.

### Superseded

- Recommending a Code-state split as the immediate first slice: the concrete receipt race was fixed by #2030.
- Recommending atomic publication before SQL authority: #2040 correctly contained SQL ownership first.
- Treating repeated review documents as sequencing authority: live Planning DB, ADR-0060, and accepted plans remain authoritative.

### Disproved

- Requirement to migrate a deployed population of pre-marker DBT artifacts.
- Requirement to add artifact-version negotiation for local development fixtures.
- Requirement to sign graph-managed markers in the SQL-containment slice.
- Claim that all current repository activity is governance-only: #2055 is executable product evidence, though no green code followed it.

## 7. Current product and architecture review

### 7.1 Architecture and authority

The strongest repository decision remains ADR-0060:

- `graph-draft` and `dbt-project-files` are explicit and mutually exclusive authority modes;
- graph-draft may generate bootstrap artifacts;
- file-backed Canvas is projected from actual dbt files;
- analysis failure does not silently switch authority;
- Preview and Run must carry reproducible project provenance.

PR #2040 materially improves the current graph-draft side by preventing a read of the latest file revision from becoming permission to overwrite the file.

The remaining authority problem is temporal rather than representational:

```text
one project proposal is published
another project state may be read later
Preview/Run can be attributed to the later state
```

A publication command must create one durable identity for the exact complete project proposal, not merely a list of successful file writes.

### 7.2 Web

Positive:

- SQL ownership classification is isolated in a pure policy;
- complete preflight detects known divergence before mutation;
- Code editability is projected from explicit authority posture;
- no second manual Save lifecycle is introduced;
- protected browser proof exercises Canvas, Preview, Run, Project Code, external mutation, rejection, and byte preservation.

Active defect:

- `DbtGraphWorkspaceArtifactPublisher` still owns mutation order and partial-success accumulation in the browser.

Fowler signal:

```text
Transaction Script + leaky abstraction
```

`SaveWorkspaceFileContent` is a valid single-file command. Looping it does not turn it into a multi-file product transaction.

### 7.3 API and application layer

Positive:

- the API already owns authorization scope;
- the repository already has an internal multi-file batch port;
- Source Import uses the batch port with expected revisions and an idempotency key;
- dbt YAML description edits use a specific application command, batch mutation, project re-analysis, and a versioned receipt.

Gap:

- no product command owns complete graph-derived DBT project publication.

The new command must be specific to the accepted product operation. It must not expose storage-shaped mutation inputs as an unrestricted browser primitive.

### 7.4 Contracts

The current single-file save receipt proves only one path and one content hash.

The atomic vertical needs a versioned publication receipt containing:

- operation/request/idempotency identity;
- deduplication posture;
- complete affected paths and hashes;
- exact full project content-set identity;
- exact analysis identity;
- freshness posture;
- no SQL bodies or credentials.

It must not return a full screen-shaped graph projection. The command returns a receipt; `ProjectDbtGraphFromFiles` remains the read model query.

### 7.5 Runtime and Preview/Run behavior

Current Preview and Run rails should be retained:

- `PreviewExecutionPlan`;
- `StartRun`;
- `ObservePlanRunReadiness`;
- `GetRunStatus`;
- `GetRunEvents`.

No DBT-specific Preview or Run synonym is needed.

Admission must compare the project identity in the publication receipt with the identity used by Preview. Run must consume the persisted Preview identity or require a new Preview when the project changes.

### 7.6 Tests

The #2055 test is valuable because it executes the actual Web publisher and proves the specific partial-write failure.

It is not sufficient green evidence. The final route must add:

- application command unit tests;
- batch conflict and injected replacement failure tests;
- HTTP authorization/error tests;
- Web adapter schema-validation tests;
- Canvas integration tests;
- protected browser proof;
- identity mismatch tests for Preview and Run;
- no-SQL-body observability tests.

### 7.7 Governance

Positive:

- PR #2040 records SQL authority components, responsibilities, relations, tests, browser evidence, and the atomic-publication gap.
- Planning DB assigns the gap to `E-WEB-DBT-ATOMIC-PUBLICATION-1` rather than hiding it.

Risk:

- migrations can mark components implemented based on named evidence paths while the delivery handoff is absent.
- historical Markdown inventories can remain marked Active after their facts become stale.

Current task/design/dependency queries remain more trustworthy than old active-looking Markdown.

### 7.8 Operability and observability

Required publication signals:

- operation ID;
- tenant/project/environment/canvas identifiers in the established safe form;
- request hash;
- idempotency/deduplication posture;
- artifact count and aggregate byte count;
- path and content hashes;
- conflict count and conflicting paths;
- preflight, analysis, mutation, and total duration;
- resulting project and analysis hashes.

Forbidden:

- SQL content;
- YAML bodies;
- credentials;
- `profiles.yml` secrets;
- arbitrary exception serialization containing project content.

### 7.9 Security

The green command must:

- reuse protected runtime authentication and workspace authorization;
- normalize and validate every path server-side;
- enforce allowed extensions and byte/count limits;
- reject duplicate paths;
- reject request-hash/idempotency-key mismatch;
- keep dbt credentials server-owned;
- run analysis in the existing isolated, bounded adapter;
- avoid network package installation during analysis;
- fail closed on malformed contracts and conflict receipts.

The integrity marker in model SQL is not an authentication boundary.

### 7.10 Data integrity and recovery

Atomic batch replacement eliminates partial workspace states for the artifact set.

Exact project identity requires a stronger invariant than “analyze after writing”. A concurrent unrelated project-file mutation between snapshot and analysis can otherwise produce a receipt for a different project.

Repository-compatible approach:

1. Read and hash the complete bounded project snapshot.
2. Overlay proposed graph-derived writes in an isolated analysis snapshot.
3. Analyze that exact proposed snapshot.
4. Supply **every analyzed project file** as an expected-file precondition to `IWorkspaceFileBatchMutationPort`, not only the files being written.
5. Publish changed files atomically only if the complete project snapshot is still unchanged.
6. Return the already-computed `projectContentSetSha256` and `analysisSha256` in the publication receipt.

The existing batch type already permits expected files that are not writes. This allows the application command to fence the full analyzed project without inventing another filesystem transaction primitive.

### 7.11 Accessibility and performance

No new accessibility regression is demonstrated in the current delta.

The wider quality gaps remain:

- no explicit root accessibility gate;
- no root bundle budget;
- no governed large-graph benchmark;
- no workspace-list performance contract;
- Web/API coverage has no explicit root ratchet equivalent to Engine coverage.

These remain behind the current integrity transaction.

### 7.12 Documentation truth

`docs/architecture/system-delivery-status.md` is titled “Current Status”, marked Active, and claims to describe what is true now, but was last reviewed on 2026-04-26.

The frontend rail inventory was last reviewed on 2026-06-02 and still describes Code workspace saving as missing, despite later `CodeWorkingTreeSync` implementation.

These documents should eventually become generated projections or be downgraded from current operational truth. They do not override current code or Planning DB.

## 8. Brutal Fowler review

### 8.1 Transaction Script without transaction owner — P1

Current owner overload:

```text
DbtGraphWorkspaceArtifactPublisher
  - enumerates artifacts
  - reads files
  - classifies authority
  - captures revisions
  - orders mutations
  - accumulates partial success
```

The first four are valid Web preparation responsibilities. The last two belong to a server-owned application transaction.

### 8.2 Leaky abstraction — P1

A single-file command leaks its storage granularity into a product operation that is semantically one project publication.

Correction:

- keep `SaveWorkspaceFileContent` for actual single-file edits;
- use a specific project publication command for graph-generated multi-file output;
- delegate storage atomicity to the existing batch gateway.

### 8.3 Hidden temporal authority — P1

SQL ownership is contained, but the identity of “the project that was published” is not durable.

A later query is not a receipt. A request must not be admitted merely because the newest query happens to be fresh.

### 8.4 Test-only confidence — active

The red test proves the defect, not the solution.

A mock `Map` test alone must not be used to claim the real local gateway, HTTP boundary, browser, Preview, and Run are correct.

### 8.5 Shotgun surgery risk — active

A careless implementation could touch contracts, API routes, Web ports, Canvas, analyzer, Preview, Run, migrations, and Cypress without one cohesive owner.

Control:

- one user transaction;
- one versioned command/receipt language;
- narrow PR decomposition;
- existing rails and ports reused;
- exact acceptance tests per slice.

### 8.6 Primitive obsession — later

Active examples:

- opaque cursor as a colon-concatenated string in `ListRuns`;
- file oversize represented as invalid path;
- project identity inferred through loosely related hash strings rather than one receipt value object.

### 8.7 Stale truth — active

- old active-status Markdown;
- rail inventory lagging implemented Code synchronization;
- green Quality Gate can coexist with intentionally failing Test Suite on a red PR, so release policy must still require all mandatory checks for merge.

### 8.8 Product dead ends to avoid

- generic browser batch mutation API;
- browser compensation loop;
- a second workspace repository;
- a DBT-specific Save synonym;
- a new user-facing DSL;
- storing a shadow semantic graph beside file authority;
- a proprietary revision registry detached from Git and project hashes;
- accepting latest analysis instead of exact analysis identity.

## 9. Blocking implementation route

### Priority P1 — atomic DBT project publication with exact identity

#### Severity and evidence

Severity: P1 data integrity and reproducibility.

Evidence:

- production publisher uses sequential `saveFileContent` calls;
- #2055 governed Web test fails when the second mutation throws;
- first file remains changed;
- Test Suite fails at the changed Web Vitest suite;
- P1 thread remains unresolved.

#### Root cause

The browser owns mutation ordering for a transaction whose unit is a DBT project proposal, while the storage authority exposes the required atomic primitive only inside the API.

#### User/product impact

- mixed old/new project files;
- no accepted Preview representing the mixed state;
- ambiguous retry;
- analysis may describe a state never successfully published;
- Run cannot be reproduced from one exact project identity;
- the user may need manual repair.

#### Exact domain owners

```text
Product/application transaction:
  GraphDbtWorkspacePublication

Existing Web preparation owner:
  DbtGraphWorkspaceArtifactPublisher

Existing storage owner:
  WorkspaceFileBatchMutation

Existing semantic read owner:
  DbtProjectGraphProjection / ProjectDbtGraphFromFiles

Existing execution admission owners:
  PreviewExecutionPlan / StartRun
```

#### Command/query decision

Do not create a storage-shaped UI rail.

Preserve the canonical product intent:

```text
GenerateDbtWorkspaceArtifacts
```

Promote its persistence portion behind a protected API application command. An implementation class may be named around `GraphDbtWorkspacePublication`, but it must not create a second semantic synonym in the command/query catalogue.

Reuse query:

```text
ProjectDbtGraphFromFiles
```

Reuse Preview/Run rails unchanged.

#### Proposed request contract

```ts
type PublishGraphDbtWorkspaceArtifactsRequestV1 = Readonly<{
  schemaVersion: 'publish-graph-dbt-workspace-artifacts-request.v1';
  canvasId: string;
  idempotencyKey: string;
  proposalDigest: string;
  projectRoot: string;
  artifacts: readonly Readonly<{
    path: string;
    language: 'sql' | 'yaml';
    content: string;
    expectedRevision:
      | { kind: 'absent' }
      | { kind: 'content_sha256'; value: string };
  }>[];
}>;
```

The request is authorized and revalidated server-side. Browser-provided content is not trusted merely because the type compiled.

#### Proposed receipt contract

```ts
type GraphDbtWorkspacePublicationReceiptV1 = Readonly<{
  schemaVersion: 'graph-dbt-workspace-publication-receipt.v1';
  operationId: string;
  canvasId: string;
  projectRoot: string;
  idempotencyKey: string;
  requestHash: string;
  deduplicated: boolean;
  files: readonly Readonly<{
    path: string;
    contentSha256: string;
  }>[];
  projectContentSetSha256: string;
  analysisSha256: string;
  freshness: 'fresh';
}>;
```

No SQL or YAML bodies in the receipt.

#### Port changes

Web:

```ts
interface IGraphDbtWorkspacePublicationCommandPort {
  publish(input: PublishGraphDbtWorkspaceArtifactsRequestV1):
    Promise<GraphDbtWorkspacePublicationReceiptV1>;
}
```

API application dependencies:

- `IWorkspaceFileRepository` read capability;
- `IWorkspaceFileBatchMutationPort`;
- `IDbtProjectAnalyzerPort` or existing `ProjectDbtGraphFromFiles` composition;
- optional dedicated receipt store only if the batch receipt cannot satisfy durable replay requirements.

Infrastructure:

- reuse `LocalWorkspaceFileBatchMutationGateway`;
- do not add another filesystem repository;
- extend the generic gateway only if a proven postcondition cannot be expressed by existing `expectedFiles`, `writes`, `deletes`, and receipt fields.

#### Application algorithm

```text
1. authorize workspace/canvas/project scope
2. parse and validate request contract
3. reject duplicate/unsupported/out-of-root paths and bounded limits
4. read complete bounded project snapshot and content hashes
5. verify proposal revisions and graph-managed SQL policy
6. overlay proposed writes in isolated analysis snapshot
7. run DBT analysis on that exact snapshot
8. build expectedFiles from every file in the analyzed snapshot baseline
9. call batchMutation.apply once with changed writes
10. if conflict: return typed conflict, zero writes
11. verify batch receipt paths/hashes equal proposal output
12. persist/return publication receipt with precomputed project and analysis identity
13. Preview accepts only that receipt identity
14. Run consumes persisted Preview identity or requires a new Preview
```

#### Likely files/components

Contracts:

- `packages/@dvt/contracts/src/contracts/planner/**GraphDbtWorkspacePublication**`
- contract tests and exports.

API application:

- new command service under DBT project publication ownership;
- tests for request integrity, full-snapshot preconditions, batch receipt, idempotency, and analysis identity.

API entrypoint:

- protected adapter route under existing authentication, scope authorization, error envelope, and rate limit composition;
- route name is an adapter detail and must not create another catalogue rail.

Web:

- capability-specific command port;
- API adapter with runtime schema parsing;
- `DbtGraphWorkspaceArtifactPublisher` replaces mutation loop with one command call;
- `canvasPlanAction` consumes publication receipt.

Planning DB:

- claim/reopen `E-WEB-DBT-ATOMIC-PUBLICATION-1` before runtime changes;
- approved design covering component, rail, contract, relations, tests, risks, and evidence;
- close gap only after final live proof and exact-head CI.

#### Migration and compatibility posture

DVT is pre-product.

- no migration for local branch artifacts;
- no version negotiation for unshipped request shapes;
- contract versioning begins with the accepted publication language;
- rollback of the software change is a Git revert;
- no data rollback is needed for a batch operation that fails before atomic replacement.

#### Rollback posture

Runtime failure before batch commit:

```text
zero files changed
```

Failure after batch commit but before receipt persistence must be recoverable by the idempotency key and batch receipt. The command must reconstruct or return the same result, not publish again under a new identity.

No browser compensation.

#### Observability

Emit:

- operation ID;
- request hash;
- idempotency/deduplication posture;
- artifact and project-file counts;
- aggregate bytes;
- paths and hashes;
- conflict paths/count;
- timing by preflight/analysis/batch/receipt;
- project and analysis hashes.

Never emit project bodies or credentials.

#### Security implications

- protected authentication and authorization on every command;
- server-side scope/path validation;
- bounded file count, individual bytes, and aggregate bytes;
- deny `profiles.yml` secret material in portable publication;
- isolated DBT analysis;
- no network package installation;
- no SQL in logs or error envelopes;
- idempotency key reuse with a different request fails closed;
- runtime response parsed with shared contract schema.

#### PR decomposition

**PR A — atomic command and storage receipt**

- request/receipt contract;
- application command;
- batch gateway reuse;
- protected API adapter;
- Web capability port;
- replace sequential loop;
- make current red atomicity test green.

Acceptance: all affected files change or none; idempotency proven.

**PR B — exact project snapshot and analysis identity**

- isolated proposed snapshot;
- full project expected-file fence;
- analysis hashes in receipt;
- Preview admission checks exact identity.

Acceptance: unrelated project mutation invalidates publication; latest-read substitution is impossible.

**PR C — Run and reopen convergence**

- Run consumes persisted Preview project identity;
- stale project requires new Preview;
- reopen displays exact/fresh, stale, or conflict posture;
- protected browser proof.

Acceptance: published, previewed, run, and reopened project identities agree.

These may be combined only if each remains independently reviewable and the final PR still represents one user transaction.

#### Red tests

1. Existing #2055: failure on the second artifact leaves both originals unchanged.
2. Conflict on any expected file returns all conflicts and zero writes.
3. Analyzer failure occurs before mutation.
4. Duplicate paths are rejected before analysis/mutation.
5. Same idempotency key with another request fails.
6. Unrelated project-file change between snapshot and publish causes conflict.
7. Batch receipt missing or mismatching a path/hash fails closed.
8. Preview with another content-set hash is rejected.
9. Run after project mutation requires a new Preview.
10. Logs and errors contain no SQL bodies.

#### Green proof

- contracts test;
- API command unit/integration tests;
- real `LocalWorkspaceFileBatchMutationGateway` injected-failure tests;
- protected route tests;
- Web adapter parse/error tests;
- Canvas integration test;
- protected Cypress flow;
- six standard workflows green on exact final head;
- Planning DB integrity and feature mechanization green.

#### Live browser proof

```text
create graph-draft DBT project
  -> author SQL
  -> request Preview
  -> one protected publication command
  -> verify all generated files and hashes
  -> Preview receipt shows same project/analysis identity
  -> Start Run
  -> run provenance shows same identity
  -> mutate one file externally
  -> reopen/Preview shows stale/conflict
  -> no silent overwrite and no Run on stale identity
```

#### Acceptance criteria

- no per-file browser mutation loop for graph project publication;
- no partial publication under conflict or injected failure;
- one command and one immutable receipt;
- complete analyzed project is fenced by expected revisions;
- receipt project and analysis hashes are deterministic;
- Preview and Run identities match;
- no duplicate semantic rail;
- no browser compensation;
- no SQL body leakage;
- exact final handoff exists.

#### Release gates

- mandatory workflows green;
- unresolved blocking threads: zero;
- red atomicity test green on production path;
- protected live evidence current;
- Planning DB design/task/gap/evidence reconciled;
- architecture guards pass;
- contract index and determinism pass;
- security review confirms no secrets/bodies in bundle/logs;
- release notes describe user outcome, not internal file count;
- no release while #2055 Test Suite is red.

## 10. Subsequent priorities

### Priority 2 — workspace capability truth

Required vertical:

- paginated or explicitly bounded inventory;
- `complete | partial` posture;
- cursor/continuation token;
- effective limits in the response;
- `oversized`, `not_found`, `unsupported`, and invalid path as distinct outcomes;
- consistent import/analyzer/Explorer/Code support.

### Priority 3 — cohesive authoring recovery

Required vertical:

- durable local journal keyed by scope/path/revision;
- restore after browser/system crash;
- explicit recovered/stale/conflict posture;
- no silent replacement of newer server content;
- journal lifecycle tied to accepted save receipt.

### Priority 4 — `ListRuns` scoped keyset pagination

Required correction:

- apply tenant/project/environment/cursor before limit in storage;
- stable `(createdAt, runId)` order;
- opaque validated cursor;
- hydrate `createdAt` in Postgres;
- parity vectors for in-memory and Postgres stores;
- second page reachable from API/Web.

This remains behind the current DBT integrity transaction unless it blocks the release branch.

### Priority 5 — product-wide quality gates

- Web/API coverage ratchets;
- accessibility automation;
- bundle budget;
- graph-scale performance;
- API payload/latency budgets;
- injected failure lanes;
- generated current-state documentation.

### Priority 6 — later differentiation

- asset-oriented lineage and checks;
- freshness and partitions;
- promotion and rollback of project revisions;
- collaboration and review workflows;
- richer operational scheduling.

## 11. Mature-system comparison

### dbt Cloud / Studio — match

DVT should match:

- normal dbt project files;
- integrated edit/build/test/run workflow;
- Git/version-control awareness;
- explicit diagnostics;
- reproducible execution inputs.

DVT should differ:

- Canvas is the primary graph surface;
- visual edits are conservative and lossless;
- authority is explicit rather than inferred from whichever view was used last.

Reference:

- https://docs.getdbt.com/docs/cloud/dbt-cloud-ide/develop-in-the-cloud

### Airflow — match project-version reproducibility

Airflow DAG Bundles version all files needed by a DAG and allow a run to use the same bundle version throughout execution. DVT should match that exact-input property through `projectContentSetSha256` and immutable Preview/Run provenance.

DVT should not copy Airflow’s scheduler-centric product model into the editor.

Reference:

- https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/dag-bundles.html

### Prefect — match version history later

Prefect provides deployment version history, rollback/promotion, and execution of specific code versions. DVT should defer promotion/rollback UX until exact publication identity is complete.

Reference:

- https://docs.prefect.io/v3/how-to-guides/deployments/versioning

### Dagster — defer asset differentiation

Dagster’s declarative assets, lineage, observability, and testability are a useful target after DVT’s authority, atomicity, and reproducibility foundations are correct.

Reference:

- https://docs.dagster.io/getting-started

### Temporal — adopt principles, not another editor engine

DVT should reuse durable identity, idempotency, retry, and recovery principles. It should not introduce a second workflow engine inside the authoring surface.

Reference:

- https://docs.temporal.io/

### NiFi — visual lesson, Git direction

NiFi demonstrates the value of visual flow ownership and explicit versioning. NiFi Registry was deprecated in February 2026 in favor of Git-based Flow Registry Clients, reinforcing that DVT should not build a proprietary parallel registry.

References:

- https://nifi.apache.org/projects/registry/
- https://nifi.apache.org/components/

### Professional IDE/Git workflow — match state separation

DVT should distinguish:

- editor buffer;
- persisted working-tree file;
- project publication receipt;
- analysis identity;
- Preview identity;
- Run identity;
- Git status/commit/push.

A label such as “synchronized” must never imply committed or reproducible execution unless the relevant receipt proves it.

## 12. Required handoff for the next implementation iteration

The green implementer must post one top-level comment headed:

```markdown
## Iteration Handoff
```

It must include:

1. Exact base SHA and final head SHA.
2. Branch, PR, task, approved design, and command/query rail.
3. Iteration goal and user transaction.
4. What changed.
5. How it was implemented.
6. Why this design reused repository semantics.
7. Exact DDD/application/infrastructure owners.
8. Contracts and value objects.
9. Commands, queries, ports, adapters, routes, and stores.
10. Complete touched file and migration inventory.
11. User-visible behavior and failure behavior.
12. Red tests observed before implementation.
13. Green tests and exact commands.
14. Exact-head CI links.
15. Live browser/integration evidence.
16. Security, data integrity, observability, compatibility, and rollback posture.
17. Residual risks.
18. Deviations and their disposition.
19. Next bounded iteration.
20. Claims clearly separated from executed evidence.

A PR summary without these fields is not a valid handoff.

## 13. Final decision

There is no new implementation delta to reward in this cycle.

The repository is not directionless: PR #2055 has converted the atomic-publication concern into a reproducible failing test and an unresolved P1. The problem is now implementation inactivity, not uncertainty.

Required action:

```text
integrate/close #2040 normally
  -> implement the server-owned atomic publication command on #2055
  -> make the exact red test green
  -> bind exact project and analysis identity
  -> prove Preview/Run/reopen convergence
  -> publish implementer-authored handoff
```

Do not open another lateral line before this transaction is complete.
