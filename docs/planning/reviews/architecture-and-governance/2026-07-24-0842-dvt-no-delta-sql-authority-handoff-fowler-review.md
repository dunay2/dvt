---
title: DVT No-Delta SQL Authority Handoff Fowler Review
status: Review
owner: Architecture / Governance / Delivery
reviewed_repository: dunay2/dvt
reviewed_ref: main
reviewed_commit: 8c098d6e35ce874efae81609814d99e8e60091f7
reviewed_at: 2026-07-24T08:42:00+02:00
planning_type: point-in-time-review
supersedes_review_pr: 2051
---

# DVT No-Delta SQL Authority Handoff Fowler Review

## 1. Executive decision

There is no material repository or product delta since the preceding review.

The exact reviewed `main` remains:

```text
8c098d6e35ce874efae81609814d99e8e60091f7
chore(main): Release 0.5.3 (#2037)
```

The active functional pull request remains:

```text
PR: #2040
Branch: fix/dbt-model-sql-authority-containment
Head: 6257745ed1ec91f1a1415585d24e319905966931
Base: main@8c098d6e35ce874efae81609814d99e8e60091f7
```

PR #2040 has no newly demonstrated runtime blocker. Its six standard workflows are green and its only review thread is resolved.

The implementation iteration is still not auditable as a delivery unit because no complete top-level `## Iteration Handoff` exists.

```text
DELIVERY-HANDOFF-MISSING
```

The immediate instruction is therefore not another runtime correction. The implementer must close the delivery record for #2040, then move to the already-governed atomic multi-file publication and exact project-revision slice.

No compatibility migration is required. DVT is pre-product and no merged contract or deployed dataset establishes a pre-marker preservation obligation.

## 2. Material delta

### 2.1 Main

No new commit has entered `main` after release `0.5.3`.

### 2.2 Functional work

PR #2040 remains on the same single implementation commit. There are no new source files, tests, migrations, review findings, or workflow results to reconcile.

### 2.3 Review work

The previous point-in-time review is PR #2051. This report supersedes its current-state assessment but does not replace Planning DB, accepted ADRs, current source, or executable tests as operational authority.

### 2.4 Release

`0.5.3` remains the current repository version. No new release candidate is open.

## 3. Evidence and inspection scope

This review inspected:

- exact `main` SHA and recent commit history;
- every open pull request visible through GitHub;
- exact-head workflow runs for PR #2040;
- unresolved and resolved review threads;
- PR discussion for the required implementation handoff;
- the full changed-file inventory for #2040;
- SQL publication policy and tests;
- graph artifact publisher behavior;
- dbt authority ADR and accepted round-trip plan;
- Planning DB model-SQL authority and exact-revision ownership;
- workspace batch mutation contracts and adapter;
- Code reconciliation against file-save receipts;
- run-list pagination contracts and store options;
- workspace listing and file-size behavior;
- generic Web HTTP response handling;
- Code navigation protection and crash-recovery posture;
- root quality and coverage commands;
- current-status documentation freshness;
- mature-system official documentation where comparison materially informs the route.

No local checkout, browser, database, Planning DB, workflow, or application runtime was executed by this reviewer. Existing CI and committed evidence are inspected evidence, not executions performed during this review.

## 4. Open pull requests

| PR | Kind | Exact head | State | Decision |
| --- | --- | --- | --- | --- |
| #2040 | Functional | `6257745ed1ec91f1a1415585d24e319905966931` | Open, ready, mergeable | Functionally credible; delivery handoff missing |
| #2051 | Documentation review | `2da053bb74f82603c26b21fd9209ea253b09ea60` | Draft, mergeable | Superseded by this review |

No other functional branch is visible as an open pull request.

## 5. Implementation-agent handoff audit

### 5.1 Result

```text
DELIVERY-HANDOFF-MISSING
```

The PR body is useful but does not satisfy the iteration handoff contract.

### 5.2 What is present

PR #2040 states:

- the root cause;
- the intended product correction;
- the main source-level mechanisms;
- general validation commands;
- the absence of bypasses and fake success paths.

Repository inspection also identifies:

- exact base and head;
- branch and PR;
- changed-file inventory;
- actual runtime implementation;
- unit, architecture, integration, and protected Cypress test paths;
- Planning DB migrations;
- exact-head standard workflow success;
- resolved review-thread disposition.

### 5.3 What is missing

A valid handoff must consolidate, in one top-level `## Iteration Handoff` comment:

1. exact base SHA and final head SHA;
2. branch and PR links;
3. Planning DB task/design identity;
4. iteration goal and user transaction;
5. what changed;
6. how the implementation works;
7. why this design was selected;
8. exact DDD owners;
9. commands and queries reused;
10. application ports and adapters reused;
11. contracts and migrations touched;
12. complete changed-file inventory or an exact link to it;
13. user-visible behavior;
14. tests first observed failing, with commands and failure reason;
15. tests later passing, with commands and results;
16. direct exact-head CI links;
17. direct protected browser/integration proof;
18. security posture;
19. data-integrity posture;
20. observability posture;
21. compatibility posture, explicitly stating the pre-product decision;
22. rollback posture;
23. unresolved risks;
24. deviations from the approved route;
25. the bounded next iteration.

The report must distinguish executed proof from reconstructed or inferred claims.

## 6. Claim-to-evidence matrix for PR #2040

| Claim | Status | Evidence | Review conclusion |
| --- | --- | --- | --- |
| Canvas Preview previously overwrote accepted Project Code SQL | VERIFIED | PR root cause and previous sequential publication path | Real hidden-authority defect |
| Graph-owned SQL now has deterministic integrity metadata | VERIFIED | `dbtGraphModelSqlPublicationPolicy.ts` | Marker checks exact payload integrity |
| The marker authenticates origin | DISPROVED | Unkeyed SHA-256 stored beside content | It detects mismatch; it is not a signature or origin proof |
| Every artifact is preflighted before the first write | VERIFIED | `Promise.all` preflight in publisher | Correct containment boundary |
| Expected revisions are captured once and reused | VERIFIED | Prepared artifact model | Prevents later reads redefining CAS expectations |
| Divergent unmarked SQL fails closed | VERIFIED | Policy and unit test | External semantic edits are preserved |
| Malformed marked SQL fails closed | VERIFIED | Policy and unit test | Corrupted managed payload is not overwritten |
| Byte-identical unmarked graph projection may be marked | VERIFIED | `adopt_legacy_equivalent` branch and test | Safe under active graph-draft authority; naming is misleading but not a correctness blocker |
| Graph-owned Project Code is read-only | VERIFIED | edit-posture and file-surface changes/tests | Prevents a second browser edit lifecycle |
| File-authoritative dbt projects remain editable | VERIFIED | posture branching and tests | Preserves normal dbt file authority |
| Protected live path proves external SQL preservation | PARTIAL | Committed Cypress flow and PR command claim | Test exists; handoff lacks a direct execution artifact/log link |
| Standard exact-head CI is green | VERIFIED | Six successful workflow runs on `6257745...` | Current standard gate evidence is green |
| Publication is atomic across all files | CONTRADICTED | Final `for` loop issues individual saves | Preflight is global; commit remains sequential |
| Preview and Run are pinned to one exact project revision | NOT PROVEN | Save receipt ignored by file-backed reconciliation; no batch publication identity | Next governed vertical |
| Tests were written and observed failing before implementation | NOT PROVEN | No red chronology in PR discussion | Must be stated in handoff or marked not captured |
| Rollback is documented | NOT PROVEN | No consolidated handoff | Expected posture is revert because DVT is pre-product |
| Full delivery handoff exists | NOT PROVEN | No top-level `## Iteration Handoff` | Blocking delivery closeout |
| Migration for pre-marker deployed artifacts is required | DISPROVED | No deployed data contract or owner decision | Do not add compatibility machinery |

## 7. Fowler review of PR #2040

### 7.1 Fixed: hidden SQL authority

Before #2040, Preview could read the current revision and then unconditionally regenerate SQL from graph state. Reading the latest revision did not grant overwrite authority.

The branch introduces a dedicated policy and publisher boundary that distinguishes:

- absent graph-owned file;
- unchanged managed file;
- valid managed replacement;
- byte-identical unmarked projection bootstrap;
- divergent or malformed conflict.

