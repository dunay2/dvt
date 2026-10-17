---
title: Web Vitest Changed Suite Router Component
status: Active
owner: Frontend / CI
last_reviewed: 2026-10-12
planning_type: architecture
---

# Web Vitest Changed Suite Router Component

## Purpose

Own the query that maps changed `@dvt/web` files to the smallest safe test
obligations for local development and non-root-sensitive pull requests.

Owned concern: `WebVitestChangedSuiteRouter` converts file paths into catalog
owned suite commands. It accelerates local development and the `Web Frontend
Tests` pull-request lane while preserving full primary-suite coverage on
`main`, manual workflow runs, and root-build-sensitive changes.

## Public API

<!-- markdownlint-disable MD060 -->

| Surface                             | Type     | Responsibility                                                 |
| ----------------------------------- | -------- | -------------------------------------------------------------- |
| `resolveWebVitestChangedSuitePlan`  | function | Maps changed paths to ordered suite names and commands.        |
| `WEB_VITEST_CHANGED_SUITE_COMMANDS` | constant | Names the package-local command for each routed suite.         |
| `test:changed`                      | command  | Runs dependency build once, then routed web suite commands.    |
| `test:canvas-unit`                  | command  | Runs Canvas unit-model focus tests.                            |
| `test:canvas-presentation`          | command  | Runs Canvas presentation focus tests.                          |
| `test:canvas-architecture`          | command  | Runs Canvas architecture focus tests.                          |
| `test:monaco`                       | command  | Runs Monaco route-surface focus tests.                         |
| `test:shell-session`                | command  | Runs app shell, session, scope, and service-composition tests. |
| `test:workspace-services`           | command  | Runs workspace service port/facade focus tests.                |
| `test:web:changed`                  | command  | Root alias for the package-local changed-suite command.        |
| `run-vitest-changed-suites.ts`      | adapter  | Reads Git/`--files` inputs and runs grouped suite commands.    |
| `Web Frontend Tests` PR route       | CI job   | Runs changed-suite routing for ordinary web PR changes.        |

<!-- markdownlint-enable MD060 -->

## Invariants

- The router never changes primary suite ownership.
- Architecture-governance paths route to `architecture`.
- Web source edits also require the complete `architecture` primary suite:
  filesystem-reading guards can inspect sources outside their own focus lane.
  A paired changed test does not replace this obligation. Test-only diffs keep
  exact routing, and the existing full-suite normalization absorbs exact and
  Canvas architecture batches. This retains cross-module boundary evidence
  without another dependency catalog or running every behavioral suite.
- Canvas route paths and Canvas-owned component/inspector surfaces route to
  `canvas-unit`, `canvas-presentation`, or `canvas-architecture` when the file
  type makes that safe.
- Canvas-owned component surfaces under `src/app/components/canvas/**`,
  `src/app/components/inspector/**`, and `src/app/components/InspectorPanel.tsx`
  stay in Canvas behavioral focus lanes. They must not fall back to the full
  `unit` or `presentation` primary suites only because they live outside
  `src/app/views/canvas/**`. The architecture obligation is independent.
- Monaco-scoped paths route to `monaco` when the change is local to Code,
  Artifacts/Diff Monaco guards, or shared Monaco code surfaces.
- App shell, session context, workspace-scope selection, session store,
  API-client context propagation, service composition, and their shared test
  doubles route to `shell-session` before the broad `unit` or `presentation`
  fallback.
- Workspace service paths under `src/app/services/workspace/**` route to
  `workspace-services` before the broad `unit` fallback.
- When a changed source file and its same-stem `*.test.*` or `*.spec.*` file
  both appear in the same diff, the router may run that exact test file instead
  of the broader suite.
- A source without a directly paired changed test requires its complete suite.
  Unrelated exact tests in that suite cannot cancel this requirement. When a
  complete suite is required, its exact tests are included by that run rather
  than executed again in a separate batch.
- Exact changed-test execution is batched by Vitest config, so one changed set
  with many architecture files still pays for one Vitest process for that
  architecture config.
- Governance changes to the suite catalog, configs, package scripts, router
  adapter, or router docs run all current `src/testing/vitestSuites*.architecture.test.ts`
  guards in one exact batch instead of the broad architecture suite. The
  inventory contract detects guards omitted after a split or addition.
- A complete primary suite absorbs its equivalent Canvas focus suite, including
  exact focus tests. The catalog contract proves file-set containment and equal
  execution configuration outside include/exclude patterns. An exact primary
  batch is not a complete suite and cannot absorb a Canvas focus run.
- Monaco, shell-session, and workspace-services retain their own execution
  contexts: their jsdom defaults are not interchangeable with Node primary
  suites. This normalization does not change environments, isolation or workers.
- Source files without a changed same-stem test keep the existing suite
  fallback, so unpaired source edits do not silently lose coverage.
- Non-Canvas `.tsx` paths route to `presentation`.
- Non-Canvas `.ts` paths route to `unit`.
- If no web-relevant changed file exists, the command exits successfully
  without running a Vitest suite.
- Pull-request CI may use `test:web:changed` only when the test scope is web
  and not root-build-sensitive.
- `main`, manual workflow runs, and root-build-sensitive PRs still use
  `test:web:ci`.

## Transitions

```mermaid
stateDiagram-v2
  [*] --> ChangedFiles
  ChangedFiles --> GovernedPath: suite catalog/config/docs
  ChangedFiles --> ArchitectureCommand: Web source edit, including paired source
  ChangedFiles --> PairedSource: source plus changed same-stem test
  ChangedFiles --> RequiredSuite: source without a paired changed test
  ChangedFiles --> CanvasPath: Canvas route, canvas component, or inspector surface
  ChangedFiles --> MonacoPath: Monaco route/editor surface
  ChangedFiles --> ShellSessionPath: shell/session/scope/composition surface
  ChangedFiles --> WorkspaceServicePath: workspace service port/facade
  ChangedFiles --> TsxPath: non-Canvas TSX
  ChangedFiles --> TsPath: non-Canvas TS
  GovernedPath --> ArchitectureCommand
  PairedSource --> ExactTestBatch
  RequiredSuite --> CompleteSuite
  CanvasPath --> CanvasUnitCommand: .ts
  CanvasPath --> CanvasPresentationCommand: .tsx
  CanvasPath --> CanvasArchitectureCommand: architecture
  MonacoPath --> MonacoCommand
  ShellSessionPath --> ShellSessionCommand
  WorkspaceServicePath --> WorkspaceServicesCommand
  TsxPath --> PresentationCommand
  TsPath --> UnitCommand
  ArchitectureCommand --> Evidence
  ExactTestBatch --> Evidence
  CanvasUnitCommand --> EquivalentCoverage
  CanvasPresentationCommand --> EquivalentCoverage
  CanvasArchitectureCommand --> EquivalentCoverage
  MonacoCommand --> Evidence
  ShellSessionCommand --> Evidence
  WorkspaceServicesCommand --> Evidence
  PresentationCommand --> EquivalentCoverage
  UnitCommand --> EquivalentCoverage
  CompleteSuite --> EquivalentCoverage
  EquivalentCoverage --> Evidence: absorb only complete equivalent coverage
```

