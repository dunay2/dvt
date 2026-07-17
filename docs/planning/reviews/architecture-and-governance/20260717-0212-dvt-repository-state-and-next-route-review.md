---
title: DVT Repository State and Next Route Review — 2026-07-17 02:12
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
reviewed_commit: f627c03311c748032c319f88addaa84d994adb38
supersedes_review_pr: 1973
---

# DVT Repository State and Next Route Review — 2026-07-17 02:12

## Executive verdict

DVT remains architecturally credible and product-incomplete.

The important delta since the preceding review is that `main` merged PR
[#1974](https://github.com/dunay2/dvt/pull/1974), replacing the third-party,
REST-backed pull-request title check with the repository-owned validator. That
was the right local correction: local and CI title validation now share one
policy authority.

It does **not** make PR [#1971](https://github.com/dunay2/dvt/pull/1971) ready to
merge.

PR #1971 is now seven commits ahead and three commits behind current `main`. Its
latest CI evidence still contains the old failed `PR Quality Gate` run. Five
other workflows passed, and all five inline review threads are resolved, but no
fresh run proves the branch against the current base workflow and current
migration set.

A new integration hazard also exists:

- current `main` contains
  `709_pr_title_local_authority_feature_mechanization.sql`;
- PR #1971 contains
  `709_dbt_execution_selection_intent_integrity.sql` through
  `721_dbt_selection_lifecycle_feature_symbol.sql`.

The migration runtime keys migrations by the complete filename stem, so two
`709_*` files do not immediately collide in `schema_migrations`. They do,
however, destroy the implied uniqueness of the numeric migration sequence and
make branch ordering, audit, future generation, and human reasoning ambiguous.
The branch must be synchronized and the migration-sequence policy made explicit
before merge.

The product route is unchanged in substance:

1. stabilize the current PR graph and merge only fresh green work;
2. close the architecture-review debt already merged in #1970;
3. reduce governance change amplification;
4. restore mechanically generated current-state truth;
5. add product-wide quality, accessibility, performance, scale, and recovery
   gates;
6. deliver one complete, lossless dbt YAML description-edit transaction with
   diff, compare-and-swap, conflict, revert, re-analysis, Preview, Run, and
   reopen proof;
7. only then broaden into scheduling, deployment, backfill, and production
   scale claims.

## Scope and method

This review inspected:

- current `main` and its latest merge commit;
- recent repository commits;
- every currently visible open pull request;
- changed-file sets and branch divergence for the active functional and review
  branches;
- available GitHub Actions runs for relevant PR heads;
- inline review threads, including merged PRs with unresolved findings;
- Planning DB migration behavior and branch migration numbering;
- the declared current-status document;
- root coverage configuration;
- API and Contracts validation dependencies;
- recently updated open product, scale, accessibility, observability, and
  runtime issues.

The review did not run the repository locally. GitHub evidence was inspected
through the repository connector. The connector exposes PR-triggered workflow
runs for a commit, but it did not expose a complete push-workflow inventory for
the merge commit on `main`. Consequently, this report treats the fully green
PR #1974 head as merge evidence and does not claim an independently observed
post-merge full-main run.

## Current repository snapshot

### Main

Current reviewed `main`:

```text
f627c03311c748032c319f88addaa84d994adb38
Merge pull request #1974 from dunay2/fix/pr-title-local-authority
fix(ci): Use canonical PR title validator
```

Commit:
<https://github.com/dunay2/dvt/commit/f627c03311c748032c319f88addaa84d994adb38>

PR #1974 changed five files, added 229 lines, and removed 33 lines. Its product
behavior is unchanged; it modifies CI policy, local validation, architecture
tests, documentation, and Planning DB evidence.

### Recent main activity

The most recent visible main work is:

1. PR #1974 — canonical repository-owned PR title validation;
2. dependency upgrades for `tw-animate-css`, linting tools, Node types, and
   CodeQL;
3. PR #1970 — DBT Canvas architecture-contract alignment;
4. PR #1969 — explicit DBT Preview fixture alignment;
5. PR #1966 — prevention of DBT Preview scope widening.

This sequence shows that current delivery is dominated by correctness,
governance, CI, and dependency hardening rather than a new user-facing product
vertical.

## Open pull requests

### PR #1971 — Preserve DBT execution selection intent

Link: <https://github.com/dunay2/dvt/pull/1971>

State:

```text
open
ready for review
mergeable according to GitHub metadata
head: 1c57115ba1296fdee3d14749d070d20b8decf14e
7 commits ahead of the old base
64 changed files
4,205 additions
260 deletions
current relation to main: 7 ahead, 3 behind, diverged
```

The implementation addresses a real execution-integrity defect:

- unavailable requested IDs must not silently disappear;
- an explicit empty selection must not widen to workspace execution;
- requested roots, executable closure, and authorized scope must remain
  distinct;
- lifecycle changes must preserve hidden requested intent;
- stale or invalid selections must fail closed.

The branch has substantial focused test evidence and all five inline review
threads are marked resolved.

It is nevertheless not merge-ready because its latest CI evidence predates the
current base correction and still contains:

```text
PR Quality Gate: failure
Dependency Review: success
Contracts & Determinism: success
Test Suite: success
CI - Code Quality: success
CodeQL: success
```

Failed run:
<https://github.com/dunay2/dvt/actions/runs/29541052616>

The old failure was localized to the title validator. PR #1974 corrected that
validator on `main`, but a corrected base is not equivalent to fresh proof of
#1971. The branch must be synchronized and rerun.

### PR #1973 — Prior hard Fowler product-maturity review

Link: <https://github.com/dunay2/dvt/pull/1973>

State:

```text
open draft
head: c25b6f03aeeb7d0fb242518d75be04bba91e11dd
1 commit ahead
3 commits behind current main
diverged from main
```

Its applicable checks passed:

```text
PR Quality Gate: success
CI - Code Quality: success
Test Suite: skipped
Contracts & Determinism: skipped
Dependency Review: skipped
CodeQL: skipped
```

The report is useful historical evidence, but its PR body is already stale: it
still describes the title-validator failure before #1974 merged. It should not
be merged unchanged alongside this newer review. Once this review is accepted,
#1973 should be closed as superseded or deliberately rebased and rewritten. Two
open “current state” review PRs are parallel truth, not traceability.

### PR #1942 — Release 0.3.0

Link: <https://github.com/dunay2/dvt/pull/1942>

State:

```text
open
non-draft
mergeable according to GitHub metadata
changed files:
  .release-please-manifest.json
  CHANGELOG.md
  package.json
```

This is a generated Release Please PR. The current release draft contains a
large inventory of dbt project import, file authority, Canvas projection,
Preview/Run, source discovery, and correctness work.

The connector did not return a compact head SHA and complete workflow inventory
for this oversized generated PR body during this review. Therefore, this report
does not claim that #1942 is green.

Do not merge the release PR while:

- #1971 is unsynchronized and lacks fresh current-base CI;
- the merged #1970 P2 architecture thread remains unresolved;
- release limitations and known operational gaps are not explicit;
- the authoritative current-status document still describes an April snapshot.

## CI assessment

### PR #1974

The head used for merge,
`6db6dae4495b0bd275b0c3d53b5e3e053eeed03d`, had six green workflows:

- Dependency Review;
- Contracts & Determinism;
- CI - Code Quality;
- Test Suite;
- CodeQL;
- PR Quality Gate.

That proves the title-validator correction passed the existing PR gate.

### PR #1971

The latest visible runs are five green and one red. Because the red run belongs
to the now-replaced title-check implementation, the correct interpretation is
not “the code is bad” and not “the PR is effectively green.” The correct
interpretation is **the branch has no current admissibility proof**.

Required evidence after synchronization:

```text
PR Quality Gate                 success
Dependency Review               success
Contracts & Determinism         success
Test Suite                      success
CI - Code Quality               success
CodeQL                          success
All Checks Required for Merge   success
```

The final run must use the current branch head, current PR title, current base,
and final migration filenames.

### Main

The connector returned no legacy combined-status contexts for the main merge
commit. This is not evidence of failure; it is also not evidence of a complete
post-merge full-main run. The reliable observed evidence is the green #1974 PR
head.

A mature release process should publish one generated merge-readiness record
containing:

- main SHA;
- source PR and head SHA;
- required check names and conclusions;
- post-merge smoke or full-main result;
- artifact links;
- open release exceptions.

## Review-thread assessment

### PR #1971

All five inline threads are resolved. They covered real P1/P2 selection-integrity
risks:

- hidden IDs disappearing before validation;
- requested-root changes not invalidating persisted preview;
- deselecting the final invalid item widening to workspace scope;
- file-backed toggles dropping unavailable requested IDs;
- graph lifecycle updates erasing hidden intent.

Resolution status is positive, but thread resolution is not a substitute for a
fresh base integration run.

### PR #1970

PR [#1970](https://github.com/dunay2/dvt/pull/1970) was merged with one active,
non-outdated P2 thread on:

```text
apps/web/src/app/views/canvas/canvasDbtAuthoringRun.architecture.test.ts
```

The current test proves that the execution projection imports the DBT graph
source. It does not negatively prove that `canvasPlanAction.ts` cannot import
that graph-source builder directly. The ownership boundary can therefore
regress while the test remains green.

This is still unresolved and should be closed by a small test-only PR, not by a
comment that retroactively treats the existing assertion as sufficient.

### PRs #1973, #1974, and #1942

No inline review threads were returned for these PRs.

## Findings

## R-0212-01 — PR #1971 must synchronize with current main before any merge decision

**Severity:** P1 merge blocker

PR #1971 was created from
`2c4110de8d74ffbb02880255cc9b760daaa84070`. Current main is
`f627c03311c748032c319f88addaa84d994adb38`.

The three commits now on main changed the exact CI policy that previously
failed #1971 and added a Planning DB migration that overlaps its numeric
sequence.

Required action:

1. rebase or merge current `main` into `fix/dbt-selection-intent` according to
   repository policy;
2. resolve migration numbering deliberately;
3. run focused selection tests after conflict resolution;
4. run governance refresh and Planning DB integrity checks;
5. obtain all required GitHub checks on the final head;
6. confirm zero active, non-outdated P1/P2 review threads;
7. merge only through normal repository policy.

Do not rerun only the old failed job before synchronizing. That would prove the
old tree, not the integration candidate.

## R-0212-02 — Parallel migration numbering is an authority defect

**Severity:** P1 governance/integration defect

Current main contains:

```text
tools/planning-db/migrations/709_pr_title_local_authority_feature_mechanization.sql
```

PR #1971 contains:

```text
tools/planning-db/migrations/709_dbt_execution_selection_intent_integrity.sql
...
tools/planning-db/migrations/721_dbt_selection_lifecycle_feature_symbol.sql
```

The migration runner:

- sorts SQL filenames lexically;
- derives `version` from the complete filename without `.sql`;
- stores that complete version as the primary key in
  `planning_query_store.schema_migrations`.

Source:
<https://github.com/dunay2/dvt/blob/f627c03311c748032c319f88addaa84d994adb38/scripts/planning-db-migrate.cjs#L41-L59>

Therefore, both `709_*` files can technically apply. The defect is semantic and
operational:

- the numeric prefix no longer identifies one migration order;
- branch authors can reserve the same ordinal independently;
- generated reports may sort or summarize by an ambiguous number;
- humans cannot infer chronological order from the prefix;
- rebase work expands because filenames are embedded in SQL, tests, source
  paths, manifests, and evidence.

Immediate recommendation for #1971:

- synchronize with main;
- renumber its migration series to the next free contiguous range;
- update every embedded filename/source-path/test reference;
- rerun Planning DB migration, integrity, and mechanization checks.

Repository-level fix:

```text
check-migration-sequence
  -> parse leading numeric ordinal
  -> fail when more than one tracked migration owns an ordinal
  -> report the highest ordinal and suggested next value
```

Longer term, branch-local review follow-ups should not create a new immutable
migration for each metadata correction.

## R-0212-03 — Governance amplification is still increasing

**Severity:** P1 maintainability and delivery problem

Two current examples:

### Selection fix

PR #1971:

```text
64 files
4,205 additions
13 Planning DB migrations
```

### PR-title validator fix

PR #1974:

```text
5 files
229 additions
33 deletions
one 205-line Planning DB migration
```

The CI change itself removes a third-party action and delegates to an existing
local command. Yet the governance representation is larger than the workflow
correction.

The Fowler smell remains **Shotgun Surgery**, now coupled with a form of
**Divergent Change**: one small policy correction changes workflow code, local
validator code, architecture tests, instructions, and an extensive Planning DB
manifest.

Required policy:

- schema evolution uses immutable migrations;
- one durable product slice may register one durable evidence mutation;
- review-comment metadata corrections update one declarative feature/evidence
  source rather than appending migrations;
- generated Planning DB state is derived from that source;
- more than ten governance-only changed files requires an explicit,
  time-bounded architecture waiver;
- changed-file amplification is published in the PR quality summary.

## R-0212-04 — The canonical current-status page is still not current

**Severity:** P1 planning truth defect

`docs/architecture/system-delivery-status.md` declares:

```text
This page is the current implementation snapshot for the repository.
```

Its frontmatter and snapshot date remain:

```text
last_reviewed: 2026-04-26
Review date: 2026-04-26
```

Source:
<https://github.com/dunay2/dvt/blob/f627c03311c748032c319f88addaa84d994adb38/docs/architecture/system-delivery-status.md>

The open release PR is already describing version 0.3.0 and a large body of
July dbt import, file authority, projection, Code synchronization, Preview, and
Run work. A document cannot be both “current implementation snapshot” and
nearly three months behind the active release content.

Required implementation:

- generate capability status from current `main` SHA;
- include implemented, partial, blocked, deprecated, and not-started states;
- link code, contracts, tests, live proof, Planning DB state, and open blockers;
- fail CI when a material capability changes without regenerating the snapshot;
- keep handwritten interpretation separate from mechanically generated current
  truth.

## R-0212-05 — The previous review PR has become parallel stale truth

**Severity:** P2 governance hygiene defect

PR #1973 is useful evidence but is already three commits behind and still
frames the title-check failure as unresolved. PR #1974 has since changed the
base policy.

Required action after this report is accepted:

- close #1973 as superseded, or
- rebase and rewrite it into a historical baseline that no longer claims to be
  current.

Do not merge both current-state reports. A recurring review process must have
one active head report and an explicit supersession chain.

## R-0212-06 — Release 0.3.0 lacks a mechanically visible release-readiness gate

**Severity:** P1 release-governance problem

PR #1942 lists major product capabilities, but repository evidence remains
fragmented across PR checks, old status pages, Planning DB, issues, and review
threads.

Before release merge, require a generated release-readiness artifact that
answers:

- exact release commit and source main SHA;
- all required CI conclusions;
- unresolved P1/P2 review-thread count;
- open known regressions and accepted exceptions;
- browser accessibility result;
- bundle/performance budget result;
- production-like load/recovery result;
- supported runtime/provider matrix;
- supported authoring/editing operations;
- known limitations for scheduling, backfill, scale, and recovery.

A release may intentionally ship with limitations. It must not ship with
limitations hidden behind a stale “current status” page.

## R-0212-07 — Product-wide quality is not enforced

**Severity:** P1 quality-system problem

The root Vitest coverage configuration still includes only:

```text
packages/@dvt/engine/src/**/*.ts
```

Thresholds remain:

```text
statements 65
branches   55
functions  65
lines      65
```

Source:
<https://github.com/dunay2/dvt/blob/f627c03311c748032c319f88addaa84d994adb38/vitest.config.ts>

API and Web carry much of the current product risk:

- authorization and admission;
- workspace/file revision handling;
- selection intent;
- Preview/Run state;
- conflict and recovery UX;
- reconnection and error rendering.

They have tests but no repository-wide coverage ratchet or changed-code
threshold visible in the root quality gate.

Required route:

1. publish current API/Web baselines without blocking;
2. block any decrease;
3. enforce changed-code coverage;
4. require at least 90% branch coverage for authority, revision, idempotency,
   admission, compensation, and security policy modules;
5. converge general API/Web coverage toward 80% statements/lines, 75%
   functions, and 70% branches;
6. keep architecture and browser tests as separate evidence, not substitutes.

## R-0212-08 — Merged architecture-review debt remains open

**Severity:** P2 architecture-governance problem

The unresolved #1970 P2 thread proves that the repository can merge while an
active architecture finding remains visible.

Required implementation:

```text
test(web): Guard DBT graph-source ownership
```

The test must negatively assert that `canvasPlanAction.ts` cannot import
`canvasDbtPlannerGraphSource` directly.

Then add a merge gate that blocks active, non-outdated P1/P2 threads. A human
may override only with an explicit, expiring waiver linked to follow-up work.

## R-0212-09 — Operational scale remains planned debt, not proven capability

**Severity:** P1 production-readiness problem

Relevant open issues include:

- [#18](https://github.com/dunay2/dvt/issues/18) — sustained load and chaos
  suite;
- [#409](https://github.com/dunay2/dvt/issues/409) — independent outbox worker
  scale-out hardening;
- [#414](https://github.com/dunay2/dvt/issues/414) — per-run ordering with
  multiple workers;
- [#413](https://github.com/dunay2/dvt/issues/413) — single-owner canary and
  rollback;
- [#447](https://github.com/dunay2/dvt/issues/447) — automated canary CI lane;
- [#1411](https://github.com/dunay2/dvt/issues/1411) — Adapter Postgres nightly
  failure.

Do not describe DVT as production-scale until evidence proves:

- multi-worker ordering;
- duplicate delivery and crash-window behavior;
- canary single ownership and rollback;
- sustained target load;
- PostgreSQL restart and contention recovery;
- Temporal interruption recovery;
- worker restart recovery;
- observable recovery objectives.

## R-0212-10 — Frontend maturity remains behind backend architecture

**Severity:** P2 product maturity problem

Open frontend issues still track:

- [#158](https://github.com/dunay2/dvt/issues/158) — 50k-node performance;
- [#188](https://github.com/dunay2/dvt/issues/188) — large-graph performance
  budget;
- [#187](https://github.com/dunay2/dvt/issues/187) — keyboard and screen-reader
  accessibility;
- [#177](https://github.com/dunay2/dvt/issues/177) — resilient logs/progress
  reconnection;
- [#186](https://github.com/dunay2/dvt/issues/186) — frontend telemetry.

The next quality milestone needs enforced evidence for:

- keyboard-only critical journeys;
- automated accessibility checks in real browser flows;
- initial bundle and lazy-loaded chunk budgets;
- Canvas-ready and interaction latency budgets;
- 1k, 10k, and 50k-node benchmark artifacts;
- reconnect/recovery behavior after API, network, or worker interruption.

## R-0212-11 — Planning issues still contradict active runtime authority

**Severity:** P2 planning-authority defect

The current status document says Temporal is the only active runtime provider
and that a second runtime requires a new ADR-backed contract and production
path.

Open issues still include:

- [#69](https://github.com/dunay2/dvt/issues/69) — ConductorAdapter MVP;
- [#71](https://github.com/dunay2/dvt/issues/71) — Conductor draining and
  termination;
- [#72](https://github.com/dunay2/dvt/issues/72) — adapter version binding;
- [#73](https://github.com/dunay2/dvt/issues/73) — determinism across all
  adapters.

GitHub Issues therefore cannot be read as current roadmap authority without
reconciliation against Planning DB and accepted ADRs.

Required policy:

- Planning DB remains status authority;
- GitHub remains collaboration/execution surface;
- every open issue links to an active Planning DB task or is labeled historical,
  superseded, or exploratory;
- automated reconciliation reports drift but does not silently create new
  authority.

## R-0212-12 — API and Contracts still use different Zod major versions

**Severity:** P2 boundary/dependency problem

Current declarations:

```text
apps/api/package.json                  zod ^3.0.0
packages/@dvt/contracts/package.json  zod ^4.3.6
```

Sources:

- <https://github.com/dunay2/dvt/blob/f627c03311c748032c319f88addaa84d994adb38/apps/api/package.json>
- <https://github.com/dunay2/dvt/blob/f627c03311c748032c319f88addaa84d994adb38/packages/%40dvt/contracts/package.json>

Because API consumes Contracts, two major validation runtimes create avoidable
risk around error structures, transforms, composition, inferred types, and
bundle duplication.

Required route:

1. inventory API-local Zod 3 schemas;
2. move shared boundary schemas into Contracts;
3. migrate focused API schemas to Zod 4;
4. add compatibility tests for parsed errors and transforms;
5. add a dependency rule blocking multiple major versions of boundary
   libraries without an expiring waiver.

## R-0212-13 — The next product vertical must be a complete edit transaction

**Severity:** P1 product-direction problem

Do not start a generic visual dbt editor.

The first writable Canvas vertical should edit only one model description in a
`schema.yml` file and prove the full transaction:

```text
current project revision
  -> current file revision
  -> semantic description edit proposal
  -> CST-preserving candidate content
  -> visible unified diff
  -> explicit user confirmation
  -> conditional write
  -> conflict or immutable receipt
  -> dbt re-analysis
  -> stable unique_id reconciliation
  -> Preview
  -> Run
  -> reopen
  -> description preserved
```

Mandatory negative proof:

- comments remain;
- unrelated YAML remains byte-stable where supported;
- key ordering is preserved where supported;
- anchors, aliases, custom keys, and unsupported constructs fail `code_only`;
- stale file revision returns conflict and never overwrites;
- undo/revert is a conditional inverse write;
- re-analysis failure leaves an explicit recoverable state;
- Preview cannot use a stale pre-edit revision.

## Recommended next route

## Gate 0 — Stabilize the active PR graph

### PR #1971

1. synchronize with current main;
2. resolve the `709_*` migration ordinal fork;
3. update embedded migration references;
4. run focused Web selection and architecture tests;
5. run Planning DB migration/integrity/mechanization checks;
6. obtain all fresh GitHub checks;
7. confirm no active P1/P2 thread;
8. merge only through normal policy.

### PR #1973

After this report exists, close it as superseded or rewrite it as historical
context. Do not maintain two current-state review PRs.

### PR #1942

Hold the release PR until the final release main SHA has a generated
release-readiness record and current known limitations.

## Gate 1 — Close merged architecture debt

Suggested PR:

```text
test(web): Guard DBT graph-source ownership
```

Scope:

- one negative architecture assertion;
- focused architecture test;
- link to the unresolved #1970 thread;
- resolve the thread after the new guard is merged.

Do not bundle this with new selection or authoring behavior.

## Gate 2 — Remove governance migration chains from review follow-ups

Suggested PR:

```text
refactor(governance): Generate feature evidence from declarative manifests
```

Deliver:

- `feature-evidence.schema.json`;
- one canonical manifest per product slice;
- Planning DB upsert/snapshot generator;
- numeric migration-prefix uniqueness check;
- changed-file amplification report;
- policy separating schema migrations from evidence refreshes;
- tests proving review-only metadata edits do not require new migrations.

Exit criterion:

A future selection-policy correction changes product code, tests, one evidence
manifest, and generated output — not thirteen new migrations.

## Gate 3 — Generate current product truth

Suggested PR:

```text
ci(status): Generate product capability status from main
```

Deliver:

- current main SHA;
- implemented/partial/blocked/deprecated/not-started capability states;
- code, contract, test, browser-proof, and issue links;
- open release blockers;
- README/current-status generated review metadata;
- stale-status CI failure.

## Gate 4 — Establish product quality gates

Suggested PR sequence:

```text
ci(quality): Add product quality policy and scorecard
ci(test): Add API and Web coverage ratchets
ci(web): Add accessibility and bundle baselines
perf(canvas): Add graph-scale benchmark lane
```

The first scorecard may publish without blocking. Any regression must become
blocking before broad new product work lands.

## Gate 5 — Deliver the first lossless dbt edit

Suggested PR decomposition:

1. `feat(contracts): Add DBT YAML edit proposal contract`
2. `feat(api): Propose revision-bound DBT description edit`
3. `feat(web): Review DBT YAML edit diff from Canvas`
4. `feat(api): Apply conditional DBT YAML edit`
5. `feat(web): Handle conflict and conditional revert`
6. `test(dbt): Prove description edit round trip live`

Do not combine the six changes into one PR. Do not create a generic mutation
endpoint.

## Gate 6 — Production operability

Suggested sequence:

1. implement and prove per-run multi-worker ordering;
2. automate single-owner canary and rollback;
3. close the Postgres nightly regression;
4. add sustained load and chaos acceptance;
5. correlate Canvas, PlanRef, run, worker, and result telemetry;
6. add resilient Web reconnection and lag state;
7. publish observed recovery objectives.

## Gate 7 — Deployment, scheduling, and backfill

Begin only after safe authoring and core operability gates are green.

Introduce versioned domain objects rather than adding `cron` directly to
Canvas:

- `DeploymentRevision`;
- `ExecutionEnvironmentBinding`;
- `RunSchedule`;
- `RunTrigger`;
- `ConcurrencyPolicy`;
- `BackfillRequest`;
- `BackfillPreview`;
- `BackfillReceipt`.

Required invariants:

- every run binds to an immutable deployment revision;
- scheduling is server-owned, not Canvas-owned;
- credentials remain reference-based and server-owned;
- backfill dry-run and execution use the same admitted range and policy;
- collision/concurrency behavior is explicit and server-enforced;
- the receipt records exact revision, range, policy, and result.

## Immediate implementation instructions for the other GPT

Proceed in this exact order:

1. update PR #1971 onto current `main`;
2. resolve and mechanize migration ordinal uniqueness;
3. obtain fresh all-green CI on #1971;
4. do not merge #1971 unless all required checks and thread gates are green;
5. create the small #1970 architecture-guard PR;
6. close or supersede stale review PR #1973;
7. hold release PR #1942 until current release-readiness evidence exists;
8. implement governance amplification reduction;
9. generate current product capability truth;
10. add product quality scorecards and ratchets;
11. implement one lossless revision-bound YAML description edit;
12. then harden scale, observability, scheduling, and backfill.

## Release-readiness criteria for the next maturity claim

DVT should not claim the next product-maturity milestone unless:

- #1971 is integrated with fresh current-base CI;
- no active, non-outdated P1/P2 review thread remains;
- migration ordinal ownership is deterministic and unique;
- only one current-state review/report PR is active;
- current capability status is generated from current main;
- API and Web changed code are coverage-gated;
- critical browser journeys pass accessibility checks;
- bundle and graph-scale budgets are enforced;
- the first dbt visual edit has diff, CAS conflict, revert, re-analysis,
  Preview, Run, and reopen proof;
- at least one production-like load/chaos lane passes;
- multi-worker outbox ordering and canary rollback are automated;
- operator telemetry correlates Canvas, PlanRef, run, worker, and result;
- release limitations are generated and explicit;
- boundary-validation dependencies converge or carry an expiring waiver.

## Final decision

Do not begin a broad new product phase and do not merge the release PR yet.

The immediate product decision is to finish the current selection-integrity
work honestly against current main, then reduce the governance system's cost of
change. DVT does not need more declarations of architectural completeness. It
needs smaller integration surfaces, one current truth, fresh merge evidence,
complete user transactions, and visible operational guarantees.
