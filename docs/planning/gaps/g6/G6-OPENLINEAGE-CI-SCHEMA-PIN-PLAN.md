---
title: G6 OpenLineage CI and Schema Pin Plan
status: Proposed
owner: Core Architecture / Traceability / Docs
last_reviewed: 2026-03-08
planning_type: proposal
---

# G6 OpenLineage CI and Schema Pin Plan

## Goal

Close `G6` by making the current OpenLineage translation surface in
`@dvt/traceability-service` deterministic, schema-pinned, and hermetically
validated in CI.

## Canonical Anchors

- [Glossary](../../../concepts/glossary.md) for `traceability`,
  `schema pin`, `canonical spec`, `verification tuple`, and `golden fixture`
- [Domain Language](../../../concepts/domain-language.md) for the distinction
  between planning docs, status docs, and normative contract artifacts
- [G6 hub](index.md) for the dedicated planning entry point for this gap
- [Canonical Doc Code Matrix](../../status/canonical-doc-code-matrix.md) for
  the curated doc -> code -> test -> command mapping
- [System Delivery Status](../../../architecture/system-delivery-status.md) for
  the current cross-system implementation baseline

## Why This Gap Exists

The repo already has package-level lineage primitives:

- [`StepStartedLineageMapper`](../../../../packages/@dvt/traceability-service/src/lineage/mapper/StepStartedLineageMapper.ts)
- [`SqlJobFacetBuilder`](../../../../packages/@dvt/traceability-service/src/lineage/facets/SqlJobFacetBuilder.ts)
- [`CachedRetryCompiledCodeResolver`](../../../../packages/@dvt/traceability-service/src/lineage/resolver/CachedRetryCompiledCodeResolver.ts)
- package tests for mapper and resolver behavior

What is still missing:

- `_schemaURL` pin in emitted OpenLineage facet payloads;
- deterministic golden regression coverage for mapper output;
- offline schema validation against the pinned facet contract;
- explicit CI hardening focused on OpenLineage translation drift.

## Scope

### In Scope

- package-scoped translation from DVT run events to OpenLineage job facets;
- contract governance for both emitted facets: standard SQL facet plus
  `dvt_dbt_details`;
- deterministic tests for successful and fail-open mapping paths;
- hermetic resolver behavior in test runs;
- CI/documentation closure for this package boundary.

### Out Of Scope

- full OpenLineage event envelope delivery;
- `_outbox_lineage` transport/runtime design;
- Marquez connectivity, retries, or fail-open publication runtime;
- production lineage worker operations.

Those concerns remain in `G10`.

## Consolidated Planning Inputs

This plan combines:

- existing repo findings from the architectural reviews and gap trackers;
- the current `G6` entry in [Gap Execution Plans](../GAP_EXECUTION_PLANS.md);
- the current status board in [System Delivery Status](../../../architecture/system-delivery-status.md);
- the workshop ideas gathered for deterministic OL translation hardening.

### Accepted Directly

- golden-file integration tests for emitted OpenLineage payloads;
- `_schemaURL` centralized in one constant;
- governance of the full emitted mapper surface, not only the standard SQL
  facet;
- schema validation in test runs;
- explicit documentation of the pinned schema version;
- CI checks that fail on schema drift.

### Accepted With Narrowing

- reproducibility of resolver behavior:
  use fresh in-memory cache instances and bounded zero-delay retry policy in
  tests instead of introducing synthetic clock mocking where it is not needed.
- structural diff reporting:
  use stable JSON fixtures and normal object equality; do not introduce a
  separate visualization tool unless diffs become hard to review.

### Deferred

- full end-to-end OpenLineage runtime smoke tests;
- network fetch of the external OpenLineage schema during CI;
- delivery/runtime hardening outside package scope.

Secondary guardrail:

- literal-usage enforcement for `_schemaURL` may start as a package-level script
  or focused test; promote to custom ESLint rule only if drift keeps recurring.

## Planning Decisions To Lock Before Closure

For planning purposes, this document now assumes the following target
decisions.

### Decision 1 - Contract Boundary

`G6` governs both emitted facets:

- the standard SQL facet;
- the custom `dvt_dbt_details` facet.

Rationale:

- both are part of the actual mapper output surface;
- closing only the SQL facet would leave partial contract governance.

### Decision 2 - Verification Must Be Mandatory

Golden validation and schema validation are mandatory closure gates, not
optional implementation details.

Rationale:

- `G6` exists to harden deterministic translation behavior;
- that hardening is not auditable if it remains implicit in a broad package test
  command.

### Decision 3 - Final Closure Requires A Normative Artifact

The planning document can remain the execution guide, but final closure must add
one normative artifact for the emitted facet contract.

Rationale:

- planning and normative contract are different governance assets;
- the package output should not remain governed only by prose planning docs.

