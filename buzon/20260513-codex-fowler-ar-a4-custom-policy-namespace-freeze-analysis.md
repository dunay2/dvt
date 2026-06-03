---
title: AR-A4 Fowler analysis - custom policy namespace freeze
status: Accepted
owner: Architecture / Planner / Contracts
date: 2026-05-13
---

# AR-A4 Fowler Analysis - Custom Policy Namespace Freeze

## Executive Summary

`CustomPolicyNamespaceRegistry` is a speculative extension seam: it defines
registry lookup, validation vocabulary, and namespace governance before any
real production consumer exists.

Mature systems do not leave such seams looking active. They either remove them
before publication or freeze them with an explicit reactivation path. Because
the shared DTO vocabulary is already exported from `@dvt/contracts`, AR-A4
chooses the compatibility-preserving freeze.

## Mature-System Comparison

| Mature-system posture                                              | Current DVT signal                                                     | AR-A4 response                                                               |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Extension points have real consumers, owners, and lifecycle state. | The namespace registry has no implementation or product consumer.      | Mark the seam frozen until a real consumer plus ADR/proposal reactivates it. |
| Shared DTO compatibility is not broken just to tidy internals.     | Contract vocabulary is exported from `@dvt/contracts`.                 | Keep DTOs source-compatible and document freeze posture.                     |
| Architecture tests guard semantic ownership, not only barrels.     | Existing tests prove owner package placement but not frozen lifecycle. | Add a semantic guard blocking implementation growth while frozen.            |
| Component docs describe operational truth.                         | Component guide described registry lookup as active planner behavior.  | Update API, invariants, transitions, consumers, and extension rules.         |

## Improved Patterns

- ADR-0018 separation remains intact: shared vocabulary stays in
  `@dvt/contracts`; behavior port stays in `@dvt/planner`.
- The selected pattern improves boundary honesty by making lifecycle state
  explicit: `frozen compatibility seam`, not active policy registry.
- The architecture guard shifts confidence from barrel thinness to semantic
  freeze enforcement.

## Antipatterns Detected

| Antipattern            | Evidence                                                                                  | Fix                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Speculative generality | Registry and schema vocabulary exist before a consumer.                                   | Freeze the seam and block growth.                            |
| Documentation drift    | Docs implied active lookup/registration behavior.                                         | Update component guide and constraints.                      |
| Test-only confidence   | Ownership tests checked placement, not whether the seam could silently grow.              | Add semantic frozen-seam guard.                              |
| Hidden authority       | A future no-op/default registry could appear and make namespace acceptance look governed. | Do not add implementations; require ADR-backed reactivation. |

## Components To Group

The related code/docs form one planner component group:

- `packages/@dvt/planner/src/contracts/CustomPolicyNamespaceRegistry.ts`
- `packages/@dvt/contracts/src/contracts/planner/CustomPolicyNamespaceRegistry.v1.ts`
- `docs/architecture/components/planner/planner-private-behavior-ports-component.md`
- `docs/architecture/components/planner/planner-constraints.md`
- `packages/@dvt/planner/test/unit/planner-private-ownership.architecture.test.ts`
- `packages/@dvt/contracts/test/planner-private-ownership.architecture.test.ts`

This group owns compatibility vocabulary and freeze semantics. It does not own
runtime validation, namespace implementation, application authorization, or
provider behavior.

## Repetitions

- Review docs repeatedly say "freeze or remove" but the component guide lacked
  a concrete freeze invariant.
- The planner and contracts architecture tests both named ownership, but no
  test named frozen lifecycle semantics.

AR-A4 collapses those repeated review findings into one component-level rule.

## Opportunities

- Future custom policy namespace work should start with a concrete product
  consumer, not a general registry.
- If reactivated, the first consumer should define command/query ownership,
  authorization, schema ownership, operational rollout, and negative tests.
- If no consumer appears after the next planning review cycle, a breaking
  contract-removal proposal can be evaluated intentionally.

## Drift

Code drift:

- The code has a behavior port with no implementation or consumer.
- The absence of implementation is correct for now, but it was not encoded as
  a required state.

Documentation drift:

- Component docs listed registry APIs without saying they were frozen.
- Review findings documented the issue, but operational component docs did not
  carry the decision.

## Applied Patterns

- **Explicit lifecycle state:** frozen until real consumer.
- **Semantic architecture guard:** prevent accidental implementation growth.
- **Compatibility facade:** keep exported DTO vocabulary without claiming active
  runtime behavior.
- **DDD ownership:** planner owns behavior-port semantics; contracts owns
  serializable DTO shape.

## Future Lessons

- Do not publish extension seams as active until there is one real consumer.
- When a seam is retained for compatibility, encode the lifecycle state in
  docblocks, component guides, and architecture tests.
- Prefer freezing speculative surfaces over adding null implementations.
- Treat "zero consumers" as an architecture smell that needs a mechanical guard,
  not only a review note.
