---
title: DVT No-Delta SQL Authority Handoff Fowler Review
status: Review
date: 2026-07-24
reviewed_repository: dunay2/dvt
reviewed_ref: main
reviewed_commit: 8c098d6e35ce874efae81609814d99e8e60091f7
review_branch: agent/dvt-review-20260724-0039
review_kind: architecture-and-governance-delta
scope: documentation-only
---

# DVT no-delta SQL authority handoff Fowler review

## 1. Executive decision

There is no material repository or product-code delta since the previous review.

The exact reviewed `main` remains:

```text
8c098d6e35ce874efae81609814d99e8e60091f7
chore(main): Release 0.5.3 (#2037)
```

The only functional pull request remains:

- PR #2040, `fix(web): Prevent graph preview from overwriting DBT model SQL`
- branch `fix/dbt-model-sql-authority-containment`
- head `6257745ed1ec91f1a1415585d24e319905966931`
- base `main@8c098d6e35ce874efae81609814d99e8e60091f7`

PR #2040 has no newly demonstrated runtime blocker.

Its current delivery status is:

```text
DELIVERY-HANDOFF-MISSING
```

The implementation evidence is strong enough to treat the SQL-authority containment as functionally credible, but the iteration is not auditable under the agreed delivery contract because the implementation agent has not produced a consolidated `## Iteration Handoff`.

The immediate action is not another runtime expansion. The implementation agent must publish the handoff, obtain final review on the exact head, and close PR #2040 normally.

After that, the next product slice remains atomic multi-file DBT publication plus exact project-revision identity through the existing workspace batch mutation authority.

No compatibility migration is required. DVT is pre-product and no merged preservation contract, deployed dataset, or supported pre-marker artifact population was found.

## 2. Evidence boundary and honesty

This review used repository and pull-request evidence available through GitHub:

- exact `main` commit;
- recent repository commits;
- all visible open pull requests;
- pull-request metadata;
- changed files and selected patches;
- pull-request comments and review threads;
- workflow runs on relevant PR heads;
- accepted ADR and product-plan documents;
- current runtime, Web, API, adapter, test, and governance source;
- official documentation for relevant mature systems.

This review did not execute the repository locally.

Therefore:

- GitHub workflow results are reported as GitHub evidence;
- commands listed in PR bodies are claims unless a linked run or artifact proves them;
- source inspection can prove implementation shape, not production behavior;
- a protected Cypress test in source proves the intended live scenario exists;
- its local execution is only partially proven when the PR body states it ran but no direct artifact or log link is supplied;
- no unobserved test, browser run, migration, or runtime behavior is claimed as executed.

## 3. Current repository snapshot

| Concern | Current state |
| --- | --- |
| Exact `main` | `8c098d6e35ce874efae81609814d99e8e60091f7` |
| Current package version | `0.5.3` |
| Latest merged product work | PR #2035, run operational truth |
| Release PR | #2037, merged |
| Functional PR open | #2040 |
| Current review PR before this report | #2049 |
| Functional head | `6257745ed1ec91f1a1415585d24e319905966931` |
| Functional PR mergeability | mergeable |
| Functional head standard workflows | six successful |
| Open inline review threads on #2040 | none |
| Implementation handoff | missing |
| Product sequencing authority | Planning DB, ADR-0060, accepted DBT round-trip plan |
| Next approved product direction | atomic publication and exact revision identity |

## 4. Material delta since the previous review

### 4.1 Repository delta

None.

`main` has not advanced beyond release `0.5.3`.

PR #2040 has not advanced beyond `6257745ed1ec91f1a1415585d24e319905966931`.

No new functional PR appeared.

No review thread became newly unresolved.

No new workflow failure appeared on the functional head.

### 4.2 Delivery-process delta

None.

The implementation agent still has not produced a complete `## Iteration Handoff`.

### 4.3 Review disposition delta

None.

The prior automated claim that DVT must migrate deployed pre-marker graph SQL remains disproved.

The repository is pre-product. Development fixtures and unreleased artifact representations are disposable unless an explicit supported-state contract says otherwise.

## 5. Open pull-request inventory

### 5.1 PR #2040 — functional product work

Title:

```text
fix(web): Prevent graph preview from overwriting DBT model SQL
```

Verified scope:

