---
title: DVT Repository State and Next Route Review — 2026-07-18 02:09
status: Draft
owner: Product Architecture / Quality Engineering
reviewers:
  - Product
  - Architecture
  - Web
  - API
  - Runtime
  - Platform
  - Security
  - SRE
date: 2026-07-18
last_reviewed: 2026-07-18
planning_type: review
reviewed_repository: dunay2/dvt
reviewed_ref: main
reviewed_commit: ec47025c1f1e232a7aff8a6d20cd59bb87b59a01
supersedes_review_pr: 1982
---

# DVT Repository State and Next Route Review — 2026-07-18 02:09

## Executive verdict

`main` advanced from release `0.4.0` commit
[`4c98026c1f1e232a7aff8a6d20cd59bb87b59a01`](https://github.com/dunay2/dvt/commit/4c98026c0dd2e2b9e4bbcc126033b34f8afa2b5c)
to
[`ec47025c1f1e232a7aff8a6d20cd59bb87b59a01`](https://github.com/dunay2/dvt/commit/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01)
through merged PR
[#1983](https://github.com/dunay2/dvt/pull/1983).
The delivered feature adds explicit fail-closed recovery for stale or invalid dbt
execution-selection intent and is backed by green PR-head workflows and a live
protected Cypress proof.

The feature is directionally correct and closes a real usability gap. It should be
preserved. It is not yet release-clean:

1. PR #1983 was merged with one active, non-outdated P2 review thread. The current
   UI renders a non-empty authority-refresh `Error.message` directly to the user,
   bypassing the new localized copy rail and potentially exposing transport or
   technical detail.
2. Open release PR [#1984](https://github.com/dunay2/dvt/pull/1984) proposes the
   same feature twice in the `0.5.0` changelog: once for the merge commit and once
   for its parent feature commit.
3. All six observed workflow runs on the release PR are `action_required`, and the
   inspected PR Quality Gate run contains no jobs. The release candidate therefore
   has no successful validation evidence yet.
4. The exact `main` merge SHA still has no connector-visible workflow runs or
   combined status entries. Green evidence remains attached to the PR head rather
   than the exact default-branch tree.

The release PR must not be merged as-is. The immediate route is a small recovery
hotfix, release-note correction, workflow authorization and successful rerun, then
exact-tree release evidence. After that, the product route remains unchanged:
make workspace inventory honest for every accepted dbt project and deliver the
first complete revision-bound, lossless `schema.yml` edit from Canvas to file and
back.

## Immediate instruction for the implementation agent

Proceed in this order:

1. fix the localized recovery-failure regression on `main`;
2. resolve the active PR #1983 review finding with code and tests;
3. correct duplicate `0.5.0` release notes and add a regression guard;
4. obtain successful workflow results for the release head;
5. bind release evidence to the exact shipped tree;
6. fix the workspace/import capability contradiction;
7. deliver one complete revision-bound model-description edit in `schema.yml`;
8. make Code behavior explicit about authoritative, generated, or absent code;
9. only then expand scheduling, deployment, backfill, scale-out, or governance.

Do not merge PR #1984 until items 1–5 are mechanically true.

## Review method and limits

This review inspected through the GitHub connector:

- repository metadata and current default branch;
- the latest commits visible on `main`;
- all visible open pull requests;
- recent merged and superseded pull requests relevant to dbt selection and release;
- PR metadata, changed files, diffs, review submissions, and review threads;
- PR-head and exact-merge workflow visibility;
- current source for the new execution-selection recovery rail;
- current source for workspace/import limits and file-authoritative dbt behavior;
- the previous architecture review and its recommended route.

No repository code was executed locally during this review. Runtime and test claims
are limited to committed source, pull-request metadata, and GitHub workflow evidence.

The branch-search connector returned no branch entries for broad or dbt-specific
queries. Relevant branch work is therefore reconstructed from pull-request head
metadata and recent commit history. No conclusion assumes that an unenumerated
branch does not exist.

## Current repository snapshot

| Signal | Observed state |
| --- | --- |
| Current `main` | [`ec47025c`](https://github.com/dunay2/dvt/commit/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01) |
| Package version on `main` | `0.4.0` |
| Latest merged product PR | [#1983](https://github.com/dunay2/dvt/pull/1983) |
| Latest feature | Explicit dbt execution-selection recovery |
| Visible open PRs | [#1981](https://github.com/dunay2/dvt/pull/1981), [#1982](https://github.com/dunay2/dvt/pull/1982), [#1984](https://github.com/dunay2/dvt/pull/1984) |
| Open functional/release PR | [#1984](https://github.com/dunay2/dvt/pull/1984), release `0.5.0` |
| Open review PRs | #1981 and #1982, both documentation-only drafts |
| Exact `main` workflow runs | None returned |
| Exact `main` combined status | No statuses returned |
| Active unresolved review thread | One on merged PR #1983 |
| Release PR workflow state | Six runs completed as `action_required` |
| Release PR review state | No submitted reviews; no inline threads |

## Delta since the previous repository review

### Product code changed

PR #1983 merged one feature commit and one merge commit onto `main`:

- feature head:
  [`fa240f843cda5adb569923494034fd3c3f7a64a6`](https://github.com/dunay2/dvt/commit/fa240f843cda5adb569923494034fd3c3f7a64a6);
- merge commit:
  [`ec47025c1f1e232a7aff8a6d20cd59bb87b59a01`](https://github.com/dunay2/dvt/commit/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01).

The PR changed 64 files with 3,771 additions and 108 deletions. It added:

- a recovery read model and command contract;
- classification of unavailable and non-executable requested roots;
- explicit discard-unavailable, workspace-scope, and refresh-analysis commands;
- operational drawer presentation;
- English and Spanish copy;
- authored-graph and file-authoritative controller integration;
- unit, architecture, presentation, and live Cypress evidence;
- six Planning DB migrations and additional architecture/planning documentation.

### Release automation changed

Release Please opened PR #1984 from branch
`release-please--branches--main--components--dvt`. It proposes:

- package version `0.5.0`;
- manifest version `0.5.0`;
- a new changelog section.

The changelog section contains two identical feature descriptions pointing to the
merge commit and the parent feature commit. This repeats a class of changelog
quality failure that the repository has already corrected in earlier release work.

### Review state changed

PR #1983 received one Codex review submission at `2026-07-17T19:28:17Z`. The PR
was merged at `2026-07-17T19:28:41Z`, 24 seconds later, with the inline P2 thread
still unresolved. The thread remains active and non-outdated against current
`main`.

### Product route did not change

The merged recovery feature improves safety and operability around an existing
execution-selection contract. It does not close the two primary product
contradictions:

- accepted dbt projects can still exceed the workspace file surface;
- file-authoritative dbt Canvas is still read-only and cannot perform a complete
  visual edit against authoritative project files.

## Main commit and feature assessment

## What PR #1983 gets right

The following decisions are sound and should be retained:

- explicit selection remains fail-closed;
- invalid selection never silently widens to whole-workspace execution;
- requested roots, unavailable roots, non-executable roots, derived dependencies,
  and admitted scope are projected separately;
- replacement with workspace scope is an explicit user command;
- authority refresh preserves the requested intent instead of silently rewriting it;
- file-authoritative planner graph data is preferred over inference;
- the operational drawer owns the recovery interaction rather than hiding it in a
  toolbar error;
- the live proof validates a deleted selected root against the protected runtime;
- selection recovery is modeled separately from generic UI node selection.

These are meaningful improvements over the prior state.

## What remains unsafe or incomplete

The feature claims that all user-facing messages resolve through the canonical
Canvas i18n rail. That claim is false for a non-empty refresh error detail.

Current rendering:

```tsx
{model.failure.detail ?? messages.selectionRecoveryRefreshFailureMessage}
```

Evidence:
[`OperationalDrawerSelectionRecoveryView.tsx`](https://github.com/dunay2/dvt/blob/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01/apps/web/src/app/components/shell/OperationalDrawerSelectionRecoveryView.tsx#L116-L119).

The hook intentionally copies `Error.message` into the user-facing read model:

- `readFailureDetail` returns a non-empty `Error.message`;
- the rejected refresh stores that value as `failure.detail`.

Evidence:
[`useCanvasExecutionSelectionRecovery.ts`](https://github.com/dunay2/dvt/blob/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01/apps/web/src/app/views/canvas/useCanvasExecutionSelectionRecovery.ts#L47-L49)
and
[`useCanvasExecutionSelectionRecovery.ts`](https://github.com/dunay2/dvt/blob/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01/apps/web/src/app/views/canvas/useCanvasExecutionSelectionRecovery.ts#L153-L165).

The current presentation test verifies Spanish fallback only when `detail` is
`null`; it does not cover a non-empty technical message:
[`OperationalDrawerSelectionRecoveryView.test.tsx`](https://github.com/dunay2/dvt/blob/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01/apps/web/src/app/components/shell/OperationalDrawerSelectionRecoveryView.test.tsx#L95-L133).

## CI status

### PR #1983 feature head

The six observed pull-request workflows completed successfully on
`fa240f843cda5adb569923494034fd3c3f7a64a6`:

| Workflow | Conclusion |
| --- | --- |
| Dependency Review | success |
| Contracts & Determinism | success |
| Test Suite | success |
| CI - Code Quality | success |
| CodeQL | success |
| PR Quality Gate | success |

This is strong PR-head evidence. It does not erase the unresolved review finding,
and it does not prove the exact merge tree was rerun.

### Exact current `main`

For
[`ec47025c1f1e232a7aff8a6d20cd59bb87b59a01`](https://github.com/dunay2/dvt/commit/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01),
the connector returned:

- no pull-request-associated workflow runs;
- no combined status entries.

This does not prove the tree is defective. It proves release evidence is not
connector-visible on the exact tree users would receive.

### Open release PR #1984

All six observed workflows for head
[`8800bafde2cea558da2c3229a456879af04f12bc`](https://github.com/dunay2/dvt/commit/8800bafde2cea558da2c3229a456879af04f12bc)
completed with conclusion `action_required`:

| Workflow | Conclusion |
| --- | --- |
| Dependency Review | action_required |
| Contracts & Determinism | action_required |
| PR Quality Gate | action_required |
| CI - Code Quality | action_required |
| CodeQL | action_required |
| Test Suite | action_required |

The inspected PR Quality Gate run returned no jobs. The connector does not expose a
more specific approval message, so the exact administrative reason is not asserted
here. The operational fact is sufficient: no release workflow is currently green.

### Documentation review PRs

PR #1981 and PR #1982 remain open, draft, mergeable, and documentation-only.
Their PR Quality Gate and CI - Code Quality workflows succeeded; the other four
observed workflows were skipped. Neither has an inline review thread.

Both reports review the previous `main@4c98026c`. They are now stale as current
state documents and should not compete with this review as implementation authority.

## Review-thread status

## Active unresolved thread on merged PR #1983

Path:
`apps/web/src/app/components/shell/OperationalDrawerSelectionRecoveryView.tsx`

Line: 116

Status:

- unresolved;
- non-outdated;
- attached to merged product code;
- classified P2 by the reviewer.

Finding summary:

- raw non-empty authority refresh failures bypass localized copy;
- Spanish users can receive English or technical transport messages;
- technical detail can be exposed directly on a user-facing surface;
- diagnostic detail should be sanitized and routed to a separate operational or
  telemetry surface.

The repository should treat this as a current `main` defect, not as historical PR
commentary.

## Open pull requests

### PR #1984 — Release `0.5.0`

State:

- open;
- not draft;
- mergeable;
- one commit;
- three changed files;
- no submitted reviews;
- no inline review threads;
- all observed workflows `action_required`.

Release-note defect:

```markdown
* **web:** Add explicit DBT execution selection recovery (ec47025)
* **web:** Add explicit DBT execution selection recovery (fa240f8)
```

Evidence:
[`CHANGELOG.md` on the release branch](https://github.com/dunay2/dvt/blob/release-please--branches--main--components--dvt/CHANGELOG.md#L5-L11).

Decision: do not merge as-is.

### PR #1982 — Previous delta review

State:

- open;
- draft;
- mergeable;
- documentation-only;
- based on `main@4c98026c`;
- no inline review threads.

It is superseded by this report because product code and release state changed.

### PR #1981 — Previous full review

State:

- open;
- draft;
- mergeable;
- documentation-only;
- based on `main@4c98026c`;
- no inline review threads.

It is also superseded as a current-state report, although its deeper baseline
findings remain useful.

## Relevant branch work

### Active

- `release-please--branches--main--components--dvt` through PR #1984;
- `agent/dvt-review-20260717-2010` through PR #1982;
- `agent/dvt-review-20260717-1414` through PR #1981.

### Recently merged

- `feat/dbt-phase4-selection-recovery` through PR #1983.

### Branch hygiene decision

Keep one active repository-state review baseline. After this review exists:

- mark PR #1981 and PR #1982 superseded;
- close stale review drafts when the owner is ready;
- never merge several timestamped review reports as parallel current truth;
- use the latest report only as implementation guidance, not implementation evidence.

## Findings

## DR-01 — Localized recovery failure is bypassed by raw technical detail

**Severity:** P1 release blocker for `0.5.0`

The presentation prefers `failure.detail` over localized copy. The hook populates
that detail from `Error.message`. The authority adapter preserves existing `Error`
objects and therefore preserves their messages.

User impact:

- untranslated errors in Spanish;
- unstable UI wording coupled to infrastructure exceptions;
- possible exposure of URLs, status details, backend wording, or transport context;
- product copy contract contradicted by runtime behavior.

Required change:

```ts
type CanvasExecutionSelectionRecoveryFailure = Readonly<{
  rail: 'RecoverCanvasExecutionSelection';
  strategy: 'refresh_analysis';
  code: 'authority_refresh_failed';
  diagnosticId: string | null;
}>;
```

The user surface should always render
`selectionRecoveryRefreshFailureMessage`. A sanitized diagnostic identifier may be
reported to telemetry, logs, or a Problems detail surface with an explicit security
policy. Do not put arbitrary exception text in localized presentation state.

Acceptance criteria:

- English and Spanish tests use a non-empty technical `Error.message`;
- neither language renders the raw detail;
- a stable localized message is rendered;
- optional diagnostics are structured and sanitized;
- the existing PR #1983 thread is resolved only after the fix is on a branch.

## DR-02 — Release `0.5.0` changelog duplicates one feature

**Severity:** P1 release correctness regression

PR #1984 includes the same user-visible feature twice, once for the merge commit and
once for the feature commit. A release should describe delivered capability, not
internal Git history duplication.

Impact:

- misleading release notes;
- inflated feature count;
- repeated regression after prior changelog cleanup;
- release automation does not distinguish merge wrapper from delivered change.

Required change:

- remove the duplicate entry before release;
- determine whether merge commits, parent commits, or both are intended release
  inputs;
- prefer squash merge for conventional feature PRs, or configure Release Please to
  exclude merge-wrapper duplication;
- add a deterministic release-note test that rejects duplicate normalized
  `(type, scope, subject)` entries in one release section.

## DR-03 — Release workflows have not executed successfully

**Severity:** P1 release-governance blocker

Every observed PR #1984 workflow is `action_required`, and the inspected quality
run has no jobs. A mergeable GitHub state is not equivalent to a validated release.

Required change:

- perform the required GitHub action or approval;
- rerun all required workflows;
- require successful conclusions before merge;
- retain the run URLs in release evidence.

## DR-04 — Exact `main` still lacks visible validation evidence

**Severity:** P1 release-governance gap

PR-head checks were green, but the exact merge SHA has no connector-visible workflow
runs or combined status entries.

Choose one enforced model:

- default-branch validation after merge;
- merge queue and merge-group checks;
- or deterministic tree-equivalence proof between the green PR tree and the
  released/tagged tree.

The release record must point to the exact commit or tree shipped to users.

## DR-05 — Recovery can classify authority loading as unavailable selection

**Severity:** P2 race and UX risk

This is a source-derived risk requiring a focused regression test.

In the file-authoritative controller:

- `query.data == null` projects to empty canonical nodes and edges;
- requested selection intent is preserved even when no nodes are visible;
- execution recovery is enabled unconditionally;
- refresh is advertised as available unconditionally.

Evidence:
[`useDbtProjectFileCanvasController.ts`](https://github.com/dunay2/dvt/blob/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01/apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts#L147-L169)
and
[`useDbtProjectFileCanvasController.ts`](https://github.com/dunay2/dvt/blob/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01/apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts#L245-L256).

A persisted explicit selection may therefore be temporarily classified as
unavailable while authoritative graph data is still loading. If the operational
surface is interactive during that interval, the user can discard valid intent or
replace it with workspace scope before authority is ready.

Required change:

Model authority state explicitly:

```ts
type SelectionRecoveryAuthorityState =
  | { kind: 'loading' }
  | { kind: 'ready'; revision: string | null }
  | { kind: 'error'; code: string };
```

Do not classify roots as unavailable or enable destructive recovery commands until
state is `ready`. Add slow-query, refetch, and error-transition tests.

## DR-06 — Non-executable recovery is asymmetric

**Severity:** P2 product clarity gap

The read model classifies both unavailable and non-executable roots, but the drawer
only offers a direct discard command for unavailable roots. The pure command
intentionally removes unavailable roots only. A visible non-executable root may be
removed through the node-level Deselect affordance, but the operational recovery
surface does not provide the equivalent direct command.

Evidence:
[`canvasExecutionSelectionRecovery.ts`](https://github.com/dunay2/dvt/blob/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01/apps/web/src/app/views/canvas/canvasExecutionSelectionRecovery.ts#L86-L120)
and
[`canvasExecutionSelectionRecovery.ts`](https://github.com/dunay2/dvt/blob/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01/apps/web/src/app/views/canvas/canvasExecutionSelectionRecovery.ts#L164-L177).

Required decision:

- add `discard_invalid_roots` covering unavailable and non-executable roots; or
- add separate explicit actions; or
- explain and link the node-level Deselect recovery from the drawer.

The current command label must not imply complete recovery when a non-executable
root remains and Preview stays blocked.

## DR-07 — “Last preview revision” conflates different identity types

**Severity:** P2 authority-clarity gap

For file-authoritative dbt, the value is `analysisSha256`. For graph-authored Canvas,
the fallback is `canonicalPlanSha256`. Both are rendered under one generic label.

Evidence:
[`canvasExecutionSelectionRecovery.ts`](https://github.com/dunay2/dvt/blob/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01/apps/web/src/app/views/canvas/canvasExecutionSelectionRecovery.ts#L54-L60).

These hashes prove different things. A user or operator cannot tell whether the
value identifies analysis, graph authority, or persisted plan content.

Required change:

Use a typed identity:

```ts
type SelectionRecoveryRevision =
  | { kind: 'dbt_analysis'; sha256: string }
  | { kind: 'canonical_plan'; sha256: string }
  | { kind: 'graph_draft'; revision: string };
```

Render the kind and value separately. Do not present heterogeneous identities as
one revision concept.

## DR-08 — Live acceptance covers only one recovery path

**Severity:** P2 regression risk

The protected Cypress test proves:

- authored dbt Canvas;
- selected root deletion;
- blocked recovery state;
- explicit switch to workspace scope;
- restored Preview availability.

It does not prove:

- file-authoritative dbt recovery;
- a non-executable visible root;
- discard-unavailable behavior;
- authority refresh success;
- authority refresh failure;
- non-empty technical failure detail in Spanish;
- loading-state safety;
- concurrent refresh and selection changes;
- persistence after reload.

Required change:

Add a compact recovery matrix. Keep one live protected path per authority model and
cover remaining state transitions in deterministic component/hook tests.

## DR-09 — One recovery slice required 64 files and six Planning DB migrations

**Severity:** P1 architectural drift and delivery risk

PR #1983 changed 64 files and added six consecutive Planning DB migrations:

- `730_dbt_selection_recovery_operational_ui.sql`;
- `731_dbt_selection_recovery_maturity_evidence.sql`;
- `732_dbt_selection_recovery_presentation_ownership.sql`;
- `733_dbt_selection_recovery_i18n_catalog.sql`;
- `734_dbt_selection_recovery_i18n_relational_cleanup.sql`;
- `735_dbt_selection_recovery_feature_manifest.sql`.

The migrations alone add roughly 1,472 lines. A focused recovery UI and state
transition expanded into runtime, tests, copy, architecture, proposals, and six
append-only governance mutations.

This is Fowler-style Shotgun Surgery. The problem is not governance coverage; the
problem is the number of authorities and durable append-only records required to
express one feature.

Required response:

- define one declarative feature manifest as source of truth;
- generate relational, documentation, ownership, i18n, and evidence projections;
- reserve SQL migrations for schema and durable product-state transitions;
- do not use a new migration for every metadata correction;
- add a PR metric for product files, tests, governance files, migration lines, and
  generated projections;
- require architecture review when a focused feature crosses more than ten
  governance files or more than two durable migrations.

## DR-10 — Review feedback can be merged before it is processed

**Severity:** P1 quality-governance failure

PR #1983 was open for less than six minutes and merged 24 seconds after the Codex
review was submitted. The active inline thread was not resolved.

Required change:

- require all non-outdated review threads resolved before merge;
- require at least one approval for product-code PRs;
- prevent administrators or automation from bypassing the rule silently;
- require a documented waiver when an active finding is accepted for later work;
- ensure review bots finish before the merge action becomes available.

Green CI proves automated checks passed. It does not make unresolved review findings
irrelevant.

## DR-11 — Accepted dbt projects can still exceed the workspace surface

**Severity:** P1 product correctness defect

The dbt import inspector accepts by default:

```text
maxProjectFiles        10,000
maxInspectedFiles     100,000
maxProjectBytes    50,000,000
maxDirectories          5,000
maxDepth                    64
```

Evidence:
[`LocalDbtProjectImportInspector.ts`](https://github.com/dunay2/dvt/blob/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01/apps/api/src/infrastructure/dbt/LocalDbtProjectImportInspector.ts#L38-L45).

The workspace repository exposes:

```text
MAX_LISTED_FILES       500
MAX_FILE_BYTES     1,000,000
```

Evidence:
[`LocalWorkspaceFileRepository.ts`](https://github.com/dunay2/dvt/blob/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01/apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts#L39-L73).

Listing stops silently at the limit and returns no cursor, total, truncation flag,
or omitted count:
[`LocalWorkspaceFileRepository.ts`](https://github.com/dunay2/dvt/blob/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01/apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts#L161-L207).

An accepted project can therefore contain analyzer-visible resources and files that
the user cannot discover or open through the workspace product surface.

This remains the first product implementation priority after release repair.

## DR-12 — File-authoritative dbt round-trip editing is still absent

**Severity:** P1 product gap

The file-backed controller still rejects semantic mutation because dbt project
files are authoritative:
[`useDbtProjectFileCanvasController.ts`](https://github.com/dunay2/dvt/blob/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01/apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts#L42-L46).

Projected nodes remain `canMutateGraph: false`:
[`useDbtProjectFileCanvasController.ts`](https://github.com/dunay2/dvt/blob/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01/apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts#L279-L305).

DVT can inspect, analyze, project, Preview, and Run authoritative dbt files. It
cannot yet complete a visual edit that writes the authoritative project with CAS,
shows a diff, handles conflict, re-analyzes, and proves Preview/Run against the new
revision.

The first vertical remains a model `description` edit in `schema.yml`.

## DR-13 — Graph-draft Code still promises code before authority exists

**Severity:** P1 UX correctness gap

Graph-authored dbt workspace artifacts are generated and saved during Preview.
Before that transition, a generic Code action may open a surface with no SQL or
generated code recorded for the node.

Required behavior:

- file-backed node: open authoritative `node.path`;
- graph-draft node with valid origin: show deterministic projected SQL with a
  `Generated preview — not yet persisted` state;
- graph-draft node without valid origin: show the concrete blocker;
- always show planned or authoritative path;
- expose project files through a separate project-code action.

## DR-14 — Product-wide maturity gaps remain open

**Severity:** P2 release-readiness and operability risk

The repository still has explicit backlog for:

- 50k-node and large-graph performance budgets;
- keyboard and screen-reader accessibility;
- logs/progress reconnection UX;
- frontend telemetry;
- comprehensive adapter determinism;
- load and chaos evidence;
- single-owner outbox canary;
- multi-worker ordering strategy and proof.

These should remain behind the immediate release repair and first authoring
transaction, but they must remain visible before mature production-platform claims.

## Architectural assessment

## Strong foundations to preserve

- explicit file authority for imported dbt projects;
- compare-and-swap workspace writes;
- revision and provenance binding for Preview and Run;
- fail-closed explicit execution selection;
- explicit recovery rather than silent scope widening;
- planner graph-source ownership guard;
- migration ordinal and identity integrity;
- deterministic capability-evidence checks;
- separation between graph-draft and file-authoritative execution strategies;
- live protected runtime acceptance for critical dbt paths.

## Drift to stop

- merging product PRs before active review feedback is processed;
- rendering arbitrary infrastructure exception text in localized UI;
- releasing duplicate commit descriptions as duplicate features;
- treating `action_required` workflows as release evidence;
- attaching green evidence only to PR heads rather than shipped trees;
- adding six durable governance migrations for one focused UI capability;
- accumulating several open review PRs as competing current truth;
- adding governance surfaces before delivering a complete user transaction;
- allowing importer, analyzer, explorer, editor, and runner capability limits to
  diverge.

## Recommended next route

## Route 0 — Repair release `0.5.0`

### PR 0A — Localized selection-recovery failure hotfix

Scope:

- never render `Error.message` directly;
- use localized stable failure copy;
- separate sanitized diagnostic metadata;
- add English and Spanish non-empty-error tests;
- add authority loading-state guard if confirmed by focused test;
- resolve the PR #1983 thread after the code is pushed.

Keep this PR focused. It should not require new Planning DB migrations unless a real
schema transition exists.

### PR 0B — Release-note and automation correction

Scope:

- deduplicate `0.5.0` feature entry;
- add duplicate normalized-subject check;
- document or enforce the intended merge strategy;
- authorize and rerun required workflows;
- require all release checks green.

### PR 0C — Exact-tree release evidence

Scope:

- validate the exact default-branch or merge-group tree;
- attach machine-readable evidence to the release/tag;
- prove the released tree corresponds to the validated tree.

## Route A — Workspace inventory truth

Goal: every accepted dbt project has an honest, operable workspace inventory.

Implementation order:

1. define one shared import/workspace capability policy;
2. add cursor or page metadata and explicit truncation state;
3. implement deterministic API pagination;
4. represent large-file read-only/download behavior deliberately;
5. render incomplete inventory state in CodeView;
6. test 501+ files and files above 1 MB;
7. prove analyzer, graph, file tree, and editor agree on completeness.

## Route B — First lossless dbt YAML edit

Goal: deliver one complete bidirectional authoring transaction.

Recommended first field: model `description` in `schema.yml`.

Required transaction:

1. read authoritative YAML and content revision;
2. locate the exact model entry without lossy whole-file reserialization;
3. create a patch proposal without writing;
4. show exact path and diff;
5. save with expected-revision CAS;
6. preserve the proposal on conflict and show current revision;
7. retain provenance for conditional revert;
8. re-run project analysis after save;
9. refresh graph and inspector from the authoritative result;
10. Preview and Run against the saved revision;
11. reopen the project and prove persistence.

## Route C — Authority-honest Code UX

Goal: make Code behavior match the node authority model.

- authoritative file → open file;
- deterministic generated SQL → show preview with non-persisted badge;
- missing origin → show blocker;
- project tree → separate project-code workbench;
- never display an unexplained empty generic Code surface.

## Route D — Product quality baseline

After Routes 0–C:

- accessibility threshold;
- graph interaction and rendering budget;
- bundle budget;
- changed-critical-rail coverage threshold;
- reconnect/recovery acceptance;
- deterministic replay acceptance;
- live revision-bound dbt authoring acceptance.

## Route E — Operational scale and recovery

Only after the earlier routes:

- standalone outbox worker;
- single-owner canary;
- automated canary lane;
- rollback proof;
- one selected multi-worker ordering strategy;
- concurrent ordering proof;
- load, chaos, and recovery evidence.

## Proposed PR sequence

1. `fix(web): localize selection recovery authority failures`;
2. `fix(release): deduplicate 0.5.0 feature notes`;
3. `ci(release): validate exact shipped tree`;
4. `feat(workspace): expose paginated inventory capability`;
5. `feat(web): render complete and truncated workspace inventory`;
6. `feat(dbt): propose and CAS-save model description patch`;
7. `feat(web): edit dbt model description with diff and conflict UX`;
8. `test(dbt): prove re-analysis Preview Run and reopen persistence`;
9. `fix(web): make Code authority state explicit`.

Do not combine these into another multi-thousand-line governance phase.

## Definition of done for release `0.5.0`

The release is ready only when:

- raw authority exception detail is not rendered to users;
- English and Spanish failure behavior is tested with non-empty exception text;
- the active PR #1983 thread is resolved by a code change;
- the changelog contains one feature entry for one delivered feature;
- all required PR #1984 workflows complete successfully;
- the exact released tree has machine-readable validation evidence;
- no unresolved non-outdated review thread is ignored;
- release notes and package/tag version agree.

## Definition of done for the next product milestone

The next product milestone is complete only when:

- an accepted project cannot silently exceed the workspace surface;
- inventory truncation and large-file limitations are explicit;
- a model description can be edited visually without lossy YAML rewriting;
- the user sees the exact patch before save;
- concurrent edits fail with a clear CAS conflict;
- the graph refreshes from the saved authoritative file;
- Preview and Run bind to that saved revision;
- reopening the project preserves the edit;
- Code states whether content is authoritative, generated, or absent;
- no broad governance layer substitutes for the user transaction.

## Final decision

DVT should keep the execution-selection recovery capability, but release `0.5.0`
must pause for a small correctness and release-governance repair.

After that repair, the repository should stop expanding selection/governance
surfaces and return to the product route already identified: workspace inventory
truth first, then one complete revision-bound `schema.yml` model-description edit.
That is the shortest route from strong architectural foundations to a real
bidirectional dbt authoring product.