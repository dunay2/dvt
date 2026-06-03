# TF-E2-M-D Startup Route Readiness Fowler Review

## Fowler Verdict

The slice is small but product-critical. The existing startup gate has a good
presentation model and DOM adapter split, but route readiness is still forwarded
too directly from the active route into the startup screen. Mature systems do
not let one child route publication decide cross-step startup ordering without a
policy that knows the other startup prerequisites.

The fix is to introduce a pure route-readiness policy in the app-bootstrap
bounded context. The policy is not Canvas-specific and does not change backend,
draft persistence, or capability contracts.

## Pattern Improvements

- Move route readiness ordering out of `RootShell` effect code and into a named
  domain read model: `RouteBootstrapStartupReadinessState`.
- Keep `setBootstrapStepStatus` as the only app-bootstrap step command adapter.
- Keep `completeBootstrapScreen` as a guarded command, not a direct outcome
  override.
- Preserve route-published `failed`, `blocked`, and `error` states as operator
  diagnostics instead of turning them into generic loading.

## Antipatterns Detected

- Boundary drift: raw route presentation was used where a cross-step policy was
  needed.
- Temporal coupling: a route could publish before runtime capabilities settled.
- Test-only confidence: integration tests covered route completion and route
  failure but not same-route demotion or capability ordering.
- Documentation drift: the component guide did not describe the fifth-check
  non-regression invariant.

## Repetitions

No repeated UI component is required. The repeated concept is readiness
decision-making across route publication and root completion. It is collapsed
into one policy output: effective route command plus effective can-complete
posture.

## Opportunities

- Reuse the same policy shape for future shell startup checks that need
  cross-step ordering.
- Keep Cypress startup checks focused on visible readiness semantics, while
  unit tests exhaust the policy matrix.
- Add future route-specific diagnostics as route-published presentations, not
  as root-shell conditionals.

## Drift Fixed By This Slice

- The fifth bootstrap check is no longer allowed to look complete before
  runtime capability posture is visible.
- A same-route stable terminal or blocker publication cannot regress to a cold
  pending fifth check.
- The component guide and mechanization manifest define the exact rail,
  surfaces, symbols, tests, and Cypress proof.

## Lessons For Future Slices

- Startup readiness needs explicit policy objects when a visible step depends
  on more than one asynchronous boundary.
- Route-specific components should publish local truth; root-shell policy should
  adapt that truth into global startup posture.
- The mechanization manifest must remain the implementation rail. Any symbol or
  changed surface outside the manifest is drift, not flexibility.
