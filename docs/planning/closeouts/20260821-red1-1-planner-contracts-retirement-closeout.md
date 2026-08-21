---
title: RED1.1 Planner Contracts Retirement Closeout
status: In progress
owner: Architecture / Planner / Contracts / CI
last_reviewed: 2026-08-21
planning_type: closeout
task_ids:
  - GH-2590
---

# RED1.1 Planner Contracts Retirement Closeout

## Think-First Analysis

### Problem summary

`@dvt/planner-contracts` is an unused physical workspace that exports an
obsolete planner input vocabulary while current production code consumes the
canonical `PlannerInputEnvelopeV1` from `@dvt/contracts`.

### Root cause

The early satellite package outlived the contract-authority convergence. CI
scope and current documentation continued to model the old package, so build
and governance cost remained even after production consumers disappeared.

### Constraints and invariants

- ADR-0018: shared serializable planner contracts remain in
  `@dvt/contracts`.
- ADR-0034: packages without unique ownership must be removed after zero-ref
  proof; no forwarding package replaces them.
- ADR-0035: public planner contracts remain physically canonical in
  `@dvt/contracts`, with planner as semantic owner.
- ADR-0053: file-index and accepted fingerprint outputs must be refreshed
  together after structural deletion.
- ADR-0061: #2590 is the task lifecycle authority; Planning DB owns the
  architecture/mechanization evidence.
- No planner, API, PlanRef, hash, route, or runtime semantic change is allowed.

### Options and decision

Retaining or forwarding the package would preserve duplicate authority.
Absorbing its stale interfaces would create obsolete public or internal DTOs.
The selected option is a hard deletion with direct convergence on the already
surviving owners.

No library is applicable because the work removes an unused mechanism.

### Fowler opportunity matrix

The complete pre-implementation matrix, diagrams, allowed surfaces, test
strategy, and residual scope are recorded in the
[RED1.1 implementation plan](../proposals/mandatory/runtime-and-contracts/red1-1-planner-contracts-retirement-plan-20260821.md).

## Pre-Implementation Brief

- Mode: Slim.
- Baseline: `5784d72402652a8f68aa9cd55f2595a14b9bd64d`.
- Scope: obsolete package deletion, CI scope convergence, current architecture
  correction, generated governance refresh.
- Expected outcome: `@dvt/contracts` is the only public planner contract
  authority; `@dvt/planner` keeps only planner-owned behavior/internal types.
- Negative proof: exact-head search plus a red/green architecture guard that
  rejects the satellite package and CI scope key.
- Validation: focused CI-tool tests, contracts/planner build and tests,
  governance refresh, mechanization checks, lint/typecheck, and pre-push gate.
- Command/query impact: no product rail changes; existing CI scope queries are
  reused.
- Out of scope: public contract changes, planner algorithms, API/runtime
  behavior, crypto consolidation, and Canvas compatibility retirement.

## Normative Baseline Verification

The planned hard cut is authorized by ADR-0018 section 3/3-a, ADR-0034 sections
6.1-6.4 and Implementation Guidance, ADR-0035 Decision, ADR-0053 Decision and
Implementation Requirements, and ADR-0061 Decision. No contradiction was
found.

## Work And Validation Evidence

Pending implementation and executed validation.

## Debt And Stub Evidence

Pending final verification. The plan authorizes no alias, compatibility
package, stub, placeholder, bypass, disabled rule, or deferred partial branch.
