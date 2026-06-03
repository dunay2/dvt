---
review_by: Codex
review_date: 2026-04-24
branch: codex/temporal-plan-ref-contract
slice: temporal-plan-ref-execution-contract
status: remediated
---

# Fowler architecture QA - Temporal plan-ref execution contract

## Scope

Reviewed the branch change that resolves the `IProviderAdapter.startRun()`
contract mismatch between engine-side plan admission and Temporal runtime
execution.

## Fowler reading

The old design had a **false parameter**: adapters accepted an
`ExecutionPlan`, but the production Temporal adapter executed from `PlanRef`.
That is a semantic smell, not a cosmetic one. It makes the interface lie about
the actual responsibility boundary.

The correction applies these Fowler-aligned moves:

| Pattern                            | Applied change                                                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Published Interface                | `IProviderAdapter.startRun()` now exposes only the data the runtime actually owns: `PlanRef` plus context.               |
| Separated Interface                | Engine admission still uses the resolved `ExecutionPlan`; provider execution does not.                                   |
| Gateway / Anti-corruption boundary | Temporal activity-time fetches go through plan integrity validation before segment resolution.                           |
| Tell, Don't Ask                    | The engine tells the adapter which immutable plan reference was approved; the adapter does not inspect an unused object. |
| Fail Fast                          | Hash drift rejects before segment execution.                                                                             |

## Comparison With Mature Systems

Temporal, Airflow-style, and data-platform control planes normally avoid
shipping large execution graphs in scheduler start payloads. They pass stable
identifiers and resolve bounded work units inside workers. That pattern is
valid only if the pointer is immutable and every runtime fetch is verified.

DVT+ now matches that mature posture:

- admission authority stays in the engine;
- Temporal workflow payload remains bounded;
- runtime resolution is pointer-backed;
- pointer fetch is fail-closed by hash validation;
- the public adapter interface no longer pretends to execute an in-memory plan
  object.

## Antipatterns Removed

| Antipattern       | Before                                                                 | After                                                          |
| ----------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------- |
| False parameter   | `startRun(plan, planRef, ctx)` accepted a plan Temporal ignored.       | `startRun(planRef, ctx)` exposes the real runtime input.       |
| Contract drift    | ADR-0012 said exact object dispatch while code used pointer execution. | ADR-0012 says immutable pointer plus revalidation.             |
| Paper determinism | Correctness was implied by a verified object not used by Temporal.     | Correctness is tied to `PlanRef.sha256` at each runtime fetch. |

## Residual Risks

| Risk                                      | Mitigation                                                                                                     |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| New providers skip runtime hash checks.   | Require conformance tests for mutated fetched bytes.                                                           |
| Docs regress to object-dispatch language. | Architecture test guards the adapter contract doc and source signature.                                        |
| Plan store mutability breaks the model.   | Keep immutable URI/hash storage posture and add storage-level mutation tests in the plan-record tenancy slice. |

## Future Teaching

Do not keep parameters for "architectural reassurance". If production runtime
does not use a value, the public interface should not accept it. Preserve the
domain invariant at the correct layer and make downstream layers prove their
own narrower invariant.
