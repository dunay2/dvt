---
title: 20260323 SOLID DDD Hexagonal CI and Adapters Review
status: Review
owner: Architecture / QA
last_reviewed: 2026-03-23
planning_type: review
---

# 20260323 SOLID DDD Hexagonal CI and Adapters Review

## Scope

Files reviewed for improvement opportunities:

- `.github/workflows/test.yml`
- `.github/workflows/pr-quality-gate.yml`
- `packages/@dvt/adapter-temporal/src/TemporalAdapter.ts`
- `packages/@dvt/adapter-temporal/test/TemporalAdapter.lookupRunRef.test.ts`

## Executive Summary

The recent changes improve robustness and CI coverage, but there are structural
opportunities to better align with SOLID, DDD, and Hexagonal architecture.

Main opportunities:

1. Extract CI policy logic out of YAML into versioned scripts/config.
2. Remove duplicated path-matcher knowledge across workflows.
3. Treat workflow files as adapters and domain-like policy checks as
   application services.
4. Consolidate Temporal error-code normalization as reusable adapter utility.

## Current Architecture Map

```mermaid
flowchart LR
  Dev[Developer Push/PR] --> GH[Test Suite Workflow]
  Dev --> QG[PR Quality Gate Workflow]

  GH --> Smoke[Adapter Postgres Smoke Job]
  GH --> Unit[Generic Package Test Job]
  GH --> Det[Determinism Job]

  QG --> Detect[Change Detection Script Inline]
  QG --> Guard[Adapter Postgres Smoke Guard Inline]
  Guard --> ChecksAPI[GitHub Checks API]
  ChecksAPI --> Smoke

  TemporalAdapter[TemporalAdapter.lookupRunRef] --> NotFound[isWorkflowNotFound]
  NotFound --> Normalize[normalizeTemporalErrorCode]
```

## Findings By Principle

### SOLID

- SRP opportunity: `pr-quality-gate.yml` contains both orchestration and
  business-like validation logic (path policy + polling strategy).
- OCP opportunity: path pattern changes require editing multiple YAML files.
- DIP opportunity: workflow jobs depend directly on GitHub API call details
  instead of a single repository script abstraction.

### DDD

- Ubiquitous language drift risk: CI policy concepts (`adapter_postgres_relevant`
  vs `adapter_postgres_changed`) can diverge if not centrally modeled.
- Temporal adapter language is improving; normalization belongs to an explicit
  adapter error-policy artifact, not only inside one function.

### Hexagonal

- Workflow files are currently mixed adapter + policy.
- Better separation: YAML as adapter, script module as policy port implementation.

## Risk Topology

```mermaid
flowchart TD
  R1[Dup path patterns in multiple workflows] --> O1[Drift between guard and smoke trigger]
  R2[Inline polling logic in workflow] --> O2[Harder to test and evolve]
  R3[Adapter error normalization local only] --> O3[Inconsistent behavior across adapter methods]
  O1 --> Impact1[False CI failures or skipped required checks]
  O2 --> Impact2[Operational brittleness]
  O3 --> Impact3[Semantic inconsistency in not-found handling]
```

## Proposed Target Design

```mermaid
flowchart LR
  YAMLTest[test.yml adapter] --> PolicyConfig[ci-policy.adapter-postgres.json]
  YAMLGate[pr-quality-gate.yml adapter] --> PolicyConfig

  YAMLGate --> GuardScript[tools/ci/require-check-run.mjs]
  GuardScript --> ChecksAPI[GitHub Checks API]

  YAMLTest --> MatchScript[tools/ci/match-affected-scope.mjs]
  MatchScript --> PolicyConfig

  TemporalAdapter --> ErrorPolicy[temporal-error-policy.ts]
  ErrorPolicy --> Normalize[normalizeTemporalErrorCode]
  ErrorPolicy --> Classify[isWorkflowNotFoundLike]
```

## Refactor Plan (Incremental)

```mermaid
flowchart TD
  P1[Step 1: Extract adapter-postgres path policy JSON] --> P2[Step 2: Reuse policy in both workflows]
  P2 --> P3[Step 3: Extract guard polling to tools/ci script]
  P3 --> P4[Step 4: Unit tests for path-matcher and guard logic]
  P4 --> P5[Step 5: Extract temporal error policy helper module]
  P5 --> P6[Step 6: Reuse helper in all temporal lookup paths]
```

## Actionable Improvements

1. Create `tools/ci/policy/adapter-postgres-relevance.json` and load it from
   both workflows.
2. Move check-run polling into `tools/ci/require-check-run.mjs`.
3. Add unit tests:
   - policy matcher test suite
   - guard timeout/conclusion matrix test suite
4. Introduce `packages/@dvt/adapter-temporal/src/temporalErrorPolicy.ts` and
   export classifier helpers.
5. Keep `test.yml` job split (smoke + full tests) but derive both from one
   relevance matcher.

## SOLID / DDD / Hexagonal Acceptance Conditions

- Single source of truth for adapter-postgres relevance patterns.
- No inline duplicated path policy across CI workflows.
- Guard behavior testable without editing workflow YAML.
- Temporal not-found classification reusable and centrally named.
- Workflow YAML reduced to orchestration and wiring only.

## Expected Benefits

- Lower CI drift probability.
- Easier future scope expansion (new adapters, new mandatory checks).
- Clearer boundary between policy and platform adapter code.
- More consistent adapter error semantics.
