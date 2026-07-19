---
title: DVT post-merge Fowler review and implementation route
date: 2026-07-19T22:17:00+02:00
status: current-review
reviewed_main_sha: 8eb0f5a7551d46c909a024b86f66cf3580c20691
scope: documentation-only
---

# DVT post-merge Fowler review and implementation route

## Purpose

This report is a point-in-time engineering review for the GPT currently implementing work in
`dunay2/dvt`. It reviews the exact current `main`, recent merged work, the release candidate, CI
identity, review threads, and the code paths that own DBT Code persistence, semantic reconciliation,
Canvas projection, Preview publication, and release truth.

It does **not** authorize a merge and does not replace Planning DB as the current work authority.
Its purpose is to provide verified intake, a concrete next implementation slice, and explicit evidence
for reconciling Planning DB tasks.

## Reviewed identities

- Repository: `dunay2/dvt`
- Exact current `main`: [`8eb0f5a7551d46c909a024b86f66cf3580c20691`](https://github.com/dunay2/dvt/commit/8eb0f5a7551d46c909a024b86f66cf3580c20691)
- Current main merge: [PR #1996 — Harden DBT code persistence reconciliation](https://github.com/dunay2/dvt/pull/1996)
- Previous reviewed product baseline: [`eb9a393edb01917be97437a2226c8a91791ff0e4`](https://github.com/dunay2/dvt/commit/eb9a393edb01917be97437a2226c8a91791ff0e4)
- Open release PR: [PR #1984 — Release 0.5.0](https://github.com/dunay2/dvt/pull/1984)
- Review branch: `agent/dvt-review-20260719-2217`

## Executive verdict

There is a real product advance since the previous review. `main` is seventeen commits ahead of
`eb9a393e` and now separates durable file persistence from asynchronous DBT reconciliation, guards
navigation while file writes are unresolved, preserves contextual targets through retry, rejects
stale receipt outcomes, restores live workspace-file proof, and fixes the prior localized selection
recovery leak.

However, `main` was merged with one non-outdated **P2 review thread still unresolved**. The current
state machine can still report `synchronized` and discard a pending invalid/stale/unavailable DBT
analysis outcome when the user edits during reconciliation and then returns the buffer to the already
persisted bytes before reconciliation completes.

That defect is not theoretical. It follows directly from the current reducer:

1. reconciliation is pending for saved bytes;
2. editing different bytes moves the scalar `phase` from `reconciling` to `modified`;
3. returning the buffer to `persistedContent` falls through to `synchronized` because
   `persistedReconciliationPhase` is still `null`;
4. the later reconciliation result is ignored because the reducer only accepts it while
   `phase === 'reconciling'`.

The code therefore still conflates two independent truths:

- working-tree persistence state;
- semantic DBT reconciliation state.

This is a classic Fowler smell: a single state variable has responsibility overload and temporal
coupling. It produces behavior that depends on the exact ordering of user edits and asynchronous
analysis events.

The release PR must not merge yet. It still duplicates execution-selection recovery in the notes and
all six visible workflows on its current head are `action_required`, so there is no successful
release-head validation evidence.

## Material delta since the previous review

### Delivered and verified

PR #1993 and PR #1996 together advanced `main` by seventeen commits. The relevant delivery includes:

- authoritative file saving separated from semantic reconciliation;
- explicit `synchronized`, `modified`, `syncing`, `reconciling`, conflict, failure, degraded,
  verification-unavailable, and superseded presentation states;
- file-switch, workbench-close, SPA-navigation, and retry guards;
- save-receipt correlation for asynchronous reconciliation outcomes;
- protection against edits made while persistence itself is in flight;
- protection against edits made while reconciliation is in flight;
- contextual file target retention across failed writes and retries;
- localized selection-recovery failure copy;
- expanded reducer, hook, CodeView, navigation, architecture, and protected-runtime tests.

The final PR #1996 head had six successful workflows:

- Contracts & Determinism;
- Dependency Review;
- Test Suite;
- CI - Code Quality;
- CodeQL;
- PR Quality Gate.

### Previous findings now fixed

#### FIXED — raw selection-recovery diagnostic leakage

The P2 thread from PR #1983 is resolved. The product now uses localized copy rather than rendering
raw `Error.message` transport detail to the user.

#### FIXED — latest edit lost while a persistence call is in flight

PR #1996 added a reducer and hook-level interleaving proof. If the editor changes after the bytes for
an earlier save have been captured, the latest buffer remains modified and a second save is required
before `flush()` succeeds.

#### FIXED — latest edit lost while DBT reconciliation is in flight

The reducer now returns a changed buffer from `reconciling` to `modified`, and save receipt matching
prevents an older reconciliation result from overwriting a newer save state.

#### FIXED — contextual file target discarded after a failed save

A requested file target is retained and applied once the retry successfully persists the current
buffer.

### Previous findings still active

#### ACTIVE — atomic artifact publication

Graph-first Preview still publishes generated DBT artifacts one file at a time in
[`canvasPlanAction.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/canvas/canvasPlanAction.ts).
Each artifact reads its expected revision and then calls `saveFileContent` sequentially. A conflict or
failure after the first write can therefore leave a partially updated project even though the
repository already has `IWorkspaceFileBatchMutationPort` and a local atomic batch gateway.

#### ACTIVE — exact whole-project revision binding

[`useDbtProjectFileCanvasController.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts)
accepts a `WorkspaceFileSaveReceipt` but currently ignores it:

```ts
const reconcileCodeFilePersistence = useCallback(
  async (_receipt: WorkspaceFileSaveReceipt) => {
    return projectDbtCodeReconciliationOutcome(await refreshProjectGraphSource());
  },
  [refreshProjectGraphSource]
);
```

The refetched projection returns `analysisSha256` and `projectContentSetSha256`, but the working-tree
state does not retain an exact fresh project revision. The result is correlated to a file save receipt,
not to a verified whole-project content set. A concurrent change to another file can therefore make a
fresh result refer to a different project snapshot than the operation the UI is describing.

#### ACTIVE — exact-main CI identity

The PR #1996 head is green, but the exact merge SHA currently published on `main` has no
connector-visible workflow runs or commit statuses. The product has PR-head evidence, not exact-tree
publication evidence.

#### ACTIVE — release candidate integrity

PR #1984 remains open and mergeable at the GitHub metadata level, but is not release-ready:

- the same selection-recovery outcome is listed twice, once for merge SHA `ec47025` and once for its
  parent `fa240f8`;
- the release notes expose implementation commit topology rather than a concise user outcome model;
- all six workflows on release head `15783c8d` are `action_required`;
- the release has no submitted review threads that explain or close these blockers.

#### ACTIVE — workspace capability truth

The previously identified mismatch between accepted DBT project scale and interactive workspace
listing/file limits has not been closed by the recent Code reconciliation work. It remains a separate
product slice and should not be hidden inside the reconciliation fix.

## New confirmed defect after PR #1996 merge

### CODE-RECON-03 — pending reconciliation disappears when the buffer reverts

- Severity: P2 correctness; release blocker because user-visible semantic status can lie.
- Review evidence: unresolved, non-outdated PR #1996 thread on
  `apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts`.
- Current main evidence:
  [`codeWorkingTreeSyncModel.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts).

### Reproduction as a reducer transition

Let persisted bytes be `A`.

1. User saves `A`; a DBT reconciliation receipt is pending.
2. While reconciliation is pending, user changes the editor to `B`.
3. The reducer moves from `reconciling` to `modified` but keeps `pendingReconciliation`.
4. Before reconciliation completes, user changes the editor back to `A`.
5. `reduceEditedValue` sees `value === persistedContent` and chooses
   `persistedReconciliationPhase ?? 'synchronized'`.
6. Because no reconciliation result has completed, `persistedReconciliationPhase` is `null`.
7. The UI now reports `synchronized` even though semantic analysis is still pending.
8. The later `reconciliation_completed` event is ignored because the reducer requires
   `state.phase === 'reconciling'`.
9. If the result was invalid, stale, unavailable, verification-unavailable, or superseded, that truth
   is silently dropped.

### Root cause

`CodeWorkingTreeSyncState.phase` is a product of two independent state machines but is stored as one
enum. Buffer edits can therefore erase semantic reconciliation posture.

This is not best solved by adding another branch to the existing enum. The robust correction is to
separate the axes and derive presentation from them.

## Fowler assessment

### Responsibility overload

`CodeWorkingTreeSyncState.phase` owns all of the following:

- local dirty state;
- active persistence;
- revision conflict;
- persistence failure;
- pending semantic reconciliation;
- fresh semantic reconciliation;
- degraded semantic reconciliation;
- verification failure;
- superseded authority.

That is too many reasons to change for one scalar field.

### Temporal coupling

Correctness depends on whether an edit event arrives before persistence acknowledgement, after
persistence but before reconciliation, or after reconciliation. The model has tests for several
interleavings, but the unresolved thread demonstrates that the state representation still permits
unmodelled interleavings.

### Primitive obsession

`phase` strings are being used as an implicit state machine protocol. The protocol is rich enough to
need typed domain objects for persistence and reconciliation identity.

### Shotgun surgery and governance amplification

The two recent product fixes add seventeen commits and migrations 758 through 772. The product
behavior improved, but each narrow interaction required changes across view orchestration, reducer,
hooks, tests, Cypress support, architecture tests, Planning DB evidence, and fifteen migrations.

The answer is not to remove governance. The answer is to stabilize a smaller application-domain
boundary so future interleavings are added to one model and one mechanization record instead of
repeatedly reopening many surfaces.

### Hidden authority

The current controller refetches the latest DBT graph after a save but ignores the save receipt when
constructing the reconciliation result. The UI exposes `projectContentSetSha256` in the outcome, yet
that identity is not retained as the exact revision consumed by Preview and Run.

### Release truth drift

Release Please currently treats merge commits and their conventional parent commits as separate user
outcomes. The generated changelog is mechanically correct at the commit-list level but wrong at the
product-outcome level.

## Recommended implementation route

## Phase 0 — immediate narrow hotfix for CODE-RECON-03

This should be the next functional PR. Do not mix atomic publication, release generation, workspace
pagination, or generic authoring abstractions into it.

### Domain owner

The owner remains the Code working-tree synchronization application model:

- `apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts`
- `apps/web/src/app/views/code/useCodeWorkingTreeSync.ts`

The Canvas controller remains an adapter that supplies reconciliation, not the owner of the state
machine.

### Minimal safe behavior

A pending reconciliation must remain visible and consumable whenever its receipt is still current,
regardless of whether the local buffer is dirty or happens to equal persisted bytes.

### Red tests

Add these tests before changing production code:

1. `reconciling -> edit B -> edit A -> degraded invalid` must finish in `persisted_invalid`.
2. `reconciling -> edit B -> edit A -> fresh` must finish in `synchronized` only after the fresh
   result arrives.
3. The reverted buffer must not make `flush()` claim semantic freshness; content durability and
   semantic freshness must be distinguishable.
4. A result for an older receipt must still be ignored after a newer save receipt exists.
5. A failed reconciliation after revert must finish in `reconciliation_failed`, not
   `synchronized`.
6. Code status presentation must announce pending analysis while bytes equal persisted content.

### Minimal production correction

Two approaches are possible.

#### Preferred correction: split orthogonal state now

```ts
type CodePersistenceState =
  | Readonly<{ kind: 'clean' }>
  | Readonly<{ kind: 'dirty' }>
  | Readonly<{ kind: 'saving'; requestId: number; content: string; expectedRevision: string }>
  | Readonly<{ kind: 'conflict' }>
  | Readonly<{ kind: 'failed' }>;

type CodeReconciliationState =
  | Readonly<{ kind: 'not-required' }>
  | Readonly<{ kind: 'pending'; receipt: WorkspaceFileSaveReceipt }>
  | Readonly<{
      kind: 'fresh';
      receipt: WorkspaceFileSaveReceipt;
      analysisSha256: string;
      projectContentSetSha256: string;
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

`edited` changes only the persistence axis. It must never clear reconciliation state.

`reconciliation_completed` matches the current receipt and updates only reconciliation state. It
must not require a particular persistence presentation phase.

A pure projection function derives the current UI status:

```ts
projectCodeWorkingTreeStatus({ persistence, reconciliation, value, persistedContent })
```

Recommended precedence:

1. conflict;
2. save failed;
3. saving;
4. dirty;
5. reconciliation pending;
6. reconciliation degraded or failed;
7. synchronized only when content is clean and reconciliation is fresh or not required.

#### Acceptable emergency correction: retain the enum temporarily

If the split is too large for an emergency PR, make the following invariants explicit:

- if `pendingReconciliation != null` and `value === persistedContent`, the phase cannot become
  `synchronized` until the matching reconciliation result completes;
- reconciliation completion/failure must be accepted by matching receipt even if the current phase
  is `modified` or `synchronized`;
- the outcome must update `persistedReconciliationPhase` independently;
- presentation can remain `modified` while dirty, then reveal the stored semantic outcome when the
  buffer becomes clean.

This smaller change is acceptable only with a follow-up task to split the state axes.

### Acceptance criteria

- no edit/revert interleaving loses a matching reconciliation result;
- `synchronized` always means bytes durable and semantic reconciliation fresh/not-required;
- invalid/stale/unavailable/superseded truth survives local edits;
- all tests run against the reducer and the hook, not only a mocked presentation;
- the unresolved PR #1996 thread is answered with the fixing commit and resolved;
- exact final-head CI is green before merge.

## Phase 1 — bind reconciliation to an exact project revision

After Phase 0, close the hidden whole-project authority gap.

### Required outcome

A file save receipt and the DBT graph projection must be joined into one revision-bound reconciliation
receipt. A generic latest refetch is insufficient.

### Repository-compatible contract

Reuse existing concepts rather than inventing a parallel mutation language:

- `WorkspaceFileSaveReceipt`;
- `DbtProjectRevision` / `projectRevision.contentSetSha256`;
- `DbtProjectGraphProjection.analysisSha256`;
- `ProjectDbtGraphFromFiles` query rail;
- existing file CAS semantics.

Recommended application result:

```ts
type ReconcileWorkspaceFileWithDbtProjectResult =
  | Readonly<{
      kind: 'fresh';
      saveReceipt: WorkspaceFileSaveReceipt;
      projectContentSetSha256: string;
      analysisSha256: string;
    }>
  | Readonly<{
      kind: 'degraded';
      saveReceipt: WorkspaceFileSaveReceipt;
      projectContentSetSha256: string;
      freshness: 'stale-last-valid' | 'invalid' | 'unavailable';
      diagnostics: readonly StableDbtDiagnostic[];
    }>
  | Readonly<{
      kind: 'superseded';
      saveReceipt: WorkspaceFileSaveReceipt;
      currentFileContentSha256: string;
      currentProjectContentSetSha256: string;
    }>;
```

### Mandatory checks

- the authoritative file still has `saveReceipt.contentSha256`;
- the projection identifies the exact project content set analyzed;
- a concurrent change to any project file cannot be represented as the original save's exact fresh
  project revision;
- the accepted project revision is retained in state and exposed to Preview/Run provenance;
- Preview and Run consume or explicitly reject the same project revision.

### Tests

- save model SQL, concurrently modify `schema.yml`, then complete analysis;
- assert the original file save is durable but the project reconciliation is superseded or points to
  the newer exact project revision;
- assert UI never claims the original save produced a fresh project revision it did not analyze;
- assert Preview blocks or refreshes when its project revision differs from Code's accepted revision.

## Phase 2 — atomic graph-first DBT artifact publication

Replace the sequential loop in `canvasPlanAction.ts` with the existing server-owned batch mutation
port.

### Command shape

```ts
type PublishDbtWorkspaceArtifacts = Readonly<{
  idempotencyKey: string;
  projectRoot: string;
  artifacts: readonly Readonly<{
    path: string;
    content: string;
    expectedRevision: WorkspaceFileExpectedRevision;
  }>[];
}>;
```

### Required properties

- one idempotency key;
- complete expected-revision set;
- all-or-nothing mutation;
- no partial workspace changes on any conflict or write failure;
- one immutable publication receipt;
- exact resulting project content-set identity;
- one DBT analysis identity for the published batch;
- retry returns the same receipt.

### Tests

- inject conflict on the second artifact and prove all original hashes remain unchanged;
- inject write failure after the first prepared artifact and prove zero committed changes;
- retry the same idempotency key and prove no duplicate mutation;
- Preview and Run use the batch receipt's project revision.

## Phase 3 — project authoring session boundary

Only after Phases 0–2, extract a stable application service that owns:

- current project revision;
- active file buffers;
- file save receipts;
- semantic reconciliation outcomes;
- Preview/Run revision admission;
- navigation and close policy;
- crash-recovery posture.

Do not introduce a generic framework first. Extract only common behavior already demonstrated by:

- model SQL Code editing;
- YAML model-description editing;
- atomic artifact publication.

This is the Fowler move from repeated temporal orchestration in views to a cohesive application
boundary.

## Phase 4 — release candidate integrity

Do not merge PR #1984 until:

1. CODE-RECON-03 is fixed and its thread resolved;
2. release notes deduplicate merge and parent commits into one user outcome;
3. current release workflows are approved/executed and all applicable checks succeed;
4. final release-head SHA is the exact tag target;
5. the tag target has machine-readable tree and artifact evidence;
6. release notes distinguish delivered file authority, graph-generated behavior, and remaining limits;
7. no known P1/P2 semantic-truth defect is hidden behind a green PR-head from an earlier SHA.

## Phase 5 — workspace capability truth

Then deliver the previously identified inventory/limit slice:

- paginated listing;
- explicit completeness status;
- oversized-file result distinct from absence/failure;
- shared effective policy between import, analysis, explorer, Code, and mutation;
- tests at 501 files, near accepted maximum, and above the interactive file-size threshold.

## Comparison with mature systems

### dbt Studio and professional IDEs

Mature editors distinguish:

- dirty editor buffer;
- content saved to disk;
- parser/compiler diagnostics;
- project index freshness;
- source-control state.

DVT should match that separation. It should not collapse saved bytes and successful DBT analysis into
one `synchronized` phase.

### Temporal

Temporal-style correctness comes from durable operation identity, idempotency, and explicit outcome
correlation. DVT already has save receipts and content hashes; it should extend those identities to the
whole project revision rather than correlate by timing.

### NiFi

NiFi treats flow publication as a versioned aggregate, not a sequence of unrelated successful file
writes. DVT should use an atomic project publication receipt for graph-generated artifacts.

### Dagster, Airflow, and Prefect

These systems bind execution to a concrete graph/code definition or deployment revision. DVT Preview
and Run should admit an exact DBT project content-set revision and reject stale or ambiguous state.

## Observability requirements

Add stable metrics/events at the application boundary:

- file persistence started/succeeded/conflicted/failed;
- reconciliation started/fresh/degraded/failed/superseded;
- reconciliation result ignored due to receipt mismatch;
- pending reconciliation duration;
- edit-during-save and edit-during-reconciliation counts;
- project-revision mismatch at Preview/Run;
- atomic batch conflict/failure/retry;
- release exact-SHA validation result.

Do not log source SQL or raw transport errors. Correlate by workspace, project content-set hash, analysis
hash, and opaque receipt identity.

## Security and privacy posture

- Preserve the newly fixed rule that user-visible copy does not expose raw `Error.message`.
- Diagnostics must be stable, sanitized domain diagnostics.
- Receipt and hash metadata can be logged; source content must not be logged.
- Batch publication must normalize and validate every path before preparing writes.
- Project roots must remain workspace-scoped and traversal-safe.

## PR decomposition

### PR A — fix pending reconciliation after edit/revert

- reducer and hook only;
- focused status projection changes;
- red/green reducer and hook interleaving tests;
- answer and resolve the PR #1996 P2 thread;
- no release-note or batch work.

### PR B — exact project revision reconciliation

- application contract/result;
- controller adapter uses the save receipt rather than ignoring it;
- exact file and project revision checks;
- Preview/Run revision admission tests;
- one protected live proof.

### PR C — atomic DBT artifact publication

- use existing batch mutation port;
- idempotent server command;
- failure-injection integration tests;
- Preview receipt/provenance wiring.

### PR D — truthful release 0.5.0

- normalized product outcomes;
- no merge-parent duplicates;
- all release workflows executed and green;
- exact tag-target evidence.

### PR E — workspace inventory truth

- pagination/completeness/oversized-file semantics;
- API, Web, and large-project proofs.

## Files the next implementation agent should inspect first

1. [`codeWorkingTreeSyncModel.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts)
2. [`codeWorkingTreeSyncModel.test.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/code/codeWorkingTreeSyncModel.test.ts)
3. [`useCodeWorkingTreeSync.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/code/useCodeWorkingTreeSync.ts)
4. [`useCodeWorkingTreeSync.test.tsx`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/code/useCodeWorkingTreeSync.test.tsx)
5. [`CodeWorkingTreeStatus.tsx`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/code/CodeWorkingTreeStatus.tsx)
6. [`useDbtProjectFileCanvasController.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts)
7. [`dbtProjectCodeReconciliation.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/canvas/dbtProjectCodeReconciliation.ts)
8. [`canvasPlanAction.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/canvas/canvasPlanAction.ts)
9. [`workspaceFiles.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/api/src/application/ports/workspaceFiles.ts)
10. [`LocalWorkspaceFileBatchMutationGateway.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.ts)
11. PR #1996 review threads
12. PR #1984 release notes and workflow approvals

## Final decision

DVT has made clear progress. The latest merge closes real data-loss races and improves semantic truth.
The project should not pivot to another broad feature now.

The next functional change must close the unresolved edit/revert reconciliation defect. Then bind Code,
Canvas, Preview, and Run to an exact whole-project revision, publish graph-generated artifacts
atomically, and only then cut `0.5.0`.

Do not merge the release while `synchronized` can still conceal a dropped reconciliation result or
while release-head workflows remain `action_required`.

## Documentation-only validation

This branch intentionally adds only this Markdown report. It changes no runtime code, workflow,
dependency, contract, migration, generated artifact, release metadata, or product behavior. Nothing is
merged by this report.
