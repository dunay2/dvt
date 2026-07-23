---
title: DVT no-delta SQL authority delivery-handoff Fowler review
status: Review
reviewed_repository: dunay2/dvt
reviewed_main_sha: 8c098d6e35ce874efae81609814d99e8e60091f7
reviewed_at: 2026-07-23T16:37:44+02:00
review_type: architecture-and-governance-delta
scope: documentation-only
---

# DVT No-Delta SQL Authority Delivery-Handoff Fowler Review

## 1. Executive decision

There is no material repository or product implementation delta since the previous review.

The exact reviewed `main` remains:

```text
8c098d6e35ce874efae81609814d99e8e60091f7
```

The active functional pull request remains:

```text
PR #2040
head 6257745ed1ec91f1a1415585d24e319905966931
```

PR #2040 remains source-backed, CI-green, mergeable, and functionally credible for the bounded SQL-authority containment transaction. The only demonstrated closeout blocker is still the absence of a consolidated implementation-agent handoff.

```text
DELIVERY-HANDOFF-MISSING
```

No new runtime correction is justified in this cycle. Do not manufacture another finding merely because the repository did not move.

The next product slice after #2040 is unchanged:

```text
atomic multi-file DBT artifact publication
+ exact project revision identity
+ exact Preview/Run/reopen provenance
```

It must reuse the existing workspace batch mutation authority.

---

## 2. Evidence boundary

This review inspected:

- exact current `main` and recent commit history;
- every visible open pull request;
- exact-head workflow results for functional PR #2040;
- review-thread state for #2040;
- the #2040 changed-file inventory and current source diff;
- current `main` Canvas publication orchestration;
- current `main` DBT project reconciliation callback;
- existing workspace batch mutation contracts and adapter;
- ADR-0060;
- the accepted dbt project round-trip product plan;
- release state;
- previously validated active product gaps where no source delta occurred;
- current official comparison sources for dbt, Airflow, Prefect, NiFi, and professional IDE/Git workflows.

No local checkout, browser, Planning DB process, database, or workflow command was executed by this reviewer. Existing repository evidence and GitHub workflow results are treated as evidence, not as reviewer-executed proof.

---

## 3. Exact repository snapshot

### 3.1 Main

| Field | Value |
| --- | --- |
| Branch | `main` |
| Exact SHA | `8c098d6e35ce874efae81609814d99e8e60091f7` |
| Commit | `chore(main): Release 0.5.3 (#2037)` |
| New commit since previous cycle | No |
| Connector-visible PR workflow runs on squash SHA | None |

Source:

- <https://github.com/dunay2/dvt/commit/8c098d6e35ce874efae81609814d99e8e60091f7>

### 3.2 Open pull requests before this review

