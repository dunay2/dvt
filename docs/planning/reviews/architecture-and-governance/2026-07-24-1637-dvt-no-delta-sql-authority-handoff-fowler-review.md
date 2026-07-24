---
title: DVT current-state Fowler review — SQL authority handoff still missing
status: Review
reviewed_repository: dunay2/dvt
reviewed_main_sha: 8c098d6e35ce874efae81609814d99e8e60091f7
reviewed_at: 2026-07-24T16:37:00+02:00
scope: documentation-only current-state review
---

# DVT current-state Fowler review

## 1. Executive verdict

There is no material repository delta since the preceding review cycle.

`main` remains exactly at:

```text
8c098d6e35ce874efae81609814d99e8e60091f7
chore(main): Release 0.5.3 (#2037)
```

The only functional pull request remains:

- PR #2040 — `fix(web): Prevent graph preview from overwriting DBT model SQL`
- head `6257745ed1ec91f1a1415585d24e319905966931`
- base `main@8c098d6e35ce874efae81609814d99e8e60091f7`
- one commit, 24 changed files, `+2766/-57`
- mergeable, not draft
- six standard workflows successful
- zero unresolved inline review threads

The implementation agent still has not supplied the required complete iteration handoff.

```text
DELIVERY-HANDOFF-MISSING
```

PR #2040 has no newly demonstrated runtime blocker. Its remaining blocker is delivery auditability: a complete `## Iteration Handoff` is absent.

The previous compatibility concern remains disproved. DVT is pre-product and no merged contract, deployed dataset, release guarantee, or product-owner decision requires preservation of pre-marker development artifacts.

After the handoff and normal closeout of #2040, the next product slice remains atomic multi-file publication plus exact project-revision identity. No legitimate Planning DB authority change was found.

## 2. Sources inspected

Repository evidence was checked against the exact refs named below.

### Repository and pull-request state

- `main@8c098d6e35ce874efae81609814d99e8e60091f7`
- PR #2040 metadata, body, discussion and review thread state
- PR #2040 workflow runs on `6257745ed1ec91f1a1415585d24e319905966931`
- open PR inventory
- recent commit history

### Functional implementation

- `apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.ts`
- `apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.ts`
- `apps/web/src/app/views/canvas/canvasPlanAction.ts`
- `apps/web/src/app/views/code/codeWorkspaceFileEditPosture.ts`
- `apps/web/src/app/views/code/CodeWorkspaceFileSurface.tsx`
- `apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts`
- `apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts`

### Existing atomic authority

- `apps/api/src/application/ports/workspaceFiles.ts`
- `apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.ts`
- `apps/api/src/infrastructure/workspaceFiles/localWorkspaceFileBatchMutationModel.ts`
- `apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileMutationCoordinator.ts`

### Architecture and Planning DB

- `docs/adr/ADR-0060-dbt-project-authoring-authority.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md`
- migrations `797`, `798`, and `799` on PR #2040
- existing task identity `E-WEB-DBT-ATOMIC-PUBLICATION-1`

### Capability, recovery and quality checks

- `apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts`
- current Web HTTP client boundary
- current Code navigation/unload protection
- root CI and coverage commands
- current run-list query/store behavior

No local test execution is claimed by this review. Existing source, workflow and submitted evidence are distinguished from execution performed by this reviewer.

## 3. Current repository state

### 3.1 Main

No commit has entered `main` after release `0.5.3`.

The exact squash SHA has no pull-request workflow runs exposed through the connector. This does not mean the release is untested; it means the visible green evidence remains attached to the contributing pull-request heads and release candidate head rather than the final squash SHA.

### 3.2 Open pull requests

At review start there were two open pull requests:

1. PR #2040 — functional SQL-authority containment.
2. PR #2053 — the previous documentation-only current-state report.

No other functional or release pull request was visible.

### 3.3 Release state

The current published repository state is `0.5.3`.

There is no pending release PR. No release/governance expansion is required before the next functional slice.

