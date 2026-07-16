---
title: DVT Post-Selection-Safety Architecture and Governance Review — 2026-07-16 13:20 UTC
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
reviewed_commit: 59c4276bf30a5dc7c389988af95dc5ab514a46f6
supersedes:
  - docs/planning/reviews/architecture-and-governance/20260716-0717-dvt-current-state-product-quality-review.md
---

# DVT Post-Selection-Safety Architecture and Governance Review

## Executive verdict

DVT has advanced again since the previous automated review.

The dangerous dbt execution-scope widening defect identified in the prior report is
now fixed and merged through [PR #1966](https://github.com/dunay2/dvt/pull/1966).
An explicit selection containing only a source, metric, exposure, seed, or other
non-executable dbt resource is now rejected instead of being normalized to the
entire executable project.

The current `main` therefore has a materially credible dbt vertical:

```text
validate/import project
  -> bind file authority
  -> analyze and project files into Canvas
  -> edit the working tree with revision protection
  -> import warehouse sources by authority mode
  -> Preview the selected immutable revision
  -> persist PlanRef
  -> StartRun against the same secret-free project bundle
  -> reopen run evidence and provenance
```

The immediate over-execution risk is closed. The next route should not repeat that
finding or reopen Phase 4.

The highest-priority remaining concerns are now:

1. **Execution-selection semantics remain partially inconsistent.** The UI still
   exposes `Select for execution` on every projected dbt resource, while mixed
   selections silently discard non-executable or stale IDs and retain only
   executable roots. The operation is safe from whole-project widening, but the
   product still accepts user input it does not preserve.
2. **Phase 5 is the correct next product phase, but its mutation contract is not
   implementation-ready.** The projection contract publishes visual-edit
   operations as arbitrary strings, while the accepted plan requires concrete,
   lossless, revision-guarded operations. A typed operation vocabulary and one
   narrowly owned YAML mutation slice are required before broad visual editing.
3. **Canonical product truth is stale.** The accepted round-trip plan still marks
   implemented import/projection rails as `not implemented`, and the repository's
   declared current-state document was last reviewed on 2026-04-26.
4. **Quality remains locally strong but product-wide incompletely enforced.** API
   and Web have extensive tests, but the mandatory coverage gate still measures
   only `@dvt/engine` at 65/55/65/65. Accessibility, graph/browser performance,
   load, chaos, telemetry, canary, and multi-worker ordering remain backlog rather
   than release gates.
5. **Dependency and planning drift remain.** API directly uses Zod 3 while
   Contracts uses Zod 4, and open GitHub issues still describe capabilities that
   have since been delivered or materially redesigned.

The recommended product sequence is:

```text
selection-affordance consistency
  -> reconcile current product truth
  -> define one typed Phase-5 edit operation
  -> implement YAML description editing with preservation proof
  -> add tags, generic tests, and unambiguous materialization separately
  -> export
  -> graph-draft adoption
```

API/Web coverage, accessibility, performance, load/chaos, telemetry, and
operational scale-out should progress as parallel quality workstreams rather than
being postponed until after all product phases.

## Review method and limits

This review inspected:

- the current `main` head and recent commit sequence;
- recent merged and closed pull requests;
- current open pull-request state;
- PR-triggered workflow evidence for the latest functional head;
- inline review-thread state for PRs #1966, #1964, #1962, #1959, and #1956;
- the dbt execution-selection policy, projection, API authority resolver, and node
  selection affordances;
- the accepted dbt round-trip product plan and Phase-4 Planning DB reconciliation;
- the current delivery-status document;
- test coverage configuration and package dependency versions;
- current open quality, accessibility, performance, load, telemetry, and
  operational issues;
- the preceding automated review branch and report state.

No local checkout or local test execution was available. The local GitHub clone
path could not resolve `github.com` from the execution environment, so repository
inspection and writes used the connected GitHub application.

The GitHub connector exposes PR-triggered workflow runs for a commit. It does not
return the `push` workflow set for the merge commit through the same operation.
This report therefore distinguishes the latest green PR head from unobserved
merge-SHA push evidence.

## Repository baseline

| Item | Observed state | Assessment |
| --- | --- | --- |
| Default branch | `main` | Canonical base. |
| Reviewed HEAD | [`59c4276bf`](https://github.com/dunay2/dvt/commit/59c4276bf30a5dc7c389988af95dc5ab514a46f6) | Merge of the explicit-selection safety fix. |
| Latest functional PR | [#1966](https://github.com/dunay2/dvt/pull/1966) | Merged; prevents source-only selection from widening Preview scope. |
| Open pull requests | None at review time | No active PR currently owns the next product slice. |
| Latest PR-head CI | Six workflows successful | Strong changed-slice evidence. |
| Unresolved inspected review threads | Zero | The previously stale #1959/#1956 threads have now been mechanically resolved. |
| Previous report PR | [#1965](https://github.com/dunay2/dvt/pull/1965) | Closed unmerged and superseded by #1966 plus this review. |
| Previous report commit | [`7487cee05`](https://github.com/dunay2/dvt/commit/7487cee05d2dd24ff995ad74c8734bbdc345860b) | One report commit ahead of its old base and two commits behind current `main`. |
| Current review branch | `agent/dvt-review-20260716-1320` | Created directly from reviewed `main`; documentation only. |

## Recent delivery sequence

### PR #1962 — File-backed dbt Preview and Run

[PR #1962](https://github.com/dunay2/dvt/pull/1962) completed the Phase-4
revision-bound Preview/Run vertical.

The implementation:

- derives planner input from authoritative server-side dbt analysis;
- never regenerates imported files during file-backed Preview;
- binds Preview to Canvas authority, project root, project revision, analysis hash,
  dbt version, selected unique IDs, and server-owned execution-target identity;
- verifies provenance and graph semantics again at the API boundary;
- persists `PlanRef` evidence;
- rejects stale execution identity;
- binds Temporal execution to the same project revision;
- excludes profiles and secrets from the portable project bundle;
- proves the live browser Preview/Run/reload path.

### PR #1963 — Phase-4 planning reconciliation

[PR #1963](https://github.com/dunay2/dvt/pull/1963) added migration
`703_dbt_project_roundtrip_phase4_feature_state.sql`.

That migration correctly states that Phase 4 is implemented while preserving the
following as separately gated work:

- Phase 5 — conservative visual edits;
- Phase 6 — project export;
- Phase 7 — graph-draft adoption.

### PR #1964 — Live-proof environment authority

[PR #1964](https://github.com/dunay2/dvt/pull/1964) made the live harness own the
complete generated dbt profile and target tuple. This removed dependence on
ambient developer `DBT_PROFILES_DIR`, adapter, target, and credential-reference
values.

### PR #1966 — Explicit selection safety

[PR #1966](https://github.com/dunay2/dvt/pull/1966) fixed the highest-priority
finding from the preceding review.

Current behavior is now:

```text
no explicit selection
  -> all visible executable dbt nodes

explicit executable selection
  -> executable roots plus accepted executable dependencies

explicit selection with zero executable roots
  -> blocked with explicit_selection_has_no_executable_nodes
```

The PR also:

- introduced one shared dbt execution projection for readiness and Preview;
- added API rejection evidence for non-executable file-backed selections;
- added a strict live browser test proving a source-only selection does not send a
  `/plans/preview` request;
- registered component, relation, test, evidence, and Fowler-governance records in
  Planning DB.

This defect must be considered closed unless new evidence demonstrates a distinct
regression.

## Current CI posture

The head commit of PR #1966,
[`a10df556d`](https://github.com/dunay2/dvt/commit/a10df556dccca1a40b66a8e22ff9450652b25e0f),
has successful completed runs for:

- Contracts & Determinism;
- Dependency Review;
- CodeQL;
- Test Suite;
- CI - Code Quality;
- PR Quality Gate.

The current merge commit `59c4276bf` has no PR-triggered workflow runs because it
is the merge SHA. The connector used by this review did not expose its `push`
workflow set. The accurate conclusion is therefore:

- the functional PR head was fully green;
- no current failing PR check was found;
- merge-SHA `push` evidence was not mechanically inspected here.

## Pull-request and review-thread state

No pull request was open at review time.

| PR | State | Review-thread assessment |
| --- | --- | --- |
| [#1966](https://github.com/dunay2/dvt/pull/1966) | Merged | No inline review threads. |
| [#1964](https://github.com/dunay2/dvt/pull/1964) | Merged | One P2, resolved after target/profile authority fix. |
| [#1962](https://github.com/dunay2/dvt/pull/1962) | Merged | Two P2 threads, both resolved; one fixed by #1964 and one intentionally rejected under pre-release compatibility policy. |
| [#1959](https://github.com/dunay2/dvt/pull/1959) | Merged | CodeQL, concurrency, and metadata-migration threads are now resolved with current-main verification comments. |
| [#1956](https://github.com/dunay2/dvt/pull/1956) | Merged | All inspected historical import/recovery threads are now resolved, including the post-merge process-recovery finding superseded by #1959. |

This is an improvement over the previous review. Do not continue reporting #1959
or #1956 as mechanically unresolved.

A future merge-thread gate may still be useful, but there is no current unresolved
P1/P2 blocker in the inspected chain.

## Relevant branch work

The active implementation branches represented by #1962, #1963, #1964, and #1966
have been merged. Repository branch search returned no matching active dbt or prior
review refs.

The preceding documentation commit `7487cee05` is based on `773b4b146`, is two
commits behind current `main`, and contains the now-fixed selection-widening
finding. Its PR #1965 is closed unmerged. It must remain historical evidence, not
active product truth.

No unmerged implementation branch was found that should be preferred over the
route proposed in this report.

# Current product quality assessment

| Dimension | Posture | Reason |
| --- | --- | --- |
| Core dbt vertical | Green/Amber | Import, projection, Code synchronization, Source Import, Preview, Run, and persisted provenance exist. Visual edit/export/adoption remain independently gated. |
| Execution safety | Green/Amber | Whole-project widening is fixed and the API revalidates authoritative provenance. Mixed-selection semantics remain partially lossy. |
| Functional correctness | Green/Amber | Strong contracts, CAS, idempotency, negative tests, architecture tests, and strict live proofs. |
| Reliability and recovery | Amber | Import/process recovery is strong; broad load, chaos, restart, and failover acceptance remain open. |
| Security and tenancy | Amber | Protected routes, server-owned target identity, and secret-free bundles are strong. Credential-reference ownership is not yet universal across all onboarding/runtime surfaces. |
| Observability and operability | Amber/Red | Backend foundations exist; frontend telemetry, automated canary, multi-worker ordering, and production-like validation remain incomplete. |
| Performance and scalability | Red | No enforced product-wide bundle, browser-interaction, graph-size, or sustained-load budget. |
| Accessibility | Red | Keyboard/screen-reader acceptance remains an open story rather than a mandatory release gate. |
| Maintainability | Amber | Strong component and rail governance; visual-edit operation typing, Zod-major convergence, and document truth need correction. |
| Test evidence | Amber | Large suites and live proofs exist, but mandatory coverage remains engine-only. |
| Delivery governance | Amber | Planning DB tracks recent work well; canonical Markdown and open issue state still drift. |

# Priority findings

## PQ-01 — Mixed execution selections silently discard non-executable intent

**Severity:** P2 correctness and UX consistency gap

**Status:** Current

### Evidence

`apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts` now correctly rejects an
explicit selection only when it contains zero executable roots.

For a mixed selection, it filters the requested IDs to executable resources and
continues:

```ts
const executableRoots = requestedNodeIds.filter((nodeId) =>
  executableNodeIdSet.has(nodeId)
);

if (hasExplicitSelection && executableRoots.length === 0) {
  return { ok: false, cause: 'explicit_selection_has_no_executable_nodes' };
}
```

The focused test makes the policy explicit:

```ts
selectedNodeIds: ['source.raw', 'test.orders']
```

is accepted and resolves to the executable test plus its executable closure. The
source is silently discarded.

At the UI boundary,
`apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts` attaches
`onToggleNodeSelection` to every projected node whenever general execution
selection is available. It does not restrict the callback to model, test, or
snapshot resources.

`apps/web/src/app/plugins/graph/graphNodeCardActions.ts` then renders that callback
as:

```text
Select for execution
```

The same silent filtering applies to a stale or unknown ID when it appears beside
a valid executable ID.

The API cannot detect the discarded root because browser Preview provenance
contains only the already-filtered executable selection. API authority validation
is strong for the selection it receives, but the original mixed user intent has
already been lost.

### Impact

PR #1966 removed the dangerous all-project widening path. This residual behavior
is less severe, but it remains dishonest:

- the UI allows the user to mark a resource for execution;
- the product then ignores that selected resource without an explicit decision;
- readiness and Preview show only the executable subset;
- support and audit evidence cannot explain that part of the original selection
  was discarded.

This becomes particularly confusing for source, metric, exposure, seed, or stale
resource IDs.

### Required implementation

Choose one explicit product policy and enforce it at all boundaries.

**Recommended policy:**

1. expose the execution-selection affordance only for executable resource kinds:
   `model`, `test`, and `snapshot`;
2. reject any programmatic explicit selection containing unknown or
   non-executable requested roots rather than partially accepting it;
3. keep automatically included executable dependencies distinct from explicitly
   requested roots in the preview/readiness view;
4. if the product later wants “run downstream from source”, design that as a
   separate visible selection mode with explicit expansion semantics rather than
   interpreting `Select for execution` on a source.

### Required tests

- source-only selection: no toggle or blocked, no Preview request;
- source plus model: rejected as mixed invalid input, or source toggle unavailable;
- metric/exposure/seed: no execution toggle;
- stale ID plus model: rejected, never silently dropped;
- model plus test: accepted with deterministic dependency closure;
- API negative test for selected IDs absent from authoritative provenance;
- live browser proof that every visible execution toggle corresponds to a resource
  included in Preview.

### Suggested PR

```text
fix/dbt-execution-selection-affordance
```

Primary surfaces:

- `apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts`;
- `apps/web/src/app/plugins/graph/graphNodeCardActions.ts`;
- `apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts`;
- `apps/api/src/application/services/resolveAuthorizedPreviewSelection.ts`;
- focused Web/API tests and the existing dbt Preview/Run live proof.

## PQ-02 — Phase-5 visual-edit operation vocabulary is untyped

**Severity:** P1 next-phase architecture blocker

**Status:** Current design gap; no current data-loss defect because Phase 5 is not
implemented

### Evidence

The accepted product plan models visual editability with a typed intent:

```ts
type DbtVisualEditability =
  | { status: 'editable'; operations: readonly DbtVisualEditKind[] }
  | { status: 'partially_editable'; operations: readonly DbtVisualEditKind[]; reasons: string[] }
  | { status: 'code_only'; reasons: string[] };
```

The implemented contract
`packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts`
uses `UniqueNonBlankStringArraySchema` for `operations`.

There is therefore no versioned contract-level set of allowed operations. API and
Web can independently invent values such as:

```text
edit_description
description
yaml_description
update-description
```

without schema rejection.

The same projection does not define an operation-specific command input,
server-resolved mutation target, changed-file receipt, or preservation proof.
Those omissions are acceptable for read-only Phase 4 but block a safe Phase-5
implementation.

### Impact

Starting visual-edit UI against free-form operation strings would create:

- primitive obsession across API and Web;
- unversioned capability negotiation;
- browser-owned assumptions about which YAML/SQL file to mutate;
- risk that a generic mutation endpoint becomes an unbounded transaction script;
- weak compatibility when operation semantics evolve.

### Required implementation

Before implementing behavior:

1. define a versioned operation vocabulary or, preferably, one concrete
   operation-specific contract for the first slice;
2. keep the accepted prohibition on a broad generic visual-edit command;
3. bind every mutation to:
   - Canvas authority;
   - project root;
   - expected `DbtProjectRevision`;
   - dbt `unique_id`;
   - exact operation kind;
   - server-resolved target path and current file revision;
4. return a command receipt containing changed paths, before/after hashes, and
   resulting project-revision hint;
5. refetch `ProjectDbtGraphFromFiles` after mutation;
6. fail closed when the mutation target is ambiguous or unsupported.

A safe first contract should cover only YAML descriptions. Tags, generic tests,
and materialization should follow as separate operation contracts when their
mutation strategies differ.

### Suggested PR

```text
feat/dbt-yaml-description-edit-contract
```

## PQ-03 — Phase 5 lacks a proven comment-preserving mutation adapter

**Severity:** P1 data-preservation blocker for the next product phase

**Status:** Current implementation gap

### Evidence

The accepted plan requires Canvas edits to be:

- semantically explicit;
- structurally unambiguous;
- lossless for unrelated content;
- covered by preservation fixtures;
- revision guarded.

It specifically prioritizes comment-preserving YAML/CST operations for:

1. descriptions;
2. tags;
3. `not_null` and `unique` tests;
4. unambiguous materialization.

Current API dependencies include `js-yaml`, which is suitable for parsing and
serializing YAML data but does not itself establish a repository-owned
comment/style-preserving CST mutation policy. Repository search found no active
comment-preserving YAML/CST mutation boundary for dbt visual edits.

### Impact

A naïve parse/serialize implementation could rewrite an imported user's YAML far
beyond the requested field:

- comments;
- key ordering;
- quoting;
- anchors/aliases;
- scalar styles;
- blank-line organization;
- unrelated resource definitions.

That would violate the central product promise that imported dbt files remain the
semantic authority and are preserved unless directly edited.

### Required implementation

For the first YAML-description slice:

1. evaluate and accept a CST-preserving YAML adapter or implement a narrowly
   bounded textual/CST mutation strategy;
2. keep the adapter behind an outbound port owned by dbt project mutation;
3. resolve the target model/source/column from authoritative analysis, not browser
   path guesses;
4. require expected project and file revisions;
5. show the resulting file diff before or immediately after apply;
6. preserve every unrelated byte or explicitly document the minimal normalized
   region;
7. reject aliases, merge keys, duplicate semantic targets, dynamic constructs, or
   any shape not proven safe;
8. add golden fixtures for comments, quote styles, anchors, multiline values,
   multiple resources, invalid YAML, and concurrent modification.

Do not implement tags, tests, materialization, and descriptions in one broad PR.

## PQ-04 — The accepted dbt plan contains obsolete implementation-state claims

**Severity:** P1 governance-truth gap

**Status:** Current

### Evidence

`docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md`
is accepted and correctly defines the target architecture and phase sequence.
However:

- its front matter was last reviewed on 2026-07-12 against an older commit;
- section 8.2 still lists the following as `not implemented`:
  - `ValidateDbtProjectImport`;
  - `ImportDbtProject`;
  - `ProjectDbtGraphFromFiles`;
  - `ExportDbtProject`.

The first three are now implemented. Only export remains a later product intent.

The plan also contains historical text stating that no analyzer or project graph
query exists, even though those sections are useful as original gap analysis.
Without a clear implemented-state overlay, an implementation agent can mistake
historical findings for current facts.

### Impact

The same accepted document is simultaneously:

- the best architecture source for Phase 5;
- stale as a current-state source.

That can cause duplicate rails, repeated implementation of completed phases, or
incorrect task prioritization.

### Required implementation

- update front matter with current reviewed/revalidated commit;
- add a compact current phase-state table near the executive summary;
- mark Phase 0-4 implemented with evidence links;
- mark Phase 5-7 separately gated;
- update section 8.2 so only genuinely unimplemented product intents remain;
- preserve original Fowler findings as historical rationale, explicitly labelled
  as resolved, implemented, or still open;
- add a freshness check when a phase-closing Planning DB migration lands.

### Suggested PR

```text
docs/reconcile-dbt-phase4-current-state
```

## PQ-05 — The repository-wide current-status document is materially stale

**Severity:** P1 governance and onboarding gap

**Status:** Current

### Evidence

`docs/architecture/system-delivery-status.md` declares:

```text
This page is the current implementation snapshot for the repository.
```

Its `last_reviewed` and snapshot date are both 2026-04-26. It predates the July dbt
project authority, import, projection, Code synchronization, Source Import,
Preview/Run, and selection-safety verticals.

### Impact

Agents and maintainers using the declared entry point do not receive the current
product capability map. Strong local documentation cannot compensate for a stale
global status source.

### Required implementation

- generate or mechanically validate capability state from Planning DB and code
  evidence;
- include `reviewed_commit` in the current-status document;
- define a freshness policy for material feature completion;
- fail a documentation/governance check when a phase-closing migration changes
  capability state without refreshing the current-status projection;
- publish one concise table with `implemented`, `partial`, `blocked`, `planned`,
  and `retired` states.

## PQ-06 — API and Web still have no mandatory coverage ratchet

**Severity:** P1 quality-system gap

**Status:** Current

### Evidence

The root `vitest.config.ts` includes only:

```text
packages/@dvt/engine/src/**/*.ts
```

Its global thresholds are:

- statements: 65%;
- branches: 55%;
- functions: 65%;
- lines: 65%.

`apps/api` and `apps/web` have substantial test suites, architecture checks, and
live proofs, but no repository-wide mandatory coverage threshold was found for
those workspaces.

### Impact

A fully green PR can add unmeasured decision paths to:

- authority resolution;
- execution selection;
- retries and compensation;
- HTTP error mapping;
- permission and readiness presentation;
- stale-plan handling;
- conflict and reconnect behavior.

Test count is not a substitute for exercised branch evidence.

### Required implementation

Use a ratchet rather than imposing an arbitrary immediate global target:

1. publish current API/Web baselines without blocking;
2. reject any decrease;
3. enforce changed-code coverage;
4. set critical-module branch targets first;
5. converge workspace-wide thresholds gradually.

Recommended critical targets:

- 90%+ branches for authority, idempotency, CAS, compensation, readiness,
  selection, RBAC/RLS, secret redaction, and Preview/Run admission;
- eventual 80% statements/lines, 75% functions, and 70% branches for general API
  and Web modules.

Keep live, architecture, determinism, and coverage gates separate. None is a
substitute for the others.

## PQ-07 — Non-functional quality remains backlog rather than release evidence

**Severity:** P1 release-readiness gap

**Status:** Current

### Evidence

Open repository issues still include:

- [#158 — 50k-node performance tests](https://github.com/dunay2/dvt/issues/158);
- [#188 — large graph performance budget](https://github.com/dunay2/dvt/issues/188);
- [#187 — keyboard and screen-reader accessibility](https://github.com/dunay2/dvt/issues/187);
- [#18 — load and chaos suite](https://github.com/dunay2/dvt/issues/18);
- [#186 — frontend telemetry](https://github.com/dunay2/dvt/issues/186);
- [#177 — resilient logs/progress reconnection](https://github.com/dunay2/dvt/issues/177).

Issue #18 records a proposed baseline of 500 events/second and 4,000 runs/hour.
No evidence was found that these concerns are mandatory product release gates.

### Impact

Correctness can regress under:

- large graphs;
- slow browsers;
- keyboard-only use;
- screen readers;
- network interruption;
- PostgreSQL/Temporal restart;
- duplicate delivery;
- sustained concurrency;
- bundle growth.

### Required implementation

Add distinct executable lanes:

```text
quality:a11y
quality:web-performance
quality:graph-scale
quality:load-chaos
```

Each lane should publish versioned baselines and fail on unapproved regression.
Budget updates must require rationale rather than silently replacing expected
values.

## PQ-08 — Operational scale-out is not yet release-proven

**Severity:** P1/P2 production-operability gap

**Status:** Current

### Evidence

Open work includes:

- [#409 — independent outbox worker scale-out hardening](https://github.com/dunay2/dvt/issues/409);
- [#414 — multi-worker ordering strategy](https://github.com/dunay2/dvt/issues/414);
- [#413 — single-owner canary and rollback](https://github.com/dunay2/dvt/issues/413);
- [#447 — automated canary CI lane](https://github.com/dunay2/dvt/issues/447);
- [#448 — canary evidence/document alignment](https://github.com/dunay2/dvt/issues/448).

Issue #414 explicitly blocks horizontal scale-out until one ordering-preservation
strategy is implemented and concurrently tested.

### Impact

The product has strong local runtime foundations, but production scale-out cannot
be inferred from a single-worker or local proof.

### Required implementation

- select and document exactly one ADR-0009 ordering strategy;
- prove same-`runId` event order under concurrent workers;
- automate single-owner canary acceptance;
- provide rollback wiring and evidence;
- expose worker lag, retry exhaustion, duplicate suppression, and reconciliation
  metrics;
- keep horizontal scale-out disabled until the acceptance lane passes.

## PQ-09 — API and Contracts use different Zod major versions

**Severity:** P2 maintainability and boundary-consistency gap

**Status:** Current

### Evidence

`apps/api/package.json` declares:

```json
"zod": "^3.0.0"
```

`packages/@dvt/contracts/package.json` declares:

```json
"zod": "^4.3.6"
```

API directly depends on and consumes `@dvt/contracts` while also carrying its own
Zod major.

### Impact

Two schema runtimes can create:

- duplicate bundles;
- different error-shape assumptions;
- incompatible schema composition;
- inferred-type surprises;
- helper behavior that varies by boundary.

### Required implementation

- inventory API-local Zod 3 schemas;
- move shared transport/domain boundary schemas into `@dvt/contracts`;
- migrate remaining API-local schemas to Zod 4 behind focused compatibility tests;
- add a dependency policy preventing multiple majors of boundary libraries unless
  a time-bounded exception exists.

Do this as a dedicated maintenance slice, not inside the first Phase-5 product PR.

## PQ-10 — GitHub issue state is not reconciled with delivered capability

**Severity:** P2 planning/governance gap

**Status:** Current

### Evidence

Open issue [#174](https://github.com/dunay2/dvt/issues/174) still asks to build a
read-only execution-plan preview. Current `main` already has a persisted,
revision-bound file-backed Preview and broader graph-draft preview capabilities.
Its parent [#162](https://github.com/dunay2/dvt/issues/162) remains open as an old
frontend epic.

Some old issues may still contain valid UX requirements, but their current state
does not identify whether they are:

- implemented;
- partially implemented;
- superseded;
- retained for a narrower remaining acceptance criterion.

The old nightly failure issue
[#1411](https://github.com/dunay2/dvt/issues/1411) also remains open against an old
commit. This review found no current failure evidence for it, so it should be
reproduced or classified as historical rather than cited as a present regression.

### Impact

An agent can implement stale issue text, duplicate an existing rail, or count
already-delivered work as an active product gap.

### Required implementation

- make Planning DB the status authority and GitHub the collaboration surface;
- project `planned`, `active`, `blocked`, `implemented`, `superseded`, and
  `historical` states into issue labels/comments;
- require every open issue to link to an active Planning DB task or carry a
  historical/superseded classification;
- periodically reconcile issue state without creating a second planning authority;
- reproduce old failure issues against current `main` before keeping them active.

# Regression watchlist

The following are not current confirmed defects, but future work must preserve
them mechanically.

## RW-01 — Never reintroduce explicit-selection widening

Required invariant:

```text
explicit selection with zero executable roots
  != no selection
```

Keep Web unit, API negative, architecture, and strict live browser evidence.

## RW-02 — Never regenerate imported files during file-backed Preview

`GenerateDbtWorkspaceArtifacts` remains graph-draft/bootstrap behavior only.
File-backed Preview must use authoritative project analysis and leave project
files unchanged.

## RW-03 — Preserve immutable project provenance through StartRun

Any file, project-root, analysis, dbt-version, execution-target, or selected-node
change after Preview must stale the current plan and require a new Preview.

## RW-04 — Keep profiles and secret material out of bundles and export

Phase 6 export must reuse the existing secret-exclusion posture and add negative
archive scans.

## RW-05 — Preserve import recovery and sibling authority safety

Process lease recovery, per-Canvas serialization, idempotent replay, compensation,
and completed-sibling authority preservation must remain covered during Phase-5
file mutation work.

## RW-06 — Do not create a second semantic authority

Phase-5 Canvas edits must mutate authoritative dbt files and refetch projection.
They must not persist shadow dbt nodes, edges, tags, tests, descriptions, or
materialization values in `WorkspaceGraphAuthoringDraft.v1`.

# Recommended implementation route

## Workstream 0 — Close selection-affordance inconsistency

**Goal:** every `Select for execution` action corresponds to preserved execution
intent.

Deliver:

- executable-resource eligibility policy;
- no toggle for source, seed, exposure, or metric;
- fail-closed mixed/unknown selection validation;
- explicit requested-roots versus dependency-closure presentation;
- Web/API/live regression evidence.

Exit criterion:

```text
No resource can be visibly selected for execution and then silently discarded.
```

## Workstream 1 — Reconcile current product truth

**Goal:** make one current entry point agree with code and Planning DB.

Deliver:

- Phase 0-4 implementation table in the accepted dbt plan;
- corrected rail status;
- current `reviewed_commit`;
- refreshed `system-delivery-status.md`;
- Planning DB/GitHub issue reconciliation for delivered Preview work;
- freshness automation for future phase completion.

Exit criterion:

```text
A new implementation agent can identify the active phase without reading closed PR history.
```

## Workstream 2 — Accept one concrete Phase-5 operation contract

**Goal:** establish a safe mutation seam without a generic visual-edit API.

Recommended first operation:

```text
Update dbt resource or column YAML description
```

Required design:

- typed, versioned operation;
- explicit DDD owner;
- expected project revision;
- authoritative unique ID;
- server-resolved YAML target;
- expected file revision;
- command receipt with changed file hashes;
- precise unsupported/ambiguous/conflict errors;
- projection invalidation/refetch;
- no graph-draft semantic write.

Exit criterion:

```text
The command contract can describe one lossless edit and no broader mutation.
```

## Workstream 3 — Implement YAML description editing

**Goal:** deliver the first real Canvas-to-dbt-file semantic edit.

Sequence:

1. introduce the comment-preserving mutation adapter behind a port;
2. add preservation golden fixtures;
3. add API command/use case and protected route through existing authorization
   patterns;
4. expose the operation only when projection capability says it is safe;
5. show resulting file diff and synchronization state;
6. refetch analysis and Canvas;
7. prove reload round trip;
8. prove conflict, ambiguity, invalid YAML, and analyzer-failure behavior.

Strict live proof:

```text
open imported dbt project
  -> select editable model/column
  -> change description in Canvas
  -> inspect file diff in Code
  -> reload
  -> Canvas and Code preserve the change
  -> unrelated comments/style remain preserved
```

## Workstream 4 — Add remaining conservative edits separately

Order:

1. tags;
2. `not_null` and `unique` generic tests;
3. unambiguous materialization.

Each operation requires its own mutation policy, preservation fixtures, conflict
proof, and code-only rejection behavior.

Do not combine SQL/Jinja mutation, arbitrary dependency changes, CTE rewrites,
macros, custom materializations, Python models, or cross-file rename into Phase 5.

## Workstream 5 — Export authoritative project files

Deliver:

- authoritative-file archive;
- project revision and archive SHA receipt;
- runtime/temporary/layout/credential exclusions;
- sensitive-file negative scan;
- supported dbt parse proof;
- resource inventory parity.

Export must never regenerate a simplified project from Canvas.

## Workstream 6 — Graph-draft adoption

Deliver an explicit, rollback-safe transition:

```text
graph-draft
  -> generate bootstrap files
  -> validate/analyze
  -> compare semantic parity
  -> bind dbt-project-files authority
  -> stop preview regeneration
```

Failure leaves graph-draft authority unchanged.

## Parallel quality workstream — Make quality executable

Progress in parallel with Phase 5:

- API/Web coverage baseline and ratchet;
- accessibility lane;
- bundle and browser-interaction budgets;
- 1k/10k/50k graph benchmarks;
- sustained load and controlled chaos;
- frontend telemetry correlated to request, PlanRef, and run ID;
- outbox canary, rollback, and multi-worker ordering proof;
- Zod-major convergence;
- generated current-state and issue reconciliation.

# Proposed delivery order

| Order | Slice | Why now | Exit criterion |
| --- | --- | --- | --- |
| 1 | `fix/dbt-execution-selection-affordance` | Completes the intent-safety correction already started by #1966. | No visible selection is silently discarded. |
| 2 | `docs/reconcile-dbt-phase4-current-state` | Removes stale guidance before the next agent implements Phase 5. | Canonical plan, system status, Planning DB, and issues agree. |
| 3 | `feat/dbt-yaml-description-edit-contract` | Prevents generic mutation and free-form operation drift. | One versioned operation with explicit receipt and errors. |
| 4 | `feat/dbt-yaml-description-edit` | First concrete Phase-5 value slice. | Lossless revision-guarded mutation passes focused tests. |
| 5 | `test/dbt-yaml-description-roundtrip-live` | Converts file-preservation claims into browser evidence. | Canvas -> file -> analysis -> reload passes live. |
| 6 | `ci/api-web-coverage-ratchet` | Protects new decision paths during Phase 5. | Baselines published; decreases and uncovered changed code fail. |
| 7 | `feat/dbt-yaml-tags-edit` | Same CST family, independently governed semantics. | Tags round-trip without unrelated rewrites. |
| 8 | `feat/dbt-generic-test-edit` | Adds useful dbt semantics with explicit target rules. | `not_null`/`unique` safely add/remove and reload. |
| 9 | `feat/dbt-unambiguous-materialization-edit` | Highest ambiguity among accepted Phase-5 operations. | Only one proven config source is mutated; ambiguity stays code-only. |
| 10 | `feat/dbt-project-export` | Completes portability after safe authoring. | Secret-free archive parses and preserves inventory. |
| 11 | `feat/dbt-graph-draft-adoption` | Completes the authority lifecycle. | Parity-gated transition is atomic and rollback-safe. |
| 12 | `ci/product-nonfunctional-gates` | Raises product release maturity. | A11y, graph/browser budgets, load/chaos, telemetry, and canary evidence are executable. |

# Suggested PR decomposition

```text
fix/dbt-execution-selection-affordance
docs/reconcile-dbt-phase4-current-state
feat/dbt-yaml-description-edit-contract
feat/dbt-yaml-description-edit
test/dbt-yaml-description-roundtrip-live
ci/api-web-coverage-ratchet
feat/dbt-yaml-tags-edit
feat/dbt-generic-test-edit
feat/dbt-unambiguous-materialization-edit
feat/dbt-project-export
feat/dbt-graph-draft-adoption
ci/web-accessibility-and-performance-budgets
perf/graph-scale-and-load-chaos
feat/outbox-canary-and-multi-worker-proof
refactor/api-zod4-convergence
ci/planning-current-state-reconciliation
```

Each PR should contain:

- one explicit product/domain outcome;
- red/green focused tests;
- architecture guard where a boundary can regress;
- rollback or compensation posture;
- Planning DB component/rail/evidence/risk relations;
- negative evidence for unsupported behavior;
- no unrelated quality-rule relaxation.

# Next-milestone release blockers

The next milestone must not be called Phase-5 complete unless:

- execution selection no longer exposes silently discarded roots;
- every implemented visual operation has a typed contract and exact DDD owner;
- the server, not the browser, resolves mutation targets;
- all mutations are project/file-revision guarded;
- unrelated file content is preserved by golden fixtures;
- unsupported or ambiguous constructs remain `code_only` with a precise reason;
- Canvas edits refetch authoritative analysis instead of writing graph-draft
  semantics;
- a strict live edit -> file -> reload proof passes;
- API/Web changed code is coverage-gated;
- current-state documentation names Phase 5 as active and Phase 0-4 as implemented.

The broader product must not be called production-ready unless:

- accessibility is executable and blocking for critical journeys;
- bundle/browser and graph-size budgets are enforced;
- one sustained-load and recovery lane passes;
- frontend/backend telemetry is correlated;
- canary and rollback are automated;
- multi-worker ordering is proven before horizontal scale-out;
- security-sensitive runtimes use server-owned credential references or a
  time-bounded waiver.

# Final recommendation

DVT should proceed to Phase 5, but not by adding a generic visual-edit endpoint or
starting with arbitrary SQL/Jinja mutation.

The correct next decision is:

> First finish execution-selection honesty and reconcile current product truth.
> Then accept one versioned YAML-description edit contract, implement it through a
> comment-preserving, revision-guarded server mutation boundary, and prove the full
> Canvas-to-file-to-analysis round trip before adding the next visual operation.

The architecture is already strong enough to support this route. The main risk is
now not missing infrastructure; it is allowing the next feature phase to outrun
its preservation contract, operation vocabulary, and executable quality gates.
