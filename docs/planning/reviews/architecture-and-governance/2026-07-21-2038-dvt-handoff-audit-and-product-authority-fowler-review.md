---
title: DVT implementation handoff audit and product-authority Fowler review
status: point-in-time-review
reviewed_repository: dunay2/dvt
reviewed_branch: main
reviewed_commit: 591a1ecde7a43fefa5206f55bb446dd84da5f2dc
reviewed_at: 2026-07-21T20:38:00+02:00
scope: architecture-and-governance
---

# DVT implementation handoff audit and product-authority Fowler review

## 1. Executive verdict

There is **no material repository delta since the previous review**.

The exact current `main` remains:

```text
591a1ecde7a43fefa5206f55bb446dd84da5f2dc
chore(main): Release 0.5.2 (#2023)
```

The release is complete, PR #2030 is merged, and the pending-reconciliation defect is fixed. There is no open functional pull request and no visible `fix/*` or `feat/*` branch carrying the next product slice. The only open pull requests before this review are documentation-only drafts #2032 and #2033.

The implementation handoff status for this cycle is:

```text
DELIVERY-HANDOFF-MISSING
```

No repository file, PR comment, or PR body headed `## Iteration Handoff` was found. The latest implementation PR, #2030, predates the new protocol and its body is not a complete handoff under the required contract. It explains the change and lists validation categories, but it does not provide the full claim/evidence, security, rollback, observability, compatibility, exact file inventory, red-test chronology, or unresolved-risk record now required.

This does **not** reopen #2030. Its product defect is fixed. It means only that the delivery iteration is not auditable under the newly adopted handoff standard.

The highest-priority product problem remains the cross-surface authority transaction between graph-authored model SQL and editable workspace SQL. The repository has already completed the narrower graph-internal `DbtModelArtifactProjection` consolidation. What remains is deciding and proving which representation is durable after graph output is materialized into files, preventing Project Code edits from being overwritten by stale graph state, and then publishing the resulting project revision atomically.

## 2. Reviewed evidence

### Repository and release

- Current main commit: <https://github.com/dunay2/dvt/commit/591a1ecde7a43fefa5206f55bb446dd84da5f2dc>
- Release PR #2023: <https://github.com/dunay2/dvt/pull/2023>
- Release tag: <https://github.com/dunay2/dvt/releases/tag/v0.5.2>
- Reconciliation fix PR #2030: <https://github.com/dunay2/dvt/pull/2030>
- Historical review threads on PR #1996: <https://github.com/dunay2/dvt/pull/1996>

### Current open pull requests

- #2032, point-in-time product-authority review: <https://github.com/dunay2/dvt/pull/2032>
- #2033, proposed iteration-handoff protocol: <https://github.com/dunay2/dvt/pull/2033>

Both are documentation-only drafts. Neither is a functional implementation branch.

### Governing repository sources

- `docs/adr/ADR-0060-dbt-project-authoring-authority.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md`
- `tools/planning-db/migrations/749_canvas_dbt_model_code_authority_design.sql`
- `tools/planning-db/migrations/750_canvas_dbt_model_code_authority_closeout.sql`
- `tools/planning-db/migrations/767_dbt_code_reconciliation_race_hardening.sql`
- `tools/planning-db/migrations/768_dbt_code_reconciliation_race_closeout.sql`
- `tools/planning-db/migrations/791_code_working_tree_receipt_precedence.sql`
- `apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.ts`
- `apps/web/src/app/views/canvas/canvasPlanAction.ts`
- `apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts`
- `packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts`
- `apps/api/src/application/ports/workspaceFiles.ts`
- `apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts`
- `apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.ts`
- `apps/web/src/app/services/api/createApiClient.ts`
- `apps/web/src/app/views/code/CodeWorkingTreeNavigationGuard.tsx`
- root `package.json`

## 3. Authority correction: the referenced stable guide is not on main

The recurring review instruction names:

```text
docs/planning/proposals/mandatory/frontend-and-ux/
dvt-product-priority-execution-guide-20260721.md
```

