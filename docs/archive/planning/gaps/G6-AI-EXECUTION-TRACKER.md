---
title: G6 - AI Execution Tracker
status: Archived
owner: Delivery / Engineering
last_reviewed: 2026-03-20
planning_type: execution-plan
---

# G6 - AI Execution Tracker

Historical planning artifact retained for reference. `G6` is closed; active
status lives in [Gap Execution Plans](../../../planning/gaps/GAP_EXECUTION_PLANS.md).

Operational tracker for AI-assisted execution of the remaining `G6` work.

## Authority Rule

- Canonical spec: [G6 OpenLineage CI and Schema Pin Plan](../../../planning/gaps/g6/G6-OPENLINEAGE-CI-SCHEMA-PIN-PLAN.md)
- Active status doc: [DVT+ - Gap Execution Plans](../../../planning/gaps/GAP_EXECUTION_PLANS.md)

This file is not a second source of truth. Its job is narrower:

- record the current execution pointer for AI work;
- show what remains in `G6` after `#405` and `#408`;
- make the next validation lane explicit;
- leave a short execution log.

If this tracker conflicts with the canonical plan, update the canonical plan
first and then sync this tracker.

## Current Pointer

Update this section before any substantial implementation turn.

- `as_of`: `2026-03-12`
- `gap`: `G6`
- `epic`: `#406`
- `current_focus`: `G6 Closed`
- `state`: `Closed`
- `currently_working_on`: `nothing — G6 is fully closed`
- `next_after_current`: `G7 or G8`
- `blocking_dependencies`: none
- `last_completed`: `#406 Slice 5 — CI scripts wired, Evidence Doc written, system-delivery-status.md + GAP_EXECUTION_PLANS.md synced, G6 Closed 2026-03-12`

## Remaining G6 Roadmap

- `Slice 3 / #404`
  scope: deterministic golden fixtures for all 3 mapper paths (success, fail-open, no-compiledCodeRef)
  exit signal: committed fixture files; mapper output drift visible as PR diff
- `Slice 4 / #407`
  scope: offline JSON schema validation of emitted facets against local contract artifacts
  exit signal: `test:lineage:schema` lane validates both `sql` and `dvt_dbt_details` facets offline
- `Slice 5 / #406`
  scope: CI verification tuple wired in package.json scripts; status docs closed
  exit signal: all three commands in the closure tuple pass; G6 marked Closed

## Execution Protocol For AI

