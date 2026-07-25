---
title: DVT Fowler Review — No Product Delta, Delivery Stall
date: 2026-07-25T20:40:00+02:00
status: point-in-time-review
reviewed_main_sha: 8c098d6e35ce874efae81609814d99e8e60091f7
owner: Architecture / Delivery Review
---

# DVT Fowler Review — No Product Delta, Delivery Stall

## Executive decision

There is **no material product or runtime delta** since the previous cycle.

The exact reviewed `main` remains:

- `8c098d6e35ce874efae81609814d99e8e60091f7`
- `chore(main): Release 0.5.3 (#2037)`
- commit: <https://github.com/dunay2/dvt/commit/8c098d6e35ce874efae81609814d99e8e60091f7>

The repository is no longer blocked by missing analysis. It is blocked by delivery:

1. PR #2040 is functionally green but still outside `main`.
2. PR #2055 proves the next P1 but intentionally remains red and contains no green implementation.
3. The implementation agent has not supplied a valid final handoff.
4. Repeated point-in-time review PRs have accumulated while the single product transaction remains unchanged.

The next implementation slice remains `E-WEB-DBT-ATOMIC-PUBLICATION-1`: one server-owned, idempotent, multi-path compare-and-swap transaction whose immutable receipt binds project content-set, analysis, Preview, Run, and reopen to one exact identity.

## Scope and evidence boundary

Reviewed:

- exact `main` and recent commit history;
- every open pull request;
- exact heads and pull-request workflow runs for #2040, #2055, #2059, and the previous review;
- unresolved and resolved inline review threads;
- relevant open-branch diffs;
- SQL-authority publication code;
- workspace file repository limits and mutation semantics;
- file-backed reconciliation behavior;
- run-list filtering and cursor behavior;
- ADR-0060 and the accepted dbt round-trip plan;
- repository-backed Planning DB design/task sources;
- current-status documentation;
- official product documentation for dbt, Airflow, Prefect, Dagster, NiFi, and Temporal.

Limitation:

This connector environment cannot execute SQL against the live Planning DB instance. Therefore live Planning DB state is **NOT PROVEN** in this cycle. The review uses repository-backed Planning DB sources and open-branch records and does not pretend that they are a live query result.

## Implementation iteration handoff

### Status

`DELIVERY-HANDOFF-MISSING`

The latest handoff-like artifact is the retrospective reviewer reconstruction on PR #2040:

- <https://github.com/dunay2/dvt/pull/2040#issuecomment-5072979847>

It is useful evidence, but it was not left by the implementation agent at iteration close. It explicitly cannot prove red-first chronology.

### Missing or non-acceptable fields

The implementation iteration remains formally unauditable because the implementer did not provide:

- an implementer-authored final handoff on the exact final head;
- observed test-first red chronology rather than retrospective inference;
- a retained or directly linked live-browser artifact/log;
- implementer acceptance of residual risks, deviations, rollback, and next-slice boundaries;
- an end-of-iteration declaration that no unrelated work began before handoff.

### Required instruction to the implementation agent

Before unrelated implementation work:

1. publish the final `## Iteration Handoff` on the active functional PR;
2. use the exact final head SHA and direct CI links;
3. distinguish repository claims, executed commands, CI evidence, and unavailable evidence;
4. never infer or fabricate a red-first sequence;
5. state the pre-product compatibility posture explicitly;
6. identify the single next Planning DB task and active branch.

## Current open work

### PR #2040 — model SQL authority containment

- URL: <https://github.com/dunay2/dvt/pull/2040>
- base: `main@8c098d6e35ce874efae81609814d99e8e60091f7`
- head: `6257745ed1ec91f1a1415585d24e319905966931`
- state: open, ready, mergeable
- commits: 1
- unresolved inline threads: 0
- resolved inline threads: 1

Exact-head workflows:

- Contracts & Determinism: success
- Dependency Review: success
- Test Suite: success
- CI — Code Quality: success
- CodeQL: success
- PR Quality Gate: success

Verified behavior on the branch:

- graph-managed SQL carries a deterministic payload-integrity marker;
- all proposed artifacts are read and classified before the first write;
- the observed file revision is retained as the write precondition;
- divergent or malformed model SQL fails closed;
- graph-owned Project Code is read-only;
- file-authoritative dbt projects remain editable;
- the protected browser test covers external SQL preservation.

Not fixed in `main`:

- none of this code is in the released branch until #2040 is integrated.

### PR #2055 — atomic-publication red proof