- graph-managed SQL marker policy;
- complete artifact preflight before the first write;
- expected-revision capture at preflight time;
- typed divergence result;
- localized Preview rejection;
- graph-owned Project Code read-only posture;
- file-authoritative Project Code editable posture;
- protected Cypress flow covering external SQL divergence;
- Planning DB design, components, responsibilities, tests, evidence, and residual atomic-publication gap.

Current head:

```text
6257745ed1ec91f1a1415585d24e319905966931
```

Current standard workflow state:

- Contracts & Determinism: success
- Dependency Review: success
- Test Suite: success
- CI - Code Quality: success
- CodeQL: success
- PR Quality Gate: success

Current review-thread state:

- one historical automated P1;
- resolved;
- not outdated;
- disposition: unsupported compatibility requirement, disproved.

### 5.2 PR #2049 — superseded point-in-time review

PR #2049 is documentation-only and contains the previous current-state review.

It should be closed after this report is successfully published, because keeping multiple open “current” reviews creates stale parallel truth.

The report itself remains useful historical evidence through Git history and the PR timeline.

## 6. Implementation handoff audit

### 6.1 Status

```text
DELIVERY-HANDOFF-MISSING
```

### 6.2 What exists

PR #2040 contains:

- root cause;
- implementation summary;
- broad validation commands;
- a focused functional title;
- current base and head identity;
- changed-file scope;
- green GitHub workflows;
- one protected live Cypress scenario in source;
- Planning DB migrations describing design and closeout.

### 6.3 What is still missing

A valid handoff must consolidate all of the following in one top-level comment headed:

```markdown
## Iteration Handoff
```

Missing fields:

1. exact base SHA;
2. exact final head SHA;
3. branch and PR links;
4. Planning DB work item and design identity;
5. bounded iteration goal;
6. what changed;
7. how it was implemented;
8. why this design was chosen;
9. exact domain owner;
10. command/query rails reused;
11. ports reused or extended;
12. adapters touched;
13. contracts touched or deliberately unchanged;
14. migrations and files touched;
15. user-visible behavior;
16. tests observed failing before implementation;
17. tests passing after implementation;
18. exact workflow links for the final head;
19. direct live-browser or integration proof;
20. security posture;
21. data-integrity posture;
22. observability posture;
23. compatibility posture;
24. rollback posture;
25. unresolved risks;
26. deviations from the approved route;
27. recommended next iteration.

### 6.4 Why this remains a delivery blocker

The code can be correct while the iteration remains unauditable.

Without a consolidated handoff, the next agent cannot reliably distinguish:

- deliberate architecture from incidental implementation;
- tests actually executed from tests merely present;
- accepted residual gaps from forgotten work;
- product-owner decisions from automated-review speculation;
- current head evidence from evidence produced on an earlier commit;
- safe rollback from assumed reversibility.

This is not documentation ceremony. It is the operational boundary between implementation, independent review, correction, and the next claimed slice.

## 7. Claim-to-evidence matrix for PR #2040

