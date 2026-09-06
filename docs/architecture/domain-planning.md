---
title: Planning Domain
status: Active
owner: Architecture / Docs
last_reviewed: 2026-09-06
---

# Planning Domain

This domain owns plan derivation and validation before execution starts.

It covers planner orchestration, canonical graph-source admission, execution-plan
assembly, verification, deterministic interpretation, and DSL evaluation. It does
not own artifact publication, artifact reads, or artifact-reference enrichment.

Current target reading for graph-source generalization:

- [DB-first Component Map](./component-map.md)
- `docs/guides/generic-graph-source-user-manual-20260404.md`
- `docs/planning/proposals/mandatory/runtime-and-contracts/mw-a2-generic-graph-source-plan-20260404.md`

## Scope

- `@dvt/planner`
- `@dvt/plan-verifier`
- `@dvt/plan-interpreter`
- `@dvt/dsl`

## Current Interactions

```mermaid
flowchart LR
  SourceAdapter["Source / dbt adapter"] --> Graph["Canonical GenericGraphSource"]
  Graph --> Planner["@dvt/planner"]
  Planner --> Verifier["@dvt/plan-verifier"]
  Planner --> Interpreter["@dvt/plan-interpreter"]
  Planner --> DSL["@dvt/dsl"]
  Planner --> API["apps/api"]
  Planner --> Execution["@dvt/engine"]
```

## Current Responsibilities

- build execution plans from canonical `GenericGraphSource` inputs whose logical
  node identities have already been assigned by the owning authoring/source boundary;
- validate plan structure, integrity, and compatibility;
- provide deterministic DAG interpretation helpers used by runtimes;
- return execution-plan truth without performing artifact I/O or publishing runtime
  artifact references.

Raw dbt manifests are external-authority inputs. They are not a Planner identity
source. Adapter/application boundaries must translate them into the canonical graph
contract before Planner admission, preserving explicit logical IDs rather than
manufacturing them from manifest keys, names, paths, providers, or ordinals.

## Code Anchors

- [PlannerFacade.ts](../../packages/@dvt/planner/src/application/PlannerFacade.ts)
- [PlannerEnvelopeMapper.ts](../../packages/@dvt/planner/src/application/PlannerEnvelopeMapper.ts)
- [verify.ts](../../packages/@dvt/plan-verifier/src/verify.ts)
- [dagAnalyzer.ts](../../packages/@dvt/plan-interpreter/src/dagAnalyzer.ts)

## Current Posture

The planning domain is already on the runtime path. `RC-G1-D` closed the
planner-private behavior-port ownership drift by moving those ports to
`@dvt/planner` while keeping shared serializable vocabulary in `@dvt/contracts`.

ADR-0067 and PR #2967 then completed the artifact hard cut: Planner publishes no
artifacts, exposes no artifact-storage compatibility bridge, and does not own the
generic runtime artifact-reference model. `@dvt/artifacts` owns canonical immutable
artifact publication/read/integrity, while `StepArtifactRef` is the step-kind-agnostic
runtime reference contract.

The remaining planning work is therefore plan-record and plan-store formalization,
not artifact publication or compiled-code enrichment.

## Queued Delta

- `S08`: formalize the plan-record and plan-store model without moving artifact
  publication back into Planner.
- `RC-G1-D`: delivered. Planner-private behavior ports are owner-local in
  `@dvt/planner`, with semantic architecture coverage guarding the split from
  shared serializable planner vocabulary.
- `MW-A2`: `GenericGraphSource` is the canonical planner input. GH-2904 hard-cuts
  the obsolete direct manifest-to-Planner compatibility bridge; source-specific
  translation remains outside the Planner boundary.

## Domain Rules

- Planning produces inputs to execution. It does not own runtime state
  transitions after admission succeeds.
- Planner consumes explicit logical graph identity and must not mint or repair it
  from physical bindings, names, paths, provider coordinates, manifest keys, or
  ordinals.
- Verifier, interpreter, and DSL packages should stay narrow and deterministic.
- Planner does not publish or read artifacts and must not expose artifact-storage
  bridges or compatibility aliases.
- Runtime artifact identity is expressed through the generic `StepArtifactRef`
  contract; artifact I/O and integrity belong to `@dvt/artifacts`.

## Related Pages

- [Planner and Contracts planning view](../planning/domains/planner-and-contracts.md)
- [DVT Component Map](./component-map.md)
- [System Delivery Status](./system-delivery-status.md)
- [Shared Package Architecture](./shared/index.md)
- [ADR-0067](../adr/ADR-0067-canonical-artifact-authority-and-compiled-code-hard-cut.md)
