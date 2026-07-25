---
title: DVT Fowler Review — No Material Delta, Atomic Publication Still Blocking
status: Review
owner: Architecture / Delivery Control
reviewed_at: 2026-07-25T16:37:20+02:00
reviewed_main_sha: 8c098d6e35ce874efae81609814d99e8e60091f7
---

# DVT Fowler Review — No Material Delta, Atomic Publication Still Blocking

## Executive decision

There is **no material implementation delta** since the previous cycle.

The exact reviewed `main` remains:

```text
8c098d6e35ce874efae81609814d99e8e60091f7
```

That commit is release `0.5.3` (`chore(main): Release 0.5.3 (#2037)`). The functional and governance heads also remain unchanged:

- PR #2040 — model SQL authority containment: `6257745ed1ec91f1a1415585d24e319905966931`;
- PR #2055 — atomic-publication red proof: `58fb694ce7602d5ae3942b5ff83881e2c3e7ec43`;
- PR #2059 — proposed delivery control: `6a6b1847b6e4886605ccbe97290bad1bdb108190`.

The repository is not blocked by missing analysis. It is blocked by the absence of a green, server-owned, multi-file publication transaction tied to one exact project identity.

The current implementation order remains:

1. finish and integrate model SQL authority containment;
2. implement atomic project publication and exact revision identity;
3. make workspace capability limits truthful;
4. provide cohesive authoring recovery;
5. establish product-wide quality gates;
6. pursue later differentiation.

No repository or Planning DB evidence reviewed in this cycle justifies reordering those priorities.

## Scope and evidence boundary

This review inspected:

- exact current `main` and recent release commits;
- all open pull requests;
- exact functional heads and their workflow runs;
- unresolved and recently resolved review threads;
- the latest available implementation handoff;
- relevant Web and API code;
- workspace-file ports, batch mutation adapter and receipts;
- Planning DB sources committed to `main` and open branches;
- ADR-0060 and the accepted dbt round-trip route;
- current documentation posture;
- current official product documentation for dbt Studio, Dagster, Airflow, Prefect, NiFi and Temporal.

This connector environment cannot query the live Planning DB PostgreSQL instance. Therefore:

- repository-backed Planning DB sources were inspected;
- open Planning DB migrations and governance changes were inspected;
- no claim is made that a live `planning:db:query` was executed in this cycle.

The implementation agent must perform and retain the live Planning DB query at the beginning of the next implementation iteration.

## Implementation handoff status

```text
DELIVERY-HANDOFF-MISSING
```

PR #2040 contains a top-level retrospective handoff:

- <https://github.com/dunay2/dvt/pull/2040#issuecomment-5072979847>

It is useful and largely auditable, but it explicitly states that it was reconstructed by a reviewer because the implementation agent did not leave the required report.

The retrospective verifies or identifies:

- exact base and head SHA;
- branch, PR and commit;
- iteration goal;
- what changed and why;
- domain owners and Planning DB records;
- reused commands, queries, ports and adapters;
- affected files and migrations;
- user-visible behavior;
- exact-head CI status;
- security, integrity, observability and compatibility posture;
- rollback and residual risks;
- the next bounded iteration.

It does **not** prove:

- that tests were written first and observed failing before implementation;
- an implementation-agent-authored red/green chronology;
- a retained live-browser artifact or direct live-run output beyond the repository test and PR claim;
- the implementation agent's explicit acceptance of deviations and risks.

Because the contract requires the implementing agent to leave the report, the delivery remains formally incomplete even though the retrospective is useful evidence.

Before unrelated implementation begins, the agent must publish its own bounded handoff for the final iteration head. For #2055, that handoff belongs at the end of the green atomic-publication iteration, not during the intentional red phase.

## Material delta

### Main and release

No delta.

`main` remains at release `0.5.3`. No newer merge, release or release-candidate commit is present.

### PR #2040

No delta.

PR #2040 remains:

- open;
- non-draft;
- mergeable;
- one commit;
- 24 changed files;
- exact head `6257745ed1ec91f1a1415585d24e319905966931`.

All six exact-head workflows remain green:

- Contracts & Determinism;
- Dependency Review;
- Test Suite;
- CI - Code Quality;
- CodeQL;
- PR Quality Gate.

