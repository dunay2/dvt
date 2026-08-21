---
title: RED1.1 Planner Contracts Retirement Plan
status: Review
owner: Architecture / Planner / Contracts / CI
last_reviewed: 2026-08-21
planning_type: mandatory-proposal
task_ids:
  - GH-2590
---

# RED1.1 Planner Contracts Retirement Plan

## Intent

[GitHub issue #2590](https://github.com/dunay2/dvt/issues/2590) owns this
bounded hardening slice. The repository currently builds and scopes
`@dvt/planner-contracts` as an independent workspace even though its obsolete
`PlannerInputEnvelope` vocabulary has no production consumer. The accepted
planner boundary already lives in `@dvt/contracts`; planner-internal input
forms remain in `@dvt/planner`.

The slice removes the exhausted package and its CI/documentation topology. It
does not move, reshape, or version the surviving planner contracts.

## Exact-Head Evidence

- Implementation baseline: `main@5784d72402652a8f68aa9cd55f2595a14b9bd64d`.
- `PlannerInputV1` exists only in
  `packages/@dvt/planner-contracts/index.ts`.
- `PlannerInputStep` exists only in that package plus historical evidence.
- No application, worker, planner, adapter, or runtime imports
  `@dvt/planner-contracts`.
- Current topology residue is limited to the package itself, `pnpm-lock.yaml`,
  CI scope policy/configuration, and current architecture documentation.
- Open PRs #2537 and #2539 mention adjacent work but have no changed-file
  overlap with this slice.

## Think-First Analysis

### Problem summary and root cause

An early planner vocabulary was given a physical workspace boundary before a
stable independent contract lifecycle or consumer base existed. The canonical
planner contract later converged on `@dvt/contracts`, but the satellite package
and its CI/documentation declarations were never retired. The root problem is
duplicate package authority and stale topology, not a missing abstraction.

### Constraints and invariants

- ADR-0018 keeps serializable cross-package contracts in `@dvt/contracts` and
  allows planner to depend on that shared kernel.
- ADR-0034 forbids wrapper/satellite packages without unique ownership and
  authorizes deletion after residual references reach zero.
- ADR-0035 fixes `PlannerInputEnvelopeV1`, `ExecutionPlanV1`, and
  `IExecutionPlanner` in `@dvt/contracts` while planner retains semantic
  authorship.
- ADR-0053 requires generated file indexes and the accepted fingerprint
  baseline to be regenerated and reviewed together after file removal.
- ADR-0061 keeps task lifecycle in GitHub and architecture/mechanization in the
  Planning DB.
- Planner input, output, hashes, route contracts, and runtime behavior must be
  byte- and behavior-identical.

### Options considered

1. Retain the package and document it as independent. Rejected because no
   consumer, runtime, validation, or compatibility lifecycle justifies it.
2. Move the obsolete interfaces into `@dvt/contracts` or `@dvt/planner`.
   Rejected because this would preserve stale semantics beside the accepted
   `PlannerInputEnvelopeV1`.
3. Leave a forwarding package or TypeScript alias. Rejected because ADR-0034
   treats that as duplicate topology without ownership.
4. Delete the package and converge all active topology on the existing owners.
   Selected because it removes one mechanism while preserving every current
   semantic authority.

No library was evaluated or adopted: this is deletion of unused topology, not
a custom implementation problem.

## Current State And Target

```mermaid
flowchart LR
  API[API composition] --> Contracts[@dvt/contracts\ncanonical PlannerInputEnvelopeV1]
  Planner[@dvt/planner\ndeterministic planning] --> Contracts
  Planner -. stale topology only .-> Satellite[@dvt/planner-contracts\nunused obsolete vocabulary]
  CI[CI workspace scope] --> Satellite

  subgraph Target[Target after RED1.1]
    API2[API composition] --> Contracts2[@dvt/contracts\npublic planner contracts]
    Planner2[@dvt/planner\ninternal planner types] --> Contracts2
    CI2[CI workspace scope] --> Planner2
    CI2 --> Contracts2
  end
```

## Fowler Opportunity Matrix

<!-- markdownlint-disable MD060 -->

| scenario                                            | opportunity                           | Fowler pattern                                       | DDD owner                                                   | command/query rail                                               | implementation surfaces                                                                           | unit or package test                             | architecture test                                                                           | user-flow test                            | out of scope                                         |
| --------------------------------------------------- | ------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------- |
| Retire an unused planner contract workspace         | Duplicate semantics, boundary drift   | Remove Middle Man / Collapse Hierarchy               | Planner semantic owner plus Contracts shared-kernel owner   | `none` - no product command/query behavior changes               | `packages/@dvt/planner-contracts/**`, `pnpm-lock.yaml`, current architecture docs                 | contracts and planner package tests remain green | `tools/ci/planner-package-governance.test.mjs` proves no satellite package or scope residue | Not applicable - no user-visible behavior | planner semantics, public contract shape, API routes |
| Remove the phantom CI workspace                     | Documentation drift, hidden authority | Replace stale topology with the surviving read model | Repository CI scope policy                                  | reuse `EmitAffectedWorkspaceMatrix` and `ClassifyChangedCiScope` | `tools/ci/scope-config.mjs`, `tools/ci/policy/workflow-scope.json`, `tools/ci/validate-policy.js` | CI tool tests                                    | workspace and test matrix suites                                                            | Not applicable - CI-only behavior         | unrelated workspace routing                          |
| Align current architecture and generated governance | Documentation drift                   | Single Source of Truth                               | Architecture documentation and generated governance indexes | reuse `ClassifyArchitectureDocumentationDisposition`             | current architecture docs and generator-owned status surfaces                                     | docs checks                                      | governance refresh and fingerprint checks                                                   | Not applicable                            | historical reviews, closeouts, and archive           |

<!-- markdownlint-enable MD060 -->

## Pre-Implementation Brief

- Mode: Slim refactor; no new API, contract, artifact kind, or externally
  observable product behavior.
- Scope: delete the obsolete package, remove its CI scope identity and lockfile
  importer, correct current architecture docs, and refresh generated
  governance.
- Expected outcome: one public planner contract authority in
  `@dvt/contracts`, with planner internals remaining in `@dvt/planner`.
- Risk: a dynamic/config consumer could be missed. Mitigation: exact-head grep,
  delete-first compilation, CI matrix tests, package builds/tests, and zero
  active-reference proof.
- Risk: generated governance can drift after file deletion. Mitigation: run
  `pnpm governance:refresh` and review the generated fingerprint impact.
- Test coverage: add a failing architecture assertion before deletion; retain
  contracts/planner tests and run CI scope/matrix suites after convergence.
- Command/query rail impact: no product rail changes; reuse the existing CI
  queries `EmitAffectedWorkspaceMatrix` and `ClassifyChangedCiScope`.
- Residual opportunities: crypto consolidation and Canvas legacy-route
  retirement remain owned by #2185/#2191 and #2591 respectively.

## Feature Mechanization

```feature-mechanization
version: 1
featureId: RED1-1-PLANNER-CONTRACTS-RETIREMENT
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/runtime-and-contracts/red1-1-planner-contracts-retirement-plan-20260821.md
componentGuides:
  - docs/architecture/domain-shared.md
  - docs/architecture/typescript-package-classification.md
  - docs/architecture/diagrams/implementation-architecture-diagrams.md
userStories:
  - docs/planning/proposals/mandatory/runtime-and-contracts/red1-1-planner-contracts-retirement-plan-20260821.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/adr/ADR-0018_Shared_Kernel_Ownership_Governance.md
  - docs/adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md
  - docs/adr/ADR-0035-planner-public-contract-evolution-protocol.md
  - docs/adr/ADR-0053-file-state-fingerprint-governance.md
  - docs/adr/ADR-0061-github-mvp-task-authority-and-planning-db-architecture-boundary.md
allowedImplementationSurfaces:
  - docs/planning/proposals/mandatory/runtime-and-contracts/red1-1-planner-contracts-retirement-plan-20260821.md
  - docs/planning/closeouts/20260821-red1-1-planner-contracts-retirement-closeout.md
  - docs/architecture/domain-shared.md
  - docs/architecture/typescript-package-classification.md
  - docs/architecture/diagrams/implementation-architecture-diagrams.md
  - docs/.manifest.json
  - docs/**/index.md
  - docs/planning/status/**
  - packages/@dvt/planner-contracts/**
  - pnpm-lock.yaml
  - tools/ci/scope-config.mjs
  - tools/ci/policy/workflow-scope.json
  - tools/ci/validate-policy.js
  - tools/ci/planner-package-governance.test.mjs
  - tools/planning-db/state/db-governance-surfaces.json
  - traceability.manifest.json
forbiddenImplementationSurfaces:
  - packages/@dvt/contracts/src/**
  - packages/@dvt/planner/src/**
  - packages/@dvt/engine/**
  - packages/@dvt/adapter-*/**
  - apps/**
  - .github/workflows/**
commandQueryRails:
  - name: EmitAffectedWorkspaceMatrix
    type: query
    dddOwner: Repository CI scope policy
  - name: ClassifyChangedCiScope
    type: query
    dddOwner: Repository CI scope policy
  - name: none - product behavior is unchanged
    type: query
    dddOwner: Planner contract topology
domainObjects:
  - name: PlannerPublicContractBoundary
    type: contract family
    owner: Planner / Contracts
  - name: RepositoryCiWorkspaceScope
    type: read model
    owner: CI Governance
fowlerSignals:
  - Duplicate Semantics
  - Boundary Drift
  - Hidden Authority
  - Documentation Drift
architectureGuards:
  - node --test tools/ci/planner-package-governance.test.mjs
  - node --test tools/ci/emit-workspace-matrix.test.mjs tools/ci/emit-test-matrix.test.mjs tools/ci/workflow-scope-classification.test.mjs tools/ci/package-json-scope-classification.test.mjs
cypressFlows:
  - Not applicable - no user-visible behavior changes
completionGate:
  - node --test tools/ci/planner-package-governance.test.mjs
  - node --test tools/ci/emit-workspace-matrix.test.mjs tools/ci/emit-test-matrix.test.mjs tools/ci/workflow-scope-classification.test.mjs tools/ci/package-json-scope-classification.test.mjs
  - pnpm --filter @dvt/contracts test
  - pnpm --filter @dvt/contracts build
  - pnpm --filter @dvt/planner test
  - pnpm --filter @dvt/planner build
  - pnpm --filter @dvt/planner typecheck
  - pnpm test:ci-tools
  - pnpm governance:refresh
  - pnpm docs:feature-mechanization -- --feature RED1-1-PLANNER-CONTRACTS-RETIREMENT
  - pnpm docs:feature-mechanization:implementation
  - pnpm verify:prepush
redGreenCycles:
  - id: planner-contract-satellite-retirement
    redTest: node --test tools/ci/planner-package-governance.test.mjs
    expectedFailure: Architecture guard finds the obsolete planner-contracts package and CI workspace scope.
    patchSurfaces:
      - tools/ci/planner-package-governance.test.mjs
      - packages/@dvt/planner-contracts/**
      - tools/ci/scope-config.mjs
      - tools/ci/policy/workflow-scope.json
      - tools/ci/validate-policy.js
      - pnpm-lock.yaml
    greenTest: node --test tools/ci/planner-package-governance.test.mjs
symbols:
  - name: WORKSPACE_ENTRIES
    path: tools/ci/scope-config.mjs
    dddOwner: Repository CI scope policy
    cqRails:
      - EmitAffectedWorkspaceMatrix
      - ClassifyChangedCiScope
    fowlerSignals:
      - Duplicate Semantics
      - Documentation Drift
    architectureGuard: node --test tools/ci/planner-package-governance.test.mjs
    cypressCoverage: Not applicable - CI topology only
    unitTests:
      - node --test tools/ci/emit-workspace-matrix.test.mjs tools/ci/emit-test-matrix.test.mjs tools/ci/workflow-scope-classification.test.mjs tools/ci/package-json-scope-classification.test.mjs
```

## Completion Rule

The slice is complete only when the satellite workspace and all active
code/config/current-doc references are absent, canonical contract and planner
tests pass unchanged, generated governance is refreshed, and the exact final
head passes `pnpm verify:prepush`.