## Target Output Shape

`G6` should leave the package in a state where:

- SQL facet payloads carry a pinned `_schemaURL`;
- both emitted facets are governed by explicit contract artifacts;
- the pin is expressed as a single exported constant;
- mapper output is regression-tested against committed golden fixtures;
- the pinned SQL facet is validated against a vendored schema copy;
- CI fails deterministically when mapper output or schema contract drifts.

## Proposed Implementation Sequence

### Phase 1 - Freeze the facet contract

Introduce a dedicated lineage schema module, for example:

- `packages/@dvt/traceability-service/src/lineage/openlineageSchema.ts`

Responsibilities:

- define the pinned SQL facet schema URL constant;
- expose literal types for the pinned schema URL;
- keep schema-related constants out of ad hoc mapper code.

Acceptance:

- `SqlJobFacetBuilder` no longer hardcodes or omits schema metadata;
- the package has one source of truth for the SQL facet schema pin.

### Phase 2 - Align the emitted SQL facet shape

Update the emitted facet types and builders so the real mapper output matches
the chosen governed contract shape.

Minimum expectation for this phase:

- `SqlJobFacet` type reflects the pinned payload shape;
- `DvtDbtDetailsFacet` is treated as governed output, not only as an ad hoc
  local shape;
- builder output is contract-shaped and stable;
- mapper tests assert the exact emitted facet object, not only the SQL string.

Recommended contract split:

- SQL facet validated against the vendored pinned OpenLineage schema;
- `dvt_dbt_details` validated against a local normative artifact under repo
  control.

### Phase 2.5 - Introduce a normative artifact

Add one normative artifact for the emitted facet contract before closure.

Acceptable first homes:

- a versioned schema file near the package implementation;
- a contract document under architecture/contracts if the surface is promoted as
  a broader canonical contract.

Acceptance:

- the emitted payload contract no longer depends only on the planning document;
- closure can reference both execution planning and a normative artifact.

### Phase 3 - Add deterministic golden tests

Commit a small fixture set under the traceability-service package, for example:

- success path with compiled SQL;
- fail-open path when compiled code resolution fails;
- no-facet path when no compiledCodeRef is present.

Guidelines:

- compare against committed JSON golden files rather than inline snapshots;
- keep input fixtures fully deterministic;
- do not include volatile fields unless they are fixed by fixture.

Acceptance:

- a meaningful mapper output diff is visible in PR review;
- accidental translation drift fails package tests.

### Phase 4 - Add offline schema validation

Vendor the pinned OpenLineage SQL facet schema into the repo and validate the
emitted SQL facet payload against that local copy during tests.

Guidelines:

- do not depend on network access in CI;
- validate against the exact pinned version referenced by `_schemaURL`;
- fail if the vendored schema and emitted `_schemaURL` diverge.

Acceptance:

- schema drift is caught without relying on external availability;
- test failures clearly distinguish contract drift from business logic drift.

### Phase 5 - Wire CI and repo-level verification

Keep the existing package test lane, but introduce explicit mandatory
OpenLineage-focused verification commands before closure.

Recommended target closure tuple:

- `pnpm --filter @dvt/traceability-service test`
- `pnpm --filter @dvt/traceability-service test:lineage:golden`
- `pnpm --filter @dvt/traceability-service test:lineage:schema`
- `pnpm traceability:adr0`

Equivalent commands are acceptable, but closure must keep:

- one explicit golden validation command;
- one explicit schema validation command;
- one package-wide regression lane.

Acceptance:

- PR review can point to one explicit command set that proves `G6`;
- drift in schema pin or golden outputs is part of normal CI feedback.

### Phase 6 - Close documentation and status references

Update the planning and status documents so `G6` no longer depends on scattered
tribal knowledge.

Minimum updates:

- [Gap Execution Plans](../GAP_EXECUTION_PLANS.md)
- [Canonical Doc Code Matrix](../../status/canonical-doc-code-matrix.md)
- [System Delivery Status](../../../architecture/system-delivery-status.md)
- evidence doc or residual risk record, depending on whether the gap closes

Acceptance:

- MkDocs has a navigable home for `G6`;
- the repo has one planning entrypoint for this gap.

## Definition Of Done

`G6` should be considered closed only when all of the following are true.

### Contract

- SQL facet payload includes the pinned `_schemaURL`;
- the schema URL is defined in one exported constant;
- both emitted facets are governed by explicit contract artifacts;
- emitted facet shape is type-checked and test-asserted.

### Testing

- deterministic golden fixtures exist for the main mapper paths;
- schema validation runs against a vendored pinned schema;
- resolver-related tests are hermetic and do not depend on prior cache state.

### CI

- there is an explicit verification command tuple for `G6`;
- schema drift and golden drift both fail CI.

### Documentation

