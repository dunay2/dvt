---
title: DVT unchanged-main Fowler delta review and executable implementation route
date: 2026-07-20T00:40:00+02:00
status: current-review
reviewed_main_sha: 8eb0f5a7551d46c909a024b86f66cf3580c20691
scope: documentation-only
supersedes: 2026-07-19-2217-dvt-post-merge-fowler-review.md
---

# DVT unchanged-main Fowler delta review and executable implementation route

## Purpose and review boundary

This report is a point-in-time repository and product review for the implementation agent working in
`dunay2/dvt`. It validates the exact current `main`, recent commits, every visible open pull request,
relevant PR heads, CI identity, review threads, release posture, and the current code paths that own:

- DBT Code working-tree persistence and semantic reconciliation;
- file-authoritative DBT project projection;
- Canvas Preview and Run provenance;
- graph-first DBT artifact publication;
- API workspace-file atomic mutation;
- release generation and exact-SHA evidence;
- product-quality and current-state documentation.

The review is intentionally documentation-only. It does not authorize a merge, does not replace
Planning DB as current work authority, and does not change runtime code, workflows, dependencies,
contracts, migrations, generated artifacts, release metadata, or product behavior.

No local test command was executed for this review. Source, contract, CI, PR, review-thread, and release
evidence was inspected through the GitHub connector. Branch search through the connector did not
return even known PR-head branches, so branch inventory is not treated as authoritative; relevant
unmerged work is derived from visible PR heads and recent commits instead.

## Exact reviewed identities

