---
title: DVT Fowler Repository Review 2026-07-19 20:37 CEST
status: Review
owner: Architecture / Web / API / Runtime / Governance
reviewed_main_sha: 353ac8c724e51e703eaa7c5b9ff5db657fafb5f7
reviewed_active_pr: 1996
reviewed_active_pr_sha: 2a895f85e1d2ddb6c11b6038c9b8ddf7fe363fce
planning_type: review
---

# DVT Fowler Repository Review — 2026-07-19 20:37 CEST

## 1. Executive verdict

This review was performed against the exact current `main` commit:

- [`353ac8c724e51e703eaa7c5b9ff5db657fafb5f7`](https://github.com/dunay2/dvt/commit/353ac8c724e51e703eaa7c5b9ff5db657fafb5f7)
- merge of [PR #1993 — Preserve DBT code reconciliation truth](https://github.com/dunay2/dvt/pull/1993)

There is **no new integrated product delta on `main`** since the preceding Fowler review. The exact main SHA is unchanged. There is, however, material and relevant branch work in [PR #1996 — Harden DBT code persistence reconciliation](https://github.com/dunay2/dvt/pull/1996), currently at:

- branch `fix/dbt-code-reconciliation-races`;
- head [`2a895f85e1d2ddb6c11b6038c9b8ddf7fe363fce`](https://github.com/dunay2/dvt/commit/2a895f85e1d2ddb6c11b6038c9b8ddf7fe363fce);
- eight commits ahead of current `main`;
- thirteen changed files;
- 1,021 additions and 42 deletions.

PR #1996 moves the product in the correct direction:

- byte persistence is no longer blocked on slower dbt semantic reconciliation;
- reconciliation results are correlated to a specific `WorkspaceFileSaveReceipt`;
- an edit made after byte persistence, while the prior receipt is reconciling, is returned to `modified` and saved again;
- a requested contextual file target survives a failed write and is applied after retry;
- all six visible workflows on the current PR head are green.

The PR is nevertheless **not merge-ready**. One unresolved P1 review thread identifies a real latest-buffer data-loss race. If the user edits again while `saveFileContent` is still in flight, the first `content_persisted` event moves the state to `reconciling` even though the editor contains newer unsaved bytes. `flush()` then returns `true` for `reconciling`, so file navigation or contextual workbench close may proceed before the latest buffer is persisted.

This is not a theoretical edge case. The state machine and the navigation contract currently combine to approve a buffer that is newer than the persisted receipt. Green broad CI did not detect it. That is exactly the kind of **test-only confidence** and state-transition blind spot a Fowler review should stop before merge.

The previous highest-priority architecture finding also remains active. PR #1996 rejects out-of-order results by **file save receipt**, but it still does not prove that the dbt project analysis is the current whole-project content set. The Canvas callback still ignores the receipt; the final authority check still re-reads only the edited file; `analysisSha256` and `projectContentSetSha256` are still discarded by the reducer. A concurrent modification to another project file can therefore leave Code displaying byte-level synchronization while Canvas or the retained analysis corresponds to an older project revision.

The release remains blocked. [PR #1984 — Release 0.5.0](https://github.com/dunay2/dvt/pull/1984) still contains duplicate logical changelog entries and its six visible workflows remain `action_required`. It must not be merged while PR #1996 has an unresolved P1 and while exact project-revision binding remains incomplete.

**Immediate recommendation:** fix the PR #1996 in-flight-write race in the existing `SaveWorkspaceFileContent` state machine and prove the exact close/navigation scenario before merge. Do not add another planning migration merely to describe the defect. After that, implement one revision-bound vertical transaction:

```text
SaveWorkspaceFileContent
  -> receipt-correlated project analysis
  -> final current project-revision verification
  -> retained analysis receipt
  -> Canvas / Preview / Run on the same content-set identity
```

No new save synonym, no new DSL, no second graph authority, and no broad product expansion should precede that transaction.

## 2. Review scope and evidence

The review inspected:

- the exact current `main` branch and recent commits;
- all confirmed open pull requests;
- PR-head CI/workflow runs and exact-main workflow visibility;
- unresolved and recently resolved review threads;
- current release state and changelog topology;
- the full PR #1996 diff and its branch implementation;
- current Code and file-backed Canvas state machines;
- workspace file ports, file CAS, dbt graph projection contracts, YAML mutation receipts, Preview/Run provenance requirements, and ADR-0060;
- current Web/API/runtime boundaries, tests, governance, documentation, accessibility, performance, security, data integrity, recovery, and operability posture;
- mature-system behavior from official dbt, Dagster, Airflow, Prefect, NiFi, Temporal, and VS Code documentation.

Key repository evidence:

- [ADR-0060 — dbt Project Authoring Authority](../../../adr/ADR-0060-dbt-project-authoring-authority.md)
- [`DbtProjectGraphProjection.v1`](https://github.com/dunay2/dvt/blob/353ac8c724e51e703eaa7c5b9ff5db657fafb5f7/packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts)
- [`DbtYamlDescriptionEdit.v1`](https://github.com/dunay2/dvt/blob/353ac8c724e51e703eaa7c5b9ff5db657fafb5f7/packages/@dvt/contracts/src/contracts/dbt-project/DbtYamlDescriptionEdit.v1.ts)
- [`CodeView`](https://github.com/dunay2/dvt/blob/353ac8c724e51e703eaa7c5b9ff5db657fafb5f7/apps/web/src/app/views/CodeView.tsx)
- [`useCodeWorkingTreeSync`](https://github.com/dunay2/dvt/blob/2a895f85e1d2ddb6c11b6038c9b8ddf7fe363fce/apps/web/src/app/views/code/useCodeWorkingTreeSync.ts)
- [`codeWorkingTreeSyncModel`](https://github.com/dunay2/dvt/blob/2a895f85e1d2ddb6c11b6038c9b8ddf7fe363fce/apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts)
- [`workspaceFileReconciliationAuthority`](https://github.com/dunay2/dvt/blob/353ac8c724e51e703eaa7c5b9ff5db657fafb5f7/apps/web/src/app/views/code/workspaceFileReconciliationAuthority.ts)
- [`useDbtProjectFileCanvasController`](https://github.com/dunay2/dvt/blob/353ac8c724e51e703eaa7c5b9ff5db657fafb5f7/apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts)
- [`dbtProjectCodeReconciliation`](https://github.com/dunay2/dvt/blob/353ac8c724e51e703eaa7c5b9ff5db657fafb5f7/apps/web/src/app/views/canvas/dbtProjectCodeReconciliation.ts)
- [`SaveWorkspaceFileContent` use case](https://github.com/dunay2/dvt/blob/353ac8c724e51e703eaa7c5b9ff5db657fafb5f7/apps/api/src/application/services/saveWorkspaceFileContentUseCase.ts)
- [`ProjectDbtGraphFromFiles` use case](https://github.com/dunay2/dvt/blob/353ac8c724e51e703eaa7c5b9ff5db657fafb5f7/apps/api/src/application/services/projectDbtGraphFromFilesUseCase.ts)
- [dbt YAML integrity/receipt derivation](https://github.com/dunay2/dvt/blob/353ac8c724e51e703eaa7c5b9ff5db657fafb5f7/apps/api/src/application/services/dbtYamlDescriptionEdit/dbtYamlDescriptionEditIntegrity.ts)
- [System Delivery Status](../../../architecture/system-delivery-status.md)
- [PR #1996](https://github.com/dunay2/dvt/pull/1996)
- [PR #1984](https://github.com/dunay2/dvt/pull/1984)

Official comparison sources:

- dbt Developer Hub / Studio IDE: <https://docs.getdbt.com/>
- Dagster product model: <https://docs.dagster.io/>
- Airflow DAG bundles: <https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/dag-bundles.html>
- Prefect deployments: <https://docs.prefect.io/v3/concepts/deployments>
- Prefect work pools: <https://docs.prefect.io/v3/concepts/work-pools>
- NiFi user guide: <https://nifi.apache.org/nifi-docs/user-guide.html>
- Temporal durable execution: <https://docs.temporal.io/>
- VS Code Hot Exit: <https://code.visualstudio.com/docs/editing/codebasics#_hot-exit>
- VS Code local history: <https://code.visualstudio.com/docs/editing/userinterface#_local-file-history>

## 3. Repository and delivery state

### 3.1 Current main and recent commits

Current `main` is exactly:

```text
353ac8c724e51e703eaa7c5b9ff5db657fafb5f7
```

The immediately relevant integrated sequence remains:

1. `aabaeb7` — preserve manual DBT code file selection;
2. `08fb34f` — harden router presentation proof;
3. `d14bd8a` — reset Project Code selection on scope change;
4. `353ac8c` — merge PR #1993.

No product commit has landed on `main` after `353ac8c`. The material movement is therefore branch work, not an integrated product change.

### 3.2 All confirmed open pull requests

| PR | State | Head | Purpose | Current judgement |
| --- | --- | --- | --- | --- |
| [#1996](https://github.com/dunay2/dvt/pull/1996) | Open, non-draft | `2a895f8` | Harden DBT Code persistence/reconciliation races | Material product work; six green workflows; **blocked by one unresolved P1 latest-buffer loss race**; does not close whole-project revision binding |
| [#1995](https://github.com/dunay2/dvt/pull/1995) | Open, draft | `b5daa81` | Previous Fowler review at the same main SHA | Historically useful; superseded as current route authority by this report and by the PR #1996 delta |
| [#1994](https://github.com/dunay2/dvt/pull/1994) | Open, draft | `e3efd67` | Older repository review at `main@eb9a393` | Stale baseline; should not be merged as current-state authority |
| [#1984](https://github.com/dunay2/dvt/pull/1984) | Open, non-draft | `976328b` | Release 0.5.0 | Not release-ready: duplicate semantic notes, six `action_required` workflows, and active product P1 work |

The accumulation of open review PRs is itself governance drift. Review documents are useful evidence, but several simultaneously open “current route” documents create competing truth. Keep the newest review as the current decision record and close or clearly supersede older review PRs rather than merging a historical sequence as if each were product delivery.

### 3.3 PR #1996 material delta

PR #1996 is eight commits ahead of current main and changes thirteen files:

- one live Cypress file;
- `CodeView.tsx` and its tests;
- the working-tree state model and tests;
- the working-tree orchestration hook and tests;
- one Canvas architecture test;
- five Planning DB migrations, numbered 767 through 771.

The branch changes are directionally correct:

1. `activePersistenceRef` is separated from per-receipt reconciliation promises.
2. Reconciliation outcomes now carry the originating receipt into the reducer.
3. Old reconciliation outcomes cannot overwrite a different pending receipt.
4. `flush()` can return after byte persistence while semantic analysis remains pending.
5. A second edit made after the first persistence completes but before analysis completes becomes `modified` and emits another conditional save.
6. A failed contextual file-selection transition is retained and retried after persistence succeeds.
7. The live proof reads generated workspace-file content rather than relying only on a presentation marker.

These are real product improvements. They are not sufficient for merge because the unhandled race happens one state earlier: while the first byte persistence is still in flight.

### 3.4 CI and exact-tree confidence

#### PR #1996 head

The current head `2a895f85e1d2ddb6c11b6038c9b8ddf7fe363fce` has six completed successful workflows:

- Dependency Review;
- Contracts & Determinism;
- Test Suite;
- CI — Code Quality;
- CodeQL;
- PR Quality Gate.

This is good evidence that the branch satisfies the automated suite currently configured for it. It is **not** evidence that the branch is functionally complete, because the latest Codex review found a valid P1 after those workflows passed.

That is the precise meaning of test-only confidence here: the suite proves many invariants, but the state machine still lacks the exact interleaving test that matters to a user closing or navigating away during a write.

#### Exact main SHA

The available commit-run inspection returned no workflow runs directly associated with `353ac8c`. The repository workflow configuration includes push-to-main validation, but this review could not independently retrieve the exact post-merge completion through the available connector endpoint.

The honest statement is therefore:

- PR #1993 head CI was green before merge;
- push-to-main validation is configured;
- exact post-merge run completion for `353ac8c` was not independently returned in this review;
- no claim is made that main CI failed or did not run.

#### Documentation review PRs

The current review PR heads show the expected documentation-only posture:

- PR Quality Gate and Code Quality succeeded;
- heavy workflows were skipped.

That is appropriate for docs-only review branches, but those results are not product evidence.

### 3.5 Review threads

PR #1996 has two material P1 review threads:

1. **Resolved:** an edit made after byte persistence while the prior receipt was reconciling remained `reconciling`, allowing `flush()` to approve unsaved content. The branch fixed this in `2a895f8` by returning the phase to `modified` and adding a second conditional-save proof.
2. **Unresolved:** an edit made while `saveFileContent` itself is still in flight can still be approved as persisted after the first receipt arrives. The current `content_persisted` reducer always chooses `reconciling` when reconciliation is enabled, regardless of whether `state.value` has advanced beyond `state.inFlight.content`. `flush()` returns `true` for `reconciling`.

The unresolved thread is [discussion `r3611103755`](https://github.com/dunay2/dvt/pull/1996#discussion_r3611103755).

No unresolved inline review threads were found on the release or documentation review PRs in the previous inspection. The three review findings on merged PR #1993 remain resolved.

### 3.6 Release state

The release PR remains at head:

```text
976328bd27ca1eddb70ad7ca06baf11659a0f971
```

All six visible workflows are `action_required`:

- Dependency Review;
- CI — Code Quality;
- PR Quality Gate;
- Contracts & Determinism;
- CodeQL;
- Test Suite.

The generated changelog still duplicates logical changes:

- `Add explicit DBT execution selection recovery` appears for both `ec47025` and `fa240f8`;
- `Preserve DBT code reconciliation truth` appears for both source commit `55928c8` and merge commit `353ac8c`.

This is not merely editorial. It exposes that release identity is derived from both source commits and conventional merge commits, so one logical PR can become multiple release entries. Rollback, audit, and user understanding all suffer.

Version 0.5.0 should not be cut until:

- PR #1996's unresolved P1 is fixed and merged;
- exact project-revision reconciliation is closed or explicitly deferred with truthful release scope;
- release notes are regenerated or deterministically deduplicated;
- all required workflows succeed on the exact release candidate tree.

## 4. Previous findings rechecked

| Previous finding | Current status | Current evidence and judgement |
| --- | --- | --- |
| Canvas and Project Code can be duplicate writable SQL authorities | **Fixed for file-backed Canvas** | ADR-0060 and the merged Canvas/Code work establish dbt files as semantic authority and Canvas as a projection. Unsupported visual mutations fail rather than writing a shadow graph. |
| Empty or stale duplicate SQL fields can overwrite canonical model SQL | **Fixed / superseded** | The duplicate node-workbench SQL authority was removed and canonical file-backed SQL is used. No new competing SQL field appears in PR #1996. |
| Byte persistence and valid dbt analysis are presented as the same success | **Fixed on main, but a new transition race is active** | Main now has explicit persisted-invalid/stale/unavailable/superseded states. PR #1996 correctly separates persistence latency from analysis, but its in-flight interleaving can still approve newer unsaved bytes. |
| Manual DBT file selection snaps back to contextual selection | **Fixed** | The explicit selection repair remains integrated. |
| Router presentation proof fails only under its exact environment | **Fixed** | The `AbortSignal` incompatibility was repaired and its review thread resolved. |
| Project Code selection survives scope reset incorrectly | **Fixed** | `d14bd8a` remains integrated. |
| No atomic cross-file mutation primitive exists | **Superseded as a blanket claim** | `IWorkspaceFileBatchMutationPort`, import, and governed YAML edits provide an atomic/idempotent cross-file boundary where required. |
| A Code save is proven against the exact current dbt project content set | **Still active** | Receipt correlation is improved in #1996, but the project callback ignores the receipt, file verification checks only one file, and project/analysis hashes are not retained. |
| Hard browser exit guarantees server persistence | **Still active; the guarantee is disproved** | `beforeunload` can warn but cannot await the asynchronous write. No crash-recoverable local draft exists. |
| Reconciliation is owned by a neutral application boundary | **Still active** | Canvas still imports a Code-view outcome and owns the reconciliation callback; CodeView still composes persistence, analysis, selection, status, and navigation. |
| Whole-project analysis is coalesced by project revision | **Still active** | Every accepted save may trigger a full analysis; #1996 separates promises but does not establish latest-revision coalescing. |
| Current status documentation is reliable current truth | **Still active** | `system-delivery-status.md` is marked Active/current but was last reviewed on 2026-04-26 and does not describe the July dbt file-authoring transaction. |
| Release 0.5.0 has one logical entry per change and verified exact-tree evidence | **Still active** | Duplicate entries and `action_required` workflows remain. |
| PR #1996 closes all reconciliation races | **Disproved** | It closes the post-persistence-edit race but leaves the edit-during-in-flight-write race unresolved. |

## 5. Actual product and architecture assessment

### 5.1 Authority model: the strategic decision is correct

ADR-0060 remains one of the strongest parts of the product architecture. It explicitly separates:

```text
graph-draft
dbt-project-files
```

A Canvas has exactly one authority. In file-backed mode:

- dbt files are product truth;
- server analysis produces `DbtProjectGraphProjection`;
- Canvas renders the projection;
- analyzer failure does not silently fall back to graph-draft;
- Preview must not regenerate or normalize the project files;
- project revision and analysis hash are provenance, not a second authority.

DVT should preserve this. Reversing to a generic visual graph that rewrites arbitrary dbt code would be a product dead end because macros, Jinja, packages, custom materializations, tests, and configuration cannot be represented losslessly by a generic node graph.

### 5.2 Contracts: the right identities exist, but their relationship is not owned

`DbtProjectGraphProjection.v1` already has a strong revision object:

```ts
DbtProjectRevision {
  projectRoot
  projectName?
  contentSetSha256
  analyzedAt
  analyzerVersion
  dbtVersion?
}
```

The projection also contains:

- `freshness`;
- `analysisSha256`;
- diagnostics;
- capabilities;
- authority binding.

The YAML description edit vertical is stronger than generic Code synchronization. `DbtYamlDescriptionAnalysisReceipt` binds:

- freshness;
- analysis hash;
- project content-set hash;
- target file content hash.

Applied and reverted YAML receipts prove that `targetContentSha256` equals the exact written revision.

The generic Code path already returns the same primitive hashes in `CodeWorkingTreeReconciliationOutcome.fresh`, but treats them as anonymous strings and discards them. This is primitive obsession: the values exist, but no transaction object owns the relationship between:

- the exact save receipt;
- the analyzed project content set;
- the final current project content set;
- the projection retained by Canvas;
- the Preview/Run identity.

The implementation route should reuse and generalize the existing YAML receipt vocabulary, not invent another unrelated hash protocol.

### 5.3 Web Code authoring: better state machine, still overloaded

The Code working-tree model has meaningful states:

- synchronized;
- modified;
- syncing;
- reconciling;
- conflict;
- failed;
- persisted stale/invalid/unavailable/verification unavailable/superseded.

This is directionally honest. PR #1996 improves the orchestration by separating active persistence from reconciliation and by matching outcomes to receipts.

The defect is that one `phase` still represents two orthogonal facts:

1. **buffer persistence posture** — is the latest editor value durably written?
2. **project analysis posture** — is the resulting dbt project analysis fresh, invalid, stale, unavailable, or superseded?

`flush(): Promise<boolean>` is therefore too primitive. In PR #1996, `true` can mean:

- latest bytes persisted and synchronized;
- latest bytes persisted but analysis pending;
- latest bytes persisted but analysis failed;
- latest bytes persisted but project invalid/stale/unavailable;
- latest bytes persisted but the saved revision was superseded.

That Boolean is then consumed by close and navigation as permission to unmount or switch files. The current P1 is a direct symptom of compressing two state axes into one phase and one Boolean.

### 5.4 Canvas composition: responsibility overload remains

`useDbtProjectFileCanvasController.ts` remains close to 500 lines and owns or coordinates:

- project graph query and projection;
- layout and viewport persistence;
- execution selection and recovery;
- graph validation;
- source-import focus;
- inspector and Code workbench state;
- Code-file reconciliation callback;
- execution strategy;
- Canvas command surfaces.

The reconciliation callback still has this essential shape:

```ts
async (_receipt) => projectDbtCodeReconciliationOutcome(await refreshProjectGraphSource())
```

It ignores the exact receipt and returns a Code-view-owned outcome. That is feature envy and a leaky abstraction: Canvas is performing application reconciliation because it happens to own the project query.

`CodeView.tsx` also remains overloaded. It owns route bootstrap, tree scoping, selection, file/history queries, editor buffer, persistence, reconciliation verification, status copy, retry, navigation guard, and layout composition.

Line count is not the primary problem. The problem is change amplification: one authoring invariant requires edits across Canvas, Code, ports, copy, tests, Cypress, architecture guards, and Planning DB.

### 5.5 API and workspace I/O: strong primitives, incomplete transaction

Positive foundations include:

- server-side tenant/project/environment scope;
- path validation and bounded workspace access;
- content SHA compare-and-swap;
- typed revision conflict;
- atomic local replacement;
- atomic/idempotent batch mutation for multi-file operations;
- deterministic project analysis identities;
- explicit invalid/stale/unavailable projection states;
- Preview/Run provenance contracts.

The gap is not lack of primitives. It is lack of one application transaction joining them.

Today the Code path is effectively:

```text
save file A -> receipt A2
analyze project -> projection P2
re-read file A -> still A2
mark Code synchronized
```

A write to file B can produce project P3 between analysis and final status publication. File A still equals A2, so the one-file check passes. The product has observed a valid P2 but has not proven that P2 is the current project revision at completion.

### 5.6 Preview and runtime: provenance intent is stronger than authoring proof

ADR-0060 correctly requires file-backed Preview to record:

- project root;
- project revision;
- analysis hash;
- runtime bundle identity using the same revision.

The repository has Preview provenance contracts and live Preview/Run proofs. Runtime foundations are materially stronger than the current editor transaction:

- immutable plan records;
- run snapshots/events;
- Postgres state/outbox foundations;
- Temporal worker and durable execution path;
- provider identity and cancellation semantics;
- artifact/provenance rails.

However, runtime durability does not repair editor durability or project-revision ambiguity. Temporal can resume a workflow after failure; it cannot recover an unsaved browser buffer or prove that Code's last “synchronized” badge referred to the same content set Preview consumed.

### 5.7 Tests: broad coverage, missing adversarial interleavings

The repository has extensive unit, contract, architecture, Cypress, live, governance, and CI coverage. That is a strength.

The failure mode is excessive confidence in named test surfaces rather than adversarial user transactions. PR #1996 passed all six workflows while the following interleaving remained untested:

```text
edit value A2
start SaveWorkspaceFileContent(A2)
edit value A3 while save A2 is in flight
resolve save A2 with reconciliation enabled
close or select another file
flush returns true at reconciling
A3 is not durably written before unmount
```

The suite has:

- a non-reconciliation test for an edit during an in-flight write;
- a reconciliation test for an edit after persistence while analysis is pending.

It lacks the combined case. The red test must model both dimensions together.

### 5.8 Governance: useful controls have become disproportionate

PR #1996 adds five Planning DB migrations and 718 lines of planning SQL within one unmerged branch. Those migrations account for roughly seventy percent of the branch additions.

The runtime/state-machine change is much smaller, yet the branch already contains:

- race intake;
- closeout;
- feature-symbol repair;
- follow-up edit guard;
- surface reconciliation.

An unresolved P1 was found after all of that mechanization.

This is a Fowler smell: **process and metadata are expanding faster than the invariant they claim to secure**. The Planning DB is useful, but repeated corrective migrations in the same unmerged slice are shotgun surgery and make review harder. Before merge, consolidate the unshipped planning history where repository policy permits, or at minimum stop appending migrations until the functional red test is closed.

### 5.9 Documentation truth is stale

`docs/architecture/system-delivery-status.md` says it is the current implementation snapshot, is marked `Active`, and has `last_reviewed: 2026-04-26`. It still reports April inventory and does not describe the July file-backed dbt authority, Code reconciliation, YAML editing, Preview/Run roundtrip, or active release posture.

The project now has many detailed review documents but no small tracked current-capability summary tied to an exact main SHA. Remote reviewers must reconstruct truth from code, Planning DB migrations, PRs, and generated local surfaces.

The correction is not another large review island. The repository needs one maintained current-status surface with:

- exact main SHA;
- current product transactions;
- known active blockers;
- links to canonical contracts and live proofs;
- generated timestamp and source command.

## 6. Fowler-style diagnosis

### 6.1 P1 state-transition race in PR #1996

**Smell:** temporal coupling, incomplete state transition, and test-only confidence.

The current reducer handles `content_persisted` as:

```text
if reconciliation required -> reconciling
else if current value == in-flight value -> synchronized
else -> modified
```

The comparison with `state.value` is only applied when reconciliation is not required. That means reconciliation masks the fact that the user typed a newer buffer while the write was in flight.

The later `flush()` contract returns `true` for `reconciling`, correctly intending “bytes are durable; analysis can continue.” But in the failing interleaving, the bytes that are durable are not the latest editor bytes.

The fix is narrow and should remain in PR #1996:

```text
content_persisted:
  update persistedContent and persistedRevision from the completed request
  retain/start reconciliation for that receipt
  if current editor value != completed request content:
      buffer persistence posture = modified
  else:
      buffer persistence posture = clean
```

The old receipt's analysis may complete in the background, but it must not convert a newer dirty buffer to synchronized. `flush()` must continue through a second conditional save before returning persistence success.

### 6.2 Boolean `flush` and single-phase primitive obsession

**Smell:** primitive obsession and responsibility compression.

A `boolean` cannot express why navigation is allowed or blocked. The code needs at least a typed persistence result:

```ts
type FlushWorkspaceFileResult =
  | {
      kind: 'persisted';
      receipt: WorkspaceFileSaveReceipt;
      analysis: 'pending' | 'not-required';
    }
  | { kind: 'blocked'; reason: 'conflict' | 'write-failed' };
```

Longer term, state should be orthogonal:

```ts
type BufferPersistenceState =
  | { kind: 'clean'; persistedRevision: string }
  | { kind: 'dirty'; persistedRevision: string }
  | { kind: 'saving'; requestId: number; content: string; expectedRevision: string }
  | { kind: 'conflict'; persistedRevision: string }
  | { kind: 'failed'; persistedRevision: string };

type ProjectAnalysisState =
  | { kind: 'idle' }
  | { kind: 'pending'; receipt: WorkspaceFileSaveReceipt }
  | { kind: 'fresh'; receipt: DbtProjectFileAnalysisReceipt }
  | { kind: 'stale'; receipt: WorkspaceFileSaveReceipt }
  | { kind: 'invalid'; receipt: WorkspaceFileSaveReceipt }
  | { kind: 'unavailable'; receipt: WorkspaceFileSaveReceipt }
  | { kind: 'superseded'; receipt: WorkspaceFileSaveReceipt };
```

The UI can derive current labels from the pair without allowing analysis posture to overwrite persistence truth.

### 6.3 Receipt correlation is not project-revision verification

**Smell:** partial invariant mistaken for the complete transaction.

PR #1996 correctly correlates async outcomes by `WorkspaceFileSaveReceipt`. This prevents an old outcome for A2 from overwriting a pending receipt A3.

It does **not** prove that the analyzed project revision is current because:

- Canvas ignores the receipt;
- project analysis can include or miss concurrent changes to other files;
- the final verification only checks the target file path/hash;
- the reducer clears the receipt and discards project/analysis hashes on `fresh`;
- Preview has no retained Code reconciliation receipt to compare.

The correct domain statement is not “this receipt's callback completed.” It is:

> The exact target file revision was present in project content set P, project analysis A was computed for P, and P was still the current authoritative project content set when reconciliation completed.

That statement needs a server-owned receipt.

### 6.4 Ephemeral editor status is not durable project truth

**Smell:** presentation state used as domain state.

A degraded analysis outcome is held in the mounted Code editor state. Navigation is allowed after bytes persist even when analysis fails or is invalid. When another file is selected, the old editor state is replaced. Reopening the original file creates a new state from file content and starts at byte-level `synchronized` without retaining the previous analysis receipt.

It is reasonable to allow navigation after durable persistence. It is not reasonable to treat per-file mounted component state as the authoritative project-analysis record. Project analysis freshness belongs to the project authoring session/query cache and must survive file switches.

### 6.5 Whole-project analysis on high-frequency edits

**Smell:** whole-aggregate work triggered by a fine-grained UI event.

The debounce is 400 ms. Each accepted save can trigger full `ProjectDbtGraphFromFiles` analysis. Separating persistence and analysis improves responsiveness, but it does not reduce analyzer load.

The mature pattern is:

- persist safely and quickly;
- record the latest requested project revision;
- coalesce analysis requests by revision;
- discard or avoid starting already-superseded work;
- force exact current-revision validation at Preview admission;
- expose `analysis pending` honestly.

DVT should not fake incremental dbt parsing unless the analyzer owns it. Revision coalescing is enough for the next slice.

### 6.6 View-to-view application orchestration

**Smell:** feature envy and leaky abstraction.

Canvas imports a result type owned under `views/code`, and CodeView receives a reconciliation callback from Canvas because Canvas owns the query. This creates a message chain across presentation components.

The operation belongs to a neutral `Workspace Project Authoring` application boundary. Canvas and Code should be adapters:

- Code submits buffer/file mutation intent and renders persistence posture;
- the application service reconciles project analysis and retains the receipt;
- Canvas subscribes to the verified projection;
- Preview consumes the verified revision.

### 6.7 Release topology duplicates truth

**Smell:** duplicate representation and stale truth.

Release Please is seeing both source conventional commits and conventional merge commits. One logical PR becomes multiple changelog lines. The release PR then becomes a topology dump rather than a product narrative.

Choose one release identity policy:

- squash merge to one conventional commit per PR; or
- non-conventional merge commits with conventional source commits; or
- a release-note generator keyed by PR identity rather than every conventional commit.

Then enforce deterministic duplicate detection.

### 6.8 Product dead ends to avoid

Do not respond to current gaps by:

- creating a DVT-specific replacement for dbt SQL/Jinja/YAML;
- allowing file-backed Canvas to regenerate arbitrary projects;
- adding a second save command or user-facing manual Save lifecycle;
- labeling working-tree persistence as Git commit/push synchronization;
- starting a broad asset catalog before source/run identity is exact;
- adding another runtime provider before one authoring-to-run vertical is complete;
- using Temporal durability as justification for ignoring browser/editor recovery;
- treating Planning DB symbol coverage as proof that the user transaction is complete.

## 7. Mature-system comparison

DVT should match mature systems where trust and reproducibility are universal requirements. It should differ where its explicit code/graph authority model is a genuine advantage, and defer breadth that does not close the current transaction.

| System | Mature behavior | DVT should match | DVT should differ or defer |
| --- | --- | --- | --- |
| dbt Studio / dbt tooling | Studio provides one web IDE for building, testing, running, and version-controlling dbt projects; current tooling emphasizes fast validation and lineage | Exact project revision, actionable dbt diagnostics, code/graph parity, Git-aware but truthful status, Preview/Run tied to code identity | Do not invent a DVT language or normalize arbitrary dbt projects through Canvas; files remain authority |
| Dagster | Asset-centered lineage, integrated observability, declarative model, and testability | Node/asset evidence, run-to-source navigation, checks tied to exact source identity | Defer a broad asset catalog until file/Preview/Run provenance is exact |
| Airflow 3 | Versioned DAG bundles allow a run to use the same code for the whole run; Git bundles record the commit used | Pin Preview and Run to one immutable project content set; retain reproducible rerun identity | Do not copy DAG authoring or scheduler UX; reuse DVT plan/runtime contracts |
| Prefect | Deployments capture when, where, and how a flow runs; deployment versions and work pools govern code/infrastructure identity | Explicit environment/deployment identity, readiness, versioned execution configuration, governed infrastructure posture | Defer broad infrastructure templating until one runtime target is professionally complete |
| NiFi | Version states distinguish up-to-date, locally modified, and stale; users can show, revert, and commit local changes; provenance supports troubleshooting and lineage | Visible local/conflict/stale posture, reviewable changes, recovery, provenance, back-pressure where relevant | Do not use Canvas as a lossy generator for code constructs it cannot represent |
| Temporal | Durable execution resumes after process, network, or infrastructure failure | Runtime idempotency, retries, operation identities, event history, exact run provenance | Temporal runtime durability does not solve editor buffer durability or Git lifecycle |
| VS Code / professional IDEs | Hot Exit restores unsaved changes; local history supports compare and restore; Git states remain distinct | Crash recovery, local history/diff, three-way conflict handling, explicit working-tree vs Git status | Do not expose fake stage/commit/push actions before a real Git connector and accepted rails exist |

DVT's differentiator is not “visual data workflows” in the abstract. NiFi, Dagster, dbt Canvas, and others already provide strong visual or lineage surfaces. DVT's defensible route is:

- mutually exclusive graph-draft and file-backed authority;
- lossless capability-scoped visual editing;
- one revision identity across Code, Canvas, Preview, execution, and evidence;
- professional recovery and conflict semantics;
- runtime durability and provenance underneath.

## 8. Priority implementation route

### Priority 0 — Close PR #1996 latest-buffer loss before merge

**Severity:** Critical / P1 merge blocker.

#### Evidence

- `content_persisted` selects `reconciling` whenever reconciliation is enabled.
- It does not check whether `state.value` differs from the completed `inFlight.content`.
- `flush()` returns `true` for `reconciling`.
- close/file-selection flows rely on `flush()` before unmount or transition.
- the exact unresolved review thread is still open.
- all broad workflows are green, proving the missing interleaving is not covered by current gates.

#### Root cause

Persistence posture and semantic-analysis posture are compressed into one phase. The first write completion starts reconciliation and masks a newer dirty buffer.

#### User/product impact

The latest SQL/YAML/text edit can be lost when a user:

1. types;
2. autosave starts;
3. types again before the request returns;
4. closes the contextual Code workbench or selects another file after the first receipt arrives.

The product may permit navigation because older bytes were persisted, not because the latest editor value was persisted.

#### Exact domain owner

Web `Code Authoring Session`, using the existing Workspace File I/O command port. The fix does not belong to Canvas, API analysis, or Git lifecycle.

#### Existing contracts/domain objects to reuse

- `WorkspaceFileSaveReceipt`;
- `SaveWorkspaceFileContent`;
- content-SHA compare-and-swap;
- current `inFlight.content` and `state.value`;
- receipt-correlated reconciliation introduced in PR #1996.

#### Proposed state/contract change

Minimal repair in the current PR:

- on `content_persisted`, always update `persistedContent` and `persistedRevision` from the completed request;
- start/retain reconciliation for that receipt;
- set persistence posture to `modified` whenever `state.value !== state.inFlight.content`;
- allow `flush()` to loop and issue the second conditional write;
- old receipt analysis must not clear or overwrite the newer dirty state.

Near-term hardening after the minimal fix:

- replace Boolean `flush` with a typed persistence result;
- separate buffer persistence state from project analysis state.

#### Command/query and port changes

None for the minimal fix. `SaveWorkspaceFileContent` remains the only write rail. Do not create `SaveCodeBuffer`, `PersistEditorFile`, or a manual Save command.

#### Likely files/components

- `apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts`;
- `apps/web/src/app/views/code/codeWorkingTreeSyncModel.test.ts`;
- `apps/web/src/app/views/code/useCodeWorkingTreeSync.ts`;
- `apps/web/src/app/views/code/useCodeWorkingTreeSync.test.tsx`;
- `apps/web/src/app/views/CodeView.test.tsx`;
- contextual Canvas close integration test if the existing CodeView proof cannot model unmount.

#### Migration/compatibility strategy

No API, persistence, or contract migration. This is an internal state-machine correction.

Planning DB migrations 767–771 are not shipped. Do not append a sixth migration to describe this finding. Amend/consolidate the unmerged branch's mechanization according to repository migration policy after the code is correct.

#### Rollback posture

Rollback is the current main behavior, which waits for reconciliation and avoids this specific early-return race but has worse latency. If the decoupling must be reverted, keep the truthful persisted-invalid/stale/unavailable states from #1993.

#### Observability

Add content-free counters/timing only if existing Web telemetry supports them:

- persistence command started/completed/failed;
- buffer advanced during in-flight write;
- chained save count;
- navigation flush blocked by conflict/failure;
- reconciliation result ignored because receipt is obsolete.

Never log file content or full SQL.

#### Security implications

No new authorization surface. Preserve server CAS and scope. A client request ID or receipt key is concurrency correlation, not authorization.

#### PR decomposition

Keep this in PR #1996:

1. add the exact red reducer test;
2. add the exact hook interleaving test;
3. fix `content_persisted` transition;
4. prove close/file navigation waits for the second save;
5. resolve the P1 thread;
6. rerun exact spec, Web CI, live proof, and prepush.

Do not split the bug into another branch while #1996 is open.

#### Red tests

- start save A2, edit A3 while save A2 is pending, resolve A2 with reconciliation enabled: state must be `modified`, not `reconciling` as the effective persistence posture;
- call `flush()` after A2 resolves: it must issue save A3 before returning `persisted`/`true`;
- request file B while A2 is pending and edit A3: file B must not mount until A3 is persisted or an explicit conflict/failure is shown;
- resolve A2 reconciliation after A3 is current: it must not clear A3 or report synchronized.

#### Green/live proof

In a real browser/API session:

1. delay the first save response;
2. type edit A2;
3. type edit A3 while A2 is in flight;
4. close the contextual workbench or select another file;
5. release A2;
6. prove a second CAS write stores A3;
7. prove the workbench transition occurs only after A3's receipt;
8. reopen the file and verify exact A3 bytes.

#### Acceptance criteria

- no navigation/close permission for a buffer newer than the latest persisted receipt;
- no old reconciliation outcome can overwrite current buffer or receipt state;
- one canonical save command;
- exact unresolved P1 thread resolved with commit and tests;
- all six workflows green on the final reviewed head.

#### Release gate

PR #1996 must not merge until the exact interleaving is covered and the unresolved P1 is closed. Release #1984 must not proceed before the fix is integrated.

### Priority 1 — Bind Code reconciliation to the exact current project revision

**Severity:** Critical / P1 data-integrity and provenance gap.

#### Evidence

- `DbtProjectGraphProjection` exposes `DbtProjectRevision.contentSetSha256` and `analysisSha256`.
- Code's `fresh` outcome carries both hashes.
- the reducer discards them.
- Canvas reconciliation ignores the save receipt.
- final verification re-reads only the target file.
- ADR-0060 requires Preview and runtime bundle to use the same project revision and analysis identity.

#### Root cause

File CAS, project analysis, and final current-project verification are separate observations owned by presentation callbacks. No server/application receipt joins them.

#### User/product impact

In multi-tab, multi-user, source-import, or automated-file-change scenarios:

- Code can show byte-level synchronization for file A;
- Canvas can retain project projection P2;
- another file mutation can make current project P3;
- Preview may later refresh to P3;
- the user has no stable explanation of which revision the badge, graph, preview, or run represented.

This undermines reproducibility and makes conflict diagnosis harder.

#### Exact domain owner

`Workspace Project Authoring` application boundary, jointly implemented by:

- API Workspace I/O;
- dbt Integration/Analyzer;
- Web application service/adapters.

It must not be owned by Canvas or Code presentation.

#### Existing contracts/domain objects to reuse

- `WorkspaceFileSaveReceipt`;
- `DbtProjectRevision` from `DbtProjectGraphProjection.v1`;
- `analysisSha256`;
- `DbtYamlDescriptionAnalysisReceipt` shape and target-revision binding;
- `IWorkspaceFileBatchMutationPort` for actual multi-file commands;
- ADR-0060 authority binding;
- existing Preview provenance contracts.

#### Proposed contract/domain object

Generalize the existing analysis-receipt vocabulary rather than creating an unrelated hash tuple:

```ts
type DbtProjectFileAnalysisReceipt = Readonly<{
  schemaVersion: 'dbt-project-file-analysis-receipt.v1';
  target: Readonly<{
    path: string;
    contentSha256: string;
  }>;
  projectRevision: DbtProjectRevision;
  analysisSha256: string;
  freshness: 'fresh' | 'stale-last-valid' | 'invalid' | 'unavailable';
  verifiedCurrentProjectRevision: boolean;
}>;
```

A `fresh` receipt is valid only when:

1. the analyzer snapshot contains the exact target file revision;
2. the analysis hash is derived from that snapshot;
3. a final server-side project-content-set observation equals the analyzed `contentSetSha256`.

If the current content set differs, return a typed superseded result and optionally schedule/coalesce another analysis. Do not call it fresh.

#### Command/query and port changes

Reuse existing rails:

- keep `SaveWorkspaceFileContent` unchanged as the generic conditional file mutation unless the repository can cheaply expose a generic post-write project observation without dbt coupling;
- extend `ProjectDbtGraphFromFiles` or its application orchestration with a strict reconciliation mode accepting the target save receipt;
- verify that the target revision exists in the analyzed snapshot;
- verify the analyzed content set is still current before returning a fresh receipt;
- expose one neutral Web port, for example `IWorkspaceProjectFileReconciliationPort`, returning the shared receipt;
- retain the receipt in project-authoring state;
- make Preview compare/refresh against the retained current revision.

Do not add a second query that computes a competing project hash. Reuse the same content-set calculation used by `DbtCliProjectAnalyzer`/`DbtProjectRevision`.

#### Likely files/components

- `packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts` or a focused dbt-project receipt contract;
- `apps/api/src/application/ports/dbtProjectAnalysis.ts`;
- `apps/api/src/application/services/projectDbtGraphFromFilesUseCase.ts`;
- analyzer/repository content-set observation surface;
- API route/schema for project graph reconciliation;
- `apps/web/src/app/ports/` neutral project-authoring port;
- `apps/web/src/app/services/dbtProject/` API adapter;
- `useCodeWorkingTreeSync` consumer adapter;
- `useDbtProjectFileCanvasController` reduced to projection consumption;
- Preview admission/provenance comparison.

#### Migration/compatibility strategy

- add a versioned receipt schema;
- accept the prior response for one compatibility window only as `verification-unavailable`, never as fresh current truth;
- keep file CAS unchanged;
- keep existing YAML receipt contracts valid;
- migrate YAML and generic Code internals toward one shared analysis-receipt primitive only after compatibility tests pass;
- do not change graph-draft authority mode.

#### Rollback posture

A feature flag at API/Web composition may disable strict project-current verification, but fallback must report `verification unavailable`, not `fresh`. Persisted files remain durable because analysis is observational and never compensates by rewriting user content.

#### Observability

Emit content-free correlated events:

- `workspace.file.save.completed` — operation ID, path hash, disposition, latency;
- `dbt.project.analysis.started/completed` — project revision prefix, duration, file/resource count, freshness;
- `dbt.project.reconciliation.superseded` — analyzed/current revision prefixes;
- `preview.project_revision.accepted/rejected`;
- correlation from save receipt to Preview/Run receipt.

Never emit SQL/YAML, credentials, full tenant IDs, filesystem roots, or secret-bearing diagnostics.

#### Security implications

- project revision must be server-computed;
- expected hashes are concurrency preconditions, not authorization;
- preserve tenant/project/environment scope at each call;
- retain path traversal, symlink, generated-path, dependency-path, and bounded traversal protections;
- redact diagnostics and telemetry;
- ensure `profiles.yml`, resolved secrets, and editor-private layout remain excluded from bundles.

#### PR decomposition

1. **PR A — shared receipt contract:** versioned project-file analysis receipt and compatibility/negative tests.
2. **PR B — strict server reconciliation:** target receipt in analyzer snapshot plus final current content-set verification.
3. **PR C — neutral Web port/state:** retain receipt outside Canvas/Code presentation and forbid Canvas importing Code internals.
4. **PR D — Preview/Run gate:** compare or refresh exact revision and prove runtime bundle equality.
5. **PR E — two-context live proof and telemetry.**

Each PR should be independently releasable and avoid unrelated Canvas layout or runtime-provider changes.

#### Red tests

- save A2, mutate B before analysis completes, analyze P2/P3 interleavings: never return fresh for a non-current content set;
- analyzer snapshot lacks target A2: return superseded/inconsistent, not fresh;
- analyze P2, mutate B to P3 before final verification: return superseded;
- compatibility response has no verified current revision: Web shows verification unavailable;
- Preview holds P2 while current project is P3: reject or force strict refresh;
- wrong tenant/project/environment cannot use a valid hash to cross scope.

#### Green tests

- save A2, analyze exact current P2 containing A2, verify P2: return fresh receipt with target/file/project/analysis identities;
- invalid analysis preserves A2 and returns invalid P2 receipt;
- unavailable analyzer preserves A2 and reports durable-but-unverified;
- source import invalidates prior receipt and produces a new revision;
- unchanged file save/reconciliation can deduplicate safely by exact identity;
- Preview and Run use the same content-set identity.

#### Live browser/integration proof

Use two browser contexts against real API rails:

1. open the same dbt project in both;
2. edit model A in context 1;
3. mutate model B or YAML in context 2 during reconciliation;
4. prove context 1 never displays fresh current-project posture for an obsolete revision;
5. reconcile to one current revision;
6. prove Code and Canvas expose that revision;
7. Preview and start a run;
8. prove run bundle/project revision equals Preview revision.

#### Acceptance criteria

- no `fresh/current` analysis without exact verified `DbtProjectRevision`;
- target file, Canvas projection, Preview, and Run expose one content-set identity;
- no new save/query synonym;
- degraded analysis never rolls back durable content;
- file-backed Canvas never writes graph-draft semantics;
- concurrent second-file mutation is covered by API and browser tests.

#### Release gates

- contract schema and compatibility tests;
- API race integration suite;
- Web state/reducer tests;
- architecture guard for neutral ownership;
- two-context live artifact;
- Preview→Run revision equality proof;
- security/redaction tests;
- current status documentation updated.

### Priority 2 — Extract a neutral authoring session and coalesce analysis

**Severity:** High / P2 maintainability, performance, and regression risk.

#### Evidence

- Canvas imports Code reconciliation types;
- Canvas controller owns the callback;
- CodeView owns selection, persistence, reconciliation, status, navigation, and presentation;
- each 400 ms accepted edit can trigger whole-project analysis;
- one small race fix touches runtime code, tests, Cypress, architecture checks, and five Planning DB migrations.

#### Root cause

The feature was composed through presentation callbacks instead of one application session model. Project analysis is triggered by file events without a revision-aware scheduler/coalescer.

#### User/product impact

- large projects can spend authoring time repeatedly parsing obsolete revisions;
- status and selection regressions recur because state is distributed;
- future conflict, recovery, telemetry, and collaboration work requires shotgun edits;
- accessibility announcements may become noisy during rapid analysis cycles.

#### Exact domain owner

Web `Workspace Project Authoring Session`, separate from:

- Canvas projection rendering;
- Code editor presentation;
- server Workspace File I/O;
- Git lifecycle.

#### Proposed contracts/domain objects

- `WorkspaceProjectAuthoringSession`;
- orthogonal `BufferPersistenceState` and `ProjectAnalysisState`;
- retained `DbtProjectFileAnalysisReceipt`;
- latest requested/current/verified project revisions;
- typed persistence flush result;
- revision-aware analysis queue/coalescer.

#### Command/query and port changes

- Code submits buffer/file mutation through existing save port;
- session invokes strict reconciliation from Priority 1;
- Canvas subscribes to verified projection/revision query state;
- Preview asks the session for current verified revision or forces reconciliation;
- coalesce analysis requests by project revision;
- skip starting a revision already known to be superseded;
- never cancel a write merely because analysis is obsolete.

#### Likely files/components

- new focused application model/hook outside `views/code` and `views/canvas`;
- adapters preserving current `CodeViewProps` during migration;
- reduced `CodeView.tsx`;
- reduced `useDbtProjectFileCanvasController.ts`;
- architecture dependency guard;
- query/cache invalidation policy;
- performance fixture tests.

#### Migration/compatibility strategy

Strangler migration:

1. move types to neutral ownership with adapter aliases;
2. extract reconciliation service with identical behavior;
3. migrate CodeView;
4. migrate Canvas subscription;
5. remove view-to-view imports;
6. add coalescing after behavior parity.

Keep current visible status copy during extraction.

#### Rollback posture

Restore adapter composition without changing server contracts. Revision verification from Priority 1 must remain; do not roll back data-integrity semantics merely to restore old view ownership.

#### Observability

Measure separately:

- save p50/p95;
- analysis queue time and duration;
- coalesced/skipped analysis count;
- project file/resource count;
- stale result count;
- Preview wait/refresh latency;
- status announcement rate.

#### Security implications

No code content in metrics. Session state must be scoped by authenticated tenant/project/environment/canvas and cleared on scope loss/logout.

#### PR decomposition

1. neutral types and architecture guard;
2. application reconciliation service;
3. Code adapter migration;
4. Canvas subscription migration;
5. revision coalescing and performance proof;
6. controller simplification and documentation.

#### Tests/live proof

- architecture test forbids Canvas importing `views/code/*`;
- burst typing persists latest bytes and starts analysis only for necessary revisions;
- obsolete analysis completion cannot mutate current state;
- file switch retains project analysis posture;
- Preview waits for/forces current verification;
- browser focus remains stable while status changes;
- small/medium/large project performance evidence.

#### Acceptance/release gates

- one neutral owner for authoring-session state;
- no view-to-view domain-type imports;
- project analysis posture survives file selection changes;
- analysis amplification is measured and bounded;
- no visible regression in Code/Canvas/Preview flow.

### Priority 3 — Honest hard-exit and crash recovery

**Severity:** High / P1 user-confidence and data-loss recovery.

#### Evidence

SPA navigation can await `flush()`. Hard browser unload can only display a warning; it cannot reliably await the async save. No local draft backup/recovery path exists.

#### Root cause

Normal controlled navigation and uncontrolled browser/process termination are treated as one “navigation guard” concern.

#### User/product impact

If the user confirms exit during a pending write, or the tab/browser crashes, the latest buffer can be lost. On return, there is no compare/restore decision. This is below professional IDE behavior.

#### Exact domain owner

`Code Authoring Session` local recovery, separate from server Workspace I/O and Git.

#### Proposed contracts/domain objects

```ts
type LocalCodeDraft = Readonly<{
  schemaVersion: 'local-code-draft.v1';
  scopeKey: string;
  path: string;
  baseContentSha256: string;
  value: string;
  updatedAt: string;
}>;

type CodeDraftRecoveryDecision =
  | { kind: 'restore' }
  | { kind: 'compare' }
  | { kind: 'discard' };
```

Use an IndexedDB adapter behind an application port. Do not call this Git stash and do not place sensitive code in unbounded localStorage.

#### Command/query and port changes

- `PersistLocalCodeDraft` on coalesced buffer change;
- `GetRecoverableCodeDraft` on file open;
- `DiscardLocalCodeDraft` after confirmed server persistence or explicit discard;
- current `flush` remains for controlled navigation;
- `beforeunload` copy promises warning/recovery, not server save.

#### Likely files/components

- neutral Code Authoring Session port/model;
- browser storage adapter;
- working-tree hook integration;
- recovery compare/restore dialog;
- navigation guard wording/tests;
- authentication/scope cleanup integration.

#### Migration/compatibility strategy

No server migration. Version the local schema and make it disposable. Existing users have no candidate. Add TTL and size limits.

#### Rollback posture

Disable the storage adapter and keep the honest warning. Never claim local recovered content was server-synchronized.

#### Observability

Count drafts created/restored/compared/discarded/expired and storage quota/errors without recording content.

#### Security implications

- SQL/YAML may contain sensitive identifiers or business logic;
- key drafts by authenticated scope;
- clear on logout and authority loss;
- exclude `profiles.yml`, credentials, secrets, and configured sensitive paths;
- bounded TTL/size and optional enterprise policy disablement;
- no cross-device synchronization without a separate encrypted design.

#### PR decomposition

1. correct hard-exit contract/copy;
2. local draft port and IndexedDB adapter;
3. recovery compare/restore/discard UX;
4. accessibility and crash/reopen browser proof;
5. security/TTL policy.

#### Tests/live proof

- crash/close during pending save, reopen, recover exact buffer;
- server file changed meanwhile: show compare, never silent overwrite;
- keyboard and screen reader can restore/compare/discard;
- logout clears prior-scope drafts;
- quota/storage error is visible and does not claim protection;
- hard-exit message never promises async server persistence.

#### Acceptance/release gates

- tested crash/reopen recovery;
- explicit distinction among local draft, server working tree, and Git state;
- no silent restore over newer server revision;
- security and retention policy documented/tested.

### Priority 4 — Repair release identity and exact-tree attestation

**Severity:** High / P1 release integrity.

#### Evidence

- release head workflows are all `action_required`;
- duplicate logical entries remain;
- product P1 work is still open;
- exact post-merge main workflow completion was not independently retrieved;
- release notes mix source and merge commit topology.

#### Root cause

No single logical identity connects merged PR, changelog entry, main SHA, release head, required checks, package version, tag, and artifact digests.

#### User/product impact

A release can have ambiguous contents, weak rollback evidence, and unclear validation. Users and maintainers cannot easily identify the actual product changes.

#### Exact domain owner

Release Engineering / CI Governance.

#### Proposed contract/domain object

```ts
type ReleaseCandidateReceipt = Readonly<{
  version: string;
  mainSha: string;
  releaseHeadSha: string;
  changelogDigest: string;
  logicalChangeIds: readonly string[];
  requiredChecks: readonly Readonly<{ name: string; conclusion: 'success' }>[];
  artifactDigests: readonly string[];
}>;
```

Logical change identity should be PR-based or one conventional commit per merged PR.

#### Command/query and workflow changes

- choose and document merge/release identity policy;
- add deterministic duplicate logical-entry guard;
- validate the exact main SHA referenced by the release candidate;
- run required workflows on release head/exact source tree;
- add/confirm `merge_group` coverage if merge queue is used;
- generate an attestation/provenance receipt;
- regenerate PR #1984 only after the current product slice merges.

#### Likely files/components

- Release Please configuration;
- merge policy documentation;
- release workflow/action;
- changelog validation script/test;
- package/tag consistency test;
- release runbook.

#### Migration/compatibility strategy

Repair the unmerged 0.5.0 candidate. Do not rewrite published tags. Historical changelogs remain unless a correction release is needed.

#### Rollback posture

A failed candidate must not create tag/package release. A published defect requires a new corrective release, never retagging an existing version.

#### Observability/security

- publish run and artifact links in the candidate receipt;
- pin Actions by immutable SHA;
- least-privilege release token;
- provenance without secrets;
- record exact source and artifact digests.

#### PR decomposition

1. duplicate-changelog regression test;
2. merge/release identity policy;
3. exact-tree candidate workflow and receipt;
4. regenerate release branch from current main after product merge;
5. validate rollback and previous tag.

#### Tests/live proof

- one logical PR produces one changelog entry;
- duplicate source/merge message fixture fails;
- candidate SHA mismatch fails closed;
- skipped/action-required required check fails release gate;
- tag, package, manifest, changelog, and artifact identity agree;
- dry-run rollback procedure succeeds.

#### Acceptance/release gates

- zero duplicate logical entries;
- all required checks successful, not skipped or action-required;
- exact main/release/artifact identities recorded;
- package, changelog, manifest, and tag agree;
- current product P1s closed or explicitly excluded from release scope.

## 9. Accessibility, performance, security, integrity, recovery, and operability

### 9.1 Accessibility

Positive evidence:

- Monaco receives a file-specific aria label;
- working-tree status uses live/status or alert semantics;
- retry/reload are actual buttons;
- recent workbench changes improved keyboard reachability and movement.

Active risks and gates:

- rapid 400 ms save/analysis cycles can create noisy announcements;
- status must not steal editor focus;
- pending contextual file-selection retry must preserve understandable focus;
- conflict/recovery compare UX must be fully keyboard operable;
- live proof should include screen-reader announcement ordering for modified → syncing → analyzing → invalid/fresh;
- color cannot be the only distinction between persistence and analysis state.

### 9.2 Performance

The main risk is analyzer amplification, not React rendering alone.

Required budgets:

- file save p95 by file size;
- analysis p95 by project file/resource count;
- number of analyses started per typing burst;
- coalesced/superseded analyses;
- Preview admission latency;
- browser status announcement frequency;
- memory retained by editor/local draft history.

Do revision coalescing before attempting custom incremental dbt semantics.

### 9.3 Security

Positive evidence:

- server scope and authorization boundaries;
- content CAS;
- typed conflicts;
- path and traversal controls;
- batch idempotency/request hashes;
- profiles/secrets exclusions in ADR-0060;
- YAML receipt target-hash integrity.

Required hardening:

- server-owned project revision verification;
- diagnostics/telemetry redaction;
- local draft sensitive-content policy;
- exact tenant/project/environment binding on receipts;
- no hash-as-authorization misuse;
- action/token least privilege for release;
- preserve dependency/generated path partition tests.

### 9.4 Data integrity

The product must distinguish:

- editor value;
- last persisted file revision;
- target save receipt;
- current project content set;
- analyzed project revision;
- Preview plan identity;
- runtime bundle identity;
- Git commit identity.

Any UI label or receipt that collapses these creates hidden authority.

### 9.5 Recovery

Separate recovery domains:

- editor crash/local draft recovery;
- file CAS conflict;
- project analysis retry;
- project revision supersession;
- Preview/Run replay identity;
- Temporal runtime retry/recovery;
- Git rollback.

Do not use one generic “retry” label for materially different actions without explaining what is retried and what is already durable.

### 9.6 Operability

The repository has health/readiness, worker metrics, run events, CI gates, Postgres/outbox foundations, and extensive governance. The missing operational chain is:

```text
editor operation
  -> file receipt
  -> project analysis receipt
  -> Preview plan
  -> runtime bundle
  -> run snapshot/events
```

All should share one content-set identity and correlation ID without logging source content.

## 10. Secondary product gaps after the core transaction

These are important, but should not displace the immediate route:

1. **Three-way conflict UX.** Current reload-only posture is weaker than professional IDE/NiFi show/compare/revert/keep-mine behavior.
2. **Run cancellation and recovery UX.** Backend/runtime vocabulary exists; frontend state-specific controls remain less mature.
3. **Run-to-source/node evidence.** Dagster/Airflow-class navigation requires exact node execution evidence and links to source revision.
4. **Unified discovery/catalog.** Valuable after identity/provenance, not before.
5. **Warehouse connection maturity.** Keep negative proofs for credentials, redaction, tenant isolation, unsupported adapters, and audit failure.
6. **Admin honesty.** Do not imply complete admin/audit capabilities where adapters explicitly reject them.
7. **Production OTel validation and regulated erasure.** Current status remains partial; do not claim enterprise completion.
8. **Git lifecycle.** Add only after a real connector and accepted stage/commit/push rails; do not relabel working-tree writes.

## 11. Documentation and governance corrections

The next integrated functional route should update current truth without creating another documentation island:

1. refresh `system-delivery-status.md` with an exact main SHA and July capabilities;
2. state clearly which authoring transactions are complete and which are branch-only;
3. mark old broad duplicate-authority claims fixed/superseded;
4. record the active revision-bound reconciliation gap;
5. add a small tracked generated capability summary tied to main SHA;
6. make remote verification possible without a local untracked Planning DB render;
7. close or clearly supersede stale review PRs;
8. reduce unmerged Planning DB migration amplification;
9. keep documentation claims behind live/API evidence, not symbol presence alone.

## 12. Recommended delivery order

1. Fix the unresolved PR #1996 edit-during-in-flight-write P1.
2. Resolve the review thread and merge #1996 only after exact red/green/live proof.
3. Introduce the shared project-file analysis receipt using existing revision/hash vocabulary.
4. Add strict current-project verification to `ProjectDbtGraphFromFiles` orchestration.
5. Retain the receipt in a neutral Web authoring session.
6. Gate Preview and Run on the same project revision.
7. Add two-context concurrency proof and correlation telemetry.
8. Coalesce obsolete whole-project analyses.
9. Add honest hard-exit wording and local draft recovery.
10. Repair release identity/deduplication and exact-tree attestation.
11. Regenerate and validate 0.5.0.
12. Add three-way conflict UX and run-to-source evidence.

The first six steps close one real user transaction. They should take precedence over broad discovery, another DSL, another runtime adapter, or additional governance breadth.

## 13. Final acceptance and release gate

The recommended route is complete only when all of the following are true:

- latest editor bytes cannot be approved by `flush` before their exact save receipt;
- PR #1996's unresolved P1 is closed with adversarial interleaving tests;
- old reconciliation outcomes cannot overwrite newer buffer or receipt state;
- a shared receipt binds target file hash, dbt project revision, and analysis hash;
- fresh/current posture requires final server verification of the project content set;
- project analysis state survives file selection changes;
- Canvas, Code, Preview, and Run expose the same content-set identity;
- concurrent second-file mutation is covered by API and two-browser proof;
- invalid/unavailable analysis preserves durable content without false success;
- Canvas cannot import Code-internal application types;
- whole-project analysis is measured and obsolete work is coalesced;
- crash/reopen recovery is explicit and security-bounded;
- current status documentation references the exact integrated main SHA;
- release notes contain one logical entry per change;
- all required workflows succeed on the exact release candidate source tree;
- package version, changelog, manifest, tag, and artifact provenance agree.

Until these gates pass, DVT has a materially improving and strategically sound dbt file-authoritative workbench, but it does not yet provide the revision-safe, recovery-safe, professionally releasable authoring transaction expected from mature IDE and data-platform products.
