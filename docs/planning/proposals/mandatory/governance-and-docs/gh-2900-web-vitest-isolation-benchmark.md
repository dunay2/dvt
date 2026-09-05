---
title: GH-2900 Web Vitest Isolation Benchmark
status: Review
owner: Web / CI
last_reviewed: 2026-09-05
planning_type: mandatory
featureId: GH-2900-WEB-VITEST
---

# GH-2900 Web Vitest Isolation Benchmark

## Integration formatting scope

Integrating `origin/main` at `6db9ba43b` with normal commit hooks normalized
formatting in `CanvasSettingsDialog.tsx`, `lineageWorkbenchStateModel.ts`, and
`canvasColumnLineageProjection.test.ts`. The two exact non-test paths are admitted
only for this hook normalization; formatting the upstream versions reproduces
these files exactly, with no behavior changes.
No general product implementation surface is added.

## Think-first analysis

Issue #2900 owns this experiment. Baseline Git head is
`3695f07c9ba3c66ab51f88a2dabe18e18556a244`. The issue records 654–845 seconds
for the Web lane; environment creation and collection dominate assertions.
The catalog deliberately uses one isolated fork per file to prevent the
previous unbounded shared-fork memory failure.

ADRs: ADR-0000 governs traceable configuration; ADR-0061 keeps task lifecycle
in GitHub and architecture in Planning DB. The DB was queried before design
consultation and returned `SelectWebVitestChangedSuites` and
`WebVitestSuitePartition`. Existing `WebVitestSuiteCatalog` owns execution;
no new command, classifier, suite owner, or product behavior is introduced.

Options, in order of evidence collection:

1. Current isolated forks, jsdom, one worker: control and safe fallback.
2. Bounded batches of ten files sharing one fork; restart between batches.
   Measure state leakage and total launch overhead, not only assertion time.
3. Environment partition: run DOM-independent architecture/unit tests in Node,
   retaining jsdom for browser semantics and isolation for every file.

