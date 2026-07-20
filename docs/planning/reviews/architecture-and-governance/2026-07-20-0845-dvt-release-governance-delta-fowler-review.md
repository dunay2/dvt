---
title: DVT release-governance delta Fowler review and implementation route
date: 2026-07-20T08:45:00+02:00
status: current-review
reviewed_main_sha: 8eb0f5a7551d46c909a024b86f66cf3580c20691
scope: documentation-only
supersedes: 2026-07-20-0439-dvt-no-product-delta-fowler-review.md
---

# DVT release-governance delta Fowler review and implementation route

## Purpose

This is a point-in-time repository, architecture, product, and delivery review for the implementation
agent working in [`dunay2/dvt`](https://github.com/dunay2/dvt). It reviews the exact current `main`,
recent commits, every visible open pull request, relevant pull-request heads, workflow identity, review
threads, release state, and the current product code that owns DBT project authority, Code persistence,
semantic reconciliation, Canvas projection, Preview/Run provenance, workspace mutation, and release
evidence.

The review also samples current contracts, API and Web ports, runtime adapters, tests, governance,
operability, accessibility, performance and scale policy, security boundaries, data integrity, recovery,
and current-state documentation. It compares DVT with mature systems only where the comparison produces
a useful invariant. It does not recommend copying another product wholesale.

This change is documentation-only. It does not authorize a merge and does not replace Planning DB as
current work authority. It changes no runtime code, workflow, dependency, contract, migration, generated
artifact, release metadata, or product behavior.

The execution environment could not resolve `github.com` for a local clone, so no local test execution
is claimed. Repository objects, code, pull requests, workflow results, jobs, logs, and review threads were
read through the GitHub connector. The connector exposed the failing PR Quality Gate step for PR #2002,
but its returned log was truncated before the underlying Planning DB exception. This report therefore
does not invent a more specific SQL cause.

## Exact reviewed identities

- Repository: [`dunay2/dvt`](https://github.com/dunay2/dvt)
- Exact current `main`: [`8eb0f5a7551d46c909a024b86f66cf3580c20691`](https://github.com/dunay2/dvt/commit/8eb0f5a7551d46c909a024b86f66cf3580c20691)
- Current main merge: [PR #1996 — Harden DBT code persistence reconciliation](https://github.com/dunay2/dvt/pull/1996)
- New functional branch under review: [`fix/release-candidate-integrity`](https://github.com/dunay2/dvt/tree/fix/release-candidate-integrity)
- New functional PR: [PR #2002 — Enforce trusted release candidate integrity](https://github.com/dunay2/dvt/pull/2002)
- PR #2002 head: [`28690074a6aa2e6f463340bb4baf02cb6a8d1c9c`](https://github.com/dunay2/dvt/commit/28690074a6aa2e6f463340bb4baf02cb6a8d1c9c)
- Open release candidate: [PR #1984 — Release 0.5.0](https://github.com/dunay2/dvt/pull/1984)
- Previous current-state review: [PR #2001 — Validate unchanged DVT Fowler route at 0439](https://github.com/dunay2/dvt/pull/2001)
- This review branch: `agent/dvt-review-20260720-0845`

## Executive verdict

There is still **no product-code delta on `main`**. The central product route remains valid:

1. separate Code persistence from semantic reconciliation and close the edit/revert race;
2. bind reconciliation to an exact whole-project revision;
3. publish generated DBT artifacts through the existing atomic batch authority;
4. admit Preview and Run only against the exact accepted project revision;
5. repair workspace capability truth and then extract a cohesive authoring-session boundary.

There is, however, a material repository delta since the preceding review: PR #2002 implements a real
release-candidate integrity boundary. Its core direction is good. It separates privileged Release Please
generation from base-trusted candidate assessment, reads immutable Git objects, checks exact candidate
parentage and artifact scope, normalizes changelog identity, validates repository merge policy, and avoids
executing candidate code in a write-capable context.

PR #2002 is **not merge-ready**:

- PR Quality Gate fails at `Prepare planning DB for DB-backed validation`;
- two non-outdated P2 review threads are unresolved;
- one security-hardening change removes the permission still required by the existing labeler;
- another removes persisted Git credentials before the base-ref fetch action, making the workflow depend
  on public anonymous fetches;
- the operator-side repository/ruleset configuration command performs two external writes without a
  compensating rollback if the second write fails.

The branch is a meaningful advance, not a fix for the product transaction. It must not be used to justify
merging release PR #1984. The release candidate still has duplicate/topology-heavy notes, six workflows in
`action_required`, and a known user-visible P2 semantic-truth defect remains in `main`.

## Material delta since the preceding review

### New functional work: PR #2002

PR #2002 is one commit over the exact reviewed `main`, changes twenty files, and adds 3,229 lines while
removing 45. It touches:

- release generation and candidate-assessment workflows;
- PR Quality Gate permissions and checkout posture;
- a pure release-candidate specification;
- an immutable Git-object adapter;
- a GitHub merge-policy adapter;
- workflow and CLI tests;
- Release Please configuration;
- CI governance documentation;
- Planning DB migrations 773 through 777.

The positive delta is substantial:

- Release Please remains the generator rather than becoming the release authority.
- Candidate admission is loaded from the trusted PR base via `pull_request_target`.
- Candidate code is checked out without credentials and is inspected as Git data rather than installed or
  executed.
- The candidate must be one commit whose parent and merge base equal the exact current `main` SHA.
- Only the manifest, package version, and changelog may change.
- Package, manifest, and changelog versions must agree, increase, and remain pre-1.0.
- Changelog entries are normalized to pull-request or commit identities and duplicates are rejected.
- Repository policy is projected explicitly and expected to be squash-only with strict required checks.
- Release generation no longer owns candidate admission.

### New blocking evidence

The exact PR #2002 head has five successful workflows and one failed workflow:

- Dependency Review: success;
- Contracts & Determinism: success;
- CI - Code Quality: success;
- Test Suite: success;
- CodeQL: success;
- PR Quality Gate: failure.

The failing job is `PR Quality Checks`; its first failing step is `Prepare planning DB for DB-backed
validation`. All subsequent governance, documentation, architecture, PR-title, size, and labeling steps
are skipped. The final aggregation job also fails. The available connector log is truncated before the
specific Planning DB exception, so the exact migration or assertion responsible remains unverified.

### New unresolved review threads

PR #2002 has two unresolved, non-outdated P2 threads:

1. `pull-requests: write` was reduced to `pull-requests: read`, but the same workflow later executes
   `actions/labeler`. The labeler cannot add labels with a read-only token.
2. `persist-credentials: false` is set before `.github/actions/fetch-scope-base`, whose relevant operation
   is an ordinary `git fetch`. That fetch succeeded here because the repository is public, but the workflow
   becomes unauthenticated and is not portable to private or internal repository visibility.

### No new product implementation

`main` remains exactly `8eb0f5a7551d46c909a024b86f66cf3580c20691`. No Code, Canvas, API, runtime,
contract, or product behavior changed after the previous review. The unresolved PR #1996 P2 therefore
remains active, as do exact-project revision binding and atomic publication gaps.

## Current GitHub state

### Recent commits on main

The newest visible sequence remains:

1. `8eb0f5a7551d46c909a024b86f66cf3580c20691` — merge PR #1996;
2. `de5ecc45947e69177e8f010adb7b5d4fc64fd21e` — prevent in-flight DBT edits from being lost;
3. `2a895f85e1d2ddb6c11b6038c9b8ddf7fe363fce` — persist edits made during DBT reconciliation;
4. `1bef79c0d3919039806a2663662aeeae6da37643` — restore live DBT workspace-file proof;
5. `6a5a937086f8d787b67bce03d7bd599f2ea90fd1` — align DBT authoring architecture with Code authority;
6. `50586b48fe51231ad6035c956a3f6c9ef6d5c269` — decouple file persistence from reconciliation;
7. `353ac8c724e51e703eaa7c5b9ff5db657fafb5f7` — merge PR #1993.

There is no newer commit on `main`.

### Visible open pull requests

| PR | State | Head | Verdict |
| --- | --- | --- | --- |
| [#2002](https://github.com/dunay2/dvt/pull/2002) | Open, ready, mergeable metadata | `28690074a6aa2e6f463340bb4baf02cb6a8d1c9c` | Functional CI/governance advance; not merge-ready because PR Quality Gate fails and two P2 threads remain unresolved. |
| [#2001](https://github.com/dunay2/dvt/pull/2001) | Open, draft, mergeable | `859cf447d6fc2a4acaaf9b4bcdf56540efe3e411` | Documentation-only predecessor; superseded as current-state guidance by this report. |
| [#2000](https://github.com/dunay2/dvt/pull/2000) | Open, draft, mergeable | `8b54cc1b4ad1f284f345c01d7eb4e4b3ee589ac8` | Documentation-only predecessor; superseded. |
| [#1999](https://github.com/dunay2/dvt/pull/1999) | Open, draft, mergeable | `856d1e387e0d001722d80daab3fd21a4deff87e9` | Documentation-only predecessor; superseded. |
| [#1984](https://github.com/dunay2/dvt/pull/1984) | Open, ready, mergeable metadata | `15783c8dddfd57e4a34ef282e6d919ead2956ef9` | Not release-ready; stale candidate, duplicate notes, six `action_required` workflows, and known product blocker. |

Three superseded current-state review PRs remain open. This is low-grade duplicate authority: readers and
agents can encounter multiple documents all claiming current status. The older drafts should be closed or
explicitly retained as historical evidence; they should not be merged as competing current truth.

### Relevant branch work

The only visible unmerged functional branch represented by an open PR is
`fix/release-candidate-integrity`. Other visible heads are the release branch and documentation review
branches. The branch-search connector still returns no results even for known PR heads, so this review does
not claim a complete inventory of every remote branch. It claims only what is defensible from visible PRs,
commits, and known heads.

## CI and exact-tree identity

### Exact current main

`main@8eb0f5a7551d46c909a024b86f66cf3580c20691` has no connector-visible workflow run. PR #1996's final
head had six successful workflows, but that is PR-head evidence, not a machine-readable check attached to
the exact merge tree now published as `main`.

This remains an operability and release-truth gap. A mature release process admits the exact tree that will
be tagged or deployed, not a nearby parent or ephemeral merge simulation.

### PR #2002

Head `28690074a6aa2e6f463340bb4baf02cb6a8d1c9c`:

| Workflow | Result |
| --- | --- |
| Dependency Review | success |
| Contracts & Determinism | success |
| CI - Code Quality | success |
| Test Suite | success |
| CodeQL | success |
| PR Quality Gate | **failure** |

The failing workflow stops in Planning DB preparation. This is especially important because the PR claims
to mechanize the new release boundary through five migrations. Unit and component tests are not enough
when the repository's actual DB-backed governance bootstrap rejects the branch.

### Documentation review PR #2001

Head `859cf447d6fc2a4acaaf9b4bcdf56540efe3e411` has PR Quality Gate and Code Quality success; the four
runtime/security-heavy lanes are skipped by the documentation path policy. That is appropriate for one
Markdown file and proves only documentation compliance.

### Release PR #1984

Head `15783c8dddfd57e4a34ef282e6d919ead2956ef9` has all six visible workflows in `action_required`:

- Test Suite;
- PR Quality Gate;
- Contracts & Determinism;
- Dependency Review;
- CI - Code Quality;
- CodeQL.

`mergeable: true` is not release evidence. The release remains blocked.

## Review-thread state

### PR #2002

#### Unresolved P2 — labeler permission regression

The PR Quality Gate still has a labeling responsibility but the workflow-level token is reduced to
`pull-requests: read`. This is responsibility conflict inside one job: security hardening changed the token
contract without moving the write-requiring capability behind its own authority boundary.

The robust correction is not to restore broad write permission to every required check step. Split labeling
into a separate non-authoritative job or workflow with only the minimal write permission, while the required
quality checks remain read-only.

#### Unresolved P2 — unauthenticated base-ref fetch

The checkout opts out of persisted credentials before the next local action invokes `git fetch`. Anonymous
fetch is adequate for this public repository today, but authentication behavior becomes an accidental
property of repository visibility. The local fetch action should own an explicit read token/header or the
credential should remain until the fetch completes and then be removed.

### PR #1996

Two P1 threads are resolved, non-outdated, and supported by implementation commits:

- editing during DBT reconciliation no longer lets `flush()` approve the later buffer before it is saved;
  fixed in `2a895f85e`;
- editing while the original persistence request is in flight no longer lets the old acknowledgement hide
  the later buffer; fixed in `de5ecc459`.

One P2 thread remains unresolved and non-outdated on
[`codeWorkingTreeSyncModel.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts):

- reconciliation is pending for persisted bytes `A`;
- the user edits to `B`, moving the scalar phase to `modified`;
- the user returns the buffer to `A` before reconciliation completes;
- `persistedReconciliationPhase` is still null, so the reducer reports `synchronized`;
- the later matching result is rejected because completion requires `phase === 'reconciling'`;
- invalid, stale, unavailable, superseded, verification-unavailable, or failed semantic truth can disappear.

### PR #1984

The release PR has no inline review threads. Absence of discussion does not clear objective blockers.

## Previous finding disposition

| Finding | Current status | Evidence and interpretation |
| --- | --- | --- |
| Raw selection-recovery transport detail shown to users | **Fixed** | Localized, sanitized product copy replaced direct raw error rendering. |
| Manual project file selection snaps back | **Fixed** | Corrected and regression-tested in PR #1993. |
| Node-to-project scope switch retains stale selected file | **Fixed** | Corrected and regression-tested in PR #1993. |
| Router presentation test fails at the `AbortSignal` realm boundary | **Fixed** | Corrected with a test adapter; this was not a production architecture defect. |
| Edit during persistence can be lost | **Fixed** | PR #1996 retains the later buffer and requires the second save. |
| Edit during reconciliation can be approved before the later save | **Fixed** | PR #1996 returns the buffer to modified and serializes the second save. |
| Pending reconciliation disappears after edit/revert | **Still active** | Exact reducer path and unresolved non-outdated PR #1996 P2 thread. |
| File save receipt is not bound to the exact whole-project revision | **Still active** | The Canvas callback receives `_receipt` but ignores it and refetches latest projection. |
| Graph-generated artifacts can partially mutate a project | **Still active** | `canvasPlanAction.ts` performs sequential single-file saves while an atomic API batch port already exists. |
| Release notes duplicate merge/parent outcomes | **Still active** | PR #1984 still contains duplicated execution-selection recovery and exposes commit topology. |
| No trusted release-candidate admission boundary exists | **Superseded as a route, not fixed in main** | PR #2002 implements the right boundary on an unmerged, failing branch; current `main` still lacks it. |
| Exact release/main tree lacks attached validation evidence | **Still active** | Exact `main` has no visible run; release head checks are `action_required`; PR #2002 is not merged. |
| Accepted project scale differs from interactive workspace capability | **Still active** | Import and interactive limits remain inconsistent. |
| Web workspace responses are runtime-schema validated | **Disproved** | Nearby import rails parse shared schemas; workspace tree/content/save adapters still rely on generic casts. |
| Human current-state documentation is current | **Disproved** | The prior review verified `system-delivery-status.md` still presents old state as current. |
| File-backed Preview/Run have no provenance | **Disproved as a broad claim** | Existing execution strategy carries project content-set, analysis, dbt version, target, and selection provenance. The remaining gap is causal admission from Code reconciliation. |
| DVT needs a new mutation DSL | **Disproved** | The API already owns CAS writes, idempotent batch mutation, conflict results, and an atomic local gateway. |
| The release candidate is ready because GitHub marks it mergeable | **Disproved** | CI is not executed and known product/release defects remain. |

## Current product and architecture assessment

### Product value that is real

DVT is not merely a governance framework. Current `main` contains:

- file-authoritative DBT project import;
- exact content and analysis hashes in project graph projections;
- Canvas lineage projection;
- contextual SQL and YAML authoring;
- CAS single-file saves with immutable receipts;
- idempotent atomic batch mutation in the API/local adapter;
- Preview and Run provenance;
- protected browser proofs;
- architecture and feature-mechanization guards;
- meaningful recovery copy and navigation protection.

The recent merged work fixed real data-loss and selection defects. The criticism below is about an incomplete
transaction boundary, not absence of product.

### Fowler smell: responsibility overload

`CodeWorkingTreeSyncState.phase` owns all of the following:

- local buffer cleanliness;
- persistence in progress;
- persistence conflict/failure;
- semantic reconciliation pending;
- semantic freshness/degradation;
- verification availability;
- superseded authority.

One scalar has too many reasons to change. The product state is the Cartesian product of at least two
independent state machines but is encoded as one enum.

### Fowler smell: temporal coupling

Correctness depends on whether an edit arrives before persistence acknowledgement, after persistence but
before reconciliation, after semantic completion, or after another save receipt. The model has good tests
for several interleavings, but the unresolved P2 proves the representation still permits an unmodelled
sequence.

### Fowler smell: primitive obsession

`phase` strings act as an implicit protocol. Release candidate authority in PR #2002 also begins with a
branch-name prefix test. The candidate then receives strong exact-tree validation, so the prefix is not the
sole security control, but it is still a weak discovery primitive. A candidate identity should be projected
from the PR's base, head, repository, artifact set, and generator evidence rather than treated as a branch
naming convention.

### Hidden authority

The Canvas controller accepts a `WorkspaceFileSaveReceipt` but names it `_receipt` and ignores it. It then
refetches whatever project graph is latest. The UI receives `projectContentSetSha256` and `analysisSha256`,
but the result is not proven to be the project revision caused by the save the user is waiting for.

This is hidden authority because “latest query result” silently replaces “revision associated with this
operation.”

### Leaky abstraction

`releaseMergePolicyCli.mjs configure` owns a logical policy update spanning repository settings and a main
ruleset, but implements it as a repository PATCH followed by a ruleset PUT. It performs optimistic checks
before writes, yet if the first external write succeeds and the second fails, policy can be partially
changed. The abstraction promises one configured policy but leaks GitHub's two-resource mutation boundary.

This command is operator tooling, not part of candidate assessment, so it should either:

- produce an inspect/dry-run plan and require explicit operator application with a rollback receipt; or
- capture the original repository/ruleset projections and compensate the first write if the second fails;
- or be removed from the release PR and documented as an out-of-band administrative prerequisite.

### Shotgun surgery and governance amplification

PR #2002 introduces one release-admission capability across twenty files and five sequential migrations.
The separation of specification, Git adapter, GitHub adapter, workflow, tests, and documentation is
conceptually sound. The cost is still high: the actual remote PR fails during Planning DB preparation,
showing that governance amplification is not theoretical.

The answer is not to bypass governance. The answer is to reduce the number of migration rewrites needed to
represent one stable component, and to make the clean-database migration path a first-class test before the
branch claims implementation complete.

### Test-only confidence

PR #2002 reports successful local commands and five remote lanes are green. The authoritative required gate
still fails before most governance checks run. A release-control feature cannot claim completion while its
own repository bootstrap rejects it.

Likewise, PR-head green evidence does not equal exact-main or exact-tag evidence.

### Stale and duplicate truth

- release PR #1984 exposes internal commit topology as user outcomes;
- multiple open review PRs claim current status;
- human current-state documentation is stale;
- exact `main` lacks attached validation evidence;
- Code can display `synchronized` while semantic truth is pending or dropped.

These are one family of problem: a value is presented as authoritative after the evidence that justified it
has changed or was never causally bound.

## Mature-system comparison: Match / Differentiate / Defer

### dbt Studio and professional dbt authoring

Official dbt documentation describes Studio IDE as one web interface for building, testing, running, and
version-controlling dbt projects:
<https://docs.getdbt.com/docs/cloud/studio-ide/ide-user-interface>

**Match**

- distinguish unsaved editor state from persisted project files;
- distinguish persisted files from parse/compile/analysis state;
- expose diagnostics, command output, file navigation, and version-control posture separately;
- make Preview/Run act on an identifiable project revision.

**Differentiate**

- keep DVT's graph-first contextual authoring and bidirectional Code/Canvas projection;
- retain file authority rather than inventing a second canonical graph language.

**Defer**

- broad cloud collaboration, full Git hosting, and all dbt Cloud environment-management features until the
  core authoring transaction is correct.

### Dagster

Dagster presents a declarative asset model with integrated lineage, observability, and testability:
<https://docs.dagster.io/>.

**Match**

- connect materialized assets, lineage, checks, freshness, and execution evidence;
- make a failed quality check visible as product state, not only as a log line;
- allow users to inspect why an asset is stale or invalid.

**Differentiate**

- DVT's canonical authoring source remains DBT project files and DBT semantics;
- do not replace DBT resources with a parallel Dagster-like asset language.

**Defer**

- generalized asset orchestration, sensors, schedules, and cross-system asset catalog behavior until Code,
  Canvas, Preview, and Run share one revision identity.

### Airflow

Airflow DAG Bundles version everything required by a DAG and allow a run or rerun to use the same exact code
version even if the source changes during execution:
<https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/dag-bundles.html>.

**Match**

- Preview and Run must retain the exact project content-set revision they admitted;
- rerun/reopen must use or explicitly reject that revision;
- “latest files” must not silently substitute for the original admitted bundle.

**Differentiate**

- DVT revisions are DBT project content sets and analysis identities, not Python DAG bundles.

**Defer**

- general scheduler and executor semantics.

### Prefect

Prefect deployment versions support history, promotion, rollback, and execution pinned to a Git commit or
container image digest:
<https://docs.prefect.io/v3/how-to-guides/deployments/versioning>.

**Match**

- preserve immutable revision metadata for a published project state;
- support explicit promotion/rollback only after DVT has a stable project publication receipt;
- show which code/configuration revision produced a Preview or Run.

**Differentiate**

- the immediate DVT unit is a DBT project content set plus analysis, not a deployment configuration.

**Defer**

- full environment promotion UI and deployment history until atomic publication exists.

### NiFi

NiFi distinguishes `up to date`, `locally modified`, `stale`, `locally modified and stale`, and `sync
failure`, and supports show/revert/commit for versioned flows:
<https://nifi.apache.org/nifi-docs/user-guide.html>.

**Match**

- represent local buffer state and remote/project semantic state as independent axes;
- expose mixed states rather than collapsing them into one label;
- publish a related set of generated artifacts as one versioned aggregate.

**Differentiate**

- use Git/project-file and content-hash identity; do not build another proprietary registry.

**Defer / avoid**

- do not clone NiFi Registry. Apache NiFi declared the Registry deprecated in February 2026 and recommends
  Git-based flow registry clients:
  <https://nifi.apache.org/projects/registry/>.

### Temporal

Temporal's core value is durable execution that resumes after crashes and infrastructure failures:
<https://docs.temporal.io/>.

**Match**

- durable operation identity;
- idempotency keys;
- explicit correlation of result to request/receipt;
- recovery that does not infer correctness from timing;
- observable ignored stale results.

**Differentiate**

- keep the Code reducer a small deterministic application model;
- do not embed a workflow engine into editor interactions.

**Defer**

- durable workflow orchestration for long-running product operations until a real cross-service use case
  requires it.

### Professional IDE and Git workflows

VS Code and Git expose distinct working-tree changes, staging, commits, branches, conflicts, remote sync,
and exact history:
<https://code.visualstudio.com/docs/sourcecontrol/overview>.

**Match**

- never call a buffer synchronized merely because its bytes equal one persisted snapshot while another
  authority check is pending;
- expose conflict, local modification, semantic diagnostics, and published revision separately;
- block destructive navigation only for the specific unresolved authority that can cause data loss.

**Differentiate**

- DVT does not need a Git staging area in the first slice; it needs honest DBT authoring state.

**Defer**

- full branch/worktree management inside DVT.

## Priority implementation route

The route below separates immediate branch remediation from product development. PR #2002 should be fixed
without absorbing the Code state work. The next product PR remains the narrow Code reconciliation slice.

## Priority 0 — make PR #2002 truthful and mergeable

### Severity and evidence

- **P1 delivery blocker:** PR Quality Gate fails at Planning DB preparation.
- **P2 regression:** labeler still requires a write token removed by the PR.
- **P2 portability/security-boundary regression:** base-ref fetch depends on anonymous repository access.
- **P2 operability risk before operator use:** repository and ruleset writes are not one atomic operation and
  have no compensation.

### Root cause

Security hardening was applied at workflow scope without decomposing existing write-requiring
responsibilities. The feature is represented across a large migration chain, but the clean DB-backed path is
not green remotely. The administrative policy object spans two external GitHub resources without a unit of
work or rollback receipt.

### User/product impact

- required CI becomes self-blocking;
- labeling can fail after expensive checks complete;
- future private/internal deployments can fail before scope detection;
- repository merge policy can be partially changed by an interrupted operator command;
- the release candidate remains unadmitted and maintainers receive contradictory “five green, one red”
  evidence.

### Exact domain owner

- Release candidate admission: `ReleaseCandidateIntegrityGate`.
- Pure rules: `ReleaseCandidateIntegritySpecification`.
- Immutable Git reads: `ReleaseCandidateGitObjectAdapter`.
- Repository policy projection/mutation: `ReleaseMergePolicyAdapter`.
- Generic PR labels: PR Quality Gate/CI delivery governance, **not** release candidate integrity.

### Existing domain objects to keep

- `ReleaseCandidateSnapshot`;
- `ReleaseCandidateAssessment`;
- `ReleasePullRequestMergePolicy`;
- `ReleaseCandidateIntegrityCheck`.

Do not add a second release-candidate model.

### Command/query and port corrections

1. Keep `AssessReleaseCandidateIntegrity` as a pure query over an immutable snapshot.
2. Keep candidate assessment read-only and base-trusted.
3. Move labeling to a separate job/workflow with `pull-requests: write`; required validation jobs remain
   read-only.
4. Make the base-ref fetch action accept an explicit read token/header, or retain checkout credentials only
   until the fetch completes and then scrub them.
5. Split `InspectReleasePullRequestMergePolicy` from `ConfigureReleasePullRequestMergePolicy` explicitly.
6. For `Configure...`, emit a before/after receipt and either compensate the repository PATCH if the ruleset
   PUT fails or document configuration as an operator transaction with a tested rollback command.
7. Keep the required check produced by exactly one trusted workflow.

### Likely files/components

- `.github/workflows/pr-quality-gate.yml`;
- `.github/actions/fetch-scope-base/action.yml` if explicit auth is added;
- `.github/workflows/release-candidate-integrity.yml`;
- `tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs`;
- corresponding CLI/workflow tests;
- migrations 773–777 or one corrective migration if published migration immutability is required;
- CI governance component documentation.

### Migration and compatibility strategy

- Do not rewrite applied migrations on `main`; these migrations are not merged yet, so the branch may squash
  or consolidate them if repository policy permits.
- The clean-database path and upgrade-from-current-main path must both pass.
- Existing product PRs should receive a successful no-op `Release candidate integrity` status if the context
  becomes required globally.
- Existing release PR #1984 should not be grandfathered. Close/regenerate it after the gate is merged.

### Rollback posture

- Workflow changes: revert PR #2002 as one squash commit if candidate admission destabilizes CI.
- Repository policy: capture repository and ruleset projections before mutation; provide a tested restore
  command/receipt.
- Never rely on manual memory to reverse a partial policy update.

### Observability

Emit one structured assessment containing:

- exact base SHA;
- exact candidate head SHA;
- candidate parent and merge base;
- changed artifact paths;
- normalized entry identities;
- projected repository/ruleset policy fingerprint;
- complete violation list;
- workflow run and candidate PR identity.

Do not log tokens or candidate file contents beyond governed release artifacts.

### Security implications

- Candidate code must remain unexecuted in `pull_request_target`.
- No candidate checkout may retain credentials.
- The read-only assessor must not receive `checks:write` or repository administration.
- Labeling authority must be isolated from candidate assessment.
- The operator configuration command must require explicit administrative authentication and must not run in
  candidate CI.

### PR decomposition

Keep PR #2002 as one release-governance slice, but add narrow corrective commits:

1. CI permission/auth correction;
2. Planning DB clean-bootstrap correction;
3. policy configuration rollback/dry-run hardening;
4. final exact-head evidence and thread resolution.

Do not mix Code working-tree or artifact-publication runtime changes into it.

### Red/green tests

Red tests:

- label job cannot add a required label with read-only permission;
- base fetch fails when anonymous Git access is denied;
- clean Planning DB bootstrap fails with migrations 773–777;
- ruleset PUT failure after repository PATCH leaves policy partially changed;
- non-release PR does not receive a required successful status;
- candidate branch with stale base or duplicate PR identity is admitted.

Green tests:

- read-only quality job and isolated write-capable label job both complete;
- authenticated base fetch succeeds without leaking credentials to candidate code;
- clean and current-main DB migrations pass;
- policy apply either commits both resources or restores the first;
- exact release candidate receives one pass/fail context from trusted base code.

### Live integration proof

On the final PR #2002 head:

- all applicable workflows are green;
- the two P2 threads are answered with fixing commits and resolved;
- the candidate-integrity workflow no-ops successfully on a product PR;
- a test release candidate built from exact main is accepted;
- a candidate with stale parent or duplicate logical note is rejected;
- repository policy inspect output matches actual GitHub settings after configuration;
- no candidate code runs with credentials.

### Acceptance criteria

- PR Quality Gate is green on the exact final head;
- no unresolved non-outdated review thread remains;
- labeling retains its required capability without widening assessor authority;
- base fetch is authenticated explicitly and credentials are not exposed to candidate code;
- Planning DB bootstrap is green remotely;
- configuration rollback is mechanized or configuration is explicitly out-of-band;
- the new required context has one producer and exact-head identity.

### Release gates

PR #2002 may merge only after exact final-head CI is green. Its merge does not authorize release #1984.

## Priority 1 — CODE-RECON-03: separate persistence and reconciliation

### Severity and evidence

- **P2 correctness and release blocker.**
- Evidence: unresolved, non-outdated PR #1996 thread and current reducer logic.

### Root cause

`CodeWorkingTreeSyncState.phase` is the product of two independent state machines stored as one enum.
`reconciliation_completed` and `reconciliation_failed` are accepted by presentation phase rather than by
current receipt identity.

### User/product impact

The UI can claim `synchronized` while DBT analysis is pending and can permanently discard invalid, stale,
unavailable, superseded, verification-unavailable, or failed results. Users can Preview or navigate based on
false semantic truth.

### Exact domain owner

The Code working-tree synchronization application model:

- `apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts`;
- `apps/web/src/app/views/code/useCodeWorkingTreeSync.ts`.

Canvas supplies the reconciliation adapter; it does not own this state machine.

### Proposed domain objects

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
  | Readonly<{ kind: 'conflict' }>
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

A pure projection derives the current status from both axes and current/persisted bytes.

### Command/query and port changes

- Reuse `SaveWorkspaceFileContent` and `WorkspaceFileSaveReceipt`.
- No new external API or contract is required in this PR.
- `edited` changes persistence only.
- reconciliation completion/failure matches the current receipt and changes reconciliation only.
- status projection precedence is explicit:
  conflict, save failure, saving, dirty, reconciliation pending, semantic failure/degradation, synchronized.

### Likely files/components

- `codeWorkingTreeSyncModel.ts`;
- `codeWorkingTreeSyncModel.test.ts`;
- `useCodeWorkingTreeSync.ts`;
- `useCodeWorkingTreeSync.test.tsx`;
- `CodeWorkingTreeStatus.tsx`;
- focused Code/Canvas browser proof;
- one Planning DB correction recording the state split and existing rail evidence.

### Migration and compatibility strategy

- Keep existing user-facing status copy and map the new internal axes to current labels.
- Do not change the workspace save receipt wire contract.
- Introduce the state split behind the hook, then delete the scalar enum as an authority rather than keeping
  two competing state representations.

### Rollback posture

The slice is Web-local. A revert restores the old reducer without changing persisted project data or API
contracts. No migration should mutate user data.

### Observability

Add stable events/metrics:

- persistence started/succeeded/conflicted/failed;
- reconciliation pending/fresh/degraded/failed/superseded;
- matching result accepted;
- result ignored due to receipt mismatch;
- edit during save/reconciliation;
- pending reconciliation duration.

Never log SQL/YAML source content or raw transport errors.

### Security implications

- Preserve sanitized domain diagnostics.
- Receipts/hashes are safe correlation metadata; source content is not.
- Status announcements already use `role=status/alert` and `aria-live`; pending analysis must remain
  announced even when bytes equal persisted content.

### PR decomposition

One narrow product PR:

- reducer/state model;
- hook integration;
- status projection;
- focused tests;
- thread response/resolution;
- no release, batch, pagination, or generic session work.

### Red/green tests

1. `reconciling -> edit B -> edit A -> invalid` finishes `persisted_invalid`.
2. `reconciling -> edit B -> edit A -> fresh` becomes synchronized only after fresh completion.
3. failure after revert becomes `reconciliation_failed`.
4. stale/unavailable/verification-unavailable/superseded outcomes survive dirty edits.
5. older receipt result is ignored after a newer save receipt exists.
6. `flush()` distinguishes bytes durable from semantics fresh.
7. status announces pending analysis while bytes equal persisted content.

### Live browser proof

In a protected browser flow:

- save model SQL;
- hold reconciliation;
- edit away and revert;
- complete with invalid analysis;
- observe pending status before completion and invalid status after completion;
- verify Preview remains blocked or explicitly degraded;
- reload and confirm authoritative bytes were preserved.

### Acceptance criteria

- no edit/revert interleaving loses a matching result;
- `synchronized` means bytes durable and semantic analysis fresh/not-required;
- dirty state never erases semantic truth;
- reducer, hook, presentation, and browser proof all exercise the real model;
- the PR #1996 P2 thread is resolved with the fixing commit;
- exact final-head CI is green.

### Release gates

No `0.5.0` release while this defect remains in the tag target.

## Priority 2 — bind reconciliation to an exact project revision

### Severity and evidence

- **P1 data-integrity/admission gap.**
- The Canvas controller accepts `WorkspaceFileSaveReceipt` as `_receipt` and ignores it.
- The callback refetches the latest graph and projects its outcome.

### Root cause

A mutable latest query is used as causal evidence for a specific save operation. File revision identity and
whole-project analysis identity are correlated by timing rather than a verified application result.

### User/product impact

A concurrent change to another SQL/YAML file can cause Code to describe a different project revision as the
result of the original save. Preview and Run can receive valid provenance that is nevertheless not causally
bound to the authoring transaction the UI reports.

### Exact domain owner

- DBT project-file reconciliation application service;
- existing `ProjectDbtGraphFromFiles` query rail;
- Code hook consumes the result;
- Canvas controller remains an adapter.

### Existing objects to reuse

- `WorkspaceFileSaveReceipt`;
- `DbtProjectRevision` / `projectRevision.contentSetSha256`;
- `DbtProjectGraphProjection.analysisSha256`;
- existing file CAS semantics;
- existing graph projection/freshness result;
- existing Preview/Run provenance objects.

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

This composes existing identities; it is not a second graph model.

### Command/query and port changes

Preferred route:

1. verify the authoritative file at `saveReceipt.path` still has `saveReceipt.contentSha256`;
2. execute the existing project graph query;
3. retain its exact project content-set and analysis identity;
4. prove the result is for the accepted file/project state or return `superseded`;
5. expose the result through a shared schema parsed at runtime in Web.

Do not create a parallel “latest project” endpoint.

### Likely files/components

- API application service around existing graph query and workspace-file query port;
- shared contract/schema package if the result crosses HTTP;
- Web DBT project graph port/adapter;
- `useDbtProjectFileCanvasController.ts`;
- Code reconciliation mapping;
- Preview/Run admission policy tests;
- live API/browser proof.

### Migration and compatibility strategy

- Keep current graph query response fields.
- Add the receipt-bound result as a new rail or backwards-compatible endpoint version.
- Migrate Code first; other graph consumers may continue using the existing query until explicitly changed.
- Parse the response schema at runtime rather than another `as TResponse` cast.

### Rollback posture

The old latest-refetch adapter may remain behind a temporary feature flag only during rollout. It must not be
treated as equally authoritative. Rollback disables receipt-bound admission and restores previous behavior
without changing workspace files.

### Observability

- receipt/file revision match or mismatch;
- accepted project content-set hash;
- analysis hash;
- reconciliation latency;
- superseded reason;
- Preview/Run project-revision mismatch.

### Security implications

- validate and normalize workspace paths;
- scope every read by tenant/project/environment;
- return sanitized diagnostics;
- never log source file contents.

### Red/green tests

- save model SQL, concurrently change `schema.yml`, then complete analysis;
- original file remains durable but reconciliation is superseded or bound to the newer exact project;
- UI never claims the original save produced a revision it did not analyze;
- Preview/Run rejects a different accepted project revision;
- malformed transport result fails schema parsing.

### Live proof and acceptance

A browser/API proof must display the save receipt, exact project content-set, exact analysis identity, and
Preview admission decision for the same transaction. A concurrent second-file edit must produce explicit
superseded/refresh behavior, never silent latest substitution.

### Release gates

No claim of reproducible authoring-to-run transaction until this result is retained and consumed.

## Priority 3 — atomic graph-generated DBT artifact publication

### Severity and evidence

- **P1 project data integrity.**
- `canvasPlanAction.ts` loops over generated artifacts, reads each expected revision, and saves files one by
  one.
- The API already owns `IWorkspaceFileBatchMutationPort` and an atomic local gateway.

### Root cause

Canvas orchestration is bound to the single-file command port although its product transaction is a
multi-file aggregate publication.

### User/product impact

A conflict or failure after the first write can leave `dbt_project.yml`, model SQL, and YAML metadata in a
mixed project revision. Preview may fail after mutating only part of the project.

### Exact domain owner

- application service: publish generated DBT workspace artifacts;
- generic storage authority: existing workspace file batch mutation port;
- Canvas is an initiating adapter, not mutation owner.

### Proposed application contract

```ts
type PublishDbtWorkspaceArtifacts = Readonly<{
  idempotencyKey: string;
  projectRoot: string;
  artifacts: readonly Readonly<{
    path: string;
    content: string;
    expectedRevision: ExpectedWorkspaceFileRevision;
  }>[];
}>;
```

Map this command to the existing `WorkspaceFileBatchMutation`. Return an application receipt that composes:

- existing `WorkspaceFileBatchReceipt`;
- exact resulting `projectContentSetSha256`;
- exact `analysisSha256` or explicit degraded/superseded state.

Do not pollute the generic storage receipt with DBT semantics.

### Command/query and port changes

- expose/reuse the existing batch command through API/Web;
- send the complete expected-file set and one idempotency key;
- apply all writes/deletes atomically;
- query/reconcile the resulting exact project revision;
- Preview consumes the publication receipt, not a list of paths written so far.

### Likely files/components

- Canvas plan action and artifact builder;
- Web workspace command port/adapter;
- API HTTP/application adapter to existing batch port if not already exposed for this use case;
- `LocalWorkspaceFileBatchMutationGateway` tests;
- DBT publication application service and contracts;
- Preview provenance/admission tests.

### Migration and compatibility strategy

- Preserve single-file save for manual editing.
- Migrate only graph-generated publication to batch.
- Keep returned `writtenArtifactPaths` temporarily as a projection of the batch receipt for UI
  compatibility, then replace it with publication provenance.

### Rollback posture

- if the batch command fails, no project file changes;
- retry the same idempotency key returns the same receipt;
- never implement client-side compensating writes as “atomicity.”

### Observability

- batch requested/applied/conflicted/failed/deduplicated;
- expected and resulting file hashes;
- project content-set and analysis hash;
- failure injection outcome;
- Preview admission against batch receipt.

### Security implications

- normalize every path before staging;
- enforce workspace scope and traversal protection;
- enforce batch/file byte limits explicitly;
- never log generated SQL/YAML contents.

### Red/green tests

- conflict on second artifact leaves every original hash unchanged;
- write failure after preparation leaves zero committed changes;
- retry same idempotency key creates no duplicate mutation;
- key reuse with different request fails;
- resulting project revision is exact and Preview consumes it.

### Live proof and acceptance

A protected integration test injects a conflict and demonstrates zero partial changes, then performs a
successful retry and shows one publication receipt, one project revision, and one Preview provenance chain.

### Release gates

Do not advertise graph-first authoring as transactionally safe until this is complete.

## Priority 4 — regenerate a truthful release candidate

### Severity and evidence

- **P1 release integrity.**
- PR #1984 duplicates one user outcome, exposes internal commit topology, and has six `action_required`
  workflows.

### Root cause

Historical merge/parent commits are treated as independent release outcomes, and candidate generation is
not yet followed by a trusted exact-tree admission gate.

### Exact owner

Release Please generates; `ReleaseCandidateIntegrityGate` admits; GitHub protected branch/ruleset enforces;
release maintainer approves. No one component owns all four concerns.

### Route

1. Fix and merge PR #2002 with exact-head green evidence.
2. Fix CODE-RECON-03 before choosing the tag target.
3. Close the stale release PR #1984.
4. Generate a new candidate from the exact updated `main`.
5. Require one canonical PR identity per user outcome.
6. Execute every applicable workflow on the exact candidate head.
7. Ensure the tag target equals the admitted candidate tree.
8. Attach machine-readable tree/artifact evidence.

### Rollback posture

Before tag publication, close/regenerate the candidate. After publication, use a new corrective release; do
not retag a different tree under the same version.

### Acceptance and release gates

- no known P1/P2 user-visible truth defect;
- no duplicate logical changelog identities;
- exact candidate parent equals exact current main;
- only governed release artifacts changed;
- all required checks green on exact candidate head;
- exact tag target equals admitted SHA;
- release notes distinguish file authority, graph-generated behavior, and remaining limits.

## Priority 5 — workspace capability truth

### Severity and evidence

- **P1 product-scale contradiction.**
- Import accepts a much larger DBT project envelope than interactive listing and mutation surfaces can
  faithfully represent.
- The local atomic batch gateway limits 500 files, 1 MB per file, and 5 MB per batch.

### Root cause

Import, analysis, Explorer, Code, and mutation each own local constants or error mappings rather than one
effective workspace capability policy.

### User impact

A project can be accepted as valid but appear incomplete, reject accessible files as invalid/missing, or fail
publication later. This is stale capability truth, not merely performance tuning.

### Exact owner and contract

Create one workspace capability policy/read model owned by the workspace application boundary, exposing:

- effective file-count limit;
- listing pagination and completeness;
- maximum readable/editable file size;
- maximum batch size/count;
- explicit `oversized`, `incomplete`, and `unsupported` outcomes.

Reuse existing path and storage scope contracts.

### Tests and acceptance

- 501 files;
- near accepted import maximum;
- file just below/above interactive size threshold;
- paginated listing with complete/incomplete marker;
- batch above limit returns an explicit capacity result;
- Explorer, Code, import, analysis, and mutation report the same effective policy.

## Priority 6 — extract a project authoring session boundary

Only after priorities 1–3 demonstrate repeated behavior, extract a cohesive application boundary owning:

- current accepted project revision;
- open file buffers;
- file save receipts;
- semantic reconciliation outcomes;
- publication receipts;
- Preview/Run revision admission;
- navigation/close policy;
- crash/reopen recovery posture.

Do not begin with a generic framework. Extract behavior already proven by SQL editing, YAML editing, exact
reconciliation, and atomic publication.

## Cross-cutting quality requirements

### Operability

Required stable signals:

- exact repository/candidate/main/tag SHAs;
- CI check producer and context identity;
- save and reconciliation receipts;
- project content-set and analysis hashes;
- batch publication receipt;
- ignored stale result count;
- pending duration;
- policy configuration before/after fingerprints;
- recovery and rollback result.

### Accessibility

Current Code status rendering correctly uses `role=status` or `role=alert`, `aria-atomic`, and polite/assertive
live regions. Preserve that behavior when splitting state. Add explicit pending-analysis copy when bytes are
clean. Error, retry, conflict, and reload actions must remain keyboard reachable and must not depend only on
color.

### Performance

- avoid whole-project refetch loops caused by editor keystrokes;
- perform reconciliation after durable save receipts, not on every buffer edit;
- cache/project exact revisions by content-set identity;
- paginate inventory rather than truncating silently;
- batch generated mutations in one server transaction;
- measure pending-analysis and batch-publication latency.

### Security

- candidate code never executes with write credentials;
- repository administration is operator-only;
- workspace paths remain normalized and scope-bound;
- no source content/raw transport error logging;
- runtime-parse all new cross-process contracts;
- sanitize DBT diagnostics;
- use hashes/opaque receipts for correlation;
- fail closed on unsupported release strategies and ambiguous project revision.

### Recovery

- after browser crash, persisted bytes remain authoritative;
- pending reconciliation is recoverable or explicitly re-run, never inferred fresh;
- batch publication is idempotent and leaves no partial project;
- release policy configuration has a restore receipt;
- rerun uses the original admitted project revision or requires explicit latest-revision choice.

### Data integrity

The end-to-end invariant is:

```text
edit exact buffer
-> persist exact file receipt
-> reconcile exact project revision
-> publish exact aggregate receipt
-> Preview exact admitted revision
-> Run the same admitted revision
-> reopen and prove provenance
```

Every arrow needs an explicit identity. Timing and “latest” are not identities.

## Recommended PR sequence

### Immediate branch correction

**PR #2002 corrective commits**

- isolate label write authority;
- authenticate base-ref fetch explicitly;
- fix the clean Planning DB bootstrap failure;
- harden or separate policy configuration rollback;
- resolve both P2 threads;
- require exact final-head green CI.

### Next product slice

**PR A — split Code persistence and reconciliation**

- reducer/hook/status only;
- red/green interleaving proofs;
- protected browser proof;
- resolve PR #1996 P2;
- no release or batch work.

### Following slices

**PR B — exact project-revision reconciliation**

- receipt-bound application result;
- shared runtime schema;
- concurrent second-file test;
- Preview/Run admission.

**PR C — atomic DBT artifact publication**

- existing batch authority;
- application publication receipt;
- failure injection;
- exact project provenance.

**PR D — truthful release 0.5.0**

- regenerate after exact main changes;
- one PR identity per outcome;
- exact candidate/tag evidence;
- all checks green.

**PR E — workspace capability truth**

- pagination/completeness/oversized semantics;
- one policy across import, analysis, Explorer, Code, and mutation.

**PR F — authoring-session extraction and executable scorecard**

- only after repeated behavior is stable;
- no generic framework first.

## Highest-priority decision

There are two different “next” actions and they must not be confused:

1. **Immediate repository action:** repair PR #2002 and keep it unmerged until its required gate and review
   threads are clean.
2. **Next product implementation slice:** split Code persistence and reconciliation to close CODE-RECON-03.

Release PR #1984 must remain unmerged. Release governance is necessary, but it cannot convert a known false
product state into an acceptable release.

## Final release gates

A release candidate may be admitted only when all of the following are true:

- exact candidate parent and merge base equal exact current `main`;
- exact candidate changes only governed release artifacts;
- one logical changelog identity exists per delivered PR outcome;
- no already-published identity is repeated;
- package, manifest, and changelog versions agree;
- repository policy is squash-only, strict, and has no bypass actor;
- required checks have one trusted producer each;
- all applicable checks are green on the exact candidate head;
- tag target equals the admitted candidate SHA;
- CODE-RECON-03 is fixed;
- exact-project reconciliation is either fixed or explicitly excluded from release claims;
- graph-generated publication is either atomic or explicitly excluded from release claims;
- known scale limits are visible and honest;
- release notes describe delivered product outcomes and remaining limits rather than internal commit topology.

## Files the next implementation agents should inspect first

### Release-governance agent

1. `.github/workflows/pr-quality-gate.yml`
2. `.github/actions/fetch-scope-base/action.yml`
3. `.github/workflows/release-candidate-integrity.yml`
4. `tools/ci/release-candidate-integrity/releaseCandidateIntegrity.mjs`
5. `tools/ci/release-candidate-integrity/releaseCandidateIntegrityCli.mjs`
6. `tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs`
7. `tools/ci/release-candidate-integrity/*.test.mjs`
8. `tools/planning-db/migrations/773_release_candidate_integrity_gate.sql`
9. `tools/planning-db/migrations/774_release_candidate_integrity_implementation.sql`
10. `tools/planning-db/migrations/775_release_candidate_integrity_private_symbols.sql`
11. `tools/planning-db/migrations/776_release_candidate_integrity_trusted_workflow.sql`
12. `tools/planning-db/migrations/777_release_candidate_integrity_ci_harness_dependency.sql`

### Product-correctness agent

1. `apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts`
2. `apps/web/src/app/views/code/codeWorkingTreeSyncModel.test.ts`
3. `apps/web/src/app/views/code/useCodeWorkingTreeSync.ts`
4. `apps/web/src/app/views/code/useCodeWorkingTreeSync.test.tsx`
5. `apps/web/src/app/views/code/CodeWorkingTreeStatus.tsx`
6. `apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts`
7. `apps/web/src/app/views/canvas/dbtProjectCodeReconciliation.ts`
8. `apps/web/src/app/views/canvas/canvasPlanAction.ts`
9. `apps/api/src/application/ports/workspaceFiles.ts`
10. `apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.ts`

## Final conclusion

`main` has not advanced, so the prior product findings are not repeated as new discoveries. The material
change is PR #2002: it is the correct architectural response to release-truth drift, with a strong trusted
base/candidate-data security boundary and a useful exact-tree specification. It is also currently failing
its own authoritative gate and contains two unresolved workflow regressions plus an operator rollback gap.

The honest route is therefore:

- fix PR #2002 without weakening its trust boundary;
- keep release #1984 blocked;
- implement the Code state split as the next product vertical;
- then bind exact project revision and atomic publication;
- regenerate and admit a release only from the exact corrected `main`.