- URL: <https://github.com/dunay2/dvt/pull/2055>
- base: `main`
- logical dependency: #2040
- head: `58fb694ce7602d5ae3942b5ff83881e2c3e7ec43`
- state: open, ready, mergeable, intentionally red
- isolated delta over #2040: one test file, `+46/-0`
- unresolved inline threads: 1 P1

Exact-head workflows:

- CodeQL: success
- Contracts & Determinism: success
- Dependency Review: success
- CI — Code Quality: success
- PR Quality Gate: success
- Test Suite: failure

The failure is expected and valuable. It proves:

```text
complete preflight succeeds
→ first artifact is written
→ second revision-guarded write fails
→ first artifact remains incorrectly modified
```

The test must remain red until a real atomic transaction exists. It must not be weakened, skipped, isolated from the real publisher, or converted into a mocked success.

### PR #2059 — active-design delivery control proposal

- URL: <https://github.com/dunay2/dvt/pull/2059>
- head: `6a6b1847b6e4886605ccbe97290bad1bdb108190`
- state: open draft
- scope: seven instruction/documentation files
- unresolved inline threads: 0

CI:

- PR Quality Gate: success
- CI — Code Quality: success
- product workflows: skipped for documentation scope

Direction accepted in principle:

- one current design;
- design before implementation;
- Planning DB lookup and reuse before creation;
- one implementation path per outcome;
- executable evidence;
- bounded handoff;
- Git history rather than canonical intermediate-state documents.

Still blocking:

1. An unmerged draft declares itself `Active`, creating a second authority.
2. The durable `planning:db:operate → reviewable Git projection → clean import → check` cycle is not fully defined.
3. The concrete disposition of #2040 and #2055 is not executed.
4. Local `docs:sync`, governance refresh, and `verify:prepush` are not proven.

#2059 is not current authority until merged into `main`.

## Claim-to-evidence matrix

| Claim | Status | Evidence and disposition |
| --- | --- | --- |
| Exact `main` is release 0.5.3 at `8c098d6e...` | VERIFIED | Current commit search; no newer commit appears on default branch. |
| There is a material product delta since the previous cycle | CONTRADICTED | `main`, #2040, #2055, and #2059 heads are unchanged. |
| #2040 contains SQL-authority containment | VERIFIED | Diff, tests, exact-head CI, resolved review state. |
| SQL-authority containment is released | CONTRADICTED | #2040 remains open and outside `main`. |
| #2040 has a valid implementer handoff | NOT PROVEN | Only a reviewer-reconstructed retrospective exists. |
| #2040 tests were written and observed red first | NOT PROVEN | Repository history and handoff do not prove it. |
| #2040 exact-head standard CI is green | VERIFIED | Six successful workflow runs on `6257745ed1...`. |
| #2055 proves partial multi-file publication | VERIFIED | Governed Web test fails on the exact rollback assertion. |
| Graph artifact publication is atomic | CONTRADICTED | Publisher performs a per-file save loop after preflight. |
| Publication, analysis, Preview, and Run share one exact identity | NOT PROVEN | No immutable server-owned publication receipt currently binds all stages. |
| `WorkspaceFileSaveReceipt` drives exact reconciliation | CONTRADICTED | `reconcileCodeFilePersistence` ignores `_receipt` and refetches latest projection. |
| Workspace inventory is complete and honest | CONTRADICTED | Listing silently stops at 500; no `complete/partial` posture or cursor. |
| Oversized workspace content has a distinct capability error | CONTRADICTED | Files over 1 MB throw `InvalidWorkspacePathError`. |
| `ListRuns` provides correct scoped pagination | CONTRADICTED | Store limit occurs before project/environment filtering; request has no cursor input. |
| Live Planning DB sequencing was queried in this cycle | NOT PROVEN | Connector has no live Planning DB connection. |
| Repository-backed task evidence keeps atomic publication next | VERIFIED | Branch migration 799 records `E-WEB-DBT-ATOMIC-PUBLICATION-1` and the transaction-boundary gap. |
| A pre-marker compatibility migration is required | DISPROVED / OUT OF SCOPE | DVT is pre-product and no deployed preservation obligation is cited. |
| PR #2030 reconciliation defect is still active | DISPROVED | It is merged in `main` and must not be reopened. |
| PR #2059 is governing authority now | CONTRADICTED | It remains an unmerged draft. |
| `system-delivery-status.md` is a fresh current snapshot | CONTRADICTED | It claims current status but was last reviewed on 2026-04-26. |

## Fowler disposition

### Fixed in `main`

- PR #2030 pending reconciliation receipt truth.
- PR #2035 run operational truth projection.
- release 0.5.3.

