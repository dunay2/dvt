---
title: DVT Hard Fowler Product Maturity Review — 2026-07-17 01:27
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
reviewed_commit: 2c4110de8d74ffbb02880255cc9b760daaa84070
---

# DVT Hard Fowler Product Maturity Review — 2026-07-17 01:27

## Executive verdict

DVT is no longer a toy architecture. It has real contracts, real execution rails,
real dbt analysis, real Preview/Run integration, serious deterministic and
architecture checks, and unusually rich governance evidence.

That is the good news.

The bad news is more important:

> DVT currently has more governance machinery than product maturity.

The repository is optimized to prove that a change was described, related,
registered, migrated, and tested. It is not yet equally optimized to prove that a
user can operate the product safely at scale, understand version conflicts,
schedule and backfill work, recover from infrastructure failure, or use the Web
surface accessibly and predictably.

The difference is visible in the current functional pull request. PR
[#1971](https://github.com/dunay2/dvt/pull/1971) fixes a real execution-selection
integrity defect, but the fix spans 64 files, adds 4,205 lines, removes 260 lines,
and introduces thirteen Planning DB migrations. That is not normal change
amplification for a selection-state bug. It is evidence that governance has
become a second implementation system with its own large cost of change.

DVT should not add another broad product phase until it does four things:

1. finish PR #1971 with a genuinely green merge gate;
2. reduce governance change amplification;
3. restore one current, mechanically generated product-status truth;
4. deliver the next dbt editing slice with explicit revision, diff, conflict, and
   revert behavior.

The next product target should not be a generic visual dbt editor. It should be
one lossless YAML-description edit from Canvas to file and back, with compare-and-
swap, a visible diff, conflict handling, undo/revert, re-analysis, Preview, Run,
and reopen proof.

## Review method and limits

This review inspected:

- current `main` and recent merge commits;
- all open pull requests;
- PR metadata, changed files, current CI runs, job steps, and available logs;
- unresolved and resolved review threads on relevant PRs;
- current Web, API, contracts, CI, coverage, planning, and status sources;
- accepted dbt round-trip architecture;
- open product, performance, accessibility, scale, and operations issues;
- official documentation for mature comparison systems.

The review did not execute the repository locally. The environment did not have a
usable local GitHub CLI checkout path, so code and CI evidence were inspected
through the GitHub connector. Statements below distinguish repository evidence,
external benchmark evidence, and recommendations.

The GitHub branch-search connector did not enumerate branches reliably. Relevant
branch work was therefore derived from pull-request head refs and commit history.
No claim is made that every unassociated remote branch was inspected.

## Repository baseline

| Item | Observed state | Brutal assessment |
| --- | --- | --- |
| Default branch | `main` | Correct canonical base. |
| Reviewed HEAD | [`2c4110de8`](https://github.com/dunay2/dvt/commit/2c4110de8d74ffbb02880255cc9b760daaa84070) | Latest merge is a dependency update, not a product capability change. |
| Open PRs | One: [#1971](https://github.com/dunay2/dvt/pull/1971) | The product route is concentrated in one large Web fix. |
| #1971 mergeability | GitHub reports mergeable | Mergeable is not releasable. One required workflow is red. |
| #1971 review threads | Five current threads resolved | Better than the previous state; resolution must still match code and CI. |
| #1971 size | 64 files, +4,205 / -260, 7 commits | Excessive for one selection-intent correction. |
| Canonical status date | 2026-04-26 | Invalid as a reliable July current-state entry point. |
| Root coverage gate | Engine only, 65/55/65/65 | Prototype-level product coverage policy. |
| API/Web coverage gate | Not found | A green PR does not prove exercised product behavior. |
| Production scale proof | Open multi-worker, canary, load, and chaos work | Not production-mature. |

## What is genuinely strong

A hard review should not hide strengths.

### Contract and authority discipline

DVT has made a serious attempt to prevent duplicate semantic authority. The dbt
file-backed Canvas now keeps files authoritative, uses server-side dbt analysis,
projects stable dbt identities, and delegates Preview/Run through existing rails
rather than inventing dbt-specific execution synonyms.

### Honest capability blocking

The file-backed Canvas exposes analysis freshness, diagnostics, `code_only`
resources, and readiness instead of pretending every dbt construct is visually
editable. That is the correct product posture.

### Determinism and boundary checks

The repository has contract validation, architecture dependency checks,
determinism/replay lanes, feature-mechanization checks, and strict browser proofs
for selected verticals. These are stronger than the baseline of many early-stage
orchestration products.

### Recovery work around selection intent

PR #1971 introduces an explicit discriminated selection intent:

```ts
type CanvasExecutionSelectionIntent =
  | { mode: 'workspace'; nodeIds: [] }
  | { mode: 'explicit'; nodeIds: string[] };
```

It distinguishes workspace default from explicit-empty, rejects unavailable or
non-executable members as one complete intent, preserves hidden requested IDs,
and distinguishes requested roots from closure-derived dependencies.

That is the correct domain direction.

## Hard Fowler maturity scorecard

The following score is heuristic, not a scientific benchmark. It asks whether the
repository provides a product capability at the level expected from a mature data
orchestration and authoring system.

| Dimension | DVT | Mature benchmark | Verdict |
| --- | ---: | ---: | --- |
| Domain boundaries and explicit authority | 4/5 | 4/5 | Strong. |
| Determinism and execution contracts | 4/5 | 4/5 | Strong foundations. |
| Author -> Preview -> Run loop | 3/5 | 5/5 | Functional but still narrow and fragile around editing/version state. |
| Source control, diff, conflict, revert | 1/5 | 5/5 | Major product gap. |
| Scheduling, deployment, and backfill | 1/5 | 5/5 | Not yet a mature orchestrator experience. |
| Operational scale and canary proof | 2/5 | 5/5 | Architecture exists; production evidence does not. |
| User-facing observability and provenance | 2/5 | 5/5 | Backend evidence is ahead of operator UX. |
| Accessibility and browser performance | 1/5 | 4/5 | Backlog, not release policy. |
| Product-wide automated quality gates | 2/5 | 5/5 | Engine coverage cannot stand in for product quality. |
| Governance effectiveness | 2/5 | 4/5 | Rich evidence, stale truth, excessive change amplification. |
| Dependency and schema convergence | 3/5 | 4/5 | Manageable drift, but Zod major split is avoidable. |

Overall posture: **technically credible, not yet mature-product ready**.

## Comparison lenses from mature systems

These systems are not identical to DVT. The goal is not feature copying. The goal
is to identify product expectations that mature users already consider normal.

### dbt Studio IDE

Official dbt documentation describes Studio IDE as one browser interface for
building, testing, running, and version-controlling dbt projects:

- <https://docs.getdbt.com/>

DVT now covers analysis, graph projection, code access, Preview, and Run. It does
not yet match the version-control, branch, sync, conflict, and change-review
experience that makes an IDE safe for real project authoring.

**Lesson for DVT:** file authority is not enough. Users need visible working-copy
state, diffs, conflicts, revert, and version provenance.

**Do not copy:** DVT does not need to reproduce every Git operation before it can
ship a useful first edit.

### Dagster

Dagster presents integrated lineage, observability, a declarative model, and
first-class testability:

- <https://docs.dagster.io/>

DVT has strong execution contracts and lineage foundations, but its operator UX
does not yet make asset/run health, stale state, ownership, and operational
signals equally coherent.

**Lesson for DVT:** graph rendering must evolve into an operational data product,
not remain primarily an authoring visualization.

### Apache Airflow

Airflow backfill supports date or partition ranges, reprocessing policy, maximum
active runs, ordering, and dry-run behavior:

- <https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/backfill.html>

DVT has Preview and StartRun, but no equally explicit product contract for
scheduled historical execution.

**Lesson for DVT:** when backfill arrives, it must be a governed domain object with
previewable scope, collision policy, concurrency, and immutable admitted input.

### Prefect

Prefect deployments are server-side, versioned representations of flows with
schedules, event triggers, parameters, infrastructure binding, work pools,
queues, and concurrency policy:

- <https://docs.prefect.io/v3/concepts/deployments>
- <https://docs.prefect.io/v3/concepts/work-pools>

DVT currently exposes project execution but does not yet expose one mature
`Deployment`-like product object joining project revision, environment,
schedule, parameters, execution target, queue, and concurrency behavior.

**Lesson for DVT:** do not bolt scheduling directly onto Canvas. Introduce a
versioned deployment/admission aggregate after the authoring loop is safe.

### Apache NiFi

NiFi exposes queue backpressure, flow version states, local-change review,
revert/commit behavior, parameter contexts, sensitive references, provenance
search, replay, and lineage in the operator product:

- <https://nifi.apache.org/nifi-docs/user-guide.html>

DVT has stronger typed software architecture than many visual-flow tools, but the
operator surface is materially behind NiFi in visible runtime pressure, version
state, local changes, and replay-oriented provenance UX.

**Lesson for DVT:** a mature graph is an operating surface. Queue health, stale
state, local modifications, and provenance must be visible without reading logs
or planning documents.

### Temporal

Temporal promises durable execution that resumes after crashes, network failures,
and infrastructure outages:

- <https://docs.temporal.io/>

DVT uses Temporal, but using a durable engine does not automatically make DVT a
durable product. DVT must prove its own admission, project snapshot, outbox,
projection, worker, and UI reconnection behavior around Temporal.

**Lesson for DVT:** dependency capability is not product evidence.

### VS Code and Git

VS Code presents explicit conflict state, current/incoming/base views, a three-way
merge result, and deliberate completion or abort:

- <https://code.visualstudio.com/docs/sourcecontrol/merge-conflicts>

**Lesson for DVT:** stale workspace-file writes must not become generic toast
errors. Conflict is a first-class state with compare, accept, edit, retry, and
abort behavior.

## Findings

## HF-01 — PR #1971 is not green and must not merge yet

**Severity:** P1 release blocker

The latest observed head is
`1c57115ba1296fdee3d14749d070d20b8decf14e`.

Five workflows pass:

- Dependency Review;
- Contracts & Determinism;
- Test Suite;
- CI - Code Quality;
- CodeQL.

`PR Quality Gate` fails. The job trace localizes the failure to:

```text
Check PR title follows Conventional Commits
```

The current title is:

```text
fix(web): Preserve DBT execution selection intent
```

That title appears to satisfy the repository validator because its subject starts
with an uppercase `P`. The failed workflow began before the latest recorded PR
update, so the red result may be stale after a title correction. That is a
plausible explanation, not proof.

**Required action**

- trigger or naturally obtain a fresh PR Quality Gate run;
- do not merge on inference;
- require `All Checks Required for Merge` to become green on the current head and
  current title;
- record the rerun URL in closeout evidence.

## HF-02 — Governance change amplification is now an architectural problem

**Severity:** P1 maintainability and delivery problem

PR #1971 is a Web behavior fix, but it changes 64 files and adds thirteen Planning
DB migrations, numbered 709 through 721. Migration 709 alone adds hundreds of
lines describing designs, scopes, components, responsibilities, rails, tests,
evidence, symbols, and feature metadata.

This is not free traceability. It is a second codebase coupled to every product
change.

The Fowler signal is **Shotgun Surgery**:

- a selection-state rule changes;
- stores, policies, controllers, presentation, tests, docs, and migrations change;
- every review follow-up adds another immutable migration;
- the reviewer must validate both product semantics and a large governance shadow.

The danger is not merely slower delivery. The governance representation can
become internally green while the actual current-state document remains months
stale.

**Required implementation**

Introduce a governance change-amplification policy:

```text
product behavior change
  -> one canonical declarative feature/evidence manifest
  -> generated Planning DB upsert/snapshot
  -> no new migration for review-comment-only metadata corrections
```

Proposed artifacts:

- `docs/architecture/quality/governance-change-amplification-policy.md`;
- `tools/governance/feature-evidence.schema.json`;
- `tools/governance/apply-feature-evidence.mjs`;
- `tools/governance/check-change-amplification.mjs`;
- `.github/workflows/governance-amplification.yml`.

Proposed rule:

- schema changes use migrations;
- durable domain facts may use one migration per product slice;
- review feedback that only corrects metadata updates the same declarative
  manifest;
- more than ten governance-only changed files requires an explicit architecture
  waiver;
- generated outputs are reviewed as generated artifacts, not hand-authored
  parallel truth.

**Exit criterion**

A future selection-policy fix should require product code, tests, one evidence
manifest, and generated output — not thirteen new migrations.

## HF-03 — The canonical “current status” is not current

**Severity:** P1 governance truth problem

`docs/architecture/system-delivery-status.md` says:

```text
This page is the current implementation snapshot for the repository.
```

Its `last_reviewed` date is 2026-04-26. The README displays still different April
review dates. Both predate the July dbt file-authority, import, Preview/Run, and
selection-integrity work.

This is not a cosmetic documentation issue. Agents are explicitly told to start
from this page. A stale routing source causes repeated false findings and wrong
prioritization.

**Required implementation**

Generate current capability status from mechanical evidence:

- reviewed `main` SHA;
- implemented contracts and routes;
- feature-mechanization status;
- Planning DB active/closed state;
- required live proof references;
- known open release gates.

Proposed artifacts:

- `tools/status/generate-product-capability-status.mjs`;
- `tools/status/product-capability-policy.json`;
- generated `docs/planning/status/product-capability-status.md`;
- `pnpm status:product:check`;
- a freshness rule that fails when a material product capability changes without
  updating the generated snapshot.

The handwritten system-delivery document should become interpretation, not the
only implementation inventory.

## HF-04 — Product-wide quality is not enforced

**Severity:** P1 quality-system problem

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

API and Web have extensive tests but no required coverage thresholds. There is no
product release command that combines coverage, accessibility, bundle size,
graph scale, load, chaos, or recovery evidence.

A PR can therefore be green while adding unmeasured decision paths in the exact
areas where DVT now carries most product risk: Web state, API admission,
concurrency, revision matching, and error recovery.

**Required implementation**

Create `pnpm quality:product` with a versioned policy and generated scorecard.

Phase the gate:

1. publish current API/Web baseline without blocking;
2. fail on any decrease;
3. enforce changed-code coverage;
4. require at least 90% branch coverage for authority, revision, idempotency,
   admission, compensation, and security policy modules;
5. converge general API/Web targets toward 80% statements/lines, 75% functions,
   and 70% branches;
6. keep live browser and architecture tests as separate evidence, not substitutes
   for coverage.

## HF-05 — Merged PR #1970 retains a real unresolved architecture thread

**Severity:** P2 architecture-governance problem

PR [#1970](https://github.com/dunay2/dvt/pull/1970) was merged with a non-outdated
P2 thread on
`canvasDbtAuthoringRun.architecture.test.ts`.

The test proves that the execution projection imports the graph-source builder,
but does not negatively prove that `canvasPlanAction.ts` cannot import the graph-
source builder directly. The test can therefore remain green while the ownership
boundary regresses.

**Required action**

Create one small test-only PR:

```text
test(web): Guard DBT graph-source ownership
```

Add the negative assertion, run the focused architecture suite, link the commit to
the old thread, and resolve it as superseded by the new PR.

Then add a merge check that blocks active, non-outdated P1/P2 review threads.

## HF-06 — #1971 is safer, but recovery UX is still implicit

**Severity:** P2 product clarity problem

PR #1971 correctly preserves stale requested IDs and fails closed. It also
contains a deliberate recovery behavior: when the requested set contains only
unavailable nodes and the user selects one visible executable node, the old stale
set is replaced.

The behavior is tested and the copy says the new selection will replace the old
one. It is not a hidden bug.

It is still weaker than mature version-state UX. A user action on one node is
silently doing two domain operations:

1. discard the unavailable requested selection;
2. create a new explicit selection.

**Required implementation**

Expose explicit recovery actions in the operational drawer:

- `Discard unavailable selection`;
- `Use workspace scope`;
- `Keep blocked and refresh analysis`.

The selection status should display:

- requested roots;
- unavailable roots;
- non-executable roots;
- derived dependencies;
- admitted scope;
- the last preview revision.

The action receipt should state exactly what was discarded or replaced.

## HF-07 — The next dbt visual-edit phase is under-specified as a product

**Severity:** P1 product-direction problem

The accepted dbt round-trip plan correctly limits visual mutation to provably
lossless edits and recommends CST-preserving YAML operations. That is sound.

What is still missing is the complete user transaction:

```text
current file revision
  -> proposed semantic edit
  -> rendered diff
  -> user confirmation
  -> conditional write
  -> conflict or receipt
  -> dbt re-analysis
  -> graph identity reconciliation
  -> Preview
  -> Run
  -> reopen
```

Without diff, conflict, and revert, “visual editing” is a write API hidden behind a
graph control.

**Required first vertical**

Only edit one model description in `schema.yml`.

Proposed domain input:

```ts
type ProposeDbtYamlDescriptionEditInput = {
  canvasId: string;
  projectRoot: string;
  resourceUniqueId: string;
  nextDescription: string;
  expectedProjectRevision: string;
  expectedFileRevision: string;
};
```

Do not persist immediately. Return a proposal:

```ts
type DbtYamlEditProposal = {
  proposalId: string;
  filePath: string;
  beforeRevision: string;
  proposedContentSha256: string;
  unifiedDiff: string;
  affectedResourceUniqueIds: string[];
  preservationAssertions: string[];
};
```

Apply through the existing workspace-file mutation boundary with mandatory
compare-and-swap. On conflict, return current/base/proposed content references and
do not auto-merge.

Required proof:

```text
import
  -> inspect model
  -> edit description
  -> review diff
  -> apply
  -> re-analyze
  -> same unique_id
  -> Preview
  -> Run
  -> reopen
  -> description preserved
```

Negative proof:

- comments remain;
- key ordering remains where the CST library supports it;
- unrelated YAML remains byte-stable or explicitly normalized by policy;
- anchors, aliases, custom keys, and unsupported constructs fail `code_only`;
- stale file revision yields conflict, never overwrite;
- undo applies a conditional inverse change, not an unconditional write.

## HF-08 — Operational scale is documented debt, not proven capability

**Severity:** P1 production-readiness problem

Open work still includes:

- #409 — independent outbox worker scale-out hardening;
- #414 — multi-worker ordering strategy;
- #413 — canary and rollback wiring;
- #447 — automated canary CI lane;
- #18 — load and chaos suite;
- #1411 — unresolved adapter-postgres nightly failure.

DVT should not claim production-scale maturity while per-run ordering under
multiple workers, canary ownership, rollback, sustained load, database restart,
and chaos recovery remain open.

**Required implementation order**

1. choose and implement one multi-worker ordering strategy;
2. prove duplicate delivery and crash-window behavior;
3. automate single-owner canary and rollback;
4. run the 500 events/sec and 4,000 runs/hour baseline;
5. inject PostgreSQL restart, lock contention, Temporal interruption, worker
   restart, and network delay;
6. publish recovery objectives and observed results.

## HF-09 — DVT lacks a mature deployment, schedule, and backfill aggregate

**Severity:** P2 strategic product gap

This is not the immediate next PR, but it is the next major orchestration gap after
safe authoring.

A mature system separates authored project state from deployed execution policy.
DVT needs one versioned object that binds:

- project/canvas authority and exact revision;
- environment;
- execution target;
- parameters;
- schedule or event trigger;
- queue/work-pool equivalent;
- concurrency limit and collision policy;
- retry/admission policy;
- deployment version and audit metadata.

Backfill must be a separate admitted command with:

- date or partition range;
- reprocessing policy;
- dry-run preview;
- maximum active runs;
- ordering;
- exact deployment revision;
- immutable receipt.

Do not implement `cron` as a property on Canvas. That would couple authoring and
operations and repeat the authority problems DVT has spent months removing.

## HF-10 — Operator observability is behind backend observability

**Severity:** P2 product maturity problem

DVT has observability contracts, an OTel binding, run events, snapshots, lineage,
and evidence. Production validation and frontend telemetry remain incomplete.
Open issues still track telemetry, resilient progress reconnection, performance,
and accessibility.

Compared with NiFi and Dagster, DVT does not yet expose a coherent operational
view of:

- queue/worker pressure;
- run admission rejection reasons;
- stale project/plan state;
- retries and exhaustion;
- event lag and projection lag;
- data provenance search and replay;
- active version versus locally modified state;
- correlation across Canvas, PlanRef, run, worker, and materialized result.

**Required route**

First build one correlated run-operability view. Do not create disconnected
metrics dashboards for each service.

## HF-11 — Planning authority is visibly inconsistent

**Severity:** P2 governance problem

The current architecture says Temporal is the only active provider runtime and a
second runtime requires a new ADR-backed contract and production path. Open GitHub
issues still include old Conductor adapter and draining stories.

This proves that GitHub Issues cannot currently be treated as current product
truth without Planning DB reconciliation.

**Required implementation**

- Planning DB remains status authority;
- GitHub remains collaboration surface;
- every open issue links to an active Planning DB task or receives `historical` or
  `superseded` state;
- automated reconciliation reports but does not silently create new planning
  authority;
- stale issues are closed or clearly quarantined.

## HF-12 — API and Contracts use different Zod major versions

**Severity:** P2 dependency and boundary problem

Current package declarations show:

- API: `zod ^3.0.0`;
- Contracts: `zod ^4.3.6`.

The API consumes Contracts. Two major validation runtimes create avoidable
incompatibility and bundle duplication around errors, composition, transforms,
and inferred types.

**Required implementation**

- inventory direct API-local Zod 3 schemas;
- move shared boundary schemas to Contracts;
- migrate focused API schemas to Zod 4 with compatibility tests;
- add a dependency policy preventing multiple major versions of boundary
  libraries without an expiring exception.

## HF-13 — Web dependency breadth has no enforced performance budget

**Severity:** P2 performance and maintainability problem

The Web app includes React Flow, Monaco, xterm, MUI/Emotion, Radix, Tailwind,
charts, motion, drag-and-drop, multiple state libraries, and other heavy UI
surfaces. The dependency set may be justified. The absence of a bundle and route
interaction budget is not.

**Required implementation**

- deterministic bundle manifest in CI;
- initial route and vendor chunk budgets;
- lazy-load proof for Monaco, terminal, charts, and optional plugins;
- startup, Canvas-ready, selection, pan/zoom, and Code activation budgets;
- 1k, 10k, and 50k-node benchmark artifacts;
- fail on unapproved regressions.

## Recommended route

## Gate 0 — Finish current safety work honestly

1. rerun PR #1971 on its current title and head;
2. require every workflow green;
3. verify the resolved review findings against the final diff;
4. merge only through normal repository policy;
5. do not treat this review PR as permission to merge #1971.

## Gate 1 — Close the merged architecture-thread debt

Create a tiny test-only PR for the unresolved #1970 boundary guard. Do not bundle
it with a new feature.

## Workstream 1 — Reduce governance amplification

Suggested PR:

```text
refactor(governance): Replace review-migration chains with declarative evidence
```

Deliver:

- one schema for product evidence;
- one generator/upserter;
- one change-amplification check;
- one migration only when schema or durable domain facts change;
- migration-chain consolidation policy for future work.

## Workstream 2 — Restore current-state truth

Suggested PR:

```text
ci(status): Generate product capability truth from main
```

Deliver:

- generated capability scorecard tied to `main` SHA;
- implemented/partial/blocked/not-started states;
- links to code, contracts, tests, live proof, and open blockers;
- README generated review metadata;
- freshness gate.

## Workstream 3 — Product quality baseline

Suggested PRs:

```text
ci(quality): Add product quality policy and scorecard
ci(test): Add API and Web coverage ratchet
ci(web): Add accessibility and bundle baselines
perf(canvas): Add graph-scale benchmark lane
```

The first scorecard may be non-blocking. Regression must become blocking before
new broad product work lands.

## Workstream 4 — First lossless dbt visual edit

Suggested PR decomposition:

1. `feat(contracts): Add DBT YAML edit proposal contract`
2. `feat(api): Propose revision-bound DBT description edit`
3. `feat(web): Review DBT YAML edit diff from Canvas`
4. `feat(api): Apply conditional DBT YAML edit`
5. `feat(web): Handle conflict and conditional revert`
6. `test(dbt): Prove description edit round trip live`

Do not combine all six into one PR. Do not introduce a generic visual mutation
endpoint.

## Workstream 5 — Production operability

Suggested PR decomposition:

1. `feat(outbox): Implement per-run multi-worker ordering`
2. `test(outbox): Automate single-owner canary and rollback`
3. `test(runtime): Add load and chaos acceptance lane`
4. `feat(observability): Correlate Canvas PlanRef run and worker telemetry`
5. `feat(web): Add resilient run reconnection and lag state`

## Workstream 6 — Deployment and backfill domain

Begin only after safe authoring and core operability gates are green.

Proposed domain objects:

- `DeploymentRevision`;
- `ExecutionEnvironmentBinding`;
- `RunSchedule`;
- `RunTrigger`;
- `ConcurrencyPolicy`;
- `BackfillRequest`;
- `BackfillPreview`;
- `BackfillReceipt`.

Required invariants:

- every scheduled/manual/backfill run binds to an immutable deployment revision;
- backfill dry-run and execution use the same admitted range and policy;
- collision behavior is explicit;
- concurrency is enforced server-side;
- Canvas does not own scheduling;
- credentials remain reference-based and server-owned.

## Proposed release gates for the next maturity milestone

DVT should not call the next milestone product-mature unless:

- PR #1971 and all follow-ups are green with no active P1/P2 review thread;
- current capability status is generated from current `main`;
- API and Web changed code are coverage-gated;
- the first dbt visual edit has diff, CAS conflict, revert, re-analysis, Preview,
  Run, and reopen proof;
- critical browser journeys pass automated accessibility checks;
- bundle and graph-scale budgets are enforced;
- one production-like load/chaos lane passes;
- outbox multi-worker ordering and canary rollback are automated;
- operator telemetry correlates Canvas, PlanRef, run, and worker state;
- open GitHub issues are reconciled against Planning DB authority;
- boundary validation dependencies converge or carry an expiring waiver.

## Immediate decision for the other GPT

Do not start a broad Phase 5 implementation.

Proceed in this order:

1. make #1971 genuinely green;
2. close the #1970 architecture guard;
3. reduce governance change amplification;
4. generate current-state truth;
5. establish the product quality scorecard;
6. implement one revision-bound YAML description edit with diff/conflict/revert;
7. then harden scale, observability, scheduling, and backfill.

The repository does not need more claims of architectural completeness. It needs
smaller changes, current truth, visible operational guarantees, and complete user
transactions.
