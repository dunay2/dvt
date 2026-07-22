---
title: DVT no-delta SQL authority handoff correction Fowler review
status: Review
owner: Architecture / Product / Delivery
reviewed_repository: dunay2/dvt
reviewed_main_sha: 8c098d6e35ce874efae81609814d99e8e60091f7
reviewed_at: 2026-07-23T00:38:39+02:00
planning_type: point-in-time-review
---

# DVT no-delta SQL authority handoff correction Fowler review

## 1. Executive verdict

There is **no material repository delta** since the previous review cycle.

The exact reviewed `main` remains:

```text
8c098d6e35ce874efae81609814d99e8e60091f7
chore(main): Release 0.5.3 (#2037)
```

The functional pull request remains:

- PR: <https://github.com/dunay2/dvt/pull/2040>
- branch: `fix/dbt-model-sql-authority-containment`
- exact head: `6257745ed1ec91f1a1415585d24e319905966931`
- commits: 1
- changed files: 24
- additions/deletions: `+2766/-57`
- state: open, non-draft, mergeable
- standard workflows: six successful

The implementation agent has not pushed a new commit and has not published a complete iteration handoff.

```text
DELIVERY-HANDOFF-MISSING
```

The most important analytical correction in this cycle is that the previous instruction to remove `adopt_legacy_equivalent` as a correctness blocker was itself too broad.

Fresh source validation shows that the decision occurs only inside the graph-draft Preview publication path, after the graph has produced the authoritative artifact. The active graph-draft authority and governed generated path establish ownership. Exact byte equality proves that adding the managed marker does not destroy or replace a divergent SQL edit.

Therefore:

- requiring migration support for deployed legacy artifacts remains **DISPROVED**;
- requiring removal of the byte-identical bootstrap is also **DISPROVED as a correctness blocker**;
- the word `legacy` is misleading in a pre-product codebase and should be corrected as domain language;
- the only current delivery blocker for PR #2040 is the missing auditable handoff;
- atomic publication and exact project revision remain the next separate product slice.

## 2. Scope and evidence posture

This review inspected:

- exact current `main` and recent commits;
- every visible open pull request;
- exact-head workflow runs for PR #2040 and the previous documentation PR;
- review comments and resolved threads;
- the full changed-file inventory for PR #2040;
- the SQL authority policy, publisher, plan action integration and live Cypress proof;
- current `main` behavior for sequential publication;
- exact project-revision reconciliation behavior;
- workspace inventory and file-size limits;
- run-list pagination and scope behavior;
- generic Web API response parsing;
- Code navigation and crash-recovery posture;
- root quality and coverage commands;
- current-status documentation freshness;
- ADR-0060 and the accepted dbt round-trip plan;
- current Planning DB design and closeout migrations in PR #2040;
- mature-system references from official dbt, Airflow, Prefect, Dagster, Temporal, NiFi and VS Code documentation.

No local checkout, runtime process, browser, database or workflow was executed by this reviewer. Runtime and CI conclusions are limited to repository source, GitHub metadata, committed evidence and GitHub workflow results.

## 3. Current repository state

### 3.1 Exact main

`main` has not moved since the previous cycle:

<https://github.com/dunay2/dvt/commit/8c098d6e35ce874efae81609814d99e8e60091f7>

The most recent integrated product change before the release commit is:

- `9bc344578ca3ed45d09924dba4341ba41eff9b38`
- `fix(api): Unify run operational truth (#2035)`

No SQL-authority implementation is yet integrated into `main`.

### 3.2 Release state

The current package version is `0.5.3`.

The release commit is present on `main`. No release pull request is currently open.

GitHub connector evidence does not expose pull-request-triggered workflow runs directly on the final squash/release SHA. The available exact-head CI evidence belongs to the pull-request heads from which the changes were merged.

### 3.3 Open pull requests

#### PR #2040 — functional

<https://github.com/dunay2/dvt/pull/2040>

Purpose:

- prevent graph Preview from silently replacing divergent model SQL;
- mark graph-produced SQL deterministically;
- preflight all graph-derived artifacts before the first write;
- preserve the revision observed in preflight for CAS writes;
- make graph-owned Project Code files read-only;
- preserve editable file-authoritative dbt projects;
- prove external edit preservation through the protected live flow.

State:

- open;
- ready for review;
- mergeable;
- exact head unchanged at `6257745ed1ec91f1a1415585d24e319905966931`;
- one resolved inline thread;
- no unresolved inline thread;
- complete handoff absent.

#### PR #2043 — previous point-in-time review

<https://github.com/dunay2/dvt/pull/2043>

State:

- open draft;
- mergeable;
- one documentation commit;
- PR Quality Gate and Code Quality successful;
- runtime-heavy lanes skipped because the diff is documentation-only.

This report supersedes PR #2043 as the current review snapshot. PR #2043 should be closed without merge after this PR is successfully created.

## 4. Implementation handoff status

### 4.1 Status