### 3.4 Relevant branch work

The only relevant functional branch remains:

```text
fix/dbt-model-sql-authority-containment
```

Its head has not moved since the previous cycle.

## 4. Implementation handoff audit

### 4.1 Result

```text
DELIVERY-HANDOFF-MISSING
```

### 4.2 What PR #2040 does provide

The PR body provides:

- root cause;
- summary of changes;
- four validation command names;
- branch, base and head identity through PR metadata;
- a statement that hooks, checks and runtime paths were not bypassed.

The repository provides additional reconstructable evidence:

- exact changed files;
- code and tests;
- Planning DB migrations;
- six successful standard workflows;
- protected Cypress flow source;
- resolved review-thread disposition.

### 4.3 Missing handoff fields

The following required fields are not consolidated in a complete implementation-agent handoff:

1. exact base SHA and final head SHA inside the handoff;
2. explicit iteration goal and accepted Planning DB task/design identity;
3. exact statement of what changed;
4. exact statement of how it was implemented;
5. why this design was selected over alternatives;
6. exact DDD/domain owner per changed boundary;
7. complete command/query rail inventory;
8. complete port inventory;
9. complete adapter inventory;
10. complete contract inventory;
11. complete migration and changed-file inventory;
12. user-visible before/after behavior;
13. tests observed failing before implementation;
14. tests observed passing afterward;
15. direct workflow-run links on the exact final head;
16. direct live-browser/integration proof link or artifact reference;
17. security posture;
18. data-integrity posture;
19. observability posture;
20. compatibility posture, explicitly noting the pre-product decision;
21. rollback posture;
22. residual risks;
23. deviations from the approved route;
24. recommended next bounded iteration.

### 4.4 Required handoff location

The implementation agent must add one top-level PR conversation comment headed exactly:

```markdown
## Iteration Handoff
```

A body update is acceptable only if it contains the complete contract and clearly distinguishes claims from executed evidence. The existing PR body does not.

## 5. Claim-to-evidence matrix

| Claim | Status | Evidence | Review conclusion |
| --- | --- | --- | --- |
| PR identity, base and head are known | VERIFIED | PR #2040 metadata | Exact and stable. |
| The iteration addresses graph-derived SQL overwrite | VERIFIED | PR body, policy, publisher and plan-action tests | The selected user transaction matches the approved priority. |
| Graph-managed SQL has deterministic payload-integrity marking | VERIFIED | `dbtGraphModelSqlPublicationPolicy.ts` | Marker validates exact payload equality; it does not authenticate the creator. |
| Divergent unmarked SQL is rejected before writes | VERIFIED | policy and publisher | The conflict is produced during global preflight. |
| Malformed or mismatched marker is rejected | VERIFIED | parser/policy tests | Fail-closed behavior is present. |
| Current revisions are captured during preflight | VERIFIED | publisher `PreparedArtifact.expectedRevision` | Later reads do not redefine the CAS expectation. |
| Every artifact completes preflight before first write | VERIFIED | `Promise.all` preflight followed by conflict search | Correct containment boundary. |
| Graph-owned Project Code is read-only | VERIFIED | edit-posture and file-surface code/tests | Prevents a second browser-owned writer. |
| File-authoritative dbt projects remain editable | VERIFIED | posture logic and tests | Authority modes remain distinct. |
| External SQL survives rejected Preview byte-for-byte | VERIFIED | protected Cypress flow source | Executed run is asserted by PR body but no direct artifact/log link is in a handoff. |
| Live browser proof is directly auditable | PARTIAL | Cypress source and command name | Missing direct workflow/artifact/log link in an implementation handoff. |
| Six standard workflows pass on final head | VERIFIED | exact-head workflow runs | Contracts, dependency review, tests, quality, CodeQL and PR gate all succeeded. |
| No unresolved inline thread remains | VERIFIED | review-thread query | One thread exists and is resolved. |
| Pre-marker migration is required | DISPROVED | product-owner decision and no preservation contract | Do not add legacy migration semantics. |
| Publication is atomic across all files | CONTRADICTED | publisher loops over individual `saveFileContent` calls | Global preflight is not atomic commit. |
| Preview and Run are bound to one exact project content set | NOT PROVEN | current controller ignores the save receipt | Latest refetch can represent another project revision. |
| Tests were written and observed red first | NOT PROVEN | no handoff chronology | Test files alone do not prove red/green order. |
| Rollback is documented | NOT PROVEN | no handoff | Revert is likely sufficient because DVT is pre-product, but it is not stated. |
| Security and observability limits are documented | PARTIAL | migrations and code | No consolidated threat/telemetry statement. |
| Iteration handoff is complete | NOT PROVEN | PR body and comments | It is absent. |