That path does not exist on current `main`. It was created only in draft PR #2031, then the PR was closed without merge because it would create a second point-in-time authority and because its first ordering placed atomic publication before the canonical model-SQL dependency.

PR #2031 disposition records the current order as:

1. `E-WEB-DBT-MODEL-SQL-AUTHORITY-1`
2. `E-WEB-DBT-ATOMIC-PUBLICATION-1`
3. `E-WEB-DBT-WORKSPACE-INVENTORY-TRUTH-1`
4. project-session and recovery work as dependency permits

### Status

**CONTRADICTED**: the automation references an absent, rejected guide as a source.

### Corrective instruction

The review process must use Planning DB, ADR-0060, the accepted dbt round-trip plan, and repository evidence as authority. A draft or closed Markdown guide may be used as historical rationale only.

The implementation agent must not recreate the same guide under a different filename. The proper correction is to claim and execute the canonical Planning DB task, then leave an iteration handoff that links the exact design and evidence rows.

## 4. Implementation handoff audit

### 4.1 Report discovery

Search targets:

- repository files containing `Iteration Handoff`;
- PR bodies and comments on recent implementation PRs;
- open functional PRs;
- recent branches carrying implementation work.

Result:

```text
No valid implementation handoff found.
```

PR #2030 is the last implementation iteration. Its summary is useful, but a PR body alone is insufficient unless it contains the complete handoff contract.

### 4.2 Claim-to-evidence matrix for PR #2030

| Required claim | Evidence located | Status | Review conclusion |
|---|---|---:|---|
| Exact base SHA | PR metadata identifies `dc307884...` | VERIFIED | Exact base is recoverable from GitHub metadata. |
| Exact final head SHA | PR metadata identifies `b601e193...`; merge commit is `8a39d19e...` | VERIFIED | Head and integrated main result are attributable. |
| Branch and PR | `fix/web-reconciliation-receipt-truth`, PR #2030 | VERIFIED | Delivery identity is clear. |
| Iteration goal | PR summary states receipt identity and precedence goals | VERIFIED | Goal matches the resolved P2. |
| What changed | Diff changes reducer, hook tests, and migration 791 | VERIFIED | Actual diff matches summary. |
| How implemented | Receipt matching replaces visible-phase admission; projection helpers preserve newer persistence state | VERIFIED | Source and tests support the mechanism. |
| Why this design | Reuses `SaveWorkspaceFileContent`; avoids a parallel persistence or analysis rail | VERIFIED | Migration 791 asserts the existing rail remains sole authority. |
| Exact domain owner | `SYS-WEB-CODE-WORKING-TREE-SYNC` and existing `SaveWorkspaceFileContent` rail | VERIFIED | Planning DB migration identifies owner and rail. |
| Commands and queries | Existing `SaveWorkspaceFileContent` plus background `ProjectDbtGraphFromFiles` | VERIFIED | No new rail introduced. |
| Ports and adapters | Working-tree presentation model and existing Web/API boundaries | PARTIAL | The PR does not provide a complete port/adapter inventory in one handoff. |
| Contracts | `WorkspaceFileSaveReceipt` correlation semantics | PARTIAL | Contract use is visible, but no explicit contract compatibility section exists. |
| Migrations | Migration 791 | VERIFIED | It closes the gap and mechanizes the new projection helpers. |
| Exact files touched | Four changed files are discoverable from GitHub | VERIFIED | Not stated as a handoff inventory, but externally verifiable. |
| User-visible behavior | Status no longer reports synchronized while matching reconciliation is pending | VERIFIED | Reducer and hook tests prove the sequence. |
| Tests written first | No chronology evidence | NOT PROVEN | Passing tests do not prove red-first order. |
| Tests passed | Six standard PR workflows succeeded; PR body lists focused and full Web evidence | VERIFIED | CI supports the final head. |
| Live browser/integration proof | PR body claims the protected DBT author/code/run Cypress vertical | PARTIAL | Command is named, but no linked artifact or run-level result is included in the handoff. |
| Security posture | No new authority or privileged rail introduced | PARTIAL | Security consequences are inferable, not documented as a handoff section. |
| Data-integrity posture | Older reconciliation cannot erase newer conflict/failure/in-flight state | VERIFIED | Negative tests and migration invariant prove this. |
| Observability | Existing state remains observable; migration records invariants | PARTIAL | No runtime signal or log evidence is linked. |
| Compatibility | Existing rail and receipt type are reused | PARTIAL | No explicit backward/forward compatibility matrix. |
| Rollback | Revert of one product commit is possible | NOT PROVEN | No rollback procedure or state consequence is documented. |
| Unresolved risks | Whole-project revision remains assigned elsewhere | PARTIAL | Migration history states this, but #2030 handoff does not enumerate it. |
| Deviations | No declared deviation section | NOT PROVEN | Absence of a declaration is not evidence of absence. |
| Recommended next iteration | Not stated in the required format | NOT PROVEN | Current route must be reconstructed from Planning DB and later review evidence. |

