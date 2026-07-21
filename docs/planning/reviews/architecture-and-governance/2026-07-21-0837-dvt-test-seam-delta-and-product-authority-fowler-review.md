---
title: DVT test-seam delta and product-authority Fowler review
date: 2026-07-21T08:37:00+02:00
status: current-review
reviewed_main_sha: e36a2ef211e915afa654a1220fab1942f55abda1
scope: documentation-only
---

# DVT test-seam delta and product-authority Fowler review

## Purpose and authority posture

This is a point-in-time engineering review for the GPT implementing work in
[`dunay2/dvt`](https://github.com/dunay2/dvt). It reviews the exact current `main`, recent merges,
open pull requests, CI identity, review threads, release posture, actual product code, contracts,
tests, governance, operability, security, recovery, and current documentation.

This document does **not** replace Planning DB as the active work authority, authorize a merge, or
change product behavior. Accepted findings should be reconciled into existing Planning DB rails rather
than becoming a parallel backlog.

`main` advanced once while this review was being assembled. The review branch was therefore reset to
and rebuilt from exact final `main@e36a2ef211e915afa654a1220fab1942f55abda1` before publication.

## Reviewed identities

- Repository: `dunay2/dvt`
- Exact current `main`: [`e36a2ef211e915afa654a1220fab1942f55abda1`](https://github.com/dunay2/dvt/commit/e36a2ef211e915afa654a1220fab1942f55abda1)
- Previous reviewed `main`: [`6d8167ace3650cf68c1ebcadd84b604b5db1792e`](https://github.com/dunay2/dvt/commit/6d8167ace3650cf68c1ebcadd84b604b5db1792e)
- Last product-authoring merge: [PR #1996](https://github.com/dunay2/dvt/pull/1996)
- Current release PR: [PR #2023 — Release 0.5.2](https://github.com/dunay2/dvt/pull/2023)
- Previous review PR: [PR #2025](https://github.com/dunay2/dvt/pull/2025), superseded by this review
- Review branch: `agent/dvt-review-20260721-0837`

## Executive verdict

There is active repository work, but there is **no new user-facing product capability** since PR
#1996. The delta since the previous review consists of:

1. deterministic Canvas viewport test adapters;
2. an architecture guard aligned to that test seam;
3. Radix menubar maintenance;
4. Radix navigation-menu maintenance.

The test fixes are legitimate. They remove import-order-dependent mocking that could load the real
React Flow hook without a provider under the CI single-fork presentation suite. The dependency updates
carry upstream keyboard, accessibility, React 19, and tree-shaking fixes.

However, the product-authority route remains untouched. The highest-priority product defect is still
the unresolved PR #1996 P2: Code can report `synchronized` and discard the matching DBT
reconciliation outcome when a user edits during reconciliation and returns to the already persisted
bytes before analysis completes.

The next functional PR should split persistence and semantic reconciliation state. It must not be
mixed with release maintenance, workspace pagination, atomic publication, or a generic authoring
framework.

After that, DVT should bind Code, Canvas, Preview, and Run to one exact project revision, then replace
graph-first sequential file writes with the atomic batch mutation authority already present in the
API.

## Material delta since the previous review

### PR #2026 — deterministic Canvas test adapters

[PR #2026](https://github.com/dunay2/dvt/pull/2026) fixed an order-dependent test seam. Canvas viewport
behavior specs now register explicit React Flow and node-registry adapters before importing the
subject. The shared harness no longer hides module mocks whose effect depended on import order.

This is a real quality improvement: prior tests could pass or fail according to suite ordering rather
than product behavior. Its final head had all six standard workflows green.

### PR #2027 — architecture guard aligned to the owner

[PR #2027](https://github.com/dunay2/dvt/pull/2027) moved the test-adapter invariant into the owning
Canvas viewport architecture spec and removed a stale assertion against retired harness internals.
The final head had all six standard workflows green and no inline review threads.

### PR #2010 — Radix menubar maintenance

[PR #2010](https://github.com/dunay2/dvt/pull/2010) updated `@radix-ui/react-menubar` from `1.1.16` to
`1.1.21`, including upstream keyboard-event and tree-shaking fixes. Its final head had all six standard
workflows green.

### PR #2011 — Radix navigation-menu maintenance

[PR #2011](https://github.com/dunay2/dvt/pull/2011) updated `@radix-ui/react-navigation-menu` from
`1.2.5` to `1.2.19`. Upstream changes include invalid `aria-controls` correction, React 19 render-loop
hardening, type fixes, and improved tree-shaking. This is valuable maintenance, not a DVT product
vertical.

### Fowler interpretation

The Canvas test seam is healthier, but its cost remains high. A narrow test-boundary correction
changed behavior specs, a shared harness, two explicit adapters, architecture tests, a retired
assertion, package state, lockfile state, and two Planning DB migrations.

This is **shotgun surgery** and **governance amplification**. The answer is not to remove governance;
it is to stabilize smaller application boundaries and avoid representing one invariant repeatedly in
manual surfaces.

No production Code, Canvas, API, execution-runtime, or contract implementation for the previously
recommended product route appears in this delta. No visible DBT/Code implementation branch or
functional PR for that route is open.

## Open pull requests and release state

## PR #2023 — release 0.5.2

PR #2023 is open, non-draft, and mergeable. Its exact head is
`0b99ef3b1ed1f73a8d43778f836ad6fa68e841db` and its base is exact current `main@e36a2ef`.

The release notes are concise and contain maintenance outcomes only:

- Checkout, Setup Python, Setup Node, CodeQL, and lint-tool updates;
- Canvas viewport test isolation and architecture guard alignment;
- Radix menubar and navigation-menu updates.

The prior merge-parent duplication is not present.

The previous release head had six standard workflows green. Because Release Please updated the head
after PR #2011 merged, the final head must be rechecked before merge. This review cannot prove the
custom **Release candidate integrity** Check Run because the connector does not expose it.

There are no inline review threads or submitted reviews. The only conversation item is a Codex notice
that automated review usage limits were reached. A human review and direct verification of the custom
check are still required.

## Exact-main CI identity

The connector exposes no PR-triggered workflow runs or commit statuses on exact `main@e36a2ef`. Green
evidence exists on final PR heads, not on the current squash tree. This is an evidence limitation, not
proof that `main` is defective.

## Previous review PR

PR #2025 describes `main@6d8167a` and is now stale. It should not compete with Planning DB or this
newer snapshot as current-state authority. This review does not close or modify it.

## Review-thread state

### Active — PR #1996 P2

One non-outdated inline thread remains unresolved in merged PR #1996.

Sequence:

1. persisted bytes are `A`;
2. DBT reconciliation for save receipt `R1` is pending;
3. user edits to `B`, moving the scalar phase from `reconciling` to `modified`;
4. user returns to `A` before `R1` completes;
5. `persistedReconciliationPhase` is still null, so the reducer projects `synchronized`;
6. the matching `R1` result arrives;
7. the reducer ignores it because completion is accepted only while `phase === 'reconciling'`.

Invalid, stale, unavailable, verification-unavailable, superseded, or failed project truth can be
lost.

### Correctly resolved — PR #1996 P1s

The two earlier P1 threads remain resolved:

- edits made while file persistence is in flight cannot be approved by `flush()` before the latest
  bytes are saved;
- edits made while reconciliation is in flight remain modified and require another persistence
  command.

The next refactor must preserve these behaviors.

Recent PRs #2026, #2027, #2010, #2011, and #2023 expose no inline review threads.

## Previous finding disposition

| Finding | Disposition | Current evidence |
| --- | --- | --- |
| Lost edits during persistence | **Fixed** | PR #1996 resolved P1 with reducer/hook interleaving proofs. |
| Lost edits during reconciliation | **Fixed** | Newer buffer remains modified and requires another save. |
| Raw selection-recovery transport detail shown to user | **Fixed** | Localized domain copy is used. |
| Duplicate merge/parent release notes | **Fixed** | Current release notes are PR/outcome oriented. |
| Release workflows stuck in `action_required` | **Fixed on prior release head; final head requires refresh check** | Release head changed after PR #2011. |
| Order-dependent Canvas viewport mocks | **Fixed** | PRs #2026/#2027 introduced explicit adapters and owning guard. |
| Pending reconciliation disappears after edit/revert | **Active** | PR #1996 P2 unresolved; reducer still requires `phase === reconciling`. |
| Save receipt ignored during project reconciliation | **Active** | Canvas callback names it `_receipt` and fetches latest graph. |
| Graph-first publication is sequential | **Active** | `canvasPlanAction.ts` writes each artifact independently. |
| Workspace/import capability mismatch | **Active** | Import accepts 10,000 files/50 MB; interactive listing stops at 500 and files at 1 MB. |
| Runtime response validation in generic Web client | **Active** | `requestJson` returns `parsedBody as TResponse`. |
| Crash recovery for dirty buffers | **Active evidence gap** | Navigation flush and unload warning do not demonstrate a durable journal. |
| Web/API and nonfunctional release ratchets | **Active evidence gap** | Root coverage ratchet is Engine-only; no visible root accessibility/bundle/large-graph gate. |
| Active Current Status doc is stale | **Active** | Last reviewed 2026-04-26. |
| Release governance is not progressing | **Disproved** | Trusted release admission and concise generation improved materially. |
| Product route after PR #1996 is progressing | **Not supported** | Recent merges are test/dependency/release maintenance. |

## Product and architecture assessment

## 1. Code working-tree state has responsibility overload

### Severity

P2 correctness and release-quality defect.

### Evidence and root cause

`CodeWorkingTreeSyncState.phase` represents:

- clean/dirty content;
- write in progress;
- conflict and failure;
- reconciliation pending/failure;
- stale, invalid, unavailable, verification-unavailable, and superseded project analysis.

`reconciliation_completed` and `reconciliation_failed` are accepted only while the scalar phase is
`reconciling`. Editing changes that scalar without cancelling the current receipt.

The tests cover edits during reconciliation and reverting **after** an invalid result has arrived. They
do not cover the exact interleaving where the buffer returns to persisted bytes before the result.

### Fowler smells

- responsibility overload;
- temporal coupling;
- primitive obsession around phase strings;
- test-only confidence across incomplete event interleavings.

### User impact

Code can say synchronized while the authoritative DBT project is invalid or unavailable. Preview/Run
may then be blocked elsewhere, leaving contradictory surfaces.

## 2. Post-save reconciliation ignores its save receipt

### Severity

P1 authority/integrity.

### Evidence

`useDbtProjectFileCanvasController.ts` supplies:

```ts
async (_receipt: WorkspaceFileSaveReceipt) =>
  projectDbtCodeReconciliationOutcome(await refreshProjectGraphSource())
```

It does not verify that the file still matches the receipt or that the returned projection is the
exact project content set attributable to the save.

The required vocabulary already exists:

- `WorkspaceFileSaveReceipt`;
- `DbtProjectRevision.contentSetSha256`;
- `DbtProjectGraphProjection.analysisSha256`;
- strict Zod project graph contracts;
- file-backed Preview provenance carrying both hashes.

The gap is failure to join existing identities, not missing domain language.

### Impact

A concurrent change in another project file can make a “fresh” graph describe a different whole-
project snapshot than the save operation being presented.

## 3. Graph-first Preview can partially publish a project

### Severity

P1 data integrity.

### Evidence

For graph-first Preview, `canvasPlanAction.ts` projects artifacts and loops over them. Each artifact
independently reads an expected revision and calls `saveFileContent`.

A later conflict/failure can leave earlier files changed. The API already has
`IWorkspaceFileBatchMutationPort`, complete preflight, compare-and-swap, multipath locking,
idempotency receipts, and atomic replacement.

### Smell

A Web view loop implements an informal transaction beside the server-owned transaction authority.

## 4. Workspace capability is contradictory

### Severity

P1 product capability truth.

### Evidence

DBT import defaults:

- 10,000 project files;
- 100,000 inspected entries;
- 50 MB;
- 5,000 directories;
- depth 64.

Interactive workspace behavior:

- silently stops after 500 files;
- exposes no cursor or complete/partial state;
- rejects files above 1 MB;
- maps oversized content to `InvalidWorkspacePathError`;
- batch gateway separately limits 500 files, 1 MB/file, 5 MB/batch.

### Impact

DVT can accept and analyze projects that Explorer/Code cannot fully enumerate or edit. Users cannot
distinguish absent, unlisted, oversized, and unsupported content.

## 5. Generic Web API typing is compile-time only

`createApiClient.requestJson<TResponse>` parses arbitrary JSON and returns
`parsedBody as TResponse`. This is inconsistent with strict Zod contracts already used for DBT
projection. New reconciliation, publication, and inventory results must parse a shared
`@dvt/contracts` schema at the HTTP boundary.

## 6. Navigation safety is not crash recovery

`CodeWorkingTreeNavigationGuard` correctly flushes before SPA navigation and registers
`beforeunload`. That protects normal navigation. It does not demonstrate recovery after process
termination, browser crash, OS failure, or power loss.

A mature IDE distinguishes save-before-navigation from a durable recovery journal.

## 7. Quality gates are broad but uneven

The repository has strong unit, presentation, architecture, Cypress, protected-live, contract,
determinism, and governance coverage. Recent test isolation proves active CI maintenance.

Evidence gaps remain:

- root `ci:full` ratchets Engine coverage, not explicit Web/API coverage;
- Web scripts expose many suites but no explicit accessibility audit command;
- no visible root bundle budget or deterministic large-graph performance gate was found;
- search did not find axe/jest-axe integration;
- exact squash commits do not expose connector-visible PR workflow evidence.

These are evidence gaps, not proof that accessibility or performance are poor.

## 8. Security posture is stronger than state truth

Workspace path handling correctly hashes scope identity, proves root containment, rejects unsafe
segments and unsupported extensions, verifies resolved paths remain scoped, and uses CAS/atomic file
replacement.

The next route must preserve those controls and must not log SQL, YAML, or raw transport errors.
Correlate with opaque receipts, content-set hashes, and analysis hashes.

## 9. Current-status documentation is stale truth

`docs/architecture/system-delivery-status.md` is titled Current Status, marked Active, and claims to be
the current implementation snapshot. Its review/snapshot date is 2026-04-26.

It should be generated from mechanical truth, carry an expiry marker, or be renamed as a dated
snapshot.

## Mature-system comparison: Match / Differentiate / Defer

| Reference | Match now | Differentiate | Defer |
| --- | --- | --- | --- |
| dbt Studio / dbt VS Code | Separate buffer, durable file, parser diagnostics, project index, Preview/Run, and VCS state. | Expose cryptographic project revision and execution evidence explicitly. | Broad cloud collaboration and branch UX. |
| Professional IDE + Git | Distinct dirty, saved, conflict, diff, revision, branch, and sync states; safe revert/recovery. | Keep DBT semantic freshness as an independent axis. | Full Git client UX until authority is correct. |
| Airflow DAG Bundles | Bind every file required by a run/rerun to one version. | DVT combines authoring and execution admission, not only scheduling. | Scheduler breadth. |
| Prefect deployments | Version history, promotion, rollback, exact commit/image digest. | Reuse DVT content-set and analysis identities. | Promotion UI until exact revision is closed. |
| Dagster | Assets, lineage, checks, freshness, observable materialization. | Preserve DBT compatibility and bidirectional graph/code authoring. | Asset-platform expansion until authoring transactions are trustworthy. |
| Temporal | Durable identity, idempotency, receipt correlation, retry and explicit outcomes. | Do not embed a workflow engine inside the editor reducer. | Long-running authoring workflow orchestration. |
| NiFi / Git-backed flow versioning | Explicit local/version drift, conflict, publish and revert; publish an aggregate. | Use Git/content hashes and existing receipts, not another registry. | Proprietary registry product. |

Official references:

- [dbt Developer Hub](https://docs.getdbt.com/)
- [Airflow DAG Bundles](https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/dag-bundles.html)
- [Prefect deployment versioning](https://docs.prefect.io/v3/how-to-guides/deployments/versioning)
- [Dagster documentation](https://docs.dagster.io/)
- [Temporal documentation](https://docs.temporal.io/)
- [NiFi Registry status](https://nifi.apache.org/projects/registry/)
- [VS Code source-control overview](https://code.visualstudio.com/docs/sourcecontrol/overview)

## Recommended implementation route

## PR A — split Code persistence and reconciliation truth

### Domain owner

- `apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts`
- `apps/web/src/app/views/code/useCodeWorkingTreeSync.ts`
- `apps/web/src/app/views/code/CodeWorkingTreeStatus.tsx`

Canvas remains a reconciliation adapter, not the owner of editor state.

### Proposed objects

```ts
type CodePersistenceState =
  | { kind: 'clean' }
  | { kind: 'dirty' }
  | { kind: 'saving'; requestId: number; content: string; expectedRevision: string }
  | { kind: 'conflict'; currentContentSha256: string | null }
  | { kind: 'failed'; errorCode: string };

type CodeReconciliationState =
  | { kind: 'not-required' }
  | { kind: 'pending'; receipt: WorkspaceFileSaveReceipt }
  | { kind: 'fresh'; receipt: WorkspaceFileSaveReceipt; analysisSha256: string; projectContentSetSha256: string }
  | { kind: 'degraded'; receipt: WorkspaceFileSaveReceipt; freshness: 'stale-last-valid' | 'invalid' | 'unavailable' }
  | { kind: 'superseded'; receipt: WorkspaceFileSaveReceipt; currentContentSha256: string }
  | { kind: 'verification-unavailable'; receipt: WorkspaceFileSaveReceipt }
  | { kind: 'failed'; receipt: WorkspaceFileSaveReceipt; errorCode: string };
```

### Rules

- `edited` changes persistence only;
- persistence acknowledgement updates durable bytes/revision and starts/clears reconciliation;
- reconciliation completion/failure matches the current receipt and updates reconciliation regardless
  of visual phase;
- stale receipt results are ignored with stable telemetry;
- a pure projector derives UI status.

Precedence: conflict, save failure, saving, dirty, reconciliation pending, degraded/failed,
synchronized only when clean plus fresh/not-required.

### Rails and compatibility

No new HTTP rail is needed in PR A. Reuse `SaveWorkspaceFileContent`,
`WorkspaceFileSaveReceipt`, and the existing reconciliation adapter. Temporarily project the two-axis
model into current UI copy. Do not persist the old scalar phase as durable authority.

### Red tests

1. `A persisted -> R1 pending -> edit B -> edit A -> R1 invalid` ends clean+invalid, never synchronized.
2. Same sequence with fresh becomes synchronized only after the result.
3. Older receipt result is ignored after a newer save.
4. Failure after edit/revert remains visible.
5. Edit during persistence still forces a second save before flush succeeds.
6. Status announces pending/degraded analysis accessibly without raw errors.

### Protected proof

Edit SQL, hold reconciliation, edit/revert, release invalid result, verify status and Preview blocked,
reopen same file, repair, obtain fresh result, Preview and Run.

### Rollback, observability, security

Fail closed; disable editing/reconciliation admission rather than restore false synchronized state.
Record persistence/reconciliation lifecycle, receipt mismatch, edit-during-save/reconcile, and pending
duration without logging source content or transport errors.

### Acceptance

- no matching semantic outcome can be erased by edits;
- synchronized means durable bytes plus fresh/not-required analysis;
- prior P1 behavior remains covered;
- PR #1996 P2 is answered and resolved;
- standard CI plus protected proof green on final head.

## PR B — exact project-revision reconciliation

Reuse existing `WorkspaceFileSaveReceipt`, `DbtProjectRevision.contentSetSha256`,
`analysisSha256`, `ProjectDbtGraphFromFiles`, file CAS, and Preview provenance.

Proposed result:

```ts
type ReconcileWorkspaceFileWithDbtProjectResult =
  | { kind: 'fresh'; saveReceipt: WorkspaceFileSaveReceipt; projectRevision: DbtProjectRevision; analysisSha256: string }
  | { kind: 'degraded'; saveReceipt: WorkspaceFileSaveReceipt; projectRevision: DbtProjectRevision; freshness: 'stale-last-valid' | 'invalid' | 'unavailable'; diagnostics: readonly StableDbtDiagnostic[] }
  | { kind: 'superseded'; saveReceipt: WorkspaceFileSaveReceipt; currentFileContentSha256: string | null; currentProjectContentSetSha256: string };
```

Verify the file still matches the receipt, return the exact analyzed project revision, retain it in
Code/Canvas state, and require Preview/Run to consume or explicitly refresh/reject it.

Publish a strict `@dvt/contracts` schema and parse it at the Web boundary.

Test a concurrent `schema.yml` change after SQL save; never attribute a different content set to the
original save. Protected proof must show identical hashes across Code, Preview, Run, and reopen.

Rollback is fail-closed: preserve durable file bytes but mark project verification unavailable or
superseded; never fall back to latest graph.

## PR C — atomic graph-first DBT publication

Own the operation in an API application command using existing `IWorkspaceFileBatchMutationPort`.

```ts
type PublishDbtWorkspaceArtifacts = {
  idempotencyKey: string;
  projectRoot: string;
  artifacts: readonly {
    path: string;
    content: string;
    expectedRevision: ExpectedWorkspaceFileRevision;
  }[];
};
```

Require normalized scoped paths, complete expected revisions, one idempotency key, all-or-nothing
mutation, one receipt, one resulting project content set and analysis identity, and idempotent retry.
Preview consumes the publication receipt.

Tests: second-artifact conflict, injected staged-write failure, same-key retry, same-key/different-
request rejection, path traversal, oversized batch, and protected graph-first Preview/Run/reopen.

During rollout, block on atomic-command failure. Never fall back to the sequential loop.

## PR D — truthful workspace inventory

```ts
type WorkspaceFileInventoryPage = {
  entries: readonly WorkspaceFileEntry[];
  nextCursor: string | null;
  completeness: 'complete' | 'partial';
  effectiveLimits: {
    maxFileBytes: number;
    maxPageEntries: number;
    maxBatchFiles: number;
    maxBatchBytes: number;
  };
};

type WorkspaceFileReadResult =
  | { kind: 'found'; file: WorkspaceFileContent }
  | { kind: 'not-found'; path: string }
  | { kind: 'oversized'; path: string; sizeBytes: number; maxBytes: number }
  | { kind: 'unsupported'; path: string; reason: string };
```

Add deterministic pagination, remove silent truncation, distinguish size/path/absence/type, expose
effective limits consistently, and runtime-parse contracts. Test 500/501 files, multipage ordering,
near-10,000 accepted projects, >1 MB files, and >5 MB batches. Do not blindly raise limits.

## PR E — durable authoring recovery/session boundary

Only after A-C prove common behavior, extract a cohesive `DbtProjectAuthoringSession` owning exact
project revision, buffers/base revisions, receipts, reconciliation, Preview/Run admission, navigation,
and recovery.

Add a crash-recovery journal keyed by workspace/project/path/base revision, with restore, discard, and
rebase/conflict choices. Do not persist secrets or raw diagnostics. Do not design a generic mutation
framework in advance.

## PR F — nonfunctional gates and generated status truth

After the transaction route stabilizes:

- Web/API coverage ratchets;
- automated accessibility checks on critical Canvas/Code/menu/dialog flows;
- bundle budgets and lazy-loading evidence;
- deterministic large-graph benchmarks;
- storage/analyzer/network/batch failure injection;
- exact-main/tag evidence;
- generate or expire `system-delivery-status.md` from mechanical truth.

## Ordered route

1. PR A — split persistence/reconciliation and close P2.
2. PR B — exact save/project/analysis/Preview/Run revision.
3. PR C — atomic DBT artifact publication.
4. PR D — inventory completeness and typed limits.
5. PR E — durable authoring session/recovery.
6. PR F — nonfunctional gates and current-state generation.

Release PR #2023 may proceed independently only after a human verifies its current final standard CI,
the custom release-candidate check, and performs the missing review. It is not progress on A-F.

## Product release gates

Do not ship the authoring route until:

- no unresolved P1/P2 semantic-truth thread remains;
- synchronized has a precise two-axis meaning;
- Code, Canvas, Preview, and Run expose the same project revision;
- graph-first publication is atomic/idempotent;
- inventory completeness/effective limits are visible;
- new authority results are runtime validated;
- protected browser proof covers edit/save/conflict/invalid/recover/reopen/run;
- final release head/tag has machine-readable evidence;
- accessibility and large-graph performance have explicit evidence or stated limitations.

## Files the implementation agent should inspect first

1. [`codeWorkingTreeSyncModel.ts`](https://github.com/dunay2/dvt/blob/e36a2ef211e915afa654a1220fab1942f55abda1/apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts)
2. [`codeWorkingTreeSyncModel.test.ts`](https://github.com/dunay2/dvt/blob/e36a2ef211e915afa654a1220fab1942f55abda1/apps/web/src/app/views/code/codeWorkingTreeSyncModel.test.ts)
3. [`useCodeWorkingTreeSync.ts`](https://github.com/dunay2/dvt/blob/e36a2ef211e915afa654a1220fab1942f55abda1/apps/web/src/app/views/code/useCodeWorkingTreeSync.ts)
4. [`CodeWorkingTreeStatus.tsx`](https://github.com/dunay2/dvt/blob/e36a2ef211e915afa654a1220fab1942f55abda1/apps/web/src/app/views/code/CodeWorkingTreeStatus.tsx)
5. [`useDbtProjectFileCanvasController.ts`](https://github.com/dunay2/dvt/blob/e36a2ef211e915afa654a1220fab1942f55abda1/apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts)
6. [`DbtProjectGraphProjection.v1.ts`](https://github.com/dunay2/dvt/blob/e36a2ef211e915afa654a1220fab1942f55abda1/packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts)
7. [`dbtProjectFileExecutionStrategy.ts`](https://github.com/dunay2/dvt/blob/e36a2ef211e915afa654a1220fab1942f55abda1/apps/web/src/app/views/canvas/dbtProjectFileExecutionStrategy.ts)
8. [`canvasPlanAction.ts`](https://github.com/dunay2/dvt/blob/e36a2ef211e915afa654a1220fab1942f55abda1/apps/web/src/app/views/canvas/canvasPlanAction.ts)
9. [`workspaceFiles.ts`](https://github.com/dunay2/dvt/blob/e36a2ef211e915afa654a1220fab1942f55abda1/apps/api/src/application/ports/workspaceFiles.ts)
10. [`LocalWorkspaceFileBatchMutationGateway.ts`](https://github.com/dunay2/dvt/blob/e36a2ef211e915afa654a1220fab1942f55abda1/apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.ts)
11. [`LocalWorkspaceFileRepository.ts`](https://github.com/dunay2/dvt/blob/e36a2ef211e915afa654a1220fab1942f55abda1/apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts)
12. [`LocalDbtProjectImportInspector.ts`](https://github.com/dunay2/dvt/blob/e36a2ef211e915afa654a1220fab1942f55abda1/apps/api/src/infrastructure/dbt/LocalDbtProjectImportInspector.ts)
13. [`createApiClient.ts`](https://github.com/dunay2/dvt/blob/e36a2ef211e915afa654a1220fab1942f55abda1/apps/web/src/app/services/api/createApiClient.ts)
14. [`CodeWorkingTreeNavigationGuard.tsx`](https://github.com/dunay2/dvt/blob/e36a2ef211e915afa654a1220fab1942f55abda1/apps/web/src/app/views/code/CodeWorkingTreeNavigationGuard.tsx)
15. [`system-delivery-status.md`](https://github.com/dunay2/dvt/blob/e36a2ef211e915afa654a1220fab1942f55abda1/docs/architecture/system-delivery-status.md)

## Final decision

DVT has credible CAS file authority, strict DBT projection contracts, exact Preview provenance, atomic
batch infrastructure, protected-live testing, path containment, and improved release governance.

The problem is convergence. Adjacent surfaces still disagree about “current”:

- Code can erase semantic truth through one scalar phase;
- post-save reconciliation ignores the receipt and fetches latest;
- file-backed Preview is revision-aware;
- graph-first Preview publishes sequentially;
- import accepts projects that Code cannot fully enumerate.

The next move is not another release/governance expansion. It is PR A: split persistence and
reconciliation, close the P2, and prove edit/revert/invalid end to end. Then join existing identities,
reuse existing batch authority, and make capability limits explicit.

## Documentation-only validation

- final branch ancestry rebuilt from exact `main@e36a2ef211e915afa654a1220fab1942f55abda1`;
- one Markdown file under the required review path;
- repository, commits, PRs, CI, review threads, product code, contracts, tests, governance, release, and
  branch evidence inspected through GitHub;
- official mature-system documentation used for comparison;
- no local execution claimed;
- no runtime code, workflow, dependency, contract, migration, generated artifact, release metadata,
  product behavior, or merge state changed by this report.
