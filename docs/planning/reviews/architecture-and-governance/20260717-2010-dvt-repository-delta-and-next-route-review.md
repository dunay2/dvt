---
title: DVT Repository Delta and Next Route Review — 2026-07-17 20:10
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
date: 2026-07-17
last_reviewed: 2026-07-17
planning_type: review
reviewed_repository: dunay2/dvt
reviewed_ref: main
reviewed_commit: 4c98026c0dd2e2b9e4bbcc126033b34f8afa2b5c
related_review_pr: 1981
---

# DVT Repository Delta and Next Route Review — 2026-07-17 20:10

## Executive verdict

There is no new product-code delta on `main` since the preceding repository
review. The default branch remains at release `0.4.0`, commit
[`4c98026c0dd2e2b9e4bbcc126033b34f8afa2b5c`](https://github.com/dunay2/dvt/commit/4c98026c0dd2e2b9e4bbcc126033b34f8afa2b5c).

The only visible open pull request is the documentation-only draft
[#1981](https://github.com/dunay2/dvt/pull/1981). It is mergeable, has one changed
Markdown file, has no submitted reviews or inline review threads, and its
observed documentation-oriented checks are green. It does not change runtime,
product, contracts, migrations, workflows, dependencies, or configuration.

The repository therefore remains at the same product decision boundary:

> DVT has strong dbt file authority, analysis, Preview/Run provenance,
> execution-selection safety, migration integrity, and governance evidence, but
> it still lacks one complete user-visible, revision-bound, lossless dbt editing
> transaction.

The next implementation work should not add another broad governance layer. It
should first make workspace inventory honest for projects already accepted by the
dbt importer, then deliver one complete `schema.yml` model-description edit from
Canvas to authoritative file and back.

## Immediate instruction for the implementation agent

Proceed in this order:

1. fix the workspace/import capability contradiction;
2. prove one complete revision-bound `schema.yml` model-description edit;
3. make graph-draft Code behavior honest when no persisted SQL exists;
4. add exact-default-branch release evidence;
5. then harden accessibility, large-graph performance, outbox scale, canary,
   recovery, and dependency convergence.

Do not start Deployment, Schedule, Backfill, or another large governance
mechanization phase before items 1 and 2 are complete.

## Review method and limits

This review inspected through the GitHub connector:

- repository metadata and current default branch;
- recent commits visible for `main`;
- all visible open pull requests and the most recent merged/closed pull requests;
- PR #1981 metadata, changed-file count, workflow runs, review submissions, and
  inline review threads;
- workflow and combined-status visibility for the exact current `main` SHA;
- source-level workspace file limits and dbt import limits;
- file-authoritative dbt Canvas mutation policy;
- graph-draft dbt workspace artifact generation and Code empty-state behavior;
- open issues covering performance, accessibility, determinism, nightly
  integration, canary, and multi-worker ordering.

This review did not execute the repository locally. Test and runtime claims are
based on committed source and GitHub workflow evidence.

The branch-search connector returned no entries for relevant branch-name queries.
Branch work is therefore reconstructed from pull-request head metadata and recent
PR history. No conclusion depends on assuming that an unenumerated branch does
not exist.

## Current repository snapshot

| Signal | Observed state |
| --- | --- |
| Current `main` | [`4c98026c0dd2e2b9e4bbcc126033b34f8afa2b5c`](https://github.com/dunay2/dvt/commit/4c98026c0dd2e2b9e4bbcc126033b34f8afa2b5c) |
| Current release | `0.4.0` |
| Visible open PRs | One: draft [#1981](https://github.com/dunay2/dvt/pull/1981) |
| PR #1981 scope | 1 commit, 1 Markdown file, 1,043 additions, 0 deletions |
| PR #1981 mergeability | Mergeable, draft |
| PR #1981 review state | No reviews; no inline review threads |
| PR #1981 CI | PR Quality Gate: success; CI - Code Quality: success; four other workflows skipped |
| Exact `main` workflow runs | None returned for the merge SHA |
| Exact `main` combined status | No statuses returned |
| Latest merged product/governance PR | [#1979](https://github.com/dunay2/dvt/pull/1979) |
| Latest merged release PR | [#1980](https://github.com/dunay2/dvt/pull/1980) |

## Delta since the preceding review

### Changed

1. Draft PR [#1981](https://github.com/dunay2/dvt/pull/1981) now exists and records
   the detailed repository review against the same `main` SHA.
2. Its head
   [`d42b5ffc9b95ea2bc7b52570f5dd882b76cef353`](https://github.com/dunay2/dvt/commit/d42b5ffc9b95ea2bc7b52570f5dd882b76cef353)
   has successful PR Quality Gate and CI - Code Quality workflow conclusions.
3. Dependency Review, Test Suite, Contracts & Determinism, and CodeQL are observed
   as skipped on that documentation-only head. The connector evidence does not
   independently prove the skip reason, although the result is consistent with
   path-scoped workflow routing.

### Not changed

1. `main` has not advanced beyond release `0.4.0`.
2. No new functional pull request is visible.
3. No implementation closes the workspace inventory mismatch.
4. No implementation adds file-authoritative dbt visual editing.
5. No exact-default-branch CI evidence is attached to the current merge SHA.
6. The current open PR stream remains documentation/governance rather than a
   user transaction.

## Recent commit interpretation

The latest visible `main` sequence is dominated by:

- release `0.4.0`;
- dbt round-trip capability-truth projection;
- Planning DB capability-evidence and migration-integrity corrections;
- CI routing and shallow-clone validation fixes.

That work is valuable and should not be dismissed. It closed real correctness
failures in selection authority, migration ordering, migration concurrency, and
capability evidence. However, it is primarily governance and safety
mechanization. It does not create the next authoring capability.

## CI and review-thread evidence

### Draft PR #1981

PR [#1981](https://github.com/dunay2/dvt/pull/1981) is currently:

- open;
- draft;
- mergeable;
- based on current `main`;
- documentation-only;
- one commit and one changed file;
- without review submissions;
- without inline review threads.

Observed workflow conclusions on the head:

| Workflow | Conclusion |
| --- | --- |
| PR Quality Gate | success |
| CI - Code Quality | success |
| Dependency Review | skipped |
| Test Suite | skipped |
| Contracts & Determinism | skipped |
| CodeQL | skipped |

This is sufficient evidence that the documentation PR passes the checks that ran.
It is not evidence that the product test matrix has been re-executed against a
new product tree, because there is no new product tree.

### Exact current `main`

For the exact merge commit
[`4c98026c0dd2e2b9e4bbcc126033b34f8afa2b5c`](https://github.com/dunay2/dvt/commit/4c98026c0dd2e2b9e4bbcc126033b34f8afa2b5c),
the connector returned:

- no pull-request-associated workflow runs;
- no combined status entries.

This does not prove the shipped tree is defective. It proves that current release
evidence is attached to the green PR head rather than visibly to the exact
default-branch merge commit.

## Relevant branch work

### Active

- [`agent/dvt-review-20260717-1414`](https://github.com/dunay2/dvt/tree/agent/dvt-review-20260717-1414)
  via draft PR [#1981](https://github.com/dunay2/dvt/pull/1981): documentation-only
  repository review.

### Recently merged

- PR [#1979](https://github.com/dunay2/dvt/pull/1979): dbt capability-truth
  projection and its corrective governance/CI work.
- PR [#1980](https://github.com/dunay2/dvt/pull/1980): release `0.4.0`.
- PR [#1977](https://github.com/dunay2/dvt/pull/1977): Planning DB migration
  integrity and ordering hardening.
- PR [#1976](https://github.com/dunay2/dvt/pull/1976): dbt planner graph-source
  ownership guard.
- PR [#1971](https://github.com/dunay2/dvt/pull/1971): explicit dbt execution
  selection integrity.

### Superseded review branches

Several recent review PRs were closed without merge after newer repository-state
reviews replaced them. This is understandable for a fast-moving repository, but
it creates review-stream noise. The repository should keep one current review
baseline and close or clearly supersede older drafts rather than let multiple
nearly identical reports compete as planning authority.

## Findings

## DR-01 — Accepted dbt projects can exceed the workspace product surface

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
[`LocalDbtProjectImportInspector.ts`](https://github.com/dunay2/dvt/blob/4c98026c0dd2e2b9e4bbcc126033b34f8afa2b5c/apps/api/src/infrastructure/dbt/LocalDbtProjectImportInspector.ts#L37-L73).

The workspace repository exposes a different capability:

```text
MAX_LISTED_FILES       500
MAX_FILE_BYTES     1,000,000
```

Evidence:
[`LocalWorkspaceFileRepository.ts`](https://github.com/dunay2/dvt/blob/4c98026c0dd2e2b9e4bbcc126033b34f8afa2b5c/apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts#L39-L75).

The listing recursively stops after the configured count and returns a plain tree.
It provides no continuation cursor, `truncated` flag, total, omitted count, or
limit diagnostic:
[`LocalWorkspaceFileRepository.ts`](https://github.com/dunay2/dvt/blob/4c98026c0dd2e2b9e4bbcc126033b34f8afa2b5c/apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts#L161-L207).

Files above the repository byte limit are rejected for both read and write:
[`LocalWorkspaceFileRepository.ts`](https://github.com/dunay2/dvt/blob/4c98026c0dd2e2b9e4bbcc126033b34f8afa2b5c/apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts#L77-L108).

### User impact

A project can pass dbt import inspection while:

- files after the first 500 are invisible in the workspace tree;
- a legitimate large SQL, YAML, Markdown, or seed file cannot be opened;
- the analyzer can know about resources the Code surface cannot expose;
- users cannot tell whether the project tree is complete;
- visual editing and conflict recovery operate over an incomplete product view.

### Required change

Introduce one shared project/workspace capability policy and an explicit inventory
result, for example:

```ts
type WorkspaceFileInventoryPage = Readonly<{
  entries: readonly WorkspaceFileEntry[];
  nextCursor: string | null;
  totalKnown: number | null;
  truncated: boolean;
  effectiveLimits: Readonly<{
    maxPageSize: number;
    maxReadableFileBytes: number;
  }>;
}>;
```

### Acceptance criteria

- inventory is paginated or cursor-based;
- truncation is explicit and testable;
- import and workspace limits derive from one policy authority;
- large seed/data files have a deliberate read-only/download policy rather than
  failing as an invalid path;
- API, web, and end-to-end tests cover 501+ files and a file above 1 MB;
- Canvas and Code surfaces show the same authoritative project completeness state.

## DR-02 — File-authoritative dbt Canvas is intentionally read-only, so round-trip authoring is not yet delivered

**Severity:** P1 product gap

The file-backed dbt Canvas controller explicitly rejects semantic mutation:
[`useDbtProjectFileCanvasController.ts`](https://github.com/dunay2/dvt/blob/4c98026c0dd2e2b9e4bbcc126033b34f8afa2b5c/apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts#L38-L46).

Projected nodes are marked `canMutateGraph: false`:
[`useDbtProjectFileCanvasController.ts`](https://github.com/dunay2/dvt/blob/4c98026c0dd2e2b9e4bbcc126033b34f8afa2b5c/apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts#L238-L266).

The current product can inspect project code, analyze authoritative files, project
the graph, select executable resources, Preview, and Run. It cannot yet perform a
visual edit that safely changes the authoritative dbt project and then proves the
new graph and execution behavior.

### Required vertical slice

Implement exactly one complete edit first: change a dbt model description in
`schema.yml` from the Canvas workbench.

The transaction must include:

1. read authoritative YAML and current content SHA;
2. locate the exact model entry without lossy reserialization;
3. produce a proposed patch and visible diff;
4. save using expected-revision compare-and-swap;
5. present a clear conflict when the file changed concurrently;
6. retain enough provenance for conditional revert;
7. re-run dbt project analysis after save;
8. refresh graph and inspector from the new authoritative revision;
9. Preview and Run against that same revision;
10. reopen the project and prove the edit persists.

### Exit criterion

A live acceptance test demonstrates:

```text
open imported project
→ edit model description in Canvas
→ inspect diff
→ save with CAS
→ graph refreshes
→ Preview uses saved revision
→ Run uses saved revision
→ reopen project
→ description remains exact
```

## DR-03 — The graph-draft Code action can promise code before code exists

**Severity:** P1 UX correctness and authority-clarity defect

For graph-authored dbt models, workspace SQL artifacts are generated during the
Preview path:
[`canvasPlanAction.ts`](https://github.com/dunay2/dvt/blob/4c98026c0dd2e2b9e4bbcc126033b34f8afa2b5c/apps/web/src/app/views/canvas/canvasPlanAction.ts#L141-L163).

The generator creates `dbt_project.yml`, model SQL files, and `models/schema.yml`:
[`canvasDbtWorkspaceArtifacts.ts`](https://github.com/dunay2/dvt/blob/4c98026c0dd2e2b9e4bbcc126033b34f8afa2b5c/apps/web/src/app/views/canvas/canvasDbtWorkspaceArtifacts.ts#L238-L300).

Before SQL is stored in node metadata, the inspector Code surface can only show:
`No SQL or generated code is recorded for this node.`

Evidence:
[`nodePropertiesReadModel.ts`](https://github.com/dunay2/dvt/blob/4c98026c0dd2e2b9e4bbcc126033b34f8afa2b5c/apps/web/src/app/components/inspector/nodePropertiesReadModel.ts).

### Required behavior

- file-backed node: Code opens the authoritative `node.path`;
- graph-draft node with a valid origin: Code shows deterministic projected SQL
  labelled `Generated preview — not yet persisted`;
- graph-draft node without a valid origin: Code is blocked with the concrete
  missing-source/model reason;
- always show the planned or authoritative path;
- expose a separate project-code action for `dbt_project.yml`, schemas, macros,
  tests, and the project tree.

## DR-04 — Release evidence is not visibly bound to the exact shipped `main` commit

**Severity:** P1 release-governance gap

The release PR head was green, but the connector returns no workflow runs or
combined statuses for the exact current `main` merge SHA.

### Required change

Choose one mechanically enforced model:

- run a default-branch validation workflow after merge;
- use merge queue and attach required checks to the merge-group tree;
- or prove tree equivalence between the green PR head and the released tag/merge
  tree, then publish that proof as release evidence.

### Exit criterion

The release record points to the exact commit or tree that users receive, with a
machine-readable link to the validation result.

## DR-05 — Governance change amplification remains disproportionate to product delivery

**Severity:** P1 delivery and maintainability risk

PR #1979 was necessary and ultimately corrected meaningful defects, but a single
capability-truth projection expanded across proposals, Planning DB migrations,
query adapters, generators, generated-file policy, command catalogs, CI routing,
workflow parity, tests, and mechanization inventories.

This is a Fowler-style **Shotgun Surgery** signal. The problem is not that DVT has
governance. The problem is that correcting one current-state interpretation
requires touching too many authorities and append-only artifacts.

### Required response

- define one declarative capability source per product slice;
- generate derived relational and documentation projections;
- reserve migrations for schema or durable-state transitions;
- avoid append-only migrations for review-only metadata corrections when a
  mutable canonical manifest can own the truth;
- require an architecture waiver when governance-only work changes more than ten
  governance files;
- report product-file-to-governance-file ratio in PR evidence.

## DR-06 — Repeated repository-review PRs are becoming planning noise

**Severity:** P2 governance hygiene risk

The repository has accumulated multiple timestamped review branches and draft PRs,
many closed without merge after a newer review replaced them. This makes it harder
for the implementation agent to know which report is authoritative.

### Required response

- keep one active repository-state review baseline;
- mark newer reviews as explicitly superseding a named predecessor;
- close superseded draft review PRs after the replacement exists;
- never treat a review report as implementation evidence;
- use delta reviews when `main` has not changed rather than copying the entire
  previous report.

## DR-07 — Product-wide quality gates remain incomplete for mature-system claims

**Severity:** P2 release-readiness risk

The root scripts expose strong lint, type, architecture, contract, determinism,
and test commands. However, open backlog still includes explicit work for:

- 50k-node performance testing: [#158](https://github.com/dunay2/dvt/issues/158);
- large-graph performance budgets: [#188](https://github.com/dunay2/dvt/issues/188);
- keyboard and screen-reader accessibility: [#187](https://github.com/dunay2/dvt/issues/187);
- resilient logs/progress reconnection UX: [#177](https://github.com/dunay2/dvt/issues/177);
- frontend telemetry: [#186](https://github.com/dunay2/dvt/issues/186);
- comprehensive adapter determinism: [#73](https://github.com/dunay2/dvt/issues/73);
- load and chaos testing: [#18](https://github.com/dunay2/dvt/issues/18).

These are not optional polish if DVT is presented as an operational data platform.

### Required response

Add a product-quality baseline with explicit thresholds for:

- API and Web coverage on changed critical rails;
- accessibility regression tests;
- graph rendering and interaction budgets;
- bundle-size budgets;
- reconnect/recovery behavior;
- live dbt revision-bound acceptance;
- deterministic execution replay;
- load and failure recovery.

## DR-08 — Operational scale-out remains deliberately incomplete

**Severity:** P2 production-operability risk

The open outbox work correctly records that horizontal scale-out must wait for a
chosen per-`runId` ordering strategy:

- independent outbox worker epic [#409](https://github.com/dunay2/dvt/issues/409);
- multi-worker strategy [#414](https://github.com/dunay2/dvt/issues/414);
- single-owner canary [#413](https://github.com/dunay2/dvt/issues/413);
- automated canary CI lane [#447](https://github.com/dunay2/dvt/issues/447);
- canary documentation/evidence alignment [#448](https://github.com/dunay2/dvt/issues/448).

The architecture is honest about the gap, which is positive. The risk is product
sequencing: user-facing scale claims must remain blocked until ordering, canary,
rollback, health, metrics, and recovery evidence are complete.

## DR-09 — Issue authority and current-state authority are not the same thing

**Severity:** P2 planning drift

The open issue set includes old backlog stories whose titles no longer accurately
describe current delivered behavior, while newer Planning DB/governance surfaces
encode a more current capability picture.

Examples include old read-only plan-preview and graph-workspace stories remaining
open alongside newer implemented Preview/Run and dbt file-authority work.

### Required response

- define whether GitHub issues or Planning DB owns delivery state;
- mechanically reconcile stale issue labels/status against current capability
  projections;
- close, split, or relabel stories whose original acceptance is already delivered
  or superseded;
- prevent agents from choosing work solely because an old issue remains open.

## Architectural assessment

### Strong foundations to preserve

- file-authoritative dbt project boundary;
- compare-and-swap workspace writes;
- immutable revision/provenance binding for Preview and Run;
- fail-closed explicit execution selection;
- planner graph-source ownership guard;
- migration ordinal and identity integrity;
- migration concurrency serialization;
- deterministic capability evidence and ancestry validation;
- separation between graph-draft and file-authoritative execution strategies.

### Drift to stop

- adding more governance surfaces before closing a user transaction;
- treating generated documentation as product delivery;
- allowing importer, analyzer, workspace explorer, editor, and runner to expose
  different project capability limits;
- using a generic Code action without exposing whether code is authoritative,
  projected, generated, or absent;
- accumulating multiple review PRs as competing planning authorities;
- presenting PR-head green evidence as exact released-tree proof.

## Recommended next route

## Route A — Workspace inventory truth

**Goal:** ensure every accepted dbt project has an honest and operable workspace
inventory.

Implementation order:

1. introduce shared project/workspace limit policy;
2. extend contracts with page/cursor and truncation metadata;
3. implement deterministic API pagination;
4. render incomplete/large-file states explicitly in CodeView;
5. add 501-file and >1 MB fixtures;
6. prove analyzer, graph, file tree, and editor agree on completeness;
7. document the operational limits.

Do this as one focused implementation PR. Avoid Planning DB migration work unless a
real schema/state transition requires it.

## Route B — One lossless dbt YAML edit

**Goal:** deliver the first complete bidirectional authoring transaction.

Recommended first field: model `description` in `schema.yml`.

Implementation order:

1. query projection identifies file path, model identity, YAML location, and
   current revision;
2. command creates a patch proposal without writing;
3. UI shows the exact diff and authoritative path;
4. confirm writes through compare-and-swap;
5. conflict returns current revision and preserves user proposal;
6. successful write triggers re-analysis;
7. graph/inspector refresh from authoritative result;
8. conditional revert is available while the saved revision still matches;
9. Preview and Run use the saved revision;
10. live test reopens project and proves persistence.

## Route C — Authority-honest Code UX

**Goal:** make Code behavior match the node authority model.

- authoritative file → open file;
- deterministic generated preview → show preview with non-persisted badge;
- missing origin → show blocked reason;
- project files → separate project-code workbench;
- never show an empty generic Code tab without explaining the authority state.

## Route D — Release and quality baseline

**Goal:** bind evidence to the shipped tree and establish minimum product quality.

- default-branch or merge-group validation;
- accessibility threshold;
- graph performance threshold;
- bundle threshold;
- changed-critical-rail coverage threshold;
- dbt authoring live acceptance;
- reconnect and recovery acceptance;
- deterministic replay acceptance.

## Route E — Operational scale and recovery

Only after Routes A–D:

- standalone outbox worker;
- single-owner canary;
- automated canary lane;
- rollback proof;
- one ADR-0009 multi-worker strategy;
- concurrent ordering proof;
- load, chaos, and recovery evidence.

## Proposed PR decomposition

### PR 1 — Workspace inventory capability contract

- shared limits;
- pagination/truncation contract;
- API adapter and tests;
- no UI redesign.

### PR 2 — Workspace inventory UX

- paginated tree;
- incomplete inventory banner;
- large-file read-only/download state;
- web and end-to-end tests.

### PR 3 — YAML edit proposal and CAS command

- lossless location/patch model;
- proposal endpoint/port;
- save conflict contract;
- conditional revert support;
- API tests.

### PR 4 — Canvas model-description editor

- inspector field;
- visible diff;
- conflict UI;
- save/revert interaction;
- accessibility tests.

### PR 5 — Re-analysis, Preview/Run, reopen proof

- authoritative refresh;
- exact revision propagation;
- live end-to-end acceptance;
- release evidence entry.

### PR 6 — Authority-honest Code action

- file-backed open behavior;
- generated preview behavior;
- blocked state;
- project-code action;
- UX regression tests.

## Definition of done for the next product milestone

The next milestone is complete only when all statements below are mechanically
true:

- an accepted project cannot be silently larger than the workspace surface;
- the user can see when an inventory is incomplete;
- a model description can be edited visually without lossy YAML rewriting;
- concurrent edits fail with an explicit CAS conflict;
- the user can inspect the exact patch before saving;
- the graph refreshes from the saved authoritative file;
- Preview and Run bind to that saved revision;
- reopening the project preserves the edit;
- the Code action states whether content is authoritative, generated, or absent;
- the released tree has exact validation evidence;
- no new broad governance layer was introduced to deliver the vertical.

## Final decision

DVT should now move from **capability truth about authoring** to **one proven
complete authoring transaction**.

The first implementation PR should fix workspace inventory truth. The immediately
following vertical should deliver the revision-bound `schema.yml` model-description
edit. Everything else is secondary until those two product contradictions are
closed.
