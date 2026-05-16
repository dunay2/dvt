---
title: Fowler Analysis - F-27 session gate and protected runtime unavailability
date: 2026-05-15
owner: Codex
status: Review
task_ids:
  - F-27
---

# Scope

Branch slice reviewed: protected-route session admission behavior in web
bootstrap, with explicit handling for missing protected runtime session rail.

# Fowler-Oriented Architectural Analysis

## Baseline vs current

- **Before**: `/session` missing (`404`) collapsed into generic transport error.
  Recovery posture was ambiguous and mixed infrastructure failure with auth
  posture.
- **Now**: `404 /session` is classified as `runtime_unavailable`, preserving
  fail-closed auth while making root cause explicit.

Compared with mature systems, this moves from _implicit error coupling_ to
_explicit failure taxonomy_ at the route gate, which improves operability
without changing authorization semantics.

## Patterns improved

- **Separated Presentation from Domain Decision**:
  `AuthRouteGate` delegates resolution to
  `resolveProtectedRouteSessionContext`.
- **Fail-Closed Security Boundary**:
  no success path is introduced for missing OIDC/session rails.
- **Single Recovery Vocabulary**:
  source-owned recovery reasons are documented and tested.

## Antipatterns detected

- **Error bucket collapse** (previous): runtime-not-mounted treated as generic
  transport.
- **Route-level drift risk**: cadence/readiness/risk semantics split across
  child docs and review docs.

## Component grouping opportunities

- Group `AuthRouteGate`, `protectedRouteSessionContext`, and `LoginView` under
  one explicit component (`Protected Route Session Gate`) with public API,
  invariants, transitions, consumers, and semantic fitness checks.

## Lessons for future slices

- Distinguish _security denial_ from _runtime posture_ at first route gate.
- Keep recovery vocabulary source-owned and shared across route surfaces.
- Require route-level combined fixture proof, not only child-slice closures.

## Repetitions and drift

- Repetition risk in recovery copy across route stages.
- Drift risk between F-27 acceptance matrix and component docs around cadence
  contract fields.

## Fixes applied in this slice

- Added explicit `runtime_unavailable` reason mapping for `404 /session`.
- Added route test and unit test coverage for this semantic.
- Added local component docs for protected route session gate.
- Extended F-27 docs with explicit cadence contract and combined route proof
  requirement.

## Remaining opportunities

- Bind matrix stage evidence rows to executable fixture IDs in one generated
  artifact.
- Add API-side explicit posture endpoint for protected-runtime mount status to
  reduce inference from `404`.
