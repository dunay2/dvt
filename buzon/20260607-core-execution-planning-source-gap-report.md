---
title: Core Execution And Planning Source Gap Report
status: Draft
owner: Architecture / Runtime Core
workspace_group:
  - '@dvt/engine'
  - '@dvt/planner'
  - '@dvt/dsl'
  - '@dvt/plan-verifier'
  - '@dvt/plan-interpreter'
date: 2026-06-07
last_reviewed: 2026-06-07
planning_type: review
---

# Core Execution And Planning Source Gap Report

## Scope

This report covers the source-grounded gap assessment for the central product
chain:

```text
DSL / authoring input -> Planner -> Plan verifier -> Plan interpreter -> Engine
```

The goal is to identify what prevents DVT from turning user-authored workflow
intent into a verified, deterministic, executable run while preserving the core
rules:

- the UI does not execute;
- the engine does not decide planning;
- the planner does not persist state;
- adapters remain replaceable infrastructure.

## Sources inspected

- `packages/@dvt/engine/package.json`
- `packages/@dvt/engine/src/index.ts`
- `packages/@dvt/engine/src/ports/IWorkflowEngine.ts`
- `packages/@dvt/engine/src/application/workflow-engine-use-cases/index.ts`
- `packages/@dvt/planner/package.json`
- `packages/@dvt/planner/src/index.ts`
- `packages/@dvt/planner/src/application/PlannerFacade.ts`
- `packages/@dvt/planner/src/domain/Planner.ts`
- `packages/@dvt/dsl/package.json`
- `packages/@dvt/dsl/src/index.ts`
- `packages/@dvt/dsl/src/v1/parser.ts`
- `packages/@dvt/dsl/src/v1/evaluator.ts`
- `packages/@dvt/plan-verifier/package.json`
- `packages/@dvt/plan-verifier/src/index.ts`
- `packages/@dvt/plan-verifier/src/verify.ts`
- `packages/@dvt/plan-verifier/src/stepTypeConfig.ts`
- `packages/@dvt/plan-interpreter/package.json`
- `packages/@dvt/plan-interpreter/src/index.ts`
- `packages/@dvt/plan-interpreter/src/dagAnalyzer.ts`

## Current source facts

### Engine

The engine package exposes a broad stable surface: contracts, run events,
execution plan, errors, ports, run state store ports, integrity validation,
staleness queries, maintenance, intent store, projector, execution context,
authorization, provider adapter, run command/signal/recovery/health/status query
services, enrichment service, outbox rate limiter, and authorization errors.

`IWorkflowEngine` has a compact behavior contract:

- `startRun`
- `recoverRun`
- `cancelRun`
- `getRunStatus`
- `signal`

The `getRunStatus` comment explicitly says it returns canonical status from the
event log + materialized snapshot only and must not call the provider adapter.
That is the correct CQRS posture and should be protected because the API report
previously identified query purity risk around enrichment.

The engine use-case barrel publishes start, recover, cancel, status, signal, and
`buildWorkflowEngineUseCases` as local component API.

### Planner

The planner public index explicitly states `PlannerFacade` is the sole public
entry point and the domain `Planner` is intentionally not exported. This is a
strong boundary.

`PlannerFacade` validates:

- planner input envelope through `parsePlannerInputEnvelopeV1`;
- generic graph source through `parseGenericGraphSourceV1`;
- execution selection through `parseExecutionSelection`;
- workspace graph authoring draft through `WorkspaceGraphAuthoringDraftSchema`.

The domain `Planner` is a deterministic domain service. It validates input,
builds graph, resolves policies, selects nodes, topologically sorts, checks
depth, builds normalized steps, validates step configs using a step type
registry, collects required capabilities, and assembles a canonical plan.

Important source signal: the default step factory is still `dbtStepFactory`, and
default built-in registry is described as DBT_MODEL, DBT_TEST, DBT_SNAPSHOT.
That is a real dbt-first default even if graph input has been generalized.

### DSL

`@dvt/dsl` is currently intentionally tiny. Public API is:

- `DslV1Expression`
- `DslV1Operator`
- `parseDslV1`
- `evaluateDslV1`

The parser grammar is currently:

```text
expr := IDENT '=' LITERAL
```

It explicitly rejects AND/OR, function calls, and side effects. The evaluator is
pure and deterministic, comparing string, number, and boolean equality against a
context object.

### Plan verifier

The verifier exposes admission compatibility, plan-version checks, hashes, and
step-type configuration validation. Source currently verifies:

- plan ID integrity: `sha256(canonicalPlanCoreJson) === planId`;
- plan admission compatibility through `verifyPlanAdmissionOrThrow`;
- execution plan parsing through `parseExecutionPlan`;
- step kind/config validation through the step type registry;
- unknown step kinds are rejected by default.

