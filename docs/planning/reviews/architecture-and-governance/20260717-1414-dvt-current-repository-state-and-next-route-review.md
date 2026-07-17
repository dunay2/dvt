---
title: DVT Current Repository State and Next Route Review — 2026-07-17 14:14
status: Draft
owner: Product Architecture / Quality Engineering
reviewers:
  - Product
  - Architecture
  - Web
  - API
  - Runtime
  - Platform
  - Security
  - SRE
date: 2026-07-17
last_reviewed: 2026-07-17
planning_type: review
reviewed_repository: dunay2/dvt
reviewed_ref: main
reviewed_commit: 4c98026c0dd2e2b9e4bbcc126033b34f8afa2b5c
---

# DVT Current Repository State and Next Route Review — 2026-07-17 14:14

## Executive verdict

DVT has closed the immediate dbt execution-selection and Planning DB migration
integrity failures identified in the preceding reviews. The latest functional
branch work is green, the repository has no open pull requests, and release
`0.4.0` has been merged.

That is real progress, but the product is at a decision boundary rather than a
finished maturity milestone.

> The repository has now mechanized the truth about dbt Phases 2–4 more deeply
> than it has delivered the next user transaction.

PR [#1979](https://github.com/dunay2/dvt/pull/1979) correctly replaces stale
manual dbt phase interpretation with a Planning DB projection and Git ancestry
validation. It also required thirteen commits, twenty-four changed files, 2,697
additions, four new Planning DB migrations, and repeated P1/P2 corrections before
its final green head. Release `0.4.0` therefore represents a governance and
evidence increment, not a new end-user editing capability.

The next route should not be another broad governance phase. It should first
remove one concrete file-product safety mismatch, then deliver one complete,
lossless dbt YAML description edit from Canvas to the authoritative file and
back.

The highest-risk current product mismatch is explicit:

```text
DBT import inspection accepts up to 10,000 source files and 50 MB
                         ↓
Workspace file listing exposes at most 500 files
Workspace file reads/writes reject files above 1 MB
Listing truncation is silent
```

A project can therefore be accepted as importable while parts of the same
project are invisible or inaccessible in the Code/Canvas workspace surface.
That must be fixed before DVT claims project-scale dbt authoring.

## Immediate decision for the implementation agent

Proceed in this order:

1. make workspace-file inventory limits explicit, paginated, and compatible with
   the accepted dbt project limits;
2. add a product-wide quality baseline without blocking the first safety fix;
3. implement one revision-bound `schema.yml` model-description edit with
   proposal, visible diff, compare-and-swap, conflict, conditional revert,
   re-analysis, Preview, Run, and reopen proof;
4. then harden accessibility, bundle/graph performance, outbox scale, canary,
   multi-worker ordering, and operational recovery;
5. do not start Deployment, Schedule, or Backfill until authoring and operability
   gates are mechanically green.

## Review method and limits

This review inspected through the GitHub connector:

- current `main` and recent commits;
- all visible open pull requests and the most recent merged/closed pull requests;
- pull-request metadata and changed-file scope;
- workflow runs associated with the final heads of PRs #1979 and #1980;
- combined status visibility for the exact current `main` merge commit;
- inline review threads on PRs #1979, #1980, and the relevant migration-hardening
  PR #1977;
- current dbt capability-truth implementation and proposal surfaces;
- workspace-file repository and dbt import-inspection limits;
- root, API, Contracts, and Web quality configuration;
- open issues covering accessibility, determinism, nightly integration,
  canary, and multi-worker scale.

This review did not execute the repository locally. Runtime, test-count, and
Planning DB claims are therefore based on committed repository evidence and
GitHub workflow results, not an independent local run.

The branch-search connector did not enumerate relevant branches reliably. Branch
work was reconstructed from pull-request head metadata and commit history. No
claim below depends on an assumption that an unenumerated branch does not exist.

## Current repository snapshot

| Signal | Observed state |
| --- | --- |
| Current `main` | [`4c98026c0dd2e2b9e4bbcc126033b34f8afa2b5c`](https://github.com/dunay2/dvt/commit/4c98026c0dd2e2b9e4bbcc126033b34f8afa2b5c) |
| Current release | `0.4.0` |
| Open pull requests | None visible at review time |
| Latest product/governance PR | [#1979](https://github.com/dunay2/dvt/pull/1979), merged |
| Latest release PR | [#1980](https://github.com/dunay2/dvt/pull/1980), merged |
| PR #1979 final-head CI | Six workflows successful |
| PR #1980 release-head CI | Six workflows successful |
| Exact `main` merge-SHA status | No pull-request workflow runs or combined statuses returned |
| Active unresolved threads on #1979 | None; all observed threads resolved |
| Active unresolved threads on #1980 | None; no threads present |
| Prior review PR #1978 | Closed without merge; superseded by current state |

## Delta since the previous repository review

### Delivered

1. PR [#1979](https://github.com/dunay2/dvt/pull/1979) merged the dbt
   round-trip capability-truth projection.
2. The current capability posture for the governed dbt Phase 2–4 rails and the
   deferred export boundary is now read through Planning DB instead of copied
   into another handwritten current-state table.
3. The checker validates an exact governed capability set and verifies that
   recorded evidence commits exist and are ancestors of the checked ref.
4. Clean CI checkouts no longer require the ignored generated Markdown artifact
   to exist before the check can pass.
5. Governance import and capability generation order is now guarded.
6. The capability check is routed through DB-aware CI scopes rather than making
   the lightweight docs command require PostgreSQL.
7. Release [#1980](https://github.com/dunay2/dvt/pull/1980) published `0.4.0`.

### Closed findings from earlier reviews

The following earlier findings are no longer current blockers:

- dbt explicit execution selections no longer widen silently to unintended
  project scope;
- the direct graph-source ownership guard has been added;
- Planning DB strict migration ordinals and applied identities are protected;
- migration runners are serialized with a PostgreSQL advisory lock;
- numeric migration ordering crosses the `999 -> 1000` boundary correctly;
- all observed review threads on the recent migration and dbt capability work
  are resolved.

These items should not be reopened without new evidence.

## CI and review evidence

### PR #1979

PR #1979 final head:

```text
3bab1bb390795b3a6ec3e25e458e4346393b5c14
```

Observed successful workflows:

- PR Quality Gate;
- Dependency Review;
- Contracts & Determinism;
- CI - Code Quality;
- CodeQL;
- Test Suite.

The PR contained ten observed review threads. All are resolved. The threads were
not cosmetic; they identified real P1/P2 defects, including:

- feature-mechanization authority placed in migrations instead of the mandatory
  proposal;
- a capability validator not wired into the authoritative CI path;
- failure in shallow clones;
- an ignored generated artifact incorrectly treated as a CI precondition;
- stale capability generation before the final governance import;
- incomplete CI scope for governance catalog changes;
- accidental PostgreSQL dependency in the lightweight docs gate;
- acceptance of incomplete governed phase sets;
- a stale cardinal assertion after the symbol contract changed.

The final green head is meaningful because those findings were corrected and the
threads were resolved against the resulting code.

### PR #1980

Release PR #1980 head:

```text
620898938561adb4e6e2172c7db83a884c368813
```

Observed successful workflows:

- Dependency Review;
- CI - Code Quality;
- Contracts & Determinism;
- CodeQL;
- PR Quality Gate;
- Test Suite.

The release PR had no observed inline review threads.

### Exact current `main`

The exact merge commit on `main` is:

```text
4c98026c0dd2e2b9e4bbcc126033b34f8afa2b5c
```

The connector returned no pull-request-triggered workflow runs and no combined
status records for that exact merge SHA. This does not prove the merge tree is
bad. It means the evidence currently proves the release PR head, not a
post-merge execution attached to the exact default-branch commit.

**Required release-evidence improvement:** record or run one post-merge/default-
branch validation, or mechanically prove tree equivalence between the green
release head and the published merge/tag tree. Release evidence should point at
the exact shipped tree, not merely a parent PR head.

## Findings

## RS-01 — Governance truth improved, but change amplification remains excessive

**Severity:** P1 delivery and maintainability risk

PR #1979 is classified as documentation/governance work. Its final scope was:

- thirteen commits;
- twenty-four changed files;
- 2,697 additions;
- thirteen deletions;
- migrations `726` through `729`;
- CI, command-catalog, generated-doc policy, proposal, query adapter, generator,
  migration, and mechanization changes.

The corrections were necessary, but the shape remains a Fowler warning:

```text
one current-state read model
  -> proposal changes
  -> four append-only migrations
  -> query adapter
  -> generator
  -> generated-doc policy
  -> command catalog
  -> workflow routing
  -> workflow parity tests
  -> multiple Planning DB suites
  -> feature-mechanization symbol inventory
```

This is still **Shotgun Surgery** around governance representation. The risk is
not that governance exists; the risk is that every correction creates more
immutable metadata and more synchronization surfaces than the product change
being governed.

### Required response

Create a governance change-amplification budget:

- one declarative feature/capability source per product slice;
- generated relational/upsert output where possible;
- migrations only for schema changes or durable state transitions;
- no new append-only migration for review-only metadata correction when a
  mutable canonical manifest can own the correction;
- explicit architecture waiver when a documentation/governance slice changes
  more than ten governance-only files;
- score the ratio of product files to governance files in PR evidence.

### Exit criterion

A future capability-status change should alter one canonical manifest/query
model and generated checks, not require a chain of corrective migrations and
symbol-count repairs.

## RS-02 — Accepted dbt projects can exceed the workspace product surface

**Severity:** P1 product correctness defect

The dbt import inspector accepts by default:

```text
maxProjectFiles       10,000
maxInspectedFiles    100,000
maxProjectBytes   50,000,000
maxDirectories         5,000
maxDepth                   64
```

The workspace file repository exposes different limits:

```text
MAX_LISTED_FILES   500
MAX_FILE_BYTES     1,000,000
```

The repository stops listing after 500 accepted files. It does not return a
continuation cursor, a truncated flag, omitted-file count, or diagnostic. Files
above 1 MB are rejected by the general read/write adapter.

### User impact

A dbt project can pass import validation while:

- files after the first 500 are absent from the workspace explorer;
- a legitimate SQL, YAML, Markdown, or seed file above 1 MB cannot be opened;
- the graph/analyzer can know about resources the Code surface cannot expose;
- a user cannot determine whether the file tree is complete;
- visual editing and conflict recovery may target a project whose full source is
  not operable through the product.

This is not merely a scale optimization. It is a split capability contract.

### Required implementation

Introduce an explicit workspace inventory contract, for example:

```ts
type WorkspaceFileInventoryPage = {
  entries: readonly WorkspaceFileEntry[];
  nextCursor: string | null;
  totalKnown: number | null;
  truncated: boolean;
  effectiveLimits: {
    maxPageSize: number;
    maxReadableFileBytes: number;
  };
};
```

Then:

1. paginate or cursor the repository listing;
2. expose deterministic truncation diagnostics;
3. align import and workspace limits through one policy object;
4. decide separately whether large seed files are downloadable/read-only rather
   than editable in Monaco;
5. prove a project with more than 500 files remains fully navigable;
6. prove a file above 1 MB produces an explicit capability state instead of a
   generic invalid-path error;
7. ensure graph and Code surfaces report the same project inventory revision.

### Exit criterion

A project accepted by `ValidateDbtProjectImport` is either fully operable through
workspace inventory or returns explicit, user-visible capability limitations
before authority is switched.

## RS-03 — Python dbt models remain outside the accepted workspace contract

**Severity:** P2 compatibility gap

The current general workspace extension policy includes `.csv`, but not `.py`.
The dbt import inspector classifies SQL, YAML, CSV, Markdown, project config, and
dependency config. Other file types, including Python models, are rejected as
unsupported.

The accepted product plan explicitly calls for Python models when declared
supported. Current behavior is therefore a known incomplete compatibility
boundary, not a hidden implementation detail.

### Required decision

Choose one explicit posture:

- support Python dbt model files as authoritative source with safe text-only
  handling; or
- declare Python models unsupported for the current milestone and expose that
  compatibility state before import.

Do not silently omit or generically reject them after the user has selected a
project.

## RS-04 — The repository-wide “Current Status” document is still not current

**Severity:** P1 architecture and agent-routing risk

[`docs/architecture/system-delivery-status.md`](../../../../architecture/system-delivery-status.md)
continues to state:

```text
This page is the current implementation snapshot for the repository.
```

Its front matter and snapshot are dated `2026-04-26`. It predates the July dbt
file-authority, import, Preview/Run, selection-integrity, migration hardening,
capability-truth work, and releases `0.3.0` and `0.4.0`.

PR #1979 solved a narrower problem: the current status of eight governed dbt
round-trip rails. It did not restore a repository-wide current product snapshot.

### Required implementation

Replace the current claim with one of two honest models:

1. **Generated global capability truth** tied to current `main` SHA, contracts,
   routes, tests, live evidence, and open blockers; or
2. **Interpretive architecture overview** that stops claiming to be the current
   implementation inventory and links to generated status sources.

The tracked page should expose at least:

- reviewed `main` SHA and release;
- current capability states by product area;
- exact live-proof references;
- current release blockers;
- generated-at timestamp or deterministic reviewed date;
- pointers to specialized Planning DB projections.

### Exit criterion

A fresh agent starting from the documented entry route cannot conclude that the
April snapshot is the current July product state.

## RS-05 — Current dbt status is mechanically strong but operationally hidden

**Severity:** P2 usability and collaboration gap

The new dbt capability render is written under:

```text
.generated-docs/planning/status/generated-dbt-project-roundtrip-capability-status.md
```

The artifact is intentionally untracked. The checker can validate the Planning
DB and Git evidence without writing it, which is correct for clean CI. However,
another reviewer browsing GitHub cannot inspect the current rendered capability
state without cloning the repository, preparing/importing Planning DB, and
running the generator.

Planning DB may remain the authority, but authority and accessibility are
separate concerns.

### Required response

Keep the DB as write authority, but add a tracked stable pointer or a CI-published
artifact containing:

- checked `main` SHA;
- the exact eight governed rails;
- current/deferred posture;
- evidence PR/commit;
- query/check commands;
- generation provenance.

The tracked surface must be generated or verified, never hand-maintained.

## RS-06 — The governed capability vocabulary is duplicated in executable code

**Severity:** P2 governance architecture drift

The generator hard-codes this exact set in JavaScript:

```text
phase-2/ProjectDbtGraphFromFiles
phase-3/ImportDbtProject
phase-3/ValidateDbtProjectImport
phase-4/BuildDbtPlannerGraphSource
phase-4/ObservePlanRunReadiness
phase-4/PreviewExecutionPlan
phase-4/StartRun
phase-6/ExportDbtProject
```

The same capability meaning is also represented in Planning DB migrations,
proposal mechanization, query tests, and symbol manifests. The exact-set guard is
valuable, but the duplicated vocabulary creates another change fan-out when a
phase or rail is introduced, renamed, or retired.

### Required implementation

Move the expected capability set into one versioned declarative definition
owned by the dbt round-trip capability domain. The generator should consume that
definition through the query/read model rather than embed product vocabulary in
a renderer.

The code should still fail closed on:

- missing expected rails;
- unexpected rails;
- duplicates;
- posture mismatch;
- missing or non-ancestor evidence commits.

### Exit criterion

Adding the first Phase 5 visual-edit rail does not require editing the same
capability list independently in SQL, JavaScript, tests, and mechanization
metadata.

## RS-07 — The next dbt product transaction is still absent

**Severity:** P1 product-direction gap

The accepted plan states that Canvas may apply governed visual edits only when
they are demonstrably lossless. It also states that `DbtVisualEditPolicy` remains
deferred until a concrete lossless operation exists.

No current open PR delivers that operation.

DVT now has the foundations required to implement a narrow vertical:

- file-backed authority;
- server-side dbt analysis;
- import and project-root binding;
- workspace file revisions and compare-and-swap;
- file-derived planner graph source;
- Preview and StartRun bound to project evidence;
- explicit execution-selection integrity.

The missing product transaction is:

```text
current schema.yml revision
  -> propose one model-description change
  -> render semantic and textual diff
  -> user confirms
  -> conditional write
  -> conflict or immutable receipt
  -> dbt re-analysis
  -> same unique_id reconciliation
  -> Preview
  -> Run
  -> reopen project
  -> description remains authoritative
```

### Required first vertical

Restrict scope to changing one model `description` in one YAML file.

Do not begin with:

- generic node creation;
- arbitrary YAML mutation;
- arbitrary SQL rewriting;
- multi-file rename;
- graph-wide drag-to-transform semantics;
- a generic `VisualMutation` endpoint.

### Proposed contracts

```ts
type ProposeDbtModelDescriptionEditInput = {
  canvasId: string;
  projectRoot: string;
  resourceUniqueId: string;
  nextDescription: string;
  expectedProjectRevision: string;
  expectedFileRevision: string;
};

type DbtYamlEditProposal = {
  proposalId: string;
  resourceUniqueId: string;
  filePath: string;
  beforeFileRevision: string;
  proposedContentSha256: string;
  unifiedDiff: string;
  preservationAssertions: readonly string[];
};

type ApplyDbtYamlEditResult =
  | {
      kind: 'applied';
      receiptId: string;
      beforeFileRevision: string;
      afterFileRevision: string;
      inverseProposalId: string;
    }
  | {
      kind: 'conflict';
      currentFileRevision: string;
      baseContentRef: string;
      currentContentRef: string;
      proposedContentRef: string;
    };
```

### Required negative proof

- stale file revision never overwrites;
- comments are preserved;
- key ordering is preserved where the selected CST library supports it;
- unrelated YAML is byte-stable or normalized only by an explicit policy;
- anchors, aliases, custom keys, or unsupported constructs return `code_only`;
- duplicate model definitions fail closed;
- project revision changes between proposal and apply cause conflict;
- undo/revert is another conditional change, never an unconditional rollback;
- re-analysis preserves the dbt `unique_id`;
- Preview and Run use the post-edit project revision.

## RS-08 — Product-wide coverage is still not a release gate

**Severity:** P1 quality-system gap

The root coverage configuration includes only:

```text
packages/@dvt/engine/src/**/*.ts
```

Current thresholds are:

```text
statements 65
branches   55
functions  65
lines      65
```

The root `ci:full` command runs `test:coverage:engine`. API and Web have extensive
test suites, but there is no required coverage ratchet for their decision paths.

This is misaligned with current product risk. Most near-term risk now lives in:

- API authorization and project-scope admission;
- file revision and conflict handling;
- dbt analysis/projection boundaries;
- Web authority state and error recovery;
- selection and Preview/Run readiness;
- operator-visible failure states.

### Required implementation

Create a versioned product quality policy and scorecard:

1. publish API and Web baselines without blocking;
2. block any regression from the baseline;
3. require changed-code coverage;
4. require at least 90% branch coverage for authority, revision, idempotency,
   admission, compensation, and security-policy modules;
5. converge general API/Web targets toward 80% statements/lines, 75% functions,
   and 70% branches;
6. keep architecture, live browser, and integration tests as separate evidence,
   not substitutes for coverage.

## RS-09 — Accessibility, bundle, and graph-scale quality remain non-blocking

**Severity:** P1 release-readiness gap

The Web workspace has many unit, presentation, architecture, changed-slice, and
Cypress commands. It does not expose a required product gate for:

- automated accessibility;
- bundle/chunk budgets;
- initial Canvas-ready time;
- interaction latency;
- 1k/10k/50k-node behavior;
- memory growth and cleanup;
- Monaco/terminal/chart lazy loading.

The dependency surface includes Monaco, MUI/Emotion, Radix, React Flow, charts,
motion, drag-and-drop, multiple state utilities, and terminal packages. The
libraries may be justified, but the absence of budgets is not.

Open issues [#168](https://github.com/dunay2/dvt/issues/168) and
[#187](https://github.com/dunay2/dvt/issues/187) confirm that observability,
accessibility, performance, keyboard navigation, and screen-reader behavior are
still active product work.

### Required implementation

- add axe-based checks to critical browser journeys;
- enforce keyboard-only import, file navigation, selection, Preview, conflict,
  and Run paths;
- publish a deterministic bundle manifest;
- budget initial route and optional feature chunks;
- lazy-load Monaco, terminal, charts, and optional plugins;
- benchmark Canvas startup, selection, pan/zoom, and Code activation;
- retain artifacts and fail unapproved regressions.

## RS-10 — API and Contracts still use different Zod major versions

**Severity:** P2 boundary and dependency drift

Current declarations:

```text
apps/api                 zod ^3.0.0
packages/@dvt/contracts  zod ^4.3.6
```

The API consumes Contracts. Two validation major versions create avoidable risk
around issue shapes, transforms, composition, inferred types, and bundle/runtime
duplication at the main external boundary.

### Required implementation

1. inventory API-local Zod 3 schemas;
2. move shared boundary schemas into Contracts where ownership is shared;
3. migrate focused API schemas to Zod 4 with compatibility tests;
4. add a dependency policy that rejects multiple major versions of boundary
   libraries unless an expiring waiver exists.

Do not combine this migration with the first YAML edit vertical.

## RS-11 — Outbox scale and canary acceptance remain open

**Severity:** P1 production-operability gap

Open issue evidence remains explicit:

- [#409](https://github.com/dunay2/dvt/issues/409) — independent outbox worker
  runtime and scale-out hardening;
- [#413](https://github.com/dunay2/dvt/issues/413) — single-owner canary and
  rollback wiring;
- [#414](https://github.com/dunay2/dvt/issues/414) — multi-worker ordering
  strategy;
- [#447](https://github.com/dunay2/dvt/issues/447) — automated canary CI lane.

Issue #414 states that horizontal scale-out must remain blocked until concurrent
workers are proven unable to reorder events for the same `runId`.

DVT should therefore not claim horizontally scalable production delivery merely
because the standalone worker composition exists.

### Required order

1. complete deterministic canary acceptance in CI;
2. prove one active publisher and rollback;
3. choose exactly one ADR-0009 multi-worker strategy;
4. prove duplicate delivery and crash-window behavior;
5. prove per-run ordering under concurrent workers;
6. run load and infrastructure-failure recovery lanes;
7. publish observed recovery objectives.

## RS-12 — GitHub issue state still contains architectural history presented as work

**Severity:** P2 planning-authority drift

Issue [#73](https://github.com/dunay2/dvt/issues/73) remains open and requests
Conductor golden paths and cross-adapter federation. Current architecture states
that Temporal is the only active provider runtime and that a second runtime must
re-enter through a new ADR-backed contract and production composition path.

Issue [#1411](https://github.com/dunay2/dvt/issues/1411), “Adapter Postgres
Integration Nightly failed,” remains open since 2026-06-01 with no comments. It
points at one old run and commit, but does not say whether the failure still
reproduces, was superseded, or is covered by current CI.

### Required implementation

- Planning DB remains status authority;
- every open GitHub issue must link to an active Planning DB task or receive an
  explicit `historical`, `superseded`, or `needs-reproduction` posture;
- close or quarantine second-runtime work that contradicts the accepted runtime
  authority;
- triage old automated failure issues against the current default branch;
- do not let collaboration backlog masquerade as current architecture truth.

## RS-13 — Release `0.4.0` is an evidence release, not a product maturity release

**Severity:** P2 roadmap clarity risk

Release `0.4.0` contains the dbt capability-truth feature and its CI/docs fixes.
That work is valuable, but it does not add the first lossless visual edit,
scheduling, backfill, scale-out, accessibility closure, or production recovery
proof.

A version increment can create a false sense of product progress when most
release notes describe governance correction.

### Required response

Track release notes in two categories:

- **User capability:** observable product transactions added or changed;
- **Assurance capability:** governance, CI, evidence, architecture, or quality
  enforcement added or changed.

The next maturity milestone must require at least one complete user capability,
not only a stronger description of existing capability.

## RS-14 — No open PR means the repository needs a deliberate next product slice

**Severity:** P2 delivery-direction risk

There were no open pull requests at review time. The previous review branch was
closed, #1979 merged, and #1980 released. This is a clean scheduling boundary.

The risk is that the next work begins as another broad phase because there is no
active implementation branch forcing a concrete user outcome.

### Required decision

Start a narrowly scoped product branch only after its proposal defines:

- one user transaction;
- one authority owner;
- one command/query split;
- exact conflict and recovery behavior;
- exact preservation rules;
- live proof from import/open through Run and reopen;
- explicit exclusions.

## Architecture assessment

## What is now structurally credible

DVT currently has credible foundations in:

- explicit Canvas authoring authority;
- server-side dbt project analysis;
- deterministic file-backed graph projection;
- dbt project import and validation;
- revision-bound workspace file mutation;
- file-derived planner graph source;
- persisted Preview/PlanRef and StartRun integration;
- fail-closed explicit execution selection;
- Temporal-only active provider authority;
- Planning DB migration identity and concurrency protection;
- rich architecture and mechanization tests;
- reviewed capability evidence with Git ancestry.

These are not toy-system attributes.

## What remains product-incomplete

The user still lacks a complete visual authoring transaction that:

- changes authoritative dbt semantics;
- shows the exact file effect before writing;
- handles concurrent edits as a product state;
- supports safe revert;
- re-analyzes and reconciles identity;
- proves Preview and Run on the new revision;
- survives closing and reopening the project.

The operator still lacks proven:

- multi-worker event ordering;
- automated canary and rollback;
- production-like load and chaos recovery;
- product-wide coverage and accessibility gates;
- enforced bundle and graph-scale budgets;
- a current global product-status truth.

## Recommended implementation route

## Gate 0 — Preserve current release evidence

Suggested PR:

```text
ci(release): Bind published release evidence to the exact main tree
```

Deliver:

- post-merge/default-branch validation or deterministic tree-equivalence proof;
- release evidence record tied to `main` SHA and tag;
- semantic changelog duplicate guard retained after the 0.3.0 regression;
- no runtime behavior changes.

This should be small and must not delay the workspace safety fix if the release
pipeline already provides equivalent evidence outside the connector view.

## Workstream 1 — Make workspace inventory honest

Suggested PR decomposition:

```text
feat(contracts): Add paged workspace file inventory contract
fix(api): Expose workspace truncation and readable-size capability
feat(web): Render complete and limited workspace inventory states
 test(dbt): Prove large-project inventory consistency
```

Required acceptance:

- more than 500 files can be navigated through pagination/cursors;
- the API never silently truncates;
- file-size limitations are returned as capability diagnostics;
- import, analysis, Code, and Canvas share one inventory revision/policy;
- unsupported Python posture is explicit.

## Workstream 2 — Product quality baseline

Suggested PRs:

```text
ci(quality): Add product quality policy and scorecard
ci(test): Add API and Web coverage ratchets
ci(web): Add accessibility and bundle baselines
perf(canvas): Add graph-scale benchmark lane
```

The first scorecard may report without blocking. Regression must become blocking
before broader product work lands.

## Workstream 3 — First lossless dbt visual edit

Suggested PR decomposition:

```text
feat(contracts): Add DBT YAML description edit proposal contract
feat(api): Propose revision-bound DBT model description edit
feat(web): Review DBT YAML description diff from Canvas
feat(api): Apply conditional DBT YAML description edit
feat(web): Handle edit conflict and conditional revert
test(dbt): Prove description edit round trip live
```

Do not combine all six into one PR. Do not add a generic mutation command.

### Mandatory end-to-end proof

```text
open/import file-backed dbt project
  -> select model
  -> edit description from Canvas
  -> review exact diff
  -> apply against expected file and project revisions
  -> re-analyze
  -> preserve unique_id and unrelated content
  -> Preview
  -> Run
  -> close
  -> reopen
  -> description and revision remain authoritative
```

### Mandatory conflict proof

```text
proposal against revision A
  -> external/code edit produces revision B
  -> apply proposal A
  -> explicit conflict
  -> show base/current/proposed
  -> no overwrite
  -> deliberate retry or abort
```

## Workstream 4 — Dependency convergence

Suggested PR:

```text
refactor(api): Converge boundary validation on Zod 4
```

Deliver after the first edit contracts are stable, not during the vertical.

## Workstream 5 — Production operability

Suggested sequence:

```text
test(outbox): Automate single-owner canary acceptance
feat(outbox): Implement per-run multi-worker ordering
test(runtime): Add load and chaos acceptance lane
feat(observability): Correlate Canvas PlanRef run and worker telemetry
feat(web): Add resilient run reconnection and lag state
```

## Workstream 6 — Deployment, schedule, and backfill

Begin only after safe authoring and core operability gates are green.

Required future domain objects remain:

- `DeploymentRevision`;
- `ExecutionEnvironmentBinding`;
- `RunSchedule`;
- `RunTrigger`;
- `ConcurrencyPolicy`;
- `BackfillRequest`;
- `BackfillPreview`;
- `BackfillReceipt`.

Do not add `cron` directly to Canvas. Authored project state and deployed
execution policy must remain separate aggregates.

## Proposed release gates for the next product maturity milestone

DVT should not call the next milestone product-mature unless:

- the exact shipped `main` tree has current CI/release evidence;
- accepted dbt projects cannot exceed the operable workspace inventory silently;
- the global current-status route is generated or honestly reclassified;
- API and Web changed code are coverage-gated;
- the first dbt visual edit has diff, CAS conflict, conditional revert,
  re-analysis, Preview, Run, and reopen proof;
- critical browser journeys pass automated accessibility checks;
- bundle and graph-scale budgets are enforced;
- one production-like load/chaos lane passes;
- outbox canary and per-run multi-worker ordering are automated;
- open GitHub issues are reconciled against Planning DB authority;
- Zod boundary versions converge or carry an expiring waiver.

## Concrete handoff checklist

For the other GPT working in the repository:

1. start from `main@4c98026c0dd2e2b9e4bbcc126033b34f8afa2b5c` or a newer
   verified `main`;
2. query open PRs before creating implementation work;
3. do not reuse this review branch for runtime code;
4. open the workspace inventory safety proposal/PR first;
5. preserve existing dbt file authority and CAS contracts;
6. make listing truncation and file-size capability explicit;
7. use one source of inventory-limit truth;
8. keep visual mutation limited to one YAML description field;
9. return proposal and receipt objects, not screen-shaped command results;
10. treat conflicts as a first-class state, not a toast;
11. require exact preservation fixtures;
12. re-run dbt analysis after apply and revert;
13. bind Preview and Run to the resulting project revision;
14. add coverage without weakening existing architecture/live tests;
15. keep every PR small enough that governance evidence does not become a second
    implementation system.

## Final verdict

DVT has earned the right to move beyond proving that its dbt read and execution
rails exist. It has not yet earned the right to claim mature visual dbt
round-trip authoring or production-scale operability.

The correct next move is not more architectural breadth. It is a narrower,
complete transaction:

```text
honest project inventory
  -> one lossless YAML description edit
  -> visible diff
  -> safe conflict
  -> conditional revert
  -> re-analysis
  -> Preview
  -> Run
  -> reopen proof
```

That route converts the repository's strong contracts and governance machinery
into an observable user capability while keeping authority, revision, and
recovery semantics explicit.