| Claim | Status | Evidence | Review |
| --- | --- | --- | --- |
| PR base is exact current `main` | VERIFIED | PR metadata | Base SHA matches `8c098d6e...` |
| Final functional head is identified | VERIFIED | PR metadata | `6257745ed1...` |
| Canvas could overwrite accepted Project Code SQL | VERIFIED | pre-PR `canvasPlanAction.ts` | Revision was read and graph content then written unconditionally |
| Graph-owned SQL has deterministic integrity marker | VERIFIED | `dbtGraphModelSqlPublicationPolicy.ts` | Marker embeds SHA-256 of payload |
| Marker authenticates author or owner | CONTRADICTED | unkeyed digest semantics | Digest detects mismatch; it is not origin authentication |
| Final closeout uses integrity terminology | VERIFIED | migration 799 | Closeout says payload-integrity marker |
| Proposed graph SQL must carry a valid marker | VERIFIED | publication policy | Invalid proposed marker throws |
| Divergent unmarked SQL fails closed | VERIFIED | publication policy | Non-equal unmarked content returns `conflict` |
| Malformed managed marker fails closed | VERIFIED | publication policy | Prefix with invalid payload hash returns `conflict` |
| Byte-identical unmarked projection can be marked | VERIFIED | `adopt_legacy_equivalent` branch | Equality permits marker addition under graph-draft authority |
| Deployed legacy-artifact migration is required | DISPROVED | product-owner decision and repository state | DVT is pre-product with no preservation contract |
| All artifact reads complete before first write | VERIFIED | publisher implementation | `Promise.all` preflight completes before write loop |
| Expected revisions are reused from preflight | VERIFIED | prepared artifact model | No later revision read before save |
| Any model-SQL divergence stops all writes | VERIFIED | preflight conflict search | Publisher returns before write loop |
| Duplicate artifact paths are rejected | VERIFIED | publisher guard | Duplicate path throws before preflight |
| Graph-owned Project Code becomes read-only | VERIFIED | changed Code surface and Cypress scenario | Viewer shown; editor absent |
| File-authoritative DBT projects remain editable | VERIFIED | authority-posture scope in implementation/tests | Scope is explicitly preserved |
| External SQL edit remains byte-for-byte intact after rejected Preview | VERIFIED IN SOURCE / PARTIAL IN EXECUTION | Cypress scenario and PR validation claim | Test exists; direct run artifact is not linked |
| Six standard workflows pass on exact head | VERIFIED | GitHub workflow runs | All six conclude success |
| Local `pnpm verify:prepush` executed | PARTIAL | PR body claim | No direct command log linked |
| Protected live Cypress command executed | PARTIAL | PR body claim | No direct artifact/log linked |
| Tests were written or observed failing first | NOT PROVEN | no handoff chronology | Source alone cannot prove sequence |
| No duplicate public command/query rail was added | VERIFIED | changed files and design scope | Existing artifact/file rails are reused |
| Multi-file publication is atomic | CONTRADICTED | publisher write loop | Writes remain sequential |
| Preview and Run consume one exact project revision | NOT PROVEN | current contracts and controller | Exact whole-project identity is not bound end-to-end |
| Rollback is documented | NOT PROVEN | no handoff | Likely revertable, but not declared |
| Residual risks are declared | PARTIAL | Planning DB keeps atomic gap | Handoff still absent |
| Next iteration is bounded | PARTIAL | review guidance, not implementer handoff | Needs implementer acknowledgement |

## 8. Fowler-style review of PR #2040

### 8.1 Hidden authority — materially improved

Before PR #2040:

```text
graph SQL proposal
+ current workspace revision
→ overwrite workspace SQL
```

The revision check prevented a stale write relative to the read, but it did not answer whether the graph still had authority to replace the file.

PR #2040 introduces an explicit policy:

```text
active graph-draft authority
+ graph-managed path
+ valid managed marker or exact equivalent projection
→ replace through observed CAS revision

divergent or malformed file
→ conflict
→ zero writes
```

That is a material authority improvement.

### 8.2 Responsibility overload — contained, not eliminated

The new code separates:

- model-SQL classification;
- workspace artifact publication;
- Project Code edit posture;
- editor-versus-viewer rendering.

This is better than keeping all policy inside `canvasPlanAction.ts` or `CodeView.tsx`.

The remaining publisher still owns:

- complete preflight;
- divergence mapping;
- sequential write orchestration;
- list of written paths.

The next slice should move final multi-file mutation to the server-owned batch boundary instead of making this browser publisher a compensating transaction manager.

### 8.3 Leaky abstraction — active at the transaction boundary

Web knows:

- every artifact path;
- every content body;
- every expected revision;
- write ordering;
- per-file save results.

That is acceptable for proposal construction and UI conflict display.

It is not the correct owner for atomic commit semantics.

Atomicity belongs to Project Workspace I/O behind `IWorkspaceFileBatchMutationPort`.

### 8.4 Primitive obsession — residual

The SQL marker is a string protocol embedded in file content.

It is acceptable as a narrow containment mechanism because:

- graph-draft authority is separately known;
- the path is separately known;
- the marker is deterministic;
- invalid markers fail closed;
- the marker is not treated as a security credential.

It must not become:

- a user-facing DSL;
- a general artifact-version framework;
- an authentication mechanism;
- the identity of the whole project;
- a substitute for a publication receipt.

### 8.5 Shotgun surgery — moderate

The iteration touches 24 files, including:

- runtime policy;
- publisher;
- Canvas action;
- Code surfaces;
- copy;
- unit tests;
- presentation tests;
- architecture tests;
- live Cypress;
- three Planning DB migrations.

