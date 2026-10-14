---
id: R-20260321-PLANNER-LIFECYCLE-01
title: Planner validation lifecycle semantics remain under-specified across adapters and duplicate admission contention
status: Open
date: 2026-03-21
owners:
  - planner
  - contracts
  - api
  - adapters
severity: Medium
probability: Medium
---

# R-20260321-PLANNER-LIFECYCLE-01 - Planner validation lifecycle semantics remain under-specified across adapters and duplicate admission contention

## Context

The planner-backed `startRun` remediation closed concrete correctness defects in
stored-plan integrity, collision handling, capability validation, and runtime
Temporal evidence.

That work also made the remaining debt sharper:

- executability validation is adapter-specific,
- lifecycle persistence is still one global state per plan,
- duplicate admissions now have executable evidence for the current behavior,
- protected API support for Temporal still lacks a single end-to-end proof lane.

## Risk

If the repository keeps the current implementation without clarifying the
contract semantics, future changes can drift in at least three ways:

- a caller may assume `VALID` means valid for every adapter when the validation
  gate actually depends on `adapterId`;
- a second admission path may treat `PLAN_VALIDATION_STATE_INVALID_TRANSITION`
  as an incidental storage error instead of a governed contention outcome;
- product and documentation surfaces may overstate planner-backed Temporal
  support before the protected API lane is proven in one executable test.

## Current Observed Behavior

The repository now has executable evidence for the current implementation:

- duplicate `storePlan()` calls for the same canonical plan may return the same
  pending `PlanRef`,
- only one caller can transition that row to `VALID`,
- the second caller receives `PLAN_VALIDATION_STATE_INVALID_TRANSITION`,
- Temporal runtime can execute a planner-backed `dvt-plan://postgres/...` ref,
  but the protected API lane is still not proven end to end.

## Mitigation

- Evolve the planner lifecycle contract to state whether validity is global or
  adapter-scoped.
- Decide whether duplicate-admission contention is intended single-winner
  behavior, retriable contention, or a signal for higher-level coordination.
- Add a protected API integration lane for `targetAdapter: 'temporal'` with real
  OIDC, PostgreSQL persistence, validation, and Temporal dispatch.
- Keep QA review and evidence docs aligned until those semantics are canonized.

## Evidence

