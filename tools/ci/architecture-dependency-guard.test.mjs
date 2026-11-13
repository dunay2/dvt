/**
 * Owned concern: preserve the established architecture proof port and declaration order.
 * Why: focused proof families share one native Node test worker and existing suite identity.
 * Corner: sequential module evaluation prevents top-level-await dependencies reordering case registration.
 */
await import('./architecture-dependency-guard/wiring.cases.mjs');
await import('./architecture-dependency-guard/source-reachability.cases.mjs');
await import('./architecture-dependency-guard/profile-admission.cases.mjs');
await import('./architecture-dependency-guard/profile-dead-branches.cases.mjs');
await import('./architecture-dependency-guard/profile-composition.cases.mjs');
await import('./architecture-dependency-guard/profile-javascript.cases.mjs');
await import('./architecture-dependency-guard/profile-invocation.cases.mjs');
await import('./architecture-dependency-guard/profile-control-flow.cases.mjs');
await import('./architecture-dependency-guard/live-reachability-report.cases.mjs');
await import('./architecture-dependency-guard/dependency-rule-negative.cases.mjs');
await import('./architecture-dependency-guard/canvas-boundaries.cases.mjs');
await import('./architecture-dependency-guard/domain-package-boundaries.cases.mjs');
await import('./architecture-dependency-guard/mechanics-authority.cases.mjs');
await import('./architecture-dependency-guard/contract-dependency-evidence.cases.mjs');
await import('./architecture-dependency-guard/acquisition-parity.cases.mjs');