```text
DELIVERY-HANDOFF-MISSING
```

There is no top-level comment or repository report headed:

```markdown
## Iteration Handoff
```

The PR body is useful but not sufficient under the accepted delivery contract.

### 4.2 Fields that are present

PR #2040 provides:

- root cause;
- high-level changes;
- base branch and head through PR metadata;
- general validation commands;
- a statement that no checks or runtime paths were bypassed.

### 4.3 Missing mandatory fields

The iteration is not fully auditable because it does not provide one consolidated source for:

- exact base SHA and final head SHA inside the handoff;
- explicit iteration goal and out-of-scope boundary;
- final domain-owner map;
- final command/query rail inventory;
- final port and adapter inventory;
- contract impact and explicit no-contract-change statement;
- complete file and migration inventory grouped by responsibility;
- user-visible before/after behavior;
- tests observed failing before implementation;
- tests added and their exact purpose;
- direct GitHub workflow links for the final head;
- direct link/path to the protected browser proof;
- security and threat-boundary statement;
- data-integrity guarantees and residual failure modes;
- observability ownership;
- compatibility posture for a pre-product repository;
- rollback procedure;
- residual risks;
- deviations from the approved route;
- next bounded iteration.

### 4.4 Required disposition

PR #2040 must not be considered complete until the agent publishes the handoff.

This is not a request for more runtime code. It is a request to expose the delivery truth already claimed by the branch so that the reviewer and product owner can validate it against sources.

## 5. Claim-to-evidence matrix

| Claim | Status | Repository evidence | Review conclusion |
| --- | --- | --- | --- |
| PR #2040 is based on current `main` | VERIFIED | base SHA `8c098d6e...` | Exact base matches current main. |
| PR #2040 head is unchanged since previous cycle | VERIFIED | head `6257745ed1...`, one commit | No implementation response to review comments yet. |
| Preview previously re-read a revision and then overwrote graph model SQL | VERIFIED | current-main `canvasPlanAction.ts` reads revision inside each sequential save | Root cause is real. |
| The branch preflights every artifact before the first write | VERIFIED | `publishGraphDbtWorkspaceArtifacts` uses `Promise.all` over preflight before the write loop | Divergence can be detected before any write begins. |
| CAS writes use the revision observed during preflight | VERIFIED | prepared artifact stores `expectedRevision`; write loop reuses it | A later read cannot redefine the expected revision. |
| Divergent unmarked SQL fails closed | VERIFIED | policy falls through to `conflict` | External semantic edits are not overwritten. |
| Malformed or payload-mismatched managed SQL fails closed | VERIFIED | marker prefix plus invalid parse returns `conflict` | Tampering or corruption is rejected. |
| Byte-identical unmarked SQL can be marked without semantic data loss | VERIFIED | exact equality against proposed graph payload, active graph Preview scope, CAS | This is a safe graph-projection bootstrap, not a deployed-data migration. |
| `adopt_legacy_equivalent` is required for backward compatibility | DISPROVED | no supported deployed artifact contract; product owner states DVT is pre-product | No migration obligation exists. |
| `adopt_legacy_equivalent` is a correctness bug because it acquires ownership from equality alone | DISPROVED | invocation occurs only in the graph-draft publisher; authority mode and generated path already establish ownership | Previous blocker is withdrawn. |
| The `legacy` name accurately describes supported product state | CONTRADICTED | DVT is pre-product and no legacy population is supported | Rename/reword as equivalent unmarked graph projection. |
| The marker authenticates origin | DISPROVED / FIXED | closeout now describes payload integrity and explicitly limits the proof | No signing or secret is needed in this slice. |
| Project Code renders graph-owned SQL read-only | VERIFIED | Code surface/posture changes and live Cypress assertions | Correct authority containment. |
| File-authoritative dbt projects remain editable | VERIFIED | edit-posture logic and PR tests | The two authority modes remain distinct. |
| The protected browser proof executes Canvas → Preview → Run → Project Code → external edit → rejected Preview | VERIFIED | changed Cypress flow | The real vertical is represented in source. |
| Live browser proof actually passed on the final head | PARTIAL | PR body claims command; six CI workflows green, but direct live-run artifact/link absent | Handoff must link the evidence. |
| All tests were written or observed red first | NOT PROVEN | no red chronology | Must be stated honestly in the handoff. |
| Publication is atomic across all files | CONTRADICTED | prepared artifacts are still saved in a sequential loop | Known next task, not delivered by this PR. |
| Preview and Run are bound to one exact project content-set revision | CONTRADICTED | individual save receipts and later projection refresh remain separate | Known next task. |
| Workspace inventory is complete and truthful | CONTRADICTED | silent 500-file truncation and 1 MB invalid-path overload | Later task remains active. |
| Run pagination is complete and consumable | CONTRADICTED | scope is applied after limit; query has no cursor input | Later operational defect remains active. |
| Generic Web API responses are runtime-validated | CONTRADICTED | `parsedBody as TResponse` | New critical boundaries must use schemas. |
| Unpersisted editor buffers survive browser/system crash | NOT PROVEN | navigation flush and `beforeunload` warning only | Durable recovery remains absent. |

