# DVT Fowler Review — No Material Delta, Active Path Still Blocked

- Reviewed at: 2026-07-25 12:39 Europe/Madrid
- Repository: `dunay2/dvt`
- Exact reviewed `main`: `8c098d6e35ce874efae81609814d99e8e60091f7`
- Release represented by `main`: `0.5.3`
- Review branch: `agent/dvt-review-20260725-1239`
- Scope: documentation only

## Executive decision

There is **NO MATERIAL DELTA** since the previous control cycle.

`main`, release state, PR #2040, PR #2055, PR #2059, their relevant heads, CI outcomes, and review-thread states are unchanged.

The repository remains blocked on one product result:

```text
graph-derived dbt artifacts
→ complete preflight
→ one server-owned atomic multi-file mutation
→ immutable publication receipt
→ exact project content-set identity
→ exact analysis identity
→ Preview and Run admitted against that same identity
```

PR #2055 remains the only executable red proof of the active transaction defect. It must not merge while red. PR #2040 remains functionally green but unmerged. PR #2059 remains a useful governance proposal but is not current authority because it is an unmerged draft.

This report exists only because the current automation instruction explicitly requires a new branch, report, commit, and draft PR every cycle. Draft PR #2059 proposes the opposite no-delta policy, but that proposal is not merged and therefore cannot override the active instruction or `main`.

## 1. Exact repository state

### 1.1 `main`

- SHA: `8c098d6e35ce874efae81609814d99e8e60091f7`
- Commit: `chore(main): Release 0.5.3 (#2037)`
- No commits newer than this SHA were found.
- No new release commit exists.

### 1.2 Open pull requests

