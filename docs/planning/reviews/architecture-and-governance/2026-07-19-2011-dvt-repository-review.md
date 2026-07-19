---
title: DVT Repository Review 2026-07-19 20:11 CEST
status: Review
owner: Architecture / Web / API / Runtime / Governance
reviewed_main_sha: 353ac8c724e51e703eaa7c5b9ff5db657fafb5f7
reviewed_active_pr: 1996
reviewed_active_pr_sha: 2a895f85e1d2ddb6c11b6038c9b8ddf7fe363fce
planning_type: review
---

# DVT Repository Review — 2026-07-19 20:11 CEST

## 1. Executive verdict

This review was performed against the exact current `main` commit:

- [`353ac8c724e51e703eaa7c5b9ff5db657fafb5f7`](https://github.com/dunay2/dvt/commit/353ac8c724e51e703eaa7c5b9ff5db657fafb5f7)
- merge of [PR #1993 — Preserve DBT code reconciliation truth](https://github.com/dunay2/dvt/pull/1993)

There is **no newer integrated product commit on `main`**. The material product work remains on [PR #1996 — Harden DBT code persistence reconciliation](https://github.com/dunay2/dvt/pull/1996), at:

- branch `fix/dbt-code-reconciliation-races`;
- head [`2a895f85e1d2ddb6c11b6038c9b8ddf7fe363fce`](https://github.com/dunay2/dvt/commit/2a895f85e1d2ddb6c11b6038c9b8ddf7fe363fce);
- eight commits;
- thirteen changed files;
- six visible successful workflows.

PR #1996 is directionally correct but **not merge-ready**. One unresolved P1 review thread identifies a latest-buffer data-loss race:

1. the editor starts persisting bytes `A2`;
2. while that write is in flight, the user edits to `A3`;
3. the `A2` receipt arrives;
4. `content_persisted` moves the model to `reconciling` whenever semantic reconciliation is enabled, even though the current editor value is still `A3`;
5. `flush()` returns `true` for `reconciling`;
6. navigation or workbench close can proceed before `A3` is persisted.

The broader architecture gap also remains. Receipt correlation protects against some out-of-order **file** results, but DVT still does not retain and verify a single whole-project revision identity from Code persistence through dbt analysis, Canvas, Preview, and Run. The current graph projection already exposes both `projectRevision.contentSetSha256` and `analysisSha256`; the current Code reducer discards them after presentation-state classification.

The release remains blocked. [PR #1984 — Release 0.5.0](https://github.com/dunay2/dvt/pull/1984) still contains duplicate logical changelog entries and all six visible workflow runs conclude `action_required`.

**Immediate route:**

1. fix the PR #1996 in-flight-write race and prove the real close/navigation transaction;
2. merge only after the unresolved P1 thread is closed and the exact adversarial test is green;
3. implement one revision-bound authoring receipt using existing file CAS, `WorkspaceFileSaveReceipt`, `DbtProjectRevision`, and `analysisSha256` semantics;
4. carry that revision through Canvas, Preview, and Run;
5. add durable local recovery for hard browser exits;
6. regenerate the release only after the product tree and release notes are coherent.

Do not add another save synonym, another SQL authority, another graph store, or a DVT-specific language to solve this. The repository already contains the required semantic primitives; the missing work is preservation, ownership, and end-to-end transaction closure.

## 2. Review scope and evidence

The review inspected:

- current `main` and recent integrated commits;
- all confirmed open pull requests;
- workflow status on `main`, the active product head, and the release head;
- unresolved and recently resolved inline review threads;
- release metadata and changelog contents;
- current Code and Canvas implementation;
- workspace file CAS and batch mutation ports;
- dbt project graph revision contracts;
- YAML edit analysis receipts;
- navigation/recovery behavior;
- architecture and delivery documentation;
- test and governance posture;
- likely product behavior relative to dbt Studio, Dagster, Airflow, Prefect, NiFi, Temporal, and professional IDE/version-control workflows.

Primary repository evidence:

- [ADR-0060 — dbt Project Authoring Authority](../../../adr/ADR-0060-dbt-project-authoring-authority.md)
- [`DbtProjectGraphProjection.v1`](https://github.com/dunay2/dvt/blob/353ac8c724e51e703eaa7c5b9ff5db657fafb5f7/packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts)
- [`DbtYamlDescriptionEdit.v1`](https://github.com/dunay2/dvt/blob/353ac8c724e51e703eaa7c5b9ff5db657fafb5f7/packages/@dvt/contracts/src/contracts/dbt-project/DbtYamlDescriptionEdit.v1.ts)
- [`workspaceFiles` application port](https://github.com/dunay2/dvt/blob/353ac8c724e51e703eaa7c5b9ff5db657fafb5f7/apps/api/src/application/ports/workspaceFiles.ts)
- [`SaveWorkspaceFileContentUseCase`](https://github.com/dunay2/dvt/blob/353ac8c724e51e703eaa7c5b9ff5db657fafb5f7/apps/api/src/application/services/saveWorkspaceFileContentUseCase.ts)
- [`CodeView`](https://github.com/dunay2/dvt/blob/353ac8c724e51e703eaa7c5b9ff5db657fafb5f7/apps/web/src/app/views/CodeView.tsx)
- [`codeWorkingTreeSyncModel` on PR #1996](https://github.com/dunay2/dvt/blob/2a895f85e1d2ddb6c11b6038c9b8ddf7fe363fce/apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts)
- [`useCodeWorkingTreeSync` on PR #1996](https://github.com/dunay2/dvt/blob/2a895f85e1d2ddb6c11b6038c9b8ddf7fe363fce/apps/web/src/app/views/code/useCodeWorkingTreeSync.ts)
- [`CodeWorkingTreeNavigationGuard`](https://github.com/dunay2/dvt/blob/353ac8c724e51e703eaa7c5b9ff5db657fafb5f7/apps/web/src/app/views/code/CodeWorkingTreeNavigationGuard.tsx)
- [`workspaceFileReconciliationAuthority`](https://github.com/dunay2/dvt/blob/353ac8c724e51e703eaa7c5b9ff5db657fafb5f7/apps/web/src/app/views/code/workspaceFileReconciliationAuthority.ts)
- [`useDbtProjectFileCanvasController`](https://github.com/dunay2/dvt/blob/353ac8c724e51e703eaa7c5b9ff5db657fafb5f7/apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts)
- [System Delivery Status](../../../architecture/system-delivery-status.md)
- [PR #1996](https://github.com/dunay2/dvt/pull/1996)
- [PR #1984](https://github.com/dunay2/dvt/pull/1984)

Comparison references:

- dbt documentation and Studio: <https://docs.getdbt.com/>
- Dagster documentation: <https://docs.dagster.io/>
- Airflow DAG bundles: <https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/dag-bundles.html>
- Prefect deployments: <https://docs.prefect.io/v3/concepts/deployments>
- NiFi user guide and versioning: <https://nifi.apache.org/nifi-docs/user-guide.html>
- Temporal durable execution: <https://docs.temporal.io/>
- VS Code Hot Exit: <https://code.visualstudio.com/docs/editing/codebasics#_hot-exit>
- VS Code local history: <https://code.visualstudio.com/docs/editing/userinterface#_local-file-history>

### Evidence limitation

The connector used for commit-associated workflow runs returns pull-request-triggered runs. It returned no exact run for the merged `main@353ac8c` SHA. This report therefore does **not** claim that post-merge CI failed or did not run. It states only that exact-main completion was not independently retrievable through the available endpoint.

## 3. Current repository state

### 3.1 Main and recent commits

Current `main`:

```text
353ac8c724e51e703eaa7c5b9ff5db657fafb5f7
```

Immediately relevant integrated sequence:

1. `55928c8` — preserve DBT code reconciliation truth;
2. `58fc5fe` — record DBT reconciliation proof;
3. `354f089` — validate pre-import feature symbols locally;
4. `aabaeb7` — preserve manual DBT code file selection;
5. `08fb34f` — harden router presentation proof;
6. `d14bd8a` — reset Project Code selection on scope change;
7. `353ac8c` — merge PR #1993.

No product commit is integrated after `353ac8c`.

### 3.2 Confirmed open pull requests

| PR | State | Head | Purpose | Review judgement |
| --- | --- | --- | --- | --- |
| [#1996](https://github.com/dunay2/dvt/pull/1996) | Open, non-draft | `2a895f8` | Harden DBT Code persistence/reconciliation races | Material product work; six green workflows; one unresolved P1; not merge-ready |
| [#1997](https://github.com/dunay2/dvt/pull/1997) | Open, draft | review branch | Current Fowler review | Documentation-only; useful evidence but not product progress |
| [#1995](https://github.com/dunay2/dvt/pull/1995) | Open, draft | `b5daa81` | Previous Fowler review | Superseded as current route authority |
| [#1994](https://github.com/dunay2/dvt/pull/1994) | Open, draft | `e3efd67` | Review against older `main@eb9a393` | Stale baseline; should not be treated as current truth |
| [#1984](https://github.com/dunay2/dvt/pull/1984) | Open, non-draft | `976328b` | Release 0.5.0 | Blocked by release-note duplication, `action_required` workflows, and active P1 product work |

The accumulation of multiple open “current route” review PRs is itself governance drift. The reports are useful as evidence, but several simultaneously open documents asserting current authority create stale truth and reader ambiguity. Keep one active route document; close or explicitly supersede the others.

### 3.3 CI and workflow state

#### Active product PR #1996

Head `2a895f85e1d2ddb6c11b6038c9b8ddf7fe363fce` has completed successfully:

- Dependency Review;
- Contracts & Determinism;
- Test Suite;
- CI — Code Quality;
- CodeQL;
- PR Quality Gate.

This proves the branch satisfies the configured suite. It does not disprove the unresolved P1: the review found an untested state interleaving after those workflows passed.

#### Current main

No pull-request-triggered run was returned for `353ac8c`. PR #1993 head CI was green before merge. Exact post-merge completion remains unverified through this connector.

#### Release PR #1984

Head `976328bd27ca1eddb70ad7ca06baf11659a0f971` has six completed workflow runs, all with conclusion `action_required`:

- Dependency Review;
- Contracts & Determinism;
- Test Suite;
- CI — Code Quality;
- CodeQL;
- PR Quality Gate.

The release is not eligible for merge.

### 3.4 Review threads

#### PR #1996

Two P1 threads exist:

1. **Resolved:** an edit made after byte persistence while a prior receipt was reconciling remained `reconciling`, allowing `flush()` to approve unsaved content. Commit `2a895f8` returns that state to `modified` and adds reducer/hook proof.
2. **Unresolved:** an edit made while `saveFileContent` itself is still in flight can still be approved after only the older bytes persist.

The unresolved thread is current, non-outdated, and attached to `useCodeWorkingTreeSync.ts`.

#### PR #1993

All three material threads are resolved:

- manual Project Code selection no longer snaps back to the contextual initial file;
- the jsdom/Node `AbortSignal` router presentation test is repaired;
- switching from Node Code to Project Code resets to the canonical project default.

Those findings are fixed and must not be repeated as active defects.

### 3.5 Release state

PR #1984 contains duplicate logical release entries, including:

- two “Add explicit DBT execution selection recovery” feature entries (`ec47025` and `fa240f8`);
- both the branch commit and merge commit for “Preserve DBT code reconciliation truth” (`55928c8` and `353ac8c`).

This is not merely cosmetic. A generated release note that duplicates logical delivery weakens provenance, makes audit/release review noisy, and obscures which commit is the actual delivery identity.

## 4. Previous findings: current disposition

| Previous finding | Status | Current evidence |
| --- | --- | --- |
| Canvas node workbench and Project Code both acting as editable SQL authority | **Fixed for the reviewed path** | SQL editing was removed from the duplicate node field and canonicalized through file-backed Code |
| Empty DBT SQL or stale upper-field overwrite risk | **Fixed/superseded** | The reviewed code path now uses canonical file-backed SQL authority and CAS persistence |
| Manual file selection snaps back to node initial path | **Fixed** | Resolved in `aabaeb7` with a regression test |
| Router presentation spec fails on jsdom/Node `AbortSignal` | **Fixed** | Resolved in `08fb34f` |
| Project scope retains previous node file | **Fixed** | Resolved in `d14bd8a` |
| Byte persistence and semantic analysis represented as one success | **Fixed on main** | PR #1993 split persisted, stale, invalid, unavailable, verification-unavailable, superseded, and synchronized states |
| Reconciliation results can overwrite a newer receipt | **Fixed on PR #1996 branch, not integrated** | Receipt identity is now carried into completion/failure events and older results are ignored |
| Latest edit during in-flight write can be lost | **Still active, P1** | `content_persisted` enters `reconciling` without first checking whether `state.value` advanced beyond `inFlight.content`; `flush()` returns success for `reconciling` |
| Reconciliation is bound to exact whole-project revision | **Still active, P1 architecture** | Code retains file receipt identity but does not retain/verify `projectContentSetSha256` and `analysisSha256` end-to-end |
| Hard browser exit guarantees asynchronous flush | **Disproved as a valid claim** | `beforeunload` only warns; it cannot await `flush()` |
| Hard-exit recovery comparable to an IDE | **Still active, P1/P2** | No durable local draft/recovery transaction is visible in the reviewed path |
| Release 0.5.0 is ready | **Disproved** | Duplicate logical notes and six `action_required` runs remain |
| System Delivery Status is current | **Disproved/stale** | It declares itself current but has `last_reviewed: 2026-04-26` and predates the July DBT authoring work |

## 5. Fowler-style product and architecture review

### 5.1 Concrete P1 regression: latest-buffer loss during in-flight persistence

**Smell:** temporal coupling and an invalid composite state.

`CodeWorkingTreeSyncState.phase` tries to describe both byte persistence and semantic analysis in one value. During a write, `inFlight.content` is the immutable command payload, while `state.value` remains mutable. The `content_persisted` reducer transition records the old bytes as persisted, then selects `reconciling` whenever analysis is required. It does not first preserve the fact that the editor contains newer bytes.

`flush()` treats `reconciling` as success because byte persistence is normally complete by that state. That assumption is invalid when the mutable editor advanced during the write.

This is a classic state-machine bug caused by collapsing two dimensions:

- persistence status of the current buffer;
- semantic-analysis status of the last persisted receipt.

The model should be able to express:

```text
current buffer: dirty
last durable receipt: A2
semantic analysis for A2: pending
```

The current single `phase` cannot represent that tuple without losing information.

### 5.2 Hidden stale truth: file receipt is not project revision

The repository already defines the right whole-project identity:

```text
DbtProjectGraphProjection.projectRevision.contentSetSha256
DbtProjectGraphProjection.analysisSha256
```

The current Code reconciliation path instead performs:

1. save one file with CAS;
2. request a project refresh;
3. reduce the project result to a presentation outcome;
4. re-read only the edited file;
5. verify path and file hash against the save receipt.

The Canvas callback accepts `_receipt` but does not use it. The final authority function verifies only the edited file path and `contentSha256`. A concurrent change to another `.sql`, `.yml`, macro, package, or project configuration file can alter the whole dbt project content set while the target file remains unchanged.

The result can therefore be internally inconsistent:

- Code correctly proves “these target file bytes are durable”;
- Canvas or the analysis may correspond to a different whole-project revision;
- Preview or Run can later use another revision again.

That is not duplicate SQL authority. It is **incomplete revision authority**.

### 5.3 Responsibility overload and leaky view ownership

`CodeView` and Canvas-facing hooks currently coordinate:

- file selection;
- editor buffer state;
- debounced persistence;
- compare-and-swap conflict behavior;
- semantic dbt analysis;
- reconciliation retries;
- navigation gating;
- contextual target transitions;
- presentation copy and status.

The reconciliation result type lives in the Code presentation area and is consumed by Canvas orchestration. That is a leaky abstraction: a cross-surface application transaction is owned by one view’s state vocabulary.

The exact domain owner should be **Workspace Project Authoring**, not Code UI and not Canvas UI. Code and Canvas should consume the same application-level receipt/read model.

### 5.4 Primitive obsession

Several important identities remain bare strings in local logic:

- content SHA;
- project content-set SHA;
- analysis SHA;
- path;
- request ID;
- last-modified timestamp.

The contracts validate these at boundaries, but local orchestration still reconstructs identity by field-by-field string comparison. That increases accidental mismatch and shotgun surgery.

Use existing contract types or introduce narrow branded/domain value objects only where ownership requires it. Do not duplicate schemas.

### 5.5 Shotgun surgery and governance amplification

PR #1996 modifies thirteen files and adds five Planning DB migrations for a focused UI state-machine correction. The direction is governed, but the ratio is unhealthy: a small authoring defect requires repeated migrations, feature mechanization edits, tests, orchestration changes, and live proof changes.

Governance is valuable when it prevents semantic drift. It becomes delivery drag when every correction creates a chain of permanent schema migrations before the user transaction itself is closed.

Do not add another migration merely to record the unresolved P1. First fix and prove the user transaction. Consolidate governance updates around accepted vertical slices.

### 5.6 Test-only confidence

The active product branch has six green workflows and still contains a valid P1. The problem is not weak test quantity. The problem is missing interleaving coverage.

Current tests exercise:

- persistence;
- edits during reconciliation;
- stale receipt rejection;
- retry behavior;
- live file content.

The missing transaction is:

```text
edit A2
start write A2
edit A3 before A2 resolves
request close or file navigation
resolve A2
verify close remains blocked
persist A3 against A2 receipt
only then allow navigation
```

A state machine is only as strong as its adversarial transition matrix.

### 5.7 Recovery gap

SPA navigation can await `flush()`. Browser hard exit cannot. `beforeunload` only invokes the native warning contract.

Professional IDE behavior is not “promise to save during unload.” It is:

- persist recoverable local state continuously;
- restore after crash/restart;
- compare recovery state with authoritative disk/server revision;
- let the user restore, diff, discard, or resolve conflict.

DVT currently has the warning but not the durable recovery story.

### 5.8 Performance and analysis amplification

The reviewed Code path debounces writes by 400 ms and can trigger project analysis after accepted persistence. For small projects this may be acceptable. For large dbt projects, full analysis after each pause can create:

- CPU amplification;
- stale result churn;
- unnecessary network traffic;
- delayed Canvas refresh;
- non-deterministic UI ordering under rapid edits.

The correct policy is not to weaken durable persistence. Persist bytes quickly, but coalesce or cancel superseded semantic analyses and require a final exact-revision analysis at Preview entry.

### 5.9 Security and tenant integrity

Positive posture:

- workspace writes are scoped by tenant, project, and environment;
- writes use expected revisions and fail closed on conflicts;
- batch mutation supports idempotency and request hashes;
- file/project authority remains server-backed.

Residual concerns:

- any future local recovery store must avoid leaking one tenant/project draft into another;
- recovery data may contain credentials or sensitive SQL and must be encrypted or constrained to trusted browser storage policy;
- logs and metrics must never emit file contents;
- project revision identities are safe to log, but paths may still be sensitive and should follow existing telemetry redaction policy;
- analysis endpoints must retain path traversal and workspace-root enforcement.

### 5.10 Accessibility

The recent work improved keyboard reachability and workbench behavior, but the state/recovery model still requires explicit accessibility proof:

- status changes announced through an `aria-live` region;
- conflict and recovery actions keyboard reachable;
- no focus loss when a file transition is blocked;
- a user can understand persisted-vs-analyzed-vs-invalid status without relying on color;
- the native unload warning is not the only protection available to assistive-technology users.

No new visual redesign is required for the next slice. The priority is correct state and clear announcements.

### 5.11 Operability and observability

The authoring transaction needs metrics that distinguish:

- save requested/succeeded/conflicted/failed;
- reconciliation requested/completed/superseded/failed;
- analysis coalesced/cancelled;
- navigation flush latency;
- recovery snapshot created/restored/discarded;
- preview rejected because revision changed.

Correlate by opaque operation ID plus content/revision hashes. Do not log SQL/YAML contents.

### 5.12 Documentation drift

`docs/architecture/system-delivery-status.md` declares itself the current implementation snapshot but retains:

```text
last_reviewed: 2026-04-26
Review date: 2026-04-26
```

It predates the July file-backed dbt authoring and Canvas/Code work. A stale “current status” page is worse than an explicitly historical document because it creates false confidence.

Update it only after the authoring vertical is accepted. Until then, mark the current scope and date honestly.

## 6. Comparison with mature systems

| System | Mature behavior | DVT posture | Required stance |
| --- | --- | --- | --- |
| dbt Studio/Cloud IDE | File-backed development, validation, execution, and version-control-oriented workflow | DVT has file authority and graph projection but incomplete revision continuity and recovery | **Match** revision traceability and safe editing; **differ** by keeping Canvas capability-limited and lossless |
| Dagster | Asset-oriented lineage, typed resources, explicit run materialization and observability | DVT has graph/run provenance primitives but authoring analysis identity is not retained end-to-end | **Match** explicit materialization/revision evidence; defer broader asset product expansion |
| Airflow | Deployments/runs can be associated with concrete DAG bundle versions | DVT Preview/Run direction is revision-aware, but current Code reconciliation does not preserve the same content-set identity | **Match** exact version binding before execution |
| Prefect | Deployment identity, work-pool separation, explicit operational state | DVT has ports/adapters and runtime separation; authoring-session state is still view-owned | **Match** operational state clarity; avoid copying orchestration concepts into the editor |
| NiFi | Visual flow versioning exposes local changes, stale state, commit/revert behavior | DVT exposes some stale/invalid states but lacks full recovery/revert and project revision proof | **Match** visible dirty/stale/conflict semantics and reversible authoring |
| Temporal | Durable execution reconstructs workflow state after failure | DVT runtime uses Temporal, but Code authoring recovery is ordinary browser state | **Do not misuse Temporal for keystrokes**; adopt the durability principle through local draft recovery and server receipts |
| VS Code / professional IDEs | Hot exit, local history, dirty indicators, conflict handling, explicit source-control state | DVT warns on unload but has no equivalent durable local recovery/history | **Match** recovery and diff/restore expectations in a narrow web-safe form |

DVT should not attempt to become all of these products. Its defensible product direction is:

- dbt files remain the source of truth;
- Canvas is a deterministic, capability-aware projection;
- Code is the full-fidelity authoring surface;
- Preview and Run are bound to a concrete project revision;
- runtime execution remains provider/adapter governed;
- unsupported visual edits fall back to Code rather than generating a new language.

## 7. Expert implementation route

### Priority 0 — Close the PR #1996 latest-buffer race

**Severity and evidence**

- P1 data integrity.
- One unresolved, current review thread.
- `content_persisted` selects `reconciling` solely from `requiresReconciliation`.
- `flush()` returns success for `reconciling`.

**Root cause**

The reducer overwrites dirty-buffer truth with analysis phase truth after an older in-flight payload persists.

**User/product impact**

The latest SQL/YAML edit can be lost during file switch, contextual workbench close, or SPA navigation.

**Exact domain owner**

Workspace Project Authoring — working-tree persistence state.

**Proposed contracts/domain objects**

No public contract change required. Preserve the existing:

- `WorkspaceFileSaveReceipt`;
- `CodeWorkingTreeSyncState.inFlight.content`;
- `persistedContent`;
- `persistedRevision`.

Represent dirty-buffer and pending-analysis truth independently in state, either explicitly or by a transition that keeps `phase: modified` while retaining `pendingReconciliation`.

**Command/query and port changes**

None. Reuse `saveFileContent` and file CAS.

**Likely files**

- `apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts`
- `apps/web/src/app/views/code/codeWorkingTreeSyncModel.test.ts`
- `apps/web/src/app/views/code/useCodeWorkingTreeSync.ts`
- `apps/web/src/app/views/code/useCodeWorkingTreeSync.test.tsx`
- `apps/web/src/app/views/CodeView.test.tsx`
- relevant live Cypress proof

**Implementation rule**

On `content_persisted`:

```text
persistedContent = inFlight.content
persistedRevision = receipt.contentSha256
pendingReconciliation = receipt when required
inFlight = null
phase = state.value === inFlight.content
  ? (requiresReconciliation ? reconciling : synchronized)
  : modified
```

`flush()` must loop until the **current value** is durable, not merely until some receipt exists.

**Migration/compatibility**

No migration. Internal state semantics only.

**Rollback posture**

Revert the focused reducer/hook commit. No stored-data migration.

**Observability**

Add counters for serialized second saves and flush loops; do not emit content.

**Security implications**

Positive: prevents users from believing sensitive edits are saved when they are not.

**PR decomposition**

Keep in PR #1996 as one focused correction commit. Do not open a second overlapping branch.

**Red/green tests**

Red first:

1. start save `A2` with a deferred promise;
2. edit `A3` before resolution;
3. call `flush()` or request navigation;
4. resolve `A2`;
5. assert navigation is still blocked;
6. assert a second save writes `A3` with expected revision equal to the `A2` receipt;
7. resolve `A3`;
8. assert navigation proceeds exactly once.

**Live proof**

In a protected live workspace, delay the first save, type again, request another file, release the first save, and verify the target changes only after the second bytes are readable from the server.

**Acceptance criteria**

- no state with `value !== persistedContent` is treated as flush-success;
- close/file switch cannot discard the latest buffer;
- reconciliation for the older receipt may continue without blocking the second byte save;
- unresolved review thread closed with exact commit and test evidence.

**Release gate**

PR #1996 cannot merge until this passes unit, presentation, live E2E, and all existing workflows.

### Priority 1 — Introduce one revision-bound Project Authoring receipt

**Severity and evidence**

- P1 architecture/data integrity.
- `DbtProjectGraphProjection` already exposes `projectRevision.contentSetSha256` and `analysisSha256`.
- Code reconciliation currently retains neither as durable application state.
- Canvas callback ignores its save receipt parameter.
- final authority check validates only the target file.

**Root cause**

The transaction is split across view-owned callbacks and reduced to display phases before the application can preserve revision provenance.

**User/product impact**

Code can show persisted/synchronized while Canvas, Preview, or Run reflects another project content set.

**Exact domain owner**

Workspace Project Authoring — cross-surface revision reconciliation.

**Proposed contract/domain object**

Prefer a neutral application receipt composed from existing types, for example:

```ts
type DbtProjectAuthoringReconciliationReceipt = Readonly<{
  schemaVersion: 'dbt-project-authoring-reconciliation-receipt.v1';
  targetFile: WorkspaceFileSaveReceipt;
  projectRevision: DbtProjectRevision;
  analysisSha256: string;
  freshness: 'fresh' | 'stale-last-valid' | 'invalid' | 'unavailable';
}>;
```

Do not duplicate SHA validation primitives. Reuse the contracts package primitives and the pattern already present in `DbtYamlDescriptionAnalysisReceipt`:

- `analysisSha256`;
- `projectContentSetSha256`;
- `targetContentSha256`.

**Command/query and port changes**

Recommended narrow route:

```text
SaveWorkspaceFileContent
  -> WorkspaceFileSaveReceipt
  -> ProjectDbtGraphFromFiles
  -> DbtProjectAuthoringReconciliationReceipt
  -> verify current project content-set identity
```

Options:

1. application orchestrator invokes existing save and projection ports; or
2. Code invokes existing commands but stores the neutral receipt returned by a neutral reconciler.

Prefer option 1 if the API/application layer already owns both capabilities without creating circular dependencies.

**Likely files/components**

- contracts under `packages/@dvt/contracts/src/contracts/dbt-project/` or planner, based on existing ownership conventions;
- API application service alongside `projectDbtGraphFromFilesUseCase.ts`;
- web port under the neutral workspace/project-authoring boundary;
- Code and Canvas adapters;
- Preview provenance mapping;
- Run admission verification.

**Migration/compatibility**

Additive v1 receipt. Existing endpoints can remain while the web switches to the new application query/command composition. No file-format migration.

**Rollback posture**

Feature flag the retained receipt consumption if necessary. Falling back must remain fail-closed for Preview/Run when revision proof is missing.

**Observability**

Record target file SHA, project content-set SHA, analysis SHA, freshness, latency, and superseded count. Never log file contents.

**Security implications**

Validate tenant/project/environment scope across save and analysis. Never accept a client-supplied project revision as authoritative without server verification.

**PR decomposition**

1. contract and domain tests;
2. API/application orchestration and integration tests;
3. web neutral port plus Code/Canvas consumption;
4. Preview/Run revision propagation and rejection tests;
5. live end-to-end proof.

Each PR must be a vertical-enabling slice, not a parallel authority.

**Red/green tests**

- edit target file while another project file changes concurrently;
- verify old analysis receipt is superseded;
- verify Code cannot claim current project synchronization;
- verify Preview rejects a stale content-set SHA;
- verify rerun after fresh analysis uses the same content-set identity.

**Live proof**

```text
Project Code edit
  -> server file read shows exact bytes
  -> Canvas shows graph for receipt.contentSetSha256
  -> Preview provenance contains same contentSetSha256
  -> Run admission and snapshot retain same revision
  -> reopen project and recover same state
```

**Acceptance criteria**

- one neutral receipt is visible to Code, Canvas, Preview, and Run;
- stale results cannot overwrite newer project revision state;
- target file SHA and project content-set SHA are both verified;
- invalid analysis remains explicit and cannot fall back to a draft graph;
- no second SQL authority or save command is introduced.

**Release gate**

No release claim of safe bidirectional dbt authoring until this proof is green.

### Priority 2 — Durable hard-exit recovery

**Severity and evidence**

- P1 for user trust, P2 for initial release scope depending on product promise.
- Browser `beforeunload` only warns and cannot await async persistence.

**Root cause**

The design treats unload warning as protection instead of maintaining recoverable local state.

**User/product impact**

Crash, browser kill, OS restart, or forced reload can lose the latest buffer.

**Exact domain owner**

Workspace Project Authoring — local draft recovery adapter.

**Proposed contracts/domain objects**

```text
LocalAuthoringRecoveryRecord
- tenant/project/environment identity
- path
- base content SHA
- local content SHA
- content or encrypted payload
- updatedAt
- optional last durable receipt
```

This is not server authority. It is recoverable client state that must reconcile against server CAS.

**Command/query and port changes**

Introduce a web-local port:

- `saveRecoveryDraft`;
- `loadRecoveryDrafts`;
- `deleteRecoveryDraft`.

Do not add API endpoints until cross-device recovery is a deliberate product requirement.

**Likely files/components**

- neutral project-authoring recovery port;
- IndexedDB adapter;
- Code initialization/recovery banner;
- diff/restore/discard UI;
- accessibility tests.

**Migration/compatibility**

Version recovery records. Unknown versions are ignored and safely removable.

**Rollback posture**

Feature flag and purge records on disable. Never mutate server files during rollback.

**Observability**

Counts only: record created, restored, discarded, conflicted, unreadable. No content telemetry.

**Security implications**

High. Scope by authenticated tenant/project/environment; clear on logout; consider encryption and expiration; document browser-storage exposure.

**PR decomposition**

1. port, versioned record, IndexedDB adapter, tests;
2. recovery detection and read-only diff;
3. restore/discard with CAS save;
4. crash/reload E2E and accessibility proof.

**Acceptance criteria**

- forced reload after an unsaved edit offers recovery;
- server changes produce a conflict/diff, never silent overwrite;
- logout prevents another user from seeing the draft;
- discard is explicit and auditable locally.

**Release gate**

Required before marketing Code as IDE-grade safe authoring.

### Priority 3 — Split persistence state from semantic analysis state

**Severity and evidence**

- P2 architecture with P1 consequences.
- Single `phase` drives the current race and complex conditionals.

**Root cause**

One enum encodes two state machines.

**Exact domain owner**

Workspace Project Authoring.

**Proposed model**

```ts
type BufferPersistenceState =
  | 'clean'
  | 'dirty'
  | 'saving'
  | 'conflict'
  | 'failed';

type ProjectAnalysisState =
  | 'not-requested'
  | 'pending'
  | 'fresh'
  | 'stale'
  | 'invalid'
  | 'unavailable'
  | 'superseded';
```

Retain typed receipts alongside both axes.

**Command/query/port changes**

None initially. This is an internal model refactor after Priority 0, not before it.

**Migration/rollback**

Pure client state. Build an adapter to existing presentation copy to avoid broad UI churn.

**Tests**

Generate a transition matrix covering dirty/saving plus every analysis status. Property-based tests are appropriate for invariants such as “dirty never flushes true.”

**Acceptance/release gate**

All prior status copy remains accurate, with no loss of persisted-invalid/stale distinctions.

### Priority 4 — Coalesce semantic analysis and add exact Preview validation

**Severity and evidence**

- P2 performance and correctness.
- accepted writes can trigger repeated whole-project analysis.

**Root cause**

Persistence cadence and semantic-analysis cadence are coupled.

**Exact domain owner**

Workspace Project Analysis / Preview admission.

**Route**

- persist quickly;
- allow only one active analysis per project scope;
- mark older requested revisions superseded;
- coalesce to the newest durable content set;
- on Preview, force or await analysis for the exact current content-set SHA;
- reject Preview if freshness is not acceptable.

**Observability**

Analysis queue depth, coalesced count, latency by project size, cancellation/supersession, Preview wait time.

**Acceptance criteria**

Rapid typing does not produce an unbounded analysis backlog. Preview always names and validates the exact revision used.

### Priority 5 — Release, CI, and documentation hygiene

**Severity**

- P1 release integrity;
- P2 governance/documentation.

**Actions**

1. do not merge PR #1984 in its current form;
2. close or supersede stale review PRs;
3. fix the active P1 and complete revision binding;
4. update `main` and regenerate Release Please output;
5. deduplicate logical changelog entries;
6. approve or rerun required workflows until the exact release head is green;
7. verify post-merge `main` workflow evidence;
8. update `system-delivery-status.md` with a real review date and the accepted authoring posture.

**Acceptance criteria**

- release notes contain one entry per logical change;
- all required release-head workflows are successful;
- no unresolved P1 threads on included product PRs;
- release commit/tag points to the exact validated tree;
- current-status documentation names the accepted revision model and remaining gaps.

## 8. Recommended next implementation slice

The next slice is deliberately narrow:

> **Guarantee that contextual close and file navigation cannot proceed until the latest editor buffer is durably persisted, even when an older save completes while dbt reconciliation is enabled.**

Implementation sequence:

1. add the exact deferred-write red test to `useCodeWorkingTreeSync.test.tsx`;
2. update `content_persisted` to preserve `modified` when `state.value !== state.inFlight.content`;
3. retain the older receipt in `pendingReconciliation` so its analysis can complete or be superseded;
4. make `flush()` loop into the second conditional save;
5. add CodeView navigation/close regression proof;
6. add or update the live test to read the latest server bytes before allowing target change;
7. run the exact focused tests, full web suite, typecheck, lint, feature mechanization, and pre-push verification;
8. reply to and resolve the P1 thread only with commit and test evidence;
9. merge PR #1996 only after all required workflows rerun successfully on the final head.

After that merge, start the revision-bound Project Authoring receipt as a separate vertical. Do not combine recovery, state-model refactoring, analysis scheduling, and release regeneration into the same product PR.

## 9. Release gates summary

A release candidate must satisfy all of the following:

- latest-buffer in-flight race fixed;
- no unresolved P1 review threads;
- exact file CAS proof retained;
- whole-project revision identity retained through Preview and Run, or the release scope explicitly excludes that claim;
- invalid/stale/unavailable analysis remains fail-closed;
- hard-exit behavior is described honestly;
- all required workflows green on the exact release head;
- no duplicate logical changelog entries;
- current status documentation updated;
- live browser proof reads server-authoritative bytes and verifies revision provenance.

## 10. Final judgement

DVT has made real progress toward a credible dbt file-authoring product:

- files are the authority;
- Canvas no longer needs to become a competing SQL store;
- compare-and-swap writes exist;
- invalid and stale analysis are explicit;
- Preview/Run provenance primitives exist;
- tests and architecture guards are extensive.

The remaining risk is not lack of architecture vocabulary. It is failure to close the complete user transaction under concurrency and failure to carry revision truth across surfaces.

The product should now stop expanding sideways and complete this chain:

```text
latest editor bytes
  -> durable CAS receipt
  -> exact dbt project revision
  -> retained analysis receipt
  -> Canvas projection
  -> Preview provenance
  -> Run admission
  -> reopen/recovery proof
```

Until that chain is closed, DVT is promising more authoring safety than it can prove. The correct next move is the focused PR #1996 race fix, followed by one revision-bound vertical—not another broad redesign.