## 6. Previous findings disposition

### 6.1 Fixed on main

- PR #2030 reconciliation receipt race: fixed and must not be reopened.
- PR #2035 non-terminal run materialization divergence: fixed.
- release-governance defects that blocked `0.5.0`–`0.5.3`: fixed for current operation.

### 6.2 Verified on branch, not yet on main

- graph-draft model SQL overwrite containment;
- graph-owned file read-only posture;
- global preflight before graph artifact publication;
- localized conflict response;
- protected live external-SQL preservation flow.

These are not product facts on `main` until #2040 is integrated.

### 6.3 Still active

1. multi-file graph artifact publication is sequential;
2. publication receipt is not bound to exact project content-set and analysis identity;
3. `WorkspaceFileSaveReceipt` is ignored during file-backed reconciliation;
4. workspace inventory truncates silently;
5. oversize files are reported as invalid paths;
6. run-list pagination remains incomplete and cursor semantics remain defective;
7. generic Web HTTP response casting remains insufficient for new sensitive endpoints;
8. buffer recovery is not durable after process/browser loss;
9. root product-quality ratchets remain uneven across Engine, Web and API;
10. accessibility, bundle and large-graph performance gates remain later work.

### 6.4 Disproved

- support or migration for a deployed population of pre-marker graph artifacts;
- requirement for marker signing, secrets or a new cryptographic authority boundary;
- reopening the #2030 reconciliation defect.

### 6.5 Superseded

All older point-in-time review PRs are historical evidence only. They are not current planning authority. Planning DB, accepted ADRs and the current source remain authoritative.

## 7. Fowler-style review of PR #2040

### 7.1 Positive design decisions

#### Separated policy

`classifyGraphModelSqlPublication` is a pure policy function. It prevents route code from owning marker parsing, equality and conflict rules.

This reduces primitive conditional logic in `canvasPlanAction` and gives the authority decision a named owner.

#### Preflight before mutation

`publishGraphDbtWorkspaceArtifacts` reads/classifies every artifact before the first save. This closes the previous behavior where Preview could begin rewriting before discovering a later SQL conflict.

#### CAS expectation stability

The publisher stores the revision observed during preflight in each prepared artifact. It does not issue a second read immediately before saving and pretend that separate reads form a transaction.

#### Presentation follows authority

Graph-owned SQL is shown through a viewer, not an editor. File-authoritative projects retain an editor. This matches professional IDE behavior: read-only/generated files and editable source files are different postures.

#### Scope discipline

The branch does not attempt atomic publication, workspace pagination, recovery or a new Git lifecycle. That is correct for this slice.

### 7.2 Remaining smells

#### Test-only confidence risk

Planning DB marks the design and components implemented and inserts pass evidence. CI is green, but the implementation handoff does not link the exact live execution artifact. This is not evidence of a product bug, but it weakens auditability.

#### Delivery amplification

A contained SQL-authority vertical changes 24 files and adds three Planning DB migrations. Much of this is justified by tests, localized copy, architecture ownership and live proof. Nevertheless, future slices should avoid adding more governance rows unless they enforce a real boundary rather than repeat prose already present in code and tests.

#### Partial transaction

