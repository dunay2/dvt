---
title: DVT Product Priority Execution Guide
status: Review
owner: Product Architecture / Web / API / Workspace I/O / dbt Integration
last_reviewed: 2026-07-21
planning_type: mandatory-proposal
reviewed_repository: dunay2/dvt
reviewed_main_sha: 8a39d19ec0d6b2abedfe7ce313ac4e7c53d9b3d8
canonical_operational_authority: Planning DB
---

# DVT Product Priority Execution Guide

## 1. Purpose

This guide fixes the execution order for the next DVT product work. It is deliberately not another
point-in-time repository status report.

Planning DB remains the operational authority for task state, task claiming, architecture design,
component ownership, rails, accepted evidence, and completion. This Markdown document provides the
human-readable sequencing rationale and exit gates. It must not be used to overwrite a newer Planning
DB decision.

The guide exists because recent work delivered meaningful release governance, dependency maintenance,
Canvas test isolation, file-backed dbt authoring, and Code reconciliation hardening, but the repository
has repeatedly allowed maintenance and governance work to displace the remaining product transaction.

The next cycle must finish one user-visible authoring transaction before starting another broad
infrastructure or governance expansion.

## 2. Governing sources

Implementation agents must reconcile this guide against the current rows and approved designs in
Planning DB before changing code.

Primary sources:

- `AGENTS.md`
- `docs/adr/ADR-0060-dbt-project-authoring-authority.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/dbt-authoring-code-run-vertical-plan-20260526.md`
- `docs/planning/proposals/mandatory/governance-and-docs/db-first-architecture-authority-plan-20260515.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `tools/planning-db/migrations/767_dbt_code_reconciliation_race_hardening.sql`
- `tools/planning-db/migrations/768_dbt_code_reconciliation_race_closeout.sql`
- `tools/planning-db/migrations/791_code_working_tree_receipt_precedence.sql`

Known task identity that is directly confirmed by current Planning DB migrations:

- `E-WEB-DBT-ATOMIC-PUBLICATION-1`

Repository review dispositions also refer to existing tasks for model SQL authority and project
session ownership. The implementation agent must query Planning DB and reuse the current task IDs and
design records rather than copying an ID from this document or creating a duplicate task.

## 3. Current baseline and changed decision

Reviewed baseline:

- current `main`: `8a39d19ec0d6b2abedfe7ce313ac4e7c53d9b3d8`;
- merged PR #2030: `fix(web): Preserve pending reconciliation receipt truth`;
- release PR #2023: maintenance release `0.5.2`, open independently of the product route.

PR #2030 closes the previously repeated edit/revert race:

```text
persisted A
-> reconciliation receipt R1 pending
-> edit B
-> return to A
-> R1 completes invalid/stale/unavailable/fresh
-> the matching semantic result remains authoritative
```

The gap `GAP-CODE-PENDING-RECEIPT-REVERSION` is recorded as closed under
`E-WEB-DBT-RECONCILIATION-RECEIPT-TRUTH-1`. The final PR head had all six standard workflows green.

Therefore the former recommendation, "first split persistence and reconciliation state to close the
P2", is superseded as the immediate priority. The single `phase` field still deserves future
simplification if additional behavior creates pressure, but refactoring it now would be architecture
work without a currently open product defect.

The remaining exact-project-revision gap is explicitly still open and assigned by Planning DB to
`E-WEB-DBT-ATOMIC-PUBLICATION-1`. That is now the highest product priority.

## 4. Stable prioritization rules

The following rules control ordering. A later priority cannot displace an earlier one merely because a
dependency bot, release tool, reviewer, or agent has available work.

1. **Data integrity before convenience.** Silent overwrite, partial publication, ambiguous authority,
   and non-reproducible execution outrank new features.
2. **Complete transaction before framework.** Deliver one end-to-end user transaction before
   extracting a generic authoring framework.
3. **Existing authority before new language.** Reuse current contracts, command/query rails, ports,
   adapters, receipts, hashes, and architecture designs.
4. **One semantic owner.** Graph metadata, workspace files, analyzer output, Preview, and Run may not
   independently claim authority over the same project revision.
5. **Proof on the final head.** Unit tests, architecture tests, integration tests, protected browser
   evidence, Planning DB integrity, and required CI must run on the final commit.
6. **Maintenance is parallel, not dominant.** A release or dependency PR may proceed when safe, but it
   does not count as progress on the product milestone and must not stop the priority-one branch.
7. **No parallel current-state documents.** Point-in-time reviews are intake evidence. Once findings
   are reconciled into Planning DB, superseded review PRs should be closed rather than merged as
   competing current-state authority.
8. **No status inflation.** `saved`, `fresh`, `published`, `previewed`, `runnable`, and `released` are
   different facts and require different evidence.

## 5. Priority summary

| Priority | Outcome | Start condition | Exit condition |
| --- | --- | --- | --- |
| 0 | Finish or deliberately defer release `0.5.2` | Release head is current | Custom integrity check and human review confirmed; no new release-governance expansion |
| 1 | One atomic, exact, authoritative dbt project revision | Planning DB task/design claimed | Atomic receipt binds files, project content set, analysis, Preview, Run, and reopen |
| 2 | Truthful workspace inventory and file capabilities | Priority 1 merged | No silent truncation; typed oversized/not-found/unsupported results; shared policy |
| 3 | Cohesive project authoring session and durable recovery | Priorities 1-2 proven | Buffers, receipts, revision admission, navigation, and recovery have one application owner |
| 4 | Product-wide quality and operability gates | Core transaction stable | Web/API coverage ratchets, accessibility, performance, bundle, and failure proofs gate release |
| 5 | Product differentiation | Authority and quality foundations complete | Assets, lineage, checks, promotion, and collaboration extend—not bypass—the authority model |

## 6. Priority 0 — close the maintenance release lane

Release PR #2023 can proceed independently when its exact current head has:

- the six standard workflows green;
- the custom `Release candidate integrity` check green on the exact release head;
- a human review, because automated Codex review capacity was exhausted;
- intentional confirmation that a maintenance-only `0.5.2` release is wanted.

This is a bounded operational action. It must not trigger another release-governance project unless an
actual defect blocks the release or weakens repository security.

After release closure, return immediately to Priority 1.

## 7. Priority 1 — publish one exact dbt project revision atomically

### 7.1 User outcome

A user can author or modify a dbt project through Canvas or Code and then perform this transaction:

```text
edit/propose
-> review exact affected files
-> publish all files atomically with CAS
-> receive one immutable publication receipt
-> analyze the exact published project content set
-> Preview that exact revision
-> Run that exact revision
-> reopen and see the same authoritative content
```

No direct Project Code edit may be silently replaced by Canvas Preview. No Preview may report success
for a partially written project. No Run may execute a project revision different from the one admitted
by Preview.

### 7.2 Why this is first

Current graph-first Preview builds dbt artifacts and calls `saveFileContent` in a loop in
`apps/web/src/app/views/canvas/canvasPlanAction.ts`. Each file reads an expected revision and is saved
separately. A conflict or failure after an earlier write can leave the project partially changed.

The repository already has the correct lower-level authority:

- `IWorkspaceFileBatchMutationPort`;
- `WorkspaceFileBatchMutation`;
- complete expected-file revision sets;
- multipath locking;
- idempotency keys and request hashes;
- conflict results per path;
- atomic replacement;
- immutable batch receipts.

The implementation must use that authority rather than adding another generic file mutation model.

Planning DB already assigns the open exact-project-revision gap to
`E-WEB-DBT-ATOMIC-PUBLICATION-1` and explicitly forbids presenting repeated reads as atomic proof.

### 7.3 Domain owner

The owner is a dbt project publication application service, not:

- `canvasPlanAction.ts`;
- the React route;
- `CodeWorkingTreeSync`;
- the generic workspace repository;
- the planner engine.

The service coordinates existing authorities:

- workspace scope authorization;
- the dbt authoring authority binding;
- artifact proposal/projection;
- the workspace batch mutation port;
- `ProjectDbtGraphFromFiles` analysis;
- Preview/Run revision admission.

Before naming or creating a command rail, query the approved Planning DB design for
`E-WEB-DBT-ATOMIC-PUBLICATION-1`. Reuse its command name. Only if the approved design has no command
name may the implementation propose a name such as `PublishDbtProjectRevision` through the DB-first
design command rail.

### 7.4 Required domain objects

The public contract must reuse current semantics instead of exposing infrastructure paths or inventing
a second file DSL.

Representative application input:

```ts
type PublishDbtProjectRevisionInput = Readonly<{
  authorityBinding: CanvasAuthoringAuthorityBinding;
  projectRoot: string;
  expectedProjectRevision: Readonly<{
    contentSetSha256: string | null;
  }>;
  expectedFiles: readonly Readonly<{
    path: string;
    expectedContentSha256: string | null;
  }>[];
  writes: readonly Readonly<{
    path: string;
    content: string;
  }>[];
  deletes: readonly string[];
  idempotencyKey: string;
}>;
```

Representative result:

```ts
type PublishDbtProjectRevisionResult =
  | Readonly<{
      kind: 'applied';
      batchReceipt: WorkspaceFileBatchReceipt;
      projectContentSetSha256: string;
      analysisSha256: string;
      freshness: 'fresh';
    }>
  | Readonly<{
      kind: 'applied_degraded';
      batchReceipt: WorkspaceFileBatchReceipt;
      projectContentSetSha256: string;
      freshness: 'stale-last-valid' | 'invalid' | 'unavailable';
      diagnostics: readonly StableDbtDiagnostic[];
    }>
  | Readonly<{
      kind: 'conflict';
      conflicts: readonly Readonly<{
        path: string;
        currentContentSha256: string | null;
      }>[];
    }>;