This closes a concrete hidden-authority path without introducing another command rail.

### 7.2 Fixed: late revision reinterpretation

The publisher captures every expected revision during preflight and reuses that revision for the write. It no longer performs another read per artifact immediately before each write.

This removes one leaky temporal assumption: a later query cannot silently redefine what revision the transaction believed it was updating.

### 7.3 Fixed: duplicate editable surfaces

Graph-owned SQL is presented as read-only in Project Code. File-authoritative projects remain editable through the existing workspace-file command.

This avoids presenting two editable surfaces backed by different aggregates.

### 7.4 Active: partial multi-file publication

The publisher still commits writes in a loop. A later conflict, filesystem error, process termination, or adapter error can leave earlier artifacts changed.

This is the highest-priority remaining data-integrity gap after #2040.

### 7.5 Active: exact revision identity is observational, not transactional

The file-backed Canvas controller receives a `WorkspaceFileSaveReceipt` but ignores it and asks for the latest graph projection. A concurrent change in another project file can make the returned analysis describe a different project content set.

This is stale truth disguised as reconciliation success.

### 7.6 Non-blocking naming debt

`adopt_legacy_equivalent` incorrectly suggests a supported legacy population. The behavior is reached under known graph-draft authority and requires byte equality, so it does not lose a divergent semantic edit.

Recommended later rename:

```text
mark_equivalent_unmarked_projection
```

Do not add migration logic merely to justify the existing name.

### 7.7 Governance amplification

A 24-file change contains 3 Planning DB migrations and a broad set of presentation and test changes. The scope is defensible because the user transaction crosses Canvas publication and Project Code posture.

Nevertheless, the missing handoff makes the change harder to audit than the volume of governance records suggests. Planning DB rows cannot substitute for a delivery explanation that states what was actually executed.

## 8. Previous finding disposition

| Finding | Current state | Evidence-based disposition |
| --- | --- | --- |
| PR #2030 edit/revert reconciliation race | FIXED | Do not reopen |
| PR #2035 non-terminal materialization divergence | FIXED | Shared projector now owns the rule |
| Release-governance defects from #2002 | FIXED / SUPERSEDED | Release 0.5.x path completed |
| PR #2040 legacy migration requirement | DISPROVED | Pre-product; no preservation obligation |
| PR #2040 marker origin authentication | FIXED in wording | Marker is payload integrity, not authentication |
| PR #2040 SQL overwrite authority | FIXED on branch, not yet in main | Awaiting handoff and merge |
| Multi-file graph publication | ACTIVE P1 | Sequential writes remain |
| Exact project revision linked to analysis/Preview/Run | ACTIVE P1 | Explicit Planning DB gap remains open |
| `ListRuns` scope-safe pagination | ACTIVE P2 | Limit occurs before full scope; no request cursor |
| Workspace inventory truth | ACTIVE P1 | Silent 500-file truncation, no partial posture |
| Runtime response schema validation | ACTIVE P2 | Generic cast remains |
| Crash recovery | ACTIVE P2 | Navigation protection only, no durable journal |
| Web/API coverage and nonfunctional gates | ACTIVE | Root explicit coverage ratchet remains Engine-only |
| Current status documentation | ACTIVE STALE TRUTH | Declared current, last reviewed 2026-04-26 |

## 9. Current CI and review state

### 9.1 Functional PR #2040

The exact head `6257745ed1ec91f1a1415585d24e319905966931` has successful runs for:

- Contracts & Determinism;
- Dependency Review;
- Test Suite;
- CI - Code Quality;
- CodeQL;
- PR Quality Gate.

### 9.2 Main

The connector exposes no pull-request-triggered workflow runs directly associated with the final release merge SHA. This is an evidence-identity limitation; it does not negate the green PR-head evidence.

### 9.3 Review threads

PR #2040 has:

- unresolved non-outdated threads: `0`;
- resolved threads: `1`;
- resolved finding: unsupported pre-marker compatibility requirement.

No thread currently blocks the source change.

## 10. Release state

Current repository version:

```text
0.5.3
```

No new release pull request is open. The next product transaction should not be delayed for another maintenance release or release-governance expansion.

