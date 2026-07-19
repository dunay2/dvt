---
title: DVT Fowler Repository Review 2026-07-19 16:39 CEST
status: Review
owner: Architecture / Web / API / Runtime / Governance
reviewed_main_sha: 353ac8c724e51e703eaa7c5b9ff5db657fafb5f7
planning_type: review
---

# DVT Fowler Repository Review — 2026-07-19 16:39 CEST

## 1. Executive verdict

This review was performed against the exact current `main` commit:

- [`353ac8c724e51e703eaa7c5b9ff5db657fafb5f7`](https://github.com/dunay2/dvt/commit/353ac8c724e51e703eaa7c5b9ff5db657fafb5f7)
- merge of [PR #1993 — Preserve DBT code reconciliation truth](https://github.com/dunay2/dvt/pull/1993)

There is a material product improvement since the previous review at
`main@eb9a393edb01917be97437a2226c8a91791ff0e4`: PR #1993 is merged, its three
review findings are resolved, and the Code workbench now distinguishes durable
file persistence from dbt semantic reconciliation. The product is more honest
about `conflict`, `persisted_stale`, `persisted_invalid`, `persisted_unavailable`,
`persisted_verification_unavailable`, and `persisted_superseded` outcomes.
Manual file selection and project-scope changes were also repaired.

The improvement is real, but the transaction is not yet mature. The current
client can still display `synchronized` after observing a dbt graph revision
that is no longer the current project revision. The code already receives
`analysisSha256` and `projectContentSetSha256`, but the reducer discards both and
the reconciliation callback ignores the save receipt. This is not duplicate
authority; it is an incomplete proof of authority. It is the highest-priority
remaining defect because Preview and Run are explicitly intended to bind to the
same project revision under ADR-0060.

The second material defect is recovery posture. SPA navigation is guarded by an
async flush, but a hard browser exit only raises `beforeunload`; it cannot and
does not flush. The earlier PR wording overstated this as persistence across
hard-browser exit. Mature IDE behavior requires honest warning plus crash/local
buffer recovery, not an impossible async unload promise.

The release is not ready. [PR #1984](https://github.com/dunay2/dvt/pull/1984)
contains duplicate semantic changelog entries for both DBT execution-selection
recovery and DBT code reconciliation, and all six visible workflows on its
current head are `action_required`. The release must be regenerated or repaired
only after exact-revision reconciliation is closed and the release head is
actually validated.

**Recommended next implementation slice:** one vertical `SaveWorkspaceFileContent
→ ProjectDbtGraphFromFiles → verified project revision → Preview` transaction,
using the existing file CAS, `DbtProjectGraphProjection.projectRevision`, and
workspace batch-mutation vocabulary. Do not introduce a new save synonym or a
second graph authority.

## 2. Review scope and evidence

The review inspected:

- current `main` and recent commits;
- all open pull requests that could be confirmed through repository search and
  direct PR inspection;
- PR-head workflow runs, exact-commit status visibility, workflow trigger
  definitions, review threads, and release state;
- current Web Code/Canvas composition, workspace ports, API save use case,
  project analyzer use case, DBT YAML transaction command, navigation guard,
  status/recovery UI, and route/plugin composition;
- ADR-0060 and current architecture/status documents;
- current governance/test scripts and workflow scope behavior;
- product maturity against official dbt, Dagster, Airflow, Prefect, NiFi, and
  Temporal documentation.

Key repository evidence:

- [ADR-0060 — dbt Project Authoring Authority](../../../../adr/ADR-0060-dbt-project-authoring-authority.md)
- [CodeView](../../../../../apps/web/src/app/views/CodeView.tsx)
- [useCodeWorkingTreeSync](../../../../../apps/web/src/app/views/code/useCodeWorkingTreeSync.ts)
- [codeWorkingTreeSyncModel](../../../../../apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts)
- [workspaceFileReconciliationAuthority](../../../../../apps/web/src/app/views/code/workspaceFileReconciliationAuthority.ts)
- [CodeWorkingTreeNavigationGuard](../../../../../apps/web/src/app/views/code/CodeWorkingTreeNavigationGuard.tsx)
- [useDbtProjectFileCanvasController](../../../../../apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts)
- [workspace Web ports](../../../../../apps/web/src/app/ports/workspace.ts)
- [workspace API ports](../../../../../apps/api/src/application/ports/workspaceFiles.ts)
- [SaveWorkspaceFileContent use case](../../../../../apps/api/src/application/services/saveWorkspaceFileContentUseCase.ts)
- [ProjectDbtGraphFromFiles use case](../../../../../apps/api/src/application/services/projectDbtGraphFromFilesUseCase.ts)
- [ApplyDbtYamlDescriptionEdit command](../../../../../apps/api/src/application/services/dbtYamlDescriptionEdit/ApplyDbtYamlDescriptionEditCommand.ts)
- [Test Suite workflow](../../../../../.github/workflows/test.yml)
- [System Delivery Status](../../../../architecture/system-delivery-status.md)
- [Frontend Mature-System Gap Status](../../../status/frontend-mature-system-gap-status-20260602.md)

Official comparison sources:

- dbt Developer Hub / Studio IDE: <https://docs.getdbt.com/>
- Dagster product model: <https://docs.dagster.io/>
- Airflow DAG bundles and version pinning:
  <https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/dag-bundles.html>
- Prefect deployments and work pools:
  <https://docs.prefect.io/v3/concepts/deployments>
- NiFi versioned flows, local changes, provenance, and back pressure:
  <https://nifi.apache.org/nifi-docs/user-guide.html>
- Temporal durable execution: <https://docs.temporal.io/>

## 3. Repository and delivery state

### 3.1 Current main and recent commits

Current `main` is exactly `353ac8c724e51e703eaa7c5b9ff5db657fafb5f7`.
The immediately relevant sequence is:

1. `aabaeb7` — preserve manual DBT code file selection;
2. `08fb34f` — harden router presentation proof and remove the jsdom/Node
   `AbortSignal` mismatch;
3. `d14bd8a` — reset project code selection when scope changes;
4. `353ac8c` — merge PR #1993.

This is a material delta from the previous review, not planning-only motion.

### 3.2 Open pull requests

Confirmed open PRs at review time:

| PR | State | Purpose | Review judgement |
| --- | --- | --- | --- |
| [#1984](https://github.com/dunay2/dvt/pull/1984) | Open, non-draft | Release 0.5.0 | Not release-ready: duplicate changelog semantics and `action_required` workflows |
| [#1994](https://github.com/dunay2/dvt/pull/1994) | Open, draft | Previous documentation-only repository review | Based on old main; useful historical delta, but superseded as current route authority by this report |

PR #1993 is merged and no longer open. It had three review threads, all now
resolved:

- manual DBT file selection snapping back;
- router test failure caused by incompatible `AbortSignal` implementations;
- stale project selection when `initialPath` becomes absent.

No unresolved inline threads were found on #1984 or #1994.

### 3.3 CI and exact-tree confidence

The PR #1993 head `d14bd8a04e8b937819ad87bbfe2d574980693d06` has six
visible successful workflows:

- Dependency Review;
- Contracts & Determinism;
- Test Suite;
- CodeQL;
- CI — Code Quality;
- PR Quality Gate.

The exact merge commit has no legacy combined-status contexts and no
PR-associated workflow runs returned by the available commit-run inspection.
This is **not evidence that push CI did not run**: `.github/workflows/test.yml`
explicitly triggers on `push` to `main`, and the connector used for this review
returns only pull-request-associated runs for commit inspection. Therefore the
honest statement is:

- PR-head CI is green;
- push-to-main CI is configured;
- exact post-merge run completion for `353ac8c` was not independently retrieved
  through the available run API in this review.

The release head `976328bd27ca1eddb70ad7ca06baf11659a0f971` has six
visible workflows, all concluded `action_required`. This blocks a credible
release even though the PR is mergeable at the Git metadata level.

### 3.4 Release state

The repository package version on current main remains `0.4.0`. PR #1984 plans
`0.5.0` and changes only:

- `.release-please-manifest.json`;
- `CHANGELOG.md`;
- `package.json`.

The generated release notes contain two duplicated logical changes:

- `Add explicit DBT execution selection recovery` appears for both `ec47025` and
  `fa240f8`;
- `Preserve DBT code reconciliation truth` appears for both the source commit
  `55928c8` and merge commit `353ac8c`.

This is not harmless cosmetics. A release manifest is a product truth surface.
Duplicate source/merge topology makes it harder to identify the actual change,
review rollback scope, and audit the release. It also demonstrates that current
merge-message/release-note policy is not aligned.

## 4. Previous findings: fixed, active, superseded, or disproved

| Previous finding | Current status | Evidence and judgement |
| --- | --- | --- |
| Canvas and Code could act as duplicate SQL authorities | **Fixed for file-backed Canvas** | ADR-0060 is accepted; dbt project files are authoritative and Canvas is a projection. Unsupported semantic graph mutations fail instead of silently writing a shadow graph. |
| Empty or stale upper SQL fields could overwrite canonical code | **Fixed / superseded** | #1991 canonicalized model SQL authority and removed duplicate node-workbench code ownership. No new competing SQL field was found in the current file-backed path. |
| Code persistence success was conflated with valid dbt analysis | **Fixed** | #1993 introduced explicit reconciliation phases and does not roll back durably persisted content merely because analysis is stale, invalid, or unavailable. |
| Hidden/manual DBT file selection could snap back | **Fixed** | `aabaeb7` and the resolved #1993 thread preserve explicit selection unless scope makes it invalid. |
| Router guard test passed broad CI while failing its exact configuration | **Fixed** | `08fb34f` uses compatible test primitives and the review thread records exact-spec plus full-suite proof. |
| Project Code selection survived an authority/scope reset incorrectly | **Fixed** | `d14bd8a` clears the selection when `initialPath` is removed or scope changes. |
| Cross-file publication had no atomic mutation primitive | **Superseded as a blanket claim** | The API now owns `IWorkspaceFileBatchMutationPort`; governed DBT YAML edits and source import use atomic/idempotent batch mutation. Do not repeat the old claim for all cross-file commands. |
| A saved Code edit is proven against the exact analyzed project revision | **Still active** | File receipt, project analysis, and final file verification are separate observations. `projectContentSetSha256` is returned and then discarded; another project file can change without invalidating the final status. |
| Hard-browser exit guarantees persistence | **Still active and wording disproved** | `beforeunload` only warns. It does not and cannot await the async flush. The implementation is a warning guard, not guaranteed persistence. |
| Application reconciliation outcome is owned by a neutral port | **Still active** | Canvas imports a Code-view sync outcome; `SqlContextWorkbench` and Canvas controller exchange view-owned types. |
| Current architecture/status documents are reliable current truth | **Still active** | `system-delivery-status.md` was last reviewed in April; README dates disagree with its front matter; the product has changed materially in July. |
| Exact release tree is validated and ready | **Still active** | Release workflows are `action_required` and release notes duplicate semantic changes. |

## 5. Fowler-style diagnosis

### 5.1 Incomplete transaction boundary: file truth and project truth are not joined

**Smell:** leaky abstraction plus test-only confidence.

`SaveWorkspaceFileContent` proves only one file revision. The client then asks
Canvas-owned code to refresh the complete dbt project projection, then reads the
edited file again. That protects against the edited file being superseded, but
not against a different project file changing during reconciliation.

The current sequence is effectively:

```text
save file A @ hash A2
analyze project => project revision P2
read file A => still A2
mark synchronized
```

A concurrent write to file B can produce project revision P3 after analysis but
before status publication. File A still equals A2, so the UI can claim
`synchronized` while its Canvas projection is P2 and the current project is P3.

The code already carries the correct primitive:
`DbtProjectGraphProjection.projectRevision.contentSetSha256`. However:

- `useDbtProjectFileCanvasController.reconcileCodeFilePersistence` ignores its
  `WorkspaceFileSaveReceipt` argument;
- `CodeWorkingTreeReconciliationOutcome.fresh` carries `analysisSha256` and
  `projectContentSetSha256`;
- `codeWorkingTreeSyncModel` discards both when reducing the outcome;
- `workspaceFileReconciliationAuthority` verifies only path and file hash.

This is classic **message chain without invariant ownership**. Every layer has a
piece of the truth, but no domain object owns the statement “this persisted file
was analyzed as part of this exact project revision.”

### 5.2 Responsibility overload and change amplification

**Smell:** large controller, feature envy, and shotgun surgery.

`useDbtProjectFileCanvasController.ts` is nearly 500 lines and owns:

- project query and projection;
- graph layout and viewport persistence;
- selection and execution scope;
- validation;
- selection recovery;
- import focus;
- inspector/code workbench state;
- reconciliation callback;
- graph, Chrome, and Canvas command surfaces.

`CodeView.tsx` is more than 350 lines and owns route bootstrap, tree scoping,
selection, file/history queries, local editor buffer, persistence,
reconciliation, navigation guard, status rendering, and layout composition.

The #1993 slice touched 39 files and appended multiple planning migrations to
close one authoring transaction. Some breadth was justified by tests and
mechanized governance, but the pattern remains expensive. The danger is not
line count by itself; it is that one invariant change requires edits across
Canvas presentation, Code presentation, ports, copy, tests, planning DB, and
closeout evidence.

### 5.3 Primitive obsession around hashes

**Smell:** strings represent domain identities without a transaction type.

The system uses multiple raw strings:

- file `contentSha256`;
- `analysisSha256`;
- `projectContentSetSha256`;
- idempotency keys;
- operation request hashes.

The hashes are valuable, but the type system does not encode their relationship.
A `fresh` outcome containing two strings is not the same as a verified
`DbtProjectAnalysisReceipt` tied to a persisted workspace mutation. The YAML
description path already has a stronger receipt vocabulary and should be the
model, not a parallel invention.

### 5.4 Hard-exit contract is impossible as currently described

**Smell:** misleading abstraction.

SPA navigation can await `flush()`. Browser unload cannot reliably wait for a
normal asynchronous request. Current code correctly uses `beforeunload` to warn,
but the PR description and top-level concern imply persistence coordination for
browser navigation. The code does not provide it.

An honest product must distinguish:

- durable server synchronization;
- unsaved local buffer;
- browser-exit warning;
- crash-recoverable local draft;
- Git staged/committed/pushed state.

ADR-0060 already rejects conflating working-tree writes with Git synchronization.
The same honesty must be applied to browser durability.

### 5.5 Reanalysis can become a scalability bottleneck

**Smell:** whole-aggregate work on a high-frequency UI event.

The Code sync debounce is 400 ms. Every accepted save can invoke full
`ProjectDbtGraphFromFiles`, which calls the analyzer for the project. The sync
loop serializes work, so it avoids uncontrolled parallelism, but a large project
can still spend most of its authoring time analyzing after short pauses.

The mature pattern is latest-revision coalescing:

- persist file edits quickly and safely;
- analyze only the latest known project revision;
- cancel or supersede obsolete client requests where possible;
- force exact-revision validation at Preview/Run admission.

DVT should not fake incremental dbt semantics it does not own. It should expose
truthful `persisted / analysis pending / analysis fresh / invalid / unavailable`
posture and coalesce work.

### 5.6 Governance truth is stale and too expensive to consume remotely

**Smell:** stale truth and process substituting for product evidence.

`system-delivery-status.md` is still marked active but was reviewed in April.
README points contributors to it as current state while quoting a different
review date. `generated-code-state.md` is only a pointer to a local untracked
render. This means a remote reviewer cannot reconstruct the claimed current
inventory from Git alone without running a substantial governance toolchain.

The governance suite is extensive and valuable, but it must not become a
parallel product whose green state is mistaken for a closed user transaction.
The repo needs a small, tracked, generated current-capability summary tied to a
main SHA, while detailed inventories can remain generated locally.

### 5.7 Release topology duplicates semantic changes

**Smell:** duplicate representation of one change.

Both source commits and conventional merge commits enter release notes. That is
an integration-policy problem, not a writer problem. A mature release pipeline
must define one changelog source per logical PR and prove deduplication.

## 6. Product comparison with mature systems

DVT should not imitate every surface. It should match mature systems where the
feature is necessary for trust, differ where DVT's graph/code duality is a real
advantage, and defer breadth until the core transaction is complete.

| Mature system | Relevant mature behavior | DVT should match | DVT should differ or defer |
| --- | --- | --- | --- |
| dbt Studio / dbt tooling | One web IDE for build, test, run, and version-controlled dbt projects; current dbt tooling also emphasizes live validation and lineage | Exact project revision, code/graph parity, actionable diagnostics, Git-aware status, Preview/Run tied to code identity | Do not reproduce dbt syntax or create a DVT language; dbt files remain authority |
| Dagster | Asset-centered lineage, observability, testability, checks, and run evidence | Node/asset evidence query, lineage drill-down, run-to-source navigation | Defer a broad asset catalog until authoring and run provenance are exact |
| Airflow 3 | Versioned DAG bundles pin a run to one code version; workers execute the scheduler-selected version | Preview and Run must bind to one immutable project content-set identity | DVT need not copy DAG authoring or scheduler UX; reuse its own plan/runtime contracts |
| Prefect | Deployments version when/where/how a flow runs; work pools expose governed infrastructure and readiness | Explicit deployment/environment identity, readiness, evented operation status | Defer broad infrastructure templates until one runtime target is professionally complete |
| NiFi | Visual flow design, visible local/stale/version states, show/revert/commit local changes, provenance, back pressure | Conflict/stale posture, reviewable local changes, recovery, provenance, visible queue/pressure where DVT streams data | Do not use Canvas as a lossy generator for arbitrary dbt code; visual edits remain capability-scoped |
| Temporal | Durable execution resumes after failures through event history | Runtime durability, idempotency, retries, operation IDs, exact run provenance | Temporal durability does not solve browser/editor durability; keep these bounded contexts separate |
| Professional IDE/VCS | Unsaved-buffer recovery, diff/merge, explicit working tree/stage/commit/push states | Local crash recovery, three-way conflict handling, exact file/project status | Do not expose fake Git actions before a real connector and accepted rails exist |

DVT's current advantage is the explicit ADR-0060 authority split. Mature systems
frequently choose either code-first or visual-first. DVT can support both, but
only by keeping them mutually exclusive per Canvas and using a lossless,
capability-scoped bridge. That direction is correct and should not be reversed.

## 7. Priority implementation route

### Priority 1 — Revision-bound Code reconciliation

**Severity:** Critical / P1.

**Evidence**

- save receipt contains only the edited file revision;
- analyzer returns `projectRevision.contentSetSha256`;
- fresh outcome returns project and analysis hashes;
- reducer discards those identities;
- final authority check re-reads only the edited file;
- Canvas callback ignores the receipt.

**Root cause**

The transaction is orchestrated across presentation callbacks instead of owned
by one application result. File CAS and project analysis are individually
correct but not joined into a verified revision-bound receipt.

**User/product impact**

A user can see `synchronized` and a refreshed Canvas while another file change
has already made that projection stale. Preview may then refresh again, but the
editor status was false at the moment it was shown. In multi-user, multi-tab, or
source-import scenarios this becomes a real race rather than a theoretical one.

**Exact domain owner**

`Workspace Project Authoring` application boundary, jointly implemented by API
Workspace I/O and dbt Integration. It must not be owned by Canvas or Code view.

**Existing contracts/domain objects to reuse**

- `WorkspaceFileSaveReceipt` and file CAS;
- `IWorkspaceFileBatchMutationPort` for atomic cross-file commands;
- `DbtProjectGraphProjection.projectRevision.contentSetSha256`;
- `analysisSha256`;
- ADR-0060 authority binding;
- the stronger DBT YAML `analysis` receipt pattern.

**Proposed contract change**

Extend the existing save result in place; do not introduce
`SaveCodeWorkspaceFileBuffer` or another save synonym.

A minimal compatible v2 shape:

```ts
type WorkspaceProjectRevision = Readonly<{
  contentSetSha256: string;
}>;

type WorkspaceFileSaveReceiptV2 = WorkspaceFileSaveReceipt & Readonly<{
  projectRevisionAfterWrite: WorkspaceProjectRevision;
}>;

type WorkspaceFileReconciliationReceipt =
  | {
      kind: 'fresh';
      path: string;
      fileContentSha256: string;
      projectRevision: WorkspaceProjectRevision;
      analysisSha256: string;
    }
  | { kind: 'invalid'; projectRevision: WorkspaceProjectRevision; diagnostics: readonly Diagnostic[] }
  | { kind: 'unavailable'; projectRevision: WorkspaceProjectRevision | null }
  | { kind: 'superseded'; observedProjectRevision: WorkspaceProjectRevision; currentProjectRevision: WorkspaceProjectRevision };
```

The exact naming should follow existing contract conventions. The invariant is
more important than the label: `fresh` may only be emitted when the analyzer's
project content set equals the post-write/current authoritative project content
set.

**Command/query and port changes**

- extend `SaveWorkspaceFileContent` response to include a project content-set
  revision computed by the repository boundary after the write;
- extend `ProjectDbtGraphFromFiles` input with optional
  `expectedProjectContentSetSha256` or add a strict mode to the existing query;
- on mismatch, return/throw a typed `ProjectRevisionSuperseded` outcome rather
  than silently analyzing latest;
- expose one neutral Web application port such as
  `IWorkspaceProjectFileReconciliationPort.reconcile(receipt, canvasId)`;
- remove `CodeWorkingTreeReconciliationOutcome` ownership from
  `views/code` and move the discriminated union to the neutral port/model;
- preserve the current UI phases, but store the verified receipt identity in
  state so Preview can compare or invalidate it.

**Likely files/components**

- `apps/api/src/application/ports/workspaceFiles.ts`;
- local workspace repository/gateway that computes content-set revision;
- `apps/api/src/application/services/saveWorkspaceFileContentUseCase.ts`;
- `apps/api/src/application/services/projectDbtGraphFromFilesUseCase.ts`;
- workspace HTTP schemas/routes;
- `apps/web/src/app/ports/workspace.ts` or a focused new
  `workspaceProjectAuthoring.ts` port;
- `apps/web/src/app/services/workspace/workspacePorts.api.ts`;
- `apps/web/src/app/views/code/useCodeWorkingTreeSync.ts`;
- `apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts`;
- Canvas composition only to inject the neutral port, not to own the operation.

**Migration and compatibility**

- add versioned response parsing or make the new field optional for one release;
- when absent, produce `persisted_verification_unavailable`, never `fresh`;
- retain existing v1 file CAS semantics;
- do not change graph-draft authority or existing DBT YAML operation receipts;
- migrate YAML receipt internals to the same neutral revision type after the
  Code path is green, not in the first PR.

**Rollback posture**

- feature-flag strict revision verification at the API composition boundary;
- rollback may return to current degraded verification, but must never silently
  interpret missing revision as fresh;
- persisted file content remains durable and recoverable because analysis is an
  observation, not a compensating write.

**Observability**

Emit structured, content-free events/metrics:

- `workspace.file.save.completed` with operation ID, path hash, disposition,
  latency, and project revision hash prefix;
- `dbt.project.analysis.completed` with status, duration, resource count, and
  revision identity;
- `workspace.file.reconciliation.superseded` counter;
- correlation from editor operation ID to Preview receipt.

Never emit SQL/YAML content, credentials, or full tenant identifiers.

**Security implications**

- preserve tenant/project/environment scope on every operation;
- project revision must be server-computed, not client-asserted;
- expected revision is a concurrency precondition, not authorization;
- retain fail-closed path policy and bounded traversal;
- ensure diagnostics redact filesystem roots, profiles, and secrets.

**PR decomposition**

1. **PR A — contract and repository proof:** add server-computed project
   revision to existing file save receipt with API/adapter tests.
2. **PR B — strict analysis:** bind `ProjectDbtGraphFromFiles` to expected
   project revision and return typed supersession.
3. **PR C — Web neutral port/state:** consume and retain verified receipt;
   remove Canvas/Code view-owned result coupling.
4. **PR D — Preview/Run gate:** require current verified project revision or
   force one strict reconciliation before Preview.

Each PR should be independently releasable and avoid changing unrelated Canvas
layout/execution code.

**Red tests**

- save A, mutate B before analysis, then reconcile: must not emit `fresh`;
- analyze P2, mutate B to P3 before final verification: must emit superseded;
- response without project revision: Web must show verification unavailable;
- stale tenant/project/environment expected revision cannot authorize a write;
- Preview with verified receipt P2 while project is P3 must refuse or refresh.

**Green tests**

- save A and analyze exact P2: synchronized receipt retains P2 and analysis hash;
- unchanged save can reuse exact current revision safely;
- invalid analysis preserves file and reports P2 invalid;
- unavailable analyzer preserves file and reports durable-but-unverified;
- source import via batch mutation invalidates the prior Code receipt.

**Live browser/integration proof**

Use two browser contexts against real API rails:

1. open the same dbt project in both;
2. edit model A in context 1;
3. mutate model B or YAML in context 2 during reconciliation;
4. prove context 1 never shows fresh synchronization for the obsolete revision;
5. refresh/reconcile and prove Canvas, Preview, and Code converge on one revision;
6. start a run and prove its bundle revision equals the Preview revision.

**Acceptance criteria**

- no `fresh/synchronized` state without an exact verified project revision;
- Canvas, Code, Preview, and Run receipts expose the same content-set identity;
- no new save command synonym;
- file-backed Canvas never writes graph-draft semantics;
- all degraded outcomes preserve durable content and offer a truthful action.

**Release gates**

- contract schema and negative compatibility tests;
- API integration race proof;
- Web reducer/state tests;
- live two-context proof artifact;
- Preview→Run revision equality proof;
- current architecture and command/query inventory updated.

### Priority 2 — Honest hard-exit and crash recovery

**Severity:** High / P1 for data-loss confidence.

**Evidence**

`CodeWorkingTreeNavigationGuard` awaits flush for SPA transitions but the
`beforeunload` handler only calls `preventDefault()` and sets `returnValue`.
There is no browser-exit flush or local crash buffer.

**Root cause**

The design treats two different browser lifecycle guarantees as one concern.
Normal route navigation is controllable; hard unload is not.

**User/product impact**

If autosave has not completed and the user confirms exit, edits can be lost.
The UI cannot recover after tab crash, browser crash, or transient offline
closure. This is below professional IDE behavior.

**Exact domain owner**

`Code Authoring Session`, separate from server Workspace I/O and separate from
Git lifecycle.

**Proposed contracts/domain objects**

```ts
type LocalCodeDraft = Readonly<{
  scopeKey: string;
  path: string;
  baseContentSha256: string;
  value: string;
  updatedAt: string;
}>;

type CodeDraftRecoveryDecision =
  | { kind: 'restore' }
  | { kind: 'discard' }
  | { kind: 'compare' };
```

Use an IndexedDB/local persistence adapter behind an application port. Do not
place raw editor content in localStorage and do not call this Git stash.

**Command/query and port changes**

- `PersistLocalCodeDraft` on buffer changes using a coalesced local write;
- `GetRecoverableCodeDraft` on editor open;
- `DiscardLocalCodeDraft` only after server synchronization or explicit user
  discard;
- keep current `flush` for SPA close;
- change copy/documentation from “save on browser exit” to “warn before exit;
  recover local draft on return.”

**Likely files/components**

- focused `codeAuthoringSession` port/model outside `views/code`;
- `useCodeWorkingTreeSync` integration;
- `CodeWorkingTreeNavigationGuard` wording/contract;
- recovery dialog/diff component;
- browser-storage adapter and security policy tests.

**Migration/compatibility**

No server migration. Draft schema must be versioned and disposable. Existing
users simply have no recovery candidate.

**Rollback posture**

Disable local recovery adapter and retain current warning. Never claim restored
content was server-synchronized.

**Observability**

Count draft created/restored/discarded/expired without content. Record storage
errors and quota failures.

**Security implications**

- local drafts may contain sensitive SQL or identifiers;
- key by authenticated scope and clear on logout/scope loss;
- define bounded TTL and size;
- never persist credentials, `profiles.yml`, or secrets;
- do not sync drafts across users/devices without a separate encrypted design.

**PR decomposition**

1. correct hard-exit contract and tests;
2. local draft storage port/adapter;
3. recovery compare/restore UX;
4. accessibility and browser E2E proof.

**Red/green tests and live proof**

- red: close during pending save, reopen, no recovery;
- green: pending buffer restored with base/current diff;
- conflict after server file changed shows compare, not silent restore;
- logout removes drafts for the prior scope;
- keyboard and screen-reader path can restore/discard/compare;
- hard unload copy never promises an async server save.

**Acceptance criteria/release gate**

No silent loss in tested crash/reopen path; explicit recovery posture; no false
Git/server synchronization label; security/TTL policy documented and tested.

### Priority 3 — Release and exact-tree verification

**Severity:** High / P1 for release integrity.

**Evidence**

- release head workflows are `action_required`;
- changelog contains duplicated logical changes;
- PR-head CI is green, but exact post-merge run completion was not retrievable in
  this review;
- release is generated from a merge topology that emits both source and merge
  messages.

**Root cause**

Release-note identity and merge identity are not normalized to one logical PR.
CI evidence is spread across PR heads, push runs, and release branches without a
single release attestation.

**User/product impact**

A version can be published with ambiguous contents or without a clearly
validated exact source tree. Rollback and audit become slower and error-prone.

**Exact owner**

Release Engineering / CI Governance.

**Proposed contract/domain objects**

- `ReleaseCandidateReceipt { version, mainSha, releaseHeadSha, changelogDigest,
  requiredChecks, artifactDigests }`;
- one changelog entry identity per merged PR;
- release gate that consumes the receipt, not a visual “mergeable” state.

**Command/query and workflow changes**

- retain `push: main` workflows;
- add/confirm `merge_group` where merge queue is used;
- add a release-candidate workflow that checks out the exact main SHA recorded by
  release-please and runs required validations;
- add a deterministic changelog duplicate guard based on normalized PR/commit
  identity;
- choose one merge policy: non-conventional merge commits plus conventional
  source commits, or squash merge with one conventional commit. Do not allow both
  to become release entries.

**Migration/compatibility**

Repair/regenerate #1984 before merge. Historical changelogs remain immutable
unless a correction note is required.

**Rollback posture**

A failed release candidate never changes package version/tag. A published bad
release requires a new corrective release, not a rewritten tag.

**Observability/security**

- publish run and artifact links in release receipt;
- pin all Actions by immutable SHA, as current workflows already largely do;
- keep release token permissions minimal;
- store provenance/attestation without exposing secrets.

**PR decomposition**

1. duplicate-changelog regression test;
2. merge/release message policy update;
3. exact-tree release candidate attestation;
4. regenerate #1984 from current main.

**Acceptance/release gates**

- zero duplicate logical entries;
- all required workflows successful, not skipped/action-required;
- release receipt references exact `main` and artifact digests;
- tag/package/changelog version agree;
- rollback instructions and previous tag verified.

### Priority 4 — Extract neutral authoring-session orchestration and coalesce analysis

**Severity:** High / P2 maintainability and performance.

**Evidence**

Canvas imports Code-view reconciliation types; the Canvas controller owns the
reconciliation callback; CodeView owns query, editor, persistence, reconciliation,
navigation, and presentation; every 400 ms accepted save may trigger whole-project
analysis.

**Root cause**

A vertical feature was composed through convenient presentation callbacks
instead of a neutral application service. The state machine is good, but its
owner is misplaced.

**User/product impact**

Large projects can experience analysis latency after short typing pauses.
Future conflict/recovery/telemetry work will require touching both major views,
increasing regression risk.

**Exact owner**

Web `Workspace Project Authoring` application layer.

**Proposed contracts/domain objects**

- neutral `WorkspaceProjectAuthoringSession` state;
- `ReconcileWorkspaceFileMutation` port from Priority 1;
- explicit `analysisPending` with latest requested/verified project revision;
- no new Canvas or Code semantic authority.

**Command/query changes**

- Code emits buffer changes and file mutation intent to the session;
- session calls existing save command and strict project query;
- Canvas subscribes to verified projection/revision query state;
- Preview forces latest strict verification;
- coalesce obsolete analyses by revision; do not run two analyses for revisions
  already superseded before start.

**Likely files**

- new focused Web application model/hook under `app/application` or accepted
  equivalent;
- shrink `CodeView` and `useDbtProjectFileCanvasController` adapters;
- move outcome types out of `views/code`;
- update architecture dependency guard to forbid Canvas importing Code internals.

**Migration/rollback**

Use an adapter preserving current props while migrating one call site at a time.
Keep current UI phase copy. Roll back by restoring adapter composition, not by
changing API semantics.

**Observability/security**

Measure save and analysis latency separately, queue/coalescing count, stale
results, and project sizes. Do not log code.

**PR decomposition**

1. move types and add architecture guard;
2. extract reconciliation service with identical behavior;
3. add latest-revision coalescing;
4. reduce controllers and update docs.

**Tests/live proof/acceptance**

- architecture test: Canvas cannot import `views/code/*` internals;
- burst typing persists latest content and analyzes only latest necessary
  revision;
- Preview waits for or forces current revision;
- no changed visible phases except improved pending identity;
- performance evidence on small, medium, and large fixture projects.

## 8. Secondary product gaps after the next slice

These remain important, but implementing them before the revision transaction
would widen an unstable foundation:

1. **Three-way conflict UX.** Current conflict/superseded action is reload. Mature
   IDE/NiFi behavior needs compare, keep mine as a new CAS attempt, accept
   current, and explicit discard.
2. **Run cancellation and recovery.** Backend/runtime vocabulary exists, but the
   frontend still lacks mature governed controls and state-specific actions.
3. **Run-to-source and node evidence.** Dagster/Airflow-class navigation requires
   one node execution evidence query and links to exact Canvas/code/revision.
4. **Unified workflow/asset discovery.** Valuable, but defer until authoritative
   identities and run provenance are stable.
5. **Warehouse connection maturity.** API rails exist, but negative E2E evidence
   for credentials, redaction, tenant isolation, duplicate names, unsupported
   adapters, and audit-write failure must remain a release concern.
6. **Admin surface honesty.** The API workspace adapter still explicitly rejects
   admin roles/audit reads. The Admin route must not present mock or implied
   completeness.
7. **Production observability and retention.** Current status documents still
   describe incomplete OpenTelemetry production validation and regulated archive
   erasure. Do not claim enterprise operability until those are proven.

## 9. Accessibility, performance, security, recovery, and operability review

### Accessibility

Positive evidence:

- Monaco receives a file-specific `ariaLabel`;
- `CodeWorkingTreeStatus` uses `role=status` or `role=alert`, `aria-live`, and
  `aria-atomic`;
- retry/reload actions are real buttons;
- recent workbench fixes addressed keyboard reachability.

Remaining requirements:

- recovery/conflict UI must provide keyboard-operable compare decisions;
- status announcements should not become noisy during every 400 ms cycle;
- browser live proof should include focus retention when reconciliation changes
  status or file scope.

### Performance

Primary risk is full-project analysis frequency, not React rendering alone.
Capture project file/resource counts and analyzer duration. Establish a budget:
server save p95, analysis p95 by project size, status announcement rate, and
Preview admission latency. Coalesce obsolete revisions before considering
incremental analysis.

### Security and data integrity

Positive evidence:

- server-side tenant/project/environment scope;
- content hash CAS;
- typed revision conflict;
- invalid path vocabulary;
- batch idempotency and request hashes;
- ADR excludes profiles, secrets, generated output, and editor-private layout
  from runtime bundles;
- YAML mutation recomputes proposal integrity and verifies written hash.

Remaining requirements:

- server-compute project revision;
- redact analyzer diagnostics and telemetry;
- local recovery storage policy;
- preserve path traversal/symlink/bounded traversal negative tests;
- do not interpret hashes as authorization;
- exact Preview→Run bundle revision equality.

### Recovery

Runtime durability through Temporal and outbox/postgres foundations does not
cover editor durability. The product needs separate policies for:

- editor buffer recovery;
- workspace file CAS conflict;
- project analysis retry;
- Preview/Run replay identity;
- runtime workflow retry/recovery;
- Git rollback.

Conflating these would create a product dead end.

### Operability

The repo has health/readiness endpoints, worker metrics, run events, CI gates,
and extensive governance. Current weakness is correlation: an authoring edit,
analysis, Preview, and Run should share a content-set identity and operation
correlation chain. Once that exists, operational dashboards can answer “which
code revision produced this plan/run?” without inference.

## 10. Documentation and governance corrections

The next functional PR must also update current truth without creating another
large review island:

1. refresh `system-delivery-status.md` with current main SHA and July capability
   state;
2. correct README's quoted review dates;
3. update `frontend-mature-system-gap-status-20260602.md`:
   - mark raw graph/code authority gap substantially closed by ADR-0060/#1991;
   - replace retired proposed save synonyms with the actual remaining
     revision-bound reconciliation gap;
4. add a small tracked generated capability summary tied to main SHA;
5. keep detailed generated inventory outside Git if necessary, but make remote
   current-state verification possible;
6. reduce planning migration amplification: one immutable task-state migration
   per coherent PR where possible, rather than multiple corrective migrations in
   the same unmerged branch.

Documentation is not the implementation. No capability should be declared
mature solely because its symbols are mechanized.

## 11. Recommended delivery order

1. **Revision-bound save/reconcile contract** — server project revision on save.
2. **Strict project analysis** — expected revision and supersession outcome.
3. **Neutral Web authoring session** — retain verified receipt and remove
   view-to-view coupling.
4. **Preview/Run revision gate** — exact content-set equality.
5. **Live two-context proof and telemetry.**
6. **Hard-exit honesty and local draft recovery.**
7. **Release pipeline deduplication and exact-tree attestation.**
8. **Regenerate and validate 0.5.0.**
9. **Conflict compare/resolve UX.**
10. **Run control/evidence/discovery breadth.**

The first four steps are one product transaction and should be delivered as
narrow dependent PRs. Do not start a broad asset catalog, new DSL, or second
runtime adapter before this transaction is closed.

## 12. Final release gate for the recommended slice

The slice is complete only when all of the following are true:

- exact current project revision is present in save/reconciliation receipt;
- `fresh` cannot be emitted for an obsolete content set;
- Canvas, Code, Preview, and Run expose the same project revision;
- concurrent second-file mutation is covered by API and browser proof;
- invalid/unavailable analysis preserves durable content without false success;
- architecture guard prevents Canvas→Code-internal imports;
- telemetry correlates edit, analysis, Preview, and Run without logging content;
- accessibility proof covers status and conflict/recovery controls;
- current status docs are refreshed and old gap claims reclassified;
- release changelog has no duplicate logical entries;
- all required workflows succeed on the release candidate's exact source tree;
- branch, package version, changelog, tag, and artifact provenance agree.

Until these gates pass, DVT has a promising and materially improved dbt
file-authoritative workbench, but not yet the revision-safe professional
authoring transaction offered by mature IDE/data-platform systems.
