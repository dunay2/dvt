---
title: SQL-first DAG Simplification Plan
status: Working proposal
owner: Architecture / Planner / Contracts / Web / Adapters
last_reviewed: 2026-08-19
planning_type: mandatory-proposal
task_id: 2524
---

# SQL-first DAG Simplification Plan

## Decision

Do less.

Keep the current SQL-first authoring vocabulary:

```text
dvt:source
dvt:sql_transform
dvt:sink
```

Do not add transform subtypes. Do not rename `dvt:sql_transform`. Do not turn it
into a nested workflow container.

A `dvt:sql_transform` remains one composable relational transformation. Its
authoring authority may be SQL or the existing visual recipe, because both
produce SQL for this execution profile.

The required product topology becomes a real DAG using the existing kinds:

```text
source -> sql_transform
sql_transform -> sql_transform
sql_transform -> sink
sink -> terminal
```

Fan-out is allowed:

```text
Source -> T1 -> T2 -> Sink A
                   -> Sink B
```

The compiler must consume the exact selected DAG. It must never select the first
source, transform, or sink and ignore the rest.

## Why this is smaller

The current problem is not a missing taxonomy. It is that a generic Graph Draft
is forced into a fixed three-node and three-step vertical.

The minimum useful correction is:

1. keep existing authoring kinds;
2. remove the fixed topology restriction;
3. compile the exact selected graph;
4. remove technical runtime steps;
5. execute one final SQL publication step per sink.

For a selected branch ending in one sink:

```text
Authoring:
Source -> T1 -> T2 -> Sink A

Execution:
POSTGRES_SQL_TRANSFORM_AND_PUBLISH Sink A
```

For two sinks:

```text
Authoring:
Source -> T1 -> T2 -> Sink A
                   -> Sink B

Execution:
POSTGRES_SQL_TRANSFORM_AND_PUBLISH Sink A
POSTGRES_SQL_TRANSFORM_AND_PUBLISH Sink B
```

Each sink step receives the compiled upstream SQL chain and publishes one logical
asset using the versioned strategy owned by #2523.

V1 may duplicate shared upstream computation for two sinks. That is intentional.
No optimizer, shared-build cache, or cross-sink publish group is introduced in
this slice.

## What is removed

| Remove | Reason | Surviving owner |
| --- | --- | --- |
| Fixed `exactly one source, one transform, one sink` topology | It contradicts the generic Graph Draft | Graph Draft plus executable-subgraph derivation |
| First-role `.find()` selection during Preview | It silently drops selected nodes and edges | Exact selected DAG compilation |
| `PREPARE_POSTGRES_TRANSFORM` | Connection/session setup is an adapter phase, not a semantic step | PostgreSQL execution activity plus observability |
| `CAPTURE_MATERIALIZATION_EVIDENCE` | Evidence belongs in the completing publication step | `StepCompleted.resultEvidence` |
| Source and sink cards being represented by technical lifecycle steps | Visible nodes do not automatically equal runtime steps | Compiler-derived execution plan |
| Proposal to rename `dvt:sql_transform` to `dvt:transform` | Migration cost without required product capability | Existing kind remains active |
| Proposal for Filter/Join/Aggregate/Union canonical kinds | These are SQL or visual-recipe operations today | Existing transform authoring |
| Generic transform child-node container | It would hide another graph and planner | Graph Draft remains the only graph authority |
| Named-port migration in this slice | Not required for transform chains or simple fan-out | Existing node-level edges |
| SQL fusion optimizer | Correctness precedes optimization | Independent per-sink compilation |
| Shared physical build across sinks | Adds cache, lifetime, and failure semantics | Independent sink executions |
| Atomic multi-sink publication promise | Not required and not portable | Future explicit publish-group capability |
| Multi-source/fan-in support in V1 | Requires a stable input-binding contract | Fail-closed capability diagnostic |
| New store, registry, command bus, or graph validator | Existing authorities already exist | Current contracts/planner/Canvas rails |