- [20260321 Planner-Backed StartRun QA Review](https://github.com/dunay2/dvt/blob/d3fe40beaa66bd8d98ae9397b76340ff5f895f21/docs/planning/reviews/execution-runtime/20260321-planner-backed-start-run-qa-review.md)
- [Historical source](https://github.com/dunay2/dvt/blob/5d0a5952bb7ba76e5bfe5456aec27b61f4b54d09/docs/evidence/context/ED-20260321-planner-start-run-qa-rationale.md)
- `packages/@dvt/adapter-postgres/test/PostgresPlanStore.test.ts`
- `packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts`
- `packages/@dvt/contracts/src/contracts/planner/PlanExecutabilityValidation.v1.ts`
- `packages/@dvt/contracts/src/contracts/planner/PlanValidationLifecycle.v1.ts`

<a id="risk-r-20260307-golden-path-01"></a>

## Independent risk R-20260307-GOLDEN-PATH-01

```risk-record-v1
---
id: R-20260307-GOLDEN-PATH-01
title: Golden-path coverage debt can hide engine and adapter regressions
status: Open
date: 2026-03-07
owners:
  - engine
  - contracts
  - ci
severity: High
probability: Medium
---

# R-20260307-GOLDEN-PATH-01 - Golden-path coverage debt can hide engine and adapter regressions

## Context

The repository already enforces contract and determinism checks in CI, but the
current golden-path set is still narrow. The active baseline mainly covers:

- `plan-minimal`
- `plan-parallel`
- `plan-cancel-and-resume`

This leaves several high-risk execution scenarios either weakly covered or
uncovered in end-to-end deterministic validation.

## Risk

If golden-path coverage stays thin, regressions can land in engine behavior,
adapter behavior, retry flow, multi-tenant isolation, or replay/dead-letter
paths without a strong CI signal.

## Mitigation

- Add a `retry` golden path with controlled failure injection.
- Add at least one deterministic terminal-error golden path.
- Add a multi-tenant isolation golden path.
- Add a dead-letter plus replay golden path that exercises the full contract
  path.
- Keep the `Contracts & Determinism` workflow as the blocking enforcement lane.

## Evidence

- `.github/workflows/contracts.yml`
- `.github/workflows/golden-paths.yml`
- `package.json` (`pnpm golden:validate`)
- `docs/guides/testing-and-ci-capabilities.md`
- `https://github.com/dunay2/dvt/blob/bec9a00d48ce1f02ec26199f670fcf1757680ad7/docs/planning/archive/gaps/GAP_EXECUTION_PLANS.md`
- `docs/archive/GOLDEN_PATH_COVERAGE_DEBT_ASSESSMENT_20260307.md`
```

<a id="risk-r-20260321-planner-boundary-01"></a>

## Independent risk R-20260321-PLANNER-BOUNDARY-01

```risk-record-v1
---
id: R-20260321-PLANNER-BOUNDARY-01
title: Planner typed boundary hardening can drift while legacy manifest compatibility remains published
status: Open
date: 2026-03-21
owners:
  - planner
  - contracts
  - docs
severity: Medium
probability: Medium
---

# R-20260321-PLANNER-BOUNDARY-01 - Planner typed boundary hardening can drift while legacy manifest compatibility remains published

## Context

`R2` hardened the planner public input boundary around typed `graphSource`
ingestion and added runtime validation for both direct input and resolver
output.

That closes the specific defect where contract and runtime could disagree about
valid planner envelopes.

The planner still publishes a legacy compatibility path through raw `manifest`
ingestion, and repo-level status/proposal material can still overstate closure
if that compatibility lane is treated as equal to the typed boundary.

## Risk

If future changes treat the legacy `manifest` path as an ungoverned shortcut,
the repository can drift back into one of these states:

- contract schemas and runtime validation no longer enforce the same one-active-source rule;
- adapter/resolver integrations start returning shapes that are type-correct at
  compile time but insufficiently guarded at runtime;
- status and roadmap docs describe the planner boundary as fully closed while
  the published compatibility posture is still mixed.

## Mitigation

- Keep one-active-source enforcement in both the canonical Zod schema and the
  published JSON schema.
- Keep negative tests for no-source, multi-source, malformed direct
  `graphSource`, and malformed resolver output in the planner boundary suite.
- Keep `PlannerFacade` as the sole application boundary and require runtime
  validation before domain hand-off.
- Keep planner status, evidence, and closeout docs aligned until the raw
  `manifest` compatibility lane is either retired or explicitly accepted as a
  permanent public path.

## Evidence

- `packages/@dvt/contracts/src/contracts/planner/PlannerInputEnvelopeV2.schema.json`
- `packages/@dvt/contracts/src/schemas.ts`
- `packages/@dvt/contracts/test/schema-sync.test.ts`
- `packages/@dvt/contracts/test/validation.test.ts`
- `packages/@dvt/planner/src/application/PlannerFacade.ts`
- `packages/@dvt/planner/test/unit/planner-facade.test.ts`
- `docs/evidence/critical/ED-20260320-planner-r2-typed-graph-source-boundary.md`
```

<a id="risk-r-20260328-planner-schema-version-sync"></a>

## Independent risk R-20260328-PLANNER-SCHEMA-VERSION-SYNC

```risk-record-v1
---
id: R-20260328-PLANNER-SCHEMA-VERSION-SYNC
title: Planner schema version and emitted plan version can drift without explicit governance checks
status: Open
date: 2026-03-28
owners:
  - planner
  - contracts
  - docs
severity: Low
probability: Medium
---

# R-20260328-PLANNER-SCHEMA-VERSION-SYNC

## Context

The planner version reset changed emitted `planVersion` semantics to `1.0`.
When schema contracts and emitted versions evolve separately, drift can compile
locally but break CI quality gates and downstream validation assumptions.

## Risk

If the schema constant and emitted version diverge again, CI and consumers can
observe contradictory plan version truth.

## Mitigation

- Keep planner contract schema and version registry updates in the same change
  set.
- Require ARC evidence and quality-risk traceability for planner-core version
  changes.
- Validate with `pnpm verify:prepush` and PR quality checks before merge.

## Evidence

- `packages/@dvt/planner/docs/contracts/PlanCore.schema.json`
- `docs/evidence/critical/ED-20260328-planner-version-reset-signal-policy-wiring.md`
```

<a id="risk-r-20260330-planner-manifest-cache-staleness"></a>

## Independent risk R-20260330-PLANNER-MANIFEST-CACHE-STALENESS

```risk-record-v1
---
id: R-20260330-PLANNER-MANIFEST-CACHE-STALENESS
title: Planner manifestRef cache serves stale graph if sha256 contract is violated upstream
status: Open
date: 2026-03-30
owners:
  - packages/@dvt/planner
severity: Low
probability: Low
---

## Context

Planner now caches resolved `manifestRef` graph sources in memory by immutable key
`sha256 + uri`. This assumes producers obey the immutable artifact contract.

## Risk

If upstream reuses the same hash/uri pair with modified content, planner can serve
stale graph data from cache for the process lifetime.

## Mitigation

- Keep resolver-side SHA-256 verification mandatory.
- Keep cache bounded and configurable (`manifestRefCacheSize`).
- Allow cache disable (`manifestRefCacheSize: 0`) for debugging and strict runs.
```

<a id="risk-r-20260401-executionplanv2-canonical-naming-break"></a>

## Independent risk R-20260401-EXECUTIONPLANV2-CANONICAL-NAMING-BREAK

```risk-record-v1
---
id: R-20260401-EXECUTIONPLANV2-CANONICAL-NAMING-BREAK
title: Legacy ExecutionPlanV2 imports can break after canonical naming retirement
status: Open
date: 2026-04-01
owners:
  - packages/@dvt/contracts
  - packages/@dvt/planner
  - packages/@dvt/engine
  - apps/api
severity: Medium
probability: Medium
context: >
  The repository removes the public ExecutionPlanV2 alias and keeps ExecutionPlan as the only
  canonical name. Internal packages are migrated in the same slice.
risk: >
  External or downstream code that still imports ExecutionPlanV2 from public package barrels may
  fail at compile time after upgrade.
mitigations:
  - Internal packages (contracts, planner, engine, adapter-temporal, api) are migrated to
    ExecutionPlan.
  - Contracts tests include a guard that root barrel no longer exports ExecutionPlanV2 alias.
  - ADR-0042 wording is updated to document the canonical symbol and parser names.
  - Evidence file records explicit build and test validation across affected packages.
---
```

<a id="risk-r-20260403-contract-error-semantic-drift"></a>

## Independent risk R-20260403-CONTRACT-ERROR-SEMANTIC-DRIFT

```risk-record-v1
---
id: R-20260403-CONTRACT-ERROR-SEMANTIC-DRIFT
title:
  Shared-kernel consumers can regress to parsing contracts error text instead of structured metadata
status: Open
date: 2026-04-03
owners:
  - packages/@dvt/contracts
  - packages/@dvt/engine
severity: Medium
probability: Medium
context: >
  The repository previously mixed hardcoded English contract-error messages with a partial attempt
  to encode message keys inside Error.message. That created drift between diagnostic text and
  semantic contract truth across contracts, engine, planner, artifacts, and adapters.
risk: >
  If future consumers or tests regress to parsing Error.message instead of using code, messageKey,
  and messageParams, shared-kernel behavior will become brittle again and cross-package changes will
  trigger avoidable failures or incorrect control flow.
mitigations:
  - Public @dvt/contracts errors now expose code, messageKey, and messageParams.
  - ValidationErrorResponse now carries structured top-level semantics.
  - Engine validation-boundary tests assert typed metadata instead of raw text.
  - Active contracts docs and ADR-0044 define Error.message as diagnostic only.
  - ARC evidence records the repo-wide consumer cutover for this slice.
---
```

<a id="risk-r-20260404-mwa2-graph-source-cardinality-drift"></a>

## Independent risk R-20260404-MWA2-GRAPH-SOURCE-CARDINALITY-DRIFT

```risk-record-v1
---
id: R-20260404-MWA2-GRAPH-SOURCE-CARDINALITY-DRIFT
title: Graph source cardinality drift between JSON schema and runtime parser
status: Open
date: 2026-04-04
owners:
  - '@dvt/contracts'
  - '@dvt/planner'
severity: Medium
probability: Medium
---
summary: >
  GenericGraphSource nodes accepted empty arrays in the shipped JSON schema while runtime parsing
  required at least one node. This mismatch created avoidable integration failures for schema-valid
  payloads rejected at runtime.

mitigations:
  - Align PlannerInputEnvelopeV1 schema with runtime validator using minItems: 1.
  - Keep planner boundary tests on canonical graphSource path only.
  - Preserve cycle-focused negative coverage during merge conflict resolution.

monitoring:
  - Track contract schema sync failures in @dvt/contracts test gates.
  - Track planner invalid input rejections caused by malformed graph sources.

follow_up:
  - Keep schema/runtime sync checks in contract tests as merge gate.
  - Keep ARC-2 evidence and risk updates mandatory for contracts/planner path changes.
```

<a id="risk-r-20260405-mwa2-policy-unbounded-precedence"></a>

## Independent risk R-20260405-MWA2-POLICY-UNBOUNDED-PRECEDENCE

```risk-record-v1
---
id: R-20260405-MWA2-POLICY-UNBOUNDED-PRECEDENCE
title: Policy-first precedence drift for unbounded timeout and concurrency
status: Open
date: 2026-04-05
owners:
  - '@dvt/planner'
  - 'dvt-api'
severity: High
probability: Medium
---
summary: >
  Planner step config merging allowed node-provided timeout/concurrency caps to survive when
  resolved policy declared unbounded, because omitted policy fields did not overwrite existing
  stepTypeConfig keys.

mitigations:
  - Apply explicit overwrite/delete logic for policy-owned fields in dbtStepFactory.
  - Add planner unit regression for unbounded timeout/concurrency policy behavior.
  - Add planner-backed API regression to verify cross-boundary precedence.

monitoring:
  - Monitor planner validation failures tied to stepTypeConfig policy fields.
  - Track regressions in PlannerBackedStartRunUseCase test slice for policy precedence.

follow_up:
  - Keep policy precedence invariants documented in planner component docs.
  - Keep ARC-2 evidence and risk updates mandatory for planner/contracts boundary changes.
```

<a id="risk-r-20260407-signal-semantics-version-drift"></a>

## Independent risk R-20260407-SIGNAL-SEMANTICS-VERSION-DRIFT

```risk-record-v1
---
id: R-20260407-SIGNAL-SEMANTICS-VERSION-DRIFT
title: Adapter-declared signal semantics versions can drift from engine expectations
status: Open
date: 2026-04-07
owners:
  - packages/@dvt/contracts
  - packages/@dvt/engine
severity: Medium
probability: Low
context: >
  Signal-to-event derivation is contract-driven and adapters declare supported signal semantics
  versions. The active semantics version makes `PAUSE/RESUME` runtime-owned for realized lifecycle
  emission.
risk: >
  If adapter declarations drift or unsupported versions are introduced without coordinated contract
  publication, a runtime may negotiate the wrong semantics version and either reintroduce duplicate
  `PAUSE/RESUME` lifecycle emission or fail to emit the realized lifecycle facts expected by the
  engine and projectors.
mitigations:
  - 'Signal semantics are centralized in @dvt/contracts with explicit version constants.'
  - 'Engine resolves mappings only through contract helpers.'
  - 'Built-in adapters declare supported semantics versions explicitly.'
  - >-
    Active semantics 1.0.0 removes engine-derived PAUSE/RESUME mappings and adapters declare that
    exact line explicitly.
  - >-
    SignalTransitionGuard validates PAUSE/RESUME transitions without re-owning realized lifecycle
    emission.
  - >-
    ADR-0047 explicitly governs runtime-owned realized lifecycle for pause/resume and sets the same
    forward rule for future signal-driven lifecycle facts.
  - >-
    Temporal runtime forwards signalId for PAUSE/RESUME and deduplicates processed control-signal
    ids across pause-resume cycles and continue-as-new rollover.
  - >-
    Engine and mock-runtime tests cover no-derive engine behavior and runtime-owned RunPaused and
    RunResumed emission, including stale signalId replay and repeated pause cycles in the same
    logical attempt.
  - >-
    Dedicated SignalTransitionGuard tests cover validation-only speculative pause/resume simulation
    under the runtime-owned lifecycle model.
  - >-
    Adapter-temporal tests cover signalId forwarding, continue-as-new carry, and stale PAUSE replay
    after a pause-resume cycle.
  - 'ARC-2 evidence tracks validation and affected code paths.'
review_after: 2026-05-31
---
```

<a id="risk-r-20260408-planner-manifest-key-order-drift"></a>

## Independent risk R-20260408-PLANNER-MANIFEST-KEY-ORDER-DRIFT

```risk-record-v1
---
id: R-20260408-PLANNER-MANIFEST-KEY-ORDER-DRIFT
title: Planner plan identity can drift if manifest node-key iteration order is not normalized
status: Open
date: 2026-04-08
owners:
  - packages/@dvt/planner
severity: Medium
probability: Low
context: >
  AR-B3 enforces sorted manifest node-key iteration in ManifestGraphDeriver to prevent dbt manifest
  object key ordering from affecting graph derivation order.
risk: >
  If future changes remove or bypass node-key normalization at manifest ingestion, semantically
  equivalent manifests may produce divergent intermediate graph node ordering and destabilize
  downstream plan identity behavior.
mitigations:
  - 'ManifestGraphDeriver now sorts manifest node IDs with binaryCompare before parsing.'
  - 'Determinism test compares planId and inputHash across two manifest key orders.'
  - 'Manifest graph-source unit coverage locks underscore-sensitive node ordering.'
  - 'API ManifestArtifactResolver coverage asserts the planner-facing node ordering contract.'
  - 'AR-B3 golden vector locks expected planId for the manifest-ordering scenario.'
  - 'verify:prepush remains required before push to detect drift early.'
review_after: 2026-06-01
---
```

<a id="risk-r-20260413-ar-a12-a-contract-pack-reset"></a>

## Independent risk R-20260413-AR-A12-A-CONTRACT-PACK-RESET

```risk-record-v1
---
id: R-20260413-AR-A12-A-CONTRACT-PACK-RESET
title: >
  Downstream consumers may still reference retired engine contract-pack aliases or mixed-generation
  paths
status: Open
date: 2026-04-13
owners:
  - packages/@dvt/contracts
  - packages/@dvt/engine
  - docs
severity: Medium
probability: Low
context: >
  `AR-A12-A` resets the active engine-runtime contract pack to one live `v1` line, removes the
  `RunEventCatalog` alias path, renames the run-event schema entrypoints onto the `v1` line, and
  retires mixed-generation contract files from the active docs tree.
risk: >
  Any downstream documentation, scripts, or consumers that still point at retired `v2`, alias, or
  parallel contract-pack paths can fail to resolve the canonical contract entrypoints or can
  continue teaching the wrong active read order.
mitigations:
  - 'The engine-runtime registries and generated contract index now publish only the canonical `v1`
    line for the touched topics.'
  - 'Active references that still named `RunEventCatalog` were updated to point at `RunEvents.v1`.'
  - 'Dead generator branches for the retired alias and decision-log filenames were removed to avoid
    reintroducing mixed-generation labels in generated surfaces.'
  - 'ARC-2 evidence captures the validation baseline run against the shipped slice, including
    `arc-check`, `doc-check`, and `verify:prepush`.'
review_after: 2026-06-30
---
```

<a id="risk-r-20260414-contract-schema-pack-lint-compat"></a>

## Independent risk R-20260414-CONTRACT-SCHEMA-PACK-LINT-COMPAT

```risk-record-v1
---
id: R-20260414-CONTRACT-SCHEMA-PACK-LINT-COMPAT
title: >
  Contract schema-pack refactor depends on an ESLint 10 compatibility shim for import-order linting
status: Open
date: 2026-04-14
owners:
  - packages/@dvt/contracts
  - apps/api
  - packages/@dvt/engine
severity: Medium
probability: Low
context: >
  The repository now runs `eslint@10.2.0`, while `eslint-plugin-import` is still adapted through
  `@eslint/compat` so `import/order` and related rules can execute without crashing. The same slice
  also refactors `@dvt/contracts` schema ownership into internal schema packs behind the existing
  `schemas.ts` facade.
risk: >
  A future ESLint or plugin change can invalidate the compatibility wrapper and break lint execution
  again, which would mask regressions in import ordering or delay delivery of changes that touch
  governed contract and runtime paths.
mitigations:
  - >
    `eslint.config.cjs` wraps `eslint-plugin-import` through `fixupPluginRules`, restoring repo-wide
    lint execution under ESLint 10.
  - >
    `pnpm lint` now completes across the monorepo and the surfaced findings in API, engine, web, and
    adapter tests were fixed in the same slice.
  - >
    `schemas.ts` remains the public facade so consumers do not need to adopt the internal
    schema-pack file layout directly.
  - >
    The repo can pin or roll back the lint stack independently if upstream native ESLint 10 support
    is delayed further.
review_after: 2026-06-30
---
```

<a id="risk-r-20260422-start-run-boundary-adoption-drift"></a>

## Independent risk R-20260422-START-RUN-BOUNDARY-ADOPTION-DRIFT

```risk-record-v1
---
id: R-20260422-START-RUN-BOUNDARY-ADOPTION-DRIFT
title: Start-run boundary and runtime composition can drift across contracts and API consumers
status: Open
date: 2026-04-22
owners:
  - apps/api
  - packages/@dvt/contracts
severity: Medium
probability: Medium
context: >
  The 2026-04-22 ARC-2 slice hard-cuts the start-run command/result vocabulary to `@dvt/contracts`
  and decomposes API protected runtime composition into named builders. That removes app-local shim
  contracts and reduces constructor clustering in the root assembler, but the behavioral surface is
  still consumed across contracts, HTTP entrypoints, application services, and runtime modules.
risk: >
  If future changes reintroduce app-local boundary aliases, alternate result vocabularies, or direct
  construction in the protected runtime root, the system can accumulate semantic drift between
  contracts, component guides, and runtime ownership. That would weaken DDD boundaries, increase
  duplication, and make CI failures show up late instead of at the architecture seam.
mitigations:
  - >
    Keep `@dvt/contracts` as the only canonical owner of the shared start-run boundary and reject
    new app-local command/result shim modules.
  - >
    Preserve local component guides with public API, invariants, transitions, and consumers for
    start-run application and runtime composition components.
  - >
    Keep semantic architecture tests for start-run application ports and runtime builders focused on
    ownership, not just file thinness.
  - >
    Continue running contracts package tests, schema verification, golden validation, and `pnpm
    verify:prepush` for changes that touch the boundary.
review_after: 2026-06-30
---
```

<a id="risk-r-20260423-access-decision-vocabulary-hardening"></a>

## Independent risk R-20260423-ACCESS-DECISION-VOCABULARY-HARDENING

```risk-record-v1
---
id: R-20260423-ACCESS-DECISION-VOCABULARY-HARDENING
title:
  Access-decision vocabulary and capability-policy ownership can drift across API and contracts
  surfaces
status: Open
date: 2026-04-23
owners:
  - apps/api
  - packages/@dvt/contracts
severity: Medium
probability: Medium
context: >
  The 2026-04-23 branch consolidates the protected API access-decision language, extracts
  workspace-graph-draft capability policy shaping into its own module, adds semantic component
  documentation and architecture tests, and touches the `@dvt/contracts` validation suite for
  workspace graph draft outcomes.
risk: >
  If future slices reintroduce raw action literals, let workspace-graph-draft capability shaping
  drift back into orchestration services, or duplicate contracts validation fixtures without a
  single semantic owner, the protected boundary can fragment again. That would make docs stale,
  weaken component fitness coverage, and raise the cost of a later PDP backend swap.
mitigations:
  - >
    Keep `apps/api/src/application/ports/accessDecision.ts` as the only published language owner for
    protected actions, resources, scopes, and denial reasons.
  - >
    Keep `apps/api/src/application/services/workspaceGraphDraftCapabilityPolicy.ts` as the
    policy-materialization module and prevent `AuthorizeWorkspaceGraphDraftCapabilityService` from
    re-owning capability policy data or open-ended denial translation.
  - >
    Keep `apps/api/docs/protected-security-access-decision-component.md` and
    `apps/api/test/application/services/protectedSecurityAccessDecision.architecture.test.ts`
    aligned so semantic ownership remains mechanically checked.
  - >
    Keep `packages/@dvt/contracts/test/validation/workspace-graph-draft.ts` readable through shared
    fixture builders rather than repeated near-identical contract outcome constructors.
  - >
    Run the API build/typecheck/test baseline, contracts build/typecheck/test, `docs:sync`,
    `docs:status:generate`, ARC inspection, and `pnpm verify:prepush` on future changes touching
    this seam.
review_after: 2026-06-30
---
```

<a id="risk-r-20260424-hard-cut-runtime-provider-vocabulary"></a>

## Independent risk R-20260424-HARD-CUT-RUNTIME-PROVIDER-VOCABULARY

```risk-record-v1
---
id: R-20260424-HARD-CUT-RUNTIME-PROVIDER-VOCABULARY
title: Runtime provider vocabulary can drift back to synthetic or non-implemented providers
status: Open
date: 2026-04-24
owners:
  - packages/@dvt/contracts
  - packages/@dvt/engine
  - apps/api
severity: Medium
probability: Medium
context: >
  The 2026-04-24 cleanup removes `mock` and non-implemented future-provider IDs from active runtime
  provider vocabulary, renames the engine mock adapter to an in-memory unit-test provider double,
  deletes dead provider stubs, and narrows active contracts to implemented providers.
risk: >
  Future test, docs, or composition changes could reintroduce synthetic or non-implemented provider
  IDs into contracts, capability matrices, API runtime configuration, or integration tests. That
  would blur the distinction between DVT-owned execution semantics, unit-test doubles, future
  provider planning, and real provider adapters.
mitigations:
  - >
    Keep provider-vocabulary architecture tests in `@dvt/contracts` so active contracts reject
    synthetic and non-implemented provider ids as runtime providers.
  - >
    Keep unit-test doubles named by their role, such as `InMemoryProviderAdapter`, and configure
    them with real provider ids.
  - >
    Require an ADR-backed contract line, real adapter package, conformance suite, capability matrix,
    and production composition path before adding any second runtime provider to active docs or
    provider typing.
  - >
    Keep integration tests fail-closed: use real Temporal/Postgres infrastructure or skip with an
    explicit missing-environment reason.
  - >
    Treat web `mock` data-source mode as UI-local demo/test data only; it must not leak into
    start-run `targetAdapter` or `providerRef.provider` fields.
review_after: 2026-06-30
---
```

<a id="risk-r-20260424-start-run-adapter-factory-drift"></a>

## Independent risk R-20260424-START-RUN-ADAPTER-FACTORY-DRIFT

```risk-record-v1
---
id: R-20260424-START-RUN-ADAPTER-FACTORY-DRIFT
title: Start-run adapter IDs can drift back into concrete runtime construction
status: Open
date: 2026-04-24
owners:
  - apps/api
  - packages/@dvt/contracts
severity: Medium
probability: Medium
context: >
  The 2026-04-24 slice removes `mock` from the active start-run target-adapter contract and extracts
  Temporal construction behind a provider-adapter factory seam.
risk: >
  Future changes could reintroduce provider-specific imports, environment checks, or mock adapter
  support into generic start-run runtime assembly. That would blur the boundary between DVT
  execution semantics and replaceable provider adapters.
mitigations:
  - >
    Keep `buildProviderAdapters.ts` generic: it may invoke `ProviderAdapterFactory` implementations,
    but it must not import concrete adapter packages or inspect provider-specific environment
    variables.
  - >
    Keep `createTemporalProviderAdapterFactory.ts` as the Temporal-specific construction owner until
    another provider factory is introduced through a governed slice.
  - >
    Keep `StartRunBoundary.v1.ts`, its contract tests, and API parser tests aligned so `mock`
    remains a rejected start-run target adapter rather than a hidden compatibility path.
  - >
    Run contracts validation, API typecheck/tests, docs generation, ARC inspection, and `pnpm
    verify:prepush` for future changes touching this seam.
review_after: 2026-06-30
---
```

<a id="risk-r-20260509-stored-plan-artifact-port-ownership"></a>

## Independent risk R-20260509-STORED-PLAN-ARTIFACT-PORT-OWNERSHIP

```risk-record-v1
---
id: R-20260509-STORED-PLAN-ARTIFACT-PORT-OWNERSHIP
title: Stored-plan artifact ports can drift back into API, planner, or engine packages
status: Open
date: 2026-05-09
owners:
  - packages/@dvt/artifacts
  - packages/@dvt/engine
  - apps/api
severity: Medium
probability: Low
context: >
  The stored-plan artifact lifecycle used to be represented by duplicate or unscoped ports in
  planner, API, and engine surfaces.
risk: >
  Future changes could reintroduce local stored-plan artifact ports or naked PlanRef fetches,
  weakening tenant-scoped materialization and making dispatch integrity depend on package-local
  vocabulary again.
mitigations:
  - Architecture tests require the artifact reader/writer/store port in @dvt/artifacts.
  - Engine tests require IPlanIntegrityValidator to consume IStoredPlanArtifactReader.
  - API and Temporal tests use ScopedPlanRef fixtures for artifact materialization.
  - Documentation names @dvt/artifacts as the single canonical port home.
review_after: 2026-06-15
---
```

<a id="risk-r-20260513-ar-a4-custom-policy-namespace-freeze"></a>

## Independent risk R-20260513-AR-A4-CUSTOM-POLICY-NAMESPACE-FREEZE

```risk-record-v1
---
id: R-20260513-AR-A4-CUSTOM-POLICY-NAMESPACE-FREEZE
title: Frozen custom policy namespace seam may need future reactivation
status: Open
date: 2026-05-13
owners:
  - '@dvt/planner'
  - '@dvt/contracts'
severity: Low
probability: Low
---
context: >
  AR-A4 freezes the custom policy namespace registry because no production consumer exists. A future
  product use case may legitimately need this seam.
mitigation: >
  The component guide records the reactivation path: real consumer, ADR or mandatory proposal,
  command/query ownership, negative tests, architecture guard update, ARC evidence, and risk update
  in the same slice.
```

<a id="risk-r-20260514-s08-plan-store-inventory-drift"></a>

## Independent risk R-20260514-S08-PLAN-STORE-INVENTORY-DRIFT

```risk-record-v1
---
id: R-20260514-S08-PLAN-STORE-INVENTORY-DRIFT
title: S08 operations inventory can drift from scoped plan-store implementation truth
status: Open
date: 2026-05-14
owners:
  - '@dvt/contracts'
  - docs
severity: Low
probability: Low
context: >
  S08 scoped plan-store records, ports, and Postgres adapter surfaces now carry tenant, project, and
  environment scope. The system operations inventory still contained older rows that described those
  same surfaces as unscoped legacy drift.
risk: >
  Future S08 work could rely on stale inventory rows and re-open already closed drift, causing
  duplicate remediation tasks or incorrect architecture review conclusions.
mitigations:
  - 'Keep the semantic architecture guard in plan-store-records.architecture.test.ts checking that
    closed scoped plan-store drift is not restated as current truth.'
  - 'Update the operations inventory in the same slice as future scoped plan-store API changes.'
  - 'Run the contracts architecture test and pre-push gate before publishing S08 follow-up PRs.'
review_after: 2026-06-30
---
```

<a id="risk-r-20260515-ci-contracts-hash-scope-e2e"></a>

## Independent risk R-20260515-CI-CONTRACTS-HASH-SCOPE-E2E

```risk-record-v1
---
id: R-20260515-CI-CONTRACTS-HASH-SCOPE-E2E
title: Contracts hash-compare scope change lacks PR-runtime E2E validation
status: Open
date: 2026-05-15
owners:
  - ci
  - '@dvt/contracts'
severity: Medium
probability: Medium
---
summary: >
  The contracts workflow gates snapshot hash comparison through centralized `emit-scope.mjs` output
  (`contracts_scope.hash_compare_relevant`) instead of an inline PR `git diff` detector. Unit and
  parity tests passed, but no PR-runtime end-to-end execution evidence has been captured yet in
  GitHub Actions.

mitigations:
  - Capture one real pull_request run where `hash_compare_relevant=true` and verify `Compare
    snapshot hashes (blocking)` executes.
  - Capture one real pull_request run where `hash_compare_relevant=false` and verify the
    hash-compare step is skipped.
  - Attach run URLs and step evidence to the task closeout and then close this risk.

validation:
  - node --test tools/ci/emit-scope.test.mjs
  - node --test tools/ci/workflow-pattern-parity.test.mjs
  - node tools/ci/validate-policy.js tools/ci/policy/workflow-scope.json
```

<a id="risk-r-20260601-planner-local-doc-archive"></a>

## Independent risk R-20260601-PLANNER-LOCAL-DOC-ARCHIVE

```risk-record-v1
---
id: R-20260601-PLANNER-LOCAL-DOC-ARCHIVE
title: Planner local documentation archive can hide stale reference paths
status: Open
date: 2026-06-01
last_reviewed: 2026-09-15
owners:
  - '@dvt/planner'
  - docs
severity: Low
probability: Low
---

# R-20260601-PLANNER-LOCAL-DOC-ARCHIVE

## Context

The obsolete Planner documentation archive is retired under
[issue #3004](https://github.com/dunay2/dvt/issues/3004) and
[PR #3223](https://github.com/dunay2/dvt/pull/3223). Historical content remains in
Git, not in package-local copies, archive indexes, or preservation summaries.
Planning DB remains the architecture authority; current contracts, code, and
tests govern implementation.

## Risk

Active readers or evidence consumers can still follow retired Planner paths
instead of the current owning authority. This risk remains open until the
relevant consumers and integration checks are reconciled. Retaining obsolete
files is no longer an accepted mitigation.

## Mitigation

- Resolve current architecture through the existing Planning DB query rail;
  fail closed when that authority is unavailable instead of rebuilding it from
  historical Markdown.
- Reconcile active links, generated indexes, and current evidence obligations
  against surviving owners. Do not restore the retired archive to satisfy a
  stale reference.
- Run `pnpm docs:sync` and the manifest generator after structural changes.
- Run affected link, Markdown, governance, and pre-push checks before merge;
  record actual results and unexecuted checks in the governing issue and PR.
- Use exact Git revisions only where an existing current obligation requires
  provenance. An old migration record does not require preserving its former
  directory layout.

## Evidence

- [Retirement implementation and validation](https://github.com/dunay2/dvt/pull/3223)
- [Original migration record at its pre-retirement Git revision](https://github.com/dunay2/dvt/blob/88b7922f7246386959700da5866e330076f8dd97/docs/evidence/ed-20260601-planner-local-doc-archive.md)

The original migration record describes June's repository state, not a current
requirement to retain archived snapshots. This reconciliation does not claim
that all repository backlinks or the operational architecture authority have
been validated.
```

<a id="risk-r-20260603-planner-json-canonicalize-2-upgrade"></a>

## Independent risk R-20260603-PLANNER-JSON-CANONICALIZE-2-UPGRADE

```risk-record-v1
---
id: R-20260603-PLANNER-JSON-CANONICALIZE-2-UPGRADE
title: Planner canonical JSON dependency upgrades can drift from deterministic hashing behavior
status: Open
date: 2026-06-03
owners:
  - packages/@dvt/planner
severity: Low
probability: Low
context: >
  PR #991 upgrades the planner package from json-canonicalize 1.2.0 to 2.0.0. The dependency is part
  of planner canonicalization support, so dependency-only changes still require ARC-2 visibility.
risk: >
  A major dependency upgrade could alter canonical JSON edge-case behavior and affect deterministic
  planner hashes even when TypeScript compilation and package metadata remain valid.
mitigations:
  - Keep `@dvt/planner` type-check and unit-test validation in the PR evidence.
  - Keep pre-push validation as the merge closeout gate.
  - Reopen this risk if planner hash, canonicalization, or determinism tests regress after merge.
review_after: 2026-06-17
---
```

<a id="risk-r-20260612-contracts-compat-schema-parity"></a>

## Independent risk R-20260612-CONTRACTS-COMPAT-SCHEMA-PARITY

```risk-record-v1
---
id: R-20260612-CONTRACTS-COMPAT-SCHEMA-PARITY
title: Packaged compatibility schema can drift from canonical root compatibility matrix
status: Open
date: 2026-06-12
owners:
  - packages/@dvt/contracts
severity: Medium
probability: Low
context: >
  The repository keeps the canonical ExecutionPlan compatibility matrix under contracts/compat and
  also ships a packaged schema copy under @dvt/contracts. The packaged copy previously allowed a
  prefixed version literal while the canonical matrix and runtime adapter compatibility use
  major.minor literals.
risk: >
  A consumer or future maintainer could treat the packaged schema as an independent contract and
  reintroduce a second compatibility vocabulary, allowing v-prefixed versions to appear valid
  outside the canonical matrix.
mitigations:
  - 'Keep `packages/@dvt/contracts/compat/plan-compat.schema.json` byte-level equivalent in shape to
    `contracts/compat/plan-compat.schema.json`.'
  - 'Run `node --test tools/ci/contracts-compat-schema-parity.test.mjs` when compatibility schema
    surfaces change.'
  - 'Keep `packages/test/matrix-alignment.test.ts` validating the canonical root matrix against the
    root schema.'
review_after: 2026-07-12
---
```

<a id="risk-r-20260713-dbt-project-file-projection"></a>

## Independent risk R-20260713-DBT-PROJECT-FILE-PROJECTION

```risk-record-v1
---
id: R-20260713-DBT-PROJECT-FILE-PROJECTION
title: dbt manifest or analysis-profile drift can make file projection unavailable
status: Open
date: 2026-07-13
owners:
  - packages/@dvt/contracts
  - apps/api
severity: Medium
probability: Medium
context: >
  Phase two derives a read-only Canvas projection from a fresh server-side dbt parse using an
  explicitly configured analysis profile and normalized manifest resources.
risk: >
  A future dbt manifest version, adapter-specific profile requirement, unsupported resource type, or
  deployment misconfiguration could make analysis unavailable or omit semantics without an
  intentional contract evolution.
mitigations:
  - 'Reject unsupported manifest shapes and return an explicit unavailable projection rather than a
    valid empty graph or graph-draft fallback.'
  - 'Require a server-managed analysis profile; never read workspace profiles.yml or inherit secret
    environment variables into dbt parse.'
  - 'Keep manifest normalization behind IDbtProjectAnalyzerPort and cover source, model, test,
    dependency, stale-target, invalid-project, and cleanup behavior.'
  - 'Version Canvas authority and graph projection contracts and fail closed on duplicate unique_id
    or missing edge endpoints.'
review_after: 2026-08-13
---
```

<a id="risk-r-20260714-dbt-project-import-authority"></a>

## Independent risk R-20260714-DBT-PROJECT-IMPORT-AUTHORITY

```risk-record-v1
---
id: R-20260714-DBT-PROJECT-IMPORT-AUTHORITY
title: dbt import authority or atomic file mutation can diverge under runtime failure
status: Open
date: 2026-07-14
owners:
  - packages/@dvt/contracts
  - apps/api
severity: High
probability: Low
context: >
  Phase three introduces persisted Canvas authoring authority, validation-bound dbt project imports,
  atomic workspace file batches, and authority-specific warehouse source import.
risk: >
  A future adapter, retry path, or transaction-boundary change could bind a Canvas to stale project
  evidence, partially mutate project files, or write both project files and graph draft state for
  one product command.
mitigations:
  - 'Bind imports to a validation receipt and reject changed project inventory or an already-bound
    Canvas before mutation.'
  - 'Execute workspace file writes through one atomic batch gateway with deterministic rollback and
    restored preconditions.'
  - 'Resolve one persisted authority before Source Import and delegate to exactly one strategy.'
  - 'Acquire one shared tenant/project/environment/Canvas transaction lock from both graph-draft
    save and file-authority bind, then revalidate the competing store before commit.'
  - 'Hash file-batch command intent independently from mutable CAS revision values and verify stored
    receipt postconditions before replaying a completed retry.'
  - 'Use idempotency keys at protected command routes and test retries, conflicts, rollback, and
    projection refresh failures.'
  - 'Apply the protected runtime rate limit to graph-draft read and save routes before repeated
    authorization attempts reach application services.'
  - 'Persist the completed ImportDbtProject result and replay it before validating mutable project
    files; reject a reused idempotency key whose request hash differs.'
  - 'Own authority binding, active-operation leasing, completed replay, and compensation through one
    durable import process store. Recover an incomplete operation only after lease expiry and reject
    completion or compensation from a stale owner token.'
  - 'Keep authority and import payloads versioned in @dvt/contracts and reject unsupported shapes.'
review_after: 2026-08-14
---
```

<a id="risk-r-20260731-plan-admission-finding-identity"></a>

## Independent risk R-20260731-PLAN-ADMISSION-FINDING-IDENTITY

```risk-record-v1
---
id: R-20260731-PLAN-ADMISSION-FINDING-IDENTITY
title: Finding identity could drift if canonical input ordering changes
status: Open
date: 2026-07-31
owners:
  - '@dvt/contracts'
severity: Medium
probability: Low
---
context: >
  Plan admission finding identifiers are deterministic artifact identities. A future producer that
  hashes subjects or evidence in encounter order could assign different identifiers to the same
  semantic rejection.
mitigation: >
  The contract owns one identity factory that sorts subjects and evidence before hashing a
  fixed-shape payload. Contract tests prove order independence and the runtime schema rejects
  identifiers that do not match the canonical payload.
```

<a id="risk-r-20260801-lossless-dbt-dependency-edit"></a>

## Independent risk R-20260801-LOSSLESS-DBT-DEPENDENCY-EDIT

```risk-record-v1
---
id: R-20260801-LOSSLESS-DBT-DEPENDENCY-EDIT
title: A dbt semantic edit could alter content outside its proven region
status: Open
date: 2026-08-01
owners:
  - packages/@dvt/contracts
  - apps/api
severity: High
probability: Low
context: >
  Graph-to-Code dependency edits cross native dbt semantics, workspace file revisions, and an atomic
  publication boundary.
risk: >
  Incorrect source ranges, stale analysis, ambiguous Jinja, or a non-lossless rewrite could alter
  user-authored dbt content beyond the requested dependency target.
mitigations:
  - 'Bind the request to project, native-analysis, selected-analysis, region, file, and target
    identities.'
  - 'Accept only manifest-confirmed literal ref and source regions owned by the selected model.'
  - 'Refuse code_only, overlapping, incompatible, stale, invalid, or semantically mismatched
    candidates before publication.'
  - 'Parse an isolated candidate with the installed dbt runtime before publication.'
  - 'Revalidate the exact canonical dbt file set under a workspace-scoped lock.'
  - 'Publish the target SQL and immutable semantic receipt in one rollback-capable atomic mutation.'
  - 'Verify that every unrelated analyzed file remains byte-identical.'
  - 'Bind one idempotency key to one request and preserve immutable applied receipts.'
  - 'Cover UTF-8 offsets, quote and whitespace preservation, Jinja, macros, YAML sources/tests,
    no-op, authorization, and CAS conflicts with focused tests.'
residual_risk: >
  Unsupported dbt or Jinja syntax remains code_only and cannot be edited visually until native
  semantic evidence explicitly classifies it. This limits edit coverage but preserves losslessness.
review_after: 2026-09-01
---
```

<a id="risk-r-20260801-selected-dbt-analysis"></a>

## Independent risk R-20260801-SELECTED-DBT-ANALYSIS

```risk-record-v1
---
id: R-20260801-SELECTED-DBT-ANALYSIS
title: Ambiguous dbt syntax could be mistaken for a writable semantic region
status: Open
date: 2026-08-01
owners:
  - packages/@dvt/contracts
  - apps/api
severity: High
probability: Low
context: >
  Selected dbt analysis combines exact project files with native manifest identities and source
  locations so later Graph-to-Code operations can distinguish supported regions from code-only
  content.
risk: >
  If dynamic Jinja, comments, statements, or source locations that do not match native manifest
  evidence were classified as writable, a later patch could alter user-authored code without a
  lossless semantic guarantee.
mitigations:
  - 'Use the installed dbt runtime and its manifest as the semantic authority.'
  - 'Classify only literal, manifest-confirmed ref and source calls as supported regions.'
  - 'Classify all ambiguous or unsupported syntax as code_only.'
  - 'Bind file revisions, semantic evidence, capabilities, and selected identity into a stable
    analysis hash.'
  - 'Return typed unavailable or invalid outcomes instead of fabricated partial success.'
  - 'Cover contract, application query, HTTP authorization, native analyzer, and region projection
    boundaries with focused tests.'
residual_risk: >
  New dbt or Jinja syntax remains code_only until the native evidence projection explicitly supports
  it. This reduces automatic edit coverage but preserves losslessness and fail-closed behavior.
review_after: 2026-09-01
---
```

<a id="risk-r-20260824-substrait-profile-drift"></a>

## Independent risk R-20260824-SUBSTRAIT-PROFILE-DRIFT

```risk-record-v1
---
id: R-20260824-SUBSTRAIT-PROFILE-DRIFT
title: Substrait profile and tool version drift can change semantic portability
status: Open
date: 2026-08-24
owners:
  - architecture
  - packages/@dvt/contracts
severity: Medium
probability: Medium
---
mitigation:
  summary: >
    ADR-0064 requires an exact pinned Substrait logical profile, explicit profile/version identity,
    serialization and compatibility fixtures, fail-closed unsupported features, and provider-native
    readiness after rendering. DVT stable RelationId/FieldId authoring identity remains outside raw
    Substrait structural/positional field references. The production profile pins Substrait v0.101.0
    at commit 2653e55516c8c07529cde9bc81c64e4ae3537515 and rejects profile/spec version or commit
    skew as a compatibility mismatch rather than semantic-plan corruption. The SUB1 capability
    catalog is bound to that exact profile and records only selected upstream identities plus
    explicit product gaps; catalog presence does not imply provider execution, UI exposure, or
    semantic admission. The audited v0.102.0 delta remains governed by #2643 rather than silently
    entering the pinned catalog. The #2598 and #2634 pilots were historically bounded by whole-plan
    shapes; RELINC1 now derives admitted relation schemas compositionally from canonical Substrait
    and stable identities. The #3263 convergence removes the four shape-specific Web SQL renderers
    and routes output through the shared PostgreSQL target. Preview still verifies scoped source
    connection, source-object, schema, table and upstream semantic-document identity before SQL.
    Semantic field names follow the contract's Unicode budget; physical PostgreSQL identifiers and
    rendered aliases follow target-specific byte limits. Web, contracts and API must roll out
    together; older readers may reject newly admitted long semantic names. Scalar target bindings
    preserve Substrait null propagation and UTC extraction, with real PostgreSQL regression tests.
    SQL and dbt remain projections, never semantic fallbacks. Canvas cards, inspector fields and
    column lineage now consume shared asynchronous schema facts rather than whole-plan profiles.
    Consumer lifetime, canonical revision and edit authorization fence obsolete completions; a
    bounded shared schema cache is independent of provider data and geometry changes. The #3369
    prerequisite preserves struct child schemas and dependency identities in the shared
    analysis/cache, including nullable-parent selection and both SET operands. This does not grant
    structured-value execution to a target. Remaining shape-specific authoring readers and full
    document receipt/export costs are not declared converged by this presentation migration. The
    projection inspector keeps its exact Project input as the Filter command target and disables
    stale projection editing while another incoming node awaits composition. Regression proofs cover
    reopening without stacked filters and unchanged stable field bindings. The #3369 hard cut also
    repoints admission evidence from the removed JOIN-composition test to selected-condition
    persistence. Catalog contract checks require local canonical, semantic and negative proof
    references to resolve; a retired implementation cannot remain the advertised admission proof.
    This changes no admitted identity or target status. The #3298 producer/consumer boundary adds
    optional producerRef and inputBindings contracts: consumer Input stores provenance and explicit
    internal operations alone define published Output. Stable producer FieldIds are validated
    against the immediate published schema; excluded or missing fields cannot be recovered by
    matching names. Exact-match migration may replace embedded producer trees, but does not guess
    identity or widen semantic admission. Older strict clients may reject documents containing the
    new optional fields, so Web, API and shared packages require coordinated deployment. Protected
    preview continues to validate authorization, direct dependencies, cycles, physical source
    coverage and a single connection before provider access. The optional
    DvtRelationalAuthoringDraft v1 records incomplete source occurrences, algebraic operation ports,
    explicit terminal Output selection and card positions without promoting them to executable
    Substrait. Its validator rejects duplicate identities, invalid arity and cycles. Positions may
    retain canonical relation identities after Apply; hydration removes those identities from the
    incomplete graph before rendering, so layout persistence cannot duplicate applied operations. A
    configured staged operation may carry a semantic document only with all Input ports filled and
    with a sidecar relation matching its own output identity. Transform materializes one ProjectRel
    over the exact connected producer; configuring it does not remove the operation card. Producer
    edits run through the complete configured tree so canonical rebinding preserves consumer aliases
    and derived fields or rejects an incompatible edit atomically. Explicit disconnections
    invalidate disconnected downstream documents before publication. Only the operation explicitly
    connected to terminal Output is promoted. Draft persistence remains separate from readiness.
    Internal editor connection commands count canonical, staged and terminal consumers together,
    reject producer fan-out and require distinct aliased instances for self-joins. New terminal
    links require operation outputs; legacy direct source links remain visible and removable rather
    than silently migrated. Source, operation and terminal Output cards share presentation-only
    movement, and the node overlay does not obscure removable edge actions. Movement cannot mutate
    producers, consumers or semantic output. Browser fixture tests and protected API/SQL unit proofs
    do not establish live PostgreSQL or complete chained StartRun support; bounded operational
    admission remains unchanged. Governance evidence repair preserves exact cycle identity, expected
    revision, audit and idempotency. Distinct rail surface scopes cannot be unioned into artificial
    cross-rail permission or denial; equally specific conflicting owners still deny admission.
    Governance acceptance is not product or live-provider execution proof. Binary staging now uses
    exact producer subtrees and a single canonical builder; document-local relation/function anchors
    are rebased on clones, preserving stable identities and rejecting overlapping occurrences or
    incompatible SET operands. Output refresh cannot replace the inspector or focused controls.
    Semantic zoom reserves lexical-detail space as a disposable projection, never a semantic write
    or replacement of manually authored coordinates. Expansion offsets remain stable while cards
    move; visible bounds/topology changes and Arrange invalidate the session frame. Repeated
    boundary-crossing, cancellation and real-browser drag tests reject geometry feedback without
    adding a persisted layout authority. Browser checks cover repeated zoom, column
    inclusion/reorder and JOIN/CROSS/UNION Apply/reopen; controlled API transport still does not
    prove live provider execution. Name/formula editing compiles directly to canonical expressions
    and preserves FieldIds. Only matching i64/fp64 arithmetic signatures are admitted. Shared
    numeric literal rendering explicitly retains those SQL types, including fp64 negative zero;
    PostgreSQL inference cannot silently replace the model type. Read-only constant queries prove
    values, result OIDs, NULL propagation and i64 overflow without touching user tables.
  evidence:
    - apps/web/src/app/views/canvas/canvasDerivedOutputFormula.test.ts
    - packages/@dvt/contracts/test/dvt-substrait-arithmetic.contract.test.ts
    - packages/@dvt/postgres-projection/test/relationalArithmetic.test.ts
    - apps/web/src/app/views/canvas/canvasStagedBinaryConfiguration.test.ts
    - apps/web/src/app/views/canvas/canvasRelationalTreeGeometry.test.ts
    - apps/web/src/app/views/canvas/relational-layout/RelationalCardDisclosure.test.tsx
    - apps/web/cypress/e2e/canvas/canvas-relational-workbench-pending-join.cy.ts
    - scripts/check-feature-mechanization.test.cjs
    - scripts/planning-db-operate-tests/feature-mechanization.test.cjs
    - docs/evidence/ED-20260926-producer-consumer-input-boundary.md
    - packages/@dvt/contracts/test/dvt-input-bindings.contract.test.ts
    - packages/@dvt/contracts/test/dvt-relational-authoring-draft.contract.test.ts
    - apps/web/src/app/views/canvas/canvasRelationalAuthoringDraft.test.ts
    - apps/web/src/app/views/canvas/canvasRelationalDraftApply.test.ts
    - apps/web/src/app/views/canvas/canvasStagedOperationActions.test.ts
    - apps/web/src/app/views/canvas/CanvasRelationalTreeWorkbench.transform.test.tsx
    - apps/web/src/app/views/canvas/CanvasRelationalTreeWorkbench.apply.test.tsx
    - packages/@dvt/substrait-analysis/test/producerInputRefresh.test.ts
    - packages/@dvt/substrait-analysis/test/migrateEmbeddedProducerInput.test.ts
    - packages/@dvt/postgres-projection/test/producerGraph.test.ts
    - apps/api/test/application/services/previewCanvasProducerRows.test.ts
    - apps/web/cypress/e2e/canvas/canvas-column-lineage-mapping.cy.ts
    - apps/web/cypress/e2e/canvas/canvas-relational-card-movement.cy.ts
    - docs/adr/ADR-0064-substrait-semantic-reference-and-bounded-logical-profile.md
    - https://github.com/dunay2/dvt/blob/5d0a5952bb7ba76e5bfe5456aec27b61f4b54d09/docs/evidence/ed-20260824-substrait-semantic-reference-traceability.md
    - docs/evidence/ED-20260826-vtx2-substrait-card-pilot.md
    - apps/web/src/app/views/canvas/canvasRelationAnalysisSession.ts
    - apps/web/src/app/views/canvas/canvasSelectedJoinConsumers.test.ts
    - apps/web/src/app/views/canvas/canvasSelectedJoinConditionPersistence.test.ts
    - apps/web/src/app/views/canvas/canvasSubstraitPreviewProvenance.test.ts
    - docs/planning/proposals/mandatory/runtime-and-contracts/vtx2-substrait-semantic-reference-design-20260824.md
    - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitProfile.v1.ts
    - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitCapabilityCatalog.v1.ts
    - packages/@dvt/contracts/test/dvt-substrait-profile.contract.test.ts
    - packages/@dvt/contracts/test/dvt-substrait-capability-catalog.contract.test.ts
    - https://github.com/dunay2/dvt/blob/5d0a5952bb7ba76e5bfe5456aec27b61f4b54d09/docs/evidence/ED-20260908-canvas-authoring-field-budgets.md
    - apps/web/src/app/views/canvas/canvasDvtSubstraitOutputProjection.ts
    - apps/web/src/app/views/canvas/canvasSubstraitGraphBindings.ts
    - packages/@dvt/postgres-projection/test/relationalSqlNames.test.ts
    - apps/api/test/integration/dvtScalarSql.integration.test.ts
    - packages/@dvt/substrait-analysis/test/schemaHierarchy.test.ts
    - packages/@dvt/substrait-analysis/test/schemaStructuredComposition.test.ts
    - apps/web/src/app/views/canvas/canvasNodePresentationProjection.ts
    - apps/web/src/app/views/canvas/canvasPresentationAnalysis.test.ts
    - apps/web/src/app/views/canvas/useCanvasControllerReadModel.geometry.test.tsx
    - apps/web/src/app/views/canvas/useCanvasEdgeCommandRunner.lifecycle.test.tsx
    - apps/web/cypress/e2e/canvas/canvas-selected-filter-live.cy.ts
    - apps/web/src/app/views/canvas/CanvasSelectedFilterEditor.test.tsx
    - apps/web/src/app/views/canvas/canvasSelectedRelationFilter.test.ts
    - apps/web/cypress/e2e/canvas/canvas-source-filter-authoring.cy.ts
  follow_up:
    - Issue #2597 must prove SQL AST/source mapping to the pinned semantic profile and governed target rendering.
    - Issue #2641 owns semantic admission/conformance and the first promotion to supported-profile.
    - Issue #2642 must project admitted capabilities into visual authoring without a second semantic registry.
    - Issue #2599 must prove semantic roundtrip and provider-native Preview against the exact profile.
    - Issue #2643 governs future profile upgrades, version skew, capability deltas, compatibility fixtures, and fail-closed gaps.
    - Issue #2634 governs typed field selection, grouping, and window capability admissions after the first INNER JOIN cut.
```

<a id="risk-r-20260902-planner-environment-ingress-drift"></a>

## Independent risk R-20260902-PLANNER-ENVIRONMENT-INGRESS-DRIFT

```risk-record-v1
---
id: R-20260902-PLANNER-ENVIRONMENT-INGRESS-DRIFT
title: Planner callers could retain the removed no-op environment input
status: Open
date: 2026-09-02
owners:
  - packages/@dvt/contracts
  - packages/@dvt/planner
  - apps/api
severity: Medium
probability: Low
---
mitigation:
  summary: >
    The pre-stable hard cut removes the generic environment bag from every shared Planner and
    planner-backed StartRun contract surface. Strict schemas and HTTP ingress reject the retired
    field, while the normative boundary directs callers to resolve environment-dependent values
    upstream into typed graph, policy, ownership, or step configuration. PlanOwnership.environmentId
    remains intact because it carries real authorization and ownership scope. Focused contract,
    Planner, and API tests guard against reintroducing accept-and-drop behavior.
  evidence:
    - https://github.com/dunay2/dvt/blob/5d0a5952bb7ba76e5bfe5456aec27b61f4b54d09/docs/evidence/ED-20260902-planner-environment-contract-truth.md
    - docs/architecture/components/engine/contracts/engine/start-run-boundary.v1.md
    - packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts
    - packages/@dvt/contracts/src/contracts/engine/StartRunBoundary.v1.ts
    - packages/@dvt/contracts/test/start-run-boundary.contract.test.ts
    - apps/api/src/entrypoints/http/planRoutePlannerEnvelopeParser.ts
  follow_up:
    - Issue #2691 owns removal of the no-op Planner input and its caller migration.
    - Any future Planner-owned environment fact requires a typed deterministic consumer and a new
      governed contract change.
```

<a id="risk-r-20260903-run-execution-context-sha256-crypto-migration"></a>

## Independent risk R-20260903-RUN-EXECUTION-CONTEXT-SHA256-CRYPTO-MIGRATION

```risk-record-v1
---
id: R-20260903-RUN-EXECUTION-CONTEXT-SHA256-CRYPTO-MIGRATION
title:
  Run execution context sha256 fields tightened to Sha256HexString; writers migrated to @dvt/crypto
status: Open
date: 2026-09-03
owners:
  - '@dvt/contracts'
  - 'dvt-api'
severity: Low
probability: Low
---
summary: >
  RunExecutionContextRef.sha256 and RunExecutionContext.planSha256 were loosely typed as
  NonBlankString and validated with node:crypto createHash('sha256') in three apps/api writers/
  readers. Tightening the Zod schema to Sha256HexStringSchema is a backward-compatible narrowing for
  any caller that already produces valid SHA-256 hex digests (which all known production callers
  do), but any external or future caller that supplied a non-64-char-hex value in this field would
  now be rejected at validation time instead of silently accepted.

mitigations:
  - Reused the already-existing Sha256HexString branded type and Sha256HexStringSchema (already
    applied to pluginCompatibilityFingerprint and PlanRef.sha256) rather than introducing a new
    validation primitive.
  - Full build + test pass across @dvt/contracts, dvt-api, @dvt/engine, @dvt/artifacts,
    @dvt/adapter-temporal, @dvt/temporal-dbt-plugin, and dvt-temporal-worker confirms no production
    caller regresses.
  - sha256Hex(bytes) from @dvt/crypto is a byte-for-byte drop-in replacement for
    createHash('sha256').update(bytes).digest('hex'); no digest value produced by the migrated
    writers changes.
  - Repo-wide grep confirmed apps/web does not consume the RunExecutionContext.v1 parsers, so the
    frontend surface is unaffected.

monitoring:
  - Watch for new ContractValidationError occurrences tagged to
    RunExecutionContextRefSchema/RunExecutionContextSchema after rollout, which would indicate an
    undiscovered caller producing non-canonical sha256/planSha256 values.

follow_up:
  - >-
    Issue #2191 (epic #2185) tracks the remaining ~39-file crypto duplication cleanup inventory;
    this change addresses only the first, highest-consensus item (this file's code_refs).
  - >-
    Issue #2193 tracks the CI guard to prevent new node:crypto duplicates from being introduced; not
    yet implemented.
  - A recurring md5($1) SQL-side pattern for Postgres advisory locks (6 files) and a
    non-cryptographic CRC32 usage in @dvt/state-store/archiveLifecycle.ts remain open, non-blocking
    governance notes from the issue's inventory, out of scope for this cut.
```

<a id="risk-r-20260903-structured-field-hierarchy"></a>

## Independent risk R-20260903-STRUCTURED-FIELD-HIERARCHY

```risk-record-v1
---
id: R-20260903-STRUCTURED-FIELD-HIERARCHY
title: Structured sidecar identity can diverge from canonical Substrait nesting
status: Open
date: 2026-09-03
owners:
  - packages/@dvt/contracts
severity: Medium
probability: Low
---
mitigation:
  summary: >
    Parent references are validated against one relation, sibling order is scoped to the parent,
    ancestry cycles and duplicate identities fail closed, and the visual authoring flow now proves
    autosave and reload agreement with the canonical Plan. PostgreSQL projection remains
    unavailable.
  evidence:
    - https://github.com/dunay2/dvt/blob/5d0a5952bb7ba76e5bfe5456aec27b61f4b54d09/docs/evidence/ED-20260903-substrait-structured-field-gate.md
    - https://github.com/dunay2/dvt/blob/f921266eaa528f9533cb5545f7678a408920935e/docs/planning/proposals/mandatory/frontend-and-ux/canvas-structured-transform-fields-plan-20260903.md
    - packages/@dvt/contracts/test/dvt-substrait-semantic-document-decoding.contract.test.ts
    - packages/@dvt/contracts/test/dvt-substrait-struct-capability.contract.test.ts
    - apps/web/cypress/e2e/canvas/canvas-structured-transform-fields.cy.ts
  follow_up:
    - Keep open until a supported target projection proves agreement with card, inspector, lineage
      and reload.
```

<a id="risk-r-20260903-substrait-capability-admission"></a>

## Independent risk R-20260903-SUBSTRAIT-CAPABILITY-ADMISSION

```risk-record-v1
---
id: R-20260903-SUBSTRAIT-CAPABILITY-ADMISSION
title: Capability evidence can drift into unsupported semantic or provider claims
status: Open
date: 2026-09-03
owners:
  - packages/@dvt/contracts
severity: Medium
probability: Low
---
mitigation:
  summary: >
    Supported-profile entries require typed standard-first evidence. Semantic, target, and visual
    postures remain independent; provider-native support cannot be inferred from mapping. Bounded
    DVT proposals fail when a reviewed standard identity exists or upstream-gap evidence is absent.
    Issue #3485 removes internal mapped/exposed defaults: every group explicitly declares target and
    visual postures. Web references published capability IDs and rejects absent exposure or
    unavailable PostgreSQL conformance without treating mapping as runtime readiness.
  evidence:
    - https://github.com/dunay2/dvt/blob/5d0a5952bb7ba76e5bfe5456aec27b61f4b54d09/docs/evidence/ED-20260903-vtx2-standard-first-capability-admission.md
    - https://github.com/dunay2/dvt/blob/f921266eaa528f9533cb5545f7678a408920935e/docs/planning/proposals/mandatory/runtime-and-contracts/vtx2-standard-first-capability-admission-plan-20260903.md
    - packages/@dvt/contracts/test/dvt-substrait-capability-admission.contract.test.ts
    - packages/@dvt/contracts/test/dvt-substrait-capability-catalog.contract.test.ts
    - https://github.com/dunay2/dvt/blob/c751d0946371f69cd0d001bd5690a92596e8f2c0/docs/evidence/ed-20260930-explicit-capability-admission.md
    - packages/@dvt/contracts/test/dvt-substrait-admission-types.contract.test.ts
    - apps/web/src/app/views/canvas/canvasRelationalOperationChoices.capabilities.test.ts
  follow_up:
    - Require this admission contract before structured-type work can unblock issue #2771.
```

<a id="risk-r-20260903-vtx2-durable-semantic-document"></a>

## Independent risk R-20260903-VTX2-DURABLE-SEMANTIC-DOCUMENT

```risk-record-v1
---
id: R-20260903-VTX2-DURABLE-SEMANTIC-DOCUMENT
title: Persisted Transform metadata may contain corrupt or unsupported Substrait semantics
status: Open
date: 2026-09-03
owners:
  - packages/@dvt/contracts
  - apps/api
severity: Medium
probability: Low
---
mitigation:
  summary: >
    The canonical workspace aggregate validates the pinned profile, exact protobuf decoding,
    semantic digest, sidecar binding and unique stable identities on both save and reload.
    PostgreSQL JSONB/CAS remains the single durable authority, and corrupt stored payloads fail
    closed without SQL, VTX1 or project-file fallback.
  evidence:
    - docs/evidence/ED-20260903-vtx2-durable-semantic-document.md
    - https://github.com/dunay2/dvt/blob/f921266eaa528f9533cb5545f7678a408920935e/docs/planning/proposals/mandatory/runtime-and-contracts/vtx2-durable-semantic-document-plan-20260903.md
    - packages/@dvt/contracts/test/dvt-substrait-semantic-document-decoding.contract.test.ts
    - packages/@dvt/contracts/test/workspace-graph-semantic-document.contract.test.ts
    - apps/api/test/integration/workspaceGraphDraftSemanticPersistence.test.ts
  follow_up:
    - Keep future Substrait profile upgrades explicit and versioned; never accept them through a
      permissive compatibility fallback.
```

<a id="risk-r-20260911-substrait-variadic-arity-drift"></a>

## Independent risk R-20260911-SUBSTRAIT-VARIADIC-ARITY-DRIFT

```risk-record-v1
---
id: R-20260911-SUBSTRAIT-VARIADIC-ARITY-DRIFT
title: Function consumers could misread open Substrait invocation arity
status: Open
date: 2026-09-11
owners:
  - packages/@dvt/contracts
severity: Medium
probability: Low
---
mitigation:
  summary: >
    The canonical capability catalog now expresses a positive minimum and an optional maximum. Fixed
    invocations use equal bounds; official coalesce:any1 requires at least two operands and omits
    the maximum. The schema rejects the retired argumentCount field, inverted ranges, and malformed
    admitted CONCAT or COALESCE identities. PostgreSQL text exposure must consume this catalog range
    directly and must not introduce a Web-side capability registry.
  evidence:
    - docs/adr/ADR-0064-substrait-semantic-reference-and-bounded-logical-profile.md
    - docs/evidence/ED-20260911-substrait-coalesce-variadic-admission.md
    - packages/@dvt/contracts/test/dvt-substrait-capability-catalog.contract.test.ts
  follow_up:
    - Migrate every capability consumer to the range contract in the same integration before merge.
```

<a id="risk-r-20260911-terminal-transform-preview"></a>

## Independent risk R-20260911-TERMINAL-TRANSFORM-PREVIEW

```risk-record-v1
---
id: R-20260911-TERMINAL-TRANSFORM-PREVIEW
title: Persisted terminal Transform Preview may outlive executor capability posture
status: Open
date: 2026-09-11
owners:
  - apps/api
  - packages/@dvt/planner
severity: Medium
probability: Low
---
mitigation:
  summary: >
    Preview fails closed with MISSING_CAPABILITY and keeps Start Run disabled. The browser cannot
    provide SQL, Substrait bytes, workload payloads, or planner graph semantics. The persisted plan
    and SQL artifact retain exact hashes and protected Canvas provenance.
  risk: >
    A persisted INVALID Preview plan cannot silently become executable when #2723 adds the executor;
    it requires a fresh governed admission decision.
  follow_up:
    - Issue #2723 must add the real executor and a fresh-admission lifecycle test before Run is enabled.
    - Issue #2784 remains open for the wider execution and Sink acceptance.
```
