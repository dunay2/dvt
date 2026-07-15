---
title: DVT Product Quality Standard Gap Study — 2026-07-15 20:09
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
date: 2026-07-15
last_reviewed: 2026-07-15
planning_type: review
reviewed_repository: dunay2/dvt
reviewed_ref: main
reviewed_commit: 998882623da73fe8abeffa1248a3b31e9ff59ae6
---

# DVT Product Quality Standard Gap Study — 2026-07-15 20:09

## Executive verdict

DVT has a stronger engineering-control system than its current product-completion
level. The repository has serious contract discipline, architecture guards,
Planning DB evidence, deterministic execution checks, changed-slice CI, strict
live proofs for selected flows, and recent recovery work around dbt project
import. The latest functional PR is green across Test Suite, Code Quality,
Contracts and Determinism, CodeQL, Dependency Review, and PR Quality Gate.

That does **not** yet constitute a high-quality product release posture.

The primary problem is no longer the phase-three dbt import implementation. That
vertical landed in [PR #1959](https://github.com/dunay2/dvt/pull/1959). The primary
problem is that DVT still lacks one product-wide quality contract that converts
its many local engineering controls into an executable release decision.

The current file-authoritative dbt experience proves this gap clearly. A user can
import a project, project its graph, inspect it, and edit files through Code, but
the same authoritative Canvas explicitly sets `canPlan: false`, `canRun: false`,
`canPlanGraph: false`, and `canStartRun: false`. The UI states that Preview and Run
are outside the current phase. The product therefore has a governed authoring
surface without a closed author-to-preview-to-run loop.

The recommended route is:

1. establish one executable Product Quality Standard and scorecard;
2. close the revision-bound file-authoritative dbt Preview/Run loop;
3. expand coverage enforcement from engine-only to API, Web, and critical
   integration boundaries;
4. make accessibility, performance, load, resilience, telemetry, and operational
   scale-out first-class release gates;
5. remove governance drift between current code, canonical status documents,
   GitHub issues, Planning DB, and merged review state.

Do not prioritize another isolated feature before these foundations. The next
increment should make the existing product complete, measurable, and operable.

## Review method and limits

This review inspected current `main`, recent commits and merged work, open pull
requests, workflow definitions, review threads, root and workspace scripts,
coverage configuration, current product code, canonical status documents,
accepted dbt product plans, open issues, and relevant stale branches.

No local checkout or local test execution was possible in this review environment.
The report therefore distinguishes:

- **mechanical repository evidence**: code, workflows, tests, configuration, and
  GitHub state directly inspected;
- **reported evidence**: validation stated in merged PRs;
- **recommendation**: proposed implementation that has not yet been executed.

## Repository baseline

| Item | Observed state | Assessment |
| --- | --- | --- |
| Default branch | `main` | Canonical base. |
| Reviewed HEAD | [`998882623`](https://github.com/dunay2/dvt/commit/998882623da73fe8abeffa1248a3b31e9ff59ae6) | Includes merged phase-three dbt browser import flow. |
| Open pull requests | None at review time | No competing implementation PR currently carries the next product slice. |
| Latest functional merge | [PR #1959](https://github.com/dunay2/dvt/pull/1959) | Protected dbt project import, process recovery, browser idempotency, and live proof. |
| Latest PR checks | Six relevant workflows successful | Strong evidence for the changed slice, not proof of complete product readiness. |
| Previous report branch | `agent/dvt-review-20260715-1414` | One report commit ahead, sixteen commits behind `main`; obsolete. |
| Current branch | `agent/dvt-review-20260715-2009` | Documentation-only quality study and implementation proposal. |

## What is already strong

### Contract and architecture discipline

The repository has versioned contracts, dependency-cruiser architecture checks,
determinism and replay lanes, schema validation, governed command/query rails,
feature mechanization, and extensive Planning DB evidence. These controls are
well above the baseline of a typical prototype.

### Changed-slice CI and selected live proofs

PR workflows detect affected workspaces, run package tests, run Web changed
suites, exercise PostgreSQL capabilities where relevant, and preserve dedicated
determinism and engine coverage lanes. Recent dbt work also includes strict live
Cypress proofs against real API, PostgreSQL, workspace storage, dbt analysis, and
runtime composition.

### Recovery and authority hardening

The recent dbt import sequence addressed replay identity, file mutation CAS,
Canvas authority exclusivity, process recovery, migration of workspace metadata,
and parallel import serialization. The previous recovery defect documented in
older review PRs is not repeated as a current defect because PR #1959 superseded
that evidence.

### Explicit product boundaries

The file-backed Canvas does not fake execution readiness. It intentionally
advertises read-only graph semantics and blocks Preview/Run rather than silently
mixing graph-draft and file authority. This is architecturally honest, even
though it exposes a product gap.

## Proposed Product Quality Standard

A release candidate should be admitted only when every mandatory dimension is
`green`. A dimension may be temporarily `amber` only with an owner, expiry date,
user impact, rollback, and approved risk record. `Red` blocks release.

| Dimension | Green release criterion | Current posture |
| --- | --- | --- |
| Product completeness | Primary persona can complete the advertised value loop without unsupported authority transitions or dead-end controls. | **Red** — file-authoritative dbt Canvas cannot Preview or Run. |
| Functional correctness | Versioned contracts, positive and negative tests, replay/idempotency proof, and live proof for critical verticals. | **Green/Amber** — strong locally; some critical quality evidence remains slice-specific. |
| Reliability and recovery | Crash windows, retries, duplicate delivery, concurrency, migration, rollback, and restart recovery are automated. | **Amber** — dbt import improved; broader chaos and failover proof remains open. |
| Security and tenancy | AuthN/AuthZ, RLS, rate limits, secret boundaries, dependency review, CodeQL, and server-owned credential references. | **Amber** — strong admission controls; credential ownership remains incomplete. |
| Observability and operability | Production-like metrics, traces, logs, correlation, dashboards, alerts, readiness, runbooks, and smoke validation. | **Amber/Red** — backend foundations exist; production validation and frontend telemetry are incomplete. |
| Performance and scalability | Enforced latency, throughput, memory, graph-size, bundle-size, and concurrency budgets. | **Red** — no product-wide executable budget; load and 50k-node work remain open. |
| Accessibility and UX resilience | Automated WCAG checks, keyboard/screen-reader flows, focus/error recovery, reconnect, and empty/loading/error states. | **Red** — local semantic effort exists, but no executable accessibility gate was found. |
| Maintainability | Dependency boundaries, complexity/size budgets, dependency convergence, ownership, and no duplicate semantic authorities. | **Amber** — strong boundaries, but dependency/version and governance complexity require control. |
| Test evidence | Coverage thresholds for critical workspaces plus integration, E2E, mutation/contract, and flaky-test policy. | **Amber/Red** — engine threshold only; API and Web have no enforced coverage threshold. |
| Delivery governance | Current-state truth, PR review closure, issue reconciliation, release evidence, and rollback-ready change history. | **Amber/Red** — evidence is rich, but current-state docs and review-thread closure drift. |

## Priority findings

## PQ-01 — The primary dbt product loop is incomplete

**Severity:** P1 product gap

**Evidence**

`apps/web/src/app/views/canvas/DbtProjectFileCanvasView.tsx` explicitly configures:

- `canPlan: false`;
- `canRun: false`;
- `canPlanGraph: false`;
- `canStartRun: false`;
- `planStatusSummary: 'Preview and Run are outside the read-only file projection phase.'`.

The accepted dbt round-trip target is:

```text
dbt project files
  -> dbt analysis
  -> Canvas
  -> governed edits
  -> the same dbt files
  -> persisted Execution Preview
  -> PlanRef
  -> StartRun
```

The implementation currently stops before persisted preview.

**Product impact**

The user reaches a professional-looking Canvas but cannot complete the core
business outcome from that authority mode. This is more important than adding
new visual features because it determines whether DVT is an executable product
or a governed project viewer/editor.

**Required implementation**

Extend the existing runtime rails instead of introducing dbt-specific synonyms:

1. make `ObservePlanRunReadiness` authority-aware;
2. compile preview from one bounded `DbtProjectRevision` snapshot;
3. persist the authority binding, project revision, analysis hash, graph source
   digest, profile, and environment in the plan record;
4. reject Preview and StartRun when the live revision differs from the admitted
   revision;
5. enable Canvas Preview/Run only from authoritative readiness;
6. prove fresh, stale, invalid, unavailable, retry, and concurrent-edit cases in
   unit, integration, and strict live browser tests.

## PQ-02 — Coverage enforcement is engine-only and below a high-quality bar

**Severity:** P1 quality-system gap

**Evidence**

The root Vitest coverage configuration includes only
`packages/@dvt/engine/src/**/*.ts`. Its current global thresholds are:

- statements: `65`;
- branches: `55`;
- functions: `65`;
- lines: `65`.

The Test Suite workflow names the job `Engine Coverage Gate`. `apps/api` and
`apps/web` define test suites but no coverage command or threshold. The Web suite
catalog is sophisticated, but `createWebVitestConfig` does not define coverage.

**Impact**

A PR can be fully green while adding unmeasured decision paths to API or Web.
Test counts and architecture tests are valuable, but neither proves exercised
behavior. This is particularly risky in command orchestration, retries,
presentation state, permissions, and error recovery.

**Required implementation**

- add API, Web, contracts, planner, delivery, and critical worker coverage lanes;
- use a ratchet: the first baseline cannot decrease, then move critical domains
  to at least 80% statements/lines, 75% functions, and 70% branches;
- require 90%+ branch coverage for authority, idempotency, admission, security,
  compensation, and revision-readiness modules;
- publish merged LCOV and per-workspace reports;
- enforce changed-code coverage so new logic cannot hide behind legacy baseline;
- keep architecture and live tests as separate gates, not substitutes.

## PQ-03 — Non-functional requirements are backlog items, not release gates

**Severity:** P1 release-readiness gap

**Evidence**

Repository search found no first-class `axe-core`, Lighthouse, or k6 product gate.
Open issues still include:

- [#158 — 50k-node performance tests](https://github.com/dunay2/dvt/issues/158);
- [#18 — load and chaos suite](https://github.com/dunay2/dvt/issues/18);
- [#188 — large graph performance budget](https://github.com/dunay2/dvt/issues/188);
- [#187 — keyboard and screen-reader accessibility](https://github.com/dunay2/dvt/issues/187);
- [#186 — frontend telemetry](https://github.com/dunay2/dvt/issues/186);
- [#177 — resilient logs/progress reconnection UX](https://github.com/dunay2/dvt/issues/177).

**Impact**

Correctness can regress under real graph size, concurrency, dependency failure,
slow networks, browser constraints, keyboard navigation, or runtime restarts
without blocking a release.

**Required implementation**

Create four executable lanes:

1. `quality:a11y` — automated axe checks plus keyboard-only critical journeys;
2. `quality:web-performance` — bundle budgets and browser interaction budgets;
3. `quality:graph-scale` — deterministic 1k, 10k, and 50k graph benchmarks;
4. `quality:load-chaos` — k6 and controlled PostgreSQL/Temporal/network failure
   scenarios.

Store baselines as versioned artifacts, fail on regression, and provide an
explicit update workflow that requires a rationale rather than silently
rewriting budgets.

## PQ-04 — Current-state documentation is stale despite strong documentation governance

**Severity:** P1 governance-truth gap

**Evidence**

`docs/architecture/system-delivery-status.md` identifies itself as the current
implementation snapshot but was last reviewed on 2026-04-26. Its inventory and
status predate the large July dbt authoring/import sequence. The README refers to
this source with an even older displayed review date. Meanwhile accepted product
plans and implementation evidence are current through July.

**Impact**

The repository has many high-quality documents but no reliably current entry
point. Agents and maintainers can make a locally correct change from stale global
context, recreate already-closed gaps, or prioritize a secondary feature over a
missing product loop. The two previous automated reports demonstrated this
failure mode and were closed unmerged as superseded.

**Required implementation**

- generate the current-state capability table from Planning DB and mechanical
  workspace evidence;
- include `reviewed_commit` and fail when it is older than the accepted freshness
  policy after material product changes;
- make README display generated metadata rather than handwritten dates;
- add a `docs:current-state:check` gate to PRs that change product capabilities;
- publish one human-readable product capability map with `implemented`,
  `partial`, `blocked`, and `not started` states.

## PQ-05 — Merged review state is not mechanically closed

**Severity:** P2 delivery-process gap

**Evidence**

PR #1959 was merged with two review threads still marked unresolved, even though
follow-up comments state the findings were fixed. PR #1956 also retains an
unresolved historical P2 thread that was superseded by later recovery work.

**Impact**

Review state becomes ambiguous. Future reviewers cannot distinguish an active
release blocker from a fixed-but-unresolved thread or a superseded finding.
Automated reviews can repeatedly report stale defects.

**Required implementation**

- add a required `review-thread-closure` check before merge;
- require each resolved finding to link to a commit and regression test;
- allow explicit `superseded-by` resolution for post-merge follow-up PRs;
- prevent merge while active non-outdated P1/P2 threads remain unresolved;
- periodically reconcile closed PRs whose review state contradicts landed code.

## PQ-06 — Operational scale-out and canary proof remain incomplete

**Severity:** P1/P2 production-operability gap

**Evidence**

Open work includes:

- [#409 — independent outbox worker scale-out hardening](https://github.com/dunay2/dvt/issues/409);
- [#414 — multi-worker ordering strategy](https://github.com/dunay2/dvt/issues/414);
- [#413 — single-owner canary and rollback wiring](https://github.com/dunay2/dvt/issues/413);
- [#447 — CI lane for automated canary validation](https://github.com/dunay2/dvt/issues/447);
- [#1411 — open adapter-postgres nightly failure](https://github.com/dunay2/dvt/issues/1411).

The open nightly issue is not treated here as proof that current `main` is broken;
it is evidence that operational failure triage is not fully reconciled.

**Impact**

The runtime can be correct in one-process/local proof while remaining unsafe to
scale or difficult to roll back in production.

**Required implementation**

- select and implement exactly one ADR-0009 ordering strategy;
- make single-owner and multi-owner modes explicit and observable;
- automate canary ownership, duplicate-publisher detection, rollback, and
  recovery-time evidence;
- close or reclassify #1411 with a reproduced current-main result;
- require operational smoke evidence for release candidates.

## PQ-07 — Security controls are strong, but credential ownership is not complete

**Severity:** P2 security-maturity gap

**Evidence**

Recent work excludes and rejects workspace `profiles.yml` from dbt runtime
bundles. PR #1943 and PR #1944 explicitly retain the broader risk until
server-owned credential references replace credential materialization paths.
The product plan also requires binding runtime execution to a specific project
root and project revision.

**Impact**

Excluding a known secret file closes one exfiltration path, but a mature hosted
product needs a single server-side credential reference model, audit trail,
rotation boundary, and provider-specific policy.

**Required implementation**

- introduce a versioned `CredentialReference` contract owned by the server;
- ensure project files, browser payloads, plans, logs, and bundles contain only
  opaque references;
- resolve secrets only inside the execution adapter boundary;
- add secret-sentinel tests for logs, traces, artifacts, snapshots, and errors;
- add rotation and revocation negative tests.

## PQ-08 — Runtime schema-library drift should be eliminated

**Severity:** P2 maintainability gap

**Evidence**

The root and `@dvt/contracts` use Zod 4, while `apps/api/package.json` declares
Zod `^3.0.0`. The API also consumes `@dvt/contracts`.

**Impact**

Two major schema runtimes increase bundle duplication and create subtle
incompatibility around error shapes, schema composition, inferred types, and
helper behavior. Boundary validation must not depend on which Zod major produced
the schema.

**Required implementation**

- inventory direct API-local Zod 3 usage;
- move shared boundary schemas into `@dvt/contracts`;
- migrate API-local schemas to Zod 4 behind focused compatibility tests;
- add a dependency policy that prevents multiple major versions of boundary
  libraries unless a documented exception exists.

## PQ-09 — Web dependency and bundle quality have no enforced budget

**Severity:** P2 performance/maintainability gap

**Evidence**

The Web package carries React Flow, Monaco, terminal packages, MUI/Emotion,
Radix primitives, Tailwind, state/query libraries, charts, motion, drag-and-drop,
and other UI packages. Vite manually isolates Monaco and terminal chunks, but no
bundle-size threshold or route interaction budget is configured.

**Impact**

The dependency set may be justified, but without budgets the product cannot
detect accidental eager imports, duplicated component stacks, or growth that
harms startup and Canvas interaction.

**Required implementation**

- generate a deterministic bundle manifest in CI;
- set route and vendor chunk budgets;
- fail on unapproved budget increases;
- prove Monaco, terminal, charts, and optional plugin surfaces remain lazy;
- publish dependency duplication and unused-dependency reports;
- define one preferred component primitive stack for new work.

## PQ-10 — GitHub issues and Planning DB are dual, partially stale authorities

**Severity:** P2 planning/governance gap

**Evidence**

Open GitHub issues include old Phase 1.5 and frontend backlog stories alongside
new Planning DB-driven work. Some may remain valid; others may be historical or
superseded. The repository does not present one reconciled status in the reviewed
entry points.

**Impact**

Agents can implement stale issue text, reopen retired architecture, or count
already-delivered work as missing.

**Required implementation**

- make Planning DB the status authority and GitHub the collaboration surface;
- project `planned`, `active`, `blocked`, `closed`, and `superseded` states into
  GitHub labels/comments;
- require every open issue to link to an active Planning DB task or be marked
  historical;
- run a scheduled reconciliation check that reports drift but never creates a
  second planning source.

## Recommended implementation route

## Workstream 0 — Executable Product Quality Standard

**Goal:** turn this review into a machine-enforced release contract.

**Proposed artifacts**

- `docs/architecture/quality/product-quality-standard.md`;
- `tools/quality/product-quality-policy.json`;
- `tools/quality/check-product-quality.mjs`;
- `tools/quality/check-product-quality.test.mjs`;
- `.github/workflows/product-quality.yml`;
- generated `docs/planning/status/product-quality-scorecard.md`.

**Policy model**

Each dimension contains:

- owner;
- required commands;
- evidence artifact;
- threshold or invariant;
- expiry for waivers;
- rollback owner;
- release-blocking level.

**Definition of done**

- one command, `pnpm quality:product`, produces a deterministic scorecard;
- one required GitHub check reports all mandatory dimensions;
- waivers are versioned, time-bounded, and visible;
- no documentation-only assertion can mark a mechanical criterion green.

## Workstream 1 — Close the file-authoritative dbt Preview/Run loop

**Goal:** deliver the full accepted dbt round trip.

**Domain and rail design**

- extend existing `ObservePlanRunReadiness`, `PreviewExecutionPlan`, and
  `StartRun` rails;
- introduce no dbt-specific duplicate run command;
- make `DbtProjectRevision` and authority binding mandatory plan provenance;
- use one bounded project snapshot for analysis, compilation, and digesting;
- persist the admitted revision in `PlanRef`/plan record;
- reject stale preview or start with a precise user-recoverable reason.

**Web behavior**

- show readiness reasons before enabling Preview;
- show stale revision with `Refresh analysis` rather than generic failure;
- preserve Code edits and Canvas projection under the same file authority;
- enable Run only from a persisted, current PlanRef;
- reconnect to the resulting run without losing Canvas context.

**Required tests**

- contract schema and compatibility;
- API fresh/stale/unavailable/concurrent-edit tests;
- plan provenance and StartRun admission tests;
- Web readiness/presentation tests;
- strict live Cypress: import -> inspect -> edit -> preview -> run -> reopen;
- crash/retry tests around preview persistence and run admission.

## Workstream 2 — Coverage and critical-path evidence

**Goal:** measure API and Web behavior, not only engine behavior.

**Sequence**

1. publish baseline without blocking;
2. fail on any decrease;
3. enable changed-code coverage;
4. raise critical modules first;
5. converge global thresholds by workspace.

**Critical-module target**

Authority, idempotency, CAS, retry, compensation, RBAC, RLS, secret redaction,
readiness, and plan/run admission should target at least 90% branches. General
API/Web modules should converge to at least 80% statements/lines, 75% functions,
and 70% branches.

## Workstream 3 — Accessibility, performance, load, and resilience

**Accessibility**

- add axe integration to component and live browser flows;
- prove keyboard-only Canvas navigation, menus, dialogs, Code split, and run
  monitoring;
- prove focus restoration and screen-reader announcements on errors/reconnects.

**Web performance**

- add deterministic build-size budgets;
- capture startup, route-ready, Canvas interaction, and code-editor activation;
- prevent optional heavy surfaces from entering the initial route chunk.

**Graph scale**

- benchmark 1k, 10k, and 50k nodes;
- record render, layout, selection, search, pan/zoom, and memory metrics;
- introduce virtualization/level-of-detail only after measured bottlenecks.

**Load and chaos**

- implement the documented 500 events/sec and 4k runs/hour baseline from #18;
- exercise PostgreSQL restart, lock contention, Temporal interruption, worker
  restart, duplicate delivery, and network delay;
- define recovery objectives before declaring production-ready.

## Workstream 4 — Operability and security completion

- implement automated outbox canary and multi-worker ordering proof;
- add frontend telemetry with correlation to API request, PlanRef, and runId;
- validate OTel binding in a production-like environment;
- implement server-owned credential references and secret rotation tests;
- add release dashboards for error rate, admission rejection, stale readiness,
  worker lag, retry exhaustion, and reconciliation activity.

## Workstream 5 — Governance truth and merge hygiene

- generate current-state and quality scorecards from mechanical evidence;
- add reviewed commit freshness checks;
- require review-thread closure before merge;
- reconcile GitHub issues with Planning DB;
- close superseded report branches and avoid merging historical findings into
  canonical planning.

## Proposed delivery order

| Order | Slice | Why now | Exit criterion |
| --- | --- | --- | --- |
| 1 | Product Quality Standard skeleton and scorecard | Establishes one shared release vocabulary before more features. | Deterministic non-blocking scorecard on `main`. |
| 2 | File-backed readiness and revision-bound Preview | Closes the largest current product dead end. | Current revision yields persisted PlanRef; stale revision fails precisely. |
| 3 | File-backed StartRun and strict live vertical | Completes the advertised user value loop. | Import -> edit -> preview -> run -> reopen passes live. |
| 4 | API/Web coverage ratchet | Prevents new product logic from reducing confidence. | Changed-code and critical-module gates required. |
| 5 | A11y, bundle, graph-scale, and load baselines | Converts NFR backlog into measurable release evidence. | Baselines published; regressions block PRs. |
| 6 | Outbox scale-out, canary, telemetry, credential references | Raises production maturity after the user loop is complete. | Automated canary/rollback, correlated telemetry, no materialized user secrets. |
| 7 | Governance reconciliation | Keeps the stronger system sustainable. | Current-state docs, issues, PR threads, and Planning DB agree. |

## Suggested PR decomposition

1. `docs/quality-standard-and-scorecard-contract`
2. `feat/dbt-file-authority-readiness`
3. `feat/dbt-file-authority-preview`
4. `feat/dbt-file-authority-start-run`
5. `test/dbt-file-authority-live-roundtrip`
6. `ci/api-web-coverage-ratchet`
7. `test/web-accessibility-and-bundle-budgets`
8. `perf/graph-scale-and-load-baselines`
9. `feat/outbox-canary-and-multi-worker-proof`
10. `feat/server-owned-credential-references`
11. `ci/current-state-and-review-thread-reconciliation`

Each PR should carry its own red/green tests, rollback posture, Planning DB
relations, risk update, and evidence. Do not combine all quality work into one
large governance PR.

## Release blocking policy proposed for the next milestone

The next milestone must not be called product-complete unless:

- the file-authoritative dbt path can Preview and Run from the admitted revision;
- API and Web changed code are coverage-gated;
- critical user journeys pass automated accessibility checks;
- a graph and bundle performance baseline is enforced;
- one production-like load/recovery lane passes;
- current-state status is generated from current code/Planning DB evidence;
- no active non-outdated P1/P2 review thread remains unresolved;
- every security-sensitive runtime uses server-owned credential references or an
  explicit time-bounded waiver.

## Final recommendation

DVT should now optimize for **vertical completeness and measurable quality**, not
for the number of implemented components or documents.

The architecture is sufficiently strong to support a serious product. The next
risk is that the governance system becomes more complete than the user journey,
and that green CI is interpreted as product readiness while coverage,
accessibility, performance, operational validation, and the final dbt execution
loop remain incomplete.

The next implementation decision should therefore be:

> Establish the executable Product Quality Standard, then implement the
> revision-bound file-authoritative dbt Preview/Run vertical before accepting any
> new major product surface.