## 6. Material delta since the previous review

There is no code, commit, CI, PR-head or review-thread delta.

The material delta is a reviewer correction:

1. The previous instruction to remove the byte-identical marking path is superseded.
2. The exact byte-equality path is safe because it is scoped by active graph-draft authority and a generated artifact path.
3. The implementation does not need historical artifact detection or backward compatibility.
4. The term `legacy` remains misleading and should be changed as domain language.
5. The missing handoff remains the only immediate delivery blocker.

This correction has been posted directly to PR #2040:

<https://github.com/dunay2/dvt/pull/2040#issuecomment-5052375879>

## 7. Re-check of previous findings

### 7.1 Fixed

#### Reconciliation edit/revert race

PR #2030 remains fixed. The pending save receipt stays authoritative across edit/revert interleavings, and older reconciliation results cannot erase newer persistence terminal state.

Do not reopen this defect.

#### Run list/detail terminal-materialization divergence

PR #2035 moved non-terminal materialization sanitization into the common run operational truth projector.

The original list/detail contradiction is fixed.

#### Release 0.5.3

The release is integrated and current.

#### Marker authentication overclaim

The closeout language now treats the marker as a payload-integrity mechanism rather than origin authentication.

Do not add signing, secrets or key management to this PR.

#### Alleged deployed legacy compatibility requirement

Disproved. DVT has no supported persisted population predating the marker format.

### 7.2 Active

#### Delivery handoff missing

Severity: delivery blocker.

The branch cannot be independently audited against the complete delivery contract.

#### SQL authority containment not integrated

Severity: P1 product integrity until PR #2040 merges.

Current `main` still writes graph-generated model SQL unconditionally during graph Preview.

#### Atomic multi-file publication

Severity: P1 data integrity.

The branch performs complete preflight but still executes individual file writes sequentially. A CAS conflict or storage failure after an earlier successful write can leave a partial project.

#### Exact whole-project revision identity

Severity: P1 reproducibility.

The current file-backed controller receives a `WorkspaceFileSaveReceipt` but ignores it and refreshes the latest project graph. Preview or Run can therefore observe a different project source snapshot from the one implied by the save.

#### Workspace inventory truth

Severity: P1 for real project usability.

The local workspace adapter:

- truncates silently after 500 files;
- provides no cursor;
- provides no `complete | partial` result;
- maps files above 1 MB to `InvalidWorkspacePathError`;
- cannot distinguish oversized, unsupported and malformed-path results.

#### Run-list pagination

Severity: P2 operational integrity.

`ListRunsUseCase` applies tenant/limit at storage and project/environment scope afterward. Authorized runs can be hidden beyond the initial tenant page. The response exposes `nextCursor`, while the query accepts only `limit`.

#### Runtime response validation

Severity: P2, P1 for future critical contracts.

The generic Web client casts parsed JSON to `TResponse` without schema validation.

#### Crash recovery

Severity: P2.

SPA navigation attempts a flush and browser unload displays a warning. There is no durable buffer journal or restore flow after process/browser/system failure.

#### Product-wide non-functional gates

Severity: P2.

Root `ci:full` explicitly ratchets coverage only for Engine. There is no equally explicit root gate for Web/API coverage, accessibility, bundle size, large-graph performance or injected-failure proof.

#### Current-status documentation

Severity: P2 governance truth.

`docs/architecture/system-delivery-status.md` calls itself the current implementation snapshot, remains active, and was last reviewed on 2026-04-26.

### 7.3 Superseded

#### “Remove `adopt_legacy_equivalent` before merge”

Superseded by this review.

The behavior is safe under current scope. The misleading name should change, but removing the behavior is not required for correctness.

### 7.4 Disproved

#### “A legacy migration is required”

Disproved by product state and lack of a preservation contract.

#### “Byte equality alone establishes graph ownership”

Disproved as a description of the implementation. Graph-draft authority mode and the generated artifact path establish ownership; equality only proves absence of semantic divergence during marking.

## 8. Fowler review of PR #2040

### 8.1 What the slice improves

#### Hidden authority

Before the branch:

```text
Project Code edits a file
→ Preview reads its latest revision
→ Preview overwrites it with graph SQL
```

The latest revision was mistaken for overwrite authorization.

After the branch:

```text
active graph-draft authority
→ graph artifact proposal
→ complete preflight
→ explicit managed/equivalent/conflict decision
→ CAS write or fail-closed conflict
```

The policy separates observation from authority.

#### Responsibility extraction

`canvasPlanAction.ts` no longer owns all file-classification details. The branch introduces:

- `DbtGraphModelSqlPublicationPolicy` for pure SQL classification;
- `DbtGraphWorkspaceArtifactPublisher` for preflight and write coordination;
- `CodeWorkspaceFileEditPosture` for authority-aware editability;
- `CodeWorkspaceFileSurface` for viewer/editor presentation.

This is a net improvement over route-level condition growth.

#### Test-only confidence reduction

The branch adds:

- pure policy tests;
- publisher tests;
- plan-action boundary tests;
- architecture tests;
- Code surface presentation tests;
- a protected live flow without API stubs.

The evidence structure is stronger than unit-only confidence.

### 8.2 Remaining smells

#### Misleading domain name

`adopt_legacy_equivalent` encodes a product concept that does not exist.

Recommended replacement:

```ts
kind: 'mark_equivalent_unmarked_projection'
```

or another name that states the current behavior without promising a legacy migration policy.

Planning DB should use the same language.

Severity: P2 semantic truth, not a functional P1.

#### Transaction split

The publisher owns a multi-file product transaction but uses a per-file command port.

This is a leaky abstraction: complete preflight is browser-owned while final atomicity exists only in the API batch gateway.

Do not add compensating browser rollback. Replace the write loop in the next slice with the existing batch mutation authority.

#### Receipt weakness

The result returns only written paths. It does not return one immutable publication receipt that binds:

- all expected revisions;
- all resulting content hashes;
- project content-set identity;
- analysis identity;
- Preview identity;
- Run identity.

This keeps exact-revision provenance fragmented.

#### Governance amplification

The slice changes 24 files and adds three Planning DB migrations, including a large closeout migration, for one user transaction.

Much of the surface is legitimate proof and ownership registration. Still, the repository should watch for a pattern where every narrow UI correction requires hundreds of lines of bespoke planning SQL. Generated helpers or normalized command rails may eventually reduce this amplification, but no governance refactor should interrupt the current product sequence.

#### Observability classification

Several pure components are registered with required observability and `not_applicable`. That is defensible for pure policies and passive views, provided the invoking publisher and protected file command remain the owners of conflict and write signals.

The handoff must state where operators see:

- conflict path;
- rejected Preview;
- CAS failure;
- partial publication until the atomic slice lands.

## 9. Architecture, contracts and rails

### 9.1 Exact domain owners

Current branch owners:

- `DbtGraphModelSqlPublicationPolicy`: classification and marker integrity;
- `DbtGraphWorkspaceArtifactPublisher`: preflight and publication coordination;
- `CodeWorkspaceFileEditPosture`: authority-aware file editability query;
- `CodeWorkspaceFileSurface`: editor/viewer presentation;
- `CanvasPlanAction`: orchestration of Preview user intent;
- Workspace file command/query ports: protected persistence and reads.

### 9.2 Existing command/query rails reused

The branch correctly reuses:

- `GenerateDbtWorkspaceArtifacts`;
- `GetWorkspaceFileContent`;
- `SaveWorkspaceFileContent`;
- Preview orchestration.

It does not introduce a parallel `SaveDbtModelSql`, `PublishGraphSql`, or browser-owned repository.

### 9.3 Contract posture

No shared external contract is added for the containment slice.

The marker is an internal representation detail of graph-derived SQL. The authority mode remains governed by `CanvasAuthoringAuthorityBinding`, not by the marker.

The next atomic slice should avoid leaking the internal marker into unrelated public contracts.

### 9.4 Ports and adapters

Current branch uses Web query/command ports for individual reads and writes.

The repository already contains API-side:

- `WorkspaceFileBatchMutation`;
- `WorkspaceFileBatchReceipt`;
- `IWorkspaceFileBatchMutationPort`;
- `LocalWorkspaceFileBatchMutationGateway`;
- multipath locking;
- idempotency-key validation;
- complete preflight;
- atomic replacement;
- persistent receipt.

The next slice must expose/reuse that authority rather than adding browser compensation.

## 10. Web/API/runtime behavior

### 10.1 Graph-draft Preview on current main

Current `main` still:

1. builds artifacts;
2. reads each expected revision;
3. writes each artifact;
4. proceeds to Preview.

A file edit can be read and then overwritten because current main has no authority classification.

### 10.2 Graph-draft Preview on PR #2040

The branch:

1. builds artifacts;
2. reads all current files concurrently;
3. classifies SQL files;
4. stops on any conflict before writes;
5. saves only prepared changed files using preflight revisions;
6. proceeds to Preview.

This closes the silent overwrite transaction.

### 10.3 File-backed Canvas

File-backed projects remain authoritative through `ProjectDbtGraphFromFiles` and are not made read-only by graph markers.

This matches ADR-0060’s mutually exclusive modes.

### 10.4 Runtime execution

PR #2040 does not change Engine or Temporal semantics.

It changes the materialized workspace inputs consumed before Preview. Run reproducibility remains incomplete until the publication receipt and project analysis are bound to the exact Preview/Run revision.

## 11. Tests and proof

### 11.1 Unit proof

The policy test covers:

- absent file creation;
- exact marked equality;
- replacement of valid managed SQL;
- equivalent unmarked marking;
- divergent unmarked conflict;
- tampered managed conflict.

The test should rename the equivalent-unmarked case to remove the unsupported `legacy` concept.

### 11.2 Integration proof

Publisher and plan-action tests prove:

- all artifacts are preflighted;
- a conflict stops publication;
- expected revisions are reused;
- written paths are reported.

### 11.3 Architecture proof

Architecture tests protect the intended component boundaries and prevent Monaco editability from leaking into graph-owned file posture.

### 11.4 Live browser proof

The changed protected Cypress flow performs:

```text
Canvas node authoring
→ Node Code SQL edit
→ Preview
→ Run
→ Project Code read-only verification
→ external workspace-file replacement
→ second Preview rejected
→ external bytes remain unchanged
```

This is the right live proof for the slice.

The handoff must link the exact workflow or evidence record that executed this flow on `6257745ed1...`.

### 11.5 CI state

All six standard workflows are successful on the exact PR #2040 head:

- Contracts & Determinism;
- Dependency Review;
- Test Suite;
- CI – Code Quality;
- CodeQL;
- PR Quality Gate.

Green CI supports the branch but does not replace the missing handoff or the known next-slice atomicity gap.

## 12. Security review

### 12.1 Correct claims

The marker:

- detects content mismatch;
- is deterministic;
- is not secret;
- is not a signature;
- does not authenticate origin;
- is not an authorization boundary.

Authority comes from the active Canvas binding and protected workspace scope.

### 12.2 Fail-closed behavior

Divergent unmarked SQL, malformed markers and mismatched payload hashes produce conflict.

The live test proves that a rejected Preview preserves externally replaced bytes.

### 12.3 Residual security posture

An actor with authorized write access to both payload and marker can generate a syntactically valid marker. This is not a vulnerability in this slice because the marker is not the authorization boundary.

Protected scope, command admission, CAS and the active authority mode remain the relevant boundaries.

Do not add cryptographic signing in this PR.

## 13. Data integrity and recovery

### 13.1 Closed by PR #2040

- silent overwrite of divergent model SQL;
- write-before-global-preflight;
- refreshing the expected revision after preflight;
- editable graph-owned Project Code surface.

### 13.2 Not closed

- atomicity across multiple artifacts;
- complete project-content-set receipt;
- exact analysis receipt;
- exact Preview/Run revision binding;
- recovery after a process crash during authoring;
- recovery after browser loss before persistence.

### 13.3 Rollback posture for PR #2040

Because DVT is pre-product and this branch adds no persistent database schema for user data, rollback can be a commit revert.

A rollback would restore the previous overwrite-prone behavior, so it should only be used if the branch causes a more severe regression. The handoff must state this tradeoff explicitly.

## 14. Workspace capability truth

Current main’s local workspace adapter uses:

```text
MAX_LISTED_FILES = 500
MAX_FILE_BYTES = 1_000_000
```

Behavior:

- recursive listing stops when the counter reaches 500;
- the result contains no completeness flag or cursor;
- files above 1 MB throw `InvalidWorkspacePathError`;
- the same error type represents actual path-policy failures.

This contradicts an honest professional file browser. DVT should not pretend a partial tree is complete.

Required later result shapes:

```ts
type WorkspaceInventoryPage = {
  entries: readonly WorkspaceFileEntry[];
  completeness: 'complete' | 'partial';
  nextCursor: string | null;
  effectiveLimits: WorkspaceInventoryLimits;
};
```

and explicit content outcomes:

```text
found
not_found
oversized
unsupported
invalid_path
```

Do not solve this by merely increasing constants.

## 15. Run-list operational truth

Current `ListRunsUseCase`:

1. asks storage for tenant + limit;
2. filters project/environment in memory;
3. reads statuses;
4. creates a cursor from the filtered subset.

Problems:

- runs from another project can consume the limit and hide authorized later runs;
- a returned `nextCursor` cannot be supplied because `ListRunsQuery` has only `limit`;
- cursor encoding is an unversioned primitive string;
- ordering requires deterministic `(createdAt, runId)` semantics at storage.

This is not the current priority while SQL authority is open, but it remains a concrete P2.

Correct later owner:

- `RunOperationalReadModel` / `ListRuns` rail;
- scope and cursor applied inside `IRunStateStoreRead` before limit;
- one versioned opaque cursor;
- PostgreSQL and in-memory conformance vectors;
- no Web overfetch loop;
- no duplicate `ListScopedRuns` rail.

## 16. Accessibility and UX

PR #2040 improves UX by:

- rendering graph-owned files with a read-only viewer rather than a disabled-looking editor;
- displaying explicit working-tree posture;
- returning localized actionable conflict copy with the path;
- keeping file-authoritative projects editable.

Missing broader evidence:

- no root accessibility gate;
- no explicit screen-reader proof for the new read-only posture;
- no keyboard-only live proof recorded in the PR body;
- no automated contrast/focus regression evidence.