### 4.3 Delivery verdict

PR #2030 is technically validated and its defect is fixed. The handoff standard is nevertheless unmet.

The implementation agent must end the next functional iteration with a repository-linked `## Iteration Handoff` containing every required field. Until then, future review cannot reliably distinguish executed proof from narrative claims.

## 5. Material delta since the preceding review

There is none.

- `main` remains at `591a1ecde7a43fefa5206f55bb446dd84da5f2dc`.
- No new functional PR exists.
- No new implementation commit exists.
- No new review thread exists on open PRs.
- No `fix/*` or `feat/*` branch was visible through branch search.
- The only activity is documentation and process guidance in #2032 and #2033.

This cycle therefore does not invent another product finding. It revalidates the current route and adds the missing delivery-audit result.

## 6. CI, review threads, and release state

### 6.1 Main

The connector exposes no PR-triggered workflow run directly associated with squash merge SHA `591a1ec...`. This is an evidence-identity limitation, not evidence that CI failed.

### 6.2 Release 0.5.2

The release head `cd19b6d4...` completed successfully on:

- Dependency Review;
- CI - Code Quality;
- Contracts & Determinism;
- CodeQL;
- PR Quality Gate;
- Test Suite.

Release `v0.5.2` exists and PR #2023 is merged.

### 6.3 Open documentation PRs

PR #2032 head `473b6ee5...`:

- PR Quality Gate: success;
- CI - Code Quality: success;
- Test Suite, Contracts, CodeQL, Dependency Review: skipped because the change is documentation-only;
- review threads: none.

PR #2033 head `bc27fe00...`:

- PR Quality Gate: success;
- CI - Code Quality: success;
- Test Suite, Contracts, CodeQL, Dependency Review: skipped because the change is documentation-only;
- review threads: none.

### 6.4 Recently resolved threads

All three threads on PR #1996 are resolved:

1. unsaved edits while reconciliation is pending;
2. unsaved edits while a write is in flight;
3. edit → revert while reconciliation remains pending.

The third was resolved by #2030 and migration 791. It must not be reopened as an active defect.

## 7. Previous findings: current classification

| Finding | Current status | Evidence and correction |
|---|---|---|
| Pending reconciliation hidden after edit/revert | FIXED | #2030 admits completion by matching receipt and preserves newer persistence terminal states. |
| Flush approves unsaved edit during reconciliation | FIXED | Previous #1996 corrections remain integrated. |
| Flush approves unsaved in-flight edit | FIXED | Previous #1996 corrections remain integrated. |
| Duplicate graph-internal model SQL projection | FIXED within graph authority | Migrations 749/750 and `canvasDbtModelArtifactProjection.ts` centralize authored/generated graph model SQL. |
| Graph-authored SQL versus editable workspace SQL | STILL ACTIVE | Graph-first Preview can write artifacts from canonical graph state while Project Code can edit workspace files. No end-to-end authority transition is proven. |
| Sequential graph artifact publication | STILL ACTIVE | `canvasPlanAction.ts` loops over artifacts and calls `saveFileContent` separately. |
| Exact project revision after a file save | STILL ACTIVE | `useDbtProjectFileCanvasController.ts` accepts `_receipt` but ignores it and refetches latest project graph. |
| Workspace inventory completeness and size truth | STILL ACTIVE | list silently stops at 500; reads/writes reject files over 1 MB as invalid paths. |
| Generic frontend response cast | STILL ACTIVE | `createApiClient` returns `parsedBody as TResponse`. |
| Crash recovery for dirty authoring buffers | STILL ACTIVE | SPA navigation flush and `beforeunload` warning exist; durable journal recovery does not. |
| Engine-only root coverage ratchet | STILL ACTIVE | root `ci:full` runs `test:coverage:engine`; no equivalent root Web/API ratchet is visible. |
| Release 0.5.2 blocked or stale | FIXED | Release is merged and published. |
| Stable priority guide on main | DISPROVED | The named file is absent; its PR was closed without merge. |
| Valid iteration handoff exists | DISPROVED | No complete handoff report was found. |