- Repository: [`dunay2/dvt`](https://github.com/dunay2/dvt)
- Exact current `main`: [`8eb0f5a7551d46c909a024b86f66cf3580c20691`](https://github.com/dunay2/dvt/commit/8eb0f5a7551d46c909a024b86f66cf3580c20691)
- Current main merge: [PR #1996 — Harden DBT code persistence reconciliation](https://github.com/dunay2/dvt/pull/1996)
- Previous current-state review: [PR #1999 — Add post-merge Fowler review](https://github.com/dunay2/dvt/pull/1999)
- Open release candidate: [PR #1984 — Release 0.5.0](https://github.com/dunay2/dvt/pull/1984)
- Review branch: `agent/dvt-review-20260720-0040`

## Material delta since the previous review

There is **no product-code delta** since the 2026-07-19 22:17 review. `main` remains exactly
`8eb0f5a7551d46c909a024b86f66cf3580c20691`; no newer commit is visible.

The only material evidence delta is operational:

1. PR #1999 remains open, draft, mergeable, and documentation-only.
2. PR #1999 now has completed applicable documentation checks: PR Quality Gate and Code Quality
   succeeded; Test Suite, Contracts, Dependency Review, and CodeQL were skipped by path policy.
3. Release PR #1984 remains open and mergeable at the metadata level, but all six workflows on its
   current head remain `action_required`.
4. The exact merge SHA on `main` still has no connector-visible workflow run or commit status.
5. The unresolved, non-outdated P2 thread on PR #1996 remains unresolved.

Therefore the previous route remains valid. This report tightens the mature-system comparison,
clarifies repository-compatible contracts, and turns the route into explicit vertical PR gates. It does
not manufacture a new finding merely because another review cycle occurred.

## Executive verdict

DVT has made real, non-trivial progress. The current product now separates durable file persistence
from asynchronous DBT reconciliation, preserves later edits across in-flight saves and reconciliation,
retains contextual targets through retry, guards navigation while bytes remain unresolved, correlates
outcomes by save receipt, restores protected-runtime workspace-file proof, and no longer leaks raw
selection-recovery transport messages to users.

However, the authoring transaction is still not complete enough for a trustworthy release:

- a pending DBT reconciliation can disappear when the user edits and then reverts to the persisted
  bytes;
- Code does not retain the exact project revision that its accepted reconciliation analyzed;
- the Canvas controller ignores the save receipt while asking for the latest project projection;
- graph-first Preview can publish a multi-file DBT project partially despite an existing atomic batch
  mutation port;
- the release candidate describes commit topology rather than normalized user outcomes and has no
  successful current-head CI evidence;
- workspace import acceptance and interactive file/batch limits still describe different product
  capabilities;
- repository-wide Web/API coverage, accessibility, performance, load/recovery, and exact-release-tree
  evidence are not yet expressed as one executable release contract.

The immediate next slice is not a generic authoring framework. It is one narrow correctness PR that
splits persistence truth from reconciliation truth and closes the edit/revert race end to end.

## Current GitHub and CI state

### Open pull requests

| PR | State | Head | Verdict |
| --- | --- | --- | --- |
| [#1999](https://github.com/dunay2/dvt/pull/1999) | Draft, open, mergeable | `856d1e387e0d001722d80daab3fd21a4deff87e9` | Documentation-only predecessor review. Superseded as current-state guidance by this report; do not merge both as active guidance. |
| [#1984](https://github.com/dunay2/dvt/pull/1984) | Open, ready, mergeable metadata | `15783c8dddfd57e4a34ef282e6d919ead2956ef9` | Not release-ready. Duplicate merge/parent outcomes, topology-heavy notes, six `action_required` workflows, and known semantic-truth defect. |

No open functional PR is visible. The next functional work has not yet been opened.

### CI identity

#### Exact current main

`main@8eb0f5a7551d46c909a024b86f66cf3580c20691` has no connector-visible workflow runs and no
combined commit statuses. The merged PR head was green, but that is evidence for a related tree, not
machine-readable validation attached to the exact published merge SHA.

#### Previous review PR

`856d1e387e0d001722d80daab3fd21a4deff87e9`:

- PR Quality Gate: success;
- CI - Code Quality: success;
- Test Suite: skipped;
- Contracts & Determinism: skipped;
- Dependency Review: skipped;
- CodeQL: skipped.

That is appropriate for a Markdown-only diff, but it is not product runtime evidence.

#### Release head

`15783c8dddfd57e4a34ef282e6d919ead2956ef9`:

- Test Suite: `action_required`;
- PR Quality Gate: `action_required`;
- Contracts & Determinism: `action_required`;
- Dependency Review: `action_required`;
- CI - Code Quality: `action_required`;
- CodeQL: `action_required`.

A mergeable GitHub flag is not release evidence. The release must remain blocked.

## Review-thread state

### PR #1996

Two P1 threads are resolved and remain non-outdated:

- later edits made while DBT reconciliation is in flight are persisted before `flush()` succeeds;
- later edits made while the original file write is in flight are persisted before `flush()` succeeds.

One P2 thread is unresolved and non-outdated:

- `apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts` can report `synchronized` and discard a
  matching pending degraded/failure result when the editor changes away from and then back to the
  persisted bytes before reconciliation completes.

### PR #1993

All three actionable threads are resolved:

- manual file selection no longer snaps back to the contextual initial path;
- the router presentation proof is adapted to the jsdom/Node `AbortSignal` realm boundary;
- switching from Node Code to Project Code resets to the canonical project default.

### PR #1983

The prior localized-copy/security thread is resolved. The operational recovery view no longer renders
raw `Error.message` transport details to users.

## Previous finding disposition

| Finding | Current status | Evidence and correction |
| --- | --- | --- |
| Raw selection-recovery transport message reaches users | **Fixed** | Corrected in `55928c828`; localized product copy is used and raw transport detail is not rendered. |
| Manual project file selection snaps back | **Fixed** | Corrected in `aabaeb7d5`. |
| Project-scope switch retains stale node file | **Fixed** | Corrected in `d14bd8a04`. |
| Router navigation test breaks the presentation lane | **Fixed** | Corrected in `08fb34f67`. |
| Edit during persistence can be lost | **Fixed** | Corrected in `de5ecc459`; reducer and hook interleaving proof added. |
| Edit during reconciliation can be approved before second save | **Fixed** | Corrected in `2a895f85`; `flush()` forces the later save. |
| Pending reconciliation disappears after edit/revert | **Still active** | Directly reproducible from the scalar reducer and still represented by an unresolved PR #1996 P2 thread. |
| File receipt is not bound to exact whole-project revision | **Still active** | Canvas controller accepts `_receipt` but ignores it and performs a generic latest refetch. |
| Graph-first artifact publication can partially mutate workspace | **Still active** | `canvasPlanAction.ts` saves generated artifacts sequentially, while API already has an atomic batch port and gateway. |
| Release notes duplicate merge and parent outcomes | **Still active** | PR #1984 contains duplicate execution-selection recovery and reconciliation outcomes. |
| Exact release/main tree lacks attached validation evidence | **Still active** | Main has no connector-visible status; release head workflows are `action_required`. |
| Workspace accepted scale differs from interactive mutation/listing scale | **Still active** | Batch gateway defaults to 500 files, 1 MB/file, 5 MB/batch; previous accepted-project capability remains broader. |
| File-backed Preview/Run do not carry exact provenance | **Disproved as a broad claim** | `DbtProjectFileExecutionStrategy` already carries project content-set and analysis hashes into Preview provenance. The remaining gap is Code-to-project reconciliation/admission, not the absence of execution provenance. |
| A new mutation DSL is required | **Disproved** | Existing CAS file semantics, `WorkspaceFileBatchMutation`, `WorkspaceFileBatchReceipt`, `DbtProjectRevision`, and projection contracts are sufficient foundations. |

## Fowler-style code assessment

### 1. Responsibility overload and primitive obsession in `phase`

`CodeWorkingTreeSyncState.phase` currently represents local dirty state, active persistence, conflict,
write failure, pending DBT analysis, fresh analysis, degraded analysis, verification failure, and
superseded authority. Twelve strings form an implicit cross-product of two independent state machines.

This is not simply a long enum. It is responsibility overload and primitive obsession: transitions are
accepted or rejected based on a presentation string rather than the identity and state of the operation
that produced them.

The active defect follows from that representation:

1. bytes `A` are persisted and reconciliation is pending;
2. editing to `B` moves `phase` from `reconciling` to `modified`;
3. editing back to `A` chooses `persistedReconciliationPhase ?? 'synchronized'`;
4. no reconciliation result has completed, so the stored phase is `null`;
5. the later result is rejected because completion requires `phase === 'reconciling'`.

A branch added to the enum can patch this interleaving, but it cannot remove the underlying temporal
coupling.

### 2. Hidden whole-project authority

`useDbtProjectFileCanvasController.ts` defines:

```ts
async (_receipt: WorkspaceFileSaveReceipt) => {
  return projectDbtCodeReconciliationOutcome(await refreshProjectGraphSource());
}
```

The underscore is an honest signal: the receipt is ignored. The returned projection contains
`projectRevision.contentSetSha256` and `analysisSha256`, but the Code state does not retain an exact
accepted project revision after a fresh result.

A concurrent change to `schema.yml`, another model, a macro, or project configuration can therefore
make the refetched projection refer to a different project snapshot than the file save whose status is
being presented. Execution provenance remains exact, but the causal claim “this save reconciled to this
project revision” is not exact.

### 3. Leaky abstraction between Web single-file commands and API aggregate mutation

The Web port exposes only `saveFileContent`. Graph-first Preview therefore reads expected revisions and
writes each generated artifact independently. The API already owns the correct aggregate abstraction:

- `WorkspaceFileBatchMutation`;
- `WorkspaceFileBatchReceipt`;
- per-path preconditions and conflicts;
- an idempotency key;
- atomic replacement through `LocalWorkspaceFileBatchMutationGateway`.

The product is not missing atomic semantics. They are stranded behind the wrong application boundary.
Adding another Web-only transaction protocol would duplicate authority. The correct move is a protected
application command that adapts the existing batch port for DBT artifact publication.

### 4. View-owned orchestration and shotgun surgery

Recent narrow authoring corrections required coordinated edits across reducer, hook, views, Canvas
controller, status presentation, tests, Cypress support, architecture checks, Planning DB symbols,
evidence, and migrations. Governance should remain, but the authoring transaction lacks a cohesive
application owner, so each new interleaving reopens many surfaces.

The cure is not a generic framework. First stabilize the concrete state and revision contracts; only
then extract a project authoring session boundary from demonstrated SQL, YAML, Preview, and Run behavior.

### 5. Release truth drift

Release Please currently emits merge commits and their conventional parent commits as separate user
outcomes. The generated changelog is mechanically faithful to commit history but semantically wrong for
a product release. It also exposes dozens of implementation-level changes without grouping them into
user-visible capability outcomes and residual limits.

### 6. Test-only confidence and exact-tree evidence

PR #1996 had six successful workflows on its final head and includes meaningful reducer, hook, and live
workspace-file proof. That is valuable. Nevertheless:

- the known P2 interleaving is absent from the reducer tests;
- exact `main` has no attached connector-visible status;
- release head has no executed successful checks;
- root coverage enforcement still targets only `@dvt/engine` at 65/55/65/65.

DVT has strong selected vertical proofs but not yet one executable product release contract covering
Web, API, accessibility, performance, recovery, security, and exact artifact identity.

### 7. Stale current-state documentation

`docs/architecture/system-delivery-status.md` declares itself the current implementation snapshot but
was last reviewed on 2026-04-26. It predates the July DBT import, file-backed projection, Preview/Run,
YAML edit, Canvas authoring, and reconciliation delivery. Planning DB and recent evidence are more
current, but the human-facing document still claims current-state authority.

This is stale truth, not merely a documentation typo. Either regenerate it from current authorities or
stop labeling it current.

## Mature-system comparison: Match, Differentiate, Defer

The comparison is used to choose product invariants, not to imitate unrelated product surfaces.

| Reference | What the mature system demonstrates | DVT decision |
| --- | --- | --- |
| [dbt Studio / dbt tooling](https://docs.getdbt.com/) | A unified authoring surface still distinguishes editing, parsing/diagnostics, lineage, execution, and version-control workflows. | **Match** the separation of buffer, durable file, DBT analysis, project index, Preview/Run, and Git state. **Differentiate** with server-authoritative receipts and content hashes. Do not call durable file persistence a Git commit. |
| [VS Code source control](https://code.visualstudio.com/docs/sourcecontrol/overview) | Working changes, staged changes, commits, branches, conflicts, pull/push, and remote synchronization remain distinct operations. | **Match** explicit working-tree/conflict semantics. **Defer** full Git staging/commit UX until file/project authority is correct. |
| [Airflow DAG Bundles](https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/dag-bundles.html) | A run can be bound to a versioned collection of all files/resources it needs; Git bundles record an exact commit and reruns can use the original version. | **Match** exact whole-project revision admission for Preview/Run and reproducible rerun. Never execute an ambiguous “latest” project. |
| [Prefect deployment versioning](https://docs.prefect.io/v3/how-to-guides/deployments/versioning) | Deployment versions have history, rollback/promotion, source metadata, and can pin exact Git commits or immutable image digests. | **Match later** version history, promotion, and rollback for published DVT project revisions. First finish exact content-set receipts. |
| [Dagster](https://docs.dagster.io/) | Declarative assets, integrated lineage, observability, and testability organize data-product behavior around materialized assets rather than only tasks. | **Match selectively** for lineage, checks, freshness, partitions, and asset outcomes after authoring correctness. **Do not** force all DVT nodes into a Dagster clone or make asset modeling a prerequisite for safe editing. |
| [Temporal](https://docs.temporal.io/) | Durable execution resumes across failures and correlates work through durable workflow/activity identity. | **Match** durable operation identity, idempotency, retry correlation, and explicit supersession. Use Temporal as a reliability model, not as the Code UI state model. |
| [Apache NiFi version states](https://nifi.apache.org/nifi-docs/user-guide.html) | Versioned flows distinguish up-to-date, locally modified, stale, locally modified-and-stale, and sync failure. | **Match** orthogonal local/remote semantic truth and versioned aggregate publication. |
| [Apache NiFi Registry notice](https://nifi.apache.org/projects/registry/) | NiFi Registry was deprecated after a February 2026 vote; NiFi 2 directs users to Git-based Flow Registry clients. | **Differ** from the legacy registry architecture. Use Git/content-addressed aggregate revisions and receipts rather than building a separate central flow-registry product. |

### What DVT should not copy

- Do not copy Airflow's task-centric authoring model into the Canvas.
- Do not copy Temporal workflow history into browser presentation state.
- Do not build a separate NiFi-style registry when Git and existing workspace revisions already provide
  the stronger authority substrate.
- Do not make Dagster-style asset semantics mandatory for every graph node before the SQL/YAML
  transaction is safe.
- Do not expose infrastructure credentials or raw backend diagnostics merely because orchestration
  products have administrative configuration surfaces.

## Recommended implementation route

## Priority 0 — close CODE-RECON-03 with orthogonal state

### Severity and evidence

- Severity: **P2 user-visible correctness; release blocker**.
- Evidence: unresolved, non-outdated PR #1996 thread and direct reducer transition on current `main`.
- Scope: Code working-tree application model only; no release, batch publication, inventory, or generic
  framework work in the same PR.

### Root cause

Persistence posture and semantic reconciliation posture are encoded in one scalar phase. Receipt
matching is additionally gated by that presentation phase, so an edit can make a still-current result
inadmissible.

### User and product impact

A file can be displayed as synchronized while DBT analysis is still pending, invalid, stale,
unavailable, verification-unavailable, failed, or superseded. The user can navigate based on a false
status and later Preview/Run readiness can appear causally related to the wrong edit.

### Exact domain owner

- `apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts`
- `apps/web/src/app/views/code/useCodeWorkingTreeSync.ts`

Canvas remains an adapter that supplies reconciliation. It must not own the state machine.

### Proposed internal domain objects

```ts
type CodePersistenceState =
  | Readonly<{ kind: 'clean' }>
  | Readonly<{ kind: 'dirty' }>
  | Readonly<{
      kind: 'saving';
      requestId: number;
      content: string;
      expectedRevision: string;
    }>
  | Readonly<{ kind: 'conflict' }>
  | Readonly<{ kind: 'failed' }>;

type CodeReconciliationState =
  | Readonly<{ kind: 'not-required' }>
  | Readonly<{ kind: 'pending'; receipt: WorkspaceFileSaveReceipt }>
  | Readonly<{
      kind: 'fresh';
      receipt: WorkspaceFileSaveReceipt;
      projectContentSetSha256: string;
      analysisSha256: string;
    }>
  | Readonly<{
      kind: 'degraded';
      receipt: WorkspaceFileSaveReceipt;
      freshness: 'stale-last-valid' | 'invalid' | 'unavailable';
    }>
  | Readonly<{ kind: 'verification-unavailable'; receipt: WorkspaceFileSaveReceipt }>
  | Readonly<{ kind: 'superseded'; receipt: WorkspaceFileSaveReceipt; currentContentSha256: string }>
  | Readonly<{ kind: 'failed'; receipt: WorkspaceFileSaveReceipt }>;
```

`edited` changes persistence only. Reconciliation completion matches a receipt and changes
reconciliation only. A pure projection derives existing UI phases during compatibility migration.

### Command, query, and port changes

No external command/query or contract change is required in this PR. Reuse:

- `IWorkspaceFileContentCommandPort.saveFileContent`;
- `WorkspaceFileSaveReceipt`;
- the existing reconciliation callback;
- the existing file CAS semantics.

### Likely files

- `codeWorkingTreeSyncModel.ts`
- `codeWorkingTreeSyncModel.test.ts`
- `useCodeWorkingTreeSync.ts`
- `useCodeWorkingTreeSync.test.tsx`
- `CodeWorkingTreeStatus.tsx` and focused presentation tests
- one architecture test only if needed to preserve ownership
- Planning DB evidence/mechanization records required by current repository policy

### Compatibility and migration strategy

- Keep the current exported presentation phase as a derived compatibility view for callers.
- Do not persist either state object; no data migration is required.
- Convert reducer events one at a time and preserve current user copy.
- Do not add another boolean such as `isReconciliationPending`; that would retain duplicate authority.

### Rollback posture

The change is internal and non-persistent. A commit rollback restores the prior reducer. Before merge,
retain focused old-behavior tests for conflict, retry, navigation, and later edits so rollback risk is
bounded.

### Observability

Emit stable events or counters at the hook/application boundary:

- persistence started/succeeded/conflicted/failed;
- reconciliation started/fresh/degraded/failed/superseded;
- matching result accepted while buffer dirty/clean;
- result ignored due to receipt mismatch;
- reconciliation pending duration;
- edit-during-save and edit-during-reconciliation counts.

Do not log SQL content.

### Security implications

- Preserve sanitized user-facing diagnostics.
- Log opaque receipt identity, path-safe project identity, and hashes only.
- Never log source SQL, YAML content, credentials, or raw transport errors.

### Red tests before production code

1. `reconciling -> edit B -> edit A -> degraded invalid` ends `persisted_invalid`.
2. `reconciling -> edit B -> edit A -> fresh` becomes synchronized only after fresh completion.
3. failure after revert ends `reconciliation_failed`, not synchronized.
4. `flush()` can report byte durability without falsely asserting semantic freshness.
5. an older receipt remains ignored after a newer save receipt exists.
6. dirty buffer plus matching degraded result stores the semantic result and continues presenting dirty.
7. reverting the dirty buffer reveals the stored degraded result.
8. status announces pending analysis while bytes equal persisted content.

### Live browser/integration proof

Extend the protected DBT Code live vertical:

1. open a real model file;
2. save content `A` and hold DBT reconciliation open;
3. edit to `B`;
4. revert to `A`;
5. return invalid or unavailable analysis for the matching receipt;
6. verify the UI never announces synchronized and navigation copy reflects persisted-but-unresolved
   analysis;
7. repeat with a fresh result and verify synchronization only after completion.

No workspace-file read/write intercepts and no fake success path.

### Acceptance criteria

- no edit/revert interleaving loses a matching result;
- `synchronized` means bytes durable and reconciliation fresh or not required;
- invalid/stale/unavailable/failed/superseded truth survives local edits;
- navigation blocking remains based on durability, while status separately communicates analysis;
- reducer and hook tests are green;
- protected browser proof is green;
- PR #1996 P2 thread is answered with the fixing commit and resolved;
- exact final PR head has all applicable green workflows.

### Release gate

PR #1984 remains blocked until this slice is merged and its exact merge/release tree is validated.

## Priority 1 — bind file reconciliation to an exact project revision

### Severity and evidence

- Severity: **P1 project-integrity and reproducibility**.
- Evidence: the Canvas controller ignores `WorkspaceFileSaveReceipt`; the projection returns exact
  project and analysis hashes, but fresh Code state does not retain them.

### Root cause

The browser asks for “the latest projection” after a file save rather than asking the server to prove
which exact project content set includes the saved receipt. File causality and project analysis identity
are correlated by timing.

### User and product impact

A save of `models/orders.sql` can be durable while a concurrent `schema.yml` or macro change causes the
returned project projection to describe another snapshot. The run itself may still carry exact
provenance, but Code can claim the wrong causal relationship and Preview admission can silently refresh
to another revision.

### Exact domain owner

The owner should be the existing file-backed DBT project query/application rail, not a React view:

- contract: `DbtProjectGraphProjection.v1.ts` and existing `DbtProjectRevision`;
- API application: current `ProjectDbtGraphFromFiles` query rail;
- Web port: `IDbtProjectGraphQueryPort`;
- Canvas adapter: `useDbtProjectFileCanvasController.ts`;
- Code state: reconciliation state introduced by Priority 0.

### Proposed contract evolution

Do not create a parallel project-revision type. Version the existing query input or add a narrow
conditional reconciliation input:

```ts
type ExpectedSavedWorkspaceFile = Readonly<{
  path: string;
  contentSha256: string;
}>;

type ReconcileWorkspaceFileWithDbtProjectResult =
  | Readonly<{
      kind: 'fresh';
      saveReceipt: WorkspaceFileSaveReceipt;
      projectRevision: DbtProjectRevision;
      analysisSha256: string;
    }>
  | Readonly<{
      kind: 'degraded';
      saveReceipt: WorkspaceFileSaveReceipt;
      projectRevision: DbtProjectRevision;
      freshness: 'stale-last-valid' | 'invalid' | 'unavailable';
      diagnostics: readonly StableDbtDiagnostic[];
    }>
  | Readonly<{
      kind: 'superseded';
      saveReceipt: WorkspaceFileSaveReceipt;
      currentFileContentSha256: string | null;
      currentProjectContentSetSha256: string;
    }>
  | Readonly<{
      kind: 'verification-unavailable';
      saveReceipt: WorkspaceFileSaveReceipt;
    }>;
```

The server must verify the authoritative file still has the receipt hash and return the exact content
set it analyzed. Reuse the existing projection schema, diagnostics, and project revision.

### Command/query and port changes

- Extend the existing DBT project graph query input with an optional expected saved file condition, or
  add a versioned conditional query on the same `ProjectDbtGraphFromFiles` rail.
- Extend `IDbtProjectGraphQueryPort` with a typed conditional method; do not overload an untyped refetch.
- The Canvas controller passes the actual receipt instead of `_receipt`.
- Store accepted `projectRevision` and `analysisSha256` in Code reconciliation state.
- Preview and Run admission compare against the accepted project revision or explicitly refresh and
  present supersession.

### Likely files/components

- contracts planner projection/query input and tests;
- API DBT project graph query service and protected HTTP route tests;
- Web `dbtProjectGraph` port and API adapter;
- `useDbtProjectFileCanvasController.ts`;
- `dbtProjectCodeReconciliation.ts`;
- Code reducer/hook state and tests;
- `dbtProjectFileExecutionStrategy.ts` admission tests;
- strict live Code -> Preview -> Run proof.

### Compatibility strategy

- Keep unconditional graph reads for initial Canvas load.
- Add conditional reconciliation as an additive versioned input/result.
- Existing saved projects require no migration because revisions are computed from current content.
- Existing Preview provenance remains valid and becomes an admission target rather than being replaced.

### Rollback posture

- Additive contract version permits server and browser rollback independently during deployment.
- Fail closed when the conditional result cannot verify identity; never fall back to generic latest and
  call it fresh.

### Observability

- file receipt accepted/rejected;
- project content-set hash returned;
- project revision changed between save and analysis;
- Code/Preview and Code/Run revision mismatch;
- conditional verification unavailable duration and count.

### Security implications

- Hashes and opaque receipts are safe correlation metadata; source content is not.
- Diagnostics remain sanitized domain diagnostics.
- Project roots remain normalized and workspace-scoped.

### Red/green tests

- save model SQL, concurrently modify `schema.yml`, then complete analysis;
- prove the model save is durable but the result is superseded or explicitly identifies the newer
  content set;
- never claim the original save produced a project revision it did not analyze;
- Preview rejects or refreshes when its revision differs from Code's accepted revision;
- Run carries exactly the admitted Preview content-set and analysis hashes;
- conditional read failure cannot degrade to unverified synchronized state.

### Live proof

Use real API, workspace storage, DBT analyzer, Preview, Temporal Run, and persisted run provenance:

`edit model -> save receipt -> concurrent YAML mutation -> conditional reconciliation -> explicit
superseded state -> refresh -> Preview exact revision -> Run same revision -> reopen provenance`.

### Acceptance and release gates

- every fresh reconciliation has a retained exact project revision;
- a concurrent change to any project file is visible as a different revision;
- Preview/Run consume or reject that revision explicitly;
- no generic latest refetch is used as proof of a specific file save;
- final-head contract, API, Web, and live workflows are green.

## Priority 2 — publish graph-generated DBT artifacts atomically

### Severity and evidence

- Severity: **P1 data integrity** for the graph-first authoring path.
- Evidence: sequential `saveFileContent` loop in `canvasPlanAction.ts`; API already provides a complete
  atomic batch mutation abstraction and local gateway.

### Root cause

The Web application boundary exposes single-file writes only, so aggregate publication is orchestrated
in the view/application action rather than by a server-owned transaction.

### User and product impact

A conflict or failure after the first generated artifact can leave `dbt_project.yml`, model SQL, schema
YAML, or related artifacts from different graph revisions. Retry can duplicate or further mix writes.

### Exact domain owner

- API application command for workspace aggregate publication;
- existing `IWorkspaceFileBatchMutationPort` and `LocalWorkspaceFileBatchMutationGateway`;
- Web Canvas action as caller only.

### Proposed command

`PublishDbtWorkspaceArtifacts` is an application command name, not a new storage protocol. It maps to
existing `WorkspaceFileBatchMutation`:

```ts
type PublishDbtWorkspaceArtifacts = Readonly<{
  idempotencyKey: string;
  projectRoot: string;
  artifacts: readonly Readonly<{
    path: string;
    content: string;
    expectedRevision: ExpectedWorkspaceFileRevision;
  }>[];
}>;
```

The result should expose the existing batch receipt plus the exact resulting DBT project revision and
analysis identity after successful publication.

### Command/query and port changes

- protected API command route on the canonical workspace command surface;
- API application service validates paths/project root and calls `IWorkspaceFileBatchMutationPort`;
- Web port exposes one batch publication operation, not direct access to storage internals;
- `canvasPlanAction.ts` performs one command and one Preview using the returned revision;
- no per-artifact `readExpected...`/save loop remains.

### Compatibility and migration strategy

- preserve single-file command for Code editing;
- change graph-first publication only;
- no persistent data migration; existing receipts remain valid;
- derive a deterministic idempotency key from workspace, Canvas draft signature, project root, and
  intended artifact request hash.

### Rollback posture

- server command is additive;
- browser can be rolled back before old endpoint removal;
- never fall back to sequential writes after the batch command begins failing; fail closed.

### Observability

- batch started/applied/conflicted/failed/deduplicated;
- file count and byte count without content;
- conflict paths and current hashes;
- resulting project content-set and analysis hashes;
- retry latency and dedupe rate.

### Security implications

- normalize every path and enforce project-root/workspace scope before staging;
- reject traversal, duplicate paths, oversized files/batches, and inconsistent expected sets;
- never log artifact content or credential-bearing project configuration;
- preserve current secret-reference boundary.

### Red/green tests

- inject conflict on the second artifact and prove all original hashes remain unchanged;
- inject prepared-write failure and prove zero committed file changes;
- retry same key/request and receive the same deduplicated receipt;
- reuse key with different request and fail explicitly;
- path traversal and out-of-root paths fail before staging;
- Preview and Run use the batch receipt's resulting project revision.

### Live proof

`graph edit -> Preview -> atomic artifact publication -> DBT analysis -> persisted Preview -> Run ->
reopen exact files and provenance`, plus one conflict-injection run proving no partial files.

### Acceptance and release gates

- all-or-nothing mutation;
- one immutable receipt;
- idempotent retry;
- exact resulting project revision;
- no sequential generated-artifact write loop;
- final-head API, Web, integration, and strict browser lanes green.

## Priority 3 — extract a project authoring session boundary

### Severity and rationale

- Severity: **P2 maintainability and recovery**.
- Begin only after Priorities 0-2 are proven.

### Owner and responsibilities

Extract one application boundary that owns:

- current project revision;
- active file buffers;
- save receipts;
- semantic reconciliation outcomes;
- Preview/Run revision admission;
- navigation/close policy;
- crash-recovery posture.

Do not introduce a generic authoring framework first. Extract behavior already demonstrated by model SQL
editing, YAML description editing, and atomic artifact publication.

### Compatibility, rollback, observability, and security

- preserve existing ports as adapters around the new boundary;
- migrate one transaction at a time;
- no persisted schema change until a real recovery need is proven;
- retain opaque identities and sanitized diagnostics;
- measure orchestration duplication removed and interleaving coverage added.

### Acceptance gate

Adding a new supported DBT file edit should primarily extend one domain model/service and focused tests,
not reopen unrelated Canvas, router, and status orchestration.

## Priority 4 — repair and validate release 0.5.0

### Severity and evidence

- Severity: **P1 release integrity**.
- Duplicate user outcomes and six `action_required` workflows remain on PR #1984.

### Required work

1. merge or otherwise include the CODE-RECON-03 fix;
2. normalize merge/parent commits into one user outcome;
3. group notes by delivered product capability rather than implementation topology;
4. state remaining limits honestly;
5. execute every applicable workflow on the final release head;
6. bind tag target, release notes, source tree, and produced artifacts to the exact same SHA;
7. preserve machine-readable evidence for that exact target.

### Rollback and security

- no release tag until final gates pass;
- rollback means no tag/publication, not a follow-up correction release for a known blocker;
- release artifacts must exclude secrets and include provenance/checksum evidence.

### Acceptance gate

No known P1/P2 semantic-truth defect, duplicate outcome, unexecuted workflow, or ambiguous tag target.

## Priority 5 — make workspace capability truthful

### Severity and evidence

- Severity: **P1 product capability and scale truth**.
- Current batch gateway defaults to 500 files, 1 MB/file, and 5 MB/batch while accepted DBT project
  inspection has historically allowed a broader project envelope.

### Required outcome

- paginated file inventory;
- explicit complete/partial status;
- oversized-file result distinct from absence and transport failure;
- one effective policy shared by import, analysis, explorer, Code, and mutation;
- user-visible explanation when a project is accepted for one capability but not another;
- tests at 501 files, near accepted maximum, over 1 MB/file, and over batch byte limits.

### Migration, rollback, observability, and security

- additive result semantics first; do not silently truncate legacy clients;
- measure inventory size, truncation, oversized counts, and rejected mutations;
- never return filesystem paths outside the workspace or use pagination to bypass authorization;
- fail closed if completeness cannot be determined.

## Product-quality release contract after the correctness route

Once Priorities 0-2 are complete, create one executable scorecard rather than another prose-only quality
plan. It should bind the final release SHA to:

- contract/schema validation;
- API and Web coverage baselines and ratchets, not engine-only thresholds;
- strict protected browser authoring verticals;
- accessibility checks for critical Canvas/Code/Preview/Run transactions;
- bundle and interaction performance budgets;
- large-project graph and workspace inventory evidence;
- load, retry, crash-recovery, and multi-worker ordering evidence where relevant;
- dependency/security scans;
- OTel and operational canary evidence;
- exact artifact provenance and rollback instructions.

This work must not delay the narrow P2 fix. It is a release-system slice after correctness, not a reason
to expand Priority 0.

## PR decomposition

### PR A — fix pending reconciliation after edit/revert

- split persistence and reconciliation state;
- derive existing presentation phases;
- reducer/hook/status red-green tests;
- protected browser interleaving proof;
- resolve PR #1996 P2 thread;
- no external contract, release, inventory, or batch work.

### PR B — exact project revision reconciliation

- versioned conditional query input/result using existing project revision and diagnostics;
- API verification of saved file receipt and analyzed content set;
- Web query port and controller pass receipt rather than ignoring it;
- retain accepted revision in Code state;
- Preview/Run revision admission tests and live proof.

### PR C — atomic DBT artifact publication

- protected application command mapped to existing batch mutation port;
- Web batch publication adapter;
- remove sequential artifact loop;
- failure-injection, idempotency, conflict, path, and provenance tests;
- strict live atomic publication proof.

### PR D — truthful release 0.5.0

- normalized user outcomes;
- no merge-parent duplicates;
- final release head fully executed and green;
- exact tag/artifact/tree evidence;
- explicit residual capability limits.

### PR E — workspace inventory and limit truth

- pagination and completeness;
- oversized-file semantics;
- shared effective capability policy;
- API/Web/large-project proofs.

### PR F — executable product-quality scorecard

- API/Web coverage ratchets;
- accessibility and performance gates for critical flows;
- recovery/load/operability evidence;
- exact-release-SHA aggregation.

## Files the next implementation agent should inspect first

1. [`apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts)
2. [`apps/web/src/app/views/code/codeWorkingTreeSyncModel.test.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/code/codeWorkingTreeSyncModel.test.ts)
3. [`apps/web/src/app/views/code/useCodeWorkingTreeSync.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/code/useCodeWorkingTreeSync.ts)
4. [`apps/web/src/app/views/code/useCodeWorkingTreeSync.test.tsx`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/code/useCodeWorkingTreeSync.test.tsx)
5. [`apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts)
6. [`apps/web/src/app/views/canvas/dbtProjectCodeReconciliation.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/canvas/dbtProjectCodeReconciliation.ts)
7. [`packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts)
8. [`apps/web/src/app/views/canvas/dbtProjectFileExecutionStrategy.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/canvas/dbtProjectFileExecutionStrategy.ts)
9. [`apps/web/src/app/views/canvas/canvasPlanAction.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/canvas/canvasPlanAction.ts)
10. [`apps/api/src/application/ports/workspaceFiles.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/api/src/application/ports/workspaceFiles.ts)
11. [`apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.ts)
12. [`docs/adr/ADR-0060-dbt-project-authoring-authority.md`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/docs/adr/ADR-0060-dbt-project-authoring-authority.md)

## Final decision

There is no new runtime delivery to celebrate or re-litigate in this cycle. The validated route is:

1. fix the edit/revert reconciliation race by separating orthogonal state;
2. bind the resulting file receipt to an exact analyzed project revision;
3. publish graph-generated DBT artifacts through the existing atomic batch authority;
4. generate and validate a truthful exact-SHA release;
5. reconcile workspace capability limits;
6. then extract the authoring session boundary and product-quality scorecard.

Do not merge PR #1984 yet. Do not add another generic authoring abstraction, mutation language, or
registry product. Close one real user transaction at a time with exact revision identity, failure
injection, protected browser proof, and final-head CI evidence.