## Consumers

- Local frontend developers use `pnpm --filter @dvt/web test:changed`.
- Reviewers use `pnpm test:web:changed -- --files <paths>` to validate a patch
  without running the full web suite.
- The `Web Frontend Tests` GitHub matrix uses the same changed plan for Vitest
  and the three independent browser capabilities. Local execution without a
  phase still runs every selected obligation.
- Architecture tests use the router API to prevent command drift.
- Documentation uses this component to explain local feedback-loop sizing.

## Component Flow

```mermaid
flowchart LR
  Git["Git changed files"] --> Adapter["run-vitest-changed-suites.ts"]
  Args["--files explicit paths"] --> Adapter
  Adapter --> Router["resolveWebVitestChangedSuitePlan"]
  Router --> Catalog["WebVitestSuiteCatalog"]
  Router --> Commands["WEB_VITEST_CHANGED_SUITE_COMMANDS"]
  Router --> ExactBatches["Grouped exact test filters by config"]
  Commands --> Vitest["Vitest suite delegates"]
  ExactBatches --> Vitest
  Workflow["Web Frontend Tests PR"] --> Adapter
```

## Negative Rules

- Do not substitute changed Vitest selection for full primary suites on `main`,
  manual workflow runs, or root-build-sensitive pull requests.
- Do not add route-local changed-test scripts when the catalog can route them.
- Do not duplicate include/exclude glob semantics in the command adapter.
- Do not spawn one Vitest process per exact test when the same config can run
  the exact filters together.
- Do not suppress an unpaired source's suite because another test was changed.
- Do not treat Vitest as evidence for a Cypress change. Browser obligations use
  the admitted runtime below; unsupported browser changes fail closed.
- Do not make source files under `apps/web/src/testing/**` production services.

## Browser Evidence Boundary — GH-3540

