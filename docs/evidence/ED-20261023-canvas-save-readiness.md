---
title: Canvas save identity and execution readiness boundaries
status: draft
date: 2026-10-23
owners:
  - Web
  - API
arc_level: ARC-2
breaking: false
code_refs:
  - apps/web/src/app/views/canvas/useCanvasDraftAutosave.ts
  - apps/web/src/app/views/canvas/canvasRuntimePolicy.ts
  - apps/web/src/app/views/canvas/canvasPlanReadiness.ts
  - apps/web/src/app/views/canvas/canvasPlanAction.ts
  - apps/web/src/app/views/canvas/useCanvasPlanActionHandler.ts
  - apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.ts
  - apps/web/src/app/views/canvas/canvasDbtWorkspaceArtifacts.ts
  - apps/api/src/application/services/dvtWorkloadPublication.ts
  - packages/@dvt/contracts/src/contracts/planner/DvtOperationalRejection.v1.ts
evidence:
  tests:
    - pnpm --filter @dvt/web exec vitest run src/app/views/canvas/useCanvasDraftAutosave.test.tsx src/app/views/canvas/canvasDraftAutosaveSnapshot.test.ts src/app/views/canvas/canvasDraftPersistenceRuntime.test.ts src/app/views/canvas/useCanvasDraftAutosave.architecture.test.ts
    - pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasPlanReadiness.test.ts src/app/views/canvas/canvasRuntimePolicy.test.ts src/app/views/canvas/canvasOperationalDrawerContribution.test.tsx src/app/views/canvas/canvasPlanAction.dvtProtectedPreview.test.ts
    - pnpm --filter @dvt/web exec vitest run src/app/views/canvas/useCanvasExecutionActions.runStartGuards.test.tsx src/app/views/canvas/useCanvasExecutionActions.runStartSuccess.test.tsx src/app/views/canvas/canvasRunStartIdentity.architecture.test.ts
    - pnpm --filter dvt-api test:unit test/application/services/resolveAuthorizedDvtPreviewSelection.test.ts
    - pnpm --filter @dvt/contracts exec vitest run test/operational-rejection.test.ts test/schema-sync.test.ts
    - pnpm validate:contracts
---

# Canvas Save And Readiness

