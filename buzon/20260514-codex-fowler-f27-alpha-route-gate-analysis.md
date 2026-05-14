# Fowler Analysis - F-27 Internal Alpha Route Gate

Date: 2026-05-14

## Governing Sources

- `docs/planning/status/governance-document-rule-inventory.md`
- `AGENTS.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/internal-alpha-product-route-plan-20260505.md`
- `docs/planning/reviews/architecture-and-governance/20260504-internal-alpha-evolution-route.md`
- `docs/planning/reviews/architecture-and-governance/20260505-internal-alpha-architecture-view-review.md`

## Fowler Reading

The root opportunity is not a missing screen. It is a route-level boundary
problem: child slices can accumulate evidence faster than the product route can
decide whether alpha is safe to call complete.

Fowler framing:

- **Bounded Context**: Internal alpha route gate, owned by Product /
  Architecture / Frontend, consuming Lane C runtime-safety inputs.
- **Published Language**: `InternalAlphaRouteGate`, `RouteStageProof`,
  `AlphaFullDecision`, `AlphaCadenceDecision`, and
  `RouteRecoveryVocabulary`.
- **Anti-corruption Boundary**: child evidence cannot become route authority.
- **Specification by Example**: each route stage needs happy and fail-closed
  fixtures before alpha full is accepted.

## Anti-patterns Found

- **Alpha by accumulation**: Code or Canvas evidence could imply route
  readiness without startup, context, readiness, cadence, and risk proof.
- **Test-only confidence**: browser proof for one stage does not prove the
  route.
- **Documentation drift**: architecture view named the acceptance matrix as the
  next artifact, but the matrix did not exist.
- **Duplicate recovery semantics**: recovery copy could drift per stage without
  a route-owned vocabulary.

## Applied Pattern

The slice applies a route-gate acceptance matrix:

- one route authority: `F-27`;
- one component guide for the gate API and invariants;
- one user-story set for route-level scenarios;
- one matrix that names stage, rail or owner, happy fixture, fail-closed
  fixture, evidence source, risk decision, and alpha exit impact;
- one architecture test that guards the semantic contract.

## Future Lessons

- Close child-slice proof, but route-level readiness must remain a separate
  decision.
- Each alpha stage needs negative-path proof before release language is allowed.
- Reviews should not say "next artifact" after the artifact exists; update the
  architecture lens in the same slice.
- Feature-mechanization manifests should allow architecture tests explicitly
  rather than using broad `apps/**` permission.

## Remaining F-27 Work

This slice does not declare F-27 done. The next F-27 cuts are executable stage
proofs:

- startup/context proof;
- Canvas proof;
- plan/run readiness mapping;
- source-owned recovery vocabulary;
- route-stage risk triage;
- cadence decision.