The new publisher has transaction-shaped responsibilities—preflight, conflict detection, expected revisions and publication—but its commit phase remains a browser-side sequence of single-file commands. This is the clearest active Fowler smell: a transaction coordinator without an atomic transaction boundary.

#### Hidden latest-state authority

The file-backed Canvas controller accepts a save receipt but discards it and asks for the latest graph projection. The receipt-to-analysis relationship is hidden rather than modeled.

## 8. Security, integrity and operability

### 8.1 Marker security

The marker is an unkeyed SHA-256 integrity check. It can detect when declared payload and actual payload differ. It cannot authenticate origin, ownership or actor identity.

Correct posture:

- do not log SQL bodies;
- do not describe the marker as a signature or trust boundary;
- do not introduce secrets or signing in this slice;
- continue using explicit Canvas authority plus governed file path as ownership context;
- fail closed on malformed/divergent content.

### 8.2 Data integrity

PR #2040 improves per-file integrity by preserving observed CAS revisions and stopping before the first write when preflight discovers a conflict.

It does not guarantee project-level integrity. A conflict or filesystem failure during the sequential commit phase can leave a prefix of files changed.

### 8.3 Observability

The branch returns typed written paths or one conflicting path. This is adequate for the current user message but insufficient for the next atomic slice.

The next receipt must expose safe metadata only:

- idempotency key or operation identity;
- request hash;
- written path hashes;
- project content-set hash;
- analysis hash/freshness;
- conflict paths;
- deduplication status;
- duration and result category.

It must not expose SQL bodies, credentials, profiles or secrets.

### 8.4 Rollback

DVT is pre-product. No deployed data migration is required.

For #2040 the appropriate rollback is a Git revert of the single functional commit, followed by standard CI and protected-flow verification. The handoff must state this explicitly.

## 9. Capability and quality revalidation

### 9.1 Workspace truth

`LocalWorkspaceFileRepository` still:

- stops after 500 listed files;
- returns no cursor;
- returns no `complete | partial` indicator;
- maps files over 1 MB to `InvalidWorkspacePathError`;
- uses the same error for an oversize write.

This remains an authority and usability problem, but it is not the next slice until atomic publication is closed.

### 9.2 Run listing

The previous `ListRuns` pagination concerns remain open. They should not displace the accepted dbt-authoring sequence unless Planning DB explicitly reprioritizes them as a release blocker.

### 9.3 HTTP contracts

New publication/revision endpoints must validate runtime JSON using shared contract schemas. A TypeScript generic cast cannot be the trust boundary.

### 9.4 Recovery

Flush-before-navigation and `beforeunload` warnings are not durable recovery. A later cohesive authoring-session slice must own a local journal, restore policy and conflict posture.

### 9.5 Accessibility and performance

PR #2040 changes read-only/editable presentation and localized status copy. Its tests cover behavior, but product-wide accessibility and performance remain later gates:

- keyboard and screen-reader proof for Code/Canvas transitions;
- large project/graph budgets;
- payload and bundle budgets;
- long-running analysis feedback;
- cancellation and retry visibility.

## 10. Mature-system comparison

### 10.1 dbt Studio / Cloud IDE — match

DVT should match the basic contract: normal dbt files, integrated build/test/run, source-control-aware workflows and clear generated/source ownership.

DVT should not hide a project mutation behind a visual preview without showing conflict and revision state.

### 10.2 Professional IDE and Git — match

DVT should keep separate:

- editor buffer;
- working-tree file;
- semantic analysis;
- project revision;
- Preview receipt;
- Run receipt;
- Git staging/commit/push.

PR #2040 improves source/generated edit posture. The next slice must add project transaction and revision identity.

### 10.3 Airflow DAG Bundles — match reproducibility

Airflow versions all files needed by a DAG and permits a run to use the same bundle version even when source changes mid-run.

DVT should bind Preview and Run to one project content-set and analysis identity. It should not run against “whatever the latest refetch returned.”

Reference: https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/dag-bundles.html

### 10.4 Prefect — defer promotion history

