---
title: DVT Current-State Product Quality Review and Implementation Route — 2026-07-16 01:10 UTC
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
date: 2026-07-16
last_reviewed: 2026-07-16
planning_type: review
reviewed_repository: dunay2/dvt
reviewed_ref: main
reviewed_commit: 998882623da73fe8abeffa1248a3b31e9ff59ae6
supersedes_review_pr: 1960
---

# DVT Current-State Product Quality Review and Implementation Route

## Executive verdict

DVT has strong engineering mechanics but is not yet a complete, release-grade product.
The repository is unusually disciplined around contracts, deterministic execution,
architecture boundaries, Planning DB evidence, governed command/query rails, and
selected end-to-end proofs. The missing quality is not another generic governance
layer. The missing quality is the conversion of those controls into a complete,
measurable, production-operable user journey.

The current product-defining gap is still the file-authoritative dbt Canvas:

```text
import project -> analyze -> inspect graph -> edit files -> Preview -> PlanRef -> Run -> reopen
```

`main` currently stops after file-backed analysis, Canvas projection, Code editing,
and Source Import. Preview and Run remain explicitly disabled. The product therefore
has a professional authoring surface that terminates before the main business outcome.

The recommended next route is not a new major feature. It is:

1. close the revision-bound dbt Preview/Run vertical;
2. introduce an executable product-quality scorecard;
3. cover API/Web critical paths with enforced coverage and changed-code gates;
4. turn accessibility, browser performance, graph scale, load, chaos, telemetry,
   canary, and secret ownership into release evidence;
5. remove current-state, dependency, review-thread, and planning-authority drift.

## Delta since the previous review

