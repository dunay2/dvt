---
title: DVT Current Repository State and Next Route Review — 2026-07-17 08:15
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
reviewed_commit: 459aecb76edc87fbcf984db2f4160cab01a9e246
---

# DVT Current Repository State and Next Route Review — 2026-07-17 08:15

## Executive verdict

DVT has crossed an important threshold since the preceding reviews:

- file-backed dbt import, projection, Preview, Run, and execution-selection integrity
  are now merged;
- the graph-source ownership guard that remained open after PR #1970 is now
  implemented;
- Planning DB migration ordinal uniqueness, applied-identity preservation,
  numeric ordering, and concurrent-runner serialization are now implemented;
- the repository has released version `0.3.0`;
- the relevant recent functional pull requests have no unresolved review threads.

The immediate merge blockers identified in the earlier July reviews are therefore
closed. They must not be repeated as current defects.

The product is still not ready for a broad new visual-authoring phase.

The current repository has three kinds of remaining maturity gap:

1. **current-state truth is stale or inaccessible** — the canonical status page is
   dated April, tracked navigation links point at deliberately untracked generated
   pages, and the accepted dbt round-trip plan still describes several foundations
   as absent even though they have landed;
2. **quality is not enforced at product scope** — coverage remains Engine-only,
   API/Web regression budgets are absent, and accessibility, bundle size, graph
   scale, load, chaos, canary, and multi-worker guarantees are not release gates;
3. **the next user transaction is still incomplete** — DVT can inspect, edit code,
   preview, and run a file-backed dbt project, but it does not yet implement one
   lossless Canvas-originated YAML edit with proposal, diff, conditional apply,
   conflict, re-analysis, revert, Preview, Run, and reopen proof.

The recommended next route is:

1. repair release and current-state evidence on the exact current `main`;
2. make tracked planning navigation usable without a local generator;
3. establish API/Web and non-functional quality ratchets;
4. implement one narrow revision-bound model-description edit in `schema.yml`;
5. then harden multi-worker operation, canary/rollback, load, chaos, and correlated
   operator telemetry;
6. only after those gates, introduce deployment, scheduling, and backfill product
   aggregates.

The next target is not a generic visual dbt editor and not arbitrary SQL/Jinja
mutation.

## Review method and limits

This review inspected repository evidence through the GitHub connector:

- current `main` and its current head;
- recent commits and the release sequence;
- currently open pull requests;
- recent merged and closed pull requests;
- PR-head workflow results;
- inline review-thread resolution state on the relevant recent PRs;
- relevant source, package, planning, status, and generated-document policy files;
- open GitHub issues that represent product, quality, and operational debt;
- relevant PR head branches exposed by pull-request metadata.

The repository was not executed locally during this review. Therefore:

- a green PR workflow is reported as CI evidence, not as an independently repeated
  local test result;
- the absence of a connector-visible workflow on a commit is reported as missing
  visible evidence, not proof that no workflow of any kind ran;
- branch discovery is limited because the branch-search connector did not enumerate
  even known branches reliably. Relevant branch work is taken from PR metadata and
  commit history instead of claiming a complete branch inventory.

## Repository live state

### Current `main`

Current reviewed head:

```text
459aecb76edc87fbcf984db2f4160cab01a9e246
fix(release): Remove duplicate 0.3.0 changelog entries
```

Link:

- <https://github.com/dunay2/dvt/commit/459aecb76edc87fbcf984db2f4160cab01a9e246>

The immediately preceding release commit is:

```text
c72686c420edca96d4079426bd878354ec97af92
chore(main): Release 0.3.0
```

The current follow-up removes duplicate `0.3.0` changelog entries that represented
both merge/release aliases and the underlying semantic changes. The checked-in
changelog is repaired at the current head, but the release-generation path has not
been shown to prevent the same duplication before publication.

The root package version is now `0.3.0`.

### Recent delivery sequence

The material recent sequence is:

1. PR #1971 merged the explicit `workspace | explicit` dbt execution-selection
   intent and fail-closed lifecycle behavior;
2. PR #1976 merged the TypeScript-resolved architecture guard that prevents the
   Canvas plan action from taking direct ownership of the dbt graph-source builder;