- `planning/gaps/g6/` is the planning hub for this gap;
- `GAP_EXECUTION_PLANS.md` points to the dedicated `G6` plan;
- status docs no longer describe `G6` only in generic terms.

## Recommended PR Slicing

Recommended base strategy: keep one story per PR.

Reason:

- each PR has one auditable closure target;
- review remains narrow enough for contract-sensitive changes;
- rollback is simpler if one slice needs redesign;
- the epic remains easy to track from GitHub Project and the G6 hub.

### PR-1 - `US-G6.1`

- issue: `#405`
- branch suggestion: `feat/g6-facet-contract-surface`
- content:
  - add lineage schema/constants module;
  - pin `_schemaURL` in one source of truth;
  - align emitted facet types for `sql` and `dvt_dbt_details`;
  - update mapper assertions to check full facet shape.
- expected blast radius:
  - `src/lineage/types.ts`
  - `src/lineage/contracts.ts`
  - `src/lineage/facets/SqlJobFacetBuilder.ts`
  - `src/lineage/mapper/StepStartedLineageMapper.ts`
  - existing mapper tests

### PR-2 - `US-G6.2`

- issue: `#408`
- branch suggestion: `feat/g6-lineage-contract-artifacts`
- content:
  - add the vendored SQL facet schema artifact;
  - add the local normative artifact for `dvt_dbt_details`;
  - document the canonical home of those artifacts.
- expected blast radius:
  - package-local contract/schema artifacts;
  - G6 planning and status references only where needed

### PR-3 - `US-G6.3`

- issue: `#404`
- branch suggestion: `test/g6-lineage-goldens`
- content:
  - add deterministic mapper fixtures;
  - add golden outputs for success/fail-open/no-facet paths;
  - make mapper drift visible in test review.
- expected blast radius:
  - `test/lineage/fixtures/*`
  - `test/lineage/golden/*`
  - mapper golden test files

### PR-4 - `US-G6.4`

- issue: `#407`
- branch suggestion: `test/g6-lineage-schema-validation`
- content:
  - add offline schema validation against vendored artifacts;
  - harden resolver validation paths;
  - ensure tests are hermetic and non-networked.
- expected blast radius:
  - schema validation helpers/tests;
  - resolver tests;
  - possibly package test scripts

### PR-5 - `US-G6.5`

- issue: `#406`
- branch suggestion: `chore/g6-ci-closeout`
- content:
  - wire the mandatory verification tuple into CI;
  - update gap/status/evidence docs for final closeout posture;
  - record final commands as the canonical closure tuple.
- expected blast radius:
  - package scripts
  - CI workflows
  - planning/status/evidence docs

### Compressed Alternative

If throughput pressure is high and review capacity is strong, a secondary option
is to compress the five stories into four PRs:

1. `#405` + the minimal artifact skeleton from `#408`
2. `#404`
3. `#407` + the executable validation wiring of `#408`
4. `#406`

This is faster, but less clean from a traceability perspective. The default
recommendation remains one story per PR.

## Recommended Execution Sequence

The recommended delivery order is:

1. `#405` - govern both emitted facets and centralize schema constants
2. `#408` - add normative contract artifacts
3. `#404` - add deterministic golden regression coverage
4. `#407` - add offline schema validation and hermetic resolver validation
5. `#406` - wire the mandatory CI verification tuple and docs closeout

Dependency rationale:

- `#405` must land first because the emitted facet surface needs to stabilize
  before any durable contract, golden, or schema validation work is worth
  freezing.
- `#408` follows immediately because `#407` should validate against artifacts
  that already exist and are canonically placed.
- `#404` comes before `#407` because golden outputs are easier to review once
  the payload shape is stable but before validation helpers add extra noise.
- `#407` should land after contract artifacts and goldens so schema validation
  proves the already-reviewed payloads rather than defining them indirectly.
- `#406` stays last because CI and docs closeout should bind to the final
  command set and artifact layout, not a moving target.

## Story Dependencies

- `#405` blocks `#408`, `#404`, `#407`, and `#406`
- `#408` blocks `#407` and should be merged before `#406`
- `#404` should be merged before `#406`
- `#407` should be merged before `#406`
- `#406` is the closure slice and should not start as a merge candidate until
  the previous four stories are stable

## Risks To Control

- treating package-level mapper hardening as if it closed delivery/runtime debt;
- adding network-dependent schema validation that flakes in CI;
- validating only strings while leaving the emitted facet shape underspecified;
- pinning a schema URL in code without a matching vendored validation source;
- scattering `G6` planning across reviews and status docs again after this hub
  exists.

## Immediate Next Step

Start with `PR-1` / `#405` and keep the scope narrow:

1. pin the SQL facet `_schemaURL`;
2. formalize both emitted facet contracts;
3. add the initial normative artifact;
4. update the existing mapper tests to assert the contract shape exactly.