## 8. Priority 0 — delivery handoff enforcement

### Severity

**P1 process integrity**. It does not break runtime behavior directly, but it prevents independent validation of implementation claims and makes architectural drift accumulate invisibly.

### Evidence

- no `## Iteration Handoff` report exists;
- #2033 is still an unmerged draft;
- #2030 lacks several mandatory handoff fields;
- current reviewers must reconstruct intent from PR body, diff, migrations, and later comments.

### Root cause

Delivery evidence is distributed across PR metadata, comments, Planning DB migrations, test commands, and source changes. No single iteration closeout binds claims to exact evidence.

### Product impact

- slower review;
- false confidence from passing tests without scope or live-path proof;
- difficulty detecting deviation before the next slice starts;
- repeated point-in-time review documents attempting to compensate for missing handoffs.

### Owner

Delivery Governance / Implementation Agent Closeout.

### Required correction

At the end of every functional PR, add a top-level PR comment headed:

```markdown
## Iteration Handoff
```

It must include:

- base SHA, final head SHA, branch, PR;
- Planning DB task/design identity;
- goal and user transaction;
- what changed, how, and why;
- domain owner;
- commands, queries, ports, adapters, contracts, migrations, files;
- user-visible behavior;
- red tests, green tests, CI run links, live proof;
- security, integrity, observability, compatibility, rollback;
- unresolved risks and deviations;
- next bounded slice.

### What must not be introduced

- a second operational task store in Markdown;
- a generic report generator before one real handoff is proven;
- a review document that claims implementation success without commit-level evidence.

### Red proof

A review test or manual checklist must fail when a functional PR lacks the heading or required fields.

### Green proof

The next functional PR contains a complete handoff and every material claim maps to code, test, CI, runtime evidence, or Planning DB source.

### Acceptance criteria

- no `NOT PROVEN` result for base/head, scope, tests, live proof, rollback, or unresolved risks;
- the review agent can reproduce the claim-to-evidence matrix without inference;
- unrelated work does not begin before the handoff exists.

## 9. Priority 1 — one durable model SQL authority across graph and files

### Severity

**P1 data-integrity and product-authority risk**.

### Evidence

`canvasDbtModelArtifactProjection.ts` correctly centralizes graph-internal SQL projection:

```text
metadata.modelSql -> authored body
otherwise -> generated body
models/<normalized-name>.sql
```

`canvasPlanAction.ts` then materializes graph-generated artifacts into workspace files through repeated `saveFileContent` calls.

The file-backed Canvas contract separately declares dbt project files as semantic authority and refuses fallback to graph-draft authority.

The missing transaction is the transition between these modes.

### Root cause

The repository solved two narrower problems independently:

- graph-first authoring has a single model artifact projection;
- file-backed Canvas has an explicit file authority binding.

It does not yet prove the ownership transition when graph-first output becomes editable workspace files.

### User impact

A user can reasonably believe that editing `models/x.sql` in Project Code changes the model. A later graph-first Preview may regenerate `models/x.sql` from stale graph metadata and overwrite that edit. The current per-file CAS prevents overwriting a revision that changed between read and write, but it does not define which side is semantically authoritative after materialization.

### Exact domain owner

- `CanvasAuthoringAuthorityBinding` owns authority mode;
- `DbtModelArtifactProjection` owns graph-derived model artifact semantics;
- workspace files own durable dbt source when binding is `dbt-project-files`;
- `ConfigureCanvasDbtNode` remains the graph-draft command before transition;
- `SaveWorkspaceFileContent` remains the file command after transition.

