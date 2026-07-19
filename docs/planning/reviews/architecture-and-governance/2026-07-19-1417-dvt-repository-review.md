# DVT Repository Review — 2026-07-19 14:17 WEST

## Review identity

- Repository: `dunay2/dvt`
- Reviewed default branch: `main`
- Exact reviewed `main` SHA: [`eb9a393edb01917be97437a2226c8a91791ff0e4`](https://github.com/dunay2/dvt/commit/eb9a393edb01917be97437a2226c8a91791ff0e4)
- Current `main` delivery: merged PR [#1991 — Complete canvas node authoring truth](https://github.com/dunay2/dvt/pull/1991)
- Active product PR: [#1993 — Preserve DBT code reconciliation truth](https://github.com/dunay2/dvt/pull/1993), head `aabaeb7d5600ba4e924705a6cd65711dadc6a376`
- Active release PR: [#1984 — Release 0.5.0](https://github.com/dunay2/dvt/pull/1984), head `412f6f155134905f3b35e96500ba36abbcbaf3a6`
- Review branch: `agent/dvt-review-20260719-1417`
- Scope: current main, recent commits, open pull requests, CI identity, review threads, release posture, relevant branch delta, product behavior, architecture ownership, authority/revision integrity, tests, governance and next implementation route.
- Change policy for this branch: documentation only.

## Executive verdict

DVT has made a meaningful product advance since the previous review. PR #1991 landed a coherent Canvas authoring vertical: one selected-node presentation truth, mutually exclusive contextual surfaces, editable DBT model SQL, exact project-file projection, canonical draft reconciliation, and protection against in-flight save overwrites. That delivery is real and is now the current `main` baseline.

The next corrective vertical is also materially implemented in PR #1993. It separates file persistence from DBT semantic reconciliation, introduces explicit post-persistence states, verifies the final authoritative file, flushes local Code edits before in-app navigation and workbench changes, prevents transport-detail leakage in selection recovery, and includes a protected live DBT proof. Its six visible PR workflows are green.

However, **PR #1993 is not merge-ready**. A current unresolved P1 review thread reports that the new router navigation-guard specification fails in the checked presentation suite because the test crosses incompatible `Request`/`AbortSignal` realms under jsdom/Node. This is not cosmetic: the new navigation safety boundary is precisely where loss of user edits is being prevented, and the targeted test failure is not represented by the otherwise-green workflow summary.

The release is also not ready. PR #1984 remains open with all six workflow runs in `action_required`, its changelog still contains two entries for the same DBT execution-selection recovery delivery, and there is no workflow evidence attached to the exact current `main` merge SHA. The correct route is therefore:

1. fix and prove PR #1993 on the exact head;
2. close the remaining authority/revision truth gaps described below;
3. merge only after the unresolved review thread and exact targeted test are green;
4. regenerate/rebase the release PR from the resulting `main`;
5. require successful CI on the exact release tree and on the post-merge `main` SHA.

## Material delta since the previous review

### Delivered on `main`

PR #1991 merged at `eb9a393e` and closed the immediate node-presentation defects found during review:

- empty SQL drafts are canonicalized rather than remaining perpetually dirty;
- stale top-level SQL authority no longer shadows the saved DBT model SQL;
- submitted drafts are canonicalized before comparison, preventing normalized values from keeping Apply enabled;
- node cards, contextual workbench, columns, metrics and Code use one selected-node presentation model;
- contextual Canvas surfaces are mutually exclusive;
- DBT model SQL roundtrips through graph authoring, Preview and Project Code;
- newer local edits survive an in-flight authoritative save response.

All three inline review threads on #1991 are resolved.

### Active branch work

PR #1993 is four commits ahead of current `main`, with 38 changed files, 2,888 additions and 201 deletions. The implementation introduces:

- explicit `fresh`, `degraded`, `superseded` and verification-unavailable reconciliation outcomes;
- UI postures for persisted-but-stale, persisted-invalid, persisted-unavailable, verification-unavailable and superseded content;
- final authoritative file verification against the immutable save receipt hash;
- serialized flush before project-file selection and contextual workbench close;
- SPA navigation blocking while the local buffer is genuinely unpersisted;
- a browser-exit warning while unpersisted work exists;
- localized selection-recovery failure copy that does not expose raw adapter/transport detail;
- live proof that invalid SQL is persisted honestly, shown as invalid, corrected, reanalyzed and reopened from the authoritative file.

The first P2 review finding on #1993, which caused file exploration to snap back to the initial path, was fixed in `aabaeb7d5` and the thread is resolved. The second review on that exact head opened a still-unresolved P1 thread against `CodeWorkingTreeNavigationGuard.test.tsx`.

### CI delta

For PR #1993 head `aabaeb7d5600ba4e924705a6cd65711dadc6a376`, the visible workflows all completed successfully:

- PR Quality Gate
- Dependency Review
- Contracts & Determinism
- Test Suite
- CI - Code Quality
- CodeQL

For exact current `main@eb9a393e`, no pull-request-triggered workflow runs are visible. That means the merged tree itself has no directly attached evidence in the current query surface.

For release head `412f6f155134905f3b35e96500ba36abbcbaf3a6`, the same six workflows are all `action_required`, not successful.

## Current open pull requests

### PR #1993 — `fix/web: Preserve DBT code reconciliation truth`

- Base: current `main@eb9a393e`
- Head: `aabaeb7d5600ba4e924705a6cd65711dadc6a376`
- Mergeability reported by GitHub: mergeable
- Draft: no
- CI: six visible workflows successful
- Review state: one resolved P2 thread and one unresolved P1 thread
- Product posture: directionally correct, not merge-ready

### PR #1984 — `chore(main): Release 0.5.0`

- Base: current `main@eb9a393e`
- Head: `412f6f155134905f3b35e96500ba36abbcbaf3a6`
- Mergeability reported by GitHub: mergeable
- Draft: no
- CI: six workflows in `action_required`
- Review threads: none
- Release-note defect: duplicate entries for “Add explicit DBT execution selection recovery”, referring to `ec47025` and `fa240f8`
- Product posture: blocked; regenerate after the reconciliation vertical is accepted

## Review-thread state

- PR #1991: all three threads resolved.
- PR #1983: the former P2 localization/technical-detail thread is now resolved by work on the #1993 branch; the fix is not yet on `main` until #1993 merges.
- PR #1993:
  - resolved P2: scoped Code exploration no longer snaps back to the contextual initial file;
  - unresolved P1: `CodeWorkingTreeNavigationGuard.test.tsx` fails under the presentation vitest configuration with an incompatible `RequestInit.signal`/`AbortSignal` realm and the router remains on `Continue`.
- PR #1984: no inline review threads.

## Findings

### P1 — The navigation-protection boundary is not proven on the current PR head

**Evidence**

The unresolved review thread provides a deterministic command:

```bash
pnpm --filter @dvt/web exec vitest run \
  --config vitest.presentation.config.ts \
  src/app/views/code/CodeWorkingTreeNavigationGuard.test.tsx
```

The failure leaves the router on `Continue` and reports that `RequestInit.signal` is not the expected `AbortSignal`. Yet all six broad workflows on the same head report success.

**Root cause**

The new specification crosses browser/jsdom and Node fetch/router object realms. The test is currently coupled to React Router's `Request` construction rather than proving the application policy through a controlled same-realm adapter. The CI command set does not expose this exact failing lane, or it executes in a different environment that masks the failure.

**User/product impact**

This boundary decides whether an edited SQL/YAML buffer may be abandoned during SPA navigation. A false-positive test or environment-dependent implementation can either lose edits or trap navigation. It is a release-blocking integrity risk.

**Exact owner**

Web application navigation and Code working-tree session ownership.

**Required implementation route**

1. Keep the policy pure: `blocked + flush outcome -> proceed | reset` should be independently testable without constructing cross-realm fetch objects.
2. Keep the React Router adapter thin and test it using the same `Request`, `AbortController` and router environment as the production/test runner.
3. Either install a single intentional fetch/AbortController implementation in the presentation test setup or use a router test harness that does not mix Node and jsdom realms.
4. Add the exact targeted command to a required CI lane or ensure `test:web:presentation` includes the file and fails on regression.
5. Add a browser-level proof that:
   - an unpersisted edit blocks route transition;
   - successful flush proceeds once;
   - conflict/failure resets navigation and preserves the editor;
   - no duplicate route transition occurs.

**Acceptance criteria**

- the exact command above passes repeatedly;
- all existing #1993 workflows rerun successfully on the same repaired head;
- the P1 thread is resolved with commit and test evidence;
- a Cypress/real-browser route transition proves the same behavior.

### P1 — Reconciliation is not bound atomically to the save receipt and project revision

**Evidence**

The #1993 controller callback accepts a `WorkspaceFileSaveReceipt` but names it `_receipt` and ignores it before refetching `ProjectDbtGraphFromFiles`. The graph projection returns an `analysisSha256` and `projectRevision.contentSetSha256`, but the current UI correlation only verifies the edited file against the save receipt after project analysis. It does not prove that the project analysis and the final workspace state are the same revision across all files.

ADR-0060 explicitly establishes project revision and analysis hash as provenance values and requires stable content revisions, compare-and-swap, stale-write rejection, atomic replacement, and an atomic batch mutation boundary for cross-file changes. It also requires preview and runtime bundle identity to remain revision-equal.

**Concrete race**

1. File A is saved and produces receipt hash `A1`.
2. The DBT graph query analyzes project content set `S1`.
3. Another file B changes to `B2` after analysis but before the final read of A.
4. A still matches `A1`, so the UI may report synchronized/fresh even though the current project content set is no longer the analyzed content set.

The single-file final read closes one class of overwrite, but not project-wide revision drift.

**Root cause**

Persistence, project analysis and final verification are three independent reads/writes without a shared version token or snapshot boundary. The UI state model is being asked to infer a transaction that the application/API contract does not yet provide.

**User/product impact**

The product can present “synchronized” or fresh analysis for a workspace revision that is already obsolete. In a multi-tab, multi-user, automation or rapid-edit scenario, Preview/Run may use a different project identity than the one the editor believes it validated.

**Exact owners**

- Project Workspace I/O
- DBT Project Analysis
- Web Code authoring session
- Preview/Run provenance

**Proposed contract route**

Extend existing rails rather than inventing a synonym:

```ts
type WorkspaceFileSaveReceipt = {
  path: WorkspacePath;
  contentSha256: Sha256;
  fileRevision: WorkspaceFileRevision;
  projectRevision: ProjectContentSetRevision;
  lastModified: IsoTimestamp;
};

type ProjectDbtGraphFromFilesQuery = {
  projectRoot: WorkspacePath;
  expectedProjectRevision?: ProjectContentSetRevision;
};

type ProjectDbtGraphReconciliation =
  | { kind: 'fresh'; analyzedRevision: ProjectContentSetRevision; analysisSha256: Sha256 }
  | { kind: 'superseded'; expected: ProjectContentSetRevision; current: ProjectContentSetRevision }
  | { kind: 'degraded'; current: ProjectContentSetRevision; freshness: 'stale-last-valid' | 'invalid' | 'unavailable' };
```

The API should either analyze an immutable snapshot identified by `projectRevision`, or fail/retry when the current project revision has moved. The Web layer should map this domain result to presentation phases; it should not create project truth by correlating unrelated requests.

**Tests**

- red: save A, mutate B between analysis and verification, assert no synchronized result;
- red: save A, supersede A from another client, assert `superseded` with both revisions;
- green: exact receipt/project revision returns fresh analysis and Preview binds the same revision;
- integration: API repository snapshot/CAS behavior;
- live browser: two sessions edit different files and the older analysis cannot claim current freshness.

**Migration and compatibility**

Make revision fields additive first, populate them on all save/query responses, then hard-cut the UI to require them. Do not maintain a fallback that silently treats missing revision as fresh. Rollback should revert the Web hard-cut while preserving additive response fields; any Planning DB migration requires a compensating migration, not destructive rollback.

### P2 — The hard-browser-exit claim is stronger than the implementation

**Evidence**

PR #1993 says it flushes unpersisted Code edits on hard-browser exit. The added `beforeunload` handler only calls `preventDefault()` and sets `returnValue`; it does not call or await `flush`.

**Root cause**

Modern browsers do not guarantee completion of ordinary asynchronous requests during unload. The implementation correctly uses a warning, but the PR/product contract describes guaranteed persistence.

**User/product impact**

Users and reviewers may believe a hard close is durably saved when the actual behavior is “warn while a local edit remains”. Misstated durability is a data-integrity defect even when the code follows browser constraints.

**Required route**

- change the claim and user copy to “warn/block hard exit while unpersisted edits remain”;
- rely on the normal serialized debounce and explicit flush for in-app transitions;
- consider a versioned local recovery buffer for true crash/tab-close recovery;
- do not use `sendBeacon` or `keepalive` as proof of durable conditional save unless the server contract can preserve authentication, idempotency and CAS semantics and the client can later verify the receipt.

**Acceptance criteria**

- PR body, documentation and tests distinguish guaranteed in-app flush from best-effort browser-exit warning;
- a browser test proves the warning appears only for truly unpersisted phases;
- reopening can recover the last durable file and, if implemented, a clearly labelled local recovery draft.

### P2 — Application reconciliation truth is owned by presentation modules

**Evidence**

`CodeWorkingTreeReconciliationOutcome` is defined in `apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts`, while Canvas reconciliation code imports and returns that type. `useDbtProjectFileCanvasController` therefore depends on a Code-view state-machine contract. The graph projection adapter maps a domain/API projection directly into a view-owned outcome.

**Root cause**

The slice was implemented from the UI state machine outward. A product-level reconciliation result became coupled to presentation phases instead of being owned by an application port/domain module.

**Impact**

- view-to-view coupling;
- harder reuse by Project Code, node Code, YAML editors and future column-description editors;
- change amplification when new reconciliation states are introduced;
- risk that UI vocabulary becomes an accidental API/application contract.

**Route**

Move a neutral `WorkspaceFileProjectReconciliationOutcome` to the existing workspace/DBT application port boundary. Keep `CodeWorkingTreeSyncPhase` in the view. Add a one-way mapper:

```text
application outcome -> Code working-tree presentation phase
```

Canvas and Code should both depend on the application outcome, never on each other's view model.

### P2 — The current slice still exhibits high change amplification

**Evidence**

A four-commit Web correction changes 38 files, adds 2,888 lines, and introduces nine consecutive Planning DB migrations (`758` through `766`). The actual product behavior is concentrated in a smaller set of Code/session/reconciliation files, but each review correction creates additional migration and symbol closeout work.

**Fowler diagnosis**

- shotgun surgery across Code, Canvas, tests, live proof, copy and planning records;
- responsibility overload in `CodeView`, which now coordinates file selection, persistence, project reconciliation, final authority verification, navigation blocking, history and presentation;
- governance amplification that can obscure the behavior under review.

**Route**

Before merge, if none of migrations 758–766 has been applied to a shared persistent environment, consolidate them into the smallest repository-compliant migration set. If they have been applied, retain them and record that fact; never rewrite applied migration history.

After this vertical, extract a reusable `CodeWorkingTreeSession`/authoring transaction controller that owns:

- selected file and authoritative revision;
- local buffer;
- serialized conditional persistence;
- project reconciliation;
- navigation disposition;
- recovery/reload commands;
- observable outcome.

`CodeView` should render/query and delegate, not orchestrate the whole transaction.

### P2 — Release 0.5.0 is blocked and its generated history is not clean

**Evidence**

Release PR #1984 contains duplicate feature entries for the same DBT execution-selection recovery and all six workflows are `action_required`.

**Impact**

Merging it would publish an unverified tree and a misleading changelog. It also predates the active reconciliation correction.

**Release route**

1. do not manually patch around #1993 by merging the current release branch;
2. finish the product/reconciliation work;
3. regenerate or rebase release-please from the resulting `main`;
4. deduplicate the recovery entry according to the real commit topology;
5. require all six workflows to complete successfully;
6. prove the exact release commit with protected live DBT edit/reopen/Preview/Run evidence;
7. verify version, manifest and changelog are a single atomic release commit.

### P2 — Exact-main CI evidence is missing

**Evidence**

The current `main` merge SHA has no visible workflow runs in the commit workflow query, while PR heads have extensive checks.

**Risk**

A merge commit can differ from a reviewed PR head through base movement or merge resolution. PR-only evidence is not exact-tree evidence.

**Route**

Add or enforce one of:

- required `merge_group` checks with a merge queue; or
- a required post-merge `push` workflow on `main` covering contracts, deterministic checks, tests, code quality and the protected live proof subset.

Release automation must consume only a `main` SHA whose exact tree has passed.

### P2 — Canonical current-status documentation is stale relative to delivery speed

**Evidence**

`docs/architecture/system-delivery-status.md` is marked Active and describes itself as the current implementation snapshot, but its `last_reviewed` date is 2026-04-26. The repository has undergone substantial architecture and product work through 2026-07-19. The historical architecture atlas correctly warns that it is not current, but the active status document still exposes old workspace counts and an April snapshot.

**Impact**

A developer or agent following canonical navigation can receive stale product truth despite the repository's strong Planning DB discipline. This is authority drift in documentation.

**Route**

Generate the snapshot from Planning DB/current code inventory, bind it to a reviewed commit SHA, and add a staleness guard. An Active status page older than an agreed threshold or behind a material release should fail documentation checks or render an explicit stale banner.

### P3 — Broader product maturity gaps remain recorded

The active status document still records the following as partial/open, and the recent Web-focused commits do not demonstrate closure:

- broader backend-backed Web coverage remains incomplete;
- planner/shared-kernel and plan-record hardening remain open;
- production validation of the OTel binding remains incomplete;
- archive lifecycle still lacks regulated erasure approval/audit.

Because the status page is stale, these must be revalidated against code before being promoted into immediate work. They should not distract from the current authority/release blockers.

## Mature-system comparison

DVT should match mature dbt/IDE/workflow products on the integrity boundaries, not clone their surfaces.

- **dbt Cloud/Studio and professional IDE/Git workflows:** a working-tree edit must have explicit file revision/conflict semantics; “saved locally” must not imply committed or pushed; compile/analysis must identify the exact project revision. DVT's ADR is aligned, but the current reconciliation needs a revision-bound snapshot to complete the promise.
- **Dagster, Airflow and Prefect:** execution starts from a versioned/deployed definition with observable run identity. DVT should keep Preview/Run bound to the same project revision and analysis hash, rather than infer readiness from a current UI state.
- **NiFi-style visual authoring:** visual and textual surfaces require one authority, explicit versioning and safe multi-user conflict handling. DVT's mutually exclusive `graph-draft` and `dbt-project-files` modes are the correct differentiation and should be preserved.
- **Temporal:** durable workflow semantics are not a substitute for durable editor transactions. The browser buffer, workspace CAS, project snapshot and execution snapshot must each have explicit ownership and revision contracts.

## Recommended implementation sequence

### Slice 1 — Repair PR #1993 and make its claims exact

Keep the current branch and close only the following before merge:

1. fix the navigation-guard jsdom/router failure;
2. add the exact test command to required CI;
3. correct the hard-exit claim to warning/blocking, not guaranteed flush;
4. move the application reconciliation outcome out of the view-owned sync model if this can be done without widening API scope;
5. consolidate un-applied Planning DB migrations if repository policy permits;
6. rerun all six workflows and protected live proof on the final head;
7. resolve the P1 review thread with concrete evidence.

### Slice 2 — Revision-bound project reconciliation

Implement the smallest vertical that makes the save receipt, project analysis and current project revision one coherent transaction:

- additive revision fields in existing save/query contracts;
- snapshot/CAS behavior in Workspace I/O and DBT analysis;
- Web mapping to fresh/degraded/superseded without inferring authority;
- concurrent second-file red/green test;
- Preview receipt proves the same project revision and analysis hash;
- live two-session or two-tab proof.

Do not introduce a second save command or a second graph-projection query.

### Slice 3 — Release repair

- merge the accepted reconciliation verticals;
- regenerate release-please from current `main`;
- deduplicate changelog topology;
- obtain successful CI on the exact release head;
- prove exact release tree through edit → invalid analysis → correction → reopen → Preview → Run;
- merge release only after exact-main CI is configured or a post-merge verification gate is mandatory.

### Slice 4 — Reduce authoring change amplification

Extract the shared authoring transaction kernel before adding more structured edits such as column descriptions. Generalize only after SQL and model-description flows share the same revision, CAS, reconciliation, navigation and receipt semantics.

### Slice 5 — Refresh repository-wide operational truth

Revalidate and update:

- active system delivery status;
- Web backend-backed coverage posture;
- OTel production validation;
- archive regulated-erasure/audit posture;
- planner/shared-kernel remaining debt.

## Required observability for the next vertical

Emit structured, content-safe signals:

- `workspace_file_save_total{outcome=accepted|conflict|failed}`
- `workspace_file_save_duration_ms`
- `dbt_project_reconciliation_total{outcome=fresh|invalid|stale|unavailable|superseded}`
- `dbt_project_reconciliation_duration_ms`
- `code_navigation_guard_total{outcome=proceeded|reset|browser_warning}`
- `project_revision_mismatch_total`

Logs must include workspace/tenant identifiers according to policy, file path where allowed, receipt/project revision hashes and correlation IDs. They must not include SQL/YAML content, secrets, raw adapter errors or transport bodies.

## Security and data-integrity posture

- Keep raw technical diagnostics out of user-facing localized copy; #1993 correctly moves in this direction.
- Preserve CAS and stale-write rejection; never downgrade missing revision data to success.
- Do not use unload-time transport mechanisms that bypass normal authentication, tenant policy or conditional-write semantics.
- Exclude `profiles.yml`, credentials, resolved secrets and build output from project bundles as required by ADR-0060.
- Treat revision hashes as provenance, not authorization.

## Rollback posture

- PR #1993 Web behavior can be reverted as one product change if necessary, but its Planning DB migrations require compensating migrations once applied.
- Revision-bound API fields should be additive before the Web hard-cut; rollback can temporarily stop requiring the new fields without deleting persisted provenance.
- Never reintroduce silent overwrite or a fallback from `dbt-project-files` to `graph-draft`.
- Release rollback must use the repository's release process and exact commit identity, not manual changelog/version surgery.

## Merge and release gates

PR #1993 must not merge until:

- [ ] unresolved P1 thread resolved;
- [ ] exact navigation-guard presentation test passes;
- [ ] required CI includes that lane;
- [ ] all six workflows pass on the final head;
- [ ] hard-exit contract is truthful;
- [ ] protected live edit/reconcile/reopen proof passes;
- [ ] no raw technical error reaches localized UI;
- [ ] Planning DB integrity and migration policy pass.

Release 0.5.0 must not merge until:

- [ ] accepted reconciliation work is on `main`;
- [ ] release branch is regenerated/rebased from that exact `main`;
- [ ] duplicate recovery changelog entry is removed by correct release topology;
- [ ] all release workflows are successful, not `action_required`;
- [ ] exact release tree passes protected live proof;
- [ ] exact post-merge `main` evidence is available or enforced.

## Final decision

The repository is advancing and the current route is broadly correct. The immediate problem is no longer absence of implementation; it is **evidence and transaction precision**. Do not start another broad feature. Finish the Code reconciliation vertical, bind it to exact workspace/project revisions, then release from an exact verified tree. After that, reduce authoring-session change amplification before generalizing the same mechanism to more dbt metadata.
