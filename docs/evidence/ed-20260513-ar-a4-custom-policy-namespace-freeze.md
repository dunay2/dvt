---
title: AR-A4 custom policy namespace freeze
status: Accepted
date: 2026-05-13
owners:
  - '@dvt/planner'
  - '@dvt/contracts'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/planner/src/contracts/CustomPolicyNamespaceRegistry.ts
  - packages/@dvt/contracts/src/contracts/planner/CustomPolicyNamespaceRegistry.v1.ts
  - packages/@dvt/planner/test/unit/planner-private-ownership.architecture.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/planner test -- test/unit/planner-private-ownership.architecture.test.ts
---

# AR-A4 Custom Policy Namespace Freeze Evidence

AR-A4 freezes the custom policy namespace registry as a compatibility seam.

## Scope

- `@dvt/planner` keeps `ICustomPolicyNamespaceRegistry` source-compatible but
  inactive.
- `@dvt/contracts` keeps shared serializable custom policy namespace vocabulary
  source-compatible.
- Component docs and architecture tests now state that reactivation requires a
  real consumer and ADR-backed reactivation.

## Result

- No registry implementation, registration API, validation behavior, or runtime
  authorization behavior was added.
- The semantic architecture guard fails if frozen-seam semantics are removed or
  if the planner port grows active namespace behavior silently.