Version history, promotion and rollback are valuable after DVT has one exact revision identity. They are not prerequisites for atomic publication.

### 10.5 Dagster — defer asset-level differentiation

Assets, checks, partitions, freshness and lineage remain later differentiation. They must not precede correct authoring authority and execution provenance.

### 10.6 Temporal — match durable identity principles

Use durable operation identities, idempotency and correlation. Do not insert a workflow engine into the editor simply to coordinate one atomic workspace transaction.

### 10.7 NiFi — differ

DVT should not create a parallel proprietary flow registry. Git and exact project receipts should remain the durable history boundary.

## 11. Required correction for the implementation agent

### 11.1 Blocking correction

Publish the complete `## Iteration Handoff` on PR #2040.

No new runtime code is currently required.

### 11.2 Required handoff content

The handoff must contain:

```markdown
## Iteration Handoff

### Identity
- base SHA
- final head SHA
- branch
- PR
- Planning DB task/design

### Goal
- user transaction
- defect/root cause
- accepted outcome

### What changed
- behavior
- files/components

### How
- domain owner
- command/query rails
- ports
- adapters
- contracts
- migrations

### Why
- selected design
- rejected alternatives
- no duplicate semantics

### Evidence
- tests observed red
- tests observed green
- exact workflow links
- exact live proof link/artifact

### Posture
- security
- integrity
- observability
- compatibility/pre-product
- rollback

### Residual risks
- sequential publication
- exact revision not yet bound
- any other demonstrated risk

### Deviations
- explicit none, or listed with disposition

### Next iteration
- atomic publication and exact revision only
```

### 11.3 Acceptance gate

- complete handoff exists;
- it references exact head `6257745ed1ec91f1a1415585d24e319905966931`;
- six workflows remain green on that head;
- live proof is directly linked or its exact workflow/job/artifact is identified;
- no unsupported legacy migration is introduced;
- atomic publication remains assigned to the next task;
- PR is then eligible for normal merge review.

## 12. Next implementation slice

### 12.1 Priority

```text
E-WEB-DBT-ATOMIC-PUBLICATION-1
```

### 12.2 User transaction

```text
graph-derived dbt artifacts prepared
-> all expected revisions captured
-> one server-owned batch mutation
-> immutable receipt
-> exact project content-set identity
-> fresh dbt analysis identity
-> Preview records that identity
-> Run consumes that identity
-> reopen reports exact, stale or conflict explicitly
```

### 12.3 Domain ownership

Primary owner:

```text
Workspace Project Publication / dbt Project Analysis
```

Collaborators:

- Canvas authoring orchestration;
- workspace-file storage;
- dbt analysis;
- Preview provenance;
- Run bundle construction.

The browser must not become the transaction owner.

### 12.4 Existing semantics to reuse

Reuse directly:

- `WorkspaceFileBatchMutation`;
- `WorkspaceFileBatchReceipt`;
- `WorkspaceFileBatchMutationResult`;
- `IWorkspaceFileBatchMutationPort`;
- `LocalWorkspaceFileBatchMutationGateway`;
- shared file-mutation coordinator;
- `ProjectDbtGraphFromFiles` / current dbt project analysis projection;
- existing Preview and StartRun provenance fields.

Do not create:

- a second workspace repository;
- a browser-visible generic batch filesystem API;
- compensating rollback loops in Web;
- a new DSL;
- a second project revision concept;
- a second dbt analyzer;
- SQL bodies in telemetry.

### 12.5 Application route

Extend the existing protected workspace mutation/application boundary in place. The application service must:

1. accept the complete intended artifact set;
2. require expected revisions for every affected path;
3. derive a stable idempotency key from the user operation identity;
4. call `IWorkspaceFileBatchMutationPort.apply` exactly once;
5. return all conflicts together;
6. on success, analyze the exact resulting project content set;
7. return one publication-and-analysis result;
8. fail closed if analysis does not correspond to the published content set.

### 12.6 Result shape

Do not duplicate the existing batch receipt. Wrap or project it into the product result with:

```ts
type DbtProjectPublicationResult =
  | {
      kind: 'published';
      batchReceipt: WorkspaceFileBatchReceipt;
      projectContentSetSha256: string;
      analysisSha256: string;
      freshness: 'fresh';
    }
  | {
      kind: 'conflict';
      conflicts: readonly {
        path: string;
        currentContentSha256: string | null;
      }[];
    }
  | {
      kind: 'analysis_failed';
      batchReceipt: WorkspaceFileBatchReceipt;
      projectContentSetSha256: string;
      diagnosticsRef: string;
    };
```

Before implementation, reconcile this shape with existing contract names and Planning DB design rows. Reuse an existing result if one already owns these semantics.

### 12.7 Red tests

1. conflict on the second path changes no file;
2. conflict on the last path changes no file;
3. failure injected during atomic replacement restores all originals;
4. same idempotency key plus same request returns the same receipt with `deduplicated=true`;
5. same key plus different request fails closed;
6. successful receipt contains every written path and content hash;
7. analysis uses the resulting exact content set, not a later filesystem read;
8. Preview rejects a mismatched project content-set hash;
9. Run rejects or requires re-preview after the project changes;
10. reopen reports exact/stale/conflict without silently switching authority;
11. logs and errors contain no SQL body, credentials or profile values;
12. Web and API validate the response through shared runtime schemas.

### 12.8 Green proof

Required suites:

- contracts tests;
- API application tests;
- batch gateway tests;
- API route tests;
- Web unit and presentation tests;
- architecture guards;
- protected live Canvas -> publish -> Preview -> Run -> reopen flow;
- Planning DB migration/integrity checks;
- full pre-push verification;
- all required GitHub workflows on exact final head.

### 12.9 Live proof

The protected live flow must demonstrate:

1. at least three artifacts are proposed;
2. a deliberately stale middle path returns conflict;
3. all files remain byte-identical after rejection;
4. retry with correct revisions publishes all artifacts once;
5. returned content-set and analysis hashes are recorded in Preview;
6. Run uses the same hashes;
7. modifying one file after Preview blocks StartRun or requires a new Preview;
8. reopening shows exact or stale posture correctly.

### 12.10 Rollback

Because DVT is pre-product:

- code rollback is Git revert;
- no legacy data migration is required;
- the gateway's atomic transaction directory must clean up after success and failure;
- persisted idempotency receipts must remain parseable for the current branch format only unless a support contract is introduced later.

### 12.11 Observability

Record safe structured events:

- publication requested;
- publication conflict count/path set;
- publication applied/deduplicated;
- batch request hash;
- project content-set hash;
- analysis hash and freshness;
- Preview revision match/mismatch;
- Run revision match/mismatch;
- duration and error category.

Never record SQL bodies or secrets.

### 12.12 Acceptance criteria

- no partial project state under conflict or injected failure;
- one canonical server-owned mutation boundary;
- one exact publication receipt;
- one project content-set hash;
- one correlated analysis hash;
- Preview and Run prove the same identity;
- stale state is visible and blocks unsafe execution;
- existing graph-draft and file-authoritative modes remain mutually exclusive;
- no duplicate command/query rail;
- complete iteration handoff is published.

## 13. Later priority order

After atomic publication and exact revision identity:

1. workspace capability truth and paginated inventory;
2. cohesive authoring recovery;
3. runtime validation for all sensitive Web/API responses;
4. Web/API coverage ratchets;
5. accessibility gates;
6. large-project and large-graph performance gates;
7. operability and failure-injection maturity;
8. assets, checks, freshness, partitions and collaboration differentiation.

## 14. Final decision

No new repository behavior was found in this cycle.

Do not fabricate another runtime defect to keep the branch active.

PR #2040 remains technically credible, mergeable and green. Its only currently demonstrated blocking requirement is the missing complete implementation handoff.

Once the handoff exists, close #2040 normally and begin the existing atomic-publication/exact-revision task without another release, dependency, governance or review detour.