## 11. Priority sequence revalidation

The repository evidence continues to support this order:

1. model SQL authority containment;
2. atomic dbt project publication and exact revision identity;
3. workspace capability truth;
4. cohesive authoring recovery;
5. product-wide quality and nonfunctional gates;
6. later differentiation.

Priority 1 is implemented on #2040 but not yet closed as a delivery iteration.

Priority 2 is explicitly assigned in Planning DB to `E-WEB-DBT-ATOMIC-PUBLICATION-1`, including the exact project-revision gap.

No legitimate authority change was found in current Planning DB records, ADR-0060, accepted plans, or source.

## 12. Next vertical: atomic publication and exact project revision

### 12.1 Severity

```text
P1 — data integrity and reproducibility
```

### 12.2 User transaction

```text
Canvas graph-draft
-> complete dbt artifact proposal
-> complete expected-revision preflight
-> one atomic publication
-> one immutable receipt
-> exact dbt analysis of that publication
-> persisted Preview bound to that identity
-> Run bound to the same identity
-> reopen reports exact, stale, or conflict truth
```

### 12.3 Root cause

Graph publication currently ends in a browser loop of independent file saves. The system already owns an atomic server-side batch port, but the graph-first Preview path does not use it.

The browser also treats a latest graph refresh as reconciliation proof rather than correlating analysis to an exact whole-project publication receipt.

### 12.4 User and product impact

Without this slice:

- a project may contain only some proposed files;
- Preview may describe a different project revision from the one just written;
- Run reproducibility is not guaranteed;
- reopen cannot distinguish exact publication from later drift;
- audit and rollback reasoning depend on reconstructing multiple writes.

### 12.5 Domain ownership

| Concern | Owner |
| --- | --- |
| Complete graph-derived artifact proposal | Canvas dbt artifact projection |
| Publication transaction | Project Workspace I/O |
| Atomic filesystem replacement | Local workspace batch mutation adapter |
| dbt semantic analysis | dbt Project Analysis |
| Preview admission and receipt | Execution Preview |
| Run admission | Runtime admission / StartRun |
| Reopen posture | Canvas file-backed authoring session |

### 12.6 Existing semantics to reuse

Reuse:

- `GenerateDbtWorkspaceArtifacts`;
- `ProjectDbtGraphFromFiles`;
- `WorkspaceFileBatchMutation`;
- `WorkspaceFileBatchReceipt`;
- `IWorkspaceFileBatchMutationPort`;
- `LocalWorkspaceFileBatchMutationGateway`;
- existing workspace scope authorization;
- existing preview persistence and run admission rails;
- existing project revision and analysis hashes.

Do not introduce:

- another file repository;
- browser-owned rollback;
- one command per dbt file type;
- another dbt parser;
- another authoring authority;
- a generic transaction framework;
- a proprietary version registry;
- a public manual Save lifecycle.

### 12.7 Proposed domain objects

Use repository-compatible names, subject to Planning DB design approval:

```ts
type PublishDbtProjectArtifactsCommand = Readonly<{
  scope: WorkspaceStorageScope;
  expectedFiles: readonly WorkspaceFileBatchExpectedFile[];
  writes: readonly WorkspaceFileBatchWrite[];
  deletes: readonly string[];
  idempotencyKey: string;
}>;

type DbtProjectPublicationReceipt = Readonly<{
  publicationId: string;
  batchReceipt: WorkspaceFileBatchReceipt;
  projectRoot: string;
  projectContentSetSha256: string;
  analysisSha256: string;
  freshness: 'fresh';
}>;
```

Prefer extending or wrapping the existing batch receipt at the application boundary rather than changing its generic storage semantics unnecessarily.

### 12.8 Command/query and port changes

1. Add one application command that owns the dbt publication transaction.
2. Adapt the complete browser proposal into one command request.
3. Invoke `IWorkspaceFileBatchMutationPort.apply` once.
4. On success, analyze the resulting exact content set server-side.
5. Return one publication receipt containing storage and semantic identity.
6. Preview accepts that receipt or the exact same revision identity.
7. Run admits only the persisted Preview identity.
8. Reopen compares current content-set identity with the accepted publication/preview identity.

