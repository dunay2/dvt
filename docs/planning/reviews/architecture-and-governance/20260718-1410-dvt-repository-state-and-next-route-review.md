---
title: DVT Repository State, Release Blockers, and Next Route Review — 2026-07-18 14:10
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
supersedes_review_pr: 1986
---

# DVT Repository State, Release Blockers, and Next Route Review — 2026-07-18 14:10

## Executive verdict

`main` is still at
[`ec47025c1f1e232a7aff8a6d20cd59bb87b59a01`](https://github.com/dunay2/dvt/commit/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01),
the merge commit for
[#1983](https://github.com/dunay2/dvt/pull/1983), and `package.json` still declares
version `0.4.0`.

No new product implementation has landed since the previous review. The repository is
not blocked by lack of architecture analysis. It is blocked by a small set of concrete,
mechanically verifiable corrections that remain untouched:

1. merged PR #1983 still has one unresolved, non-outdated P2 review thread;
2. the selection-recovery UI still prefers raw `Error.message` detail over localized
   user copy;
3. release PR [#1984](https://github.com/dunay2/dvt/pull/1984) still duplicates the
   same feature in the `0.5.0` changelog;
4. all six release-head workflows remain `action_required`, and the inspected PR
   Quality Gate run still contains no jobs;
5. the exact current `main` SHA has no connector-visible workflow runs or combined
   status entries;
6. the accepted-dbt-project and workspace-file capabilities remain contradictory;
7. file-authoritative dbt Canvas remains read-only, so the promised graph/code
   round trip has not yet produced one complete user edit transaction;
8. documentation review PRs are accumulating faster than implementation work.

The fail-closed execution-selection recovery added by #1983 is directionally correct
and should be preserved. The release is nevertheless not ready. Do not merge #1984 in
its current state.

The recommended route is unchanged but should now be enforced as a narrow delivery
sequence:

1. repair the merged recovery defect and release generation;
2. make workspace inventory truthful for every dbt project the importer accepts;
3. deliver one lossless, revision-bound `schema.yml` model-description edit;
4. prove Preview and Run consume the exact saved revision;
5. make Code UX distinguish authoritative source, generated preview, and absent code;
6. only then resume broader platform, scheduling, deployment, scale, or governance
   expansion.

## Primary instruction to the implementation agent

Create implementation work in this exact order.

### Work packet A — release repair

1. Change selection-recovery failure presentation so end users always receive the
   localized `selectionRecoveryRefreshFailureMessage`.
2. Keep technical diagnostics out of the visible message. If retained, place them in a
   structured diagnostic/logging rail with explicit sanitization.
3. Add a Spanish-locale regression test where the rejected refresh contains a non-empty
   technical `Error.message`.
4. Open a focused code PR and resolve the active #1983 thread only after the fix and
   tests exist.
5. Regenerate or correct release PR #1984 so the feature appears exactly once.
6. Add a deterministic duplicate-release-note check that catches merge commit plus
   parent commit double counting.
7. Authorize or otherwise unblock the six release workflows and obtain successful
   checks on the final release head.
8. Ensure the exact commit eventually tagged and published has visible CI/release
   evidence.

### Work packet B — workspace inventory truth

1. Replace silent recursive truncation with an explicit paginated or cursor-based
   inventory contract.
2. Return completeness metadata: `truncated`, continuation cursor, effective limits,
   and a known total or explicit unknown total.
3. Derive dbt import and workspace capabilities from one policy authority.
4. Define deliberate behavior for files above the interactive editor limit rather than
   reporting them as invalid workspace paths.
5. Prove 501+ files, a project near 10,000 files, and a file above 1 MB.

### Work packet C — first complete dbt authoring transaction

Implement one deliberately small vertical: edit a model description in `schema.yml`
from Canvas and round-trip it back through authoritative project files.

The vertical is not complete unless it includes:

- source-file and YAML-node provenance;
- minimal lossless patching, preserving unrelated YAML content and ordering where the
  chosen library permits it;
- before/after diff preview;
- compare-and-swap using the exact expected content revision;
- explicit conflict response and user recovery;
- conditional revert if downstream analysis fails;
- project re-analysis after save;
- graph projection refresh from the new authoritative revision;
- Preview and Run proven against that revision;
- reopen proof showing the persisted value from files, not stale client state.

Do not broaden the first transaction to model SQL editing, columns, tests, macros,
multiple YAML documents, or mass refactoring until the single-description transaction
is complete and mechanically proven.

## Review scope and evidence limits

This review inspected through the GitHub connector:

- repository metadata and default branch;
- recent commits;
- all visible open pull requests;
- merged product PR #1983;
- release PR #1984 metadata, diff, checks, reviews, and review threads;
- current and superseded documentation review PRs;
- exact-main and PR-head CI visibility;
- the unresolved inline review thread on #1983;
- current source for recovery failure rendering;
- current dbt import limits;
- current workspace listing, read, write, and compare-and-swap behavior;
- current file-authoritative Canvas mutation policy.

No repository code or test suite was executed locally. Runtime conclusions are limited
to committed code, pull-request metadata, review state, and GitHub Actions evidence.

The branch-search connector did not provide a reliable complete branch inventory.
Relevant unmerged work is therefore reconstructed from open PR heads and recent commit
history. This report does not claim that an unenumerated private or unindexed branch
does not exist.

## Current repository snapshot

| Signal | Observed state |
| --- | --- |
| Default branch | `main` |
| Current `main` | [`ec47025c`](https://github.com/dunay2/dvt/commit/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01) |
| Package version on `main` | `0.4.0` |
| Latest merged product PR | [#1983](https://github.com/dunay2/dvt/pull/1983) |
| Latest merged capability | Explicit fail-closed dbt execution-selection recovery |
| Open release PR | [#1984](https://github.com/dunay2/dvt/pull/1984), proposed `0.5.0` |
| Open review PRs before this report | #1981, #1982, #1985, #1986 |
| Exact-main workflow runs returned | None |
| Exact-main combined statuses returned | None |
| Active unresolved product review threads | One on merged #1983 |
| Release-head workflows | Six `action_required` |
| Release PR reviews | None submitted |
| New product-code progress since 08:09 review | None visible |

## Delta since the 08:09 review

### Changed

The documentation-only head for PR
[#1986](https://github.com/dunay2/dvt/pull/1986),
[`40739cfaebc87aa144b1544691a64d909c611545`](https://github.com/dunay2/dvt/commit/40739cfaebc87aa144b1544691a64d909c611545),
now has completed workflow results:

| Workflow | Conclusion |
| --- | --- |
| PR Quality Gate | success |
| CI - Code Quality | success |
| Test Suite | skipped |
| Contracts & Determinism | skipped |
| CodeQL | skipped |
| Dependency Review | skipped |

This is appropriate evidence for a Markdown-only PR. It does not validate a new product
or release tree because no product tree changed.

### Not changed

- `main` is unchanged;
- version `0.4.0` remains on `main`;
- the #1983 P2 thread remains unresolved and non-outdated;
- the raw diagnostic/localization defect remains in current source;
- #1984 still contains duplicate feature notes;
- #1984 still has six `action_required` workflow conclusions;
- the inspected release PR Quality Gate run still has zero jobs;
- #1984 still has no submitted review or inline review thread;
- exact-main CI evidence remains absent;
- no product PR is visible for workspace inventory truth;
- no product PR is visible for file-authoritative dbt editing;
- no product PR is visible for authority-honest Code behavior.

### Governance queue worsened

Before this report, four open documentation-only review PRs existed:

- [#1981](https://github.com/dunay2/dvt/pull/1981), reviewing `main@4c98026c`;
- [#1982](https://github.com/dunay2/dvt/pull/1982), also reviewing `main@4c98026c`;
- [#1985](https://github.com/dunay2/dvt/pull/1985), reviewing `main@ec47025c`;
- [#1986](https://github.com/dunay2/dvt/pull/1986), reviewing the same current main.

PRs #1981 and #1982 are stale as current-state authorities. PR #1985 is superseded by
#1986, and #1986 is superseded by this report. Leaving all of them open without an
explicit archival or closure protocol creates competing planning authorities and
increases the chance that another agent acts on an obsolete snapshot.

Recommended governance rule:

> Keep one open current-state review PR. Close older review PRs as superseded, with a
> link to the replacement. Preserve merged or closed reports as historical evidence,
> not concurrent implementation authority.

## Recent commit assessment

The current mainline sequence remains:

1. [`ec47025c`](https://github.com/dunay2/dvt/commit/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01)
   — merge PR #1983;
2. [`fa240f8`](https://github.com/dunay2/dvt/commit/fa240f843cda5adb569923494034fd3c3f7a64a6)
   — add explicit dbt execution-selection recovery;
3. [`4c98026`](https://github.com/dunay2/dvt/commit/4c98026c0dd2e2b9e4bbcc126033b34f8afa2b5c)
   — merge release `0.4.0`;
4. [`6208989`](https://github.com/dunay2/dvt/commit/620898938561adb4e6e2172c7db83a884c368813)
   — prepare release `0.4.0`.

No later product commit is visible on `main`.

### Assessment of PR #1983

The feature made a valid product correction:

- stale or invalid explicit execution selection is fail-closed;
- unavailable and non-executable requested roots are surfaced separately;
- selection is not silently widened to workspace scope;
- discard, workspace-scope replacement, and authority refresh are explicit commands;
- recovery is shown in the operational drawer;
- English and Spanish copy exists;
- the branch had six successful observed workflows and a protected-runtime Cypress
  proof.

Those decisions should remain.

However, the implementation changed 64 files, added 3,771 lines, removed 108 lines,
and added six Planning DB migrations for one bounded recovery interaction. This is
architectural amplification. A small interaction requires changes across runtime,
contracts, web read models, copy, tests, evidence, registries, governance records, and
multiple migrations.

The response should not be to remove safety or evidence. The response should be to
reduce duplicated authorities and make registration/mechanization derive from fewer
canonical declarations.

## Open pull-request assessment

| PR | State | Scope | Decision |
| --- | --- | --- | --- |
| [#1984](https://github.com/dunay2/dvt/pull/1984) | Open, non-draft, mergeable | Release `0.5.0` | Block; do not merge as-is |
| [#1986](https://github.com/dunay2/dvt/pull/1986) | Open, draft, mergeable | Documentation review | Superseded by this report |
| [#1985](https://github.com/dunay2/dvt/pull/1985) | Open, draft, mergeable | Documentation review | Superseded by #1986 and this report |
| [#1982](https://github.com/dunay2/dvt/pull/1982) | Open, draft, mergeable | Documentation review of old main | Stale; close as superseded |
| [#1981](https://github.com/dunay2/dvt/pull/1981) | Open documentation draft | Documentation review of old main | Stale; close as superseded |

## Release PR #1984

Current metadata:

- head branch: `release-please--branches--main--components--dvt`;
- head SHA:
  [`8800bafde2cea558da2c3229a456879af04f12bc`](https://github.com/dunay2/dvt/commit/8800bafde2cea558da2c3229a456879af04f12bc);
- base: `main@ec47025c`;
- one commit;
- three changed files;
- ten additions and two deletions;
- requested reviewer: `dunay2`;
- no submitted reviews;
- no inline review threads.

The changed files are:

- `.release-please-manifest.json`;
- `CHANGELOG.md`;
- `package.json`.

The proposed changelog records one semantic feature twice:

```markdown
* **web:** Add explicit DBT execution selection recovery (ec47025)
* **web:** Add explicit DBT execution selection recovery (fa240f8)
```

The first reference is the merge commit; the second is its feature parent. Publishing
both implies two separately delivered capabilities and makes release history noisy and
unreliable.

### Release CI

All six observed workflow runs on the release head are completed with
`action_required`:

| Workflow | Conclusion |
| --- | --- |
| Dependency Review | action_required |
| Contracts & Determinism | action_required |
| PR Quality Gate | action_required |
| CI - Code Quality | action_required |
| CodeQL | action_required |
| Test Suite | action_required |

The inspected PR Quality Gate run returns no jobs. This proves execution did not reach
normal job validation. The connector evidence does not expose the exact approval or
policy reason, so the report must not invent one. A maintainer must inspect the Actions
UI, authorize or correct the trigger, and rerun the final release head.

### Release acceptance criteria

Do not merge #1984 until all are true:

- the recovery localization/diagnostic leak is fixed on the release base;
- the active #1983 review thread is resolved with linked code evidence;
- the changelog contains one semantic entry for the feature;
- a duplicate-note guard is present or release generation is corrected upstream;
- every required release workflow reaches a successful terminal result;
- package, manifest, changelog, tag, and release versions agree;
- the exact published commit has visible evidence.

## Active bug and unresolved review thread

Merged PR #1983 has one unresolved, non-outdated P2 thread on:

[`apps/web/src/app/components/shell/OperationalDrawerSelectionRecoveryView.tsx`](https://github.com/dunay2/dvt/blob/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01/apps/web/src/app/components/shell/OperationalDrawerSelectionRecoveryView.tsx#L116-L119)

Current presentation:

```tsx
{model.failure.detail ?? messages.selectionRecoveryRefreshFailureMessage}
```

A non-empty `failure.detail` wins over localized copy. The recovery rail populates that
detail from rejected `Error.message` values. Therefore:

- Spanish users can receive English text;
- transport, authorization, parsing, or repository detail can leak into the UI;
- the feature's claim that user-facing messages resolve through the Canvas copy rail is
  false for this path;
- tests that cover only `detail: null` do not protect the real failure mode.

### Required fix

The user-visible component should render only localized, stable copy. A safe model is:

```ts
type SelectionRecoveryFailure = Readonly<{
  code: 'authority_refresh_failed';
  correlationId?: string;
}>;
```

Render the localized message from `code`. Send sanitized diagnostic detail to logging or
a developer-only diagnostic surface. Do not render arbitrary `Error.message` in the
operational drawer.

### Regression proof

Add at minimum:

- unit test: Spanish locale plus non-empty technical error still renders Spanish copy;
- unit test: technical detail is absent from visible text;
- hook test: failure code is stable and does not expose arbitrary error strings;
- protected E2E or integration proof for rejected authority refresh, if the existing
  protected environment can deterministically induce it.

## CI evidence gap on exact `main`

For
[`ec47025c1f1e232a7aff8a6d20cd59bb87b59a01`](https://github.com/dunay2/dvt/commit/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01),
the connector returns:

- no pull-request-associated workflow runs;
- no combined status entries.

This does not prove the code is failing. The feature parent had green PR checks. It does
mean that release evidence is attached to a different commit than the exact merge tree
currently published on the default branch.

Recommended correction:

- run a post-merge validation or trusted release workflow on the exact default-branch
  SHA;
- produce a machine-readable evidence summary linked to that SHA;
- require release tooling to consume that evidence rather than infer safety from a PR
  parent;
- make merge queue or protected-branch behavior preserve tested-tree identity where
  practical.

## Product gap P1 — accepted projects can exceed the workspace product surface

The dbt import inspector defaults to:

```text
maxProjectFiles        10,000
maxInspectedFiles     100,000
maxProjectBytes    50,000,000
maxDirectories          5,000
maxDepth                    64
```

Evidence:
[`LocalDbtProjectImportInspector.ts`](https://github.com/dunay2/dvt/blob/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01/apps/api/src/infrastructure/dbt/LocalDbtProjectImportInspector.ts#L37-L73).

The workspace file repository defaults to:

```text
MAX_LISTED_FILES       500
MAX_FILE_BYTES     1,000,000
```

Evidence:
[`LocalWorkspaceFileRepository.ts`](https://github.com/dunay2/dvt/blob/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01/apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts#L39-L75).

The recursive listing silently stops when it reaches the count. It returns a plain tree
without a cursor, completeness flag, total, omitted count, or diagnostic:

[`LocalWorkspaceFileRepository.ts`](https://github.com/dunay2/dvt/blob/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01/apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts#L161-L207).

Reads and writes above 1 MB are rejected as `InvalidWorkspacePathError`, even when the
path is valid and the real limitation is content size:

[`LocalWorkspaceFileRepository.ts`](https://github.com/dunay2/dvt/blob/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01/apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts#L77-L108).

### User impact

A project can be accepted and analyzed while:

- resources after the first 500 files are invisible in Code;
- a legitimate large SQL, YAML, Markdown, or seed file cannot be opened;
- Canvas can reference resources absent from the workspace tree;
- users cannot distinguish a complete project from a truncated one;
- future editing and conflict handling operate against an incomplete view.

### Required contract

Use an explicit inventory result, for example:

```ts
type WorkspaceFileInventoryPage = Readonly<{
  entries: readonly WorkspaceFileEntry[];
  nextCursor: string | null;
  truncated: boolean;
  totalKnown: number | null;
  effectiveLimits: Readonly<{
    maxPageSize: number;
    maxInteractiveFileBytes: number;
  }>;
}>;
```

### Acceptance criteria

- deterministic paging or cursor continuation;
- stable ordering across pages;
- no silent omission;
- import and workspace limits share one policy authority;
- API and web display completeness state;
- 501-file and near-10,000-file tests;
- explicit behavior for files above the interactive editing limit;
- analyzer, Canvas, and Code agree on project completeness.

## Product gap P1 — no complete file-authoritative dbt edit

The file-authoritative Canvas controller still explicitly rejects semantic mutation:

[`useDbtProjectFileCanvasController.ts`](https://github.com/dunay2/dvt/blob/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01/apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts#L42-L45)

```ts
throw new Error(
  `${commandName} is unavailable because dbt project files are the Canvas semantic authority.`
);
```

That is the correct fail-closed behavior for an incomplete authoring implementation.
It is also direct evidence that graph/code bidirectionality remains a product plan, not
a delivered transaction.

DVT already has valuable primitives:

- project-file authority;
- content hashes;
- compare-and-swap writes;
- atomic replacement;
- dbt project analysis;
- graph projection;
- Preview and Run provenance.

The missing value is orchestration of those primitives into one user-visible edit.

### First vertical acceptance criteria

For a model-description edit in `schema.yml`:

1. user opens a file-authoritative model in Canvas;
2. current description and source provenance are shown;
3. user edits the description;
4. UI shows a file diff;
5. save uses exact expected content SHA;
6. stale revision produces an explicit conflict without overwrite;
7. successful save re-analyzes the project;
8. graph refreshes from the new analysis revision;
9. Preview uses that revision;
10. Run uses the approved plan for that revision;
11. reopen reads the persisted description from files;
12. unrelated YAML content is preserved;
13. analysis failure triggers a safe, conditional revert or leaves a clearly recoverable
    state with complete provenance.

## Product gap P1 — Code action is authority-unclear

For file-backed nodes, Code can open the authoritative project file. For graph-draft
nodes, SQL may not exist until projection or Preview generates workspace artifacts.
The current empty state says:

```text
No SQL or generated code is recorded for this node.
```

That message is technically true but does not explain the authority state. A user sees
a Code action and reasonably expects code.

### Required behavior

Code should explicitly classify the content:

- **Authoritative file** — show path and exact content revision;
- **Generated preview** — show generated SQL, target path, generator revision, and
  `not persisted` status;
- **Unavailable** — state why code cannot yet be generated, such as missing upstream
  source/model connection;
- **Conflict/stale** — show that graph and file revisions diverged and require refresh.

Do not display generated SQL as if it were authoritative source. Do not display an empty
editor without a state explanation.

## Architectural drift

## AD-01 — mechanization amplification

One bounded recovery interaction required 64 files and six Planning DB migrations. The
repository has strong governance but pays a high change tax.

Recommended direction:

- define capability and ownership metadata once;
- derive registries, evidence tables, documentation indexes, and validations where
  possible;
- separate mandatory runtime correctness evidence from descriptive planning metadata;
- measure changed authorities per user story and treat sustained growth as architecture
  debt.

## AD-02 — release automation counts topology instead of semantic change

The `0.5.0` changelog treats merge and feature-parent commits as separate semantic
features. Release generation should operate on normalized semantic entries, not raw
commit topology.

Recommended guard:

- normalize type, scope, and description;
- collapse parent/merge duplicates;
- fail CI if identical normalized release entries appear in the same section;
- add a fixture covering non-squash merge history.

## AD-03 — review documents are becoming an active queue

Architecture review documents are useful evidence. Five concurrent near-duplicate draft
reviews are not. The current process creates planning work faster than implementation
work.

Recommended policy:

- one current review PR;
- each new review explicitly supersedes and closes the previous review PR;
- delta reports should be short when no product delta exists;
- repeated unchanged P1 findings should become assigned implementation issues or PRs,
  not continue expanding prose;
- automation should stop creating new review branches if no material repository or CI
  delta exists, unless the explicit task requires a periodic evidence snapshot.

## Bugs and regression risks

| ID | Severity | Finding | State |
| --- | --- | --- | --- |
| BUG-01 | P1 release blocker | Raw refresh `Error.message` overrides localized recovery copy | Confirmed on `main` |
| BUG-02 | P1 release blocker | `0.5.0` changelog duplicates one semantic feature | Confirmed in #1984 |
| BUG-03 | P1 delivery blocker | All six release workflows are `action_required` with no normal job execution evidence | Confirmed on release head |
| GAP-01 | P1 product correctness | Import accepts projects larger than workspace can enumerate or edit | Confirmed on `main` |
| GAP-02 | P1 product capability | File-authoritative Canvas has no complete mutation transaction | Confirmed on `main` |
| GAP-03 | P1 UX truth | Code action does not clearly distinguish authority/generated/absent states | Confirmed design gap |
| EVID-01 | P2 governance | Exact `main` SHA has no connector-visible CI/status evidence | Confirmed evidence gap |
| ARCH-01 | P2 maintainability | Small feature has disproportionate authority and migration fan-out | Confirmed by #1983 scale |
| GOV-01 | P2 planning | Multiple superseded review PRs remain concurrently open | Confirmed |

## Recommended next route

## Phase 0 — repair and release

Target: one focused implementation PR plus corrected release PR.

Exit criteria:

- localized recovery failure is safe under non-empty technical errors;
- #1983 P2 thread resolved;
- release notes deduplicated;
- duplicate guard present;
- all required release checks successful;
- exact published commit has evidence;
- `0.5.0` release contains one truthful feature entry.

## Phase 1 — honest workspace inventory

Target: one shared capability policy and an explicit paginated inventory contract.

Exit criteria:

- no silent truncation;
- large-project completeness visible in API and web;
- 501+ file proof;
- deliberate oversized-file behavior;
- Canvas, analyzer, and Code project views agree.

## Phase 2 — one revision-bound dbt edit

Target: model description in `schema.yml`.

Exit criteria:

- diff, CAS, conflict, save, re-analysis, refresh, Preview, Run, reopen;
- exact revision propagated end-to-end;
- unrelated YAML preserved;
- failure and revert behavior proven.

## Phase 3 — authority-honest Code UX

Target: show authoritative, generated, absent, stale, and conflicted code states.

Exit criteria:

- source type and revision visible;
- generated SQL never masquerades as persisted source;
- file path and intended generated path visible;
- missing generation prerequisites actionable.

## Phase 4 — hardening after product proof

Only after Phases 0–3:

- accessibility audit and keyboard graph workflows;
- large-graph virtualization and performance budgets;
- deterministic canary and nightly integration coverage;
- multi-worker ordering and outbox scale;
- operational recovery drills;
- dependency and schema-library convergence;
- scheduling, deployment, backfill, and broader orchestration capabilities.

## Explicit non-goals for the next implementation PR

Do not combine the release repair with:

- new scheduler features;
- deployment orchestration;
- backfill support;
- broad dbt SQL editing;
- macro editing;
- visual column/test authoring;
- a new DSL;
- another large Planning DB mechanization phase;
- cosmetic Canvas redesign unrelated to the confirmed blockers.

A narrow PR is required so the release defect can be reviewed, tested, and shipped
without introducing new authority surfaces.

## Suggested PR sequence

1. `fix/web-selection-recovery-localized-failure`
   - safe copy rail;
   - diagnostic separation;
   - regression tests;
   - resolve #1983 thread.
2. `fix/release-please-semantic-dedup`
   - duplicate-note guard;
   - release fixture;
   - regenerate #1984 or replace its head cleanly.
3. `feat/workspace-file-inventory-pagination`
   - shared capability policy;
   - pagination/completeness contract;
   - API/web/E2E proofs.
4. `feat/dbt-schema-model-description-roundtrip`
   - first complete file-authoritative transaction.
5. `fix/dbt-code-authority-state`
   - authoritative/generated/absent/stale Code UX.

Each PR should be independently reversible and should avoid unrelated governance churn.

## Evidence links

- Repository: https://github.com/dunay2/dvt
- Current main: https://github.com/dunay2/dvt/commit/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01
- Merged selection recovery: https://github.com/dunay2/dvt/pull/1983
- Release PR: https://github.com/dunay2/dvt/pull/1984
- Previous current-state review: https://github.com/dunay2/dvt/pull/1986
- Recovery failure view: https://github.com/dunay2/dvt/blob/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01/apps/web/src/app/components/shell/OperationalDrawerSelectionRecoveryView.tsx
- dbt import limits: https://github.com/dunay2/dvt/blob/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01/apps/api/src/infrastructure/dbt/LocalDbtProjectImportInspector.ts
- workspace limits and CAS: https://github.com/dunay2/dvt/blob/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01/apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts
- file-authoritative Canvas controller: https://github.com/dunay2/dvt/blob/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01/apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts
- dbt round-trip product plan: https://github.com/dunay2/dvt/blob/ec47025c1f1e232a7aff8a6d20cd59bb87b59a01/docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md

## Final decision

DVT should not start another broad product or governance phase. The next agent should
repair the merged recovery defect, make the release mechanically trustworthy, and then
convert the existing dbt authority foundations into one complete editing transaction.

Release PR #1984 is blocked. Nothing in this report authorizes a merge.