3. PR #1977 merged Planning DB migration ordinal and append-only identity hardening;
4. release `0.3.0` was generated;
5. current `main` removed duplicate changelog entries.

Relevant links:

- PR #1971: <https://github.com/dunay2/dvt/pull/1971>
- PR #1976: <https://github.com/dunay2/dvt/pull/1976>
- PR #1977: <https://github.com/dunay2/dvt/pull/1977>

### Open pull requests

No open pull requests were returned by either the repository PR search or the
user-repository PR listing at review time.

This is a meaningful change from the prior review: there is no current functional PR
waiting behind a known red check or unresolved review thread.

### Relevant CI state

Final head of PR #1977:

```text
abba4715da1a9a7af083b91d5dd684b38c309c4f
```

All six visible PR workflows completed successfully:

- Test Suite;
- Contracts & Determinism;
- Dependency Review;
- CI - Code Quality;
- CodeQL;
- PR Quality Gate.

For the exact current `main` head `459aecb...`, the connector returns no
PR-triggered workflow runs and no combined status contexts. Because this connector
endpoint only exposes PR-associated runs, this is not evidence that every possible
main/release workflow was absent. It is evidence that the exact current release-fix
head does not have the same directly visible PR-head proof as `abba4715...`.

The repository should not rely on “the previous functional head was green” as the
only evidence for release-generated or post-release metadata commits.

### Review-thread state

The relevant recent review threads are closed:

#### PR #1971

All five reviewed threads are resolved. The final implementation proves:

- unavailable requested IDs survive graph/presentation reconciliation;
- requested roots and selection mode participate in the draft signature;
- deselecting the final recovery item remains explicit-empty and fails closed;
- file-backed toggles operate on the raw requested set;
- lifecycle updates preserve unrelated hidden IDs.

#### PR #1976

Both review threads are resolved. The architecture guard now uses TypeScript module
resolution rather than substring matching, so relative, extension-qualified,
`.js`-mapped, and configured alias imports resolve to the forbidden ownership target.

#### PR #1977

All seven review threads are resolved. The final branch addresses:

- applied strict migration filename preservation;
- canonical preflight rail ownership;
- numeric ordering beyond ordinal `999`;
- newer migrations applied by a shared worktree;
- cross-ordinal migration renames;
- concurrent migration runners through a PostgreSQL advisory lock;
- deleted trailing strict migrations, including shallow PR-checkout handling.

There is no remaining active thread from the previously cited #1970 architecture
debt; PR #1976 is its implementation closeout.

### Relevant branch work

PR metadata identifies these material recent branches:

- `fix/dbt-selection-intent` — merged through #1971;
- `test/dbt-graph-source-ownership-guard` — merged through #1976;
- `fix/planning-migration-ordinal-uniqueness` — merged through #1977.

Earlier `agent/dvt-review-*` branches correspond to closed, unmerged review PRs and
are historical review snapshots, not active implementation authority.

No currently open PR branch was found. The branch-search connector did not reliably
enumerate known refs, so this review does not claim that no other remote branch
exists; it claims that no unmerged active branch was visible through current PR
metadata.

## What is now closed and must not be reopened as a current finding

### Selection widening and hidden-ID loss

PR #1971 closes the previously verified execution-selection integrity paths.
Selection intent is now explicit state rather than overloading an empty array.
Unavailable roots are preserved for validation, explicit-empty remains fail-closed,
and lifecycle mutations do not silently widen execution to workspace scope.

Do not create another task claiming that source-only, unavailable-only, or
reconciled selection still automatically widens to the whole project without first
showing a new failing path on current `main`.

### Graph-source ownership guard

PR #1976 closes the merged #1970 review debt. The architecture evidence now detects
all TypeScript-resolvable imports of the dbt planner graph-source module from the
forbidden plan-action owner.

Do not create a duplicate guard task.

### Planning DB duplicate ordinal ambiguity

PR #1977 closes the previously observed parallel ordinal problem. The migrator now
has strict ordinal uniqueness and append-only identity protections, numeric sorting,
shared-runner serialization, and deletion/rename handling.

Do not re-report the old parallel `709_*` state as an active repository bug.

