---
title: DVT release-assessment and product-authority Fowler review
date: 2026-07-20T20:40:00+02:00
status: current-review
reviewed_main_sha: 8eb0f5a7551d46c909a024b86f66cf3580c20691
scope: documentation-only
supersedes: 2026-07-20-1649-dvt-fork-safe-release-integrity-delta-fowler-review.md
---

# DVT release-assessment and product-authority Fowler review

## Purpose and constraints

This is a point-in-time review for the implementation agent working in
[`dunay2/dvt`](https://github.com/dunay2/dvt). It inspects the exact current `main`, recent
commits, every visible open pull request, workflow identity on relevant heads, current review threads,
release state, unmerged branch work, and the product code paths that own DBT authoring, persistence,
semantic reconciliation, project revision identity, Preview, Run, workspace mutation, and release
admission.

The review applies a hard Fowler standard. It looks for:

- responsibility overload;
- temporal coupling;
- hidden and duplicate authority;
- primitive obsession;
- shotgun surgery;
- leaky abstractions;
- stale truth;
- test-only confidence;
- partial transactions;
- architectural drift;
- implementation routes that create a second semantic language rather than reuse the existing model.

This change is documentation-only. It changes no runtime code, workflow, dependency, contract,
migration, generated artifact, release metadata, or product behavior. It authorizes no merge and does
not replace Planning DB as current work authority.

No local execution is claimed. Repository objects, source files, pull requests, workflow runs, review
threads, and branch files were inspected through the GitHub integration. Mature-system comparisons
use official product documentation linked below.

## Exact reviewed identities

- Repository: [`dunay2/dvt`](https://github.com/dunay2/dvt)
- Exact current `main`: [`8eb0f5a7551d46c909a024b86f66cf3580c20691`](https://github.com/dunay2/dvt/commit/8eb0f5a7551d46c909a024b86f66cf3580c20691)
- Current main merge: [PR #1996 — Harden DBT code persistence reconciliation](https://github.com/dunay2/dvt/pull/1996)
- Active release-governance PR: [PR #2002 — Enforce trusted release candidate integrity](https://github.com/dunay2/dvt/pull/2002)
- PR #2002 reviewed head: [`093e58c6b4de75eb293bd5d61ccfe89027384c6b`](https://github.com/dunay2/dvt/commit/093e58c6b4de75eb293bd5d61ccfe89027384c6b)
- Open release candidate: [PR #1984 — Release 0.5.0](https://github.com/dunay2/dvt/pull/1984)
- Release candidate head: [`15783c8dddfd57e4a34ef282e6d919ead2956ef9`](https://github.com/dunay2/dvt/commit/15783c8dddfd57e4a34ef282e6d919ead2956ef9)
- Previous review: [PR #2013](https://github.com/dunay2/dvt/pull/2013)
- This review branch: `agent/dvt-review-20260720-2040`

## Executive verdict

There is still **no product-code delta on `main`**. The same four user-transaction gaps remain:

1. Code persistence and DBT semantic reconciliation are compressed into one scalar `phase`;
2. a file save is reconciled against the latest project projection rather than the exact whole-project
   content set that the operation is supposed to describe;
3. graph-first Preview publishes generated DBT files sequentially although an atomic batch authority
   already exists;
4. Preview and Run do not yet share one exact admitted project revision with Code.

There is, however, a material branch delta in PR #2002. The former labeler, base-fetch,
exact-head-check, fork-classification, Release Please token, and hidden-bypass-actor findings are now
resolved on the branch. Its seven commits and all six visible workflows are green.

That green state is **not functional proof of the release-candidate path**. PR #2002 currently has one
unresolved, non-outdated **P1 review thread**: the workflow passes the complete merge-policy inspection
envelope to release assessment, while the assessment code expects the nested policy object. A valid
release candidate is therefore projected as if repository settings and the main ruleset were absent,
causing deterministic false policy violations.

The branch also retains a second, independently confirmed governance risk not yet represented by an
inline thread: repository merge settings and the main ruleset are configured through two remote writes
without compensation. A ruleset concurrency failure or PUT failure can occur after repository settings
have already changed, leaving GitHub partially configured.

The immediate decision is therefore:

1. do not merge PR #2002 yet;
2. fix the P1 policy-envelope mismatch with one narrow adapter/contract PR and resolve the thread;
3. make release-policy configuration compensating or explicitly transactional;
4. then resume the product route, beginning with separation of Code persistence and reconciliation;
5. do not merge or tag release PR #1984 in its current state.

## Material delta since the previous review

### Fixed on PR #2002, not yet in main

The following earlier findings are genuinely fixed on head `093e58c6b`:

- **Labeler authority:** file-label mutation is isolated in a trusted `pull_request_target` workflow
  with the write permission it needs. The ordinary PR quality workflow remains read-oriented.
- **Base-fetch authentication:** changed-file consumers use the immutable event base SHA rather than
  relying on an anonymous or credential-persisting fetch.
- **Exact-head required-check identity:** trusted code creates and completes an explicit Check Run on
  the classified publication SHA rather than relying on the native `pull_request_target` job SHA.
- **Fork classification ordering:** a read-only trusted-base job classifies same-repository, fork,
  product, release-candidate, required, not-applicable, and rejected postures before either Checks API
  mutation job runs.
- **Release Please trigger identity:** release generation requires `RELEASE_GOVERNANCE_TOKEN`, fails
  before mutation when absent, and has no `GITHUB_TOKEN` fallback.
- **Hidden bypass actors:** merge-policy projection now rejects a ruleset response that omits
  `bypass_actors`; hidden protected data is no longer treated as an empty list.

All corresponding PR #2002 review threads are resolved and non-outdated, except the P1 described below.

### New active P1 on PR #2002

The current workflow step `Inspect repository merge policy from trusted code` captures the JSON emitted
by:

```text
releaseMergePolicyCli.mjs inspect
```

That command emits this transport envelope:

```ts
type ReleaseMergePolicyInspection = Readonly<{
  valid: boolean;
  violations: readonly string[];
  policy: ReleasePullRequestMergePolicy;
}>;
```

The workflow then exports the entire envelope as `RELEASE_REPOSITORY_POLICY_JSON`. In
`collectReleaseCandidateSnapshot`, that JSON is parsed directly into `repositoryPolicy`. Later,
`assessRepositoryMergePolicy(candidate.repositoryPolicy)` reads:

```ts
policy.repository
policy.mainRuleset
```

Those members exist only under `inspection.policy`. Therefore the current release-candidate path sees
an empty repository policy and reports merge-policy violations even when GitHub is configured
correctly.

This is a classic adapter boundary defect:

- the query returns an inspection result;
- the consumer expects the domain read model;
- the workflow uses untyped JSON as an implicit mapping language;
- green unit and workflow tests do not exercise the exact end-to-end payload shape.

### No product implementation delta

`main` remains exactly `8eb0f5a7551d46c909a024b86f66cf3580c20691`. No Code, Canvas, API,
contract, runtime, workspace, execution, accessibility, performance, or product behavior changed.
The product findings in this report are revalidated against the same exact tree rather than presented
as new discoveries.

## Current repository and pull-request state

### Recent main sequence

The latest main history remains:

1. `8eb0f5a7551d46c909a024b86f66cf3580c20691` — merge PR #1996;
2. `de5ecc45947e69177e8f010adb7b5d4fc64fd21e` — prevent in-flight DBT edits from being lost;
3. `2a895f85e1d2ddb6c11b6038c9b8ddf7fe363fce` — persist edits made during DBT reconciliation;
4. `1bef79c0d3919039806a2663662aeeae6da37643` — restore live DBT workspace-file proof;
5. `6a5a937086f8d787b67bce03d7bd599f2ea90fd1` — align DBT authoring architecture with Code authority;
6. `50586b48fe51231ad6035c956a3f6c9ef6d5c269` — decouple file persistence from reconciliation;
7. `353ac8c724e51e703eaa7c5b9ff5db657fafb5f7` — merge PR #1993.

There is no newer commit on `main`.

### Visible open pull requests

| PR | Scope | Current evidence | Verdict |
| --- | --- | --- | --- |
| [#2002](https://github.com/dunay2/dvt/pull/2002) | trusted release-candidate integrity; head `093e58c6b` | seven commits; 39 files; all six workflows green; one unresolved P1 thread | Do not merge. Fix the merge-policy envelope and then prove a real candidate. |
| [#2004](https://github.com/dunay2/dvt/pull/2004) | `actions/setup-python` 6.3.0 → 7.0.0 | prior exact-head evidence: five lanes green, PR Quality failed | Treat as a CI-platform migration, not an automatic patch. |
| [#2005](https://github.com/dunay2/dvt/pull/2005) | CodeQL `init` 4.37.0 → 4.37.1 | prior exact-head evidence: CodeQL, Code Quality, and PR Quality failed | Do not version-skew CodeQL actions; combine with #2006. |
| [#2006](https://github.com/dunay2/dvt/pull/2006) | CodeQL `analyze` 4.37.0 → 4.37.1 | same failing family as #2005 | Replace both with one coherent CodeQL action-set change. |
| [#2007](https://github.com/dunay2/dvt/pull/2007) | `markdownlint-cli2` patch | prior exact-head evidence: five lanes green, PR Quality failed | Low runtime risk but still not admissible while governance fails. |
| [#2008](https://github.com/dunay2/dvt/pull/2008) | Temporal SDK 1.18.1 → 1.20.3 | prior exact-head evidence: five lanes green, PR Quality failed | Runtime-significant. Require replay, worker, bundling, integration, and ARC evidence. |
| [#2009](https://github.com/dunay2/dvt/pull/2009) | `react-resizable-panels` 2.1.7 → 4.12.2 | rechecked: Test Suite, Code Quality, and PR Quality fail; three other lanes pass | A UI-platform migration disguised as a bot bump. Close or replace with an owned migration PR. |
| [#2010](https://github.com/dunay2/dvt/pull/2010) | Radix menubar update | prior exact-head evidence: five lanes green, PR Quality failed | Require keyboard, focus restoration, submenu, and ARIA proof. |
| [#2011](https://github.com/dunay2/dvt/pull/2011) | Radix navigation-menu update | prior exact-head evidence: five lanes green, PR Quality failed | Require focus, `aria-controls`, keyboard, and visual regression proof. |
| [#2013](https://github.com/dunay2/dvt/pull/2013) | previous review | documentation checks green | Superseded by this review. |
| [#2012](https://github.com/dunay2/dvt/pull/2012) | older review | documentation checks previously green | Superseded. |
| [#2003](https://github.com/dunay2/dvt/pull/2003) | older review | documentation evidence previously green | Superseded. |
| [#2001](https://github.com/dunay2/dvt/pull/2001) | older review | documentation evidence previously green | Superseded. |
| [#2000](https://github.com/dunay2/dvt/pull/2000) | older review | documentation evidence previously green | Superseded. |
| [#1999](https://github.com/dunay2/dvt/pull/1999) | older review | documentation evidence previously green | Superseded. |
| [#1984](https://github.com/dunay2/dvt/pull/1984) | release `0.5.0`; head `15783c8d` | six workflows `action_required`; duplicate logical release outcome | Stale and not release-ready. Do not merge or tag. |

The queue now contains six superseded point-in-time review PRs before this review. That is low-grade
duplicate authority. Preserve reports as immutable historical evidence, but close or explicitly archive
superseded PRs so implementation agents do not choose among multiple documents claiming current truth.

## CI and exact-tree evidence

### Exact current main

`main@8eb0f5a7551d46c909a024b86f66cf3580c20691` has no connector-visible workflow run or
commit status. PR #1996 had green head evidence, but the exact merge tree currently published as `main`
does not have machine-readable validation attached to it.

This remains weaker than a mature release posture. The exact tree to be tagged or deployed must be the
tree admitted by checks, not merely a nearby PR head or merge simulation.

### PR #2002

Current head `093e58c6b4de75eb293bd5d61ccfe89027384c6b` has:

- Contracts & Determinism: success;
- Dependency Review: success;
- CI — Code Quality: success;
- Test Suite: success;
- CodeQL: success;
- PR Quality Gate: success.

This is genuine progress. It proves the branch's current suites. It does **not** prove that a real
release candidate can pass, because the unresolved P1 is an integration-shape defect absent from the
current same-branch tests.

### Release PR #1984

The release head remains `15783c8d`. Its six visible workflows remain `action_required`. Its notes
still contain the same execution-selection recovery outcome twice, once for merge SHA `ec47025` and
once for parent SHA `fa240f8`.

There is no valid basis to merge, tag, or publish this candidate.

## Review-thread state

### PR #2002

Resolved and non-outdated:

- P2 — restore write authority for the labeler;
- P2 — preserve authentication for base-scope calculation;
- P1 — publish the required check on the authoritative revision;
- P2 — classify fork authority before Checks API mutation;
- P1 — use a non-`GITHUB_TOKEN` identity for Release Please;
- P1 — fail closed when bypass actors are hidden.

Unresolved and non-outdated:

- **P1 — pass the projected merge policy to assessment.** The workflow passes
  `{ valid, violations, policy }`, but the assessment expects `policy` itself.

### PR #1996 / exact main

Resolved and non-outdated:

- P1 — do not let `flush()` approve an unsaved edit made while reconciliation is pending;
- P1 — do not let persistence acknowledgement hide a later edit made while the write is in flight.

Unresolved and non-outdated:

- **P2 — keep pending reconciliation visible when edits revert.** The current reducer can report
  `synchronized` and then ignore the matching invalid/stale/unavailable result.

No open inline thread was found on release PR #1984 or the reviewed Dependabot branches.

## Previous-finding disposition

| Finding | Status | Current evidence |
| --- | --- | --- |
| Raw technical selection-recovery error leaks into localized UI | **Fixed in main** | Recent reconciliation work uses stable localized copy. |
| Latest buffer lost while a persistence request is in flight | **Fixed in main** | PR #1996 P1 resolved with reducer and hook interleaving proof. |
| Latest buffer lost while semantic reconciliation is in flight | **Fixed in main** | Changed buffers return to modified and stale receipts are rejected. |
| Contextual file target lost after failed save | **Fixed in main** | Target survives retry and is applied once persistence succeeds. |
| Release check attached to default-branch SHA | **Fixed on #2002** | Explicit Check Run uses classified publication SHA. |
| Fork check published before authority classification | **Fixed on #2002** | Read-only classification precedes mutation; fork product PRs use test-merge SHA. |
| Release Please cannot trigger candidate checks | **Fixed on #2002** | Trusted governance token is mandatory with no fallback. |
| Hidden ruleset bypass actors treated as none | **Fixed on #2002** | Omitted `bypass_actors` now fails closed. |
| Release policy envelope passed as policy model | **Active P1 on #2002** | Unresolved current thread and source-path mismatch. |
| Repository/ruleset configuration can partially apply | **Active P1/P2 governance** | Repository PATCH precedes ruleset recheck and PUT; no compensation. |
| Edit → revert hides pending DBT reconciliation | **Active P2 in main** | Scalar `phase` gates completion on `phase === reconciling`. |
| File save receipt ignored by project reconciliation | **Active P1** | `_receipt` is unused; controller refetches latest projection. |
| Graph-first publication can leave partial project | **Active P1** | Canvas loops over independent file saves. |
| Workspace inventory silently truncates | **Active P1 product** | 500-file cap returns no completeness marker or cursor. |
| Oversized file is represented as invalid path | **Active P1 product/API** | >1 MB read/write throws `InvalidWorkspacePathError`. |
| Exact `main` lacks attached CI identity | **Active release evidence gap** | no visible runs/status on current merge SHA. |
| Release `0.5.0` is coherent and validated | **Disproved** | duplicate outcome and six `action_required` workflows. |
| Previous point-in-time reviews are current authority | **Superseded** | PRs #1999–#2013 describe older branch heads or findings. |

## Product and architecture review

## 1. Code working-tree state remains an overloaded scalar

File:

- [`apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts)

`CodeWorkingTreeSyncPhase` currently includes all of these concepts:

- clean versus dirty editor buffer;
- active file persistence;
- CAS conflict;
- persistence failure;
- pending semantic reconciliation;
- fresh analysis;
- stale-last-valid analysis;
- invalid analysis;
- unavailable analysis;
- verification unavailable;
- superseded file authority.

This is responsibility overload and primitive obsession. A string union is serving as an implicit
product protocol for two independent state machines.

The active P2 follows directly:

1. persisted bytes are `A` and reconciliation is pending;
2. user edits to `B`, making the scalar phase `modified`;
3. user returns the buffer to `A`;
4. `persistedReconciliationPhase` is still `null`, so the phase falls through to `synchronized`;
5. the matching reconciliation result later arrives;
6. the reducer rejects it because completion requires `state.phase === 'reconciling'`;
7. semantic truth is lost.

### Product impact

- Code can claim the file is synchronized while DBT analysis is still pending;
- invalid, stale, unavailable, superseded, or failed analysis can disappear;
- Preview and Run admission can be reasoned from stale presentation;
- correctness depends on event timing rather than durable operation identity.

### Required correction

Separate orthogonal state:

```ts
type CodePersistenceState =
  | Readonly<{ kind: 'clean' }>
  | Readonly<{ kind: 'dirty' }>
  | Readonly<{ kind: 'saving'; requestId: number; content: string; expectedRevision: string }>
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
  | Readonly<{ kind: 'verification-unavailable'; receipt: WorkspaceFileSaveReceipt }>
  | Readonly<{ kind: 'superseded'; receipt: WorkspaceFileSaveReceipt; currentContentSha256: string }>
  | Readonly<{ kind: 'failed'; receipt: WorkspaceFileSaveReceipt; errorCode: StableDbtErrorCode }>;
```

`edited` changes only persistence. `reconciliation_completed` matches a receipt and changes only
reconciliation. A pure projection derives UI copy and command availability.

## 2. Whole-project revision authority remains hidden

File:

- [`apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts)

Current callback:

```ts
const reconcileCodeFilePersistence = useCallback(
  async (_receipt: WorkspaceFileSaveReceipt) => {
    return projectDbtCodeReconciliationOutcome(await refreshProjectGraphSource());
  },
  [refreshProjectGraphSource]
);
```

The save receipt is explicitly accepted and explicitly ignored. The controller requests the latest
projection, which can represent a different project content set after another file changes.

### Product impact

- file persistence can be truthful while project reconciliation is attributed to the wrong snapshot;
- Code can claim its save produced analysis that actually includes another concurrent edit;
- Preview or Run can consume a revision different from the one presented by Code;
- provenance is present but not used as an admission invariant.

### Required correction

Reuse existing identities:

- `WorkspaceFileSaveReceipt`;
- `DbtProjectRevision.contentSetSha256`;
- `DbtProjectGraphProjection.analysisSha256`;
- `ProjectDbtGraphFromFiles` query rail;
- existing CAS semantics.

Do not create a second project-revision language.

## 3. Canvas bypasses the existing atomic batch authority

Files:

- [`apps/web/src/app/views/canvas/canvasPlanAction.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/canvas/canvasPlanAction.ts)
- [`apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.ts)

Canvas currently loops over generated artifacts and, for each file:

1. reads its expected revision;
2. calls `saveFileContent`;
3. proceeds to the next file.

A conflict or failure after the first successful write leaves a partial DBT project.

The repository already has a mature authority:

- `IWorkspaceFileBatchMutationPort`;
- complete expected-file preflight;
- scoped locking;
- CAS conflict sets;
- idempotency keys;
- immutable receipts;
- atomic replacement through the local mutation coordinator;
- retry recognition through postconditions.

Creating another transaction layer would be architecture drift. Route graph-first publication through
the existing batch port.

## 4. Workspace capability remains internally contradictory

File:

- [`apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts)

Current adapter behavior:

- lists at most 500 files;
- stops silently with no cursor or completeness marker;
- rejects files over 1 MB;
- maps oversized reads and writes to `InvalidWorkspacePathError`;
- gives the Web client no way to distinguish absence, invalid path, oversized content, or incomplete
  inventory.

This is a product contract defect, not just a local-adapter detail. A project can be analyzable while
its interactive file surface cannot truthfully enumerate or open it.

Required semantics:

```ts
type WorkspaceFileInventory = Readonly<{
  entries: readonly WorkspaceFileEntry[];
  completeness: 'complete' | 'partial';
  nextCursor: string | null;
  effectiveLimits: WorkspaceFileCapabilityPolicy;
}>;

type WorkspaceFileReadResult =
  | Readonly<{ kind: 'found'; file: WorkspaceFileContent }>
  | Readonly<{ kind: 'not-found' }>
  | Readonly<{ kind: 'oversized'; path: string; sizeBytes: number; maxBytes: number }>
  | Readonly<{ kind: 'unsupported'; path: string; reason: StableWorkspaceFileReason }>;
```

## 5. Release-governance configuration is not atomic

File:

- [`tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs`](https://github.com/dunay2/dvt/blob/fix/release-candidate-integrity/tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs)

Current configure order:

1. load repository and ruleset;
2. fingerprint both;
3. re-load both and check the fingerprint;
4. PATCH repository merge settings;
5. re-read the ruleset and compare it with the old snapshot;
6. PUT the ruleset;
7. re-read and assess.

If step 5 detects concurrent ruleset change, or step 6 fails, step 4 has already changed the repository.
There is no compensating rollback and no receipt reporting partial application.

### Fowler diagnosis

This is a distributed transaction represented as a command script. It has temporal coupling and hidden
partial-commit semantics.

### Required correction

Introduce an application boundary, not another CLI convention:

```ts
type ReleaseMergePolicySnapshot = Readonly<{
  repository: ReleaseRepositoryMergeSettings;
  repositoryFingerprint: string;
  rulesetId: number;
  ruleset: ReleaseMainRuleset;
  rulesetFingerprint: string;
}>;

type ConfigureReleaseMergePolicyResult =
  | Readonly<{ kind: 'applied'; before: ReleaseMergePolicySnapshot; after: ReleaseMergePolicySnapshot; receiptId: string }>
  | Readonly<{ kind: 'concurrent-change'; current: ReleaseMergePolicySnapshot }>
  | Readonly<{ kind: 'compensated'; failedPhase: 'repository' | 'ruleset' | 'verification'; receiptId: string }>
  | Readonly<{ kind: 'compensation-failed'; failedPhase: string; receiptId: string; operatorAction: string }>;
```

The adapter must preserve original values, verify both snapshots immediately before the first write,
apply both changes, verify the final pair, and compensate the first successful write if the second
fails. Every result requires an immutable operational receipt.

## Fowler assessment

### Responsibility overload

- `CodeWorkingTreeSyncState.phase` owns persistence, reconciliation, conflict, failure, and semantic
  freshness.
- `releaseMergePolicyCli.mjs` owns argument parsing, GitHub I/O, concurrency checks, desired-state
  construction, mutation ordering, verification, and user output.

### Temporal coupling

- Code correctness depends on whether edits arrive before persistence acknowledgement, during
  reconciliation, or after semantic completion.
- release configuration correctness depends on two independent GitHub resources not changing between
  a series of reads and writes.

### Hidden authority

- `_receipt` is accepted but ignored by Canvas reconciliation.
- untyped workflow JSON silently chooses whether an envelope or nested domain model is authoritative.
- current release admission trusts green tests that do not execute the exact release-candidate payload.

### Primitive obsession

- a scalar phase string encodes a two-axis state machine;
- raw JSON environment variables encode application contracts across workflow steps;
- generic string violations replace typed release-assessment outcomes.

### Shotgun surgery and governance amplification

PR #2002 now spans seven commits, 39 files, 7,147 additions, multiple workflows, CI tools, architecture
documents, and Planning DB migrations. The delivery is valuable, but the amount of movement for one
release gate is evidence that the application boundary is still too broad.

The answer is not to remove governance. The answer is to stabilize smaller typed boundaries so the
next defect is corrected in one owner and one mechanization record rather than through another wide
cross-cutting wave.

### Stale truth

Six earlier review PRs remain open. The newest report can be useful evidence, but a queue of open
point-in-time reports resembles a current workboard while Planning DB claims to be the work authority.
That is semantic duplication.

### Test-only confidence

PR #2002 is fully green while its real release-candidate input shape is wrong. This is the strongest
current signal that unit and static workflow tests are not enough. The missing proof is a protected,
base-controlled integration run against an actual candidate payload.

## Expert implementation route

## PR R0 — fix release merge-policy projection at the adapter boundary

This is the immediate repository action.

### Severity and evidence

- Severity: **P1 release blocker**.
- Evidence: unresolved non-outdated PR #2002 thread; `inspect` emits an envelope;
  `collectReleaseCandidateSnapshot` stores the envelope as `repositoryPolicy`;
  `assessRepositoryMergePolicy` expects the nested domain model.

### Root cause

A workflow environment variable is used as an untyped serialization boundary. Producer and consumer
share field names only by convention.

### Product and operator impact

- every real release candidate can fail regardless of correct GitHub policy;
- `0.5.0` cannot become a trustworthy proof candidate;
- operators receive misleading policy violations;
- all green branch checks create false confidence.

### Domain owner

`CI Governance / ReleaseCandidateIntegrity`.

Existing rails:

- `InspectReleasePullRequestMergePolicy` query;
- `AssessReleaseCandidateIntegrity` query.

Do not add a new command or query rail.

### Proposed contract

```ts
type ReleaseMergePolicyInspectionResult = Readonly<{
  valid: boolean;
  violations: readonly StableReleasePolicyViolation[];
  policy: ReleasePullRequestMergePolicy;
}>;
```

Use one schema/parser owned by the CI governance application boundary. The workflow adapter must pass
`inspection.policy`, or the assessment CLI must parse the envelope and explicitly select `.policy`.
Do not accept both shapes indefinitely.

### Likely files

- `.github/workflows/release-candidate-integrity.yml`;
- `tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs`;
- `tools/ci/release-candidate-integrity/releaseCandidateIntegrityCli.mjs`;
- focused workflow and CLI tests;
- one Planning DB update to the existing feature, not a new feature family.

### Red tests

1. valid wrapped inspection payload currently produces policy violations;
2. after correction, the same payload produces zero policy violations;
3. missing `policy` fails with a stable contract error before candidate assessment;
4. malformed `policy` fails schema validation;
5. an inspection with `valid: false` cannot be silently converted into an admissible policy;
6. a candidate with a genuinely invalid policy still reports the exact stable violations.

### Live proof

Run the trusted workflow against an actual Release Please candidate whose repository/ruleset policy is
known valid. Capture:

- classified publication SHA;
- Check Run ID and head SHA;
- inspection result identity;
- nested policy fingerprint;
- assessment conclusion;
- final Check Run conclusion.

No candidate-controlled code receives the governance token.

### Migration and compatibility

This is an internal workflow/CLI contract with no public compatibility requirement. Hard-cut the wrong
shape. Do not preserve a dual parser after the branch merges.

### Rollback

Revert the workflow/CLI adapter commit. No repository setting or release artifact is mutated by the
assessment correction itself.

### Observability

Log only:

- opaque inspection receipt ID;
- policy fingerprint;
- publication SHA;
- assessment outcome and stable violation codes.

Do not log tokens, candidate file content, or raw API payloads containing protected metadata.

### Acceptance criteria

- the unresolved P1 thread is answered with the fixing commit and resolved;
- exact final-head CI is green;
- a real valid release candidate passes policy assessment;
- a real invalid candidate fails for its actual policy defect;
- the trusted token remains unavailable to candidate code;
- the check is completed on the classified exact revision.

## PR R1 — make release-policy configuration compensating

This follows R0 and remains separate from product work.

### Required changes

- extract a `ReleaseMergePolicyConfigurationService`;
- introduce a port for inspect/apply/restore operations;
- preserve an immutable before-snapshot;
- preflight repository and ruleset fingerprints immediately before mutation;
- verify the resulting pair;
- compensate if the second mutation or final verification fails;
- return a typed receipt for applied, concurrent, compensated, and compensation-failed outcomes.

### Red tests

1. repository changes after preflight: no write occurs;
2. ruleset changes after preflight: no write occurs;
3. repository PATCH fails: ruleset is untouched;
4. repository PATCH succeeds and ruleset PUT fails: repository settings are restored;
5. final verification fails: both resources are restored or a compensation-failed receipt is emitted;
6. retry with the same idempotency key returns the prior receipt;
7. concurrent operator update is never overwritten by compensation.

### Security

- token scope is limited to the exact repository and required settings/ruleset operations;
- candidate code never runs in a token-bearing step;
- receipts contain fingerprints and opaque IDs, not token or policy secrets;
- compensation is itself CAS-guarded.

### Release gate

Do not run the configure command against production repository policy until failure-injection tests and
compensation are green.

## PR A — split Code persistence and reconciliation state

This remains the next functional product slice after release-governance containment.

### Domain owner

- `apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts`;
- `apps/web/src/app/views/code/useCodeWorkingTreeSync.ts`.

Canvas supplies reconciliation but does not own the working-tree state machine.

### Red tests

```text
persisted A
→ reconciliation pending for receipt R1
→ edit B
→ edit A
→ invalid result for R1
→ persistence clean + reconciliation degraded-invalid
→ presentation persisted_invalid
```

Also require:

- fresh completion after edit/revert becomes synchronized only after the result arrives;
- failure after edit/revert becomes reconciliation failed;
- dirty buffer preserves the stored semantic outcome but presents dirty first;
- older receipt is ignored after a newer save;
- `flush()` distinguishes content durability from semantic freshness;
- status is localized and screen-reader-announced.

### Acceptance criteria

- no matching reconciliation result is lost because of a presentation phase;
- `synchronized` means durable bytes and fresh/not-required semantics;
- reducer and hook tests cover event interleavings;
- one protected browser proof edits, reverts, receives invalid analysis, closes, reopens, and recovers;
- PR #1996 P2 thread is resolved.

## PR B — bind reconciliation, Preview, and Run to one project revision

### Proposed result

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

### Mandatory invariants

- the saved file still has the receipt content hash;
- the projection identifies the exact full content set analyzed;
- concurrent change to any project file prevents attribution to the original exact revision;
- Code retains the accepted project revision;
- Preview and Run consume that revision or explicitly refresh/reject;
- reopen displays the same accepted identity.

### Live proof

Save model SQL, concurrently change `schema.yml`, finish analysis, and prove the original save is durable
but cannot claim the newer whole-project revision as its own.

## PR C — publish generated DBT artifacts atomically

### Reuse existing authority

Use `IWorkspaceFileBatchMutationPort` and the existing local gateway.

Recommended command shape:

```ts
type PublishDbtWorkspaceArtifacts = Readonly<{
  idempotencyKey: string;
  projectRoot: string;
  expectedFiles: readonly WorkspaceFileExpectedRevision[];
  writes: readonly Readonly<{ path: string; content: string }>[];
}>;
```

### Acceptance criteria

- one idempotency key;
- complete expected-revision set;
- all-or-nothing publication;
- one immutable batch receipt;
- exact resulting project content-set identity;
- one DBT analysis identity;
- retry returns the same receipt;
- Preview and Run provenance use that receipt.

### Failure-injection tests

- conflict on second artifact leaves every original hash unchanged;
- write failure after staging leaves zero committed changes;
- repeated idempotency key does not duplicate mutation;
- conflicting reuse of an idempotency key fails;
- browser proof never displays a partially generated project.

## PR D — regenerate a truthful release candidate

Only after R0, R1, A, B, and C or an explicitly approved reduced release scope:

1. close the stale #1984 candidate;
2. regenerate from exact current main;
3. produce one changelog entry per merged PR/user outcome;
4. execute all applicable checks on the exact candidate head;
5. verify policy through the corrected nested contract;
6. bind the tag to the exact admitted head;
7. retain tree and artifact digests;
8. publish only after the exact tag target has machine-readable evidence.

## PR E — make workspace capability truthful

Deliver separately:

- paginated or cursor-based listing;
- explicit complete/partial status;
- oversized result distinct from invalid path;
- shared effective limit policy across import, analysis, explorer, Code, and mutation;
- tests at 501 files, near the accepted importer maximum, and above 1 MB;
- UI disclosure when a project is only partially interactive.

## Quality, operability, accessibility, performance, security, and recovery

### Accessibility

No product delta closes existing accessibility evidence gaps. The failing
`react-resizable-panels` major bump reinforces that resize/focus behavior cannot be accepted through a
package-only PR. Any replacement migration requires:

- keyboard resize and collapse;
- focus preservation;
- screen-reader naming and current size/state;
- reduced-motion posture where applicable;
- pointer and touch behavior;
- contextual-menu interaction during resize;
- live browser proof.

### Performance

The current release work adds no product performance evidence. Before broader adoption, maintain
separate budgets for:

- large graph rendering and interaction latency;
- project analysis duration;
- Code save and reconciliation latency;
- batch publication duration;
- inventory pagination;
- Preview/Run admission on exact revision.

A green functional suite is not a performance gate.

### Security

Positive current branch posture:

- trusted base code classifies authority before write jobs;
- candidate code is inspected without credentials;
- Release Please has an explicit trusted identity;
- hidden ruleset fields fail closed;
- file batch mutations normalize scoped paths and use CAS.

Remaining requirements:

- minimum token scope and documented rotation;
- no raw SQL, YAML, transport errors, or secrets in logs;
- schema validation for workflow JSON boundaries;
- compensation that cannot overwrite a concurrent operator change;
- stable sanitized diagnostics at Web/API boundaries.

### Data integrity and recovery

The repository already demonstrates the right primitives—content hashes, save receipts, idempotency,
atomic local replacement, and analysis hashes—but current orchestration does not use them as one
aggregate transaction.

Recovery must be proven for:

- browser close during persistence;
- process crash after content save but before reconciliation;
- process crash during multi-file publication;
- stale receipt completion;
- invalid DBT analysis retained across reopen;
- failed GitHub policy configuration with compensation;
- retry after network timeout where remote mutation may have succeeded.

### Operability

Required stable signals:

- file save started/succeeded/conflicted/failed;
- reconciliation pending/fresh/degraded/failed/superseded;
- ignored stale receipt;
- project revision mismatch at Preview/Run;
- batch publication conflict/failure/retry;
- release-policy configuration phase and compensation outcome;
- candidate inspection fingerprint and exact publication SHA;
- exact tag-target validation.

Metrics and logs must use opaque receipt IDs and hashes, never source content or credentials.

### Documentation truth

Point-in-time reports are evidence, not a current-state database. The implementation agent should:

- reconcile accepted findings into Planning DB;
- close superseded report PRs;
- link the one current implementation task to its fixing PR;
- generate current product status from repository and Planning DB evidence;
- stop treating repeated manual reports as parallel planning authority.

## Mature-system comparison: Match / Differentiate / Defer

| System | Mature capability | DVT decision |
| --- | --- | --- |
| [dbt Studio / dbt Developer Hub](https://docs.getdbt.com/) | one environment for building, testing, running, version control; local extension has live errors, fast parsing, and lineage | **Match** separation of buffer, durable file, analysis, lineage/index, execution, and Git state. **Differentiate** with graph/code bidirectionality. **Defer** broad hosted collaboration until authority is correct. |
| [VS Code source control](https://code.visualstudio.com/docs/sourcecontrol/staging-commits) | working tree, staged snapshot, commit, branch, remote sync, history, and conflict are distinct | **Match** explicit state axes and diffs. Never label a durable file plus pending analysis as one generic synchronized state. |
| [Airflow DAG Bundles](https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/dag-bundles.html) | versions the DAG and associated files as one bundle; a run retains the same version even if code changes mid-run | **Match** exact project content-set admission for Preview and Run. **Do not** run against latest mutable files. |
| [Prefect deployment versioning](https://docs.prefect.io/v3/how-to-guides/deployments/versioning) | deployment versions, promotion, rollback, and code pinned by commit or image digest | **Match later** for published project revision history and rollback, after basic transaction truth is complete. |
| [Dagster](https://docs.dagster.io/) | declarative assets, integrated lineage, observability, and testability | **Defer** asset/check richness until Code/file/project authority is stable. Then use it to guide asset status, freshness, and checks. |
| [Temporal](https://docs.temporal.io/) | durable identity and resumption after crashes, network failures, and outages | **Match** receipts, idempotency, explicit outcomes, and recovery. **Do not** turn the editor reducer into a workflow engine. |
| [NiFi Registry status](https://nifi.apache.org/projects/registry/) | visual flow versioning moved toward Git-based registry clients; standalone Registry is deprecated | **Match** versioned aggregate, diff, local/remote posture, and Git interoperability. **Do not** build another proprietary registry. |

## What DVT should match now

- independent persistence and semantic-analysis state;
- exact full-project revision for execution;
- atomic multi-file publication;
- durable, idempotent receipts;
- stable conflict and degraded-state presentation;
- reproducible Preview/Run;
- trusted-code security boundaries;
- explicit release/tag identity.

## What DVT should differentiate

- graph-first and code-first authoring converging on one file-authoritative steady state;
- contextual node Code opening the same revisioned source as Project Code;
- bidirectional graph edits expressed through existing typed commands, not a second DSL;
- operational provenance visible directly on graph nodes and execution plans.

## What DVT should defer

- a generic mutation framework built before three proven verticals;
- a custom source-control or registry replacement;
- full Dagster-style asset management before model SQL/YAML authority is stable;
- Prefect-style promotion UX before exact project revisions exist;
- broad dependency migrations while release and product correctness remain blocked.

## Ordered PR decomposition

1. **R0 — Fix merge-policy inspection envelope.** Narrow adapter/contract correction, live candidate
   proof, resolve current P1.
2. **R1 — Make repository/ruleset configuration compensating.** Failure injection and immutable
   receipt.
3. **A — Split Code persistence and reconciliation state.** Resolve PR #1996 P2.
4. **B — Bind save, analysis, Preview, and Run to exact project content-set identity.**
5. **C — Route generated artifacts through existing atomic batch authority.**
6. **D — Regenerate and prove a truthful release candidate.**
7. **E — Deliver complete/partial workspace inventory and truthful file limits.**
8. **F — Establish executable accessibility, performance, recovery, and large-project release gates.**
9. **G — Only then generalize authoring once to column description in `schema.yml`.**

Do not combine R0 with A, or A with C. Each slice must close one real transaction and leave one clear
owner.

## Files the next implementation agent should inspect first

### Immediate release P1

1. [`.github/workflows/release-candidate-integrity.yml`](https://github.com/dunay2/dvt/blob/fix/release-candidate-integrity/.github/workflows/release-candidate-integrity.yml)
2. [`releaseMergePolicyCli.mjs`](https://github.com/dunay2/dvt/blob/fix/release-candidate-integrity/tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs)
3. [`releaseCandidateIntegrityCli.mjs`](https://github.com/dunay2/dvt/blob/fix/release-candidate-integrity/tools/ci/release-candidate-integrity/releaseCandidateIntegrityCli.mjs)
4. [`releaseCandidateIntegrity.mjs`](https://github.com/dunay2/dvt/blob/fix/release-candidate-integrity/tools/ci/release-candidate-integrity/releaseCandidateIntegrity.mjs)
5. [`releaseCandidateAuthority.mjs`](https://github.com/dunay2/dvt/blob/fix/release-candidate-integrity/tools/ci/release-candidate-integrity/releaseCandidateAuthority.mjs)
6. current CI-tool and workflow-governance tests under `tools/ci/`.

### Product route

1. [`codeWorkingTreeSyncModel.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts)
2. [`useCodeWorkingTreeSync.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/code/useCodeWorkingTreeSync.ts)
3. [`CodeWorkingTreeStatus.tsx`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/code/CodeWorkingTreeStatus.tsx)
4. [`useDbtProjectFileCanvasController.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts)
5. [`canvasPlanAction.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/canvas/canvasPlanAction.ts)
6. [`LocalWorkspaceFileBatchMutationGateway.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.ts)
7. [`LocalWorkspaceFileRepository.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts)
8. protected Cypress proofs for DBT Code, YAML description editing, Preview, Run, and reopen.

## Final decision summary

DVT is not abandoned. The active agent has materially advanced release governance. PR #2002 now has a
cleaner trust boundary, explicit exact-revision checks, fork classification, a trusted release identity,
and green CI.

But the branch is not done. Its current P1 means the first real release candidate will falsely fail
merge-policy assessment. The branch's green CI is therefore test-only confidence, not functional
completion.

The next move is precise:

1. fix and prove the nested merge-policy contract;
2. resolve the current P1 thread;
3. make release-policy configuration compensating;
4. then stop expanding release governance and return to the product;
5. split persistence from reconciliation;
6. bind Code, Preview, and Run to one exact project revision;
7. publish DBT artifacts atomically;
8. regenerate release `0.5.0` only after those truths are demonstrable.

## Documentation-only validation

This branch is intended to contain exactly one added Markdown file under
`docs/planning/reviews/architecture-and-governance/`.

No runtime code, workflow, dependency, contract, migration, generated artifact, release metadata, or
product behavior is intentionally changed. No pull request is merged, approved, labeled, or made ready
by this report.