## What remains

### Existing graph authority

`WorkspaceGraphAuthoringDraft` remains the only editable graph authority.
Existing node and edge persistence, selection, cycle detection, dependency-gap
diagnostics, and topological ordering are reused.

### Existing authoring modes

`dvt:sql_transform` keeps the current mutually exclusive authoring modes:

```text
SQL authority
or
VisualTransformRecipe authority -> generated SQL projection
```

No third authority and no operation-specific node taxonomy are introduced.

### Existing connection authority

The SQL-first DAG remains bound to the governed PostgreSQL `ConnectionRef` path
from #2329.

For the first real-DAG cut, every selected executable branch must resolve to one
compatible PostgreSQL connection. Mixed connections fail closed. Cross-connection
transfer is a different capability and remains outside this work.

### Versioned publication

Every sink is one logical asset. Its execution builds and validates a physical
version, then publishes the logical pointer according to #2523.

One sink step returns evidence for one sink. Two sinks produce two independently
reported step results.

## Minimal authoring contract

The current node kinds remain unchanged.

The only connection-rule addition required for the first cut is:

```text
dvt:sql_transform -> dvt:sql_transform
```

The full retained policy is:

```text
dvt:source        -> dvt:sql_transform     allowed
dvt:sql_transform -> dvt:sql_transform     allowed
dvt:sql_transform -> dvt:sink              allowed
dvt:sink          -> *                     denied
```

Fan-out is represented by multiple ordinary edges. Named ports are not required
for this topology.

V1 transform fan-in remains unsupported:

```text
Source A --\
            -> Transform
Source B --/
```

The graph may store such a shape only if another active plugin/capability owns
it. The SQL-first compiler must reject it explicitly until the input-binding
contract supports it.

## Minimal compiler contract

The new SQL-first contract must not change V2 silently. Use a new version boundary,
preferably `transformation-sql-first-v3`.

For every selected sink:

1. walk its upstream selected chain;
2. verify it is acyclic and complete using existing graph authorities;
3. require one source binding for V1;
4. require every intermediate node to be `dvt:sql_transform`;
5. compose the transform SQL in deterministic topological order;
6. emit one PostgreSQL publication step for that sink;
7. include exact node/edge provenance and the governed `ConnectionRef`;
8. return a diagnostic instead of dropping anything that cannot be represented.

### SQL composition rule

The implementation DoR must freeze one small composability contract:

- every transform is a single relational query;
- every transform receives one stable upstream relation alias in V1;
- visual recipes compile to the same contract;
- transform chains compile as deterministic CTEs or equivalent nested queries;
- no SQL parser, query optimizer, or local dialect engine is introduced merely
  for this work.

The compiler may reject SQL that cannot satisfy this contract. It must not create
hidden intermediate business tables.

## Minimal runtime contract

For new V3 plans, remove:

```text
PREPARE_POSTGRES_TRANSFORM
CAPTURE_MATERIALIZATION_EVIDENCE
```

Emit one semantic step per sink, equivalent to:

```text
POSTGRES_SQL_TRANSFORM_AND_PUBLISH
```

The exact step-kind name is a contract detail to review. Its responsibility is
one bounded operation:

```text
resolve connection/context
build physical version
validate
publish one logical sink
return resultEvidence
```

Connection acquisition, session setup, row counting, and cleanup remain internal
phases observed through `IObservability`.

A step exists because it publishes an independently addressable asset with its
own result and failure semantics. It does not exist merely because a source,
transform, or sink card is visible.

## Multiple sink semantics

V1 uses independent sink steps.

```text
Sink A success + Sink B failure
```

must be reported truthfully as one completed step and one failed step; the run
can finish failed while retaining the successful publication evidence.

No implicit rollback of Sink A is attempted. Versioned publication guarantees
that each sink either keeps its previous version or publishes its validated new
version.