The breadth is explainable because the user transaction crosses Canvas, workspace files, Project Code, and live proof.

The governance amplification is still high: three migrations and substantial Planning DB closeout for one contained product rule.

This is not currently a merge blocker, but future slices should avoid duplicating the same invariant across many textual rows when one canonical design plus generated projections can carry it.

### 8.6 Test-only confidence — reduced but not closed

Strong points:

- pure classifier tests;
- publisher negative tests;
- Canvas integration tests;
- Code presentation and architecture tests;
- protected live Cypress flow;
- exact-head standard CI green.

Remaining confidence gap:

- the live command is claimed but no direct artifact or log is linked;
- the red-before-green chronology is absent;
- atomicity is explicitly not proven.

### 8.7 Product dead-end check

PR #2040 does not create a dead end.

It preserves the accepted direction:

- graph-draft remains authoritative before adoption;
- dbt-project-files remains authoritative for imported/opened projects;
- Project Code does not become a hidden second editor for graph-owned SQL;
- file-authoritative projects remain editable;
- the next transaction can reuse the existing batch authority.

## 9. Previous findings disposition

### 9.1 Fixed

#### PR #2030 reconciliation receipt truth

Status:

```text
FIXED
```

Do not reopen.

The pending receipt remains authoritative across edit/revert interleavings, and older reconciliation results cannot erase newer persistence state.

#### PR #2035 run operational truth

Status:

```text
FIXED FOR LIST/DETAIL PROJECTION
```

List and detail use a shared operational-truth projection, and non-terminal materialization is sanitized centrally.

#### Release 0.5.3

Status:

```text
FIXED / PUBLISHED
```

Release head passed six standard workflows and merged to current `main`.

#### Legacy migration obligation for PR #2040

Status:

```text
DISPROVED
```

There is no supported deployed pre-marker data population.

### 9.2 Verified on branch but not merged

#### DBT model SQL authority containment

Status:

```text
IMPLEMENTED ON PR #2040
NOT YET IN MAIN
```

The functionality is credible, exact-head CI is green, and no inline thread remains open.

The missing handoff prevents delivery closeout under the agreed process.

### 9.3 Still active

#### Atomic DBT artifact publication

Severity:

```text
P1 integrity
```

Current main writes artifacts sequentially.

PR #2040 improves preflight but also writes prepared artifacts sequentially.

A later conflict or filesystem failure can leave a partial project.

#### Exact project revision identity

Severity:

```text
P1 reproducibility and stale-truth risk
```

The file-backed controller accepts a `WorkspaceFileSaveReceipt` but ignores it and refetches the latest graph projection.

That can describe a different whole-project snapshot after another file changes.

#### Workspace inventory truth

Severity:

```text
P1 product completeness
```

The local repository:

- silently stops after 500 listed files;
- has no cursor;
- has no `complete | partial` state;
- treats files over 1 MB as `InvalidWorkspacePathError`.

#### Scoped run pagination

Severity:

```text
P2 operational integrity
```

`ListRuns` applies tenant limit first, then filters project and environment in memory.

It can return a false empty final page while authorized runs exist later.

The result exposes `nextCursor`, but the query cannot accept a cursor.

The Postgres adapter orders by `created_at` but does not select or hydrate it, and has no deterministic `run_id` tie-breaker.

#### Runtime HTTP response validation

Severity:

```text
P2 boundary integrity
```

The generic Web API client returns parsed JSON through `as TResponse`.

Typed TypeScript callers therefore trust unvalidated external data.

#### Durable editor recovery

Severity:

```text
P2 recovery
```

Navigation flush and `beforeunload` warning reduce loss during orderly navigation.

They do not restore buffers after:

- browser crash;
- OS crash;
- power loss;
- process termination;
- storage/network outage before persistence.

#### Product-wide nonfunctional gates

Severity:

```text
P2 maturity
```

Root `ci:full` has an explicit coverage ratchet only for Engine.

No equivalent root gate is visible for:

- Web coverage;
- API coverage;
- accessibility;
- bundle budget;
- large-graph performance;
- browser memory;
- endpoint latency and payload budgets.

## 10. Current architecture and product assessment

### 10.1 Product authority

Direction:

```text
SOUND
```

ADR-0060 correctly requires exactly one authoring authority:

