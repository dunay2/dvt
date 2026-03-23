---
title: 20260323 StartRun Route Parser QA Review
status: Review
owner: qa
last_reviewed: 2026-03-23
planning_type: review
---

# 20260323 StartRun Route Parser QA Review

- Reviewed change: `split-start-run-engine` slice for `startRunRoute` parser hardening and start-run orchestration
- Review type: hard QA / contract compliance review
- Verdict: **Accept with conditions**

## 1. Governing sources used

- [AGENTS.md](../../../AGENTS.md)
- [Governance Document And Rule Inventory](../status/governance-document-rule-inventory.md)
- [Execution Workboard](../state/execution-workboard.md)
- [Open Task Route](../state/open-task-route.md)
- [ExecutionPlan.v2 / PlannerInputEnvelopeV2](../../../packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v2.ts)
- [Planner Input Envelope Validator](../../../packages/@dvt/planner/src/domain/InputEnvelopeValidator.ts)
- [StartRun route](../../../apps/api/src/entrypoints/http/startRunRoute.ts)
- [StartRun planner-backed use case](../../../apps/api/src/application/services/PlannerBackedStartRunUseCase.ts)
- [Workflow engine](../../../packages/@dvt/engine/src/core/WorkflowEngine.ts)
- [StartRun route tests](../../../apps/api/test/entrypoints/http/startRunRoute.test.ts)

## 2. Executive summary

The slice now has the right negative coverage:

- empty `selection`
- whitespace-only `selection`
- invalid `planRef` shape
- `planRef` exclusivity against `graphSource`, `manifestRef`, `manifest`, and `nodes`

The API parser is deterministic and the tests close the regression gaps that were called out in the earlier QA pass.

The only meaningful contract issue left is semantic drift between the public API boundary and the planner contract:

- `startRunRoute` rejects `selection: []`
- `PlannerInputValidator` accepts `selectedNodeIds: []`

That is fine only if the API intentionally owns a stricter rule and documents it explicitly.

## 3. Findings

### 3.1. `startRunRoute` enforces a stricter selection invariant than the planner contract

The route parser now treats an empty `selection` as `INVALID_SELECTION`.

That is not structurally wrong, but it creates a cross-layer semantic asymmetry:

- planner boundary: empty `selectedNodeIds` is accepted
- API boundary: empty `selection` is rejected before the planner sees the request

If this stricter API rule is intentional, it should be documented as an API-level invariant.
If not, the route should be relaxed so the API and planner share the same contract.

Severity: **Medium**

### 3.2. Coverage is now complete for the previously missing parser edges

The added tests cover the right failure modes and close the regression gaps:

- `selection: []`
- `selection: ['   ']`
- `planRef` object shape corruption
- `planRef` plus all planner-source variants

Severity: **Resolved in this slice**

### 3.3. No type drift found in the start-run orchestration path

`PlannerBackedStartRunUseCase` still maps the command into `PlannerInputEnvelopeV2` without introducing new ad hoc types.
`WorkflowEngine` remains the execution boundary and does not leak planner parsing logic into the core.

Severity: **None**

## 4. Risks

- **Medium**: public API and planner contract are not aligned on empty selection handling.
  - Impact: valid planner-compatible inputs may be rejected at the HTTP boundary.
  - Probability: moderate, because the rule is now locked by tests but not documented in the contract layer.

## 5. Tests reviewed

- `apps/api/test/entrypoints/http/startRunRoute.test.ts`
- `packages/@dvt/planner/test/unit/input-envelope-validator.test.ts`
- `apps/api/test/application/services/PlannerBackedStartRunUseCase.test.ts`
- `apps/api/test/application/services/engineStartRunUseCase.test.ts`

## 6. QA verdict

**Accept with conditions**

Condition:

1. Either document `startRun` as an API-only non-empty selection rule, or align the route with the planner contract and accept empty `selection`.
