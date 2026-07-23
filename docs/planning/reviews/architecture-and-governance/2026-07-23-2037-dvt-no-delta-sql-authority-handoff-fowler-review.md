---
title: DVT no-delta SQL authority and delivery-handoff Fowler review
status: Review
date: 2026-07-23
reviewed_repository: dunay2/dvt
reviewed_main_sha: 8c098d6e35ce874efae81609814d99e8e60091f7
reviewed_functional_pr: 2040
reviewed_functional_head: 6257745ed1ec91f1a1415585d24e319905966931
owner: Architecture / Product / Delivery Governance
planning_type: point-in-time-review
---

# DVT no-delta SQL authority and delivery-handoff Fowler review

## 1. Executive verdict

There is no material repository or product change since the previous cycle.

Exact reviewed `main`:

- [`8c098d6e35ce874efae81609814d99e8e60091f7`](https://github.com/dunay2/dvt/commit/8c098d6e35ce874efae81609814d99e8e60091f7)
- release commit: `chore(main): Release 0.5.3 (#2037)`

The only functional pull request remains:

- [#2040 — `fix(web): Prevent graph preview from overwriting DBT model SQL`](https://github.com/dunay2/dvt/pull/2040)
- exact head: [`6257745ed1ec91f1a1415585d24e319905966931`](https://github.com/dunay2/dvt/commit/6257745ed1ec91f1a1415585d24e319905966931)
- base: exact current `main`
- mergeable: yes
- standard CI: six successful workflows
- open inline review threads: none

The implementation is still directionally correct and there is no newly demonstrated runtime blocker.

The delivery status remains:

```text
DELIVERY-HANDOFF-MISSING
```

No top-level `## Iteration Handoff` exists in PR #2040. The PR body is useful but does not satisfy the agreed iteration-closeout contract.

Primary decision:

1. Do not expand #2040 with atomic publication, inventory, recovery, release, or unrelated governance.
2. Require the implementation agent to publish the complete handoff.
3. After normal review and merge of #2040, begin the existing atomic multi-file publication and exact project-revision vertical.
4. Do not invent compatibility or migration requirements for pre-product artifacts.

## 2. Review scope and evidence

This review inspected:

- exact current `main` and recent commits;
- every visible open pull request;
- PR #2040 metadata, changed files, comments, review thread, and exact-head workflows;
- the SQL-publication classifier on the functional branch;
- the graph workspace artifact publisher on the functional branch;
- the current dbt file-canvas reconciliation callback on `main`;
- current run-list pagination behavior on `main`;
- the accepted authority and round-trip architecture direction;
- existing batch mutation contracts and adapters;
- active product, integrity, recovery, operability, security, accessibility, and performance gaps previously verified against current source.

No local checkout or local test execution is claimed by this report. Execution claims are limited to repository evidence and GitHub workflow results.

## 3. Exact repository state

### 3.1 `main`

`main` remains at:

```text
8c098d6e35ce874efae81609814d99e8e60091f7
```

No commit newer than release `0.5.3` is visible on the default branch.

Recent relevant product commits remain:

1. `9bc344578ca3ed45d09924dba4341ba41eff9b38` — unify run operational truth;
2. `8a39d19ec0d6b2abedfe7ce313ac4e7c53d9b3d8` — preserve pending reconciliation receipt truth;
3. earlier dbt file-authoring and Canvas authority work.

### 3.2 Open pull requests

Before this review branch, the visible open pull requests were:

- #2040 — functional SQL-authority containment;
- #2048 — the immediately previous point-in-time review.

No other functional implementation branch was visible.

### 3.3 Release state

The current released repository state is `0.5.3`.

No new release pull request or release-candidate branch is visible.

Release work must not displace the next product vertical.

## 4. Implementation handoff audit

### 4.1 Result

```text
DELIVERY-HANDOFF-MISSING
```

### 4.2 What exists

PR #2040 records:

- root cause;
- high-level changes;
- validation command names;
- statement that hooks and quality rules were not bypassed.

Repository evidence also proves:

- exact base and head;
- one implementation commit;
- changed-file inventory;
- six successful standard workflows;
- one resolved inline review thread;
- protected Cypress test file changes;
- Planning DB migrations 797–799.

### 4.3 What is still missing from one auditable handoff

The implementation agent must still consolidate:

1. exact base SHA and final head SHA;
2. branch and PR;
3. iteration goal;
4. what changed;
5. how it was implemented;
6. why that design was selected;
7. exact domain owners;
8. command/query rails reused;
9. ports reused;
10. adapters reused;
11. contracts reused or changed;
12. migrations and files touched;
13. user-visible behavior;
14. tests observed failing before implementation;
15. tests passing after implementation;
16. exact-head CI links;
17. live browser or integration proof link;
18. security posture;
19. data-integrity posture;
20. observability posture;
21. compatibility posture;
22. rollback posture;
23. unresolved risks;
24. deviations from the approved route;
25. recommended next iteration.

A claim without repository or workflow evidence must be marked as a claim rather than executed proof.

## 5. Claim-to-evidence matrix for PR #2040

| Claim | Status | Evidence | Review conclusion |
| --- | --- | --- | --- |
| PR is based on exact current `main` | VERIFIED | base SHA equals `8c098d6e...` | no rebase drift currently visible |
| Graph Preview previously overwrote accepted Project Code SQL | VERIFIED | root-cause path and replacement behavior are visible in the changed publication flow | valid product defect |
| Graph-owned model SQL now has deterministic marker integrity | VERIFIED | `dbtGraphModelSqlPublicationPolicy.ts` hashes and validates payload | detects payload divergence; does not authenticate origin |
| All artifacts are read before the first write | VERIFIED | publisher uses `Promise.all` preflight before write loop | closes read-after-write expected-revision drift |
| Observed CAS revisions are retained | VERIFIED | prepared artifacts carry captured expected revisions | correct optimistic concurrency input |
| Divergent unmarked SQL fails closed | VERIFIED | classifier returns `conflict` when bytes differ | external edit is preserved |
| Malformed managed marker fails closed | VERIFIED | invalid marker returns `conflict` | corrupted managed representation is not overwritten |
| Graph-owned Project Code is read-only | VERIFIED | Code surface and edit-posture files/tests changed | matches active graph authority |
| File-authoritative dbt projects remain editable | VERIFIED | PR explicitly preserves dbt-project-files edit posture | avoids global read-only regression |
| External SQL is preserved byte-for-byte in protected flow | VERIFIED | protected Cypress scenario changed and command is named in PR | workflow evidence is green; direct handoff link still absent |
| Marker authenticates ownership or writer | DISPROVED | unkeyed digest can be recomputed | integrity only; migration 799 wording was corrected |
| Deployed pre-marker artifacts require migration | DISPROVED | product owner states DVT is pre-product and no preservation contract exists | do not add legacy migration machinery |
| Byte-identical unmarked projection bootstrap loses external semantics | DISPROVED | active graph-draft authority and exact byte equality establish no semantic divergence | naming may improve; runtime correctness blocker not proven |
| Multi-file publication is atomic | CONTRADICTED | final publisher still loops over `saveFileContent` | next vertical remains required |
| Preview and Run are bound to one exact project revision | NOT PROVEN | no immutable project publication receipt is consumed by both | next vertical remains required |
| Tests were observed failing before implementation | NOT PROVEN | no red chronology in handoff | delivery evidence gap |
| Complete rollback posture is documented | NOT PROVEN | PR body does not state it | handoff gap |
| Complete residual-risk statement exists | NOT PROVEN | no consolidated handoff | handoff gap |

## 6. Fixed, active, superseded, and disproved findings

### 6.1 Fixed

#### Reconciliation edit/revert race

PR #2030 fixed the pending save-receipt truth defect. Do not reopen it.

#### Run list/detail operational materialization mismatch

PR #2035 moved terminal-materialization sanitation into the common operational projection. The original inconsistency is fixed.

#### Marker authentication overclaim

The branch’s closeout language now distinguishes integrity checking from source authentication. No signing, secret, or MAC belongs in #2040.

#### Legacy-upgrade requirement

The automated review request to preserve deployed pre-marker graph workspaces is not applicable. DVT is pre-product and no supported preservation contract was cited.

### 6.2 Active

#### P1 — sequential graph artifact publication

The functional branch performs a complete preflight but writes prepared artifacts sequentially:

```text
preflight all paths
→ save path 1
→ save path 2
→ save path N
```

A conflict or failure after earlier writes can leave a partially published dbt project.

#### P1 — exact project revision is not authoritative end-to-end

Current Code reconciliation accepts a `WorkspaceFileSaveReceipt` but ignores it:

```ts
async (_receipt: WorkspaceFileSaveReceipt) => {
  return projectDbtCodeReconciliationOutcome(
    await refreshProjectGraphSource()
  );
}
```

The returned analysis can describe the latest project snapshot rather than the exact project state associated with the save.

#### P2 — `ListRuns` pagination is incomplete

`ListRunsUseCase` currently:

1. limits at tenant scope;
2. filters project and environment in application memory;
3. constructs a cursor from the filtered subset;
4. exposes `nextCursor` even though the query does not accept one.

This can hide authorized runs and falsely report exhaustion.

#### P1 — workspace capability truth

The interactive workspace inventory still has inconsistent file-count and file-size semantics. A large imported project can be accepted while Explorer later exposes a partial inventory without an explicit completeness state.

#### P2 — generic HTTP response casts

The generic Web client still treats parsed JSON as `TResponse` without runtime schema validation. New publication and revision contracts must not repeat this boundary.

#### P2 — crash recovery

Navigation flushing and `beforeunload` warnings are not durable recovery. There is no journal that restores unpersisted authoring buffers after process or machine failure.

#### Product-wide quality evidence

Web/API coverage ratchets, accessibility gates, bundle budgets, large-graph performance, failure injection, and current-state generation remain incomplete or unevenly enforced.

### 6.3 Superseded

#### “Split Code state first” as the immediate priority

The concrete receipt-reversion bug is fixed. A deeper state-model refactor may remain valuable but no longer precedes authority and atomic publication.

#### Release-governance expansion as the next route

Release integrity work is no longer the product bottleneck. Do not start another release-governance cycle before closing the authoring transaction.

### 6.4 Disproved

- deployed pre-marker artifact migration is required;
- signing is required for this local graph-managed marker;
- #2040 must absorb atomic publication to be useful;
- the byte-identical graph-projection bootstrap is a proven semantic overwrite.

## 7. Fowler review of the current product path

### 7.1 Hidden authority

#2040 correctly addresses hidden SQL authority by preventing a graph projection from silently replacing divergent file content.

The next hidden authority remains project revision identity. A latest-read analysis is not the same thing as an analysis correlated to an immutable publication receipt.

### 7.2 Responsibility overload

The Canvas plan action still performs projection, file policy, persistence orchestration, Preview invocation, and error mapping. #2040 extracts useful policy and publisher components, but atomic publication should move the multi-file transaction into the existing server-owned batch authority rather than expanding browser responsibility.

### 7.3 Leaky abstraction

The current Web flow must understand individual workspace file revisions because the only exposed command is per-file persistence. This leaks storage transaction mechanics into Canvas.

The next slice should expose one application operation representing one domain transaction, while reusing the existing batch port internally.

### 7.4 Primitive obsession

Strings currently stand in for important revision identities in multiple places. The next slice needs typed values for:

- publication identity;
- project content-set identity;
- analysis identity;
- idempotency identity;
- Preview provenance.

Do not create arbitrary wrappers without invariant value. The types must validate format and ownership.

### 7.5 Test-only confidence

Six green workflows prove substantial coverage but do not prove an atomic transaction that does not exist.

The next slice must use injected failure and conflict tests at the actual batch adapter and protected browser boundary.

### 7.6 Shotgun surgery

#2040 changes 24 files for one authority slice, including UI, tests, policy, publisher, Cypress, and three migrations. Much of that is legitimate vertical evidence, but future slices should avoid adding further parallel ownership records where existing components and rails already own the concern.

### 7.7 Stale truth

No new stale Planning DB truth was demonstrated this cycle. Nevertheless, an implementation cannot be marked fully delivered while the required handoff remains absent.

## 8. Corrective instruction for the implementation agent

### 8.1 Blocking delivery correction

What is wrong:

- the implementation exists;
- CI is green;
- the iteration-closeout report does not exist.

Why it matters:

- reviewers cannot distinguish executed evidence from narrative claims;
- security, rollback, residual risk, and sequencing decisions are scattered;
- the next agent can repeat superseded compatibility assumptions;
- merge can occur without a reproducible delivery record.

Exact owner:

- implementation agent / PR #2040 author;
- delivery-governance owner for the iteration-closeout record.

How to correct:

Add one top-level PR comment beginning:

```markdown
## Iteration Handoff
```

Complete every required section in section 14 of this report.

What must not be introduced:

- no runtime code changes merely to satisfy documentation;
- no legacy migration;
- no signing or key management;
- no atomic publication work inside #2040;
- no new rail, route, port, or repository.

Green proof:

- exact final head stated;
- six existing workflows linked;
- protected Cypress proof linked;
- changed-file and migration inventory listed;
- residual atomicity gap explicitly assigned to the next task.

Acceptance criteria:

- all mandatory handoff fields are present;
- claims and executed evidence are visibly separated;
- no unsupported compatibility promise is made;
- next slice is bounded to atomic publication and exact revision identity.

Rollback:

- runtime rollback is a normal revert of #2040;
- no data migration is required because DVT is pre-product and the marker is an initial supported representation;
- generated development artifacts are disposable.

Observability:

- preserve conflict-path reporting;
- do not log SQL bodies;
- record identifiers, paths, revision hashes, decision kind, and result only where current telemetry conventions allow.

Security:

- marker is an integrity signal, not authentication;
- no secrets in markers or logs;
- path scope and CAS remain mandatory;
- divergent content fails closed.

### 8.2 Follow-up naming improvement

`adopt_legacy_equivalent` can be renamed to a domain-truthful term such as:

```text
mark_equivalent_unmarked_projection
```

This is not a correctness or merge blocker. It may be included only if it remains a small terminology-only correction and does not restart compatibility work.

## 9. Next implementation slice: atomic publication and exact revision

### 9.1 Severity and evidence

Severity: P1 data integrity and reproducibility.

Evidence:

- graph publisher writes one file at a time;
- an existing server batch gateway already supports multi-path concurrency and atomic replacement;
- Code reconciliation ignores the individual save receipt when refreshing project analysis;
- Preview and Run are not proven to consume one immutable published revision.

### 9.2 Root cause

The product transaction is represented as a browser loop over a per-file command instead of one application command owning a complete project publication.

The existing batch storage capability is used by other flows but is not yet the authority for graph-first Preview publication.

### 9.3 User impact

Without the slice:

- Preview can leave a partially updated dbt project;
- a later retry can observe mixed old and new files;
- Preview can describe a different revision from the write that triggered it;
- Run can execute a revision different from the one the user approved;
- reopening cannot prove which project bytes produced the plan.

### 9.4 Domain owner

Primary domain owner:

```text
DBT Project Publication
```

Collaborating owners:

- Canvas Authoring;
- Workspace File Mutation;
- dbt Project Analysis;
- Plan Preview;
- Run Execution Provenance.

### 9.5 Proposed domain objects

Reuse existing objects:

- `WorkspaceFileBatchMutation`;
- `WorkspaceFileBatchReceipt`;
- `WorkspaceFileBatchExpectedFile`;
- `WorkspaceFileBatchWrite`;
- `DbtProjectGraphProjection`;
- existing project analysis hashes.

Add only the missing transaction result, preferably shaped as:

```ts
type DbtProjectPublicationReceipt = Readonly<{
  publicationId: string;
  idempotencyKey: string;
  requestHash: string;
  writes: readonly Readonly<{
    path: string;
    contentSha256: string;
  }>[];
  projectContentSetSha256: string;
  analysisSha256: string;
  publishedAt: string;
}>;
```

Names must follow existing repository vocabulary after Planning DB inspection. Do not duplicate an existing receipt if a current contract already covers the same semantics.

### 9.6 Command/query rails

Preferred command intent:

```text
PublishDbtProjectRevision
```

Before adding a new public name, verify Planning DB for the existing atomic-publication task and command rail. If an approved rail already exists, implement it exactly rather than introducing another.

Queries:

- reuse `ProjectDbtGraphFromFiles` for analysis;
- do not create `ValidateDbtProject`;
- do not perform two independent GETs and call them atomic proof.

### 9.7 Port changes

Web application port:

- one command accepting complete artifact proposal, complete expected revisions, and idempotency key;
- one typed receipt result;
- one typed conflict result containing all conflicting paths.

API application service:

- authorize scope;
- validate paths and limits;
- build or validate batch mutation;
- call `IWorkspaceFileBatchMutationPort`;
- analyze the exact post-publication project;
- verify receipt postconditions;
- return one publication-and-analysis receipt.

Storage adapter:

- reuse `LocalWorkspaceFileBatchMutationGateway`;
- do not add a parallel local transaction engine.

### 9.8 Likely files and components

Expected areas, subject to DB-first design approval:

- `packages/@dvt/contracts/src/contracts/**`;
- `apps/api/src/application/ports/workspaceFiles.ts` only if existing types are insufficient;
- `apps/api/src/application/services/**dbt**publication**`;
- protected runtime route registration;
- Web workspace command port and adapter;
- `apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.ts`;
- `apps/web/src/app/views/canvas/canvasPlanAction.ts`;
- Preview/Run provenance projection;
- API and Web unit/architecture tests;
- batch gateway conformance tests;
- protected Cypress vertical;
- one Planning DB design migration and one closeout migration where repository governance requires them.

### 9.9 Migration and compatibility

DVT is pre-product.

Compatibility requirements:

- preserve current supported command inputs within the branch where practical;
- no migration of development workspace contents;
- no historical artifact discovery;
- no dual-write fallback;
- no old/new publication mode switch.

Cutover:

- replace graph publisher’s per-file loop with the one batch command;
- remove obsolete browser orchestration after the vertical proves parity;
- keep file-authoritative direct single-file editing separate from graph multi-file publication.

### 9.10 Rollback

Rollback must be a normal code revert.

The batch gateway itself must guarantee all-or-nothing file replacement or restore the original set on failure.

No compensating browser loop is acceptable.

### 9.11 Observability

Record:

- publication ID;
- idempotency key hash, not secret material;
- scope IDs;
- path count;
- total byte count;
- request hash;
- publication result;
- conflict paths;
- project content-set hash;
- analysis hash;
- latency;
- deduplicated retry flag.

Never record:

- SQL bodies;
- credentials;
- profiles;
- secret connection values.

### 9.12 Security

- authorize tenant/project/environment before reading or writing;
- reuse normalized path policy;
- reject traversal and duplicate paths;
- enforce file and batch limits;
- bind expected revisions to every touched path;
- validate idempotency-key reuse;
- fail closed when receipt postconditions do not match;
- run dbt analysis under the existing constrained adapter rules;
- do not expose filesystem absolute paths.

### 9.13 PR decomposition

Preferred narrow vertical:

#### PR A — command contract and server transaction

- approved design and rail;
- typed request/result;
- API use case;
- existing batch port;
- exact post-publication analysis;
- adapter and API tests.

#### PR B — Canvas consumption and exact Preview/Run provenance

- replace sequential publisher;
- consume immutable receipt;
- Preview and Run revision checks;
- protected browser proof;
- remove obsolete loop.

A single PR is acceptable only if the repository’s vertical-slice governance requires end-to-end evidence in one branch and the diff remains reviewable. Do not split into infrastructure-only abstractions that deliver no user transaction.

### 9.14 Red tests

Required failures before implementation:

1. conflict on the second artifact leaves every path unchanged;
2. injected replacement failure leaves every path unchanged;
3. duplicate artifact path fails before storage;
4. missing expected revision for one path fails before storage;
5. same idempotency key and same request returns the original receipt;
6. same key and different request fails closed;
7. receipt postcondition mismatch fails closed;
8. analysis failure does not claim successful publication-and-analysis completion;
9. Preview rejects a project content-set different from the receipt;
10. Run rejects or requires a new Preview after project revision change;
11. reopen reconstructs the exact receipt revision;
12. logs and errors do not contain SQL bodies;
13. unauthorized scope reaches neither batch storage nor analyzer;
14. Web cannot fall back to sequential saves.

### 9.15 Green proof

- contract tests;
- API application tests;
- batch gateway tests;
- architecture guards proving one rail and one batch port;
- Web unit and presentation tests;
- protected API integration;
- PostgreSQL and workspace-file proof;
- constrained dbt analysis proof;
- Cypress Canvas → publish → Preview → Run → reopen proof;
- full pre-push suite;
- six exact-head workflows.

### 9.16 Live proof

The browser proof must demonstrate:

```text
create or modify graph SQL
→ Preview
→ one atomic publication receipt
→ exact project and analysis identities shown or traceable
→ Run uses the same identities
→ reload/reopen
→ same files, same project hash, same analysis hash
```

Negative proof:

```text
external edit between preflight and mutation
→ conflict
→ no file changed
→ no Preview created
→ no Run started
```

### 9.17 Acceptance criteria

- no per-file publication loop remains in graph Preview;
- one server-owned command owns the complete mutation;
- all expected revisions are validated before replacement;
- conflict lists all affected paths;
- retry is idempotent;
- receipt is immutable and validated;
- receipt contains exact project and analysis identities;
- Preview persists those identities;
- Run verifies those identities;
- reopen can reproduce the same revision;
- no SQL body appears in telemetry;
- Planning DB task, design, evidence, and implementation truth match final code;
- complete `## Iteration Handoff` is published.

### 9.18 Release gates

Block merge unless:

- all red tests become green;
- protected live flow passes;
- no unresolved review thread remains;
- contracts, code quality, tests, dependency review, CodeQL, and PR Quality Gate are green on final head;
- the handoff is complete;
- no new duplicate rail, port, or storage authority is introduced.

## 10. Subsequent priority order

After atomic publication and exact revision:

1. workspace inventory and file-size truth;
2. cohesive authoring session recovery;
3. runtime validation of HTTP responses;
4. Web/API coverage and non-functional gates;
5. accessibility and keyboard proof;
6. large-graph and payload performance;
7. operational failure injection and multi-worker proof;
8. later differentiation: assets, lineage, freshness, promotion, collaboration.

The order may change only when live Planning DB dependencies and approved designs demonstrate a legitimate new dependency.

## 11. Mature-system comparison

### dbt Cloud / Studio

Match:

- ordinary dbt files remain the durable user language;
- build, test, Preview, Run, and source control must refer to clear revisions;
- file authority and generated/compiled output must not be confused.

Differentiate:

- DVT’s Canvas can provide a stronger bidirectional graph/code projection where edits are lossless and governed.

Defer:

- collaboration, environment promotion, advanced lineage, and rich multi-user review until authority and revision identity are complete.

Reference: [dbt Cloud IDE and Studio documentation](https://docs.getdbt.com/docs/cloud/dbt-cloud-ide/develop-in-the-cloud).

### Airflow

Match:

- one run must remain bound to one complete version of all required files;
- reruns must make the revision choice explicit.

Differentiate:

- DVT’s revision is a data-transformation project content set rather than a Python DAG bundle.

Defer:

- generalized bundle source plugins.

Reference: [Airflow DAG Bundles](https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/dag-bundles.html).

### Prefect

Match:

- deployments and runs should refer to exact code versions;
- promotion and rollback should be explicit later capabilities.

Differentiate:

- DVT should first expose dbt project revision identity directly rather than hiding it behind generic deployment infrastructure.

Defer:

- broad deployment orchestration until the authoring transaction is complete.

Reference: [Prefect deployments](https://docs.prefect.io/v3/deploy).

### Dagster

Match later:

- assets, lineage, checks, freshness, and observability are relevant product directions.

Defer now:

- these do not precede file authority, atomic publication, and reproducible execution.

Reference: [Dagster assets](https://docs.dagster.io/guides/build/assets).

### Temporal

Match:

- durable identities;
- idempotency;
- deterministic recovery posture;
- explicit correlation of requests and outcomes.

Do not copy:

- DVT does not need a second workflow engine inside Canvas.

Reference: [Temporal durable execution](https://docs.temporal.io/temporal).

### NiFi

Match:

- visual flow editing needs clear version and change ownership;
- Git-oriented versioning is preferable to a parallel proprietary registry.

Defer:

- broad flow-version registry semantics until DVT project revision identity is proven.

Reference: [Apache NiFi version control documentation](https://nifi.apache.org/docs/nifi-docs/html/administration-guide.html#versioned-flows).

### Professional IDE and Git workflows

Match:

- distinguish editor buffer, persisted file, semantic diagnostics, index freshness, commit/revision, conflict, and execution;
- never compress those states into one vague synchronized label.

Reference: [Visual Studio Code source control](https://code.visualstudio.com/docs/sourcecontrol/overview).

## 12. Product dead ends to avoid

Do not:

- create another user-facing DSL for dbt;
- create a second file repository;
- create another dbt validation query;
- claim atomicity from multiple reads;
- implement rollback as a browser compensation loop;
- add legacy migration code for pre-product fixtures;
- add signatures or secrets to graph SQL markers;
- store SQL bodies in logs or receipts;
- introduce generic authoring-session infrastructure before the current transaction is proven;
- expand release governance instead of implementing the next product slice;
- treat generated Markdown reviews as operational Planning DB authority.

## 13. Release and governance posture

No release work is required by this cycle.

PR #2040 may proceed after the delivery handoff is complete and normal human review is satisfied.

The next product PR must be tied to live Planning DB authority for atomic publication and exact revision. The new report must not create duplicate tasks.

Point-in-time review documents should be closed or superseded when a newer review exists. They are evidence, not operational task truth.

## 14. Required `## Iteration Handoff` template

The next comment from the implementation agent should use this structure:

```markdown
## Iteration Handoff

### Identity
- Task/design:
- Base SHA:
- Final head SHA:
- Branch:
- PR:

### Goal
- User transaction:
- Problem closed:
- Explicit out of scope:

### What changed
- Runtime:
- Contracts:
- Tests:
- Planning DB:
- Documentation/evidence:

### How it was implemented
- Domain owner:
- Commands/queries:
- Ports:
- Adapters:
- Contracts/domain objects:
- Files/migrations:

### Why this design
- Existing semantics reused:
- Alternatives rejected:
- Duplicate semantics avoided:

### User-visible behavior
- Positive path:
- Conflict/failure path:
- Recovery behavior:

### Red/green chronology
- Red test and observed failure:
- Implementation step:
- Green test and result:

### Executed evidence
- Unit/integration commands:
- Protected browser/live command:
- Exact-head workflow links:
- Evidence artifact/path:

### Security, integrity, and observability
- Authorization/scope:
- Input/path/limit validation:
- Integrity guarantees:
- Telemetry:
- Sensitive data excluded:

### Compatibility and rollback
- Supported state:
- Pre-product decision:
- Rollback:
- Data migration:

### Residual risks
- Known remaining gaps:
- Why they are outside this iteration:
- Owning tasks:

### Deviations
- Approved-route deviations:
- Justification:
- Corrective follow-up:

### Recommended next iteration
- Exact bounded transaction:
- Required first red test:
- Required final live proof:
```

## 15. Final decision

There is no material delta to reward or new defect to manufacture.

PR #2040 remains a credible implementation of model SQL authority containment. It has green CI and no open review thread. Its only demonstrated current blocker is the missing auditable iteration handoff.

After that handoff and normal merge, DVT should move directly to atomic multi-file publication and exact project-revision identity, using the existing batch mutation authority and without creating parallel semantics.