The remaining concern is cost of change and governance amplification, not absence of
ordinal protection.

## Findings

## RR-01 — Release generation produced duplicate changelog entries

**Severity:** P2 release-integrity regression

Release `0.3.0` was immediately followed by:

```text
fix(release): Remove duplicate 0.3.0 changelog entries
```

The repair removes duplicate bullets that pointed to different commits for the same
semantic change, including dbt import, file-backed Preview/Run supporting work,
selection integrity, and CI fixes.

The current changelog is repaired. The product gap is that the release path generated
an invalid presentation of release history and required a follow-up commit.

This matters because changelogs are user-facing product evidence. Duplicate entries
make it difficult to distinguish:

- one shipped capability;
- a merge commit;
- a squash/rebased implementation commit;
- an actual duplicate delivery.

**Required implementation**

Add a release-changelog invariant before publication:

- normalize entries by Conventional Commit type/scope/subject and associated PR;
- reject duplicate semantic entries in one version section;
- prove the `0.3.0` shape as a regression fixture;
- run the release-generated tree through the same documentation and changed-slice
  checks before the release commit becomes authoritative;
- make the release commit or release PR expose exact-head CI evidence.

Suggested PR:

```text
test(release): Reject duplicate semantic changelog entries
```

**Exit criterion**

A synthetic history containing both merge and underlying feature commits generates
one changelog bullet for the shipped semantic change.

## RR-02 — The exact current `main` head lacks visible PR-head CI evidence

**Severity:** P2 evidence gap

PR #1977 has complete green PR-head evidence. The current `main` head is a later
release-fix commit and has no connector-visible PR-triggered run or status context.

This is not a claim that the code is broken. It is a claim that repository evidence
for the exact released tree is weaker than repository evidence for the functional PR
head.

A mature release rail should prove the release-generated tree, not only the last
functional contribution before release automation rewrites version and changelog
files.

**Required implementation**

Choose one explicit policy:

1. release changes are made through a PR and receive the normal merge gate; or
2. post-merge release commits trigger a release validation workflow that verifies
   formatting, docs, generated artifacts, package/version consistency, changelog
   uniqueness, and repository cleanliness.

Record the exact release SHA in release evidence.

## RR-03 — The canonical implementation-status page is months stale

**Severity:** P1 current-truth defect

`docs/architecture/system-delivery-status.md` says:

```text
This page is the current implementation snapshot for the repository.
```

Its front matter and snapshot are dated `2026-04-26`.

It predates the July implementation of:

- dbt project file projection;
- protected dbt project import;
- file-authoritative Preview and Run;
- workspace-file revision/CAS and batch mutation infrastructure;
- execution-selection intent hardening;
- graph-source ownership protection;
- Planning DB ordinal identity hardening;
- release `0.3.0`.

`README.md` compounds the drift by linking to the same page while stating that its
`last_reviewed` date is `2026-04-02`, which is inconsistent with the file's actual
`2026-04-26` date.

This is not a cosmetic documentation problem. Agents and contributors are explicitly
told to start there for implementation truth.

**Required implementation**

Create one mechanically refreshed product-capability status tied to the current
`main` SHA. It should include:

- capability state: implemented, partial, blocked, or not started;
- owning contract, route, component, and package;
- required test and live-proof references;
- current release gate or open blocker;
- generation timestamp and reviewed SHA;
- freshness failure when a material capability changes without regenerating the
  snapshot.

The handwritten System Delivery Status page should become interpretation and routing,
not the only current inventory.

Suggested PR:

```text
ci(status): Generate current product capability truth
```

## RR-04 — Tracked planning pages link to intentionally untracked generated pages

**Severity:** P2 documentation-product bug

Tracked pages such as:

- `docs/planning/state/planning-dashboard.md`;
- `docs/planning/state/planning-control-tower.md`;

link to:

- `docs/planning/state/execution-workboard.md`;
- `docs/planning/state/open-task-route.md`.

The generated-document policy explicitly classifies those two artifacts as
`tracking: untracked` under `planning-local-workboard-views`.

On GitHub at current `main`, `open-task-route.md` is not present. A contributor who
follows the tracked dashboard therefore receives a dead link unless they first run a
local generator.