Its only inline review thread is resolved. The alleged requirement to migrate pre-marker development artifacts remains disproved because no concrete deployed-data or released-contract obligation exists.

### PR #2055

No delta.

PR #2055 remains the intentional red phase of `E-WEB-DBT-ATOMIC-PUBLICATION-1`:

- open;
- non-draft;
- mergeable according to GitHub metadata, but **not acceptable to merge** while its test suite is red;
- exact head `58fb694ce7602d5ae3942b5ff83881e2c3e7ec43`;
- one unresolved P1 thread.

Workflow posture remains:

- CodeQL: success;
- Contracts & Determinism: success;
- Dependency Review: success;
- CI - Code Quality: success;
- PR Quality Gate: success;
- Test Suite: failure by design.

The unresolved P1 correctly states that complete preflight does not make sequential writes transactional.

### PR #2059

No delta.

PR #2059 remains an unmerged draft and is therefore not current authority. Its direction is valuable:

- one active design;
- design before implementation;
- live Planning DB lookup;
- reuse before creation;
- one implementation path;
- executable evidence;
- no repeated no-delta artifacts once the rule is effective.

The two previously reported corrections remain unaddressed:

1. `DELIVERY_CONTROL.md` must not self-declare an unmerged draft as already active;
2. the rule must define the deterministic Planning DB operate → Git review/bootstrap → clean import/check recovery cycle.

Until #2059 is merged and the scheduled instruction changes, this review cycle must follow the currently active instruction and create the required report and draft PR.

### Review PR proliferation

