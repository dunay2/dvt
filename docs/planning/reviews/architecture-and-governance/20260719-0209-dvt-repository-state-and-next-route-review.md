---
title: DVT Repository State, Release Blockers, and Next Route Review — 2026-07-19 02:09
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
reviewed_commit: ef8c589b61e0dfe2864975b021149e88716f01aa
supersedes_review_pr: 1989
---

# DVT Repository State, Release Blockers, and Next Route Review — 2026-07-19 02:09

## Executive verdict

`main` remains at
[`ef8c589b61e0dfe2864975b021149e88716f01aa`](https://github.com/dunay2/dvt/commit/ef8c589b61e0dfe2864975b021149e88716f01aa),
the merge commit for
[#1988 — Complete DBT YAML description roundtrip](https://github.com/dunay2/dvt/pull/1988).
No newer product commit was visible at review time.

The repository has crossed an important product boundary: DVT now performs one genuine,
file-authoritative, revision-guarded dbt edit from Canvas. A model description can be proposed
as a focused `schema.yml` diff, conditionally applied, recorded through an immutable receipt,
reanalyzed, conditionally reverted, previewed, run, and reopened from authoritative files.
That is real bidirectional progress and must not be described as still missing.

The implementation is not yet release-ready. The correct next move is stabilization, not a
new broad authoring phase. The release PR
[#1984 — `0.5.0`](https://github.com/dunay2/dvt/pull/1984)
should not be merged in its current state because:

1. Code can report a persisted but semantically invalid dbt edit as `Synchronized`;
2. the unresolved #1983 review defect still exposes raw technical failure detail instead of
   guaranteed localized copy;
3. release notes still count the same execution-selection capability twice;
4. all six workflows on the current release head are `action_required`;
5. the exact merge commit currently published on `main` has no connector-visible workflow run
   or combined status evidence;
6. apply and revert establish one server-side analysis receipt but the browser immediately
   requests another independent dbt analysis;
7. accepted dbt projects can still exceed the workspace listing and editing surface.

The immediate route is therefore:

1. repair localization and semantic reconciliation truth;
2. define durable recovery semantics for persisted-invalid authoring transactions;
3. reuse the exact post-command analysis instead of re-parsing immediately;
4. repair release generation and obtain successful checks on the final release identity;
5. make workspace inventory complete and explicit;
6. extract a reusable file-authoritative transaction kernel;
7. generalize once, narrowly, to a column description.

Do not begin generic SQL AST editing, a new DSL, broad dbt test authoring, scheduling, deployment,
or another governance expansion before those steps are complete.

## Primary instruction to the implementation agent

Create one focused stabilization PR before attempting another feature vertical.

Required order:

1. replace arbitrary visible selection-recovery `detail` with stable localized failure codes;
2. make Code reconciliation return a typed semantic result rather than `Promise<void>`;
3. distinguish `content persisted` from `fresh dbt analysis established`;
4. add invalid-SQL persistence and recovery proof;
5. choose and document the description transaction policy for invalid or unavailable analysis;
6. expose durable server-backed recovery if invalid content is retained;
7. remove or content-addressedly reuse the second dbt parse after apply and revert;
8. deduplicate release notes and make release checks execute successfully;
9. attach validation to the exact commit that will be tagged;
10. close superseded review PRs when authorized so only one current review remains open.

## Delta since the previous repository review

The previous current-state report is
[#1989](https://github.com/dunay2/dvt/pull/1989), based on the same `main` commit.
There is no new product-code delta since that report.

The meaningful changes are operational:

- #1989 has now completed its applicable documentation checks;
- `PR Quality Gate` and `CI - Code Quality` succeeded;
- `Test Suite`, `Contracts & Determinism`, `CodeQL`, and `Dependency Review` were skipped for the
  documentation-only change;
- #1989 remains open, draft, mergeable, one commit ahead, and zero commits behind `main`;
- release #1984 remains unchanged in decision terms: open, non-draft, mergeable, but not
  releasable;
- its six current workflow runs remain `action_required`;
- the unresolved #1983 product thread still matches current source;
- no visible functional implementation PR has appeared.

This report therefore consolidates the current authority rather than inventing a false product
delta. It supersedes #1989 as the current handoff document.

## Review scope and evidence limits

This review inspected through the GitHub connector:

- repository metadata and default branch;
- current `main` identity and recent commits;
- merged product PR #1988;
- open release PR #1984;
- all visible open user-authored PRs;
- PR-head and exact-main CI visibility;
- review discussions on #1983, #1984, #1988, and #1989;
- current source for Code persistence and reconciliation;
- current dbt analyzer failure semantics;
- current description apply orchestration;
- current selection-recovery failure rendering;
- current importer and workspace file limits;
- current receipt storage behavior;
- divergence of visible review and release branches from `main`.

No repository code or test suite was executed locally. Runtime conclusions are based on committed
control flow, tests, pull-request metadata, and GitHub Actions evidence.

The branch-search connector returned no usable branch inventory for `agent`, `dbt`, or `feat`
queries. Relevant unmerged branch work is therefore reconstructed from pull-request heads and
commit comparison. This report does not claim that an unindexed branch does not exist.

## Current repository snapshot

| Signal | Observed state |
| --- | --- |
| Repository | [`dunay2/dvt`](https://github.com/dunay2/dvt) |
| Default branch | `main` |
| Current `main` | [`ef8c589b`](https://github.com/dunay2/dvt/commit/ef8c589b61e0dfe2864975b021149e88716f01aa) |
| Commit time | 2026-07-18 17:36:42 UTC |
| Package version on `main` | `0.4.0` |
| Latest merged product PR | [#1988](https://github.com/dunay2/dvt/pull/1988) |
| Latest delivered capability | File-authoritative dbt YAML model-description roundtrip |
| Open release PR | [#1984](https://github.com/dunay2/dvt/pull/1984), proposed `0.5.0` |
| Release head | `7b8aa6ab215249819536fc79641bb6c6956d9ee4` |
| Release branch divergence | One commit ahead, zero behind `main` |
| Open review PRs before this report | #1981, #1982, #1985, #1986, #1987, #1989 |
| Visible open functional implementation PRs | None |
| Exact-main workflow runs returned | None |
| Exact-main combined statuses returned | None |
| Active unresolved product review thread | One on merged #1983 |
| #1988 review finding | Addressed by later commits and reply |
| Current release-head workflows | Six `action_required` |

`package.json` still declares `0.4.0`:

- [`package.json`](https://github.com/dunay2/dvt/blob/ef8c589b61e0dfe2864975b021149e88716f01aa/package.json#L1-L8)

## Recent commit assessment

The latest visible commit sequence is the tail of #1988 and its merge:

- [`ef8c589b`](https://github.com/dunay2/dvt/commit/ef8c589b61e0dfe2864975b021149e88716f01aa) — merge #1988;
- [`aa972631`](https://github.com/dunay2/dvt/commit/aa972631ff1019c514a36a3644c61bc28c0bc96c) — keep scalar projection local;
- [`3441fe22`](https://github.com/dunay2/dvt/commit/3441fe2210080c3eadeb309a07270f8df4a12a38) — preserve empty dbt descriptions;
- [`d340e3eb`](https://github.com/dunay2/dvt/commit/d340e3ebae8ccbd1586fa32d66033c945af4dcb8) — complete workspace file rail mechanization;
- [`15952c4c`](https://github.com/dunay2/dvt/commit/15952c4c1d5843cce90d61a073c5c86d573348e3) — make workspace file rails bootstrap-safe.

There is no later product commit to assess. The current analysis therefore remains anchored to
#1988 and the release branch generated from it.

## What #1988 genuinely delivers

PR #1988 is substantial:

- 49 commits;
- 154 changed files;
- 13,100 additions;
- 645 deletions;
- ten sequential Planning DB migrations, 736 through 745;
- shared proposal, applied-receipt, and reverted-receipt contracts;
- content-addressed compare-and-swap writes;
- focused YAML CST mutation rather than whole-file serialization;
- immutable server-owned receipts;
- root-package resource and path authorization;
- contextual Canvas and Code workbenches;
- reanalysis after file changes;
- a protected live apply/revert/Preview/Temporal Run/reopen proof.

Evidence:

- [PR #1988](https://github.com/dunay2/dvt/pull/1988)
- [merge commit](https://github.com/dunay2/dvt/commit/ef8c589b61e0dfe2864975b021149e88716f01aa)
- [shared transaction contract](https://github.com/dunay2/dvt/blob/ef8c589b61e0dfe2864975b021149e88716f01aa/packages/%40dvt/contracts/src/contracts/dbt-project/DbtYamlDescriptionEdit.v1.ts)
- [lossless YAML mutator](https://github.com/dunay2/dvt/blob/ef8c589b61e0dfe2864975b021149e88716f01aa/apps/api/src/infrastructure/dbtYamlDescriptionEdit/YamlCstDbtDescriptionMutator.ts)
- [apply command](https://github.com/dunay2/dvt/blob/ef8c589b61e0dfe2864975b021149e88716f01aa/apps/api/src/application/services/dbtYamlDescriptionEdit/ApplyDbtYamlDescriptionEditCommand.ts)
- [revert command](https://github.com/dunay2/dvt/blob/ef8c589b61e0dfe2864975b021149e88716f01aa/apps/api/src/application/services/dbtYamlDescriptionEdit/RevertDbtYamlDescriptionEditCommand.ts)
- [protected live vertical](https://github.com/dunay2/dvt/blob/ef8c589b61e0dfe2864975b021149e88716f01aa/apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts)

This is the first complete proof that the graph and dbt source files can participate in one
controlled, reviewable authoring transaction without introducing a replacement language.

## CI assessment

### #1988 feature-head CI

The final #1988 head
[`aa972631ff1019c514a36a3644c61bc28c0bc96c`](https://github.com/dunay2/dvt/commit/aa972631ff1019c514a36a3644c61bc28c0bc96c)
has six successful observed workflows:

| Workflow | Result | Run |
| --- | --- | --- |
| Test Suite | success | [29653994170](https://github.com/dunay2/dvt/actions/runs/29653994170) |
| CI - Code Quality | success | [29653994145](https://github.com/dunay2/dvt/actions/runs/29653994145) |
| PR Quality Gate | success | [29653994156](https://github.com/dunay2/dvt/actions/runs/29653994156) |
| Contracts & Determinism | success | [29653994140](https://github.com/dunay2/dvt/actions/runs/29653994140) |
| CodeQL | success | [29653994171](https://github.com/dunay2/dvt/actions/runs/29653994171) |
| Dependency Review | success | [29653994177](https://github.com/dunay2/dvt/actions/runs/29653994177) |

This is strong feature-head evidence.

### Exact-main CI identity gap

For exact `main@ef8c589b61e0dfe2864975b021149e88716f01aa`, the connector returns:

- no pull-request workflow runs;
- no combined status entries.

The green #1988 head and the published merge commit are different Git identities. The feature
may be valid, but the exact published tree does not currently carry machine-readable evidence
through the inspected interfaces.

Required correction:

- validate the exact commit intended for tag and publication;
- record its tree or artifact digest;
- ensure release evidence names the exact tag target;
- avoid claiming exact-main CI from PR-head checks alone.

### #1989 documentation CI

The previous review PR now has complete appropriate checks:

| Workflow | Result |
| --- | --- |
| PR Quality Gate | success |
| CI - Code Quality | success |
| Test Suite | skipped |
| Contracts & Determinism | skipped |
| CodeQL | skipped |
| Dependency Review | skipped |

This confirms that #1989 is a clean documentation-only review. It does not resolve any runtime
or release blocker.

### #1984 release-head CI

On release head
[`7b8aa6ab215249819536fc79641bb6c6956d9ee4`](https://github.com/dunay2/dvt/commit/7b8aa6ab215249819536fc79641bb6c6956d9ee4):

| Workflow | Result | Run |
| --- | --- | --- |
| Test Suite | `action_required` | [29654268937](https://github.com/dunay2/dvt/actions/runs/29654268937) |
| CI - Code Quality | `action_required` | [29654268952](https://github.com/dunay2/dvt/actions/runs/29654268952) |
| PR Quality Gate | `action_required` | [29654268921](https://github.com/dunay2/dvt/actions/runs/29654268921) |
| Contracts & Determinism | `action_required` | [29654268922](https://github.com/dunay2/dvt/actions/runs/29654268922) |
| CodeQL | `action_required` | [29654268930](https://github.com/dunay2/dvt/actions/runs/29654268930) |
| Dependency Review | `action_required` | [29654268975](https://github.com/dunay2/dvt/actions/runs/29654268975) |

This is not a successful release candidate. Do not reinterpret `action_required` as green or
as an ignorable documentation skip.

## Review-thread assessment

### Merged #1983 — active unresolved defect

[#1983](https://github.com/dunay2/dvt/pull/1983) has one P2 inline finding:

- [Route refresh failures through localized copy](https://github.com/dunay2/dvt/pull/1983#discussion_r3605652614)

There is no reply or fix commit attached to the thread. Current source still renders:

```tsx
{model.failure.detail ?? messages.selectionRecoveryRefreshFailureMessage}
```

Evidence:

- [`OperationalDrawerSelectionRecoveryView.tsx`](https://github.com/dunay2/dvt/blob/ef8c589b61e0dfe2864975b021149e88716f01aa/apps/web/src/app/components/shell/OperationalDrawerSelectionRecoveryView.tsx#L116-L119)

A non-empty transport, authorization, repository, or parser `Error.message` therefore overrides
the localized catalog. Spanish users can receive English technical text, and internal detail can
be exposed in a user-facing operational drawer.

The thread must remain treated as unresolved until code and regression tests exist.

### Merged #1988 — finding addressed

#1988 received one P2 finding about preserving empty and whitespace-only dbt descriptions:

- [Preserve empty DBT descriptions in the projection](https://github.com/dunay2/dvt/pull/1988#discussion_r3608638374)

The branch added commits
[`3441fe22`](https://github.com/dunay2/dvt/commit/3441fe2210080c3eadeb309a07270f8df4a12a38)
and
[`aa972631`](https://github.com/dunay2/dvt/commit/aa972631ff1019c514a36a3644c61bc28c0bc96c),
plus a reply documenting focused API and Web regression coverage. The finding no longer reflects
the final implementation.

### Release #1984

No PR conversation comment, inline review comment, or submitted review was returned for #1984.
Review remains requested from `dunay2`. Mergeability is not equivalent to approval or release
readiness.

## Confirmed bug BUG-01 — Code reports invalid dbt analysis as synchronized

### Current control flow

The Code synchronization hook persists a file, invokes `onFileSynchronized`, and dispatches
`reconciliation_succeeded` whenever that callback resolves:

- [`useCodeWorkingTreeSync.ts`](https://github.com/dunay2/dvt/blob/ef8c589b61e0dfe2864975b021149e88716f01aa/apps/web/src/app/views/code/useCodeWorkingTreeSync.ts#L97-L139)

The reducer then changes `reconciling` to `synchronized` when the persisted content still matches
the editor value:

- [`codeWorkingTreeSyncModel.ts`](https://github.com/dunay2/dvt/blob/ef8c589b61e0dfe2864975b021149e88716f01aa/apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts#L96-L111)

The dbt Canvas controller considers refresh successful whenever the query returns data. It does
not inspect semantic freshness, diagnostics, or execution readiness:

- [`useDbtProjectFileCanvasController.ts`](https://github.com/dunay2/dvt/blob/ef8c589b61e0dfe2864975b021149e88716f01aa/apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts#L240-L263)

The analyzer treats a non-zero `dbt parse` exit as a normal analysis result with status `invalid`,
empty resources, and diagnostics rather than throwing:

- [`DbtCliProjectAnalyzer.ts`](https://github.com/dunay2/dvt/blob/ef8c589b61e0dfe2864975b021149e88716f01aa/apps/api/src/infrastructure/dbt/DbtCliProjectAnalyzer.ts#L188-L220)
- [`DbtCliProjectAnalyzer.ts`](https://github.com/dunay2/dvt/blob/ef8c589b61e0dfe2864975b021149e88716f01aa/apps/api/src/infrastructure/dbt/DbtCliProjectAnalyzer.ts#L282-L300)

A user can therefore observe this sequence:

1. invalid SQL is saved successfully;
2. dbt parse returns `invalid` as a normal projection;
3. query refetch resolves successfully;
4. the Code hook dispatches `reconciliation_succeeded`;
5. Code displays `Synchronized`;
6. the graph can be empty and Preview/Run blocked because analysis is invalid.

The product reports persistence truth and semantic truth as though they were the same state.

### Required model

Return a typed reconciliation result:

```ts
type DbtCodeReconciliationOutcome =
  | Readonly<{
      kind: 'fresh';
      analysisSha256: string;
      projectContentSetSha256: string;
    }>
  | Readonly<{
      kind: 'degraded';
      freshness: 'stale-last-valid' | 'invalid' | 'unavailable';
      diagnostics: readonly DbtDiagnostic[];
    }>;
```

The working-tree state machine should distinguish:

- `modified`;
- `persisting`;
- `persisted_reconciling`;
- `synchronized_fresh`;
- `persisted_invalid`;
- `persisted_analyzer_unavailable`;
- `persisted_stale_last_valid`;
- `revision_conflict`;
- `persistence_failed`.

Do not label a persisted-invalid edit `Synchronized`.

### Required proof

Add:

- controller test where refresh returns `freshness: invalid`;
- hook test where reconciliation returns a degraded outcome;
- UI test for `Persisted, analysis invalid`;
- protected integration or E2E proof that writes invalid SQL, observes the degraded state,
  recovers, and returns to a fresh graph;
- proof that Preview and Run remain bound to the fresh recovered revision.

## Confirmed bug BUG-02 — recovery failure bypasses localization

Current source prioritizes arbitrary failure detail:

```tsx
{model.failure.detail ?? messages.selectionRecoveryRefreshFailureMessage}
```

Required correction:

- replace visible arbitrary detail with a stable failure code;
- resolve user copy from the canonical English/Spanish catalog;
- retain sanitized diagnostics only in logs or a developer-only surface;
- test Spanish locale with a non-empty technical error;
- reply to and resolve the #1983 thread only after the fix is present.

Severity is P1 for release even though the original review badge was P2, because the defect is a
confirmed user-facing localization and diagnostic-boundary regression on merged code.

## Release blocker REL-01 — duplicate and topology-oriented `0.5.0` notes

#1984 includes both:

- `Add explicit DBT execution selection recovery` at merge commit `ec47025`;
- `Add explicit DBT execution selection recovery` at parent commit `fa240f8`.

That is one semantic capability counted twice.

The YAML description feature is also represented by its aggregate merge title plus multiple
component-level feature commits. Conventional Commit provenance is useful, but the release note
is currently optimized for commit topology rather than product value.

Required release-note model:

- one product summary per merged feature PR;
- normalized `type + scope + semantic title` identity;
- collapse merge-parent duplicates;
- keep commit-level provenance in an engineering details section;
- fail release CI when normalized duplicate entries exist;
- add a fixture covering a merge commit plus a conventional parent with the same subject.

## Release blocker REL-02 — release workflows are not successful

All six release-head workflows are `action_required`. The PR is mergeable according to GitHub,
but mergeability only describes branch mechanics. It does not satisfy quality, security,
contracts, or release policy.

Exit criteria:

- identify why the workflows require action;
- execute them on the final release head;
- require success for applicable checks;
- review the actual three-file release diff;
- verify `.release-please-manifest.json`, `CHANGELOG.md`, and `package.json` agree;
- verify tag, package, and release version all target the same commit;
- record exact-tag validation evidence.

## Transaction gap TX-01 — persisted-invalid description recovery is not durable enough

The apply command writes candidate content first and then executes project analysis:

- [`ApplyDbtYamlDescriptionEditCommand.ts`](https://github.com/dunay2/dvt/blob/ef8c589b61e0dfe2864975b021149e88716f01aa/apps/api/src/application/services/dbtYamlDescriptionEdit/ApplyDbtYamlDescriptionEditCommand.ts#L96-L143)

The receipt can represent `fresh`, `stale-last-valid`, `invalid`, or `unavailable`. The command
does not automatically restore the previous content when analysis is degraded.

That can be a valid product choice, but it must be explicit.

### Policy A — validity-atomic

- apply candidate content;
- analyze;
- if analysis is not fresh, compare-and-swap back to the previous content;
- return an apply-and-rollback receipt;
- if rollback conflicts, return a critical recoverable state.

### Policy B — persistence-atomic and semantically recoverable

- retain candidate content;
- return a degraded receipt;
- block Preview and Run;
- expose durable recovery after browser reopen;
- show author, timestamp, path, old revision, new revision, and analysis diagnostics;
- allow conditional revert against the exact applied revision.

Current behavior is closer to Policy B, but the inspected query surface does not demonstrate a
server-backed `GetRecoverableDbtYamlDescriptionEdits` rail. The server stores receipts, while the
primary Revert affordance is driven by the editor's current `appliedReceipt` state.

Required decision: choose A or B before release. If B remains, prove recovery after a fresh browser
session and after another user attempts an intervening write.

## Performance and authority gap PERF-01 — duplicate dbt analysis

The API apply command already calls the project graph use case and records its analysis identity
in the receipt.

After the API returns, the browser calls `onProjectChanged`:

- [`useDbtYamlDescriptionEditor.ts`](https://github.com/dunay2/dvt/blob/ef8c589b61e0dfe2864975b021149e88716f01aa/apps/web/src/app/components/dbtYamlDescriptionEditor/useDbtYamlDescriptionEditor.ts#L184-L222)

The revert path repeats the same pattern:

- [`useDbtYamlDescriptionEditor.ts`](https://github.com/dunay2/dvt/blob/ef8c589b61e0dfe2864975b021149e88716f01aa/apps/web/src/app/components/dbtYamlDescriptionEditor/useDbtYamlDescriptionEditor.ts#L224-L255)

The browser refetches the graph, which can invoke another fresh `dbt parse`. One user operation can
therefore establish two different analysis identities:

1. the analysis embedded in the authoritative transaction receipt;
2. the later opportunistic analysis displayed by the client.

This wastes latency and CPU and can split transaction truth from screen truth if another writer
changes the workspace between the two analyses.

Preferred correction:

1. return the authoritative graph projection in the apply/revert response and seed the client
   query cache; or
2. return an analysis identity and retrieve that exact content-addressed result; or
3. add a cache keyed by project content-set SHA, analyzer version, dbt version, adapter, profile,
   and relevant execution environment.

Preview, Run, UI receipts, and graph rendering should initially use the analysis identity created
by the transaction. A later refresh must be explicit and identified as a newer revision.

## Product gap FILE-01 — accepted projects exceed the workspace surface

The dbt importer defaults to:

```text
maxProjectFiles       10,000
maxInspectedFiles    100,000
maxProjectBytes   50,000,000
maxDirectories         5,000
maxDepth                   64
```

Evidence:

- [`LocalDbtProjectImportInspector.ts`](https://github.com/dunay2/dvt/blob/ef8c589b61e0dfe2864975b021149e88716f01aa/apps/api/src/infrastructure/dbt/LocalDbtProjectImportInspector.ts#L56-L74)

The workspace repository defaults to:

```text
MAX_LISTED_FILES       500
MAX_FILE_BYTES     1,000,000
```

Evidence:

- [`LocalWorkspaceFileRepository.ts`](https://github.com/dunay2/dvt/blob/ef8c589b61e0dfe2864975b021149e88716f01aa/apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts#L49-L75)

Listing stops at 500 without a cursor, truncation flag, omitted count, total, or effective-limit
metadata:

- [`LocalWorkspaceFileRepository.ts`](https://github.com/dunay2/dvt/blob/ef8c589b61e0dfe2864975b021149e88716f01aa/apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts#L161-L207)

A file above 1 MB is reported as `InvalidWorkspacePathError`, even when the path itself is valid.
The description proposal also carries complete candidate content and is bounded by the interactive
file limit.

A project can therefore be accepted and analyzed while:

- files after the first 500 are absent from the explorer;
- the UI does not know the inventory is partial;
- a valid authoritative schema file cannot be opened or edited;
- users cannot distinguish invalid path from oversized content;
- Canvas, Code, and analysis can operate with different completeness assumptions.

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

Acceptance criteria:

- deterministic stable paging;
- no silent omission;
- explicit partial inventory state in API and UI;
- a distinct oversized-file result;
- shared policy authority for import, analysis, explorer, Code, and authoring;
- 501-file, near-10,000-file, and above-1-MB tests;
- deliberate read-only or streamed behavior for oversized source files.

## Operability gap OPS-01 — receipt storage has no visible lifecycle policy

The receipt store writes one immutable JSON file per operation under:

```text
.dvt/dbt-yaml-description-receipts/applied/<receipt-id>.json
.dvt/dbt-yaml-description-receipts/reverted/<receipt-id>.json
```

The inspected component exposes find-by-ID and save operations only:

- [`WorkspaceMetadataDbtYamlDescriptionReceiptStore.ts`](https://github.com/dunay2/dvt/blob/ef8c589b61e0dfe2864975b021149e88716f01aa/apps/api/src/infrastructure/dbtYamlDescriptionEdit/WorkspaceMetadataDbtYamlDescriptionReceiptStore.ts)

No index, recent-recovery query, retention, compaction, archival, quota, or garbage-collection
policy is visible in this component.

Required policy:

- decide whether receipts are audit evidence, transient recovery records, or both;
- index by tenant, workspace, canvas, resource, path, and creation time;
- expose latest applicable recovery receipts;
- define retention and legal/audit requirements;
- enforce quotas without silently deleting required evidence;
- archive or compact superseded receipts;
- monitor receipt count and bytes per workspace.

## Test gaps

The protected roundtrip test proves one valid, small-project happy path. It does not prove:

- invalid SQL persistence and recovery;
- invalid or unavailable post-description analysis;
- concurrent revision conflict through the protected UI;
- durable recovery after browser reopen;
- another writer changing the project between command analysis and client refresh;
- more than 500 files;
- an authoritative schema file above 1 MB;
- flow-style structural description insertion or deletion;
- receipt retention and lookup at operational scale;
- exact release-tag validation.

The next test work should target failure semantics rather than add another valid happy-path demo.

## Architectural drift

### AD-01 — change amplification remains excessive

One bounded model-description vertical changed 154 files and added ten sequential Planning DB
migrations. Some breadth is justified by contracts, tests, evidence, and UI integration. The total
still shows that capability, ownership, evidence, copy, registry, and mechanization facts are
spread across too many independent authorities.

Recommended direction:

- declare feature ownership and capability metadata once;
- generate registries, documentation indexes, and mechanization views from canonical data;
- separate runtime correctness gates from descriptive planning completeness;
- establish a change-amplification budget per user story;
- require an architecture note when a bounded transaction changes more than an agreed number of
  authorities or migrations;
- batch coherent Planning DB state during an unmerged feature branch;
- measure the next vertical against #1988 and require a materially smaller surface.

### AD-02 — analysis authority is duplicated

The command receipt establishes one analysis revision while the browser immediately obtains
another. This creates two candidates for post-transaction truth.

Recommended direction:

- make the command result authoritative for the completed transaction;
- propagate one analysis identity through cache, Canvas, Preview, Run, and receipt UI;
- label any later refresh as a newer revision;
- never silently replace transaction evidence with an opportunistic analysis.

### AD-03 — release generation exposes repository topology

The release model publishes merge commits, feature parents, and component commits as independent
product changes. The result is duplicate and implementation-heavy.

Recommended direction:

- product summary per merged PR;
- normalized duplicate detection;
- detailed engineering provenance underneath the product summary;
- automated release-note fixtures for merge-parent topology.

### AD-04 — review documents are a competing work queue

Before this report, six documentation-only review PRs were open:

- #1981 and #1982 review `main@4c98026`;
- #1985, #1986, and #1987 review `main@ec47025`;
- #1989 reviews current `main@ef8c589`;
- #1987 is one documentation commit ahead and 50 product commits behind current `main`;
- #1989 is one documentation commit ahead and zero behind current `main`.

The older five are stale as current implementation authority. #1989 is current but is superseded
by this report. Leaving every generated review open makes the other GPT choose among competing
instructions.

Governance rule:

> Keep one open current-state review PR. Close superseded review PRs and link to the replacement.
> Preserve closed reports as historical evidence, not concurrent implementation authority.

The scheduled review should produce a short delta when no product code changed. It should not
create the impression of progress by repeatedly expanding the same findings.

## Open pull-request assessment

| PR | State | Scope | Decision |
| --- | --- | --- | --- |
| [#1984](https://github.com/dunay2/dvt/pull/1984) | Open, non-draft, mergeable | Release `0.5.0` | Block until defects, notes, and CI are repaired |
| [#1989](https://github.com/dunay2/dvt/pull/1989) | Open draft, mergeable | Current review of `ef8c589` | Superseded by this report; close when authorized |
| [#1987](https://github.com/dunay2/dvt/pull/1987) | Open draft, mergeable | Review of `ec47025` | Stale; close as superseded |
| [#1986](https://github.com/dunay2/dvt/pull/1986) | Open draft, mergeable | Review of `ec47025` | Stale; close as superseded |
| [#1985](https://github.com/dunay2/dvt/pull/1985) | Open draft, mergeable | Review of `ec47025` | Stale; close as superseded |
| [#1982](https://github.com/dunay2/dvt/pull/1982) | Open draft, mergeable | Review of `4c98026` | Stale; close as superseded |
| [#1981](https://github.com/dunay2/dvt/pull/1981) | Open draft, mergeable | Review of `4c98026` | Stale; close as superseded |

No visible open functional implementation PR exists. The release branch is the only visible
unmerged non-review work.

## Findings register

| ID | Severity | Finding | State |
| --- | --- | --- | --- |
| BUG-01 | P1 | Code marks HTTP-successful invalid/unavailable dbt analysis as synchronized | Confirmed by current control flow |
| BUG-02 | P1 release | Raw selection-recovery detail overrides localized copy | Confirmed on `main`; #1983 thread unresolved |
| REL-01 | P1 release | `0.5.0` duplicates execution-selection recovery | Confirmed in #1984 |
| REL-02 | P1 release | Six release workflows are `action_required` | Confirmed on release head |
| TX-01 | P1 | Persisted-invalid description recovery is not proven durable after reopen | Confirmed design gap |
| PERF-01 | P1 | Apply/revert trigger a second immediate dbt analysis | Confirmed by API and client orchestration |
| FILE-01 | P1 product | Accepted projects can exceed workspace listing and editing limits | Confirmed on `main` |
| EVID-01 | P2 | Exact `main` merge SHA has no connector-visible CI/status evidence | Confirmed evidence gap |
| OPS-01 | P2 | Immutable receipt files have no visible index or lifecycle policy | Confirmed component limitation |
| ARCH-01 | P2 | One vertical spans 154 files and ten Planning DB migrations | Confirmed by #1988 |
| GOV-01 | P2 | Six superseded/current review PRs remain open before this report | Confirmed |
| TEST-01 | P2 | Protected proof omits invalid, conflict, oversized, and durable recovery paths | Confirmed from test scope |

## Recommended next route

### Phase 0 — stabilization and truthful `0.5.0`

Target: one focused implementation PR followed by a corrected release PR.

Exit criteria:

- selection-recovery failures always use localized stable copy;
- #1983 thread is replied to and resolved;
- Code distinguishes persistence from fresh semantic reconciliation;
- invalid SQL protected proof exists;
- description invalid-analysis policy is explicit and tested;
- degraded recovery survives browser reopen when invalid content is retained;
- duplicate dbt analysis is removed or reused by exact identity;
- release notes contain no normalized duplicates;
- all applicable release checks succeed;
- the exact tagged commit has machine-readable evidence;
- `0.5.0` communicates one coherent user feature: the first file-authoritative dbt authoring
  roundtrip.

### Phase 1 — workspace capability truth

Target: one shared file capability policy and paginated inventory.

Exit criteria:

- no silent 500-file truncation;
- completeness visible in API and UI;
- oversized files use a correct status/error type;
- 501+, near-10,000, and above-1-MB cases are proven;
- importer, analyzer, explorer, Code, and authoring transactions share one policy authority.

### Phase 2 — reusable file-authoritative transaction kernel

Extract or formalize reusable components for:

- resource and path provenance;
- proposal construction;
- focused diff;
- content-addressed compare-and-swap;
- idempotency;
- apply and revert receipts;
- semantic analysis outcome;
- validity-atomic or recoverable-invalid policy;
- exact analysis propagation;
- durable recovery discovery;
- telemetry, retention, and audit lifecycle.

Exit criteria:

- the next semantic operation does not duplicate the entire model-description stack;
- one canonical transaction state machine is shared or deliberately specialized at explicit
  boundaries;
- change amplification is materially lower than #1988;
- no parallel receipt, reconciliation, or cache authority appears.

### Phase 3 — one adjacent semantic vertical

Recommended vertical: edit a column description in `schema.yml`.

Why:

- reuses the same authoritative YAML document;
- adds real graph value without generic SQL parsing;
- exercises nested resource identity and YAML path provenance;
- tests whether the transaction kernel generalizes;
- carries lower semantic risk than generic tests or SQL AST authoring.

Acceptance criteria:

- select a model column from Canvas;
- display exact source file and nested YAML path;
- propose a focused diff;
- conditional apply and conflict handling;
- explicit invalid-analysis policy;
- durable recovery;
- exact fresh analysis identity;
- graph refresh, Preview, and Run bound to that identity;
- reopen from files;
- unrelated YAML remains byte-stable;
- no new parallel transaction framework.

### Phase 4 — controlled graph/code expansion

Only after Phases 0–3:

1. restricted column-test operations;
2. model configuration such as materialization where dbt semantics are unambiguous;
3. SQL authoring with persisted/fresh/degraded/reverted revision semantics;
4. visual SQL construction only after a lossless AST roundtrip strategy exists.

Do not create a new general-purpose DSL merely to make the graph editable. Keep dbt files as
semantic authority and implement controlled visual operations that compile to focused, reviewable
file patches.

## Proposed implementation PR decomposition

### PR A — `fix/web-dbt-reconciliation-truth`

- localize selection-recovery failures;
- typed dbt Code reconciliation outcome;
- persisted-invalid/unavailable/stale states;
- conditional recovery action;
- invalid SQL unit, integration, and protected proof;
- resolve #1983 thread.

### PR B — `refactor/dbt-authoring-analysis-reuse`

- return or reuse the exact post-transaction graph projection;
- remove immediate duplicate parse;
- bind query cache, Canvas, Preview, Run, and receipts to one analysis identity;
- add concurrency proof.

### PR C — `fix/workspace-file-inventory-completeness`

- paginated inventory contract;
- shared capability policy;
- correct oversized-file result;
- API and UI completeness posture;
- large-project tests.

### PR D — `refactor/dbt-authoring-transaction-kernel`

- reusable proposal/apply/revert/recovery abstractions;
- receipt lookup and lifecycle policy;
- canonical transaction state machine;
- reduce registration and Planning DB duplication;
- no new user-facing semantic operation.

### PR E — `feat/dbt-column-description-roundtrip`

- first consumer of the extracted kernel;
- strict scope limited to column descriptions;
- full protected apply/conflict/recovery/Preview/Run/reopen proof.

## Explicit non-goals for the next cycle

Do not prioritize:

- another broad governance phase;
- generic workflow scheduling UI;
- deployment management;
- multi-engine SQL abstraction;
- mass YAML refactoring;
- generic dbt test authoring;
- SQL AST visual editing;
- a new DSL;
- release-note cosmetics without release CI repair;
- additional current-state review PRs without closing superseded authorities.

## Release decision

**Do not merge #1984 in its current state.**

Do not discard #1988. The feature is substantial and should ship after focused hardening.
A truthful `0.5.0` should include:

- the completed YAML model-description roundtrip;
- repaired recovery localization;
- truthful Code reconciliation;
- an explicit invalid-analysis transaction policy;
- successful release checks;
- deduplicated product-oriented notes;
- exact-tag validation evidence.

Workspace inventory can follow in `0.5.x` only if current limits are made explicit in the release.
It remains P1 before claiming broad large-project authoring readiness.

## Handoff checklist for the next agent

- [ ] Read #1988 and its resolved review discussion before changing the transaction.
- [ ] Reproduce invalid-SQL synchronization in a focused test.
- [ ] Fix the current #1983 localization defect.
- [ ] Decide validity-atomic versus recoverable-invalid description semantics.
- [ ] Prove durable recovery after browser reopen if invalid content is retained.
- [ ] Remove or reuse the duplicate post-command analysis.
- [ ] Keep file revisions, analysis revisions, and plan revisions distinct.
- [ ] Do not merge #1984 while checks remain `action_required`.
- [ ] Deduplicate semantic release entries.
- [ ] Validate the exact commit that will be tagged.
- [ ] Close #1981, #1982, #1985, #1986, #1987, and #1989 as superseded when authorized.
- [ ] Implement workspace inventory truth before broadening project-size claims.
- [ ] Extract transaction reuse before the next YAML operation.
- [ ] Use column description as the next narrow generalization proof.

## Final assessment

DVT is no longer merely planning bidirectional dbt authoring. It now performs one real,
reviewable, revision-guarded file-authoritative edit and proves the valid path through Preview,
Run, and reopen.

The immediate risk is declaring the architecture complete because the happy path works. Current
source still conflates persisted Code with valid semantic reconciliation, requests duplicate
analysis, retains an unresolved localization leak, lacks durable invalid-transaction recovery
proof, cannot truthfully represent large accepted projects in the workspace surface, and remains
expensive to change.

The right route is stabilization and truthful release, followed by workspace inventory truth,
transaction-kernel extraction, and exactly one adjacent nested YAML operation. Broader visual SQL
or platform expansion should wait until that sequence proves lower change amplification and exact
revision authority end to end.