### Implemented only on an open branch

- model SQL authority containment in #2040.

This is not “fixed” at product level until merged and released.

### Active

#### P1 — multi-file publication is not atomic

Source:

`apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.ts`

The branch performs a complete preflight, then loops over `saveFileContent`. A late conflict or I/O failure can leave a valid but mixed project revision.

#### P1 — exact project identity is not end-to-end

Source:

`apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts`

The reconciliation callback receives `_receipt: WorkspaceFileSaveReceipt` but ignores it and fetches the newest projection. “Newest” is not evidence that analysis corresponds to the write receipt.

ADR-0060 requires project revision and analysis hash in Preview/Run receipts and requires atomic file mutation during authority transition.

#### P1 after atomic publication — workspace capability truth

Source:

`apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts`

- `MAX_LISTED_FILES = 500`;
- `MAX_FILE_BYTES = 1_000_000`;
- listing truncates silently;
- oversized reads/writes become invalid-path errors.

This is not yet a trustworthy project inventory for professional dbt projects.

#### P2 — run-list pagination semantics

Source:

`apps/api/src/application/services/listRunsUseCase.ts`

The state store receives tenant and limit, then the application filters project/environment. Authorized rows beyond the tenant-limited prefix can disappear. `nextCursor` is produced, but the request path does not consume a cursor in the inspected use case.

#### P2 — cohesive authoring recovery

Current UI can flush and warn during ordinary navigation, but no durable crash-recovery journal is proven for unsynchronized authoring state.

#### P2 — product-wide quality gates

Engine has explicit coverage treatment. Equivalent enforced Web/API accessibility, performance, bundle-size, and large-graph ratchets are not proven as product-wide release gates.

#### P2 — stale current-status documentation

`docs/architecture/system-delivery-status.md` is presented as current but its snapshot is dated 2026-04-26. It should be refreshed from current sources or renamed as an historical snapshot.

### Superseded

The previous no-delta review PRs are point-in-time artifacts, not active design authority. They should be closed as superseded rather than remain parallel open “current state” descriptions.

### Disproved or out of scope

- preserving unreleased pre-marker workspaces through migration;
- reopening #2030;
- adding a DVT-specific dbt language;
- a generic browser batch mutation endpoint;
- browser-side compensating rollback;
- a second workspace repository;
- treating an integrity digest as creator authentication;
- creating another registry when Git-backed version control already exists.

## Deviation review and corrective implementation instructions

## Blocking correction A — close model SQL authority delivery

### What is wrong

#2040 is green and reviewed but remains outside `main`; its implementation iteration was not closed by the implementer.

### Why it matters

#2055 is stacked logically on #2040. Keeping the prerequisite open while adding dependent work obscures the actual product baseline and inflates the visible diff.

### Owner

Product / Architecture delivery owner for `E-WEB-DBT-MODEL-SQL-AUTHORITY-1`.

### Correction

- publish/confirm the implementer handoff;
- make the final merge decision for #2040;
- do not add atomic-publication code to #2040;
- after integration, rebase or restack #2055 so its active delta is isolated.

### Red proof

Not applicable: #2040’s functional tests are already green. The missing evidence is delivery/handoff provenance.

### Green proof

- final exact head with six green workflows;
- zero unresolved threads;
- valid handoff;
- merge/release evidence or an explicit rejected/closed decision.

### Rollback

Normal revert; no deployed compatibility migration exists.

### Observability and security

No new runtime logging or security mechanism is needed for closeout.

## Blocking correction B — server-owned atomic DBT publication

### What is wrong

The Web publisher owns a sequential cross-file mutation loop. Preflight is not a transaction.

### Source evidence

- `dbtGraphWorkspaceArtifactPublisher.ts` lines containing the save loop;
- the failing test in #2055;
- unresolved P1 thread on #2055;
- Planning DB gap `GAP-DBT-GRAPH-WORKSPACE-ATOMIC-PUBLICATION`.

### Why it matters

A project may contain a mixture of old and new SQL/YAML while no Preview is created. That violates project integrity and makes later analysis ambiguous.

### Exact owner

- application command owner: graph-derived DBT project publication;
- transaction owner: existing `WorkspaceFileBatchMutation` boundary;
- adapter: `LocalWorkspaceFileBatchMutationGateway`;
- projection owner: `ProjectDbtGraphFromFiles`.

### Correct using existing semantics