The generator policy is internally coherent, but the navigation product is not.

**Required implementation**

Choose one of these models:

- commit stable pointer pages that explain the source query and generation command;
- render and publish the generated pages in the documentation site pipeline;
- replace direct links with a tracked query guide and a checked fallback snapshot;
- or track the generated artifacts if they are intended as first-class reading
  surfaces.

Add a docs link check that understands generated-policy classes and rejects tracked
links to absent untracked targets unless an explicit local-only marker is present.

Suggested PR:

```text
fix(docs): Keep planning navigation valid from tracked sources
```

## RR-05 — Repository coverage policy and product risk are misaligned

**Severity:** P1 quality-system gap

Root coverage configuration includes only:

```text
packages/@dvt/engine/src/**/*.ts
```

Thresholds are:

```text
statements 65
branches   55
functions  65
lines      65
```

Root `ci:full` terminates with `test:coverage:engine`.

API and Web have extensive test suites, architecture checks, and live proofs, but no
required coverage baseline or changed-code ratchet. The highest current product risk
now lives in:

- Web state transitions and reconciliation;
- API authority/admission boundaries;
- revision matching and compare-and-swap;
- idempotency and compensation;
- project analysis and execution identity;
- conflict and recovery behavior.

Those decision paths are not covered by the root threshold policy.

`README.md` also says contributors should “maintain 80%+ coverage,” which does not
match the actual enforced root thresholds or their Engine-only scope.

**Required implementation**

Create a versioned product-quality policy and scorecard:

1. publish current API and Web baselines without blocking;
2. fail on baseline decreases;
3. add changed-code coverage for API and Web;
4. require at least 90% branch coverage for authority, revision, idempotency,
   compensation, admission, and security-policy modules;
5. converge general API/Web targets toward 80% statements/lines, 75% functions, and
   70% branches;
6. retain architecture and live-browser proofs as separate evidence, not substitutes
   for code-path coverage.

Suggested PR sequence:

```text
ci(quality): Add product quality policy and scorecard
ci(test): Add API and Web coverage ratchets
```

## RR-06 — The accepted dbt round-trip plan now contains stale current-state claims

**Severity:** P1 planning/architecture truth defect

The accepted plan
`docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md`
was last reviewed on `2026-07-12` and describes several foundations as absent:

- Code edits are a local-only buffer;
- workspace file writes have no revision guard;
- no batch mutation boundary exists;
- no server dbt analyzer exists;
- runtime bundling lacks project identity;
- file-backed Preview/Run is absent.

Current code now contains:

- `WorkspaceFileContent.contentSha256`;
- mandatory `ExpectedWorkspaceFileRevision`;
- conditional save conflict results;
- `WorkspaceFileRevisionConflictError`;
- `WorkspaceFileBatchMutation` and idempotent receipts;
- file-backed project analysis, projection, Preview, and Run;
- protected import and authority binding.

The target architecture remains useful, but its current-state analysis is now
historical. An implementation agent reading it literally can reimplement already
shipped infrastructure or reopen rejected architecture alternatives.

**Required implementation**

Reconcile the accepted plan against current `main`:

- mark phases 2–4 implemented with evidence links;
- move old “current code lacks…” sections into historical findings;
- preserve the accepted authority and lossless-edit constraints;
- define the next phase as a complete user transaction, not a generic visual-edit
  capability;
- link the next task to current contracts and existing CAS/batch boundaries.

Suggested PR:

```text
docs(dbt): Rebase round-trip plan on release 0.3.0
```

## RR-07 — The next dbt visual-edit phase is not yet a complete product transaction

**Severity:** P1 product-direction gap

DVT now has the foundations required to attempt a conservative visual edit. It does
not yet implement a repository-owned proposal/diff/apply/revert transaction for a
Canvas-originated dbt YAML mutation.

No implementation was found for concepts equivalent to:

```text
DbtYamlEditProposal
ProposeDbtYamlDescriptionEdit
unifiedDiff
conditional revert
```

The next vertical should edit only one model description in `schema.yml`.

### Required transaction

