# Fowler Analysis - F-27 Internal Alpha Route Gate

Date: 2026-05-14
Updated: 2026-05-18

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

The 2026-05-18 continuation closes the remaining F-27 route-gate work. The
previous remaining cuts now have accepted evidence:

- startup/context proof is accepted through route bootstrap and effective
  workspace-context evidence;
- Canvas proof is accepted through governed draft read/save and fail-closed
  browser evidence;
- plan/run readiness mapping is accepted through `ObservePlanRunReadiness` and
  `PlanRunReadinessReadModel`;
- source-owned recovery vocabulary is accepted through `MapRouteRecoveryState`;
- route-stage risk triage is accepted with included and excluded risk rationale;
- cadence decision is accepted with audience, entry date, duration, exit owner,
  and extension rule.

## 2026-05-18 Fowler Closeout

The final opportunity was **hidden authority**: an empty blocker list could have
accepted alpha full without proving where cadence and risk closure evidence
lived. The fix adds alpha-full closure evidence to the combined fixture and
keeps `Alpha cadence` and `Risk triage` as accepted route-gate semantics instead
of loose closeout text.

Mature-system comparison:

- Mature release gates require release-window and risk sign-off evidence as
  first-class inputs, not as prose after the decision.
- DVT now mirrors that posture: stage proof, cadence, risk triage, and
  closeout evidence are all consumed by one semantic architecture guard.

Residual opportunity:

- Future Lane E tasks should keep alpha-full accepted by regression, but should
  not add new route stages to F-27 unless a new command/query rail and route
  stage owner are declared first.
