---
title: ED-20260312 — G6 Golden Fixtures and Schema Validation Closeout
status: accepted
date: 2026-03-12
owners: Traceability / Engineering
arc_level: ARC-1
breaking: false
gap: G6
code_refs:
  - packages/@dvt/traceability-service/test/lineage/StepStartedLineageMapper.golden.test.ts
  - packages/@dvt/traceability-service/test/lineage/facetSchema.validation.test.ts
  - packages/@dvt/traceability-service/package.json
evidence:
  tests: []
  notes:
    - Golden fixtures are committed for success, fail-open, and no-compiledCodeRef paths.
    - Offline JSON schema validation runs against repo-local OpenLineage and DVT facet schemas.
    - Named CI lanes exist for lineage golden and schema validation.
slices: 'Slice 3 (#404), Slice 4 (#407), Slice 5 (#406)'
author: Delivery / Engineering
---

# ED-20260312 — G6 Golden Fixtures and Schema Validation Closeout

## Purpose

This Evidence Doc records the G6 closeout deliverables for Slices 3, 4, and 5:
committed golden fixtures for all three `StepStartedLineageMapper` paths, offline
JSON Schema validation for both emitted OpenLineage facets, and the CI wiring
that makes these verification lanes runnable by name.

## Closure Criteria

| Criterion                                                                                          | Met |
| -------------------------------------------------------------------------------------------------- | --- |
| Golden fixtures committed for success, fail-open, and no-compiledCodeRef paths                     | Yes |
| Fixture drift fails CI (test reads committed file, not re-emitted value)                           | Yes |
| Both `sql` and `dvt_dbt_details` facets validated against repo-local JSON Schema artifacts offline | Yes |
| Fail-open path schema validation passes even when `sql` facet is absent                            | Yes |
| `test:lineage:golden` and `test:lineage:schema` scripts wired in `package.json`                    | Yes |
| All 13 traceability-service tests pass                                                             | Yes |

## Slice 3 — Golden Fixtures (#404)

### Approach

`toMatchFileSnapshot` (Vitest) compares `JSON.stringify(result, null, 2)` against
committed JSON files under `test/fixtures/lineage/`. The three fixture files are
checked into the repository; any mapper output change becomes a PR diff.

### Test file

`packages/@dvt/traceability-service/test/lineage/StepStartedLineageMapper.golden.test.ts`

### Fixture files

| Fixture            | Path                                          |
| ------------------ | --------------------------------------------- |
| Success path       | `test/fixtures/lineage/mapper-success.json`   |
| Fail-open path     | `test/fixtures/lineage/mapper-fail-open.json` |
| No compiledCodeRef | `test/fixtures/lineage/mapper-no-ref.json`    |

### Success fixture excerpt

```json
{
  "jobFacets": {
    "dvt_dbt_details": {
      "_producer": "https://github.com/dunay2/dvt/tree/main/packages/@dvt/traceability-service",
      "_schemaURL": "https://dvt.local/contracts/traceability/facets/DvtDbtDetailsJobFacet.v1.schema.json",
      "compiledCodeRef": { ... }
    },
    "sql": {
      "_producer": "https://github.com/dunay2/dvt/tree/main/packages/@dvt/traceability-service",
      "_schemaURL": "https://openlineage.io/spec/facets/1-0-0/SqlJobFacet.json",
      "query": "select id, name from dim_customers where active = true"
    }
  },
  "warnings": []
}
```

## Slice 4 — Schema Validation (#407)

### Approach

`Ajv2020` (AJV v8 draft 2020-12) + `ajv-formats` validates both emitted facets
against the repo-local contract artifacts under
`docs/contracts/traceability/facets/`. No network calls — schemas are loaded
from the filesystem at test startup. Custom vendor extension keyword
`x-dvt-provenance` is registered before compilation to avoid strict-mode
rejection.

### Test file

`packages/@dvt/traceability-service/test/lineage/facetSchema.validation.test.ts`

### Schema artifacts validated

| Facet             | Schema file                                                                    |
| ----------------- | ------------------------------------------------------------------------------ |
| `sql`             | `docs/contracts/traceability/facets/openlineage/SqlJobFacet.1-0-0.schema.json` |
| `dvt_dbt_details` | `docs/contracts/traceability/facets/DvtDbtDetailsJobFacet.v1.schema.json`      |

### Test cases

| Test                                                                                       | Result |
| ------------------------------------------------------------------------------------------ | ------ |
| success path: sql facet validates against SqlJobFacet.1-0-0.schema.json                    | pass   |
| success path: dvt_dbt_details facet validates against DvtDbtDetailsJobFacet.v1.schema.json | pass   |
| fail-open path: dvt_dbt_details facet validates even when sql resolution fails             | pass   |

## Slice 5 — CI Wiring (#406)

### Scripts added to package.json

```json
"test:lineage:golden": "vitest run --config vitest.config.ts test/lineage/StepStartedLineageMapper.golden.test.ts",
"test:lineage:schema":  "vitest run --config vitest.config.ts test/lineage/facetSchema.validation.test.ts"
```

## Validation Run (2026-03-12)

```
pnpm --filter @dvt/traceability-service test

 ✓ test/lineage/compiledCodeRef.test.ts            (2 tests)
 ✓ test/lineage/StepStartedLineageMapper.golden.test.ts  (3 tests)
 ✓ test/lineage/StepStartedLineageMapper.test.ts   (3 tests)
 ✓ test/lineage/facetSchema.validation.test.ts     (3 tests)
 ✓ test/lineage/CachedRetryCompiledCodeResolver.test.ts  (2 tests)

 Test Files  5 passed (5)
       Tests  13 passed (13)
    Duration  825ms
```

```
pnpm --filter @dvt/traceability-service test:lineage:golden

 ✓ test/lineage/StepStartedLineageMapper.golden.test.ts  (3 tests)
 Test Files  1 passed (1)  Tests  3 passed (3)
```

```
pnpm --filter @dvt/traceability-service test:lineage:schema

 ✓ test/lineage/facetSchema.validation.test.ts  (3 tests)
 Test Files  1 passed (1)  Tests  3 passed (3)
```

## Traceability

- Gap: G6 — OpenLineage mapping tests CI + schema pin
- Historical tracker: [G6-AI-EXECUTION-TRACKER.md](../archive/planning/gaps/G6-AI-EXECUTION-TRACKER.md)
- Plan: [GAP_EXECUTION_PLANS.md](../planning/gaps/GAP_EXECUTION_PLANS.md)
- Prior evidence: [ED-20260308 G6 US-G6.1](ED-20260308-g6-us-g6-1-facet-contract-surface.md), [ED-20260308 G6 US-G6.2](ED-20260308-g6-us-g6-2-lineage-contract-artifacts.md)
