---
title: DVT Repository State, Authoring Authority, and Next Route Review — 2026-07-19 08:09
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
date: 2026-07-19
last_reviewed: 2026-07-19
planning_type: review
reviewed_repository: dunay2/dvt
reviewed_ref: main
reviewed_commit: eb9a393edb01917be97437a2226c8a91791ff0e4
supersedes_review_pr: 1990
---

# DVT Repository State, Authoring Authority, and Next Route Review — 2026-07-19 08:09

## Executive verdict

`main` has advanced materially since the preceding review. It is now at
[`eb9a393edb01917be97437a2226c8a91791ff0e4`](https://github.com/dunay2/dvt/commit/eb9a393edb01917be97437a2226c8a91791ff0e4),
the merge commit for
[#1991 — Complete canvas node authoring truth](https://github.com/dunay2/dvt/pull/1991).

The merge adds a coherent node-presentation read model, mutually exclusive contextual surfaces,
a dedicated workbench draft controller, canonical draft reconciliation, and an editable dbt model
SQL experience on the graph-draft Canvas. It also adds a protected live flow that imports a source,
connects a model, edits model SQL, persists the graph draft, previews it, writes
`models/model_1.sql`, and opens that file in Project Code.

This is meaningful product progress. The previous report's statement that no functional work was
open or delivered is obsolete.

However, the release is still not ready. The central problem is no longer only missing authoring.
The repository now exposes two writable representations of model SQL without one explicit
conflict-safe authority boundary:

1. the node workbench stores authored SQL in the graph draft at `node.metadata.config.sql`;
2. Preview regenerates and writes `models/<model>.sql` from that graph value;
3. Project Code independently auto-saves the workspace SQL file;
4. the graph-side model reader does not read that workspace file back into the node draft;
5. Preview reads the file's current revision immediately before overwriting it, so a direct Code
   edit is not compared with the graph revision that produced the previous file.

A user can therefore edit a generated model file in Project Code, return to Canvas, run Preview,
and have the file replaced by the older graph-authored SQL without a semantic conflict. The new
roundtrip is graph-to-file and file-visible, but it is not yet file-to-graph bidirectional
reconciliation.

The immediate decision is:

> Do not merge release PR #1984 as-is. Stabilize one model-SQL authority and transaction boundary,
> make multi-file publication atomic, repair the existing localization and semantic-refresh bugs,
> then regenerate and validate the release.

The next broad feature vertical should not start before this authority convergence is complete.

## Primary instruction to the implementation agent

Create one focused **dbt model SQL authority convergence** PR.

Required order:

1. define whether `models/<model>.sql` or graph metadata is the semantic authority after the file
   exists;
2. prevent direct Project Code edits from being silently overwritten by Preview;
3. bind node Code edits to an explicit baseline file revision and return a typed apply result;
4. publish `dbt_project.yml`, model files, and `schema.yml` through the existing atomic batch
   mutation port rather than sequential per-file saves;
5. represent persistence as pending/succeeded/conflicted/failed in the workbench instead of treating
   a synchronous local reducer update as completion;
6. prove external-file divergence, invalid SQL, persistence failure, partial-publication prevention,
   Preview, Run, and reopen;
7. fix the unresolved #1983 localized-failure defect;
8. make file-authoritative Code refresh distinguish HTTP success from a fresh valid dbt analysis;
9. repair release-note topology and obtain successful checks on the final tag target;
10. close superseded review PRs when authorized so this document is the only active current-state
    handoff.

Do not add generic SQL AST editing, a new DSL, broad dbt test authoring, scheduling, deployment, or
another governance expansion before those steps pass.

## Delta since the previous review

The preceding current-state handoff is
[#1990](https://github.com/dunay2/dvt/pull/1990), based on
`main@ef8c589b61e0dfe2864975b021149e88716f01aa`.

Current `main` is 18 commits ahead of that base and zero behind. The delta is PR #1991:

- 17 feature-branch commits plus the merge commit;
- 85 changed files;
- 8,344 additions;
- 581 deletions;
- 12 sequential Planning DB migrations, 746 through 757;
- a canonical node-presentation truth contract;
- a canonical presentation projection consumed by cards, workbench, columns, metrics, and code;
- contextual toolbar, health, workbench, and Code mutual exclusion;
- an extracted node-workbench draft controller;
- canonical submitted-draft reconciliation;
- DBT model SQL editing in the graph-draft node workbench;
- graph-derived model artifact generation;
- a protected live SQL edit, Preview, workspace-file, and Project Code proof.

Comparison:

- [`ef8c589...eb9a393`](https://github.com/dunay2/dvt/compare/ef8c589b61e0dfe2864975b021149e88716f01aa...eb9a393edb01917be97437a2226c8a91791ff0e4)
- [PR #1991](https://github.com/dunay2/dvt/pull/1991)

The prior review branch is now one documentation commit ahead of its old base and 18 product
commits behind current `main`. It is historical evidence, not current implementation authority.

## Review scope and evidence limits

This review inspected through the GitHub connector:

- repository metadata and default branch;
- current `main` identity and recent commits;
- merged PR #1991 and its changed-file surface;
- PR #1991 head CI and exact-main CI visibility;
- all visible open pull requests;
- release PR #1984 metadata, changelog, divergence, and workflows;
- unresolved and resolved inline review threads on #1983, #1988, #1991, and #1984;
- graph-draft dbt authoring models and workbench orchestration;
- graph-to-workspace artifact generation;
- Preview publication behavior;
- contextual Project Code auto-save behavior;
- file-authoritative dbt Canvas refresh behavior;
- current workspace and importer limits;
- YAML description transaction analysis flow;
- visible review-branch divergence reconstructed from PR heads.

No repository command or test suite was executed locally. Runtime conclusions are based on
committed control flow, committed tests, pull-request metadata, and GitHub Actions evidence.

The branch-search connector returned no usable inventory for `main`, `agent`, `feat`, or `release`
queries. Relevant branch work is therefore reconstructed from PR heads and commit comparison. This
report does not claim that an unindexed branch does not exist.

## Current repository snapshot

| Signal | Observed state |
| --- | --- |
| Repository | [`dunay2/dvt`](https://github.com/dunay2/dvt) |
| Default branch | `main` |
| Current `main` | [`eb9a393e`](https://github.com/dunay2/dvt/commit/eb9a393edb01917be97437a2226c8a91791ff0e4) |
| Main merge time | 2026-07-19 06:55:52 UTC |
| Package version on `main` | `0.4.0` |
| Latest merged product PR | [#1991](https://github.com/dunay2/dvt/pull/1991) |
| Latest delivered capability | Canonical node presentation plus graph-draft DBT model SQL authoring |
| Open release PR | [#1984](https://github.com/dunay2/dvt/pull/1984), proposed `0.5.0` |
| Release head | `412f6f155134905f3b35e96500ba36abbcbaf3a6` |
| Release divergence | One commit ahead, zero behind current `main` |
| Open PRs before this report | #1981, #1982, #1984, #1985, #1986, #1987, #1989, #1990 |
| Open functional implementation PRs | None visible |
| Exact-main workflow runs returned | None |
| Exact-main combined statuses returned | None |
| #1991 feature-head workflows | Six successful |
| Active unresolved product review thread | One on merged #1983 |
| #1991 inline review threads | Three, all resolved |
| Release-head workflows | Six `action_required` |

`package.json` still declares `0.4.0`:

- [`package.json`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/package.json#L1-L8)

## Recent commit assessment

The current tail is the implementation and reconciliation sequence for #1991:

- [`eb9a393e`](https://github.com/dunay2/dvt/commit/eb9a393edb01917be97437a2226c8a91791ff0e4)
  — merge #1991;
- [`e6010fd8`](https://github.com/dunay2/dvt/commit/e6010fd89b6e9d86a37ac68afb31a7e8909f3c18)
  — preserve canonical node drafts across saves;
- [`5ab5c6c0`](https://github.com/dunay2/dvt/commit/5ab5c6c011d760dae578992e69cf307d8acdcebe)
  — govern submitted draft authority;
- [`92a7d831`](https://github.com/dunay2/dvt/commit/92a7d8313ac103a6af1314bd41c3a107f2836915)
  — reconcile submitted node drafts;
- [`edf4afeb`](https://github.com/dunay2/dvt/commit/edf4afeb3c39b3479dc7900b4d4b885bc42c8d4a)
  — canonicalize DBT model SQL authority;
- [`64a88b2c`](https://github.com/dunay2/dvt/commit/64a88b2cab7ae55d7f2c975552e4b76db739f16c)
  — keep component migration import-independent;
- [`507f8712`](https://github.com/dunay2/dvt/commit/507f87121cd191c2f21087c794bdc023e9f6ff90)
  — close canvas node presentation integrity;
- [`bc517776`](https://github.com/dunay2/dvt/commit/bc517776e00ba90e4b9dc5c2d9a4ca6a27ffa753)
  — extract node workbench draft controller;
- [`53d8a511`](https://github.com/dunay2/dvt/commit/53d8a51111e60a4251c458715902094ace0df16a)
  — complete DBT model code roundtrip;
- [`c050bad8`](https://github.com/dunay2/dvt/commit/c050bad81a073370cd57c3f575569955bf2ba751)
  — unify DBT model code authority;
- [`08363cbd`](https://github.com/dunay2/dvt/commit/08363cbdbf7ab150c8c10d91af32d06164156090)
  — keep context surfaces mutually exclusive;
- [`c32326e8`](https://github.com/dunay2/dvt/commit/c32326e8fe1218d037a039ac8ad01be5ac75ebe9)
  — create complete initial Canvas aggregate;
- [`b97b8947`](https://github.com/dunay2/dvt/commit/b97b89479c8ecfd0fbf57b0fb5a4173380224f0a)
  — unify canvas node presentation truth.

The sequence is directionally coherent: it converges presentation and local draft ownership rather
than adding another unrelated subsystem. The remaining risk is that the word `authority` is now
correct inside the graph-draft aggregate but not yet across graph draft, workspace files, imported
file projects, Preview, and Project Code.

## What PR #1991 genuinely delivers

### One presentation truth for node consumers

The new presentation contract distinguishes:

- declared and inherited columns;
- visible column provenance;
- inline, workspace-file, generated, and unavailable code;
- localized presentation copy.

Relevant source:

- [`canvasNodePresentationTruth.contract.ts`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/web/src/app/components/canvas/canvasNodePresentationTruth.contract.ts)
- [`canvasNodePresentationTruth.ts`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/web/src/app/components/canvas/canvasNodePresentationTruth.ts)
- [`canvasNodePresentationProjection.ts`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/web/src/app/views/canvas/canvasNodePresentationProjection.ts)

This closes a real class of divergence between cards, properties, workbench, and code labels.

### Contextual surface exclusivity

Toolbar, health popover, node workbench, and contextual Code are coordinated rather than layered
simultaneously. The protected live flow verifies representative transitions.

Relevant source:

- [`canvasNodeContextSurfaceModel.ts`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.ts)
- [`canvasNodeWorkbenchVisibility.ts`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/web/src/app/views/canvas/canvasNodeWorkbenchVisibility.ts)

### Canonical local draft reconciliation

The dedicated controller tracks:

- authoritative draft;
- transient user draft;
- submitted canonical draft;
- edits made while a save is in flight;
- canonical empty SQL behavior;
- normalized metadata after save.

Relevant source:

- [`useCanvasNodeWorkbenchDraftController.ts`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/web/src/app/views/canvas/useCanvasNodeWorkbenchDraftController.ts)
- [`canvasInspectorAuthoringModel.ts`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.ts)

The three #1991 P2 review findings were addressed and all three threads are resolved:

1. reset canonical empty SQL after apply;
2. clear stale legacy top-level SQL authority;
3. canonicalize submitted drafts before comparison.

### Graph-draft DBT model SQL authoring

A DBT model Code section now presents generated SQL when no authored body exists and allows the
user to submit authored SQL. The canonical node stores authored SQL in
`metadata.config.sql`.

Relevant source:

- [`DbtModelCodeAuthoringSection.tsx`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/web/src/app/views/canvas/DbtModelCodeAuthoringSection.tsx)
- [`canvasDbtAuthoringModel.ts`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/web/src/app/views/canvas/canvasDbtAuthoringModel.ts)
- [`canvasDbtModelArtifactProjection.ts`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.ts)

### Protected live proof

The current live proof:

1. creates a clean dbt Canvas;
2. imports a protected Postgres source;
3. connects the source to a DBT model;
4. opens the node workbench;
5. verifies inherited columns;
6. edits model SQL;
7. waits for graph-draft persistence;
8. previews the plan;
9. verifies `models/model_1.sql` contains the authored SQL;
10. opens Project Code and selects that file.

Relevant test:

- [`canvas-source-import-live-clean.cy.ts`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts)

This is a valid graph-to-file and Preview proof. It is not yet a two-way file-to-graph conflict and
reconciliation proof.

## CI assessment

### #1991 feature-head CI

The final feature head
[`e6010fd89b6e9d86a37ac68afb31a7e8909f3c18`](https://github.com/dunay2/dvt/commit/e6010fd89b6e9d86a37ac68afb31a7e8909f3c18)
has six successful observed workflows:

| Workflow | Result | Run |
| --- | --- | --- |
| Dependency Review | success | [29676534121](https://github.com/dunay2/dvt/actions/runs/29676534121) |
| Contracts & Determinism | success | [29676534131](https://github.com/dunay2/dvt/actions/runs/29676534131) |
| Test Suite | success | [29676534127](https://github.com/dunay2/dvt/actions/runs/29676534127) |
| CodeQL | success | [29676534128](https://github.com/dunay2/dvt/actions/runs/29676534128) |
| CI - Code Quality | success | [29676534166](https://github.com/dunay2/dvt/actions/runs/29676534166) |
| PR Quality Gate | success | [29676534126](https://github.com/dunay2/dvt/actions/runs/29676534126) |

This is strong feature-head evidence.

### Exact-main CI identity gap

For exact
[`main@eb9a393edb01917be97437a2226c8a91791ff0e4`](https://github.com/dunay2/dvt/commit/eb9a393edb01917be97437a2226c8a91791ff0e4),
the inspected connector interfaces return:

- no pull-request workflow runs;
- no combined status entries.

The feature head and the merge commit are different Git identities. Do not describe feature-head
checks as exact-main evidence. Before tagging `0.5.0`, validate the exact commit intended for the
tag and retain a tree or artifact digest that binds the evidence to that identity.

### Previous review CI

PR #1990 completed appropriate documentation-only checks:

- PR Quality Gate: success;
- CI - Code Quality: success;
- Test Suite: skipped;
- Contracts & Determinism: skipped;
- CodeQL: skipped;
- Dependency Review: skipped.

It remains documentation-only but is now stale relative to current product code.

### Release-head CI

The current release head is
[`412f6f155134905f3b35e96500ba36abbcbaf3a6`](https://github.com/dunay2/dvt/commit/412f6f155134905f3b35e96500ba36abbcbaf3a6).
All six observed workflows are completed as `action_required`:

- Dependency Review;
- PR Quality Gate;
- Contracts & Determinism;
- CodeQL;
- Test Suite;
- CI - Code Quality.

The inspected PR Quality Gate run created no jobs. This is not failed test evidence; it is absent
execution evidence and must be resolved before release.

## Review-thread assessment

### Active unresolved product thread

Merged PR [#1983](https://github.com/dunay2/dvt/pull/1983) still has one unresolved,
non-outdated P2 thread. Current source still renders:

```tsx
{model.failure.detail ?? messages.selectionRecoveryRefreshFailureMessage}
```

Relevant source:

- [`OperationalDrawerSelectionRecoveryView.tsx`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/web/src/app/components/shell/OperationalDrawerSelectionRecoveryView.tsx#L116-L119)

A nonempty transport or runtime `Error.message` therefore overrides localized copy and can expose
technical English text to Spanish users. Fix the source, add a nonempty-detail Spanish regression
test, reply with the fixing commit, and resolve the thread.

### #1991 threads

PR #1991 has three resolved threads. None remains unresolved:

- canonical empty SQL after apply;
- stale top-level SQL shadowing the canonical config value;
- submitted-draft normalization.

These findings should remain closed unless a regression is observed.

### #1988 thread

The empty-description projection finding is resolved and outdated after the later commits that
preserve empty and whitespace-only scalars.

### #1984 threads

The release PR has no inline review threads. Absence of review comments is not approval; the
release has an outstanding requested reviewer and unresolved CI and changelog blockers.

## New critical finding AUTH-01 — model SQL has two writable authorities

### Observed graph-side authority

The node-workbench reader derives model SQL only from canonical node metadata:

```ts
modelSql: readAuthoredSql(configMetadata?.sql) ?? readAuthoredSql(node.metadata?.sql)
```

The apply path writes it back to `metadata.config.sql`.

Relevant source:

- [`canvasDbtAuthoringModel.ts`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/web/src/app/views/canvas/canvasDbtAuthoringModel.ts#L69-L134)

No workspace-file read participates in this graph-side model draft.

### Observed file-side authority

Project Code is an auto-saving working-tree editor. Its test proves that typing sends a POST with an
expected content SHA and keeps the user-facing status `Synchronized` without a Save button.

Relevant source:

- [`code-workbench-workspace-files.cy.ts`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts#L96-L131)

The #1991 live flow exposes the generated `models/model_1.sql` through this Project Code surface.

### Observed Preview publication

For `planner_generic_preview`, Preview:

1. projects all dbt workspace artifacts from graph nodes;
2. iterates them sequentially;
3. reads each file's current revision;
4. saves each generated content using that immediately-read revision.

Relevant source:

- [`canvasPlanAction.ts`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/web/src/app/views/canvas/canvasPlanAction.ts#L141-L163)
- [`canvasGitProvenance.ts`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/web/src/app/views/canvas/canvasGitProvenance.ts#L47-L59)

### Failure scenario

A concrete loss scenario is now possible:

1. Canvas node metadata contains SQL revision G1.
2. Preview writes workspace file F1 from G1.
3. User opens Project Code and changes F1 to F2; the file editor saves F2 successfully.
4. Graph metadata remains G1 because graph-side model authoring does not read the file.
5. User runs Preview again.
6. Preview reads F2's current SHA immediately before saving.
7. Preview supplies that SHA as the expected revision and writes graph-derived G1.
8. No conflict is raised because the expected revision was sampled after the external edit.
9. F2 is lost and the UI can report successful Preview.

This is not a theoretical race requiring simultaneous writers. It is a normal sequential workflow
across two product surfaces.

### Severity

**P1 product integrity / release blocker.** User-authored SQL can be overwritten without an explicit
authority decision or conflict.

### Required correction

Choose one of these policies explicitly:

#### Preferred policy — workspace file authoritative after materialization

- before a model file exists, Canvas may show a generated proposal;
- applying node Code creates or patches the authoritative model file with a baseline SHA;
- successful file mutation returns the exact file revision and exact dbt analysis identity;
- the graph projects from that file;
- Project Code and node Code edit the same revisioned resource;
- external divergence produces a conflict, never overwrite;
- Preview consumes files and does not regenerate already-authoritative authored files.

#### Temporary containment policy — graph authoritative generated workspace

- generated model files are clearly labeled generated and overwritable;
- Project Code makes those paths read-only;
- direct editing requires an explicit `Adopt as authoritative file` transition;
- Preview refuses if any generated file diverged from the graph-produced baseline;
- generated and file-authoritative projects are visibly different modes.

Do not continue with the current implicit hybrid.

## New critical finding TX-02 — Preview publishes multiple files non-atomically

`buildDbtWorkspaceArtifacts` can produce:

- `dbt_project.yml`;
- one SQL file per scoped model;
- `models/schema.yml`.

Preview saves them in a loop. If write N fails after writes 1 through N-1 succeed, the workspace is
left partially changed although Preview returns failure.

Relevant source:

- [`canvasDbtWorkspaceArtifacts.ts`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/web/src/app/views/canvas/canvasDbtWorkspaceArtifacts.ts#L105-L166)
- [`canvasPlanAction.ts`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/web/src/app/views/canvas/canvasPlanAction.ts#L141-L163)

The repository already has an appropriate infrastructure primitive:

- [`LocalWorkspaceFileBatchMutationGateway.ts`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.ts)

That gateway:

- preflights every expected revision;
- applies one idempotent mutation;
- locks all affected paths;
- replaces the files atomically;
- writes a receipt with the batch.

Preview should use the batch mutation rail, or an equivalent server-owned command, rather than
client-side sequential writes.

Severity: **P1 when authored SQL is present; P2 for generated-only preview.** The introduction of
user-authored model SQL makes partial publication a user-data integrity issue.

## New transaction gap TX-03 — Apply means local reducer submission, not durable completion

The workbench Apply button calls:

```ts
authoring.onApplyNodeDraft(draft);
draftController.onDraftSubmitted();
```

The authoring contract returns `void`. The command only updates the local Canvas draft working set.
Actual remote graph-draft persistence occurs later through the debounced draft persistence runtime.

Relevant source:

- [`CanvasInspectorAuthoringSection.tsx`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/web/src/app/views/canvas/CanvasInspectorAuthoringSection.tsx#L176-L191)
- [`canvasInspectorAuthoring.types.ts`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/web/src/app/views/canvas/canvasInspectorAuthoring.types.ts#L32-L35)
- [`useCanvasInspectorCommands.ts`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/web/src/app/views/canvas/useCanvasInspectorCommands.ts#L21-L40)
- [`canvasDraftPersistenceRuntime.ts`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/web/src/app/views/canvas/canvasDraftPersistenceRuntime.ts#L8-L8)

The global draft runtime can later mark persistence failed, but the node workbench has already
canonicalized its submitted local state. The local controller solves in-flight edit preservation;
it does not provide a user-visible durable mutation receipt.

Required contract:

```ts
type ApplyNodeDraftResult =
  | { kind: 'saved'; draftRevision: string; nodeRevision: string }
  | { kind: 'conflict'; currentRevision: string }
  | { kind: 'failed'; code: StableNodeDraftFailureCode };
```

The workbench should display pending, saved, conflict, and failure states and should only claim
synchronization after the remote authoritative revision is confirmed.

## New architectural drift ARCH-01 — two dbt Canvas authority models diverge

The repository now has two dbt Canvas experiences:

### Graph-draft Canvas

- graph aggregate is editable;
- model SQL is stored in node metadata;
- Preview materializes workspace files;
- Project Code can then edit those files.

### Imported file-authoritative Canvas

- source files are explicitly the semantic authority;
- graph semantic mutations throw;
- `canEditCanvas` and generic node property editing are false;
- model Code opens the authoritative file workbench;
- YAML description editing uses a dedicated revision-bound file transaction.

Relevant source:

- [`DbtProjectFileCanvasView.tsx`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/web/src/app/views/canvas/DbtProjectFileCanvasView.tsx#L151-L180)
- [`useDbtProjectFileCanvasController.ts`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts#L45-L48)

The split is understandable as an incremental implementation path, but the product currently uses
one visual concept—dbt Canvas—for incompatible authority semantics. A user cannot infer whether
Code edits mutate graph metadata, mutate a file, create generated content, or will be overwritten
at Preview.

Required product convergence:

- display an explicit authority badge for each code surface;
- use one shared model-code transaction abstraction;
- project both graph-first creation and imported projects into the same file-authoritative end
  state once a model file exists;
- retain generated proposals as proposals, not parallel authorities;
- ensure graph, Code, Preview, Run, and reopen name the same content revision.

## Existing bug BUG-01 — invalid file Code refresh can still report synchronization

PR #1991 did not change the file-authoritative Code refresh boundary. Current controller behavior is:

```ts
const result = await refetchProjectGraph();
if (!result.isSuccess || result.data == null) throw ...;
return projectDbtProjectGraphToCanonicalCanvas(result.data);
```

It does not reject `freshness: invalid`, `stale-last-valid`, or unavailable semantic analysis when
the query returns HTTP success with data.

Relevant source:

- [`useDbtProjectFileCanvasController.ts`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts#L240-L253)

The Code working-tree contract can therefore resolve its refresh promise and display
`Synchronized` even when the persisted SQL made dbt analysis invalid or degraded.

Required correction:

- return a typed semantic refresh result;
- distinguish `content_saved` from `analysis_fresh`;
- keep Code in a degraded or blocked state when analysis is invalid, stale, or unavailable;
- show stable localized diagnostics;
- prove invalid SQL, recovery, and reopen.

Severity: **P1 release blocker.**

## Existing bug BUG-02 — raw recovery diagnostics override localized copy

The unresolved #1983 defect remains on current `main` and was not touched by #1991.

Required correction:

- render only stable localized user copy in the recovery surface;
- preserve sanitized diagnostic detail in logs, telemetry, or an explicitly technical detail view;
- add English and Spanish tests with nonempty technical detail;
- resolve the review thread after the fix lands.

Severity: **P1 release blocker.**

## Existing performance and authority gap PERF-01 — duplicate dbt analysis after YAML edits

The YAML description apply command already executes the file-authoritative project graph use case
and records the analysis identity in the immutable receipt.

Relevant source:

- [`ApplyDbtYamlDescriptionEditCommand.ts`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/api/src/application/services/dbtYamlDescriptionEdit/ApplyDbtYamlDescriptionEditCommand.ts#L118-L143)

After the API returns, the browser immediately calls `onProjectChanged`, which refetches and can
execute another dbt parse. Revert repeats the pattern.

Relevant source:

- [`useDbtYamlDescriptionEditor.ts`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/web/src/app/components/dbtYamlDescriptionEditor/useDbtYamlDescriptionEditor.ts#L184-L255)

One user operation can therefore establish one analysis identity in its receipt and show another
opportunistic analysis in the UI.

Preferred correction:

- return the authoritative projection with the command result and seed the query cache; or
- retrieve the exact analysis identity from a content-addressed cache; or
- pass the transaction analysis revision through Canvas, Preview, Run, and receipt UI before any
  later explicit refresh.

## Existing recovery gap TX-04 — persisted-invalid description recovery is not proven durable

The description transaction can retain a changed file and an immutable receipt, but the primary
Revert affordance is driven by browser state. The inspected surface does not demonstrate a
server-backed query for recent applicable recovery operations after a fresh browser session.

Required decision:

1. rollback automatically when post-write analysis is invalid or unavailable; or
2. retain the invalid revision and expose durable server-backed recovery by workspace, resource,
   path, and revision.

If policy 2 remains, prove:

- fresh browser reopen;
- another writer intervening;
- exact applicable receipt selection;
- conflict-safe revert;
- audit retention.

## Existing product gap FILE-01 — accepted projects exceed the workspace surface

The dbt importer defaults to:

```text
maxProjectFiles       10,000
maxInspectedFiles    100,000
maxProjectBytes   50,000,000
maxDirectories         5,000
maxDepth                   64
```

Relevant source:

- [`LocalDbtProjectImportInspector.ts`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/api/src/infrastructure/dbt/LocalDbtProjectImportInspector.ts#L37-L73)

The workspace repository defaults to:

```text
MAX_LISTED_FILES       500
MAX_FILE_BYTES     1,000,000
```

Relevant source:

- [`LocalWorkspaceFileRepository.ts`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts#L49-L68)

Listing stops silently at 500 without cursor, truncation flag, total, or omitted count. Files above
1 MB are reported as `InvalidWorkspacePathError`, conflating content size with path validity.

A project can therefore be accepted and analyzed while:

- files after the first 500 are absent from the explorer;
- the UI does not know inventory is partial;
- an authoritative file cannot be opened or edited;
- Canvas, Code, import, and analysis operate with different completeness assumptions.

Required contract:

```ts
type WorkspaceFileInventoryPage = Readonly<{
  entries: readonly WorkspaceFileEntry[];
  nextCursor: string | null;
  completeness: 'complete' | 'partial';
  totalKnown: number | null;
  effectiveLimits: Readonly<{
    maxPageSize: number;
    maxInteractiveFileBytes: number;
    maxAcceptedProjectFiles: number;
    maxAcceptedProjectBytes: number;
  }>;
}>;
```

## Existing operability gap OPS-01 — receipt lifecycle remains implicit

The YAML description receipt store creates immutable applied and reverted receipt files. The
inspected store exposes save and find-by-ID behavior, but no visible recent-operation query,
retention policy, quota, archival, compaction, or garbage-collection strategy.

Required policy:

- classify receipts as audit evidence, recovery records, or both;
- index by tenant, workspace, canvas, resource, path, and time;
- expose latest applicable recovery operations;
- define retention and legal/audit requirements;
- enforce quotas without silently deleting required evidence;
- monitor receipt count and bytes per workspace.

## Release assessment

PR [#1984 — Release 0.5.0](https://github.com/dunay2/dvt/pull/1984) is open,
non-draft, mergeable, one commit ahead of current `main`, and zero behind. Its change is limited to:

- `.release-please-manifest.json`;
- `CHANGELOG.md`;
- `package.json`.

That narrow file scope is appropriate for a release PR. Its content and evidence are not ready.

### REL-01 — duplicate semantic feature

The changelog lists the same execution-selection recovery twice:

- merge commit `ec47025`;
- feature parent `fa240f8`.

Release generation is counting repository topology as two product changes.

### REL-02 — implementation topology dominates product communication

The current `0.5.0` notes enumerate many internal commits independently, including intermediate
fixes, planning mechanics, and closeout commits. This obscures the coherent user outcomes:

1. explicit execution-selection recovery;
2. file-authoritative dbt YAML model-description roundtrip;
3. canonical node presentation and graph-draft model SQL authoring.

Required release-note model:

- one product summary per merged feature PR;
- normalized duplicate detection across merge and parent commits;
- engineering provenance under the product summary, not as peer product features;
- fixtures that cover merge-parent topology and release-branch regeneration.

### REL-03 — workflows did not execute

All six current release-head workflows are `action_required`; the inspected Quality Gate run has no
jobs. Do not merge or tag until applicable checks execute and succeed.

### REL-04 — release still includes known P1 integrity bugs

Even after CI is enabled, the release remains blocked by:

- dual writable model-SQL authority;
- non-atomic Preview publication;
- invalid file Code semantic refresh;
- unresolved localized recovery failure;
- missing failure-path proofs.

## Test-gap assessment

The current protected proof is valuable but happy-path centered. It does not prove:

- Project Code edit followed by Canvas Preview conflict or reconciliation;
- file-to-graph SQL propagation;
- invalid SQL in graph-draft node Code;
- invalid SQL in file-authoritative Project Code;
- node Apply persistence failure;
- partial multi-file write prevention;
- concurrent graph and file edits;
- browser reopen on the same authored graph revision;
- browser reopen on a retained invalid file revision;
- more than 500 workspace files;
- an authoritative file above 1 MB;
- exact release-tag validation.

Minimum protected matrix before release:

| Scenario | Required result |
| --- | --- |
| Node Code valid edit | Exact durable revision, fresh analysis, Preview, Run, reopen |
| Node Code invalid edit | Persisted/degraded or rolled back according to explicit policy |
| Project Code changes generated model | Conflict, adoption, or read-only; never silent overwrite |
| Preview multi-file write conflict | Zero files changed |
| Failure on later artifact | Zero partial publication |
| Edit while graph draft save is in flight | Newer edit preserved and durable state explicit |
| Spanish selection refresh failure with technical detail | Stable localized user message |
| 501-file project | Explicit pagination or partial-inventory state |
| Release tag target | All applicable checks bound to exact identity |

## Architectural drift assessment

### ARCH-02 — change amplification remains excessive

PR #1991 changes 85 files and adds 12 Planning DB migrations for one bounded presentation and SQL
authoring increment. The migrations add approximately 5,185 lines, about 62 percent of the PR's
8,344 additions.

Some breadth is justified by ownership, tests, copy, contracts, and evidence. The ratio still shows
that runtime change and governance state are coupled too tightly.

Recommended controls:

- define feature ownership once and generate secondary registries;
- separate runtime correctness gates from descriptive planning completeness;
- establish a change-amplification budget per user story;
- require an architecture note when a bounded change crosses an agreed authority or migration
  threshold;
- batch coherent Planning DB state while a feature branch is unmerged;
- measure the next model-SQL convergence PR against #1991 and require a materially smaller surface.

### ARCH-03 — names claim unified authority before cross-surface authority exists

Several commits and files use `truth`, `authority`, and `roundtrip` accurately within local
components. Across the product, the model SQL still has graph-draft authority, workspace-file
authority, generated artifact authority, and imported-project authority.

Required vocabulary discipline:

- `presentation truth` may remain a derived read model;
- `graph draft authority` must name its scope;
- `workspace file authority` must name its revision;
- `generated proposal` must not be called authoritative code;
- `roundtrip` should require edit A → persist B → reproject A from B, not merely A → materialize B.

### ARCH-04 — client orchestration bypasses a stronger server transaction primitive

The repository contains an atomic batch mutation gateway, but Preview publishes related dbt files
through repeated client-side single-file writes. This is an architectural inversion: the most
important cross-file invariant is implemented in the weaker orchestration layer.

Move publication into one server-owned command with:

- scoped authorization;
- complete expected revision set;
- atomic batch mutation;
- idempotency key;
- receipt;
- exact analysis identity;
- no partial success response.

### GOV-01 — review PRs form a competing implementation queue

Before this report, seven documentation-only review PRs remain open:

- #1981 and #1982 review `main@4c98026`;
- #1985, #1986, and #1987 review `main@ec47025`;
- #1989 and #1990 review `main@ef8c589`.

All are stale as current implementation authority. #1990 is now 18 product commits behind `main`.
Leaving all reports open forces the implementation agent to choose among contradictory snapshots.

Governance rule:

> Keep one open current-state review PR. Close superseded review PRs and link to the replacement.
> Preserve closed reports as historical evidence, not concurrent implementation authority.

No existing PR was closed by this review because the requested operation is documentation-only and
does not authorize unrelated PR state changes.

## Open pull-request and branch-work assessment

| PR | State | Scope | Decision |
| --- | --- | --- | --- |
| [#1984](https://github.com/dunay2/dvt/pull/1984) | Open, non-draft, mergeable | Release `0.5.0` | Block; repair authority, notes, and CI |
| [#1990](https://github.com/dunay2/dvt/pull/1990) | Open draft, mergeable | Review of `ef8c589` | Superseded; close when authorized |
| [#1989](https://github.com/dunay2/dvt/pull/1989) | Open draft, mergeable | Review of `ef8c589` | Stale; close as superseded |
| [#1987](https://github.com/dunay2/dvt/pull/1987) | Open draft, mergeable | Review of `ec47025` | Stale; close as superseded |
| [#1986](https://github.com/dunay2/dvt/pull/1986) | Open draft, mergeable | Review of `ec47025` | Stale; close as superseded |
| [#1985](https://github.com/dunay2/dvt/pull/1985) | Open draft, mergeable | Review of `ec47025` | Stale; close as superseded |
| [#1982](https://github.com/dunay2/dvt/pull/1982) | Open draft, mergeable | Review of `4c98026` | Stale; close as superseded |
| [#1981](https://github.com/dunay2/dvt/pull/1981) | Open draft, mergeable | Review of `4c98026` | Stale; close as superseded |

Visible relevant branch work:

- `release-please--branches--main--components--dvt` is one release commit ahead of `main`;
- `agent/dvt-review-20260719-0209` is one documentation commit ahead of its old merge base and 18
  commits behind current `main`;
- no open functional implementation PR is visible after #1991 merged.

## Findings register

| ID | Severity | Finding | State |
| --- | --- | --- | --- |
| AUTH-01 | P1 release | Graph node SQL and Project Code file are independently writable; Preview can silently overwrite file edits | Confirmed by current control flow |
| TX-02 | P1 release | Preview publishes related dbt files sequentially rather than atomically | Confirmed on `main` |
| TX-03 | P2 product | Node Apply acknowledges local reducer submission before durable remote save | Confirmed on `main` |
| ARCH-01 | P1 product | Graph-draft and imported-file dbt Canvases expose incompatible authority semantics | Confirmed on `main` |
| BUG-01 | P1 release | File Code treats HTTP-success invalid/stale analysis as successful refresh | Unchanged and confirmed by current controller |
| BUG-02 | P1 release | Raw selection-recovery detail overrides localized copy | Confirmed; #1983 thread unresolved |
| PERF-01 | P1 | YAML apply/revert performs transaction analysis then immediate independent refetch analysis | Confirmed on `main` |
| TX-04 | P1 | Retained-invalid YAML edit recovery is not proven durable after reopen | Design and proof gap |
| FILE-01 | P1 product | Import accepts projects beyond workspace listing and interactive file limits | Confirmed on `main` |
| REL-01 | P1 release | `0.5.0` duplicates execution-selection recovery | Confirmed in #1984 |
| REL-02 | P2 release | Release notes expose internal commit topology instead of coherent product outcomes | Confirmed in #1984 |
| REL-03 | P1 release | Six release workflows are `action_required` | Confirmed on current release head |
| EVID-01 | P2 | Exact main merge SHA has no connector-visible CI/status evidence | Confirmed evidence gap |
| OPS-01 | P2 | Immutable YAML receipts have no visible discovery and lifecycle policy | Component limitation remains |
| ARCH-02 | P2 | #1991 spans 85 files and 12 Planning DB migrations | Confirmed by PR and compare metadata |
| ARCH-03 | P2 | Authority and roundtrip vocabulary is broader than actual cross-surface guarantees | Confirmed architecture drift |
| ARCH-04 | P1 | Client Preview bypasses existing atomic server batch mutation capability | Confirmed architecture inversion |
| GOV-01 | P2 | Seven superseded review PRs remain open before this report | Confirmed |
| TEST-01 | P1 release | No protected external-edit, invalid-SQL, atomicity, or file-to-graph proof | Confirmed from test scope |

## Recommended next route

### Phase 0 — contain overwrite risk immediately

Target: one small hotfix or first commit in the convergence PR.

Exit criteria:

- generated graph-owned model files cannot be edited as ordinary authoritative Project Code; or
- Preview detects divergence from the last graph-produced file revision and blocks;
- the UI identifies the current authority and overwrite policy;
- a regression test proves a Project Code edit is never silently replaced.

This containment should land before release regeneration.

### Phase 1 — one revision-bound model SQL transaction

Target: model SQL edits from node Code and Project Code share one file-authoritative command.

Recommended command shape:

```ts
type ProposeDbtModelSqlEdit = Readonly<{
  canvasId: string;
  modelUniqueId: string;
  path: string;
  expectedContentSha256: string | null;
  proposedBody: string;
}>;

type ApplyDbtModelSqlEditResult =
  | Readonly<{
      kind: 'applied';
      path: string;
      previousContentSha256: string | null;
      appliedContentSha256: string;
      analysisRevision: string;
      graphRevision: string;
      receiptId: string;
    }>
  | Readonly<{
      kind: 'conflict';
      path: string;
      currentContentSha256: string | null;
    }>
  | Readonly<{
      kind: 'analysis_invalid';
      policy: 'retained' | 'rolled_back';
      receiptId: string;
      diagnostics: readonly StableDbtDiagnostic[];
    }>;
```

Exit criteria:

- one source of model SQL after the file is created;
- exact CAS baseline;
- immutable receipt;
- exact post-command analysis identity;
- graph reprojection from the applied file;
- Preview and Run consume that same revision;
- reopen displays the same content;
- direct Code and node Code conflict safely.

### Phase 2 — atomic project publication

Target: replace sequential Preview writes with one server-owned batch command.

Exit criteria:

- complete expected revision set for every touched file;
- one idempotency key;
- one atomic mutation;
- zero partial workspace changes on conflict or failure;
- one publication receipt;
- exact analysis identity after the batch;
- retries return the same receipt;
- tests inject failure on an intermediate file.

Reuse the existing workspace batch mutation port rather than creating another transaction engine.

### Phase 3 — truthful persistence and semantic status

Target: separate local edit, durable save, and semantic analysis states.

Exit criteria:

- node workbench does not claim completion on synchronous reducer update;
- Code status distinguishes `Saving`, `Content saved`, `Analysis fresh`, `Analysis invalid`,
  `Analysis stale`, `Conflict`, and `Failed`;
- invalid SQL cannot display `Synchronized`;
- all user messages are localized stable copy;
- technical details are sanitized and separated;
- #1983 thread is resolved.

### Phase 4 — truthful `0.5.0`

Target: corrected release PR and exact release evidence.

Exit criteria:

- normalized release notes with no merge-parent duplicate;
- product summaries per merged PR;
- known P1 release findings closed;
- all applicable release-head checks execute and succeed;
- exact tag-target identity has machine-readable evidence;
- package version and manifest agree;
- release notes clearly label what is file-authoritative, graph-generated, and still limited.

### Phase 5 — workspace capability truth

Target: paginated inventory and explicit effective limits.

Exit criteria:

- no silent 500-file truncation;
- completeness visible in API and UI;
- distinct oversized-file result;
- import, analysis, explorer, Code, and authoring share policy authority;
- 501-file, near-10,000-file, and above-1-MB proofs.

### Phase 6 — converge the two dbt Canvas modes

Target: graph-first creation and imported projects reach the same file-authoritative steady state.

Exit criteria:

- generated proposal before first file creation;
- file authority after materialization;
- same model SQL transaction in both modes;
- no separate semantic meaning for identical Code affordances;
- graph projects from files;
- graph edits write files through revision-bound commands;
- Preview does not rewrite authoritative files opportunistically.

### Phase 7 — generalize narrowly

Only after the model SQL kernel is stable, generalize once to **column description in
`schema.yml`**.

Use the same:

- proposal;
- focused diff;
- CAS;
- batch mutation;
- receipt;
- exact analysis identity;
- conditional revert;
- conflict handling;
- Preview, Run, and reopen proof.

Do not build a generic mutation framework in advance. Extract only the abstractions proven common
by model description, model SQL, and column description.

## Concrete acceptance tests for the next implementation PR

### Test A — direct Code divergence

1. create graph model SQL G1;
2. Preview to produce F1;
3. edit F1 to F2 in Project Code;
4. return to Canvas;
5. Preview again;
6. assert explicit conflict, adoption, or read-only behavior;
7. assert F2 is not silently replaced.

### Test B — node Code revision conflict

1. open node Code at file revision R1;
2. edit the same file externally to R2;
3. submit node Code based on R1;
4. assert conflict includes R2;
5. assert no file, graph, or analysis mutation is reported as applied.

### Test C — atomic publication

1. prepare three artifact writes;
2. force the second or third path to conflict or fail;
3. assert all original file SHAs remain unchanged;
4. assert no success receipt exists;
5. retry with valid revisions and assert one batch receipt.

### Test D — invalid SQL policy

1. submit syntactically invalid model SQL;
2. assert the chosen retained-or-rollback policy;
3. assert localized status;
4. assert Preview and Run are blocked;
5. reopen browser;
6. recover or revert using server-backed state;
7. assert a fresh valid analysis revision.

### Test E — save failure after local Apply

1. edit node Code;
2. force graph-draft persistence failure;
3. click Apply;
4. assert the workbench remains failed or pending, not clean/synchronized;
5. retry and assert exact durable revision.

### Test F — exact release identity

1. produce the final release commit;
2. execute all applicable checks on that exact SHA;
3. tag that exact SHA;
4. record tree and artifact digests;
5. verify release notes contain one entry per user outcome and no semantic duplicates.

## Files the next agent should inspect first

1. [`canvasPlanAction.ts`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/web/src/app/views/canvas/canvasPlanAction.ts)
2. [`canvasDbtWorkspaceArtifacts.ts`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/web/src/app/views/canvas/canvasDbtWorkspaceArtifacts.ts)
3. [`canvasDbtModelArtifactProjection.ts`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.ts)
4. [`canvasDbtAuthoringModel.ts`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/web/src/app/views/canvas/canvasDbtAuthoringModel.ts)
5. [`CanvasInspectorAuthoringSection.tsx`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/web/src/app/views/canvas/CanvasInspectorAuthoringSection.tsx)
6. [`useCanvasNodeWorkbenchDraftController.ts`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/web/src/app/views/canvas/useCanvasNodeWorkbenchDraftController.ts)
7. [`canvasDraftPersistenceRuntime.ts`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/web/src/app/views/canvas/canvasDraftPersistenceRuntime.ts)
8. [`LocalWorkspaceFileBatchMutationGateway.ts`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.ts)
9. [`useDbtProjectFileCanvasController.ts`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts)
10. [`code-workbench-workspace-files.cy.ts`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts)
11. [`canvas-source-import-live-clean.cy.ts`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts)
12. [`OperationalDrawerSelectionRecoveryView.tsx`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/web/src/app/components/shell/OperationalDrawerSelectionRecoveryView.tsx)
13. [`useDbtYamlDescriptionEditor.ts`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/web/src/app/components/dbtYamlDescriptionEditor/useDbtYamlDescriptionEditor.ts)
14. [`LocalWorkspaceFileRepository.ts`](https://github.com/dunay2/dvt/blob/eb9a393edb01917be97437a2226c8a91791ff0e4/apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts)

## Decision summary

DVT should preserve the product gains from #1988 and #1991. The project now has real
file-authoritative YAML editing, canonical node presentation, contextual workbenches, and
user-authored model SQL that reaches Preview and a workspace file.

The next move is not another large feature. It is to remove the newly exposed ambiguity between
graph metadata and writable model files.

The release decision is therefore:

1. **Do not merge #1984 yet.**
2. **Contain silent overwrite risk.**
3. **Establish one revision-bound file authority for model SQL.**
4. **Publish related files atomically.**
5. **Make durable persistence and semantic analysis states explicit.**
6. **Fix the unresolved localization and invalid-refresh bugs.**
7. **Regenerate concise release notes and obtain exact-tag CI.**
8. **Then address workspace inventory truth and converge the two dbt Canvas modes.**
9. **Only then generalize to column descriptions.**

## Documentation-only validation for this report

This review branch is intended to contain exactly one added Markdown file under
`docs/planning/reviews/architecture-and-governance/`.

No runtime code, workflow, dependency, contract, configuration, migration, generated artifact, or
product behavior is intentionally changed. No PR is merged, closed, relabeled, or approved by this
report.