### Proposed domain objects

Reuse or extend existing semantics rather than creating a parallel editor model:

```ts
type DbtModelSqlAuthority =
  | { kind: 'graph-draft'; nodeId: string; draftRevision: string }
  | {
      kind: 'workspace-file';
      path: string;
      contentSha256: string;
      projectContentSetSha256: string;
    };
```

A typed transition result should bind:

```ts
type MaterializeDbtProjectResult = {
  authorityBinding: CanvasAuthoringAuthorityBinding;
  publicationReceipt: WorkspaceFileBatchReceipt;
  projectRevision: DbtProjectRevision;
  analysisSha256: string;
};
```

Names are illustrative. The implementation must first query Planning DB for approved object and rail names.

### Commands, queries, and ports

Do not invent a generic visual-edit command.

Required route:

1. graph-draft edits continue through `ConfigureCanvasDbtNode`;
2. materialization uses the existing workspace batch mutation port;
3. successful publication transitions authority to `dbt-project-files` through the accepted Canvas lifecycle/import boundary;
4. later SQL edits use `SaveWorkspaceFileContent`;
5. Canvas refresh uses `ProjectDbtGraphFromFiles`;
6. Preview and Run consume the exact file-backed project revision.

### Likely files

- `apps/web/src/app/views/canvas/canvasPlanAction.ts`
- `apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.ts`
- `apps/web/src/app/views/canvas/canvasDbtWorkspaceArtifacts.ts`
- `apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts`
- Canvas authority-binding lifecycle/controller files discovered through Planning DB
- API application service that exposes batch publication and exact analysis
- existing contracts under `packages/@dvt/contracts/src/contracts/planner/`
- Planning DB design and mechanization migration for the canonical task

### Migration and compatibility

- preserve existing graph drafts;
- preserve existing file-backed projects;
- make authority transition explicit only on successful publication;
- do not infer file authority merely because `dbt_project.yml` exists;
- do not migrate persisted data until the transition contract has live proof;
- allow rollback by retaining the graph draft until authority transition receipt is accepted.

### Rollback

Before authority transition: discard staged publication and retain graph authority.

After transition: rollback must be an explicit version/revision action, not silent fallback to the old graph draft.

### Observability

Emit one correlated receipt containing:

- workspace scope;
- idempotency key;
- affected paths and content hashes;
- authority before and after;
- project content-set hash;
- analysis hash;
- conflict or failure classification;
- duration;
- no file contents or credentials.

### Security

- scope all paths to tenant/project/environment;
- reject traversal and symlink escape through existing path policy;
- do not log SQL bodies, profiles, tokens, or environment variables;
- bound batch size and analyzer output;
- use server-owned dbt parse isolation.

### Red tests

1. graph SQL `G1` materializes to `models/m.sql`;
2. Project Code changes it to `F2`;
3. user returns to Canvas and triggers Preview;
4. `F2` is not silently replaced by `G1`.

Additional negative cases:

- graph and file changes conflict before transition;
- failed publication leaves authority unchanged;
- stale authority-transition receipt is rejected;
- file-backed Canvas never merges semantic graph-draft nodes;
- generated SQL is never represented as persisted until publication succeeds.

### Green and live proof

Protected browser flow:

```text
create graph model
-> inspect generated code
-> materialize project
-> edit model SQL in Project Code
-> reopen Canvas
-> Preview
-> Run
-> reload browser
-> same SQL and same revision identity remain authoritative
```

### Acceptance criteria

- exactly one durable SQL authority exists at every point;
- authority transition is receipt-backed and atomic;
- Project Code edits cannot be overwritten without explicit conflict;
- Preview, Run, and reopen use the same accepted file revision;
- no duplicate command/query rail exists;
- Planning DB design, files, tests, evidence, and completion state agree.

### Release gate

Do not release the feature until strict live proof passes on exact head and the iteration handoff contains the full authority transition evidence.

## 10. Priority 2 — atomic project publication and exact revision identity

### Severity

**P1 atomicity and reproducibility risk**.