These are follow-up quality gates, not reasons to expand PR #2040.

## 17. Performance and scalability

### 17.1 PR #2040

Preflight reads all artifacts concurrently through `Promise.all`.

For the current narrow graph artifact set, this is acceptable. The handoff should state the expected artifact cardinality and that atomic publication will own the final bounded batch policy.

### 17.2 Active gaps

- no explicit large-graph performance gate;
- no bundle-size budget at root;
- no workspace listing pagination;
- run listing performs one status read per visible run, limited to eight concurrent requests;
- no explicit payload/latency budget for graph projections.

Do not build a generic performance framework before the current authority and atomicity transactions close.

## 18. Governance review

### 18.1 Planning DB strengths

PR #2040 registers:

- design authority;
- component ownership;
- responsibilities;
- ports;
- relations;
- tests;
- evidence;
- the known atomic-publication gap.

This is materially better than a PR that changes behavior without operational ownership.

### 18.2 Planning DB truth correction

The words `legacy-equivalent` and `adopt_legacy_equivalent` imply supported historical state.

Recommended narrow correction before merge:

```text
legacy-equivalent
→ equivalent unmarked graph projection
```

This is not a request for migration behavior. It is a request to keep operational language aligned with the pre-product decision.

### 18.3 Closeout timing

Migration 799 marks the design and evidence implemented inside the same branch that lacks the final handoff.

The runtime proof may be complete, but delivery closeout is not complete until the final head, CI links and handoff are recorded.

Planning DB should not claim a stronger delivery state than the PR can audit.

### 18.4 Current-status drift

`docs/architecture/system-delivery-status.md` remains active and describes itself as the current implementation snapshot, but its review date is 2026-04-26.

The long-term correction should generate or validate this status from current Planning DB queries rather than maintain another hand-edited truth surface.

## 19. Mature-system comparison

### 19.1 dbt Studio — match

Official dbt documentation describes Studio IDE as one web interface for building, testing, running and version-controlling dbt projects.

DVT should match:

- normal dbt files as durable file-authoritative truth;
- explicit state between editing, persistence, diagnostics and execution;
- visible conflicts rather than silent normalization.

DVT may differentiate with graph-first authoring, but only while graph and file authority remain mutually exclusive.

Reference: <https://docs.getdbt.com/>

### 19.2 Professional IDE/Git — match

VS Code distinguishes:

- modified working content;
- staged changes;
- commits;
- diffs;
- conflicts;
- remote synchronization.

DVT should match this honesty: a persisted workspace file is not automatically a Git commit, and a latest revision is not overwrite authorization.

References:

- <https://code.visualstudio.com/docs/sourcecontrol/staging-commits>
- <https://code.visualstudio.com/docs/sourcecontrol/merge-conflicts>

### 19.3 Airflow DAG Bundles — match revision identity

Airflow DAG Bundles version all files needed by a DAG and allow a run to use the same bundle version even when code changes during the run.

DVT should match this at the project-content-set level:

```text
publication receipt
→ exact project content set
→ exact analysis
→ Preview
→ Run
```

Reference: <https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/dag-bundles.html>

### 19.4 Prefect deployments — match version history later

Prefect deployment versions support history, promotion, rollback and exact Git commit or image-digest execution.

DVT should first close exact project revision identity. Promotion and rollback of project revisions can follow later.

Reference: <https://docs.prefect.io/v3/how-to-guides/deployments/versioning>

### 19.5 Dagster — defer asset differentiation

Dagster emphasizes declarative assets, lineage, observability and testability.

DVT should defer broader asset checks, freshness, partitions and collaboration until authoring authority, atomic publication and exact execution identity are reliable.

Reference: <https://docs.dagster.io/>

### 19.6 Temporal — match durable identity principles

Temporal guarantees execution resumes after crashes and infrastructure failures.

DVT should reuse the principles of durable identity, idempotent commands and receipts. It should not introduce a workflow engine inside the editor.

Reference: <https://docs.temporal.io/>

### 19.7 NiFi — differ through Git, not proprietary registry

NiFi Registry was deprecated in February 2026 in favor of Git-based Flow Registry Clients.

DVT should preserve Git as reviewable transport/history and avoid a separate proprietary project-version registry.

Reference: <https://nifi.apache.org/projects/registry/>

## 20. Corrective instruction for PR #2040

### 20.1 Blocking correction — publish the handoff

#### What is wrong

The iteration is implemented and green but not fully auditable.

#### Why it matters

Without one consolidated handoff, the product owner cannot distinguish:

- source-proven facts;
- commands merely claimed;
- red-first tests versus tests added after implementation;
- completed scope versus deferred scope;
- safe rollback versus unsupported assumptions.

#### Exact owner

Implementation agent / PR #2040 delivery owner.

#### Required action

Add a top-level PR comment headed:

```markdown
## Iteration Handoff
```

