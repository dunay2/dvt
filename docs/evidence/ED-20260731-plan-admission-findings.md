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
  - apps/api/src/application/services/resolveAuthorizedPreviewSelection.ts
  - apps/api/src/application/services/previewSelectionFinding.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test -- plan-admission-finding.contract.test.ts plan-admission-finding.architecture.test.ts
    - pnpm --filter @dvt/contracts test -- test/validation.test.ts test/plan-admission-finding.contract.test.ts
    - pnpm --filter dvt-api test:ci -- test/application/services/previewSelectionFinding.test.ts test/application/services/resolveAuthorizedExecutableSubgraph.test.ts test/application/services/resolveAuthorizedPreviewSelection.test.ts
    - pnpm --filter dvt-api test:ci -- test/application/services/PreviewPlanUseCase.outcomes.test.ts test/application/services/PlannerBackedStartRunUseCase.test.ts test/application/services/executableSubgraphResolutionComponent.architecture.test.ts
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter dvt-api typecheck
---

# Canonical Plan Admission Findings

GitHub issue `#2077` defines a single structured finding vocabulary for the two
existing plan-admission authorities. GitHub issue `#2078` now applies that
vocabulary to every existing fail-fast Preview-selection rejection before plan
build, without changing authority order or adding persistence.

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
- Preview-selection findings contain exact request/resource subjects, bounded
  semantic remediation codes and non-secret evidence derived at the authority.
- Repeated evaluation canonicalizes subjects/evidence before identifier
  generation and produces one byte-stable fail-fast finding.
- `PreviewPlanUseCase` stops before planner build and plan storage after a
  finding; planner-backed StartRun does not publish Preview findings or perform
  project-revision revalidation.

## Scope Boundaries

The slice deliberately contains no new evaluator, HTTP mapper, UI behavior,
database object, migration, or generic guardrail abstraction. Finding
production remains with the existing selection authorities and describes only
decisions they have already made.
