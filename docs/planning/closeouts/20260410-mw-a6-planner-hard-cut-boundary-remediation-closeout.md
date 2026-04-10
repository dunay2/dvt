---
slice: mw-a6-planner-hard-cut-boundary-remediation
date: 2026-04-10
author: AI (GPT-5)
last_reviewed: 2026-04-10
status: Accepted
---

# Closeout: MW-A6 Planner Hard-Cut Boundary Remediation

## Think-First Analysis

- Problem summary:
  the protected runtime still exposed DBT-native planner ingress
  compatibility even though `GenericGraphSourceV1` was already the canonical
  planner-backed input.
- Root cause:
  the boundary migration stopped halfway: `start-run` and `preview` did not
  share the same source-admission policy, `manifestRef` stayed alive in the
  API command shape, and runtime composition still depended on a planner
  compatibility resolver.
- Constraints and invariants:
  `AGENTS.md`; `docs/planning/status/governance-document-rule-inventory.md`;
  `docs/guides/ai-work-protocol.md`;
  `docs/adr/ADR-0018_Shared_Kernel_Ownership_Governance.md`;
  `docs/adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md`;
  `docs/adr/ADR-0035-planner-public-contract-evolution-protocol.md`;
  `docs/planning/proposals/mandatory/runtime-and-contracts/planner-hard-cut-boundary-remediation-20260410.md`.
- Options considered:
  1. Keep compatibility and keep translating `manifestRef` inside runtime.
  2. Deprecate compatibility but keep it callable for one more slice.
  3. Hard-cut runtime planner ingress to canonical `graphSource`.
- Selected option and rationale:
  Option 3. The user-selected posture for this slice was explicit:
  no retrocompatibility at this boundary.
- Rejected alternatives:
  Options 1 and 2 preserve the same transitional ambiguity that created the
  architectural drift.

## Pre-Implementation Brief

- Mode:
  Full (code + tests + planning/status alignment)
- Scope:
  remove `manifestRef` and `targetProfile` from planner-backed protected
  runtime admission, share one fail-closed source policy between `start-run`
  and `preview`, and delete runtime dependency on
  `IPlannerCompatibilityResolver`.
- Touched paths:
  `apps/api/src/**`,
  `apps/api/test/**`,
  `docs/planning/state/agent-lane-a.yaml`,
  `docs/architecture/system-delivery-status.md`,
  `docs/planning/closeouts/20260410-mw-a6-planner-hard-cut-boundary-remediation-closeout.md`.
- Risks and mitigations:
  the main risk was breaking callers that still sent `manifestRef`.
  Mitigation: fail closed with explicit `invalid_plan_source` instead of
  continuing the compatibility path.
- Out-of-scope:
  removing the retained manifest artifact utility from the codebase;
  broader planner-kernel DBT extraction beyond the protected runtime boundary.

## Delivered Boundary State

- `graphSource` is now the only planner-backed protected-runtime ingress.
- `manifestRef` is rejected at the HTTP boundary for both `POST /runs/start`
  and `POST /plans/preview`.
- `targetProfile` no longer exists in the runtime planner-backed command shape.
- `start-run` and `preview` now share the same source-admission rule:
  `planRef` or canonical planner-backed `graphSource`, but never compatibility
  aliases in the protected runtime path.
- `PlannerBackedStartRunUseCase` no longer depends on
  `IPlannerCompatibilityResolver`.
- `ProtectedRuntimeModule` no longer wires a planner compatibility resolver.
- `ManifestArtifactResolver` remains only as an explicit utility, not as the
  protected runtime planner ingress path, and no longer carries decorative
  compatibility surface such as alias naming or unused `artifactId`.

## Validation Evidence

- `pnpm --filter dvt-api typecheck`
- `pnpm --filter dvt-api test -- --run test/entrypoints/http/startRunRoutePlanSourcePolicy.test.ts test/entrypoints/http/startRunRouteParserHelpers.test.ts test/entrypoints/http/startRunRoute.test.ts test/entrypoints/http/planRoutes.test.ts test/application/services/PlannerBackedStartRunUseCase.test.ts test/modules.test.ts`
- `pnpm --filter dvt-api test -- --run test/infrastructure/planner/ManifestArtifactResolver.test.ts test/integration/plannerEngineContract.test.ts`
- `pnpm --filter dvt-api exec vitest run --config vitest.integration.config.ts test/integration/protectedRuntime.integration.test.ts`

## No-Debt / No-Stub Evidence

- No compatibility stub or hidden alias path was added to preserve `manifestRef`
  in protected runtime.
- No hooks or quality gates were bypassed.
- No TODO/FIXME markers or placeholder implementations were introduced.
- The retained manifest utility is explicit infrastructure, not a disguised
  runtime ingress path.
