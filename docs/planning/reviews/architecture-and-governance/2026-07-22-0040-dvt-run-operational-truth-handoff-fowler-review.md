---
title: DVT Run Operational Truth Handoff and Sequencing Fowler Review
status: Review
date: 2026-07-22
reviewed_repository: dunay2/dvt
reviewed_ref: main
reviewed_commit: 591a1ecde7a43fefa5206f55bb446dd84da5f2dc
reviewed_open_pr: 2035
reviewed_open_pr_head: d8a79a7c654edea469dd9e23cdd3c4f20661c6e6
review_type: point-in-time architecture-and-governance review
scope: documentation-only
---

# DVT Run Operational Truth Handoff and Sequencing Fowler Review

## 1. Executive verdict

There is material implementation work to review.

`main` remains at release `0.5.2`:

- exact SHA: `591a1ecde7a43fefa5206f55bb446dd84da5f2dc`;
- no newer product commit has reached `main`;
- PR [#2035 — `fix(api): Unify run operational truth`](https://github.com/dunay2/dvt/pull/2035) is the only open implementation PR visible at review time;
- PR #2035 is eight commits and forty-two files ahead of `main`;
- all six standard pull-request workflows are green on its exact head;
- one non-outdated, unresolved P2 review thread remains on that exact head;
- no complete `## Iteration Handoff` report exists.

The implementation contains a valid product correction: `ListRuns` and
`GetRunStatus` are being projected through one named operational read model
instead of independently fabricating or translating lifecycle facts.

The implementation is not ready to merge.

The current head violates its own core invariant. The detail path removes
materialization evidence from non-completed runs before projection. The list
path feeds the raw canonical status into the shared projector. As a result,
`/runs` can expose materialization or result evidence for a running or failed
run while `/runs/:id` suppresses that same evidence.

This is not a cosmetic disagreement. It is the exact boundary-drift class the
PR claims to eliminate.

The branch also marks its Planning DB design, component, contract, port,
feature mechanization, and evidence as implemented before resolving the
contradictory runtime behavior. That is stale truth on the branch, not merely
an incomplete review comment.

The PR must remain unmerged until:

1. the lifecycle/materialization invariant is owned by the shared projection;
2. list and detail prove identical shared operational fields for the same
   canonical status;
3. the Planning DB closeout matches the corrected head;
4. the unresolved P2 is resolved;
5. exact-head CI is green again;
6. the implementation agent publishes a complete iteration handoff;
7. the unrelated warehouse/source-import changes are split or explicitly
   justified as necessary parts of the same protected vertical.

The repository priority order has not legitimately changed. This PR is useful
operability work, but no handoff or approved dependency evidence explains why
it displaced the current dbt model-SQL authority transaction.

The next product slice after #2035 is corrected remains:

```text
model SQL authority
-> atomic project publication and exact project revision
-> workspace capability truth
-> cohesive authoring recovery
-> product-wide quality gates
-> later differentiation
```

## 2. Review boundary and evidence standard

This review distinguishes four evidence states:

- `VERIFIED`: repository source or exact-head CI directly proves the claim;
- `PARTIAL`: some source exists, but the complete transaction or exact evidence
  is missing;
- `CONTRADICTED`: current source disproves the claim;
- `NOT PROVEN`: the claim is narrative without executable or inspectable proof.

Evidence inspected:

- exact `main` history;
- every open PR visible through GitHub;
- PR #2035 metadata, commits, changed-file set, patch and review discussion;
- exact-head GitHub Actions results;
- API contracts, use cases, projection and tests;
- Web decoders, snapshot mapper, polling and presentation changes;
- protected Cypress proof changes;
- warehouse-connection public projection changes;
- Planning DB migrations `792` through `796`;
- accepted ADR-0060;
- accepted dbt round-trip product plan;
- current graph-first artifact publication path;
- current file-backed graph reconciliation path;
- workspace file and batch mutation boundaries;
- current workspace inventory and file-size limits.

No local test execution is claimed by this review.

## 3. Exact repository state

### 3.1 Main

| Field | Value |
| --- | --- |
| Branch | `main` |
| Exact SHA | `591a1ecde7a43fefa5206f55bb446dd84da5f2dc` |
| Commit | `chore(main): Release 0.5.2 (#2023)` |
| Release state | `0.5.2` published through the merged release PR |
| Connector-visible runs on squash SHA | none |

The lack of connector-visible runs on the final squash SHA is an evidence
limitation, not proof of failure. The green evidence for the release remains
attached to the release PR head.

### 3.2 Open pull requests

| PR | Head | State | Scope | Review posture |
| --- | --- | --- | --- | --- |
| [#2035](https://github.com/dunay2/dvt/pull/2035) | `d8a79a7c654edea469dd9e23cdd3c4f20661c6e6` | open, ready, mergeable | API/Web run truth, warehouse projection, source-import/live proof, Planning DB | one unresolved P2; handoff missing |

No other open PR was visible before this review branch was created.

### 3.3 PR #2035 size and shape

- base: `main@591a1ecde7a43fefa5206f55bb446dd84da5f2dc`;
- head: `fix/run-operational-truth@d8a79a7c654edea469dd9e23cdd3c4f20661c6e6`;
- commits: 8;
- files: 42;
- additions: 2,203;
- deletions: 188;
- Planning DB migrations: 5;
- implementation areas: API, Web, Cypress, warehouse source import, generated
  architecture documentation and Planning DB.

This is a medium-to-large cross-cutting slice, not a narrow one-component fix.

## 4. Iteration handoff status

# DELIVERY-HANDOFF-MISSING

No complete report headed `## Iteration Handoff` was found in the repository or
PR conversation.

The PR body is useful but insufficient. It gives a summary, root cause and a
validation count. It does not satisfy the delivery contract.

### 4.1 Fields present indirectly

- base and head SHA: available in PR metadata;
- branch and PR: available in PR metadata;
- broad goal: available in the PR title and summary;
- broad change description: available in the PR body and diff;
- broad reason: available in the root-cause section;
- validation counts: available in the PR body.

### 4.2 Required fields still missing

The implementation agent must publish all of the following before unrelated
work begins:

1. explicit iteration goal tied to a Planning DB work item and approved design;
2. exact base SHA and final reviewed head SHA in the report itself;
3. exact branch and PR link;
4. what changed, grouped by owned concern rather than by file count;
5. how the implementation works end to end;
6. why this design was selected over alternatives;
7. exact DDD owner for each concern;
8. command/query rails reused or changed;
9. ports, adapters and contracts reused or changed;
10. migrations and generated documents touched;
11. complete file inventory or a link to a stable changed-file list;
12. user-visible behavior before and after;
13. proof that red tests failed before implementation;
14. exact green commands and their results;
15. exact CI run links for the final head;
16. live browser/integration proof link or artifact;
17. security posture;
18. data-integrity posture;
19. observability posture;
20. compatibility posture;
21. rollback posture;
22. unresolved risks;
23. deviations from the approved route;
24. why the iteration was prioritized ahead of current dbt authority work;
25. recommended next iteration.

A count such as “33 API tests passed” does not prove which exact behavior each
suite closed. The handoff must separate executed evidence from planned or
inferred evidence.

## 5. Claim-to-evidence matrix

| Claim | Status | Evidence | Review conclusion |
| --- | --- | --- | --- |
| The branch starts from current `main` | VERIFIED | PR base SHA and compare result | Eight commits ahead, zero behind |
| `ListRuns` and `GetRunStatus` reuse one named projection | VERIFIED | `RunOperationalTruthDto`, `projectRunOperationalTruth`, both use cases | No third public product query introduced |
| Platform identity comes from persisted `RunMetadata` | VERIFIED | shared projector fields | Correct ownership direction |
| Lifecycle timestamps and status are no longer fabricated by browser clock | PARTIAL | API projection and Web mapper remove known fallbacks; focused tests exist | Strong evidence, but no complete handoff or exact live artifact |
| List and detail expose the same shared operational truth | CONTRADICTED | list uses raw status; detail sanitizes nonterminal materialization | Current P2 reproduces the contradiction |
| Nonterminal runs cannot expose terminal materialization evidence | CONTRADICTED | private detail sanitizer is absent from list path | Must move invariant into shared projection |
| Run-status reads are bounded | VERIFIED | concurrency constant `8` and test with 18 runs | Order and maximum concurrency are covered |
| One status read failure cannot take down the entire list | NOT PROVEN | no negative test or fallback policy found | Operability follow-up required |
| Public warehouse connection responses exclude internal credentials | VERIFIED | schema-backed public projection and tests | Good security boundary, but bundled scope |
| Protected live flow passes | PARTIAL | PR body, completion-gate metadata and Cypress spec changes | No linked run artifact in the handoff |
| Red tests were written and observed failing first | NOT PROVEN | migration 796 stores commands and expected failures only | Metadata is not chronological red evidence |
| All standard CI checks pass on the final head | VERIFIED | six exact-head workflow runs succeeded | CI green does not supersede open review defect |
| The Planning DB design is fully implemented | CONTRADICTED | migrations mark implemented while current head retains P2 | Closeout truth is premature |
| No human decisions remain | CONTRADICTED | feature mechanization says true while review identifies unresolved behavior | Must be corrected before merge |
| Rollback is defined | NOT PROVEN | no handoff rollback section | Required because DTO and list/detail behavior changed |
| Compatibility is defined | PARTIAL | internal contract marked internal; Web adapter changed | API consumer compatibility and rollout are not explained |
| Observability is sufficient | PARTIAL | existing route telemetry is named; projection signal marked not applicable | Per-item status-read failure/latency policy is not proven |
| The iteration advances the approved next product transaction | CONTRADICTED | current priority remains dbt model-SQL authority | Useful work, but sequencing deviation is unexplained |

## 6. What the implementation does correctly

### 6.1 A real read model instead of duplicated assembly

The PR introduces `RunOperationalTruthDto` and
`projectRunOperationalTruth(...)` as a pure application projection.

This is a sound Fowler correction:

- `ListRuns` no longer owns a small, lossy status projection;
- `GetRunStatus` no longer independently assembles the common fields;
- identity and execution evidence have named ownership;
- duration is derived only when both canonical timestamps are valid;
- no third product query intent is created.

Patterns used appropriately:

- Query Object;
- Presentation Model;
- Service Layer;
- Value/DTO projection;
- Published Language inside the API/Web boundary.

### 6.2 Missing evidence is represented honestly

The Web side no longer needs to use local time or aliases as a substitute for
missing runtime facts. The presentation model can show unavailable values.

This is a material improvement over optimistic UI fabrication.

### 6.3 Bounded status fan-out

`ListRunsUseCase` reads statuses in batches of eight and preserves list order.
The implementation has a focused concurrency test.

That is better than an unbounded `Promise.all` over the entire page.

### 6.4 Public warehouse connection projection

The warehouse catalog uses the public contract schema to build the response
instead of returning a spread object and relying on omitted fields.

That is a useful security and data-boundary hardening:

- allow-list projection instead of deny-list projection;
- schema validation at the adapter boundary;
- reduced risk of credential metadata leakage when the internal entry evolves.

### 6.5 Exact-head CI is green

All six standard lanes succeeded:

- Dependency Review;
- Contracts & Determinism;
- CodeQL;
- Test Suite;
- CI — Code Quality;
- PR Quality Gate.

This proves the configured gates accept the current head. It does not prove the
uncovered lifecycle invariant.

## 7. Blocking defect: nonterminal materialization leaks into list truth

### 7.1 Severity

`P2` — merge blocking for this PR because it directly contradicts the product
claim and accepted design invariant.

### 7.2 Concrete evidence

Detail path:

```text
engine.getRunStatus
-> sanitizeCanonicalStatus
-> projectRunOperationalTruth
```

The detail sanitizer removes `execution.materialization` whenever the status is
not `COMPLETED`.

List path:

```text
engine.getRunStatus
-> projectRunOperationalTruth
```

The list path sends the raw status to the shared projector.

The shared DTO now exposes `execution`. Therefore a running or failed list item
can include terminal result/materialization evidence that the detail endpoint
removes.

### 7.3 Root cause

The lifecycle invariant remains in a private method owned by
`GetRunStatusUseCase` instead of the shared `RunOperationalReadModel`.

The implementation extracted field assembly but not all semantic normalization.
This is a leaky abstraction: consumers must know whether to sanitize before
calling the supposedly canonical projector.

### 7.4 User and product impact

- Runs list and detail can disagree for the same run.
- A user may see rows written or a result table for a run that is still running
  or has failed.
- Result evidence may be disclosed before terminal completion.
- Polling can make evidence appear and disappear between list and detail.
- Operational trust is lower than before because the UI now labels both paths
  as one canonical model.

### 7.5 Exact domain owner

`RunOperationalReadModel` — component
`SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL`.

This is not a Web concern and must not be fixed with presentation-only hiding.

### 7.6 Required correction

Move the invariant into the shared projection boundary.

Preferred route:

```ts
projectRunOperationalTruth({ metadata, status, evidence })
```

must internally normalize canonical status before projecting it.

The normalizer must:

- preserve all valid common fields;
- preserve `activeStepId` for active runs;
- preserve failure evidence for failed runs;
- omit `execution.materialization` unless `status === 'COMPLETED'`;
- avoid mutating the input object;
- apply identically to list and detail.

After this change, remove or delegate the private detail sanitizer so there is
one owner of the invariant.

### 7.7 What must not be introduced

- no second `ListRuns` projector;
- no Web-only materialization filter;
- no additional public query;
- no duplicated sanitizer in list and detail;
- no status-specific mapper hidden in the HTTP route;
- no synthetic terminal status;
- no removal of failure evidence merely to make tests pass.

### 7.8 Likely files

- `apps/api/src/application/services/runOperationalTruth.ts`;
- `apps/api/src/application/services/getRunStatusUseCase.ts`;
- `apps/api/src/application/services/listRunsUseCase.ts`;
- `apps/api/test/application/services/runOperationalTruth.test.ts`;
- `apps/api/test/application/services/listRunsUseCase.test.ts`;
- `apps/api/test/application/services/getRunStatusUseCase.test.ts`;
- Planning DB migrations `792` through `796` while still unmerged.

### 7.9 Red tests

Add tests that fail on the current head:

1. `RUNNING + execution.materialization` projects no materialization.
2. `FAILED + execution.materialization + failure` retains failure but omits
   materialization.
3. `COMPLETED + execution.materialization` retains materialization.
4. List and detail given the same canonical status expose identical common
   operational fields.
5. The list DTO cannot expose rows, sink table or terminal result for a
   nonterminal run.
6. The projector does not mutate the canonical status input.

### 7.10 Green proof

Required commands on the final head:

```text
pnpm --filter dvt-api exec vitest run \
  test/application/services/runOperationalTruth.test.ts \
  test/application/services/listRunsUseCase.test.ts \
  test/application/services/getRunStatusUseCase.test.ts

pnpm --filter dvt-api test
pnpm --filter dvt-api lint
pnpm --filter dvt-api typecheck
pnpm verify:prepush
```

Then rerun all six PR workflows on the corrected exact head.

### 7.11 Live proof

The protected run flow must prove both lifecycle stages:

- while a run is nonterminal, list and detail show no terminal materialization;
- after completion, both list and detail show the same materialization and
  duration;
- refresh/polling does not temporarily resurrect stale result evidence.

The handoff must link the exact workflow run or artifact.

### 7.12 Acceptance criteria

- one shared normalizer/projector owns the invariant;
- list/detail parity tests pass;
- the P2 thread is resolved on the corrected commit;
- exact-head CI is green;
- Planning DB negative tests name this failure mode;
- no terminal materialization appears for non-completed status;
- no valid active-step or failure evidence is lost.

### 7.13 Rollback

Code-only rollback:

- revert the projection and consumer changes;
- no persistent run metadata migration is required;
- do not roll back by restoring browser clock fallbacks.

### 7.14 Observability

Use existing run query spans and route telemetry.

Do not log full execution/materialization payloads. If an existing metric
vocabulary supports it, record only a bounded counter for suppressed
nonterminal materialization evidence, keyed by status and adapter, not by
secret-bearing payload.

### 7.15 Security implications

The correction prevents premature disclosure of result metadata and keeps the
API as the security boundary. A Web-only suppression would still leak data to
API consumers and is rejected.

## 8. Blocking governance defect: premature Planning DB completion

### 8.1 Severity

`P2 governance / release gate`.

### 8.2 Evidence

The branch migrations mark the following as implemented:

- architecture design;
- component and responsibility;
- internal contract;
- component port;
- component relations;
- feature mechanization;
- `noHumanDecisionsRemaining = true`;
- test and evidence closeout.

The exact same branch still has an unresolved defect that violates the design's
negative test “list and detail disagree on shared operational fields.”

### 8.3 Root cause

Closeout migrations were authored as if green test counts were sufficient to
establish semantic completeness. Review feedback arrived after those rows had
already declared implementation complete.

### 8.4 Required correction

Because migrations `792` through `796` are unmerged branch content, update the
branch's design/implementation migrations in place according to repository
migration policy, or append a correcting migration only if append-only policy
requires it.

The final Planning DB state must:

- include the nonterminal-materialization negative test;
- include tests proving list/detail lifecycle parity;
- avoid claiming `noHumanDecisionsRemaining` until the P2 is resolved;
- record evidence counts and commands that match the corrected test set;
- bind implementation evidence to the final head, not only to static prose;
- keep `ListRuns` and `GetRunStatus` as the only public query intents.

### 8.5 Acceptance criteria

- Planning DB integrity and migration suites pass;
- feature mechanization reports no drift;
- the design cannot be `implemented` while its required negative test fails;
- generated architecture docs match the corrected DB state;
- the handoff names the final migrations and evidence.

## 9. Blocking delivery defect: iteration handoff absent

### 9.1 Why this blocks audit completion

The PR is ready for review and has eight commits, but there is no durable
iteration closeout from the implementer. The reviewer can reconstruct much of
the work from the repository, but that is not equivalent to the implementer
stating intent, evidence and remaining risk.

### 9.2 Required action

After correcting the head, add one top-level PR comment beginning exactly:

```markdown
## Iteration Handoff
```

It must follow the template in section 18 of this report.

Do not create a separate product-authority document. The handoff is delivery
evidence attached to the PR; Planning DB remains operational task/design
truth.

## 10. Scope deviation: unrelated concerns bundled into one PR

### 10.1 Observed scope

The branch includes at least three distinct reasons to change:

1. canonical run operational read model;
2. public warehouse connection security projection;
3. source-import dialog scroll/result selectors and Cypress support changes.

It also modifies generated docs and five Planning DB migrations.

### 10.2 Fowler signal

- shotgun surgery;
- responsibility overload at PR scope;
- weak vertical boundary;
- review dilution.

### 10.3 Honest assessment

The warehouse projection is a sound security improvement. The Source Import
selectors may be necessary to stabilize the protected live proof. Neither fact
proves that they belong in the same implementation transaction as run
operational truth.

### 10.4 Required disposition

The implementer must choose and document one of two routes:

#### Route A — split

- keep run truth changes in #2035;
- move warehouse public projection into a narrow security PR with its own owner,
  tests and handoff;
- move source-import presentation changes with that security/live vertical only
  if required by its proof.

#### Route B — justify one protected vertical

Keep the changes together only if the handoff proves:

- the source-import and warehouse changes were required to run the exact
  protected end-to-end proof;
- no independent product behavior was added opportunistically;
- each concern has an existing Planning DB owner and accepted scope;
- rollback can separate the concerns safely;
- the review surface remains understandable.

“Cypress was failing” is not enough. The handoff must explain the product
transaction being closed.

## 11. Operability follow-up: list fan-out failure and latency policy

### 11.1 Status

`FOLLOW-UP — NOT PROVEN`, not yet a confirmed production bug.

### 11.2 Evidence

`ListRunsUseCase` performs one engine status read per listed run, in batches of
eight. A single rejected promise currently appears capable of rejecting the
whole list operation. The tests prove bounded concurrency and order but do not
prove partial failure behavior.

### 11.3 Required proof before closeout

- define whether one failed status read fails the list or returns an explicit
  unavailable status for that item;
- add a negative test for one adapter/status failure among a page;
- measure latency at the maximum supported page size;
- ensure authorization scope remains unchanged;
- use existing run-read evidence vocabulary rather than inventing another
  public status.

### 11.4 Decision constraint

Do not introduce a new query rail. Any degradation policy belongs to
`ListRuns` and the existing operational read model.

## 12. Previous findings status

| Finding | Current status | Evidence/reason |
| --- | --- | --- |
| PR #2030 edit/revert reconciliation race | FIXED | merged in `0.5.2`; do not reopen |
| Reconciliation result correlated only to visual phase | FIXED | receipt identity now governs completion |
| Model SQL can exist in graph metadata and later files | ACTIVE P1 | graph artifact projection still uses `modelSql`; authority transition remains incomplete |
| Graph-first Preview writes artifacts sequentially | ACTIVE P1 | `canvasPlanAction.ts` still loops per artifact |
| Exact save receipt ignored during file-backed reconciliation | ACTIVE P1 | `_receipt` is unused and latest graph is refetched |
| Workspace list silently stops at 500 files | ACTIVE P1 | current repository adapter returns partial tree without completeness state |
| Oversized workspace file reported as invalid path | ACTIVE P1 | `>1 MB` throws `InvalidWorkspacePathError` |
| Durable crash recovery for unsaved authoring session | ACTIVE P2 | unchanged by #2035 |
| Product-wide accessibility/performance/load gates | ACTIVE | #2035 adds focused run proof, not general ratchets |
| Run list/detail operational truth drift | PARTIALLY FIXED, BLOCKED | architecture is improved; materialization contradiction remains |
| Browser-fabricated run timestamps | SUBSTANTIALLY FIXED, final proof pending | Web/API changes remove known fabrication; handoff/live artifact missing |
| Warehouse connection internal field leakage risk | FIXED ON BRANCH, NOT MERGED | schema-backed public projection present in #2035 |

## 13. Current product authority route remains unchanged

### 13.1 Accepted authority model

ADR-0060 defines mutually exclusive modes:

```text
graph-draft
dbt-project-files
```

In graph-draft mode, nodes and edges are authoritative and may be projected to
files before Preview.

In dbt-project-files mode, files are authoritative and Canvas is a projection.
Preview must not regenerate project files.

The explicit adoption transition must make file mutations, successful analysis,
parity proof and the authority switch atomic.

### 13.2 Active model-SQL authority gap

Current graph artifact projection still reads authored SQL from graph node
metadata:

```text
CanonicalNode metadata.modelSql
-> DbtModelArtifactProjection
-> models/<name>.sql
```

After files become the authority, that graph-held SQL must not silently
regenerate over a Project Code edit.

The required user transaction remains:

```text
create SQL G1 in Canvas
-> materialize models/model.sql
-> adopt file authority explicitly
-> edit file to F2 in Project Code
-> reopen Canvas
-> Preview
-> Run
-> reload
-> F2 remains authoritative
```

### 13.3 Atomic publication gap

Graph-first Preview still writes each generated artifact independently:

```ts
for (const artifact of artifactProjection.artifacts) {
  await workspaceFileContentCommand.saveFileContent(...)
}
```

A conflict after the first write can leave a partially published dbt project.

The repository already has the correct lower-level semantics:

- expected revisions for all paths;
- writes/deletes as one mutation;
- idempotency key;
- conflicts by path;
- immutable receipt;
- `IWorkspaceFileBatchMutationPort`.

The next atomic-publication slice must reuse that boundary rather than invent a
new transaction abstraction.

### 13.4 Exact revision gap

The file-backed controller receives `WorkspaceFileSaveReceipt` but ignores it
as `_receipt`, then refetches the latest project graph.

That proves a new projection exists, not that the projection belongs to the
exact save/project revision that started reconciliation.

The eventual chain must be explicit:

```text
publication or save receipt
-> exact project content-set identity
-> analysis identity
-> Preview identity
-> Run identity
-> reopen identity
```

### 13.5 Workspace capability truth gap

The current local repository:

- lists at most 500 files;
- silently returns a partial tree;
- has no cursor or completeness marker;
- rejects files larger than 1 MB as “invalid path.”

The future result vocabulary must distinguish:

- complete inventory;
- partial inventory;
- continuation cursor;
- file not found;
- unsupported file;
- oversized file;
- authorization/path rejection.

Increasing limits alone is not an acceptable correction.

## 14. Priority and sequencing assessment

### 14.1 Is #2035 valuable?

Yes.

A trustworthy run list/detail model is a real user-facing operational
transaction. It aligns with mature orchestration systems and removes fabricated
evidence.

### 14.2 Is #2035 the previously approved next slice?

No evidence was supplied that it is.

The last validated product order remains model SQL authority first. The current
PR does not touch that transaction.

### 14.3 Classification

`SEQUENCING DEVIATION — useful work, authority change not proven`.

This does not mean discard the branch. It means:

- correct and close #2035 cleanly;
- publish the handoff with an explicit reason for preemption;
- do not continue into another unrelated operability or governance slice;
- return immediately to model SQL authority.

### 14.4 What would constitute a legitimate order change?

Any of the following, with repository evidence:

- an approved Planning DB dependency making run truth a prerequisite;
- a blocking production defect requiring emergency correction;
- a release gate that cannot pass without this change;
- an explicit product decision recorded in the accepted authority model.

No such evidence is present in the current handoff because no handoff exists.

## 15. Mature-system comparison

### 15.1 dbt Cloud / Studio

Relevant mature behavior:

- files remain normal dbt project artifacts;
- the IDE integrates editing, validation, execution and version-control workflow;
- execution output is not another editable authoring authority.

DVT should match:

- one file authority in file-backed mode;
- explicit dirty/persisted/analyzed/executed states;
- diagnostics tied to exact project content.

DVT should differ:

- Canvas may provide governed visual editing where lossless;
- Planning DB may make design and evidence more explicit than a conventional IDE.

DVT should defer:

- broad collaboration and hosted-environment parity until authority and revision
  identity are sound.

Reference: [dbt documentation](https://docs.getdbt.com/).

### 15.2 Airflow

Airflow derives Dag Run status from task-instance state and exposes run history,
start/end/duration, code version and logs as execution evidence.

DVT should match:

- terminal result evidence must correspond to terminal lifecycle state;
- list and detail must use the same run identity/status semantics;
- run code/revision and history should remain inspectable.

DVT should differ:

- DVT owns authoring and compilation authority across Canvas and dbt files, not
  only orchestration.

DVT should defer:

- full task-history UX until the run read model is internally consistent.

References:

- [Airflow Dag Runs](https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/dag-run.html)
- [Airflow UI](https://airflow.apache.org/docs/apache-airflow/stable/ui.html)

### 15.3 Prefect

Prefect models run states as rich objects, keeps state history and distinguishes
state type from display name.

DVT should match:

- lifecycle facts should be owned by the runtime state model;
- absent evidence should remain absent;
- result data should follow state semantics, not presentation guesses.

DVT should differ:

- DVT's project revision and plan provenance are first-class authoring concerns.

DVT should defer:

- custom state proliferation until canonical status, substatus and evidence
  rules are stable.

Reference: [Prefect states](https://docs.prefect.io/v3/concepts/states).

### 15.4 Dagster

Dagster's useful comparison is asset/run observability and lineage-aware
operations.

DVT should match later:

- asset/materialization evidence associated with the exact run and code version;
- checks and freshness displayed without blurring execution state.

DVT should defer:

- rich asset differentiation until current run materialization evidence is
  lifecycle-safe and project authority is exact.

Reference: [Dagster documentation](https://docs.dagster.io/).

### 15.5 Temporal

Temporal's useful comparison is durable workflow identity and event-history
reconstruction.

DVT should match:

- stable run identity;
- correlation between requested operation and observed result;
- recovery and idempotency;
- no fabricated completion evidence.

DVT should differ:

- the editor must not expose Temporal as the product domain model.

Reference: [Temporal documentation](https://docs.temporal.io/).

### 15.6 NiFi

NiFi's useful comparison is explicit provenance events and operator-visible
flow/run evidence.

DVT should match:

- evidence is scoped, attributable and lifecycle-correct;
- security filtering happens before public projection.

DVT should defer:

- a broad proprietary flow registry; Git remains the eventual review/history
  transport for source artifacts.

Reference: [NiFi provenance documentation](https://nifi.apache.org/docs/nifi-docs/html/user-guide.html#data_provenance).

### 15.7 Professional IDE and Git workflow

Professional tooling distinguishes:

- editor buffer;
- saved file;
- diagnostics/index;
- staged change;
- commit;
- remote synchronization;
- conflict.

DVT should match that honesty. A status label must not imply more authority or
durability than the underlying evidence proves.

Reference: [VS Code source control](https://code.visualstudio.com/docs/sourcecontrol/overview).

## 16. Required PR decomposition from here

### PR 2035 correction — current branch only

Close:

- nonterminal materialization parity;
- Planning DB premature closeout;
- handoff absence;
- scope disposition;
- exact-head review and CI.

No new product capability should be added while correcting #2035.

### Next product PR A — model SQL authority

One end-to-end transaction:

```text
graph-authored SQL
-> materialize/adopt files
-> edit Project Code
-> reopen Canvas
-> Preview/Run
-> no silent overwrite
```

Must reuse:

- `CanvasAuthoringAuthorityBinding`;
- graph-draft aggregate before adoption;
- `SaveWorkspaceFileContent` after file authority;
- `ProjectDbtGraphFromFiles`;
- existing project revision/analysis contracts.

Must not introduce:

- a new DSL;
- a second file repository;
- a dbt-specific save synonym;
- dual graph/file authority;
- browser-owned dbt parsing.

### Next product PR B — atomic project publication

Replace sequential artifact writes with the existing batch mutation authority.
Bind the resulting receipt to exact project analysis and Preview/Run identity.

### Next product PR C — workspace capability truth

Introduce paginated inventory and typed file-capability outcomes.

### Next product PR D — authoring recovery

Add durable recovery only after publication and inventory semantics are stable.

### Next product PR E — product-wide nonfunctional gates

Add accessibility, performance, payload, large-graph and failure-injection gates
as product evidence, not generic governance expansion.

## 17. Release gates for PR #2035

Do not merge until all are true:

- [ ] complete `## Iteration Handoff` exists;
- [ ] P2 nonterminal materialization thread resolved;
- [ ] corrected exact head reviewed;
- [ ] list/detail lifecycle parity tests added;
- [ ] all six standard workflows green on corrected head;
- [ ] Planning DB migrations describe corrected truth;
- [ ] `noHumanDecisionsRemaining` is defensible;
- [ ] strict live proof linked;
- [ ] warehouse/source-import scope split or justified;
- [ ] rollback and compatibility documented;
- [ ] no new query rail introduced;
- [ ] no terminal result evidence exposed before completion;
- [ ] follow-up list failure/latency policy recorded without blocking unrelated
      product work indefinitely.

## 18. Mandatory iteration handoff template

The implementation agent must post this as a top-level comment on #2035 after
its final correction:

```markdown
## Iteration Handoff

### Identity
- Planning DB work item:
- Architecture design:
- Base SHA:
- Final head SHA:
- Branch:
- PR:

### Goal
- User transaction closed:
- Why this iteration was selected now:

### What changed
- API/domain:
- Web/presentation:
- Runtime/adapters:
- Tests/live proof:
- Planning DB/docs:

### How it works
1.
2.
3.

### Why this design
- Selected option:
- Rejected alternatives:
- Fowler/DDD rationale:

### Ownership and boundaries
- DDD owners:
- Commands:
- Queries:
- Ports:
- Adapters:
- Contracts:
- Migrations:
- Files:

### User-visible behavior
- Before:
- After:
- Failure behavior:

### Red/green evidence
- Red test and observed failure:
- Patch:
- Green commands and results:

### CI and live proof
- Exact-head workflows:
- Browser/integration proof:
- Artifacts/logs:

### Operational posture
- Security:
- Data integrity:
- Observability:
- Compatibility:
- Rollback:

### Deviations and risks
- Approved-route deviation:
- Reason:
- Open risks:
- Follow-ups:

### Recommended next iteration
- Work item:
- User transaction:
- Explicit non-goals:
```

Claims such as “passed” must include the exact command or workflow link.

## 19. Instruction to the implementation agent

1. Stop adding scope to #2035.
2. Fix the unresolved nonterminal-materialization invariant in the shared
   `RunOperationalReadModel`.
3. Add list/detail parity tests and terminal/nonterminal materialization tests.
4. Reconcile migrations `792` through `796` with the corrected behavior.
5. Split or justify warehouse/source-import scope.
6. Run focused tests, full relevant suites and `verify:prepush`.
7. Push the corrected head.
8. Resolve the P2 only after the code and tests exist.
9. Wait for exact-head CI.
10. Post the complete handoff.
11. Do not begin another operability, dependency, release or governance slice.
12. Return to `E-WEB-DBT-MODEL-SQL-AUTHORITY-1` or the exact current Planning DB
    equivalent after #2035 is clean.

## 20. Final decision

PR #2035 is meaningful work and should not be discarded.

It is also currently self-contradictory, incompletely handed off and outside the
validated next product sequence.

The correct decision is:

```text
fix #2035 narrowly
-> make Planning DB and evidence truthful
-> publish the handoff
-> merge only after exact-head proof
-> return immediately to dbt model SQL authority
```

That restores both operational truth and delivery discipline without creating
another parallel source of architecture authority.
