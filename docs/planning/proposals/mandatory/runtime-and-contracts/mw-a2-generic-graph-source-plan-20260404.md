---
title: MW-A2 GenericGraphSource Plan 2026-04-04
status: Active
owner: Product / Architecture / Delivery
last_reviewed: 2026-04-04
planning_type: proposal
---

# MW-A2 GenericGraphSource Plan 2026-04-04

## Summary

`MW-A2` is the highest product-impact planner slice because it removes the
dbt-only ingress assumption from the planning boundary.

The goal is not "replace dbt". The goal is:

- keep dbt as one supported source
- stop treating dbt manifest format as the planner's only input model
- make multi-workflow planning real instead of theoretical

## Governing rationale

- `ADR-0003` requires DVT-owned semantics instead of provider-owned semantics.
- `ADR-0012` keeps byte-level artifact retrieval out of the core planner and
  engine domains.
- `ADR-0017` requires governed versioning and compatibility instead of silent
  contract drift.
- `ADR-0034` requires cross-context communication through shared contracts,
  refs, and application-layer orchestration rather than peer-domain imports.
- `ADR-0035` requires planner public contract evolution to be explicit and
  governed.

## Current baseline

The repo already has:

- `PlannerGraphSourceV1`
- `PlannerFacade`
- `IArtifactResolver.resolveGraphSource(...)`
- `ManifestGraphDeriver`
- `ManifestArtifactResolver`

But the current normalized graph boundary is still too dbt-shaped to support
general workflow sources cleanly:

- node shape is `resourceType` based, not `stepKind` based
- resolver seam is manifest-specific
- dbt compatibility path is still the semantic center of the boundary

## Decision

The target model for `MW-A2` is:

1. `GenericGraphSource` is the canonical planner input.
2. dbt manifest ingestion becomes one compatibility adapter into that model.
3. `PlannerFacade` remains the application boundary.
4. The planner core remains deterministic and source-agnostic.
5. Step-kind validation and runtime execution generalization stay sequenced
   behind `MW-A1`, `MW-A3`, and `MW-C1`.

This slice is therefore a boundary-and-contract generalization, not a worker
runtime rewrite.

## Documentation delivered in this slice

- `docs/guides/generic-graph-source-technical-manual-20260404.md`
- `docs/guides/generic-graph-source-user-manual-20260404.md`

These documents are the canonical target description for the slice.

## Docs-as-strong-gate rule

`MW-A2` uses a hard documentation gate before implementation:

- `MW-A2-A` must freeze target model, procedures, invariants, and negative
  paths with as-is and to-be diagrams.
- no implementation PR for `MW-A2-B/C/D/E` is accepted if it changes behavior
  not described in the manuals and this proposal.

TDD begins only after this gate is accepted.

## Target classes and procedures

The target collaborator model is:

- `PlannerFacade`
- `IGraphSourceResolver`
- `GenericGraphSourceValidator`
- `DbtManifestGraphSourceAdapter`
- `GraphSourceStepTranslator`
- `GraphBuilder`
- `NodeSelector`
- `PlanAssembler`

The main procedures are:

1. direct inline generic graph planning
2. ref-based graph-source resolution
3. dbt manifest adaptation into generic graph source
4. deterministic plan assembly from the normalized graph

## Invariants to lock

- exactly one active graph source per request
- generic graph source is the canonical planner boundary
- every node id is unique
- every dependency target exists
- graph is acyclic before plan assembly
- step ordering is deterministic and not caller-order driven
- dbt is a source adapter, not the planner's semantic core
- ref-based graph sources use immutable, integrity-verifiable references
- provenance-only fields (`sourceFamily`, `sourceVersion`, node `metadata`) do
  not change `inputHashSha256` or `planId` in `MW-A2`

## Negative-path test requirements

Contract level:

- reject duplicate node ids
- reject missing dependency targets
- reject empty graph source
- reject missing `stepKind` in target node model
- reject malformed source refs

Planner boundary:

- reject no-source and multi-source envelopes
- reject malformed resolver output
- reject untranslatable generic nodes
- reject invalid selections
- reject cycles before plan assembly

Compatibility adapter:

- reject malformed dbt manifests
- reject integrity mismatch on ref resolution
- reject unsupported source-ref schemes
- prove dbt key-order noise does not change normalized output

Determinism identity:

- prove provenance-only graph-source differences do not change `planId`
- prove semantic node/edge equivalence yields stable `planId` regardless of
  input order

## Wave plan

### MW-A2-A Documentation and target freeze

Outcome:

- target technical manual and user manual published
- lane decomposition explicit
- invariants and negative tests frozen before code changes

### MW-A2-B Shared contract evolution

Outcome:

- additive `GenericGraphSourceV1` contract lands in `@dvt/contracts`
- current `PlannerGraphSourceV1` becomes compatibility alias or migration seam
- parser/schema/fixture coverage is updated

TDD entry criteria:

- failing contract tests exist first for node shape, refs, and negative paths
- deterministic identity expectations are codified before contract mutation

### MW-A2-C Planner boundary evolution

Outcome:

- planner boundary accepts the generic graph source contract
- graph-source translation is explicit and no longer dbt-centered
- `ManifestGraphDeriver` is demoted to a dbt adapter path

TDD entry criteria:

- failing planner-boundary tests exist for translation failures, source
  ambiguity, and graph invariants

### MW-A2-D API and ref-resolution alignment

Outcome:

- application wiring accepts direct generic graph inputs and ref-based
  resolution
- manifest-specific resolver naming is retired from the canonical story

TDD entry criteria:

- failing API and resolver tests exist for malformed refs, unsupported schemes,
  and invalid resolved payloads

### MW-A2-E Determinism and integration hardening

Outcome:

- key-order determinism is tested
- mixed-source and failure-path coverage is explicit
- planner/API integration tests prove the new boundary

TDD entry criteria:

- failing determinism vectors exist before hardening changes
- failing negative integration vectors exist for all frozen invariants

## Lane mapping

- `MW-A2-A`: docs and target freeze
- `MW-A2-B`: contract additive evolution
- `MW-A2-C`: planner application refactor
- `MW-A2-D`: API and resolver adoption
- `MW-A2-E`: deterministic and negative-path coverage

## Dependencies and non-goals

Dependencies:

- `MW-A1` remains the step-kind governance slice
- `MW-A3` remains the artifact-model generalization slice
- `MW-C1` remains the execution-layer dispatcher slice
- `MW-D1` remains the external SDK/API slice

Non-goals:

- runtime execution of every non-dbt step kind
- artifact model redesign
- worker routing model
- provider-specific behavior in planner contracts

## Validation baseline

For the future implementation slices:

```bash
pnpm --filter @dvt/contracts build
pnpm --filter @dvt/contracts test
pnpm --filter @dvt/planner build
pnpm --filter @dvt/planner test
pnpm --filter dvt-api test
pnpm verify:prepush
```

For this planning/documentation slice:

```bash
pnpm docs:workboard:generate
pnpm docs:sync
pnpm verify:prepush
```
