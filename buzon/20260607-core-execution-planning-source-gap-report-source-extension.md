---
title: Core Execution And Planning Source Gap Report Extension
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
extends: buzon/20260607-core-execution-planning-source-gap-report.md
---

# Core Execution And Planning Source Gap Report Extension

## Purpose

This extension refines the core execution/planning report using deeper source
checks. The earlier core report identified the right packages, but the source
shows a more precise picture: core boundaries are strong in several places; the
biggest risks are proof, generated matrices, dbt-default posture, and test gaps.

## Sources checked

- `packages/@dvt/engine/src/index.ts`
- `packages/@dvt/engine/src/ports/IWorkflowEngine.ts`
- `packages/@dvt/engine/src/application/workflow-engine-use-cases/index.ts`
- `packages/@dvt/planner/src/index.ts`
- `packages/@dvt/planner/src/application/PlannerFacade.ts`
- `packages/@dvt/planner/src/domain/Planner.ts`
- `packages/@dvt/dsl/src/index.ts`
- `packages/@dvt/dsl/src/v1/parser.ts`
- `packages/@dvt/dsl/src/v1/evaluator.ts`
- `packages/@dvt/plan-verifier/src/index.ts`
- `packages/@dvt/plan-verifier/src/verify.ts`
- `packages/@dvt/plan-verifier/src/stepTypeConfig.ts`
- `packages/@dvt/plan-interpreter/src/index.ts`
- `packages/@dvt/plan-interpreter/src/dagAnalyzer.ts`
- `packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts`

## Source-backed corrections

### 1. Engine command/query boundary is stronger than the first report implied

`IWorkflowEngine` is compact and intentionally behavioral:

- start;
- recover;
- cancel;
- get status;
- signal.

The `getRunStatus` contract explicitly says it returns canonical status from the
event log and materialized snapshot only and **MUST NOT** call the provider
adapter. This is a hard CQRS rule in source.

**Correction**

The engine gap is not “engine mixes queries by design”. The gap is protecting
this rule mechanically against future consumers and implementations.

**Refined action**

Add architecture tests from implementation files and API consumers proving:

- `getRunStatus` implementation does not import provider adapter modules;
- route query handlers do not call command use cases;
- enrichment remains outside the compact engine behavior port.

### 2. Planner public boundary is intentionally narrow, but default profile remains dbt-first

`@dvt/planner/src/index.ts` says `PlannerFacade` is the sole public entry point
and the domain `Planner` is intentionally not exported. That is strong boundary
work.

`PlannerFacade` validates contract inputs and delegates to domain `Planner`.
`Planner` performs deterministic planning stages: input validation, graph build,
policy resolution, node selection, topological sort, depth check, normalized step
build, step config validation, required capability collection, and canonical plan
assembly.

But the source also shows the default step factory is `dbtStepFactory`, and the
registry comment names DBT_MODEL, DBT_TEST, DBT_SNAPSHOT.

**Correction**

The planner is not immature. It is mature but still has dbt-default posture.

**Refined action**

Create a named planner profile model:

- `dbt` profile: current default behavior;
- `dvt-generic` profile: source/transform/sink workflow;
- explicit adapter capability mapping per profile.

### 3. DSL v1 is intentionally safe, not broken

DSL source supports only `IDENT = LITERAL`, rejects AND/OR, rejects functions,
and evaluates deterministically against string/number/boolean context.

**Correction**

The DSL should not be called inadequate in isolation. It is a deliberately safe
seed. The product gap is that this grammar cannot yet support the transformation
language implied by the Canvas product vision.

**Refined action**

Keep DSL v1 stable and add a governed DSL v1.1/v2 proposal with typed errors,
operator allowlist, null semantics, field references, and SQL compilation rules.

### 4. Plan verifier has meaningful logic but weak package-level test posture

`verify.ts` validates plan ID integrity and plan admission. `stepTypeConfig.ts`
parses execution plans and validates step kinds/configs through the step type
registry, rejecting unknown step kinds by default.

**Correction**

The verifier is not empty. The risk is that package script uses
`--passWithNoTests`, which can hide missing direct tests around real verification
logic.

**Refined action**

Add direct verifier tests before expanding behavior. Tests should target existing
source behavior, not imagined future behavior.

### 5. Plan interpreter already implements strong DAG validation

`dagAnalyzer.ts` validates duplicate step IDs, empty step IDs, unknown
dependencies, self-dependencies, invalid dependency values, cycles, and computes
deterministic layers.

**Correction**

The gap is not missing DAG implementation. The gap is fixture taxonomy and
cross-adapter parity proof.

## Refined core gaps

### CORE-01 — Generate public surface matrices for broad barrels

Affected:

- `@dvt/engine`;
- `@dvt/planner`;
- `@dvt/contracts`;
- `@dvt/adapter-temporal`;
- `@dvt/adapter-postgres`.

The matrices should classify every export as stable public, transitional,
internal leak, testing-only, or deprecated.

### CORE-02 — Add generic DVT planner profile

The contracts can accept generic graph sources and arbitrary step kinds. The
planner source defaults to dbt step factory. This must be separated as profile,
not hidden in default constructor behavior.

### CORE-03 — Introduce direct verifier tests

Do this before adding new functionality:

- plan ID valid;
- plan ID mismatch;
- unsupported plan/schema/runtime admission;
- invalid plan payload;
- unknown step kind rejected;
- invalid step config rejected;
- valid known step config accepted.

### CORE-04 — Add interpreter fixture taxonomy

The interpreter should have fixtures for all structural cases and downstream
collection. Then adapters should consume the same fixtures to prove parity.

### CORE-05 — Typed diagnostics across DSL/verifier/readiness

Product UX needs structured diagnostics, not only thrown errors. Introduce shared
diagnostic result types for:

- DSL parse/eval;
- plan verification;
- canvas execution readiness;
- adapter capability mismatch.

## Updated implementation sequence

1. Direct plan-verifier test suite.
2. Plan-interpreter fixture taxonomy.
3. Engine and planner public surface matrices.
4. Planner profile model: `dbt` vs `dvt-generic`.
5. Generic DVT golden fixture through contracts/planner/verifier/interpreter.
6. DSL typed error model and future grammar proposal.
7. Cross-adapter execution-order parity proof.

## Closeout

The core source is stronger than a typical early-stage system. The risk is not
lack of architecture. The risk is that the source-level strengths are not yet
made visible as generated matrices, profile contracts, direct verifier tests, and
one generic DVT golden proof.