Risk signal: package script uses `vitest run --passWithNoTests`. That may be
acceptable only if tests are routed elsewhere, but as a workspace readiness
signal it is weak.

### Plan interpreter

`@dvt/plan-interpreter` owns adapter-agnostic DAG validation and execution layer
computation. It exports:

- `collectDownstreamStepIds`
- `planExecutionLayers`
- `validateDag`
- `PlanValidationError`

`dagAnalyzer.ts` validates duplicate step IDs, empty step IDs, unknown
dependencies, self dependencies, invalid dependency values, and cyclic
dependencies. It computes deterministic layers, and when no step declares
`dependsOn`, it deliberately emits one step per layer for sequential execution.

## Gaps by workspace

## 1. `@dvt/engine`

### E-01 — Public surface is too broad without generated ownership matrix

The engine index exports many ports and domain services. That is not inherently
wrong, but it needs a generated public surface matrix so each export has an
owner, lifecycle state, consumer list, and allowed dependency direction.

**Risk**

Consumers can bind directly to ports or services that should be internal to a
component boundary.

**Action**

Generate `engine-public-surface.md` from `src/index.ts` with:

- symbol
- file
- category: contract, port, domain service, adapter seam, error, testing
- lifecycle: public/stable, transitional, internal-leak, deprecated
- owning bounded context
- allowed consumers
- tests

### E-02 — Status/enrichment boundary must be mechanically guarded

`IWorkflowEngine.getRunStatus` correctly forbids provider calls. But the public
engine surface also exports `IRunEnrichmentService` and status query services.
The boundary needs explicit guards so enrichment does not creep back into the
core behavior port.

**Risk**

The API can accidentally treat engine as both command runtime and query/enriched
read model provider.

**Action**

Add architecture tests asserting:

- `IWorkflowEngine.getRunStatus` implementations do not import provider adapter
  modules;
- enrichment lives behind separate query/read-model service;
- API query routes do not call command-oriented engine methods.

### E-03 — Engine DB reflection needs delta report

The project direction is moving truth into DB. Engine has prior DB-proof context,
but the current source report must say exactly what of engine exists in DB and
what remains source-only.

**Action**

Create `engine-db-reflection-delta.md` mapping engine exports to planning DB or
governance DB component rows.

---

## 2. `@dvt/planner`

### P-01 — Transitional re-exports must be burned down

`src/index.ts` explicitly says planner contract re-exports are compatibility
aliases and no new contract re-exports should be added. Artifact symbols have
also moved to `@dvt/artifacts` but remain as transitional bridge.

**Risk**

Consumers may keep importing contracts/artifacts through planner, preserving a
historical shared-kernel leak.

**Action**

Create a consumer inventory for planner transitional exports and add a removal
plan with objective exit criteria.

### P-02 — Default planning is still dbt-first

The planner domain defaults to `dbtStepFactory` and the built-in registry comment
names DBT_MODEL, DBT_TEST, DBT_SNAPSHOT. This is a real gap if DVT is expected to
author generic source/operation/destination workflows.

**Risk**

The UI may allow generic authoring, but planner defaults produce dbt-shaped
execution unless explicitly configured.

**Action**

Add a generic DVT step factory and registry profile. Keep dbt as plugin/profile,
not default product semantics.

### P-03 — Planner capability matrix is missing

The planner validates graph source, selection, workspace draft, policies, limits,
step configs, required capabilities, and canonical plan assembly. But no single
source matrix states which input/source kinds and step kinds are supported.

**Action**

Generate planner capability matrix:

- graph source family
- node kind
- step factory
- stepTypeConfig schema
- required capabilities
- verifier support
- interpreter support
- adapter support
- web authoring support

---

## 3. `@dvt/dsl`

### D-01 — DSL v1 is too small for visual workflow authoring

The grammar supports only `IDENT = LITERAL`. This is valid as a safe seed, but it
cannot express normal transformation predicates, computed fields, joins,
projections, aggregations, or routing logic.

**Risk**

Canvas can show workflow operations that DSL cannot represent, causing hidden UI
semantics or bypassing the DSL entirely.

**Action**

Define DSL v1.1/v2 roadmap as contracts before expanding implementation:

- comparison operators
- conjunction/disjunction with explicit limits
- field references
- null handling
- functions allowlist
- deterministic evaluation rules
- SQL compilation target compatibility

### D-02 — Error model is generic `Error`

Parser throws generic `Error` with string messages. That is insufficient for UI,
API, and verifier diagnostics.

**Action**

Introduce typed `DslParseError` with code, location, offending token, and
human-readable message.