```text
graph-draft
or
dbt-project-files
```

PR #2040 closes one important shadow-authority path.

Remaining work is transactional, not conceptual.

### 10.2 Contracts

Strengths:

- versioned authority binding;
- deterministic DBT project projection;
- file content SHA revisions;
- CAS write inputs;
- batch mutation and receipt types;
- typed conflict vocabulary;
- explicit projection freshness and analysis identities.

Gaps:

- batch receipt does not yet become the end-to-end project revision consumed by Preview and Run;
- generic Web transport does not validate response schemas at runtime;
- workspace inventory result cannot express partial traversal;
- `ListRuns` cursor is not a typed/versioned contract.

### 10.3 Web

Strengths:

- contextual Canvas and Code surfaces;
- explicit graph-owned read-only posture;
- separated working-tree reconciliation;
- authority-aware file-backed Canvas;
- strong unit, presentation, architecture, and Cypress suites.

Gaps:

- browser still orchestrates sequential cross-file publication;
- exact project revision is not retained through save/reconcile/Preview/Run;
- no durable local buffer journal;
- nonfunctional budgets are not release gates.

### 10.4 API

Strengths:

- protected runtime routes;
- scope-aware commands and queries;
- application services separated from adapters;
- explicit workspace storage scope;
- existing atomic batch mutation gateway;
- run operational truth has shared projection.

Gaps:

- atomic graph publication is not routed through the batch port;
- scoped run pagination is expressed too weakly at the store port;
- some new HTTP response consumers can still rely on generic casts.

### 10.5 Runtime and Temporal

Strengths:

- durable workflow execution;
- idempotency and event identity;
- run-state persistence;
- provider-neutral contracts;
- explicit execution evidence.

Gaps relevant to this slice:

- execution reproducibility is weaker than runtime durability if Preview and Run are not tied to one immutable project content-set;
- durable orchestration cannot compensate for ambiguous input revision.

### 10.6 Governance

Strengths:

- DB-first design and component ownership;
- architecture tests;
- negative tests;
- exact-head CI;
- release integrity controls;
- feature-mechanization gates.

Risks:

- Planning DB rows can declare an iteration implemented before independent delivery handoff;
- large governance migrations amplify narrow code changes;
- point-in-time review PRs create noise if not closed as superseded;
- automated comments can become false authority unless checked against product state.

### 10.7 Operability

Strengths:

- typed conflicts;
- localized user feedback;
- run status truth;
- exact conflicting path from DBT publication preflight;
- durable workflow execution and provider evidence.

Gaps:

- no one project-publication receipt connects files, analysis, Preview, and Run;
- workspace inventory can claim completeness falsely;
- run pagination can claim exhaustion falsely;
- browser crash recovery is incomplete.

### 10.8 Accessibility

Evidence found:

- existing component and presentation test structure;
- no new accessibility regression demonstrated in PR #2040.

Gap:

- no root release gate proving keyboard, screen-reader, focus, and contrast behavior for the full Canvas/Code authoring transaction.

### 10.9 Performance

Strengths:

- DBT artifact preflight reads files concurrently;
- run status reads are bounded to eight concurrent operations;
- filesystem batch limits are explicit.

Gaps:

- workspace listing recursively walks and then silently truncates;
- no visible root budget for large graphs;
- no visible bundle-size ratchet;
- sequential writes add latency and partial-failure surface.

### 10.10 Security

Strengths:

- workspace paths are scoped and validated;
- writes use CAS;
- unknown/divergent SQL fails closed;
- graph-owned files are not editable through Project Code;
- DBT credentials and private outputs are excluded by accepted architecture;
- CodeQL and dependency review are green.

Clarification:

- the SQL marker is an integrity marker, not authentication;
- an actor with authority to rewrite both payload and marker is not stopped by SHA-256;
- durable ownership comes from authority binding, scope, CAS, and eventually project publication identity.

No need to add signing keys or secrets to PR #2040.

## 11. Mature-system comparison

### 11.1 dbt Studio — MATCH the file workflow

dbt Studio presents one interface for building, testing, running, and version-controlling normal dbt projects.

DVT should match:

- normal dbt files as the durable file-authoritative representation;
- explicit diagnostics;
- build/test/run flow;
- visible version-control posture.

DVT should differ:

- keep Canvas as a governed visual projection;
- preserve code-only constructs;
- avoid inventing another user-facing language.

DVT should defer:

- broad collaboration and managed-cloud polish until authority and revision identity are complete.

### 11.2 Airflow DAG Bundles — MATCH exact execution revision

Airflow DAG Bundles version the collection of files a DAG needs and allow a run to use the same code for the whole run even if files change midway.

DVT should match:

```text
one complete project revision
→ one Preview
→ one Run
→ reproducible rerun
```

DVT currently cannot prove this for DBT graph publication.

### 11.3 Prefect deployment versions — MATCH promotion and rollback later

Prefect records deployment-version history and can pin exact Git commits or image digests.

DVT should match now:

- immutable project content-set identity;
- exact analysis identity;
- exact Preview/Run provenance.

DVT should defer:

- promotion, rollback UI, and environment history until the base revision object exists.

### 11.4 Dagster — DEFER richer asset differentiation

Dagster's asset model, lineage, checks, and observability are a useful later direction.

They are not prerequisites for:

- authority containment;
- atomic publication;
- exact revision identity;
- honest workspace inventory.

### 11.5 Temporal — MATCH durable identity principles, not product shape

Temporal guarantees that workflows resume after failures.

DVT should adopt the principles:

- durable identifiers;
- idempotency;
- correlated receipts;
- deterministic recovery.

DVT should not put a workflow engine inside the editor or make every UI transition a Temporal workflow.

### 11.6 NiFi — DIFFERENTIATE through Git rather than a proprietary registry

NiFi provides useful visual flow versioning concepts.

NiFi Registry is deprecated in favor of Git-based Flow Registry Clients.

DVT should not create a proprietary parallel project registry.

Git should remain:

- history;
- transport;
- collaboration;
- promotion boundary.

The working tree and project-publication receipt should remain distinct from staging, commit, push, and remote synchronization.

### 11.7 Professional IDE and Git workflows — MATCH explicit states

Professional IDEs distinguish:

- modified buffer;
- saved working tree;
- diagnostics;
- staged changes;
- commit;
- branch;
- synchronization;
- conflict.

DVT must not label byte persistence, semantic freshness, Git state, and execution readiness as one generic “synchronized” state.

## 12. Corrective instruction for the implementation agent

### 12.1 Blocking correction

There is no newly demonstrated runtime correction for PR #2040.

The blocking correction is delivery-only:

```text
Publish the complete Iteration Handoff.
```

### 12.2 Required handoff content

The comment must:

- begin with `## Iteration Handoff`;
- identify exact base and final head;
- link branch and PR;
- name `E-WEB-DBT-MODEL-SQL-AUTHORITY-1`;
- explain the user transaction;
- explain why marker + preflight + read-only posture was chosen;
- list every owner, rail, port, adapter, contract, migration, and touched file;
- distinguish red tests from tests added directly green;
- link all final-head workflows;
- link or attach the protected Cypress proof;
- explain integrity but not claim authentication;
- state pre-product compatibility explicitly;
- state rollback by reverting the single commit;
- list residual atomicity and exact-revision risks;
- declare no new public rail;
- recommend the atomic-publication slice next.

### 12.3 Acceptance criteria for PR #2040 delivery closeout

- exact final head is named;
- six workflows are green on that head;
- no unresolved inline thread exists;
- protected browser proof is directly linked;
- divergent external SQL remains byte-identical after rejected Preview;
- graph-owned Project Code remains read-only;
- file-authoritative Project Code remains editable;
- no legacy migration obligation is claimed;
- marker is described as integrity, not authentication;
- atomic publication is explicitly left open;
- one complete handoff is published.

## 13. Next implementation slice

### 13.1 Product transaction

After PR #2040 closes:

```text
build complete DBT artifact proposal
→ capture expected revisions for all paths
→ submit one idempotent batch mutation
→ receive one immutable publication receipt
→ compute or return exact projectContentSetSha256
→ analyze exactly that content-set
→ return exact analysisSha256
→ persist Preview provenance
→ StartRun accepts the same revision only
→ reopen reproduces the same project revision
```

### 13.2 Domain owner

Primary owner:

```text
Project Workspace Publication / dbt Project Revision
```

Canonical Planning DB work:

```text
E-WEB-DBT-ATOMIC-PUBLICATION-1
```