using the template in section 24.

#### Acceptance

- all mandatory fields present;
- direct links to exact-head workflows;
- direct path/link to live proof;
- explicit pre-product compatibility statement;
- explicit atomicity and revision gaps deferred to the named next task;
- no unsupported claim that marker equals authentication;
- final head stated exactly.

### 20.2 Non-blocking but recommended correction — remove “legacy” domain language

#### What is wrong

The behavior is named `adopt_legacy_equivalent`, but no supported legacy product population exists.

#### Why it matters

The name can cause future agents to invent migration requirements that the product does not own.

#### Correct route

Rename it to a behavior-oriented term, for example:

```ts
mark_equivalent_unmarked_projection
```

Update:

- policy union;
- policy test;
- Planning DB responsibility/evidence wording.

#### What must not be introduced

- migration code;
- historical format detection;
- version negotiation;
- compatibility fixtures;
- signing or secrets.

#### Proof

The existing exact-equality test remains, renamed to state the bootstrap behavior.

### 20.3 No other runtime expansion

Do not add atomic batch publication, exact analysis binding, inventory pagination or recovery to PR #2040.

Those belong to separate verticals.

## 21. Recommended next implementation slice

After PR #2040 closes, the next branch should implement:

```text
E-WEB-DBT-ATOMIC-PUBLICATION-1
```

### 21.1 User transaction

```text
user changes graph-authoritative dbt project
→ DVT builds complete artifact proposal
→ server validates all expected revisions
→ server applies one atomic mutation
→ server returns immutable publication receipt
→ dbt analysis runs against exactly that content set
→ Preview references that analysis
→ Run references that Preview/project revision
→ reopen resolves the same authoritative revision
```

### 21.2 Exact domain owner

`DbtProjectAtomicPublication` or the existing Planning DB owner for `E-WEB-DBT-ATOMIC-PUBLICATION-1`.

Do not create a second workspace repository owner.

### 21.3 Contracts/domain objects

Reuse and extend in place:

```ts
WorkspaceFileBatchMutation
WorkspaceFileBatchReceipt
WorkspaceFileBatchMutationResult
WorkspaceFileSaveReceipt
DbtProjectGraphProjection
```

Add only the missing project-level receipt/provenance object, for example:

```ts
type DbtProjectPublicationReceipt = Readonly<{
  publicationId: string;
  idempotencyKey: string;
  requestHash: string;
  projectRoot: string;
  files: readonly {
    path: string;
    beforeSha256: string | null;
    afterSha256: string | null;
  }[];
  projectContentSetSha256: string;
  analysisSha256: string;
}>;
```

The final shape must follow existing naming and contract conventions discovered during implementation.

### 21.4 Command/query and ports

Use the existing batch mutation authority.

Likely changes:

- expose the existing batch command through the protected API rail;
- Web command port calls one batch operation;
- application service correlates the resulting content set with `ProjectDbtGraphFromFiles`;
- Preview consumes the exact receipt/projection;
- Run admission rejects mismatched or superseded revision identity.

Do not create:

- per-file rollback in Web;
- another local transaction manager;
- another workspace repository;
- double GET as atomic proof;
- a generic “authoring session framework” before the transaction works.

### 21.5 Likely files/components

- `apps/api/src/application/ports/workspaceFiles.ts`
- existing batch mutation application service/route or a narrow protected route extension;
- `apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.ts`
- `apps/web/src/app/ports/workspace.ts`
- `apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.ts`
- `apps/web/src/app/views/canvas/canvasPlanAction.ts`
- `apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts`
- dbt project graph contracts and projection service;
- Preview provenance and Run admission components;
- focused Planning DB design/closeout migrations;
- protected Cypress vertical.

### 21.6 Red tests

1. Conflict on the second file results in zero changed project files.
2. Storage failure during replacement restores all original files.
3. Reusing an idempotency key with the same request returns a deduplicated receipt.
4. Reusing an idempotency key with a different request fails.
5. Publication receipt contains every resulting file hash.
6. `projectContentSetSha256` is deterministic regardless of filesystem traversal order.
7. Analysis consumes exactly the published content set.
8. Preview rejects an analysis for a different content set.
9. Run rejects a Preview/project revision mismatch.
10. Reopen projects the same revision that Preview and Run used.
11. Concurrent Project Code edit causes complete conflict, not partial publication.
12. No browser-side per-file write loop remains for graph publication.

### 21.7 Green proof

- unit tests for batch request/receipt;
- API application tests;
- local gateway fault-injection tests;
- Web publisher tests;
- architecture guard forbidding sequential graph publication;
- protected end-to-end Canvas → publication → analysis → Preview → Run → reopen proof;
- exact-head six-lane CI;
- complete handoff.

### 21.8 Migration/compatibility

DVT is pre-product.

Do not migrate local test artifacts unless a current merged contract explicitly requires it. The branch may reset development fixtures where needed.

### 21.9 Rollback