| PR | State | Head | Purpose | Current disposition |
|---|---|---|---|---|
| [#2040](https://github.com/dunay2/dvt/pull/2040) | open, ready, mergeable | `6257745ed1ec91f1a1415585d24e319905966931` | contain graph-owned dbt model SQL authority | functionally green; no open thread; formal implementer handoff still absent |
| [#2055](https://github.com/dunay2/dvt/pull/2055) | open, ready, mergeable but red | `58fb694ce7602d5ae3942b5ff83881e2c3e7ec43` | executable red proof of partial multi-file publication | active P1; Test Suite fails intentionally; must not merge |
| [#2058](https://github.com/dunay2/dvt/pull/2058) | open, draft | review-only | prior review state | superseded as a current review surface |
| [#2059](https://github.com/dunay2/dvt/pull/2059) | open, draft, mergeable | `6a6b1847b6e4886605ccbe97290bad1bdb108190` | establish one-current-design delivery control | correct direction; not current authority; two governance corrections remain |
| [#2060](https://github.com/dunay2/dvt/pull/2060) | open, draft | review-only | previous review cycle | superseded by this report as the latest point-in-time review |

No additional open functional PR was found.

## 2. Implementation handoff audit

### Status

```text
DELIVERY-HANDOFF-MISSING
```

The latest material implementation branch remains #2040. It contains a reviewer-reconstructed top-level `## Iteration Handoff` comment:

- https://github.com/dunay2/dvt/pull/2040#issuecomment-5072979847

That comment is useful retrospective evidence, but it was not produced by the implementation agent at iteration close. It therefore does not satisfy the required provenance contract.

PR #2055 contains an executable red test and a correction thread, but no implementation-agent end-of-iteration handoff.

### Exact missing or not-proven fields

1. Implementer-authored final handoff for the exact final head.
2. Executed red-first chronology for #2040; repository evidence proves tests exist and pass, not that they were observed failing before implementation.
3. Direct retained live-browser artifact or log URL for the protected Cypress proof.
4. Implementer acceptance of residual risks, rollback posture, and deviations.
5. End-of-iteration declaration of the next bounded slice by the agent that performed the work.
6. For #2055, there is no final head, green implementation, complete CI, live proof, or final risk/rollback statement because the iteration is intentionally incomplete.

### Required instruction to the implementation agent

Before unrelated work, update the active implementation PR with one complete handoff containing:

- exact base and final head SHA;
- branch and PR;
- goal, what, how, and why;
- exact owner, command/query rails, ports, adapters, contracts, and files;
- user-visible behaviour;
- red-first and green execution evidence, clearly separated from claims;
- exact CI and live/integration links;
- security, integrity, observability, compatibility, and rollback posture;
- unresolved risks and deviations;
- the next bounded iteration or `NONE`.

## 3. Claim-to-evidence matrix

| Claim | Evidence inspected | Status | Decision |
|---|---|---|---|
| `main` is still release `0.5.3` at `8c098d6...` | current commit search | VERIFIED | no release delta |
| #2040 still closes the silent graph-SQL overwrite path | diff, policy, publisher, Code read-only posture, protected Cypress path | VERIFIED on branch | not yet in `main` |
| #2040 CI is green | six completed workflow runs on `6257745...` | VERIFIED | technically ready subject to delivery closeout |
| #2040 has no unresolved review thread | review-thread query | VERIFIED | legacy-compatibility thread remains resolved |
| a complete implementer handoff exists | reviewer-created retrospective comment only | NOT PROVEN | `DELIVERY-HANDOFF-MISSING` |
| compatibility migration for pre-marker data is required | no deployed dataset, merged preservation contract, or product-owner obligation | CONTRADICTED | DISPROVED / OUT OF SCOPE |
| PR #2030 reconciliation defect remains active | merged fix on `main`, closed Planning DB records | CONTRADICTED | fixed; do not reopen |
| complete preflight makes publication atomic | sequential write loop and red test | CONTRADICTED | active P1 |
| #2055 proves partial publication through real governed tests | failing Web Test Suite and exact red assertion | VERIFIED | red proof is valid |
| #2055 implements the green transaction | no runtime implementation beyond #2040 plus red test | CONTRADICTED | do not merge |
| exact project revision identity is implemented | Planning DB bootstrap keeps `GAP-DBT-RECONCILIATION-EXACT-PROJECT-REVISION` open | NOT PROVEN | remains in atomic-publication slice |
| #2059 changes only instructions/documentation | seven changed documentation/instruction files; no runtime paths | VERIFIED | governance-only proposal |
| #2059 is current authority | draft is unmerged while `DELIVERY_CONTROL.md` says `Status: Active` | CONTRADICTED | must be `Proposed` or effective upon merge |
| #2059 defines deterministic Planning DB operate→Git bootstrap/recovery | no complete lifecycle in the current document | NOT PROVEN | blocking governance correction remains |
| current product sequence changed legitimately | no new `main`, Planning DB bootstrap, ADR, or merged authority change | NOT PROVEN as changed | sequence remains unchanged |
| live Planning DB was queried directly in this cycle | no direct Planning DB connector/runtime is available in this automation | NOT PROVEN | repository-backed bootstrap inspected; limitation disclosed |

## 4. Material delta

### Delta since the previous cycle

```text
NONE
```

The following values are unchanged:

- `main@8c098d6e35ce874efae81609814d99e8e60091f7`;
- #2040 head `6257745ed1ec91f1a1415585d24e319905966931`;
- #2055 head `58fb694ce7602d5ae3942b5ff83881e2c3e7ec43`;
- #2059 head `6a6b1847b6e4886605ccbe97290bad1bdb108190`;
- #2040 six green workflows;
- #2055 Test Suite failure and other green checks;
- #2055 one unresolved P1;
- #2059 draft state and governance correction comment;
- release `0.5.3`.

No runtime, contract, migration, dependency, accessibility, performance, security, recovery, or product-documentation implementation changed.

## 5. Finding disposition

### Fixed

#### F-2030 — pending reconciliation receipt truth

- Status: FIXED on `main`.
- Do not reopen.
- Local receipt correlation and navigation retry were implemented and the local gaps closed.
- Exact whole-project identity intentionally remained assigned to `E-WEB-DBT-ATOMIC-PUBLICATION-1`.

#### Run operational truth normalization

- Status: FIXED on `main` through PR #2035.
- No new evidence contradicts the previous closeout.

### Active

#### P1 — graph-derived dbt publication is not atomic

**Evidence**

The #2040 publisher completes all preflight reads but then performs one `saveFileContent` call per prepared artifact. The #2055 red test applies the first mutation and injects failure on the second. The first file remains changed.

**Impact**

The workspace can represent no valid project revision:

- some generated files belong to the new graph projection;
- others remain on the old content set;
- Preview is rejected or absent;
- reopen can observe a hybrid project;
- retry semantics are ambiguous without one operation receipt.

**Owner**

- Application transaction owner: graph-derived dbt project publication command in API.
- Web owner: `DbtGraphWorkspaceArtifactPublisher` for projection/preflight policy only.
- Persistence owner: existing `IWorkspaceFileBatchMutationPort` and `LocalWorkspaceFileBatchMutationGateway`.
- Analysis owner: existing `ProjectDbtGraphFromFiles`.

#### P1 — exact publication, analysis, Preview, and Run identity is not bound

The current repository-backed Planning DB closeout explicitly keeps `GAP-DBT-RECONCILIATION-EXACT-PROJECT-REVISION` open under `E-WEB-DBT-ATOMIC-PUBLICATION-1`.

A file save receipt or a later refetch is not a whole-project identity. The next command must return the exact content-set and analysis hashes used for Preview/Run admission.

#### P1 follow-on — workspace capability truth

Still behind the current transaction slice:

- list truncation at 500 files without explicit partial/cursor posture;
- file-size and invalid-path concerns conflated;
- dbt compatibility limits not represented as honest diagnostics.

#### P2 — cohesive authoring recovery

Current file synchronization supports revision conflict and navigation flush behaviour, but there is no demonstrated durable crash-recovery journal for unsaved authoring state.

#### P2 — product-wide quality gates

The repository has strong governance and Engine coverage enforcement, but equivalent product-wide Web/API coverage, accessibility, bundle-size, and large-graph performance ratchets remain incomplete.

### Superseded

- Repeated review-only PRs #2058 and #2060 are superseded as current review surfaces by this report, but remain unmerged Git history.
- The former `dvt-product-priority-execution-guide-20260721.md` remains absent from `main` and is not authority.
- Any proposal to create a second dbt-specific file repository or generic browser batch command is superseded by existing batch-mutation semantics.

### Disproved / out of scope

- Legacy pre-marker migration or version negotiation: DISPROVED.
- Keyed signature or secret marker requirement: OUT OF SCOPE; the marker is an integrity mechanism, not authentication.
- Reopening #2030: DISPROVED.
- Browser compensation as atomicity: DISPROVED.
- Red-only PR as product completion: DISPROVED.

## 6. Deviation review

### Blocking deviation A — active product path is fragmented

**What is wrong**

The current result spans:

- #2040 for SQL authority containment;
- #2055 for the red atomicity proof;
- no green implementation branch yet;
- several review-only PRs.

**Why it matters**

The intended transaction cannot be reviewed as one coherent user result, and #2055 currently displays the full dependency diff because #2040 is unmerged.

**Correction**

1. Close #2040 through normal review/merge after its delivery handoff is made explicit.
2. Rebase or refresh #2055 after #2040 integrates.
3. Implement the green server-owned publication command on #2055’s active path, preserving the exact red test.
4. Keep the P1 thread open until the final head is green.

**Must not introduce**

- another red PR;
- a parallel implementation PR;
- a generic browser batch route;
- React compensation/rollback;
- a second workspace repository;
- a dbt-specific synonym for an existing file command without a product command owner.

### Blocking deviation B — #2059 declares unmerged authority active

**Evidence**

`DELIVERY_CONTROL.md` on #2059 says:

```text
Status: Active
Effective date: 2026-07-25
```

while #2059 remains an unmerged draft.

**Correction**

Use `Status: Proposed` and `Effective: upon merge`, or add an unmistakable draft banner. After merge, update the same canonical file; do not create a closeout/status document.

### Blocking deviation C — Planning DB operational writes are not yet connected to deterministic Git recovery

**What is wrong**

#2059 correctly forbids feature/design/status/evidence migrations and requires normal Planning DB write rails, but it does not complete:

```text
operate
→ deterministic current-state export/bootstrap update
→ commit on active PR
→ clean reset/import
→ query same active IDs/status/relations
→ planning/governance check and export drift check
```

**Why it matters**

Without this, local Planning DB truth can become ephemeral and unreconstructable for CI or another agent.

**Correction**

Document and prove the existing lifecycle without adding a journal, database dump, feature migration, or parallel YAML authority. A missing command capability is a command-rail implementation gap, not permission for direct SQL status migrations.

## 7. Corrective implementation instruction — atomic publication

### What is wrong

Graph-derived dbt artifact publication owns a transaction but executes per-file browser commands. A later conflict can leave earlier files committed.

### Source evidence

- #2040: `apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.ts`.
- #2055: red test in `dbtGraphWorkspaceArtifactPublisher.test.ts`.
- unresolved P1 review thread on #2055.
- existing batch infrastructure in API.
- Planning DB task `E-WEB-DBT-ATOMIC-PUBLICATION-1` and open exact-revision gap.

### Why it matters

Atomicity is required before Preview, Run, reopen, recovery, and workspace capability improvements can have trustworthy project identity.

### Exact owner

Introduce or complete one **product-specific application command owner** for graph-derived dbt project publication. The API command owns transaction orchestration; Web owns projection and user feedback; the existing gateway owns multipath persistence.

### Required implementation using existing semantics

1. Web builds the complete graph-derived artifact proposal and performs pure authority/divergence classification.
2. Web sends one bounded command request containing:
   - scoped canvas/project/environment identity;
   - all paths and proposed content;
   - all expected absent/content-SHA revisions;
   - deterministic idempotency key or operation identity.
3. API validates path count, path uniqueness, allowed project root, bounded content size, and request schema.
4. API invokes `IWorkspaceFileBatchMutationPort.apply(...)` once.
5. Any conflict returns typed conflict detail and commits zero paths.
6. On success, API verifies the returned write receipt.
7. API invokes `ProjectDbtGraphFromFiles` against the published project.
8. API returns a versioned publication receipt containing:
   - operation/receipt ID;
   - request hash;
   - deduplicated posture;
   - written paths and content hashes;
   - `projectContentSetSha256`;
   - `analysisSha256`;
   - no SQL/YAML bodies.
9. Preview accepts only the exact publication identity.
10. Run accepts only the Preview identity or requires a new Preview after any content-set change.

### Likely files/components

Exact names must follow current Planning DB/repository lookup. Likely surfaces include:

- `packages/@dvt/contracts/src/contracts/...` for the bounded command/receipt contract;
- `apps/api/src/application/services/...` for the command;
- `apps/api/src/application/ports/workspaceFiles.ts` reuse only;
- `apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.ts` reuse only;
- protected HTTP route group/adapter following existing scoped route patterns;
- `apps/web/src/app/ports/workspace.ts` for a product-specific publication command port;
- Web API adapter;
- `dbtGraphWorkspaceArtifactPublisher.ts` to remove per-file mutation ownership;
- Canvas plan action to carry the receipt into Preview;
- existing `ProjectDbtGraphFromFiles` and Preview/Run identity components;
- Planning DB active design/task records through the accepted write/export lifecycle, not feature migrations.

### Red tests

1. Existing #2055 red test: second path fails; all original bytes remain.
2. API command: conflict on any expected path writes zero files and returns all relevant conflicts.
3. Same idempotency key plus same request returns the same receipt.
4. Same key plus different request fails closed.
5. Duplicate or unbounded paths fail before mutation.
6. Analyzer failure after publication has an explicit, truthful receipt/recovery posture; it must not pretend publication failed if bytes committed.
7. Preview rejects an identity not equal to the publication receipt.
8. Run rejects or requires re-preview after content-set drift.
9. Logs and error envelopes contain operation IDs, paths, hashes, and codes, never file bodies.

### Green proof

- focused contract, API application, gateway integration, Web unit, and Canvas integration suites;
- full governed CI on final head;
- protected browser proof:

```text
Canvas edit
→ Preview action
→ one atomic publication request
→ exact receipt
→ ProjectDbtGraphFromFiles
→ Preview admitted with matching hashes
→ Run admitted with same identity
→ reopen shows same project identity
```

- injected conflict proves zero mutations and no Preview/Run;
- idempotent retry proves one logical operation.

### Acceptance criteria

- all artifacts or none;
- no browser transaction loop;
- no duplicate rail or repository;
- immutable receipt with exact hashes;
- Preview and Run bound to the receipt identity;
- no secret/file content leakage;
- red test becomes green unchanged in meaning;
- P1 thread resolved only after final evidence;
- complete implementation-agent handoff published.

### Rollback

- Before merge: close/revert the branch.
- After merge: revert the product command and Web integration as one release unit.
- Do not attempt browser compensation.
- Persisted operations remain auditable by receipt ID and hashes.

### Observability

Emit bounded structured signals for:

- publication started/completed/conflicted/deduplicated;
- operation and receipt ID;
- scope identifiers permitted by current logging policy;
- path count and paths where allowed;
- request/content-set/analysis hashes;
- elapsed time and failure code;
- never SQL/YAML bodies or credentials.

### Security and integrity

- retain protected tenant/project/environment authorization;
- canonicalize and validate all paths server-side;
- reject traversal, absolute paths, duplicate paths, unsupported roots, excess path count, and excess total bytes;
- use CAS for every affected path;
- bind idempotency key to request hash;
- never include `profiles.yml` credentials or secret material in portable receipts/logs;
- fail closed on unknown external content.

### Why this restores the intended route

It turns the graph-to-files boundary into one product transaction and creates the exact project identity needed by analysis, Preview, Run, reopen, recovery, and later workspace capability truth. It reuses the existing batch gateway rather than inventing infrastructure.

## 8. CI and review-thread state

### #2040 — `6257745ed1ec91f1a1415585d24e319905966931`

- Contracts & Determinism: success
- Dependency Review: success
- Test Suite: success
- CI Code Quality: success
- CodeQL: success
- PR Quality Gate: success
- Unresolved threads: 0
- Recently resolved threads: 1 legacy-compatibility thread, correctly disposed as unsupported pre-product preservation.

### #2055 — `58fb694ce7602d5ae3942b5ff83881e2c3e7ec43`

- CodeQL: success
- Contracts & Determinism: success
- Dependency Review: success
- CI Code Quality: success
- PR Quality Gate: success
- Test Suite: failure, intentionally demonstrating the active atomicity defect
- Unresolved threads: 1 P1 on sequential publication

### #2059 — `6a6b1847b6e4886605ccbe97290bad1bdb108190`

- PR Quality Gate: success
- CI Code Quality: success
- Product workflows: skipped due documentation/instruction-only scope
- Inline review threads: 0
- One top-level Fowler correction comment remains unaddressed by code/head changes.
- Repository-local `docs:sync`, governance refresh, and `verify:prepush`: explicitly not executed from the connector environment.

## 9. Planning DB and sequencing authority

### Repository-backed evidence

The merged migration `768_dbt_code_reconciliation_race_closeout.sql` asserts that:

- local reconciliation races are closed;
- exact project revision identity remains governed by `E-WEB-DBT-ATOMIC-PUBLICATION-1`;
- `GAP-DBT-RECONCILIATION-EXACT-PROJECT-REVISION` must remain open;
- no parallel command/query rail may be introduced.

ADR-0060 and the accepted dbt round-trip plan continue to require explicit authority, atomic adoption/publication, exact project identity, and Preview/Run provenance.

### Limitation

This automation has GitHub repository access but no direct connector to the live Planning DB instance. Therefore:

- versioned/bootstrap Planning DB sources were inspected;
- open PR Planning DB changes were inspected;
- a fresh live SQL query was not executed;
- no claim of direct live-DB verification is made.

A direct live query remains required before the implementation agent finalizes ownership or creates any new command/component.

### Current sequence

No legitimate authority change was found. The order remains:

1. model SQL authority — implemented on #2040 branch, not yet in `main`;
2. atomic project publication and exact revision identity — active, red proof on #2055;
3. workspace capability truth;
4. cohesive authoring recovery;
5. product-wide quality gates;
6. later differentiation.

## 10. Product comparison

The comparison is unchanged because no product code changed.

### dbt Cloud / Studio

DVT is moving toward a credible graph-and-code authoring transaction but still lacks the decisive professional invariant: a whole dbt project revision that is atomically published, analyzed, previewed, run, and reopened. Until that exists, the UI is not yet comparable to an IDE-backed dbt workflow for change integrity.

### Dagster

DVT has graph concepts and operational execution surfaces, but asset identity, checks, lineage/freshness posture, and revision-bound materialization evidence are not yet as cohesive. Those are later differentiation, not a reason to defer transaction correctness.

### Airflow

Airflow’s versioned bundle principle highlights DVT’s current gap: a run should consume one complete version of workflow/project code. DVT still lacks that exact whole-project binding for this vertical.

### Prefect

Prefect-style deployment/version promotion and rollback semantics require a stable code identity. DVT’s publication receipt must become that stable admission identity before promotion/rollback UX is meaningful.

### NiFi

DVT’s visual composition is directionally comparable, but version control should remain Git/IDE-compatible rather than creating a proprietary flow registry or another project definition.

### Temporal

Temporal provides durable workflow execution, but it does not automatically make the authoring/publication transaction durable. DVT must separately own idempotent publication and exact input identity before starting durable execution.

### Professional IDE and version-control workflows

Professional workflows distinguish:

- editor buffer;
- working tree;
- saved bytes;
- conflict;
- staged/committed revision;
- diff;
- rollback/revert;
- run against a known revision.

DVT has improved saved-byte conflict truth and graph-owned read-only posture, but the dbt project still lacks one whole-project publication/analysis/run revision. That remains the primary credibility gap.

## 11. Priority impact

No priority change.

Do not divert the active branch into:

- workspace pagination;
- recovery journal;
- broad accessibility refactor;
- performance tuning;
- asset/freshness differentiation;
- proprietary version registry;
- legacy migration;
- more review-only product paths.

Those remain valid later concerns, but the next product increment must close the atomic publication transaction.

## 12. Next implementation slice

### Slice name

`E-WEB-DBT-ATOMIC-PUBLICATION-1 — server-owned atomic publication and exact revision identity`

### One bounded goal

Make the existing #2055 red test green by replacing browser per-file publication with one protected, idempotent API command that returns and propagates the exact project and analysis identity used by Preview and Run.

### Required sequence

```text
close/merge #2040
→ rebase/consolidate #2055
→ design exact command/receipt against live Planning DB
→ contract tests red
→ API application/gateway integration red
→ Web publisher integration red
→ implement one batch mutation
→ analyze exact published content set
→ bind receipt to Preview/Run
→ protected browser proof
→ full CI green
→ resolve P1
→ implementer handoff
```

## 13. Required end-of-slice implementation report

The implementation agent must post one `## Iteration Handoff` on the active product PR containing:

### Identity

- exact base SHA;
- exact final head SHA;
- branch and PR links;
- Planning DB task/design/dependency IDs and exact live query used.

### Goal and result

- user/system result;
- previous defect;
- final invariant;
- what changed, how, and why.

### Ownership and mechanics

- exact domain owner;
- command/query names;
- contracts and schema versions;
- ports and adapters reused;
- transaction and idempotency boundary;
- paths/files touched;
- current-state Planning DB records updated through the accepted command/export/rebuild lifecycle.

### User-visible behaviour

- success;
- conflict;
- retry/deduplication;
- analysis failure;
- stale Preview/Run;
- reopen posture.

### Executed evidence

Separate claims from executed evidence:

- red-first commands and observed failure summaries;
- green commands and outputs;
- exact CI run links;
- protected browser/integration proof;
- negative conflict/idempotency/security/logging proof.

### Operational posture

- security;
- data integrity;
- observability;
- performance/input bounds;
- rollback/revert;
- compatibility decision with concrete obligation or `OUT OF SCOPE`;
- residual risks;
- deviations from design;
- next iteration or `NONE`.

## Final Fowler assessment

The architecture direction is clear enough. More analysis is not the bottleneck.

The bottleneck is delivery discipline:

- #2040 is still unmerged despite green evidence;
- #2055 proves the next defect but contains no green command;
- #2059 proposes one-path control but is not active and does not yet close Planning DB durability;
- review-only PRs continue because the active automation explicitly requires them.

The correct move is not another abstraction. It is to finish one server-owned, revision-bound dbt publication transaction and prove it end to end.
