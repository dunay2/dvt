---
title: Canonical plan admission finding contracts
status: Accepted
date: 2026-07-31
owners:
  - '@dvt/contracts'
  - dvt-api
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/PlanAdmissionFinding.v1.ts
  - packages/@dvt/contracts/src/schema-packs/plan-admission-finding.ts
  - apps/api/src/application/services/resolveAuthorizedExecutableSubgraph.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test -- plan-admission-finding.contract.test.ts plan-admission-finding.architecture.test.ts
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter dvt-api typecheck
---

# Canonical Plan Admission Findings

GitHub issue `#2077` defines a single structured finding vocabulary for the two
existing plan-admission authorities. This slice adds that vocabulary without
changing admission decisions, publishing HTTP outcomes, or adding persistence.

## Evidence

- Preview-selection findings identify the request and cannot carry a stored
  `planRef`.
- Plan-executability findings preserve the exact `planRef`, adapter identity,
  rejection code, and degradability decision.
- Finding identity is deterministic over canonical subjects and evidence.
- Runtime schemas reject executable remediation values, rich evidence objects,
  non-canonical identifiers, and collections containing anything other than the
  single fail-fast finding.
- The existing selection and executability result contracts reference the
  canonical finding collection; no parallel result hierarchy was introduced.

## Scope Boundaries

The slice deliberately contains no evaluator, HTTP mapper, UI behavior,
database object, migration, or generic guardrail abstraction. Finding production
remains with the existing selection and executability authorities.