- revert the implementation commit;
- no persistent user-data migration promise;
- batch gateway must already restore originals on failed replacement;
- receipts should remain diagnosable but not interpreted by reverted code unless explicitly supported.

### 21.10 Observability

Record:

- publication ID;
- idempotency key hash, not raw sensitive input;
- project scope identity;
- number of writes/deletes;
- conflict paths;
- resulting project content-set hash;
- analysis hash;
- Preview/Run correlation IDs;
- failure stage;
- compensation result.

Do not log SQL bodies, credentials or full project contents.

### 21.11 Security

- preserve tenant/project/environment scope;
- validate every path server-side;
- bound file count and total bytes;
- reject duplicate paths;
- do not trust Web-provided absolute paths;
- use runtime schemas at the HTTP boundary;
- keep receipts free of secrets;
- fail closed on revision or analysis mismatch.

### 21.12 Acceptance criteria

- one server-owned atomic operation publishes the complete artifact set;
- no project file changes on any conflict;
- one immutable receipt identifies exact resulting content;
- one exact analysis corresponds to that content;
- Preview and Run reference the same project revision;
- reopen shows that revision;
- browser has no sequential graph publication loop;
- red/green tests and live proof pass;
- complete handoff published;
- Planning DB does not claim completion before final evidence.

### 21.13 Release gate

Do not publish another release merely for intermediate infrastructure.

Release only after the end-to-end atomic transaction is integrated and a user-visible product outcome is complete.

## 22. Subsequent priority sequence

After atomic publication and exact revision:

### Priority 3 — workspace capability truth

- paginated inventory;
- `complete | partial` posture;
- explicit effective limits;
- typed oversized/unsupported/not-found results;
- large-project proof.

### Priority 4 — cohesive authoring recovery

- durable draft/buffer journal;
- crash restore;
- receipt-aware conflict recovery;
- no second persistence rail.

### Priority 5 — product-wide quality gates

- Web/API coverage ratchets;
- accessibility checks;
- bundle budget;
- large-graph performance;
- failure injection;
- generated current-status truth.

### Priority 6 — differentiation

- assets and richer lineage;
- checks/freshness;
- partitions;
- project revision promotion/rollback;
- collaboration.

Do not move these ahead of authority and revision integrity.

## 23. Merge and release decision

### PR #2040

Functional posture: **ready pending delivery closeout**.

Required before merge:

1. complete `## Iteration Handoff`;
2. preferably rename misleading `legacy` domain language;
3. confirm six workflows remain green if the head changes;
4. keep atomic publication out of scope;
5. no new compatibility or migration machinery.

No unresolved inline thread currently blocks the PR.

### Current main

No action required.

### Release

No new release is justified by this no-delta review cycle.

## 24. Required implementation-agent handoff template

```markdown
## Iteration Handoff

### Identity
- Base SHA:
- Final head SHA:
- Branch:
- PR:
- Planning DB work item/design:

### Goal and scope
- User transaction:
- Goal:
- Explicitly out of scope:

### What changed
- User-visible behavior:
- Runtime behavior:
- Files grouped by component/responsibility:
- Migrations:

### How it was implemented
- Domain owner(s):
- Commands/queries reused:
- Ports reused/changed:
- Adapters reused/changed:
- Contracts reused/changed:
- Architecture guards:

### Why this design
- Selected option:
- Rejected alternatives:
- Why no duplicate authority/rail was introduced:

### Red/green chronology
- Red test and observed failure:
- Implementation step:
- Green test/result:
- Regression suites:

### CI and live proof
- Exact-head workflow links:
- Protected browser/integration proof path:
- Proof result:
- Claims not directly executed:

### Security and integrity
- Scope/admission:
- Path/input bounds:
- Data-integrity guarantee:
- Secrets/logging posture:
- Residual threat boundary:

### Observability
- Signals emitted:
- Correlation IDs/receipts:
- Operator-visible failure posture:

### Compatibility and migration
- Product state:
- Supported persisted state:
- Migration required or explicitly not required:

### Rollback
- Revert procedure:
- Persistent-state implications:
- Recovery after partial failure:

### Risks and deviations
- Residual risks:
- Deviations from approved route:
- Follow-up tasks:

### Next iteration
- Exact bounded user transaction:
- Why it is next:
- What must not be folded into it:
```

## 25. Final decision

No new product code has landed and no new implementation commit exists to validate.

PR #2040 materially improves DVT’s SQL authority model and has strong exact-head CI and live-flow source evidence.

The prior reviewer demand to remove byte-identical unmarked marking is corrected: the behavior is safe under explicit graph-draft authority and exact equality. It is not a backward-compatibility promise.

The agent must now:

1. publish the complete handoff;
2. correct the misleading `legacy` name if changing the head;
3. merge only after final evidence is auditable;
4. start atomic project publication and exact revision identity as the next independent vertical.

Do not invent another finding, migration or governance initiative before that product transaction begins.
