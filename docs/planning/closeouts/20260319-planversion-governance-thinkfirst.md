---
slice: planversion-governance
status: in-progress
date: 2026-03-19
gap: top-5-gap-3
author: AI (Codex)
---

# Think-First Analysis: planVersion governance without big-bang cutover

## IA Checklist

- [x] Problem summary
- [x] Root cause
- [x] Constraints and invariants (cite ADRs)
- [x] Options considered (including libraries evaluated)
- [x] Selected option and rationale
- [x] Rejected alternatives
- [x] Evidence and links

## Problem Summary

`ExecutionPlanV2.metadata.planVersion` is modeled as the string literal `'2.3'`
in the canonical planner contract surface. That means a new supported plan
version cannot be introduced as a normal additive contract evolution; it forces
an inline literal replacement across the shared kernel and pushes the system
toward synchronized rollout.

The gap called out in
[`docs/planning/dvt-top-5-gaps-corrected-20260319.md`](../dvt-top-5-gaps-corrected-20260319.md)
is therefore real:

1. public contract evolution is artificially coupled to a single literal;
2. runtime acceptance policy for `planVersion` is not explicit;
3. validation of the touched slice was initially too dependent on root-level
   workspace behavior instead of package-local component behavior.

## Root Cause

The root cause is a split governance failure:

- semantic evolution of planner contracts belongs to the planner owner, per
  [ADR-0035](../../adr/ADR-0035-planner-public-contract-evolution-protocol.md),
  but the shared-kernel representation encoded that semantic choice as a single
  inline literal;
- runtime acceptance of `planVersion` lived as prose and implied behavior,
  rather than as an executable policy surface;
- package-local test execution for `@dvt/plan-verifier` depended on the root
  Vitest include pattern, which weakened component independence.

This is not primarily a "TypeScript typing" issue. It is a contract-governance
and rollout-governance issue.

## Constraints And Invariants

- [AGENTS.md](../../../AGENTS.md): must identify governance first, report real
  validation, and avoid hidden debt or fake completion.
- [AI Work Protocol](../../guides/ai-work-protocol.md): think-first analysis and
  alternatives are mandatory before implementation; package-level validation is
  required.
- [Testing and CI Capabilities](../../guides/testing-and-ci-capabilities.md):
  use package-level commands and include `pnpm verify:prepush` before claiming
  the slice is fully ready.
- [ADR-0017](../../adr/ADR-0017_ExecutionPlan_Schema_Versioning.md):
  `schemaVersion` and `planVersion` are different concerns; `planVersion` MUST
  NOT be used for schema compatibility checks.
- [ADR-0035](../../adr/ADR-0035-planner-public-contract-evolution-protocol.md):
  planner public contract changes must preserve cross-consumer coherence and
  keep schemas, fixtures, and published surfaces aligned.
- User direction for this slice: prioritize independence as a component and do
  not drag unrelated workspace failures into the acceptance story.

## Options Considered

### Option A. Minimal type-only change in `@dvt/contracts`

- Replace the inline literal with a union such as `'2.3' | '3.0'`.
- Leave runtime acceptance to future engine work.

Pros:

- smallest code diff;
- keeps scope tightly inside the contracts package.

Cons:

- does not actually close the runtime-governance part of the gap;
- leaves the system with compile-time flexibility but no executable acceptance
  policy;
- still requires future consumers to invent their own validation surface.

### Option B. Shared-kernel registry plus component-local runtime matrix

- Add a governed plan-version registry to `@dvt/contracts`.
- Express `PlanCore` / `ExecutionPlanV2` as versioned unions derived from that
  registry.
- Add executable runtime acceptance policy to `@dvt/plan-verifier`.
- Keep validation package-local so `@dvt/contracts` and `@dvt/plan-verifier`
  can be proven green independently of planner or artifact-package build state.

Pros:

- closes both halves of the gap: contract evolution and runtime acceptance;
- preserves the separation from `schemaVersion` required by ADR-0017;
- keeps the slice independently testable;
- avoids claiming planner or engine integration is solved when unrelated
  workspace issues still exist.

Cons:

- planner emission remains a follow-on integration step rather than being
  shipped in the same slice;
- runtime matrix is code-first in this slice, not yet mirrored into a wider
  platform rollout artifact.

### Option C. Full vertical rollout in one slice

- Change `@dvt/contracts`, `@dvt/plan-verifier`, planner emission, engine
  dispatch checks, machine-readable matrix artifacts, and CI alignment tests at
  once.

Pros:

- most complete end-to-end closure;
- strongest rollout story in one PR.

Cons:

- violates the user's independence objective for this turn;
- drags in unrelated workspace failures (`@dvt/artifacts` / transitive planner
  build path);
- increases the chance of partial wiring or misleading green status.

## Selected Option And Rationale

Select **Option B**.

It is the smallest option that is still architecturally honest:

- the shared kernel stops encoding `planVersion` as a single hardcoded literal;
- runtime acceptance becomes executable and testable;
- the slice remains independently verifiable at the package level;
- the implementation does not over-claim a full planner/engine rollout while
  unrelated workspace dependencies are still unresolved.

This is a **Slim** task under the AI work protocol: contract hardening plus
runtime-governance hardening, not a full feature rollout.

## Rejected Alternatives

- Reject **Option A** because it only solves the type-level symptom and leaves
  runtime governance open.
- Reject **Option C** for this turn because it collapses a governance fix into a
  repo-wide integration campaign and breaks the independence requirement.
- Reject reusing the existing `schemaVersion` compatibility artifact from
  [ADR-0017](../../adr/ADR-0017_ExecutionPlan_Schema_Versioning.md) for
  `planVersion`, because ADR-0017 explicitly separates those two concepts.

## Evidence And Links

- Governing gap statement:
  [`docs/planning/dvt-top-5-gaps-corrected-20260319.md`](../dvt-top-5-gaps-corrected-20260319.md)
- Shared-kernel contract:
  [`packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v2.ts`](../../../packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v2.ts)
- Runtime verifier:
  [`packages/@dvt/plan-verifier/src/planVersion.ts`](../../../packages/@dvt/plan-verifier/src/planVersion.ts)
