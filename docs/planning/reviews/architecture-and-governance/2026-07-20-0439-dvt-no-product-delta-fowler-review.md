---
title: DVT no-product-delta Fowler review and validated implementation route
date: 2026-07-20T04:39:00+02:00
status: current-review
reviewed_main_sha: 8eb0f5a7551d46c909a024b86f66cf3580c20691
scope: documentation-only
supersedes: 2026-07-20-0040-dvt-unchanged-main-fowler-delta-review.md
---

# DVT no-product-delta Fowler review and validated implementation route

## Purpose

This is a point-in-time repository, architecture, product, and delivery review for the implementation
agent working in [`dunay2/dvt`](https://github.com/dunay2/dvt). It reviews the exact current `main`,
recent commits, all visible open pull requests, relevant pull-request heads, current workflow identity,
review threads, release state, and the product code that owns DBT file authority, Code persistence,
semantic reconciliation, Canvas projection, Preview/Run provenance, workspace-file mutation, and
release evidence.

The review also samples the current contracts, API and Web ports, local runtime adapters, tests,
governance, operability, accessibility posture, performance/scale policy, security boundaries, data
integrity, recovery behavior, and current-state documentation. It compares DVT with mature systems only
where the comparison produces a useful invariant; it does not recommend turning DVT into a clone of an
orchestrator or IDE.

This change is documentation-only. It does not authorize a merge and does not replace Planning DB as
current work authority. It changes no runtime code, workflow, dependency, contract, migration,
generated artifact, release metadata, or product behavior.

No local command was executed. Repository, code, pull-request, review-thread, and workflow evidence was
read through the GitHub connector. Mature-system behavior was rechecked against official documentation
on 2026-07-20. The GitHub branch-search endpoint did not return even known pull-request branches, so a
complete branch inventory cannot be asserted from that endpoint; relevant unmerged work is derived from
visible pull-request heads and recent commits instead.

## Exact reviewed identities

- Repository: [`dunay2/dvt`](https://github.com/dunay2/dvt)
- Exact current `main`: [`8eb0f5a7551d46c909a024b86f66cf3580c20691`](https://github.com/dunay2/dvt/commit/8eb0f5a7551d46c909a024b86f66cf3580c20691)
- Current main merge: [PR #1996 — Harden DBT code persistence reconciliation](https://github.com/dunay2/dvt/pull/1996)
- Previous current-state review: [PR #2000 — Validate current Fowler route](https://github.com/dunay2/dvt/pull/2000)
- Earlier post-merge review: [PR #1999 — Add post-merge Fowler review](https://github.com/dunay2/dvt/pull/1999)
- Open release candidate: [PR #1984 — Release 0.5.0](https://github.com/dunay2/dvt/pull/1984)
- Review branch: `agent/dvt-review-20260720-0439`

## Material delta since the preceding review

There is **no product-code delta** since the review created at 2026-07-20 00:40 +02:00. `main` is still
exactly `8eb0f5a7551d46c909a024b86f66cf3580c20691`; the recent-commit feed contains no newer commit.

The evidence delta is limited and operational:

1. PR #2000 remains open, draft, mergeable, and documentation-only.
2. Both applicable checks on PR #2000 are now complete and successful: PR Quality Gate and CI - Code
   Quality. Test Suite, Contracts & Determinism, Dependency Review, and CodeQL were skipped by the
   documentation path policy.
3. PR #1999 also remains open, draft, mergeable, documentation-only, and superseded as current-state
   guidance.
4. No open functional implementation PR is visible. The only non-review open PR is release PR #1984.
5. Exact `main` still has no connector-visible workflow run or combined commit status.
6. Release PR #1984 still has all six visible workflows in `action_required` on head
   `15783c8dddfd57e4a34ef282e6d919ead2956ef9`.
7. The unresolved, non-outdated P2 thread on merged PR #1996 remains unresolved.
8. Reinspection of the actual browser API adapter confirms a secondary contract-hardening gap: the
   workspace file tree/content/save rails use TypeScript generics without runtime response-schema
   parsing, unlike nearby source-import rails. This is not caused by a new commit and does not change the
   immediate implementation priority.

No new product defect is manufactured merely because another review cycle occurred. The previous
correctness route remains valid and is refined here with an explicit transport-schema posture and a
full per-slice implementation checklist.

## Executive verdict

DVT is no longer a hollow architecture exercise. Current `main` contains real file-authoritative DBT
project import, exact project-content and analysis identities, Canvas projection, Preview and Run
provenance, CAS file writes, idempotent atomic batch mutation, SQL and YAML authoring paths, protected
browser proofs, and meaningful architecture guards. PRs #1993 and #1996 fixed genuine data-loss and
navigation races rather than merely changing presentation copy.

The product is nevertheless not ready for release `0.5.0` because its central authoring transaction
still contains three incompatible truths:

1. Code persistence and DBT semantic reconciliation are compressed into one scalar presentation phase,
   so an edit/revert interleaving can lie that a file is synchronized and discard a current analysis
   result.
2. a file save receipt is not causally bound to the exact whole-project revision analyzed by the Code
   reconciliation callback;
3. graph-generated DBT artifacts are still published through sequential single-file commands although
   the API already owns an atomic, idempotent aggregate mutation.

These are not independent cosmetic defects. They form one incomplete transaction boundary:

`edit -> persist exact file -> reconcile exact project -> publish exact aggregate -> Preview exact
revision -> Run the admitted revision -> reopen and prove provenance`.

The next implementation must remain narrow: close the pending-reconciliation edit/revert race in the
Code working-tree model without mixing release generation, batch publication, inventory pagination, or
a generic authoring framework into the same PR.

## Current GitHub state

### Recent commits on main

The newest visible sequence is:

1. `8eb0f5a7551d46c909a024b86f66cf3580c20691` — merge PR #1996;
2. `de5ecc45947e69177e8f010adb7b5d4fc64fd21e` — prevent in-flight DBT edits from being lost;
3. `2a895f85e1d2ddb6c11b6038c9b8ddf7fe363fce` — persist edits made during DBT reconciliation;
4. `1bef79c...` — restore live DBT workspace-file proof;
5. `6a5a937...` — align DBT authoring architecture with Code authority.

There is no later functional or documentation commit on `main`.

### Open pull requests before this report PR

| PR | State | Head | Current verdict |
| --- | --- | --- | --- |
| [#2000](https://github.com/dunay2/dvt/pull/2000) | Open, draft, mergeable | `8b54cc1b4ad1f284f345c01d7eb4e4b3ee589ac8` | Documentation-only predecessor. Checks complete. Superseded by this report as point-in-time guidance. |
| [#1999](https://github.com/dunay2/dvt/pull/1999) | Open, draft, mergeable | `856d1e387e0d001722d80daab3fd21a4deff87e9` | Documentation-only predecessor. Superseded by #2000 and this report. |
| [#1984](https://github.com/dunay2/dvt/pull/1984) | Open, ready, mergeable metadata | `15783c8dddfd57e4a34ef282e6d919ead2956ef9` | Not release-ready: known P2 semantic-truth defect, duplicate/topology-heavy notes, and six `action_required` workflows. |

Keeping multiple current-state review PRs open creates low-grade governance noise. It is not a runtime
blocker, but only the newest review should be treated as current guidance; predecessors should be closed
or clearly retained as historical evidence rather than merged as competing current truth.

### Relevant branch work

No open functional PR is visible. Relevant unmerged heads are therefore:

- release branch head from PR #1984;
- documentation review heads from PRs #1999 and #2000;
- this new documentation branch.

The branch-search connector returned no results even for those known heads. That endpoint is therefore
not used to claim the absence of private or unindexed branches. The defensible claim is narrower: no
additional functional work is represented by a visible open PR or newer commit.

## CI and exact-tree identity

### Exact current main

`main@8eb0f5a7551d46c909a024b86f66cf3580c20691` has:

- no connector-visible workflow runs;
- no combined commit statuses.

The final PR #1996 head had six successful workflows. That is useful evidence for the branch head, but
it is not machine-readable validation attached to the exact merge tree now published as `main`.

### Review PR #2000

Head `8b54cc1b4ad1f284f345c01d7eb4e4b3ee589ac8`:

- PR Quality Gate: success;
- CI - Code Quality: success;
- Test Suite: skipped;
- Contracts & Determinism: skipped;
- Dependency Review: skipped;
- CodeQL: skipped.

That is appropriate for one Markdown file and proves only documentation policy compliance.

### Review PR #1999

Head `856d1e387e0d001722d80daab3fd21a4deff87e9` has the same appropriate documentation-only posture:
PR Quality Gate and Code Quality succeeded; the four runtime/security-heavy lanes were skipped.

### Release PR #1984

Head `15783c8dddfd57e4a34ef282e6d919ead2956ef9`:

- Test Suite: `action_required`;
- PR Quality Gate: `action_required`;
- Contracts & Determinism: `action_required`;
- Dependency Review: `action_required`;
- CI - Code Quality: `action_required`;
- CodeQL: `action_required`.

GitHub's `mergeable` metadata is not release evidence. The release remains blocked.

## Review-thread state

### PR #1996

Two P1 threads are resolved, non-outdated, and supported by implementation commits:

- edit during DBT reconciliation no longer lets `flush()` approve a buffer before the later bytes are
  persisted; fixed in `2a895f85e`;
- edit while the original persistence request is in flight no longer lets the older acknowledgement hide
  the later buffer; fixed in `de5ecc459`.

One P2 thread remains unresolved and non-outdated on
[`codeWorkingTreeSyncModel.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts):

- a pending reconciliation is lost when the user edits away from persisted bytes and returns to them
  before the receipt resolves;
- the state becomes `synchronized` because `persistedReconciliationPhase` is still null;
- the later matching result is rejected because completion is accepted only while
  `phase === 'reconciling'`.

### PR #1993

All three actionable threads remain resolved:

- manual project-file selection no longer snaps back to the contextual initial path;
- the router presentation test handles the jsdom/Node `AbortSignal` realm boundary;
- switching from Node Code to Project Code resets to the canonical project default.

### PR #1983

The earlier selection-recovery diagnostic leak is resolved. User-visible recovery copy no longer
renders raw transport `Error.message` detail.

### Open review PRs and release PR

PRs #1999, #2000, and #1984 have no inline review threads. Absence of review discussion on the release
PR does not clear its objective CI and release-note blockers.

## Previous finding disposition

| Finding | Current status | Current evidence |
| --- | --- | --- |
| Raw selection-recovery transport detail shown to users | **Fixed** | Localized, sanitized product copy replaced direct raw error rendering. |
| Manual project file selection snaps back | **Fixed** | Corrected and regression-tested in PR #1993. |
| Node-to-project scope switch retains stale selected file | **Fixed** | Corrected and regression-tested in PR #1993. |
| Router presentation lane fails at `AbortSignal` realm boundary | **Fixed** | Corrected with a test-only adapter and full presentation rerun. |
| Edit during persistence can be lost | **Fixed** | PR #1996 retains later buffer and requires the second save. |
| Edit during reconciliation can be approved before the later save | **Fixed** | PR #1996 returns the buffer to modified and serializes the later save. |
| Pending reconciliation disappears after edit/revert | **Still active** | Exact reducer path and unresolved non-outdated PR #1996 P2 thread. |
| File save receipt is not bound to exact whole-project revision | **Still active** | Canvas reconciliation callback accepts `_receipt` but ignores it and refetches latest projection. |
| Graph-generated DBT publication can partially mutate a project | **Still active** | `canvasPlanAction.ts` loops over `saveFileContent`; API already has atomic batch authority. |
| Release notes duplicate merge/parent outcomes | **Still active** | PR #1984 continues to expose duplicate product outcomes and commit topology. |
| Exact release/main tree lacks attached validation evidence | **Still active** | Exact main has no statuses; release head checks are `action_required`. |
| Accepted project scale differs from interactive workspace capability | **Still active** | Import inspector accepts 10,000 project files/50 MB while workspace listing stops silently at 500 and content/mutation rejects files over 1 MB. |
| Human current-state documentation is current | **Disproved** | `system-delivery-status.md` calls itself current but was last reviewed 2026-04-26. |
| File-backed Preview/Run lack exact revision provenance | **Disproved as a broad claim** | Existing strategy carries content-set, analysis, dbt version, target, and selection provenance. Remaining gap is Code reconciliation/admission causality. |
| DVT needs a new mutation DSL | **Disproved** | Existing CAS input, save receipt, batch mutation, batch receipt, `DbtProjectRevision`, and projection contracts are sufficient. |
| Browser workspace-file transport is runtime-schema validated | **Newly disproved by reinspection** | `workspacePorts.api.ts` uses generic `getJson/postJson`; `createApiClient` casts parsed JSON to `TResponse` without schema validation. |

## Product and Fowler-style assessment

## 1. Code working-tree state is a false aggregate

[`codeWorkingTreeSyncModel.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts)
uses one `phase` string to represent:

- clean or dirty buffer;
- active file persistence;
- write conflict;
- write failure;
- pending DBT reconciliation;
- fresh reconciliation;
- stale-last-valid, invalid, or unavailable reconciliation;
- verification failure;
- superseded authority.

This is responsibility overload and primitive obsession. The enum is an implicit cross-product of two
orthogonal state machines, and event admission depends on a presentation string rather than receipt
identity.

The current failure path is concrete:

1. persist bytes `A`, keeping a DBT receipt pending;
2. edit to `B`, which changes `phase` from `reconciling` to `modified`;
3. edit back to `A` before analysis completes;
4. `reduceEditedValue` chooses `persistedReconciliationPhase ?? 'synchronized'`;
5. the stored semantic phase is null because no result has completed;
6. the UI reports `synchronized` while `pendingReconciliation` still exists;
7. the matching result is ignored because `reconciliation_completed` and `reconciliation_failed`
   require `phase === 'reconciling'`.

This is not a missing `if`. It is temporal coupling produced by the state representation.

### Test gap

[`codeWorkingTreeSyncModel.test.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/code/codeWorkingTreeSyncModel.test.ts)
proves edits during save, edits during reconciliation, degraded outcomes, and reverting after a degraded
outcome has already completed. It does **not** prove the active order:

`pending -> edit B -> revert A -> matching invalid/failure result`.

The existing revert test exercises a different ordering and therefore cannot refute the P2 finding.

## 2. Hidden whole-project authority remains in a React controller

[`useDbtProjectFileCanvasController.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts)
contains:

```ts
const reconcileCodeFilePersistence = useCallback(
  async (_receipt: WorkspaceFileSaveReceipt) => {
    return projectDbtCodeReconciliationOutcome(await refreshProjectGraphSource());
  },
  [refreshProjectGraphSource]
);
```

The underscore accurately signals that the receipt is ignored. The latest graph projection may be
valid, but it is not proof that the exact saved file receipt caused the exact project revision returned.
A concurrent change to `schema.yml`, another model, a macro, or `dbt_project.yml` can move the project
content set between save and refetch.

The repository already has the required identity in
[`DbtProjectGraphProjection.v1.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts):

- `DbtProjectRevision.projectRoot`;
- `DbtProjectRevision.contentSetSha256`;
- `analysisSha256`;
- `analyzedAt`, analyzer version, dbt version;
- explicit freshness and sanitized diagnostics.

The defect is therefore not missing identity. It is hidden authority and causal ambiguity at the Web
application boundary.

## 3. Execution provenance is stronger than Code admission

[`dbtProjectFileExecutionStrategy.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/canvas/dbtProjectFileExecutionStrategy.ts)
already carries `contentSetSha256`, `analysisSha256`, dbt version, exact execution target, and selected
resource IDs into Preview provenance. It also compares current strategy against persisted provenance.

That disproves a broad claim that Preview and Run are wholly unversioned. The narrower active gap is:
Code can accept a generic latest projection without retaining the exact project revision that reconciled
a particular file receipt. Preview may then refresh to a valid but causally different revision.

## 4. Graph-first publication bypasses the repository's aggregate authority

[`canvasPlanAction.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/canvas/canvasPlanAction.ts)
builds generated artifacts and saves them sequentially:

```ts
for (const artifact of artifactProjection.artifacts) {
  await workspaceFileContentCommand.saveFileContent({
    path: artifact.path,
    content: artifact.content,
    expectedRevision: await readExpectedWorkspaceFileRevision(
      workspaceFilesQuery,
      artifact.path
    ),
  });
}
```

A conflict or error after the first write can leave different files from different graph revisions. The
catch converts the operation into one failed UI action, but it cannot undo already committed files.

The API already owns the correct aggregate abstraction in
[`workspaceFiles.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/api/src/application/ports/workspaceFiles.ts):

- `WorkspaceFileBatchMutation`;
- complete expected-file set;
- writes and deletes;
- idempotency key;
- immutable `WorkspaceFileBatchReceipt`;
- per-path conflicts;
- `IWorkspaceFileBatchMutationPort`.

[`LocalWorkspaceFileBatchMutationGateway.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.ts)
preflights revisions, locks all paths, persists an idempotency receipt, and calls
`replaceFilesAtomically`. Atomic semantics are implemented but stranded behind the wrong product
boundary. A Web-only transaction language would duplicate authority.

## 5. Workspace capability truth is internally contradictory

[`LocalDbtProjectImportInspector.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/api/src/infrastructure/dbt/LocalDbtProjectImportInspector.ts)
defaults to:

- 10,000 project source files;
- 100,000 inspected entries;
- 50 MB total project bytes;
- 5,000 directories;
- depth 64.

[`LocalWorkspaceFileRepository.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts)
then:

- stops listing after 500 files without a completeness marker;
- rejects file content over 1 MB using `InvalidWorkspacePathError`, conflating size policy with path
  invalidity;
- returns the truncated tree as if it were complete.

The batch gateway also limits one mutation to 500 files, 1 MB/file, and 5 MB total. Those mutation limits
may be reasonable. The defect is that the product does not expose a shared capability policy or a
partial/oversized result. An imported project can be accepted but not fully visible or operable.

## 6. Browser transport typing is not runtime contract validation

[`apps/web/src/app/ports/workspace.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/ports/workspace.ts)
redeclares file content, expected revision, save input, save receipt, and tree DTOs. The API application
port declares equivalent semantics separately.

[`workspacePorts.api.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/services/workspace/workspacePorts.api.ts)
uses `getJson<T>` and `postJson<TRequest,TResponse>` for workspace file reads and saves. The nearby
warehouse/source-import calls explicitly parse `@dvt/contracts` schemas, while workspace file responses
are accepted by TypeScript generic assertion.

[`createApiClient.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/services/api/createApiClient.ts)
parses JSON and returns `parsedBody as TResponse`; it does not validate shape.

This is test-only confidence at a protected transport boundary. A version-skewed server, proxy corruption,
or accidental response drift can place malformed receipt identity into the state machine. It is a P2
hardening gap, not the next PR: Priority 0 should remain internal, and the new conditional
reconciliation endpoint in Priority 1 should be schema-first in `@dvt/contracts` rather than adding a
third app-local shape.

## 7. Governance strength is amplifying change cost

The repository has unusually strong Planning DB mechanization, component ownership, architecture tests,
contract validation, evidence documents, and migration-integrity checks. Those are assets.

The smell is that narrow authoring fixes repeatedly require coordinated changes across reducer, hook,
Canvas controller, status presentation, router/navigation, Cypress support, architecture guards,
Planning DB symbols, evidence, and migrations. This is shotgun surgery caused by a missing cohesive
application boundary, not proof that governance should be removed.

The correct Fowler move is staged:

1. fix the state representation;
2. fix exact project-revision admission;
3. route aggregate publication through the existing atomic authority;
4. only then extract a project authoring session from behavior already proven in SQL, YAML, Preview, and
   Run.

A generic framework before those slices would freeze the current ambiguity into a larger abstraction.

## 8. Release truth drifts from product truth

Release PR #1984 presents merge commits and conventional parent commits as separate outcomes and exposes
implementation topology rather than a normalized user capability narrative. It is mechanically close to
commit history but semantically weak as a release contract.

The release also has no successful current-head workflows. A release must bind:

- normalized user outcomes;
- final source tree SHA;
- tag target;
- generated artifacts and checksums;
- workflow results;
- known residual capability limits.

## 9. Current-state documentation is stale authority

[`system-delivery-status.md`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/docs/architecture/system-delivery-status.md)
has title `Current Status`, says it is the current implementation snapshot, and was last reviewed on
2026-04-26. It predates July's DBT import, file-backed projection, Preview/Run, YAML edit, Canvas SQL
authoring, and Code reconciliation delivery.

Planning DB and current evidence are newer, but human readers are explicitly told to use a stale page to
answer what is true now. Either generate this page from current authorities or remove its current-state
claim.

## 10. Quality, accessibility, performance, operability, and recovery posture

### Tests and coverage

DVT has meaningful selected vertical proofs and broad package tests. The root
[`vitest.config.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/vitest.config.ts),
however, enforces coverage only for `packages/@dvt/engine/src/**/*.ts` at 65% statements, 55% branches,
65% functions, and 65% lines. Web and API may run substantial tests, but they are not governed by one
repository-level coverage ratchet.

### Accessibility

The codebase contains ARIA-oriented component work and accessibility planning/evidence. The visible
release workflow evidence does not bind the final release SHA to an automated critical-flow
accessibility result for Canvas, Code, Preview, Run, conflict, and recovery states. That is an evidence
gap, not proof that the UI is inaccessible.

### Performance and scale

No final-release evidence currently joins bundle size, Canvas interaction budget, DBT analysis latency,
large-project rendering, and workspace inventory completeness. The hard 500-file listing cutoff is a
product correctness problem before it is a performance optimization.

### Operability and observability

The repository contains observability ports and an OTel binding, while the current status document itself
says production validation remains incomplete. The authoring path does not yet expose one stable event
model for file persistence, reconciliation, exact revision admission, atomic publication, and release
identity.

### Recovery

CAS, atomic file replacement, idempotency receipts, persisted Preview provenance, and Temporal execution
provide strong recovery foundations. The current browser state machine still loses semantic truth for a
valid receipt under one interleaving. Hard browser exit can protect already persisted bytes, but a
pending semantic outcome is not a durable browser-recovery record. Do not add durable browser session
persistence until Priority 0-2 identities are correct; otherwise recovery would persist ambiguous state.

### Security

Positive controls include workspace-scoped storage, normalized paths, traversal checks, secret-file
rejection during DBT import, CAS writes, batch preflight, protected HTTP rails, sanitized diagnostics,
and exact hashes.

Required posture for new work:

- never log SQL, YAML source, profile contents, credentials, or raw transport errors;
- log opaque receipt identity and hashes only;
- validate all transport results at runtime;
- normalize every artifact path before batch staging;
- preserve workspace/project/tenant authorization on conditional reconciliation and pagination;
- fail closed on unverified revision identity.

## Mature-system comparison: Match, Differentiate, Defer

The comparison below uses official current documentation. It identifies invariants, not feature-copying
requirements.

| Reference | Mature behavior | DVT decision |
| --- | --- | --- |
| [dbt Studio / dbt tooling](https://docs.getdbt.com/) | Studio combines building, testing, running, and version control while still exposing parse/compile diagnostics, lineage, execution, and project files as distinct concerns. | **Match** separation of buffer, durable file, DBT analysis, project revision, Preview/Run, and Git state. **Differentiate** through server-authoritative receipts and content hashes. Do not call a file save a Git commit. |
| [VS Code source control](https://code.visualstudio.com/docs/sourcecontrol/overview) | Working changes, diff, staging, commits, branches, conflicts, history, and remote synchronization are separate states and operations. | **Match** explicit working-tree and conflict semantics. **Defer** full staging/commit/push UX until DVT's file/project authority is exact. |
| [Airflow DAG Bundles](https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/dag-bundles.html) | A run may use a versioned collection of all DAG files/resources for its whole lifetime; Git bundles record exact commits and reruns can use the original version. | **Match** exact whole-project admission and reproducible rerun. Never describe an ambiguous latest project as the revision that produced a save or run. |
| [Prefect deployment versioning](https://docs.prefect.io/v3/how-to-guides/deployments/versioning) | Deployment versions retain configuration history, support rollback/promotion, and can pin exact Git commits or immutable images. | **Match later** published-revision history, promotion, and rollback after content-set receipts are trustworthy. Do not add release-like version history before exact project identity. |
| [Dagster](https://docs.dagster.io/) | Asset-centric definitions integrate lineage, observability, declarative modeling, and testability. | **Match selectively** for assets, checks, freshness, partitions, and materialization outcomes after authoring correctness. **Differ** by keeping DVT's Canvas and DBT file authority instead of forcing every node into a Dagster clone. |
| [Temporal](https://docs.temporal.io/) | Durable execution resumes after crashes, network failures, and infrastructure outages through durable operation history. | **Match** durable identity, idempotency, retry correlation, explicit supersession, and recovery semantics. Do not model browser presentation state as a Temporal workflow. |
| [Apache NiFi version states](https://nifi.apache.org/nifi-docs/user-guide.html) | Versioned flows distinguish up-to-date, locally modified, stale, locally modified-and-stale, and sync failure; users can show, revert, commit, and change versions. | **Match** orthogonal local/remote truth and aggregate version changes. Avoid one scalar that collapses persistence and analysis. |
| [NiFi Registry deprecation](https://nifi.apache.org/projects/registry/) | NiFi Registry was deprecated after a February 2026 vote; NiFi 2 recommends Git-based Flow Registry clients. | **Differ** from the legacy separate-registry architecture. Use Git/content-addressed project revisions and existing receipts rather than creating another central flow registry. |

### What DVT should not copy

- Airflow's task-centric authoring model does not belong in the Canvas.
- Temporal workflow history must not become a browser reducer protocol.
- A separate NiFi-style registry would duplicate Git/workspace revision authority.
- Dagster asset semantics must not block safe SQL/YAML editing.
- dbt Cloud administration surfaces must not become a reason to expose credentials or raw backend
  diagnostics.
- VS Code's complete Git UX should not be implemented before DVT can distinguish file durability from
  project semantic freshness.

# Recommended implementation route

Every slice below is repository-compatible, reuses current rails, and has an explicit rollback and
release posture. The order is intentional.

## Priority 0 — close CODE-RECON-03 with orthogonal state

### Severity and evidence

- Severity: **P2 user-visible correctness; release blocker**.
- Evidence: unresolved non-outdated PR #1996 thread plus direct current-main reducer transition.
- Current test evidence does not cover the exact pending/edit/revert/result ordering.

### Root cause

`CodeWorkingTreeSyncState.phase` encodes persistence and reconciliation as one presentation enum.
Receipt admission is gated by that enum, so a local edit can make a still-current semantic result
inadmissible.

### User and product impact

The UI can announce synchronized while analysis is pending and can silently lose an invalid, stale,
unavailable, verification-unavailable, failed, or superseded result. Users may navigate or Preview based
on false semantic readiness.

### Exact domain owner

- `apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts`
- `apps/web/src/app/views/code/useCodeWorkingTreeSync.ts`

`useDbtProjectFileCanvasController.ts` remains an adapter that supplies reconciliation. It must not own
the state machine.

### Proposed domain objects

```ts
type CodePersistenceState =
  | Readonly<{ kind: 'clean' }>
  | Readonly<{ kind: 'dirty' }>
  | Readonly<{
      kind: 'saving';
      requestId: number;
      content: string;
      expectedRevision: string;
    }>
  | Readonly<{ kind: 'conflict' }>
  | Readonly<{ kind: 'failed' }>;

type CodeReconciliationState =
  | Readonly<{ kind: 'not-required' }>
  | Readonly<{ kind: 'pending'; receipt: WorkspaceFileSaveReceipt }>
  | Readonly<{
      kind: 'fresh';
      receipt: WorkspaceFileSaveReceipt;
      projectRevision: DbtProjectRevision;
      analysisSha256: string;
    }>
  | Readonly<{
      kind: 'degraded';
      receipt: WorkspaceFileSaveReceipt;
      projectRevision?: DbtProjectRevision;
      freshness: 'stale-last-valid' | 'invalid' | 'unavailable';
    }>
  | Readonly<{ kind: 'verification-unavailable'; receipt: WorkspaceFileSaveReceipt }>
  | Readonly<{
      kind: 'superseded';
      receipt: WorkspaceFileSaveReceipt;
      currentContentSha256: string;
    }>
  | Readonly<{ kind: 'failed'; receipt: WorkspaceFileSaveReceipt }>;
```

For Priority 0, preserve the current reconciliation outcome payload. `DbtProjectRevision` retention can
be completed in Priority 1. The type above shows the target shape, not a requirement to change the
external contract in the hotfix.

A pure projection owns current UI labels:

```ts
projectCodeWorkingTreeStatus({
  persistence,
  reconciliation,
  value,
  persistedContent,
});
```

Recommended precedence:

1. conflict;
2. save failure;
3. saving;
4. dirty;
5. reconciliation pending;
6. degraded/failed/verification-unavailable/superseded;
7. synchronized only when clean and fresh or not required.

### Command/query and port changes

None externally. Reuse:

- `IWorkspaceFileContentCommandPort.saveFileContent`;
- `WorkspaceFileSaveReceipt`;
- current CAS semantics;
- current reconciliation callback.

`edited` updates persistence only. Matching reconciliation completion updates reconciliation only and
must not require a presentation phase.

### Likely files/components

- `codeWorkingTreeSyncModel.ts`
- `codeWorkingTreeSyncModel.test.ts`
- `useCodeWorkingTreeSync.ts`
- `useCodeWorkingTreeSync.test.tsx`
- `CodeWorkingTreeStatus.tsx` and focused presentation tests
- one architecture test only if necessary to preserve ownership
- required Planning DB/evidence records under current repository policy

### Migration and compatibility strategy

- Keep `CodeWorkingTreeSyncPhase` as a derived compatibility projection during the PR.
- Do not persist the new objects; no data migration is required.
- Convert reducer events incrementally and preserve current copy.
- Do not add `isPending`, `isDirty`, or similar independent booleans as additional authority.

### Rollback posture

Internal, non-persistent change. Revert the commit to restore the old reducer. Preserve existing conflict,
retry, navigation, later-edit, and receipt-mismatch tests so rollback risk is bounded.

### Observability

Add stable events/counters at the hook/application boundary:

- persistence started/succeeded/conflicted/failed;
- reconciliation started/fresh/degraded/failed/superseded;
- matching result accepted while buffer dirty or clean;
- result ignored due to receipt mismatch;
- pending reconciliation duration;
- edit-during-save and edit-during-reconciliation counts.

No source content in logs.

### Security implications

- preserve sanitized user diagnostics;
- correlate with opaque receipt identity and hashes only;
- never log SQL/YAML, credentials, or raw transport errors.

### PR decomposition

One PR only: reducer, hook, status projection, focused tests, protected browser proof, and resolution of
the existing P2 thread. No contract, batch, release, inventory, or generic session work.

### Red tests before production code

1. `reconciling -> edit B -> edit A -> degraded invalid` ends `persisted_invalid`.
2. the same path with `fresh` becomes synchronized only after completion.
3. matching failure after revert ends `reconciliation_failed`.
4. a matching result received while dirty is retained and presented after the buffer becomes clean.
5. an older receipt remains ignored after a newer receipt exists.
6. `flush()` can assert byte durability without asserting semantic freshness.
7. status announces pending analysis while bytes equal persisted content.
8. all current conflict, retry, navigation, and later-edit tests remain green.

### Live browser/integration proof

Use real protected API and DBT analysis:

`open real model -> persist A -> hold reconciliation -> edit B -> revert A -> deliver invalid/unavailable
matching result -> verify never synchronized -> repeat with fresh -> synchronize only after result`.

No workspace-file read/write intercept and no fake success response.

### Acceptance criteria

- no edit/revert ordering loses a matching result;
- `synchronized` means durable bytes plus fresh/not-required reconciliation;
- degraded/failure/superseded truth survives local edits;
- navigation continues to distinguish durability from semantic status;
- reducer, hook, presentation, and protected browser proofs pass;
- PR #1996 P2 thread is answered with the fixing commit and resolved.

### Release gate

All applicable workflows on the exact final PR head must be green. Release PR #1984 remains blocked
until this fix is merged and included in an exact validated release tree.

## Priority 1 — bind a file receipt to an exact project revision

### Severity and evidence

- Severity: **P1 project integrity and reproducibility**.
- Evidence: `_receipt` is ignored by the Canvas controller; generic latest refetch is used as proof.
- Existing projection and execution provenance already provide exact project/analysis identities.

### Root cause

The browser correlates file persistence and whole-project analysis by timing rather than a conditional
server proof. The project query owns exact content-set identity, but the Code reconciliation callback
uses it as an unconditioned latest read.

### User and product impact

A model save can be durable while a concurrent YAML, macro, or project-config change makes the returned
analysis describe another project snapshot. Code can claim the wrong causal relationship, and Preview
can silently refresh to a different valid revision.

### Exact domain owner

- contract authority: existing `DbtProjectGraphProjection.v1.ts` and `DbtProjectRevision`;
- API application owner: existing `ProjectDbtGraphFromFiles` query rail;
- Web query port: `IDbtProjectGraphQueryPort`;
- Canvas adapter: `useDbtProjectFileCanvasController.ts`;
- Code state: reconciliation axis introduced by Priority 0.

### Proposed contract/domain objects

Do not create a second project-revision type. Add a versioned conditional query/request on the existing
rail:

```ts
type ExpectedSavedWorkspaceFile = Readonly<{
  path: string;
  contentSha256: string;
}>;

type ReconcileWorkspaceFileWithDbtProjectRequest = Readonly<{
  authorityBinding: DbtProjectFilesAuthorityBinding;
  expectedSavedFile: ExpectedSavedWorkspaceFile;
}>;

type ReconcileWorkspaceFileWithDbtProjectResult =
  | Readonly<{
      kind: 'fresh';
      saveReceipt: WorkspaceFileSaveReceipt;
      projectRevision: DbtProjectRevision;
      analysisSha256: string;
    }>
  | Readonly<{
      kind: 'degraded';
      saveReceipt: WorkspaceFileSaveReceipt;
      projectRevision: DbtProjectRevision;
      freshness: 'stale-last-valid' | 'invalid' | 'unavailable';
      diagnostics: DbtProjectGraphProjection['diagnostics'];
    }>
  | Readonly<{
      kind: 'superseded';
      saveReceipt: WorkspaceFileSaveReceipt;
      currentFileContentSha256: string | null;
      currentProjectContentSetSha256: string;
    }>
  | Readonly<{
      kind: 'verification-unavailable';
      saveReceipt: WorkspaceFileSaveReceipt;
    }>;
```

Move the new request/result schemas through `@dvt/contracts` and parse them at both API and browser
boundaries. Do not copy another app-local DTO.

### Command/query and port changes

- add an optional expected-file condition to the versioned `ProjectDbtGraphFromFiles` input, or add a
  narrow conditional query on the same rail;
- server verifies the authoritative file still has the receipt hash before accepting causality;
- projection returns the exact project content set analyzed;
- Web `IDbtProjectGraphQueryPort` gains a typed conditional method;
- browser adapter parses the response schema;
- Canvas passes the actual receipt instead of `_receipt`;
- Code retains accepted `projectRevision` and `analysisSha256`;
- Preview/Run admission consumes or explicitly rejects that revision.

### Likely files/components

- planner projection/query contracts and schema tests;
- API `projectDbtGraphFromFilesUseCase.ts`;
- DBT project graph HTTP route and protected route tests;
- Web `ports/dbtProjectGraph.ts`;
- `services/dbtProject/dbtProjectGraph.api.ts`;
- `useDbtProjectFileCanvasController.ts`;
- `dbtProjectCodeReconciliation.ts`;
- Code reducer/hook state and tests;
- `dbtProjectFileExecutionStrategy.ts` admission tests;
- strict live Code -> Preview -> Run proof.

### Migration and compatibility strategy

- keep unconditional graph reads for initial Canvas load;
- add conditional reconciliation as an additive versioned input/result;
- existing projects need no migration because revision hashes are computed from content;
- existing Preview provenance remains valid and becomes an admission target;
- use schema-first additive deployment so API and Web can roll independently.

### Rollback posture

The new endpoint/query form is additive. Browser can fall back only to an explicit
`verification-unavailable` state, never to unverified latest-as-fresh. Rollback removes conditional use
without corrupting stored projects.

### Observability

- file receipt verification accepted/rejected;
- analyzed project content-set and analysis hash;
- project changed between save and analysis;
- Code/Preview or Code/Run revision mismatch;
- conditional verification unavailable count and duration.

### Security implications

- workspace and authority binding must be authorized server-side;
- normalize project root and file path;
- return sanitized diagnostics only;
- hashes and opaque receipts are loggable; source content is not;
- runtime schema validation rejects malformed or version-skewed transport data.

### PR decomposition

Prefer two commits in one vertical PR or two tightly sequenced PRs:

1. additive contract/API conditional query with integration proof;
2. Web adapter, Code state, Preview/Run admission, and live proof.

Do not mix atomic publication.

### Red/green tests

1. save model SQL, concurrently change `schema.yml`, then analyze;
2. prove file durability but return superseded or the explicitly newer project revision;
3. never claim the original save produced a revision it did not analyze;
4. malformed transport result is rejected by schema parsing;
5. Preview rejects or refreshes when its revision differs from Code's accepted revision;
6. Run carries exactly the admitted Preview content-set and analysis hashes;
7. conditional verification failure cannot become synchronized.

### Live browser/integration proof

`edit model -> save receipt -> concurrent real YAML mutation -> conditional reconciliation -> explicit
superseded state -> refresh -> Preview exact revision -> Temporal Run same revision -> reopen persisted
provenance`.

### Acceptance criteria

- every fresh Code reconciliation retains exact `DbtProjectRevision` and `analysisSha256`;
- any project-file change yields a different visible revision;
- Preview/Run consume or reject the accepted revision explicitly;
- no generic latest refetch proves a specific file save;
- transport schemas are parsed at runtime;
- contract, API, Web, integration, and live tests pass.

### Release gate

No release while Code can present a causally ambiguous fresh project revision. Exact final PR head and
exact resulting main/release tree require green evidence.

## Priority 2 — publish graph-generated DBT artifacts atomically

### Severity and evidence

- Severity: **P1 data integrity** for graph-first authoring.
- Evidence: sequential `saveFileContent` loop in `canvasPlanAction.ts`.
- Existing API batch port/gateway proves repository-compatible aggregate semantics.

### Root cause

The Web application boundary exposes only single-file writes, so a multi-file product transaction is
implemented as view-owned orchestration.

### User and product impact

Failure or conflict after the first generated artifact can mix `dbt_project.yml`, SQL, YAML, and related
files from different graph revisions. Retry can compound the mixed state.

### Exact domain owner

- API application command for DBT workspace artifact publication;
- existing `IWorkspaceFileBatchMutationPort` and local batch gateway;
- Canvas action as caller, not transaction owner.

### Proposed contract/domain objects

`PublishDbtWorkspaceArtifacts` is an application command mapped onto the existing storage model:

```ts
type PublishDbtWorkspaceArtifacts = Readonly<{
  idempotencyKey: string;
  projectRoot: string;
  artifacts: readonly Readonly<{
    path: string;
    content: string;
    expectedRevision: ExpectedWorkspaceFileRevision;
  }>[];
}>;

type PublishDbtWorkspaceArtifactsResult =
  | Readonly<{
      kind: 'published';
      batchReceipt: WorkspaceFileBatchReceipt;
      projectRevision: DbtProjectRevision;
      analysisSha256: string;
    }>
  | Readonly<{
      kind: 'conflict';
      conflicts: WorkspaceFileBatchMutationResult extends { kind: 'conflict' }
        ? WorkspaceFileBatchMutationResult['conflicts']
        : never;
    }>;
```

Use the existing mutation/receipt semantics; do not expose local filesystem internals to Web.

### Command/query and port changes

- protected application command on the canonical workspace command surface;
- API validates scope, project root, paths, duplicates, limits, and complete preconditions;
- maps artifacts to existing `WorkspaceFileBatchMutation`;
- after successful batch, analyzes and returns exact resulting project revision;
- Web gains one publication port;
- `canvasPlanAction.ts` sends one command and Previews the returned revision;
- remove per-artifact expected-read/save loop.

### Likely files/components

- `apps/api/src/application/services/` new narrow command service;
- protected runtime rail vocabulary/registration;
- workspace command HTTP route and tests;
- existing batch port and gateway tests, extended only where necessary;
- Web workspace publication port/API adapter;
- `canvasPlanAction.ts` and tests;
- strict graph-first Preview/Run Cypress vertical.

### Migration and compatibility strategy

- preserve single-file Code command;
- change only graph-generated publication;
- no persisted-data migration;
- derive deterministic idempotency key from workspace, Canvas draft signature, project root, and request
  hash;
- deploy additive server command before browser switch.

### Rollback posture

Browser can be rolled back before old endpoint removal. Once batch publication is selected, failures
must fail closed; never silently fall back to sequential writes. Existing files remain untouched on
conflict/failure.

### Observability

- batch started/applied/conflicted/failed/deduplicated;
- file and byte counts without content;
- conflict paths/current hashes;
- resulting project content-set and analysis hash;
- retry latency and dedupe rate.

### Security implications

- normalize every artifact path;
- enforce workspace/project-root containment;
- reject traversal, duplicate paths, oversized files/batches, and incomplete expected sets;
- do not log artifacts or credential-bearing config;
- preserve secret-reference boundary.

### PR decomposition

One vertical PR may include API command, Web port, Canvas switch, failure-injection tests, and live proof
if review size remains bounded. Otherwise split server command and browser adoption, but do not merge
browser adoption without the exact resulting revision.

### Red/green tests

1. conflict on second artifact leaves every original hash unchanged;
2. prepared-write failure leaves zero committed file changes;
3. same idempotency key/request returns deduplicated same receipt;
4. same key/different request fails explicitly;
5. traversal/out-of-root/duplicate path fails before staging;
6. Preview and Run use the batch result's exact project revision.

### Live browser/integration proof

`graph edit -> Preview -> atomic publication -> DBT analysis -> persisted Preview -> Run -> reopen exact
files/provenance`, plus one controlled conflict proving no partial files.

### Acceptance criteria

- all-or-nothing project mutation;
- one immutable receipt;
- idempotent retry;
- exact resulting project/analysis identity;
- no sequential generated-artifact loop;
- API, Web, integration, and strict browser lanes green.

### Release gate

Graph-first authoring must not ship with known partial-publication behavior. Exact release tree must
contain and prove the atomic command.

## Priority 3 — repair and validate release 0.5.0

### Severity and evidence

- Severity: **P1 release integrity**.
- Evidence: duplicate/topology-heavy notes, six `action_required` workflows, known P2 blocker, no exact
  main status.

### Root cause

Release generation treats conventional commits and merge topology as user outcomes, while validation is
not bound to one final release head/tag/artifact identity.

### User and product impact

Users receive misleading notes and an unvalidated release. Support and rollback cannot identify one
machine-proven shipped tree.

### Exact domain owner

Release Please configuration/workflow and release governance, not Canvas or Code product code.

### Proposed contracts/domain objects

No new runtime domain object. Define a machine-readable release evidence record referencing:

- exact source SHA;
- tag target;
- normalized outcome IDs;
- workflow run/check identities;
- artifact hashes/SBOM/provenance where produced;
- known residual limits.

### Command/query and port changes

- normalize merge/parent pairs before release-note rendering;
- regenerate release from the final main containing Priorities 0-2 as required;
- execute all applicable workflows on final head;
- tag exactly that SHA;
- publish exact evidence with release artifacts.

### Likely files/components

Release Please config/manifests, changelog, release workflow, release evidence scripts/docs, and tests for
normalization. Do not change product runtime in this PR.

### Migration and compatibility strategy

Replace the unshipped release candidate. Preserve historical Git commits; normalize presentation only.
No runtime migration.

### Rollback posture

Do not create the tag/release until gates pass. Rollback is cancellation of publication, not a follow-up
patch for a known blocker.

### Observability

- final release SHA validation result;
- workflow/check matrix;
- artifact generation/checksum/provenance status;
- note-normalization duplicate count.

### Security implications

Release artifacts must exclude secrets, include dependency/security results where applicable, and bind
checksums/SBOM/provenance to exact SHA.

### PR decomposition

One release-only PR after correctness work. No runtime feature changes.

### Red/green tests

- merge + conventional parent produces one user outcome;
- independent user outcomes remain distinct;
- exact tag target equals validated source SHA;
- missing workflow/artifact evidence fails release gate.

### Live/integration proof

Run the complete release workflow on the final head and verify tag, source archive, generated artifacts,
checksums, and release notes resolve to the same SHA.

### Acceptance criteria

No duplicate user outcomes, no known P1/P2 semantic-truth defect, no unexecuted applicable workflow, no
ambiguous tag target, and explicit residual capability limits.

### Release gate

This priority *is* the release gate. PR #1984 must not merge as currently constituted.

## Priority 4 — make workspace capability truthful

### Severity and evidence

- Severity: **P1 product capability and scale truth**.
- Evidence: importer accepts 10,000 files/50 MB; workspace tree silently stops at 500; content and batch
  limits differ and are not exposed as one capability policy.

### Root cause

Import inspection, file inventory, content access, and mutation each own local limits without a shared
user-visible capability result.

### User and product impact

An accepted project can be only partially visible. Oversized content appears as invalid path, and absence
cannot be distinguished from truncation.

### Exact domain owner

Workspace-file query/application boundary with shared capability policy; importer, analyzer, Explorer,
Code, and mutation consume it.

### Proposed contracts/domain objects

```ts
type WorkspaceFileInventoryPage = Readonly<{
  entries: readonly WorkspaceFileEntry[];
  nextCursor: string | null;
  completeness: 'complete' | 'partial';
  effectivePolicy: WorkspaceFileCapabilityPolicy;
}>;

type WorkspaceFileContentResult =
  | Readonly<{ kind: 'available'; file: WorkspaceFileContent }>
  | Readonly<{ kind: 'not-found' }>
  | Readonly<{ kind: 'oversized'; byteSize: number; maxReadableBytes: number }>;
```

Do not overload `InvalidWorkspacePathError` for size policy.

### Command/query and port changes

- paginated list query with stable cursor and explicit completeness;
- typed content result;
- shared effective capability query/policy;
- import diagnostics explain accepted-but-not-interactively-editable files;
- mutation reports explicit limit reason.

### Likely files/components

Workspace contracts, API repository/query services/routes, local repository, Web ports/adapters,
Explorer/Code presentation, importer capability reporting, and large-project tests.

### Migration and compatibility strategy

Additive v2 response first. Legacy list clients must not silently truncate; either retain old route with
explicit deprecation or fail closed above legacy capacity. No stored data migration.

### Rollback posture

Keep old route during additive deployment but do not reintroduce silent truncation after clients adopt
v2. Cursor strategy must be deterministic and scope-bound.

### Observability

Inventory size, page count, partial result count, oversized count, rejected mutation reason, and latency
by project size.

### Security implications

Cursor and pagination must preserve authorization, never reveal absolute filesystem paths, and not permit
limit bypass. Oversized response returns metadata, not content.

### PR decomposition

1. shared policy and paginated API contract;
2. Web Explorer/Code adoption;
3. importer capability messaging and large-project live proof.

### Red/green tests

- 501 files returns explicit continuation/partial status;
- near 10,000 accepted files are fully pageable;
- >1 MB content returns oversized, not not-found/path-invalid;
- cursor cannot cross workspace scope;
- mutation and import report the same effective policy.

### Live browser/integration proof

Import a project over 500 files, browse all pages, open supported content, receive explicit oversized
status, edit a supported file, Preview/Run, and reopen without hidden files.

### Acceptance criteria

No silent truncation, one effective policy, explicit oversized semantics, secure pagination, and
API/Web/large-project proofs.

### Release gate

May follow `0.5.0` only if the release notes state the current hard limits honestly. It is mandatory
before claiming broad large-project support.

## Priority 5 — extract a project authoring session boundary

### Severity and evidence

- Severity: **P2 maintainability, recovery, and change amplification**.
- Evidence: recent narrow fixes span reducer, hook, views, Canvas, router, tests, evidence, guards, and
  migrations.
- Begin only after Priorities 0-2.

### Root cause

Temporal orchestration is distributed across view/controller surfaces without one application owner for
project revision, buffers, receipts, reconciliation, and Preview/Run admission.

### User and product impact

Every new edit type or interleaving risks inconsistent close/navigation/recovery behavior and expensive
shotgun surgery.

### Exact domain owner

A Web application-domain `DbtProjectAuthoringSession`, independent of React views and backed by existing
ports.

### Proposed contracts/domain objects

Own:

- current accepted project revision;
- active file buffers and persistence axes;
- save receipts;
- reconciliation outcomes;
- Preview/Run revision admission;
- navigation/close policy;
- crash-recovery posture.

Extract from demonstrated SQL, YAML, and atomic publication behavior. Do not invent a generic authoring
framework or new mutation language.

### Command/query and port changes

Preserve current ports as adapters. The session coordinates them; it does not replace API domain
contracts. Add no persisted recovery schema until an actual recovery use case and exact identities are
proven.

### Likely files/components

New application-domain module plus gradual adapters from Code working tree, Canvas controller, SQL/YAML
workbenches, and Preview/Run admission. Existing views become projections/controllers.

### Migration and compatibility strategy

Migrate one transaction at a time behind current view APIs. Keep presentation behavior stable.

### Rollback posture

Adapter-based extraction allows per-transaction rollback. Do not delete old orchestration until the live
vertical is proven.

### Observability

Measure session lifetime, active buffers, receipt/revision transitions, close/navigation decisions,
recovery attempts, and orchestration duplication removed.

### Security implications

Session state must not persist source content or credentials by default. Persist only opaque identities
when recovery is explicitly implemented.

### PR decomposition

1. extract Code SQL transaction;
2. adapt YAML description transaction;
3. adapt graph publication/Preview admission;
4. remove duplicated orchestration.

### Red/green tests

State-machine property/interleaving tests plus existing live SQL/YAML/Preview/Run proofs. New edit types
should add focused session tests rather than reopen unrelated routes.

### Live browser/integration proof

Complete SQL and YAML edit transactions through the session, navigate/close/reopen, Preview/Run exact
revision, and prove unchanged product behavior.

### Acceptance criteria

Adding a new supported DBT file edit primarily changes one application model/service and focused tests,
not multiple unrelated views and routers.

### Release gate

Not required for the immediate hotfix release if Priorities 0-2 are correct. Required before broadening
authoring modalities.

## Priority 6 — establish an executable product-quality release contract

### Severity and evidence

- Severity: **P2 release-system maturity**.
- Evidence: engine-only root coverage thresholds, no exact-main status, selected rather than aggregated
  accessibility/performance/recovery evidence, incomplete production OTel validation.

### Root cause

Quality evidence exists in multiple package workflows, live scripts, docs, and Planning DB records but is
not aggregated against one exact release SHA.

### User and product impact

A green selected vertical can coexist with unmeasured API/Web regression, accessibility failure, bundle
regression, scale failure, or missing recovery evidence.

### Exact domain owner

CI/release engineering and quality governance, consuming package-owned tests rather than centralizing
product code.

### Proposed contract/domain objects

Machine-readable `ProductReleaseEvidence` keyed by exact SHA and containing required lane statuses,
thresholds, artifacts, and exceptions with expiry/owner.

### Command/query and port changes

No runtime ports. Add an evidence aggregator and fail-closed release gate.

### Likely files/components

CI workflow, verification scripts, coverage configs, accessibility and performance suites, load/recovery
proofs, observability canary, release evidence schema/docs.

### Migration and compatibility strategy

Ratchet current measured baselines rather than imposing arbitrary 100% thresholds. Add one critical-flow
lane at a time.

### Rollback posture

Quality thresholds may be rolled back only by explicit reviewed policy change with evidence, never by
skipping hooks or marking failures optional.

### Observability

The output is the observability: exact SHA, lane result, duration, flake/retry, threshold, artifact link,
and exception status.

### Security implications

Aggregate dependency review, CodeQL/security scan, secret scan, artifact provenance, and SBOM without
publishing sensitive logs.

### PR decomposition

1. API/Web coverage baselines and ratchets;
2. critical Canvas/Code/Preview/Run accessibility lane;
3. performance/large-project budgets;
4. recovery/load/operability canary;
5. exact-release aggregation.

### Red/green tests

Evidence schema validation; missing required lane fails; stale SHA evidence fails; expired exception
fails; artifact hash mismatch fails.

### Live/integration proof

Run the aggregator on a release candidate and verify every link/status/artifact belongs to the exact
candidate SHA.

### Acceptance criteria

One executable release scorecard covers contracts, API, Web, accessibility, performance, scale,
recovery, security, operability, and exact artifact identity.

### Release gate

Introduce after the immediate correctness slices; do not use scorecard work to delay Priority 0.

# Ordered PR route

## PR A — pending reconciliation after edit/revert

- orthogonal persistence/reconciliation state;
- derived compatibility phase;
- reducer/hook/status tests;
- protected browser interleaving proof;
- resolve PR #1996 P2 thread;
- no external contract, release, batch, inventory, or framework work.

## PR B — exact project revision reconciliation

- schema-first conditional result on existing DBT graph query rail;
- verify saved file hash and analyzed content set;
- pass receipt rather than ignoring it;
- retain exact project revision in Code;
- Preview/Run admission and live proof;
- no atomic publication.

## PR C — atomic graph-generated artifact publication

- protected application command mapped to existing batch mutation;
- Web publication port;
- remove sequential save loop;
- conflict/failure/idempotency/path/provenance tests;
- strict live all-or-nothing proof.

## PR D — truthful release 0.5.0

- normalized user outcomes;
- no merge-parent duplicates;
- final head fully executed and green;
- exact tag/tree/artifact evidence;
- honest residual limits.

## PR E — workspace inventory and limit truth

- pagination/completeness;
- oversized-file semantics;
- shared effective policy;
- API/Web/large-project proof.

## PR F series — authoring session extraction

- migrate SQL, YAML, and aggregate publication one transaction at a time;
- remove view-owned orchestration only after parity proofs.

## PR G series — executable product-quality scorecard

- API/Web coverage ratchets;
- accessibility/performance/scale/recovery lanes;
- exact release evidence aggregation.

# Recommended next implementation slice

The next functional PR is **PR A only**.

It must begin with the failing reducer test:

`reconciling -> edit B -> revert A -> invalid matching result`.

The production correction should separate persistence and reconciliation state and derive UI phase. If
review size proves too high, a smaller invariant-preserving patch is acceptable only when it:

- never chooses `synchronized` while a current receipt is pending;
- accepts completion/failure by matching receipt regardless of presentation phase;
- stores semantic outcome independently while dirty;
- includes an explicit follow-up task for the orthogonal split.

The preferred route is the split now because the current scalar has already produced multiple ordering
bugs.

# Files the implementation agent should inspect first

1. [`apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts)
2. [`apps/web/src/app/views/code/codeWorkingTreeSyncModel.test.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/code/codeWorkingTreeSyncModel.test.ts)
3. [`apps/web/src/app/views/code/useCodeWorkingTreeSync.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/code/useCodeWorkingTreeSync.ts)
4. [`apps/web/src/app/views/code/useCodeWorkingTreeSync.test.tsx`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/code/useCodeWorkingTreeSync.test.tsx)
5. [`apps/web/src/app/views/code/CodeWorkingTreeStatus.tsx`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/code/CodeWorkingTreeStatus.tsx)
6. [`apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts)
7. [`apps/web/src/app/views/canvas/dbtProjectCodeReconciliation.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/canvas/dbtProjectCodeReconciliation.ts)
8. [`packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts)
9. [`apps/api/src/application/services/projectDbtGraphFromFilesUseCase.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/api/src/application/services/projectDbtGraphFromFilesUseCase.ts)
10. [`apps/web/src/app/views/canvas/canvasPlanAction.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/canvas/canvasPlanAction.ts)
11. [`apps/api/src/application/ports/workspaceFiles.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/api/src/application/ports/workspaceFiles.ts)
12. [`apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.ts)
13. [`apps/web/src/app/services/workspace/workspacePorts.api.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/services/workspace/workspacePorts.api.ts)
14. [`docs/adr/ADR-0060-dbt-project-authoring-authority.md`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/docs/adr/ADR-0060-dbt-project-authoring-authority.md)

# Final decision

- Do not merge release PR #1984.
- Do not add another broad governance or generic authoring abstraction first.
- Do not invent a new revision or mutation language.
- Close the Code edit/revert reconciliation race.
- Then bind the save receipt to an exact project revision.
- Then publish graph-generated artifacts through the existing atomic batch authority.
- Only after those verticals are proven should DVT extract the authoring session, broaden workspace scale,
  and aggregate release-quality evidence.