All-or-nothing publication across assets requires a future explicit publish-group
contract. It is not inferred from fan-out.

## Immediate safety cut before V3

The current V2 path has a correctness defect: richer selected topology can be
silently reduced to the first role match.

Before real DAG support, make V2 fail closed when the selected scope is not
exactly representable by its existing contract.

Required rule:

```text
unsupported V2 topology -> explicit diagnostic
unsupported V2 topology != silently choose first nodes
```

This is a bounded corrective PR and must not be presented as DAG support.

## Delivery sequence

### PR 1 — V2 fail-closed correction

- remove first-role silent truncation;
- require exact V2 cardinality;
- return offending node and edge diagnostics;
- add regression tests for two transforms and two sinks.

### PR 2 — V3 graph/compiler contract

- add `transformation-sql-first-v3`;
- keep existing authoring node kinds;
- admit transform chains and sink fan-out;
- compile one deterministic SQL step per sink;
- reject fan-in and mixed connections explicitly.

### PR 3 — Runtime reduction and publication

- integrate #2523 publication semantics;
- remove PREPARE/EVIDENCE from new plans;
- return evidence from each sink publication step;
- keep legacy handlers only for the bounded lifetime of valid V2 PlanRefs.

No additional taxonomy, port framework, optimizer, subflow, or provider is part
of these PRs.

## Definition of Ready

Implementation may start only when all items are true:

- [ ] current `main` SHA and overlapping PRs are recorded;
- [ ] issue #2523 has fixed the PostgreSQL versioned publish contract sufficiently
      for one sink publication step;
- [ ] V2 PlanRef validity/retention and the legacy-handler removal condition are
      explicit;
- [ ] `transformation-sql-first-v3` is accepted as the new contract boundary;
- [ ] the single-input SQL composition contract and stable upstream alias are
      fixed for SQL and visual authoring;
- [ ] multiple sinks are accepted as independent publication steps, without an
      atomic group promise;
- [ ] the one-compatible-ConnectionRef rule is fixed for V1 DAG execution;
- [ ] red tests reproduce silent V2 truncation with two transforms and two sinks;
- [ ] red contract/planner tests describe `Source -> T1 -> T2 -> Sink A/Sink B`;
- [ ] no current consumer requires PREPARE or EVIDENCE as an independent retry,
      timeout, cancel, output, or recovery boundary;
- [ ] no other issue or PR owns the same bounded outcome;
- [ ] no named ports, new transform kinds, optimizer, subflow, or new store is
      required to finish the accepted scope.

## Definition of Done

The complete program is Done only when:

- [ ] Preview never silently ignores a selected node or edge;
- [ ] V2 rejects unsupported richer topology with useful diagnostics;
- [ ] V3 supports `source -> transform -> transform -> sink`;
- [ ] V3 preserves fan-out from one transform to at least two sinks;
- [ ] the three current authoring kinds remain the only native SQL-first kinds;
- [ ] SQL and visual recipe remain the only transform authoring authorities;
- [ ] every selected V3 sink produces exactly one semantic execution step;
- [ ] new V3 plans contain no PREPARE or EVIDENCE technical steps;
- [ ] each completing sink step writes `StepCompleted.resultEvidence`;
- [ ] two sinks produce two independently attributable results;
- [ ] build, validation, or publish failure leaves that sink's previous logical
      version intact through #2523;
- [ ] mixed connections and transform fan-in fail closed with stable diagnostics;
- [ ] source and transform nodes do not create hidden business tables;
- [ ] no new transform taxonomy, generic container, port framework, optimizer,
      store, command bus, or graph validator is introduced;
- [ ] V2 compatibility is bounded and removable rather than indefinite;
- [ ] contracts, planner, Web, API, adapter, worker, run-domain, PostgreSQL
      service-backed, and live Canvas tests pass;
- [ ] live evidence proves `Source -> T1 -> T2 -> Sink A/Sink B` and shows the
      expected reduced lifecycle events;
