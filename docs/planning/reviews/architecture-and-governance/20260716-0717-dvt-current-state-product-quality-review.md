---
title: DVT Current-State Product Quality Review — 2026-07-16 07:17 UTC
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
reviewed_commit: 773b4b146a5839d4501811ce13d61772fb1aa95c
supersedes:
  - docs/planning/reviews/architecture-and-governance/20260715-2009-dvt-product-quality-standard-gap-study.md
  - docs/planning/reviews/architecture-and-governance/20260716-0110-dvt-current-state-product-quality-review.md
---

# DVT Current-State Product Quality Review — 2026-07-16 07:17 UTC

## Executive verdict

DVT has moved materially since the previous reviews. The revision-bound,
file-authoritative dbt Preview/Run loop is now implemented and merged. A user can
import a dbt project, project its authoritative files into Canvas, edit the working
tree, preview the selected revision, start the persisted plan through the protected
runtime, and reopen run evidence with project and execution-target provenance.

The previous recommendation to implement file-backed Preview and Run is therefore
obsolete and must not be repeated as a current product gap.

The current highest-priority defect is narrower and more dangerous:

> An explicit selection containing only non-executable dbt resources is normalized
> to the entire executable project, so Preview/Run can target substantially more
> work than the user selected.

This is a product-safety and intent-preservation bug. It should be fixed before the
next feature phase.

After that fix, the recommended product route is:

1. reconcile canonical documentation and planning truth with the completed Phase 4;
2. establish an executable product-quality scorecard and API/Web coverage ratchet;
3. implement Phase 5 as conservative, lossless, revision-guarded visual edits;
4. implement authoritative project export;
5. implement explicit graph-draft-to-file-authority adoption;
6. convert accessibility, browser/graph performance, load/chaos, telemetry, and
   operational scale-out from backlog into release evidence.

DVT now has a credible vertical product core. Its next risk is no longer lack of a
run loop; it is accidental over-execution, stale product truth, and insufficiently
executable non-functional quality standards.

## Review method and limits

This review inspected:

- current `main` and its recent commit sequence;
- recent merged and closed pull requests;
- open pull-request state;
- PR-triggered workflow evidence;
- unresolved and resolved review threads on the latest dbt implementation chain;
- current file-authoritative dbt execution selection and readiness code;
- accepted dbt round-trip architecture and Planning DB reconciliation;
- current CI and coverage workflows;
- canonical current-state documentation;
- open product, reliability, accessibility, performance, and operability issues;
- recently merged implementation branches and closed automated review branches.

No local checkout or local test execution was available in this review environment.
The report distinguishes direct repository evidence from proposed implementation.

The GitHub connector used here exposes PR-triggered workflow runs for a commit. It
does not expose the current `push` run set for the merge commit through the same
operation. The latest PR head is mechanically green; the report does not falsely
claim that the merge-SHA push run was inspected.

## Repository baseline

