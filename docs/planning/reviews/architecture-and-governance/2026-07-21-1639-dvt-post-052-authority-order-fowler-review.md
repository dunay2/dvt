---
title: DVT post-0.5.2 authority-order Fowler review
status: current-review
date: 2026-07-21T16:39:00+02:00
reviewed_repository: dunay2/dvt
reviewed_main_sha: 591a1ecde7a43fefa5206f55bb446dd84da5f2dc
scope: documentation-only
planning_authority: Planning DB
---

# DVT post-0.5.2 authority-order Fowler review

## 1. Purpose and authority

This report reviews the exact repository state at
[`main@591a1ecde7a43fefa5206f55bb446dd84da5f2dc`](https://github.com/dunay2/dvt/commit/591a1ecde7a43fefa5206f55bb446dd84da5f2dc).

It is written for the implementation agent working in `dunay2/dvt` after release `0.5.2`.
It is a human-readable review and implementation intake. It does not replace Planning DB as the
operational authority for task status, design approval, ownership, command/query rails, evidence,
or completion.

The report intentionally corrects two forms of drift present in earlier point-in-time reviews:

1. the Code reconciliation edit/revert defect is now fixed by PR #2030 and must not be reopened;
2. the immediate product order is **model SQL authority first, atomic publication second**, because
   `E-WEB-DBT-ATOMIC-PUBLICATION-1` depends on
   `E-WEB-DBT-MODEL-SQL-AUTHORITY-1`.

A previous documentation branch proposed atomic publication as the immediate first task. PR #2031
was correctly closed without merge because that ordering conflicted with the canonical Planning DB
dependency and created a second planning authority.

## 2. Reviewed identities

- Exact current `main`:
  [`591a1ecde7a43fefa5206f55bb446dd84da5f2dc`](https://github.com/dunay2/dvt/commit/591a1ecde7a43fefa5206f55bb446dd84da5f2dc)
- Current public release: `v0.5.2`
- Release PR:
  [#2023 — chore(main): Release 0.5.2](https://github.com/dunay2/dvt/pull/2023)
- Latest product fix:
  [#2030 — fix(web): Preserve pending reconciliation receipt truth](https://github.com/dunay2/dvt/pull/2030)
- Previous product baseline reviewed repeatedly:
  [`8eb0f5a7551d46c909a024b86f66cf3580c20691`](https://github.com/dunay2/dvt/commit/8eb0f5a7551d46c909a024b86f66cf3580c20691)
- Closed, non-authoritative priority proposal:
  [#2031 — docs(planning): Add DVT product priority execution guide](https://github.com/dunay2/dvt/pull/2031)
- Open pull requests at review time: **none**

## 3. Executive verdict

DVT made one clear product-correctness advance since the preceding review: PR #2030 fixed the
pending-reconciliation receipt race. Editing a saved model during background reconciliation and
then returning to the saved bytes no longer proves semantic freshness. The matching receipt remains
authoritative until its fresh, degraded, or failed outcome settles. Older reconciliation outcomes
also cannot erase a newer persistence conflict, failure, or in-flight save.

Release `0.5.2` is published and includes that fix. The release candidate head had six successful
standard workflows. The exact merge commit on `main`, however, still has no connector-visible
workflow runs or commit statuses; repository evidence is therefore PR-head evidence plus published
release identity, not a directly observed exact-main Actions run.

The next product problem is no longer the local Code state-machine race. It is the **two-authority
model SQL boundary**:

- graph-first Canvas authoring stores model SQL in graph metadata;
- Project Code exposes workspace files as editable files;
- Preview regenerates model artifacts from graph metadata and writes them to the workspace;
- the graph and file surfaces therefore do not yet converge on one revision-bound source of truth.

This is a hidden-authority and lost-update risk. It must be closed before the atomic publication
slice because atomic publication of an ambiguous authority merely makes the wrong decision more
reliably.

The correct immediate route is:

1. `E-WEB-DBT-MODEL-SQL-AUTHORITY-1` — one model SQL authority and safe authority transition;
2. `E-WEB-DBT-ATOMIC-PUBLICATION-1` — one multi-file publication receipt and exact project revision;
3. `E-WEB-DBT-WORKSPACE-INVENTORY-TRUTH-1` — complete or explicitly partial workspace visibility;
4. project authoring session and crash recovery;
5. product-wide nonfunctional evidence and current-state truth;
6. later differentiation through assets, checks, promotion, rollback, and collaboration.

## 4. Material delta since the previous review

### 4.1 Fixed — pending reconciliation receipt truth

PR #2030 changes the reducer so reconciliation completion is admitted by matching
`WorkspaceFileSaveReceipt`, not by requiring the presentation phase to still equal `reconciling`.
It adds reducer and hook interleaving tests for:

- edit during pending reconciliation;
- revert to persisted bytes before analysis settles;
- degraded `invalid` result after revert;
- fresh result while a later edit remains dirty;
- matching reconciliation while a newer save is in flight;
- older reconciliation not erasing newer conflict or failure;
- reconciliation failure retained while a later edit remains dirty.

Planning DB migration `791_code_working_tree_receipt_precedence.sql` closes
`GAP-CODE-PENDING-RECEIPT-REVERSION` under
`E-WEB-DBT-RECONCILIATION-RECEIPT-TRUTH-1` without introducing another command/query rail.

**Disposition:** fixed. Do not reopen the old P2 and do not require a full orthogonal state refactor
as a prerequisite for the next product slice.

### 4.2 Fixed — review-thread state

All three inline threads on PR #1996 are now resolved:

- two P1 lost-edit races were fixed in the PR #1996 branch;
- the remaining P2 edit/revert race was resolved by PR #2030.

PR #2030 itself has no inline review threads. The automated review bot was unavailable because its
usage limit was reached, so the absence of a review finding is not independent review evidence.
The implementation did nevertheless pass focused tests, the full Web validation surface, the
protected live dbt author/code/run flow, Planning DB checks, and all six standard workflows.

### 4.3 Fixed — release lane

Release `0.5.2` was merged and published. Its release head
`cd19b6d4bd7d0ffee858f44d269c26ae8da38bc5` completed successfully in:

- Test Suite;
- CI - Code Quality;
- CodeQL;
- Contracts & Determinism;
- Dependency Review;
- PR Quality Gate.

The changelog contains one user-facing line for the reconciliation fix and no merge/parent duplicate
for that outcome.

### 4.4 Superseded — previous immediate priority

The former recommendation “atomic publication first” is superseded. PR #2031 documented why it was
closed: canonical task ordering requires model SQL authority before atomic publication.

This correction is not cosmetic. Publishing multiple files atomically cannot solve whether the
model SQL came from graph metadata, a directly edited file, or a stale generated copy. Authority
must be made explicit before transaction semantics are hardened.

### 4.5 Still active — exact-main CI identity

No connector-visible workflow run or commit status is attached directly to
`main@591a1ecde7a43fefa5206f55bb446dd84da5f2dc`.

This is an evidence gap, not proof that the release is invalid. The release candidate head was green
and the tag was published. The repository should nevertheless make the exact tag target and evidence
identity mechanically visible to operators.

### 4.6 Still active — no open product branch

At review time there are no open pull requests. The repository is not blocked by an active failing
implementation branch; it is waiting for the next product slice to be claimed and implemented.

## 5. Current product authority analysis

## 5.1 File-backed target remains correct

The accepted dbt round-trip direction is still correct:

```text
dbt project files
  -> server-side dbt analysis
  -> DbtProjectGraphProjection
  -> Canvas
  -> governed edits when lossless
  -> the same dbt project files
  -> persisted Preview
  -> PlanRef
  -> Run
```

DVT must not introduce a second user-facing language for dbt. Canvas is a governed visual
projection and editing surface over ordinary dbt files.

## 5.2 Current graph-first model SQL authority

Graph-authored model SQL is normalized into `node.metadata.config.sql`. Earlier legacy top-level
`metadata.sql` is removed when authored metadata is applied. This improved internal graph truth and
prevented stale duplicate metadata fields.

That is only a local graph-draft authority. It does not establish the durable authority after a
workspace model file exists.

## 5.3 Current Project Code authority

Project Code edits workspace file content using revision-guarded saves. For imported file-backed
projects, opening Code for a resource uses the real project path and the file is the obvious source
of truth.

For graph-first projects, however, generated files can coexist with graph metadata that can generate
those files again. The product therefore exposes two editable representations with no explicit
authority transition.

## 5.4 Current Preview publication path

`canvasPlanAction.ts` builds dbt workspace artifacts from canonical graph nodes and then iterates over
each artifact:

```ts
for (const artifact of artifactProjection.artifacts) {
  await workspaceFileContentCommand.saveFileContent({
    path: artifact.path,
    content: artifact.content,
    expectedRevision: await readExpectedWorkspaceFileRevision(
      workspaceFilesQuery,
      artifact.path
    ),
  });
}
```

This has two separate defects:

1. **authority defect:** the generated graph bytes can overwrite a directly edited workspace file
   because the expected revision is read immediately before the write, not compared with the last
   graph-produced baseline;
2. **transaction defect:** files are written sequentially, so a later conflict or failure can leave a
   partially updated dbt project.

The authority defect must be addressed first.

## 5.5 Current file-to-graph reconciliation boundary

`useDbtProjectFileCanvasController.ts` receives a `WorkspaceFileSaveReceipt` but the callback names it
`_receipt` and performs a generic latest refetch:

```ts
const reconcileCodeFilePersistence = useCallback(
  async (_receipt: WorkspaceFileSaveReceipt) => {
    return projectDbtCodeReconciliationOutcome(await refreshProjectGraphSource());
  },
  [refreshProjectGraphSource]
);
```

The resulting projection can contain `analysisSha256` and `projectContentSetSha256`, but the save
receipt is not joined to one exact whole-project revision. A concurrent change to another file may
produce a valid latest projection that is not the project snapshot implied by the original save.

This is part of the later atomic publication and project-session slices. It must not be “fixed” with
a second read presented as atomic proof.

## 5.6 Existing transaction authority must be reused

The API already defines:

- `WorkspaceFileBatchMutation`;
- complete expected-file revisions;
- writes and deletes;
- an idempotency key;
- per-file conflicts;
- `WorkspaceFileBatchReceipt`;
- `IWorkspaceFileBatchMutationPort`.

`LocalWorkspaceFileBatchMutationGateway` already performs:

- path and limit validation;
- deterministic request hashing;
- receipt lookup and idempotency conflict detection;
- multipath locking;
- complete preflight revision checks;
- staged replacement;
- atomic file replacement;
- persistent receipt publication.

No new dbt-specific transaction engine or mutation language is justified.

## 6. Fowler assessment

### 6.1 Hidden authority — P1 product

**Signal:** graph metadata and workspace SQL can both appear editable.

**Smell:** hidden authority and divergent representations.

**Impact:** a user can believe a direct file edit is authoritative, then have Preview regenerate a
previous graph value over it without a semantic conflict.

**Required response:** one explicit authority state and one transition rule. After file authority is
established, graph and node Code must project from and mutate the same file revision.

### 6.2 Responsibility overload — P1 architecture

`canvasPlanAction.ts` currently decides execution projection, builds dbt project files, reads current
file revisions, persists each file, calls Preview, and returns publication paths.

These are different reasons to change:

- graph-to-artifact projection;
- workspace publication transaction;
- conflict policy;
- project revision identity;
- planner Preview orchestration.

**Required response:** move publication behind the existing application port and keep Canvas as an
adapter/orchestrator.

### 6.3 Temporal coupling — P1 integrity

Correctness currently depends on the order of:

- graph edits;
- direct file edits;
- revision reads;
- sequential writes;
- dbt analysis;
- Preview invocation.

The #2030 fix removed one local temporal race, but project publication still depends on an
unversioned sequence rather than one durable operation identity.

### 6.4 Primitive obsession — P2 architecture

Paths, hashes, status strings, and nullable fields carry a richer protocol than their types express.
The next slices should use existing typed revisions and receipts, adding only the minimum missing
project-publication result shape in shared contracts.

### 6.5 Shotgun surgery and governance amplification — P2 delivery

Narrow interaction fixes repeatedly touch reducer logic, view hooks, presentation tests,
architecture tests, Cypress support, evidence, and Planning DB migrations.

The answer is not to remove governance. It is to stabilize the application boundary so one product
transaction has one owner, one approved design, one rail set, and one evidence bundle.

### 6.6 Test-only confidence — P2 quality

The repository has strong focused and protected-live tests, but several product-wide guarantees are
not visible as root release gates:

- Web/API coverage ratchets equivalent to Engine;
- automated accessibility;
- bundle-size budget;
- large-graph interaction budget;
- load and multi-worker behavior;
- crash-recovery proof;
- exact-main/tag evidence.

### 6.7 Stale truth — P2 governance

Point-in-time review documents become stale quickly. The repository correctly closes them rather
than merging parallel status authorities. Planning DB should project a generated current-state view
instead of relying on manual “current status” prose.

## 7. Previous findings disposition

| Finding | Current disposition | Evidence / owner |
| --- | --- | --- |
| Raw selection recovery transport detail shown to users | Fixed | localized recovery copy merged before 0.5.2 |
| Edit lost while persistence is in flight | Fixed | PR #1996 P1 thread resolved |
| Edit lost while reconciliation is in flight | Fixed | PR #1996 P1 thread resolved |
| Edit/revert hides pending reconciliation | Fixed | PR #2030; Planning DB migration 791 |
| Contextual file target lost after failed save | Fixed | PR #1996 branch and closeout evidence |
| Model SQL has duplicate graph metadata fields | Fixed locally | canonical `metadata.config.sql`; legacy top-level SQL removed |
| Graph and workspace SQL are one authority | Active P1 | `E-WEB-DBT-MODEL-SQL-AUTHORITY-1` |
| Multi-file dbt publication is atomic | Active P1 | `E-WEB-DBT-ATOMIC-PUBLICATION-1` |
| Save maps to exact project revision | Active P1 | atomic publication / project session |
| Workspace inventory is complete or explicitly partial | Active P1 | `E-WEB-DBT-WORKSPACE-INVENTORY-TRUTH-1` |
| HTTP responses are runtime-validated at Web boundary | Active P1 for new rails | `A-API-ZOD4-BOUNDARY-CONVERGENCE-1` |
| Unsaved editor state survives hard crash | Active P2 | `E-WEB-CODE-DRAFT-CRASH-RECOVERY-1` |
| Exact main/tag has directly visible CI identity | Active evidence gap | release governance / nonfunctional evidence |
| Another manual priority guide should become authority | Disproved | PR #2031 closed; Planning DB remains authority |

## 8. Priority 1 — model SQL authority convergence

### 8.1 Severity and user impact

- Severity: **P1 product integrity**.
- User impact: direct SQL edits can be overwritten or presented inconsistently across Canvas node
  Code, Project Code, Preview, Run, and reopen.
- Business impact: DVT cannot credibly claim bidirectional dbt authoring while two surfaces can own
  the same SQL independently.

### 8.2 Exact domain owner

Primary owner:

- dbt model SQL authoring authority under the Canvas/file-authoring domain;
- canonical task: `E-WEB-DBT-MODEL-SQL-AUTHORITY-1`.

Collaborating components:

- Canvas node Code/workbench adapter;
- Project Code working tree;
- Canvas authoring authority binding;
- `ProjectDbtGraphFromFiles` query;
- existing `SaveWorkspaceFileContent` command.

### 8.3 Required authority model

Use an explicit, minimal authority posture:

```ts
type DbtModelSqlAuthority =
  | Readonly<{
      kind: 'graph-proposal';
      nodeId: string;
      expectedPath: string;
    }>
  | Readonly<{
      kind: 'workspace-file';
      modelUniqueId: string;
      path: string;
      contentSha256: string;
      projectContentSetSha256: string | null;
    }>;
```

This is illustrative. Reuse or extend the existing authority binding if it already expresses the
same semantics. Do not introduce a parallel public authority contract when the existing binding can
own the transition.

### 8.4 Invariants

1. Before materialization, graph SQL is a proposal; generated file paths are not independently
   editable authoritative files.
2. After file authority is established, `models/<model>.sql` is the sole durable SQL authority.
3. Node Code and Project Code edit the same file through the same CAS command.
4. Canvas graph SQL is projected from the authoritative file after materialization.
5. Preview cannot regenerate authoritative SQL opportunistically from stale graph metadata.
6. A direct external file edit must be adopted through reanalysis or reported as a conflict; it must
   never be silently replaced.
7. Empty SQL, absent SQL, generated default SQL, source SQL, and compiled SQL remain distinct states.
8. Compiled SQL remains read-only derived evidence, never the editable source authority.

### 8.5 Command/query and port changes

Reuse:

- command: `SaveWorkspaceFileContent`;
- query: `ProjectDbtGraphFromFiles`;
- existing workspace CAS types and receipts;
- existing Canvas authority binding.

Likely additions or refinements:

- a query/read model that resolves the current model SQL authority and exact path;
- an authority transition inside the existing Canvas lifecycle after successful materialization;
- no new generic save rail;
- no new dbt-specific file repository.

### 8.6 Likely implementation files

Inspect first:

- `apps/web/src/app/views/canvas/canvasDbtAuthoringModel.ts`
- `apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.ts`
- `apps/web/src/app/views/canvas/canvasDbtWorkspaceArtifacts.ts`
- `apps/web/src/app/views/canvas/canvasPlanAction.ts`
- `apps/web/src/app/views/canvas/useCanvasNodeWorkbenchDraftController.ts`
- `apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts`
- `apps/web/src/app/views/DbtProjectFileCanvasView.tsx`
- `apps/web/src/app/views/code/useCodeWorkingTreeSync.ts`
- `apps/web/src/app/ports/workspaceFiles.ts`
- authority binding contracts and tests under `packages/@dvt/contracts`
- current Planning DB design and task traces for model SQL authority.

### 8.7 Migration and compatibility

- Read legacy top-level `metadata.sql` only as migration input; write only canonical authority.
- Existing graph drafts without files remain graph proposals.
- Existing file-backed projects remain file authoritative.
- A graph project with previously generated files must be classified deterministically:
  adopt only when content matches the last known generated baseline, otherwise block and require an
  explicit user decision.
- No automatic destructive migration of ambiguous files.

### 8.8 Rollback posture

The first PR should be rollback-safe through feature-compatible state:

- no destructive file rewrite during migration;
- authority transition recorded only after a successful durable file operation;
- reverting the PR leaves existing files and graph drafts readable;
- any new stored discriminator must be versioned and backward readable.

### 8.9 Observability

Emit stable events without SQL content:

- model SQL authority resolved;
- graph proposal materialization requested;
- file authority established;
- external divergence detected;
- direct file change adopted;
- stale graph generation blocked;
- authority transition conflict;
- authority transition reverted.

Correlate with workspace, canvas, model `unique_id`, path, content hash, and opaque receipt identity.
Do not log SQL source or raw transport errors.

### 8.10 Security

- validate all paths within the workspace/project root;
- preserve traversal protections;
- do not execute candidate SQL during authority transition;
- reuse sanitized dbt diagnostics;
- do not expose profiles or credentials;
- keep source content out of telemetry and receipts.

### 8.11 Red/green tests

Red tests before production changes:

1. graph SQL G1 materializes file F1; direct Project Code edit F2; Preview must not replace F2 with G1;
2. node Code and Project Code opened at revision R1; one writes R2; the other must conflict on R1;
3. after file authority, node Code reads file content, not stale graph metadata;
4. external file edit followed by Canvas reopen projects the new file SQL;
5. empty source SQL is not confused with missing SQL or generated default SQL;
6. compiled SQL never becomes the editable source;
7. ambiguous pre-existing generated file blocks authority adoption;
8. graph proposal with no file keeps Project Code non-authoritative/read-only for the expected path;
9. authority transition survives reload;
10. no graph metadata write can silently replace file-authoritative SQL.

### 8.12 Protected live proof

A required browser/API/PostgreSQL/workspace/dbt vertical:

1. create a graph-first dbt model;
2. author SQL in node Code;
3. materialize the project;
4. verify the model file bytes and revision;
5. edit the model in Project Code;
6. return to Canvas and verify the graph/node Code projects the same bytes;
7. Preview and Run without a silent overwrite;
8. reopen the browser and verify the same authoritative content;
9. create a competing stale edit and prove an explicit conflict.

### 8.13 Acceptance criteria

- one durable SQL authority after materialization;
- no silent overwrite across Canvas and Project Code;
- no second save/query rail;
- file path and revision visible in Code UX;
- exact conflict behavior;
- source and compiled SQL clearly separated;
- current Planning DB design approved and fully mechanized;
- final-head standard CI green;
- protected live proof green;
- no known P1/P2 authority thread unresolved.

## 9. Priority 2 — atomic project publication and exact revision

This starts only after Priority 1 is complete.

### 9.1 Severity and root cause

- Severity: **P1 data integrity and reproducibility**.
- Root cause: Canvas owns a sequential file loop instead of invoking the existing batch mutation
  authority.
- User impact: partial dbt projects, ambiguous Preview provenance, and inability to reproduce a Run
  from one exact project revision.

### 9.2 Owner and reused infrastructure

Canonical task: `E-WEB-DBT-ATOMIC-PUBLICATION-1`.

Reuse:

- `IWorkspaceFileBatchMutationPort`;
- `LocalWorkspaceFileBatchMutationGateway`;
- complete expected-file revisions;
- idempotency receipts;
- `ProjectDbtGraphFromFiles`;
- dbt project revision and analysis hashes.

### 9.3 Application result

The batch result should bind publication and analysis:

```ts
type PublishDbtProjectRevisionResult =
  | Readonly<{
      kind: 'published';
      publicationReceipt: WorkspaceFileBatchReceipt;
      projectContentSetSha256: string;
      analysisSha256: string;
      freshness: 'fresh';
    }>
  | Readonly<{
      kind: 'conflict';
      conflicts: readonly WorkspaceFileConflict[];
    }>
  | Readonly<{
      kind: 'analysis_invalid';
      publicationReceipt: WorkspaceFileBatchReceipt;
      projectContentSetSha256: string;
      diagnostics: readonly StableDbtDiagnostic[];
      policy: 'retained' | 'rolled_back';
    }>;
```

Prefer existing contract names where equivalent. The critical property is one server-owned receipt
joining all writes and one exact analyzed project content set.

### 9.4 Required tests

- conflict on the second file leaves every original hash unchanged;
- injected write failure leaves zero committed project changes;
- same idempotency key returns the same receipt;
- different request with the same key fails closed;
- resulting project hash matches the analyzed files;
- Preview consumes the published revision;
- Run consumes the Preview revision;
- reopen resolves the same revision;
- another file changes before analysis: result is superseded or identifies the newer exact project;
- no double GET is accepted as atomic proof.

### 9.5 Release gate

No release may claim atomic dbt project publication unless the batch failure-injection and exact
Preview/Run provenance proofs pass on the final head.

## 10. Priority 3 — workspace capability truth

Canonical task: `E-WEB-DBT-WORKSPACE-INVENTORY-TRUTH-1`.

Current mismatch:

- dbt project inspection accepts up to 10,000 project files and 50 MB;
- workspace listing is bounded at 500 files;
- interactive file content is bounded at 1 MB;
- incompleteness is not represented clearly;
- oversized content can collapse into an invalid-path style error.

Required outcome:

```ts
type WorkspaceFileInventory = Readonly<{
  entries: readonly WorkspaceFileEntry[];
  completeness: 'complete' | 'partial';
  nextCursor: string | null;
  effectiveLimits: WorkspaceFilePolicy;
}>;

type WorkspaceFileReadResult =
  | { kind: 'found'; file: WorkspaceFileContent }
  | { kind: 'not_found' }
  | { kind: 'oversized'; sizeBytes: number; maxBytes: number }
  | { kind: 'unsupported'; reason: string };
```

Do not simply raise all limits. Make policy shared and explicit across import, analysis, Explorer,
Code, mutation, and publication.

Mandatory proofs:

- 501 files;
- near 10,000 files;
- multiple pages;
- file above 1 MB;
- UI shows partial inventory;
- mutation of a visible file remains revision safe;
- analysis does not imply Explorer completeness.

## 11. Priority 4 — authoring session and crash recovery

Canonical owners include `E-WEB-PROJECT-AUTHORING-SESSION-1` and
`E-WEB-CODE-DRAFT-CRASH-RECOVERY-1`.

Only after SQL authority and publication are stable, extract a cohesive application boundary that
owns:

- open buffers;
- file save receipts;
- current project revision;
- dbt analysis state;
- Preview/Run admission;
- conflict decisions;
- navigation and close policy;
- durable draft journal;
- crash restoration and discard.

A `beforeunload` warning and best-effort flush are not crash recovery. The journal must be scoped,
encrypted or protected according to the deployment model, bounded in size, and invalidated when the
authoritative project revision changes incompatibly.

## 12. Priority 5 — runtime contracts and product quality

### 12.1 Runtime contract validation

New reconciliation, publication, and inventory responses must be parsed through shared schemas in
`@dvt/contracts`. Do not rely on `parsedBody as TResponse` at trust boundaries.

Canonical convergence task: `A-API-ZOD4-BOUNDARY-CONVERGENCE-1`.

### 12.2 Nonfunctional release evidence

Add product-level gates for:

- Web and API coverage ratchets;
- accessibility on critical Canvas/Code flows;
- bundle-size budget;
- large-graph render and interaction latency;
- API payload and analysis latency;
- conflict and failure injection;
- multi-worker and restart behavior;
- security path traversal and untrusted dbt project boundaries;
- exact tag-target evidence.

### 12.3 Current-state truth

Generate current delivery status from Planning DB and repository evidence. Do not maintain another
manual document that claims to be current indefinitely.

Canonical task: `A-SYSTEM-CURRENT-STATE-TRUTH-1`.

## 13. Comparison with mature systems

| System | Match now | Differentiate | Defer |
| --- | --- | --- | --- |
| dbt Studio | normal dbt files; build/test/run/version-control surface; clear source vs compiled SQL | governed visual editing and revision receipts across graph and code | broad cloud collaboration parity |
| VS Code / Git | dirty, saved, staged/committed, conflict, branch, remote and diff are distinct states | domain-aware dbt project revisions and Preview/Run admission | full general-purpose SCM implementation |
| Airflow | execution bound to one versioned bundle of all required files | content-addressed dbt project revision rather than Python DAG bundle | general scheduler feature parity |
| Prefect | deployment-version history, exact commit/digest execution, promotion and rollback | governed data-project publication receipt | broad deployment platform |
| Dagster | later assets, lineage, checks, freshness and observability | graph/code bidirectional authoring under file authority | asset platform expansion before authority is stable |
| Temporal | durable identity, retry, idempotency and outcome correlation | use receipts for authoring transactions without making the editor a workflow engine | general workflow semantics in UI |
| NiFi | explicit local/remote/versioned flow states and visual diff | Git/file-first dbt authority instead of a proprietary registry | new Registry clone; NiFi Registry is deprecated |

Official reference points:

- dbt Studio IDE is described as one interface for building, testing, running, and version-controlling
  dbt projects: <https://docs.getdbt.com/>
- Airflow DAG Bundles version all files required by a DAG and let a run use one exact bundle version:
  <https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/dag-bundles.html>
- Prefect deployment versions support history, promotion, rollback, and exact code versions:
  <https://docs.prefect.io/v3/how-to-guides/deployments/versioning>
- Dagster emphasizes declarative assets, lineage, observability, and testability:
  <https://docs.dagster.io/>
- Temporal guarantees durable resumption after crashes and outages:
  <https://docs.temporal.io/>
- VS Code distinguishes changes, staging, commits, branches, remotes, diffs, and merge conflicts:
  <https://code.visualstudio.com/docs/sourcecontrol/overview>
- NiFi Registry was deprecated following a February 2026 vote in favor of Git-based Flow Registry
  Clients: <https://nifi.apache.org/projects/registry/>

## 14. PR decomposition

### PR A — model SQL authority containment

- claim and use `E-WEB-DBT-MODEL-SQL-AUTHORITY-1`;
- add the red tests for Project Code divergence;
- make generated graph-owned files non-authoritative/read-only or block Preview on divergence;
- no new rails;
- no batch publication yet;
- final-head CI and focused protected proof.

### PR B — model SQL authority transition

- establish file authority after successful materialization;
- node Code and Project Code use the same file CAS path;
- graph projects from the file;
- conflict and reopen proof;
- close the task only with full vertical evidence.

PR A and PR B may be one PR only if the final diff remains reviewable and closes one complete user
transaction. Do not split by technical layer.

### PR C — atomic project publication

- claim `E-WEB-DBT-ATOMIC-PUBLICATION-1`;
- replace sequential Canvas writes with the existing batch port;
- one publication receipt;
- exact project and analysis identity;
- failure injection;
- Preview and Run provenance.

### PR D — workspace inventory truth

- claim `E-WEB-DBT-WORKSPACE-INVENTORY-TRUTH-1`;
- pagination and explicit completeness;
- typed oversized/not-found results;
- API, Web, and large-project proofs.

### PR E — authoring session and crash recovery

- extract only proven common orchestration;
- durable journal and restore/discard UX;
- restart and conflicting-authority proofs.

### PR F — product-wide quality and generated status

- Web/API coverage ratchets;
- accessibility, bundle, large graph, latency and failure gates;
- exact release evidence;
- generated current-state projection.

## 15. Stop-doing list

Until PR A/B establish one model SQL authority:

- do not start another release-governance expansion;
- do not make dependency maintenance the primary product lane;
- do not create another user-facing DSL;
- do not add another file-save or dbt-analysis rail;
- do not make Project Code and graph metadata independently authoritative;
- do not add more sequential artifact writes;
- do not claim atomicity through repeated reads;
- do not build a generic authoring framework first;
- do not expand to column editing, assets, partitions, collaboration, or marketplace features;
- do not merge point-in-time review documents as operational current-state authority.

## 16. Immediate implementation brief

The next agent should begin with the canonical Planning DB task
`E-WEB-DBT-MODEL-SQL-AUTHORITY-1`.

First red scenario:

```text
Graph model SQL G1
-> Preview/materialize workspace file F1
-> Project Code changes F1 to F2
-> return to Canvas
-> Preview again
-> F2 must not be silently replaced by G1
```

Required first decision:

- identify the existing authority-binding object and lifecycle transition that can own
  `graph-proposal -> workspace-file`;
- do not create a parallel contract until the existing binding is proven insufficient.

Exit condition:

```text
Node Code content
== Project Code content
== authoritative model file bytes
== graph projection source
```

with explicit conflict semantics and no silent overwrite.

Only after that condition is proven should the agent claim atomic publication.

## 17. Release and merge decision

Release `0.5.2` is complete. There are no open PRs at review time.

This report authorizes no merge. The documentation branch created for this review must remain a draft
until its findings are reconciled against Planning DB. If the repository follows its established
practice, the review may be closed without merge after all valid findings are mapped to canonical
tasks.

## 18. Documentation-only validation

This review branch is intended to contain exactly one added Markdown file under
`docs/planning/reviews/architecture-and-governance/`.

It changes no runtime code, workflow, dependency, contract, Planning DB migration, generated
artifact, release metadata, or product behavior. No pull request is merged, approved, relabeled, or
made ready by this report.