### Evidence

`canvasPlanAction.ts` currently performs:

```ts
for (const artifact of artifactProjection.artifacts) {
  await workspaceFileContentCommand.saveFileContent(...);
}
```

The API already exposes `IWorkspaceFileBatchMutationPort` with:

- complete expected-file revisions;
- writes and deletes;
- idempotency key;
- conflict details;
- durable batch receipt.

`LocalWorkspaceFileBatchMutationGateway` already provides multipath locking, preflight CAS, request hashing, idempotent replay, staged replacement, and atomic commit.

### Root cause

Canvas orchestration uses the single-file command port even though the aggregate being published is a dbt project artifact set.

### User impact

A conflict or failure on the second artifact can leave the workspace containing only part of the project generated by the same Preview action.

### Owner

Workspace Project Publication / dbt Project Analysis.

### Proposed contract

Reuse `WorkspaceFileBatchMutation` and `WorkspaceFileBatchReceipt`. Add only the missing application-level result that correlates the batch receipt with fresh analysis:

```text
publication receipt
-> projectContentSetSha256
-> analysisSha256
-> authority binding
-> Preview provenance
```

### Command/query changes

- expose the existing batch mutation through the protected application rail needed by Canvas;
- analyze the exact post-publication content set server-side;
- return conflict without partial writes;
- never emulate atomicity with repeated GETs and single-file PUTs.

### Red tests

- conflict in second expected file produces zero writes;
- injected filesystem failure produces zero visible project changes;
- same idempotency key and same request returns deduplicated receipt;
- same key and different request fails closed;
- Preview rejects analysis from a different content set;
- Run rejects a plan whose accepted project revision is no longer available.

### Live proof

Publish at least `dbt_project.yml`, model SQL, and schema YAML as one transaction, inject conflict/failure, verify no partial project, retry, Preview, Run, reload, and inspect the same revision.

### Acceptance criteria

- no sequential artifact-write loop remains in the product path;
- a single immutable receipt proves the whole publication;
- Preview and Run are pinned to the exact content-set and analysis identity;
- rollback and retry are deterministic;
- audit signals contain hashes and identifiers, not sensitive contents.

## 11. Priority 3 — workspace capability truth

### Severity

**P1 correctness for accepted projects**.

### Evidence

`LocalWorkspaceFileRepository`:

- silently stops listing after 500 files;
- returns no cursor or completeness flag;
- rejects files over 1 MB using `InvalidWorkspacePathError`;
- uses the same 1 MB policy for reads and writes.

The wider import path has previously accepted projects with materially larger file counts and total size. The interactive workspace cannot honestly represent every accepted project.

### Root cause

Repository enumeration and content results are primitive arrays/exceptions rather than capability-aware read models.

### Owner

Workspace File Inventory and Content Access.

### Proposed contracts

```ts
type WorkspaceFileInventoryPage = {
  entries: WorkspaceFileEntry[];
  cursor: string | null;
  completeness: 'complete' | 'partial';
  effectiveLimits: WorkspaceFileLimits;
};

type WorkspaceFileContentResult =
  | { kind: 'available'; file: WorkspaceFileContent }
  | { kind: 'oversized'; path: string; sizeBytes: number; maxBytes: number }
  | { kind: 'not_found'; path: string }
  | { kind: 'unsupported'; path: string; reason: string };
```

### Required proof

- 501 files do not silently disappear;
- a project near the accepted maximum is navigable page by page;
- oversized files remain visible and explain why they cannot be opened;
- analysis, Explorer, Code, publication, and import expose one coherent policy.

## 12. Priority 4 — cohesive authoring recovery

### Severity

**P2 resilience and user-trust risk**.

### Evidence

`CodeWorkingTreeNavigationGuard`:

- flushes before SPA navigation;
- blocks navigation when flush fails;
- registers `beforeunload` while dirty.

This protects planned navigation but cannot restore a buffer after browser crash, process termination, device loss, or power failure.

### Owner

Project Authoring Session / Code Working Tree Recovery.

### Route

After authority and publication are stable, add a durable, scoped draft journal keyed by workspace, file, authoritative revision, and editor session. Recovery must require explicit comparison with current file revision and must never overwrite silently.