There has been no functional commit on `main` after merge commit
[`998882623`](https://github.com/dunay2/dvt/commit/998882623da73fe8abeffa1248a3b31e9ff59ae6),
which merged [PR #1959](https://github.com/dunay2/dvt/pull/1959).

The only open pull request at review time is documentation-only
[PR #1960](https://github.com/dunay2/dvt/pull/1960). It is one commit ahead of
`main`, mergeable, draft, and changes one Markdown file. It contains the earlier
quality study but does not implement any product change.

This report therefore does not invent product progress. It refreshes the repository
state, verifies the prior findings against source, adds concrete code-level quality
findings, and gives the implementation agent a bounded delivery route.

## Repository baseline

| Item | Current state | Assessment |
| --- | --- | --- |
| Default branch | `main` | Canonical base. |
| Reviewed HEAD | `998882623da73fe8abeffa1248a3b31e9ff59ae6` | Latest functional merge is PR #1959. |
| Open PRs | PR #1960 only | Documentation-only; no implementation branch is active. |
| Current review branch | `agent/dvt-review-20260716-0110` | Created directly from current `main`. |
| Latest functional branch | `feat/dbt-project-import-phase3-web` | Merged through PR #1959; branch ref is no longer available through compare. |
| Product version | root package `0.2.0` | Pre-1.0 posture is consistent with incomplete product closure. |
| Main merge-commit status API | no combined statuses returned | Do not interpret this as green or red; PR-triggered workflows are attached to the PR head. |
| PR #1959 head checks | six successful workflows | Strong changed-slice evidence. |
| PR #1960 checks | PR Quality Gate and Code Quality successful; four workflows skipped | Correct for a documentation-only change, but not product evidence. |

## Inspection scope

This review inspected:

- current `main` and recent commit history;
- recent merged, closed, and open pull requests;
- the open review branch and previous review branch delta;
- GitHub Actions workflow results associated with the latest functional PR head;
- unresolved inline review threads on PRs #1959 and #1956;
- file-authoritative dbt Canvas and controller source;
- root and workspace test/coverage configuration;
- API and Contracts dependency declarations;
- warehouse connection creation and credential-reference UI/API flow;
- current-state architecture documentation;
- open performance, accessibility, telemetry, load/chaos, outbox canary, and
  multi-worker issues.

No local checkout or local command execution was available in this review environment.
All implementation recommendations below are proposals. Repository evidence and
reported CI evidence are distinguished explicitly.

## What is already strong

### Contract and authority discipline

DVT models versioned contracts, authority bindings, idempotency, CAS, deterministic
planning/execution, and DB-first governance. Recent dbt work correctly avoids merging
file authority with graph-draft authority and fails closed rather than pretending that
a file-backed graph is executable.

### Recovery hardening in the latest dbt import vertical

PR #1959 introduced explicit import-process ownership, per-Canvas serialization,
completed-operation protection, metadata migration, browser idempotency, and a strict
live proof. The latest functional PR head completed:

- Contracts & Determinism;
- CodeQL;
- Test Suite;
- Dependency Review;
- CI - Code Quality;
- PR Quality Gate.

All six concluded successfully.

### Strong test and governance inventory

The root scripts expose substantial documentation, architecture, feature
mechanization, Planning DB, determinism, replay, API, Web, adapter, and live-browser
verification. The problem is not absence of tests; it is uneven release enforcement
and incomplete product-wide evidence.

## Product-quality scorecard

| Dimension | Current posture | Reason |
| --- | --- | --- |
| Product completeness | **Red** | File-authoritative dbt journey cannot Preview or Run. |
| Functional correctness | **Amber/Green** | Strong changed-slice evidence; product-wide critical paths are not uniformly measured. |
| Reliability and recovery | **Amber** | dbt import recovery improved; broader chaos/failover and outbox scale proof remain open. |
| Security and secret ownership | **Amber** | Auth/security gates exist, but users still type infrastructure credential references directly. |
| Observability and operability | **Amber/Red** | Backend foundations exist; frontend telemetry, production binding, canary, and scale-out proof remain incomplete. |
| Performance and scalability | **Red** | No enforced product-wide bundle, interaction, graph-scale, throughput, or memory budgets. |
| Accessibility | **Red** | No executable release gate; concrete form-announcement and visual-token drift exist. |
| Maintainability | **Amber** | Strong architecture controls, but dependency-major and UI-system drift remain. |
| Test evidence | **Amber/Red** | Engine-only coverage threshold; API/Web have no equivalent enforced baseline. |
| Delivery governance | **Amber** | Rich Planning DB and docs, but current-state docs and mechanical review closure drift. |

# Priority findings

## DVT-Q-01 — File-authoritative dbt is a product dead end

**Severity:** P1 product-completeness gap

### Evidence

`apps/web/src/app/views/canvas/DbtProjectFileCanvasView.tsx` configures:

```ts
canPlan: false
canRun: false
canPlanGraph: false
canStartRun: false
planStatusSummary: 'Preview and Run are outside the read-only file projection phase.'
```

The controller also constructs readiness with:

```ts
observePlanRunReadiness({
  canRun: false,
  currentPlan: null,
  isCurrentPlanStale: false,
  persistedPreviewIdentityMismatch: false,
  hasPersistedPlanForRun: false,
})
```

### Impact

The primary dbt user can import, inspect, add sources, and edit code, but cannot
complete the accepted value loop from the same authority. The Canvas looks like the
main product but behaves as a governed viewer/editor.

### Required implementation

Extend existing rails rather than introducing dbt-specific duplicates:

- make `ObservePlanRunReadiness` authority-aware and server-backed;
- create Preview from one bounded `DbtProjectRevision` snapshot;
- persist project revision, analysis hash, authority binding, environment, profile,
  graph-source digest, and compiled-plan digest with the PlanRef;
- reject Preview when the live project revision changes during compilation;
- reject StartRun when the PlanRef revision differs from the current file authority;
- expose precise readiness reasons to Web;
- reconnect to the resulting run while preserving Canvas and Code context.

### Acceptance evidence

A strict live vertical must prove:

```text
import -> inspect -> edit -> preview -> run -> reopen
```

Required negative cases:

- stale project revision;
- invalid dbt analysis;
- analyzer unavailable;
- concurrent file edit during preview;
- retry after preview receipt persistence;
- retry after lost response;
- StartRun against stale PlanRef;
- process restart between admission and execution.

## DVT-Q-02 — Readiness is presentation-local instead of authoritative

**Severity:** P1 architectural/product regression risk

### Evidence

`useDbtProjectFileCanvasController.ts` creates a static readiness model with
`canRun: false` and no server query. This is safe while the feature is disabled, but
it is not a valid foundation for enabling execution.

### Impact

A future implementation can accidentally enable buttons by changing local flags
without proving:

- current project revision;
- authority ownership;
- analysis freshness;
- preview provenance;
- environment/profile availability;
- PlanRef currency;
- tenant permissions.

That would recreate a split authority between Web presentation and runtime admission.

### Required implementation

Introduce a protected query result such as:

```ts
type ObserveCanvasExecutionReadinessResult = {
  canvasId: string;
  authority: CanvasAuthoringAuthority;
  projectRevision: DbtProjectRevision | null;
  preview: {
    allowed: boolean;
    reasons: ReadinessReason[];
  };
  run: {
    allowed: boolean;
    planRef: string | null;
    reasons: ReadinessReason[];
  };
};
```

The exact name should follow the existing command/query vocabulary in Planning DB.
The invariant matters more than the proposed type name: the server is authoritative,
and the Web projects the result.

## DVT-Q-03 — Credential references are user-entered infrastructure syntax

**Severity:** P1/P2 security and product-UX gap

### Evidence

`WarehouseConnectionCreateForm.tsx` asks the user to type `credentialRef` directly
and uses the placeholder:

```text
env:DVT_LOCAL_POSTGRES_WAREHOUSE_URL
```

`CreateWarehouseConnectionUseCase` forwards the supplied reference to the probe and
catalog unchanged after a successful probe.

### Impact

This exposes deployment/infrastructure naming in the product UI and makes users
responsible for constructing a secret locator. Risks include:

- invalid or environment-specific references;
- accidental entry of raw secrets instead of references;
- inconsistent secret backends;
- weak rotation and ownership semantics;
- non-portable saved connections;
- support burden because the UI exposes server configuration details.

### Required implementation

- introduce a server-owned credential resource with opaque ID;
- expose a credential selector or provider-managed connection flow;
- reject raw secret material and unapproved reference schemes at the boundary;
- persist only opaque credential IDs in warehouse connection records;
- add rotation, revocation, tenant ownership, and audit tests;
- keep local `env:` references as an explicit development adapter, not the universal
  product contract.

## DVT-Q-04 — Coverage enforcement is engine-only

**Severity:** P1 quality-system gap

### Evidence

The root `vitest.config.ts` includes only:

```ts
include: ['packages/@dvt/engine/src/**/*.ts']
```

with thresholds:

```text
statements 65
branches   55
functions  65
lines      65
```

The root `ci:full` command adds `test:coverage:engine`, but the API and Web package
scripts expose tests without mandatory coverage thresholds.

### Impact

A PR can add unmeasured API orchestration, Web state, retry, authorization,
readiness, and error-recovery branches while remaining green. Test count,
architecture tests, and live tests are valuable but do not replace exercised-branch
measurement.

### Required implementation

Use a ratchet rather than an immediate arbitrary global target:

1. publish current API/Web/package baselines without blocking;
2. fail any decrease;
3. require changed-code coverage;
4. raise authority, idempotency, CAS, retry, compensation, RBAC, RLS, readiness,
   secret, and Plan/Run admission modules first;
5. converge general API/Web targets.

Recommended targets:

| Scope | Statements/lines | Functions | Branches |
| --- | ---: | ---: | ---: |
| General API/Web | 80% | 75% | 70% |
| Critical authority/security/recovery modules | 90% | 90% | 90% |

## DVT-Q-05 — Non-functional quality remains backlog, not release policy

**Severity:** P1 release-readiness gap

### Evidence

Relevant open work includes:

- [#158 — 50k-node performance tests](https://github.com/dunay2/dvt/issues/158);
- [#18 — load and chaos suite](https://github.com/dunay2/dvt/issues/18);
- [#187 — keyboard and screen-reader accessibility](https://github.com/dunay2/dvt/issues/187);
- [#186 — frontend telemetry](https://github.com/dunay2/dvt/issues/186).

Issue #18 already describes concrete recovery and performance objectives such as
zero dropped events, zero state corruption, DB-failure recovery, network partition,
worker crash, and full rebuild validation. Those objectives are not yet a required
product-quality lane.

### Impact

Correct code can still fail at realistic graph size, dependency failure, worker
restart, slow network, keyboard-only use, or browser resource pressure without
blocking release.

### Required implementation

Create dedicated commands and workflows:

```text
pnpm quality:a11y
pnpm quality:web-performance
pnpm quality:graph-scale
pnpm quality:load-chaos
```

Each command must emit a versioned machine-readable artifact and compare against a
reviewed baseline. Updating a baseline must require a reason and owner.

## DVT-Q-06 — Concrete Web accessibility and design-system drift exists

**Severity:** P2 product-quality gap

### Evidence

`WarehouseConnectionCreateForm.tsx`:

- renders creation errors in a plain `div` without `role="alert"` or an `aria-live`
  region;
- uses hard-coded `slate-*`, `red-*`, and `blue-*` classes while newer Canvas
  surfaces use semantic CSS tokens such as `--surface-panel`, `--text-muted`, and
  `--status-warning`;
- wires both `onInput` and `onChange` to the same field-update callback on inputs and
  selects.

### Impact

- asynchronous connection failures may not be announced reliably to assistive
  technology;
- hard-coded colors can diverge from theme, contrast, and product-token rules;
- duplicate input callbacks can cause redundant state transitions and tests that
  accidentally depend on double dispatch.

### Required implementation

- use the shared form, field, error-summary, and semantic-token primitives;
- announce request errors with an alert/status pattern and focus management;
- choose one React input event contract;
- add keyboard-only and screen-reader-oriented component tests;
- run axe against the Source Import flow and critical Canvas dialogs.

## DVT-Q-07 — Current-state documentation is materially stale

**Severity:** P1 governance-truth gap

### Evidence

`docs/architecture/system-delivery-status.md` says it is the current implementation
snapshot but has:

```yaml
last_reviewed: 2026-04-26
```

It predates the July dbt file-authority, Code working-tree, graph projection, Source
Import, and import-process work.

### Impact

Agents can make locally valid decisions from globally obsolete context. The large
volume of accurate component documents does not compensate for a stale entry point.
This also causes repeated reports to rediscover already completed or superseded work.

### Required implementation

- generate current capability state from Planning DB plus mechanical source evidence;
- include `reviewed_commit` and freshness policy;
- fail `docs:current-state:check` when a material capability merge leaves the entry
  point behind;
- expose one capability map with `implemented`, `partial`, `blocked`, `proposed`, and
  `retired` states;
- project the same generated metadata into README and status pages.

## DVT-Q-08 — Review threads remain mechanically unresolved after fixes

**Severity:** P2 delivery-governance gap

### Evidence

PR #1959 is merged but still has two non-outdated unresolved threads:

1. P1 parallel imports sharing one authority;
2. P2 warehouse catalog migration.

Both threads contain replies that cite fix commits and regression tests. The code may
be fixed, but the review state remains open.

PR #1956 also retains one non-outdated unresolved P2 thread concerning rollback of an
incomplete idempotent import. Later PR #1959 introduced process ownership intended to
supersede that risk, but the historical thread was not mechanically reconciled.

### Impact

Automation and future reviewers cannot distinguish:

- active defect;
- fixed but unresolved finding;
- superseded finding;
- historical discussion.

This produces false positives and weakens the meaning of unresolved review state.

### Required implementation

- require non-outdated P1/P2 threads to be resolved before merge;
- require a resolution reply to link a commit and regression test;
- support explicit `superseded-by #PR` closure;
- add a reconciliation report for merged PRs with unresolved threads;
- do not auto-resolve without evidence.

## DVT-Q-09 — Outbox production scale and canary proof are incomplete

**Severity:** P1 production-operability gap

### Evidence

Open work includes:

- [#409 — independent outbox runtime and scale-out hardening](https://github.com/dunay2/dvt/issues/409);
- [#413 — single-owner canary and rollback](https://github.com/dunay2/dvt/issues/413);
- [#414 — multi-worker ordering strategy](https://github.com/dunay2/dvt/issues/414);
- [#447 — CI lane for automated canary validation](https://github.com/dunay2/dvt/issues/447).

Issue #414 explicitly says horizontal scale-out must remain blocked until ordering is
proved for multiple workers.

### Impact

The runtime can be correct in single-owner/local proof mode but unsafe or operationally
ambiguous under production scale-out. Without automated canary and rollback evidence,
deployment readiness is procedural rather than executable.

### Required implementation

- choose exactly one ADR-0009 strategy;
- prove per-run ordering with concurrent workers;
- enforce a single active publisher during canary;
- automate canary acceptance and rollback validation;
- publish worker lag, retry exhaustion, duplicate delivery, DLQ, and reconciliation
  telemetry;
- block deployment scaling until the lane is green.

## DVT-Q-10 — Boundary validation depends on two Zod major versions

**Severity:** P2 maintainability and correctness drift

### Evidence

- `apps/api/package.json` declares `zod: ^3.0.0`;
- `packages/@dvt/contracts/package.json` declares `zod: ^4.3.6`;
- API depends directly on `@dvt/contracts`.

### Impact

Two schema runtimes at one boundary can create duplicated bundles and subtle
differences in error representation, schema composition, helper behavior, and inferred
types. It also makes migration and debugging harder.

### Required implementation

- inventory direct API-local Zod usage;
- move shared boundary schemas into Contracts;
- migrate API-local schemas to Zod 4 with focused compatibility tests;
- add a dependency-major policy for boundary libraries;
- allow exceptions only with owner, reason, and expiry.

## DVT-Q-11 — Product quality has no single executable release contract

**Severity:** P1 governance-to-product gap

### Evidence

The repository has many strong commands, but no single command answers:

```text
Is this revision product-release ready, and why?
```

`ci:full` combines docs, code, and engine coverage, but it does not aggregate product
completeness, API/Web coverage, accessibility, browser performance, graph scale,
load/chaos, canary, secret ownership, current-state freshness, and unresolved review
state.

### Impact

A green PR is easy to misinterpret as a green product. Local evidence remains strong
while important product dimensions remain outside the release decision.

### Required implementation

Create:

```text
docs/architecture/quality/product-quality-standard.md
tools/quality/product-quality-policy.json
tools/quality/check-product-quality.mjs
tools/quality/check-product-quality.test.mjs
.github/workflows/product-quality.yml
docs/planning/status/product-quality-scorecard.md
```

and expose:

```text
pnpm quality:product
```

The command must produce a deterministic scorecard and fail on mandatory red
criteria. Waivers require owner, impact, expiry, rollback, and evidence.

## DVT-Q-12 — Planning and status authorities are not fully reconciled

**Severity:** P2 architectural-governance drift

### Evidence

The repository contains:

- Planning DB as a detailed implementation authority;
- GitHub issues as execution/backlog surfaces;
- current-state and roadmap documents;
- archived/superseded reviews;
- open documentation-only PR #1960;
- this newer review branch.

The sources are individually useful but do not expose one mechanically reconciled
answer for current capability and active next work.

### Impact

Agents can implement stale issue text, merge redundant reviews, or treat a proposal as
current code. Documentation volume becomes a source of ambiguity instead of leverage.

### Required implementation

- Planning DB owns lifecycle state;
- GitHub owns collaboration and delivery discussion;
- generated status projects Planning DB state into docs and issue labels/comments;
- every open issue links to an active Planning DB task or is marked historical;
- superseded review PRs are closed rather than merged into canonical planning;
- scheduled reconciliation reports drift without creating a second source of truth.

# Bugs and regression risks requiring tests

## R-01 — Local readiness can be enabled without runtime proof

Any implementation that changes `canRun` or `canStartRun` in Web before an
authoritative query exists is a release-blocking regression.

**Guard:** architecture test must reject locally manufactured executable readiness for
file authority.

## R-02 — Stale PlanRef after file edit

Code edits are synchronized to the working tree. A persisted preview can become stale
immediately after a later edit.

**Guard:** StartRun must compare admitted project revision with current revision and
return a recoverable stale-plan error.

## R-03 — Concurrent edit during preview compilation

A preview built from multiple unbounded reads can combine files from different
revisions.

**Guard:** snapshot once; analyze and compile from that snapshot; verify revision before
persistence.

## R-04 — Raw secret entered where reference is expected

The current free-text field can receive a password or connection string.

**Guard:** reject values matching raw-secret/URI shapes unless handled by a dedicated
secure creation endpoint; never echo the submitted value in logs/errors.

## R-05 — Duplicate field event dispatch

The create-connection form attaches both `onInput` and `onChange` to the same updates.

**Guard:** focused test proves one semantic state transition per user edit.

## R-06 — Fixed review findings remain classified as active

Unresolved thread state can cause future agents to re-report corrected bugs.

**Guard:** reconciliation distinguishes fixed, superseded, outdated, and active
findings.

# Recommended implementation route

## Workstream 0 — Establish the product-quality skeleton

**Goal:** create one release vocabulary before more major surface area is added.

### Deliverables

- quality standard document;
- JSON policy;
- deterministic checker and tests;
- non-blocking scorecard on `main`;
- required check only after baselines are reviewed.

### Initial dimensions

- completeness;
- correctness;
- reliability/recovery;
- security/secret ownership;
- observability/operability;
- performance/scale;
- accessibility;
- maintainability/dependency health;
- test evidence;
- delivery/governance truth.

### Definition of done

- `pnpm quality:product` runs locally and in CI;
- every criterion links to a command or mechanical invariant;
- documentation-only claims cannot mark mechanical evidence green;
- waiver format is versioned and time-bounded.

## Workstream 1 — Server-authoritative file-backed readiness

**Goal:** make readiness truthful before enabling Preview.

### Changes

- define/extend the query contract;
- compose authority, revision, analysis freshness, environment, permissions, and
  current PlanRef state;
- return structured reasons;
- replace static Web readiness construction;
- retain disabled actions until the server says allowed.

### Required tests

- fresh/valid;
- stale analysis;
- no environment/profile;
- insufficient permission;
- authority mismatch;
- stale PlanRef;
- analyzer unavailable;
- tenant isolation.

## Workstream 2 — Revision-bound Preview

**Goal:** create a persisted preview from one exact project revision.

### Changes

- acquire bounded project snapshot;
- analyze and compile from the snapshot;
- persist provenance and digest;
- reject revision drift before commit;
- expose refresh/retry reasons to Web.

### Definition of done

- current revision returns a PlanRef;
- any file mutation invalidates readiness;
- no mixed-revision plan can be persisted;
- preview retry is idempotent.

## Workstream 3 — Revision-bound StartRun and live round trip

**Goal:** complete the user value loop.

### Changes

- StartRun admits only current persisted PlanRef;
- preserve Canvas/Code context;
- link run detail to project revision and PlanRef;
- reopen project and run without semantic drift.

### Definition of done

The strict live test passes against real API, PostgreSQL, Temporal, workspace files,
dbt analyzer, and browser:

```text
import -> inspect -> edit -> preview -> run -> reopen
```

## Workstream 4 — API/Web coverage ratchet

**Goal:** prevent critical product logic from growing unmeasured.

### Sequence

1. baseline report;
2. no-decrease gate;
3. changed-code gate;
4. critical-module 90% branch target;
5. general convergence targets.

Keep architecture, integration, browser, determinism, and coverage as separate
complementary evidence.

## Workstream 5 — Accessibility and UI-system closure

**Goal:** make the existing workflow usable and consistent.

### First slice

- refactor warehouse connection form to semantic tokens and shared fields;
- accessible async error announcement and focus;
- remove duplicate input event wiring;
- axe and keyboard tests for Source Import;
- then extend to Canvas menus, dialogs, Code split, Preview, and run monitoring.

## Workstream 6 — Performance, graph scale, load, and chaos

**Goal:** convert open NFR stories into executable release evidence.

### Web budgets

- initial route JavaScript;
- lazy Monaco/terminal/chart chunks;
- route-ready time;
- Canvas interaction latency;
- editor activation;
- memory ceiling.

### Graph benchmarks

- 1k, 10k, and 50k nodes;
- load, layout, select, search, pan/zoom, overlay, and memory metrics.

### Runtime/load proof

- event throughput and run throughput;
- PostgreSQL interruption;
- network delay/partition;
- Temporal interruption;
- worker restart;
- duplicate delivery;
- rebuild and hash equality.

## Workstream 7 — Operability, outbox canary, and secret ownership

**Goal:** make deployment and credentials production-owned.

### Deliverables

- chosen multi-worker ordering strategy;
- automated single-owner canary and rollback;
- correlated frontend/API/PlanRef/run telemetry;
- server-owned credential resources;
- rotation/revocation audit proof;
- release dashboards and alerts.

## Workstream 8 — Governance reconciliation

**Goal:** keep repository truth usable by humans and agents.

### Deliverables

- generated current-state capability map;
- reviewed-commit freshness gate;
- issue/Planning DB reconciliation;
- review-thread closure gate;
- superseded review cleanup policy.

# Proposed delivery order

| Order | Slice | Exit criterion |
| ---: | --- | --- |
| 1 | Product-quality policy and non-blocking scorecard | Deterministic scorecard committed and generated in CI. |
| 2 | File-backed execution-readiness query | Web no longer manufactures readiness; structured server reasons render. |
| 3 | Revision-bound Preview | Current project revision yields persisted PlanRef; stale revision is rejected. |
| 4 | Revision-bound StartRun | Current PlanRef starts run; stale PlanRef cannot. |
| 5 | Strict live dbt round trip | Import/edit/preview/run/reopen passes with real dependencies. |
| 6 | API/Web coverage ratchet | Baseline cannot decrease; changed critical logic is gated. |
| 7 | Source Import a11y/design-token correction | Axe, keyboard, alert, focus, and single-dispatch tests pass. |
| 8 | Bundle and graph-scale baselines | Baselines published and regression thresholds enforced. |
| 9 | Load/chaos and outbox canary | Automated recovery, ordering, canary, and rollback evidence pass. |
| 10 | Server-owned credentials and telemetry | No user-managed infrastructure reference is required in the production flow. |
| 11 | Governance reconciliation | Current-state docs, Planning DB, issues, and review state agree. |

# Suggested PR decomposition

1. `docs/product-quality-policy-contract`
2. `feat/dbt-file-authority-execution-readiness`
3. `feat/dbt-file-authority-preview`
4. `feat/dbt-file-authority-start-run`
5. `test/dbt-file-authority-live-roundtrip`
6. `ci/api-web-coverage-ratchet`
7. `fix/source-import-accessibility-and-form-events`
8. `ci/web-bundle-and-interaction-budgets`
9. `perf/graph-scale-baselines`
10. `test/runtime-load-and-chaos-baseline`
11. `feat/outbox-canary-and-multi-worker-proof`
12. `feat/server-owned-warehouse-credentials`
13. `feat/frontend-runtime-correlation-telemetry`
14. `ci/current-state-and-review-thread-reconciliation`

Each PR must include:

- bounded scope and explicit non-goals;
- red/green tests;
- authority and failure-mode analysis;
- migration/rollback posture;
- Planning DB relations and evidence;
- security and observability impact;
- no disabled rules, fake success, stubs, or hidden compatibility paths.

# Release-blocking policy for the next product milestone

The next milestone must not be called product-complete unless:

- the file-authoritative dbt path can Preview and Run from the admitted revision;
- StartRun rejects stale PlanRefs;
- the complete live dbt round trip passes;
- API and Web changed critical code are coverage-gated;
- Source Import and primary Canvas actions pass automated accessibility checks;
- bundle and graph-performance baselines are enforced;
- one production-like load/recovery lane passes;
- outbox canary and multi-worker ordering are mechanically proven before scale-out;
- production credential selection is server-owned and opaque;
- current-state status is generated from current code/Planning DB evidence;
- no active non-outdated P1/P2 review thread remains unresolved;
- every mandatory quality dimension is green or has an approved, expiring waiver.

# Handoff to the implementation agent

Start with Workstream 1, not with another report and not with a new UI surface.
Before editing, read:

- `docs/adr/ADR-0060-dbt-project-authoring-authority.md`;
- the existing plan/readiness contracts and Canvas readiness components;
- PreviewExecutionPlan and StartRun command/query rails;
- dbt project revision and graph projection contracts;
- PR #1959 import-process recovery changes and tests.

Do not:

- add a dbt-specific duplicate execution command;
- enable Preview or Run from client flags;
- read project files multiple times without a bounded snapshot;
- materialize credentials in browser state, logs, or connection records;
- merge the previous review PR and this review PR as two canonical plans.

Recommended decision for PR #1960: treat it as superseded by this more current report
once this PR is reviewed. Do not merge both reports into active planning.

# Final recommendation

DVT should optimize next for **vertical completeness and measurable release quality**.
The architecture is strong enough. The present risk is that governance and component
count continue to grow while the principal user journey, non-functional evidence, and
production ownership remain incomplete.

The next implementation decision is therefore:

> Build server-authoritative file-backed readiness, then revision-bound Preview and
> StartRun, and prove the full dbt round trip before accepting another major product
> surface. In parallel, establish the product-quality scorecard so green CI can no
> longer be confused with product readiness.
