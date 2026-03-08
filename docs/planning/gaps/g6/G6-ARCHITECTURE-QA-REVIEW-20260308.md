---
title: G6 Architecture and QA Review
status: Review
owner: Core Architecture / Traceability / QA
last_reviewed: 2026-03-08
planning_type: review
---

# G6 Architecture and QA Review

## Audience And Purpose

This document is intended for architect and CTO review before `G6` moves from
planning into implementation.

Its purpose is to answer six practical questions:

1. Is the current `G6` plan coherent with the actual repository baseline?
2. Is the scope split between `G6` and `G10` architecturally correct?
3. Is the current plan sufficient for closure, or only sufficient to start?
4. Does the proposed direction meet QA and product-quality expectations?
5. Is the planning material well organized and navigable?
6. Does the current package shape respect OOP, SOLID, Hexagonal, and CQRS
   principles in a defensible way?

## Canonical Anchors

- [Glossary](../../../concepts/glossary.md) for `traceability`,
  `schema pin`, `canonical spec`, and `verification tuple`
- [Domain Language](../../../concepts/domain-language.md) for the rule that
  planning, review, status, and contract docs must each keep a distinct role
- [G6 hub](index.md) for navigation across the active `G6` planning set
- [G6 OpenLineage CI and Schema Pin Plan](G6-OPENLINEAGE-CI-SCHEMA-PIN-PLAN.md)
  for the execution plan under review
- [Canonical Doc Code Matrix](../../status/canonical-doc-code-matrix.md) for
  the curated doc -> code -> test -> command mapping

## Executive Summary

The current `G6` planning set is directionally correct and materially better
than the previous state:

- the gap now has a dedicated planning home under
  [`docs/planning/gaps/g6/`](./index.md);
- package-level mapping hardening is clearly separated from lineage delivery
  runtime, which remains in `G10`;
- the plan is aligned with the real code baseline in
  `@dvt/traceability-service`;
- the proposed work is realistic for a Phase 1.5 package-hardening gap.

However, the current plan is not yet strong enough for final closure sign-off.

Three issues remain:

1. the custom `dvt_dbt_details` facet is emitted by the mapper but not yet
   governed by the same contract rigor as the SQL facet;
2. the CI verification contract is not fully mandatory in the plan language;
3. the canonical source for `G6` is still a planning document, not yet a
   normative payload contract.

Conclusion:

- architecturally coherent: yes;
- sufficient to start implementation: yes;
- sufficient to declare the gap closed today: no;
- QA-ready as a plan baseline: almost, but not fully.

## Discussion Alignment

Follow-up discussion around this review aligned with the core recommendations.

The strongest points of alignment were:

- govern both emitted facets, not only the standard SQL facet;
- make schema validation and golden validation mandatory CI gates;
- create a normative contract artifact before `G6` is considered closed.

There was also support for an additional `_schemaURL` drift guardrail, but the
recommended implementation order remains:

1. explicit contract artifact;
2. explicit verification commands;
3. optional literal-enforcement rule only if drift remains a recurring problem.

## Current Repository Baseline

The baseline package shape is small, understandable, and already structured
around ports and focused components.

Relevant code paths:

- mapper:
  [`packages/@dvt/traceability-service/src/lineage/mapper/StepStartedLineageMapper.ts`](../../../../packages/@dvt/traceability-service/src/lineage/mapper/StepStartedLineageMapper.ts)
- SQL facet builder:
  [`packages/@dvt/traceability-service/src/lineage/facets/SqlJobFacetBuilder.ts`](../../../../packages/@dvt/traceability-service/src/lineage/facets/SqlJobFacetBuilder.ts)
- contracts:
  [`packages/@dvt/traceability-service/src/lineage/contracts.ts`](../../../../packages/@dvt/traceability-service/src/lineage/contracts.ts)
- local types:
  [`packages/@dvt/traceability-service/src/lineage/types.ts`](../../../../packages/@dvt/traceability-service/src/lineage/types.ts)
- resolver:
  [`packages/@dvt/traceability-service/src/lineage/resolver/CachedRetryCompiledCodeResolver.ts`](../../../../packages/@dvt/traceability-service/src/lineage/resolver/CachedRetryCompiledCodeResolver.ts)