This section specifies the next implementation of the existing
`RouteChangedWebVitestSuites` query and `RunWebCypressNative` command. GitHub
[#3540](https://github.com/dunay2/dvt/issues/3540) owns delivery status; this
design does not assert that its acceptance has already passed.

The root cause is a type-based fallback: a Cypress `.ts` file selects the
complete Vitest unit suite, but that suite never executes the changed browser
flow. A second cost is API `predev` rebuilding its dependencies recursively
outside the existing Turbo runtime-dependency builder.

```mermaid
flowchart LR
  Before["Cypress .ts change"] --> Fallback["Vitest unit fallback"]
  Fallback --> Wrong["Cost without browser evidence"]
  Worker["Worker dependency preparation"] --> Api["API predev recursive build"]
  Api --> Repeat["Repeat dependency compilation"]
```

```mermaid
flowchart LR
  Diff["Exact Git diff including deletions"] --> Router["Existing changed-suite query"]
  Router --> Vitest["Existing Vitest obligations for non-browser paths"]
  Router --> Admitted["Admitted browser spec and exclusive helper"]
  Router --> Reject["Unknown browser ownership: reject with path"]
  Admitted --> Runner["Existing selected-closure live runner"]
  Runner --> Runtime["Disposable PostgreSQL + generated auth + Temporal + browser"]
  Runner --> Build["Existing runtime dependency builder / Turbo hashes"]
  Runtime --> Evidence["Executed tests, no pending or skipped result"]
```

### Admission And Execution

- Initially admit only `canvas-dvt-terminal-transform-preview-live.cy.ts` and
  its exclusive `liveRunEventRecovery.proof.ts` helper to the existing
  `test:e2e:selected-closure:live` command. This is not coverage of the complete
  Cypress inventory. Shared support, other specs, Cypress configuration and
  unknown executable paths require explicit consumer/runtime admission; they
  cannot silently fall back to Vitest or succeed with no command.
- GH-3271 also admits `canvas-relational-tree-workbench.cy.ts`,
  `canvas-relational-workbench-union.cy.ts`,
  `canvas-relational-workbench-removal.cy.ts` and
  `canvas-relational-workbench-viewport.cy.ts` through the same protected runtime.
  They retain their existing UI fixtures; the shared protected-runtime proof
  remains a separate real-provider obligation within that single execution.
- The browser policy is a small pure module (`apps/web/cypress.changed.ts`),
  composed by the existing query. It is not a second repository diff detector
  or a new Vitest suite catalog. The adapter still owns Git discovery and
  process execution only. Policy/adapter/runner changes require the admitted
  live proof as well as their own contract tests.
- Git discovery includes deleted paths. Failure to read the requested range,
  index, working tree or untracked inventory is an error, not an empty diff.
  A deleted admitted spec fails rather than reporting an empty successful run.
  Rename detection is disabled so moving a spec cannot hide its removed path.
- Ordinary changed routing executes both independent obligations. A browser
  change does not require unrelated Vitest unit tests; a mixed diff retains
  the Vitest plan for its genuine Web sources.
- CI resolves and validates the complete plan before selecting a capability or
  provisioning its runtime. Cypress preparation requires selected browser work;
  PostgreSQL and dbt require an available or unavailable provider obligation.
  The controlled capability does not provision providers. Use an
  explicit disposable CI PostgreSQL URL and generated local proof identity;
  no tenant credential, repository secret or development database is required.
- GH-3583 separates Vitest from browser execution. GH-3578 further partitions
  the browser phase by its existing `controlled`, `available` and `unavailable`
  capabilities, retaining `fail-fast: false`, a 25-minute limit per job and a
  distinct existing Turbo-cache variant per producer. This removes shared serial deadlines;
  it does not alter suite selection, workers, assertions or browser admission.
  `--phase=vitest` and `--phase=browser` select disjoint obligations from the
  same complete plan. Planning still rejects unknown browser paths in either
  phase. `--browser-capability=<capability>` is valid only with `--phase=browser`;
  omitting it still executes every selected browser obligation. Invalid,
  repeated or out-of-phase selectors reject. The old `--browser-only` flag stays
  removed. Provider setup and cleanup belong to the provider capabilities;
  sanitized failure/cancellation screenshots have capability-specific names.
  The existing required aggregate requires the
  complete matrix result; cancelled, failed or absent evidence still rejects.
- `main`, manual and root-sensitive runs retain `test:web:ci` and execute the
  admitted browser baseline with `--full --phase=browser`, partitioned by the
  same capability selector in CI. `--full` only adds
  browser baseline obligations to the router: executing it with the Vitest
  phase is invalid, and cannot replace `test:web:ci`. Required check
  names and the Test Suite aggregate stay unchanged.
- The existing live runner owns allocation and cleanup. Missing runtime,
  zero executed tests, pending tests or skipped tests are failures. POSIX
  teardown must stop child process groups and wait before disposing its lease.
  Native browser execution uses a small `run-selected-closure-cypress.cjs`
  child adapter over the installed Cypress module API; it validates the real
  result counters and every expected spec exactly once. Credentials stay in environment
  variables, never CLI arguments. Process lifecycle belongs to
  `live-proof-process.cjs`, shared only by this live runner and its browser child;
  this keeps teardown out of selection policy and result validation.
  The admitted route explicitly selects native execution. The pre-existing
  manual Docker utility is not admitted CI evidence and is not certified by
  this cut.
- API `predev` delegates to `build-workspace-runtime-deps.cjs dvt-api`. pnpm
  still owns the production dependency closure; Turbo owns ordering, input
  hashes and output restoration. No timestamp cache, build bypass or separate
  freshness authority is added. Other API lifecycle scripts are out of scope.
- The existing repository command catalog classifies the two new runtime
  helpers explicitly as test tooling; unknown commands remain root-sensitive.
  Local `hasWebChange` and CI Web scope include their exact paths so a runner-only
  change cannot miss the live obligation. Workflow contracts inspect effective
  job/step settings rather than counting repeated YAML strings.

### Planning Matrix

| Scenario                 | Opportunity          | Fowler pattern                | DDD owner                            | Command/query rail          | Implementation surfaces                                                                    | Unit or package test                                     | Architecture test                                                     | User-flow test                                                             | Out of scope                                      |
| ------------------------ | -------------------- | ----------------------------- | ------------------------------------ | --------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------- |
| Changed browser evidence | Test-only confidence | Policy and adapter separation | WebVitestChangedSuiteRouter          | RouteChangedWebVitestSuites | `cypress.changed.ts`, `vitest.suites.ts`, changed-suite adapter and existing router guards | Spec/helper/source/mixed/unknown/deleted/Git failure     | Exclusive helper consumers, independent obligations, workflow routing | Existing terminal live proof                                               | Admission of every legacy spec                    |
| Real browser CI          | Hidden authority     | Application controller        | Browser proof runtime                | RunWebCypressNative         | `test.yml`, its executable contracts, selected-closure runner/tests, terminal spec         | Runtime unavailable and cleanup failure                  | Full/PR/draft obligations and no skipped evidence                     | Protected API, Temporal and PostgreSQL proof on Linux CI and local Windows | New workflows, check names or mock runtime        |
| API preparation          | Duplicate semantics  | Reuse existing build owner    | Workspace runtime dependency closure | RunWebCypressNative         | `apps/api/package.json`, existing bootstrap contracts                                      | Same dependency closure, repeated invocation uses hashes | No recursive preparation in predev                                    | API readiness in the same live proof                                       | Other lifecycle refactors or application behavior |

The implementation must record exact commands, local and CI timings, and
comparison limits in the issue. Fewer Vitest launches alone do not establish
the repository-wide 50% time target. No isolation, coverage, worker or
authorization rule is relaxed by this boundary.

The [GH-3583 rationale](https://github.com/dunay2/dvt/issues/3583) and
[GH-3578 reviewed partition and conformity matrix](https://github.com/dunay2/dvt/issues/3578#issuecomment-6035954803)
govern the independent execution lifecycles. Previously the browser job put all
three capabilities and their preparation under one 25-minute deadline. The
bounded partition is:

```text
Exact diff -> one validated plan -> Vitest              -> required matrix result
                                -> browser controlled  -> required matrix result
                                -> browser available   -> required matrix result
                                -> browser unavailable -> required matrix result
```

The matrix changes elapsed scheduling, not total evidence or CPU guarantees.
Actual complete CI timings are required before claiming a speed improvement.

### Fixture Consumer Evidence — GH-3578

The [reviewed consumer matrix](https://github.com/dunay2/dvt/issues/3578#issuecomment-5998586830)
extends the existing browser admission, not the product's commands or test
framework. Pure draft builders remain separate from stateful HTTP adapters.
Their real runtime import closure determines affected consumers; a builder name
alone cannot narrow a shared dispatcher's consumers. Unknown and deleted browser
paths still reject before phase filtering or process startup.

The existing command plan represents three distinct runtime obligations:

- Controlled API consumers execute once through the native browser runner.
- Available LIVE consumers execute the exact admitted spec list in one Cypress
  invocation and one protected runtime bootstrap locally, or once per disjoint
  CI shard as specified below. Each spec owns its suite and
  preparation; no spec imports another spec to register its cases. The terminal
  retains its own cases and exclusive helpers. This restores spec isolation
  without repeating PostgreSQL, API, Temporal or outbox startup for every file.
- Unavailable LIVE evidence uses its existing spec and invocation-local
  environment; that environment cannot leak into another obligation.

The same structured result validator must reject missing, unexpected or duplicate
specs, zero tests, malformed counters, failures, pending tests and skips. The
protected LIVE CLI accepts a comma-separated list of unique literal spec paths,
validated before any lease, build or service allocation. Empty entries, globs,
duplicates and traversal reject. Its default is the terminal spec; governed
AVAILABLE execution passes the complete catalog explicitly. Shared helper
consumers must each appear exactly once in that plan. Successful execution of
the terminal filename alone does not establish the consumer inventory.

First authoring is an AVAILABLE consumer without a semantic draft fixture. It
creates its isolated project through the real CreateProject UI and uses the
complete workspace identity returned by that command. The JOIN publication
journey reuses the same gesture. First authoring must still prove the initial
draft is absent, the first node is acknowledged, dragging changes the scoped
layout, and reloading restores it. Observing the real project response must not
stub a successful project, graph, plan or run response.

Removing old cases requires preserving their unique semantic assertions in the
remaining owners first. In particular, UNION retains complete derived-type
equality and the measure scenarios retain standalone and chained forms,
grouping, partition/order, output identity and reload. Captured Workbench seed
normalization reuses production mappers on that same fixture instance; it does
not introduce a generic GET recorder or global fixture repair.

Admission requires measuring each complete job critical path, including setup,
builds, selected runtime, result validation and cleanup, against its unchanged
25-minute budget. All capability/shard matrix jobs must satisfy the existing required
aggregate. The partition preserves the 119 controlled, 53 existing available
and one unavailable cases; first authoring adds one available case. This does
not prove that a stalled case is fixed. Individual
test durations or results from the previous serial layout cannot establish the
new bound. No new workflow, timeout increase or evidence waiver is admitted.

### Available Browser Budget Partition — GH-3656

The existing `RouteChangedWebVitestSuites` query and `RunWebCypressNative`
command retain their application ports, browser catalog and authorization
boundary. PR #3627 run `38614237742` exhausted the available job's 25-minute
budget after 15 of 32 specs passed, while starting spec 16. Other capabilities
passed. This is incomplete execution evidence, not a passing product result.

```text
Before: complete admitted plan -> available [32 specs] -> 25-minute cancellation
After:  complete admitted plan -> available 1/3 -> exact result validation
                              -> available 2/3 -> exact result validation
                              -> available 3/3 -> exact result validation
All three producers -> existing required Test Suite matrix aggregate
```

The existing browser policy partitions its ordered available spec list by
zero-based index modulo three. Every spec belongs to exactly one shard; the
union equals the unpartitioned catalog. Reuse the existing command builder,
protected runtime and strict expected-spec result validator. Do not duplicate
the catalog in YAML, parse command strings, add another runner or alter cases.

The adapter accepts `--browser-shard=1/3`, `2/3` or `3/3` only together with
`--phase=browser --browser-capability=available`. Omission preserves the complete
local invocation. Complete plan admission and physical-path validation precede
shard selection, including in `--plan` mode. Invalid, repeated, out-of-phase
or out-of-capability selectors reject before provisioning. A selected shard
cannot silently admit an empty consumer list.

The existing workflow creates all three available producers for PR and full
baseline execution. Container ownership, Turbo cache variant and screenshot
artifact identities include the shard. Provider setup occurs only when the
selected plan requires it. The unchanged 25-minute deadline and fail-fast-false
policy apply to each producer; a failed, cancelled or missing shard blocks the
existing required aggregate. Controlled, unavailable and Vitest ownership do
not change. Three bootstraps replace one for this capability; lower total CPU
is not claimed.

Separate focused policy/adapter tests prove disjoint complete coverage,
unchanged runtime arguments, selector rejection and validation-before-filtering.
Workflow contracts prove every shard is scheduled with unique resource names
and identical planning/execution selectors. Each complete CI critical path,
including preparation and cleanup, must pass within 25 minutes. Delivery and
measured evidence belong to [issue 3656](https://github.com/dunay2/dvt/issues/3656).

| Scenario                                  | Opportunity    | Fowler pattern                          | DDD owner                   | Command/query rail                               | Implementation surfaces                                                              | Unit or package test                                                        | Architecture test                                                                                     | User-flow test                                                  | Out of scope                                                                      |
| ----------------------------------------- | -------------- | --------------------------------------- | --------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Available evidence exceeds one job budget | Boundary drift | Policy separated from execution adapter | WebVitestChangedSuiteRouter | RouteChangedWebVitestSuites; RunWebCypressNative | Existing browser policy, changed-suite adapter, Test Suite workflow and their guards | Disjoint complete partition; invalid selectors; validation before filtering | Workflow schedules every shard with identical plan/execution selection and unique resource identities | All existing available specs through the real protected runtime | Product behavior, new catalogs/runners, timeout increases, total CPU optimization |

### Compiled Client For Real-Provider Browser Proof — GH-3656

The available provider group failed twice while loading development URLs such
as `/src/app/views/Canvas.tsx` and `/src/app/views/RunsView.tsx`. Other failures
showed a page reload that removed an import or Preview dialog. The API remained
available. These observations identify unstable client asset delivery in the
proof; they do not establish its low-level network cause.

```mermaid
flowchart LR
  Current[Live proof starts Vite development server] --> Dynamic[Transform and serve modules during the journey]
  Dynamic --> Observed[Observed module load errors or lost dialog after reload]
  Existing[Existing build e2e command] --> Assets[Compiled client assets]
  Assets --> Preview[Vite preview with the same proof profile]
  Preview --> Browser[Existing Cypress specs and result guard]
  Browser --> Providers[Real protected API and disposable providers]
```

The existing `RunWebCypressNative` command and selected-closure runner retain
their spec selection, provider allocation, authentication and cleanup. An
internal Web runtime adapter uses the existing `build:e2e` command once with
the proof's Web environment, then serves those assets through Vite preview.
Build and preview receive the same API URL, authentication and workspace
profile. The bundle remains stable for the complete invocation.

The adapter owns only build/start/readiness sequencing. It reuses the runner's
process launcher and HTTP readiness port; both child handles remain in the
existing cleanup collection. A failed or signaled build prevents preview from
starting. Preview is ready only when its root returns HTTP 200; missing assets,
early process exit or readiness failure retain the failing proof result.

The canonical repository command catalog must admit this exact lifecycle
adapter as `test-tooling`, alongside the existing browser child and process
adapters. It remains relevant to changed-file validation without product
runtime fan-out. Neighboring unregistered helper paths remain `unknown`, and
the existing discovery/coverage guard must continue to reject them. Catalog
admission does not alter runtime implementation or browser obligations.

| Concern             | Existing owner / proof                                                            |
| ------------------- | --------------------------------------------------------------------------------- |
| Rail and allocation | `RunWebCypressNative`, selected-closure runner                                    |
| Profile and build   | Existing `build:e2e`, identical build/preview environment                         |
| Lifecycle           | Focused adapter tests: ordering, rejected build and readiness, owned handles      |
| Routing             | Existing changed-file catalog selects real provider consumers for adapter changes |
| Acceptance          | All admitted provider specs, unchanged assertions and CI budget                   |

This changes the proof's client serving mode; it adds no product behavior,
command rail, browser retry, exception suppression or fake provider. Runtime
policy tests stay separate from the larger provider-composition test file.

#### Browser Transport Observation

The compiled client still encountered transport failures on two Linux CI
attempts. Session or write requests could fail after a successful API preflight;
the later attempt failed on different calls. Authentication denial, application
mutation, and a vendor-version defect are not established by those observations.
Another identical retry is not the diagnostic owner.

```mermaid
flowchart LR
  Browser[Real Chromium requests] --> Proxy[Cypress transport]
  Proxy --> API[Real protected API]
  Browser --> Capture[Opt-in Chromium net-log]
  Capture --> Observation[Private failed-spec observation]
  Capture --> Completion[Native Cypress process completes]
  Observation --> Completion
  Completion --> Projection[Reconciled allowlisted metadata]
  Projection --> Evidence[Sanitized network and lifecycle evidence]
  Projection --> Cleanup[Exact owned raw-file cleanup]
```

`RunWebCypressNative` retains the same literal scenarios, authentication,
providers, assertions and budget. The existing Cypress Node event adapter
optionally captures Chromium net-log for every available group. The pure
projection and Node lifecycle have separate owners. Exported JSON contains
event/source identifiers, numeric source dependency links, event kinds, numeric
network errors, method, numeric HTTP status and safe loopback route groups only.
The numeric time-tick offset permits correlation with API wall-clock logs.
Headers, bodies, cookies, URL queries, userinfo and
arbitrary raw parameters are omitted. Raw capture is outside artifact
publication and its exact temporary files are removed by their owner.

The native parent owns the capture lease and finalization after the Cypress
binary completes. Cypress `after:run` is not the close boundary: a real Windows
proof passed its journey but that hook still saw the Chrome file locked. Node
plugin launch hooks receive only the owned lease through scoped process
environment; that environment is restored on success or failure.

GH-3604's native-completion reconciliation separates an observation from a
finalized report. The `after:spec` hook retains a private, validated observation
for each failed spec before later browser activity can overwrite it. Successful
specs add no observation. The hook does not publish, close or modify Chrome's
capture. Only native completion publishes evidence and removes exact owned files.
Each launch returns its capture identity to the hook adapter. A failed spec is
observed only against the active launch, never against older retained capture
directories. A non-Chromium launch clears that identity. The native lifetime
owner, not the per-spec hook, enumerates all launches for finalization and cleanup.

```mermaid
flowchart LR
  Hook[Failed spec] --> Observation[Private observation of open writer]
  Completion[Native completion] --> Final[Final capture]
  Observation --> Continuity[Exact byte-prefix comparison]
  Final --> Continuity
  Continuity --> Retained[Retained: include late-written events]
  Continuity --> Replaced[Replaced: preserve partial observation and declare gap]
  Retained --> Publish[Safe projection and exact private-file cleanup]
  Replaced --> Publish
```

When the final capture retains the exact observed prefix, the failed-spec report
uses the final projection, including events written after the hook. Otherwise it
retains the earlier observation with `continuity=replaced` and
`observationBoundary=after:spec`. This cannot recover an unwritten queue from a
replaced writer. No sleep or stable-size heuristic constitutes a flush
acknowledgement. `captureState=complete` describes a closed JSON document, not
whole-run coverage. The evidence assembler owns reconciliation; the Node adapter
owns hooks and lifetime; the pure mapper owns disclosure policy.
The spec timestamp is a correlation marker, not a claim that all retained events
belong to that spec: the final projection may also contain subsequent activity.

An additional private Chrome process log admits only the exact network-service
restart signal with numeric process/thread identifiers and its timestamp. A
missing process log is explicitly unavailable; absence of a matched signal does
not prove absence of a restart. Raw text and arbitrary errors are never exported.
Both raw logs and private observations remain outside artifact publication and
are removed at native completion, including rejection paths. Malformed or
unreadable captures still fail explicitly. Test error/result payloads are never
serialized. This repairs evidence lifecycle, not a demonstrated transport cause.

The real capture can end before its JSON footer when Cypress terminates Chrome.
The maintained `jsonc-parser` development dependency decodes complete observed
records, with `captureState=terminated` explicitly distinguishing this from a
complete capture. Only EOF closing-array/object errors and a trailing comma are
admitted; malformed headers, middle syntax or unfinished event bodies reject.
No record, footer or successful outcome is fabricated. This Node-only consumer
does not add a production application dependency.

Disabled diagnostics register no launch hooks. Enabled diagnostics reject a
missing or malformed capture and preserve the failing browser result. The
observer adds no request interception, synthetic response, retry, timeout or
security override; recording evidence is not a claim that integration or the
transport defect is complete. Paired projection and lifecycle tests remain
separate from scenario files and register in the existing local gate.

The native runner contract now reaches the optional package-backed loader through
its existing shared proof import. Its exact CI-tool test belongs to the installed
executable partition, not the package-free static partition. The all-mode union,
fail-closed dependency guard and assertions remain unchanged; removing that exact
registration is a negative test, not an exemption from coverage.

Sanitized network reports publish independently of failure screenshots and only
when a report exists. An empty routed group produces neither a capture nor a
synthetic artifact. Artifact admission has its own focused CI contract; malformed
captures and incomplete browser results still reject at their existing owners.

The Cypress config and its three exact Node diagnostic modules are admitted browser
support boundaries for controlled, available and unavailable capabilities. Their
module-load failures affect every capability even when capture is disabled. This
retains complete evidence; unknown configuration and Node neighbors still reject.

#### Owned Linux Process Exit Evidence — GH-3604

Planning DB design `GH-3604-LINUX-PROCESS-EXIT-EVIDENCE-V2` extends only the existing
opt-in `RunWebCypressNative` diagnostic boundary. A generic Chromium restart is
not an exit cause. Utility histograms cannot join a service identity to an exit
code and do not cover every killed-process path; process polling can miss exits.

```mermaid
flowchart LR
  Before[Network utility disappears] --> Restart[Generic restart; cause unknown]
  Observer[Linux observer] --> Probe[Subscription ACK and known owned-child exit]
  Probe --> Cypress[Unchanged native Cypress invocation]
  Cypress --> Chrome[Exact owned Chrome capture lease]
  Chrome --> Exit[CN_PROC wait status for owned descendants]
  Chrome --> OOM[Independent kernel OOM observation]
  Exit --> Projection[Allowlisted evidence; unknown stays unknown]
  OOM --> Projection
  Projection --> Close[Native completion; owned observer cleanup]
```

The Linux adapter receives the native runner PID and private capture root, not
application credentials. Only Chrome launched with that exact owned net-log
lease admits a browser subtree; Electron/Cypress utility processes are not that
browser. Transient command-line inspection compares the complete network-service
subtype argument and verifies PID birthtime before and after. Arguments,
environment, command text and raw kernel records never enter published evidence.

The observer proves capability on the actual runner before the browser starts.
An unavailable namespace, denied source, lost event, malformed record or unstable
identity remains explicit. WSL's noninitial PID namespace is negative capability
evidence, not hosted acceptance. No privileged browser or sandbox change is used.
Decode the terminating signal from the kernel wait status: `exit_signal` is only
the notification sent to the parent. SIGKILL alone is not proof of OOM. Read OOM
records independently from the start boundary, retaining only owned victim PIDs
and numeric times; absent evidence means not observed, never ruled out.

Hosted run `38962033365` exposed a Linux identity mismatch: Chromium rewrites
`/proc/PID/cmdline` as a single space-separated process title. NUL-only argv
classification loses the actual browser and network service; a short-lived
launcher carrying the same flags must not satisfy coverage. Read the executable
symlink transiently inside the same birthtime check and admit native Chromium
only. Distinguish NUL argv from a rewritten title with its exact executable
prefix; recognize only complete, unique owned-lease/type/subtype markers. Quoted
or escaped marker values and truncated representations remain unknown. Unrelated
quoted values are opaque, including Cypress's existing date flag. Do not use
shell parsing to pretend the original argv can be reconstructed: flattening is
lossy, so title classification is restricted evidence of this controlled launch,
not an authentication boundary. Preserve kernel-owned ancestry, never promote a
nested browser root, and require an observed owned network-service identity
before declaring coverage complete. No raw executable path or title is retained.
The primary mechanism is documented in Chromium's
[process-title construction](https://chromium.googlesource.com/chromium/src/+/HEAD/base/process/set_process_title.cc)
and [Linux implementation](https://chromium.googlesource.com/chromium/src/+/HEAD/base/process/set_process_title_linux.cc).

PID birth ticks alone cannot correlate a first `/proc` read with a queued old
EXIT. Timestamp the completed stable snapshot using the process-event monotonic
clock; require the initial time namespace and check alignment with the capability
probe. An exit event preceding
that observation cannot inherit its role or birthtime; this also applies to the
browser ancestor. Preserve historical coverage only from temporally confirmed
exits, and evaluate remaining lifetimes after draining queued events. A snapshot
that races with termination conservatively loses identity rather than assigning
another process's identity. Do not compare `/proc` boot-clock ticks directly to
CN_PROC monotonic timestamps.

Kernel-log OOM observations retain their own clock domain. `printk` uses
`local_clock()`, which does not guarantee the same cross-CPU clock base as
CN_PROC. Project only a `kernel-oom-victim` with numeric victim PID, kernel-log
timestamp and explicit `pid-only` correlation when the PID matches the owned
ledger. Do not attach a browser identity, birthtime or network-service role to
that candidate. PID reuse means it is supporting evidence, not proof that the
observed network-service lifetime was killed by OOM. No unrelated kernel text
is published. See the kernel's
[printk timestamp source](https://github.com/torvalds/linux/blob/v6.8/kernel/printk/printk.c#L2047)
and [scheduler clock contract](https://github.com/torvalds/linux/blob/v6.8/kernel/sched/clock.c#L15-L29).

Pure protocol/ownership tests and adapter lifecycle tests have separate owners.
The existing real Linux invocation provides the capability smoke and unchanged
journey evidence. Assertions, retries, browser, spec selection, workflow and
product behavior remain unchanged. No synthetic successful capture is admitted.

#### SIGKILL Generation And Userspace OOM Evidence — GH-3604

Design `GH-3604-LINUX-SIGNAL-ORIGIN` extends the same native observer after run
`38972536656` recorded nine network-service SIGKILL exits without an observed
kernel OOM victim. That evidence establishes termination, not its initiator.

```mermaid
flowchart LR
  Previous[Owned SIGKILL exit; initiator unknown] --> Trace[Private signal_generate trace instance]
  Trace --> Probe[Known observer-owned child probe]
  Probe --> Browser[Unchanged native browser proof]
  Browser --> Signal[Owned target; generator context and signal result]
  Browser --> Journal[Independent bounded OOM-daemon journal]
  Signal --> Projection[Allowlisted evidence; uncertain attribution explicit]
  Journal --> Projection
  Projection --> Close[Drain; close private sources; publish through existing owner]
```

Use an already-mounted tracefs instance with only `signal:signal_generate`,
filtered to SIGKILL and the monotonic clock. No installation, mount, global
trace-option mutation, syscall tracing, stacks or browser instrumentation is
admitted. A known observer-owned child proves the actual event path before
Cypress starts. The instance and its bounded buffer are closed and removed by
their owner on normal completion, rejection and catchable cancellation. The
instance-local `disable_on_free` option and a noninherited `free_buffer` descriptor
stop tracing when the observer loses its descriptors, including SIGKILL. An
uncatchable termination cannot remove the instance directory; no such guarantee is claimed.
Loss or unsupported capability is explicit.

The kernel event names a target **TID** and current generator context, not an
unconditional sender `si_pid`. Preserve signal code, group and result: generation
does not prove delivery. Track forked threads as well as process leaders so a
fatal signal to a nonleader retains its owning process candidate, without
inheriting that association after PID reuse. Publish only targets matching the owned browser ledger,
with explicit PID-only correlation. Independent streams can be read out of order,
and formatted trace timestamps can have microsecond precision; do not require an
invented total ordering. A stable generator `/proc`
snapshot is separately marked observed-after-event and PID-only. Export only its
numeric identifiers and an allowlisted executable category, never raw paths,
arguments, comm or trace text. Unknown and reused identities remain uncertain.

Read current-boot journal entries from the exact `systemd-oomd.service` and
`earlyoom.service` units after the initial cursor, requiring matching process
metadata within the observer interval, with bounded output and time. Journal
timestamps denote receipt, not an exact signal-generation time. Recognized actions retain only
daemon category/PID, numeric monotonic timestamp and, for an owned earlyoom
candidate, victim PID. A systemd cgroup kill report is runner-interval evidence,
not per-process attribution. Raw journal messages, cgroup names and command lines
never leave the mapper. Empty results mean not observed, not OOM excluded;
unavailable sources, malformed records and truncation cannot claim full coverage.

Trace capture, journal capture, process ownership and artifact validation have
separate owners and focused negative tests. Existing routing guards admit exact
new support paths. Browser selection, retries, assertions, provider allocation,
workflow and product behavior do not change. The governing planning matrix and
allowed surfaces are recorded in
[the issue design](https://github.com/dunay2/dvt/issues/3604#issuecomment-6227215039).
Primary contracts are the kernel's
[signal tracepoint](https://github.com/torvalds/linux/blob/v6.8/include/trace/events/signal.h),
[signal generation order](https://github.com/torvalds/linux/blob/v6.8/kernel/signal.c),
[tracefs interface](https://www.kernel.org/doc/html/v6.8/trace/ftrace.html),
[systemd OOM reports](https://github.com/systemd/systemd/blob/v255/src/oom/oomd-manager.c)
and [earlyoom signal reports](https://github.com/rfjakob/earlyoom/blob/v1.8/kill.c).

### Execution Selection Consumer Closure — GH-3610

The shared `cypress/support/canvasExecutionSelection.ts` helper is not an
exclusive live consumer. Its runtime import closure contains 25 independently
registered specs. A change to its public selection gesture must retain all of
them in their existing real runtimes. Before this admission, the changed-file
query rejects the helper before executing any test; passing a manually selected
live subset cannot satisfy the complete branch obligation.

```mermaid
flowchart LR
  Before["Changed selection helper"] --> Reject["Unadmitted path: reject before startup"]
  After["Exact helper consumer closure"] --> Controlled["5 controlled consumers"]
  After --> Available["19 available consumers"]
  After --> Unavailable["1 unavailable consumer"]
  Controlled --> Existing["Existing capability commands and strict result validation"]
  Available --> Existing
  Unavailable --> Existing
```

All paths below are relative to `apps/web/cypress/e2e/`:

| Runtime     | Exact consumers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Controlled  | `canvas/canvas-happy-path-draggable.cy.ts`, `canvas/canvas-project-snapshot-roundtrip.cy.ts`, `canvas/canvas-ready-node-authoring.cy.ts`, `shell/canvas-workbench-screen-composition.cy.ts`, `shell/shell-layout-contract.cy.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Available   | `canvas/canvas-dbt-author-code-run-live.cy.ts`, `canvas/canvas-dbt-selection-recovery-live.cy.ts`, `canvas/canvas-dvt-join-preview-live.cy.ts`, `canvas/canvas-dvt-start-run-boundaries-live.cy.ts`, `canvas/canvas-dvt-terminal-transform-preview-live.cy.ts`, `canvas/canvas-first-authoring-live.cy.ts`, `canvas/canvas-formula-lineage-live.cy.ts`, `canvas/canvas-graph-search-filter-live.cy.ts`, `canvas/canvas-minimap-focus-live.cy.ts`, `canvas/canvas-selected-filter-live.cy.ts`, `canvas/canvas-semantic-persistence-run-live.cy.ts`, `canvas/canvas-semantic-unsupported-live.cy.ts`, `canvas/canvas-source-identity-live.cy.ts`, `canvas/canvas-source-import-live-clean.cy.ts`, `canvas/canvas-sql-progressive-live.cy.ts`, `canvas/canvas-transform-data-sample-live.cy.ts`, `dbt/dbt-project-preview-run-live.cy.ts`, `dbt/dbt-project-yaml-description-edit-live.cy.ts`, `runs/run-controls-live.cy.ts` |
| Unavailable | `canvas/canvas-dvt-runtime-unavailable-live.cy.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

The existing controlled and unavailable inventories already contain their
consumers. Add only the five missing available paths: selection recovery, graph
search/filter, minimap focus, file-authoritative project Preview/Run and YAML
description editing. The available inventory therefore contains 31 exact specs;
the controlled and unavailable inventories remain 48 and one. Available here
means the real protected provider runtime is provisioned; it does not redefine
an unavailable selection root as an unavailable Temporal worker.

The existing architecture guard computes the real runtime import closure and
compares it with this exact disjoint matrix. It must reject an omitted consumer,
a wrong runtime, a duplicate registration or an unknown browser path. The
fixture-builder guard remains separate: these five UI/file-authoritative
consumers do not import the semantic draft builder and must not be falsely
classified as fixture consumers. Other unadmitted live specs remain rejected.

Reuse `RouteChangedWebVitestSuites` and `RunWebCypressNative`; do not introduce a
wildcard, another runner, altered assertions, a larger deadline or a result
waiver. Readiness requires executing the complete selected plan and recording
the unchanged CI budget, exact base/head admission and strict result counters
on [issue 3610](https://github.com/dunay2/dvt/issues/3610).

#### Retained Live Consumer Preconditions

The controlled source-binding consumer also waits for the existing bottom-right
success notification to leave the DOM before its normal `Done` click. A toast
marked `data-removed=true` is still present during its exit animation and can
intercept hit-testing. Await actual absence within the existing 20-second
UI-transition budget; do not filter out exiting nodes, force the click, dismiss
or remove the notification artificially, add a fixed wait, or change product
CSS/duration and the global CI budget. Connection, source identities, metadata,
keyboard, accessibility, i18n and exact import-command assertions remain intact.

```mermaid
flowchart LR
  R[Successful import receipt] --> A[Observe success toast absent from DOM]
  A --> C[Normal Done click]
  C --> P[Original binding and graph assertions]
```

The first six-case execution of those five newly admitted specs passes minimap
focus and exposes five failures in the remaining four specs. Keep their unique
assertions; repair only the obsolete preparation and adapter gestures:

- Selection recovery must not invent an ungranted project or recreate the
  retired graph-owned dbt model path. Use an acknowledged file-authoritative dbt
  project with two executable models. Select one root, disable it through the
  existing Monaco working-tree synchronization rail, and prove that refreshed
  analysis removes it without silently widening execution scope. Only the
  explicit workspace-scope recovery action may admit the surviving model.
  Recovery labels come from the existing owned English copy catalog, not retired
  `Unavailable roots` / `Admitted scope` / `Use workspace scope` labels. Expose
  the real scrollable recovery action before its normal click. Assert the exact
  translated recovery receipt with the affected node ID; the internal strategy
  name `workspace` is not presentation copy.
- Graph search/filter starts the single current Canvas template and owns its
  English presentation precondition. It retains three real authored nodes,
  search navigation, filter/clear counts and unchanged protected draft revision.
  The third, non-transform node comes from the actual unified catalog (`dvt:sink`),
  not the retired `dbt:seed` creation surface. The two Model search matches and
  transform-role filter still admit exactly two of three authored nodes.
- Project Preview/Run uses the fixture's canonical source label and waits for
  its actual graph before selection. Model inspection targets the card title,
  not an expanded field row at the centre of the card. Exact project/analysis
  revisions, no regeneration, dependency scope and real Run events remain.
  Card titles use the actual projected model name (`Order Summary`); exact model
  IDs continue to govern selection, dependencies and completed Run step assertions.
- YAML description editing retains its lossless proposal/apply/revert and
  reopened file/analysis/Run assertions. Node Code is the known-file editor in
  Properties; project Code is the separate project-tree workbench. Do not revive
  the removed contextual node-code workbench to satisfy an old test. The real
  card title opens inspection, and the scrollable project command must be
  exposed before its normal click. Execution selection uses the existing node
  operations menu, not retired card-header selection buttons. Preview values
  retain their exact assertions through the current accessible labels (`Canvas`,
  `Requested resources`, `Project root`), without the retired `value` suffix.

The existing rails remain `InspectCanvasNode`, `SaveWorkspaceFileContent`,
`RouteChangedWebVitestSuites` and `RunWebCypressNative`. SQL and YAML edits must
use their real UI commands and revision-guarded writes, not intercepted success,
direct replacement of the edited file or invented authorization. No product
runtime, contract, executor, acceptance assertion or deadline changes.

Graph search and minimap must also own independently granted projects through
the existing `CreateProject` UI gesture. The complete available plan runs after
other specs have persisted the default workspace draft; an initial `404` in
that shared workspace is not an isolation contract. Read the exact workspace
scope returned by creation, retain absent-draft and unchanged-revision proofs
in that scope, and leave other consumers' drafts intact. This reuses the
existing `liveProjectAuthoring.ts` owner; no random scope, cleanup of another
spec's graph or separate project-creation implementation is admitted.

### Retained Shell Menu Consumers — GH-3622

Menu responsibility changes retain two previously unadmitted browser consumers.
Their runtime is determined by their actual preparation, not by the route name:

| Consumer                                   | Runtime    | Existing evidence owner                                                |
| ------------------------------------------ | ---------- | ---------------------------------------------------------------------- |
| `templates/templates-workbench.cy.ts`      | Controlled | Native browser runner; explicitly controlled bootstrap responses       |
| `shell/active-project-creation-live.cy.ts` | Available  | Protected provider runner; granted live session and real CreateProject |

```mermaid
flowchart LR
  Diff[Retained menu consumers] --> Catalog[Exact existing browser admission]
  Catalog --> Templates[Templates: controlled bootstrap]
  Catalog --> Project[Project creation: granted live session]
  Templates --> Native[Existing native browser command]
  Project --> Live[Existing available provider command]
  Native --> Result[Strict complete-result validation]
  Live --> Result
```

The project-creation consumer reuses `visitWithLiveWorkspaceSession` to initialize
the existing granted scope and requires the existing protected-runtime identity.
It must not rely on a separate manual enable flag. Its original single POST,
empty created workspace, A-to-B scope switching and reload assertions remain
intact. Templates retains its existing controlled responses and both selection
and parameter-validation cases.

Add only these two literal paths. Unknown consumers remain rejected; runtime
policy changes retain all three existing capability obligations. No new runner,
deadline, stubbed project response, product behavior or skipped-result waiver is
introduced. The available inventory becomes 32 specs; the controlled inventory
gains the single Templates consumer. Delivery evidence belongs to
[issue 3622](https://github.com/dunay2/dvt/issues/3622).

<a id="section-web-vitest-changed-suite-router-user-stories"></a>

## Web Vitest Changed Suite Router User Stories

For every source-edit scenario below, the behavioral lane is accompanied by
one complete `test:architecture:run`. Filesystem-reading architecture guards
cross focus boundaries, so a paired test cannot replace that evidence.
Test-only changes remain exact; a complete architecture run absorbs exact and
Canvas architecture batches through the existing suite normalization.

### US-1 Local Canvas Change

As a frontend developer changing Canvas code, I want a local command to run the
Canvas focus suite so that I do not need the full web Vitest loop for every
small Canvas iteration.

Acceptance:

- Given a changed file under `apps/web/src/app/views/canvas/**`,
  `apps/web/src/app/components/canvas/**`,
  `apps/web/src/app/components/inspector/**`, or
  `apps/web/src/app/components/InspectorPanel.tsx`
- When I run `pnpm --filter @dvt/web test:changed`
- Then the command routes to the narrow Canvas suite that matches the changed
  file type.

### US-2 Presentation Change

As a frontend developer changing non-Canvas and non-shell-session TSX
presentation code, I want the changed-suite router to run the presentation suite
so that route or component work gets feedback from the relevant presentation
lane.

Acceptance:

- Given a changed non-Canvas and non-shell-session `.tsx` file under
  `apps/web/src/**`
- When the changed-suite plan is resolved
- Then the selected command is `test:presentation:run`.

### US-2A Canvas Presentation Change

As a frontend developer changing Canvas TSX code, I want the changed-suite
router to run the Canvas presentation focus suite so that I do not pay for the
full Canvas test loop.

Acceptance:

- Given a changed `.tsx` file under `apps/web/src/app/views/canvas/**`,
  `apps/web/src/app/components/canvas/**`,
  `apps/web/src/app/components/inspector/**`, or
  `apps/web/src/app/components/InspectorPanel.tsx`
- When the changed-suite plan is resolved
- Then the selected command is `test:canvas-presentation:run`.

### US-3 Unit Change

As a frontend developer changing non-Canvas and non-shell-session TypeScript
model code, I want the changed-suite router to run the unit suite so that pure
model and service changes do not require presentation tests by default.

Acceptance:

- Given a changed non-Canvas and non-shell-session `.ts` file under
  `apps/web/src/**`
- When the changed-suite plan is resolved
- Then the selected command is `test:unit:run`.

### US-3A Canvas Unit Change

As a frontend developer changing Canvas model code, I want the changed-suite
router to run the Canvas unit focus suite so that pure Canvas model changes do
not run Canvas presentation tests by default.

Acceptance:

- Given a changed non-architecture `.ts` file under
  `apps/web/src/app/views/canvas/**`, `apps/web/src/app/components/canvas/**`,
  or `apps/web/src/app/components/inspector/**`
- When the changed-suite plan is resolved
- Then the selected command is `test:canvas-unit:run`.

### US-4 Governance Change

As a reviewer changing suite catalog, config, or component documentation, I want
the router to run the owning router architecture guard so that command drift is
caught without executing unrelated architecture tests.

Acceptance:

- Given a changed suite governance file
- When the changed-suite plan is resolved
- Then one direct Vitest batch runs all current
  `src/testing/vitestSuites*.architecture.test.ts` guards, including behavioral
  routing and catalog checks, not just the original documentation guard.

### US-4A Canvas Architecture Change

As a reviewer changing Canvas architecture guards, I want the changed-suite
router to run only the Canvas architecture focus suite so that the local proof
stays bounded to Canvas governance.

Acceptance:

- Given a changed `*.architecture.test.*` file under
  `apps/web/src/app/views/canvas/**`, `apps/web/src/app/components/canvas/**`,
  or `apps/web/src/app/components/inspector/**`
- When the changed-suite plan is resolved
- Then the selected command is `test:canvas-architecture:run`.

### US-4B Monaco Surface Change

As a frontend developer changing Code or shared Monaco editor/viewer surfaces, I
want the changed-suite router to run the Monaco focus suite so a two-file editor
change does not execute the whole presentation suite.

Acceptance:

- Given a changed file under `apps/web/src/app/components/monaco/**`
- Or a changed Code route file under `apps/web/src/app/views/CodeView.tsx`
- When the changed-suite plan is resolved
- Then the selected command is `test:monaco:run`.

### US-4C Shell Session Surface Change

As a frontend developer changing app shell, session context, workspace-scope
selection, session store, API-client context propagation, service composition,
or their shared test doubles, I want the changed-suite router to run the shell
session focus suite so a one-scope context change does not execute the full unit
or presentation lanes.

Acceptance:

- Given a changed file under `apps/web/src/app/components/shell/**`,
  `apps/web/src/app/services/session/**`, `apps/web/src/app/services/composition/**`,
  or a changed workspace-scope/session shell support surface
- When the changed-suite plan is resolved
- Then the selected command is `test:shell-session:run`.

### US-5 No Relevant Web Change

As a developer working outside `@dvt/web`, I want the web changed-suite command
to skip cleanly so that it can be used in broader local workflows.

Acceptance:

- Given no web-relevant changed files
- When the command runs
- Then it exits successfully and reports that no web suite was selected.

### US-5A Paired Source And Test Change

As a frontend developer changing a small source module and its directly paired
test, I want the changed-suite router to execute that exact test file so that a
one-module fix does not pay for the whole unit or presentation lane.

Acceptance:

- Given `apps/web/src/app/views/cost/costViewModel.ts` and
  `apps/web/src/app/views/cost/costViewModel.test.ts` are both changed
- When the changed-suite plan is resolved
- Then the selected command is a direct `vitest run` for
  `src/app/views/cost/costViewModel.test.ts`.
- Given only the source file is changed
- When the changed-suite plan is resolved
- Then the router falls back to the governed suite for that file type.
- Given another changed source has no directly paired changed test
- Then that source's complete suite remains required even if the diff contains
  an unrelated exact test from the same suite; the complete suite includes that
  exact test without running it a second time.

### US-5B Canvas Component With Explicit Focus Tests

As a reviewer of a small Canvas component or Inspector patch, I want exact
changed tests to stay inside Canvas focus configs so the router does not run the
full presentation lane only because the component lives outside
`views/canvas`.

Acceptance:

- Given changed Canvas/Inspector component files and their directly paired
  changed exact Canvas focus tests, without another unpaired source in that lane
- When the changed-suite plan is resolved
- Then the selected commands are direct `vitest run` batches using
  `vitest.canvas-unit.config.ts`, `vitest.canvas-presentation.config.ts`, or
  `vitest.canvas-architecture.config.ts`.
- Then the selected suites do not include the full `unit` or `presentation`
  primary suite unless another file also selects one. Source edits still
  require complete architecture coverage.

### US-5C Mixed Canvas And General Changes

As a developer changing Canvas and general Web code together, I want complete
primary coverage to run once instead of repeating its equivalent Canvas subset.

Acceptance:

- Given both a complete primary suite and its equivalent Canvas focus suite
  are required
- Then the primary run includes all focus tests with the same environment and
  isolation, without a second focus process.
- Given only exact primary tests are selected
- Then a required complete Canvas focus suite remains in the plan.
- Monaco, Shell and Workspace focus contexts are not discarded when their
  execution environment differs from primary coverage.

### US-6 Pull-Request Web Change

As a reviewer of an ordinary web-only pull request, I want the `Web Frontend
Tests` job to run the changed-suite router so that a two-file change does not
execute every web Vitest file.

Acceptance:

- Given a pull request with web-relevant files and no root-build-sensitive
  changes
- When the `Web Frontend Tests` job runs
- Then both fixed matrix phases execute `pnpm test:web:changed` with the
  pull-request base ref and their `--phase=vitest` / `--phase=browser` selection.
- Given a push to `main`, a manual run, or a root-build-sensitive pull request
- When the `Web Frontend Tests` job runs
- Then the Vitest phase executes `pnpm test:web:ci` and the browser phase
  executes `pnpm test:web:changed --full --phase=browser`.
- Either phase failing or being cancelled prevents the required aggregate
  from succeeding. Neither phase cancels its sibling on failure.

> Acceptance scope status: Active. Owner: Frontend / CI.