1. Web keeps pure projection and divergence classification.
2. Web sends the complete prepared artifact set, expected revisions, scope, and idempotency key to one protected product-specific application command.
3. API maps the request to one `IWorkspaceFileBatchMutationPort.apply(...)` call.
4. Any conflict returns all relevant conflict paths and commits nothing.
5. Verify the batch receipt against every requested path/hash.
6. Analyze the exact resulting project through `ProjectDbtGraphFromFiles`.
7. Return an immutable publication receipt carrying:
   - schema version;
   - operation/receipt ID;
   - request hash;
   - idempotency posture;
   - paths and content hashes;
   - project root;
   - `projectContentSetSha256`;
   - `analysisSha256`;
   - authority/canvas identity.
8. Preview consumes that receipt identity rather than “latest files”.

### Must not introduce

- generic browser batch endpoint;
- browser compensation loop;
- second file repository;
- dbt-specific synonyms for existing Preview/Run rails;
- authoritative hashes calculated in React;
- SQL/YAML bodies in logs;
- compatibility versions for unreleased local artifacts.

### Red tests

- current #2055 late-second-artifact failure leaves all original bytes unchanged;
- conflict on first/middle/last path produces zero writes;
- injected replacement failure restores/retains the original complete set;
- same idempotency key plus same request returns the same receipt;
- same key plus different request fails closed;
- missing receipt path/hash is a persistence invariant failure;
- Preview with a different content-set identity is rejected;
- Run after a changed project requires a new Preview.

### Green proof

- focused API command tests;
- batch gateway failure-injection integration test;
- existing Web red test becomes green without weaker assertions;
- protected browser flow proves publish → analyze → Preview → Run with matching identity;
- six standard workflows green on final head.

### Live/integration proof

The browser flow must modify more than one artifact, publish once, inspect the returned identity, Preview, Run, reopen, and verify exact/stale/conflict posture. No route intercept may fake the publication receipt.

### Acceptance criteria

- all-or-nothing bytes;
- deterministic idempotency;
- immutable receipt;
- exact analysis identity;
- exact Preview/Run binding;
- no body logging;
- P1 resolved only after green evidence.

### Rollback

Revert the application command, adapter composition, contract, and Web port together. Pre-product test workspaces are disposable; no migration path is required.

### Observability

Emit operation ID, scope identifiers, count, paths or path hashes, result class, conflict count, duration, and content-set/analysis hashes. Never emit file bodies, secrets, or `profiles.yml`.

### Security

Use the existing protected scope authorization and bounded input policy. Reject duplicate paths, traversal, unsupported paths, oversized aggregate requests, idempotency mismatches, and unknown receipt schemas.

### Why this restores the product route

It makes the user-visible project a single committed unit before it is analyzed or executed and reuses the existing infrastructure rather than creating a second authority.

## Blocking correction C — exact revision admission

### What is wrong

Publication and analysis can still be followed by “latest state” reads. That permits time-of-check/time-of-use drift.

### Owner

Project publication receipt and Preview/Run admission boundaries.

### Correction

- remove ignored receipt semantics;
- make project graph queries accept or return exact content-set identity;
- Preview must record and validate publication receipt ID, project content-set hash, and analysis hash;
- Run must consume the persisted Preview identity;
- reopen must classify exact, stale, or conflict.

### Must not introduce

- another semantic authority;
- latest-state fallback;
- browser-generated authoritative digest;
- automatic file-backed to graph-draft fallback.

### Proof

A single file edit after Preview must prevent Run from pretending to execute the prior project revision unless the run explicitly consumes the retained prior bundle.

## Follow-up correction — workspace capability truth

After atomic publication and exact identity:

- introduce an explicit inventory result with `complete | partial`, count, limit, and cursor/continuation;
- separate invalid path, unsupported file type, file too large, and aggregate limit errors;
- define supported dbt project file classes and diagnostics;
- exercise large project and deep tree tests;
- keep traversal bounded and fail closed.

## Follow-up correction — run-list pagination

Push project/environment scope and cursor into the state-store query. Use a deterministic `(createdAt, runId)` order and cursor, and test that authorized later rows are never hidden by unrelated tenant rows.

## Priority authority and sequencing

No legitimate authority change is proven.

Repository evidence continues to order work as:

1. model SQL authority — implemented in #2040 but not in `main`;
2. atomic project publication and exact revision identity — active P1, red proof #2055;
3. workspace capability truth;
4. cohesive authoring recovery;
5. product-wide quality gates;
6. later differentiation.

ADR-0060 remains the merged normative authority. The accepted dbt round-trip plan requires reuse of existing workspace rails, atomic batch mutation, server-side analysis, and exact project revision binding.

