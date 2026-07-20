---
title: DVT post-release product-authority Fowler review
date: 2026-07-21T00:37:00+02:00
status: current-review
reviewed_main_sha: 6cc7a10af42c6883d9c10780e664c0504990a7ac
scope: documentation-only
supersedes: 2026-07-20-2040-dvt-release-assessment-and-product-authority-fowler-review.md
---

# DVT post-release product-authority Fowler review

## Purpose

This point-in-time review is written for the implementation GPT currently working in
[`dunay2/dvt`](https://github.com/dunay2/dvt). It inspects the exact current `main`, recent commits,
all visible open pull requests, relevant CI identity, review-thread state, release posture, branch work,
and the product code paths that own DBT Code editing, file persistence, semantic reconciliation,
Canvas projection, Preview, Run, workspace mutation, and current delivery governance.

The review applies a hard Fowler standard. It looks specifically for:

- responsibility overload;
- temporal coupling;
- hidden or duplicate authority;
- primitive obsession;
- shotgun surgery;
- leaky abstractions;
- partial transactions;
- stale truth;
- test-only confidence;
- architecture that is more mature than the user transaction it is meant to protect;
- proposals that create a second semantic language instead of reusing the existing domain model.

This branch is documentation-only. It changes no runtime code, workflow, dependency, contract,
configuration, migration, generated artifact, release metadata, or product behavior. It authorizes no
merge and does not replace Planning DB as the current work authority.

No local execution is claimed. Repository objects, source files, pull requests, workflow runs, review
threads, and comparison metadata were inspected through the GitHub integration. External comparisons
use official product documentation linked below.

## Exact reviewed identities

- Repository: [`dunay2/dvt`](https://github.com/dunay2/dvt)
- Exact current `main`: [`6cc7a10af42c6883d9c10780e664c0504990a7ac`](https://github.com/dunay2/dvt/commit/6cc7a10af42c6883d9c10780e664c0504990a7ac)
- Current main change: [PR #2016 — Allow product pull requests through release integrity](https://github.com/dunay2/dvt/pull/2016)
- Published release merge: [PR #1984 — Release 0.5.0](https://github.com/dunay2/dvt/pull/1984)
- Release-governance delivery: [PR #2002 — Enforce trusted release candidate integrity](https://github.com/dunay2/dvt/pull/2002)
- Current open PR: [PR #2017 — Release 0.5.1](https://github.com/dunay2/dvt/pull/2017)
- Release `0.5.1` head: [`4e000c687d18163dba2fd37ef306b8a4e7459dab`](https://github.com/dunay2/dvt/commit/4e000c687d18163dba2fd37ef306b8a4e7459dab)
- Previous product baseline: [`8eb0f5a7551d46c909a024b86f66cf3580c20691`](https://github.com/dunay2/dvt/commit/8eb0f5a7551d46c909a024b86f66cf3580c20691)
- This review branch: `agent/dvt-review-20260721-0037`

## Executive verdict

There is a material repository delta since the previous review, but almost none of it advances the
user-facing product.

The positive delta is real:

1. release-candidate governance was completed and merged through PR #2002;
2. the stale `0.5.0` candidate was regenerated into concise, PR-outcome-oriented notes;
3. all six standard workflows passed on the exact release candidate head;
4. release `0.5.0` was merged and published;
5. a follow-up defect that blocked ordinary product PRs under the new required check was corrected in
   PR #2016;
6. the previous queue of superseded point-in-time review PRs was closed rather than left competing with
   Planning DB;
7. the only visible open PR is the small `0.5.1` release candidate, and all six standard workflows on
   its head are green.

The negative conclusion is equally clear:

- the product authority problems identified before the release remain in the exact current tree;
- the unresolved P2 in the Code working-tree state machine remains non-outdated;
- file save reconciliation still ignores the save receipt and refetches the latest project projection;
- graph-first Preview still publishes DBT artifacts one file at a time despite an existing atomic batch
  port;
- Code, Canvas, Preview, and Run still do not share one exact admitted whole-project revision;
- workspace file listing still truncates silently at 500 files and maps oversized content to an invalid
  path error;
- the root release gate still has an engine-only coverage ratchet rather than product-wide Web/API
  coverage and explicit non-functional release evidence.

The current repository has therefore moved from a broken release process to a credible release process,
but it has not yet resumed the product route.

The next functional PR should not add another release-governance layer. It should close one complete
user transaction: a DBT Code save whose durable content and semantic reconciliation remain truthful for
all edit/revert interleavings.

## Material delta since the previous review

### Delivered and verified

#### Release-candidate integrity is now real repository code

PR #2002 was merged with:

- eight commits;
- forty-one changed files;
- 7,421 additions and 69 deletions;
- trusted-base PR classification;
- explicit Check Run publication on an authoritative revision;
- credential-free candidate checkout;
- exact-tree and SemVer assessment;
- repository merge-policy inspection;
- fail-closed handling of hidden ruleset bypass data;
- a dedicated release-governance token rather than an implicit `GITHUB_TOKEN` fallback;
- Planning DB component, rail, evidence, observability, and implementation records.

Every inline review finding on PR #2002 is resolved. In particular, the final workflow now passes the
nested projected merge policy rather than the transport envelope.

#### Release `0.5.0` is no longer the stale candidate reviewed previously

PR #1984 was regenerated and merged. Its final notes contain one user-level item per merged PR rather
than duplicate entries for merge and parent commits. Its exact head had six successful standard
workflows:

- Dependency Review;
- Test Suite;
- PR Quality Gate;
- Contracts & Determinism;
- CI — Code Quality;
- CodeQL.

The old claims that `0.5.0` had duplicate logical outcomes and six `action_required` workflows are now
**fixed and superseded**, not active findings.

#### Product PRs can pass release integrity without release-candidate assessment

PR #2016 corrected a post-release integration defect. Product PRs classified as `not_applicable` now:

- still receive the required `Release candidate integrity` check;
- complete that check successfully without trying to parse release-policy output that was never
  produced;
- preserve fail-closed behavior for invalid authority and for actual candidate assessment failures.

This fix is small compared with PR #2002: one commit, two files, 34 additions, and 5 deletions.

#### Review-document authority was cleaned up

The earlier point-in-time review PRs were closed as superseded after their actionable findings were
reconciled into Planning DB tasks. That removes the prior low-grade duplicate-authority problem in the
open PR queue.

### Current open work

The only visible open PR is [#2017 — Release 0.5.1](https://github.com/dunay2/dvt/pull/2017).

Its scope is narrow:

- version `0.5.1`;
- one release note for PR #2016;
- three changed files;
- ten additions and two deletions;
- one commit;
- no inline review threads.

All six standard workflows on head `4e000c687d` are successful. The GitHub connector does not expose the
custom Checks API run created by `Release candidate integrity`, so merge admission must still verify in
the GitHub UI that the required custom check is present, targets this exact head, and concluded
successfully.

### What did not change

A comparison from product baseline `8eb0f5a` to current `main@6cc7a10` shows three commits and only
release/governance, workflow, release metadata, documentation, CI-tool, test, and Planning DB migration
files. No Web product, API product, engine execution, Canvas, Code editor, workspace repository, or
runtime product implementation file changed.

The user-facing product is therefore still the product delivered by PR #1996.

## Current repository state

### Main history

The current sequence is:

1. `6cc7a10` — fix ordinary product PR admission under release integrity;
2. `ca62c5b` — release `0.5.0`;
3. `d724e2e` — trusted release-candidate integrity;
4. `8eb0f5a` — DBT Code persistence/reconciliation race hardening.

### Exact-main CI identity

The connector exposes no workflow runs or commit statuses directly associated with exact
`main@6cc7a10`.

This is not evidence that the commit is bad. It means release evidence remains attached primarily to PR
heads and explicitly created Check Runs rather than to the final squash commit. For a mature delivery
posture, the tagged or deployed tree should have machine-readable provenance linking it to the admitted
candidate, test artifacts, and release receipt.

### Open pull requests

| PR | Scope | CI | Threads | Verdict |
| --- | --- | --- | --- | --- |
| [#2017](https://github.com/dunay2/dvt/pull/2017) | release `0.5.1` containing the #2016 integrity fix | six standard workflows green | none | Merge only after verifying the custom release-integrity Check Run on exact head `4e000c687d`. |

No open product implementation PR is visible.

## Review-thread state

### PR #2002 — release governance

All eight reviewed inline threads are resolved. The final implementation includes fixes for:

- labeler write authority;
- base comparison without persisted checkout credentials;
- explicit required check on the classified authoritative SHA;
- classification before Checks API mutation;
- fork-aware publication posture;
- non-`GITHUB_TOKEN` release generation identity;
- fail-closed hidden bypass actors;
- nested merge-policy projection.

### PR #2016 — product PR admission

No inline review threads exist. Codex review reported no major issue on the final head.

### PR #2017 — release `0.5.1`

No inline review threads exist at review time.

### PR #1996 / current product tree

Two P1 threads are resolved:

- `flush()` no longer approves an unsaved edit made while DBT reconciliation is pending;
- persistence acknowledgement no longer hides an edit made while the file write is in flight.

One non-outdated P2 remains unresolved:

> Keep pending reconciliation visible when edits revert.

The current reducer can still present `synchronized` and then ignore the matching
invalid/stale/unavailable outcome when a user edits during reconciliation and returns to the persisted
bytes before reconciliation completes.

## Previous-finding disposition

| Finding | Status | Current evidence |
| --- | --- | --- |
| Duplicate `0.5.0` merge/parent release notes | **Fixed** | Final #1984 notes are PR-outcome based. |
| Six `action_required` workflows on `0.5.0` | **Fixed** | Final #1984 head has six successful standard workflows. |
| Release check attached to the wrong SHA | **Fixed** | Explicit Check Run uses classified `publicationSha`. |
| Fork authority classified after mutation | **Fixed** | Trusted read-only classification runs before check creation. |
| Release Please cannot trigger follow-up CI | **Fixed** | `RELEASE_GOVERNANCE_TOKEN` is mandatory. |
| Hidden ruleset bypass actors treated as absent | **Fixed** | Omitted field fails closed. |
| Policy inspection envelope passed as policy | **Fixed** | Workflow projects `.policy` explicitly. |
| Product PRs fail because release-policy output is absent | **Fixed** | PR #2016 skips candidate assessment for `not_applicable`. |
| Open review PR queue competes with Planning DB | **Fixed** | Superseded review PRs were closed. |
| Edit → revert hides pending DBT reconciliation | **Active P2** | Current reducer still gates completion on scalar `phase`. |
| File save receipt ignored by project reconciliation | **Active P1** | `_receipt` is accepted and unused. |
| Graph-first publication can partially update project | **Active P1** | Preview loops over independent file saves. |
| Code/Preview/Run share exact project revision | **Disproved** | No admission invariant binds all three to one content set. |
| Workspace inventory is complete and truthful | **Disproved** | Silent 500-file cap, no cursor/completeness. |
| Oversized file has explicit product semantics | **Disproved** | >1 MB becomes `InvalidWorkspacePathError`. |
| Product-wide release coverage is mechanically ratcheted | **Disproved** | Root `ci:full` ratchets engine coverage only. |
| Release-policy configuration is compensating | **Disproved** | Repository PATCH precedes ruleset PUT with no rollback. |
| Product implementation resumed after release work | **Disproved** | Main delta after #1996 is release/governance only. |

## Product and architecture review

## 1. Code working-tree state still compresses two state machines into one scalar

### Severity and evidence

- Severity: **P2 correctness**, release-relevant because user-visible semantic status can lie.
- Primary owner: `Web / Code working-tree synchronization`.
- Files:
  - [`codeWorkingTreeSyncModel.ts`](https://github.com/dunay2/dvt/blob/6cc7a10af42c6883d9c10780e664c0504990a7ac/apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts)
  - [`useCodeWorkingTreeSync.ts`](https://github.com/dunay2/dvt/blob/6cc7a10af42c6883d9c10780e664c0504990a7ac/apps/web/src/app/views/code/useCodeWorkingTreeSync.ts)

`CodeWorkingTreeSyncPhase` currently owns:

- clean versus dirty editor buffer;
- active persistence;
- CAS conflict;
- persistence failure;
- pending DBT reconciliation;
- fresh semantic state;
- stale-last-valid semantic state;
- invalid semantic state;
- unavailable semantic state;
- verification-unavailable state;
- superseded authority.

That is responsibility overload. A single string union is being used as an implicit protocol for two
orthogonal state machines.

The failing interleaving is concrete:

1. persisted bytes are `A`;
2. DBT reconciliation for save receipt `R1` is pending;
3. the user edits to `B`, moving `phase` to `modified` while `pendingReconciliation` remains `R1`;
4. the user returns the buffer to `A`;
5. `persistedReconciliationPhase` is still `null`, so the reducer chooses `synchronized`;
6. the result for `R1` arrives;
7. the reducer rejects it because it accepts completion only when `phase === 'reconciling'`;
8. invalid, stale, unavailable, verification-unavailable, superseded, or failed truth is lost.

### Root cause

Persistence state and semantic-analysis state are encoded as one presentation phase. Event acceptance
therefore depends on the current UI phase rather than durable operation identity.

### User and product impact

- Code can state “synchronized” while analysis remains pending;
- a saved file can retain invalid SQL while the UI loses the invalid outcome;
- Preview and Run can be reasoned from stale presentation;
- correctness changes with event ordering rather than receipt identity;
- future interleavings require more branches in an already overloaded reducer.

### Correct domain model

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
  | Readonly<{ kind: 'conflict'; currentRevision: string | null }>
  | Readonly<{ kind: 'failed'; errorCode: StableWorkspaceFileErrorCode }>;

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
      diagnostics: readonly StableDbtDiagnostic[];
    }>
  | Readonly<{
      kind: 'verification-unavailable';
      receipt: WorkspaceFileSaveReceipt;
    }>
  | Readonly<{
      kind: 'superseded';
      receipt: WorkspaceFileSaveReceipt;
      currentContentSha256: string;
    }>
  | Readonly<{
      kind: 'failed';
      receipt: WorkspaceFileSaveReceipt;
      errorCode: StableDbtErrorCode;
    }>;
```

`edited` changes persistence only. Reconciliation completion matches the current receipt and changes
reconciliation only. A pure projection derives user copy, navigation posture, and command availability.

### Command/query and port changes

No new command rail is required for this slice.

Reuse:

- `SaveWorkspaceFileContent`;
- `WorkspaceFileSaveReceipt`;
- the current reconciliation callback;
- existing Code status copy and navigation guards.

Do not create a generic authoring session or another persistence command in this PR.

### Migration and compatibility

- introduce the two internal state axes behind the existing hook interface;
- keep existing presentation labels through a pure projection;
- convert existing reducer tests incrementally;
- add an architecture test preventing view components from mutating either axis directly;
- Planning DB should record one state-model component update, not a sequence of one-migration-per-private-symbol changes.

### Rollback posture

The change is Web-local and can be reverted as one PR. No persisted data format or external contract
changes. Preserve old event names during the migration so rollback does not require API changes.

### Observability

Emit stable, content-free events:

- `code.persistence.started|saved|conflicted|failed`;
- `code.reconciliation.pending|fresh|degraded|superseded|failed`;
- `code.reconciliation.ignored_receipt_mismatch`;
- pending duration;
- edit-during-save and edit-during-reconciliation counters.

Do not log SQL, YAML, raw transport errors, or source contents.

### Security implications

No new privilege is required. Sanitized domain diagnostics remain separate from technical errors.
Receipt identifiers and hashes are safe correlation data; source text is not.

### Red/green tests

Reducer tests:

1. `pending R1 -> edit B -> edit A -> invalid R1` ends degraded-invalid;
2. same sequence with fresh R1 becomes clean/fresh only after completion;
3. failure R1 remains visible after edit/revert;
4. result R0 is ignored after R1 exists;
5. dirty buffer remains dirty while semantic outcome is stored;
6. returning dirty buffer to persisted bytes reveals the stored semantic outcome.

Hook tests:

1. hold reconciliation promise open;
2. edit twice and return to persisted content;
3. complete with invalid result;
4. verify status and navigation posture;
5. verify no extra save is issued when bytes already match;
6. verify `flush()` distinguishes durable bytes from semantic freshness.

Protected browser proof:

1. open a real file-backed DBT project;
2. save valid SQL;
3. start a delayed reconciliation;
4. edit away and return to persisted content;
5. complete with a controlled invalid/stale result through the real API boundary;
6. verify Code remains semantically pending and then degraded;
7. verify Preview and Run remain blocked;
8. reload and verify the same durable content and semantic posture.

### Acceptance criteria

- no matching reconciliation result is lost because of presentation phase;
- `synchronized` means content durable and semantic state fresh or not required;
- degraded state survives local edits;
- receipt mismatch is the only reason an old result is ignored;
- reducer, hook, presentation, and protected browser evidence all pass;
- the unresolved PR #1996 thread is answered with the fixing commit and resolved;
- exact final-head CI is green.

## 2. File save reconciliation is not bound to an exact project revision

### Severity and evidence

- Severity: **P1 authority and reproducibility**.
- Owner: `Web / DBT project file Canvas application boundary`.
- File: [`useDbtProjectFileCanvasController.ts`](https://github.com/dunay2/dvt/blob/6cc7a10af42c6883d9c10780e664c0504990a7ac/apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts)

Current code accepts `WorkspaceFileSaveReceipt` as `_receipt`, ignores it, refetches the latest graph,
and projects that latest result as the reconciliation outcome.

### Root cause

The controller correlates by timing and “latest available projection,” not by a verified relationship
between:

- the saved file revision;
- the complete project content set;
- the DBT analysis revision;
- Preview provenance;
- Run provenance.

### User and product impact

A concurrent change to `schema.yml`, another model SQL file, macro, source definition, or project config
can occur between file save and graph refetch. The UI can then attribute analysis of project revision P2
to a file-save operation that occurred in P1.

This makes provenance descriptive rather than admission-enforcing.

### Existing concepts to reuse

- `WorkspaceFileSaveReceipt`;
- `DbtProjectRevision.contentSetSha256`;
- `DbtProjectGraphProjection.analysisSha256`;
- `ProjectDbtGraphFromFiles` query rail;
- existing file CAS semantics;
- Preview and Run provenance structures.

Do not add another revision identifier.

### Proposed application result

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

### Command/query and port changes

Prefer one application query/service that:

1. receives the existing save receipt;
2. verifies the authoritative file still has its saved hash;
3. obtains or computes the exact project content-set identity;
4. returns DBT analysis for that exact content set;
5. reports superseded when the project moved before the result could be admitted.

The existing `ProjectDbtGraphFromFiles` query remains the semantic owner. A thin adapter may need a
revision requirement parameter; do not create a parallel graph query.

### Migration and compatibility

- add the revision-bound result to shared contracts only when the API boundary needs it;
- parse it at runtime, not through `as TResponse`;
- retain the old latest-projection query for read-only refresh paths;
- move Code reconciliation specifically to the revision-bound route;
- propagate accepted content-set identity into Preview and Run admission.

### Rollback posture

The API can temporarily support both latest and revision-bound query modes. The Web should feature-gate
only the reconciliation caller, not duplicate the entire Canvas mode.

### Observability

- save receipt to content-set correlation success;
- project moved before analysis;
- file moved before analysis;
- analysis reused by content hash;
- Preview/Run revision mismatch;
- reconciliation latency by outcome.

### Security implications

- validate project root and file path through existing workspace scope rules;
- never accept a client-supplied project hash as authority without server recomputation;
- do not expose filesystem paths or raw dbt stderr;
- use stable diagnostics.

### Tests

1. save model SQL, concurrently change `schema.yml`, complete analysis, and prove the original save is not
   credited with the newer project revision;
2. reuse a cached analysis only when content-set identity matches exactly;
3. Preview rejects a Code revision mismatch;
4. Run rejects or explicitly refreshes a stale admitted revision;
5. reopen preserves the accepted project content set and analysis identity;
6. live proof performs Code → Preview → Run on one exact revision.

### Acceptance criteria

- every fresh Code result names the exact project content set analyzed;
- Preview and Run consume that identity or fail closed;
- latest refresh cannot silently satisfy revision-bound reconciliation;
- concurrent project-file edits produce typed superseded/conflict behavior;
- one protected end-to-end proof demonstrates reproducibility.

## 3. Graph-first Preview bypasses the existing atomic publication authority

### Severity and evidence

- Severity: **P1 data integrity**.
- Owner: `Canvas DBT artifact publication` with API workspace-file batch mutation as the command owner.
- Files:
  - [`canvasPlanAction.ts`](https://github.com/dunay2/dvt/blob/6cc7a10af42c6883d9c10780e664c0504990a7ac/apps/web/src/app/views/canvas/canvasPlanAction.ts)
  - [`LocalWorkspaceFileBatchMutationGateway.ts`](https://github.com/dunay2/dvt/blob/6cc7a10af42c6883d9c10780e664c0504990a7ac/apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.ts)

Canvas still loops over generated artifacts, reads each expected revision, and writes each file
independently. Failure on file N leaves files 1..N-1 committed.

The repository already has:

- `IWorkspaceFileBatchMutationPort`;
- complete expected-file preflight;
- scoped multi-path locking;
- CAS conflict sets;
- idempotency keys;
- immutable receipts;
- atomic replacement;
- postcondition-based retry recognition.

Building a second transaction mechanism would be architecture drift.

### Proposed command

```ts
type PublishDbtWorkspaceArtifacts = Readonly<{
  idempotencyKey: string;
  projectRoot: string;
  expectedProjectContentSetSha256: string | null;
  artifacts: readonly Readonly<{
    path: string;
    content: string;
    expectedRevision: WorkspaceFileExpectedRevision;
  }>[];
}>;
```

The command should adapt directly to the existing batch mutation port and return one publication
receipt with the resulting project content-set identity.

### Command/query and port changes

- expose the existing batch port through the Web workspace command adapter;
- add no new storage transaction engine;
- create one application command rail for DBT artifact publication only if the existing generic batch
  command is intentionally not public;
- perform one DBT analysis after the batch and attach its identity to the publication receipt;
- Preview uses that receipt, not a post-hoc latest read.

### Migration and compatibility

- preserve the existing artifact projection function;
- replace only the sequential persistence loop;
- use deterministic idempotency key derived from workspace, project root, draft signature, and expected
  revision set;
- leave file-backed Preview unchanged until it consumes the same revision-admission boundary.

### Rollback posture

The batch gateway already replaces atomically and records receipts. If analysis after publication fails,
choose and document one policy:

- retain the published invalid revision with explicit recovery; or
- issue a separate compensating publication based on the immutable preimage.

Do not claim atomicity across filesystem mutation and external DBT process unless the policy and receipt
make that boundary explicit.

### Observability

- batch started/applied/conflicted/failed/replayed;
- number of files and bytes without contents;
- lock wait duration;
- atomic replacement duration;
- analysis outcome and content-set identity;
- compensation attempt and result.

### Security implications

- normalize and validate every path before staging;
- enforce existing workspace scope and batch limits;
- never log generated SQL or YAML;
- reject path aliases and traversal;
- verify idempotency key reuse against request hash.

### Red/green tests

1. conflict on second artifact leaves every original hash unchanged;
2. injected write failure after staging leaves zero committed changes;
3. repeated idempotency key returns the same receipt;
4. changed request with same key fails;
5. concurrent writer produces one conflict set, not partial success;
6. Preview uses the batch receipt content set;
7. protected browser proof creates model + schema + project config, publishes, previews, runs, reopens,
   and verifies exact hashes.

### Acceptance criteria

- no partial project is visible after any conflict or write failure;
- one receipt describes all files and the resulting project revision;
- Preview and Run provenance uses the receipt;
- retry is idempotent;
- existing batch authority is reused.

## 4. Workspace file capability is not truthful at scale

### Severity and evidence

- Severity: **P1 product/API contract**.
- Owner: `API / Workspace files` with shared capability contract.
- File: [`LocalWorkspaceFileRepository.ts`](https://github.com/dunay2/dvt/blob/6cc7a10af42c6883d9c10780e664c0504990a7ac/apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts)

Current behavior:

- listing stops at 500 files;
- no cursor or completeness marker is returned;
- reads and writes reject content over 1 MB;
- oversized content is represented as `InvalidWorkspacePathError`;
- Web cannot distinguish not-found, invalid path, unsupported type, oversized content, or partial inventory.

### Root cause

Adapter safety limits leaked into the public product semantics without a capability read model.

### Proposed contracts

```ts
type WorkspaceFileCapabilityPolicy = Readonly<{
  maxListedPageSize: number;
  maxReadableFileBytes: number;
  maxWritableFileBytes: number;
  maxBatchFiles: number;
  maxBatchBytes: number;
}>;

type WorkspaceFileInventory = Readonly<{
  entries: readonly WorkspaceFileEntry[];
  completeness: 'complete' | 'partial';
  nextCursor: string | null;
  effectiveLimits: WorkspaceFileCapabilityPolicy;
}>;

type WorkspaceFileReadResult =
  | Readonly<{ kind: 'found'; file: WorkspaceFileContent }>
  | Readonly<{ kind: 'not-found' }>
  | Readonly<{
      kind: 'oversized';
      path: string;
      sizeBytes: number;
      maxBytes: number;
    }>
  | Readonly<{
      kind: 'unsupported';
      path: string;
      reason: StableWorkspaceFileReason;
    }>;
```

### Command/query and port changes

- evolve `IWorkspaceFileRepository.listFiles` into a paginated query;
- expose effective capability policy through API and Web;
- create typed read outcomes;
- preserve CAS commands, but return stable oversized/unsupported errors;
- make import, analysis, explorer, Code, and batch publication consume one capability authority.

### Migration and compatibility

- initially add a v2 inventory endpoint while retaining the old list for compatibility;
- migrate Web Explorer and Code to v2;
- deprecate the old unbounded-array contract after all callers move;
- do not raise limits before pagination and memory tests exist.

### Rollback posture

The v2 endpoint can be disabled independently. No file storage format changes. Keep old endpoint during
one release window.

### Observability

- listed pages and entries;
- partial inventory count;
- cursor usage;
- oversized read/write count by bucketed size;
- excluded/unsupported file count;
- inventory latency and memory.

### Security implications

Pagination must preserve traversal and extension policy. Cursor must be opaque, scoped, tamper-evident,
and unable to escape the workspace root. Do not expose absolute paths.

### Tests

- 501 files prove partial first page and stable continuation;
- near accepted project maximum proves bounded memory;
- concurrent file addition/removal defines snapshot or restart semantics;
- >1 MB read returns `oversized`, not invalid path;
- unsupported extension is distinct;
- browser shows partial inventory and loads subsequent pages;
- accessibility proof covers keyboard navigation and announcements for loading/partial/error states.

### Acceptance criteria

- no silent truncation;
- every limit is visible and typed;
- Code and Explorer agree on inventory;
- oversized files are diagnosable;
- large-project proof is a release gate.

## 5. Release-policy configuration remains a non-compensating distributed command

### Severity and evidence

- Severity: **P2 operability/governance**; not a current `0.5.1` product blocker, but high impact when
  merge policy is reconfigured.
- Owner: `CI Governance / Release merge policy configuration`.
- File: [`releaseMergePolicyCli.mjs`](https://github.com/dunay2/dvt/blob/6cc7a10af42c6883d9c10780e664c0504990a7ac/tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs)

Configure performs:

1. initial repository/ruleset read;
2. fingerprint confirmation;
3. repository PATCH;
4. ruleset re-read;
5. ruleset PUT;
6. final read and assessment.

If the ruleset changes after the repository PATCH or its PUT fails, repository settings remain changed.
There is no compensation receipt.

PR #2016 also exposed a self-locking bootstrap problem: when the required check implementation itself was
broken, repair required temporarily removing the check from the live ruleset and restoring it after
merge. The operation succeeded, but the recovery posture is manual and not first-class.

### Proposed boundary

```ts
type ReleaseMergePolicySnapshot = Readonly<{
  repository: ReleaseRepositoryMergeSettings;
  repositoryFingerprint: string;
  rulesetId: number;
  ruleset: ReleaseMainRuleset;
  rulesetFingerprint: string;
}>;

type ConfigureReleaseMergePolicyResult =
  | Readonly<{
      kind: 'applied';
      before: ReleaseMergePolicySnapshot;
      after: ReleaseMergePolicySnapshot;
      receiptId: string;
    }>
  | Readonly<{
      kind: 'concurrent-change';
      current: ReleaseMergePolicySnapshot;
    }>
  | Readonly<{
      kind: 'compensated';
      failedPhase: 'repository' | 'ruleset' | 'verification';
      receiptId: string;
    }>
  | Readonly<{
      kind: 'compensation-failed';
      failedPhase: string;
      receiptId: string;
      operatorAction: string;
    }>;
```

### Route

- extract application service from CLI parsing and GitHub adapter;
- preserve full before snapshot;
- verify both fingerprints immediately before the first write;
- apply repository and ruleset changes;
- verify final pair;
- compensate the first successful write if the second fails;
- publish an immutable receipt;
- provide a documented break-glass command that itself snapshots, expires, restores, and verifies the
  required check set.

### Tests and release gates

- concurrent change before first write: zero mutation;
- ruleset change after repository PATCH: repository settings compensated;
- ruleset PUT failure: compensated;
- verification mismatch: compensated or explicit compensation-failed result;
- break-glass removal has TTL, exact expected PR/SHA, and guaranteed restoration check;
- no token or ruleset body leaked to logs.

## 6. Product-wide quality evidence still trails governance maturity

### Evidence

Root `ci:full` invokes:

- documentation checks;
- code checks;
- engine coverage.

There is no root-level explicit coverage ratchet for Web or API in that command, and no explicit
accessibility, bundle-size, large-graph, load, chaos, multi-worker, or canary gate is visible in the root
release script.

This does not mean those areas have zero tests. It means they are not represented as one mechanically
obvious product release contract comparable with the governance contract.

### Required route

After the authority/integrity slices above, add an executable product scorecard:

- Web coverage ratchet on changed product surfaces;
- API coverage ratchet;
- axe-based protected critical-path proof;
- keyboard/focus proof for Canvas, Code, drawer, dialogs, and menus;
- bundle budget;
- large graph and large workspace inventory budget;
- DBT parse latency and coalescing budget;
- Temporal/Postgres replay and failure-injection proof;
- multi-worker idempotency/locking proof;
- exact release SHA and artifact digest evidence.

Do not add all of this to the next PR. Create separate ratchet slices after the current correctness work.

## Security, data integrity, recovery, operability, accessibility, and performance assessment

### Security positives

The release pipeline now has a materially stronger trust boundary:

- trusted-base classification precedes mutation;
- candidate code is checked out without credentials;
- privileged policy inspection runs from trusted code;
- explicit Check Run identity is verified before completion;
- release generation requires a dedicated credential;
- hidden protected ruleset data fails closed.

Workspace mutation also already has strong primitives:

- scoped path normalization;
- CAS;
- multi-path locking;
- idempotency conflict detection;
- atomic replacement;
- immutable receipts.

### Security residuals

- release-policy break-glass operation lacks first-class typed lifecycle and receipt;
- future revision-bound APIs must recompute project hashes server-side;
- Web transport responses should be schema-validated at runtime;
- diagnostics must remain sanitized;
- no source SQL/YAML should enter logs or metrics.

### Data integrity

The strongest current data-integrity contradiction is that the API has an atomic batch mutation while
Canvas does not use it. This is an architecture inversion: the safer lower-layer authority exists, but
the user-facing transaction bypasses it.

### Recovery

Code persistence has improved substantially, but semantic recovery remains incomplete while the edit →
revert P2 exists. Durable project-level recovery also needs the exact content-set identity and a receipt
that survives reload.

### Operability

The release gate is now observable through explicit Check Runs, but merge-policy configuration and
break-glass recovery remain operator scripts rather than compensating application transactions.

### Accessibility

No product delta touched accessibility. Existing keyboard and workbench behavior from earlier Canvas
work remains, but the next inventory and conflict/recovery surfaces must include:

- focus restoration;
- keyboard-only conflict choice;
- live-region status changes;
- non-color-only semantic posture;
- deterministic tab order;
- screen-reader announcements for pending, saved, invalid, conflict, and superseded states.

### Performance

No product delta changed performance. The most likely amplification points remain:

- repeated full DBT refetch/reanalysis after file operations;
- sequential artifact writes;
- unpaginated recursive inventory;
- large Canvas graph rendering;
- governance change amplification.

The revision-bound reconciliation slice should reuse content-addressed analysis rather than add a
second parse.

## Fowler assessment

### Responsibility overload

- `CodeWorkingTreeSyncState.phase` owns persistence and semantic analysis.
- Canvas controller owns read orchestration, projection, reconciliation, selection recovery, and
  execution admission.
- release merge-policy CLI owns parsing, I/O, desired state, concurrency, mutation ordering,
  verification, and presentation.

### Temporal coupling

- Code correctness depends on edit/save/reconcile event order;
- project truth depends on which file changed before latest graph refetch;
- release configuration depends on two GitHub resources remaining stable across separate writes.

### Hidden authority

- `_receipt` is accepted and ignored;
- latest graph refetch is treated as reconciliation of a specific save;
- custom release Check Runs are authoritative but not visible through the connector workflow listing;
- adapter safety limits silently become product limits.

### Primitive obsession

- one phase string encodes two protocols;
- untyped workflow JSON carries application contracts;
- raw error classes encode oversized-file semantics;
- generic string violations represent release policy outcomes.

### Shotgun surgery

PR #2002 needed eight commits, forty-one files, more than 7,400 additions, multiple workflows, CI tools,
architecture docs, tests, and fifteen Planning DB migrations to deliver one release gate.

The delivery was valuable and ultimately successful. The scale is still a signal: application
boundaries are too broad and governance mechanization is too granular. Future product slices should aim
for one domain owner, one contract evolution, one evidence record, and one protected vertical proof.

### Test-only confidence

PR #2002 was repeatedly green while real workflow-shape defects remained. The final problems were found
through review of actual event and JSON boundaries. The lesson is to retain unit/static tests but add one
real protected candidate flow for every privileged workflow.

## Comparison with mature systems

## Match / Differentiate / Defer matrix

| System | Mature behavior | DVT decision | Why |
| --- | --- | --- | --- |
| [dbt Studio IDE](https://docs.getdbt.com/) | One interface for building, testing, running, and version-controlling dbt projects. | **Match** separation of edited, saved, parsed, compiled, runnable, and versioned states. | DVT must not collapse durable bytes and valid DBT analysis into `synchronized`. |
| [VS Code Source Control](https://code.visualstudio.com/docs/sourcecontrol/overview) | Distinguishes working changes, staged changes, commits, branches, remotes, and conflicts. | **Match** explicit dirty/conflict/revision posture; **differentiate** with DBT semantic state. | Professional editors do not call a dirty or conflicted buffer synchronized. |
| [Airflow DAG Bundles](https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/dag-bundles.html) | Versions the DAG plus associated files and pins a run to one bundle version. | **Match** exact project content-set admission for Preview and Run. | A run must not silently move to latest project files. |
| [Prefect deployment versioning](https://docs.prefect.io/v3/how-to-guides/deployments/versioning) | Deployment version history, rollback/promotion, commit metadata, exact commit or image digest execution. | **Match later** revision history, promotion, and rollback after exact revision identity exists. | History without authoritative revision binding would preserve ambiguity. |
| [Dagster](https://docs.dagster.io/) | Declarative assets with lineage, observability, and testability. | **Defer** broad asset UX; **match later** asset checks, freshness, and lineage evidence. | First make authoring and execution authority correct. |
| [Temporal](https://docs.temporal.io/) | Durable execution resumes after crashes and correlates progress through durable history. | **Match** durable identities, idempotency, and explicit outcomes; **differentiate** by not embedding a workflow engine in editor state. | Receipts and hashes should replace timing as correlation authority. |
| [NiFi Registry direction](https://nifi.apache.org/projects/registry/) | Versioned flows; Registry deprecated in favor of Git-based Flow Registry Clients. | **Match** visual version/diff posture; **do not build** a parallel proprietary registry. | DVT should use file/Git authority and project receipts. |

### What DVT should match now

- exact project revision identity;
- dirty/saved/analyzed/conflicted state separation;
- atomic publication of related files;
- reproducible Preview and Run;
- durable receipts and idempotency;
- explicit conflict and superseded outcomes;
- schema-validated transport boundaries.

### What DVT should differentiate

DVT can provide a genuinely bidirectional graph ↔ code workflow that dbt and generic IDEs do not fully
provide. That differentiation is credible only when:

- files become authoritative after materialization;
- graph edits write files through revision-bound commands;
- code edits reproject the graph;
- no surface silently overwrites another;
- execution consumes the admitted revision.

### What DVT should defer

- generic mutation framework;
- broad Dagster-like asset catalog expansion;
- deployment promotion UI;
- multi-tenant collaboration model;
- another proprietary flow registry;
- more release-governance abstraction before the product authority route resumes.

## Ordered implementation route

### PR A — split Code persistence and reconciliation state

This is the next functional PR.

Scope:

- internal Web state model;
- reducer and hook;
- pure presentation projection;
- focused status component changes;
- red/green interleaving tests;
- one protected browser proof;
- resolve the PR #1996 P2.

Do not include:

- API contract changes;
- batch publication;
- workspace pagination;
- release `0.5.1`;
- generic authoring-session extraction.

### PR B — exact project-revision reconciliation

Scope:

- revision-bound reconciliation result;
- server-side exact content-set verification;
- existing graph query rail extension;
- accepted revision retained in state;
- Preview/Run revision admission;
- protected Code → Preview → Run proof.

### PR C — atomic DBT artifact publication

Scope:

- route graph-first artifacts through existing batch mutation;
- deterministic idempotency key;
- one receipt and project content-set identity;
- failure-injection integration tests;
- Preview provenance from receipt.

### PR D — workspace capability truth

Scope:

- paginated inventory;
- complete/partial indicator;
- effective limit policy;
- typed oversized/unsupported/not-found results;
- Web Explorer and Code migration;
- 501-file and large-project proof.

### PR E — release-policy compensation and break-glass

Scope:

- typed snapshot/result;
- GitHub adapter separated from CLI;
- compensation and verification;
- immutable receipt;
- controlled, time-bounded break-glass path;
- failure-injection tests.

This is important but should not displace PR A now that ordinary releases are functioning.

### PR F — executable product quality scorecard

Scope as separate narrow ratchets:

- Web/API coverage;
- accessibility critical path;
- performance budgets;
- large graph/workspace;
- Temporal/Postgres replay/failure proof;
- exact release SHA/artifact evidence.

## Immediate repository decisions

1. Treat `main@6cc7a10` as a release/governance delta, not a product-authority closeout.
2. Merge PR #2017 only when the custom required `Release candidate integrity` Check Run is visibly green
   on exact head `4e000c687d`, in addition to the six standard green workflows.
3. After `0.5.1`, stop release-governance expansion unless a concrete defect requires it.
4. Start PR A: split persistence and reconciliation state.
5. Resolve the outstanding PR #1996 P2 with the fixing commit.
6. Then bind Code, Preview, and Run to an exact project content set.
7. Then use the existing atomic batch authority.
8. Keep Planning DB as the work authority and close this point-in-time review once its findings are
   reconciled.

## Files the next implementation agent should inspect first

1. [`apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts`](https://github.com/dunay2/dvt/blob/6cc7a10af42c6883d9c10780e664c0504990a7ac/apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts)
2. [`apps/web/src/app/views/code/codeWorkingTreeSyncModel.test.ts`](https://github.com/dunay2/dvt/blob/6cc7a10af42c6883d9c10780e664c0504990a7ac/apps/web/src/app/views/code/codeWorkingTreeSyncModel.test.ts)
3. [`apps/web/src/app/views/code/useCodeWorkingTreeSync.ts`](https://github.com/dunay2/dvt/blob/6cc7a10af42c6883d9c10780e664c0504990a7ac/apps/web/src/app/views/code/useCodeWorkingTreeSync.ts)
4. [`apps/web/src/app/views/code/useCodeWorkingTreeSync.test.tsx`](https://github.com/dunay2/dvt/blob/6cc7a10af42c6883d9c10780e664c0504990a7ac/apps/web/src/app/views/code/useCodeWorkingTreeSync.test.tsx)
5. [`apps/web/src/app/views/code/CodeWorkingTreeStatus.tsx`](https://github.com/dunay2/dvt/blob/6cc7a10af42c6883d9c10780e664c0504990a7ac/apps/web/src/app/views/code/CodeWorkingTreeStatus.tsx)
6. [`apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts`](https://github.com/dunay2/dvt/blob/6cc7a10af42c6883d9c10780e664c0504990a7ac/apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts)
7. [`apps/web/src/app/views/canvas/canvasPlanAction.ts`](https://github.com/dunay2/dvt/blob/6cc7a10af42c6883d9c10780e664c0504990a7ac/apps/web/src/app/views/canvas/canvasPlanAction.ts)
8. [`apps/api/src/application/ports/workspaceFiles.ts`](https://github.com/dunay2/dvt/blob/6cc7a10af42c6883d9c10780e664c0504990a7ac/apps/api/src/application/ports/workspaceFiles.ts)
9. [`apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.ts`](https://github.com/dunay2/dvt/blob/6cc7a10af42c6883d9c10780e664c0504990a7ac/apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.ts)
10. [`apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts`](https://github.com/dunay2/dvt/blob/6cc7a10af42c6883d9c10780e664c0504990a7ac/apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts)
11. [`tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs`](https://github.com/dunay2/dvt/blob/6cc7a10af42c6883d9c10780e664c0504990a7ac/tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs)
12. [`.github/workflows/release-candidate-integrity.yml`](https://github.com/dunay2/dvt/blob/6cc7a10af42c6883d9c10780e664c0504990a7ac/.github/workflows/release-candidate-integrity.yml)

## Mandatory evidence for the next product PR

- exact base and final head SHA;
- no unresolved review threads;
- focused red/green state-machine tests;
- full Web typecheck/lint/test;
- architecture ownership test;
- Planning DB integrity and mechanization without unnecessary migration fragmentation;
- protected browser proof against the live API/runtime;
- screenshots or trace only when they add evidence, never as a substitute for assertions;
- all applicable CI on the final head;
- no claim that exact `main` is validated unless evidence is bound to the final tree.

## Final decision

DVT has made a real and valuable release-governance advance. Release `0.5.0` is published, its previous
integrity blockers are fixed, ordinary product PRs can pass the required release check, and release
`0.5.1` has six standard green workflows.

That success should now be treated as a stopping point for governance expansion.

The product still has a credible but incomplete bidirectional DBT authoring model. The next decisive
advance is not another document, release gate, or broad abstraction. It is one narrow, proven correction:
separate durable file state from semantic DBT state so no edit/revert interleaving can erase truth.

After that, bind the complete project revision and publish related files atomically. Those three slices
are the shortest route from impressive internal machinery to a mature, trustworthy user transaction.