1. Before code changes, update [Current Pointer](#current-pointer).
2. If scope or acceptance changes, update the canonical plan first, then this tracker.
3. Keep the current stage tied to one GitHub issue at a time.
4. Record the touched-files plan before implementation for the active stage.
5. After each validation batch, append an execution-log entry with exact commands and pass/fail state.
6. When a stage closes, sync this tracker, [GAP_EXECUTION_PLANS.md](../../../planning/gaps/GAP_EXECUTION_PLANS.md), and affected status docs in the same change.

## Stage Detail

### Slice 3 / G6.3 — Golden fixtures (#404)

Think-first analysis:

- problem summary: the existing mapper tests assert correct output via inline
  `toEqual`, which proves correctness but makes shape drift invisible in PR diffs;
  golden fixture files make the full serialized output surface reviewable
- constraints and invariants:
  - must not remove or weaken the existing `toEqual` coverage
  - fixture files must be committed alongside the test so drift fails CI
  - must cover all 3 mapper paths: success, fail-open, no-compiledCodeRef
  - no new runtime dependencies — devDependency only (Vitest already available)
- options considered:
  - Vitest inline snapshots (`toMatchInlineSnapshot`) — diffs in test file
  - Vitest file snapshots (`toMatchFileSnapshot`) — diffs in separate JSON files
  - hand-written fixture JSON + manual deepEqual — most explicit, no framework magic
- selected option and rationale:
  - `toMatchFileSnapshot` from Vitest — idiomatic for this test runner, produces
    committed JSON files, drift becomes a PR diff in the fixture file rather than
    buried in test source; `--update-snapshots` regenerates them intentionally
- rejected alternatives:
  - inline snapshots were rejected because they bury the diff in test code
  - hand-written fixtures were rejected as equivalent to the existing `toEqual` tests

Pre-implementation brief:

- scope:
  - new file `test/lineage/StepStartedLineageMapper.golden.test.ts`
  - fixture files auto-generated under `test/fixtures/lineage/` on first run
  - 3 golden comparisons: success path, fail-open path, no-compiledCodeRef path
- touched files or paths:
  - `packages/@dvt/traceability-service/test/lineage/StepStartedLineageMapper.golden.test.ts` (new)
  - `packages/@dvt/traceability-service/test/fixtures/lineage/mapper-success.json` (generated)
  - `packages/@dvt/traceability-service/test/fixtures/lineage/mapper-fail-open.json` (generated)
  - `packages/@dvt/traceability-service/test/fixtures/lineage/mapper-no-ref.json` (generated)
- expected outcome:
  - `pnpm --filter @dvt/traceability-service test` passes with all fixture files committed
  - changing mapper output causes test failure with a clear JSON diff
- validation plan:
  - `pnpm exec eslint ... --max-warnings 0`
  - `pnpm --filter @dvt/traceability-service typecheck`
  - `pnpm --filter @dvt/traceability-service test`

### Slice 4 / G6.4 — Schema validation (#407)

Think-first analysis:

- problem summary: the emitted facets are type-checked but never validated against
  the local JSON Schema contract artifacts; a breaking change to a schema constant
  or facet shape could pass TypeScript but violate the published contract
- constraints and invariants:
  - validation must run offline — no network calls in tests
  - must validate against the exact repo-local schema files, not against the `_schemaURL` remote
  - schemas use JSON Schema draft 2020-12; need a validator that supports it
  - the `_producer` field has `format: uri` — format validation must be enabled
  - no new runtime dependencies — AJV as devDependency only
- options considered:
  - `ajv` v8 + `ajv-formats` — full draft 2020-12 support, standard in the ecosystem
  - manual field-by-field assertions — equivalent to existing toEqual, no schema coverage
  - `@cfworker/json-schema` — smaller, but less ecosystem support
- selected option and rationale:
  - `ajv` v8 + `ajv-formats` as devDependencies
  - rationale: the only validator with proven draft 2020-12 + `additionalProperties: false`
    support in the Node ecosystem; format validation for `uri` works out of the box
- rejected alternatives:
  - manual assertions were rejected: they duplicate the schema, not validate against it
  - `@cfworker/json-schema` was rejected: less mature, no clear `ajv-formats` equivalent

Pre-implementation brief:

- scope:
  - new file `test/lineage/facetSchema.validation.test.ts`
  - loads both schema files from `docs/contracts/traceability/facets/` at test time
  - compiles validators with AJV + ajv-formats
  - validates success-path output (both `sql` and `dvt_dbt_details` facets)
  - validates fail-open output (`dvt_dbt_details` only — no `sql` facet emitted)
  - asserts zero validation errors for all valid paths
- touched files or paths:
  - `packages/@dvt/traceability-service/package.json` (add ajv + ajv-formats devDeps)
  - `packages/@dvt/traceability-service/test/lineage/facetSchema.validation.test.ts` (new)
- expected outcome:
  - `pnpm --filter @dvt/traceability-service test` covers schema validation
  - changing `_schemaURL` constant or removing a required field causes test failure
- validation plan:
  - `pnpm exec eslint ... --max-warnings 0`
  - `pnpm --filter @dvt/traceability-service typecheck`
  - `pnpm --filter @dvt/traceability-service test`

### Slice 5 / G6.5 — CI wiring (#406)

Pre-implementation brief:

- scope:
  - add `test:lineage:golden` and `test:lineage:schema` scripts to `package.json`
  - update `verification_cmd` in `GAP_EXECUTION_PLANS.md`
  - sync `system-delivery-status.md` and write Evidence Doc
  - mark G6 Closed in all status docs
- touched files or paths:
  - `packages/@dvt/traceability-service/package.json`
  - `docs/planning/gaps/GAP_EXECUTION_PLANS.md`
  - `docs/architecture/system-delivery-status.md`
  - `docs/evidence/ED-20260312-g6-golden-schema-closeout.md` (new)

## Execution Log

- `2026-03-12` `G6` `planning`
  summary: created G6-AI-EXECUTION-TRACKER.md; established think-first and pre-implementation briefs for Slices 3, 4, and 5; baseline confirmed — existing mapper tests pass, 3 paths covered by inline assertions, both JSON Schema contract artifacts exist under docs/contracts/traceability/facets/
  validation: repo inspection of `StepStartedLineageMapper.ts`, existing tests, schema files, and `G6-OPENLINEAGE-CI-SCHEMA-PIN-PLAN.md`

- `2026-03-12` `G6.3 / #404` `done`
  summary: created `StepStartedLineageMapper.golden.test.ts` with `toMatchFileSnapshot` for 3 paths; fixture files generated and committed: `mapper-success.json`, `mapper-fail-open.json`, `mapper-no-ref.json`
  validation: `pnpm --filter @dvt/traceability-service test` — 3/3 golden tests pass (5 files, 13 tests total)

- `2026-03-12` `G6.4 / #407` `done`
  summary: created `facetSchema.validation.test.ts`; added `ajv@^8.17.1` + `ajv-formats@^3.0.1` as devDependencies; uses `Ajv2020` (draft 2020-12) + `ajv.addKeyword('x-dvt-provenance')` to register vendor extension keyword; validates both `sql` and `dvt_dbt_details` facets offline against repo-local schema files
  validation: `pnpm --filter @dvt/traceability-service test` — 3/3 schema tests pass; 13/13 total

- `2026-03-12` `G6.5 / #406` `done — G6 Closed`
  summary: added `test:lineage:golden` and `test:lineage:schema` scripts to `package.json`; updated `GAP_EXECUTION_PLANS.md` G6 row (Partial → Closed, updated test_paths, verification_cmd, Delivered, Remaining); updated `system-delivery-status.md` (Gap Summary row + Observability section + Executive Summary row); wrote `ED-20260312-g6-golden-schema-closeout.md`
  validation: `pnpm --filter @dvt/traceability-service test:lineage:golden` — 3/3 pass; `pnpm --filter @dvt/traceability-service test:lineage:schema` — 3/3 pass
