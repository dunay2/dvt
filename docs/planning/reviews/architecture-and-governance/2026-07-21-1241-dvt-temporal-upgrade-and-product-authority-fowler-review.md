---
title: DVT Temporal upgrade delta and product-authority Fowler review
date: 2026-07-21T12:41:00+02:00
status: current-review
reviewed_main_sha: dc307884894ed0ee9eed43b9548cb241a22c8300
scope: documentation-only
---

# DVT Temporal upgrade delta and product-authority Fowler review

## Purpose

This document is a point-in-time engineering review for the implementation agent working in
`dunay2/dvt`. It reviews the exact current `main`, the material delta since the prior review, every
visible open pull request, relevant CI and review evidence, release posture, product code, contracts,
architecture, tests, governance, operability, accessibility, performance, security, data integrity,
recovery, and current-status documentation.

This report does not replace Planning DB as work authority and does not authorize a merge. It is
verified intake and a repository-compatible implementation route.

## Exact reviewed identities

- Repository: `dunay2/dvt`
- Exact current `main`:
  [`dc307884894ed0ee9eed43b9548cb241a22c8300`](https://github.com/dunay2/dvt/commit/dc307884894ed0ee9eed43b9548cb241a22c8300)
- Previous reviewed product baseline:
  [`e36a2ef211e915afa654a1220fab1942f55abda1`](https://github.com/dunay2/dvt/commit/e36a2ef211e915afa654a1220fab1942f55abda1)
- Latest merged PR:
  [#2008 — Temporal SDK dependency group upgrade](https://github.com/dunay2/dvt/pull/2008)
- Only visible open product/release PR before this report:
  [#2023 — Release 0.5.2](https://github.com/dunay2/dvt/pull/2023)
- Review branch: `agent/dvt-review-20260721-1241`

## Executive verdict

There is one material repository delta since the previous review: the Temporal TypeScript SDK group
was upgraded from 1.18.1 to 1.20.3. The change is evidence-backed, coordinated across adapter and
worker packages, removes an obsolete protobuf override, records rollback posture, and is covered by
adapter, worker, time-skipping, transformation, PostgreSQL integration, build, typecheck, and
pre-push evidence.

That is valid maintenance and improves dependency posture, but it adds no new user-facing DVT
capability. There is still no implementation of the product-authority route identified after PR
#1996.

The repository therefore remains in an imbalanced state:

- release governance, dependency governance, CAS file authority, strict DBT projection contracts,
  and test/governance evidence are comparatively mature;
- the Code authoring transaction still compresses persistence and DBT reconciliation into one scalar
  state;
- post-save reconciliation still ignores the exact file save receipt and refetches the latest project
  projection;
- graph-first Preview still writes multiple project files sequentially despite a server-owned atomic
  batch port;
- import accepts projects that Code/Explorer cannot fully enumerate or edit;
- normal navigation protection exists, but durable crash recovery does not;
- the root quality gate still has an explicit Engine coverage ratchet without equivalent Web/API,
  accessibility, bundle, or large-graph performance gates;
- a document titled `Current Status` still advertises a 2026-04-26 snapshot as current.

The next functional PR must not be another release, dependency, governance, or generic-framework
slice. It must separate Code persistence from semantic reconciliation and close the unresolved,
non-outdated PR #1996 P2 end to end.

## Material delta since the previous review

### Delivered: Temporal SDK 1.20.3 compatibility upgrade

The one-commit delta from `e36a2ef` to `dc307884` changes nine files:

- `apps/temporal-worker/package.json`;
- `packages/@dvt/adapter-temporal/package.json`;
- root `package.json`;
- `pnpm-lock.yaml`;
- ARC-2 evidence and risk records.

The upgrade moves the five coordinated SDK packages from 1.18.1 to 1.20.3:

- `@temporalio/worker`;
- `@temporalio/testing`;
- `@temporalio/activity`;
- `@temporalio/client`;
- `@temporalio/workflow`.

The evidence document states:

- no DVT command, query, event, workflow, activity, or persistence contract changed;
- `@temporalio/proto@1.20.3` directly resolves `protobufjs@7.6.4`;
- the root override required by 1.18.1 was removed instead of retained as stale package authority;
- rollback is a dependency revert with no data migration;
- compatibility is based on adapter/worker unit, build, typecheck, time-skipping, transformation, and
  PostgreSQL integration tests rather than installation success alone.

### Fowler assessment of the Temporal delta

This is not a product dead end or speculative platform expansion. It is a coherent dependency unit
with a bounded owner and explicit rollback. Unlike several earlier narrow UI fixes, it does not create
parallel command/query semantics.

The remaining caution is evidence identity. The exact squash commit on `main` has no connector-visible
PR-triggered workflow runs. The current release branch includes the Temporal delta and has six green
standard workflows, which is useful downstream evidence, but it is not the same as exact-main
publication evidence.

### No product-authority delta

The comparison contains no changes to:

- `codeWorkingTreeSyncModel.ts`;
- `useCodeWorkingTreeSync.ts`;
- `useDbtProjectFileCanvasController.ts`;
- `canvasPlanAction.ts`;
- workspace file ports or repositories;
- DBT project projection contracts;
- Code/Canvas/Preview/Run revision admission.

All prior product-authority findings therefore require revalidation, not closure.

## Open pull requests and release posture

## PR #2023 — Release 0.5.2

The release branch is exactly one commit ahead of current `main` and changes only:

- `.release-please-manifest.json`;
- `CHANGELOG.md`;
- `package.json`.

Its notes contain maintenance outcomes only:

- GitHub Action updates;
- linting dependency updates;
- Canvas test-isolation fixes;
- Radix component updates;
- the Temporal SDK group upgrade.

The six standard workflows on head `12fe6fec3908241528287603620767448fbb0db1` are green:

- Dependency Review;
- Contracts & Determinism;
- CodeQL;
- CI - Code Quality;
- PR Quality Gate;
- Test Suite.

No inline review thread and no submitted review are visible. The only conversation comment reports
that automated Codex review capacity was exhausted.

### Release decision

PR #2023 is mechanically healthy as a maintenance release, but before merge a human must verify:

1. the custom `Release candidate integrity` check exists and is green on the exact head;
2. the head has not changed since the six standard checks completed;
3. publication of a maintenance-only 0.5.2 is intentional;
4. a human has reviewed the dependency and release-note delta.

The connector does not expose the custom check. Do not claim that gate is green from standard workflow
evidence alone.

## Review-thread state

### PR #1996

Two prior P1 threads remain resolved:

- no successful flush while an edit made during persistence remains unsaved;
- no successful flush while an edit made during DBT reconciliation remains unsaved.

One P2 thread remains unresolved and non-outdated:

> When the buffer is edited during pending reconciliation and then returned to the persisted bytes,
> the state can become `synchronized`; the matching invalid/stale/unavailable result is later ignored.

The current `main` code still contains the exact failure mechanism.

### PR #2008 and PR #2023

No inline review threads are visible. Absence of review findings must not be confused with review
coverage: PR #2023 has no submitted review, and recent PR comments show automated review capacity was
unavailable.

## Revalidated finding ledger

| ID | Previous finding | Current disposition | Evidence summary |
| --- | --- | --- | --- |
| CODE-RECON-01 | Latest edit can be lost while persistence is in flight | Fixed | PR #1996 resolved P1 plus reducer/hook proof |
| CODE-RECON-02 | Latest edit can be lost while reconciliation is in flight | Fixed | PR #1996 resolved P1 plus receipt-aware second save |
| CODE-RECON-03 | Pending reconciliation disappears after edit/revert | Active P2 | Current reducer still gates completion on `phase === 'reconciling'` |
| AUTH-REV-01 | Save receipt is ignored during project reconciliation | Active P1 | Controller parameter remains `_receipt` and performs latest refetch |
| PUBLISH-01 | Graph-first artifacts publish sequentially | Active P1 | `canvasPlanAction.ts` loops over individual `saveFileContent` calls |
| BATCH-01 | No atomic file authority exists | Disproved | API already has atomic, idempotent, multipath CAS batch authority |
| INVENTORY-01 | Import/workspace scale limits conflict | Active P1 | Import 10,000/50 MB versus silent 500/1 MB workspace limits |
| CONTRACT-01 | Generic Web JSON responses lack runtime validation | Active boundary gap | `parsedBody as TResponse` remains in generic client |
| RECOVERY-01 | SPA flush and unload warning equal crash recovery | Disproved | No durable buffer journal or crash restore exists |
| QUALITY-01 | Repository has no broad testing | Disproved | Broad unit, architecture, protected-live, contract and governance suites exist |
| QUALITY-02 | Web/API and nonfunctional root release gates are complete | Active evidence gap | Root `ci:full` explicitly ratchets Engine coverage only |
| STATUS-01 | Current-status documentation is mechanically current | Active stale truth | `last_reviewed` and snapshot remain 2026-04-26 |
| TEMPORAL-01 | Temporal 1.20 upgrade is unvalidated | Disproved | ARC-2 evidence lists comprehensive adapter/worker proofs |

## Priority finding 1 — Code state conflates persistence and semantic reconciliation

### Severity and evidence

P2 correctness and release-quality blocker.

`CodeWorkingTreeSyncState` stores one `phase` enum for all of the following:

- synchronized or modified buffer;
- active file persistence;
- revision conflict;
- persistence failure;
- pending DBT reconciliation;
- failed reconciliation;
- stale, invalid, unavailable, verification-unavailable, or superseded semantic authority.

The reducer accepts `reconciliation_completed` and `reconciliation_failed` only when
`state.phase === 'reconciling'`.

The exact defective sequence is:

```text
persisted A
→ save receipt R1 pending reconciliation
→ edit B, phase becomes modified
→ edit back to A, persistedReconciliationPhase is null, phase becomes synchronized
→ R1 invalid/stale/unavailable arrives
→ event ignored because phase is not reconciling
```

The UI can therefore claim `synchronized` while a valid matching semantic result is lost.

### Root cause and Fowler smells

- **Responsibility overload:** one scalar owns two orthogonal state machines.
- **Temporal coupling:** outcome depends on event order rather than stable identities.
- **Primitive obsession:** string phases implement a protocol that requires typed objects.
- **Test-only confidence:** several adjacent interleavings are covered, but the state shape still
  permits an unmodelled, reviewed failure.

### User and product impact

- invalid SQL can appear synchronized;
- Preview/Run admission can be based on a false semantic posture;
- users cannot distinguish durable bytes from analyzed project validity;
- recovery actions can disappear after harmless buffer edits.

### Exact domain owner

- `apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts`
- `apps/web/src/app/views/code/useCodeWorkingTreeSync.ts`
- `apps/web/src/app/views/code/CodeWorkingTreeStatus.tsx`

Canvas supplies reconciliation. It must not own the editor state machine.

### Proposed domain objects

```ts
type CodePersistenceState =
  | { kind: 'clean' }
  | { kind: 'dirty' }
  | {
      kind: 'saving';
      requestId: number;
      content: string;
      expectedRevision: string;
    }
  | { kind: 'conflict'; currentContentSha256: string | null }
  | { kind: 'failed'; errorCode: string };

type CodeReconciliationState =
  | { kind: 'not-required' }
  | { kind: 'pending'; receipt: WorkspaceFileSaveReceipt }
  | {
      kind: 'fresh';
      receipt: WorkspaceFileSaveReceipt;
      analysisSha256: string;
      projectContentSetSha256: string;
    }
  | {
      kind: 'degraded';
      receipt: WorkspaceFileSaveReceipt;
      freshness: 'stale-last-valid' | 'invalid' | 'unavailable';
    }
  | {
      kind: 'superseded';
      receipt: WorkspaceFileSaveReceipt;
      currentContentSha256: string;
    }
  | { kind: 'verification-unavailable'; receipt: WorkspaceFileSaveReceipt }
  | { kind: 'failed'; receipt: WorkspaceFileSaveReceipt; errorCode: string };
```

A pure projector derives presentation:

```ts
projectCodeWorkingTreeStatus({
  persistence,
  reconciliation,
  value,
  persistedContent,
});
```

Recommended precedence:

1. conflict;
2. persistence failure;
3. saving;
4. dirty;
5. reconciliation pending;
6. degraded/failed/superseded semantic state;
7. synchronized only when clean and fresh/not-required.

### Command/query and port changes

No new HTTP rail is needed for this slice.

Reuse:

- `SaveWorkspaceFileContent`;
- `WorkspaceFileSaveReceipt`;
- current workspace file CAS semantics;
- current reconciliation adapter.

Do not create a second save command or persist the old scalar phase as durable authority.

### Migration and compatibility strategy

- introduce the two-axis internal state behind existing hooks;
- keep current UI copy through a compatibility projector;
- migrate tests from scalar-state assertions to domain and projector assertions;
- delete the old scalar enum once all call sites use the projector;
- no data migration is required because the state is client runtime state.

### Rollback posture

Fail closed. If the new projector cannot determine semantic freshness, present
`verification-unavailable` and block semantic admission. Never fall back to false `synchronized`.

### Observability

Emit stable events/metrics for:

- persistence started/succeeded/conflicted/failed;
- reconciliation started/fresh/degraded/failed/superseded;
- edit during save;
- edit during reconciliation;
- reconciliation result ignored due to receipt mismatch;
- reconciliation pending duration.

Do not log SQL, YAML, raw transport errors, or authentication material.

### Security implications

No source content leaves the existing boundary. Correlate using opaque receipt identity and hashes.
User copy must remain localized and sanitized.

### Red/green tests

1. `A -> R1 pending -> B -> A -> R1 invalid` ends clean plus invalid.
2. Same sequence with fresh becomes synchronized only after fresh completion.
3. `R1` result is ignored after a newer `R2` save.
4. Failed reconciliation after edit/revert remains visible.
5. Edit during persistence still requires a second save before flush succeeds.
6. Edit during reconciliation still requires a second save when content differs.
7. Status announces pending/degraded state accessibly.

### Live browser proof

Use the protected DBT Code flow:

1. open model SQL;
2. save valid bytes and hold reconciliation;
3. edit to different bytes and return to persisted bytes;
4. release an invalid matching result;
5. verify `persisted invalid`, Preview blocked, and no false synchronized state;
6. reopen the same file;
7. repair SQL;
8. obtain fresh reconciliation;
9. Preview and Run the accepted revision.

### Acceptance criteria and release gate

- no matching reconciliation result can be erased by local edits;
- synchronized has a precise two-axis meaning;
- the two resolved PR #1996 P1 behaviors remain green;
- the unresolved P2 is answered with the fixing commit and resolved;
- unit, hook, presentation, architecture, and protected browser proof are green on the final head.

## Priority finding 2 — reconciliation is not bound to the exact project revision

### Severity and evidence

P1 authority and reproducibility.

`useDbtProjectFileCanvasController.ts` receives a `WorkspaceFileSaveReceipt` but names it `_receipt`
and ignores it. It calls `refreshProjectGraphSource()` and projects whatever project snapshot is latest
when the refetch completes.

Existing domain identities already include:

- `WorkspaceFileSaveReceipt.contentSha256`;
- `DbtProjectRevision.contentSetSha256`;
- `DbtProjectGraphProjection.analysisSha256`;
- file-backed Preview provenance.

The problem is failure to join existing identities, not missing vocabulary.

### Root cause and smells

- **Hidden authority:** latest refetch silently replaces operation-bound authority.
- **Leaky abstraction:** the controller presents a result as reconciliation of a save without proving
  that relationship.
- **Temporal coupling:** another file can change while analysis is running.

### User impact

A save to `models/a.sql` can be described as fresh using an analysis that also includes a concurrent,
unrelated change to `schema.yml`. Preview/Run can then operate on a revision different from the one
that Code claims to have reconciled.

### Owner and proposed contract

Owner: project-file authoring application boundary, with Canvas as adapter.

Reuse existing contracts and introduce one result schema:

```ts
type ReconcileWorkspaceFileWithDbtProjectResult =
  | {
      kind: 'fresh';
      saveReceipt: WorkspaceFileSaveReceipt;
      projectRevision: DbtProjectRevision;
      analysisSha256: string;
    }
  | {
      kind: 'degraded';
      saveReceipt: WorkspaceFileSaveReceipt;
      projectRevision: DbtProjectRevision;
      freshness: 'stale-last-valid' | 'invalid' | 'unavailable';
      diagnostics: readonly StableDbtDiagnostic[];
    }
  | {
      kind: 'superseded';
      saveReceipt: WorkspaceFileSaveReceipt;
      currentFileContentSha256: string | null;
      currentProjectContentSetSha256: string;
    };
```

### Rails and ports

Reuse:

- `ProjectDbtGraphFromFiles` query rail;
- file CAS authority;
- DBT projection contracts;
- Preview provenance.

The operation must verify:

1. the authoritative file still matches the save receipt;
2. the returned graph names the exact project content set analyzed;
3. the result is retained in Code/Canvas state;
4. Preview and Run consume, refresh, or explicitly reject that revision.

Publish a strict `@dvt/contracts` schema and parse it at the Web HTTP boundary.

### Compatibility and rollback

During migration, preserve durable file bytes if project verification fails, but mark the project
`superseded` or `verification-unavailable`. Never fall back to latest graph as though it verified the
original save.

Rollback disables semantic admission; it does not undo an already durable file unless the user invokes
a revision-bound revert.

### Observability and security

Record file receipt, project content-set hash, analysis hash, outcome, and mismatch category. Do not
record source content or raw diagnostics.

### Tests and protected proof

- save SQL, concurrently change `schema.yml`, then complete analysis;
- prove the original file is durable but project reconciliation is superseded or explicitly bound to
  the newer exact revision;
- prove the UI never attributes an unrelated content set to the save;
- prove Preview blocks or refreshes when its revision differs;
- protected proof shows identical content-set and analysis identities across Code, Preview, Run, and
  reopen.

### Acceptance and release gate

Every user-visible fresh result and every execution must expose one exact project revision. No
operation may silently mean “latest”.

## Priority finding 3 — graph-first Preview can partially publish a DBT project

### Severity and evidence

P1 data integrity.

For `planner_generic_preview`, `canvasPlanAction.ts` builds DBT artifacts and loops over them. For each
file it independently reads an expected revision and calls `saveFileContent`.

If the second or later file conflicts or fails, earlier writes remain durable. The project can contain
a new model SQL file with an old `schema.yml`, or vice versa.

### Root cause and smells

- **Transaction script in a view:** the Web layer informally orchestrates a multi-file commit.
- **Duplicate authority:** API already owns a stronger batch transaction.
- **Partial-failure blind spot:** success/failure is reported for a sequence, not an aggregate.

### Existing authority to reuse

`IWorkspaceFileBatchMutationPort` and `LocalWorkspaceFileBatchMutationGateway` already provide:

- complete expected-file preflight;
- compare-and-swap conflict reporting;
- multipath locking;
- idempotency-key reuse detection;
- one immutable receipt;
- atomic replacement of all entries and the receipt;
- retry deduplication.

Do not invent another transaction engine.

### Proposed command

```ts
type PublishDbtWorkspaceArtifacts = {
  idempotencyKey: string;
  projectRoot: string;
  expectedFiles: readonly {
    path: string;
    expectedContentSha256?: string;
  }[];
  artifacts: readonly {
    path: string;
    content: string;
  }[];
};
```

The API application command should:

1. validate normalized project-scoped paths;
2. preflight all expected revisions;
3. apply through `IWorkspaceFileBatchMutationPort`;
4. produce one publication receipt;
5. analyze the resulting exact project content set;
6. return the publication, project revision, and analysis identity.

### Compatibility, rollback, and failure posture

Replace the sequential path; do not retain it as fallback. On conflict or failure, commit zero project
file changes. Retry with the same idempotency key returns the same receipt.

### Observability and security

Record batch size, paths as normalized identifiers, conflict count, duration, receipt identity,
project content-set hash, and analysis hash. Never log file content. Preserve path traversal and scope
containment checks for every entry.

### Tests

- conflict on second artifact leaves every original hash unchanged;
- staged write failure leaves zero committed changes;
- same key/same request deduplicates;
- same key/different request fails;
- traversal and unsupported paths fail before mutation;
- oversized file and oversized batch return stable typed failures;
- protected graph-first Preview/Run/reopen uses the batch receipt revision.

### Acceptance and release gate

No graph-generated DBT project publication can produce a partially changed workspace.

## Priority finding 4 — accepted projects exceed interactive workspace capability

### Severity and evidence

P1 product capability truth.

DBT import defaults permit:

- 10,000 project files;
- 100,000 inspected entries;
- 50 MB project bytes;
- 5,000 directories;
- depth 64.

Interactive workspace behavior:

- silently stops listing after 500 files;
- returns no cursor;
- returns no complete/partial state;
- limits reads and writes to 1 MB per file;
- maps oversized files to `InvalidWorkspacePathError`;
- batch mutation separately limits 500 files, 1 MB/file, and 5 MB/batch.

### Root cause and smells

- **Stale capability truth:** import and interactive policies are separate authorities.
- **Primitive error semantics:** path invalidity is used for content size.
- **Silent truncation:** absence is indistinguishable from unlisted content.

### Product impact

DVT can accept and analyze a DBT project that Explorer/Code cannot fully enumerate, inspect, or edit.
Users cannot distinguish:

- absent file;
- file outside the first 500 entries;
- oversized file;
- unsupported file;
- policy rejection.

### Owner and proposed contracts

Workspace file query boundary, shared by API contracts and Web adapters.

```ts
type WorkspaceFileInventoryPage = {
  entries: readonly WorkspaceFileEntry[];
  nextCursor: string | null;
  completeness: 'complete' | 'partial';
  effectiveLimits: {
    maxFileBytes: number;
    maxPageEntries: number;
    maxBatchFiles: number;
    maxBatchBytes: number;
  };
};

type WorkspaceFileReadResult =
  | { kind: 'found'; file: WorkspaceFileContent }
  | { kind: 'not-found'; path: string }
  | { kind: 'oversized'; path: string; sizeBytes: number; maxBytes: number }
  | { kind: 'unsupported'; path: string; reason: string };
```

### Rails and ports

Extend the existing workspace file query rail and repository port with deterministic cursor-based
pagination. Share effective-limit policy across import, analysis, inventory, Code, and mutation rather
than increasing limits blindly.

### Compatibility and rollout

- retain current first-page shape behind an adapter only during migration;
- make partial inventory explicit immediately;
- add typed oversized results before changing thresholds;
- measure real project distributions before raising batch/file limits.

### Rollback, observability, security

Rollback to read-only partial inventory, never silent truncation. Record page count, total discovered,
partial reason, and size rejections without logging paths containing secrets or file content.

### Tests and proof

- deterministic ordering at 500 and 501 files;
- multipage cursor stability;
- near-10,000 accepted project inventory;
- >1 MB typed read outcome;
- >5 MB batch typed outcome;
- project with generated/dependency directories excluded consistently;
- browser proof shows partial state and navigates later pages.

### Acceptance gate

The UI must always tell the user whether the visible inventory is complete and why a file cannot be
opened.

## Priority finding 5 — generic Web response typing is not runtime validation

### Severity and evidence

P1 for new authority-bearing endpoints; P2 for existing low-risk generic reads.

`createApiClient.requestJson<TResponse>` parses arbitrary JSON and returns
`parsedBody as TResponse`. HTTP success therefore creates compile-time trust without runtime proof.

This is inconsistent with strict Zod contracts already used in nearby DBT projection boundaries.

### Root cause

- **Leaky generic:** transport parsing and domain validation are conflated.
- **Test-only confidence:** TypeScript cannot validate external JSON at runtime.

### Route

Do not rewrite every endpoint in the same PR. Require shared `@dvt/contracts` schemas for new
reconciliation, publication, and inventory results and parse them at the Web boundary.

Recommended client shape:

```ts
getJson<T>(endpoint, schema: ZodType<T>, init?): Promise<T>;
postJson<TRequest, TResponse>(endpoint, payload, responseSchema, init?): Promise<TResponse>;
```

Schema failure must become a stable contract error with endpoint and schema identity, excluding raw
source content.

### Acceptance

No new authority-bearing result enters Code/Canvas/Preview/Run via a TypeScript cast.

## Priority finding 6 — navigation safety is not durable recovery

### Severity and evidence

P2 resilience and user trust.

The Code navigation guard:

- flushes before SPA navigation;
- blocks or resets navigation based on the flush result;
- registers `beforeunload` while blocked.

It does not persist an unsaved buffer for recovery after:

- browser crash;
- renderer termination;
- operating-system failure;
- power loss;
- process kill.

### Route

After the core transaction slices are stable, extract a cohesive `DbtProjectAuthoringSession` owning:

- exact project revision;
- file buffers and base revisions;
- save receipts;
- reconciliation outcomes;
- Preview/Run admission;
- navigation policy;
- crash-recovery journal.

Journal records should be keyed by workspace, project, path, and base revision and offer restore,
discard, and rebase/conflict choices. Do not persist secrets or raw diagnostics.

Do not build a generic authoring framework before PRs A-C prove common behavior.

## Quality, accessibility, performance, operability, and documentation

## What is strong

- architecture dependency checks;
- broad package unit tests;
- Canvas presentation tests;
- protected-live DBT flows;
- deterministic contracts;
- CAS file writes;
- path containment;
- atomic batch infrastructure;
- Planning DB integrity and mechanization;
- release candidate integrity tooling;
- coordinated Temporal adapter/worker integration tests.

## Evidence gaps

The root `ci:full` command runs:

```text
ci:docs
ci:code
test:coverage:engine
```

It does not expose equivalent root coverage ratchets for Web and API. The repository has many Web/API
tests, but that is not the same as an explicit release threshold.

No explicit root gate was found for:

- automated accessibility on critical Canvas/Code/menu/dialog flows;
- bundle-size budget;
- deterministic large-graph performance;
- broad storage/analyzer/network failure injection;
- exact squash-main workflow identity.

These are evidence gaps, not proof of poor accessibility or performance.

`docs/architecture/system-delivery-status.md` is titled `Current Status`, marked `Active`, and says it
answers what is true now. Its `last_reviewed` and snapshot date are 2026-04-26. It must be generated,
expire mechanically, or be renamed as a dated snapshot.

## Mature-system comparison — Match / Differentiate / Defer

| Reference | Match now | Differentiate | Defer |
| --- | --- | --- | --- |
| dbt Studio / dbt VS Code | Separate buffer, durable file, parse diagnostics, project index, execution and VCS state. | Expose exact content-set and analysis hashes as first-class evidence. | Broad cloud collaboration and branch UX. |
| Professional IDE + Git | Distinct dirty, saved, conflict, diff, commit, branch and remote-sync states; explicit merge/revert. | Keep DBT semantic freshness as an independent axis. | Full Git client until file/project authority is correct. |
| Airflow DAG Bundles | Bind every file required for a run/rerun to one bundle version. | DVT can join authoring admission and execution evidence directly. | Scheduler breadth and multi-language task SDKs. |
| Prefect deployments | Version history, rollback/promotion and exact Git commit/image digest. | Use DVT content-set and analysis identities instead of deployment-only metadata. | Promotion UI until exact project revision is closed. |
| Dagster | Assets, lineage, checks, freshness, observability and testability. | Preserve DBT compatibility and bidirectional graph/code authoring. | Asset-platform expansion until authoring transactions are trustworthy. |
| Temporal | Durable identity, retry, idempotency, recovery and explicit outcomes. | Apply receipt correlation without embedding a workflow engine in the editor reducer. | Long-running authoring orchestration. |
| NiFi / Git flow versioning | Explicit local/version drift, conflict, aggregate publish and revert. | Use Git/content hashes and existing receipts rather than another proprietary registry. | Registry product; NiFi Registry itself is deprecated in favor of Git clients. |

Official references:

- [dbt Developer Hub](https://docs.getdbt.com/)
- [Airflow DAG Bundles](https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/dag-bundles.html)
- [Prefect deployment versioning](https://docs.prefect.io/v3/how-to-guides/deployments/versioning)
- [Dagster documentation](https://docs.dagster.io/)
- [Temporal documentation](https://docs.temporal.io/)
- [NiFi Registry deprecation notice](https://nifi.apache.org/projects/registry/)
- [VS Code source-control overview](https://code.visualstudio.com/docs/sourcecontrol/overview)

## Ordered implementation route

### PR A — split persistence and reconciliation truth

Scope only:

- introduce `CodePersistenceState` and `CodeReconciliationState`;
- pure status projection;
- receipt-based outcome admission independent of visual phase;
- reducer, hook, accessible presentation, architecture, and protected browser proof;
- answer and resolve PR #1996 P2.

Do not add HTTP rails, batch publication, pagination, release changes, or a generic authoring framework.

### PR B — exact save/project/analysis revision

- introduce and runtime-parse the revision-bound reconciliation result;
- use the save receipt instead of ignoring it;
- retain exact project revision in authoring state;
- require Preview/Run to consume, refresh, or reject that revision;
- protected proof across edit, reopen, Preview and Run.

### PR C — atomic DBT artifact publication

- API application command using `IWorkspaceFileBatchMutationPort`;
- complete expected revisions;
- one idempotency key and receipt;
- exact resulting project and analysis revision;
- remove sequential fallback;
- conflict and injected-failure proofs.

### PR D — truthful workspace inventory

- deterministic pagination;
- complete/partial state;
- effective limits;
- typed oversized/not-found/unsupported results;
- shared policy authority;
- large accepted-project proof.

### PR E — durable authoring session and recovery

Only after A-C:

- cohesive authoring session boundary;
- crash-recovery journal;
- restore/discard/rebase choices;
- no secrets or raw diagnostics persisted.

### PR F — nonfunctional release gates and generated current status

- Web/API coverage ratchets;
- accessibility checks on critical flows;
- bundle budget;
- deterministic large-graph benchmarks;
- failure injection;
- exact-main/tag evidence;
- generated/expiring status document.

## Product release gates

Do not describe the authoring route as mature until:

- no unresolved P1/P2 semantic-truth review thread remains;
- synchronized has a precise two-axis meaning;
- Code, Canvas, Preview and Run expose the same exact project revision;
- graph-first project publication is atomic and idempotent;
- workspace inventory completeness and effective limits are visible;
- new authority results are runtime validated;
- protected browser proof covers edit/save/conflict/invalid/recover/reopen/run;
- crash recovery has explicit evidence or is explicitly limited;
- accessibility and large-graph performance have release evidence or documented limits;
- final release head/tag has machine-readable evidence.

## Files the implementation agent should inspect first

1. [`codeWorkingTreeSyncModel.ts`](https://github.com/dunay2/dvt/blob/dc307884894ed0ee9eed43b9548cb241a22c8300/apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts)
2. [`codeWorkingTreeSyncModel.test.ts`](https://github.com/dunay2/dvt/blob/dc307884894ed0ee9eed43b9548cb241a22c8300/apps/web/src/app/views/code/codeWorkingTreeSyncModel.test.ts)
3. [`useCodeWorkingTreeSync.ts`](https://github.com/dunay2/dvt/blob/dc307884894ed0ee9eed43b9548cb241a22c8300/apps/web/src/app/views/code/useCodeWorkingTreeSync.ts)
4. [`CodeWorkingTreeStatus.tsx`](https://github.com/dunay2/dvt/blob/dc307884894ed0ee9eed43b9548cb241a22c8300/apps/web/src/app/views/code/CodeWorkingTreeStatus.tsx)
5. [`useDbtProjectFileCanvasController.ts`](https://github.com/dunay2/dvt/blob/dc307884894ed0ee9eed43b9548cb241a22c8300/apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts)
6. [`DbtProjectGraphProjection.v1.ts`](https://github.com/dunay2/dvt/blob/dc307884894ed0ee9eed43b9548cb241a22c8300/packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts)
7. [`dbtProjectFileExecutionStrategy.ts`](https://github.com/dunay2/dvt/blob/dc307884894ed0ee9eed43b9548cb241a22c8300/apps/web/src/app/views/canvas/dbtProjectFileExecutionStrategy.ts)
8. [`canvasPlanAction.ts`](https://github.com/dunay2/dvt/blob/dc307884894ed0ee9eed43b9548cb241a22c8300/apps/web/src/app/views/canvas/canvasPlanAction.ts)
9. [`workspaceFiles.ts`](https://github.com/dunay2/dvt/blob/dc307884894ed0ee9eed43b9548cb241a22c8300/apps/api/src/application/ports/workspaceFiles.ts)
10. [`LocalWorkspaceFileBatchMutationGateway.ts`](https://github.com/dunay2/dvt/blob/dc307884894ed0ee9eed43b9548cb241a22c8300/apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.ts)
11. [`LocalWorkspaceFileRepository.ts`](https://github.com/dunay2/dvt/blob/dc307884894ed0ee9eed43b9548cb241a22c8300/apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts)
12. [`LocalDbtProjectImportInspector.ts`](https://github.com/dunay2/dvt/blob/dc307884894ed0ee9eed43b9548cb241a22c8300/apps/api/src/infrastructure/dbt/LocalDbtProjectImportInspector.ts)
13. [`createApiClient.ts`](https://github.com/dunay2/dvt/blob/dc307884894ed0ee9eed43b9548cb241a22c8300/apps/web/src/app/services/api/createApiClient.ts)
14. [`CodeWorkingTreeNavigationGuard.tsx`](https://github.com/dunay2/dvt/blob/dc307884894ed0ee9eed43b9548cb241a22c8300/apps/web/src/app/views/code/CodeWorkingTreeNavigationGuard.tsx)
15. [`system-delivery-status.md`](https://github.com/dunay2/dvt/blob/dc307884894ed0ee9eed43b9548cb241a22c8300/docs/architecture/system-delivery-status.md)
16. [`Temporal upgrade evidence`](https://github.com/dunay2/dvt/blob/dc307884894ed0ee9eed43b9548cb241a22c8300/docs/evidence/ED-20260721-temporal-sdk-1-20-upgrade.md)

## Final decision

DVT is not stalled, but the current activity is maintenance and release packaging rather than product
convergence. The Temporal upgrade is appropriately validated and should be treated as closed
maintenance. Release 0.5.2 may proceed independently after its custom integrity check and human review
are verified.

The next product move is unchanged and now overdue: PR A must split persistence from reconciliation,
close the reviewed P2, and prove `edit -> save -> analyze -> edit/revert -> invalid -> repair -> Preview
-> Run` as one truthful user transaction.

After that, join the identities DVT already owns, route publication through the batch transaction DVT
already owns, and make workspace capability limits explicit. Do not spend the next product cycle on
another release/governance expansion.

## Documentation-only validation

- branch created from exact current `main@dc307884894ed0ee9eed43b9548cb241a22c8300`;
- one Markdown file under the required review path;
- repository, commits, open PR, standard CI, review threads, release branch, Temporal evidence, product
  code, contracts, tests, governance, operability, security, integrity, recovery and documentation
  inspected through GitHub;
- official mature-system documentation used for comparison;
- no local runtime execution claimed;
- no runtime code, workflow, dependency, contract, migration, generated artifact, release metadata,
  product behavior or merge state changed by this report.
