---
title: DVT Repository State, Roundtrip Hardening, and Next Route Review — 2026-07-18 20:09
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
reviewed_commit: ef8c589b61e0dfe2864975b021149e88716f01aa
supersedes_review_pr: 1987
---

# DVT Repository State, Roundtrip Hardening, and Next Route Review — 2026-07-18 20:09

## Executive verdict

`main` has materially advanced since the previous review. It now points to
[`ef8c589b61e0dfe2864975b021149e88716f01aa`](https://github.com/dunay2/dvt/commit/ef8c589b61e0dfe2864975b021149e88716f01aa),
the merge commit for
[#1988 — Complete DBT YAML description roundtrip](https://github.com/dunay2/dvt/pull/1988).
The implementation closes the largest previously documented product gap: DVT now has one
real file-authoritative Canvas edit that proposes a focused `schema.yml` diff, applies it
with a content revision guard, records an immutable receipt, re-analyzes dbt, supports a
conditional manual revert, and proves Preview, Run, and reopen through a protected live
Cypress vertical.

That is genuine product progress. The route should no longer describe dbt YAML description
editing as missing.

The repository is nevertheless not ready to merge release
[#1984 — `0.5.0`](https://github.com/dunay2/dvt/pull/1984). Four release-blocking or
release-significant defects remain:

1. the unresolved #1983 recovery thread still reflects current code: raw technical
   `Error.message` detail overrides localized user copy;
2. Code reconciliation treats an HTTP-successful but semantically invalid dbt analysis as
   synchronization success;
3. release notes still duplicate the execution-selection feature by counting both a merge
   commit and its parent;
4. all six workflows on the current release head finish as `action_required`, while the
   exact merge commit on `main` has no connector-visible workflow run or combined status.

Two structural gaps also remain unchanged:

- the importer/analyzer accepts projects much larger than the workspace explorer can list
  or edit;
- the repository paid 49 commits, 154 files, 13,100 additions, 645 deletions, and ten
  Planning DB migrations for one bounded authoring vertical, confirming severe change
  amplification.

The recommended route is therefore:

1. harden and release the completed description roundtrip;
2. make Code reconciliation semantically truthful and remove duplicate dbt analysis;
3. make workspace inventory complete and explicit;
4. extract a reusable file-authoritative authoring transaction kernel;
5. use that kernel for one adjacent vertical, preferably a column description, before
   attempting SQL AST editing, test authoring, scheduling, deployment, or broader platform
   expansion.

## Primary instruction to the implementation agent

Do not start another broad authoring phase and do not merge release #1984 as it stands.
Create a focused stabilization PR with this order of work:

1. localize and sanitize execution-selection refresh failures;
2. fail Code reconciliation when the refreshed dbt projection is `invalid`, `unavailable`,
   or `stale-last-valid` unless that degraded state is explicitly accepted by policy;
3. add protected or integration proof for an invalid SQL edit and its recovery path;
4. define the description-transaction policy for invalid post-write analysis: automatic
   conditional rollback or explicit retained-invalid state with a durable recovery action;
5. eliminate the second dbt parse currently requested after apply/revert;
6. correct release-note duplication and obtain real successful release checks;
7. attach evidence to the exact commit that will be tagged and published.

After that stabilization PR, deliver paginated and completeness-aware workspace inventory.
Only then expand the semantic edit vocabulary.

## Review scope and evidence limits

This review inspected through the GitHub connector:

- repository metadata and default branch;
- current `main` identity and recent commits;
- merged product PR #1988;
- open release PR #1984;
- all visible open review PRs;
- PR-head and exact-main CI visibility;
- review threads on #1988, #1983, #1984, and the latest review PR;
- the YAML description contracts, proposal, apply, revert, mutator, receipt store, and UI;
- the protected live roundtrip proof;
- Code working-tree synchronization and post-save reconciliation;
- dbt analyzer behavior for invalid and unavailable projects;
- current importer and workspace file limits;
- divergence of the existing review branches from current `main`.

No repository code or test suite was executed locally. Runtime conclusions are based on
committed control flow, tests, pull-request metadata, and GitHub Actions evidence.

The branch-search connector returned no usable branch inventory. Relevant unmerged branch
work is reconstructed from visible pull-request heads and recent commits. This report does
not claim that an unindexed branch does not exist.

## Current repository snapshot

| Signal | Observed state |
| --- | --- |
| Default branch | `main` |
| Current `main` | [`ef8c589b`](https://github.com/dunay2/dvt/commit/ef8c589b61e0dfe2864975b021149e88716f01aa) |
| Commit time | 2026-07-18 17:36:42 UTC |
| Package version on `main` | `0.4.0` |
| Latest merged product PR | [#1988](https://github.com/dunay2/dvt/pull/1988) |
| Latest delivered capability | File-authoritative dbt YAML description roundtrip |
| Open release PR | [#1984](https://github.com/dunay2/dvt/pull/1984), proposed `0.5.0` |
| Release head | `7b8aa6ab215249819536fc79641bb6c6956d9ee4` |
| Open documentation review PRs before this report | #1981, #1982, #1985, #1986, #1987 |
| Exact-main workflow runs returned | None |
| Exact-main combined statuses returned | None |
| Active unresolved product review threads | One on merged #1983 |
| #1988 unresolved review threads | None |
| Current release-head workflows | Six `action_required` |

`package.json` still declares `0.4.0`:

- [`package.json`](https://github.com/dunay2/dvt/blob/ef8c589b61e0dfe2864975b021149e88716f01aa/package.json#L1-L8)

## Delta since the 14:10 review

### Material product progress

The prior review described the first file-authoritative dbt description edit as the next
required product vertical. That vertical is now merged.

PR #1988 contains:

- 49 commits;
- 154 changed files;
- 13,100 additions;
- 645 deletions;
- contracts for proposals, applied receipts, and reverted receipts;
- content-addressed compare-and-swap writes;
- focused YAML CST mutation;
- immutable server-owned receipts;
- root-package resource authorization;
- contextual Canvas workbench UI;
- Code workbench re-analysis;
- a protected live apply/revert/Preview/Run/reopen proof;
- ten Planning DB migrations, numbered 736 through 745.

Evidence:

- [PR #1988](https://github.com/dunay2/dvt/pull/1988)
- [merge commit](https://github.com/dunay2/dvt/commit/ef8c589b61e0dfe2864975b021149e88716f01aa)
- [live Cypress vertical](https://github.com/dunay2/dvt/blob/ef8c589b61e0dfe2864975b021149e88716f01aa/apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts)

### Review feedback closed on #1988

PR #1988 received one P2 review finding: empty and whitespace-only descriptions were lost
by projection, making the first edit conflict against the actual YAML scalar. The thread is
resolved and outdated after commits
[`3441fe2`](https://github.com/dunay2/dvt/commit/3441fe2210080c3eadeb309a07270f8df4a12a38)
and
[`aa97263`](https://github.com/dunay2/dvt/commit/aa972631ff1019c514a36a3644c61bc28c0bc96c).

No unresolved review thread remains on #1988.

### CI changed

The final PR head
[`aa972631ff1019c514a36a3644c61bc28c0bc96c`](https://github.com/dunay2/dvt/commit/aa972631ff1019c514a36a3644c61bc28c0bc96c)
has six successful observed workflows:

| Workflow | Result |
| --- | --- |
| Test Suite | success |
| CI - Code Quality | success |
| PR Quality Gate | success |
| Contracts & Determinism | success |
| CodeQL | success |
| Dependency Review | success |

The exact merge commit on `main`, however, still returns no workflow runs and no combined
status entries through the connector. Green PR-head evidence is not the same identity as the
published merge tree.

### Release automation changed but remains blocked

Release PR #1984 was regenerated against current `main` and now includes the new YAML
roundtrip. It is open, non-draft, and mergeable, but it remains operationally blocked:

- all six workflows are `action_required`;
- the inspected PR Quality Gate run contains zero jobs;
- no review thread or PR comment is present;
- review is requested from `dunay2`;
- the changelog still contains duplicate execution-selection entries.

## What PR #1988 genuinely delivers

### Shared transaction contracts

The contract models:

- resource identity;
- current and next description;
- authoritative path;
- expected content SHA;
- complete candidate content and candidate SHA;
- focused unified diff;
- proposal digest;
- applied and reverted receipts;
- analysis, project-content-set, and target-content hashes;
- idempotency and deduplication posture.

Evidence:

- [`DbtYamlDescriptionEdit.v1.ts`](https://github.com/dunay2/dvt/blob/ef8c589b61e0dfe2864975b021149e88716f01aa/packages/%40dvt/contracts/src/contracts/dbt-project/DbtYamlDescriptionEdit.v1.ts)

### Focused, lossless mutation

The YAML mutator uses CST source tokens and patches one description scalar instead of
serializing the whole document. It validates unique keys, detects missing or ambiguous
resources, preserves existing scalar quoting where practical, and rejects unsupported
flow-style structural insertion or deletion.

Evidence:

- [`YamlCstDbtDescriptionMutator.ts`](https://github.com/dunay2/dvt/blob/ef8c589b61e0dfe2864975b021149e88716f01aa/apps/api/src/infrastructure/dbtYamlDescriptionEdit/YamlCstDbtDescriptionMutator.ts)

Known bounded behavior:

- a multiline description is emitted as a JSON-quoted scalar rather than a YAML block;
- flow-style resources can replace an existing description but cannot structurally add or
  remove one;
- resource matching is name-based within the authoritative collection after graph identity
  authorization.

These are acceptable initial constraints if the UI and product contract present them
honestly.

### Conditional apply and revert

Apply:

1. validates proposal integrity;
2. resolves the authorized root-package resource and path;
3. compares the current content revision;
4. recomputes the mutation against the current file;
5. performs an atomic batch compare-and-swap write;
6. re-analyzes the project;
7. verifies retained file content;
8. persists an immutable receipt.

Revert:

1. loads the trusted applied receipt;
2. requires the current file to equal the applied revision;
3. restores the previous description through the same mutator;
4. performs a compare-and-swap write;
5. re-analyzes and records a reverted receipt.

Evidence:

- [`ApplyDbtYamlDescriptionEditCommand.ts`](https://github.com/dunay2/dvt/blob/ef8c589b61e0dfe2864975b021149e88716f01aa/apps/api/src/application/services/dbtYamlDescriptionEdit/ApplyDbtYamlDescriptionEditCommand.ts)
- [`RevertDbtYamlDescriptionEditCommand.ts`](https://github.com/dunay2/dvt/blob/ef8c589b61e0dfe2864975b021149e88716f01aa/apps/api/src/application/services/dbtYamlDescriptionEdit/RevertDbtYamlDescriptionEditCommand.ts)
- [`WorkspaceMetadataDbtYamlDescriptionReceiptStore.ts`](https://github.com/dunay2/dvt/blob/ef8c589b61e0dfe2864975b021149e88716f01aa/apps/api/src/infrastructure/dbtYamlDescriptionEdit/WorkspaceMetadataDbtYamlDescriptionReceiptStore.ts)

### Protected live vertical

The live Cypress test proves one valid small-project path:

- open model workbench;
- edit description;
- inspect diff;
- apply;
- verify file and graph;
- revert;
- reopen;
- apply again;
- edit valid model SQL in Monaco;
- Preview;
- Temporal Run;
- reopen and verify persistence;
- verify no graph-draft interception.

This is meaningful end-to-end evidence. It is still one happy-path test. It does not prove:

- concurrent revision conflict through the protected UI;
- invalid YAML after write;
- invalid dbt SQL after Code synchronization;
- analyzer unavailability;
- oversized schema files;
- 501+ project files;
- flow-style structural description changes;
- receipt retention or cleanup.

## Confirmed bug P1 — Code reports invalid dbt analysis as synchronized

### Control-flow evidence

The Code synchronization hook intentionally waits for a post-save consumer before marking a
file synchronized:

- [`useCodeWorkingTreeSync.ts`](https://github.com/dunay2/dvt/blob/ef8c589b61e0dfe2864975b021149e88716f01aa/apps/web/src/app/views/code/useCodeWorkingTreeSync.ts#L97-L139)

If the callback resolves, the reducer transitions from `reconciling` to `synchronized`:

- [`codeWorkingTreeSyncModel.ts`](https://github.com/dunay2/dvt/blob/ef8c589b61e0dfe2864975b021149e88716f01aa/apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts#L96-L111)

For the dbt contextual workbench, the callback is `refreshProjectGraphAfterCodeMutation`:

- [`DbtProjectFileCanvasView.tsx`](https://github.com/dunay2/dvt/blob/ef8c589b61e0dfe2864975b021149e88716f01aa/apps/web/src/app/views/canvas/DbtProjectFileCanvasView.tsx#L137-L150)

The controller considers reconciliation successful whenever the query returns data. It does
not inspect `freshness`, diagnostics, or `canPreview`:

- [`useDbtProjectFileCanvasController.ts`](https://github.com/dunay2/dvt/blob/ef8c589b61e0dfe2864975b021149e88716f01aa/apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts#L240-L263)

The analyzer does not throw for a dbt parse failure. It returns a valid HTTP projection with
status `invalid`, empty resources, and diagnostics:

- [`DbtCliProjectAnalyzer.ts`](https://github.com/dunay2/dvt/blob/ef8c589b61e0dfe2864975b021149e88716f01aa/apps/api/src/infrastructure/dbt/DbtCliProjectAnalyzer.ts#L188-L220)
- [`DbtCliProjectAnalyzer.ts`](https://github.com/dunay2/dvt/blob/ef8c589b61e0dfe2864975b021149e88716f01aa/apps/api/src/infrastructure/dbt/DbtCliProjectAnalyzer.ts#L282-L300)

Therefore an edit that persists invalid SQL can follow this sequence:

1. file save succeeds;
2. dbt parse returns `invalid` as a normal projection;
3. query refetch is an HTTP success;
4. callback resolves;
5. Code transitions to `synchronized` and uses the positive status tone;
6. the graph may become empty and the Canvas notice reports invalid analysis.

The same operation is simultaneously presented as synchronized and semantically invalid.
The current protected live test uses valid SQL and cannot catch this case.

### Required correction

Return a typed reconciliation outcome rather than `Promise<void>`:

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

The working-tree model must distinguish:

- content persisted;
- fresh semantic analysis established;
- persisted but semantically invalid;
- persisted but analyzer unavailable;
- stale last-valid projection;
- content revision conflict.

Do not label a persisted-invalid edit `Synchronized`. Keep the workbench open and offer a
clear recovery action. For SQL edits, a conditional revert to the previous content revision
is preferable to silently retaining invalid code without a durable receipt.

### Required proof

Add at minimum:

- controller test where refetch returns `freshness: invalid`;
- sync hook test where the callback returns degraded analysis;
- UI test proving `Persisted, analysis invalid` rather than `Synchronized`;
- protected integration or E2E proof that writes invalid SQL, observes the degraded state,
  recovers, and returns to a fresh graph.

## Confirmed bug P1 — raw recovery diagnostic still bypasses localization

Merged PR #1983 still has one unresolved, non-outdated P2 thread on:

- [`OperationalDrawerSelectionRecoveryView.tsx`](https://github.com/dunay2/dvt/blob/ef8c589b61e0dfe2864975b021149e88716f01aa/apps/web/src/app/components/shell/OperationalDrawerSelectionRecoveryView.tsx#L116-L119)

Current source still renders:

```tsx
{model.failure.detail ?? messages.selectionRecoveryRefreshFailureMessage}
```

A non-empty transport, authorization, repository, or parser `Error.message` overrides the
localized catalog. Spanish users can receive English technical text, and internal detail can
leak into the operational drawer.

### Required correction

- expose a stable failure code, not arbitrary visible detail;
- always render localized copy from that code;
- retain sanitized diagnostics only in logs or a developer-only surface;
- add Spanish-locale proof with a non-empty technical error;
- resolve the #1983 review thread only after code and tests exist.

## Release blocker P1 — `0.5.0` is not releasable

### Duplicate semantic entry

Release #1984 contains these two feature entries:

- execution selection recovery at merge commit `ec47025`;
- the same execution selection recovery at parent commit `fa240f8`.

This is the same semantic change counted twice because release generation follows commit
topology rather than normalized product changes.

The new YAML roundtrip is also represented by both its aggregate merge feature and several
component-level feature commits. That may be technically faithful to Conventional Commits,
but it creates release notes optimized for repository topology rather than user value.

### Workflow state

On release head
[`7b8aa6ab215249819536fc79641bb6c6956d9ee4`](https://github.com/dunay2/dvt/commit/7b8aa6ab215249819536fc79641bb6c6956d9ee4):

| Workflow | Result |
| --- | --- |
| Test Suite | `action_required` |
| CI - Code Quality | `action_required` |
| PR Quality Gate | `action_required` |
| Contracts & Determinism | `action_required` |
| CodeQL | `action_required` |
| Dependency Review | `action_required` |

The inspected PR Quality Gate run contains no jobs. This is not a green release candidate.

### Required release exit criteria

- repair the two confirmed P1 user-facing defects;
- normalize or deduplicate semantic release entries;
- add a fixture covering merge-parent duplicate generation;
- obtain successful required checks on the final release head;
- review and approve the actual release diff;
- ensure manifest, package, changelog, tag, and release version agree;
- run or record validation against the exact commit to be tagged;
- publish one product-oriented summary for the roundtrip rather than exposing every
  mechanization/refactor commit as a separate headline.

## Transaction semantics gap P1 — invalid analysis is retained, not rolled back

The description apply command writes first and analyzes afterwards. The receipt contract
allows `fresh`, `stale-last-valid`, `invalid`, or `unavailable`. The command does not
conditionally restore the previous content when analysis is invalid or unavailable.

The UI presents the degraded receipt and offers a manual revert. This is honest recovery,
but it is not an atomic semantically-valid transaction.

This report does not prescribe automatic rollback unconditionally. DVT must make the policy
explicit:

### Option A — validity-atomic description transaction

- apply candidate content;
- analyze;
- if analysis is not fresh, compare-and-swap back to the previous content;
- return a failed transaction receipt containing apply and rollback evidence;
- if rollback conflicts, return a critical recoverable state.

### Option B — persistence-atomic, semantically recoverable transaction

- retain the new file content;
- return a degraded receipt;
- block Preview and Run;
- keep a durable Revert action available after reopen;
- make the invalid state visible outside the transient editor;
- record who/what created the invalid revision and its prior revision.

Current behavior is closest to Option B, but the recovery affordance is tied to client state
and the applied receipt currently held by the editor. The server stores receipts, yet no
inspected query rail exposes recent applicable receipts after a fresh browser session.
Therefore durable recovery after reopening an invalid transaction is not demonstrated.

### Required decision

Choose and document one policy before release. If Option B is retained, add a server-backed
`GetRecoverableDbtYamlDescriptionEdits` query and reopen proof for an invalid edit.

## Performance and consistency gap P1 — one edit requests duplicate dbt analysis

Apply and revert already invoke `ProjectDbtGraphFromFilesUseCase.execute` inside the API
command and embed the resulting analysis hashes in the receipt.

After the API returns, the browser calls `onProjectChanged`, which invokes a query refetch.
The controller then calls the same project-graph route again. The analyzer has no visible
content-addressed cache and runs `dbt parse` in a fresh temporary directory.

A normal description apply therefore requests at least:

1. one server-side dbt parse inside the command;
2. another dbt parse immediately afterwards for client refresh.

The same pattern exists for revert. Besides latency and CPU cost, the two analyses can bind
to different workspace revisions if another writer changes the project between them.

### Required correction

Prefer one of these designs:

1. return the authoritative graph projection in the apply/revert response and seed the query
   cache directly; or
2. return a content-addressed analysis identity and make graph retrieval reuse that exact
   result; or
3. add an analyzer cache keyed by project content-set SHA, analyzer version, dbt version,
   adapter, profile identity, and relevant execution environment.

The UI must display and operate on the exact analysis receipt returned by the transaction,
not an opportunistic second analysis of a potentially newer tree.

## Product gap P1 — accepted projects still exceed the workspace surface

The current dbt importer defaults to:

```text
maxProjectFiles       10,000
maxInspectedFiles    100,000
maxProjectBytes   50,000,000
maxDirectories         5,000
maxDepth                   64
```

Evidence:

- [`LocalDbtProjectImportInspector.ts`](https://github.com/dunay2/dvt/blob/ef8c589b61e0dfe2864975b021149e88716f01aa/apps/api/src/infrastructure/dbt/LocalDbtProjectImportInspector.ts#L38-L44)

The workspace repository still defaults to:

```text
MAX_LISTED_FILES       500
MAX_FILE_BYTES     1,000,000
```

Evidence:

- [`LocalWorkspaceFileRepository.ts`](https://github.com/dunay2/dvt/blob/ef8c589b61e0dfe2864975b021149e88716f01aa/apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts#L49-L75)

Listing stops silently at 500 and returns no cursor, truncation flag, omitted count, total,
or effective-limit metadata:

- [`LocalWorkspaceFileRepository.ts`](https://github.com/dunay2/dvt/blob/ef8c589b61e0dfe2864975b021149e88716f01aa/apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts#L161-L207)

Files above 1 MB are reported as `InvalidWorkspacePathError`, even though the path can be
valid. The new YAML proposal contract also caps complete candidate content at 1 MB. Thus a
project can be accepted and analyzed while its authoritative schema file cannot be opened or
edited through the roundtrip.

### Required contract

Introduce an explicit inventory page:

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

### Acceptance criteria

- stable deterministic paging;
- no silent omission;
- shared policy authority for import, analysis, explorer, and editing;
- a distinct oversized-file error type;
- UI completeness state;
- 501-file and near-10,000-file tests;
- a schema file above 1 MB with deliberate read-only or streamed behavior;
- analyzer, Canvas, Code, and receipt generation agree on project completeness.

## Operability gap P2 — immutable receipts have no visible lifecycle policy

Applied and reverted receipts are stored as individual JSON files under:

```text
.dvt/dbt-yaml-description-receipts/applied/<receipt-id>.json
.dvt/dbt-yaml-description-receipts/reverted/<receipt-id>.json
```

The inspected store provides find and save operations only. No index, retention, compaction,
archival, tenant quota, or garbage-collection policy is visible in this component.

Immutable evidence is valuable, but one file per operation becomes unbounded workspace
metadata under repeated edits.

### Required policy

- define whether receipts are audit records or transient recovery records;
- index by canvas, resource, path, and created time;
- expose the latest applicable receipt for recovery;
- define retention and legal/audit requirements;
- apply tenant quotas without deleting required evidence silently;
- archive or compact superseded receipts;
- monitor receipt count and bytes per workspace.

## Architectural drift

### AD-01 — change amplification remains severe

One bounded vertical changed 154 files and added ten sequential Planning DB migrations.
Some breadth is justified by contracts, tests, evidence, and UI integration. The total still
shows that capability, ownership, evidence, copy, registry, and mechanization data are spread
across too many independent authorities.

Recommended direction:

- define feature ownership and capability metadata once;
- generate registries, documentation indexes, and mechanization inventory from canonical
  declarations;
- separate runtime correctness gates from descriptive planning completeness;
- establish a change-amplification budget per user story;
- require an architecture note when a bounded UI transaction changes more than an agreed
  number of authorities or migrations;
- batch coherent Planning DB state into fewer migrations during an unmerged feature branch.

### AD-02 — analysis authority is duplicated

The API command establishes one analysis receipt, while the browser independently requests
another analysis to refresh presentation. This splits transaction truth from screen truth.

Recommended direction:

- make the command result the authoritative post-transaction projection identity;
- propagate it through query caches, Preview, Run, and UI receipts;
- permit an explicit later refresh, but label it as a newer revision rather than silently
  replacing transaction context.

### AD-03 — release generation exposes commit topology

The release note model counts merge commits, feature parents, and component commits as
independent product changes. This produces duplicate and implementation-heavy release notes.

Recommended direction:

- normalize type, scope, and semantic title;
- collapse merge-parent duplicates;
- allow one explicit product summary per merged feature PR;
- keep detailed commit provenance in an expandable engineering section;
- fail release CI on duplicate normalized entries.

### AD-04 — review documents remain an active competing queue

Before this report, five documentation-only review PRs remained open:

- #1981 and #1982 review `main@4c98026`;
- #1985, #1986, and #1987 review `main@ec47025`;
- current `main` is 50 commits ahead of the #1987 base;
- #1987 is one documentation commit ahead and 50 product commits behind current `main`.

All five are stale as current implementation authority. Creating another review without
closing superseded reviews increases ambiguity for the other agent.

Recommended governance rule:

> Keep one open current-state review PR. Close older review PRs as superseded and link to
> the replacement. Preserve closed reports as historical evidence, not concurrent work
> instructions.

The automation that creates these reports should produce a short delta report when only CI
or metadata changes. It should not continually expand repeated findings.

## Open pull-request assessment

| PR | State | Scope | Current decision |
| --- | --- | --- | --- |
| [#1984](https://github.com/dunay2/dvt/pull/1984) | Open, non-draft | Release `0.5.0` | Block until defects, notes, and CI are repaired |
| [#1987](https://github.com/dunay2/dvt/pull/1987) | Open draft | Review of `ec47025` | Stale; close as superseded |
| [#1986](https://github.com/dunay2/dvt/pull/1986) | Open draft | Review of `ec47025` | Stale; close as superseded |
| [#1985](https://github.com/dunay2/dvt/pull/1985) | Open draft | Review of `ec47025` | Stale; close as superseded |
| [#1982](https://github.com/dunay2/dvt/pull/1982) | Open draft | Review of `4c98026` | Stale; close as superseded |
| [#1981](https://github.com/dunay2/dvt/pull/1981) | Open draft | Review of `4c98026` | Stale; close as superseded |

No visible open functional implementation PR exists. The only visible functional head is the
release branch. The completed feature branch for #1988 is already merged.

## Findings register

| ID | Severity | Finding | State |
| --- | --- | --- | --- |
| BUG-01 | P1 | Code marks an invalid/unavailable dbt projection as synchronized after a successful HTTP refetch | Confirmed by current control flow |
| BUG-02 | P1 | Raw execution-selection refresh detail overrides localized copy | Confirmed on `main`; #1983 thread unresolved |
| BUG-03 | P1 release | `0.5.0` duplicates one semantic execution-selection feature | Confirmed in #1984 |
| BUG-04 | P1 release | All six release workflows are `action_required` | Confirmed on current release head |
| GAP-01 | P1 transaction | Invalid description analysis is retained without a demonstrated durable reopen recovery rail | Confirmed design gap |
| PERF-01 | P1 | Apply/revert request a second dbt analysis immediately after the command analysis | Confirmed by API and client orchestration |
| GAP-02 | P1 product | Accepted projects can exceed workspace listing and editing limits | Confirmed on `main` |
| EVID-01 | P2 | Exact `main` merge SHA has no connector-visible CI/status evidence | Confirmed evidence gap |
| OPS-01 | P2 | Immutable receipt files have no visible retention/index lifecycle | Inferred from inspected receipt store |
| ARCH-01 | P2 | One vertical spans 154 files and ten Planning DB migrations | Confirmed by #1988 |
| GOV-01 | P2 | Five superseded review PRs remain open | Confirmed |
| TEST-01 | P2 | Protected roundtrip proof covers one valid happy path, not invalid/conflict/oversized paths | Confirmed from test structure |

## Recommended next route

## Phase 0 — stabilization and truthful release

Target: one focused code PR plus corrected release PR.

Exit criteria:

- selection-recovery failures always use localized stable copy;
- #1983 thread resolved;
- Code distinguishes persisted content from fresh semantic reconciliation;
- invalid SQL protected proof exists;
- description invalid-analysis policy is explicit and tested;
- duplicate dbt analysis is removed or content-addressedly reused;
- release notes have no normalized duplicates;
- all required release checks succeed;
- exact tagged commit has machine-readable evidence;
- `0.5.0` communicates one coherent user feature: first file-authoritative dbt authoring
  roundtrip.

## Phase 1 — workspace capability truth

Target: shared file capability policy and explicit paginated inventory.

Exit criteria:

- no silent 500-file truncation;
- completeness visible in API and UI;
- oversized files have a correct error/status type;
- 501+, near-10,000, and above-1-MB cases proven;
- importer, analyzer, explorer, Code, and authoring transactions use one policy authority.

## Phase 2 — reusable authoring transaction kernel

Target: reduce duplication before adding more semantic edit types.

Extract or formalize reusable components for:

- resource/path provenance;
- proposal construction;
- focused diff;
- content-addressed compare-and-swap;
- idempotency;
- apply receipt;
- semantic validation;
- rollback or recoverable-invalid policy;
- graph/query-cache refresh bound to the exact analysis revision;
- durable recovery discovery;
- telemetry and audit lifecycle.

Exit criteria:

- the next semantic edit does not copy the entire description command/query/UI stack;
- one canonical transaction state machine is shared or deliberately specialized at clear
  boundaries;
- change amplification is materially lower than #1988.

## Phase 3 — one adjacent semantic vertical

Recommended vertical: edit a column description in `schema.yml`.

Why this route:

- it reuses the same authoritative YAML file and revision model;
- it adds real graph-level value without introducing SQL parsing;
- it tests nested resource identity and path provenance;
- it reveals whether the transaction kernel generalizes;
- it is lower risk than generic test mutation or model SQL AST authoring.

Acceptance criteria:

- select model column from Canvas;
- show exact source file and nested YAML path;
- propose focused diff;
- CAS apply;
- conflict and durable recovery;
- fresh analysis identity;
- graph refresh;
- Preview and Run revision proof;
- reopen from files;
- unrelated YAML remains byte-stable;
- no new parallel transaction framework.

## Phase 4 — graph/code bidirectionality expansion

Only after Phases 0–3:

1. column tests with a deliberately restricted vocabulary;
2. model configuration such as materialization where dbt semantics are unambiguous;
3. SQL authoring through Code with valid/degraded/reverted revision semantics;
4. visual SQL construction only after an explicit AST strategy and lossless roundtrip
   contract exist.

Do not implement a new general-purpose DSL merely to make the graph editable. Preserve dbt
files as semantic authority and add controlled visual operations that compile to focused,
reviewable file patches.

## Explicit non-goals for the next implementation cycle

Do not prioritize:

- another broad governance phase;
- generic workflow scheduling UI;
- deployment management;
- multi-engine SQL abstraction;
- mass YAML refactoring;
- generic dbt test authoring;
- SQL AST visual editing;
- release-note cosmetic work without release CI repair;
- additional architecture review PRs without closing superseded authorities.

## Proposed PR decomposition

### PR A — `fix/web-dbt-reconciliation-truth`

- fix localized selection-recovery failure;
- typed dbt Code reconciliation outcome;
- invalid/unavailable/stale UI states;
- conditional recovery action;
- focused unit/integration/protected proof;
- resolve #1983 thread.

### PR B — `refactor/dbt-authoring-analysis-reuse`

- return or reuse exact post-transaction graph projection;
- remove immediate duplicate parse;
- bind query cache and receipts to one analysis identity;
- add concurrency proof.

### PR C — `fix/workspace-file-inventory-completeness`

- paginated inventory contract;
- shared capability limits;
- correct oversized-file error;
- API and UI completeness posture;
- large-project tests.

### PR D — `refactor/dbt-authoring-transaction-kernel`

- reusable proposal/apply/revert/recovery abstractions;
- receipt lookup and retention policy;
- reduce registration and Planning DB duplication;
- no new user-facing semantic operation.

### PR E — `feat/dbt-column-description-roundtrip`

- first consumer of the extracted kernel;
- complete protected proof;
- strict scope limited to column description.

## Release decision

**Do not merge #1984 in its current state.**

The correct release decision is not to discard #1988. The feature is substantial and should
ship after focused hardening. A truthful `0.5.0` should include:

- the completed YAML description roundtrip;
- repaired recovery localization;
- truthful Code reconciliation;
- successful release checks;
- deduplicated product-oriented notes;
- exact-commit evidence.

Workspace inventory can follow in `0.5.x` if the release explicitly documents current limits,
but it remains P1 before claiming broad large-project authoring readiness.

## Handoff checklist for the next agent

- [ ] Read #1988 and its resolved review thread before changing the transaction.
- [ ] Reproduce the invalid-SQL synchronization control flow in a focused test.
- [ ] Fix the still-active #1983 localization defect.
- [ ] Decide validity-atomic versus recoverable-invalid description semantics.
- [ ] Remove or reuse the duplicate post-apply analysis.
- [ ] Keep file revisions, analysis revisions, and plan revisions distinct.
- [ ] Do not merge #1984 while checks are `action_required`.
- [ ] Deduplicate semantic release entries.
- [ ] Create exact-tagged-commit evidence.
- [ ] Close #1981, #1982, #1985, #1986, and #1987 as superseded when authorized.
- [ ] Implement workspace inventory truth before broadening project-size claims.
- [ ] Extract transaction reuse before the next YAML operation.
- [ ] Use column description as the next narrow generalization proof.

## Final assessment

DVT has crossed an important boundary: it is no longer only describing bidirectional dbt
authoring. It now performs one real, reviewable, revision-guarded file-authoritative edit and
proves that edit through Preview, Run, and reopen.

The immediate risk is declaring the architecture complete because the happy path works. The
current implementation still conflates persisted Code with valid semantic reconciliation,
requests duplicate analysis, retains an unresolved localization leak, has no complete
large-project workspace surface, and remains expensive to change.

The right next move is stabilization, not another conceptual expansion. Ship one truthful
roundtrip, make its revision and failure semantics rigorous, reduce its analysis and
governance duplication, then generalize exactly once to a nested column description.