Do not make two GET requests and label their combined result atomic.

### 12.9 Likely files and components

Likely existing surfaces:

- `apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.ts`;
- `apps/web/src/app/views/canvas/canvasPlanAction.ts`;
- `apps/web/src/app/ports/workspace.ts`;
- `apps/api/src/application/ports/workspaceFiles.ts`;
- `apps/api/src/application/services/**dbt**publication**`;
- protected workspace/dbt route group;
- `apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.ts`;
- `ProjectDbtGraphFromFiles` application service and adapter;
- Preview provenance contract and persistence;
- StartRun admission checks;
- existing dbt Canvas live Cypress flow;
- new Planning DB design/closeout migrations for the already-owned task.

### 12.10 Migration and compatibility

DVT is pre-product.

Migration posture:

- no persisted legacy artifact migration is required;
- existing development workspaces may be reset;
- deploy the new command and route as a hard cut for graph publication;
- remove or retire the sequential browser publication path in the same vertical;
- avoid dual-write or fallback behavior.

### 12.11 Rollback posture

Before product release, rollback is a code revert plus workspace reset for development data.

The batch adapter itself already performs atomic replacement. Do not build compensating browser writes.

### 12.12 Observability

Record metadata only:

- publication ID;
- idempotency key hash or safe identifier;
- scope identifiers under existing privacy policy;
- expected-file count;
- write/delete count;
- conflict path count;
- deduplicated flag;
- project content-set hash;
- analysis hash;
- duration and terminal outcome.

Do not log SQL bodies, secrets, profiles, credentials, environment values, or compiled payloads.

### 12.13 Security

Required controls:

- existing tenant/project/environment scope authorization;
- server-side path policy;
- bounded file count and payload bytes;
- no secrets in request or logs;
- fail closed on malformed mutation, duplicate paths, invalid idempotency reuse, or stale revision;
- isolated dbt analysis target/log directories;
- bounded process output and timeout;
- no browser inference of semantic dbt truth.

### 12.14 PR decomposition

One narrow vertical may contain:

1. Planning DB design record for the existing task;
2. application command and typed HTTP contract;
3. adapter to existing batch port;
4. exact post-publication analysis;
5. browser replacement of sequential writes;
6. Preview/Run identity binding;
7. reopen freshness posture;
8. unit, integration, architecture, adapter, and live proof;
9. complete iteration handoff.

Do not split server atomicity from browser adoption in a way that leaves two production paths active.

### 12.15 Red tests

Required first-failing cases:

1. conflict in the second expected file leaves every file unchanged;
2. conflict in the final expected file leaves every file unchanged;
3. injected failure during replacement leaves every original file unchanged;
4. duplicate artifact path fails before storage mutation;
5. same idempotency key and same request returns the same receipt with `deduplicated=true`;
6. same key with a different request fails closed;
7. publication receipt content-set hash differs after any file change;
8. analysis returned for another content set is rejected;
9. Preview rejects a different project identity;
10. Run rejects or requires a new Preview after project drift;
11. reopen reports `exact`, `stale`, or `conflict` rather than generic synchronized truth;
12. logs contain no SQL bodies or credentials.

### 12.16 Green proof

Required passing evidence:

- generic batch-port unit and adapter conformance tests;
- API application-service tests;
- protected route contract and authorization tests;
- Web application/presentation tests;
- architecture guards proving one command and one batch port;
- exact-revision Preview/Run tests;
- Planning DB integrity and mechanization;
- full affected CI;
- protected browser flow against API, workspace files, PostgreSQL, Temporal, and dbt.

### 12.17 Live browser proof

The protected proof should execute:

```text
create graph-draft model
-> Preview publishes complete project atomically
-> inspect publication receipt identity
-> Run exact Preview
-> reopen Canvas
-> identity remains exact
-> modify one file externally
-> Preview or Run reports stale/conflict
-> no silent overwrite
```

A second case must inject a multi-file conflict and prove no artifact changed.

### 12.18 Acceptance criteria

