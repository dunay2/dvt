---
title: DVT Current-State Product, Architecture, and Governance Review — 2026-07-16 19:14 UTC
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
reviewed_commit: 2c4110de8d74ffbb02880255cc9b760daaa84070
review_branch: agent/dvt-review-20260716-1914
---

# DVT Current-State Product, Architecture, and Governance Review

## 1. Executive verdict

DVT has moved materially since the earlier review documents. The file-authoritative
dbt vertical is no longer blocked at Preview/Run: Phase 4 landed, the explicit
source-only whole-project widening defect was fixed in PR #1966, the affected
presentation and architecture fixtures were corrected in PRs #1969 and #1970,
and the latest `main` dependency and CI changes are green at their pull-request
heads.

The immediate risk is now narrower and more concrete:

> Execution-selection intent is still represented by a node-ID array whose empty
> value means both “the user chose the whole workspace” and “an explicit selection
> became empty after recovery or reconciliation.”

That ambiguity already leaves a stale-resource widening path on `main`, and the
open implementation PR #1971 still has two unresolved, non-outdated P1 review
findings caused by the same missing domain state:

1. deselecting the last invalid persisted resource produces `[]`, which is treated
   as workspace mode and can enable whole-workspace Preview/Run;
2. file-backed toggle mutations operate on the filtered visible set instead of
   the raw requested set, so unavailable requested IDs can be silently erased and
   fail-closed validation can be bypassed.

PR #1971 has six successful workflows, but those successful checks do not negate
the two P1 findings. The findings were raised against the current head after the
latest commit, are non-outdated, and expose missing lifecycle scenarios in the
test model.

**Decision:** do not merge PR #1971 in its current state. Close execution-selection
state semantics first, add lifecycle regression proof, close the unresolved P1
threads, and rerun all required checks. Do not start dbt Phase 5 visual mutation
until this safety boundary is closed.

## 2. Review scope and method

This review inspected:

- current `main` and its latest commit;
- recent merge and feature history;
- all currently open pull requests;
- pull-request workflow evidence for the latest `main` change and the open PR;
- inline review-thread state for the open PR and relevant recent merged PRs;
- the current DBT execution-scope policy, Canvas scope reconciliation, and
  interaction-store representation;
- the accepted dbt round-trip product plan and its visual-editing policy;
- the repository current-state document;
- root coverage policy and API/contracts dependency versions;
- open accessibility, performance, load/chaos, telemetry, outbox canary, and
  multi-worker backlog anchors;
- previous `agent/dvt-review-*` PR work and the current implementation branch.

The review used GitHub repository, PR, workflow, file, issue, and review-thread
evidence. No local checkout or local test execution was used. CI statements below
refer to recorded GitHub Actions runs, not independently rerun tests.

## 3. Repository baseline

