---
title: ED-20260308 - G6 US-G6.1 facet contract surface
status: Final
date: 2026-03-08
owners: Traceability / Core Architecture / QA
arc_level: ARC-1
breaking: false
policy_version: 1
code_refs:
  - packages/@dvt/traceability-service/src/lineage/openlineageSchema.ts
  - packages/@dvt/traceability-service/src/lineage/types.ts
  - packages/@dvt/traceability-service/src/lineage/facets/SqlJobFacetBuilder.ts
  - packages/@dvt/traceability-service/src/lineage/mapper/StepStartedLineageMapper.ts
  - packages/@dvt/traceability-service/test/lineage/StepStartedLineageMapper.test.ts
contracts_touched:
  - id: SqlJobFacet
    version: OpenLineage 1-0-0 pin
    path: packages/@dvt/traceability-service/src/lineage/types.ts
  - id: dvt_dbt_details job facet
    version: local governed surface v1
    path: packages/@dvt/traceability-service/src/lineage/types.ts
evidence:
  issue:
    - https://github.com/dunay2/dvt/issues/405
  tests:
    - packages/@dvt/traceability-service/test/lineage/StepStartedLineageMapper.test.ts
    - packages/@dvt/traceability-service/test/lineage/CachedRetryCompiledCodeResolver.test.ts
    - packages/@dvt/traceability-service/test/lineage/compiledCodeRef.test.ts
  code:
    - packages/@dvt/traceability-service/src/lineage/openlineageSchema.ts
    - packages/@dvt/traceability-service/src/lineage/types.ts
    - packages/@dvt/traceability-service/src/lineage/facets/SqlJobFacetBuilder.ts
    - packages/@dvt/traceability-service/src/lineage/mapper/StepStartedLineageMapper.ts
    - packages/@dvt/traceability-service/src/lineage/index.ts
    - packages/@dvt/traceability-service/test/lineage/StepStartedLineageMapper.test.ts
planning_refs:
  - docs/planning/gaps/g6/G6-OPENLINEAGE-CI-SCHEMA-PIN-PLAN.md
  - docs/planning/gaps/g6/G6-ARCHITECTURE-QA-REVIEW-20260308.md
rollout:
  required: false
  notes: Package-local contract hardening only. No runtime rollout action required.
compatibility:
  required: true
  matrix: Backward compatible inside the current package boundary; no shared-kernel event contract changed.
---

# Evidence Doc: G6 US-G6.1 facet contract surface

## What changed

- Added a centralized lineage schema module for facet metadata and schema pins.
- Pinned the SQL facet to OpenLineage `1-0-0` with a single `_schemaURL`
  constant.
- Governed both emitted mapper facets, `sql` and `dvt_dbt_details`, with
  explicit `_producer` and `_schemaURL` metadata.
- Aligned the SQL facet shape to the real OpenLineage facet contract by emitting
  `query` at the facet top level instead of a nested `sql.query` object.
- Hardened mapper tests to assert the exact emitted facet payload rather than
  isolated leaf fields.

## Scope closed by this evidence

`US-G6.1` closes the contract-surface slice only:

- one source of truth for facet schema pins;
- governed emitted facet shapes in code;
- package-local regression coverage for the exact mapped payload.

This evidence does not close:

- vendored normative artifacts for schema validation;
- golden fixture lanes;
- offline schema validation helpers;
- final CI closeout wiring.

Those remain in `#408`, `#404`, `#407`, and `#406`.

## Verification snapshot

Executed on 2026-03-08:

- `pnpm --filter @dvt/traceability-service typecheck`
- `pnpm --filter @dvt/traceability-service test`

Result:

- both commands passed locally;
- `StepStartedLineageMapper` coverage now asserts the full `jobFacets` object
  for success and fail-open paths.

## Architectural notes

- The SQL facet now follows the OpenLineage facet object model with metadata at
  the facet root.
- The custom `dvt_dbt_details` facet is now treated as governed emitted surface,
  which prevents partial contract closure.
- The custom facet schema URL is intentionally stable and local to the repo so
  `US-G6.2` can add the normative artifact without changing the emitted payload
  again.

## Closure statement

`US-G6.1` is satisfied when the branch containing these changes is merged,
because the package contract surface is centralized, governed, and verified at
the unit-test boundary.
