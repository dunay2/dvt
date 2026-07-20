---
title: DVT dependency and release-governance delta Fowler review and implementation route
date: 2026-07-20T12:38:00+02:00
status: current-review
reviewed_main_sha: 8eb0f5a7551d46c909a024b86f66cf3580c20691
scope: documentation-only
supersedes: 2026-07-20-0845-dvt-release-governance-delta-fowler-review.md
---

# DVT dependency and release-governance delta Fowler review and implementation route

## Purpose and scope

This is a point-in-time repository, product, architecture, delivery, and release review for the implementation agent working in [`dunay2/dvt`](https://github.com/dunay2/dvt). It reviews the exact current `main`, recent commits, every visible open pull request, relevant unmerged branch heads, workflow identity and results, unresolved and recently resolved review threads, release state, and the product code that owns DBT file authority, Code persistence, semantic reconciliation, Canvas projection, Preview/Run provenance, workspace mutation, and release evidence.

The review also samples current contracts, API and Web ports, runtime adapters, tests, governance, operability, accessibility, performance and scale policy, security boundaries, data integrity, recovery, and current-state documentation. Mature systems are used only to derive relevant invariants; this report does not recommend copying another product wholesale.

This change is documentation-only. It changes no runtime code, workflow, dependency, contract, migration, generated artifact, release metadata, or product behavior. It does not authorize a merge and does not replace Planning DB as current work authority.

Repository objects, source files, pull requests, workflow runs, jobs, logs, and review threads were inspected through the GitHub integration. No local test execution is claimed in this report.

## Exact reviewed identities

- Repository: [`dunay2/dvt`](https://github.com/dunay2/dvt)
- Exact current `main`: [`8eb0f5a7551d46c909a024b86f66cf3580c20691`](https://github.com/dunay2/dvt/commit/8eb0f5a7551d46c909a024b86f66cf3580c20691)
- Current main merge: [PR #1996 — Harden DBT code persistence reconciliation](https://github.com/dunay2/dvt/pull/1996)
- Current release-governance branch: [`fix/release-candidate-integrity`](https://github.com/dunay2/dvt/tree/fix/release-candidate-integrity)
- Current release-governance PR: [PR #2002 — Enforce trusted release candidate integrity](https://github.com/dunay2/dvt/pull/2002)
- PR #2002 current head: [`71aacd28b8a901053a4f60663b8a9dc74160d7d1`](https://github.com/dunay2/dvt/commit/71aacd28b8a901053a4f60663b8a9dc74160d7d1)
- Open release candidate: [PR #1984 — Release 0.5.0](https://github.com/dunay2/dvt/pull/1984)
- Release candidate head: [`15783c8dddfd57e4a34ef282e6d919ead2956ef9`](https://github.com/dunay2/dvt/commit/15783c8dddfd57e4a34ef282e6d919ead2956ef9)
- Previous point-in-time review: [PR #2003](https://github.com/dunay2/dvt/pull/2003)
- This review branch: `agent/dvt-review-20260720-1238`

## Executive verdict

There is still **no product-code delta on `main`**. The exact product transaction remains incomplete:

1. Code persistence and DBT reconciliation are still compressed into one scalar phase;
2. reconciliation is still not causally bound to the exact whole-project revision produced or admitted by the save;
3. graph-generated DBT artifacts are still published one file at a time despite an existing atomic batch authority;
4. Preview and Run carry useful provenance, but Code reconciliation does not yet provide the exact accepted project revision that should gate them;
5. workspace import capability and interactive workspace capability still contradict each other.

There is, however, a material repository delta since the previous review.

First, PR #2002 has been repaired substantially. Its former Planning DB failure is gone, its two P2 review threads are resolved, and all six visible workflows on its current head are green. The branch now separates label mutation into a dedicated trusted workflow and removes the credential-dependent base fetch.

Second, a new non-outdated **P1 review thread** exposes a deeper release-control defect: the required `Release candidate integrity` context is produced by a `pull_request_target` workflow. The native check is associated with the trusted base/default-branch event SHA, while the ruleset requires the context on the pull-request head. The assessment can therefore be correct yet fail to provide a merge-admissible check on the exact candidate SHA. PR #2002 is still not merge-ready until exact-head check publication is demonstrated.

Third, eight new Dependabot pull requests arrived together. Every one currently fails the required PR Quality Gate. Several also fail Code Quality, CodeQL, or Test Suite. The most dangerous is PR #2009: it jumps `react-resizable-panels` from 2.1.7 to 4.12.2, changes no product source or compatibility tests, and currently fails the Web frontend test lane. This is not routine dependency hygiene; it is a UI platform migration disguised as a lockfile bump.

The immediate repository priority is therefore to close the exact-head release-check identity defect in PR #2002 and to triage the dependency burst without merging unrelated failures together. The next product slice remains the narrow split of Code persistence and reconciliation state.

## Material delta since the previous review

### Fixed since the 08:45 review

PR #2002 now has three commits, twenty-five changed files, and a green six-workflow head. The following previous findings are fixed on that unmerged branch:

- **Fixed on branch, not in main:** Planning DB bootstrap failure. PR Quality Gate is now green.
- **Fixed on branch:** labeler permission regression. Label mutation moved to a dedicated base-controlled `pr-labeler.yml` workflow with its own write authority; required quality checks remain read-oriented.
- **Fixed on branch:** unauthenticated base-ref fetch. The trusted workflow now uses immutable `github.event.pull_request.base.sha` and `head.sha` inputs instead of relying on a credential-persisting fetch sequence.

These are real improvements. They do not make the release candidate or product transaction correct by themselves.

### New release-governance blocker

PR #2002 configures `Release candidate integrity` as a required status context, but `.github/workflows/release-candidate-integrity.yml` runs only on `pull_request_target`. The current workflow is base-trusted and safely inspects the candidate as data, but the required check identity must exist on the exact PR head SHA. A new unresolved P1 review thread correctly blocks merge until this is proven.

This is another example of **evidence identity drift**: the validation logic can be sound while the check is attached to the wrong Git object.

### New dependency burst

The repository now has eight fresh dependency PRs:

- #2004: `actions/setup-python` 6.3.0 → 7.0.0;
- #2005: `github/codeql-action/init` 4.37.0 → 4.37.1;
- #2006: `github/codeql-action/analyze` 4.37.0 → 4.37.1;
- #2007: `markdownlint-cli2` 0.23.0 → 0.23.1;
- #2008: Temporal TypeScript SDK group 1.18.1 → 1.20.3;
- #2009: `react-resizable-panels` 2.1.7 → 4.12.2;
- #2010: `@radix-ui/react-menubar` 1.1.16 → 1.1.21;
- #2011: `@radix-ui/react-navigation-menu` 1.2.5 → 1.2.19.

All eight are currently blocked by CI. No review threads exist on these dependency PRs yet.

### No product implementation delta

`main` remains exactly `8eb0f5a7551d46c909a024b86f66cf3580c20691`. No Code, Canvas, API, contract, runtime, workspace, or product behavior changed. Previous product findings must therefore be re-evaluated against the same exact code, not restated as if they were newly discovered.

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

| PR | Head / scope | Current CI | Verdict |
| --- | --- | --- | --- |
| [#2002](https://github.com/dunay2/dvt/pull/2002) | `71aacd28`; release-candidate integrity | Six visible workflows green | Meaningful advance, but blocked by unresolved P1 exact-head required-check identity and the still-active two-resource policy-write rollback gap. |
| [#2004](https://github.com/dunay2/dvt/pull/2004) | `c8e1ee3c`; setup-python major | Five green, PR Quality failed | Do not merge until required governance passes and the Node/ESM action transition is verified on every Python-using workflow. |
| [#2005](https://github.com/dunay2/dvt/pull/2005) | `c1dd45f9`; CodeQL init | Contracts, tests, dependency review green; CodeQL, Code Quality, PR Quality failed | Split CodeQL action components create version-skew risk. Replace with one coordinated CodeQL action update. |
| [#2006](https://github.com/dunay2/dvt/pull/2006) | `7e5c11d8`; CodeQL analyze | Contracts, tests, dependency review green; CodeQL, Code Quality, PR Quality failed | Same verdict as #2005; init/analyze must move as one validated unit. |
| [#2007](https://github.com/dunay2/dvt/pull/2007) | `7093f2e7`; markdown lint patch | Five green, PR Quality failed | Low runtime risk, still not mergeable while required governance fails. |
| [#2008](https://github.com/dunay2/dvt/pull/2008) | `f9efa513`; Temporal SDK minor group | Five green, PR Quality failed | Runtime-significant. The failure occurs in ARC docs/evidence validation; Temporal replay, bundling, worker and time-skipping integration evidence must be updated and rerun. |
| [#2009](https://github.com/dunay2/dvt/pull/2009) | `7f1b1e74`; resizable panels major | Contracts, CodeQL, dependency review green; Code Quality, Test Suite, PR Quality failed | High-risk UI migration. Web primary suites fail. Do not treat as an automatic dependency bump. |
| [#2010](https://github.com/dunay2/dvt/pull/2010) | `76b4357e`; Radix menubar | Five green, PR Quality failed | Requires focused keyboard, focus-loss, submenu and accessibility browser proof. |
| [#2011](https://github.com/dunay2/dvt/pull/2011) | `82032376`; Radix navigation menu | Five green, PR Quality failed | Requires focus, `aria-controls`, keyboard and React render-regression proof. |
| [#2003](https://github.com/dunay2/dvt/pull/2003) | Documentation-only predecessor | PR Quality and Code Quality green; heavy lanes skipped | Superseded by this review. |
| [#2001](https://github.com/dunay2/dvt/pull/2001) | Documentation-only predecessor | Previously validated docs-only | Superseded. |
| [#2000](https://github.com/dunay2/dvt/pull/2000) | Documentation-only predecessor | Previously validated docs-only | Superseded. |
| [#1999](https://github.com/dunay2/dvt/pull/1999) | Documentation-only predecessor | Previously validated docs-only | Superseded. |
| [#1984](https://github.com/dunay2/dvt/pull/1984) | `15783c8d`; release 0.5.0 | Six workflows `action_required` | Stale and not release-ready. Must not merge or tag. |

Four superseded point-in-time review PRs now remain open before this review is added. This is low-grade duplicate authority. They are useful historical evidence, but they should not all remain discoverable as competing “current” truth.

## CI and exact-tree identity

### Exact current main

`main@8eb0f5a7551d46c909a024b86f66cf3580c20691` has no connector-visible workflow run or commit status. PR #1996's final branch head was green, but that is not machine-readable validation attached to the exact merge tree now published as `main`.

This remains an operability and release-truth gap. A mature delivery system admits the exact tree that will be tagged or deployed, not a nearby PR head or ephemeral merge simulation.

### PR #2002

Current head `71aacd28b8a901053a4f60663b8a9dc74160d7d1`:

- Contracts & Determinism: success;
- Dependency Review: success;
- CodeQL: success;
- CI — Code Quality: success;
- Test Suite: success;
- PR Quality Gate: success.

The prior gate failure is fixed. The remaining issue is not test failure but **check publication identity**. Green checks are insufficient if the context required by the ruleset is not attached to the exact pull-request head.

### Dependency cohort

The cohort exposes two governance facts:

1. the repository is correctly refusing automatic dependency merges when evidence is incomplete;
2. the current dependency-update workflow produces a queue of isolated PRs that often require coordinated changes and product-specific proof.

The second point matters. Separate PRs for `codeql-action/init` and `codeql-action/analyze` are a mechanical decomposition, not a coherent deployment unit. A major UI dependency bump with no source adaptation is likewise not a safe unit just because Dependabot generated it.

### Release PR #1984

All six visible workflows on `15783c8d` remain `action_required`:

- Test Suite;
- PR Quality Gate;
- Contracts & Determinism;
- Dependency Review;
- CI — Code Quality;
- CodeQL.

GitHub metadata says the PR is mergeable. That is not release evidence.

## Review-thread state

### PR #2002

#### Resolved — labeler permission regression

The prior P2 is resolved. The write-capable labeler was removed from the required read-oriented quality job and moved behind a dedicated trusted workflow.

#### Resolved — unauthenticated base fetch

The prior P2 is resolved. The trusted workflow now uses exact event SHAs instead of depending on repository visibility for anonymous fetch success.

#### Unresolved P1 — required check is not proven on the candidate head

The current release-candidate workflow runs on `pull_request_target`. The base-trusted design is appropriate for inspecting an untrusted release candidate, but native workflow check identity follows the event/base SHA. The ruleset requires `Release candidate integrity` as a status context for the PR head. The implementation must publish or produce the required context on `github.event.pull_request.head.sha` without executing candidate code with write authority.

This thread is non-outdated and release-blocking.

### PR #1996

Two P1 threads remain correctly resolved and supported by merged commits:

- editing during DBT reconciliation no longer lets `flush()` approve a later unsaved buffer;
- editing while persistence is in flight no longer lets the old acknowledgement hide the later buffer.

One P2 thread remains unresolved and non-outdated:

- reconciliation is pending for persisted bytes `A`;
- the user edits to `B`, moving the scalar phase to `modified`;
- the user returns to `A` before reconciliation completes;
- `persistedReconciliationPhase` is still null, so the reducer reports `synchronized`;
- the matching later result is rejected because completion requires `phase === 'reconciling'`;
- invalid, stale, unavailable, superseded, verification-unavailable, or failed semantic truth can disappear.

### Other open PRs

No review threads were found on #1984 or on dependency PRs #2004 through #2011. Absence of review comments does not remove objective CI and compatibility blockers.

## Previous finding disposition

| Finding | Status now | Evidence and interpretation |
| --- | --- | --- |
| Raw selection-recovery transport detail shown to users | **Fixed** | Localized, sanitized copy replaced direct raw transport detail. |
| Manual DBT file selection snaps back | **Fixed** | Corrected and regression-tested in PR #1993. |
| Scope switch retains stale selected file | **Fixed** | Corrected and regression-tested in PR #1993. |
| Edit during persistence can be lost | **Fixed** | PR #1996 retains the later buffer and requires a second save. |
| Edit during reconciliation can be approved before later save | **Fixed** | PR #1996 returns the later buffer to modified and serializes the save. |
| Pending reconciliation disappears after edit/revert | **Still active** | Exact reducer path and unresolved PR #1996 P2. |
| Save receipt is not bound to exact whole-project revision | **Still active** | Canvas receives `_receipt` but ignores it and refetches latest projection. |
| Graph-generated artifacts can partially mutate a project | **Still active** | `canvasPlanAction.ts` performs sequential single-file saves although an atomic batch port exists. |
| DVT needs a new mutation DSL | **Disproved** | Existing API contracts already provide CAS, batch mutation, idempotency, conflicts, atomic replacement, and receipts. |
| File-backed Preview/Run have no provenance | **Disproved as a broad claim** | Existing strategies carry project content-set, analysis, DBT version, target, selection, and artifact provenance. The remaining defect is causal admission from Code reconciliation. |
| Release notes duplicate merge/parent outcomes | **Still active** | PR #1984 contains duplicate execution-selection entries for `ec47025` and `fa240f8`. |
| No trusted release-candidate admission boundary exists | **Superseded as a route, not fixed in main** | PR #2002 implements the boundary but is unmerged and still has exact-head check identity wrong. |
| PR #2002 Planning DB bootstrap is broken | **Fixed on branch** | Current PR Quality Gate is green. |
| PR #2002 labeler authority is mixed into required checks | **Fixed on branch** | Dedicated trusted labeler workflow. |
| PR #2002 base fetch depends on public anonymous access | **Fixed on branch** | Exact base/head SHAs are used. |
| Release policy configure is atomic | **Disproved** | Repository settings are patched before the ruleset PUT; failure between them leaves partial policy. |
| Exact release/main tree has attached validation evidence | **Still active** | Exact main has no visible run; release head is `action_required`; PR #2002 check identity is not on exact candidate head. |
| Accepted project scale matches interactive workspace capability | **Still active** | Import accepts up to 10,000 source files/50 MB; explorer silently truncates at 500 and rejects files above 1 MB as invalid paths. |
| Workspace Web API responses are runtime-schema validated | **Disproved** | `createApiClient` returns parsed JSON through `as TResponse`; nearby contract-aware rails show a safer model. |
| Human current-state documentation is current | **Disproved** | `system-delivery-status.md` calls itself current but was last reviewed 2026-04-26. |
| Dependency PRs are routine low-risk maintenance | **Disproved** | Every new dependency PR fails a required gate; #2009 also fails Web tests and Code Quality. |

## Current product and architecture assessment

### Product value that is real

DVT is not merely a governance framework. Current `main` contains real product and platform value:

- file-authoritative DBT project import;
- exact content and analysis hashes in project graph projections;
- Canvas lineage projection;
- contextual SQL and YAML authoring;
- CAS single-file saves with immutable receipts;
- idempotent atomic batch mutation in the API/local adapter;
- Preview and Run provenance;
- protected browser proofs;
- architecture and feature-mechanization guards;
- navigation protection and localized recovery copy;
- Temporal, Postgres, outbox, projection, OpenLineage, and protected runtime foundations.

The criticism below concerns incomplete authority boundaries and evidence identity, not absence of engineering.

### Code working-tree model: responsibility overload and temporal coupling

[`codeWorkingTreeSyncModel.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts) stores local persistence posture and semantic reconciliation posture in one `phase` enum.

That scalar owns:

- clean/dirty buffer state;
- saving;
- conflict and persistence failure;
- reconciliation pending;
- fresh/degraded semantic state;
- verification unavailability;
- superseded authority.

This is classic responsibility overload and primitive obsession. The state space is a product of independent axes but is encoded as one string protocol. Correctness then depends on event order. The active edit/revert defect is not an isolated missing branch; it is proof that the representation is wrong.

### Canvas reconciliation: hidden authority

[`useDbtProjectFileCanvasController.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts) accepts a `WorkspaceFileSaveReceipt` in `reconcileCodeFilePersistence`, names it `_receipt`, ignores it, and refetches the latest project graph.

The UI receives `projectContentSetSha256` and `analysisSha256`, but the result is not proven to describe the project revision causally associated with the save being reconciled. “Latest query result” silently replaces “revision admitted for this operation.” That is hidden authority and stale-truth risk.

### Canvas publication: partial transaction despite an existing atomic authority

[`canvasPlanAction.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/views/canvas/canvasPlanAction.ts) writes graph-generated DBT artifacts sequentially through `saveFileContent`.

If a conflict or I/O failure occurs after the first write, the project can be partially changed. This is a data-integrity defect, not merely an implementation preference.

The repository already has the necessary language and implementation:

- `WorkspaceFileBatchMutation`;
- complete expected-file set;
- write/delete set;
- idempotency key;
- batch conflict result;
- immutable batch receipt;
- local atomic replacement coordinator.

Creating another publication DSL or client-side compensating protocol would duplicate authority.

### API and contracts: strong command-side semantics, inconsistent response validation

The API workspace-file contracts are comparatively mature: explicit expected revisions, immutable save receipts, conflicts, batch idempotency, and scoped storage authority.

The Web transport boundary is less disciplined. [`createApiClient.ts`](https://github.com/dunay2/dvt/blob/8eb0f5a7551d46c909a024b86f66cf3580c20691/apps/web/src/app/services/api/createApiClient.ts) parses JSON and casts it to `TResponse`. TypeScript generics provide compile-time expectation, not runtime proof. A malformed or version-skewed workspace response can enter the application as trusted shape.

The route forward is not a global rewrite. New or modified workspace/reconciliation rails should be schema-first using shared `@dvt/contracts` schemas, and existing high-value rails should migrate incrementally.

### Runtime and recovery

DVT has credible runtime foundations: Temporal adapter integration, Postgres isolation, outbox and projection workers, protected routes, run snapshots, and provenance. The current authoring recovery story is less complete:

- navigation and workbench close are guarded for unresolved local authority;
- same-session retries retain contextual targets;
- hard browser termination still lacks a clearly demonstrated durable local draft/recovery transaction;
- ignored stale reconciliation outcomes are not yet a first-class observable event.

A browser crash should not be solved inside the immediate reducer hotfix. It belongs after a stable authoring-session boundary exists.

### Operability and observability

Current observability is strongest around runtime execution and weakest around the authoring transaction. The authoring boundary needs stable events and metrics for:

- persistence started/succeeded/conflicted/failed;
- reconciliation started/fresh/degraded/failed/superseded;
- ignored result due to receipt mismatch;
- pending reconciliation duration;
- edits during save and reconciliation;
- Preview/Run project-revision mismatch;
- batch publication conflict/failure/deduplicated retry;
- exact-SHA release admission and check publication.

Do not log source SQL, YAML content, access tokens, or raw transport errors. Workspace/project identifiers should be scoped and opaque; content and analysis hashes are appropriate correlation material.

### Accessibility and UI dependency risk

The product has meaningful keyboard and browser work, including node workbench reachability and protected Cypress proofs. That evidence does not automatically cover major component-library changes.

PR #2009 changes the panel library across two major versions and currently fails the Web frontend suite. Required proof includes:

- keyboard resizing and separator focus;
- correct ARIA role/state and focus-visible behavior;
- pointer capture, touch, right-click and double-click behavior;
- collapsed/zero-size panels;
- stored layout migration and reload;
- responsive resizing and owner-document behavior;
- Code workbench, inspector, console, and any other panel consumer in a real browser.

PRs #2010 and #2011 also require focused keyboard/focus/ARIA proofs, even though their version changes are smaller.

### Performance and capability truth

`LocalDbtProjectImportInspector` accepts by default:

- 10,000 project files;
- 100,000 inspected entries;
- 50 MB project bytes;
- 5,000 directories;
- depth 64.

`LocalWorkspaceFileRepository` exposes:

- silent listing truncation at 500 files;
- 1 MB read/write limit;
- oversized content reported as `InvalidWorkspacePathError`.

This is product inconsistency. A project can be accepted, analyzed, and represented in the graph while the interactive file surface cannot prove whether a missing file is absent or merely omitted, and cannot distinguish oversized content from an invalid path.

### Security and data integrity

Positive security properties:

- scoped workspace paths;
- CAS writes;
- atomic local replacement;
- idempotent batch receipts;
- protected runtime routes;
- base-trusted release-candidate inspection;
- candidate code is treated as data rather than executed with write credentials;
- user-visible recovery copy no longer leaks raw transport diagnostics.

Active risks:

- required release evidence can be attached to the wrong SHA;
- release-policy configuration can partially mutate GitHub settings;
- sequential Canvas artifact writes can leave partial project state;
- generic Web JSON casts weaken boundary validation;
- oversized-file and truncated-list errors conceal true capability state;
- dependency updates can alter privileged workflow actions or accessibility primitives without cohesive migration proof.

### Documentation and governance

The repository has extensive architecture and planning evidence, but the current-truth surfaces are fragmented:

- `docs/architecture/system-delivery-status.md` declares itself the current implementation snapshot yet was last reviewed on 2026-04-26;
- multiple open review PRs claim point-in-time current status;
- the release PR exposes commit topology rather than a concise product-outcome model;
- exact `main` lacks attached CI evidence;
- narrow work often requires several Planning DB migrations and cross-surface evidence updates.

This is governance amplification. The solution is not to remove governance; it is to stabilize smaller domain boundaries and reduce repeated migration rewrites for one capability.

## Fowler-style smell summary

### Responsibility overload

- one Code `phase` owns persistence and semantic state;
- one operator command promises one merge policy while mutating two GitHub resources;
- one dependency bot PR can represent a major product UI migration without owning product proof.

### Primitive obsession

- phase strings encode a rich asynchronous protocol;
- branch-name prefix identifies release candidates before stronger identity is applied;
- generic `TResponse` casts stand in for runtime contracts;
- raw numeric limits are duplicated across import, repository, and batch adapters without one effective capability policy.

### Temporal coupling

- reconciliation correctness depends on exact edit/result ordering;
- “latest graph” substitutes for a receipt-bound project revision;
- required check success depends on which SHA GitHub associates with an event type;
- release validity depends on workflow runs from nearby heads rather than exact tag target.

### Hidden and duplicate authority

- latest graph refetch versus save receipt;
- sequential file writes versus existing batch authority;
- multiple current-review PRs;
- Release Please generated notes versus product-outcome truth;
- imported project capacity versus interactive workspace capacity.

### Shotgun surgery

- PR #2002 spans workflows, scripts, tests, docs, configuration, and seven migrations;
- dependency updates arrive as eight PRs but several need coordinated migration units;
- Code interleavings repeatedly reopen reducer, hook, view, browser, architecture, and governance evidence.

### Test-only confidence

- PR-head green does not prove exact-main or exact-tag identity;
- release-candidate logic green on base SHA does not prove required check on head SHA;
- package tests do not prove major panel-library browser compatibility;
- generic transport tests do not prove runtime schema validation.

### Product dead ends to avoid

- adding more branches to the overloaded Code enum indefinitely;
- inventing a second graph or mutation language;
- treating “latest projection” as transaction identity;
- cloning NiFi Registry;
- embedding Temporal workflows into editor interactions;
- building deployment promotion UI before atomic project publication;
- merging a dependency avalanche to clear the queue.

## Mature-system comparison: Match / Differentiate / Defer

### dbt Cloud / Studio and professional dbt authoring

Reference: <https://docs.getdbt.com/docs/cloud/studio-ide/ide-user-interface>

**Match**

- distinguish editor buffer, persisted file, parse/compile state, diagnostics, execution, and version-control posture;
- bind Preview/Run to an identifiable project revision;
- expose command output and semantic errors separately from save success.

**Differentiate**

- preserve DVT's graph-first contextual authoring and bidirectional Code/Canvas projection;
- keep DBT files as semantic authority rather than inventing a second canonical graph language.

**Defer**

- broad collaboration, environment management, and hosted Git features until the core authoring transaction is correct.

### Dagster

Reference: <https://docs.dagster.io/>

**Match**

- connect assets, lineage, checks, freshness, materialization, and execution evidence;
- make invalid/stale quality state inspectable as product truth.

**Differentiate**

- DVT's immediate source of truth remains DBT project files and DBT semantics;
- do not replace DBT resources with a parallel asset language.

**Defer**

- generalized asset orchestration, sensors, schedules, and cross-system catalog behavior until revision identity is stable.

### Airflow

Reference: <https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/dag-bundles.html>

**Match**

- retain the exact project content-set revision admitted by a Preview or Run;
- rerun/reopen against that revision or explicitly reject it;
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
- exact code/configuration provenance for execution.

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
- support inspect/revert/commit-style recovery semantics.

**Differentiate**

- use Git/project-file and content-hash identity.

**Avoid**

- do not clone NiFi Registry. Apache declared it deprecated in February 2026 and recommends Git-based flow registry clients.

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
- use Temporal where operations are genuinely long-running and cross-service.

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

- full branch/worktree management inside DVT.

## Expert implementation route

The route separates release-governance remediation, dependency maintenance, and product development. Do not combine them into one branch.

## Priority 0A — publish release-candidate integrity on the exact candidate head

### Severity and evidence

**P1 release integrity.** PR #2002 is green but has an unresolved non-outdated thread showing that its required context is not proven on the exact candidate SHA.

### Root cause

A base-trusted `pull_request_target` workflow is being used both to assess untrusted candidate data and to satisfy a head-SHA required check. Those are different responsibilities and Git identities.

### User/product impact

- valid release candidates can remain unmergeable because the required context is missing on the head;
- worse, operators may mistake a base-SHA green run for exact candidate evidence;
- release admission becomes dependent on GitHub event semantics rather than an explicit domain receipt.

### Exact domain owner

CI/release-candidate integrity component:

- `.github/workflows/release-candidate-integrity.yml`;
- `tools/ci/release-candidate-integrity/*`;
- release merge-policy projection and tests;
- CI governance documentation and mechanization.

### Proposed contracts/domain objects

Retain the existing candidate assessment. Add an explicit publication model, for example:

```ts
type ReleaseCandidateIntegrityCheckPublication = Readonly<{
  repository: string;
  pullRequestNumber: number;
  assessedBaseSha: string;
  assessedHeadSha: string;
  assessmentFingerprint: string;
  conclusion: 'success' | 'failure';
  checkContext: 'Release candidate integrity';
}>;
```

This is not a product runtime contract. It belongs in the trusted CI specification and must be tested as a pure projection before GitHub API publication.

### Command/query and port changes

- query exact PR metadata from the trusted event;
- assess immutable base/head objects exactly as today;
- publish a Check Run or commit status explicitly against `github.event.pull_request.head.sha`;
- use minimal `checks: write` or `statuses: write` permission only in the publication job;
- do not execute candidate code or candidate workflow definitions with write authority;
- make the ruleset require the exact context produced by that publisher.

### Likely files/components

- `.github/workflows/release-candidate-integrity.yml`;
- optional dedicated reusable trusted workflow/action for check publication;
- `releaseCandidateIntegrity.mjs` and tests;
- `releaseMergePolicyCli.mjs` and tests;
- CI governance component docs;
- Planning DB records only if the component contract changes materially.

### Migration and compatibility strategy

1. Add head-SHA publication while keeping the old workflow non-required.
2. Prove the new context on a normal product PR and the release PR.
3. Update the ruleset to require the new exact context.
4. Remove or rename the ambiguous native workflow context.

Do not switch the ruleset first.

### Rollback posture

Remove the new required context from the ruleset and disable the publisher. No product data or candidate branch must be mutated. Preserve assessment logs for audit.

### Observability

Emit structured evidence containing PR number, base SHA, head SHA, assessment fingerprint, check-run/status identifier, conclusion, and publication attempt. Never log tokens.

### Security implications

- minimal write permission;
- base-trusted code only;
- no candidate install, import, or execution;
- same-repository/fork policy explicit;
- stale synchronize events must not overwrite a newer head result;
- API output and check summary must be sanitized.

### PR decomposition

- **PR 2002 follow-up commit A:** exact-head check publisher and pure tests;
- **commit B:** workflow/static governance tests and live evidence;
- **commit C:** ruleset configuration update after proof;
- keep operator policy rollback work separate if it expands scope.

### Red/green tests

Red first:

- `pull_request_target` native check is not accepted as proof for head SHA;
- publisher called with base SHA must fail specification tests;
- synchronize from older head cannot overwrite latest head state;
- forked/untrusted metadata cannot redirect publication;
- failed assessment publishes failure on exact head.

Green:

- check/status appears on exact head SHA;
- context name and integration identity match the ruleset;
- candidate code is never executed;
- rerun is idempotent for same assessment fingerprint.

### Live integration proof

On PR #1984 or a disposable release-candidate PR:

1. record exact head SHA;
2. run trusted assessment;
3. inspect commit checks for that exact SHA;
4. prove `Release candidate integrity` is present and conclusive there;
5. push a new candidate head and prove the old result does not admit it;
6. prove a normal product PR receives a truthful not-applicable/success posture as designed.

### Acceptance criteria

- required context exists on exact candidate head;
- ruleset admits only the assessed head;
- stale head results cannot satisfy current head;
- no candidate code executes with write capability;
- all six existing lanes plus the exact-head proof are green;
- unresolved P1 thread is answered with the fixing commit and resolved.

### Release gate

PR #2002 must not merge until the exact-head check is visible and required on its own final head or on a representative candidate head.

## Priority 0B — triage the dependency cohort as coherent migration units

### Severity and evidence

**P1 delivery stability.** Eight open dependency PRs all fail a required gate. PR #2009 additionally fails Web tests and Code Quality. #2005 and #2006 split one CodeQL action release across two failing PRs.

### Root cause

Dependabot decomposes by package reference, while the repository's real compatibility units are workflows, runtime adapters, and UI component systems.

### User/product impact

- merging individually can create version skew or hidden UI/runtime regressions;
- leaving all open creates noise and stale security posture;
- merging in bulk destroys fault isolation.

### Exact domain owners

- CI governance for #2004–#2007;
- Temporal runtime/worker component for #2008;
- Web shell/layout component for #2009;
- Web navigation/menu primitives for #2010–#2011.

### Proposed contracts/domain objects

No new product contracts. Define evidence packs per compatibility unit:

- `CodeqlActionVersionSet` — init/analyze/upload components pinned coherently;
- `TemporalSdkCompatibilityEvidence` — replay, worker, integration, bundling and telemetry proof;
- `ResizablePanelCompatibilityEvidence` — consumer inventory and browser proof;
- `RadixNavigationCompatibilityEvidence` — keyboard/focus/ARIA proof.

### Command/query and port changes

None unless upstream APIs require source adaptation. Keep dependency PRs free of unrelated product work.

### Migration strategy

- close/recreate #2005 and #2006 as one coordinated CodeQL PR;
- treat #2009 as a manual migration PR with source changes and tests, not a bot-only bump;
- update #2008 with required ARC evidence and run all Temporal integration lanes;
- group #2010/#2011 only if their shared Radix dependency graph and browser proofs remain coherent;
- keep #2004 and #2007 independent after governance repair.

### Rollback posture

Every dependency unit must be revertible by one commit/PR without schema or data migration. Do not combine with product state changes.

### Observability

Record versions in build provenance and expose Temporal worker/SDK version in diagnostics where already supported. UI dependency changes need browser test artifacts, not production telemetry additions.

### Security implications

- pinned action SHAs remain mandatory;
- CodeQL components must not drift;
- major UI dependencies affect focus and ARIA behavior;
- Temporal replay compatibility is correctness-sensitive;
- bot PR permissions must remain least-privilege.

### Red/green tests and live proof

- #2004: run every Python-using workflow on a representative PR and manual dispatch;
- #2005/#2006: CodeQL init/analyze/upload complete together and SARIF is accepted;
- #2008: unit, replay, time-skipping, transformation, Postgres capability, worker startup/readiness, and workflow bundle tests;
- #2009: Web typecheck, primary tests, protected Cypress panel workflows, keyboard and pointer accessibility proof;
- #2010/#2011: menu navigation, focus restoration, nested interactive descendants, window blur, `aria-controls`, React render stability.

### Acceptance criteria and release gate

No dependency PR merges while any required lane fails. Major runtime/UI updates require an explicit compatibility note and live proof. Merge one coherent unit at a time.

## Priority 1 — split Code persistence and reconciliation state

### Severity and evidence

**P2 correctness and release blocker.** Active non-outdated PR #1996 thread and exact reducer path.

### Root cause

One `phase` enum stores the Cartesian product of persistence and semantic reconciliation.

### User/product impact

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
  | Readonly<{ kind: 'saving'; requestId: number; content: string; expectedRevision: string }>
  | Readonly<{ kind: 'conflict' }>
  | Readonly<{ kind: 'failed' }>;

type CodeReconciliationState =
  | Readonly<{ kind: 'not-required' }>
  | Readonly<{ kind: 'pending'; receipt: WorkspaceFileSaveReceipt }>
  | Readonly<{ kind: 'fresh'; receipt: WorkspaceFileSaveReceipt; analysisSha256: string; projectContentSetSha256: string }>
  | Readonly<{ kind: 'degraded'; receipt: WorkspaceFileSaveReceipt; freshness: 'stale-last-valid' | 'invalid' | 'unavailable' }>
  | Readonly<{ kind: 'verification-unavailable'; receipt: WorkspaceFileSaveReceipt }>
  | Readonly<{ kind: 'superseded'; receipt: WorkspaceFileSaveReceipt; currentContentSha256: string }>
  | Readonly<{ kind: 'failed'; receipt: WorkspaceFileSaveReceipt }>;
```

A pure projection derives UI status. Edits change only persistence. Reconciliation results match receipts and update only reconciliation.

### Command/query and port changes

No external API change in this slice. Reuse `WorkspaceFileSaveReceipt` and current hook callbacks. Do not introduce the whole-project reconciliation API yet.

### Migration/compatibility

Internal reducer migration only. Preserve current public hook/status outputs temporarily through a projection adapter, then remove legacy scalar state after all consumers migrate.

### Rollback

One Web-only revert. No persisted data migration.

### Observability

Add events for edit-during-save, edit-during-reconciliation, matching result accepted, mismatched result ignored, and reconciliation pending duration.

### Security

Do not log source content or raw errors. Receipt/hash metadata is sufficient.

### PR decomposition

One narrow functional PR:

- reducer/state types;
- hook adaptation;
- status projection;
- reducer/hook/presentation tests;
- one protected browser proof;
- answer and resolve PR #1996 P2.

### Red/green tests

- `reconciling A → edit B → revert A → invalid` ends `persisted_invalid`;
- same sequence with fresh ends synchronized only after fresh result arrives;
- failure after revert ends `reconciliation_failed`;
- old receipt is ignored after a newer save;
- dirty buffer preserves semantic result and reveals it when clean;
- pending analysis remains visible while bytes equal persisted content;
- `flush()` distinguishes durable bytes from semantic freshness.

### Live browser proof

Delay reconciliation in the protected DBT Code flow, edit and revert, then deliver invalid/fresh/failure outcomes. Assert status, navigation behavior, and no lost content.

### Acceptance and release gates

- no edit/revert interleaving loses matching semantic truth;
- synchronized means bytes durable and semantic state fresh/not-required;
- reducer and hook tests green;
- protected browser proof green;
- exact final head CI green;
- PR #1996 thread resolved with commit evidence.

## Priority 2 — bind reconciliation to an exact project revision

### Severity and evidence

**P1 semantic authority.** The controller ignores the save receipt and refetches latest graph state.

### Root cause

File persistence identity and whole-project analysis identity are correlated by timing, not joined by a domain result.

### User/product impact

A concurrent change to another project file can make a fresh projection describe a different project snapshot than the save the UI claims to have reconciled.

### Exact domain owner

API/application DBT project-from-files query/reconciliation component. Web Canvas is an adapter/consumer.

### Proposed contract

Reuse existing concepts:

- `WorkspaceFileSaveReceipt`;
- `DbtProjectRevision` / `projectRevision.contentSetSha256`;
- `DbtProjectGraphProjection.analysisSha256`;
- `ProjectDbtGraphFromFiles` query rail;
- file CAS semantics.

```ts
type ReconcileWorkspaceFileWithDbtProjectResult =
  | Readonly<{ kind: 'fresh'; saveReceipt: WorkspaceFileSaveReceipt; projectContentSetSha256: string; analysisSha256: string }>
  | Readonly<{ kind: 'degraded'; saveReceipt: WorkspaceFileSaveReceipt; projectContentSetSha256: string; freshness: 'stale-last-valid' | 'invalid' | 'unavailable'; diagnostics: readonly StableDbtDiagnostic[] }>
  | Readonly<{ kind: 'superseded'; saveReceipt: WorkspaceFileSaveReceipt; currentFileContentSha256: string; currentProjectContentSetSha256: string }>;
```

### Command/query and port changes

Add one application query/command that:

1. verifies the authoritative file still has the receipt hash;
2. analyzes or reads a projection for an identified project content set;
3. returns exact project and analysis identities;
4. reports superseded rather than pretending the original save produced a newer project state.

Expose the result through shared runtime schemas in `@dvt/contracts`. Do not rely on generic Web casts.

### Likely files

- DBT project query/application service and port;
- contracts schemas;
- API route/adapter;
- Web workspace/DBT port;
- `useDbtProjectFileCanvasController.ts`;
- Code hook integration;
- Preview/Run admission tests.

### Migration and rollback

Additive endpoint/contract first. Keep current callback behind a feature switch only during migration. Rollback returns to current latest-refetch behavior but must not ship after acceptance because that behavior is the defect.

### Observability and security

Emit receipt hash, file hash, project content-set hash, analysis hash, and superseded reason. Sanitize diagnostics; never log source files.

### Tests/live proof

- save model SQL, concurrently modify `schema.yml`, complete analysis;
- prove original file save durable but project result superseded or explicitly points to newer exact revision;
- UI never claims original save produced an unanalysed revision;
- Preview blocks/refreshes when accepted revision differs.

### Acceptance and release gate

Every fresh outcome names the exact file receipt, project content set, and analysis. Preview/Run can consume or reject that exact revision.

## Priority 3 — publish graph-generated DBT artifacts atomically

### Severity and evidence

**P1 data integrity.** Current sequential loop can leave partial project state.

### Root cause

Web orchestration uses single-file command semantics for an aggregate publication, ignoring the existing batch authority.

### Exact domain owner

Workspace-file batch mutation application component and graph-to-DBT artifact publication service.

### Contract/port changes

Reuse `IWorkspaceFileBatchMutationPort` and existing mutation/receipt types. Add only a product-specific command wrapper if needed:

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

The wrapper translates to the canonical batch mutation. It must not create a parallel storage protocol.

### Migration, rollback, observability, security

- route graph-first publication through one API command;
- leave file-backed preview read-only;
- rollback by reverting the Web/API wiring, with no partial migration state;
- emit batch id, request hash, project revision, conflict paths, deduplicated retry;
- normalize and validate every path; enforce workspace scope and limits; do not log content.

### Red/green tests

- conflict on second artifact leaves every original hash unchanged;
- injected failure after preparation commits zero changes;
- same idempotency key returns same receipt;
- same key/different request is rejected;
- resulting receipt identifies all writes and resulting project revision;
- Preview uses the publication receipt.

### Live proof and release gate

Protected browser/API proof with conflict and retry. Zero partial workspace mutation is mandatory.

## Priority 4 — admit Preview and Run against the exact accepted project revision

### Severity

**P1 reproducibility.** Existing provenance is useful but not yet causally gated from Code reconciliation.

### Owner and contracts

Preview/Run admission boundary. Reuse existing execution strategy provenance and project content-set/analysis identities. Add no parallel revision model.

### Required behavior

- Preview names the exact accepted project revision;
- Run consumes the persisted Preview revision;
- changed project state causes explicit refresh/re-preview/reject;
- rerun uses or explicitly rejects the original revision;
- UI shows revision mismatch as product state.

### Tests/live proof

Preview revision A, modify project to B, then attempt Run. The product must not silently run B under A's plan identity.

### Release gate

No “latest files” substitution and exact provenance visible in API, UI, and run snapshot.

## Priority 5 — make workspace capability truthful

### Severity

**P1 product completeness and performance.** Accepted projects can exceed interactive visibility and file size without explicit status.

### Owner and contracts

Workspace inventory/query component. Introduce one shared effective capability policy and result types for:

- paginated inventory;
- complete/partial listing status;
- continuation cursor;
- oversized file distinct from absent/invalid path;
- effective limits exposed to Web.

### Command/query/port changes

Replace `listFiles(): WorkspaceFileEntry[]` with a paginated result or add a versioned query rail. Preserve old endpoint during migration, then remove silent truncation.

### Tests

- 501 files;
- near 10,000 accepted files;
- above listing limit with explicit `partial` and cursor;
- file near and above 1 MB with `oversized` result;
- consistent policy across import, analysis, explorer, Code, save, and batch mutation.

### Acceptance

A user can distinguish absent, omitted, oversized, forbidden, and failed. No silent completeness claim.

## Priority 6 — rebuild release 0.5.0 from truthful product outcomes

### Severity

**P1 release integrity.** Current release PR is stale, duplicated, and unvalidated.

### Required route

After Priorities 0A and 1, regenerate or recreate the release candidate so that:

- merge/parent duplicate outcomes collapse into one user outcome;
- notes separate file authority, graph-generated behavior, execution-selection recovery, and known limits;
- exact candidate head has all required checks;
- exact tag target equals final admitted SHA;
- tree and artifact evidence are machine-readable;
- no known P1/P2 semantic-truth defect is hidden.

### Rollback

Close stale PR #1984 and regenerate; do not edit history or tag an unadmitted SHA.

### Live proof and gate

Check exact candidate SHA, generated changelog, package/manifest version, tag target, artifact checksums, and release-page outcome model.

## Priority 7 — extract a cohesive project authoring-session boundary

Only after Priorities 1–4 demonstrate common behavior, extract an application service owning:

- current accepted project revision;
- active file buffers;
- save receipts;
- reconciliation outcomes;
- Preview/Run admission;
- close/navigation policy;
- durable draft/recovery posture.

Do not build a generic framework first. Extract behavior already proven by model SQL editing, YAML description editing, and atomic artifact publication.

## Priority 8 — restore current-truth hygiene

### Required actions

- close or clearly archive superseded review PRs #1999, #2000, #2001, and #2003 after this review is available;
- refresh `system-delivery-status.md` or rename it so it no longer claims current truth;
- attach CI evidence to exact `main` and exact tag targets;
- reduce repeated Planning DB migration rewrites for one stable component;
- keep one current review pointer and preserve older reports as immutable history.

### Acceptance

A new agent can identify current code, current delivery evidence, current release candidate, and current implementation route without choosing among competing documents.

## Recommended PR sequence

1. **PR #2002 finalization:** exact-head release check publication; resolve P1; all final-head CI green.
2. **Dependency maintenance PRs:** one coherent unit at a time; start with coordinated CodeQL and low-risk lint/action updates, leave #2009 for a manual migration.
3. **Product PR A:** split Code persistence/reconciliation state and close edit/revert defect.
4. **Product PR B:** exact project-revision reconciliation contract and adapter.
5. **Product PR C:** atomic DBT artifact publication using existing batch authority.
6. **Product PR D:** exact Preview/Run revision admission.
7. **Product PR E:** truthful workspace inventory and oversized-file semantics.
8. **Release PR:** regenerate truthful 0.5.0 candidate and validate exact tag target.
9. **Refactor PR:** authoring-session boundary after behavior is stable.
10. **Governance/docs PR:** consolidate current truth and exact-SHA evidence.

Do not combine product PR A with release governance, dependency upgrades, publication batch work, pagination, or a generic authoring abstraction.

## Files the next implementation agent should inspect first

### Release governance

1. `.github/workflows/release-candidate-integrity.yml`
2. `tools/ci/release-candidate-integrity/releaseCandidateIntegrity.mjs`
3. `tools/ci/release-candidate-integrity/releaseCandidateIntegrityCli.mjs`
4. `tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs`
5. `.github/workflows/pr-labeler.yml`
6. `.github/workflows/pr-quality-gate.yml`

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
4. DBT project graph query/application service and contracts
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
- no unresolved non-outdated P1/P2 semantic-truth thread remains;
- Code cannot report synchronized while matching reconciliation is pending or lost;
- reconciliation names exact file, project, and analysis identities;
- generated artifact publication is all-or-nothing and idempotent;
- Preview/Run consume the admitted revision;
- workspace completeness and oversized-file state are explicit;
- dependency migrations have focused compatibility proof;
- security permissions are minimal and candidate code is never executed with write authority;
- rollback and observability are demonstrated;
- current documentation points to one authoritative route.

## Final verdict

DVT has real architecture, runtime, authoring, and governance substance. The repository is also repeatedly paying the cost of incomplete authority boundaries. The same smell appears in Code state, Canvas reconciliation, artifact publication, release checks, dependency automation, capability limits, and documentation: evidence is produced, but not always bound to the exact object or transaction it claims to authorize.

The correct route is not another broad redesign. It is a sequence of narrow vertical slices that make identity explicit:

- exact candidate SHA;
- exact save receipt;
- exact project content set;
- exact analysis;
- exact atomic publication receipt;
- exact Preview/Run revision;
- exact workspace completeness posture.

The immediate action is to finish PR #2002 truthfully, not to merge it because its six workflows are green. The next product action remains the Code persistence/reconciliation split. Everything else should follow from those exact identities rather than from timing, “latest” reads, or broad green evidence.