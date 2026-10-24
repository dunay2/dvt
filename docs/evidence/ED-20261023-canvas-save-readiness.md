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
  - apps/web/src/app/views/canvas/canvasRelationAnalysisSession.ts
  - apps/web/src/app/views/canvas/useCanvasRelationAnalysisSession.ts
  - apps/api/src/application/services/dvtWorkloadPublication.ts
  - apps/api/src/application/services/importDbtProjectUseCase.ts
  - apps/api/src/application/services/validateDbtProjectImportUseCase.ts
  - apps/api/src/application/services/projectDbtGraphFromFilesUseCase.ts
  - apps/api/src/infrastructure/dbt/DbtCliProjectAnalyzer.ts
  - packages/@dvt/contracts/src/contracts/planner/DvtOperationalRejection.v1.ts
evidence:
  tests:
    - pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/views/canvas/CanvasRelationOutputs.test.tsx src/app/views/canvas/useCanvasRelationAnalysisSession.test.tsx src/app/views/canvas/CanvasStagedAnalysisProvider.test.tsx
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

## One Dbt Identifier Policy

The [identifier policy plan](https://github.com/dunay2/dvt/issues/3115#issuecomment-6379869747)
follows the real duplicate-guard failure at final validation. Canvas artifact
projection and Code file selection had identical normalization bodies; review
also found the same dbt naming policy in authoring metadata. One import-free
`plugins/dbt/dbtIdentifier.ts` now owns the shared spelling rule, including
optional input and the caller's unchanged fallback. All seven consumers use
that leaf directly. The three former bodies and the old Canvas export
are removed; Code does not import the Canvas artifact renderer to compute names.

Characterization covers generated names, paths and references, Code file scope,
source/table authoring, empty input and unchanged fallbacks. Existing model-chain,
planner, workspace, test-artifact and Code presentation tests retain their
behavioral assertions. The structural failure is recorded separately from the
missing-module RED; only the former demonstrated the actual duplicate policy.

The existing projection component gains the precise naming responsibility and
owns the new leaf and its direct test. Its normalizer binding moves to that
responsibility; other bindings and consumer ownership remain intact. Canonical
catalog reconciliation removes only the retired Code normalizer from the
affected current manifests. DVT/native normalization currently produces the same
spelling but belongs to native authoring policy; it does not become dependent on
the dbt plugin. Template normalization has different spelling behavior and also
retains its own authority.

## Canvas Copy Without Repeated Resolution

The [catalogue plan](https://github.com/dunay2/dvt/issues/3115#issuecomment-6381645154)
precedes implementation and retains `ConfigureApplicationLanguage` authority.
Two independent reference reviews identified 140 unused entries, including
computed consumers. Both languages and their type contract retire those entries.
The remaining 660 English and 660 Spanish messages match the previous Git
revision exactly, including placeholders and legitimate empty suffixes.

The four English sections now use the same plain string representation as
Spanish. Unused `key` metadata and `fallback` wrappers are removed. Each language
is composed once; the existing Proxy still reads the current preference for
every lookup. Repeated English reads no longer resolve all 800 former entries.
The focused reuse regression failed before the change; the final three copy and
Code-consumer specs pass 24 cases, and Web type checking passes.

The [locale follow-up](https://github.com/dunay2/dvt/issues/3115#issuecomment-6381868368)
retires `detectCanvasViewLocale`, which only forwarded the existing application
preference. Canvas and the YAML description editor now read that same store
directly; the editor no longer imports the Canvas catalogue. Characterization
before and after the change passes 22 cases across the Canvas and YAML copy
specs, including preference changes on an open consumer. Nineteen overlap the
earlier copy proof; the combined focused coverage is 27 distinct cases.

`SYS-WEB-CANVAS-COPY` owns the existing catalogue, type and direct tests under
one responsibility. Three physical files move from Readiness to that owner;
Readiness retains its 47 function bindings and consumes the catalogue through
the recorded dependency. No source file, localization framework, compatibility
wrapper or parallel command/query is added. Exact committed evidence, browser
acceptance and the separate Planning DB availability incident remain in #3115.

## One Fresh Analysis Per Dbt Import

The [import refinement](https://github.com/dunay2/dvt/issues/3115#issuecomment-6382384092)
records the measured repeated work, current and target sequences, existing rails,
allowed surfaces and failure guarantees before implementation. Two local LIVE
executions timed out waiting 30 seconds for the import response. A backend-only
observation used the exact three-file fixture, real dbt subprocesses and disposable
PostgreSQL stores. It completed in 21.815 seconds; its two parses consumed 10.805
and 10.762 seconds, or 98.9% of import duration. That observation establishes the
dominant repeated work, not the cause of the slower LIVE runs.

The production composition regression first failed because one new import called
the analyzer twice. The command now carries its own fresh scoped analysis from
validation into the first graph projection. Validation's public response remains
unchanged. The existing projector resolves persisted authority and checks the
current source revision through the analyzer's canonical source-selection policy.
Normal graph queries still analyze freshly. Completed receipt replay precedes
inspection, analysis and revision reads; no result cache spans commands.

Source configuration, SQL/YAML and installed dependencies participate in the
revision; generated output does not. Mismatched scope, root, invalid analysis,
changed source or a failed revision read refuse completion and retain the existing
lease-guarded compensation. The adapter shares source limits and hashing policy
with its snapshot path instead of introducing another inventory or parser.

The six affected specs pass 67 distinct cases, including the corrected typed
authority refusal and causal authority-acquisition fixture. Production/test types
and strict lint pass. The post-change real-provider observation uses the same
three file hashes and produces the same analysis hash and two projected resources.
Import takes 10.580 seconds: one parse takes 10.412 seconds and the source-revision
read takes 10 milliseconds after authority acquisition. This pair of observations
shows a 51.5% lower import duration; it is not a performance distribution or proof
of the original LIVE timeout's exact cause. Both subprocess/request deadlines stay
at 30 seconds, and the disposable stores and files are cleaned up.

Exact commands, intermediate test/type/lint failures, complete pre-push and
committed CI identities are recorded on #3115. The backend measurement alone does
not certify acceptance of the full LIVE user flow.

## Bounded Local Validation Workers

The [worker policy plan](https://github.com/dunay2/dvt/issues/3115#issuecomment-6383136858)
records the comparison and existing `WebVitestSuitePartition` authority before
implementation. The normal pre-push on `ca9eb6206` passed changed-file quality
and architecture gates, then failed Canvas presentation: 1041 cases passed and
26 failed in 16 files. Twenty-four failures exceeded the unchanged five-second
limit; two assertions followed timed-out cases in their own files. Fourteen
forks were observed. This is a failed gate, not partial acceptance.

The same 16 files and 55 cases passed unchanged with one isolated fork in
896.73 seconds and four in 270.96 seconds. No other validation ran concurrently;
neither CI environment flag was set. The four-worker run's slowest observed case
took 3769 milliseconds, and a process snapshot confirmed four child forks.
The 69.8% elapsed-time reduction compares only these two bounded observations.
It does not prove an OOM cause or the precise continuation responsible for the
earlier assertions.

The existing catalog owns the local four-worker bound and unchanged CI
one-worker policy. Its contract must retain per-file isolation, suite coverage,
environments, dependency preparation and test deadlines. CI keeps its 4096 MiB
heap arguments; local execution inherits its previous heap configuration.
The superseded private CI-only helper name must be retired rather than wrapped,
with exact current symbol reconciliation through the existing catalog operations.

The existing catalog contract first passed 22 cases and failed its new local
worker case because the bound was absent. After the single-helper change, all
23 cases pass under `vitest.architecture.config.ts`. The contract checks every
primary/focus suite and both existing CI signals, including unchanged heap and
environment values and the absence of timeout or retry overrides.

The complete normal pre-push, exact-head CI and post-merge main acceptance remain
required. Diagnostic success is not a waiver or a manually generated success stamp.

## Keyboard Test Synchronization Follow-Up

The complete normal pre-push on `4d75d178a` passed documentation, 642 Planning DB
manifests, changed-file quality and dependency builds. Canvas presentation then
reported 342 passing cases and one five-second navigation timeout in 56 files.
The operator interrupted the remaining work after that failure; no complete
acceptance is claimed. The case passed alone and in an eight-file diagnostic,
whose worker CPU profile does not establish the timeout's cause.

The neighboring keyboard-menu case exposes a separate, demonstrated test defect:
Radix defers keyboard focus, but this test waits for that focus outside `act`.
The DOM test library does not supply a React act wrapper. A fifth End movement
also activates the last item before proving it received focus. The existing
`ResolveCanvasContextMenu` query and its product implementation remain unchanged.

The [test-only correction plan](https://github.com/dunay2/dvt/issues/3115#issuecomment-6383634195)
keeps each key/focus completion inside one awaited act, preserves every keyboard
destination and callback assertion, and observes React warnings through a
call-through spy. The unchanged keyboard case first failed with 48 warnings
against zero expected. After correcting synchronization, that case and all
19 cases in its existing file pass with zero warnings. The spy retains console
output and is restored even if an assertion fails. The eight neighboring files
then pass all 86 cases under the canonical configuration, without profiling or
warnings. No retries, deadlines, product behavior or worker configuration change.
This does not establish that the other timeout is resolved. Exact commands and
final acceptance remain in issue #3115.

## Architecture Proof Boundaries

The next normal pre-push passes all 1067 presentation, 12 Monaco and 3179 unit
cases, then fails seven architecture checks. Five depend on copied browser
inventories or the retired copy wrapper; one prescribes Run's former local
variable spelling. The unused-declaration fixture additionally exceeds its
unchanged deadline while initializing the full typed Web program. Subsequent
fixtures reuse that program; no timing profile attributes its entire cost.

The [maintenance plan](https://github.com/dunay2/dvt/issues/3115#issuecomment-6384342248)
keeps proof ownership explicit. Browser import
reachability must agree with unique canonical runtime ownership and complete
emission, without copied consumer lists or fixed catalogue totals. Existing
LIVE receipt and exact Run payload tests own observable behavior; architecture
guards retain the catalogue binding, single selection seam and public contract.

Unused-declaration fixtures exercise the existing canonical syntax projection,
with exact resolved-rule parity against strict lint in the existing hook-wiring
contract. They do not need a typed
program to detect unused declarations. Strict product lint, all suite membership,
negative assertions, deadlines and retries remain unchanged. This maintenance
adds no product rail, configuration, parser framework or alternate catalogue.
Focused results and the complete committed acceptance are recorded in #3115;
the failed normal pre-push is not treated as partial acceptance.

## Output Publication During Acknowledgement

The next normal pre-push passes presentation, Monaco, unit and architecture,
then fails focus retention when reincluding a field in the three-input browser
journey. Passive diagnostics locate a null analysis context and destroyed
control; row keys and focus recovery are not the cause. Later instrumented runs
pass, so those observations alone do not establish the precise interleaving.
All temporary instrumentation is removed.

The [bounded publication plan](https://github.com/dunay2/dvt/issues/3115#issuecomment-6385300714)
adds a deterministic interleaving to the existing output-control test. An
equivalent received acknowledgement arrives after the real command applies its
edit and before publication. Before correction it destroys the control and
prevents publication; the other 15 cases pass. The React boundary now admits
received document and eligibility values before effects, retains the published
input identity explicitly and shares the session's document equality predicate.
Equivalent allocations cannot reapply the previous document over a pending local
edit. Genuine changes retain the existing invalidation and rejection behavior.

The existing command record is amended with revision checking; no product rail,
component or feature manifest is added. No focus override, retry, wait, deadline,
coverage or hook exception is introduced. Exact focused, browser and complete
acceptance results remain recorded in #3115.

## Shared Workbench Width

The complete normal pre-push and push on `1bfce6643` pass. Remote controlled
browser acceptance subsequently fails two Code cases and one Name-edit case;
the Test Suite aggregate consequently fails. These results do not authorize merge.

The [bounded layout plan](https://github.com/dunay2/dvt/issues/3115#issuecomment-6386761990)
reuses `RouteWorkbenchFrameSlotProjection` and its existing shared slot owner.
Both Code language cases first fail a real geometry assertion: the slot stack
occupies 427.609375 pixels of a 607-pixel body. Its flex-row parent does not give
the stack a width or growth policy. Adding `w-full` at that shared owner fills
the allocation without changing consumers, queries or Monaco semantics.

The same cases then pass at 1000 by 660 and 1440 by 900, retaining visible SQL,
exact published content and the prohibition on Preview/Run after compilation
rejection. Together with the existing route-slot journeys, seven browser cases
pass. The separate Name-edit case passes during passive diagnosis; its precise
CI failure is not reproduced. Temporary tracing is removed. Full normal pre-push,
exact-head CI and resulting main acceptance remain required.

## Node Menu Focus Handoff

Passive browser events show General receiving focus at 2543.6 milliseconds,
followed by the menu's deferred cleanup returning it to the node shell at
2570.7 milliseconds. The subsequent Name clear succeeds in that observation;
the precise intermittent CI failure is not established by this trace.

The [focus handoff plan](https://github.com/dunay2/dvt/issues/3115#issuecomment-6386940352)
keeps the existing menu view and Radix lifecycle. Three cases in the real
node-shell integration distinguish Escape, ordinary Properties close and
Properties followed by a control receiving focus before cleanup. Before the
change, only that last case fails: 14 pass and focus returns to the shell
instead of the already focused input.

The menu's existing close event now cancels restoration only when focus already
belongs to an element outside the menu and document body. Normal restoration,
action dispatch and Inspector state retain their current owners. This adds no
state, timer, focus registry or alternate menu implementation. The original
unsupported-inspection browser case passes with exact empty-name, Apply and
semantic-authority assertions unchanged. Full acceptance remains recorded in
issue #3115; isolated success does not demonstrate the cause of the CI clear failure.
All 26 affected presentation cases pass. The existing menu-view test double
forwards only its declared DOM presentation props, removing its React warning
without suppressing console output or replacing the real Radix focus proof.

## Architecture Scan Work

The normal pre-push on `5139bd8ee` passes Monaco, unit and presentation, then
fails five architecture cases at the unchanged five-second limit. Isolating the
four specs still fails four cases; this is not evidence of a host fault. Query
guards repeat four source walks and reads, the catalog repeats six inventories,
and two runtime guards create more than 8,000 assertions each.

The [scan simplification plan](https://github.com/dunay2/dvt/issues/3115#issuecomment-6387643584)
retains the existing `WebVitestSuitePartition` authority and every policy.
One bounded reader in the existing test support shares only filesystem access;
each guard retains its own inventory and forbidden facts. Query cases reuse
one lazy snapshot, and catalog cases reuse one lazy inventory, both initialized
inside the first consuming test. Dirents replace per-entry metadata calls while
preserving symbolic-link handling. Runtime guards collect every file/rule
violation before a single assertion; no compliant source is excluded.

Negative policy examples, real inventory parity and bounded-read failure checks
protect these substitutions. Exact commands, observed timings and complete
acceptance remain in issue #3115. No deadline, worker, retry, isolation, hook or
CI obligation changes; focused success alone does not authorize integration.

The four changed specs pass all 46 cases, including their negative fixtures.
A subsequent complete run exposes five timeouts elsewhere. A host observation
finds full CPU utilization and duplicate, long-running VS Code Mermaid file
searches following ignored paths and links. Cancelling only those read-only
searches, with no source or configuration changes, changes the same five-spec
run from four failures to 28 passing cases. This supports local contention as
the explanation for that batch, without establishing every earlier failure's
cause. The subsequent complete architecture run passes 130 files and 692 cases
in 40.24 seconds. Normal pre-push, exact-head CI and main acceptance remain
separate obligations.