- one server-owned batch call per graph publication;
- zero browser save loop for the transaction;
- all expected revisions validated before commit;
- all files changed atomically or none changed;
- immutable receipt persisted;
- receipt binds project content set and analysis;
- Preview persists the same identity;
- Run consumes the same identity;
- reopen exposes exact/stale/conflict truth;
- no duplicate command rail;
- no second semantic authority;
- no SQL or secret payloads in logs;
- required tests and live proof pass;
- complete `## Iteration Handoff` published.

### 12.19 Release gates

Do not release the slice until:

- six standard workflows pass on the final head;
- custom governance checks pass where applicable;
- all review threads are resolved on the final head;
- protected browser proof passes;
- Planning DB design and evidence match actual source;
- sequential publication is removed from the active path;
- the handoff is complete and claim-to-evidence verifiable.

## 13. Secondary active findings

### 13.1 P2 — `ListRuns` pagination integrity

Current order:

```text
store list by tenant with limit
-> application filters project/environment
-> application builds cursor from filtered subset
```

This can hide authorized rows beyond the storage limit and incorrectly return `nextCursor = null`.

The query returns a cursor but cannot receive one. The store port cannot express project, environment, or cursor.

Correct later route:

- typed opaque keyset cursor `(createdAt, runId)`;
- apply tenant/project/environment/status/cursor before limit in storage;
- deterministic ordering by `createdAt DESC, runId DESC`;
- same conformance vectors for PostgreSQL and in-memory adapters;
- invalid cursor rejected before store access;
- no extra `ListScopedRuns` rail.

This does not supersede the dbt authority order.

### 13.2 P1 — workspace inventory truth

Current behavior:

- silent truncation at 500 files;
- no cursor;
- no `complete | partial` posture;
- oversized content becomes `InvalidWorkspacePathError`;
- file-size capability is conflated with path validity.

Correct later route:

- paginated inventory;
- explicit completeness;
- stable ordering and cursor;
- typed `oversized`, `not_found`, and `unsupported` outcomes;
- shared declared limits across import, analysis, Explorer, Code, and publication.

Do not simply increase constants and preserve silent truncation.

### 13.3 P2 — generic HTTP response casts

`createApiClient` returns parsed JSON through `as TResponse`.

New revision, publication, and inventory boundaries must validate shared runtime schemas from `@dvt/contracts` at the HTTP edge.

Do not rewrite every old endpoint in the atomic-publication PR unless required by its touched contract.

### 13.4 P2 — crash recovery

The Code workbench:

- flushes before SPA navigation;
- blocks navigation on persistence failure;
- warns on `beforeunload`.

It does not restore a buffer after browser crash, process crash, power loss, or forced termination.

After authority and inventory truth, introduce a bounded durable authoring journal keyed by scoped file revision and content hash. Do not use it as another authoring authority.

### 13.5 Quality gates

The root full gate explicitly ratchets coverage only for Engine.

Follow-up gates should include:

- Web and API coverage ratchets;
- automated accessibility proof;
- bundle budget;
- large-graph interaction and render budget;
- API payload and latency budget;
- injected failure and concurrency tests;
- exact-SHA evidence publication.

### 13.6 Stale current-status documentation

`docs/architecture/system-delivery-status.md` declares itself the current implementation snapshot but was last reviewed on 2026-04-26.

Prefer generated or query-backed current status. Do not manually maintain another parallel current-state narrative.

## 14. Mature-system comparison

### 14.1 dbt Studio — match

Match:

- normal dbt project files;
- integrated build, test, run, and version-control workflow;
- diagnostics separated from file authority.

Differentiate:

- Canvas as a governed projection and lossless edit surface;
- explicit authority binding and revision receipts.

Defer:

- broad hosted collaboration and IDE feature parity.

Reference: <https://docs.getdbt.com/docs/cloud/dbt-cloud-ide/develop-in-the-cloud>

### 14.2 Professional IDE and Git — match

Match:

- separate editor buffer, persisted file, diagnostics, version-control state, conflicts, staging, and commit;
- explicit diffs and conflict posture.

Differentiate:

- semantic dbt graph projection and execution identity.

Defer:

- full Git client implementation until a real connector and accepted rails exist.

Reference: <https://code.visualstudio.com/docs/sourcecontrol/overview>

### 14.3 Airflow — match

Match:

- an execution uses one version of all required project files for the full run;
- version identity is explicit and reproducible.

Differentiate:

- DVT binds authoring, semantic analysis, Preview, and Run to one project content set.

Defer:

- general-purpose scheduler parity.

Reference: <https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/dag-bundles.html>

### 14.4 Prefect — match later

Match later:

- deployment version history;
- promotion and rollback;
- code pinned by commit or image digest.

First prerequisite:

- exact DVT project publication identity.

Reference: <https://docs.prefect.io/v3/deploy/infrastructure-concepts/deployments>

### 14.5 Dagster — defer

Dagster's asset model, lineage, checks, observability, and testability are useful later differentiation targets.

They are not prerequisites for correcting DVT file authority and transaction integrity.

Reference: <https://docs.dagster.io/getting-started/what-why-dagster>

### 14.6 NiFi — differentiate

Use the useful principle of visually understandable flow state and versioned changes.

Do not build another proprietary registry. NiFi Registry is deprecated in favor of Git-based Flow Registry Clients.

Reference: <https://nifi.apache.org/documentation/nifi-latest/html/administration-guide.html#flow_registry_clients>

### 14.7 Temporal — use principles, not product scope

DVT already uses Temporal as a runtime adapter. Apply durable identity, idempotency, and recovery principles to publication and execution receipts.

Do not put a workflow engine inside the editor or make Temporal own file-authoring truth.

## 15. Required handoff template for PR #2040

The implementer should add this top-level PR comment and complete every field honestly:

```markdown
## Iteration Handoff

### Identity
- Base SHA:
- Final head SHA:
- Branch:
- PR:
- Planning DB task/design:

### Iteration goal
- User transaction:
- Product outcome:

### What changed
- Runtime:
- Contracts:
- Tests:
- Planning DB:
- Documentation:

### How it works
- Authority decision:
- Command/query rails reused:
- Ports/adapters reused:
- Failure handling:

### Why this design
- Selected option:
- Rejected alternatives:
- Fowler risks reduced:

### Ownership
- DDD owners:
- Component responsibilities:
- Reasons to change:

### Changed surfaces
- Files:
- Contracts:
- Commands/queries:
- Ports:
- Adapters:
- Migrations:

### User-visible behavior
- Before:
- After:
- Conflict/recovery behavior:

### Red/green chronology
- Red command:
- Observed failure:
- Green command:
- Result:
- Was tests-first evidence captured? yes/no

### CI and live evidence
- Exact-head workflows:
- Protected Cypress/integration run:
- Artifacts/logs:

### Security and integrity
- Authorization:
- Data integrity:
- Secrets/logging:
- Marker limitation:

### Observability
- Signals:
- Correlation identifiers:
- Payloads deliberately excluded:

### Compatibility
- Pre-product decision:
- Unsupported legacy behavior:
- Data reset posture:

### Rollback
- Code rollback:
- Data rollback/reset:

### Residual risks
- Atomicity:
- Exact revision:
- Other:

### Deviations
- From approved route:
- Reason and disposition:

### Next bounded iteration
- Task/design:
- User transaction:
- Explicit exclusions:
```

If historical red evidence was not captured, the agent must say `not captured`; it must not manufacture tests-first history after the fact.

## 16. Final instruction to the implementation agent

Do not add more runtime changes to PR #2040 without a new source-backed defect.

Complete the handoff, confirm current exact-head CI and live proof, and merge through normal repository policy when authorized.

Then claim the existing atomic-publication task and implement the complete end-to-end transaction. The next iteration must not be another release, dependency, governance framework, generic session abstraction, or point fix unrelated to the project publication transaction.

## 17. Final verdict

The repository is stable but delivery is paused at an administrative boundary: PR #2040 appears functionally credible, yet its implementation agent has not closed the iteration with an auditable report.

The product route is unchanged:

```text
close SQL authority handoff
-> atomic multi-file publication
-> exact project revision and analysis identity
-> Preview and Run reproducibility
-> workspace capability truth
-> durable recovery
-> product-wide quality gates
```

Do not invent new findings while source is unchanged. Do not confuse green CI with complete delivery evidence. Do not let the missing handoff delay the already-defined atomic publication slice after #2040 closes.