| Item | Observed state | Assessment |
| --- | --- | --- |
| Default branch | `main` | Canonical base. |
| Reviewed `main` HEAD | [`2c4110de8`](https://github.com/dunay2/dvt/commit/2c4110de8d74ffbb02880255cc9b760daaa84070) | Latest merge is dependency-only. |
| Latest merged PR | [#1905](https://github.com/dunay2/dvt/pull/1905) | `tw-animate-css` 1.3.8 -> 1.4.0. |
| Open PR count | 1 | Only [#1971](https://github.com/dunay2/dvt/pull/1971). |
| Open functional branch | `fix/dbt-selection-intent` | Three commits, 31 files, +1609/-143. |
| Current review branch | `agent/dvt-review-20260716-1914` | Documentation only. |
| File-backed DBT Preview/Run | Implemented | Landed in [#1962](https://github.com/dunay2/dvt/pull/1962), followed by fixes. |
| Main merge-commit status API | No direct statuses/runs returned | Use latest PR-head workflow evidence rather than claiming push validation. |

## 4. Recent commit and merge history

The material recent sequence is:

1. [#1962](https://github.com/dunay2/dvt/pull/1962) completed the
   revision-bound file-backed dbt Preview/Run vertical.
2. [#1963](https://github.com/dunay2/dvt/pull/1963) reconciled Phase 4 planning
   state.
3. [#1964](https://github.com/dunay2/dvt/pull/1964) fixed generated dbt profile
   authority in the strict live proof.
4. [#1966](https://github.com/dunay2/dvt/pull/1966) prevented an explicit
   source-only selection from silently widening to the executable workspace.
5. [#1969](https://github.com/dunay2/dvt/pull/1969) corrected DBT Preview fixtures
   to use explicit executable scope.
6. [#1970](https://github.com/dunay2/dvt/pull/1970) aligned the DBT architecture
   assertion with preview delegation.
7. [#1967](https://github.com/dunay2/dvt/pull/1967) upgraded CodeQL atomically.
8. Dependabot linting, Node types, and `tw-animate-css` updates were then merged.

The functional direction is coherent: file authority, analysis provenance,
Preview, PlanRef, StartRun, and explicit-scope safety now exist. The next defect
is not a missing feature; it is incomplete modeling of execution-selection intent
across UI reconciliation and resource lifecycle changes.

### 4.1 Dependency update note

The latest `tw-animate-css` release notes describe a breaking prefix-import change
inside a minor release. DVT currently imports `tw-animate-css` directly from
`apps/web/src/styles/tailwind.css`, and repository search did not find a Tailwind
prefix configuration. The six PR checks passed. Therefore this review records no
current regression, but future introduction of Tailwind prefixing must use the
package's prefix export and should be covered by a build/render smoke test.

## 5. Current CI posture

### 5.1 Latest `main` change

The head of PR #1905 (`17a78deff`) recorded six successful workflows:

- Dependency Review;
- Test Suite;
- CI - Code Quality;
- CodeQL;
- Contracts & Determinism;
- PR Quality Gate.

The merge commit itself returned no direct combined statuses or PR-triggered runs
through the connector. The correct statement is therefore that the merged change
had a green PR head, not that a separate post-merge `main` suite was observed.

### 5.2 Open PR #1971

The current head `15fa9a6b2` also recorded all six workflows as successful:

- Dependency Review;
- Contracts & Determinism;
- Test Suite;
- CI - Code Quality;
- CodeQL;
- PR Quality Gate.

However, the two unresolved P1 comments were created after the current head and
identify behavior not represented by the successful tests. This is a direct
example of why green changed-slice CI is evidence, not equivalent to product
correctness.

### 5.3 CI conclusion

No currently observed workflow is red. The merge blocker is review correctness,
not mechanical CI failure.

## 6. Open pull request review

## PR #1971 — `fix(web): Preserve DBT execution selection intent`

**State:** open, non-draft, GitHub reports mergeable.

**Base:** `main@2c4110de8`.

**Head:** `15fa9a6b2`.

**Change size:** 3 commits, 31 files, 1609 additions, 143 deletions.

### 6.1 Valuable changes in the PR

The branch correctly attempts to:

- reject any explicit DBT selection containing unavailable or non-executable IDs;
- expose Select only for executable DBT model, test, and snapshot roots;
- preserve unavailable IDs through planning validation instead of filtering them
  before fail-closed policy;
- distinguish requested roots from transitive executable dependencies;
- include selection mode and requested roots in the execution draft signature;
- show requested resources, included dependencies, and authorized scope in the
  persisted Preview UI;
- provide strict live evidence for downstream dependency closure;
- register ownership, symbols, evidence, and invariants in Planning DB.

The first two review findings on the PR were addressed in `15fa9a6b2`:

- unavailable IDs now reach validation;
- requested-root intent now participates in the draft signature.

Those corrections are sound and should be retained.

### 6.2 Current unresolved P1 findings

#### P1-A — Deselect recovery can widen to workspace

The branch exposes Deselect for a selected invalid DBT resource. If that invalid
resource is the only requested member, deselection stores an empty array. The
scope resolver defines explicit mode as `selectedNodeIds.length > 0`; an empty
array therefore becomes workspace mode and selects all executable workspace
resources.

This violates the branch's own documented invariant:

```text
remove invalid persisted member without widening execution scope
```

The defect cannot be closed reliably by another conditional around the button.
The state model must preserve an explicit-empty intent or require an explicit
separate transition back to workspace mode.

#### P1-B — File-backed toggles mutate the visible subset, not raw intent

The file-backed controller derives a filtered `selectedNodeIds` presentation set.
Its toggle callback then rebuilds the store from that filtered list. If the raw
requested set contains an unavailable ID plus a visible ID, toggling the visible
card silently drops the unavailable ID. That changes a blocked explicit request
into a valid smaller request without user acknowledgement.

Removing the final visible member can again produce `[]` and switch to workspace
mode.

Toggle mutations must operate on the raw execution requested set and remove only
the targeted resource. UI-visible selection is a read model; it must not become
the authority for execution intent.

### 6.3 Merge decision for PR #1971

**Do not merge.** Required before merge:

1. introduce explicit execution-selection mode in authoritative client state;
2. separate UI card/inspector selection from execution selection;
3. update both authored and file-backed toggles to mutate raw requested intent;
4. preserve explicit-empty blocked state or add an explicit `Use whole workspace`
   transition;
5. add the lifecycle regression matrix in section 12;
6. resolve both P1 threads with commit and test references;
7. rerun the six required workflows on the final head.

## 7. Unresolved review-thread inventory

### 7.1 PR #1971

- two resolved, non-outdated threads on unavailable-ID preservation and draft
  signature identity;
- two unresolved, non-outdated P1 threads:
  - recovery deselection widening to workspace;
  - file-backed toggles dropping raw unavailable requested IDs.

These are active merge blockers.

### 7.2 PR #1970

PR #1970 was merged with one unresolved, non-outdated P2 thread. The architecture
test proves that `canvasDbtExecutionProjection.ts` imports
`canvasDbtPlannerGraphSource`, but does not negatively assert that
`canvasPlanAction.ts` cannot also import the DBT graph-source builder directly.
A future direct import could therefore recreate the duplicate ownership while the
architecture suite remains green.

Required follow-up:

```ts
expect(PLAN_ACTION_SOURCE).not.toContain("from './canvasDbtPlannerGraphSource'");
```

The exact assertion should be robust enough to cover the repository's import
formatting conventions.

### 7.3 PR #1959 correction

Earlier review documents reported unresolved P1/P2 threads on PR #1959. That is no
longer current. The import concurrency and warehouse-catalog migration threads are
now marked resolved, with follow-up verification comments on current `main`.
Future reports must not repeat those findings as active defects.

### 7.4 Review hygiene finding

The repository still permits merges with non-outdated P1/P2 review threads open.
This creates a mismatch between mechanical merge state and engineering acceptance.
A required review-thread closure gate remains justified, but it should support an
explicit `accepted-risk` or `superseded-by` disposition rather than forcing false
“fixed” resolutions.

## 8. Product and code findings

## FINDING SEL-01 — `main` still widens stale explicit selection to workspace

**Severity:** P1 correctness/safety.

PR #1966 fixed visible explicit selections containing no executable resource, but
current `main` filters execution selection to visible node IDs before the DBT
resolver receives it:

- `deriveExecutionScope` filters `selectedNodeIds` against visible IDs;
- the file-backed controller filters store selection against canonical node IDs;
- `resolveDbtExecutionScope` determines explicit mode only from the resulting
  array length;
- an explicit stale-only selection therefore becomes `[]` and is interpreted as
  “no explicit selection,” causing workspace fallback.

Example:

```text
user explicitly selected model.old_name
-> project reanalysis removes or renames model.old_name
-> reconciliation filters model.old_name out
-> resolver receives []
-> [] means workspace mode
-> Preview can target every executable workspace node
```

PR #1971 partially closes this by preserving raw IDs into validation, but its
unresolved toggle paths show the underlying representation remains incomplete.

**Required correction:** model intent, not only IDs.

## FINDING SEL-02 — Interaction selection and execution selection are conflated

**Severity:** P1/P2 architecture and UX correctness.

`canvasInteractionStore` currently owns a generic `selectedNodes: string[]` and
`setSelectedNodes`. The same array participates in card selection, inspector/UI
reconciliation, and execution-scope derivation.

These concerns have different lifecycle rules:

- UI selection may be filtered when a node is hidden or unavailable;
- inspector selection may be cleared when the visible projection changes;
- execution intent must preserve an unavailable requested ID so planning fails
  closed until the user intentionally replaces or resets the request.

Using one array means a presentation reconciliation can mutate execution intent.
That is hidden authority coupling.

**Required model:**

```ts
type CanvasExecutionSelectionIntent =
  | { mode: 'workspace' }
  | { mode: 'explicit'; requestedNodeIds: readonly string[] };

type CanvasUiSelection = {
  selectedNodeIds: readonly string[];
  inspectorNodeId: string | null;
};
```

An explicit selection with zero requested IDs must not silently mean workspace.
It may be represented as blocked explicit-empty state, or the UI may prevent the
transition and require an explicit workspace-reset action.

## FINDING SEL-03 — The contract boundary exposes derived intent too late

**Severity:** P2 architecture.

PR #1971 adds `selectionIntent` to the Preview view model and draft signature, but
the authoritative selection mode is still inferred in the Web scope resolver
from array length. This means the product describes intent in the output after
already reconstructing it from an ambiguous input.

Selection mode and requested roots should enter the planner/Preview boundary as a
typed input and be validated server-side. Derived dependencies and authorized
scope are outputs.

Recommended boundary:

```ts
type ExecutionSelectionRequest =
  | { mode: 'workspace' }
  | {
      mode: 'explicit';
      requestedRootNodeIds: readonly string[];
    };
```

Server admission must reject:

- explicit empty requests unless a specific product rule supports them;
- unavailable requested IDs;
- non-executable requested IDs;
- requested IDs outside authorized project revision/scope;
- stale project revision or stale PlanRef.

## FINDING SEL-04 — Selection safety tests cover snapshots, not transitions

**Severity:** P1 test gap.

The implemented tests prove selected static states such as source-only rejection,
requested/dependency display, and live downstream closure. The unresolved review
findings occur during transitions:

- resource disappears;
- user deselects invalid residue;
- mixed visible and unavailable set changes;
- last explicit member is removed;
- filtered UI state is written back to the execution authority.

The test suite needs a state-transition table, not additional isolated happy-path
fixtures.

## FINDING ARC-01 — DBT planner projection architecture guard is incomplete

**Severity:** P2 architectural regression risk.

The accepted ownership is:

```text
canvasPlanAction
-> canvasDbtExecutionProjection
-> canvasDbtPlannerGraphSource
```

The merged test proves positive imports but lacks a negative assertion against:

```text
canvasPlanAction
-> canvasDbtPlannerGraphSource
```

The current source does not show that direct import, so this is not an active
runtime defect. It is a missing guard that leaves the reviewed boundary
unprotected.

## FINDING GOV-01 — “Current Status” is not current

**Severity:** P1 governance truth.

`docs/architecture/system-delivery-status.md` declares itself the current
implementation snapshot but has `last_reviewed: 2026-04-26` and a snapshot review
date of 2026-04-26. It predates the July dbt file-authority, import, Preview/Run,
and selection-safety sequence.

The accepted dbt plan is more current, but its metadata also references earlier
reviewed/revalidated commits. The repository has strong detailed evidence and
Planning DB state but still lacks one reliably generated current product map.

**Required correction:** generate capability status from Planning DB plus
mechanical code/evidence checks and include the reviewed commit.

## FINDING QLT-01 — Coverage remains engine-only

**Severity:** P1/P2 quality-system gap.

Root coverage includes only:

```text
packages/@dvt/engine/src/**/*.ts
```

with thresholds:

```text
statements 65
branches   55
functions  65
lines      65
```

API and Web carry the current high-risk authority, selection, admission,
reconciliation, and presentation logic but have no repository-level coverage
ratchet. PR #1971 demonstrates the consequence: a large green Web change can miss
two selection lifecycle P1s.

Coverage is not a substitute for scenario design, but changed-code branch
coverage would expose untested transitions and should be required for critical
selection/admission modules.

## FINDING DEP-01 — Boundary schema runtime remains split across Zod majors

**Severity:** P2 maintainability/contract risk.

- `apps/api`: `zod ^3.0.0`;
- `@dvt/contracts`: `zod ^4.3.6`.

The API directly consumes contracts. Maintaining two major validation runtimes at
the same boundary increases error-shape, schema-composition, helper, and bundle
risk. This is not the immediate blocker, but it should be resolved before more
cross-layer visual-mutation contracts are introduced.

## FINDING NFR-01 — Non-functional product gates remain backlog, not release policy

**Severity:** P1/P2 release-readiness gap.

Relevant open anchors include:

- [#187](https://github.com/dunay2/dvt/issues/187): keyboard and screen-reader
  accessibility;
- [#188](https://github.com/dunay2/dvt/issues/188): large-graph performance budget;
- [#158](https://github.com/dunay2/dvt/issues/158): 50k-node performance tests;
- [#186](https://github.com/dunay2/dvt/issues/186): frontend telemetry;
- [#18](https://github.com/dunay2/dvt/issues/18): load and chaos suite;
- [#409](https://github.com/dunay2/dvt/issues/409): independent outbox runtime and
  scale-out hardening;
- [#413](https://github.com/dunay2/dvt/issues/413): single-owner canary and
  rollback;
- [#414](https://github.com/dunay2/dvt/issues/414): ordered multi-worker strategy;
- [#447](https://github.com/dunay2/dvt/issues/447): automated canary CI lane.

The repository has extensive correctness controls, but product release readiness
still lacks enforced accessibility, graph/browser performance, load, chaos,
frontend telemetry, and operational scale-out evidence.

## 9. Architectural drift assessment

### 9.1 What remains aligned

- dbt files are the semantic authority in file-backed mode;
- Canvas is a projection and governed interaction surface;
- analysis remains server-side;
- graph-draft and file authority remain mutually exclusive;
- Preview persists provenance and PlanRef before StartRun;
- no generic visual-edit command has been introduced;
- generic Canvas code delegates DBT planner semantics through a named projection;
- execution dependencies are derived from the authoritative DBT graph.

### 9.2 Where drift is emerging

#### Presentation state acting as execution authority

Filtering visible UI selection and then writing it back to the same store changes
execution intent. That violates the intended authority separation even though it
occurs entirely within Web.

#### Intent inferred from collection cardinality

`selectedNodeIds.length === 0` is being used as a domain discriminator. Empty is a
valid collection state, not a reliable mode. This is primitive obsession at a
safety boundary.

#### Governance records ahead of executable invariants

PR #1971's migration 710 records that invalid-resource recovery removes the
member “without widening execution scope,” while the current implementation
still permits widening when the last invalid member is removed. Planning DB must
record landed truth, not desired behavior that tests do not prove.

#### Architecture test naming stronger than its assertion

The PR #1970 test describes ownership/delegation that its current positive-only
assertions do not fully enforce.

## 10. Product route after selection integrity

The accepted dbt product plan remains the correct direction. For file-backed dbt
Canvas, the next major product phase is conservative visual editing, not a new
language and not arbitrary SQL/Jinja rewriting.

The policy already requires visual mutations to be:

- semantically explicit;
- structurally unambiguous;
- lossless for unrelated content;
- protected by preservation fixtures;
- revision guarded.

The preferred first operation is a YAML description edit through a
comment-preserving YAML/CST editor. Tags, `not_null`/`unique` tests, and carefully
bounded materialization changes follow as separate verticals.

Do not begin that work while execution selection can silently change mode. Visual
mutation will add more reanalysis and resource-lifecycle transitions, increasing
the probability of stale selection. Selection intent is therefore a prerequisite,
not parallel cleanup.

## 11. Recommended implementation route

## Route 0 — Hold PR #1971

- keep it open;
- do not merge while the two P1 threads are active;
- avoid adding unrelated Phase 5 work to the branch;
- preserve the corrected raw-intent validation and draft-signature changes.

## Route 1 — Introduce explicit execution-selection authority

Create one explicit domain state, separate from UI selection:

```ts
type CanvasExecutionSelectionIntent =
  | { mode: 'workspace' }
  | { mode: 'explicit'; requestedNodeIds: readonly string[] };
```

Required invariants:

1. only an explicit action enters workspace mode;
2. hiding, deleting, renaming, or failing to project a node never changes mode;
3. UI reconciliation never removes requested execution IDs;
4. explicit invalid/stale IDs block Preview and StartRun;
5. deselecting one member removes only that member;
6. removing the last explicit member does not become workspace mode;
7. dependencies are derived, never stored as requested roots;
8. Preview signature includes mode, normalized requested roots, graph source, and
   admitted closure;
9. StartRun uses persisted PlanRef provenance, not current UI reconstruction.

## Route 2 — Separate state stores/read models

At minimum separate:

```text
UI card selection / inspector focus
Execution requested roots and mode
Derived executable closure
Persisted Preview/PlanRef state
```

The exact Zustand module boundary is less important than eliminating write-back
from filtered presentation state into execution authority.

## Route 3 — Carry intent through API admission

Web should send explicit typed selection intent. The API should verify it against
the bounded project revision and return:

```text
requested roots
derived dependencies
authorized executable scope
invalid/unavailable requested IDs
selection mode
```

The persisted Preview should own that evidence. Run admission must reject a
PlanRef whose project revision or selection signature no longer matches.

## Route 4 — Close architecture and review hygiene

- add the negative DBT graph-source import assertion from PR #1970's open P2;
- resolve the PR #1970 thread with the follow-up commit;
- resolve both PR #1971 P1 threads only after regression tests land;
- add a required check for active non-outdated P1/P2 threads, with explicit
  accepted-risk/superseded dispositions.

## Route 5 — Reconcile current product truth

Update or generate:

- `docs/architecture/system-delivery-status.md`;
- a capability table with `implemented`, `partial`, `blocked`, `not-started`;
- reviewed commit and evidence links;
- current Phase 4 and selection-integrity state;
- one non-blocking product-quality scorecard.

## Route 6 — Start Phase 5 with one vertical

First vertical:

```text
Canvas description edit
-> typed operation
-> expected project revision + expected file SHA
-> comment-preserving YAML/CST mutation
-> one-file receipt
-> invalidate ProjectDbtGraphFromFiles
-> reanalyze
-> reproject Canvas
-> prove unrelated formatting/comments preserved
```

Do not create:

- a generic `VisualEditDbtProject` command accepting arbitrary strings;
- browser-owned YAML/Jinja semantics;
- arbitrary SQL rewrite;
- a second semantic graph authority;
- cross-file rename before batch mutation support and dependency-safe policy.

## Route 7 — Raise product-quality gates

After the first safe visual-edit vertical:

- add API/Web changed-code coverage;
- target at least 90% branch coverage for selection, authority, admission,
  idempotency, CAS, retry, and compensation modules;
- add automated axe and keyboard critical journeys;
- enforce bundle and interaction budgets;
- benchmark 1k, 10k, and 50k graphs;
- add production-like load and recovery proof;
- finish outbox canary and ordered multi-worker evidence;
- correlate frontend telemetry with request, PlanRef, and run IDs;
- converge Zod majors at the API/contracts boundary.

## 12. Mandatory regression matrix for selection intent

The implementation is not complete until both authored DBT and file-backed DBT
paths prove the following.

| Scenario | Required result |
| --- | --- |
| No explicit selection, workspace action chosen | Workspace mode; authorized executable workspace closure. |
| Explicit executable model selected | Explicit mode; model plus executable dependencies. |
| Explicit source-only selection from legacy state | Blocked; no Preview request. |
| Explicit metric/exposure/seed-only legacy state | Blocked; no Preview request. |
| Explicit stale-only ID after reanalysis | Blocked; never workspace fallback. |
| Explicit valid + stale ID | Blocked; stale ID is reported, valid ID is not silently accepted alone. |
| Deselect stale member from valid + stale | Valid member remains explicit; no workspace transition. |
| Deselect last stale member | Explicit-empty blocked or explicit reset required; never workspace fallback. |
| Deselect last valid explicit member | Same rule: never implicit workspace fallback. |
| User explicitly chooses whole workspace | Mode changes to workspace through a named action. |
| Selected node becomes hidden by UI filter | UI may hide it; execution intent remains unchanged. |
| Selected node is renamed/reidentified | Old ID blocks until user replaces/reset; no silent remap unless an authoritative migration exists. |
| Same executable closure, different requested roots | Existing Preview becomes stale because intent signature changed. |
| Same roots, graph/project revision changes | Existing Preview becomes stale. |
| Concurrent edit after Preview | StartRun rejects stale PlanRef. |
| Reopen persisted Canvas | Mode and requested roots restore without reconstruction from visible IDs. |

Required proof layers:

- pure policy unit tests;
- store/state transition tests;
- authored Canvas controller tests;
- file-backed Canvas controller tests;
- Preview presentation tests;
- API admission tests;
- strict live Cypress negative and positive flows;
- architecture tests preventing UI reconciliation from owning execution intent.

## 13. Suggested PR decomposition

Prefer completing the existing PR rather than stacking a second overlapping fix,
but keep each concern reviewable.

1. `fix/dbt-execution-selection-intent-state`
   - explicit mode type;
   - separate execution state from UI selection;
   - store migration if persisted state is introduced.
2. `fix/dbt-selection-toggle-raw-intent`
   - authored and file-backed toggle mutations;
   - explicit reset-to-workspace action.
3. `test/dbt-selection-lifecycle-matrix`
   - stale, mixed, explicit-empty, reanalysis, reopen, and no-request negative tests.
4. `test/web-dbt-planner-projection-negative-guard`
   - close PR #1970 P2.
5. `docs/current-state-phase4-selection-integrity`
   - generated/current capability status and evidence links.
6. `feat/dbt-visual-edit-description`
   - first conservative YAML description vertical.
7. `ci/api-web-critical-coverage-ratchet`
   - changed-code and critical-module branch coverage.
8. `test/web-a11y-bundle-graph-scale-baselines`
9. `test/load-chaos-and-outbox-canary`
10. `chore/api-contracts-zod4-convergence`

If modifying PR #1971 directly, the final PR should not be artificially split only
to match these names. The important constraint is that selection state and its
transition tests land together; quality/NFR and Phase 5 work must remain separate.

## 14. Release and merge gates proposed for the next milestone

The next milestone must not be called selection-safe unless:

- workspace and explicit mode are represented independently from array emptiness;
- unavailable requested IDs survive UI reconciliation;
- removing the last explicit member cannot select the workspace;
- requested roots, dependencies, and authorized closure are separately visible;
- selection intent participates in Preview staleness identity;
- stale revision and stale PlanRef are rejected server-side;
- all scenarios in section 12 pass;
- no active non-outdated P1/P2 review thread remains unresolved;
- required CI is green on the final head.

The next milestone must not be called product-quality complete unless it also has:

- API/Web coverage ratchets;
- accessibility automation for critical journeys;
- enforced graph and bundle performance budgets;
- production-like load/recovery evidence;
- current generated capability status;
- outbox canary/multi-worker evidence or explicit bounded waivers.

## 15. What not to do

- Do not merge PR #1971 because GitHub reports `mergeable: true`.
- Do not treat its current green workflows as proof that the P1 transition cases
  are safe.
- Do not patch the issue only by making one button disappear.
- Do not continue using `selectedNodeIds.length` as the selection-mode authority.
- Do not silently discard unavailable requested IDs.
- Do not interpret deselect-last as “run everything.”
- Do not combine Phase 5 visual mutation with the selection fix.
- Do not introduce a generic DBT visual-edit command.
- Do not repeat the now-resolved PR #1959 findings as active defects.
- Do not merge this documentation review as product implementation evidence.

## 16. Final recommendation

DVT's architecture is strong enough to support the intended dbt product. The
current risk is an authority leak inside the client state model: presentation
reconciliation is still able to rewrite execution intent because mode is inferred
from an overloaded array.

The next engineering decision should be:

> Complete PR #1971 by introducing an explicit execution-selection intent state,
> separate it from UI selection, prove every stale/deselect/reanalysis transition,
> close the two P1 threads and the merged architecture-test P2, then begin the
> first revision-guarded, comment-preserving YAML description edit.

This is the shortest route that both fixes the current safety defect and preserves
the accepted product direction.