| PR | Type | Head | State | Decision |
| --- | --- | --- | --- | --- |
| [#2040](https://github.com/dunay2/dvt/pull/2040) | Functional Web/dbt authority | `6257745ed1ec91f1a1415585d24e319905966931` | Open, mergeable, ready | Functionally credible; handoff missing |
| [#2047](https://github.com/dunay2/dvt/pull/2047) | Prior point-in-time review | `91829db150e3ac086ddd8cdd1211e96fc393c9d2` | Draft | Superseded by this cycle |

No other open functional PR is visible.

### 3.3 Release state

The current released repository line is `0.5.3`.

There is no open release PR in the visible queue. No release action is required by this review.

### 3.4 Relevant branch work

The only visible active product branch represented by an open PR is:

```text
fix/dbt-model-sql-authority-containment
```

No open branch or PR is currently implementing atomic DBT publication, exact project revision identity, workspace inventory truth, durable authoring recovery, or product-wide non-functional gates.

---

## 4. Material delta

### 4.1 Repository delta

```text
NONE
```

- `main` did not move.
- PR #2040 did not move.
- No new functional PR appeared.
- The six standard workflow results on #2040 remain successful.
- No new review thread appeared.
- No valid final implementation handoff appeared.

### 4.2 Product delta

```text
NONE
```

No new Web, API, runtime, contract, adapter, migration, test, operability, accessibility, performance, security, integrity, recovery, or product-documentation implementation has been added since the previous cycle.

### 4.3 Review delta

The current conclusions remain stable:

1. #2040 correctly addresses SQL-authority containment.
2. The pre-marker compatibility request remains disproved and out of scope.
3. Byte-identical unmarked projection marking is not a deployed-data migration promise and is not a source-backed runtime blocker.
4. #2040 still publishes final artifacts sequentially and therefore does not close atomic publication.
5. The implementation handoff is still missing.

---

## 5. Implementation-agent handoff status

## DELIVERY-HANDOFF-MISSING

No single report titled or clearly structured as `## Iteration Handoff` is present for PR #2040.

The PR body provides:

- root cause;
- high-level changes;
- four validation commands;
- a statement that no quality path was bypassed.

That is useful but incomplete.

### 5.1 Missing required fields

The implementation agent must still provide, in one auditable handoff:

1. exact base SHA;
2. exact final head SHA;
3. branch and PR links;
4. Planning DB task and design identities;
5. bounded iteration goal;
6. what changed;
7. how it was implemented;
8. why that design was chosen;
9. exact DDD/domain owner;
10. complete commands/queries inventory;
11. complete ports inventory;
12. complete adapters inventory;
13. complete contracts inventory;
14. complete migrations and files touched;
15. user-visible behavior;
16. tests observed first in red;
17. tests observed green after implementation;
18. exact CI links for final head;
19. exact live browser/integration proof link or repository path;
20. security posture;
21. data-integrity posture;
22. observability posture;
23. compatibility decision;
24. rollback posture;
25. unresolved risks;
26. deviations from the approved route;
27. recommended next iteration.

### 5.2 Why this is still blocking

The runtime can be technically credible while delivery remains unauditable.

Without a consolidated handoff:

- future agents reconstruct intent from diffs and scattered comments;
- red/green chronology is not distinguishable from after-the-fact coverage;
- architectural ownership is inferred rather than declared;
- residual risk and rollback remain tribal knowledge;
- the next iteration can drift laterally;
- the review loop cannot compare claims to evidence efficiently.

The handoff is not bureaucracy for its own sake. It is the transaction receipt for an agent implementation iteration.

---

## 6. Claim-to-evidence matrix for PR #2040

| Claim | Status | Evidence | Reviewer conclusion |
| --- | --- | --- | --- |
| Exact base/head/branch/PR identity | VERIFIED | PR metadata | Stable and reproducible |
| Root cause is unconditional graph-derived overwrite after reading latest revision | VERIFIED | PR description and diff | Correct problem statement |
| Graph-managed SQL receives a deterministic marker | VERIFIED | `dbtGraphModelSqlPublicationPolicy.ts` | Marker is integrity metadata, not authentication |
| Marker payload mismatch fails closed | VERIFIED | policy source and tests | Correct containment behavior |
| All target artifacts are read before first write | VERIFIED | publisher source | Meaningful preflight improvement |
| CAS revisions are observed before publication | VERIFIED | publisher source | Correctly reduces time-of-check drift |
| Divergent external SQL is preserved | VERIFIED | unit and live Cypress path | Core user transaction is covered |
| Graph-owned Project Code is read-only | VERIFIED | CodeView/CodeWorkspaceFileSurface changes | Avoids duplicate editable authority |
| File-authoritative DBT projects remain editable | VERIFIED | file-scope posture tests | Correct mode separation |
| No new persistence rail was invented | VERIFIED | source inventory and Planning DB intent | Existing rails reused |
| Six standard workflows are green | VERIFIED | exact-head workflow runs | Required but not sufficient evidence |
| Legacy deployed-data migration is required | DISPROVED | product-owner decision and no preservation contract | Out of scope in pre-product |
| Byte-identical unmarked projection marking is a migration promise | DISPROVED | active graph-draft authority and generated path | Naming debt only |
| Final multi-file publication is atomic | CONTRADICTED | final writes remain individual | Next slice remains necessary |
| Save receipt is bound to exact whole-project analysis | NOT PROVEN | current main ignores receipt in reconciliation callback | Existing gap remains |
| Preview and Run consume one immutable project revision | NOT PROVEN | no publication-revision receipt chain | Existing gap remains |
| Tests were observed first in red | NOT PROVEN | no handoff chronology | Must be stated truthfully |
| Rollback is documented | NOT PROVEN | no handoff | Revert posture must be explicit |
| Security, integrity, observability are consolidated | PARTIAL | code and migrations contain evidence, no final handoff | Needs one coherent statement |
| Complete iteration handoff exists | NOT PROVEN | none visible | Delivery blocker |

---

## 7. PR #2040 source review

### 7.1 Correctly owned transaction

The bounded user transaction is:

```text
graph-draft owns SQL
-> Preview projects DBT files
-> Project Code exposes graph-owned SQL read-only
-> external process changes SQL
-> Preview detects divergence before write
-> external bytes remain unchanged
```

This is the correct first slice because it eliminates a concrete duplicate-authority failure without claiming to solve atomic publication or revision-pinned execution.

### 7.2 Correct authority separation

ADR-0060 defines mutually exclusive authoring modes:

```text
graph-draft
dbt-project-files
```

In graph-draft mode, the graph aggregate remains authoritative and DBT files are projections. In dbt-project-files mode, the files are authoritative and Canvas renders a projection.

PR #2040 aligns Project Code editing posture with that decision:

- graph-owned SQL: read-only;
- file-authoritative SQL: editable;
- unknown divergence: fail closed.

### 7.3 Pre-product compatibility disposition

The previous review request to preserve pre-marker deployed workspaces is not valid for the supported product state.

DVT is pre-product. There is no source-backed contract requiring preservation of:

- old local developer workspaces;
- branch-only artifact shapes;
- prior markerless projections;
- development fixtures;
- unpublished formats.

Therefore:

- no migration framework is required;
- no historical projection matching is required;
- no format negotiation is required;
- no marker version matrix is required;
- no compatibility release gate is required.

Unknown divergent files must still fail closed.

### 7.4 Terminology debt

`adopt_legacy_equivalent` remains misleading terminology because there is no supported legacy population.

A clearer name would be:

```text
mark_equivalent_unmarked_projection
```

This is optional naming debt, not a functional blocker. It must not expand #2040 unless the implementation agent chooses a trivial rename without changing behavior or scope.

### 7.5 Marker security semantics

The marker provides deterministic integrity checking for the payload.

It does not prove:

- creator identity;
- ownership;
- authorization;
- provenance against a hostile same-principal writer;
- signature authenticity.

No signing key, secret, MAC, or cryptographic identity system should be introduced in #2040.

The real authority comes from:

- active Canvas authority binding;
- governed graph-owned path;
- conditional write policy;
- CAS revision;
- fail-closed divergence handling.

---

## 8. CI and review state

### 8.1 Functional head

Exact PR #2040 head:

```text
6257745ed1ec91f1a1415585d24e319905966931
```

Six standard workflows are successful:

| Workflow | Result |
| --- | --- |
| Contracts & Determinism | success |
| Dependency Review | success |
| Test Suite | success |
| CI - Code Quality | success |
| CodeQL | success |
| PR Quality Gate | success |

Workflow run references:

- <https://github.com/dunay2/dvt/actions/runs/29904512631>
- <https://github.com/dunay2/dvt/actions/runs/29904512456>
- <https://github.com/dunay2/dvt/actions/runs/29904512339>
- <https://github.com/dunay2/dvt/actions/runs/29904512227>
- <https://github.com/dunay2/dvt/actions/runs/29904512379>
- <https://github.com/dunay2/dvt/actions/runs/29904512388>

### 8.2 Main SHA evidence

The connector exposes no pull-request-triggered workflow runs directly associated with the release squash SHA on `main`.

This is an evidence-identity limitation, not proof that release CI failed.

### 8.3 Review threads

PR #2040 has one inline review thread:

- resolved;
- not outdated;
- compatibility premise explicitly disproved for pre-product;
- no unresolved inline threads remain.

No code change is required merely to satisfy the disproved compatibility premise.

---

## 9. Rechecked findings

### 9.1 Fixed

#### F-1: Code edit/revert reconciliation receipt race

Status: FIXED by #2030.

Do not reopen.

#### F-2: List/detail run materialization disagreement

Status: FIXED by #2035.

Do not restate the old contradiction.

#### F-3: SQL marker described as creator authentication

Status: FIXED in the current #2040 branch documentation.

The current statement is payload integrity, not authentication.

#### F-4: Pre-marker deployed-artifact migration requirement

Status: DISPROVED.

No supported deployed data contract exists.

### 9.2 Active

#### A-1: Atomic DBT project publication

Severity: P1 integrity.

Current `main` still performs graph-first artifact writes one by one:

```ts
for (const artifact of artifactProjection.artifacts) {
  await workspaceFileContentCommand.saveFileContent(...);
}
```

Source:

- <https://github.com/dunay2/dvt/blob/8c098d6e35ce874efae81609814d99e8e60091f7/apps/web/src/app/views/canvas/canvasPlanAction.ts>

Impact:

- a late conflict or failure can leave a subset published;
- Preview can observe a mixed project;
- retry semantics depend on which writes completed;
- rollback becomes browser-owned and unreliable.

Canonical owner:

```text
E-WEB-DBT-ATOMIC-PUBLICATION-1
Project Workspace I/O / Canvas dbt publication
```

#### A-2: Exact whole-project revision identity

Severity: P1 authority/reproducibility.

The current reconciliation callback receives a `WorkspaceFileSaveReceipt` but ignores it:

```ts
async (_receipt: WorkspaceFileSaveReceipt) => {
  return projectDbtCodeReconciliationOutcome(await refreshProjectGraphSource());
}
```

Source:

- <https://github.com/dunay2/dvt/blob/8c098d6e35ce874efae81609814d99e8e60091f7/apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts>

Impact:

- the returned analysis can describe a later project source set;
- the save receipt and project analysis do not prove one transaction;
- Preview and Run cannot reject a mismatched project revision reliably.

#### A-3: Scoped ListRuns pagination truth

Severity: P2 operational completeness.

Previously revalidated behavior remains active:

- store page is limited before full project/environment filtering;
- the result can claim end-of-list while authorized runs remain;
- response cursor support is incomplete;
- PostgreSQL ordering/metadata hydration does not provide a reliable keyset contract.

This is not the current primary product slice and must not displace atomic DBT publication unless Planning DB changes its dependencies explicitly.

#### A-4: Workspace inventory capability truth

Severity: P1 product completeness.

Previously revalidated behavior remains active:

- interactive inventory can truncate at 500 entries;
- no explicit `complete | partial` state;
- no cursor;
- oversized files are represented through path-invalid semantics;
- import and interactive capabilities are inconsistent.

#### A-5: Runtime response validation

Severity: P2 boundary integrity.

The generic Web client still trusts parsed JSON with a TypeScript cast rather than runtime schema validation.

New revision/publication/inventory endpoints must use shared schemas at the HTTP boundary.

#### A-6: Durable authoring recovery

Severity: P2 recovery.

Navigation flush and `beforeunload` warnings do not recover buffers after browser or system failure.

A durable journal belongs after revisioned atomic publication and inventory truth.

#### A-7: Product-wide non-functional gates

Severity: P2 maturity.

No material new evidence was added for:

- explicit Web/API coverage ratchets at the root gate;
- automated accessibility gate;
- bundle budget;
- large-graph latency and memory budget;
- failure-injection release gate;
- exact-main evidence projection.

### 9.3 Superseded

- “Split Code persistence and reconciliation before all other work” is superseded as an immediate priority because #2030 fixed the concrete race.
- “Implement pre-marker migration before merging #2040” is disproved and superseded.
- “Remove byte-identical marking as a P1” is superseded; it is not a demonstrated correctness blocker in active graph-draft mode.

---

## 10. Fowler review

### 10.1 Duplicate authority

PR #2040 reduces duplicate edit authority by making graph-owned SQL read-only in Project Code.

Remaining duplicate-authority risk lies in revision identity, not current editor posture:

- individual file receipts;
- latest project graph query;
- Preview plan provenance;
- Run provenance.

These are not yet bound into one immutable publication revision.

### 10.2 Shotgun surgery

#2040 touches 24 files and three Planning DB migrations for one user transaction. The size is large but explainable because the slice crosses:

- policy;
- publisher;
- Canvas orchestration;
- Project Code posture;
- localized copy;
- architecture guards;
- unit/presentation/live tests;
- Planning DB ownership/evidence.

The next slice must resist further UI and governance expansion. It should be centered on one application transaction and reuse the existing batch port.

### 10.3 Leaky abstraction

Current `canvasPlanAction.ts` knows how to:

- generate artifacts;
- read file revisions;
- write each file;
- call Preview;
- return written paths.

This leaks workspace transaction orchestration into a Web presentation/application coordinator.

The next slice should move publication ownership behind one typed command/port result, not extend the loop.

### 10.4 Responsibility overload

`executeCanvasPlanAction` owns permission checks, graph projection, artifact persistence, selection, provenance, Preview invocation, and error formatting.

Atomic publication provides a natural extraction boundary:

```text
PublishDbtWorkspaceArtifacts
```

This should be a transaction, not a generic framework.

### 10.5 Primitive obsession

Current provenance is distributed across strings and hashes without one aggregate identity.

Introduce a typed value object such as:

```ts
type DbtProjectPublicationRevision = Readonly<{
  publicationId: string;
  idempotencyKey: string;
  projectContentSetSha256: string;
  analysisSha256: string;
  files: readonly Readonly<{
    path: string;
    contentSha256: string;
  }>[];
}>;
```

Do not expose raw concatenated cursor or revision strings as the domain model.

### 10.6 Stale truth

No new stale Planning DB claim was discovered in this cycle.

The remaining delivery stale truth is procedural: implementation is technically complete enough to assess, but no consolidated iteration receipt exists.

### 10.7 Test-only confidence

Six green workflows and a protected Cypress path are strong evidence.

They do not prove:

- red-first chronology;
- complete security posture;
- rollback reasoning;
- exact project-revision semantics;
- atomic multi-file behavior.

The next slice requires failure injection and exact revision mismatch tests.

### 10.8 Architectural drift

No new drift is visible in #2040. It reuses accepted authority modes and existing rails.

The active drift remains that the browser coordinator still executes the file transaction sequentially despite an existing server-side atomic batch authority.

### 10.9 Product dead ends

Avoid:

- a browser rollback loop;
- a second DBT file repository;
- a DBT-specific duplicate filesystem store;
- another DSL;
- a hidden graph/file merge mode;
- signing markers in this slice;
- generic workflow orchestration inside the editor;
- a proprietary version registry parallel to Git.

---

## 11. Mature-system comparison

| System | Relevant mature behavior | DVT decision |
| --- | --- | --- |
| dbt Studio | One integrated surface for building, testing, running, and version-controlling ordinary dbt projects | MATCH normal dbt files and explicit editor/run state; DIFFERENTIATE with graph-first governed authoring; DEFER collaboration depth |
| Professional IDE/Git | Buffer, saved file, staged changes, commit, branch, remote sync, and conflicts are distinct states | MATCH explicit state and conflicts; do not call a working-tree write “Git sync” |
| Airflow DAG Bundles | Version the complete set of files required by a run and bind a run to one bundle version | MATCH exact project revision for Preview/Run/rerun |
| Prefect deployments | Version history, promotion, rollback, and execution of a selected code version | MATCH publication history and rollback later; first close immutable project revision |
| Dagster | Assets, lineage, checks, freshness, partitions, and observability | DEFER until authoring and execution identity are correct |
| Temporal | Durable identities, retries, idempotency, recovery | MATCH receipts and idempotency; do not embed a workflow engine in the editor |
| NiFi | Visual flow authoring and versioned flow integrations; current direction favors Git-based registry clients | MATCH visual feedback; use Git and ordinary files, not another proprietary registry |

Official references:

- dbt Developer Hub: <https://docs.getdbt.com/>
- Airflow DAG Bundles: <https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/dag-bundles.html>
- Prefect deployment versioning: <https://docs.prefect.io/v3/how-to-guides/deployments/versioning>
- VS Code source control: <https://code.visualstudio.com/docs/sourcecontrol/overview/>
- NiFi Registry deprecation and Git registry clients: <https://nifi.apache.org/projects/registry/>

---

## 12. Required closeout instruction for PR #2040

### 12.1 Blocking correction

There is no demonstrated runtime correction required.

The blocking action is delivery closeout:

```text
publish one complete ## Iteration Handoff
```

### 12.2 Required content

The agent must post the following structure on PR #2040:

```markdown
## Iteration Handoff

### Identity
- Base SHA:
- Final head SHA:
- Branch:
- PR:
- Planning DB task/design:

### Goal
- User transaction:
- Explicit non-goals:

### What changed
- Runtime:
- Contracts:
- Ports:
- Adapters:
- Tests:
- Planning DB:

### How
- Control flow:
- Authority decision:
- Conflict behavior:
- Failure behavior:

### Why
- Selected design:
- Reused repository semantics:
- Rejected alternatives:

### Ownership
- DDD owner:
- Commands/queries:
- Ports:
- Adapters:
- Contracts:
- Migrations:
- Files:

### Evidence
- Red tests observed:
- Green tests observed:
- CI links:
- Live browser/integration proof:

### Product behavior
- User-visible change:
- Error/recovery behavior:

### Safety
- Security:
- Data integrity:
- Observability:
- Compatibility:
- Rollback:

### Residual risk
- Known gaps:
- Deviations:

### Next iteration
- Exact bounded slice:
- Must reuse:
- Must not introduce:
```

### 12.3 Acceptance

The handoff is acceptable only when:

- exact final head equals the CI head;
- claims link to repository paths or workflow runs;
- red/green chronology is factual;
- pre-product compatibility is explicit;
- residual atomicity gap is not hidden;
- next iteration is limited to atomic publication and exact revision identity.

---

## 13. Next implementation slice

## Atomic DBT publication and exact project revision

### 13.1 Severity and evidence

Severity: P1 data integrity and reproducibility.

Evidence:

- `canvasPlanAction.ts` writes artifacts sequentially;
- `IWorkspaceFileBatchMutationPort` already exists;
- the local gateway already performs complete conflict preflight, multipath locking, idempotency, receipt persistence, and atomic replacement;
- the DBT reconciliation callback ignores its save receipt;
- ADR-0060 requires atomic file mutation and revision/hash binding into Preview/Run receipts.

### 13.2 Root cause

Graph-first Preview evolved around a single-file command port and retained the loop after a batch transaction authority was added for other verticals.

Publication and analysis remain separate observations rather than one server-owned transaction receipt.

### 13.3 User impact

Without the slice:

- a late failure can publish only part of a DBT project;
- a retry cannot prove which files belong to one logical attempt;
- Preview can describe a different project source set;
- Run reproducibility is not guaranteed;
- reopen cannot prove it loaded the published revision.

### 13.4 Exact owner

```text
Domain: Project Workspace I/O / dbt Project Publication
Planning task: E-WEB-DBT-ATOMIC-PUBLICATION-1
Application transaction: PublishDbtWorkspaceArtifacts
```

### 13.5 Reuse

Reuse:

- `WorkspaceFileBatchMutation`;
- `WorkspaceFileBatchReceipt`;
- `IWorkspaceFileBatchMutationPort`;
- `LocalWorkspaceFileBatchMutationGateway`;
- `ProjectDbtGraphFromFiles`;
- existing workspace scope authorization;
- existing DBT analyzer;
- existing Preview and Run rails.

Do not create:

- another file repository;
- browser-owned rollback;
- another mutation rail for each artifact type;
- a second graph authority;
- a hidden file merge policy;
- a generic transaction framework.

### 13.6 Proposed result contract

```ts
type PublishDbtWorkspaceArtifactsResult =
  | Readonly<{
      kind: 'published';
      publicationReceipt: WorkspaceFileBatchReceipt;
      projectRevision: DbtProjectPublicationRevision;
      projection: DbtProjectGraphProjection;
    }>
  | Readonly<{
      kind: 'conflict';
      conflicts: readonly WorkspaceFileConflict[];
    }>
  | Readonly<{
      kind: 'invalid';
      diagnostics: readonly DbtDiagnostic[];
    }>;
```

### 13.7 Command/query and port changes

- Add or promote one existing Planning DB-owned application command for publishing the graph projection through the batch port.
- Keep `ProjectDbtGraphFromFiles` as the analysis query.
- Extend the publication result to contain one immutable project revision.
- Make Preview accept the publication revision explicitly.
- Make StartRun consume or validate the accepted Preview revision.
- Reject mismatched revisions rather than silently refreshing latest.

### 13.8 Likely files/components

API/application:

- workspace file batch mutation command service;
- DBT project analysis service;
- protected route group for the existing publication intent;
- contracts package for typed result/provenance.

Web:

- `canvasPlanAction.ts`;
- DBT workspace artifact publisher;
- execution strategy/provenance builders;
- plan and run adapters;
- protected Cypress flow.

Planning DB:

- reopen/claim existing atomic publication task;
- component/rail/contract/evidence updates;
- no parallel task or duplicate rail.

### 13.9 Migration and compatibility

DVT is pre-product.

No legacy data migration is required unless a concrete supported persisted format is identified.

Compatibility requirement:

- first request without prior batch receipt works;
- idempotent retry returns the same receipt;
- unknown or conflicting files fail closed;
- ordinary file-authoritative DBT projects remain unaffected.

### 13.10 Rollback

Rollback is code revert before release.

Runtime transaction rollback is owned by atomic replacement:

- conflict: no writes;
- staging failure: no visible partial writes;
- replace failure: coordinator restores original files;
- retry: receipt and postconditions determine deduplication.

### 13.11 Observability

Record without SQL bodies:

- publication ID;
- idempotency key hash;
- scope identity;
- file count;
- total bytes;
- conflict count and paths only where authorized;
- request hash;
- project content-set hash;
- analysis hash;
- duration;
- deduplicated flag;
- failure class.

Never log credentials, SQL bodies, profiles, environment secrets, or unbounded analyzer output.

### 13.12 Security

- authorize workspace scope before reads or writes;
- normalize paths before batch creation;
- enforce existing file and batch byte limits;
- do not accept client-provided absolute paths;
- do not trust client-provided content hashes without server recomputation;
- bind idempotency to scope and request hash;
- isolate dbt parse target/log/profile directories;
- redact SQL and secrets.

### 13.13 Red tests

1. Conflict in the second file leaves every file unchanged.
2. Conflict in the last file leaves every file unchanged.
3. Injected replacement failure restores every original file.
4. Same idempotency key and same request returns same receipt.
5. Same key and different request fails closed.
6. Publication receipt lists every resulting content hash.
7. Project content-set hash is deterministic across path ordering.
8. Analyzer receives exactly the post-publication project source set.
9. Preview rejects a different project content-set hash.
10. Run rejects or requires re-preview after revision mismatch.
11. Reopen returns the same project revision.
12. Logs contain no SQL text.
13. Unauthorized scope fails before file access.
14. Oversized batch fails before staging.

### 13.14 Green proof

- focused contract tests;
- application transaction tests;
- local gateway failure-injection tests;
- API route tests;
- Web orchestration tests;
- architecture guards proving no duplicate rail;
- Planning DB integrity and mechanization;
- complete repository prepush gate;
- six standard workflows on final head.

### 13.15 Live proof

Protected live vertical:

```text
author graph SQL
-> Preview publishes 3+ artifacts atomically
-> capture publication/project/analysis identities
-> Run same revision
-> reopen project
-> verify exact file hashes and graph projection
-> inject external change
-> retry Preview
-> verify conflict and zero file changes
```

### 13.16 Acceptance criteria

- no sequential artifact write loop remains in graph-first Preview;
- one server-owned batch receipt exists;
- every expected revision is checked before replacement;
- no partial project is visible after conflict/failure;
- project content-set and analysis hashes are stable and typed;
- Preview binds exact revision;
- Run binds or validates exact Preview revision;
- reopen reproduces exact published revision;
- no SQL bodies in logs;
- no duplicate command/query rail;
- Planning DB and source agree;
- final handoff exists.

### 13.17 Release gates

- all red/green cycles documented;
- failure injection passes;
- protected live flow passes;
- architecture guards pass;
- security and dependency checks pass;
- six workflows green on exact final head;
- no unresolved review threads;
- iteration handoff complete.

---

## 14. Subsequent ordered route

After atomic publication and exact revision identity:

1. Workspace inventory truth
   - pagination;
   - `complete | partial`;
   - explicit limits;
   - typed oversized/not-found/unsupported results.
2. Cohesive authoring recovery
   - durable buffer journal;
   - receipt/revision correlation;
   - crash restoration;
   - explicit discard/recover decisions.
3. Product-wide quality gates
   - Web/API coverage ratchets;
   - accessibility;
   - bundle budget;
   - large-graph performance;
   - injected failures;
   - exact-main evidence.
4. Later differentiation
   - richer assets and lineage;
   - freshness/checks;
   - revision promotion/rollback;
   - collaboration;
   - partitions and observability depth.

Do not reorder these based on a point-in-time review document. Revalidate Planning DB dependencies each cycle.

---

## 15. Final instruction to the implementation agent

PR #2040 has no new demonstrated runtime blocker.

Do not add more implementation scope.

Complete this iteration by publishing the required handoff. Then merge only after the repository's normal review and release gates are satisfied.

The next branch must be atomic publication and exact revision identity. It must reuse the existing batch mutation authority and close one end-to-end transaction.

Do not spend the next product cycle on:

- another review framework;
- release governance expansion;
- dependency maintenance as primary work;
- legacy compatibility;
- marker signing;
- another DSL;
- generic collaboration;
- assets/freshness/partitions;
- a proprietary registry.

---

## 16. Final verdict

```text
Repository delta: NONE
Product delta: NONE
Implementation handoff: MISSING
PR #2040 runtime blocker: NONE DEMONSTRATED
PR #2040 delivery blocker: HANDOFF
Next product slice: ATOMIC PUBLICATION + EXACT REVISION
```

No new finding is invented in this cycle.
