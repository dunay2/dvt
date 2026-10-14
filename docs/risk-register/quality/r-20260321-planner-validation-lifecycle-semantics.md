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