The governing issue is [#3115](https://github.com/dunay2/dvt/issues/3115).
Its [initial rationale](https://github.com/dunay2/dvt/issues/3115#issuecomment-6370941395)
and [component refinement](https://github.com/dunay2/dvt/issues/3115#issuecomment-6371448881)
preceded the corresponding implementation. Existing ConfigureCanvasDvtNode,
SaveWorkspaceGraphDraft, PreviewPlan and ObservePlanRunReadiness rails remain the
product boundaries. ADR-0044 and ADR-0066 govern diagnostic identity and supported
publication shapes.

The save regression test first demonstrated starvation: equivalent projection
objects reset the debounce and no request was sent. Scheduling now follows the
semantic signature and revision while retaining the committed payload. Real
edits restart debounce; unmount and denied persistence cancel it. Existing
snapshot acknowledgement, CAS and recovery guards remain active.

Runtime policy owns a discriminated Run admission value. Draft persistence
supplies its barrier without interpreting Run permission. Readiness owns each
blocker's message and label, used by the operational drawer. The old
unused global unavailable summary and duplicated label map are removed.
The same typed cause reaches the Run application command; direct invocations
cannot misreport a pending save or unavailable capability as permission denial.

Preview owns outcome and attempted draft signature as one value. Its visible
diagnostic expires on a semantic edit even when the previous request accepted no
plan. The application command owns permission/profile guards and the pre-submit
flush; its React adapter owns query invalidation and presentation. No dependency
array or ref is used to hide command dependencies.

API publication admission distinguishes unsupported terminal disposition,
ephemeral output without Sink, incompatible Sink input, and conflicting
publication targets. Invalid authoring drafts still fail before this policy;
tests use valid persisted shapes to reach each admission decision. Web translates
stable causes instead of using one ambiguous instruction for every case.

The Planning DB integrity check initially passed but the affected Web area had
only root ownership and no semantic components/source bindings. Scoped records
now describe the actual boundaries. No global import or database rebuild was
performed. During consultation PostgreSQL entered automatic recovery after a
backend exited with code 2; the log does not establish its root cause or database
corruption. The subsequent integrity check passes with the prior 101 warnings.

Exact validation results, failed invocations and the bounded browser acceptance
are recorded in the issue. Listed commands declare scope, not blanket acceptance.
No new runtime profile, rule exemption, hook bypass, debt or stub is introduced.

## Component boundaries and executable fitness

The [boundary refinement](https://github.com/dunay2/dvt/issues/3115#issuecomment-6373237186)
records current/target diagrams and the allowed implementation surfaces before
the writer and dependency tests. Six existing components retain their identities
and bindings while their concrete reasons to change and excluded concerns replace
generic metadata. Preview/Run coordination references the existing StartRun rail.

The existing ReviseGovernanceComponent command now accepts rail/semantic-owner
corrections and exact removal of superseded reasons or non-goals. Expected
revision, design scope, audit identity and unrelated metadata are preserved.
Unknown removals and invalid rail declarations reject. No raw SQL write, import
or replacement catalog is used.

Five root dependency-cruiser error rules enforce current import direction:
readiness to effects, autosave to execution, execution to route composition,
publication policy to adapters, and contracts to applications. The existing
architecture gate owns execution in CI. Negative fixtures exercise both runtime
and type-only edges; positive fixtures retain composition, ports and passive
diagnostic translation. The actual repository graph is also checked through
`pnpm arch:deps`.

Focused commands for this refinement are
`node --test scripts/planning-db-operate-tests/component-create.test.cjs` and
`node --test --test-name-pattern='Canvas component boundaries' tools/ci/architecture-dependency-guard.test.mjs`.
The issue records exact outcomes and committed base/head. This tooling and
metadata refinement does not change product runtime behavior or repeat the
previous browser acceptance.

## Shared Inspector Typography

The [presentation refinement](https://github.com/dunay2/dvt/issues/3718#issuecomment-6374119997)
reuses the current presentation query and the existing protected save proof.
Its first rendered regression observed 14px labels against the 12px General tab.
One shared Inspector form token now applies the existing compact scale to labels,
inputs, native selects, select triggers and textareas. Inspector/workbench property
facts use that same body scale. Title hierarchy, global UI primitives, control
heights and authoring handlers are preserved.

The extended existing LIVE case compares computed typography at 1600 and 1200px,
checks keyboard focus and horizontal overflow, and retains save/readback/reload
for table, view and ephemeral without starting Run. The issue records the final
result and candidate SHA. No CSS-class snapshot or new style-specific unit suite
is used as a substitute for the rendered proof.

## Inspector Code Tab And Canonical Editor Height

The [Code layout plan](https://github.com/dunay2/dvt/issues/3718#issuecomment-6375377411)
keeps `RenderCanvasContextualGraphSurface` as the presentation authority. The
existing section policy now places Code after the other supported primary tabs;
Source's bounded tabs and explicit tab requests retain their behavior.

The saved-JOIN browser scenario reproduced a 5px Monaco surface. Its intermediate
output container was not a flex parent, so the output's remaining-height contract
was ineffective. Repairing that existing layout link produced a 315px editor in
the same viewport. A subsequent overflow assertion found the document digest
extending 22px beyond its container; wrapping the existing description keeps the
hash readable without changing the canonical content.

The existing `canvas-relational-tree-workbench.cy.ts` checks real Monaco lines,
minimum usable height, panel containment, two desktop widths, Code-last ordering,
tab roundtrip, no graph writes and entry back into the semantic editor. The first
probe used an unsupported document without canonical output; it did not prove
the height failure and its added assertions were removed. Final acceptance and
the exact candidate SHA are recorded on the governing issue. No fixed editor
height, new resize effect, editor implementation or mutation rail is introduced.

## Code Inspection Query And Ownership Review

The [bounded CQS review](https://github.com/dunay2/dvt/issues/3718#issuecomment-6375658644)
keeps the existing contextual presentation query and connected-graph projection
adapter. Pending SQL selections now share the current query; pending and ready
results carry their exact input references. A graph-context change exposes
canonical output until an explicit fresh SQL request, without automatic graph
hashing or compilation. Older request completions cannot replace a newer result.
Failure and retry remain explicit. The view reuses the projection input type and
the contribution reuses the output-view props rather than repeating DTO fields.

The dedicated lifecycle test first failed five cases: duplicate pending work,
stale output after each of the three projection inputs changed, and an obsolete
completion scenario. After the fix, its eight cases pass. Existing connected-graph
projection tests retain source-identity rejection. Canonical JSON and SQL now
share one Monaco rendering path; the redundant exported SQL wrapper and the
intermediate output div are removed. The existing section policy loses only an
unreachable General branch and an equivalent Summary branch.

Two precise existing implementation boundaries replace generic root ownership:
`SYS-WEB-CANVAS-NODE-WORKBENCH` and `SYS-WEB-CANVAS-CODE-INSPECTION`. The current
registry links eight production files and 21 named functions to eight atomic
responsibilities, with exact tests and one directed composition relation. Both
resolve to the existing SYS-WEB-ROOT parent; no duplicate architecture root or
source metadata headers are added. The unchanged integrity gate identified
overly broad initial entry paths and missing required-test catalog records.
The [evidence refinement](https://github.com/dunay2/dvt/issues/3718#issuecomment-6375817198)
corrects those records through the public operations, without baseline changes.

Focused acceptance comprises the output lifecycle, existing workbench/content
and property-model tests, section policy and projection tests, shared Monaco and
composition guards, plus the same saved-JOIN browser spec. The latter selects
derived SQL, verifies one real usable Monaco viewer, returns to canonical output
and asserts no graph writes. Exact committed base/head and results remain in the
governing issue; this review does not claim full-branch CI or prepush acceptance.

## Preview Publication Effects Survive Later Failure

The existing `PreviewPlan` command can acknowledge atomic graph-derived dbt
artifact publication before compilation or Preview fails. Previously, failure
receipts omitted those writes and the presentation adapter returned before
invalidating workspace queries. The
[receipt design](https://github.com/dunay2/dvt/issues/3115#issuecomment-6376120481)
defines one per-attempt effect accumulator and a mandatory readonly
`writtenArtifactPaths` field on both result variants. One failure constructor
retains the confirmed paths across typed rejections and exceptions. Paths enter
the receipt only after publication acknowledgement; the command does not infer
writes from proposed artifacts or invent a cross-service rollback.

The existing React adapter invalidates the scoped file tree, artifacts and exact
written file-content keys before presenting the outcome. Failure retains its
message and cannot install a new plan, open a success modal or enable Run.
No-effect receipts cause no cache invalidations. The existing three strategies
and application ports remain on their established rails.

TDD first reproduced six missing-receipt failures and three missing-invalidation
failures. Focused command, publisher, handler and composition tests cover typed
compilation rejection/refusal, compiler and Preview exceptions, unacknowledged
publication, authorization and zero-effect publication. Existing protected and
file-backed strategy assertions now include empty receipts. One stale-Preview
readiness test explicitly declares its expected language instead of inheriting
the host locale. The existing contextual Code browser spec additionally primes
the file tree, acknowledges publication, rejects compilation and checks visible
files without reloading or submitting Preview/Run. This is a controlled HTTP
frontend proof; it does not certify a live backend or native compiler.

`SYS-WEB-CANVAS-PREVIEW` retains ownership of submission and presentation. Current
source/test bindings are reconciled through the existing scoped writer with an
expected binding hash, preserving unrelated Run and autosave responsibilities.
Exact commands, results and committed base/head remain in #3115.

## Preview Strategy Capability Boundary

The [dependency design](https://github.com/dunay2/dvt/issues/3115#issuecomment-6376999390)
addresses unused publication capabilities required by every Preview invocation.
`CanvasPlanExecution` reuses the existing strategy discriminator and adds the
three publication/compilation ports only to `planner_generic_preview`.
`CanvasPlanActionArgs` replaces the four flat strategy/port fields with that
execution value. The common admission, graph identity, flush and receipt stay
in the existing command. Its plan service requires only `previewPlan`; the
session interface requires only its two consumed methods.

The existing React handler owns `bindCanvasPlanExecution`. For protected,
authoritative-file, unavailable and null strategies it returns the exact strategy
without reading publication dependencies. Generic composition receives the three
explicit existing adapters. This uses one command and one strategy vocabulary,
without additional services, optional-port fallbacks or new modules.

Five architecture cases first failed because that composition boundary did not
exist. The semantic tests now exercise poisoned dependency access for all four
non-generic postures and exact generic capability composition; type assertions
also retain required and absent members. Existing protected/file command tests
now omit the unused adapters rather than manufacturing casts or mocks. Generic
receipt, flush and handler tests retain their original behavior assertions.
The existing controlled Code browser spec proves the real frontend composition
with publication followed by compilation failure; it does not certify a live
compiler or backend. Exact commands, SHA boundaries and results remain on #3115.

`SYS-WEB-CANVAS-PREVIEW` remains the owner. Its new composition function is bound
to the existing presentation responsibility with its actual tests, preserving
the unrelated Run bindings. Tooling separation remains a subsequent cut.

## Readiness Evaluation And Presentation Boundary

The [readiness design](https://github.com/dunay2/dvt/issues/3115#issuecomment-6377354513)
keeps `ObservePlanRunReadiness` responsible for typed Preview states, blocker
ordering, exact persisted proof and the admitted Run target.
`deriveCanvasExecutionState` binds Preview lifetime and provenance to the shared
graph evaluation, then delegates admission to that query. Neither reads the
application language or formats messages. Original upstream projection
diagnostics remain opaque evidence.

One `canvasReadinessPresentation` module maps these facts into the existing
consumer read model. It owns shared labels, Preview messages, DVT cause
translation and graph-failure formatting. The hook composes both boundaries;
the drawer and Run error adapter reuse the same message helpers without
compatibility re-exports or a parallel query. The presenter cannot grant Run or
change the evaluated blockers. Existing message priority and raw rejection
evidence remain intact.

Six typed-state cases first failed against the mixed evaluator. Real negative
dependency-cruiser fixtures also failed before the new import rule existed.
Focused tests cover frozen evaluation, localization, duplicate blockers, summary
priority, stale Preview and raw causes. The existing controlled Code browser
spec exercises compilation rejection in EN and ES; it remains frontend evidence,
not acceptance of a live backend or compiler. The actual repository dependency
graph and the existing positive composition fixture validate the permitted
direction. Exact commands and results are recorded in #3115.

`SYS-WEB-CANVAS-READINESS` remains the owner. Scoped revision and binding
operations associate the new module and moved functions with the existing
readiness-copy responsibility, distinct from drawer rendering. Unrelated
runtime, posture and Preview command ownership is preserved.

## Current Readiness Coherence And Retirement

The [coherence design](https://github.com/dunay2/dvt/issues/3115#issuecomment-6378435979)
closes the six follow-up findings in the same product cut. One evaluation owns
strategy selection and executable graph projection for the exact graph,
selection, strategy and tenant/project/environment. The React composition
reuses that result across presentation, current plan and permission changes;
changed graph inputs or environment invalidate it. Execution eligibility comes
from the authoritative projection. The unused structural validation result,
its five implementation files, two dedicated tests, formatter, copy and DTO
pass-throughs are retired. An unavailable projection has no usable signature.

The actual Run command reevaluates the same readiness query at invocation.
Only its ready branch carries the exact persisted target; rejection cannot
reach the Run port. A regression first demonstrated submission after a rejected
Preview. Typed Run receipts now leave localization and modal recovery to the UI
adapter. Graph projections return stable causes or original diagnostic evidence.

The Operations registrar retains the complete bounded read model, including
cause-specific diagnostics. Equivalent data preserves registration identity;
a changed diagnostic replaces it even when the summary is unchanged. The
controlled HTTP browser proof closes the Preview modal through its visible
button, checks the actual reason in Problems and Runs in EN/ES, and verifies
Run remains disabled with zero submissions. All five cases of that spec pass.
This remains frontend acceptance with contract-validated HTTP responses.

The unused standalone readiness panel, its dedicated test and obsolete component
guide are removed. The previous strategy resolver is replaced by the shared
evaluation. The summary alias, repeated persistence-proof helpers and blocker
slots without a producer are retired with their consumers, copy and ownership.
The dependency guard covers projection and graph evaluation imports and prevents
the Run application command from importing presentation, including type imports.
No compatibility facade or legacy execution path is retained. Exact scoped
validation, failures encountered and final committed identities are recorded in
[issue #3115](https://github.com/dunay2/dvt/issues/3115); no complete pre-push result
or new global alpha acceptance is implied.

## Exact Artifact Identity And Single Validation Owners

The [refinement plan](https://github.com/dunay2/dvt/issues/3115#issuecomment-6379164214)
and [artifact identity amendment](https://github.com/dunay2/dvt/issues/3115#issuecomment-6379235481)
precede the corresponding implementation. A regression changes a source table
without changing its graph reference: the generated SQL and schema YAML change,
so an earlier Preview must become stale. The existing generic projection derives
its signature from the actual generated artifacts and passes those same artifacts
to Preview publication. File-backed execution keeps its independent file revision
and provenance authority. The command reevaluates after its authoritative draft
flush; no renderer, signature algorithm or compatibility validator is duplicated.

The changed-files test planner composes effective obligations from existing
package command definitions. Schema changes include both the schema and policy
tests. An aggregate absorbs only tests that it actually contains; unrelated and
filtered obligations remain. Unsupported aggregate syntax fails closed. Existing
failure propagation, environment isolation and success receipts are unchanged.
`SYS-CI-CHANGED-SLICE-VERIFICATION` owns the existing planner/executor file and
its test. Its two atomic responsibilities distinguish plan construction from
process execution; seven implemented function bindings and the existing test
contracts provide current evidence. The parent scope remains intact and no
parallel rail or command catalog is introduced.

On a main push, the dedicated mandatory Test Suite lane owns Engine coverage.
Full CI executes its existing docs and code baseline. Manual Code Quality
dispatch and local full validation retain coverage because they do not start
that dedicated workflow. No coverage threshold, required result, hook or merge
check is removed. The measured earlier main run repeated 75 files and 543 tests
in 28.27 seconds; the saving is projected until the changed workflow runs.

Planning DB removes duplicate physical ownership of two test files while
preserving their use as evidence by multiple components. The obsolete structural
validation rail and current evidence references to retired source/test files are
removed through guarded canonical operations. Git retains the historical files;
no legacy implementation or parallel catalog is kept. Exact RED/GREEN results,
committed boundaries and remaining validation limits are recorded in #3115.

## Reuse Within One Dbt Projection

The [projection reuse design](https://github.com/dunay2/dvt/issues/3115#issuecomment-6379479077)
precedes the implementation. Workspace composition creates one model projector
for its graph snapshot and reuses successful upstream projections within that
evaluation. The old one-shot API is removed and its four production consumers
use the same factory. No compatibility wrapper or persistent cache remains.

A real render-work regression first observed six model generations for a
three-model chain and five for a three-model fan-out. Each now requires three,
with identical complete SQL artifacts in either traversal order. This measures
eliminated repeated projection work, not total algorithmic complexity or a
wall-clock speedup; graph scans remain.

Cycle detection precedes result reuse. Failed results are not cached. Authoring
overrides and node objects outside the graph snapshot have isolated evaluations;
an independent review exposed a cloned-node cycle and its regression first
failed before that isolation was corrected. The final focused tests cover both
graph orders, fresh evaluations, source metadata changes, invalid columns,
overrides and direct, indirect and cloned-node cycles.

`SYS-WEB-DBT-ARTIFACT-PROJECTION` records the two existing production modules and
their three tests. Its atomic responsibilities distinguish model projection
from workspace artifact composition. The Readiness dependency is recorded as
a call, with current function bindings and required behavioral evidence. Exact
retirement removes only the deleted wrapper symbol from its existing rail
records; unrelated authority remains. No new product command or query is added.