```text
current project and file revision
  -> proposed semantic description edit
  -> CST-preserving candidate content
  -> visible unified diff
  -> user confirmation
  -> conditional write with expected file revision
  -> conflict or immutable receipt
  -> dbt re-analysis
  -> same resource unique_id
  -> Preview
  -> Run
  -> reopen
  -> description preserved
  -> optional conditional revert
```

### Proposed contract shape

```ts
type ProposeDbtYamlDescriptionEditInput = {
  canvasId: string;
  projectRoot: string;
  resourceUniqueId: string;
  nextDescription: string;
  expectedProjectRevision: string;
  expectedFileRevision: string;
};

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

The proposal must not persist immediately.

Apply through the existing workspace-file mutation boundary with mandatory
compare-and-swap. A conflict must expose explicit base/current/proposed references and
must not auto-merge.

### Preservation proof

Positive proof:

```text
import
  -> inspect model
  -> edit description from Canvas
  -> review diff
  -> apply
  -> re-analyze
  -> preserve unique_id
  -> Preview
  -> Run
  -> reopen
  -> preserve description
```

Negative proof:

- comments remain;
- key ordering remains where the CST library supports it;
- unrelated YAML remains byte-stable or follows one explicit normalization policy;
- anchors, aliases, custom keys, and unsupported constructs become `code_only` or
  fail safely;
- a stale file revision yields conflict and never overwrite;
- revert is a conditional inverse mutation, not an unconditional write;
- arbitrary SQL/Jinja is not rewritten;
- no generic visual-mutation endpoint is introduced.

### Required PR decomposition

```text
feat(contracts): Add DBT YAML edit proposal contract
feat(api): Propose revision-bound DBT description edit
feat(web): Review DBT YAML edit diff from Canvas
feat(api): Apply conditional DBT YAML description edit
feat(web): Handle conflict and conditional revert
test(dbt): Prove description edit round trip live
```

Do not combine all six into one PR.

## RR-08 — API and Contracts still use different Zod major versions

**Severity:** P2 boundary and dependency drift

Current package declarations are:

```text
apps/api                  zod ^3.0.0
packages/@dvt/contracts   zod ^4.3.6
```

API consumes Contracts. Two validation-runtime majors at the application boundary
create avoidable risk around:

- error shapes;
- transforms and refinements;
- schema composition;
- inferred types;
- bundle duplication;
- future contract migration behavior.

**Required implementation**

- inventory direct API-local Zod 3 schemas;
- move shared boundary schemas into Contracts where ownership belongs there;
- migrate focused API schemas to Zod 4 with compatibility tests;
- add a dependency policy that rejects multiple major versions of boundary
  libraries unless an expiring exception is recorded.

Suggested PR:

```text
refactor(api): Converge boundary validation on Zod 4
```

## RR-09 — Web test breadth is not matched by non-functional release budgets

**Severity:** P1 product-quality gap

The Web package has substantial functional, presentation, architecture, Canvas,
Monaco, shell, workspace-service, Cypress, and live-proof suites.

It also carries a large runtime dependency surface including:

- MUI and Emotion;
- Monaco;
- React Flow;
- Radix components;
- charts;
- motion;
- drag and drop;
- multiple substantial interaction libraries.

No package script was found for:

- accessibility acceptance;
- bundle-size budgets;
- initial route performance;
- Canvas-ready latency;
- large-graph interaction benchmarks.

Open issues still include:

- #158 — performance tests for 50k nodes;
- #168 — observability, accessibility, and performance epic;
- #187 — keyboard and screen-reader accessibility;
- #188 — performance budget for large graphs.

**Required implementation**

Create independent, deterministic release evidence:

- automated accessibility checks for critical browser journeys;
- keyboard-only Canvas and workbench flows;
- deterministic bundle manifest and approved budgets;
- lazy-load proof for Monaco, terminal, charts, and optional surfaces;
- startup, Canvas-ready, selection, pan/zoom, and Code activation budgets;
- 1k, 10k, and 50k-node benchmark artifacts;
- approved-regression waiver with expiry.

Suggested PR sequence:

```text
ci(web): Add accessibility acceptance baseline
ci(web): Add bundle and route-performance budgets
perf(canvas): Add graph-scale benchmark lane
```

## RR-10 — Production operability remains documented debt, not proven capability

**Severity:** P1 production-readiness gap

Open repository work includes:

- #18 — load testing and chaos suite;
- #409 — independent outbox worker scale-out hardening;
- #413 — single-owner canary and rollback wiring;
- #414 — multi-worker ordering strategy;
- #447 — automated canary CI lane;
- #448 — canary evidence and acceptance alignment.

The repository has strong runtime contracts and extensive correctness work. It should
not claim production-scale maturity until it proves:

- one selected multi-worker ordering strategy;
- duplicate delivery and crash-window behavior;
- single-owner canary activation and rollback;
- sustained load targets;
- PostgreSQL restart/failover recovery;
- worker restart recovery;
- Temporal interruption recovery;
- network-delay and lock-contention behavior;
- observed recovery objectives.

The status vocabulary should distinguish:

- “closed for Phase 1 implementation”; from
- “production-like scale and failure evidence complete.”

**Required implementation order**

1. complete the selected multi-worker ordering strategy;
2. prove duplicate delivery and crash windows;
3. automate canary ownership and rollback;
4. run the documented throughput baseline;
5. inject database, worker, Temporal, and network failures;
6. publish measured recovery evidence;
7. expose the same state in one correlated operator view.

## RR-11 — GitHub Issues still contain stale or superseded product stories

**Severity:** P2 planning-authority drift

Open dbt issues include generic historical stories such as:

- #134 — dbt artifact ingestion;
- #139 — isolated dbt Core runner;
- #141 — dbt Cloud API v2 integration;
- #156 — dbt golden tests.

Current repository code already contains substantial artifact, isolated runner,
analysis, import, Preview, Run, and live-proof capability. These issues cannot be
interpreted as current product truth without Planning DB reconciliation.

Open issue #73 also describes determinism across all adapters and lists Conductor,
while current architecture says Temporal is the only active production runtime and a
second provider requires a new ADR-backed contract and composition path.

**Required implementation**

- keep Planning DB as task-status authority;
- keep GitHub as collaboration surface;
- link every active issue to an effective Planning DB task;
- mark historical/superseded stories explicitly;
- close or quarantine issues whose acceptance has already been delivered under a
  different current task;
- do not silently create active work from old issue text.

Suggested PR/tooling:

```text
ci(planning): Reconcile GitHub issues with effective Planning DB tasks
```

## RR-12 — Governance change amplification remains a maintainability risk

**Severity:** P2 delivery-system debt

PR #1977 was necessary and well reviewed. It also demonstrates the ongoing cost of
repository governance changes:

- eight commits;
- four new Planning DB migrations (`722`–`725`);
- substantial migrator and test expansion;
- repeated review rounds to preserve append-only history, shared-worktree behavior,
  canonical rail ownership, numeric ordering, and concurrency.

This work fixes a real correctness problem and should not be removed. The Fowler
signal is that governance behavior still requires broad, migration-heavy change for
policy refinement.

The same pattern was more severe in PR #1971, where review-driven feature metadata
produced a long migration chain.

**Required direction**

Introduce a governance change-amplification policy:

```text
product or governance fact
  -> one canonical declarative evidence manifest
  -> generated/upserted current-state projection
  -> migration only for schema changes or durable historical events