- reader composition:
  [`packages/@dvt/traceability-service/src/lineage/readers/CompositeCompiledCodeReader.ts`](../../../../packages/@dvt/traceability-service/src/lineage/readers/CompositeCompiledCodeReader.ts)
- cache:
  [`packages/@dvt/traceability-service/src/lineage/cache/InMemoryCompiledCodeCache.ts`](../../../../packages/@dvt/traceability-service/src/lineage/cache/InMemoryCompiledCodeCache.ts)

Current test posture:

- mapper unit tests:
  [`packages/@dvt/traceability-service/test/lineage/StepStartedLineageMapper.test.ts`](../../../../packages/@dvt/traceability-service/test/lineage/StepStartedLineageMapper.test.ts)
- resolver unit tests:
  [`packages/@dvt/traceability-service/test/lineage/CachedRetryCompiledCodeResolver.test.ts`](../../../../packages/@dvt/traceability-service/test/lineage/CachedRetryCompiledCodeResolver.test.ts)

What already exists:

- a mapper that translates `StepStarted` into package-local job facets;
- a fail-open behavior when compiled code resolution fails;
- a resolver with retry, cache, and integrity validation;
- a composable reader model by URI scheme;
- package-level tests that cover the main happy path and fail-open behavior.

What is still missing in code:

- `_schemaURL` in the emitted SQL facet shape;
- deterministic golden regression coverage;
- offline schema validation against the pinned contract;
- a formal contract decision for the custom `dvt_dbt_details` facet.

## Coherence Of The New G6 Scope

The new scope definition is coherent.

The dedicated `G6` hub correctly states that this gap is about:

- deterministic translation tests in CI;
- schema pinning for emitted OpenLineage facet payloads;
- hermetic validation of the pinned schema contract;
- mapper/resolver package hardening.

See:

- [`docs/planning/gaps/g6/index.md`](./index.md)
- [`docs/planning/gaps/g6/G6-OPENLINEAGE-CI-SCHEMA-PIN-PLAN.md`](G6-OPENLINEAGE-CI-SCHEMA-PIN-PLAN.md)

The exclusion of runtime delivery concerns is also correct.

That separation is important because the repo does not yet implement a full
OpenLineage delivery runtime or `outbox_lineage` worker. Treating package-level
mapping hardening as if it closed runtime delivery would create a false closure
signal and would blur the boundary with `G10`.

On this specific question, the current plan is architecturally sound.

## Is The Plan Sufficient

### Sufficient To Start

Yes.

The plan is sufficient to start because it already defines:

- a clear target for `_schemaURL` pinning;
- a deterministic test strategy using committed golden fixtures;
- offline schema validation instead of network-dependent CI;
- a practical PR slicing model;
- a narrow first step for implementation.

This is enough for engineering execution to begin without reopening the entire
architecture.

### Sufficient To Close

Not yet.

The current plan still leaves three closure-critical ambiguities unresolved.

#### 1. Custom facet contract remains undecided

The plan explicitly leaves open whether `G6` should formalize only the standard
SQL facet or also the custom `dvt_dbt_details` facet.

That is too open-ended for a closure-oriented plan because the mapper already
emits `dvt_dbt_details` as part of the real output surface:

- mapper base facets:
  [`packages/@dvt/traceability-service/src/lineage/mapper/StepStartedLineageMapper.ts`](../../../../packages/@dvt/traceability-service/src/lineage/mapper/StepStartedLineageMapper.ts)
- local facet types:
  [`packages/@dvt/traceability-service/src/lineage/types.ts`](../../../../packages/@dvt/traceability-service/src/lineage/types.ts)

Architectural consequence:

- if the SQL facet becomes contract-governed but the custom facet remains only a
  local shape, then the package still emits a partially governed payload;
- `G6` would close only half of the contract risk it claims to address.

Recommended decision:

- include `dvt_dbt_details` in the same contract-hardening pass, even if its
  validation model is local rather than OpenLineage-standard.

#### 2. Verification language is still too soft

The plan says "add one explicit OpenLineage-focused check if needed".

That wording is too weak for QA closure.

If golden fixtures and schema validation are part of `G6`, they must be inside
the mandatory verification tuple recorded in:

- [`docs/planning/gaps/GAP_EXECUTION_PLANS.md`](../GAP_EXECUTION_PLANS.md)
- [`docs/planning/status/canonical-doc-code-matrix.md`](../../status/canonical-doc-code-matrix.md)

Recommended decision:

- define the exact command set now;
- make golden validation and schema validation mandatory, not optional.

#### 3. Canonical source is still planning-grade, not normative

Today the `canonical_spec` for `G6` points to the new plan document.

That is acceptable for an active gap, but weak for final sign-off.

Planning documents are good for:

- sequencing work;
- defining scope;
- recording tradeoffs.

They are not ideal as the final canonical contract for payload shape.

Recommended end-state:

- keep the current plan as planning source;
- add a normative technical artifact for the emitted facet contract before
  declaring `G6` closed.

That artifact could live as one of:

- a versioned schema file;
- a contract document under architecture/contracts;
- a promoted shared-kernel contract if the facet surface is now considered
  reusable and stable.

## QA And Product Quality Assessment

### What Meets Standard

The plan is already stronger than many typical gap docs because it:

- separates scope from runtime debt;
- avoids flaky network validation in CI;
- prefers deterministic fixtures over implicit behavior;
- defines a clear DoD structure;
- ties the work back into the status and traceability documents.

From a QA perspective, that is a good baseline.

### What Still Falls Short

The plan does not yet fully meet hard QA expectations for closure because:

- part of the emitted payload is still not contract-decided;
- the verification tuple is not phrased as fully mandatory;
- no final evidence or residual risk strategy is fixed yet.

As a result:

- this is QA-acceptable as an execution plan;
- it is not yet QA-acceptable as closure proof.

### QA Verdict

Current verdict:

- implementation-ready plan: yes;
- closure-ready plan: not yet.

## Documentation And Organization Assessment

The planning material is now well organized.

Benefits of the current structure:

- `G6` has a dedicated folder instead of being buried only in generic gap text;
- MkDocs navigation now has a real landing point for this gap;
- the gap is visible from the `gaps` index and linked back into the main gap and
  status documents;
- the planning split between hub, plan, and global tracker is understandable.

This is materially better than the previous state, where `G6` existed mostly as
scattered mentions across status boards and reviews.

Organizationally, the current structure is good enough and should be kept.

One improvement is still recommended:

- add this review document to the `G6` hub index so architectural concerns and
  execution planning are visibly separated.

## OOP And SOLID Assessment

### OOP

The package uses small focused classes with clear responsibilities:

- `StepStartedLineageMapper` maps supported events;
- `SqlJobFacetBuilder` builds the SQL facet payload;
- `CachedRetryCompiledCodeResolver` handles resolution policy;
- `CompositeCompiledCodeReader` routes by URI scheme;
- `InMemoryCompiledCodeCache` provides bounded cache behavior.

This is a reasonable object-oriented shape for the problem size.

### SRP

Single Responsibility is respected well.

Each class does one main job and does not visibly accumulate runtime,
transport, and mapping concerns in the same unit.

### OCP

Open/Closed is reasonably respected.

Examples:

- new compiled-code readers can be added by scheme without rewriting
  `CompositeCompiledCodeReader`;
- mapping dependencies are injected via interfaces rather than hard-wired;
- facet construction is separated from the mapper.

### LSP

No obvious substitution problem is visible in the current package shape.

The interfaces are narrow and consumer expectations are straightforward.

### ISP

Interface Segregation is good.

The current ports are narrow:

- `ICompiledCodeReader`
- `ICompiledCodeCache`
- `ICompiledCodeResolver`
- `ISqlJobFacetBuilder`
- `ILineageStepEventMapper`

These are fit-for-purpose and not bloated.

### DIP

Dependency Inversion is one of the stronger aspects of the package.

The mapper depends on:

- `ICompiledCodeResolver`
- `ISqlJobFacetBuilder`

The resolver depends on:

- `ICompiledCodeReader`
- `ICompiledCodeCache`

This means the current plan is consistent with the existing dependency shape.

### SOLID Verdict

The package currently respects SOLID well enough for its size and current
maturity.

The main weakness is not object design, but contract governance around the
emitted payload types.

## Hexagonal Architecture Assessment

The current package is consistent with a hexagonal style.

Signs of healthy hexagonal separation:

- the mapper depends on contracts, not infrastructure;
- reader and cache behavior are modeled as ports;
- concrete adapters such as in-memory/file readers sit behind interfaces;
- package behavior can be tested without external services.

Important nuance:

`G6` should preserve this boundary and must not introduce:

- network fetches in test code as a validation dependency;
- Marquez-specific runtime wiring into mapper logic;
- transport responsibilities into the package-hardening pass.

If implementation stays within the current plan, the hexagonal boundary is
preserved.

## CQRS Assessment

The current design is compatible with CQRS.

This lineage package is not part of the command path that mutates authoritative
run state. It is a read-side / observability / projection-oriented concern.

That is important because:

- lineage failure is intentionally fail-open;
- translation should not become a blocking dependency for execution;
- the mapping layer should consume domain events without owning command-side
  semantics.

The current `G6` plan respects that boundary.

The main CQRS risk would appear only if future work tried to make lineage
translation or schema validation a hard runtime gate for command execution.

The current plan does not do that.

## Architectural Risks Still Open

### Risk 1 - Partial contract governance

If only the SQL facet is formally pinned and validated, while the custom facet
 remains ad hoc, the package still emits an incompletely governed payload.

Impact:

- medium to high;
- closure credibility drops;
- future drift can still enter through the custom facet path.

### Risk 2 - Soft CI gate language

If goldens and schema validation remain "if needed" rather than mandatory,
`G6` can be declared closed without the exact hardening it exists to provide.

Impact:

- high for QA credibility;
- medium for engineering correctness.

### Risk 3 - Planning document used as final contract

If the plan itself becomes the permanent canonical source for payload shape,
contract evolution remains under-governed.

Impact:

- medium;
- manageable during active planning;
- undesirable as a long-term steady state.

## Decisions Required From Architect And CTO

These decisions should be made explicitly before implementation closes.

### Decision 1 - Contract boundary

Choose one:

- `Option A`: `G6` governs only the SQL facet and leaves `dvt_dbt_details` as
  local internal shape.
- `Option B`: `G6` governs both the SQL facet and the custom
  `dvt_dbt_details` facet as part of the real emitted surface.

Recommendation:

- choose `Option B`.

Reason:

- it matches the actual mapper output;
- it avoids partial closure;
- it is the cleaner contract story for QA and product standards.

### Decision 2 - Verification tuple

Choose one:

- `Option A`: keep `pnpm --filter @dvt/traceability-service test` as the broad
  umbrella and let implementation decide how much of `G6` lives inside it.
- `Option B`: define exact mandatory checks now, including schema validation and
  golden validation.

Recommendation:

- choose `Option B`.

Reason:

- it makes closure auditable;
- it removes room for ambiguous sign-off;
- it aligns better with the repo's increasingly explicit gap governance.

### Decision 3 - Final contract home

Choose one:

- `Option A`: keep the plan document as the long-term canonical spec for `G6`.
- `Option B`: use the plan for execution, but create a normative contract
  artifact before closure.

Recommendation:

- choose `Option B`.

Reason:

- planning and normative contract are different governance assets;
- the package output is stable enough to deserve an explicit contract;
- this improves long-term maintainability.

## Recommended Direction

The recommended direction for architect and CTO approval is:

1. keep the current `G6` scope split exactly as it is relative to `G10`;
2. proceed with implementation from the existing plan;
3. tighten the plan in two places before coding closes:
   - decide that `dvt_dbt_details` is part of the governed emitted contract;
   - make the verification tuple fully mandatory;
4. require a normative payload artifact before declaring `G6` closed;
5. treat `_schemaURL` literal-enforcement linting as a secondary guardrail, not
   as the primary closure mechanism.

## Final Verdict

Architectural verdict:

- coherent: yes;
- correctly scoped: yes;
- aligned with the current code baseline: yes.

QA verdict:

- acceptable as an implementation plan: yes;
- acceptable as closure proof: no.

Design-principles verdict:

- OOP: yes;
- SOLID: yes, with good DIP/ISP separation;
- Hexagonal: yes, if runtime concerns stay out of `G6`;
- CQRS: yes, because this remains a projection/traceability concern.

Board-level recommendation:

- approve `G6` to start;
- do not approve `G6` for closure until the contract boundary and mandatory
  verification tuple are hardened.