Use existing Vitest 3.2.4 features, not a new pool implementation. Reviewed
the official [performance guide](https://v3.vitest.dev/guide/improving-performance)
and [environment guide](https://v3.vitest.dev/guide/environment).
No new dependency is needed. An unbounded shared fork and increased concurrency
are rejected before benchmarking because they repeat the known memory risk.
No candidate is selected until measurements and test outcomes justify it.

### Evidence-based selection before production changes

The first Linux control passed all 592 files / 2838 tests in 1088.976 s.
Node architecture passed the identical 101 files / 273 test identities in
40.897 s versus 134.329 s. The raw Node unit probe took 200.220 s versus
435.132 s but failed browser-dependent tests in `routeBootstrapErrorCopy`,
`sessionStore`, and `runsService`; that probe is not accepted as validation.
Their browser environment must be explicit. Session-store consumers must also
retain jsdom to preserve real persistence and avoid new storage warnings.

The Windows full-unit probe additionally exposed host-locale dependence:
Node 22 reports `navigator.language === 'es-ES'` on this workstation, whereas
jsdom supplied the browser-default English locale expected by 16 existing
presentation-model tests. These are browser-language dependencies, not pure
Node tests. Keep their original jsdom semantics explicitly; do not force an OS
locale, disable Node globals, or alter expected copy. The indirect
`installWorkspaceScopeHarness` consumers also retain jsdom, with an architecture
guard requiring an explicit browser declaration for that persistent harness.

Ten-file shared-fork batches already fail presentation cases that pass in the
control: `AppProviders`, `Root.bootstrapFlow`, and
`useActiveRouteBootstrapRegistration`, plus inspector tests. Failures include
missing expected mock calls and missing expected exceptions. The full batch
experiment and a repeat of a failing batch are retained as rejected evidence.

Select Node defaults for `unit` and `architecture`, explicit jsdom annotations
for browser-dependent unit tests, and the current isolated forks everywhere.
Presentation and mixed/focus configurations keep their jsdom defaults. This
preserves exact-file/focus routing and avoids introducing a batch runner or
changing test isolation to obtain speed. No assertions, mocks, package commands,
workflow gates, timeouts, or worker/heap limits change. Repeated green runs and
the final canonical validation remain required before claiming completion.

The first Windows control completed 275 unit files / 1602 tests in 811.281 s
with no failures. Its sampled aggregate RSS peak was 349.05 MiB. The remaining
Windows control was deliberately stopped to move the comparative experiment to
Linux, the CI operating-system family. Keep this sample separate from the Linux
comparison. Use an isolated Node 22.19.0 Debian container with two CPUs and 7 GiB
total memory, a complete Git checkout on its Linux filesystem, and the frozen
workspace install. This is a local container comparison, not a hosted-runner SLA.

## Current and candidate execution

```mermaid
flowchart TD
  Catalog[WebVitestSuiteCatalog] --> Inventory[Same primary-suite file inventory]
  Inventory --> Control[One isolated jsdom fork per file]
  Inventory --> Batch[Ten files per shared fork; restart each batch]
  Inventory --> Partition[Isolated Node for DOM-independent files; jsdom otherwise]
  Control --> Evidence[Repeated wall time; peak RSS; test identities and outcomes]
  Batch --> Evidence
  Partition --> Evidence
  Evidence --> Decision[Adopt smallest proven improvement or retain control]
```

## Pre-implementation brief

Mode: Full. This is a measured configuration experiment, with a durable evidence
report. Measurements use an ignored `tmp/gh-2900` workspace; experimental
overrides do not become package commands or CI routes.

Run each candidate at least twice on the same machine, with the same dependency
outputs and one worker. Capture actual file/test identities, failures, elapsed
time, per-process peak RSS, and sampled aggregate process-tree RSS. Record OS,
Node/Vitest versions, baseline SHA, and warm-cache limitations. The 4096 MiB
old-space setting is not an RSS limit; report both independently and require
worker RSS below 4096 MiB with at least 20% headroom. Never label local Windows
timings as Ubuntu hosted-runner measurements.

Identical presentation configuration may reuse the same two control samples
across the control and environment-partition comparison; the final canonical
full-suite validation supplies the second presentation sample. A candidate with
reproducible correctness failures is rejected rather than repeated exhaustively:
rerun its failing batch to confirm the cause. Neither rule excludes tests from
the full primary-suite inventory.

Coverage is the complete current primary-suite inventory, including additions
since the issue's 591-file sample. An environment-only candidate must preserve
file ownership and executed test identities. Any shared-state failure rejects
batch reuse unless cleanly resolved within this issue without test bypasses.

Allowed production scope: catalog configuration and environment annotations
in DOM-dependent tests if measurements justify changing the default; associated
catalog guards and canonical component/CI guide. Existing package/workflow
commands and changed-suite selection remain unchanged. If batching wins and
requires a runner implementation, update this plan and its symbols before coding.

| Scenario                               | Opportunity             | Fowler pattern                 | DDD owner             | Rail                                                           | Implementation surfaces                      | Package/negative tests                                                 | Architecture test                                                  | User flow              | Out of scope                                      |
| -------------------------------------- | ----------------------- | ------------------------------ | --------------------- | -------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------- | ------------------------------------------------- |
| Avoid unnecessary browser environments | Responsibility overload | Separate policy from execution | WebVitestSuiteCatalog | WebVitestSuitePartition; preserve SelectWebVitestChangedSuites | vitest.suites.ts; web tests; component guide | All primary suites; DOM tests retain jsdom; failed candidates recorded | Existing suite ownership, worker bounds and changed-routing guards | N/A: test tooling only | Product behavior, new routing, global CI redesign |

Validation: red/green catalog guard, all primary suites with repeated measurements,
changed-suite architecture tests, package lint and typecheck, docs sync,
governance refresh, feature mechanization, hook-normalized commit, and
`pnpm verify:prepush`. No hidden skipped tests, lowered quality rules, or stubs.

## Feature mechanization

The manifest describes the existing implemented rail and the admitted patch
surfaces; it is not a claim that this experiment is complete.

```feature-mechanization
version: 1
featureId: GH-2900-WEB-VITEST
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/governance-and-docs/gh-2900-web-vitest-isolation-benchmark.md
componentGuides:
  - docs/architecture/components/web/frontend-test-governance-component.md
userStories:
  - docs/guides/testing-and-ci-capabilities.md
governingSources:
  - AGENTS.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/adr/ADR-0000-Code-generation-with-normative-traceability-required.en.md
  - docs/adr/ADR-0061-github-mvp-task-authority-and-planning-db-architecture-boundary.md
allowedImplementationSurfaces:
  - apps/web/src/app/views/canvas/CanvasSettingsDialog.tsx
  - apps/web/src/app/views/lineage/lineageWorkbenchStateModel.ts
  - apps/web/vitest.suites.ts
  - apps/web/src/**/*.test.ts
  - apps/web/src/**/*.test.tsx
  - docs/architecture/components/web/frontend-test-governance-component.md
  - docs/guides/testing-and-ci-capabilities.md
  - docs/planning/proposals/mandatory/governance-and-docs/gh-2900-web-vitest-isolation-benchmark.md
  - docs/planning/closeouts/gh-2900-closeout.md
forbiddenImplementationSurfaces:
  - apps/api/**
  - packages/@dvt/**
  - .github/workflows/**
commandQueryRails:
  - name: WebVitestSuitePartition
    type: command
    dddOwner: Web test tooling
  - name: SelectWebVitestChangedSuites
    type: query
    dddOwner: WebVitestChangedSuitePlan
domainObjects:
  - name: WebVitestSuiteCatalog
    type: policy
    owner: Web CI governance
fowlerSignals:
  - Separate policy from execution
architectureGuards:
  - pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/testing
cypressFlows:
  - N/A - test tooling; no product browser behavior changes
completionGate:
  - pnpm test:web:ci
  - pnpm --filter @dvt/web lint
  - pnpm --filter @dvt/web typecheck
  - pnpm verify:prepush
redGreenCycles:
  - id: environment-policy
    redTest: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/testing/vitestSuites.catalog.architecture.test.ts
    expectedFailure: Current catalog creates jsdom for DOM-independent tests.
    patchSurfaces:
      - apps/web/vitest.suites.ts
      - apps/web/src/testing/vitestSuites.catalog.architecture.test.ts
    greenTest: pnpm test:web:ci
symbols:
  - name: createWebVitestConfig
    path: apps/web/vitest.suites.ts
    dddOwner: WebVitestSuiteCatalog
    cqRails: [WebVitestSuitePartition, SelectWebVitestChangedSuites]
    fowlerSignals: [Separate policy from execution]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/testing
    cypressCoverage: N/A - test tooling
    unitTests: [pnpm test:web:ci]
```