```

Recommended rules:

- schema changes use migrations;
- durable product facts may use one migration per coherent slice;
- review-only metadata corrections update the same declarative source;
- generated outputs are reviewed as generated outputs, not parallel hand-authored
  truth;
- unusually high governance-only file counts require an architecture waiver;
- applied migration history remains immutable.

This must be introduced without weakening the new ordinal and append-only identity
protections.

## Architectural assessment

### Architecture strengths

Current DVT strengths are real:

- explicit authoring authority;
- protected command/query rails;
- stable dbt `unique_id` projection;
- project revision and analysis identity;
- compare-and-swap workspace mutation;
- batch mutation and idempotent receipts;
- file-backed Preview and Run;
- fail-closed execution selection;
- TypeScript-resolved architecture guards;
- Planning DB migration identity protection;
- strong deterministic, architecture, and live-browser evidence.

The repository is no longer missing architectural foundations for dbt product work.

### Current drift pattern

The dominant drift is no longer “code ignores architecture.” It is:

```text
current code advances quickly
  -> accepted plans and status pages remain historical
  -> tracked navigation points at local-only outputs
  -> old GitHub issues remain open
  -> agents receive multiple incompatible descriptions of what is current
```

That is an authority-distribution problem.

Planning DB may be operational authority, but a product and architecture system also
needs a usable, mechanically current reading surface for humans and agents who have
not initialized the local database.

### Product maturity assessment

DVT now supports a credible read/edit-code/preview/run dbt vertical. Product maturity
is still limited by:

- lack of one safe Canvas-originated mutation transaction;
- weak product-wide quality budgets;
- incomplete accessibility and scale evidence;
- incomplete operational failure evidence;
- stale current-state communication;
- no mature deployment/schedule/backfill aggregate.

The correct response is not another broad architecture phase. It is to complete small
end-to-end user transactions and make quality evidence executable.

## Recommended route

## Gate 0 — Validate the released tree and release rail

1. add a duplicate-changelog regression fixture;
2. make release-generated commits receive exact-head validation;
3. record the release SHA and validation URL;
4. keep release metadata changes documentation/configuration-only;
5. do not infer exact-head quality only from the preceding functional PR.

## Gate 1 — Restore one usable current-state truth

Deliver:

- generated product capability status tied to current `main` SHA;
- reconciliation of System Delivery Status and README dates;
- reconciliation of the dbt round-trip plan with phases 2–4;
- tracked navigation that does not lead to absent local artifacts;
- freshness checks for capability-changing PRs.

Suggested PRs:

```text
ci(status): Generate current product capability truth
fix(docs): Keep planning navigation valid from tracked sources
docs(dbt): Rebase round-trip plan on release 0.3.0
```

## Gate 2 — Establish the product-quality baseline

Deliver:

- versioned quality policy;
- API/Web coverage baselines and ratchets;
- accessibility baseline;
- bundle and route-performance budgets;
- graph-scale benchmark lane;
- generated scorecard with current values and blockers.

The first scorecard may be non-blocking. Regression must become blocking before a
broad product feature lands.

## Gate 3 — First lossless dbt visual edit

Implement only a model description edit in `schema.yml`.

Mandatory behavior:

- proposal before persistence;
- visible diff;
- explicit confirmation;
- compare-and-swap apply;
- first-class conflict state;
- re-analysis and identity reconciliation;
- Preview and Run against the new exact revision;
- reopen proof;
- conditional revert;
- preservation fixtures;
- `code_only` fallback for unsupported YAML.

Do not add:

- arbitrary SQL/Jinja rewrite;
- generic visual mutation;
- browser-authoritative dbt parsing;
- unconditional file writes;
- silent auto-merge;
- a duplicate dbt-specific file-save route.

## Gate 4 — Production operability

Deliver in order:

1. multi-worker ordering;
2. duplicate/crash-window proof;
3. automated canary/rollback;
4. load baseline;
5. chaos/recovery lane;
6. correlated Canvas/PlanRef/run/worker/result telemetry;
7. resilient frontend progress/reconnection state.

## Gate 5 — Deployment, schedule, and backfill domain

Start only after safe authoring and core operability gates are green.

Do not attach `cron` directly to Canvas.

Introduce a versioned deployment aggregate that binds:

- exact project/canvas authority and revision;
- environment;
- execution target;
- parameters;
- schedule or event trigger;
- queue/work-pool equivalent;
- concurrency and collision policy;
- retry/admission policy;
- deployment version and audit metadata.

Backfill must be a separately admitted command with:

- range/partition selection;
- reprocessing policy;
- dry-run preview;
- maximum active runs;
- ordering;
- exact deployment revision;
- immutable receipt.

## Proposed release gates for the next maturity milestone

DVT should not describe the next milestone as product-mature unless:

- exact current `main` has release-tree validation evidence;
- current capability status is generated from current `main`;
- tracked planning navigation has no local-only dead links;
- API and Web changed code are coverage-gated;
- the first dbt visual edit has diff, CAS conflict, revert, re-analysis, Preview,
  Run, and reopen proof;
- critical browser journeys pass automated accessibility checks;
- bundle and graph-scale budgets are enforced;
- at least one production-like load/chaos lane passes;
- outbox multi-worker ordering and canary rollback are automated;
- operator telemetry correlates Canvas, PlanRef, run, worker, and result;
- open GitHub issues are reconciled against Planning DB authority;
- boundary validation dependencies converge or carry an expiring waiver.

## Immediate instruction for the implementation GPT

Do not reopen the selection, graph-source ownership, or migration-ordinal findings
closed by PRs #1971, #1976, and #1977.

Proceed in this order:

1. validate and harden the release/changelog rail;
2. restore generated current-state truth and valid tracked navigation;
3. reconcile the accepted dbt plan with current code;
4. add the product quality scorecard and API/Web ratchets;
5. implement one revision-bound YAML description edit with diff, conflict, revert,
   re-analysis, Preview, Run, and reopen proof;
6. converge Zod boundary versions;
7. harden accessibility, bundle, graph scale, load, chaos, canary, ordering, and
   correlated operability;
8. only then design deployment, scheduling, and backfill.

The repository does not need another claim of broad architectural completion. It
needs current truth, smaller PRs, exact release evidence, executable quality budgets,
and one fully completed user transaction at a time.

## Evidence index

### Repository and commits

- Repository: <https://github.com/dunay2/dvt>
- Current reviewed commit:
  <https://github.com/dunay2/dvt/commit/459aecb76edc87fbcf984db2f4160cab01a9e246>
- Release commit:
  <https://github.com/dunay2/dvt/commit/c72686c420edca96d4079426bd878354ec97af92>

### Pull requests

- Selection intent: <https://github.com/dunay2/dvt/pull/1971>
- Graph-source ownership guard: <https://github.com/dunay2/dvt/pull/1976>
- Planning DB ordinal uniqueness: <https://github.com/dunay2/dvt/pull/1977>

### Current repository sources

- System Delivery Status:
  <https://github.com/dunay2/dvt/blob/main/docs/architecture/system-delivery-status.md>
- Planning Dashboard:
  <https://github.com/dunay2/dvt/blob/main/docs/planning/state/planning-dashboard.md>
- Planning Control Tower:
  <https://github.com/dunay2/dvt/blob/main/docs/planning/state/planning-control-tower.md>
- Generated docs policy:
  <https://github.com/dunay2/dvt/blob/main/docs/generated-docs-policy.json>
- Accepted dbt round-trip plan:
  <https://github.com/dunay2/dvt/blob/main/docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md>
- Workspace file authority/CAS port:
  <https://github.com/dunay2/dvt/blob/main/apps/api/src/application/ports/workspaceFiles.ts>
- Root coverage configuration:
  <https://github.com/dunay2/dvt/blob/main/vitest.config.ts>
- Root scripts:
  <https://github.com/dunay2/dvt/blob/main/package.json>
- API package:
  <https://github.com/dunay2/dvt/blob/main/apps/api/package.json>
- Contracts package:
  <https://github.com/dunay2/dvt/blob/main/packages/@dvt/contracts/package.json>
- Web package:
  <https://github.com/dunay2/dvt/blob/main/apps/web/package.json>

### Open operational and product issues

- Load and chaos: <https://github.com/dunay2/dvt/issues/18>
- Determinism/adapters: <https://github.com/dunay2/dvt/issues/73>
- 50k-node performance: <https://github.com/dunay2/dvt/issues/158>
- Frontend observability/a11y/performance: <https://github.com/dunay2/dvt/issues/168>
- Keyboard and screen-reader accessibility: <https://github.com/dunay2/dvt/issues/187>
- Large-graph performance budget: <https://github.com/dunay2/dvt/issues/188>
- Outbox scale-out epic: <https://github.com/dunay2/dvt/issues/409>
- Canary and rollback: <https://github.com/dunay2/dvt/issues/413>
- Multi-worker strategy: <https://github.com/dunay2/dvt/issues/414>
- Automated canary CI: <https://github.com/dunay2/dvt/issues/447>
- Canary evidence alignment: <https://github.com/dunay2/dvt/issues/448>