| Item | Observed state | Assessment |
| --- | --- | --- |
| Default branch | `main` | Canonical base. |
| Reviewed HEAD | [`773b4b146`](https://github.com/dunay2/dvt/commit/773b4b146a5839d4501811ce13d61772fb1aa95c) | Includes Phase 4 plus live-proof profile/target fixes. |
| Open pull requests | None at review time | No competing implementation PR currently owns the next slice. |
| Latest product merge | [PR #1962](https://github.com/dunay2/dvt/pull/1962) | Completes revision-bound file-backed Preview and Run. |
| Latest follow-up merge | [PR #1964](https://github.com/dunay2/dvt/pull/1964) | Makes the live harness authoritative over generated profile and execution-target configuration. |
| Latest PR-head CI | Six workflows successful | Contracts, tests, dependencies, code quality, CodeQL, and PR gate are green. |
| Previous automated reviews | [#1960](https://github.com/dunay2/dvt/pull/1960) and [#1961](https://github.com/dunay2/dvt/pull/1961) closed unmerged | Both are stale because Phase 4 has since landed. |
| Current review branch | `agent/dvt-review-20260716-0717` | Documentation-only review created from reviewed `main`. |

## Recent delivery sequence

### PR #1962 — file-backed dbt Preview and Run

[PR #1962](https://github.com/dunay2/dvt/pull/1962) merged the full Phase 4
vertical across contracts, API, Web, runtime binding, tests, evidence, risks, and
Planning DB.

The implementation now:

- derives planner input from authoritative dbt analysis rather than regenerating
  imported files;
- binds Preview to project revision, analysis hash, selected unique IDs, dbt
  version, and server-owned execution-target identity;
- validates project and selection provenance server-side;
- persists a `PlanRef` and rejects stale execution identity;
- binds Temporal execution to the immutable project bundle;
- exposes provenance after reload;
- includes a strict live browser proof for Preview and Run.

### PR #1963 — feature-state reconciliation

[PR #1963](https://github.com/dunay2/dvt/pull/1963) corrected Planning DB feature
state after Phase 4. Migration `703_dbt_project_roundtrip_phase4_feature_state.sql`
marks the completed scope implemented and explicitly preserves Phases 5–7 as
separately gated work:

- conservative visual edits;
- project export;
- graph-draft adoption.

### PR #1964 — live-proof authority hardening

[PR #1964](https://github.com/dunay2/dvt/pull/1964) fixed two environment-leakage
risks in the canonical live proof. The harness now owns the generated profile
directory and the complete execution target tuple instead of inheriting unrelated
developer values.

This is an important confidence improvement: the proof is less likely to pass or
fail because of ambient workstation configuration.

## CI posture

The head commit of PR #1964, `2c98981c815ac593f39aea965f32d78a7b896219`,
has successful completed runs for:

- Contracts & Determinism;
- Test Suite;
- Dependency Review;
- CI - Code Quality;
- CodeQL;
- PR Quality Gate.

The repository also declares `push` workflows on `main`:

- `.github/workflows/ci.yml` runs `pnpm ci:full` for main/manual execution;
- `.github/workflows/test.yml` runs the package, Web, adapter, determinism, and
  engine-coverage lanes for non-PR events.

The connector operation used for this review filters workflow retrieval to
PR-triggered runs, so the merge-commit push runs are not represented in the
retrieved workflow list. This is an evidence-access limitation of this review,
not evidence that the workflows did not run.

## Review-thread state

| PR | Current mechanical state | Product interpretation |
| --- | --- | --- |
| [#1964](https://github.com/dunay2/dvt/pull/1964) | One P2 thread, resolved | Execution target inheritance fixed in `2c98981c`. |
| [#1962](https://github.com/dunay2/dvt/pull/1962) | Two threads, both resolved | Live-profile defect fixed by #1964; legacy pre-release provenance fallback intentionally rejected. |
| [#1959](https://github.com/dunay2/dvt/pull/1959) | Two non-outdated threads still unresolved | Replies cite concrete fixes and regression tests; review state is mechanically stale. |
| [#1956](https://github.com/dunay2/dvt/pull/1956) | One non-outdated P2 remains unresolved | Later process-recovery work appears to supersede it, but the thread does not record that closure. |

The unresolved #1959 findings are not repeated here as live defects because their
threads contain specific fix commits and regression evidence. They remain a merge
hygiene and automated-review signal-quality problem.

## Relevant branch work

There are no open PR branches at review time.

Recently relevant branch outcomes are:

- `feat/dbt-project-roundtrip-phase4-run` — merged through #1962;
- `fix/dbt-roundtrip-phase4-feature-state` — merged through #1963;
- `fix/phase4-review-followups` — merged through #1964;
- `agent/dvt-review-20260715-2009` — closed and stale;
- `agent/dvt-review-20260716-0110` — closed and stale.

The two previous automated report branches must not be treated as active product
truth. Their primary claim that file-backed Preview/Run was missing is superseded
by current `main`.

# Product quality assessment

| Dimension | Current posture | Reason |
| --- | --- | --- |
| Core dbt vertical completeness | Green/Amber | Import → project → edit → Preview → Run → reopen is implemented; visual mutation/export/adoption remain separate phases. |
| Intent preservation | Red | Explicit non-executable-only selection can expand to all executable nodes. |
| Functional correctness | Green/Amber | Strong contracts, negative tests, provenance, CAS, idempotency, and live proof; selection semantics need a regression fix. |
| Reliability and recovery | Amber | Import recovery and execution binding are strong; broad load/chaos and failover proof remain open. |
| Security and tenancy | Amber | Secret-free bundles and server-owned target identity are strong; connection onboarding still exposes credential-reference syntax. |
| Observability and operability | Amber/Red | Backend foundations exist; frontend telemetry, automated canary, and production-like validation remain incomplete. |
| Performance and scalability | Red | No enforced product-wide bundle, interaction, graph-size, or load budget. |
| Accessibility | Red | No executable keyboard/screen-reader release gate; current connection form has an unannounced async error. |
| Maintainability | Amber | Strong boundary governance; stale canonical documents and Zod major-version drift remain. |
| Test evidence | Amber/Red | Rich suites and live proofs; coverage enforcement is engine-only. |
| Delivery governance | Amber/Red | Planning DB is current for Phase 4, while accepted Markdown/current-state docs and review threads drift. |

# Priority findings

## PQ-01 — Explicit non-executable selection expands to the whole executable project

**Severity:** P1 product-safety / correctness defect

**Direct evidence**

`apps/web/src/app/views/canvas/canvasDbtPlannerGraphSource.ts` implements:

```ts
const selectedExecutableNodeIds = args.selectedNodeIds.filter(/* executable */);

if (selectedExecutableNodeIds.length === 0) {
  return [...args.workspaceNodeIds];
}
```

`apps/web/src/app/views/canvas/dbtProjectFileExecutionStrategy.ts` repeats the
same semantic fallback:

```ts
const selectedExecutableIds = selectedNodeIds.filter((nodeId) => nodeById.has(nodeId));
const scopedIds = new Set(
  selectedExecutableIds.length > 0 ? selectedExecutableIds : [...nodeById.keys()]
);
```

The file-backed Canvas exposes the execution-selection toggle on every projected
node whenever Preview/Run is generally available. The toggle is not restricted to
models, tests, or snapshots.

**Failure scenario**

1. A project contains sources, models, tests, metrics, or exposures.
2. The user explicitly selects one source, metric, exposure, or other
   non-executable resource.
3. Filtering yields zero executable selected IDs.
4. The scope resolver interprets zero as no selection.
5. Preview is built for every executable node in the workspace.
6. The resulting persisted plan can be run after showing a materially broader
   scope than the user's explicit selection implied.

**Impact**

This violates least surprise and intent preservation. In a data platform, silently
expanding an explicit selection can execute many models/tests, increase warehouse
cost, mutate more targets, and extend runtime significantly.

This is not only a display problem. The expanded graph source is the input sent to
Preview, so the persisted plan itself carries the broader scope.

**Required implementation**

Introduce an explicit selection-intent distinction:

```ts
type CanvasExecutionSelectionIntent =
  | { kind: 'none' }
  | { kind: 'explicit'; nodeIds: readonly string[] };
```

Rules:

- `none` may mean all executable workspace nodes if that remains the accepted
  product behavior;
- `explicit` with at least one executable node means selected executable nodes plus
  accepted executable upstream dependencies;
- `explicit` with zero executable nodes must fail closed with a precise reason;
- non-executable selections must never collapse into `none`;
- the API/Preview boundary must reject an empty explicit execution selection rather
  than normalizing it to all.

**Required tests**

- no selected nodes → all executable nodes, if explicitly accepted;
- selected model → model plus executable dependencies;
- selected source only → blocked, no Preview request;
- selected metric/exposure only → blocked, no Preview request;
- selected source plus model → model plus executable dependencies only;
- stale selection referencing removed nodes → blocked or explicitly normalized,
  never all;
- server negative test for empty explicit selection;
- strict browser proof that a source-only selection cannot create or start a plan.

**Suggested first PR**

`fix/dbt-explicit-selection-fail-closed`

Primary surfaces:

- `apps/web/src/app/views/canvas/canvasDbtPlannerGraphSource.ts`;
- `apps/web/src/app/views/canvas/dbtProjectFileExecutionStrategy.ts`;
- `apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts`;
- associated unit/presentation tests;
- Preview request validation if the current contract can represent ambiguous empty
  explicit selection.

## PQ-02 — The accepted dbt product plan is stale after Phase 4

**Severity:** P1 architecture/governance truth defect

**Evidence**

The accepted plan
`docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md`
was last reviewed before the current merge sequence and contains current-state
sections that still describe major capabilities as absent. Its rail table says
`ValidateDbtProjectImport`, `ImportDbtProject`, and `ProjectDbtGraphFromFiles` are
not implemented, while current `main` implements those rails and the Phase 4
Preview/Run path.

Planning DB migration `703_dbt_project_roundtrip_phase4_feature_state.sql` is more
current and explicitly records Phase 4 as implemented.

**Impact**

The accepted Markdown plan and Planning DB disagree. An implementation agent that
reads the accepted plan can:

- recreate already-delivered rails;
- repeat obsolete architectural analysis;
- prioritize Preview/Run again;
- misclassify current authority and file-save behavior;
- miss that Phases 5–7 are now the actual product frontier.

**Required implementation**

Do not rewrite history as though the old analysis was never true. Split the plan
into:

1. historical rationale and rejected alternatives;
2. a generated or mechanically checked current-state capability table;
3. explicit Phase 5, 6, and 7 implementation sections;
4. links to Phase 2–4 evidence and closeout migrations.

Add a freshness check using `reviewed_commit` or generated capability state. A
material feature closeout must fail documentation governance when the accepted
plan still claims that capability is absent.

## PQ-03 — The repository-wide “Current Status” document is four product phases behind

**Severity:** P1 product-direction / onboarding defect

`docs/architecture/system-delivery-status.md` declares itself the current
implementation snapshot but has `last_reviewed: 2026-04-26`. Its inventory and
product narrative predate the July dbt authority, import, projection, Code sync,
Preview, and Run sequence.

A repository with extensive governance needs one reliable current entry point.
Stale global truth is more dangerous than missing documentation because it gives a
false sense of authority.

**Required implementation**

- generate the capability summary from Planning DB and mechanical workspace data;
- stamp the reviewed commit;
- define a maximum freshness window after material capability changes;
- fail `docs:current-state:check` when the status source is stale;
- distinguish implemented, partial, blocked, and not-started capability states;
- remove handwritten inventory counts where generated data exists.

## PQ-04 — `ObservePlanRunReadiness` is a browser-derived model, not an authoritative query

**Severity:** P2 architectural drift / UX consistency risk

The named rail is implemented in
`apps/web/src/app/views/canvas/canvasPlanReadiness.ts` as a pure client function.
`canvasExecutionState.ts` supplies local plan identity, stale-signature,
permission, and capability information. Optional backpressure and adapter-degraded
inputs exist, but the inspected call site supplies only capability mismatch.

The server still performs final Preview/StartRun authorization and revision
validation, so execution remains fail-closed. The drift is that the user-facing
readiness panel can be more optimistic or less informative than the actual server
admission state.

**Required implementation**

Either:

- make `ObservePlanRunReadiness` a real protected query returning server-owned
  blockers, freshness, adapter status, backpressure, and authorization; or
- rename the Web model so it does not claim query-rail authority and explicitly
  present it as local preflight, while surfacing server admission reasons after
  Preview/StartRun.

Do not maintain two objects with the same rail name and different authority.

## PQ-05 — Coverage enforcement remains engine-only

**Severity:** P1 quality-system gap

`.github/workflows/test.yml` defines an `Engine Coverage Gate` only.
`vitest.config.ts` includes only `packages/@dvt/engine/src/**/*.ts` with global
thresholds:

- statements: 65%;
- branches: 55%;
- functions: 65%;
- lines: 65%.

API and Web contain the most recent authority, idempotency, import, Preview,
selection, orchestration, and recovery logic, but have no mandatory coverage
threshold or changed-code ratchet.

**Required implementation**

1. publish API and Web baselines without initially blocking;
2. fail on any decrease;
3. enforce changed-code coverage;
4. require at least 90% branch coverage for authority, selection, idempotency, CAS,
   security, retry, compensation, revision-readiness, and plan/run admission code;
5. converge general API/Web modules to at least 80% statements/lines, 75%
   functions, and 70% branches;
6. keep architecture tests, contract tests, and live proofs as separate gates.

The PQ-01 defect is exactly the kind of branch-semantic error that line-oriented
suite counts do not prevent.

## PQ-06 — Non-functional product quality remains backlog, not release evidence

**Severity:** P1 release-readiness gap

Open work still includes:

- [#158](https://github.com/dunay2/dvt/issues/158) — 50k-node performance tests;
- [#18](https://github.com/dunay2/dvt/issues/18) — load and chaos suite;
- [#188](https://github.com/dunay2/dvt/issues/188) — large-graph performance budget;
- [#187](https://github.com/dunay2/dvt/issues/187) — keyboard/screen-reader accessibility;
- [#186](https://github.com/dunay2/dvt/issues/186) — frontend telemetry;
- [#177](https://github.com/dunay2/dvt/issues/177) — resilient run-log/progress reconnection.

**Required executable lanes**

- `quality:a11y` — automated axe checks plus keyboard-only critical journeys;
- `quality:web-performance` — build/bundle and route-interaction budgets;
- `quality:graph-scale` — deterministic 1k, 10k, and 50k graph benchmarks;
- `quality:load-chaos` — k6 plus controlled PostgreSQL, Temporal, worker, and
  network failure scenarios;
- `quality:telemetry` — prove correlation from browser action to request, PlanRef,
  run ID, worker, and outcome.

Version baselines, publish artifacts, and fail regressions. Budget changes require
an explicit rationale rather than silent baseline replacement.

## PQ-07 — Warehouse connection onboarding leaks infrastructure vocabulary and has UI defects

**Severity:** P2 product/security UX gap

`WarehouseConnectionCreateForm.tsx` asks the user to enter a raw
`credentialRef`, with placeholder:

```text
env:DVT_LOCAL_POSTGRES_WAREHOUSE_URL
```

The same controlled fields wire both `onInput` and `onChange`, causing duplicate
semantic update callbacks. The async error container has no `role="alert"` or live
region, and the form hardcodes Slate/Red/Blue Tailwind colors rather than using a
semantic design-token boundary.

**Impact**

- users must understand deployment-internal secret-reference syntax;
- client state/effects can execute twice per edit;
- assistive technology may not announce connection failures;
- visual consistency and theme evolution are harder to govern.

**Required implementation**

- present server-approved credential aliases or environment bindings, not arbitrary
  internal reference strings;
- use one input event path;
- announce async errors and move/restore focus correctly;
- use semantic form/error/focus tokens;
- add keyboard, screen-reader, and double-dispatch regression tests.

## PQ-08 — API and Contracts use different Zod major versions

**Severity:** P2 maintainability / boundary risk

`apps/api/package.json` declares Zod `^3.0.0` while `@dvt/contracts` declares Zod
`^4.3.6`. The API directly consumes the contracts package.

Two major schema runtimes can create duplicate bundles and subtle differences in
error shape, schema composition, helper behavior, and inferred types.

**Required implementation**

- inventory API-local Zod 3 schemas;
- move shared transport/domain schemas into `@dvt/contracts` where appropriate;
- migrate API-local schemas to Zod 4 with compatibility tests;
- add a dependency policy preventing multiple major versions of boundary
  libraries without an expiring exception.

## PQ-09 — Review threads remain mechanically unresolved after fixes

**Severity:** P2 merge-hygiene and automated-review drift

PR #1959 retains two active non-outdated threads even though replies identify fix
commits and regression tests. PR #1956 retains a historical P2 that later recovery
work appears to supersede.

**Required implementation**

- require review-thread closure before merge for active P1/P2 findings;
- permit an explicit `superseded-by` closure linked to the follow-up PR;
- require fix replies to name the commit and regression evidence;
- periodically reconcile closed PRs whose thread state contradicts landed code;
- avoid treating unresolved mechanical state as proof of a live bug without
  checking current code.

## PQ-10 — GitHub issues and Planning DB remain partially conflicting authorities

**Severity:** P2 planning/governance drift

Open GitHub issues still include stories such as the original read-only plan
preview and older frontend phase trackers even though newer implementations and
Planning DB records have overtaken parts of that scope.

Planning DB is currently more precise for the dbt Phase 4 state, but the repository
does not consistently project that state back to GitHub.

**Required implementation**

- make Planning DB the status authority and GitHub the collaboration surface;
- project `planned`, `active`, `blocked`, `implemented`, and `superseded` states;
- require each open implementation issue to link to an active Planning DB task or
  be marked historical;
- run a scheduled drift report that never creates a second planning authority.

## PQ-11 — Outbox scale-out and production canary remain incomplete

**Severity:** P1/P2 production-operability gap

Open work includes:

- [#409](https://github.com/dunay2/dvt/issues/409) — independent outbox worker
  scale-out hardening;
- [#414](https://github.com/dunay2/dvt/issues/414) — per-run ordering under multiple
  workers;
- [#413](https://github.com/dunay2/dvt/issues/413) — single-owner canary and rollback;
- [#447](https://github.com/dunay2/dvt/issues/447) — automated canary CI lane;
- [#1411](https://github.com/dunay2/dvt/issues/1411) — unresolved adapter-postgres
  nightly failure record.

Horizontal scale must remain blocked until one ADR-0009 ordering strategy has
concurrent-worker proof. Canary ownership and rollback must be executable, not only
runbook prose.

# Recommended product route

## Step 0 — Fix execution-selection intent before adding features

**Goal:** make explicit selection fail closed and prove that Preview never expands
scope silently.

**Exit criteria**

- source-only/metric-only/exposure-only selection cannot produce a plan;
- mixed selection includes only executable selected nodes plus accepted executable
  dependencies;
- no-selection behavior is explicitly specified and tested;
- API rejects ambiguous empty explicit selection;
- strict live proof covers the negative path;
- Planning DB records the selection policy owner and tests.

## Step 1 — Reconcile product truth

**Goal:** establish an accurate starting point for the next GPT/agent.

Update:

- the accepted dbt round-trip plan;
- `system-delivery-status.md`;
- current capability/roadmap projections;
- GitHub issue state for capabilities delivered through Phase 4;
- stale review-thread state.

**Exit criteria**

- one current capability map agrees with code and Planning DB;
- Phase 4 is shown as implemented;
- Phases 5–7 are separately planned;
- reviewed commit freshness is mechanically checked.

## Step 2 — Establish an executable Product Quality Standard

Create:

- `docs/architecture/quality/product-quality-standard.md`;
- `tools/quality/product-quality-policy.json`;
- `tools/quality/check-product-quality.mjs`;
- `tools/quality/check-product-quality.test.mjs`;
- `.github/workflows/product-quality.yml`;
- generated `docs/planning/status/product-quality-scorecard.md`.

`pnpm quality:product` should produce a deterministic scorecard covering:

- product completeness;
- correctness and intent preservation;
- security/tenancy;
- recovery and resilience;
- operability/observability;
- performance/scale;
- accessibility;
- coverage/evidence;
- documentation/governance freshness.

Start non-blocking, then promote mature dimensions to required checks. Waivers must
name an owner, impact, rollback, expiry, and evidence gap.

## Step 3 — Implement Phase 5 conservative visual edits

The core round trip now works through Code. The next differentiating product value
is safe bidirectional Canvas/file editing, not a generic new DSL.

Begin only with lossless, explicit, revision-guarded operations:

1. YAML descriptions;
2. YAML tags;
3. `not_null` and `unique` generic tests;
4. materialization only when its effective source is singular and safely patchable.

**Architecture rules**

- no generic `EditDbtGraph` transaction script;
- use a concrete DDD owner per mutation;
- use `WorkspaceFileRevision`/CAS and batch mutation where required;
- preserve comments, formatting, anchors, and unrelated YAML content through a
  CST-preserving adapter;
- return a mutation receipt, then refetch `ProjectDbtGraphFromFiles`;
- unsupported SQL/Jinja remains `code_only` with an explanation;
- every operation requires preservation fixtures and stale-revision tests.

**First candidate command**

A narrowly named operation such as `UpdateDbtResourceDescription` is acceptable
only after contract and C&Q review. It must not become a generic visual mutation
escape hatch.

## Step 4 — Implement authoritative project export

Export the authoritative files; never regenerate a simplified project from Canvas.

Exclude:

- profiles and credentials;
- target/log/cache output;
- local layout state;
- graph-draft internals;
- Planning DB data;
- editor temporary files.

Return an artifact receipt containing project revision, archive SHA, validation
posture, diagnostics, and inventory summary. Prove that the archive parses under
the supported dbt toolchain with a safe target.

## Step 5 — Implement explicit graph-draft adoption

Implement the one-way transition:

```text
graph-draft
-> generate bootstrap files
-> persist with revision receipts
-> analyze
-> prove projected graph parity
-> bind dbt-project-files authority
-> stop Preview regeneration
```

Any failure leaves graph-draft authority unchanged. Never fall back automatically
from file authority to graph-draft.

## Step 6 — Raise release quality and production maturity

In parallel after selection safety and current-state reconciliation:

- API/Web coverage ratchet;
- accessibility and focus/error recovery;
- bundle and route interaction budgets;
- 1k/10k/50k graph benchmarks;
- 500 events/sec and 4k runs/hour load target from #18;
- PostgreSQL/Temporal/network/worker chaos scenarios;
- frontend-to-runtime correlated telemetry;
- automated outbox canary and rollback;
- selected multi-worker ordering strategy;
- server-owned credential alias onboarding.

# Proposed PR decomposition

1. `fix/dbt-explicit-selection-fail-closed`
2. `test/dbt-selection-live-negative-proof`
3. `docs/dbt-phase4-current-state-reconciliation`
4. `ci/current-state-freshness-gate`
5. `docs/product-quality-standard-contract`
6. `ci/api-web-coverage-ratchet`
7. `feat/dbt-description-visual-edit`
8. `feat/dbt-tags-and-generic-tests-visual-edit`
9. `feat/dbt-project-export`
10. `feat/dbt-graph-draft-adoption`
11. `test/web-accessibility-and-bundle-budgets`
12. `perf/graph-scale-and-load-baselines`
13. `feat/outbox-canary-and-multi-worker-proof`
14. `feat/server-owned-credential-alias-onboarding`
15. `ci/planning-issue-review-reconciliation`

Each PR should include:

- a named DDD owner;
- reused or explicitly reviewed command/query rails;
- red/green tests;
- negative and concurrency cases;
- rollback posture;
- Planning DB relations/evidence;
- risk updates;
- no quality-rule relaxation;
- no hidden compatibility branch on the pre-release line.

# Release-blocking policy proposed for the next milestone

The next milestone must not be called product-complete unless:

- explicit selections cannot expand execution scope;
- current-state docs agree with code and Planning DB;
- API and Web changed code are coverage-gated;
- critical user journeys pass automated accessibility checks;
- bundle and graph performance baselines are enforced;
- one production-like load/recovery lane passes;
- active non-outdated P1/P2 threads are resolved or explicitly superseded;
- server-owned credential references are selected through an approved product
  surface rather than typed as infrastructure syntax;
- multi-worker scale-out remains disabled until ordering proof exists.

# Final recommendation

Do not start export, adoption, or broad visual mutation before fixing explicit
selection semantics.

Then treat the completed Phase 4 loop as the stable platform for Phase 5:
conservative, lossless visual edits over normal dbt files. This preserves the
original product decision—no new user-facing DVT language—while finally making
Canvas genuinely bidirectional.

The architecture is strong enough to support that route. The quality bar now needs
to protect user intent as rigorously as it protects contracts, authority, and
provenance.