The former `dvt-product-priority-execution-guide-20260721.md` remains absent from `main` and has no authority.

## Product comparison

### dbt Studio

Official dbt documentation describes Studio as one interface for building, testing, running, and version-controlling normal dbt projects:

- <https://docs.getdbt.com/>

DVT has a stronger graph-first compositional ambition, but it is currently behind Studio in dependable project lifecycle because DVT cannot yet prove that the project edited, published, analyzed, previewed, and run is the same immutable revision.

### Airflow

Airflow DAG Bundles version the complete set of files needed by a DAG and allow a run to retain one bundle version even when code changes mid-run:

- <https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/dag-bundles.html>

DVT’s missing publication receipt is therefore not optional polish. It is the prerequisite for comparable reproducibility.

### Prefect

Prefect deployment versions support version history, promotion, rollback, and synchronization with exact Git commits or image versions:

- <https://docs.prefect.io/v3/how-to-guides/deployments/versioning>

DVT does not yet expose an equivalent stable project/deployment identity.

### Dagster

Dagster positions integrated lineage, observability, declarative assets, and testability as core product capabilities:

- <https://docs.dagster.io/>

DVT’s graph can become differentiated, but today its exact revision, checks, freshness, and product-wide observability gates are incomplete.

### NiFi

Apache NiFi has deprecated standalone NiFi Registry in favor of Git-based Flow Registry Clients:

- <https://nifi.apache.org/projects/registry/>
- <https://nifi.apache.org/components/org.apache.nifi.github.GitHubFlowRegistryClient/>

DVT should not build another proprietary version registry. It should expose clear working-tree, published-revision, analysis, Preview, Run, and Git states.

### Temporal

Temporal provides durable execution that resumes after crashes and outages:

- <https://docs.temporal.io/>

DVT uses Temporal at runtime, but the authoring transaction and unsynchronized editor recovery are separate concerns and remain incomplete.

### Professional IDE and Git workflow

A professional authoring surface distinguishes:

- editor buffer;
- working tree;
- saved revision;
- conflict/stale state;
- diff;
- stage;
- commit;
- push;
- deployed/run revision.

DVT correctly avoids calling a workspace write a Git commit, but it still lacks one clear published project revision connecting authoring to execution.

## Current CI and review state

| PR | Head | Workflows | Threads | Decision |
| --- | --- | --- | --- | --- |
| #2040 | `6257745ed1...` | six success | 0 open, 1 resolved | functionally ready; handoff/delivery closeout absent |
| #2055 | `58fb694ce7...` | five success, Test Suite failure | 1 open P1 | correct red phase; must not merge |
| #2059 | `6a6b1847b6...` | Gate and Code Quality success; others skipped | 0 inline | useful proposal, not authority |
| #2062 | `1f7d453eda...` | Gate and Code Quality success; others skipped | not material | superseded by this review |

## Review-artifact hygiene

Before this cycle, multiple superseded no-delta review PRs remained open. They are not active authority and create review noise. This cycle should leave only the newest review open and close older point-in-time review PRs as superseded, without merging them.

This cleanup changes no product code or normative design.

## Next implementation slice

### Name

`E-WEB-DBT-ATOMIC-PUBLICATION-1`

### User transaction

```text
Canvas graph-draft changes
→ complete DBT artifact projection
→ complete expected revisions
→ one protected server-owned atomic publication
→ immutable publication receipt
→ exact ProjectDbtGraphFromFiles analysis
→ Preview with the same identity
→ Run with the persisted Preview identity
→ reopen as exact / stale / conflict
```

### Required end-of-slice handoff

The implementation agent must publish one final report containing:

- exact base and final head SHAs;
- branch and PR;
- Planning DB task/design/dependency query result;
- goal and user transaction;
- what changed, how, and why;
- exact domain owners;
- commands/queries reused or promoted;
- ports, adapters, contracts, route groups, stores, and migrations/current-state sources;
- all files touched;
- user-visible behavior;
- observed red-first tests and final green commands;
- direct CI run links;
- live protected browser/integration artifact;
- security, input bounds, integrity, observability, compatibility, and rollback posture;
- deviations and unresolved risks;
- claim-to-evidence matrix;
- exact next task.

A PR summary without those fields is not sufficient.

## Final verdict

No new defect needs to be invented and no further architecture review is needed before implementation.

The current product path is stalled, not unclear:

- close/integrate #2040;
- convert #2055 from the demonstrated red failure into one green server-owned transaction;
- bind exact identity through Preview and Run;
- leave a real implementer handoff.

Anything else is secondary until that transaction is complete.