### Red tests

- dirty buffer survives simulated crash;
- recovery detects file revision changed while offline;
- user can compare, discard, or apply recovery;
- one tenant cannot read another tenant's journal;
- sensitive contents are not logged.

## 13. Priority 5 — API runtime contract validation

### Severity

**P2 boundary-integrity risk; P1 for new authority/publication endpoints**.

### Evidence

`createApiClient` returns:

```ts
const parsedBody = await parseBody(response);
return parsedBody as TResponse;
```

Compile-time generics do not validate runtime JSON.

### Correction

New authority, publication, revision, inventory, and recovery responses must be parsed with shared `@dvt/contracts` schemas at the Web boundary. Do not replace the generic client with a second transport stack; add endpoint-specific decoders/adapters.

### Negative tests

- wrong schema version;
- missing project revision;
- malformed hashes;
- unknown discriminant;
- conflict body with incomplete file data;
- 204 response where body is required.

## 14. Priority 6 — product-wide quality gates

### Current state

Root `ci:full` runs:

```text
ci:docs
ci:code
test:coverage:engine
```

Web and API tests exist and are exercised by other workflows, but the root ratchet names only Engine coverage. No root script evidence was found for accessibility, bundle budget, large-graph performance, or authoring fault injection.

### Required route

After the authority transaction is complete:

- establish Web and API coverage ratchets;
- run automated accessibility checks on Canvas, Project Code, dialogs, and error recovery;
- define bundle and route-load budgets;
- test large graphs and large project inventories;
- inject analyzer, network, filesystem, conflict, and Temporal failures;
- bind evidence to exact head SHA.

## 15. Fowler assessment

### Hidden authority

The dominant remaining risk is no longer the graph-internal SQL projection. It is the transition between graph-draft and file-backed authority.

### Responsibility overload

`canvasPlanAction.ts` currently coordinates projection, artifact persistence, revision reads, Preview, selection intent, provenance, and error presentation. Atomic publication should move to an application service/port rather than expanding this function further.

### Leaky abstraction

Web currently reads a file revision, performs a single-file write, then separately refreshes project analysis. That leaks filesystem transaction concerns into Canvas orchestration.

### Primitive obsession

- arrays represent file inventory without completeness;
- generic exceptions represent oversized content;
- type assertions represent validated HTTP responses;
- individual file receipts stand in for project revision identity.

### Shotgun surgery

Small feature corrections regularly require implementation files, multiple test surfaces, Planning DB migrations, generated governance state, and documentation. Some of this is deliberate governance, but the ratio should be monitored. A narrow product transaction must not expand into another generalized framework.

### Test-only confidence

Six green workflows prove executed checks on PR heads. They do not prove:

- a complete iteration handoff;
- exact merge-SHA workflows;
- red-first chronology;
- browser proof unless the run and artifact are linked;
- absence of duplicate authority outside the tested path.

### Stale truth

A closed draft guide is still named by the recurring review instruction. This is direct evidence that process guidance can outlive repository authority.

### Product dead-end warning

Do not add asset catalogs, column-level lineage expansion, collaboration, deployment promotion, or another DSL before the edit/materialize/file-edit/Preview/Run/reopen transaction is coherent.

## 16. Mature-system comparison

### dbt Cloud / Studio — match

DVT should match the principle that normal dbt project files remain durable and version-control-friendly. The graph may project and assist editing, but it must not become a second silent source of model code.

Reference: <https://docs.getdbt.com/docs/cloud/dbt-cloud-ide/develop-in-the-cloud>

### Professional IDE and Git workflows — match

DVT should distinguish:

- unsaved buffer;
- persisted file;
- generated proposal;
- semantic diagnostics;
- working-tree conflict;
- committed project revision;
- execution revision.

It should not compress these into a generic synchronized status.

Reference: <https://code.visualstudio.com/docs/sourcecontrol/overview>

### Airflow DAG Bundles — match exact revision

Airflow versioned DAG bundles allow one run to keep the same code version even when source changes during the run. DVT Preview and Run should similarly retain one exact project content set and analysis identity.