```

The exact contract names and field ownership must be resolved against existing `@dvt/contracts`
objects and the approved design. This shape describes required semantics, not permission to duplicate
existing types.

### 7.5 Persistence and analysis policy

Byte persistence and semantic dbt analysis remain separate truths.

- The batch mutation is all-or-nothing for file content.
- A successful file batch returns one durable receipt.
- The exact resulting file content set is analyzed.
- An invalid or unavailable analysis must be reported honestly as `applied_degraded`; it must not be
  renamed `synchronized` or `fresh`.
- Preview and Run are blocked for a degraded revision unless an existing accepted policy explicitly
  admits a last-valid revision and labels that identity.
- Do not perform an automatic hidden rollback after semantic failure. A rollback is a separate,
  revision-guarded command with its own receipt.

Where feasible, analyze a staged candidate before publication to reject deterministic generated
invalidity early. The final post-publication identity must still be verified against the committed
content set.

### 7.6 Model SQL authority rule

Graph-first creation may use graph state to propose initial files. After a model file is materialized:

- `models/<model>.sql` is the authoritative model SQL;
- Canvas projects from the authoritative file-backed analysis;
- graph edits become revision-bound file proposals;
- Project Code and node Code invoke the same persistence/publication authority;
- Preview never opportunistically regenerates and overwrites an authoritative model file;
- a divergence from the expected file revision produces a conflict, diff, adopt/reload choice, or
  explicit read-only posture—never silent replacement.

This is where the existing model SQL authority task must be reused. Do not create a second task or a
parallel graph-to-file command.

### 7.7 Command/query and port changes

Expected changes:

- application service around the approved publication command;
- shared, runtime-validated request/result contracts;
- protected API route using the existing workspace scope authorization;
- adapter from the application service to `IWorkspaceFileBatchMutationPort`;
- reuse of `ProjectDbtGraphFromFiles` for exact post-publication analysis;
- Web command port and mutation hook;
- replacement of the sequential save loop in `canvasPlanAction.ts`;
- Preview provenance and Run admission bound to the publication result.

Forbidden changes:

- browser-owned dbt parsing;
- another generic workspace mutation language;
- a new hidden `.dvt` semantic authority;
- writes directly from React components;
- using two GET requests as proof of one atomic revision;
- planner or engine ownership of authoring file transactions;
- logging SQL content or raw transport errors.

### 7.8 Likely implementation surfaces

Inspect these first:

- `apps/web/src/app/views/canvas/canvasPlanAction.ts`
- `apps/web/src/app/views/canvas/canvasDbtWorkspaceArtifacts.ts`
- `apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts`
- `apps/web/src/app/views/code/useCodeWorkingTreeSync.ts`
- `apps/web/src/app/ports/workspaceFiles.ts`
- `apps/api/src/application/ports/workspaceFiles.ts`
- `apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.ts`
- `apps/api/src/infrastructure/workspaceFiles/localWorkspaceFileBatchMutationModel.ts`
- `apps/api/src/application/services/projectDbtGraphFromFilesUseCase.ts`
- existing Source Import strategies that already consume the batch mutation port
- existing YAML description apply/revert transaction services
- `packages/@dvt/contracts` dbt projection, revision, and diagnostics contracts
- protected runtime route registration and rail vocabulary

### 7.9 Red/green test order

Write the red proofs before the product implementation:

1. **Conflict on second artifact.** Three files are proposed; the second expected revision is stale;
   assert zero files change and no applied receipt exists.
2. **Injected write failure.** Failure after preparation but before replacement; assert all original
   hashes remain unchanged.
3. **Idempotent retry.** Repeat the same idempotency key and request; assert one mutation and a
   deduplicated receipt.
4. **Idempotency misuse.** Reuse the key with a different request; assert fail-closed conflict.
5. **External Project Code edit.** Edit model SQL directly after Canvas captured its baseline; assert
   Canvas publication conflicts and does not overwrite it.
6. **Exact project identity.** Concurrently change another project file; assert the original operation
   cannot claim a fresh revision for a different content set.
7. **Degraded analysis.** Publish bytes whose exact project analysis is invalid/unavailable; assert
   durable bytes plus degraded status, with Preview and Run blocked.
8. **Preview identity.** Assert persisted Preview provenance contains the publication
   `projectContentSetSha256` and `analysisSha256`.
9. **Run identity.** Assert Run consumes the exact revision admitted by Preview or fails closed.
10. **Reopen.** Close and reopen Canvas/Code; assert the same authoritative files and revision appear.

### 7.10 Protected live proof

The final PR must include a strict live browser vertical using the protected API, PostgreSQL, real
workspace files, dbt analysis, Preview, Temporal Run, and reopen.

The proof must not intercept the publication or analysis endpoints. At minimum it must demonstrate:

```text
graph/code edit
-> atomic publish receipt
-> exact fresh project revision
-> Preview with matching provenance
-> Run with matching revision
-> reopen with matching content
```

A second live or integration proof must demonstrate external file divergence and zero silent
overwrite.

### 7.11 Observability

Emit stable metadata events without source content:

- publication requested;
- publication conflict;
- publication applied;
- publication deduplicated;
- atomic replacement failed;
- exact analysis fresh/degraded/unavailable;
- Preview revision mismatch;
- Run revision mismatch;
- rollback requested/applied/conflicted.

Correlate by workspace scope, opaque idempotency/receipt identity, project content-set hash, analysis
hash, and artifact count. Never log SQL, YAML content, credentials, raw profiles, or raw exception
messages to user-visible surfaces.

### 7.12 Security

- Validate every path before mutation and retain workspace-root traversal protection.
- Enforce the existing maximum file, batch-file, and batch-byte policies at the server boundary.
- Do not execute candidate project code beyond the existing constrained dbt analysis posture.
- Use shared runtime schemas at the HTTP boundary; TypeScript casts are not validation.
- Return stable diagnostics and reason codes; sanitize transport and process details.
- Do not let a browser-provided content-set hash substitute for server calculation.

### 7.13 Rollback posture

- Atomic mutation failure: no content change and no success receipt.
- Conflict: no content change; return current revisions.
- Applied but semantically degraded: retain the exact applied revision and expose an explicit
  revision-guarded revert action.
- Revert must compare against the applied revision, use the same batch authority, and return its own
  immutable receipt.
- A rollback conflict must never force-overwrite newer user work.

### 7.14 Acceptance criteria

Priority 1 is complete only when all are true:

- graph-first Preview contains no sequential per-file persistence loop;
- every touched file participates in one expected revision set;
- publication is all-or-nothing and idempotent;
- one receipt binds writes to an exact project content set;
- one analysis identity corresponds to that content set;
- file-backed model SQL is the steady-state authority after materialization;
- node Code and Project Code share the same write authority;
- silent overwrite is impossible and proven by a negative test;
- Preview and Run use the same accepted revision;
- reopen proves the same content and revision;
- conflict, degraded analysis, retry, rollback, security, and observability paths are tested;
- Planning DB design, components, relations, rails, evidence, risks, and gaps are reconciled;
- required CI is green on the exact final head.

## 8. Priority 2 — make workspace capability truthful

### 8.1 Problem

Import inspection can accept projects substantially larger than the interactive workspace surface.
The current workspace repository and batch gateway use bounded limits, including a 500-file inventory
or batch posture and 1 MB per-file limits, while dbt project inspection can accept up to 10,000 files
and 50 MB.

Limits are not themselves a defect. Silent truncation and ambiguous error semantics are.

### 8.2 Required contracts

Introduce or reuse shared runtime-validated read models equivalent to:

```ts
type WorkspaceFileInventoryPage = Readonly<{
  entries: readonly WorkspaceFileEntry[];
  nextCursor: string | null;
  completeness: 'complete' | 'partial';
  effectiveLimits: Readonly<{
    maxFiles: number;
    maxFileBytes: number;
    maxBatchFiles: number;
    maxBatchBytes: number;
  }>;
}>;

