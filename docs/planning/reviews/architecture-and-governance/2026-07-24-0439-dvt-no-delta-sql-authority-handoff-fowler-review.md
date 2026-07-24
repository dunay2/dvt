---
title: DVT no-delta SQL authority and delivery-handoff Fowler review
status: Review
reviewed_repository: dunay2/dvt
reviewed_main_sha: 8c098d6e35ce874efae81609814d99e8e60091f7
reviewed_at: 2026-07-24T04:39:55+02:00
review_type: architecture-and-governance
scope: documentation-only
---

# DVT no-delta SQL authority and delivery-handoff Fowler review

## 1. Executive verdict

There is **no material repository or product delta** since the previous review.

The exact reviewed `main` remains:

- [`8c098d6e35ce874efae81609814d99e8e60091f7`](https://github.com/dunay2/dvt/commit/8c098d6e35ce874efae81609814d99e8e60091f7)
- commit: `chore(main): Release 0.5.3 (#2037)`
- published product release: `v0.5.3`

The only open functional pull request remains:

- [#2040 — `fix(web): Prevent graph preview from overwriting DBT model SQL`](https://github.com/dunay2/dvt/pull/2040)
- exact head: [`6257745ed1ec91f1a1415585d24e319905966931`](https://github.com/dunay2/dvt/commit/6257745ed1ec91f1a1415585d24e319905966931)
- base: `main@8c098d6e35ce874efae81609814d99e8e60091f7`
- state: open, ready for review, mergeable
- commits: 1
- files: 24
- additions/deletions: `+2766 / -57`

PR #2040 still has:

- six successful standard workflows on the exact head;
- no unresolved inline review thread;
- no newly demonstrated runtime blocker;
- no complete implementation-agent `## Iteration Handoff`.

The current closeout disposition is therefore:

```text
PRODUCT IMPLEMENTATION: technically credible and CI-green
DELIVERY HANDOFF: missing
ATOMIC PUBLICATION: not implemented
EXACT PROJECT REVISION IDENTITY: not implemented
```

The next product slice must remain the already-governed atomic multi-file publication and exact-revision transaction. No new framework, compatibility layer, release-governance expansion, or parallel rail is justified.

---

## 2. Evidence boundary

This review inspected current GitHub repository state and source. It did not execute the repository locally.

### 2.1 Repository and delivery evidence

- current `main` and recent commits;
- all open pull requests;
- PR #2040 metadata, comments, review thread, changed source, and exact-head workflows;
- release `v0.5.3` state;
- current source on `main` for Canvas publication, dbt reconciliation, workspace file ports, batch mutation, run listing, and workspace limits;
- current branch source on PR #2040 for SQL-authority containment;
- Planning DB direction already present in merged migrations and branch migrations;
- ADR-0060 and the accepted dbt round-trip product plan.

### 2.2 No local execution claimed

The following are repository claims or GitHub workflow evidence, not new executions by this reviewer:

- `pnpm verify:prepush`;
- protected Cypress live flow;
- Planning DB migration/integrity checks;
- feature mechanization;
- exact-head GitHub Actions results.

### 2.3 Operational authority

The sequencing authority remains:

1. live Planning DB task/design/dependency state;
2. [`docs/adr/ADR-0060-dbt-project-authoring-authority.md`](https://github.com/dunay2/dvt/blob/main/docs/adr/ADR-0060-dbt-project-authoring-authority.md);
3. [`docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md`](https://github.com/dunay2/dvt/blob/main/docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md);
4. current source, contracts, tests, and CI evidence.

Closed or unmerged review documents are historical evidence only. They are not current implementation authority.

---

## 3. Exact current repository state

## 3.1 `main`

No commit has landed after release `0.5.3`.

Recent product-relevant commits remain:

1. `8c098d6e` — release `0.5.3`;
2. `9bc34457` — unify run operational truth;
3. `591a1ecd` — release `0.5.2`;
4. `8a39d19e` — preserve pending reconciliation receipt truth.

No newer merge changes Web, API, contracts, runtime, tests, Planning DB, release, or product behavior.

## 3.2 Open pull requests

Two PRs were open at review time:

1. functional PR #2040;
2. prior point-in-time documentation review #2050.

No separate atomic-publication, exact-revision, workspace-inventory, recovery, accessibility, or performance implementation branch is open.

## 3.3 Release state

- latest merged release PR: #2037;
- published version: `v0.5.3`;
- release content: canonical run operational truth;
- no later release candidate is open;
- no current release blocker was found.

## 3.4 Exact-head CI for #2040

All six standard workflows completed successfully on `6257745ed1ec91f1a1415585d24e319905966931`:

- Contracts & Determinism;
- Dependency Review;
- Test Suite;
- CI — Code Quality;
- CodeQL;
- PR Quality Gate.

CI green proves that the configured suites passed. It does not prove atomic publication or exact project-revision binding, because those capabilities are explicitly out of scope for #2040 and remain absent from its implementation.

## 3.5 Review-thread state

PR #2040 has one inline thread, resolved.

Its original premise required support for pre-marker persisted graph workspaces. That compatibility requirement is **DISPROVED / OUT OF SCOPE** because DVT is pre-product and no deployed artifact-preservation contract was identified.

The supported rule remains:

```text
unrecognized divergent SQL
→ conflict
→ zero silent overwrite
```

No migration, historical format detection, version negotiation, or compatibility fixture is required without an explicit preservation obligation.

---

## 4. Implementation handoff audit

## 4.1 Status

```text
DELIVERY-HANDOFF-MISSING
```

No top-level PR comment beginning `## Iteration Handoff` exists for #2040.

The PR body is useful but insufficient as a full iteration closeout.

## 4.2 Required fields still missing from one consolidated handoff

The implementation agent must record:

1. exact base SHA;
2. exact final head SHA;
3. branch and PR;
4. Planning DB task/design identity;
5. iteration goal;
6. what changed;
7. how it was implemented;
8. why that design was selected;
9. exact DDD/component owner;
10. command/query rails reused;
11. ports reused or modified;
12. adapters reused or modified;
13. contracts reused or modified;
14. migrations and source files touched;
15. user-visible behavior;
16. tests observed failing before the fix;
17. green test commands and results;
18. exact-head workflow links;
19. live browser/integration evidence link;
20. security posture;
21. data-integrity posture;
22. observability posture;
23. compatibility posture;
24. rollback posture;
25. unresolved risks;
26. deviations from the approved route;
27. recommended next bounded iteration.

## 4.3 Why the handoff matters

The repository has strong mechanized evidence, but the delivery decision remains expensive to reconstruct across:

- PR body;
- source diff;
- Planning DB migrations;
- tests;
- workflow results;
- review comments;
- protected live-flow source.

The handoff is not a replacement for those sources. It is an index that states the claims and points to the evidence used to verify each one.

## 4.4 Claim-to-evidence matrix for #2040

| Claim | Status | Source-backed disposition |
| --- | --- | --- |
| Exact base/head/branch/PR | VERIFIED | PR metadata is exact and unchanged. |
| Prevent silent overwrite of divergent SQL | VERIFIED | Branch policy conflicts before publication. |
| Marker verifies exact payload integrity | VERIFIED | Marker digest is checked against payload. |
| Marker authenticates origin | DISPROVED | Unkeyed digest is not creator authentication. Branch wording already avoids this overclaim. |
| Preflight occurs before first write | VERIFIED | Publication service reads/classifies all artifacts first. |
| CAS revisions are captured once during preflight | VERIFIED | Prepared writes retain observed expected revisions. |
| Graph-owned SQL is read-only in Project Code | VERIFIED | Branch presentation path exposes graph-managed content as non-editable. |
| File-authoritative projects remain editable | VERIFIED | Read-only behavior is scoped to graph-owned artifacts. |
| Divergent external SQL remains byte-identical after rejected Preview | VERIFIED | Protected Cypress flow asserts preservation. |
| Protected live flow was executed | PARTIAL | PR body claims execution; no consolidated handoff links the exact log/artifact. |
| Six standard workflows pass | VERIFIED | GitHub workflow runs are green on exact head. |
| No new persistence rail was introduced | VERIFIED | Existing workspace read/write rails remain in use. |
| Multi-file publication is atomic | CONTRADICTED | Prepared writes are still executed as individual saves. |
| Preview and Run are pinned to one exact project content set | NOT PROVEN | No publication receipt binds the full project revision. |
| Red tests were observed before implementation | NOT PROVEN | Final tests exist; red chronology is absent. |
| Rollback is documented | NOT PROVEN | Revert is inferable but not recorded in a handoff. |
| Residual risk is documented | NOT PROVEN | Atomicity and exact-revision gaps are reconstructable but not handed off. |
| Complete iteration handoff exists | NOT PROVEN | No qualifying comment exists. |

---

## 5. Material delta since the previous review

There is none.

### 5.1 Unchanged facts

- `main` SHA unchanged;
- #2040 head unchanged;
- #2040 source unchanged;
- #2040 CI unchanged and green;
- review thread unchanged and resolved;
- no implementation handoff added;
- no new functional PR opened;
- no release PR opened;
- no Planning DB authority change observed.

### 5.2 Review discipline

Because the repository did not change, this review does not manufacture:

- a new blocker;
- a new migration requirement;
- a new compatibility obligation;
- a new architectural abstraction;
- a new task sequence;
- a new mature-system comparison conclusion.

---

## 6. Previous-finding reconciliation

| Finding | Current state | Evidence/disposition |
| --- | --- | --- |
| PR #2030 edit/revert reconciliation race | FIXED | Receipt identity remains authoritative across edit/revert. Do not reopen. |
| #2035 nonterminal materialization divergence | FIXED | Shared run projection sanitizes lifecycle evidence. |
| Release `0.5.3` | COMPLETED | Published through merged release PR #2037. |
| Pre-marker deployed-artifact compatibility | DISPROVED | No supported product population or preservation contract. |
| #2040 SQL-authority silent overwrite | FIXED ON BRANCH / NOT MERGED | Branch conflicts before overwriting divergent SQL. |
| #2040 payload-integrity marker | IMPLEMENTED ON BRANCH | Correctly treated as integrity, not origin authentication. |
| #2040 complete delivery handoff | ACTIVE | Missing. |
| Atomic multi-file dbt publication | ACTIVE P1 | Sequential final saves remain. |
| Exact project revision for Preview/Run/reopen | ACTIVE P1 | No server-owned full-project receipt chain. |
| Scoped `ListRuns` pagination | ACTIVE P2 | Scope is filtered after tenant-limited read; request has no cursor. |
| Workspace inventory completeness | ACTIVE P1 | Silent 500-file truncation; no `complete/partial` contract. |
| Oversized workspace-file semantics | ACTIVE P2 | Size limit is reported as invalid path. |
| Generic Web HTTP response validation | ACTIVE P2 | Generic client still trusts parsed JSON by cast. |
| Durable authoring recovery | ACTIVE P2 | Navigation guards exist; crash recovery journal does not. |
| Product-wide Web/API quality ratchets | ACTIVE | Root evidence remains stronger for Engine than product surfaces. |
| Current-status documentation truth | ACTIVE | Status artefacts can drift from live Planning DB/source. |

---

## 7. Fowler-style assessment of PR #2040

## 7.1 What #2040 improves

### Hidden authority

Before #2040, graph-derived SQL could overwrite a newer Project Code edit after reading and accepting its current revision.

The branch makes the authority collision explicit:

- graph-owned expected content;
- existing workspace content;
- managed marker validity;
- divergent external content;
- conflict before any publication.

### Temporal coupling

The branch captures expected revisions during preflight rather than re-reading each file immediately before its individual write.

This reduces a read/write ambiguity and produces a stable prepared-publication decision.

### Leaky presentation state

Project Code now distinguishes graph-owned SQL from file-authoritative SQL instead of presenting both as equally editable.

### Test-only confidence

The branch adds protected browser evidence for the real user transaction:

```text
Canvas authoring
→ Preview
→ Run
→ Project Code
→ external SQL modification
→ Preview rejected
→ external bytes preserved
```

The missing handoff prevents the reviewer from seeing the exact execution evidence in one place, but the covered transaction is correct.

## 7.2 What #2040 deliberately does not solve

### Multi-file atomicity

The final publication still performs one `saveFileContent` call per prepared artifact.

Preflight-all plus write-one-by-one is not an atomic transaction.

Failure example:

```text
preflight A, B, C succeeds
write A succeeds
write B conflicts or fails
C not attempted
workspace now contains partial publication
```

### Exact whole-project identity

Individual save receipts do not establish one immutable identity for:

- all published files;
- analyzer input;
- graph projection;
- Preview;
- Run;
- reopen.

### Recovery after process/browser loss

The PR addresses overwrite containment, not durable unsaved-buffer recovery.

## 7.3 Current code smells that remain after #2040

- **Transaction Script at the browser boundary:** publication orchestration remains Web-owned.
- **Hidden authority across asynchronous reads:** current project reconciliation can still fetch “latest” rather than the exact saved content set.
- **Primitive identity:** individual SHA strings exist without one owned aggregate representing a complete project revision.
- **Responsibility overload:** Canvas plan action still owns projection, file publication, provenance preparation, Preview, and result shaping.
- **Test-only confidence risk:** exact CI/live claims are not indexed by a complete handoff.

---

## 8. Priority 1 — atomic publication and exact project revision

## 8.1 Severity and evidence

**Severity: P1 — data integrity and execution reproducibility.**

Current `main` writes dbt workspace artifacts in a loop. PR #2040 improves preflight but retains individual final writes.

The repository already owns the correct transaction primitives:

- `WorkspaceFileBatchMutation`;
- `WorkspaceFileBatchReceipt`;
- `IWorkspaceFileBatchMutationPort`;
- idempotency key and request hash;
- expected revisions for all files;
- conflict set for all paths;
- multipath locking;
- atomic replacement;
- persistent receipt.

## 8.2 Root cause

The graph-first Canvas publication path was implemented against the Web single-file command surface even after API acquired a server-owned batch transaction.

This leaves the user transaction split across layers:

```text
Web decides the complete mutation
Web issues N independent commands
API protects each command independently
```

The transaction owner should instead be server-side:

```text
Web proposes one complete publication
API validates and applies one transaction
API returns one immutable receipt
```

## 8.3 User/product impact

Without this slice:

- projects can become partially published;
- Preview may describe a different project than the user intended;
- retry semantics are ambiguous;
- Run reproducibility is weak;
- recovery must infer state from files rather than a publication receipt;
- support/debugging cannot identify the exact project version used.

## 8.4 Exact domain owner

Recommended owner:

```text
DbtProjectPublication
```

The owner is not:

- Canvas presentation;
- Project Code;
- generic plan execution;
- dbt analysis adapter;
- Git provenance;
- runtime engine.

## 8.5 Proposed domain objects

Reuse existing objects and add only the missing aggregate result where Planning DB approves it:

```ts
DbtProjectPublicationCommand
DbtProjectPublicationArtifact
DbtProjectPublicationReceipt
DbtProjectRevision
DbtProjectAnalysisIdentity
```

Target receipt shape:

```ts
type DbtProjectPublicationReceipt = Readonly<{
  publicationId: string;
  idempotencyKey: string;
  requestHash: string;
  projectRoot: string;
  files: readonly Readonly<{
    path: string;
    contentSha256: string;
  }>[];
  projectContentSetSha256: string;
  analysisSha256: string;
  publishedAt: string;
}>;
```

The exact names must follow existing contract vocabulary and Planning DB design. Do not introduce a second equivalent receipt if a current contract already owns these fields.

## 8.6 Commands, queries, ports, and adapters

### Command

Add or extend the existing governed publication command so one call owns:

1. scope authorization;
2. path policy;
3. complete expected-revision preflight;
4. model-SQL publication policy;
5. atomic batch application;
6. fresh dbt analysis;
7. content-set/analysis identity;
8. immutable receipt.

### Existing port to reuse

```ts
IWorkspaceFileBatchMutationPort.apply(scope, mutation)
```

### Existing adapter to reuse

```text
LocalWorkspaceFileBatchMutationGateway
```

### Existing query to reuse

```text
ProjectDbtGraphFromFiles
```

Do not create:

- another workspace repository;
- browser rollback;
- `SaveDbtProjectFiles` plus `PublishDbtProjectFiles` duplicates;
- a second dbt parser;
- a second project-revision vocabulary;
- a route that bypasses the protected runtime scope.

## 8.7 Likely files/components

Likely surfaces after Planning DB authorization:

- `packages/@dvt/contracts/src/contracts/planner/**`;
- `apps/api/src/application/ports/workspaceFiles.ts` only if receipt composition requires extension;
- `apps/api/src/application/services/dbtProjectPublication/**`;
- protected API route/dependency registration;
- Web publication port/service;
- `apps/web/src/app/views/canvas/canvasPlanAction.ts`;
- `apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts`;
- API/Web tests;
- protected Cypress flow;
- one or more Planning DB migrations for the existing task.

## 8.8 Migration and compatibility

DVT is pre-product.

Therefore:

- no legacy artifact migration is required;
- no historical receipt import is required;
- no backwards format negotiation is required;
- existing development fixtures may be regenerated;
- API compatibility should preserve only merged current clients needed by the branch sequence.

A feature flag is unnecessary unless required for branch integration. A narrow strangler route can coexist temporarily with the old Web path only during development, but merge acceptance must ensure the product path uses one authority.

## 8.9 Rollback posture

Before production data exists, rollback is:

- revert the functional PR;
- retain prior file data because failed batch transactions leave originals intact;
- remove no irreversible database data migrations;
- preserve receipt schema only if already merged and consumed.

Do not build compensating browser writes as rollback.

## 8.10 Observability

Record without logging SQL bodies:

- publication ID;
- tenant/project/environment scope identifiers under existing logging policy;
- path count;
- total bytes;
- request hash;
- project content-set hash;
- analysis hash;
- conflict count and paths under safe disclosure rules;
- deduplicated retry;
- duration;
- terminal result.

## 8.11 Security

Required controls:

- protected route authorization;
- workspace scope-root enforcement;
- allowed path/extension policy;
- maximum file count and bytes;
- no SQL body or credential logging;
- idempotency-key abuse limits;
- analyzer timeout and bounded output;
- isolated dbt target/profile/log directories;
- no package installation/network side effects in parse.

## 8.12 Red/green tests

### Red tests

1. conflict in the second file leaves every file unchanged;
2. conflict in the final file leaves every file unchanged;
3. injected replacement failure leaves all originals unchanged;
4. same idempotency key and same request returns the same receipt;
5. same idempotency key and different request fails closed;
6. publication receipt hashes exactly match committed files;
7. analysis identity is derived from those exact files;
8. Preview refuses a different project content set;
9. Run refuses or requires re-Preview after project mutation;
10. reopen reproduces the same project revision;
11. SQL bodies never appear in logs;
12. concurrent publication produces one winner and one full conflict result.

### Green proof

- contract tests;
- API application tests;
- batch gateway tests;
- route tests;
- Web service/presentation tests;
- architecture tests;
- Planning DB migration/integrity/mechanization;
- `pnpm verify:prepush`;
- exact-head six-workflow CI.

## 8.13 Live browser/integration proof

One protected vertical must prove:

```text
create graph-authored models
→ Preview publishes all files atomically
→ receipt shown/recorded
→ dbt analysis hashes exact files
→ Run starts from exact Preview revision
→ external file mutation makes previous Preview stale
→ Run does not silently use latest files
→ reopen resolves the recorded revision and current divergence honestly
```

## 8.14 Acceptance criteria

- no individual browser save loop remains on the graph publication path;
- all expected revisions are evaluated in one transaction;
- no partial state survives conflict or failure;
- one immutable receipt binds files and analysis;
- Preview stores that identity;
- Run consumes that identity or rejects drift;
- reopen can display exact/stale/conflicted posture;
- all negative tests and protected live proof pass;
- complete iteration handoff exists;
- exact-head CI is green.

## 8.15 Release gates

Do not release this slice until:

- unresolved review threads are zero;
- Planning DB task/design/evidence matches final code;
- no duplicate command/query rail exists;
- no runtime body logging exists;
- failure-injection proof is green;
- final handoff links exact evidence;
- release candidate is generated only after merge.

---

## 9. Priority 2 — scoped `ListRuns` keyset pagination

## 9.1 Severity and evidence

**Severity: P2 — incomplete operational truth.**

Current `ListRunsUseCase`:

1. requests tenant rows with a limit;
2. filters project/environment in application memory;
3. builds a cursor from the filtered subset;
4. returns a `nextCursor` that the query type cannot accept.

This can falsely report exhaustion when authorized rows exist after rows from another project or environment.

## 9.2 Root cause

Scope, ordering, cursor, and limit are split between application and persistence instead of owned by one storage query contract.

## 9.3 Correct route

Keep the existing `ListRuns` rail.

Add:

```ts
type RunListCursorV1 = Readonly<{
  version: 1;
  createdAt: string;
  runId: string;
}>;
```

Apply:

- tenant;
- project;
- environment;
- status;
- cursor;
- deterministic `(createdAt, runId)` ordering;
- `limit + 1` exhaustion proof;

inside every persistence adapter before limit.

## 9.4 Prohibitions

Do not create:

- `ListScopedRuns`;
- another HTTP route;
- Web overfetch/filter loops;
- concatenated cursor strings without schema/version validation;
- different semantics in in-memory and PostgreSQL adapters.

## 9.5 Required proof

- mixed-scope pages do not hide authorized runs;
- equal timestamps use `runId` tie-break;
- no duplicates/omissions between pages;
- invalid cursor fails before store access;
- adapters pass shared conformance vectors;
- browser traverses at least two mixed-scope pages;
- handoff and exact-head CI complete.

This task must not displace atomic publication unless live Planning DB dependency state explicitly promotes it as blocking.

---

## 10. Priority 3 — workspace capability truth

## 10.1 Severity

**P1 — product presents an incomplete project as complete.**

Current local workspace repository:

- stops after 500 listed files;
- returns no cursor;
- returns no `complete/partial` indicator;
- omits remaining files silently;
- rejects files over 1 MB as `InvalidWorkspacePathError`.

## 10.2 Required model

```ts
type WorkspaceFileInventoryPage = Readonly<{
  entries: readonly WorkspaceFileEntry[];
  completeness: 'complete' | 'partial';
  nextCursor: string | null;
  effectiveLimits: WorkspaceFileCapabilityLimits;
}>;
```

Content results should distinguish:

```text
found
not_found
oversized
unsupported
invalid_path
```

## 10.3 Why it matters

Without explicit completeness:

- Canvas may analyze a different project than Explorer shows;
- users cannot know files were omitted;
- imports can accept projects the editor cannot inspect;
- support cannot distinguish corruption from configured limits.

## 10.4 Required proof

- 501-file project;
- project near import maximum;
- oversized file;
- cursor traversal without omission;
- analysis and Explorer agree on project scope;
- limits displayed to user;
- no path-policy information leakage.

---

## 11. Priority 4 — cohesive authoring recovery

Current navigation flush and `beforeunload` warning reduce accidental loss, but they do not restore unsaved buffers after browser/process/system failure.

A later slice should own:

- durable local draft journal;
- content and base revision;
- workspace/project/file identity;
- safe recovery prompt;
- conflict posture when server content changed;
- explicit discard;
- bounded retention and cleanup;
- no secrets or credentials in persisted browser storage.

This should follow atomic publication and inventory truth so recovery restores a well-defined project/file authority rather than perpetuating current ambiguity.

---

## 12. Priority 5 — product-wide quality gates

After the authority and integrity transactions close, add product gates for:

- Web/API coverage ratchets;
- accessibility automation plus keyboard/screen-reader proof;
- bundle budgets;
- graph rendering and interaction performance;
- large-project payload/latency limits;
- fault injection;
- multi-worker concurrency;
- exact-main evidence;
- generated current-status reporting.

Do not use these gates to defer the atomic publication transaction.

---

## 13. Security, integrity, operability, accessibility, and performance review

## 13.1 Security

Positive current signals:

- protected workspace scopes;
- compare-and-swap writes;
- path policy;
- CodeQL and dependency review;
- #2040 fail-closed divergence handling;
- marker described as integrity rather than authentication.

Remaining risks:

- future publication route must enforce batch limits and authorization server-side;
- generic Web API casts can trust malformed payloads;
- logs must not include SQL, credentials, profiles, or connector secrets;
- dbt analysis must stay isolated and bounded.

## 13.2 Data integrity

Highest integrity gaps:

1. sequential multi-file publication;
2. no exact project-revision receipt binding Preview and Run;
3. incomplete workspace inventory presented without explicit partial state;
4. incomplete `ListRuns` pagination.

## 13.3 Recovery

Current capabilities:

- per-file CAS;
- atomic single-file replacement;
- batch gateway atomic replacement;
- idempotent batch receipts;
- navigation flush/warning.

Missing product capabilities:

- graph publication using batch gateway;
- revision-bound Preview/Run recovery;
- crash-safe unsaved authoring journal.

## 13.4 Operability

The repository has strong CI and Planning DB evidence, but delivery evidence is fragmented without the iteration handoff.

Operators also need:

- publication receipt lookup;
- safe conflict diagnostics;
- exact project revision on Preview/Run views;
- latency and failure metrics;
- current-status generation from live authority.

## 13.5 Accessibility

No current delta changes accessibility posture.

Future product gates should prove:

- keyboard-only Canvas/Code/Preview/Run path;
- focus restoration after conflict dialogs;
- accessible status and error announcements;
- non-color-only conflict/freshness states;
- usable large-project Explorer navigation.

## 13.6 Performance

No current delta changes performance posture.

Atomic publication should avoid:

- N+1 revision reads;
- browser-owned retries;
- repeated full-project parse without bounded caching/invalidation;
- unbounded logs/output;
- serial status reads beyond intentional concurrency limits.

---

## 14. Mature-system comparison

## 14.1 dbt Cloud / Studio

### Match

- normal dbt files remain the durable user language;
- integrated edit, parse, Preview/Run, diagnostics, and version-control posture;
- compiled SQL remains derived, not a second writable authority.

### Differentiate

- Canvas can provide governed visual authoring and explicit lossless/code-only capabilities.

### Defer

- broad collaboration and hosted IDE parity until authority, publication, revision identity, and recovery are trustworthy.

## 14.2 Airflow

Airflow DAG Bundles version all files needed by a DAG and allow a run to use one specific bundle version for the whole run.

### Match

- pin Preview and Run to one project revision;
- preserve reproducibility across later file changes;
- store revision identity on execution records.

### Differentiate

- DVT’s revision is a dbt project content set and analysis identity rather than Python DAG bundle implementation.

### Defer

- pluggable external bundle backends until local/server publication semantics are complete.

Reference: <https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/dag-bundles.html>

## 14.3 Prefect

### Match

- versioned deployments/execution code;
- promotion and rollback of known versions;
- exact code/commit/image identity.

### Differentiate

- DVT should make project revision and semantic analysis first-class before general deployment promotion.

### Defer

- full deployment lifecycle management until Preview/Run revision binding works.

## 14.4 Dagster

### Match later

- assets, lineage, checks, freshness, partitions, and operational observability.

### Defer now

- these features do not repair file/graph authority or partial publication.

## 14.5 Temporal

### Match principles

- durable identity;
- idempotency;
- replay/recovery-aware design;
- explicit correlated receipts.

### Differentiate

- use Temporal for runtime workflows where appropriate; do not turn editor state into a workflow-engine abstraction.

## 14.6 NiFi

NiFi Registry was deprecated after a February 2026 community vote, with Git-based Flow Registry Clients recommended.

### Match

- visual flows and visible version/diff posture;
- Git-compatible transport and review.

### Avoid

- another proprietary registry parallel to Git and workspace files.

Reference: <https://nifi.apache.org/projects/registry/>

## 14.7 Professional IDE and version-control workflows

### Match

- dirty buffer;
- persisted file;
- diagnostics/index freshness;
- conflict;
- staged/published revision;
- commit/version identity;
- diff and rollback.

DVT must not compress these independent facts into a single “synchronized” posture or treat latest-read data as exact revision proof.

---

## 15. Required closeout instruction for the implementation agent

Before merging #2040, publish this top-level PR comment:

```markdown
## Iteration Handoff

### Identity
- Base SHA:
- Final head SHA:
- Branch:
- PR:
- Planning DB task/design:

### Goal
- User transaction closed:
- Problem/root cause:

### What changed
- Runtime:
- Contracts:
- Tests:
- Planning DB:
- Documentation/evidence:

### How
- Domain owner:
- Commands/queries:
- Ports:
- Adapters:
- Contracts/value objects:
- Key algorithms/state transitions:

### Why
- Selected design:
- Reused repository semantics:
- Rejected alternatives:

### User-visible behavior
- Before:
- After:
- Failure/conflict behavior:

### Red/green chronology
- Observed failing tests before fix:
- Green focused tests:
- Green full validation:

### Evidence
- Exact-head CI links:
- Live browser/integration proof:
- Planning DB evidence:

### Security and integrity
- Authorization/scope:
- Sensitive logging:
- Integrity guarantees:
- Explicit non-guarantees:

### Compatibility and rollback
- Pre-product compatibility decision:
- Rollback method:
- Irreversible changes:

### Observability
- Signals/logs/metrics/receipts:

### Residual risks
- Atomic publication:
- Exact project revision:
- Other:

### Deviations
- From approved route:
- Justification:

### Next iteration
- Exact task:
- Included:
- Excluded:
- Acceptance gate:
```

Claims must link to exact source paths, commits, workflows, or evidence. Do not write “tested” without identifying the command/result or workflow.

---

## 16. Final decision

### PR #2040

- no newly demonstrated runtime blocker;
- functionality is credible;
- exact-head CI is green;
- review threads are resolved;
- pre-marker migration is not required;
- delivery handoff is missing.

### Next implementation

After normal #2040 closeout:

```text
atomic complete-project publication
→ immutable publication receipt
→ projectContentSetSha256
→ analysisSha256
→ Preview pinned to receipt
→ Run pinned to Preview revision
→ reopen with exact/stale/conflict posture
```

### Stop-doing rule

Until that transaction closes, do not prioritize:

- another release-governance expansion;
- another compatibility layer for development artifacts;
- another point-in-time priority guide;
- another generic authoring framework;
- assets/partitions/collaboration expansion;
- browser compensation for server transaction gaps.

The repository has enough architecture and infrastructure. The missing value is completing one real end-to-end integrity transaction and leaving an auditable delivery handoff.

---

## 17. Repository references

- [Current main commit](https://github.com/dunay2/dvt/commit/8c098d6e35ce874efae81609814d99e8e60091f7)
- [PR #2040](https://github.com/dunay2/dvt/pull/2040)
- [PR #2040 exact head](https://github.com/dunay2/dvt/commit/6257745ed1ec91f1a1415585d24e319905966931)
- [ADR-0060](https://github.com/dunay2/dvt/blob/main/docs/adr/ADR-0060-dbt-project-authoring-authority.md)
- [Accepted dbt round-trip plan](https://github.com/dunay2/dvt/blob/main/docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md)
- [Canvas current publication action](https://github.com/dunay2/dvt/blob/main/apps/web/src/app/views/canvas/canvasPlanAction.ts)
- [Workspace batch port](https://github.com/dunay2/dvt/blob/main/apps/api/src/application/ports/workspaceFiles.ts)
- [Local atomic batch gateway](https://github.com/dunay2/dvt/blob/main/apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.ts)
- [Current dbt project Canvas controller](https://github.com/dunay2/dvt/blob/main/apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts)
- [Current ListRuns use case](https://github.com/dunay2/dvt/blob/main/apps/api/src/application/services/listRunsUseCase.ts)
- [Current runtime application port](https://github.com/dunay2/dvt/blob/main/apps/api/src/application/ports/runtime.ts)
- [Current local workspace repository](https://github.com/dunay2/dvt/blob/main/apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts)

## 18. External references

- [Apache Airflow DAG Bundles](https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/dag-bundles.html)
- [Apache NiFi Registry deprecation notice](https://nifi.apache.org/projects/registry/)