Reference: <https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/dag-bundles.html>

### Prefect deployments — defer promotion features

Deployment history, promotion, and rollback become useful after DVT has an exact project revision. They are not a substitute for defining file authority and atomic publication.

Reference: <https://docs.prefect.io/v3/deploy>

### Dagster assets — defer asset differentiation

Asset checks, lineage, partitions, and freshness can differentiate DVT later. Implementing them now would leave the core authoring transaction incoherent.

Reference: <https://docs.dagster.io/guides/build/assets>

### Temporal — match durable identity, not product shape

DVT should reuse Temporal principles of durable identity, retries, idempotency, and recovery. It should not turn the editor itself into a workflow engine.

Reference: <https://docs.temporal.io/encyclopedia/durable-execution>

### NiFi — match visible version state, differ on registry

NiFi demonstrates the value of explicit up-to-date, stale, locally modified, commit, revert, and change-version states. DVT should expose comparable truth while using Git and project revisions rather than a new proprietary registry. Apache NiFi Registry was deprecated after a February 2026 community vote in favor of Git-based Flow Registry Clients.

References:

- <https://nifi.apache.org/projects/registry/>
- <https://nifi.apache.org/nifi-docs/user-guide.html>

## 17. Required PR decomposition

### PR A — authority transition proof

Close only this transaction:

```text
graph model SQL
-> materialize files
-> edit SQL file
-> reopen Canvas
-> Preview
-> file edit remains authoritative
```

No workspace pagination, recovery framework, asset model, release governance, or generic session abstraction.

### PR B — atomic publication and exact project revision

Replace sequential writes with existing batch authority and correlate publication, analysis, Preview, and Run.

### PR C — workspace inventory truth

Introduce pagination, completeness, and typed oversized/not-found/unsupported outcomes.

### PR D — durable recovery

Add scoped authoring journal and conflict-aware recovery.

### PR E — product-wide quality gates

Add Web/API coverage ratchets, accessibility, performance budgets, large-project proof, and fault injection.

## 18. Blocking corrective instruction for the implementation agent

Before beginning unrelated work:

1. claim the canonical model-SQL authority task in Planning DB;
2. verify its dependency and approved design from the live DB, not a closed Markdown guide;
3. create one functional branch from current `main`;
4. write the failing end-to-end authority test first;
5. implement the smallest authority transition that reuses existing rails and contracts;
6. run focused, package, architecture, Planning DB, and protected browser proofs;
7. leave a complete `## Iteration Handoff` on the PR;
8. do not begin atomic publication until the authority transaction is accepted, unless live Planning DB explicitly changes the dependency.

### The handoff for PR A must state

- exact base and final SHA;
- branch and PR;
- claimed task/design;
- user transaction closed;
- what changed, how, and why;
- exact authority before and after materialization;
- every command/query rail reused;
- every port, adapter, contract, migration, and file touched;
- red-test result and green-test result;
- CI and live browser links;
- conflict, rollback, security, and telemetry posture;
- remaining gap that belongs to atomic publication;
- any deviation from the approved design.

## 19. Release gates for the next product iteration

The next product PR is not ready to merge unless:

- the exact current Planning DB task is claimed;
- no duplicate command/query rail exists;
- the graph/file authority transition is explicit;
- the negative overwrite scenario passes;
- protected live browser proof executes the real API, workspace files, dbt analyzer, persistence, Preview, and Run path needed by the slice;
- all six standard workflows pass on final head;
- unresolved review threads are zero or explicitly deferred with owner and task;
- the iteration handoff is complete;
- rollback, observability, security, and compatibility claims have evidence;
- the PR does not include unrelated release, dependency, framework, or documentation expansion.

## 20. Final decision

No new product finding is introduced in this cycle.

The repository is stable at release `0.5.2`, the reconciliation defect is fixed, and current open work is documentation-only. The immediate deficiency is that no valid implementation handoff exists and the recurring review names a stable guide that is absent from `main`.

The next implementation must close the model-SQL authority transition, then leave a complete handoff. The following slice may replace sequential writes with the existing atomic batch authority and bind publication, analysis, Preview, Run, and reopen to one exact project revision.