type WorkspaceFileContentResult =
  | Readonly<{ kind: 'loaded'; file: WorkspaceFileContent }>
  | Readonly<{ kind: 'oversized'; path: string; sizeBytes: number; maxBytes: number }>
  | Readonly<{ kind: 'not_found'; path: string }>
  | Readonly<{ kind: 'unsupported'; path: string; reasonCode: string }>;
```

Do not solve the problem by silently increasing every limit. Establish one policy authority shared by
import, analysis, Explorer, Code, publication, and API responses.

### 8.3 Required proof

- 501-file project shows partial inventory and a cursor, never a false complete tree;
- a near-accepted-maximum project can be traversed deterministically;
- an oversized file is not reported as an invalid path or missing file;
- UI shows explicit capability and remediation;
- pagination remains workspace-scoped and traversal-safe;
- rate, memory, latency, and payload limits are measured;
- contracts are parsed at runtime on both API and Web boundaries.

## 9. Priority 3 — cohesive authoring session and durable recovery

Only after Priorities 1 and 2 are proven, extract an application boundary that owns the project
authoring session.

Responsibilities:

- current accepted project revision;
- open file buffers;
- save and batch publication receipts;
- exact semantic reconciliation outcome;
- Preview/Run revision admission;
- contextual navigation and close policy;
- conflict/diff/reload/adopt decisions;
- durable unsaved-buffer recovery;
- cleanup on save, discard, logout, and workspace change.

Do not build a generic authoring framework first. Extract only behavior already proven common by:

- model SQL editing;
- YAML description editing;
- atomic project publication;
- workspace inventory and conflict handling.

A browser warning or a best-effort flush is not crash recovery. Recovery must restore the unsaved
buffer after browser termination or process failure without claiming that the recovered buffer is
authoritative. The recovered content remains a local proposal until revision-guarded persistence
succeeds.

## 10. Priority 4 — product-wide quality and operability gates

Once the core authoring transaction is stable, add release-blocking ratchets for the actual product,
not only the engine.

Required lanes:

- Web and API coverage baselines with ratcheting, not arbitrary aspirational percentages;
- automated accessibility checks for Canvas, workbench, dialogs, keyboard operation, and status
  announcements;
- bundle and route-load budgets;
- large-graph interaction budgets;
- API latency and payload budgets for inventory, analysis, publication, Preview, and Run;
- multi-worker and concurrent mutation proof;
- injected storage, dbt process, database, Temporal, and network failures;
- exact-main and exact-tag evidence;
- generated current product status instead of manually stale "Current Status" claims.

These gates should be introduced incrementally and must not be used as an excuse to postpone Priority
1. The Priority 1 vertical must include the minimum relevant security, accessibility, performance, and
failure tests from the beginning.

## 11. Priority 5 — product differentiation

Only after authority, integrity, recovery, and scale are credible should DVT expand toward broader
mature-system capabilities.

### Match

DVT should match mature dbt/IDE/orchestration systems in:

- dirty buffer versus durable file state;
- diagnostics versus persistence state;
- exact project revision identity;
- conflict-safe save and revert;
- atomic multi-file publication;
- Preview/Run provenance and reproducibility;
- Git-compatible history and promotion;
- explicit freshness and failure posture.

### Differentiate

DVT should differentiate through:

- one bidirectional graph/code experience over normal dbt files;
- governed visual edits that remain lossless;
- revision-bound receipts visible to users and operators;
- one Canvas that joins authoring, lineage, execution selection, Preview, Run, and evidence without
  inventing a user-facing replacement language for dbt.

### Defer

Defer until earlier priorities are complete:

- generic workflow-language creation;
- live multi-user collaborative editing;
- broad asset catalog and partition management;
- generic visual mutation framework;
- deployment promotion/rollback UI beyond exact revision foundations;
- Dagster-style asset checks and freshness expansion;
- Airflow/Prefect-style scheduling expansion;
- another proprietary flow registry;
- a workflow engine inside the editor.

## 12. Explicit stop-doing list

Until Priority 1 is merged:

- do not begin another release-governance expansion;
- do not treat dependency maintenance as the primary product lane;
- do not create another broad point-in-time review as current authority;
- do not add a new dbt-facing DSL;
- do not add a second workspace mutation rail;
- do not let graph metadata and files both be silently editable authorities;
- do not add more sequential artifact writes;
- do not claim exact revision identity from repeated latest-state reads;
- do not generalize the authoring session before one atomic transaction is proven;
- do not expand to column descriptions, assets, checks, partitions, or collaboration first.

## 13. Agent operating procedure

### Before coding

1. Query Planning DB for the current task, status, owner, dependencies, claimed branch, approved design,
   components, rails, ports, tests, risks, and evidence requirements.
2. Confirm #2030 closed the reconciliation receipt defect; do not reopen it without a new failing proof.
3. Claim the existing atomic publication task; do not create a duplicate.
4. Reconcile this guide with the accepted dbt round-trip plan and ADR-0060.
5. Inspect active branches and PRs for overlapping implementation.
6. Write the red tests and protected proof plan before production code.

### During implementation

1. Keep one application owner for the transaction.
2. Reuse the batch mutation port and analysis query.
3. Parse shared contracts at runtime.
4. Keep file persistence, semantic analysis, Preview admission, and Run admission distinct.
5. Add observability without source content.
6. Keep the PR limited to Priority 1; record newly found unrelated gaps in Planning DB rather than
   expanding the branch.

### Before requesting merge

1. Run focused unit and architecture suites.
2. Run API, Web, contracts, typecheck, lint, Planning DB migrations, integrity, feature mechanization,
   governance refresh, and `verify:prepush`.
3. Run the strict protected browser vertical and atomic failure-injection tests.
4. Confirm no disabled hooks, relaxed checks, fake adapters, or placeholder success paths.
5. Request human review if automated review capacity is unavailable.
6. Resolve every non-outdated review thread on the final head.
7. Verify all required workflows and custom checks on the exact final head.
8. Close the Planning DB gap only with exact evidence.

## 14. Decision record

The priority decision after PR #2030 is:

1. complete the bounded `0.5.2` release lane if its exact checks and human review are valid;
2. make `E-WEB-DBT-ATOMIC-PUBLICATION-1` the active product priority;
3. deliver atomic publication, exact project revision identity, file-authoritative SQL convergence,
   Preview/Run provenance, conflict handling, and reopen as one product milestone;
4. make workspace inventory and size capabilities truthful;
5. extract the cohesive authoring session and durable recovery only after those transactions are real;
6. establish product-wide quality gates;
7. then expand into asset-oriented and collaborative differentiation.

The immediate implementation branch should therefore be a product branch for atomic dbt project
publication, not another review, release-governance, dependency, or framework branch.