### D-03 — DSL-to-contract integration is unclear

DSL depends on `@dvt/contracts`, but current public DSL API does not expose a
contract parser/result envelope or diagnostics schema.

**Action**

Add contract-owned diagnostic and AST envelope types if DSL becomes part of
external authoring.

---

## 4. `@dvt/plan-verifier`

### V-01 — Test posture is weak

Package script uses `--passWithNoTests`. Source has meaningful verification
logic, so absence of mandatory local tests is a real risk.

**Action**

Add dedicated tests for:

- valid plan ID;
- mismatched plan ID;
- unsupported plan/schema/runtime admission;
- invalid execution plan payload;
- unknown step kind rejected;
- invalid stepTypeConfig rejected;
- known step kind with valid config accepted.

### V-02 — Verifier overlaps with planner step config validation

Planner validates step configs during build. Verifier validates again at
admission. That can be correct defense-in-depth, but must be documented as a
contract, not duplication by accident.

**Action**

Define validation stage ownership:

- planner build-time validation;
- API admission validation;
- adapter pre-dispatch validation;
- UI readiness validation.

### V-03 — Diagnostics are too exception-oriented

Verifier throws `PlanVerifierError`, but the web/API flow needs structured
readiness diagnostics.

**Action**

Add non-throwing `verifyPlan` / `verifyStepTypeConfigs` result APIs returning
machine-readable diagnostics for UI readiness.

---

## 5. `@dvt/plan-interpreter`

### I-01 — DAG rules are strong but need fixture taxonomy

Source validates important structural errors, but the gap is an explicit fixture
catalog matching all cases.

**Action**

Create test fixture taxonomy:

- empty plan;
- sequential no-deps plan;
- fan-out;
- fan-in;
- diamond;
- duplicate step id;
- empty step id;
- unknown dependency;
- self dependency;
- invalid dependency value;
- cycle;
- downstream collection for gateway/skip.

### I-02 — Sequential fallback needs product decision confirmation

When no step declares `dependsOn`, interpreter emits one step per layer. That is
safe, but it is a product semantics decision: no-deps means sequential, not full
parallel.

**Action**

Document this as an ADR or contract note and ensure planner emits `dependsOn`
explicitly where parallelism is intended.

### I-03 — Adapter parity needs generated evidence

The package exists to make all adapters produce identical execution order. There
should be a cross-adapter parity test consuming the same plan through Temporal,
Postgres relational capability, and any future adapter.

**Action**

Add `adapter-execution-order-parity` tests and expose results in docs.

## Integrated product-chain gaps

### C-01 — No single source-to-run closure contract

The current chain has solid pieces, but lacks one executable specification for:

```text
workspace graph draft -> DSL/operation expression -> planner envelope -> execution plan -> verifier -> interpreter layers -> engine start -> adapter run
```

**Action**

Create a golden flow fixture set with at least:

1. one source;
2. one transformation;
3. one destination/materialization;
4. valid readiness;
5. invalid readiness;
6. plan preview;
7. plan verification;
8. execution layers;
9. engine start command.

### C-02 — Generic workflow support is not yet proven

Planner and Temporal plugin still show dbt-first defaults. DSL is too narrow.
Web needs source/operation/destination closure. This means generic DVT workflow
support is not yet proven end-to-end.

**Action**

Create `generic-dvt-workflow-proof` as a cross-workspace feature with explicit
allowed surfaces and red/green tests.

## Recommended implementation order

1. Add verifier tests for existing behavior. This is small, high-safety, and
   closes `--passWithNoTests` risk.
2. Generate engine/planner public surface matrices.
3. Add planner transitional export consumer inventory.
4. Add plan-interpreter fixture taxonomy.
5. Define generic DVT step factory/profile separate from dbt default.
6. Define DSL diagnostic error model.
7. Create golden source-to-run flow fixture.

## Validation baseline for future code changes

```bash
pnpm --filter @dvt/engine typecheck
pnpm --filter @dvt/engine test
pnpm --filter @dvt/planner typecheck
pnpm --filter @dvt/planner test
pnpm --filter @dvt/dsl typecheck
pnpm --filter @dvt/dsl test
pnpm --filter @dvt/plan-verifier typecheck
pnpm --filter @dvt/plan-verifier test
pnpm --filter @dvt/plan-interpreter typecheck
pnpm --filter @dvt/plan-interpreter test
pnpm verify:prepush
```

## Closeout

The core stack is not empty; it has meaningful boundaries and deterministic
contracts. The critical gaps are not lack of code but lack of source-generated
surface matrices, test posture in verifier, generic-vs-dbt separation, DSL
expressiveness/diagnostics, and one source-to-run golden contract tying the
pieces together.