- [ ] active docs and #2524 describe the surviving behavior accurately;
- [ ] #2327 and #2255 receive the final evidence and acceptance outcome.

## Explicit non-goals

- renaming `dvt:sql_transform`;
- adding Filter, Join, Aggregate, Union, Router, or generic Transform kinds;
- arbitrary nested graphs inside a transform;
- reusable subflows or procedures;
- named input/output ports;
- multi-source or join fan-in;
- SQL optimization or shared-build reuse;
- atomic multi-sink publication groups;
- cross-connection transfer;
- dbt materialization changes;
- new providers;
- a universal asset catalog.

## Validation for this proposal PR

This PR is documentation-only. It claims no runtime behavior.

Required repository-native checks before merge readiness:

- Markdown lint for this file;
- feature-mechanization validation;
- docs synchronization and governance refresh when required;
- PR title validation;
- `pnpm verify:prepush`.

```feature-mechanization
version: 1
featureId: PTH2-SQL-FIRST-DAG-SIMPLIFICATION
mechanizationStatus: proposed
noHumanDecisionsRemaining: false
implementationPlan: docs/planning/proposals/mandatory/runtime-and-contracts/sql-first-dag-transform-taxonomy-plan-20260819.md
userStories:
  - https://github.com/dunay2/dvt/issues/2524
  - https://github.com/dunay2/dvt/issues/2523
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/adr/ADR-0003-execution-model.md
  - docs/adr/ADR-0012-plan-integrity-ownership.md
  - docs/adr/ADR-0017_ExecutionPlan_Schema_Versioning.md
  - docs/adr/ADR-0035-planner-public-contract-evolution-protocol.md
allowedImplementationSurfaces:
  - packages/@dvt/contracts/src/contracts/planner/**
  - packages/@dvt/planner/src/**
  - apps/web/src/app/plugins/dvt/**
  - apps/web/src/app/views/canvas/previewGraphNodePayloads.ts
  - apps/web/src/app/views/canvas/previewCompilerGraphSource.ts
  - apps/api/src/modules/planCompileBoundary.ts
  - packages/@dvt/adapter-postgres/**
  - packages/@dvt/adapter-temporal/**
  - apps/temporal-worker/**
forbiddenImplementationSurfaces:
  - new graph stores
  - new command buses
  - new edge validators
  - new native transform kinds
  - nested graph containers
  - optimizer frameworks
commandQueryRails:
  - name: SaveCanvasAuthoringDraft
    type: command
    dddOwner: WorkspaceGraphAuthoringDraft
  - name: ProjectSelectedExecutableSubgraph
    type: query
    dddOwner: Planner executable subgraph
  - name: PreviewExecutionPlan
    type: command
    dddOwner: Planner compile boundary
  - name: StartRun
    type: command
    dddOwner: Engine run lifecycle
redGreenCycles:
  - id: v2-fail-closed
    redTest: selected V2 graph with two transforms or two sinks
    expectedFailure: Preview silently chooses first role matches
    greenTest: Preview returns explicit unsupported-topology diagnostics
  - id: v3-chain-and-fanout
    redTest: Source -> T1 -> T2 -> Sink A and Sink B
    expectedFailure: current V2 contract requires a fixed three-node chain
    greenTest: V3 emits one deterministic semantic step per sink
negativeTests:
  - Preview cannot discard selected nodes or edges.
  - Transform fan-in cannot pass V1 admission.
  - Mixed ConnectionRefs cannot pass V1 admission.
  - A transform cannot contain an arbitrary nested graph.
```

## Planning disposition

- #2524 owns implementation and acceptance.
- #2523 owns versioned publication.
- An ADR is required only for the durable publication principle in #2523 and any
  future cross-asset atomic publish group. This simplification does not require
  a new transform-taxonomy ADR.
- No implementation starts merely because this proposal exists.
