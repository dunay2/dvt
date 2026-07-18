---
title: DVT Repository State, Release Blockers, and Next Route Review — 2026-07-18 08:09
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
supersedes_review_pr: 1985
---

# DVT Repository State, Release Blockers, and Next Route Review — 2026-07-18 08:09

## Executive verdict

`main` remains at
[`ec47025c1f1e232a7aff8a6d20cd59bb87b59a01`](https://github.com/dunay2/dvt/commit/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01),
the merge commit for
[#1983](https://github.com/dunay2/dvt/pull/1983),
which introduced explicit fail-closed recovery for stale or invalid dbt execution
selection.

No new product-code commit has landed since the preceding review. The repository is
therefore not waiting for another architecture proposal. It is waiting for execution
against already identified blockers.

The immediate release state is still **not acceptable**:

1. merged PR #1983 retains one active, non-outdated P2 review thread;
2. the recovery UI can render raw `Error.message` content instead of localized copy;
3. release PR [#1984](https://github.com/dunay2/dvt/pull/1984) duplicates the same
   feature in the `0.5.0` changelog;
4. all six observed release-head workflows are `action_required` and provide no green
   release validation;
5. the exact `main` merge SHA has no connector-visible workflow runs or combined
   status entries;
6. the release PR has no submitted review and no remediation commit;
7. three documentation-only review PRs are now open, two of which describe older
   repository states and should not compete as current implementation authority.

The merged selection-recovery direction is correct and should be preserved. The next
implementation work must be a small release repair, not another broad governance
phase.

After the release is made mechanically clean, the product route remains:

1. make workspace inventory truthful for every dbt project accepted by import;
2. deliver one complete, lossless, revision-bound `schema.yml` model-description
   edit from Canvas to file and back;
3. prove Preview and Run use the exact saved revision;
4. make Code UX distinguish authoritative source, generated preview, and absent code.

## Primary instruction to the implementation agent

Proceed in this order:

1. fix the selection-recovery localization and diagnostic-leak defect on `main`;
2. add a regression test with a non-empty technical `Error.message` under Spanish
   locale;
3. resolve the active #1983 review thread only after the fix exists on a PR;
4. remove the duplicate `0.5.0` changelog entry in #1984 or regenerate the release PR
   from corrected release inputs;
5. add a release-note duplicate guard so merge commit plus parent commit cannot produce
   duplicate semantic entries;
6. authorize or otherwise unblock the six release workflows, then obtain successful
   results on the exact release head;
7. ensure the exact shipped commit receives visible CI/release evidence;
8. close or explicitly supersede stale review PRs so one current report is
   authoritative;
9. implement workspace inventory truth;
10. implement the first complete file-authoritative dbt edit transaction.

Do not merge #1984 until items 1–7 are mechanically true.

## Review method and evidence limits

This review inspected through the GitHub connector:

- current default branch and exact `main` commit;
- recent repository commits;
- all visible open pull requests;
- merged product PR #1983;
- release PR #1984 metadata and changed files;
- documentation review PRs #1981, #1982, and #1985;
- PR-head and exact-main workflow visibility;
- submitted reviews and inline review threads;
- current source for selection-recovery failure rendering;
- current source for failure-detail capture;
- current tests for localized recovery failure behavior;
- the preceding architecture review and its product route.

No repository code was executed locally. Runtime and test conclusions are restricted to
committed source, PR metadata, diffs, review state, and GitHub workflow evidence.

The branch-search connector returned no branch results for the tested review and
release queries. Relevant unmerged branch work is therefore reconstructed from PR head
metadata and recent commit history. This report does not assume that an unenumerated
branch does not exist.

## Current repository snapshot

| Signal | Observed state |
| --- | --- |
| Current `main` | [`ec47025c`](https://github.com/dunay2/dvt/commit/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01) |
| Version on `main` | `0.4.0` |
| Latest merged product PR | [#1983](https://github.com/dunay2/dvt/pull/1983) |
| Latest merged feature | Explicit dbt execution-selection recovery |
| Open release PR | [#1984](https://github.com/dunay2/dvt/pull/1984), proposed `0.5.0` |
| Open review PRs | #1981, #1982, #1985 |
| Current review PR with latest prior state | #1985 |
| Exact `main` workflow runs | None returned |
| Exact `main` combined statuses | None returned |
| Unresolved product review threads | One on merged #1983 |
| Release workflow state | Six `action_required` conclusions |
| Release review state | No submitted reviews; no inline threads |
| New product progress since prior review | None visible |

## Delta since the 02:09 review

### What changed

The only material observed change is completion of CI on documentation PR #1985:

- `PR Quality Gate`: success;
- `CI - Code Quality`: success;
- `Test Suite`: skipped;
- `Contracts & Determinism`: skipped;
- `CodeQL`: skipped;
- `Dependency Review`: skipped.

This is appropriate evidence for a Markdown-only review change. It does not change the
product or release state.

### What did not change

The following remain exactly unresolved:

- `main` is unchanged;
- the P2 localization/technical-detail thread on #1983 is unresolved and non-outdated;
- #1984 still contains duplicate release notes;
- #1984 still has six `action_required` workflows;
- #1984 still has no submitted review;
- exact-main CI evidence remains absent;
- no implementation branch is visible for workspace inventory truth;
- no implementation branch is visible for file-authoritative dbt editing;
- no implementation branch is visible for authority-honest Code behavior.

### Governance queue worsened

There are now three open documentation-only review PRs:

- [#1981](https://github.com/dunay2/dvt/pull/1981), reviewing `main@4c98026c`;
- [#1982](https://github.com/dunay2/dvt/pull/1982), also reviewing `main@4c98026c`;
- [#1985](https://github.com/dunay2/dvt/pull/1985), reviewing current
  `main@ec47025c`.

PRs #1981 and #1982 are stale as current-state authorities. PR #1985 is the direct
predecessor of this report. Keeping all reviews open without an explicit supersession
or closure protocol increases governance ambiguity and makes it easier for another
agent to implement against an obsolete recommendation.

## Recent commit assessment

### Current `main`

The latest mainline commits are:

1. [`ec47025c`](https://github.com/dunay2/dvt/commit/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01)
   — merge PR #1983;
2. [`fa240f8`](https://github.com/dunay2/dvt/commit/fa240f843cda5adb569923494034fd3c3f7a64a6)
   — add explicit dbt execution-selection recovery;
3. [`4c98026`](https://github.com/dunay2/dvt/commit/4c98026c0dd2e2b9e4bbcc126033b34f8afa2b5c)
   — merge release `0.4.0`;
4. [`6208989`](https://github.com/dunay2/dvt/commit/620898938561adb4e6e2172c7db83a884c368813)
   — release `0.4.0`.

No later product commit is visible.

### PR #1983 scale

PR #1983 changed:

- 64 files;
- 3,771 additions;
- 108 deletions;
- one feature commit;
- six Planning DB migrations;
- runtime code, UI, contracts, tests, evidence, and governance documentation.

The feature closes a real safety and usability gap. Its scale is nevertheless a strong
signal of architectural amplification: a bounded recovery interaction required broad
cross-repository mechanization.

The repository should preserve the explicit rails and fail-closed semantics, while
reducing the number of authorities and generated governance surfaces that must change
for a small product behavior.

## Open pull-request assessment

## PR #1984 — release `0.5.0`

State:

- open;
- not draft;
- mergeable;
- head `release-please--branches--main--components--dvt`;
- head SHA
  [`8800bafd`](https://github.com/dunay2/dvt/commit/8800bafde2cea558da2c3229a456879af04f12bc);
- 1 commit;
- 3 changed files;
- 10 additions;
- 2 deletions;
- requested reviewer: `dunay2`;
- no submitted reviews;
- no inline review threads.

Changed files:

- `.release-please-manifest.json`;
- `CHANGELOG.md`;
- `package.json`.

The changelog contains the same semantic feature twice:

```markdown
* **web:** Add explicit DBT execution selection recovery (ec47025)
* **web:** Add explicit DBT execution selection recovery (fa240f8)
```

This is not harmless formatting. It gives downstream users and release tooling a false
impression that two distinct capabilities shipped.

The likely mechanism is semantic double counting of the merge commit and its parent
feature commit. The fix should target release generation or add a deterministic
post-generation duplicate check rather than rely on manual editing for every release.

### Release PR decision

**Do not merge #1984 as-is.**

Minimum release acceptance criteria:

- one semantic changelog entry per feature;
- localization/diagnostic defect fixed before version publication;
- active #1983 thread addressed and resolved;
- all required workflows successful on the final release head;
- no unexplained `action_required` result;
- exact package, manifest, and changelog versions agree;
- published tag and release point to an evidence-bearing commit.

## PR #1985 — current predecessor review

State:

- open;
- draft;
- mergeable;
- documentation-only;
- one Markdown file;
- one commit;
- 912 additions;
- no review threads.

CI is complete and appropriate for its scope:

- two applicable workflows succeeded;
- four non-applicable workflows were skipped.

PR #1985 should be treated as superseded by this report once this PR exists. It should
not remain an independent implementation authority indefinitely.

## PRs #1981 and #1982 — stale reviews

Both PRs are:

- open;
- draft;
- mergeable;
- documentation-only;
- based on `main@4c98026c`;
- older than merged feature #1983.

Their core product findings remain useful, but their repository snapshots are stale.
They should either be closed with a supersession comment or explicitly marked
historical.

## CI and release evidence

## Feature head for merged PR #1983

All six observed workflows succeeded on
[`fa240f843cda5adb569923494034fd3c3f7a64a6`](https://github.com/dunay2/dvt/commit/fa240f843cda5adb569923494034fd3c3f7a64a6):

| Workflow | Conclusion |
| --- | --- |
| Dependency Review | success |
| Contracts & Determinism | success |
| Test Suite | success |
| CI - Code Quality | success |
| CodeQL | success |
| PR Quality Gate | success |

This is strong feature-head evidence. It does not prove the merge commit was rerun, and
it does not override an unresolved review defect.

## Exact current `main`

For
[`ec47025c1f1e232a7aff8a6d20cd59bb87b59a01`](https://github.com/dunay2/dvt/commit/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01),
the connector returned:

- no associated workflow runs;
- no combined status entries.

This does not prove `main` is broken. It proves the repository cannot currently show
connector-visible validation attached to the exact tree that release automation uses.

Recommended correction:

- run protected CI on pushes to `main`, or
- create a required post-merge verification workflow, or
- make the release workflow verify the exact target tree before tagging.

PR-head-only evidence is insufficient for a repository that treats deterministic
artifacts and governance proof as first-class product concerns.

## Release head for PR #1984

All six observed workflows completed with `action_required`:

| Workflow | Conclusion |
| --- | --- |
| Dependency Review | action_required |
| Contracts & Determinism | action_required |
| PR Quality Gate | action_required |
| CI - Code Quality | action_required |
| CodeQL | action_required |
| Test Suite | action_required |

The inspected PR Quality Gate run returned no jobs. The connector does not expose the
administrative approval reason, so this review does not invent one.

The exact blocker visible from repository state is:

> The release head has no successful workflow evidence because every observed run is
> completed as `action_required`; at least the inspected Quality Gate run contains no
> jobs.

Someone with repository Actions authority must inspect and authorize or correct the
workflow trigger before the release is eligible to merge.

## Review-thread state

## Active P2 on merged PR #1983

Thread:

- path:
  `apps/web/src/app/components/shell/OperationalDrawerSelectionRecoveryView.tsx`;
- current line: 116;
- unresolved;
- non-outdated;
- attached to code now present on `main`.

Current user-facing rendering:

```tsx
{model.failure.detail ?? messages.selectionRecoveryRefreshFailureMessage}
```

Source:
[`OperationalDrawerSelectionRecoveryView.tsx`](https://github.com/dunay2/dvt/blob/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01/apps/web/src/app/components/shell/OperationalDrawerSelectionRecoveryView.tsx#L116-L119).

Current failure-detail capture:

```ts
function readFailureDetail(error: unknown): string | null {
  return error instanceof Error && error.message.trim().length > 0 ? error.message : null;
}
```

The rejected refresh stores that result directly in the presentation read model.

Source:
[`useCanvasExecutionSelectionRecovery.ts`](https://github.com/dunay2/dvt/blob/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01/apps/web/src/app/views/canvas/useCanvasExecutionSelectionRecovery.ts#L47-L49)
and
[`useCanvasExecutionSelectionRecovery.ts`](https://github.com/dunay2/dvt/blob/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01/apps/web/src/app/views/canvas/useCanvasExecutionSelectionRecovery.ts#L153-L165).

Existing test coverage validates localized Spanish fallback only when `detail` is
`null`.

Source:
[`OperationalDrawerSelectionRecoveryView.test.tsx`](https://github.com/dunay2/dvt/blob/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01/apps/web/src/app/components/shell/OperationalDrawerSelectionRecoveryView.test.tsx#L95-L133).

### Product impact

A forbidden, format, transport, proxy, or repository error with a non-empty message can:

- bypass localized copy;
- display English text in Spanish locale;
- leak endpoint or implementation details;
- make error wording inconsistent across adapters;
- turn infrastructure messages into an accidental user contract.

### Required fix

The user-facing surface should always render the stable localized message for
`authority_refresh_failed`.

Diagnostic detail should be:

- omitted from the user read model, or
- normalized to a bounded safe diagnostic code, or
- routed to structured telemetry/logging with redaction.

Do not solve this by translating arbitrary `Error.message` strings.

### Required test

Add a presentation or integration test with:

- locale `es`;
- failure code `authority_refresh_failed`;
- non-empty detail such as `Request to /workspace/analysis failed (403)`;
- assertion that the localized Spanish failure is rendered;
- assertion that the technical detail is not rendered.

## Product gaps and defects

## P0/P1 release integrity

### Duplicate release semantics

The same feature is counted twice in proposed `0.5.0` notes. Release output is part of
the product contract and must be deterministic and semantically deduplicated.

### No green release candidate

Every observed release-head workflow is blocked as `action_required`. Merging without
successful checks would bypass the repository's stated quality model.

### Exact-main evidence gap

The release base tree lacks visible commit-bound CI evidence. A merge commit can differ
from its PR head through merge mechanics or later branch movement; release proof should
attach to what is actually shipped.

## P1 user-facing localization and diagnostic leakage

The recovery UI currently prefers technical detail over stable localized copy. This is
both a regression against the PR's i18n claim and an unsafe boundary between adapters
and presentation.

## P1 workspace inventory contradiction

The existing architecture reviews identified a capability mismatch:

- dbt import inspection accepts projects significantly larger than the workspace file
  surface can list or read;
- workspace operations can truncate or reject content without expressing a complete
  capability state to the user;
- an accepted project can therefore become only partially operable after import.

Required product behavior:

- pagination or cursor-based complete inventory;
- explicit `truncated`/`incomplete` state if a hard limit remains;
- aligned file-count and file-size contracts across import, workspace, editor, and
  execution;
- deterministic errors before acceptance, not after the user begins authoring;
- tests for projects at, below, and above every limit.

This remains the first product vertical after release repair because all later editing
and execution claims depend on honest workspace authority.

## P1 missing file-authoritative edit transaction

The file-authoritative dbt Canvas can project project files into a graph and can open
project code, but it remains primarily read-only from the Canvas semantic surface.

The next vertical should not attempt arbitrary SQL editing. It should implement one
bounded, lossless transaction:

> Edit a model description from Canvas and persist it into the correct `schema.yml`
> entry without losing comments, anchors, ordering, unknown keys, or formatting outside
> the intended edit.

Minimum transaction:

1. read authoritative file and revision;
2. locate exact model entry;
3. produce an explicit diff;
4. write with compare-and-swap expected revision;
5. report conflict without overwriting external changes;
6. conditionally revert only if the written revision is still current;
7. re-analyze project;
8. refresh graph projection;
9. Preview and Run against the same saved revision;
10. reopen project and prove round trip.

## P1 authority-unclear Code behavior

The product currently conflates at least three states:

1. authoritative SQL exists in a project file;
2. SQL can be generated as a preview from a graph-authored draft;
3. no SQL can yet be generated because dependencies or source authority are missing.

The Code action must expose the state explicitly.

Recommended UI contract:

- **Authoritative file** — show path, revision, and editable/read-only state;
- **Generated preview** — show predicted path and mark content as not persisted;
- **Unavailable** — explain the missing source/dependency and disable misleading
  editing affordances.

Do not present an empty Code pane as though the product lost existing code.

## P2 selection-recovery completeness

The new recovery feature handles unavailable roots and workspace fallback, but several
edge cases need explicit proof:

- initial authority load must not temporarily classify valid selections as unavailable;
- visible but non-executable roots need an understandable remediation path;
- refresh success must reclassify against the refreshed authority, not stale closure
  data;
- concurrent refreshes must not apply an older completion over a newer one;
- a revision label must not conflate analysis revision with canonical plan revision;
- recovery receipts must identify exactly which intent changed and why;
- file-authoritative and authored-graph controllers must behave consistently.

The current implementation has sequence protection, which is positive. The remaining
risk is semantic freshness of the data used after refresh.

## P2 test coverage gaps

The protected Cypress proof validates a valuable path:

- select a dbt model;
- delete the selected root;
- remain fail-closed;
- explicitly switch to workspace scope;
- regain Preview readiness.

Missing protected paths include:

- refresh-analysis success;
- refresh-analysis failure with localized safe copy;
- initial loading state;
- non-executable visible root;
- file-authoritative dbt project;
- external file revision change during recovery;
- stale completion from overlapping refresh attempts;
- exact selection persistence after page reopen.

These should be added incrementally, not as another large governance program.

## Architectural drift

## Change amplification

A bounded recovery interaction changed 64 files and added six Planning DB migrations.
That ratio indicates excessive coupling among:

- runtime behavior;
- UI registration;
- capability truth;
- planning records;
- evidence registration;
- governance projections;
- release documentation.

Recommended architecture response:

- keep runtime contracts explicit;
- consolidate generated registration into fewer source authorities;
- derive evidence indexes instead of manually duplicating them;
- avoid a new migration for every small UI capability when an append-only capability
  ledger or generated manifest can express the same truth;
- measure change amplification per feature PR.

Suggested metric:

```text
amplification ratio = changed governance/evidence files / changed product files
```

Track the ratio, but do not block urgent fixes on metric implementation.

## Authority proliferation

The repository has multiple potentially competing truth surfaces:

- code contracts;
- Planning DB migrations;
- proposal documents;
- capability projections;
- evidence registries;
- release notes;
- recurring architecture review PRs.

Every additional authority increases reconciliation cost. The repository should define
for each concern:

- one canonical source;
- generated projections;
- validation direction;
- deprecation process;
- owner.

No document should be treated as canonical merely because it is newer.

## Review PR accumulation

Recurring review work is producing multiple open Markdown-only PRs. This creates:

- stale implementation instructions;
- duplicated CI consumption;
- noisy PR queues;
- ambiguity over which report supersedes which;
- temptation to merge reviews instead of product work.

Recommended governance:

- maintain one open living review PR, or
- close the previous review when a successor is opened, or
- label older reviews `superseded` and link the successor;
- never keep more than one current-state review as implementation authority.

This report does not close existing PRs because its requested scope is documentation
creation only.

## Release governance drift

The repository already emphasizes deterministic contracts, yet release generation can
still duplicate semantic entries and produce a candidate with no runnable checks.
Release generation should be governed with the same rigor as runtime planning:

- semantic deduplication;
- exact-tree verification;
- required authorization state;
- machine-readable release evidence;
- rejection of empty or jobless required workflows.

## Recommended next route

## Phase 0 — release repair

Target: a small hotfix PR plus corrected release PR.

### Deliverables

- localized recovery-failure rendering;
- removal or isolation of raw diagnostic detail;
- regression tests;
- resolved #1983 thread;
- deduplicated release notes;
- duplicate guard;
- green required workflows;
- exact shipped-tree evidence.

### Exit criteria

- no unresolved non-outdated P1/P2 thread on shipped code;
- no raw transport message rendered in recovery UI;
- one changelog entry for the feature;
- every required release workflow concludes `success` or an explicitly approved
  non-applicable state;
- release commit or tag has visible evidence.

## Phase 1 — workspace inventory truth

Target: every imported project is fully operable or rejected before acceptance.

### Deliverables

- complete paginated inventory;
- aligned size/count limits;
- explicit incomplete state;
- UI messaging for limits;
- API contract updates;
- unit, integration, and boundary tests;
- no silent truncation.

### Exit criteria

- project acceptance implies workspace visibility of every relevant file;
- editor, analysis, Preview, and Run agree on the same project boundary;
- limit tests are deterministic and documented.

## Phase 2 — first complete file-authoritative edit

Target: edit one model description in `schema.yml` through Canvas.

### Deliverables

- locate exact model and YAML entry;
- lossless patch strategy;
- diff preview;
- expected-revision write;
- conflict UI;
- conditional revert;
- re-analysis;
- graph refresh;
- Preview/Run revision binding;
- reopen proof.

### Exit criteria

- no unrelated YAML content changes;
- external concurrent modification cannot be overwritten silently;
- displayed graph and saved file converge;
- Preview and Run receipts identify the saved revision;
- reopening reproduces the edited description.

## Phase 3 — authority-honest Code UX

Target: Code accurately communicates whether content is authoritative, generated, or
unavailable.

### Deliverables

- explicit authority badge/state;
- file path and revision where applicable;
- generated preview banner and predicted path;
- unavailable reason;
- no misleading empty editor;
- navigation from node to project file.

### Exit criteria

- users can always answer where code comes from;
- generated content cannot be mistaken for persisted authority;
- missing code has an actionable explanation.

## Phase 4 — reduce amplification

Target: make future verticals cheaper without delaying current product delivery.

### Deliverables

- authority map;
- generated registry consolidation;
- migration policy for capability metadata;
- review supersession protocol;
- change-amplification measurement;
- release semantic-deduplication policy.

### Exit criteria

- small features no longer require dozens of governance edits;
- one canonical authority exists per concern;
- stale reviews cannot compete as current instructions.

## Explicit non-goals for the next implementation PRs

Do not expand into:

- arbitrary SQL editor semantics;
- scheduler or deployment orchestration;
- backfill UX;
- new DSL design;
- broad plugin marketplace work;
- multi-worker scaling;
- additional Planning DB capability phases;
- new governance taxonomies;
- visual redesign unrelated to the blocked transactions.

These may matter later. They do not unblock the current release or prove the central
graph/file round trip.

## Suggested implementation decomposition

### PR A — recovery localization hotfix

Expected scope:

- recovery presentation;
- safe diagnostic model;
- focused tests;
- review-thread resolution.

Keep this PR small. It should not include release files.

### PR B — release generation correction

Expected scope:

- deduplicate changelog;
- release duplicate validation;
- corrected manifest/package version changes;
- workflow authorization and rerun evidence.

### PR C — workspace inventory contract

Expected scope:

- repository/API pagination;
- explicit limits and completeness state;
- UI integration;
- boundary tests.

Avoid combining this with authoring.

### PR D — `schema.yml` description edit

Expected scope:

- one field;
- one lossless patch path;
- CAS conflict;
- diff/revert/re-analysis;
- Preview/Run revision proof.

Do not generalize to every YAML property before the transaction is complete.

### PR E — Code authority states

Expected scope:

- authoritative file;
- generated preview;
- unavailable state;
- path/revision display;
- focused UX tests.

## Acceptance checklist for the other GPT

Before claiming release repair complete:

- [ ] raw `Error.message` is not rendered to users;
- [ ] Spanish non-empty-detail regression test exists;
- [ ] #1983 P2 thread is resolved after code lands;
- [ ] #1984 changelog has one feature entry;
- [ ] duplicate release-note guard exists;
- [ ] release workflows are green;
- [ ] exact release tree has visible evidence;
- [ ] no unrelated refactor is included.

Before claiming workspace truth complete:

- [ ] inventory is complete or explicitly incomplete;
- [ ] import and workspace limits agree;
- [ ] no silent truncation exists;
- [ ] oversized project behavior is deterministic;
- [ ] UI reports actionable limit state.

Before claiming first authoring round trip complete:

- [ ] exact YAML entry is edited;
- [ ] unrelated YAML is byte- or structure-preserved according to the declared lossless
  contract;
- [ ] diff is shown before write;
- [ ] expected revision is enforced;
- [ ] conflict is recoverable;
- [ ] revert is conditional;
- [ ] graph re-analysis occurs;
- [ ] Preview uses saved revision;
- [ ] Run uses saved revision;
- [ ] reopen proves persistence.

## Final decision

DVT has a solid direction in explicit authority, fail-closed execution selection,
project-file projection, and deterministic planning. The current risk is not lack of
architecture. It is failure to close a small release defect while continuing to add
more governance and review artifacts.

The repository should now:

1. repair and prove release `0.5.0`;
2. make accepted workspace authority honest;
3. ship one complete dbt file-authoritative editing transaction;
4. clarify Code authority;
5. reduce governance amplification after product proof exists.

Until the release localization defect, duplicate changelog, `action_required` checks,
and exact-tree evidence gap are fixed, #1984 is not merge-ready.

Nothing in this review authorizes a merge.
