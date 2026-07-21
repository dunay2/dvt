---
title: DVT CI/release churn and product-authority Fowler review
date: 2026-07-21T04:40:00+02:00
status: current-review
reviewed_main_sha: 6d8167ace3650cf68c1ebcadd84b604b5db1792e
scope: documentation-only
---

# DVT CI/release churn and product-authority Fowler review

## Purpose and authority

This report is a point-in-time engineering intake for the GPT implementing work in
[`dunay2/dvt`](https://github.com/dunay2/dvt). It inspects the exact current `main`, recent commits,
all visible open pull requests, CI identity, review threads, release posture, relevant branch work,
and the current product code paths that own dbt Code persistence, semantic reconciliation, project
revision identity, Canvas Preview publication, workspace-file capabilities, Web/API transport
boundaries, recovery, and quality evidence.

The report is intentionally documentation-only. It does not authorize a merge and does not replace
Planning DB as the executable work authority. Any accepted finding must be reconciled into the
existing DB-first tasks, rails, components, evidence, and ownership records rather than creating a
second planning language.

## Reviewed identities

- Repository: [`dunay2/dvt`](https://github.com/dunay2/dvt)
- Exact current `main`:
  [`6d8167ace3650cf68c1ebcadd84b604b5db1792e`](https://github.com/dunay2/dvt/commit/6d8167ace3650cf68c1ebcadd84b604b5db1792e)
- Previous reviewed main:
  [`6cc7a10af42c6883d9c10780e664c0504990a7ac`](https://github.com/dunay2/dvt/commit/6cc7a10af42c6883d9c10780e664c0504990a7ac)
- Current open PR:
  [#2023 — Release 0.5.2](https://github.com/dunay2/dvt/pull/2023)
- Most recent merged PR:
  [#2024 — Update setup-node consumers atomically](https://github.com/dunay2/dvt/pull/2024)
- Last product implementation merge:
  [#1996 — Harden DBT code persistence reconciliation](https://github.com/dunay2/dvt/pull/1996)
- Review branch: `agent/dvt-review-20260721-0440`

## Executive verdict

The repository is active, but the material delta since the previous review is entirely CI,
dependency, release, and governance maintenance. `main` is seven commits ahead of the previous
reviewed SHA, yet none of those commits modifies Web product behavior, API business behavior,
Canvas/dbt authoring, engine/runtime semantics, or the outstanding product-authority path.

The maintenance work is not worthless. The repository now has normalized Dependabot titles,
atomically version-aligned CodeQL and setup-node consumers, updated pinned actions, and a published
`0.5.1`. The open `0.5.2` release candidate has six successful standard workflows and concise,
non-duplicated notes.

However, this activity is release churn rather than product progress. The unresolved Code
reconciliation defect merged with #1996 remains present in current `main`; the Canvas controller
still ignores the save receipt when obtaining dbt analysis; graph-first Preview still writes a
multi-file dbt project sequentially despite an existing atomic batch mutation authority; accepted
dbt project scale still exceeds interactive workspace capabilities; Web JSON responses are still
trusted through generic casts; hard browser/process loss still has no durable Code draft recovery;
and the root quality command still ratchets coverage only for Engine.

The strongest Fowler conclusion is therefore:

> Stop spending the next product cycle on CI/release version churn. Close one real user transaction:
> a Code edit whose bytes, dbt analysis, project revision, Preview, Run, navigation, and recovery
> remain truthful under concurrency and failure.

The next functional PR must separate persistence state from reconciliation state and resolve the
non-outdated #1996 P2. It must not be combined with release generation, dependency upgrades,
workspace pagination, or a premature generic authoring framework.

## Material delta since the previous review

### Seven commits landed

From `6cc7a10a` to `6d8167ac`, `main` contains seven commits:

1. `fix(ci): Generate valid Dependabot pull request titles` (#2019)
2. `chore(ci): Update CodeQL actions atomically` (#2022)
3. `chore(main): Release 0.5.1` (#2017)
4. `chore(ci): Bump actions/checkout from 7.0.0 to 7.0.1` (#2021)
5. `chore(deps-dev): Bump the linting group` (#2015)
6. `chore(ci): Bump actions/setup-python from 6.3.0 to 7.0.0` (#2004)
7. `chore(ci): Update setup-node consumers atomically` (#2024)

The compare contains workflow YAML, the reusable setup-node action, Dependabot configuration,
release metadata, package/lock updates, CI governance tests, and one Planning DB migration. It does
not contain a product Web/API/runtime implementation change.

### Delivered and valid maintenance improvements

- Dependabot no longer generates duplicated Conventional Commit scopes such as
  `chore(ci)(deps)`.
- CodeQL init/analyze consumers are kept on one immutable action version.
- All setup-node consumers, including the repository-local composite action, are checked for one
  immutable SHA and version annotation.
- `0.5.1` was published with a concise changelog.
- Recent CI maintenance heads had six successful standard workflows before merge.

### New process limitation

Recent PR conversations for #2019, #2022, #2023, and #2024 show that automated Codex review could
not run because its review usage limit was reached. This does not invalidate green CI, but it removes
a review layer that earlier PRs relied on. A green mechanical gate is not a substitute for a fresh
human review of release-policy, workflow-permission, dependency-major, or concurrency semantics.

### No visible product branch

No open product PR is visible. The only open PR is the release candidate. No visible branch search
result indicates active work on dbt reconciliation, project authoring authority, atomic publication,
or workspace capability truth.

## Current open PR and release decision

### PR #2023 — Release 0.5.2

Current head:
[`823fa9ab8f53877bd0c9d0f29ac0db59dc53b4a3`](https://github.com/dunay2/dvt/commit/823fa9ab8f53877bd0c9d0f29ac0db59dc53b4a3)

Changed files:

- `.release-please-manifest.json`
- `CHANGELOG.md`
- `package.json`

Standard workflow state:

- Dependency Review: success
- CI - Code Quality: success
- Contracts & Determinism: success
- CodeQL: success
- Test Suite: success
- PR Quality Gate: success

Inline review threads: none.

The release notes contain only CI/dependency maintenance. They are normalized and do not repeat the
old merge/parent duplication defect. The previous release-note finding is therefore fixed.

### Release gate that remains unverified through the connector

The repository now requires a custom `Release candidate integrity` Check Run. The connector exposes
the six standard workflows but does not expose a custom check/status on the exact head. Therefore
this report does not claim that the custom admission check is green.

### Recommendation for #2023

Do not merge solely because the six standard workflows are green. Before merge:

1. confirm the custom `Release candidate integrity` check is successful on exact head `823fa9ab8f`;
2. obtain a human review because Codex review was unavailable;
3. confirm the release version bump is intentional for maintenance-only changes;
4. confirm the tag target will be the exact admitted head/tree;
5. retain concise maintenance classification in the release notes.

This is not a product-blocking release defect. It is an evidence and release-signal decision. A
maintenance-only `0.5.2` is mechanically defensible, but releasing every CI/dependency group as a
public patch version creates version noise and makes product progress harder to read.

## Exact-main CI identity

The final PR #2024 head had all six standard workflows green. The exact merge commit currently on
`main`, however, has no connector-visible PR-triggered runs or combined statuses. The evidence chain
is therefore:

- green PR head;
- merge to main;
- no connector-visible exact-main status.

This remains an evidence gap, not proof that `main` is broken. Release/tag admission should bind the
exact tree identity rather than infer it from an ancestor head.

## Review-thread state

### Resolved on PR #1996

Two P1 interleaving defects were fixed:

- `flush()` no longer approves a newer unsaved edit while an earlier reconciliation is in flight;
- a newer edit made while file persistence is in flight remains modified and requires a second save.

### Still unresolved and non-outdated

One P2 remains open on
[`codeWorkingTreeSyncModel.ts`](https://github.com/dunay2/dvt/blob/6d8167ace3650cf68c1ebcadd84b604b5db1792e/apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts):

> Keep pending reconciliation visible when edits revert.

Reproduction:

1. persisted content is `A`;
2. save receipt `R1` is under dbt reconciliation;
3. user changes the buffer to `B`;
4. user changes the buffer back to `A` before `R1` completes;
5. the scalar phase can become `synchronized` while `pendingReconciliation` still exists;
6. `reconciliation_completed` or `reconciliation_failed` is ignored because the reducer requires
   `phase === 'reconciling'`;
7. an `invalid`, `stale`, `unavailable`, `verification-unavailable`, `superseded`, or failed outcome
   can disappear from user-visible truth.

The current source still has the exact precondition that creates the loss:

```ts
if (
  state.phase !== 'reconciling' ||
  state.pendingReconciliation == null ||
  !isSameSaveReceipt(state.pendingReconciliation, event.receipt)
) {
  return state;
}
```

The failure path has the same phase dependency. The finding remains active and release-relevant for
product semantics.

## Previous finding disposition

| Finding | Current disposition | Evidence summary |
| --- | --- | --- |
| Raw selection-recovery `Error.message` exposed | Fixed | Localized stable copy landed in the reconciliation work. |
| Latest edit lost during persistence | Fixed | #1996 reducer/hook interleaving proof and current source preserve modified state. |
| Latest edit lost during reconciliation | Fixed for dirty bytes | Newer bytes require another save; stale receipts are rejected. |
| Edit → revert hides pending reconciliation | Active | #1996 P2 unresolved; phase-gated completion remains in current main. |
| Exact project revision ignored after file save | Active | Controller accepts `_receipt` and discards it before latest refetch. |
| Sequential graph-first dbt publication | Active | `canvasPlanAction.ts` calls single-file save in a loop. |
| Atomic multi-file authority absent | Disproved | API already has `IWorkspaceFileBatchMutationPort` and crash-safe atomic gateway. The defect is failure to reuse it. |
| Import/workspace capacity mismatch | Active | Import accepts 10,000 files/50 MB; workspace lists 500 and reads 1 MB files. |
| Release note merge-parent duplication | Fixed | 0.5.0/0.5.1/0.5.2 notes are outcome/PR based and concise. |
| Release workflows stuck `action_required` | Fixed | 0.5.0 and 0.5.1 published; 0.5.2 standard workflows are green. |
| Release candidate integrity absent | Fixed at design/implementation level | Trusted candidate assessment exists; exact custom check still must be verified per candidate. |
| Product-code progress after #1996 | Disproved | Current seven-commit delta is CI/dependency/release only. |
| Current-state documentation is current | Disproved | `system-delivery-status.md` says current but was last reviewed 2026-04-26. |

## Product and architecture review

## 1. Code working-tree truth

### Severity

P2 correctness and release-quality blocker for dbt authoring.

### Root cause

`CodeWorkingTreeSyncState.phase` is a product of multiple independent state machines but is stored as
one enum. It represents:

- clean/dirty buffer;
- save in flight;
- write conflict;
- write failure;
- semantic reconciliation pending;
- semantic reconciliation failed;
- stale/invalid/unavailable analysis;
- verification unavailable;
- superseded authority.

This is **responsibility overload**, **primitive obsession**, and **temporal coupling**. Correctness
changes depending on whether an edit arrives before save acknowledgement, after save acknowledgement,
before dbt analysis, or after analysis.

### User impact

The UI can say synchronized while the authoritative file has a pending or failed/invalid semantic
outcome. Preview/Run decisions can then be made against misleading status.

### Exact owner

The application-domain owner is the Code working-tree synchronization model:

- `apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts`
- `apps/web/src/app/views/code/useCodeWorkingTreeSync.ts`
- `apps/web/src/app/views/code/CodeWorkingTreeStatus.tsx`

Canvas should remain an adapter supplying reconciliation, not become the owner of this state machine.

## 2. Hidden whole-project revision authority

### Severity

P1 integrity for multi-file dbt projects.

### Current behavior

`useDbtProjectFileCanvasController.ts` receives a `WorkspaceFileSaveReceipt` but names it `_receipt`
and ignores it:

```ts
const reconcileCodeFilePersistence = useCallback(
  async (_receipt: WorkspaceFileSaveReceipt) => {
    return projectDbtCodeReconciliationOutcome(await refreshProjectGraphSource());
  },
  [refreshProjectGraphSource]
);
```

A generic latest refetch can analyze a project content set that includes a concurrent change to
another file. The UI can then attribute a fresh analysis to the original save even though the full
project revision differs.

### Fowler smell

**Hidden authority** and **leaky abstraction**: the API exposes content hashes and project revision
identity, but the controller reduces the operation to timing and “latest data”.

### User impact

- Code can report a fresh project for the wrong aggregate revision.
- Preview can consume a different revision than Code accepted.
- Run can be reproducible only accidentally.
- Conflict detection covers the edited file, not the entire analyzed project.

### Existing concepts to reuse

- `WorkspaceFileSaveReceipt`
- `DbtProjectRevision` / `projectContentSetSha256`
- `DbtProjectGraphProjection.analysisSha256`
- `ProjectDbtGraphFromFiles` query rail
- existing file CAS semantics
- existing Preview/Run provenance

No parallel revision language is required.

## 3. Non-atomic graph-first publication

### Severity

P1 data integrity.

### Current behavior

`canvasPlanAction.ts` builds generated dbt artifacts and loops over them:

```ts
for (const artifact of artifactProjection.artifacts) {
  await workspaceFileContentCommand.saveFileContent({
    path: artifact.path,
    content: artifact.content,
    expectedRevision: await readExpectedWorkspaceFileRevision(...),
  });
}
```

A conflict or failure after one successful write leaves the project partially modified.

### Existing correct authority

`LocalWorkspaceFileBatchMutationGateway` already provides:

- full expected-revision preflight;
- all-path coordination;
- idempotency-key/request-hash conflict detection;
- per-path conflict results;
- atomic replacement through one transaction directory;
- immutable batch receipt;
- retry returning the prior receipt when postconditions still match.

This is not a missing-platform problem. It is **architectural inversion**: the Web path bypasses the
stronger server-owned mutation authority and reconstructs a weaker transaction in a view action.

### User impact

A Preview can corrupt the working project into a hybrid of old and new generated files while still
presenting the operation as one logical action.

## 4. Workspace capability truth

### Severity

P1 product-scale integrity.

### Contradiction

The import inspector accepts by default:

- 10,000 source files;
- 100,000 inspected files;
- 50 MB project content;
- 5,000 directories;
- depth 64.

The interactive workspace repository:

- silently stops listing at 500 files;
- returns no cursor or `complete | partial` marker;
- limits an individual file to 1 MB;
- reports an oversized file through `InvalidWorkspacePathError`, conflating size with path validity.

The batch gateway is also limited to 500 files and 5 MB per mutation, which may be reasonable for one
operation but must be explicit and separate from import/inventory limits.

### User impact

A project can be accepted and analyzed but cannot be fully discovered or operated through Explorer
and Code. Users cannot distinguish “file absent” from “not listed” or “oversized”.

### Fowler smell

**Duplicated policy authority** and **false capability**. Limits are distributed across importer,
repository, batch mutation, API, and UI without one effective capability projection.

## 5. Web/API runtime contract trust

### Severity

P2 boundary integrity; P1 for any new authority-bearing rail.

`createApiClient` parses JSON and returns:

```ts
return parsedBody as TResponse;
```

The generic provides compile-time confidence only. A malformed, stale, or independently deployed API
response can cross the boundary without runtime validation.

The repository already uses `@dvt/contracts` schemas on nearby dbt import and editing rails. New
project-revision, batch-publication, inventory, and recovery results should be schema-first and parsed
at the boundary. Do not create local duplicate Zod/domain contracts in Web.

## 6. Recovery posture

### Current behavior

`CodeWorkingTreeNavigationGuard`:

- blocks SPA navigation;
- attempts `flush()` before proceeding;
- registers `beforeunload` to warn on browser exit.

### Remaining gap

A browser crash, process kill, power loss, or ignored unload prompt has no durable local draft journal
or server-side unsaved-draft recovery path. The warning is not recovery.

### Required posture

After authority/revision correctness is fixed, add a bounded crash-recovery journal keyed by:

- workspace/project identity;
- normalized file path;
- persisted content hash;
- draft content hash;
- last update time;
- schema version.

Recovery must never overwrite authoritative content automatically. It should reopen as a proposal,
compare against current CAS baseline, and require explicit apply/discard.

## 7. Quality, accessibility, and performance

### What is strong

- broad standard workflows;
- package tests;
- protected live dbt flows;
- deterministic and architecture checks;
- dependency review and CodeQL;
- extensive Planning DB/governance integrity.

### What is not yet a release ratchet

The root `ci:full` command executes docs, code, and Engine coverage only:

```text
ci:full = ci:docs + ci:code + test:coverage:engine
```

Web and API tests exist, but the root does not show an equivalent explicit coverage ratchet for them.
This review also did not find a root release gate for:

- automated accessibility scanning of critical Canvas/Code flows;
- JS bundle-size budgets;
- large-graph interaction budgets;
- import/listing latency at accepted project scale;
- load/chaos proof of multi-worker or external dependency failures.

Absence from this search is not proof that no isolated test exists. It means these concerns are not
visible as first-class root release policy.

## 8. Security review

### Positive

- GitHub actions are pinned by immutable SHA.
- Setup-node/CodeQL parity is now mechanically checked.
- release candidate assessment separates trusted-base execution from candidate content.
- workspace paths are normalized and scoped.
- file and batch writes use CAS and idempotency.
- raw SQL/source content should not be logged by the proposed observability path.

### Active risks

- generic Web JSON casts trust an unvalidated network boundary;
- oversized-file errors use misleading path semantics and can cause unsafe fallback behavior;
- custom release check visibility is not available through the connector and must be proven on exact
  candidate head;
- recent maintenance PRs lacked automated Codex review because quota was exhausted;
- the release-policy configurator modifies repository settings before ruleset update and has no
  compensating rollback if the second operation fails.

## 9. Release-policy configurator operability

`releaseMergePolicyCli configure` does a concurrency fingerprint check, then:

1. PATCHes repository settings;
2. rereads the ruleset;
3. PUTs the ruleset;
4. reloads and assesses final policy.

If step 2 detects drift, or step 3 fails, step 1 has already changed the repository. There is no
compensation receipt or rollback.

This is a smaller operational concern than the product-authority defects, but it is a real
multi-resource transaction. Before the configurator is used routinely, it should capture an initial
snapshot, perform compare-and-swap checks, record each applied step, verify final state, and attempt a
bounded compensating restore on partial failure.

## 10. Documentation truth

`docs/architecture/system-delivery-status.md` is titled “Current Status”, marked Active, and says it
is the current implementation snapshot. Its `last_reviewed` and snapshot date are 2026-04-26.

Planning DB is the current work authority, but a prominently linked document that claims current truth
while being almost three months behind creates **stale truth**. Either generate it from current
mechanical sources, label it historical, or reduce its claim to a navigation overview.

## Fowler assessment

### Responsibility overload

A single Code phase owns persistence, dirty state, conflict, semantic freshness, and authority. Split
orthogonal concerns.

### Temporal coupling

Correctness depends on event timing. Receipt matching should decide acceptance; presentation phase
must not.

### Primitive obsession

String phases encode a rich protocol. Use typed persistence and reconciliation states with explicit
identities.

### Hidden authority

A save receipt and project revision exist, but the controller discards the former and treats latest
refetch as authority.

### Leaky abstraction

Canvas performs file-by-file transactional orchestration even though a server batch port owns atomic
mutation.

### Shotgun surgery

Narrow authoring fixes have repeatedly required changes across reducers, hooks, Canvas, Cypress,
architecture tests, evidence, and many Planning DB migrations. Stabilize one cohesive application
boundary before adding more authoring features.

### Test-only confidence

The six standard workflows can be green while:

- a review-thread interleaving remains unmodeled;
- the custom release check is not visible through the same evidence query;
- runtime JSON is accepted through casts;
- exact-main evidence is absent.

### Governance/product imbalance

The repository has sophisticated release and Planning DB machinery, but core user transactions still
lack whole-project revision binding, atomic publication, complete inventory, and crash recovery.

### Product dead-end to avoid

Do not create another proprietary flow registry, another project mutation DSL, or another generic
session framework before the existing file authority and batch port are used end-to-end.

## Mature-system comparison: Match / Differentiate / Defer

| System | Mature behavior | DVT decision | Concrete implication |
| --- | --- | --- | --- |
| dbt Studio / professional IDE | Separates editor buffer, saved file, parser/compiler diagnostics, project index, execution, and VCS state. | **Match** the truth separation; **differentiate** with explicit execution receipts. | Never let `synchronized` mean both saved and semantically fresh. |
| VS Code + Git | Changes, staging, commits, branches, conflicts, and remote sync are distinct states. | **Match** explicit state and conflict UX; **defer** full Git hosting UX. | Show local draft, persisted file, analyzed project revision, and repository state independently. |
| Airflow DAG Bundles | Versions the whole file bundle; a run can stay on one exact version even when code changes. | **Match** whole-project revision binding. | Preview/Run admit one `projectContentSetSha256`, not “latest”. |
| Prefect deployments | Keeps deployment version history, rollback/promotion, and exact Git commit/image digest execution. | **Match later** after revision identity is trustworthy. | Persist accepted project revisions and allow explicit promote/rollback later. |
| Dagster | Declarative assets, integrated lineage/observability, and strong testability. | **Defer** asset/check expansion until authoring integrity is closed. | Use Dagster as the product direction for asset health, not as an excuse for another abstraction now. |
| Temporal | Durable operation identity, idempotency, and recovery after crashes/outages. | **Match** receipts, idempotency, and resumable outcomes; **differentiate** by keeping editor state simple. | Correlate by receipt and revision, never by timing. |
| NiFi | Versioned visual flows and visible local/remote change states. NiFi Registry is now deprecated in favor of Git clients. | **Match** visual change-state clarity; **do not copy** a proprietary registry. | Build on files/Git-compatible revisions and atomic receipts. |

## Recommended implementation route

## PR A — split Code persistence and reconciliation truth

### Scope

The next functional PR. No release, batch, pagination, or generic session work.

### Domain objects

```ts
type CodePersistenceState =
  | Readonly<{ kind: 'clean' }>
  | Readonly<{ kind: 'dirty' }>
  | Readonly<{
      kind: 'saving';
      requestId: number;
      content: string;
      expectedRevision: string;
    }>
  | Readonly<{ kind: 'conflict'; currentContentSha256: string | null }>
  | Readonly<{ kind: 'failed' }>;

type CodeReconciliationState =
  | Readonly<{ kind: 'not-required' }>
  | Readonly<{ kind: 'pending'; receipt: WorkspaceFileSaveReceipt }>
  | Readonly<{
      kind: 'fresh';
      receipt: WorkspaceFileSaveReceipt;
      analysisSha256: string;
      projectContentSetSha256: string;
    }>
  | Readonly<{
      kind: 'degraded';
      receipt: WorkspaceFileSaveReceipt;
      freshness: 'stale-last-valid' | 'invalid' | 'unavailable';
    }>
  | Readonly<{ kind: 'verification-unavailable'; receipt: WorkspaceFileSaveReceipt }>
  | Readonly<{
      kind: 'superseded';
      receipt: WorkspaceFileSaveReceipt;
      currentContentSha256: string;
    }>
  | Readonly<{ kind: 'failed'; receipt: WorkspaceFileSaveReceipt }>;
```

`edited` changes only persistence/local-buffer truth. It must not clear or hide reconciliation.
`reconciliation_completed` and `reconciliation_failed` match the current receipt and update only the
reconciliation axis. A pure projector derives the presentation state.

### Presentation precedence

1. write conflict;
2. write failure;
3. saving;
4. dirty buffer;
5. reconciliation pending;
6. degraded/failed/superseded reconciliation;
7. synchronized only when content is clean and reconciliation is fresh or not required.

### Red tests

1. `pending R1 -> edit B -> revert A -> invalid R1` ends clean + invalid.
2. `pending R1 -> edit B -> revert A -> fresh R1` becomes synchronized only after completion.
3. reconciliation failure after revert remains visible.
4. an older receipt is ignored after a newer receipt exists.
5. dirty content retains the last persisted semantic outcome without presenting it as the dirty
   content's analysis.
6. status presentation announces “saved, analysis pending” when bytes equal persisted content.
7. navigation `flush()` distinguishes content durability from semantic freshness.

### Files

- `apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts`
- `apps/web/src/app/views/code/codeWorkingTreeSyncModel.test.ts`
- `apps/web/src/app/views/code/useCodeWorkingTreeSync.ts`
- `apps/web/src/app/views/code/useCodeWorkingTreeSync.test.tsx`
- `apps/web/src/app/views/code/CodeWorkingTreeStatus.tsx`
- focused architecture/Planning DB evidence for the existing rail only

### Compatibility and migration

Internal Web state migration only. Preserve existing public port contracts. Introduce a temporary
adapter from the split state to current presentation props if needed, then remove the scalar phase once
all tests use the new model.

### Rollback

One PR with no persisted data migration. Revert returns to the prior reducer. Do not change API
contracts in this slice.

### Observability

- reconciliation pending duration;
- result accepted by matching receipt;
- result ignored due to receipt mismatch;
- edit during save/reconciliation;
- clean bytes with pending/degraded analysis.

Never log SQL or raw transport errors.

### Acceptance criteria

- #1996 P2 answered with the fixing commit and resolved;
- no matching outcome is lost because a presentation phase changed;
- `synchronized` has one stable meaning;
- reducer, hook, presentation, and protected browser proof pass;
- exact final-head CI green.

## PR B — bind file save to an exact project revision

### Scope

Join the existing save receipt to an exact dbt project projection.

### Application result

```ts
type ReconcileWorkspaceFileWithDbtProjectResult =
  | Readonly<{
      kind: 'fresh';
      saveReceipt: WorkspaceFileSaveReceipt;
      projectContentSetSha256: string;
      analysisSha256: string;
    }>
  | Readonly<{
      kind: 'degraded';
      saveReceipt: WorkspaceFileSaveReceipt;
      projectContentSetSha256: string;
      freshness: 'stale-last-valid' | 'invalid' | 'unavailable';
      diagnostics: readonly StableDbtDiagnostic[];
    }>
  | Readonly<{
      kind: 'superseded';
      saveReceipt: WorkspaceFileSaveReceipt;
      currentFileContentSha256: string;
      currentProjectContentSetSha256: string;
    }>;
```

### Rail and port changes

Reuse `ProjectDbtGraphFromFiles`; extend its application adapter/result only as required to prove the
saved file is included in the projected content set. Do not add a parallel graph query.

### Mandatory invariants

- authoritative file still has the receipt hash;
- projection declares exact project content-set hash;
- concurrent mutation of another file cannot be described as the original operation's exact project
  result;
- accepted revision is retained in Code/Canvas state;
- Preview and Run consume or explicitly reject that revision.

### Red tests

Save `models/a.sql`; concurrently mutate `schema.yml`; complete analysis; assert the original file is
durable but the project result is either superseded or explicitly the newer exact revision. Never
claim the original save alone produced a fresh whole project.

### Live proof

Real API/Postgres workspace:

1. open Code at revision R1;
2. save model SQL;
3. mutate another project file concurrently;
4. receive exact reconciliation result;
5. verify status and provenance;
6. Preview and Run reject mismatched revision or use the accepted revision;
7. reopen and verify same identities.

## PR C — atomic graph-first artifact publication

### Scope

Replace the Web single-file loop with the existing batch mutation authority.

### Command

```ts
type PublishDbtWorkspaceArtifacts = Readonly<{
  idempotencyKey: string;
  projectRoot: string;
  expectedFiles: readonly WorkspaceFileExpectedRevision[];
  writes: readonly Readonly<{ path: string; content: string }>[];
}>;
```

Map this onto the existing `IWorkspaceFileBatchMutationPort`; do not create a second transaction
engine.

### Required properties

- full preflight before any commit;
- one idempotency key;
- all-or-nothing mutation;
- no partial project on conflict/failure;
- one immutable receipt;
- exact resulting project content-set hash;
- one analysis identity for the batch;
- retry returns the same receipt.

### Failure-injection tests

- conflict on second artifact leaves every original hash unchanged;
- write failure after staging leaves zero committed changes;
- repeated idempotency key does not duplicate mutation;
- changed request with same key is rejected;
- Preview/Run provenance points to the batch result.

## PR D — workspace inventory and effective limits

### Contract

Return a typed page/result, not a bare tree:

```ts
type WorkspaceFileInventoryPage = Readonly<{
  entries: readonly WorkspaceFileEntry[];
  completeness: 'complete' | 'partial';
  nextCursor: string | null;
  effectiveLimits: {
    maxReadableFileBytes: number;
    maxMutationFiles: number;
    maxMutationBytes: number;
  };
}>;
```

Use distinct errors/results for:

- not found;
- oversized;
- unsupported file type;
- invalid/traversal path;
- partial inventory.

### Tests

- 501 files;
- multiple pages;
- near 10,000 accepted files;
- file just below/above 1 MB;
- stable ordering under pagination;
- directories excluded by policy;
- UI clearly shows partial inventory.

## PR E — runtime schema validation for touched rails

For the new project reconciliation, batch receipt, and inventory results:

- define or reuse schemas in `@dvt/contracts`;
- parse at the Web network boundary;
- return stable diagnostics for invalid responses;
- remove `as TResponse` reliance on these authority-bearing rails;
- do not attempt a repository-wide transport rewrite in this PR.

## PR F — crash recovery and non-functional product gates

Only after A–D:

- bounded Code draft journal with explicit restore/discard;
- CAS against current authoritative file before applying recovery;
- no automatic overwrite;
- accessibility scan for Code/Canvas critical path;
- Web/API coverage ratchet;
- bundle budget;
- large-graph interaction budget;
- import/listing scale proof;
- production-failure operability proof.

## Release and delivery ordering

1. Verify and decide maintenance-only release #2023.
2. Stop opening another public patch release until a user-visible product or security outcome exists,
   unless policy explicitly requires it.
3. Deliver PR A.
4. Deliver PR B.
5. Deliver PR C.
6. Deliver PR D.
7. Add schema hardening where touched.
8. Add recovery/non-functional gates.
9. Only then generalize authoring to another vertical such as column description or asset checks.

## Security requirements for the route

- path normalization and workspace scoping remain server-owned;
- receipt/hash metadata may be logged, source SQL may not;
- diagnostics are sanitized stable domain values;
- Web parses authority-bearing responses;
- batch mutation validates all paths before staging;
- no candidate PR code executes with write authority;
- custom release check is proven on exact head;
- recovery proposals never overwrite without CAS and user action.

## Observability requirements

Stable events/metrics:

- file save started/succeeded/conflicted/failed;
- reconciliation started/fresh/degraded/failed/superseded;
- reconciliation result ignored by receipt mismatch;
- project revision mismatch at Preview/Run;
- atomic batch started/conflicted/failed/retried/succeeded;
- partial inventory encountered;
- oversized file encountered;
- draft recovery offered/applied/discarded;
- release exact-head admission result.

Correlate by opaque workspace/project identity, file path hash, receipt ID, project content-set hash, and
analysis hash. Do not log source content or secrets.

## Final decision summary

- `main` is healthy enough to continue, but the last seven commits are maintenance rather than product
  delivery.
- `0.5.2` has six green standard workflows and clean notes, but its custom exact-head release check and
  human review must be verified before merge.
- The prior release duplication/action-required findings are fixed.
- The #1996 edit/revert reconciliation P2 remains active in current source.
- Whole-project revision binding remains absent in the controller.
- Graph-first Preview still bypasses existing atomic batch authority.
- Workspace capability truth remains contradictory.
- Runtime JSON validation, crash recovery, Web/API coverage, accessibility, and scale gates remain
  incomplete.
- The next functional PR is the split of Code persistence and reconciliation state. Anything broader
  is scope evasion.

## Documentation-only validation

This branch is intended to contain exactly one added Markdown file under
`docs/planning/reviews/architecture-and-governance/`.

No runtime code, workflow, dependency, contract, configuration, migration, generated artifact,
release metadata, or product behavior is intentionally changed. Nothing is merged, approved, or
made ready for review by this report.
