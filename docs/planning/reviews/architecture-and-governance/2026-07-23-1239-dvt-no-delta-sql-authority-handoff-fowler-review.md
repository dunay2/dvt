---
title: DVT No-Delta SQL Authority Delivery Handoff Fowler Review
status: Review
reviewed_repository: dunay2/dvt
reviewed_main_sha: 8c098d6e35ce874efae81609814d99e8e60091f7
reviewed_at: 2026-07-23T12:39:00+02:00
review_type: architecture-and-governance-delta
scope: documentation-only
---

# DVT No-Delta SQL Authority Delivery Handoff Fowler Review

## 1. Executive decision

There is **no material repository or product delta** since the previous review cycle.

Exact reviewed `main`:

- [`8c098d6e35ce874efae81609814d99e8e60091f7`](https://github.com/dunay2/dvt/commit/8c098d6e35ce874efae81609814d99e8e60091f7)
- commit: `chore(main): Release 0.5.3 (#2037)`

The active product pull request remains:

- [PR #2040 — `fix(web): Prevent graph preview from overwriting DBT model SQL`](https://github.com/dunay2/dvt/pull/2040)
- base: `main@8c098d6e35ce874efae81609814d99e8e60091f7`
- head: `6257745ed1ec91f1a1415585d24e319905966931`
- state: open, ready for review, mergeable
- commits: 1
- changed files: 24
- additions/deletions: `+2766 / -57`

PR #2040 has not changed since the previous review. Its six standard workflows remain green and its only inline review thread remains resolved.

The implementation is still functionally credible. No new source-backed runtime blocker is found in this cycle.

The delivery state remains:

```text
DELIVERY-HANDOFF-MISSING
```

The missing consolidated `## Iteration Handoff` is the only demonstrated closeout blocker for PR #2040.

After that handoff and merge, the next product slice remains the existing atomic multi-file publication and exact project-revision task. Do not open another release, governance, compatibility, generic framework, or lateral operability slice before that transaction begins.

---

## 2. Evidence scope and trust posture

This review inspected:

- exact current `main`;
- recent commits;
- every open pull request visible in the repository;
- exact-head workflow results;
- open and resolved review threads;
- PR #2040 metadata, source files, tests, Planning DB migrations, and live-flow claims;
- current accepted architecture authority documents;
- current source for the next known product gaps;
- current release state;
- branch-level delivery evidence.

This review did **not** execute the repository locally, run a browser, run migrations, or rerun CI. Existing GitHub workflow results and repository evidence are treated as observed evidence, not as locally reproduced proof.

Claims are classified as:

- `VERIFIED`: directly supported by current repository or CI evidence;
- `PARTIAL`: supported, but the full claimed behavior or provenance is not directly auditable;
- `CONTRADICTED`: current evidence disproves the claim;
- `NOT PROVEN`: no sufficient current evidence exists.

---

## 3. Current repository state

### 3.1 Main branch

Current `main` has not advanced beyond release `0.5.3`.

Recent product commits remain:

1. `8c098d6e` — release `0.5.3`;
2. `9bc34457` — unified run operational truth;
3. `591a1ecd` — release `0.5.2`;
4. `8a39d19e` — pending reconciliation receipt truth.

No newer commit exists on `main`.

The connector exposes no workflow run or combined status directly attached to the final release squash SHA. Exact-head green evidence is available on the pull-request heads that produced the merged changes.

### 3.2 Open pull requests

Two pull requests are open before this review branch is published:

#### PR #2040 — functional product work

- title: `fix(web): Prevent graph preview from overwriting DBT model SQL`
- head: `6257745ed1ec91f1a1415585d24e319905966931`
- mergeable: true
- draft: false
- one commit
- 24 files
- six standard workflows successful
- one resolved review thread
- no complete iteration handoff

#### PR #2046 — previous documentation review

- title: `docs(review): Add 20260723 0842 DVT Fowler review`
- head: `dc128271e811b9c2589bf424d4e4eeeb23443c79`
- draft: true
- mergeable: true
- documentation-only
- PR Quality Gate: successful
- Code Quality: successful
- product-heavy lanes: correctly skipped

PR #2046 should be closed after this report is published so only one current point-in-time review remains open. It must not be merged as parallel operational authority.

### 3.3 Release state

The latest release state remains `0.5.3`.

No new release pull request or release commit is present.

There is no release work that should interrupt the current product route.

---

## 4. Implementation handoff status

### 4.1 Result

```text
DELIVERY-HANDOFF-MISSING
```

The PR body for #2040 is useful but does not satisfy the required iteration-handoff contract.

It states:

- root cause;
- high-level changes;
- validation commands;
- that no checks or runtime paths were bypassed.

It does not consolidate all required delivery facts into one auditable report.

### 4.2 Missing fields

The following remain missing or incomplete in a single `## Iteration Handoff`:

1. exact base SHA and final head SHA;
2. branch and PR links;
3. bounded iteration goal;
4. what changed;
5. how the implementation works;
6. why the design was selected;
7. exact DDD owners;
8. command/query rails reused;
9. ports reused or changed;
10. adapters reused or changed;
11. contracts reused or changed;
12. migrations and files touched;
13. user-visible behavior;
14. tests observed failing before the implementation;
15. tests passing on the final implementation;
16. direct links to exact-head CI;
17. direct path/link to protected live proof;
18. security posture;
19. data-integrity posture;
20. observability posture;
21. compatibility decision;
22. rollback posture;
23. residual risks;
24. deviations from the approved route;
25. recommended next bounded iteration.

### 4.3 Why this matters

The code can be reconstructed from the diff, but reconstruction is not the same as a delivery handoff.

Without the handoff:

- later agents must infer architectural intent from implementation details;
- red/green chronology is lost;
- CI and live proof are not linked to the exact claim they support;
- residual risks can be mistaken for closed scope;
- the next agent can expand scope instead of continuing the intended transaction;
- Planning DB closeout can be treated as sufficient even when the delivery narrative is incomplete.

This is a governance and auditability defect, not evidence that the runtime implementation is wrong.

---

## 5. Claim-to-evidence matrix for PR #2040

| Claim | Status | Evidence | Review conclusion |
| --- | --- | --- | --- |
| PR identity, base, head, and branch | VERIFIED | GitHub PR metadata | Exact identity is stable. |
| Canvas Preview previously could overwrite Project Code SQL | VERIFIED | PR root cause plus current `main` flow | The previous graph-first publication path regenerated SQL after reading current revisions. |
| Graph-managed SQL has a deterministic content marker | VERIFIED | `dbtGraphModelSqlPublicationPolicy.ts` | Marker contains SHA-256 of the exact payload. |
| Marker verifies payload integrity | VERIFIED | parser recomputes payload digest | It detects mismatch; it does not authenticate origin. |
| Marker authenticates creator or ownership | CONTRADICTED | unkeyed digest stored with payload | Correctly rejected by branch Planning DB wording; no signature or MAC exists. |
| All artifacts are read before the first write | VERIFIED | `dbtGraphWorkspaceArtifactPublisher.ts` preflight | `Promise.all` completes preflight before publication loop. |
| Expected revisions are bound once | VERIFIED | prepared artifact retains observed revision | Later reads do not redefine CAS expectations. |
| Divergent unmarked SQL fails closed | VERIFIED | classification returns `conflict` unless byte-identical | External divergent bytes are preserved. |
| Corrupt managed marker fails closed | VERIFIED | invalid marker returns `conflict` | No overwrite is permitted. |
| Byte-identical unmarked graph projection can be marked | VERIFIED | `adopt_legacy_equivalent` branch | Safe in current graph-draft path; naming is misleading but behavior is not a demonstrated blocker. |
| Deployed legacy compatibility is required | CONTRADICTED | product owner decision and no supported deployed artifact contract | No migration/version-negotiation requirement applies. |
| Graph-owned files are read-only in Project Code | VERIFIED | Code posture changes and tests | File-authoritative projects remain editable. |
| External SQL remains byte-for-byte unchanged after rejected Preview | VERIFIED | protected Cypress flow path and test assertions | Existing repository evidence supports this path. |
| Publication is atomic across all files | CONTRADICTED | final `for` loop calls `saveFileContent` sequentially | Preflight is global; commit is still per-file. |
| Exact project revision is bound to Preview and Run | NOT PROVEN | no server-owned publication receipt identity in this PR | Assigned to next atomic-publication slice. |
| Six standard workflows pass on exact head | VERIFIED | workflow runs for `6257745e` | All six complete successfully. |
| Tests were observed first in red | NOT PROVEN | no handoff chronology | Tests exist and pass, but TDD chronology is not recorded. |
| Rollback is documented | NOT PROVEN | no consolidated handoff | Runtime rollback is not described. |
| Residual risks are documented | PARTIAL | Planning DB retains atomic-publication gap | Not consolidated for delivery. |
| Complete implementation handoff exists | NOT PROVEN | PR comments/body | Required report is absent. |

---

## 6. Material delta from the previous review

### 6.1 Repository delta

None.

- `main` unchanged;
- PR #2040 head unchanged;
- PR #2040 diff unchanged;
- workflow conclusions unchanged;
- review-thread state unchanged;
- no new implementation handoff;
- no new release work;
- no new functional branch visible.

### 6.2 Review delta

None that changes the implementation decision.

The current disposition remains:

- the pre-marker upgrade requirement is `DISPROVED`;
- byte-identical marking in graph-draft mode is not a demonstrated runtime blocker;
- the word `legacy` remains non-blocking naming debt;
- the only closeout blocker is the missing handoff;
- the next product priority remains atomic publication plus exact revision identity.

No new defect is manufactured in this report.

---

## 7. Fowler review of PR #2040

### 7.1 Fixed: hidden SQL authority overwrite

The branch directly addresses the active hidden-authority defect:

```text
Project Code edit
→ current revision accepted
→ Canvas Preview regenerates stale graph SQL
→ accepted external edit overwritten
```

The branch introduces explicit classification before publication and makes divergent SQL a conflict.

This is a real improvement:

- graph-draft authority is explicit;
- external divergence is visible;
- Project Code does not misleadingly expose graph-owned SQL as editable;
- CAS revision is observed during preflight and retained;
- the protected flow verifies preservation.

Status: `FIXED IN PR`, not fixed on `main` until merged.

### 7.2 Disproved: historical artifact migration requirement

No supported deployed product dataset or artifact compatibility contract exists.

The repository is pre-product. Development workspaces and unreleased artifact shapes are disposable unless explicitly promoted to supported state.

Therefore this is not required:

- migration of pre-marker files;
- artifact version negotiation;
- historical graph-output matching;
- preservation tests for branch-only formats;
- compatibility adapters for nonexistent users.

Status: `DISPROVED`.

### 7.3 Non-blocking naming debt: `adopt_legacy_equivalent`

The name implies a supported legacy population that does not exist.

The behavior itself occurs only when:

- the active path is graph-draft publication;
- the path is generated by DVT;
- the current bytes equal the exact current graph payload;
- CAS uses the observed revision;
- any divergent content becomes conflict.

This is equivalent-projection marking, not a deployed-data migration.

Recommended rename:

```ts
mark_equivalent_unmarked_projection
```

Status: `FOLLOW-UP / NON-BLOCKING`.

Do not delay the product transaction solely for the name.

### 7.4 Active: sequential multi-file publication

The publisher performs a complete preflight, then executes writes individually:

```text
preflight all files
→ save file A
→ save file B
→ save file C
```

If file B conflicts after file A is saved, file A remains changed.

This is the next P1 integrity gap.

It is not a reason to expand PR #2040. It is the next bounded vertical.

### 7.5 Active: exact project-revision ambiguity

The current file reconciliation callback receives a `WorkspaceFileSaveReceipt`, names it `_receipt`, and refetches the latest project graph.

That proves only:

```text
some project state was analyzed after a save
```

It does not prove:

```text
this exact save + this exact complete project content set
→ this exact analysis
→ this Preview
→ this Run
```

This remains part of `E-WEB-DBT-ATOMIC-PUBLICATION-1`.

### 7.6 Active: ListRuns pagination integrity

`ListRunsUseCase`:

- asks the store for a tenant-limited page;
- filters project/environment after the limit;
- returns a cursor that the query cannot accept;
- serializes the cursor as an ambiguous primitive string.

This can hide authorized runs and claim false exhaustion.

The defect remains active but must not displace the current dbt product sequence unless it becomes an immediate release blocker.

### 7.7 Active: workspace capability truth

The local workspace repository:

- silently stops after 500 listed files;
- does not expose `complete | partial` inventory state;
- has no cursor;
- reports files over 1 MB as `InvalidWorkspacePathError`;
- uses the same invalid-path semantic for oversized reads and writes.

This remains the next priority after atomic publication and exact revision identity.

### 7.8 Active: HTTP runtime validation

Generic Web HTTP handling still trusts parsed JSON through a TypeScript assertion rather than a runtime contract check.

New revision/publication/inventory responses must be schema-validated at the HTTP boundary.

Do not create another local contract. Reuse shared contracts and parsers.

### 7.9 Active: durable recovery

Navigation flush and `beforeunload` warning protect planned transitions, not crashes.

There is no durable browser-side journal for restoring an unsynchronized buffer after:

- browser crash;
- process termination;
- system shutdown;
- power loss.

This remains after workspace capability truth.

### 7.10 Active: quality, accessibility, performance, and current-state truth

The repository has strong architecture and functional gates, but remaining product-level evidence still includes:

- no equivalent root coverage ratchet clearly demonstrated for Web/API alongside Engine;
- no current root accessibility acceptance gate demonstrated;
- no explicit bundle budget demonstrated;
- no large-graph performance gate demonstrated;
- no generated current-delivery-state document replacing stale manual status truth.

These are product-wide gates after the core authoring transaction is coherent.

---

## 8. Current architecture authority decision

The authoritative sources remain:

1. live Planning DB task/design/dependency state;
2. [`ADR-0060: dbt Project Authoring Authority`](https://github.com/dunay2/dvt/blob/8c098d6e35ce874efae81609814d99e8e60091f7/docs/adr/ADR-0060-dbt-project-authoring-authority.md);
3. the accepted [`dbt Project Round-Trip` plan](https://github.com/dunay2/dvt/blob/8c098d6e35ce874efae81609814d99e8e60091f7/docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md);
4. current code, tests, migrations, and CI evidence.

Unmerged review Markdown is not operational authority.

The product order remains:

1. model SQL authority;
2. atomic project publication and exact revision identity;
3. workspace capability truth;
4. cohesive authoring recovery;
5. product-wide quality gates;
6. later differentiation.

PR #2040 is the current implementation of item 1.

No legitimate Planning DB authority change was found that changes this sequence.

---

## 9. Required correction for the implementation agent

### 9.1 Blocking correction: publish the handoff

No runtime code change is required by this cycle.

Before merge, add one top-level PR comment with the exact heading:

```markdown
## Iteration Handoff
```

It must contain the following sections.

#### Identity

- exact base SHA;
- exact final head SHA;
- branch;
- PR link;
- Planning DB task/design identifiers.

#### Goal

State the user transaction closed by the iteration:

```text
Graph-owned SQL
→ Project Code read-only posture
→ external divergence
→ rejected Preview
→ external bytes preserved
```

#### What changed

List behavior and files, not only themes.

#### How it works

Explain:

- marker creation and validation;
- classification decisions;
- complete preflight;
- retained expected revisions;
- conflict handling;
- Code read-only posture;
- localized user feedback;
- live proof path.

#### Why this design

Explain why the implementation:

- keeps graph-draft as the active authority;
- does not infer file-backed authority;
- does not add a new rail;
- fails closed on divergence;
- defers multi-file atomicity to the existing task.

#### Owners and boundaries

Name exact owners and reused rails/ports/contracts.

At minimum include:

- Canvas Authoring;
- Project Workspace I/O;
- `GenerateDbtWorkspaceArtifacts`;
- `SaveWorkspaceFileContent`;
- workspace file query/command ports;
- `WorkspaceGraphAuthoringDraft.v1`;
- `CanvasAuthoringAuthorityBinding.v1` where relevant;
- Planning DB component IDs and design/task IDs.

#### Files and migrations

List all 24 paths or link to the changed-file view and group them by responsibility.

#### Red/green chronology

State which exact tests failed before the implementation and which passed after it.

Do not claim tests were written first unless that was observed.

#### Executed evidence

Link:

- exact-head workflow runs;
- unit/architecture tests;
- protected Cypress path;
- Planning DB integrity/mechanization commands.

Distinguish executed commands from inferred evidence.

#### Security and integrity

Record:

- digest detects payload mismatch;
- digest does not authenticate creator;
- no SQL bodies are required in logs;
- unknown divergent content fails closed;
- CAS protects against stale writes;
- multi-file atomicity remains unresolved.

#### Compatibility

State explicitly:

- DVT is pre-product;
- no deployed pre-marker artifact compatibility is promised;
- no migration/version negotiation is included;
- development fixtures are disposable;
- byte-identical marking is current graph-projection containment, not a product migration guarantee.

#### Observability

Describe visible conflict state and evidence available to operators/developers without logging SQL bodies.

#### Rollback

State that rollback of this pre-product iteration is a Git revert of the PR and that no supported external data migration must be reversed.

#### Residual risks

At minimum:

- sequential writes can partially publish;
- exact whole-project revision is not yet bound;
- marker is not an origin-authentication boundary;
- misleading `legacy` naming remains optional cleanup.

#### Deviations

State whether any scope deviated from the model-SQL authority task and why.

#### Next iteration

Name only atomic multi-file publication plus exact revision identity.

### 9.2 Acceptance gate

PR #2040 may close when:

- the handoff is present;
- the final head remains unchanged or any new head reruns required tests;
- six workflows are green on the final head;
- no unresolved review thread exists;
- Planning DB still assigns atomic publication to its existing task;
- no new compatibility or signing scope is added.

---

## 10. Next implementation slice: atomic project publication and exact revision identity

### 10.1 Severity

`P1 — data integrity and reproducibility`.

### 10.2 Root cause

The Web publisher owns orchestration of multiple independent single-file commands.

It can preflight the full set but cannot commit it as one transaction.

### 10.3 User impact

A Preview attempt can leave:

- some generated files updated;
- other files unchanged;
- Canvas graph and workspace project temporarily inconsistent;
- later analysis describing a mixed revision;
- retry behavior dependent on partial state.

### 10.4 Exact owner

Primary owner:

```text
Project Workspace Publication
```

Collaborators:

- Canvas Authoring;
- Project Workspace I/O;
- dbt Project Analysis;
- Execution Preview provenance.

### 10.5 Reuse existing domain objects

Reuse:

- `WorkspaceFileBatchMutation`;
- `WorkspaceFileBatchExpectedFile`;
- `WorkspaceFileBatchWrite`;
- `WorkspaceFileBatchReceipt`;
- `WorkspaceFileBatchMutationResult`;
- `IWorkspaceFileBatchMutationPort`;
- `LocalWorkspaceFileBatchMutationGateway`;
- `ProjectDbtGraphFromFiles`;
- existing authority-binding and analysis contracts.

Do not invent a second transaction model.

### 10.6 Proposed result contract

Extend the existing publication result so one successful server-owned transaction yields an immutable identity equivalent to:

```ts
type DbtProjectPublicationReceipt = Readonly<{
  publicationId: string;
  idempotencyKey: string;
  requestHash: string;
  projectContentSetSha256: string;
  writes: readonly Readonly<{
    path: string;
    contentSha256: string;
  }>[];
  deletes: readonly string[];
  analysis: Readonly<{
    analysisSha256: string;
    freshness: 'fresh';
  }>;
}>;
```

Do not duplicate `WorkspaceFileBatchReceipt`; compose or enrich it at the owning application service.

### 10.7 Command/query route

Use one application command or existing accepted command extension that:

1. receives complete expected revisions and proposed writes;
2. invokes the existing batch port once;
3. rejects all conflicts without mutation;
4. receives one immutable batch receipt;
5. analyzes the exact resulting project content set;
6. returns publication plus analysis identity;
7. binds Preview to that identity.

Do not perform a second unbound latest-state read and present it as atomic evidence.

### 10.8 Likely files/components

Web:

- graph artifact publisher orchestration;
- Canvas plan action;
- execution strategy/provenance projection;
- publication conflict presentation;
- tests and live flow.

API:

- workspace batch command application service;
- protected route and contract parser;
- analysis orchestration;
- receipt validation;
- adapter tests.

Contracts:

- reuse batch receipt;
- add only the publication/analysis composition if no equivalent exists;
- runtime parsers for request and response.

Planning DB:

- existing `E-WEB-DBT-ATOMIC-PUBLICATION-1` task/design;
- exact owners, rails, ports, evidence, negative tests, and closeout.

### 10.9 Migration/compatibility

DVT remains pre-product.

No migration of deployed user artifacts is required.

The change can replace the current sequential graph publication path directly.

Compatibility scope:

- current tests/fixtures may be regenerated;
- no old receipt format must be preserved unless a merged contract explicitly requires it;
- file-authoritative projects remain unaffected;
- graph-draft Preview uses the new atomic route.

### 10.10 Rollback

Rollback posture:

- revert the implementation PR;
- no data migration rollback required;
- existing batch receipts created by test/development environments are disposable unless promoted to supported state;
- do not introduce browser-side compensating rollback.

### 10.11 Observability

Required signals without SQL bodies:

- publication ID;
- idempotency key hash or safe correlation ID;
- request hash;
- path count;
- write/delete count;
- conflict path count;
- project content-set hash;
- analysis hash;
- elapsed duration;
- outcome: applied, deduplicated, conflict, analysis-failed;
- Preview/Run revision mismatch count.

Do not log:

- SQL bodies;
- credentials;
- profile secrets;
- raw connection configuration.

### 10.12 Security

- preserve workspace scope authorization;
- validate every path server-side;
- bound files, bytes, output, and analysis duration;
- reject idempotency-key reuse with another request hash;
- fail closed on malformed receipts;
- preserve CAS and lock ordering;
- treat hashes as identity/integrity values, not actor authentication;
- keep dbt analysis in isolated directories with bounded output.

### 10.13 Red tests

1. conflict in the second expected file leaves all files unchanged;
2. conflict in the last expected file leaves all files unchanged;
3. injected replacement failure leaves all files unchanged;
4. successful batch changes all intended files;
5. same idempotency key and same request returns the original receipt;
6. same key and different request fails;
7. duplicate paths fail before adapter invocation;
8. oversized batch fails before mutation;
9. malformed receipt fails closed;
10. analysis is bound to the resulting content-set hash;
11. Preview rejects another project revision;
12. Run rejects or explicitly repreviews another revision;
13. reopening reproduces the same files and graph identity;
14. logs contain no SQL bodies;
15. file-authoritative mode never calls graph publication.

### 10.14 Green proof

- contracts tests;
- API application tests;
- adapter atomicity and fault-injection tests;
- Web orchestration tests;
- architecture guards proving one canonical batch rail;
- Planning DB integrity and mechanization;
- complete protected browser flow;
- six standard workflows green on final head.

### 10.15 Live proof

A protected integration/browser scenario must prove:

```text
open graph-draft
→ author multiple artifacts
→ Preview
→ one publication receipt
→ exact project content-set
→ exact analysis hash
→ Run
→ reopen
→ same project bytes and graph identity
```

A second scenario must inject a conflict and prove every file is unchanged.

### 10.16 Acceptance criteria

- no sequential per-file graph publication remains in production path;
- one server-owned batch mutation is invoked;
- all expected revisions are checked before replacement;
- conflict returns complete conflict information;
- successful result contains immutable publication identity;
- analysis identifies the exact resulting content set;
- Preview and Run consume or reject that identity explicitly;
- reopening reproduces the accepted revision;
- no duplicate rail or repository exists;
- no SQL body is logged;
- Planning DB closes the existing task truthfully;
- complete iteration handoff is published.

### 10.17 Release gates

- all six workflows green;
- no unresolved P1/P2 thread;
- architecture guards green;
- protected live proof green;
- Planning DB design/task/evidence coherent;
- exact final head documented;
- no compatibility requirements invented;
- no adjacent inventory/recovery/asset scope bundled.

---

## 11. Later ordered slices

### 11.1 Workspace capability truth

After atomic publication:

- paginated inventory;
- explicit `complete | partial`;
- opaque cursor;
- coherent read/write/import limits;
- typed `oversized`, `not_found`, `unsupported`, and invalid-path errors;
- tests over 500 and near accepted import limits.

### 11.2 Cohesive authoring recovery

After inventory truth:

- durable local buffer journal;
- exact workspace/project/revision identity;
- restoration UX;
- conflict-safe replay;
- retention and privacy policy;
- crash/power-loss tests.

### 11.3 Product-wide quality gates

Then:

- Web/API coverage ratchets;
- accessibility acceptance;
- bundle budgets;
- large-graph performance;
- API latency/payload budgets;
- fault injection;
- exact-SHA evidence;
- generated current delivery status.

### 11.4 Later differentiation

Only after authority, integrity, inventory, recovery, and quality:

- richer assets and lineage;
- checks and freshness;
- partitions;
- revision promotion and rollback;
- collaboration;
- VCS lifecycle integration.

---

## 12. Mature-system comparison: unchanged decision

### dbt Cloud / Studio

DVT should match:

- normal dbt files as the durable language;
- explicit project analysis;
- build/test/run connected to source revision;
- visible diagnostics;
- clear source-control lifecycle.

DVT should differ:

- Canvas remains a first-class visual projection and governed editor;
- visual edits are allowed only when lossless and authority-safe.

DVT should defer:

- broad collaboration and hosted-environment parity until core revision identity is stable.

### Airflow

DVT should match:

- execution bound to one complete code/project version;
- deterministic provenance for the run.

DVT should differ:

- DVT is an authoring and transformation product, not a scheduler clone.

DVT should defer:

- scheduler-scale operational features unrelated to the current transaction.

### Prefect

DVT should match:

- exact version identity;
- promotion/rollback model later;
- explicit deployment/run provenance.

DVT should defer:

- generalized workflow deployment abstractions before dbt project publication is coherent.

### Dagster

DVT should match later:

- assets, lineage, checks, freshness, observability.

DVT should defer them now:

- they do not repair duplicate authority or partial publication.

### Temporal

DVT should adopt principles:

- durable identity;
- idempotency;
- correlated receipts;
- failure recovery.

DVT should not:

- introduce another workflow engine into the editor transaction.

### NiFi

DVT should match:

- visible version/diff/revert mental models;
- clear local versus versioned state.

DVT should differ:

- Git should remain the durable review/version transport rather than a parallel proprietary registry.

### Professional IDE and Git workflows

DVT should keep separate:

- editor buffer;
- persisted working tree;
- semantic analysis;
- project revision;
- Preview;
- Run;
- staging/commit/push.

No single `synchronized` label should imply all of those states.

---

## 13. Fixed, active, superseded, and disproved findings

### Fixed on main

- pending reconciliation receipt edit/revert race (#2030);
- nonterminal materialization discrepancy in run operational truth (#2035);
- release `0.5.3` publication.

### Fixed in PR #2040, pending merge

- silent graph Preview overwrite of divergent Project Code SQL;
- graph-owned SQL editability posture;
- full artifact preflight before first write;
- retained observed per-file expected revisions;
- protected byte-preservation proof.

### Active

- missing iteration handoff for #2040;
- atomic multi-file graph publication;
- exact publication/content-set/analysis/Preview/Run identity;
- ListRuns scoped pagination;
- workspace inventory completeness and error vocabulary;
- HTTP runtime contract validation;
- durable authoring recovery;
- Web/API quality, accessibility, and performance gates;
- generated current delivery truth.

### Superseded

- the old recommendation to fix the #2030 reconciliation race;
- unmerged point-in-time review documents as current authority;
- release-governance work as the immediate product priority.

### Disproved

- requirement to migrate supported pre-marker graph SQL artifacts;
- requirement for artifact version negotiation in PR #2040;
- claim that an unkeyed SHA-256 marker authenticates origin;
- claim that byte-identical graph-projection marking is itself a demonstrated functional blocker.

---

## 14. Final instruction to the implementation agent

Do not add more runtime scope to PR #2040.

Publish the complete `## Iteration Handoff`, verify the final head, and merge through the normal protected process when all gates remain green.

Then begin exactly one new implementation branch for:

```text
atomic multi-file publication
+ exact project content-set identity
+ exact analysis identity
+ Preview/Run/reopen binding
```

Do not begin:

- another review document;
- another release lane;
- dependency upgrades as the product focus;
- compatibility migrations;
- signing/key management;
- workspace inventory;
- recovery framework;
- assets/lineage/freshness;
- generic authoring-session framework.

Those concerns remain ordered behind the current transaction.

---

## 15. Review closeout

This report is documentation-only.

It changes no:

- runtime code;
- workflow;
- dependency;
- contract;
- migration;
- generated artifact;
- release metadata;
- product behavior.

No merge is performed by this review.
