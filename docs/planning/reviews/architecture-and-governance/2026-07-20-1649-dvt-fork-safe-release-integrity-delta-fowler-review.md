---
title: DVT fork-safe release-integrity delta Fowler review and implementation route
date: 2026-07-20T16:49:00+02:00
status: current-review
reviewed_main_sha: 8eb0f5a7551d46c909a024b86f66cf3580c20691
scope: documentation-only
supersedes: 2026-07-20-1238-dvt-dependency-and-release-governance-delta-fowler-review.md
---

# DVT fork-safe release-integrity delta Fowler review and implementation route

## Purpose and constraints

This is a point-in-time repository, product, architecture, delivery, and release review for the implementation agent working in [`dunay2/dvt`](https://github.com/dunay2/dvt).

It inspects:

- the exact current `main` tree and recent commits;
- every visible open pull request and relevant unmerged branch work;
- workflow identity and results on relevant heads;
- unresolved and recently resolved review threads;
- release-candidate state and exact-SHA evidence;
- Code persistence and DBT reconciliation;
- Canvas projection and graph-generated DBT publication;
- API and Web contracts, ports, adapters, and runtime validation;
- Preview and Run provenance;
- workspace scale and capability truth;
- tests, governance, operability, accessibility, performance, security, data integrity, and recovery;
- current product and architecture documentation.

The review applies a Fowler-style standard: identify responsibility overload, temporal coupling, primitive obsession, hidden or duplicate authority, shotgun surgery, stale truth, test-only confidence, leaky abstractions, architectural drift, and dead-end implementation routes.

This change is documentation-only. It changes no runtime code, workflows, dependencies, contracts, migrations, generated artifacts, release metadata, or product behavior. It does not authorize a merge and does not replace Planning DB as current work authority.

No local test execution is claimed. Repository objects, source files, pull requests, workflow runs, jobs, review threads, and current branch files were inspected through the GitHub integration.

## Exact reviewed identities

- Repository: [`dunay2/dvt`](https://github.com/dunay2/dvt)
- Exact current `main`: [`8eb0f5a7551d46c909a024b86f66cf3580c20691`](https://github.com/dunay2/dvt/commit/8eb0f5a7551d46c909a024b86f66cf3580c20691)
- Current main merge: [PR #1996 — Harden DBT code persistence reconciliation](https://github.com/dunay2/dvt/pull/1996)
- Release-governance branch: [`fix/release-candidate-integrity`](https://github.com/dunay2/dvt/tree/fix/release-candidate-integrity)
- Release-governance PR: [PR #2002 — Enforce trusted release candidate integrity](https://github.com/dunay2/dvt/pull/2002)
- PR #2002 reviewed head: [`a3a4d8ed8fb2028ce822fcc7bcbef94688d4d28e`](https://github.com/dunay2/dvt/commit/a3a4d8ed8fb2028ce822fcc7bcbef94688d4d28e)
- Open release candidate: [PR #1984 — Release 0.5.0](https://github.com/dunay2/dvt/pull/1984)
- Release candidate head: [`15783c8dddfd57e4a34ef282e6d919ead2956ef9`](https://github.com/dunay2/dvt/commit/15783c8dddfd57e4a34ef282e6d919ead2956ef9)
- Previous review: [PR #2012](https://github.com/dunay2/dvt/pull/2012)
- This review branch: `agent/dvt-review-20260720-1649`

## Executive verdict

There is still **no product-code delta on `main`**. The exact product transaction remains incomplete:

1. Code persistence and DBT reconciliation are still compressed into one scalar `phase`;
2. reconciliation is still correlated with the latest graph query rather than bound to the exact whole-project revision admitted by a save;
3. graph-generated DBT artifacts are still published one file at a time despite an existing atomic batch authority;
4. Preview and Run carry useful provenance, but Code does not yet retain the exact accepted project revision that should gate them;
5. import capability and interactive workspace capability still contradict each other;
6. release `0.5.0` is still stale, duplicated, and unvalidated on its exact head.

There is, however, a material repository delta since the 12:38 review.

PR #2002 fixed the former P1 exact-head check identity defect. Trusted base code now explicitly creates and completes a `Release candidate integrity` Check Run on `github.event.pull_request.head.sha`, and all six visible workflows on head `a3a4d8ed` are green.

That repair exposed a new non-outdated **P2 fork-compatibility defect**. The workflow creates the Check Run before classifying pull-request authority. For a fork PR, the requested head commit belongs to another repository, so the base repository Checks API cannot be assumed to create a check associated with that PR head. Once the context is required by the main ruleset, a forked product PR can fail before the later assessment classifies release-candidate validation as not applicable.

This is not fixed by merely adding `if: same-repository` to the publication job. If the ruleset still requires the context for every PR, skipping publication leaves fork PRs permanently pending. The implementation must choose and mechanize one truthful policy:

- support forks through a fork-compatible, read-only required-check path; or
- explicitly reject fork PRs as unsupported before enabling the required context, with repository policy and documentation aligned.

For a public repository, the preferred product posture is to support forked product contributions without giving candidate code write authority.

PR #2002 is materially better but still not merge-ready. The next product slice remains the narrow separation of Code persistence and reconciliation state.

## Material delta since the previous review

### Fixed on PR #2002, not in main

The following findings are now genuinely fixed on head `a3a4d8ed`:

- **Planning DB bootstrap failure:** PR Quality Gate is green.
- **Labeler permission regression:** label mutation is isolated in a dedicated trusted workflow.
- **Credential-dependent base fetch:** immutable event SHAs replace anonymous or persisted-credential fetch assumptions.
- **Exact-head required-check identity:** the workflow explicitly creates and completes the canonical Check Run on the PR head SHA.

The exact-head publication implementation has a useful application boundary:

- `releaseCandidateCheckPublication.mjs` validates repository, SHA, check identity, and conclusion;
- `releaseCandidateCheckGithubAdapter.mjs` owns Checks API I/O;
- completion re-reads the Check Run and verifies name and head SHA before mutation;
- the assessment job remains read-only and candidate code is inspected as data.

### New active blocker

The new unresolved P2 is in `.github/workflows/release-candidate-integrity.yml`.

Current ordering:

1. a `checks: write` job checks out trusted base code;
2. it creates an in-progress Check Run against `github.event.pull_request.head.sha`;
3. only afterwards does the read-only assessment job classify the PR as product, release candidate, same-repository, or invalid authority.

For a forked product PR, step 2 can fail or create evidence not associated with the PR. The required context may therefore block the contribution before the workflow can publish a truthful not-applicable result.

This is a release-governance version of the same broader DVT smell: **authority is checked after an operation already assumes that authority**.

### No product implementation delta

`main` remains exactly `8eb0f5a7551d46c909a024b86f66cf3580c20691`. No Code, Canvas, API, contract, runtime, workspace, or product behavior changed. Product findings below are therefore revalidated against the same exact code and are not presented as newly discovered.

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

| PR | Scope / head | Current evidence | Verdict |
| --- | --- | --- | --- |
| [#2002](https://github.com/dunay2/dvt/pull/2002) | release-candidate integrity; `a3a4d8ed` | Six workflows green | Exact-head publication fixed; still blocked by unresolved fork-publication P2 and non-atomic policy configuration. |
| [#2004](https://github.com/dunay2/dvt/pull/2004) | `actions/setup-python` 6.3.0 → 7.0.0 | Five lanes green; PR Quality failed | Do not merge until governance passes and every Python-using workflow proves the ESM/action transition. |
| [#2005](https://github.com/dunay2/dvt/pull/2005) | CodeQL `init` 4.37.0 → 4.37.1 | Contracts, tests, dependency review green; CodeQL, Code Quality, PR Quality failed | Mechanically split from the matching `analyze` update; replace with one coherent CodeQL version-set migration. |
| [#2006](https://github.com/dunay2/dvt/pull/2006) | CodeQL `analyze` 4.37.0 → 4.37.1 | Same failing family as #2005 | Do not admit version skew between CodeQL action components. |
| [#2007](https://github.com/dunay2/dvt/pull/2007) | `markdownlint-cli2` patch | Five lanes green; PR Quality failed | Low runtime risk, but not mergeable while required governance fails. |
| [#2008](https://github.com/dunay2/dvt/pull/2008) | Temporal SDK group 1.18.1 → 1.20.3 | Five lanes green; PR Quality failed | Runtime-significant; requires replay, worker, bundling, integration, and ARC evidence. |
| [#2009](https://github.com/dunay2/dvt/pull/2009) | `react-resizable-panels` 2.1.7 → 4.12.2 | Web tests, Code Quality, and PR Quality fail | A UI platform migration disguised as a bot bump. Requires source adaptation and browser/accessibility proof. |
| [#2010](https://github.com/dunay2/dvt/pull/2010) | Radix menubar update | Five lanes green; PR Quality failed | Requires keyboard, focus restoration, submenu, and ARIA proof. |
| [#2011](https://github.com/dunay2/dvt/pull/2011) | Radix navigation-menu update | Five lanes green; PR Quality failed | Requires focus, `aria-controls`, keyboard, and render-regression proof. |
| [#2012](https://github.com/dunay2/dvt/pull/2012) | previous documentation-only review | PR Quality and Code Quality green; heavy lanes skipped | Superseded by this review. |
| [#2003](https://github.com/dunay2/dvt/pull/2003) | older documentation-only review | previously green docs evidence | Superseded. |
| [#2001](https://github.com/dunay2/dvt/pull/2001) | older documentation-only review | previously validated | Superseded. |
| [#2000](https://github.com/dunay2/dvt/pull/2000) | older documentation-only review | previously validated | Superseded. |
| [#1999](https://github.com/dunay2/dvt/pull/1999) | older documentation-only review | previously validated | Superseded. |
| [#1984](https://github.com/dunay2/dvt/pull/1984) | release `0.5.0`; `15783c8d` | Six workflows remain `action_required` | Stale, duplicate, and not release-ready. Must not merge or tag. |

Five superseded review PRs will remain open after this review is created. That is low-grade duplicate authority. Preserve the reports as immutable history, but close or clearly archive obsolete PRs so an implementation agent does not have to choose among several documents claiming current truth.

## CI and exact-tree evidence

### Exact current main

`main@8eb0f5a7551d46c909a024b86f66cf3580c20691` has no connector-visible workflow run and no commit status.

PR #1996 had green branch-head evidence, but that is not machine-readable validation attached to the exact merge tree now published as `main`. A mature delivery system admits the exact tree that will be tagged or deployed, not a nearby PR head or merge simulation.

### PR #2002

Current head `a3a4d8ed8fb2028ce822fcc7bcbef94688d4d28e` has:

- Contracts & Determinism: success;
- Dependency Review: success;
- CI — Code Quality: success;
- Test Suite: success;
- CodeQL: success;
- PR Quality Gate: success.

This is real progress. It proves the branch's test suite, not that its fork policy is functionally complete. The unresolved review thread is a path not exercised by the current same-repository PR.

### Previous documentation PR

PR #2012 has successful PR Quality and Code Quality lanes. Contracts, Test Suite, Dependency Review, and CodeQL were skipped under documentation-only scope.

### Release PR #1984

The release head remains `15783c8d`. Its six visible workflows remain `action_required`, and its notes still duplicate the execution-selection recovery outcome for commits `ec47025` and `fa240f8`.

There is no valid basis to merge, tag, or publish it.

## Review-thread state

### PR #2002

#### Resolved — labeler authority

The write-capable labeler is no longer mixed into the required read-oriented quality workflow.

#### Resolved — base-fetch authentication

The workflow no longer depends on public anonymous access or persisted checkout credentials for scope detection.

#### Resolved — exact-head check publication

The former P1 is fixed on the branch. A three-job authority split creates, assesses, and completes a canonical Check Run on the exact PR head. Completion verifies the remote Check Run identity before mutation.

#### Unresolved P2 — fork authority is classified after publication

The begin job attempts Checks API publication before classifying whether the head commit belongs to the base repository.

Impact:

- fork product PRs can fail before reaching the not-applicable assessment;
- skipping the check for forks would still leave a required context missing;
- a public contribution path becomes accidentally incompatible with the configured merge policy;
- green same-repository CI creates test-only confidence for an untested authority class.

This thread is non-outdated and should block merge.

### PR #1996

Two P1 threads remain correctly resolved and supported by merged commits:

- editing during DBT reconciliation no longer lets `flush()` approve a later unsaved buffer;
- editing while persistence is in flight no longer lets an old acknowledgement hide the later buffer.

One P2 thread remains unresolved and non-outdated:

1. reconciliation is pending for persisted bytes `A`;
2. the user edits to `B`, moving the scalar phase to `modified`;
3. the user returns to `A` before reconciliation completes;
4. `persistedReconciliationPhase` is still `null`, so the reducer reports `synchronized`;
5. the later matching result is rejected because completion requires `phase === 'reconciling'`;
6. invalid, stale, unavailable, superseded, verification-unavailable, or failed semantic truth can disappear.

### Other open PRs

No review threads were found on release PR #1984 or dependency PRs #2004 through #2011. Absence of comments does not remove objective CI and compatibility blockers.

## Previous finding disposition

| Finding | Status now | Evidence and interpretation |
| --- | --- | --- |
| Raw selection-recovery transport detail shown to users | **Fixed** | Localized, sanitized copy replaced raw transport detail. |
| Manual DBT file selection snaps back | **Fixed** | Corrected and regression-tested in PR #1993. |
| Scope switch retains stale selected file | **Fixed** | Corrected and regression-tested in PR #1993. |
| Edit during persistence can be lost | **Fixed** | PR #1996 retains the later buffer and requires another save. |
| Edit during reconciliation can be approved before later save | **Fixed** | PR #1996 returns the later buffer to modified and serializes the save. |
| Pending reconciliation disappears after edit/revert | **Still active** | Exact reducer path and unresolved PR #1996 P2. |
| Save receipt is not bound to exact whole-project revision | **Still active** | Canvas receives `_receipt`, ignores it, and refetches latest graph state. |
| Graph-generated artifacts can partially mutate a project | **Still active** | Sequential single-file writes remain despite an atomic batch port. |
| DVT needs a new mutation DSL | **Disproved** | Existing CAS, batch mutation, idempotency, conflict, atomic replacement, and receipt semantics are sufficient. |
| File-backed Preview/Run have no provenance | **Disproved as a broad claim** | Existing strategies carry useful hashes, target, selection, and artifact provenance. The remaining defect is causal admission from Code reconciliation. |
| Release notes duplicate merge/parent outcomes | **Still active** | PR #1984 contains duplicate execution-selection entries. |
| No trusted release-candidate boundary exists | **Superseded as a route, not fixed in main** | PR #2002 implements the boundary but remains unmerged. |
| Required release check is attached only to base SHA | **Fixed on PR #2002** | Explicit Checks API publication targets the exact PR head. |
| Release integrity is fork-compatible | **Disproved** | Publication precedes repository-authority classification; required-context semantics are incomplete for forks. |
| Release-policy configure is atomic | **Disproved** | Repository settings are patched before the ruleset PUT; failure can leave partial policy. |
| Exact main/tag tree has attached validation evidence | **Still active** | Exact main has no visible run/status; release head is `action_required`. |
| Accepted project scale matches interactive workspace capability | **Still active** | Import accepts 10,000 files/50 MB; explorer truncates at 500 and rejects files over 1 MB under misleading semantics. |
| Workspace Web API responses are runtime-schema validated | **Disproved** | `createApiClient` casts parsed JSON to `TResponse`. |
| Human current-state documentation is current | **Disproved** | `system-delivery-status.md` claims current truth but was last reviewed in April 2026. |
| Dependency PRs are routine low-risk maintenance | **Disproved** | Every dependency PR fails a required gate; #2009 also breaks Web evidence. |

## Current product and architecture assessment

### Product value that is real

DVT already has substantial engineering and product value:

- file-authoritative DBT project import;
- content-set and analysis hashes in graph projections;
- Canvas lineage projection;
- contextual SQL and YAML authoring;
- CAS single-file saves with immutable receipts;
- idempotent atomic batch mutation in the API/local adapter;
- Preview and Run provenance;
- protected browser proofs;
- architecture and feature-mechanization guards;
- navigation protection and localized recovery copy;
- Temporal, Postgres, outbox, projection, OpenLineage, and protected-runtime foundations.

The criticism concerns incomplete authority boundaries and evidence identity, not absence of engineering.

### Code working-tree model: responsibility overload and temporal coupling

`apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts` stores persistence posture and semantic reconciliation posture in one `CodeWorkingTreeSyncPhase` enum.

That scalar owns:

- clean and dirty buffer state;
- save in progress;
- conflict and persistence failure;
- reconciliation pending;
- fresh and degraded semantic state;
- verification unavailability;
- superseded authority.

`reconciliation_completed` and `reconciliation_failed` accept matching receipts only while `phase === 'reconciling'`. `reduceEditedValue` can move the phase away from `reconciling` while retaining `pendingReconciliation`. Returning the bytes to `persistedContent` then projects `persistedReconciliationPhase ?? 'synchronized'`.

This is not one missing `if`. It is a model error: one string represents the Cartesian product of two independent state machines. The active race is direct evidence of responsibility overload, primitive obsession, and temporal coupling.

### Canvas reconciliation: hidden authority

`useDbtProjectFileCanvasController.ts` accepts a `WorkspaceFileSaveReceipt` in `reconcileCodeFilePersistence`, names it `_receipt`, ignores it, and calls `refreshProjectGraphSource()`.

The resulting projection contains `projectContentSetSha256` and `analysisSha256`, but the UI does not prove that the projection corresponds to the project revision causally associated with the save receipt. A concurrent edit to another file can make “latest graph” describe a different snapshot.

“Latest available projection” silently replaces “revision admitted for this operation.” That is hidden authority and stale-truth risk.

### Canvas publication: partial transaction despite existing batch authority

`canvasPlanAction.ts` publishes generated DBT artifacts through sequential `saveFileContent` calls.

If a conflict or I/O failure occurs after the first successful write, the project can be partially changed. This is a P1 data-integrity defect.

The repository already contains the required language and implementation:

- `WorkspaceFileBatchMutation`;
- expected revision sets;
- write and delete sets;
- idempotency keys;
- batch conflict results;
- immutable batch receipts;
- local atomic replacement coordination.

Creating another mutation DSL or client-side compensation protocol would duplicate authority.

### API and contracts: strong command semantics, inconsistent response validation

Workspace command-side semantics are comparatively mature: explicit expected revisions, immutable receipts, conflicts, batch idempotency, and scoped storage authority.

The generic Web transport boundary is weaker. `createApiClient.ts` parses JSON and casts it to `TResponse`. TypeScript generics are compile-time expectations, not runtime proof. Malformed or version-skewed data can enter the application as trusted shape.

Do not start a global rewrite. New reconciliation and workspace rails should be schema-first using shared `@dvt/contracts` schemas; migrate high-value existing rails incrementally.

### Runtime, recovery, and operability

DVT has credible runtime foundations: Temporal integration, Postgres isolation, outbox and projection workers, protected routes, run snapshots, and provenance.

Authoring recovery is less complete:

- navigation and workbench close are guarded for unresolved local authority;
- same-session retries retain contextual targets;
- hard browser termination lacks a clearly demonstrated durable draft/recovery transaction;
- ignored stale reconciliation results are not a first-class observable event.

Do not mix crash recovery into the reducer hotfix. Add it only after a stable authoring-session boundary exists.

Authoring observability should include:

- persistence started, succeeded, conflicted, and failed;
- reconciliation started, fresh, degraded, failed, and superseded;
- result ignored due to receipt mismatch;
- pending reconciliation duration;
- edits during save and reconciliation;
- Preview/Run project-revision mismatch;
- atomic batch conflict, failure, and deduplicated retry;
- release check publication repository, head SHA, Check Run ID, and authority classification.

Never log source SQL, YAML, tokens, or raw transport errors.

### Accessibility and UI dependency risk

The product has meaningful keyboard and protected-browser evidence, including workbench reachability and movement. That evidence does not automatically cover component-library migrations.

PR #2009 crosses two major versions of the panel library and currently fails the Web suite. Required proof includes:

- keyboard resizing and separator focus;
- ARIA roles, values, and focus-visible behavior;
- pointer capture, touch, right-click, and double-click behavior;
- collapsed and zero-size panels;
- stored layout migration and reload;
- responsive resizing and owner-document behavior;
- Code workbench, inspector, console, and every panel consumer in a real browser.

PRs #2010 and #2011 similarly require focused keyboard, focus restoration, submenu, `aria-controls`, and render-regression proof.

### Performance and capability truth

The import inspector accepts by default approximately:

- 10,000 project files;
- 100,000 inspected entries;
- 50 MB total project bytes;
- 5,000 directories;
- depth 64.

The interactive local workspace repository exposes:

- silent listing truncation at 500 files;
- a 1 MB read/write limit;
- oversized content under an invalid-path error category.

A project can therefore be accepted, analyzed, and represented in the graph while the interactive file surface cannot prove whether a missing file is absent, omitted, oversized, or failed. This is product inconsistency, not merely a tuning difference.

### Security and data integrity

Positive properties:

- scoped workspace paths;
- CAS writes;
- atomic local replacement;
- idempotent batch receipts;
- protected runtime routes;
- trusted-base release inspection;
- candidate code treated as data rather than executed with write authority;
- sanitized user-visible recovery copy.

Active risks:

- fork check publication assumes authority before classifying it;
- release-policy configuration mutates two GitHub resources without compensation;
- sequential Canvas writes can leave partial project state;
- generic Web JSON casts weaken boundary validation;
- oversized-file and truncated-list errors conceal true capability state;
- dependency updates can alter privileged actions or accessibility primitives without cohesive proof.

### Documentation and governance

The repository has extensive architecture and Planning DB evidence, but current truth is fragmented:

- `docs/architecture/system-delivery-status.md` declares itself current but was last reviewed on 2026-04-26;
- multiple open review PRs claim point-in-time current status;
- the release PR exposes commit topology rather than concise product outcomes;
- exact `main` lacks attached CI evidence;
- narrow changes often require many Planning DB migrations and cross-surface evidence edits.

This is governance amplification. The solution is not weaker governance. It is smaller stable domain boundaries and fewer repeated migrations for one capability.

## Fowler-style smell summary

### Responsibility overload

- one Code `phase` owns persistence and semantic state;
- one operator command mutates repository settings and a ruleset while promising one policy;
- one bot PR can represent a major UI migration without owning product proof;
- one release-integrity workflow currently combines publication eligibility and candidate assessment through ordering assumptions.

### Primitive obsession

- phase strings encode a rich asynchronous protocol;
- release-candidate branch prefixes stand in for a typed authority classification;
- generic `TResponse` casts stand in for runtime contracts;
- raw numeric limits are duplicated across import and workspace adapters.

### Temporal coupling

- reconciliation correctness depends on exact edit/result ordering;
- latest graph state substitutes for a receipt-bound project revision;
- fork authority is checked after Check Run creation;
- release validity depends on nearby green heads rather than the exact tag target.

### Hidden and duplicate authority

- latest graph query versus save receipt;
- sequential file writes versus batch authority;
- workflow shell classification versus release-integrity domain code;
- multiple current-review PRs;
- Release Please commit topology versus product-outcome truth;
- accepted project capacity versus interactive workspace capacity.

### Shotgun surgery

- PR #2002 spans workflows, scripts, tests, docs, configuration, and nine migrations;
- eight dependency PRs represent several real compatibility units;
- Code interleavings repeatedly reopen reducer, hook, view, browser, architecture, and governance evidence.

### Test-only confidence

- PR-head green does not prove exact-main or exact-tag evidence;
- same-repository green does not prove fork compatibility;
- package tests do not prove a major panel migration in the browser;
- generic transport tests do not prove runtime schema validation.

### Product dead ends to avoid

- adding more branches to the overloaded Code enum indefinitely;
- inventing a second graph or mutation language;
- treating latest projection as transaction identity;
- skipping fork publication while keeping the check globally required;
- cloning NiFi Registry;
- embedding Temporal workflows into editor keystroke/save interactions;
- building deployment promotion UI before atomic publication;
- merging the dependency queue in bulk.

## Mature-system comparison: Match / Differentiate / Defer

### dbt Cloud / Studio and professional dbt authoring

Reference: <https://docs.getdbt.com/>

**Match**

- distinguish editor buffer, persisted file, parse/compile state, diagnostics, execution, and version-control posture;
- bind Preview and Run to an identifiable project revision;
- separate command output and semantic errors from save success.

**Differentiate**

- preserve DVT's graph-first contextual authoring and bidirectional Code/Canvas projection;
- keep DBT files as semantic authority rather than creating a second canonical graph language.

**Defer**

- broad hosted collaboration, environment management, and Git UI until the core authoring transaction is correct.

### Dagster

Reference: <https://docs.dagster.io/>

**Match**

- connect assets, lineage, checks, freshness, materialization, and execution evidence;
- make stale and invalid quality state inspectable as product truth.

**Differentiate**

- DVT's immediate authority remains DBT project files and DBT semantics;
- do not replace DBT resources with a parallel asset language.

**Defer**

- generalized orchestration, sensors, schedules, and catalog behavior until revision identity is stable.

### Airflow

Reference: <https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/dag-bundles.html>

**Match**

- retain the exact project content-set revision admitted by Preview or Run;
- rerun against that revision or explicitly reject it;
- never substitute latest files silently for the original admitted bundle.

**Differentiate**

- DVT revisions are DBT project content sets and analysis identities, not Python DAG bundles.

**Defer**

- general scheduling and executor semantics.

### Prefect

Reference: <https://docs.prefect.io/v3/how-to-guides/deployments/versioning>

**Match**

- immutable publication identity;
- visible version history and eventual promotion/rollback;
- exact code and configuration provenance for execution.

**Differentiate**

- the immediate DVT unit is a DBT project content set plus analysis, not a deployment configuration.

**Defer**

- promotion UI and environment history until atomic publication and exact revision admission exist.

### NiFi

References:

- <https://nifi.apache.org/nifi-docs/user-guide.html>
- <https://nifi.apache.org/projects/registry/>

**Match**

- represent local modification and remote/project semantic state as independent axes;
- expose mixed states;
- publish related generated artifacts as one versioned aggregate;
- support inspect, revert, and commit-style recovery semantics.

**Differentiate**

- use Git, project-file, receipt, and content-hash identity.

**Avoid**

- do not clone NiFi Registry. Apache deprecated it in February 2026 and recommends Git-based Flow Registry Clients.

### Temporal

Reference: <https://docs.temporal.io/>

**Match**

- durable operation identity;
- idempotency keys;
- explicit result-to-request correlation;
- observable stale-result rejection;
- recovery that does not infer correctness from timing.

**Differentiate**

- keep the Code reducer a small deterministic application model;
- use Temporal only where operations are genuinely long-running and cross-service.

**Defer**

- workflow orchestration for editor keystroke/save interactions.

### Professional IDE and Git workflows

Reference: <https://code.visualstudio.com/docs/sourcecontrol/overview>

**Match**

- distinguish working-tree modification, persisted content, diagnostics, conflicts, revision history, and remote publication;
- never call a state synchronized merely because bytes equal one snapshot while another authority check is pending;
- make destructive navigation policy specific to the unresolved authority.

**Differentiate**

- DVT does not need a Git staging area in the first slice; it needs honest DBT authoring state.

**Defer**

- full branch and worktree management inside DVT.

## Expert implementation route

The route separates release governance, dependency maintenance, and product delivery. Do not combine them in one branch.

## Priority 0A — make release-integrity publication fork-safe

### Severity and evidence

**P2 contribution and release governance.** PR #2002 has a non-outdated unresolved thread. The begin job creates a Check Run against the PR head before it knows whether that SHA belongs to the base repository.

### Root cause

Authority classification is implemented later in workflow shell logic, while publication assumes the base repository can own the head commit. Classification and publication planning are separate implicit protocols rather than one typed trusted decision.

### User and product impact

- forked product contributions can be blocked before assessment;
- a required check can remain permanently pending if publication is merely skipped;
- operators can mistake same-repository green evidence for complete merge-policy behavior;
- public contribution policy becomes accidental rather than explicit.

### Exact domain owner

CI release-candidate integrity component:

- `.github/workflows/release-candidate-integrity.yml`;
- `tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.mjs`;
- `releaseCandidateCheckGithubAdapter.mjs`;
- release candidate assessment and merge-policy tests;
- CI governance documentation and Planning DB evidence.

### Proposed domain objects

Reuse current check publication and assessment objects. Add one pure trusted classification/projection, not another release language:

```ts
type PullRequestIntegrityAuthority =
  | Readonly<{
      kind: 'same-repository-release-candidate';
      pullRequestNumber: number;
      baseSha: string;
      headSha: string;
    }>
  | Readonly<{
      kind: 'same-repository-product';
      pullRequestNumber: number;
      headSha: string;
    }>
  | Readonly<{
      kind: 'fork-product';
      pullRequestNumber: number;
      headRepository: string;
      headSha: string;
    }>
  | Readonly<{
      kind: 'unsupported-release-candidate';
      reason: 'wrong-base' | 'fork-release-candidate' | 'invalid-identity';
    }>;

type IntegrityCheckPlan = Readonly<{
  authority: PullRequestIntegrityAuthority;
  assessment: 'exact-release-candidate' | 'not-applicable' | 'reject';
  publication: 'base-check-run' | 'fork-compatible-native-check' | 'none';
  context: 'Release candidate integrity';
}>;
```

The names are illustrative. Prefer existing naming in the CI component and keep the decision pure and testable.

### Command, query, and port changes

1. classify immutable PR metadata before any write-capable step;
2. for same-repository heads, keep the explicit Checks API publisher on the exact head SHA;
3. for fork product PRs, use a fork-compatible required-check path that executes trusted/read-only logic and produces the same required context without candidate write authority;
4. reject fork release-candidate branches explicitly;
5. ensure the ruleset requires a context that every supported PR class can actually produce;
6. do not install, import, or execute candidate code in a write-capable job.

A safe implementation may use two triggers/workflows with one canonical context, but the integration identity and required-check semantics must be proven. Do not assume two different GitHub Apps or native job names satisfy the same ruleset entry.

### Likely files

- `.github/workflows/release-candidate-integrity.yml`;
- optional read-only `pull_request` workflow for fork-compatible product posture;
- `releaseCandidateCheckPublication.mjs` and tests;
- a new or existing trusted PR-authority classifier;
- `releaseCandidateIntegrity.mjs` only if authority belongs there;
- `releaseMergePolicyCli.mjs` and workflow parity tests;
- CI governance docs and Planning DB records.

### Migration and compatibility strategy

1. add the authority classifier and tests without changing the ruleset;
2. prove same-repository product, same-repository release candidate, and fork product paths;
3. publish one conclusive canonical context for each supported class;
4. only then configure the ruleset to require it;
5. preserve the old path until a disposable fork PR proves the new one;
6. remove duplicated shell classification after domain projection is authoritative.

### Rollback posture

- remove the required context from the ruleset first;
- disable the new publisher or native check path;
- preserve assessment logs and Check Run identifiers;
- do not mutate candidate branches or product data.

### Observability

Record:

- PR number;
- base and head repository identities;
- base and head SHA;
- authority kind;
- assessment kind;
- publication mechanism;
- Check Run or workflow identifier;
- conclusion and stale-event rejection.

Never log tokens or untrusted payload bodies.

### Security implications

- minimal `checks: write` only for same-repository explicit publication;
- read-only fork path;
- trusted base code only in privileged jobs;
- no candidate dependency install or execution;
- immutable metadata validation;
- stale synchronize events must not complete a newer head's check;
- sanitized check summaries.

### PR decomposition

Keep within PR #2002 if the change remains confined to the release-integrity component:

- commit A: pure authority classifier and red tests;
- commit B: workflow ordering and fork-compatible publication path;
- commit C: workflow/static governance tests and live fork evidence;
- commit D: ruleset projection only after proof.

Keep two-resource policy rollback compensation separate if it materially expands scope.

### Red tests

- fork product PR attempts explicit base-repository Check Run creation before classification;
- skipping fork publication leaves the required context unsatisfied;
- fork release-candidate branch is rejected;
- older synchronize event cannot complete the current head check;
- head repository mismatch cannot redirect publication;
- same-repository product PR receives a truthful not-applicable success;
- release candidate still receives exact assessment.

### Green tests

- every supported PR authority class produces one canonical conclusive context;
- same-repository exact-head identity remains verified;
- fork path has no write authority over candidate code;
- reruns are idempotent for the same head/attempt identity;
- ruleset integration identity matches the produced check.

### Live integration proof

Use a disposable fork PR and a disposable same-repository PR:

1. record exact head repositories and SHAs;
2. prove the fork PR reaches a conclusive required context;
3. prove no base token is used to execute fork code;
4. prove a same-repository product PR receives not-applicable success;
5. prove a release-candidate PR receives exact assessment;
6. push new heads and show old results do not admit them;
7. inspect main ruleset admission for all supported classes.

### Acceptance criteria

- classification precedes any authority-dependent mutation;
- fork product PRs are either fully supported or explicitly and consistently disallowed;
- no globally required context is absent for a supported PR class;
- release candidates remain same-repository and exact-head assessed;
- candidate code never executes with write authority;
- all final-head CI and live proofs are green;
- unresolved P2 is answered with commit evidence and resolved.

### Release gate

PR #2002 must not merge until fork policy, check production, and ruleset semantics are demonstrated end to end.

## Priority 0B — make release-policy configuration recoverable

### Severity and evidence

**P2 operability and governance integrity.** `releaseMergePolicyCli.mjs` patches repository merge settings, then verifies and updates the main ruleset. Failure between writes leaves a partial policy.

### Root cause

One command promises one policy but owns two independently mutable GitHub resources without a transaction or compensating action.

### Impact

- merge methods can change while required checks remain unchanged;
- operators can receive failure after the repository is already partially mutated;
- rerun behavior depends on the intermediate state;
- rollback becomes manual and error-prone.

### Owner and proposed objects

CI merge-policy application service. Reuse `projectReleaseMergePolicy`, `buildReleaseMergePolicyUpdate`, and policy fingerprints. Add a plan/receipt:

```ts
type ReleaseMergePolicyChangePlan = Readonly<{
  beforeRepository: RepositoryMergeSettings;
  beforeRuleset: MainRuleset;
  desiredRepository: RepositoryMergeSettings;
  desiredRuleset: MainRuleset;
  fingerprint: string;
}>;

type ReleaseMergePolicyChangeReceipt = Readonly<{
  appliedRepository: boolean;
  appliedRuleset: boolean;
  verified: boolean;
  rollback: 'not-required' | 'completed' | 'failed';
}>;
```

### Command/port changes

- separate `plan`, `apply`, `verify`, and `rollback` operations;
- capture both before-images before the first write;
- apply with optimistic fingerprint checks;
- compensate repository settings if ruleset update fails;
- fail closed if rollback cannot be verified;
- emit a machine-readable receipt.

### Files

- `releaseMergePolicyCli.mjs`;
- focused tests;
- operator documentation;
- Planning DB only for the changed component contract.

### Migration, rollback, observability, and security

Introduce dry-run/plan first. Preserve current inspect output. Roll back with captured before-images, not hard-coded defaults. Record resource IDs, fingerprints, write order, verification, and rollback result. Never log tokens or unrelated repository settings.

### Red/green tests

- inject failure after repository PATCH and prove compensation restores the before-image;
- inject concurrent ruleset change and prove no overwrite;
- inject rollback failure and prove non-zero exit plus explicit degraded receipt;
- retry a fully applied plan and prove idempotent verification;
- live proof on a disposable ruleset/repository where available.

### Acceptance and gate

The command must either verify the complete desired policy or verify restoration of the complete previous policy. Partial silent success is forbidden.

## Priority 0C — triage dependency updates as coherent migration units

### Severity and evidence

**P1 delivery stability.** Eight dependency PRs fail at least one required lane. PR #2009 additionally fails product Web tests and Code Quality. #2005 and #2006 split one CodeQL action version across separate PRs.

### Root cause

Dependabot decomposes by dependency reference. The repository's real compatibility units are workflows, runtime adapters, and UI component systems.

### Impact

- individual merges can create version skew or hidden runtime/UI regressions;
- merging in bulk destroys fault isolation;
- leaving the queue untouched creates noise and stale maintenance posture.

### Owners and evidence contracts

No new product contracts. Define compatibility evidence per real unit:

- `CodeqlActionVersionSet` for init/analyze/upload coherence;
- `TemporalSdkCompatibilityEvidence` for replay, worker, bundling, telemetry, and integration;
- `ResizablePanelCompatibilityEvidence` for consumer inventory and browser behavior;
- `RadixNavigationCompatibilityEvidence` for keyboard, focus, and ARIA.

### Route

- recreate #2005/#2006 as one coordinated CodeQL update;
- treat #2009 as a manual migration PR with source changes and protected-browser tests;
- update #2008's ARC evidence and run Temporal replay/time-skipping/worker lanes;
- group #2010/#2011 only if their dependency graph and browser proof are coherent;
- keep #2004 and #2007 independent after required governance passes.

### Rollback, observability, security, tests, and gates

Each compatibility unit must be revertible in one PR without data migration. Keep action SHAs pinned. Record versions in build provenance. Major UI changes require browser artifacts. Temporal changes require replay and worker startup evidence. No dependency PR merges while a required lane fails.

## Priority 1 — split Code persistence and reconciliation state

### Severity and evidence

**P2 correctness and release blocker.** Active non-outdated PR #1996 thread and exact reducer path in current `main`.

### Root cause

One `phase` enum stores the Cartesian product of persistence and semantic reconciliation.

### User and product impact

The UI can report `synchronized` while semantic analysis is pending and can silently discard invalid, stale, unavailable, superseded, verification-unavailable, or failed truth.

### Exact domain owner

- `apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts`;
- `apps/web/src/app/views/code/useCodeWorkingTreeSync.ts`;
- `CodeWorkingTreeStatus.tsx` and focused tests.

Canvas remains an adapter supplying reconciliation, not the owner of the state machine.

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

A pure projection derives the UI status. Edits change only persistence. Reconciliation results match receipts and update only reconciliation.

### Command/query and port changes

No external API change in this slice. Reuse `WorkspaceFileSaveReceipt` and current hook callbacks. Do not introduce the whole-project reconciliation API yet.

### Files and migration

- reducer/state types;
- reducer and hook tests;
- hook adaptation;
- status projection;
- status component tests;
- one protected browser proof.

Preserve existing hook/status outputs temporarily through a projection adapter. Remove the legacy scalar state only after all consumers migrate.

### Rollback posture

One Web-only revert. No persisted data or contract migration.

### Observability and security

Emit edit-during-save, edit-during-reconciliation, matching result accepted, mismatched result ignored, and pending duration. Do not log source content or raw errors; receipts and hashes are sufficient.

### PR decomposition

One narrow functional PR only. Do not combine with release governance, dependency updates, batch publication, pagination, or a generic authoring framework.

### Red tests

- `reconciling A → edit B → revert A → invalid` ends `persisted_invalid`;
- the same sequence with `fresh` becomes synchronized only after the fresh result arrives;
- failure after revert ends `reconciliation_failed`;
- an older receipt is ignored after a newer save;
- a dirty buffer preserves semantic result and reveals it when clean;
- pending analysis remains visible while bytes equal persisted content;
- `flush()` distinguishes durable bytes from semantic freshness.

### Live browser proof

Delay reconciliation in the protected DBT Code flow, edit and revert, then deliver invalid, fresh, and failure outcomes. Assert status, navigation behavior, no lost content, and no raw diagnostic leak.

### Acceptance criteria and release gate

- no edit/revert interleaving loses matching semantic truth;
- synchronized means bytes durable and reconciliation fresh/not-required;
- reducer, hook, presentation, and browser tests are green;
- exact final-head CI is green;
- PR #1996 P2 is answered and resolved with commit evidence.

## Priority 2 — bind reconciliation to an exact project revision

### Severity and evidence

**P1 semantic authority.** The Canvas controller ignores the save receipt and refetches latest graph state.

### Root cause

File persistence identity and whole-project analysis identity are correlated by timing rather than joined by one domain result.

### Impact

A concurrent edit to another project file can make a fresh projection describe a different snapshot than the save the UI claims to have reconciled.

### Exact owner and existing semantics

API/application DBT project-from-files query/reconciliation component. Web Canvas is a consumer/adapter.

Reuse:

- `WorkspaceFileSaveReceipt`;
- `DbtProjectRevision` and `projectRevision.contentSetSha256`;
- `DbtProjectGraphProjection.analysisSha256`;
- `ProjectDbtGraphFromFiles` query rail;
- current file CAS semantics.

### Proposed contract

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

Add one application rail that:

1. verifies the authoritative file still has the receipt hash;
2. analyzes or reads a projection for an identified project content set;
3. returns exact project and analysis identities;
4. reports superseded instead of attributing a newer project snapshot to the original save.

Expose the result through shared runtime schemas in `@dvt/contracts`. Do not rely on generic Web casts.

### Likely files

- DBT project query/application service and port;
- shared contract schemas;
- API route/adapter;
- Web DBT/workspace port;
- `useDbtProjectFileCanvasController.ts`;
- Code hook integration;
- Preview/Run admission tests.

### Migration, rollback, observability, and security

Add the endpoint/contract first. Keep current callback behind a temporary switch. Emit receipt hash, current file hash, project content-set hash, analysis hash, and superseded reason. Sanitize diagnostics and never log source files.

### Red/green tests and live proof

- save model SQL, concurrently modify `schema.yml`, then complete analysis;
- prove the file save is durable but project reconciliation is superseded or explicitly points to the newer revision;
- UI never claims the original save produced a revision it did not analyze;
- Preview blocks or refreshes when the accepted revision differs.

### Acceptance and gate

Every fresh outcome names the exact file receipt, project content set, and analysis. Preview and Run can consume or reject that exact revision.

## Priority 3 — publish graph-generated DBT artifacts atomically

### Severity and evidence

**P1 data integrity.** Sequential artifact writes can leave a partial project.

### Root cause

Web orchestration uses single-file semantics for an aggregate publication and ignores the canonical batch authority.

### Exact owner and contracts

Workspace-file batch mutation application component and graph-to-DBT publication service.

Reuse `IWorkspaceFileBatchMutationPort`, existing mutation types, expected revisions, idempotency, conflicts, and receipts. Add only a product-specific wrapper if it improves intent:

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

The wrapper translates to the canonical batch mutation; it is not a new storage protocol.

### Changes, migration, rollback, observability, and security

- route graph-first publication through one API command;
- keep file-backed Preview read-only;
- rollback by reverting wiring, with no schema/data migration;
- emit batch ID, request hash, resulting project revision, conflict paths, and deduplicated retry;
- normalize every path, enforce workspace scope and limits, and never log content.

### Red tests

- conflict on the second artifact leaves every original hash unchanged;
- injected failure after preparation commits zero changes;
- same idempotency key returns the same receipt;
- same key with different request is rejected;
- receipt identifies all writes and resulting project revision;
- Preview consumes the publication receipt.

### Live proof and gate

Protected browser/API proof with conflict and retry. Zero partial workspace mutation is mandatory.

## Priority 4 — admit Preview and Run against the exact accepted revision

### Severity and evidence

**P1 reproducibility.** Existing provenance is useful but not causally gated from Code reconciliation.

### Owner and existing objects

Preview/Run admission boundary. Reuse execution strategy provenance, project content-set identity, analysis identity, target, selection, and artifact receipts. Add no parallel revision model.

### Required behavior

- Preview names the exact accepted project revision;
- Run consumes the persisted Preview revision;
- changed project state causes explicit refresh, re-preview, or rejection;
- rerun uses or explicitly rejects the original revision;
- UI displays revision mismatch as product state.

### Migration, rollback, observability, and security

Add admission checks behind current strategies, then make them mandatory. Emit accepted and current revision hashes, never source content. Roll back by disabling the gate only during development; do not ship latest-state substitution after acceptance.

### Tests/live proof

Preview revision A, modify project to B, then attempt Run. The system must not silently execute B under A's plan identity.

### Acceptance and gate

No latest-files substitution. Exact provenance is visible in API, UI, and run snapshot.

## Priority 5 — make workspace capability truthful

### Severity and evidence

**P1 product completeness and performance.** Accepted projects can exceed interactive visibility and file size without explicit status.

### Owner and contracts

Workspace inventory/query component. Introduce one shared effective capability policy and result types for:

- paginated inventory;
- complete or partial listing status;
- continuation cursor;
- oversized file distinct from absent/invalid path;
- effective limits exposed to Web.

### Command/query and port changes

Add a versioned paginated query rail or replace `listFiles()` through a compatibility adapter. Preserve the old endpoint during migration, then remove silent truncation.

### Rollback, observability, and security

Rollback to the old endpoint only while the new one is additive. Emit counts, limits, partial status, and cursor use. Do not expose host paths. Keep workspace scope and traversal validation.

### Tests

- 501 files;
- near 10,000 accepted files;
- explicit partial status and cursor above one page;
- file near and above 1 MB with `oversized` result;
- consistent policy across import, analysis, Explorer, Code, save, and batch mutation.

### Acceptance and gate

A user can distinguish absent, omitted, oversized, forbidden, and failed. No silent completeness claim.

## Priority 6 — rebuild release 0.5.0 from truthful product outcomes

### Severity and evidence

**P1 release integrity.** Current PR #1984 is stale, duplicated, and unvalidated.

### Required route

After PR #2002 and the Code state fix:

- close/regenerate the stale candidate rather than hand-editing history;
- collapse merge/parent duplicates into one user outcome;
- separate file authority, graph-generated behavior, selection recovery, and known limits;
- require all checks on the exact candidate head;
- ensure the final tag target equals the admitted SHA;
- publish machine-readable tree and artifact evidence;
- hide no known P1/P2 semantic-truth defect.

### Rollback, observability, security, and proof

Close the stale PR; do not tag an unadmitted SHA. Record candidate SHA, tag target, check identities, changelog fingerprint, and artifact checksums. Verify package/manifest version, exact tree, generated notes, and release-page outcome model.

### Gate

No release while #1984 remains `action_required`, duplicate, or based on unresolved semantic truth.

## Priority 7 — extract a cohesive authoring-session boundary

Only after Priorities 1–4 demonstrate common behavior, extract an application service owning:

- current accepted project revision;
- active buffers;
- save receipts;
- reconciliation outcomes;
- Preview/Run admission;
- close and navigation policy;
- durable draft/recovery posture.

Do not build a generic framework first. Extract only behavior already proven by model SQL editing, YAML description editing, and atomic artifact publication.

Red tests should cover browser crash/reload recovery, stale draft rejection, exact revision restoration, and no silent overwrite. Security must keep drafts workspace-scoped and avoid logging source content.

## Priority 8 — restore current-truth hygiene

### Required actions

- close or clearly archive superseded review PRs #1999, #2000, #2001, #2003, and #2012 after this report is available;
- refresh or rename `system-delivery-status.md` so it no longer claims stale current truth;
- attach CI evidence to exact `main` and exact tag targets;
- reduce repeated Planning DB migration rewrites for one stable component;
- keep one current review pointer and preserve older reports as immutable history.

### Acceptance

A new agent can identify current code, current delivery evidence, current release candidate, and current route without choosing among competing documents.

## Recommended PR sequence

1. **PR #2002 finalization:** classify authority before publication, support or explicitly reject forks coherently, resolve P2, prove final-head CI and live fork behavior.
2. **Release-policy follow-up:** make two-resource configuration compensating and verifiable.
3. **Dependency maintenance:** one coherent compatibility unit at a time; leave #2009 for a manual migration.
4. **Product PR A:** split Code persistence and reconciliation state; close edit/revert defect.
5. **Product PR B:** exact project-revision reconciliation contract and adapter.
6. **Product PR C:** atomic DBT artifact publication using existing batch authority.
7. **Product PR D:** exact Preview/Run revision admission.
8. **Product PR E:** truthful workspace inventory and oversized-file semantics.
9. **Release PR:** regenerate truthful `0.5.0` and validate exact tag target.
10. **Refactor PR:** authoring-session boundary after behavior stabilizes.
11. **Governance/docs PR:** consolidate current truth and exact-SHA evidence.

Do not combine Product PR A with release governance, dependencies, batch publication, pagination, or a generic authoring abstraction.

## Files the next implementation agent should inspect first

### Release governance

1. `.github/workflows/release-candidate-integrity.yml`
2. `tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.mjs`
3. `tools/ci/release-candidate-integrity/releaseCandidateCheckGithubAdapter.mjs`
4. `tools/ci/release-candidate-integrity/releaseCandidateIntegrity.mjs`
5. `tools/ci/release-candidate-integrity/releaseCandidateIntegrityCli.mjs`
6. `tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs`
7. `tools/ci/workflow-pattern-parity.test.mjs`
8. `tools/ci/github-collaboration-governance.test.mjs`

### Code transaction

1. `apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts`
2. `apps/web/src/app/views/code/codeWorkingTreeSyncModel.test.ts`
3. `apps/web/src/app/views/code/useCodeWorkingTreeSync.ts`
4. `apps/web/src/app/views/code/useCodeWorkingTreeSync.test.tsx`
5. `apps/web/src/app/views/code/CodeWorkingTreeStatus.tsx`
6. `apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts`
7. `apps/web/src/app/views/canvas/dbtProjectCodeReconciliation.ts`

### Project revision and publication

1. `apps/api/src/application/ports/workspaceFiles.ts`
2. `apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.ts`
3. `apps/web/src/app/views/canvas/canvasPlanAction.ts`
4. DBT project graph query/application service and shared contracts
5. Preview/Run provenance and execution-strategy components

### Capability and boundary truth

1. `apps/api/src/infrastructure/dbt/LocalDbtProjectImportInspector.ts`
2. `apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts`
3. `apps/web/src/app/services/api/createApiClient.ts`
4. workspace API adapters and shared schemas
5. `docs/architecture/system-delivery-status.md`

## Final release gates

No release or product merge should be called complete unless:

- exact final head and tag-target SHAs are identified;
- required checks are attached to those exact SHAs;
- every supported PR authority class can produce the required contexts;
- no unresolved non-outdated P1/P2 semantic-truth thread remains;
- Code cannot report synchronized while matching reconciliation is pending or lost;
- reconciliation names exact file, project, and analysis identities;
- generated artifact publication is all-or-nothing and idempotent;
- Preview and Run consume the admitted revision;
- workspace completeness and oversized-file state are explicit;
- dependency migrations have focused compatibility proof;
- privileged permissions are minimal and candidate code is never executed with write authority;
- rollback and observability are demonstrated;
- current documentation points to one authoritative route.

## Final verdict

DVT has real architecture, runtime, authoring, and governance substance. The repository also repeatedly pays for incomplete authority boundaries. The same smell appears in Code state, Canvas reconciliation, artifact publication, release checks, policy configuration, dependency automation, capability limits, and documentation: evidence exists, but it is not always bound to the exact object or transaction it claims to authorize.

The correct route is not another broad redesign. It is a sequence of narrow vertical slices that make identity explicit:

- exact PR authority class;
- exact candidate head SHA;
- exact save receipt;
- exact project content set;
- exact analysis;
- exact atomic publication receipt;
- exact Preview/Run revision;
- exact workspace completeness posture.

The immediate action is to finish PR #2002 truthfully, not to merge it because six workflows are green. The next product action remains the Code persistence/reconciliation split. Everything else should follow from explicit identities rather than timing, latest-state reads, or broad green evidence.