The repository currently has several open draft review PRs (#2058, #2060 and #2061) in addition to this cycle's required report.

This is a governance smell, not a product-runtime defect:

- point-in-time review documents are not operational authority;
- multiple open reports create noise and ambiguous review focus;
- #2059 correctly proposes stopping no-delta artifacts after its rule becomes effective.

This cycle does not close or merge those PRs because the current scheduled instruction only mandates creating the new report and forbids merging.

## Claim-to-evidence matrix

| Claim | Status | Evidence and reasoning |
|---|---|---|
| Exact `main` remains `8c098d6e...` | VERIFIED | Current commit search returns release `0.5.3` as latest `main`. |
| Release remains `0.5.3` | VERIFIED | Latest `main` commit is `chore(main): Release 0.5.3 (#2037)`. |
| #2040 prevents graph Preview from overwriting divergent external SQL | VERIFIED on branch | Publication classification, complete preflight, protected Cypress path and exact-head CI are present. |
| Graph-owned Project Code is read-only while file-authoritative dbt remains editable | VERIFIED on branch | #2040 changes Code posture and presentation tests; exact-head CI is green. |
| #2040 tests were written first and observed red | NOT PROVEN | The retrospective handoff cannot reconstruct red-first chronology. |
| #2040 live browser flow was executed | PARTIAL | Test and Planning DB evidence exist and the PR claims execution; no retained artifact/log link was found in the handoff. |
| Legacy or pre-marker migration is required | DISPROVED / OUT OF SCOPE | DVT is pre-product and no released contract or deployed dataset creates a preservation obligation. |
| #2030 reconciliation defect remains open | DISPROVED | It is merged in `main` as `8a39d19e...`; do not reopen it. |
| Complete preflight makes graph-derived publication atomic | CONTRADICTED | Web still saves prepared artifacts one at a time. |
| A late write failure can leave a partial project | VERIFIED | #2055's governed red test reproduces the first write followed by second-write failure. |
| API already has a suitable atomic batch authority | VERIFIED | `IWorkspaceFileBatchMutationPort`, typed receipt, idempotency conflict and `LocalWorkspaceFileBatchMutationGateway` exist on `main`. |
| Exact project content-set and analysis identity are bound to the file-save receipt | NOT PROVEN | `reconcileCodeFilePersistence` ignores `_receipt` and refetches the latest graph projection. |
| Preview and Run are admitted against one exact published project identity | NOT PROVEN | No completed publication receipt → analysis identity → Preview/Run transaction exists. |
| Workspace file inventory is complete and capability-truthful | CONTRADICTED | Listing silently stops at 500 files and has no `complete | partial` posture or cursor. |
| Oversized file and invalid path are distinct failures | CONTRADICTED | `LocalWorkspaceFileRepository` maps files over 1 MB to `InvalidWorkspacePathError`. |
| Run-list pagination is complete and scope-correct | CONTRADICTED | Store limit is applied before project/environment filtering; response emits a cursor but the request has no cursor field. |
| #2059 is current authority | CONTRADICTED | It is an unmerged draft not present on `main`. |
| Current system status documentation is fresh | CONTRADICTED | `docs/architecture/system-delivery-status.md` claims current status but was last reviewed on 2026-04-26. |

## Findings disposition

### Fixed

#### PR #2030 reconciliation edit/retry defect

Status: **fixed in `main`**.

Do not reopen or duplicate it. The remaining exact-project-revision issue is a different problem and belongs to atomic publication.

#### Run operational-truth projection

Status: **fixed in `main` by #2035**.

Run list/detail status projection is unified. The separate list pagination/filtering defect remains active.

### Active — blocking

#### P1: graph-derived DBT publication is not atomic

Owner:

- Web orchestration owner: `DbtGraphWorkspaceArtifactPublisher`;
- application transaction owner: API workspace-file application boundary;
- infrastructure transaction owner: `WorkspaceFileBatchMutation` / `LocalWorkspaceFileBatchMutationGateway`.

Source evidence:

- `apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.ts` performs complete preflight and then loops over `saveFileContent`;
- `apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.test.ts` proves a second write failure leaves the first mutation applied;
- PR #2055 Test Suite fails on the required unchanged-bytes assertion;
- `apps/api/src/application/ports/workspaceFiles.ts` already defines the batch mutation and receipt;
- `apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.ts` already owns idempotency, multipath conflict detection, locking, atomic replacement and durable receipts.

Why it matters:

A failed Preview can leave `dbt_project.yml`, model SQL and YAML schemas describing different project revisions. That is silent data-integrity corruption even though the UI reports an error.

#### P1: exact project identity is not propagated

Owner:

- DBT project analysis/application boundary;
- Canvas file-authoritative reconciliation controller;
- Preview/Run admission.

Source evidence:

`useDbtProjectFileCanvasController.ts` accepts `_receipt: WorkspaceFileSaveReceipt` and ignores it, then refetches the newest available projection.

Why it matters:

A later file change can be analyzed and shown as if it were the project produced by an earlier write. “Latest” is not an execution identity.

### Active — next after atomic publication

#### Workspace capability truth

The local repository has explicit limits but the read model does not disclose them honestly:

- maximum listed files: 500;
- maximum file size: 1 MB;
- list truncation is silent;
- oversized files are reported as invalid paths.

The next capability slice must return explicit completeness and typed capacity diagnostics before DVT claims professional dbt-project compatibility.

#### Cohesive authoring recovery

Atomic file replacement solves mid-transaction corruption, not all authoring recovery:

- unsaved editor buffers still need durable recovery posture;
- exact published, analyzed, previewed and running identities need stale/conflict presentation;
- recovery must not be implemented as hidden browser compensation.

#### Product-wide quality gates

The repository has substantial tests and architecture checks, but product-level ratchets remain uneven:

- no equivalent root coverage ratchet for Web and API comparable to Engine;
- accessibility proof is not a release-wide gate;
- large-graph and large-project performance budgets are not enforced product-wide;
- authoring recovery and exact revision live proof are incomplete.

### Superseded

#### Repeated no-delta review content as operational authority

Point-in-time review Markdown is superseded as an authority mechanism. Planning DB plus merged canonical documents own sequencing and current design.

The current automation still requires a report every cycle. That requirement remains effective until explicitly updated; #2059 cannot override it while unmerged.

### Disproved

#### Mandatory backward compatibility for branch-only or local pre-product artifacts

No preservation obligation was found. Unknown divergent artifacts should fail closed. Do not add migrations, historical matching, version negotiation or compatibility tests without a concrete merged/deployed obligation.

#### Need for a second workspace-file repository or generic browser batch endpoint

The API already has the correct batch port and local adapter. A new repository or generic UI batch route would create duplicate authority and wider attack surface.

## Corrective implementation instruction

### Blocking correction: make publication one server-owned transaction

#### What is wrong

The browser owns an all-artifact preflight but executes each mutation separately. A late conflict or adapter failure leaves earlier files committed.

#### Exact evidence

- `dbtGraphWorkspaceArtifactPublisher.ts`: sequential `saveFileContent` loop;
- #2055 red test: first file mutates, second write fails, original first-file bytes are not restored;
- existing API batch mutation port and adapter prove the repository already has the required transaction primitive.

#### Why it matters

Project files are one logical aggregate for Preview and Run. Publishing only part of that aggregate produces invalid semantics, unreliable reproduction and misleading error handling.

#### Exact owner

- transaction and receipt: API workspace-file application boundary;
- atomic storage: `IWorkspaceFileBatchMutationPort` and `LocalWorkspaceFileBatchMutationGateway`;
- graph projection/preflight: `DbtGraphWorkspaceArtifactPublisher`;
- project analysis: `ProjectDbtGraphFromFiles`;
- execution admission: existing Preview and Run rails.

The implementation agent must query live Planning DB before naming or registering any application command. It must reuse an existing canonical product command if one already owns graph-derived project publication. It must not invent a synonymous public rail solely because the internal service needs extraction.

#### How to correct using existing semantics

1. Query Planning DB for `E-WEB-DBT-ATOMIC-PUBLICATION-1`, current owners, rails, dependencies and design status.
2. Keep graph-derived artifact projection and divergence policy in Web.
3. Send the complete prepared artifact set, complete expected revisions, scope and idempotency input through one protected product command.
4. In API application code, validate bounds and authorization, then invoke one `IWorkspaceFileBatchMutationPort.apply(...)` call.
5. Treat a conflict result as zero writes and return typed conflicts without starting Preview.
6. Verify every receipt path/hash against the proposed set.
7. Run `ProjectDbtGraphFromFiles` after successful publication.
8. Build one immutable publication identity containing at least:
   - request/operation identity;
   - exact paths and resulting content hashes;
   - `projectContentSetSha256`;
   - `analysisSha256`;
   - project root and Canvas identity;
   - deduplication posture.
9. Admit Preview only for that exact identity.
10. Admit Run only from the exact persisted Preview identity.
11. On reopen, classify the project as exact, stale or conflict by comparing current identity with the last publication/analysis receipt.

#### What must not be introduced

- no generic browser-visible batch mutation endpoint;
- no second workspace repository;
- no browser compensation loop;
- no dbt-specific synonym for existing Preview or Run rails;
- no SHA calculation in presentation code as an authority substitute;
- no SQL or YAML bodies in logs;
- no compatibility migration for disposable pre-product artifacts;
- no second active implementation PR for the same transaction.

#### Likely components and paths

The exact final list must follow live Planning DB ownership, but the existing likely surfaces are:

- `apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.ts`;
- `apps/web/src/app/views/canvas/canvasPlanAction.ts`;
- `apps/web/src/app/ports/workspace.ts`;
- the Web protected API adapter for workspace/project commands;
- `apps/api/src/application/ports/workspaceFiles.ts`;
- a bounded API application service behind the existing protected product transaction;
- API route composition and request validation only if no governed route already owns the transaction;
- `apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.ts` only if its existing behavior fails a required test;
- `ProjectDbtGraphFromFiles` and its receipt/projection contracts;
- Preview/Run admission tests;
- protected live Cypress proof;
- current Planning DB records through the repository-approved operational lifecycle.

#### Red tests

Keep the existing red test unchanged in meaning:

```text
second artifact fails
→ first artifact remains byte-for-byte original
→ second artifact remains original
→ no Preview
→ no Run
```

Add API/application tests proving:

1. conflict on any expected path returns all relevant conflicts and writes nothing;
2. injected replacement failure leaves all files and the previous receipt intact;
3. identical retry with the same idempotency key returns the same receipt with `deduplicated: true`;
4. same key with different content fails closed;
5. omitted expected revision is rejected where project publication requires total CAS;
6. receipt path/hash mismatch is rejected;
7. analysis identity differs after any file changes;
8. Preview rejects an identity not produced by the publication receipt;
9. Run rejects or requires a new Preview after project identity changes;
10. telemetry never contains file bodies.

#### Green proof

Required executed proof:

- focused Web publisher tests;
- API application and adapter tests;
- contract validation if the receipt contract changes;
- architecture tests proving Web cannot call a generic batch adapter;
- `pnpm verify:prepush`;
- exact-head six-workflow CI;
- protected browser flow:

```text
Canvas authoring
→ publish complete project
→ analyze exact project
→ Preview exact identity
→ Run exact identity
→ reopen exact identity
```

and a conflict variant proving zero writes and no Preview/Run.

#### Acceptance criteria

- current #2055 red assertion is green without weakening it;
- every project publication is one multipath transaction;
- any conflict produces zero changed project files;
- identical retries are deterministic;
- receipt contains paths/hashes and identity, never content;
- analysis, Preview and Run share one exact project identity;
- stale and conflict posture is user-visible;
- current unresolved P1 is resolved only after final-head evidence exists;
- implementation agent publishes a complete handoff.

#### Rollback

Before merge, rollback is branch deletion or revert.

After merge, rollback is a normal Git revert of the application command and Web integration. Runtime compensation must not be required because each batch either commits completely or leaves the previous state intact.

Do not roll back by restoring browser-cached file bodies.

#### Observability

Record structured signals for:

- publication accepted/applied/deduplicated/conflicted/failed;
- operation or receipt ID;
- tenant/project/environment scope in the existing safe form;
- file count and aggregate byte count;
- paths and content hashes only where existing logging policy permits;
- project content-set and analysis hashes;
- Preview/Run identity mismatch;
- adapter latency and failure class.

Never log SQL, YAML, secrets, credentials or full request bodies.

#### Security

- retain existing authentication and tenant/project/environment authorization;
- validate all paths through the existing workspace path policy;
- retain explicit file-count/file-size/batch-size limits;
- avoid exposing the generic mutation primitive to arbitrary browser callers;
- treat the graph-managed marker as an integrity indicator, not authentication;
- reject unknown or divergent artifacts fail-closed;
- protect idempotency receipt storage with the same scoped storage boundary.

#### Why this restores the intended product route

It turns Canvas, Code, Preview and Run from loosely related latest-state operations into one reproducible project transaction. That is the minimum foundation for professional dbt authoring and for later DVT differentiation.

## Follow-up corrections

### Workspace capability truth

After atomic publication and exact identity:

- replace silent 500-file truncation with pagination or explicit `complete | partial` posture;
- return typed size/capability diagnostics distinct from invalid paths;
- expose supported dbt file types and limits;
- prove large-project behavior and bounded memory/time.

### Run-list pagination

Push tenant/project/environment filtering into the store query before limiting. Add cursor input, deterministic ordering and tie-breaking. Do not emit an unusable cursor.

### Cohesive recovery

Add durable buffer/session recovery and exact/stale/conflict reopening after the publication transaction exists. Recovery must be visible and explicit, not inferred from whatever happens to be latest.

### Product documentation

Update `docs/architecture/system-delivery-status.md` or replace its claim to be current. Its `last_reviewed` and snapshot date are 2026-04-26 and do not describe July's product state.

## Current CI and review-thread state

| PR | Head | CI | Threads | Merge posture |
|---|---|---|---|---|
| #2040 | `6257745ed1...` | six standard workflows green | 0 unresolved; 1 resolved compatibility thread | functionally credible; formal implementer handoff missing |
| #2055 | `58fb694ce7...` | Test Suite red; remaining visible standard workflows green | 1 unresolved P1 | must not merge while red |
| #2059 | `6a6b1847b6...` | PR Quality Gate and Code Quality green; product workflows skipped for docs | 0 inline threads; blocking top-level governance comment unanswered | proposal only; not current authority |
| #2058/#2060/#2061 | documentation-only review PRs | documentation-scoped CI | no product correction | superseded as operational authority; still open |

No thread or CI transition since the previous cycle changes the product decision.

## Priority impact

No legitimate authority change was found.

The priority remains:

```text
model SQL authority containment
→ atomic project publication
→ exact project revision identity
→ workspace capability truth
→ authoring recovery
→ quality gates
→ later differentiation
```

The model SQL work is ready for normal closeout but is not in `main`. Atomic publication is the active blocker and already has an executable red proof.

## Mature-product comparison

| System | Current relevant capability | Honest DVT comparison |
|---|---|---|
| dbt Studio | One web IDE for building, testing, running and version-controlling normal dbt projects. | DVT has emerging graph/code/run integration, but cannot yet guarantee that one complete project revision is the unit published and executed. |
| Airflow | Versioned DAG Bundles let a run use one bundle version throughout execution, including exact Git-backed versions. | DVT's intended `projectContentSetSha256 → analysisSha256 → Preview → Run` route is correct, but is not implemented end to end. |
| Prefect | Deployment version history supports promotion and rollback to prior runnable versions. | DVT has hashes and receipts in parts of the system, but no cohesive published-project promotion/rollback identity. |
| Dagster | Asset-centric model provides integrated lineage, observability and testability. | DVT's graph is architecturally promising, but product-wide asset checks, freshness and operational lineage posture remain less mature. |
| NiFi | Visual version states distinguish up-to-date, locally modified, stale, modified-and-stale and sync failure; current direction favors Git-backed registry clients. | DVT should expose similarly honest exact/stale/conflict states and reuse Git rather than inventing a proprietary registry. |
| Temporal | Durable execution resumes after process/infrastructure failure. | DVT uses durable runtime concepts, but authoring publication is not yet one durable transaction tied to execution identity. |
| Professional IDE/Git | Buffers, files, diffs, conflicts, staging, commits and remote synchronization are separate explicit states. | DVT has improved working-tree language and conflict handling, but still lacks complete crash recovery and project-level transactional identity. |

Official references inspected:

- dbt Studio: <https://docs.getdbt.com/>;
- Dagster: <https://docs.dagster.io/>;
- Airflow DAG Bundles: <https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/dag-bundles.html>;
- Prefect deployment versioning: <https://docs.prefect.io/v3/how-to-guides/deployments/versioning>;
- NiFi Registry deprecation and Git clients: <https://nifi.apache.org/projects/registry/>;
- NiFi version states: <https://nifi.apache.org/nifi-docs/user-guide.html>;
- Temporal durable execution: <https://docs.temporal.io/>.

## Required next implementation slice

### Work item

`E-WEB-DBT-ATOMIC-PUBLICATION-1`

### Transaction

```text
complete graph-derived artifacts
→ complete expected revisions
→ one server-owned idempotent batch mutation
→ immutable publication receipt
→ projectContentSetSha256
→ ProjectDbtGraphFromFiles
→ analysisSha256
→ Preview exact identity
→ Run exact identity
→ reopen as exact / stale / conflict
```

### First action

The implementation agent must query the live Planning DB for:

- task state;
- active design;
- dependency state;
- canonical command/query owner;
- existing components and rails;
- required acceptance evidence.

It must then continue on one branch/PR path. Do not create another parallel red PR or planning document.

## Handoff required at the end of the slice

The implementation agent must publish one top-level `## Iteration Handoff` containing:

1. exact base SHA and final head SHA;
2. branch and PR;
3. Planning DB task/design/dependency query output or durable references;
4. iteration goal;
5. what changed;
6. how it was implemented;
7. why the design was selected;
8. exact domain owner;
9. commands, queries, ports, adapters and contracts reused or changed;
10. migrations or current-state Planning DB surfaces touched;
11. complete file inventory;
12. user-visible behavior;
13. tests observed red before implementation;
14. tests passed after implementation;
15. exact CI/workflow links;
16. live browser/integration proof and retained artifact/log link;
17. security posture;
18. data-integrity posture;
19. observability posture;
20. compatibility posture, explicitly noting pre-product disposable state;
21. rollback;
22. unresolved risks;
23. deviations from the approved route;
24. recommended next iteration.

Every item must distinguish a claim from executed evidence.

## Final Fowler verdict

The repository has enough architecture and enough analysis to proceed.

The brutal truth is simple:

- #2040 is still waiting outside `main` despite green evidence;
- #2055 proves the next defect but deliberately leaves the repository red;
- #2059 proposes a cleaner delivery model but is not yet authority;
- repeated review PRs are producing governance noise;
- the product still cannot say that the project a user previewed is exactly the project that was atomically published, analyzed and run.

Do not add another conceptual layer. Close the current authority work, make the red transaction green using the existing batch port, and bind the receipt to Preview and Run.