Collaborating owners:

- Canvas graph artifact projection;
- Project Workspace I/O;
- dbt Project Analysis;
- Execution Preview;
- Run Readiness / Start Run;
- Contracts.

### 13.3 Existing semantics to reuse

Do not create a parallel persistence concept.

Reuse:

- `GenerateDbtWorkspaceArtifacts`;
- `WorkspaceFileBatchMutation`;
- `WorkspaceFileBatchReceipt`;
- `IWorkspaceFileBatchMutationPort`;
- `LocalWorkspaceFileBatchMutationGateway`;
- `ProjectDbtGraphFromFiles`;
- `DbtProjectGraphProjection`;
- `PreviewExecutionPlan`;
- `StartRun`;
- existing authority binding;
- existing project content-set and analysis hashes.

### 13.4 Command/query route

Preferred route:

- keep `GenerateDbtWorkspaceArtifacts` as proposal construction;
- extend the existing Preview application path with a server-owned publication service;
- call `IWorkspaceFileBatchMutationPort.apply` exactly once;
- analyze the resulting exact content-set through the existing DBT project query/service;
- bind the returned identities into the existing Preview receipt/provenance;
- make `StartRun` validate or consume that Preview identity.

Do not add:

- browser rollback loop;
- per-file “atomic” retries;
- another workspace repository;
- a second batch contract;
- a public `SaveDbtProject` command;
- a new DSL;
- a graph sidecar as a second authority.

### 13.5 Proposed internal result shape

Use existing value objects where possible.

An internal result can project:

```ts
type PublishedDbtProjectRevision = Readonly<{
  batchReceipt: WorkspaceFileBatchReceipt;
  projectContentSetSha256: string;
  analysisSha256: string;
  projectRoot: string;
}>;
```

This is not a second persistence authority.

It is a correlated result assembled from:

- existing batch receipt;
- existing project analysis identity;
- existing project root.

Before introducing it, verify Planning DB does not already define an equivalent named object.

### 13.6 Likely implementation surfaces

API / application:

- existing workspace batch mutation route or application service;
- DBT project analysis application service;
- Preview application service;
- run-readiness or StartRun validation.

Web:

- graph artifact publisher;
- Canvas Preview action;
- conflict presentation;
- Preview/Run provenance projection.

Contracts:

- only if existing Preview/provenance contracts cannot carry the batch and project identities;
- extend existing versioned contract instead of adding route-local shapes.

Tests:

- workspace batch gateway tests;
- API application tests;
- protected HTTP tests;
- Web integration tests;
- protected Cypress Canvas/Code/Run vertical;
- architecture guards;
- Planning DB evidence.

### 13.7 Red tests

#### Atomic conflict

```text
expected revisions captured
→ second path changed concurrently
→ batch returns conflict
→ no file changes
→ no Preview persisted
```

#### Atomic filesystem failure

```text
replacement fails after staging
→ all originals remain
→ receipt is not published as applied
```

#### Idempotent retry

```text
same idempotency key + same request
→ same receipt
→ deduplicated = true
```

#### Idempotency misuse

```text
same key + different request
→ explicit idempotency conflict
→ no file changes
```

#### Exact analysis identity

```text
publication content-set A
→ unrelated file mutation creates content-set B
→ analysis for A cannot be reported as analysis for B
```

#### Preview revision gate

```text
Preview stored for revision A
→ project becomes revision B
→ StartRun rejects A or requires explicit re-preview
```

#### Reopen

```text
publication receipt
→ reopen project
→ same projectContentSetSha256
→ same analysisSha256 for deterministic input
```

#### Security and privacy

```text
publication logs
→ paths and hashes allowed
→ SQL bodies and credentials absent
```

### 13.8 Green proof

Required:

- contracts tests;
- API unit and integration tests;
- workspace batch adapter tests;
- Web unit, presentation, and architecture tests;
- protected Canvas → Preview → Run Cypress flow;
- conflict and failure-injection proof;
- Planning DB integrity and feature mechanization;
- all six GitHub workflows on the final head.

### 13.9 Compatibility and migration

DVT is pre-product.

No migration is required for unreleased development fixtures.

The new slice may reset or recreate local test workspaces.

Only merged contract shapes need repository-internal compatibility consideration.

### 13.10 Rollback

Preferred rollback:

- revert the product PR;
- preserve existing batch receipts and file contents;
- do not publish a receipt until atomic replacement succeeds;
- avoid schema changes that make rollback dependent on data migration.

### 13.11 Observability

Record without exposing SQL:

- publication idempotency key hash;
- request hash;
- paths affected;
- conflict paths;
- deduplicated flag;
- project content-set hash;
- analysis hash;
- Preview identity;
- Run identity;
- failure category and elapsed time.

Do not log:

- SQL bodies;
- credentials;
- profiles;
- secrets;
- environment-variable values;
- private package content.

### 13.12 Security

Requirements:

- authorize workspace scope before mutation;
- validate every path server-side;
- enforce batch file and byte limits;
- use CAS for every expected path;
- reject unknown deletions or writes;
- keep secrets out of project bundles;
- treat hashes as integrity/provenance, not authentication;
- avoid exposing absolute filesystem paths.

### 13.13 Acceptance criteria

The slice is complete only when:

1. graph Preview makes exactly one batch mutation call;
2. no partial project is observable after conflict or injected failure;
3. one immutable receipt identifies the publication;
4. exact project content-set and analysis hashes are returned;
5. Preview persists those identities;
6. Run consumes or validates the same identities;
7. changes after Preview force re-preview or explicit rejection;
8. reopen reproduces the exact project revision;
9. logs contain no SQL or credentials;
10. Planning DB marks the existing atomic-publication task implemented only after live proof;
11. the implementation agent publishes a complete handoff.

## 14. Following slices

### 14.1 Workspace capability truth

After atomic revision identity:

- paginated inventory;
- opaque cursor;
- `complete | partial`;
- explicit effective limits;
- typed `oversized`, `not_found`, and `unsupported`;
- consistent import/analyzer/Explorer/Code semantics.

### 14.2 Cohesive authoring recovery

After inventory truth:

- durable draft journal;
- startup recovery;
- receipt correlation;
- clear ownership between buffer, working tree, analysis, Preview, and Git;
- bounded cleanup and privacy policy.

### 14.3 Product-wide quality gates

Then:

- Web/API coverage ratchets;
- accessibility automation and keyboard proof;
- bundle budget;
- large-graph latency and memory;
- API latency/payload budgets;
- fault injection;
- exact-main release evidence;
- generated current-status truth.

### 14.4 Later differentiation

Only after foundations:

- richer assets and lineage;
- checks and freshness;
- promotion and rollback UI;
- collaboration;
- environment comparison;
- governed visual edits for additional DBT constructs.

## 15. Required handoff template for the next agent

```markdown
## Iteration Handoff

### Identity
- Base SHA:
- Final head SHA:
- Branch:
- PR:
- Planning DB task:
- Architecture design:

### Goal
- User transaction:
- Explicit out of scope:

### What changed
- Product behavior:
- Runtime behavior:
- Contracts:
- Planning DB:

### How it was implemented
- Domain owner:
- Commands:
- Queries:
- Ports:
- Adapters:
- Contracts:
- Files:
- Migrations:

### Why this design
- Existing semantics reused:
- Alternatives rejected:
- Fowler risks addressed:

### Red/green chronology
- Red test:
- Observed failure:
- Green change:
- Passing evidence:

### Validation
- Unit:
- Integration:
- Architecture:
- Cypress/live:
- CI exact-head links:

### Safety
- Authorization:
- Data integrity:
- Security:
- Sensitive logging:
- Limits:
- Observability:

### Compatibility and rollback
- Supported persisted state:
- Migration:
- Rollback:
- Failure recovery:

### Residual risks
- Open gaps:
- Deferred work:
- Deviations from approved route:

### Next iteration
- Recommended slice:
- Why:
- Required first red test:
```

## 16. Final verdict

No material repository change occurred.

No new defect should be fabricated.

PR #2040 remains:

```text
functionally credible
exact-head CI green
no unresolved inline thread
not yet delivery-auditable
```

The implementation agent must publish the handoff.

After normal closeout, the next branch must implement atomic multi-file publication and exact project-revision identity through the existing server-owned batch mutation authority.

Do not divert into:

- another release-governance expansion;
- legacy migration;
- generic authoring framework;
- new DSL;
- alternate workspace repository;
- asset/lineage differentiation before revision integrity.
