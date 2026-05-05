---
title: ADR-0000 traceability gate restoration plan
status: Accepted
owner: engineering
last_reviewed: 2026-05-05
---

# ADR-0000 Traceability Gate Restoration Plan

## Objective

Restore the ADR-0000 traceability regression gate in PR Quality Checks and make
the current governed package scope pass the gate without hiding new package
metadata regressions.

## Scope

- Wire `pnpm traceability:adr0` into the PR quality workflow parity surface.
- Add missing ADR-0000 traceability headers to current governed package files
  where the changed-files gate allows direct remediation.
- Keep existing drift-owned files in the explicit traceability issue baseline
  instead of touching drift units outside this slice.
- Record ARC-2 evidence and risk updates because contracts, engine, and adapter
  files are touched.

## Feature Mechanization Manifest

```feature-mechanization
version: 1
featureId: ADR0-TRACEABILITY-GATE-RESTORATION
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/governance-and-docs/adr0-traceability-gate-restoration-plan-20260505.md
componentGuides:
  - docs/guides/testing-and-ci-capabilities.md
userStories:
  - docs/planning/proposals/mandatory/governance-and-docs/adr0-traceability-gate-restoration-plan-20260505.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/guides/testing-and-ci-capabilities.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
allowedImplementationSurfaces:
  - .github/workflows/pr-quality-gate.yml
  - docs/adr/adr-0052-planref-continuation-safety.md
  - docs/evidence/**
  - docs/planning/proposals/mandatory/governance-and-docs/adr0-traceability-gate-restoration-plan-20260505.md
  - docs/planning/status/**
  - docs/risk-register/quality/**
  - packages/@dvt/adapter-temporal/src/activities/temporalPlanArtifactReader.ts
  - packages/@dvt/adapter-temporal/src/plugins/**
  - packages/@dvt/adapter-temporal/src/temporalPlanRefCapacitySlaPolicy.ts
  - packages/@dvt/adapter-temporal/test/**
  - packages/@dvt/contracts/src/contracts/planner/**
  - packages/@dvt/contracts/src/schema-packs/execution-selection.ts
  - packages/@dvt/engine/src/adapters/inMemory/InMemoryProviderAdapter.ts
  - packages/@dvt/engine/src/application/workflow-engine-use-cases/**
  - packages/@dvt/engine/src/contracts/PlanAdmissionPolicy.ts
  - packages/@dvt/traceability-service/src/cli.ts
  - packages/@dvt/traceability-service/src/core/manifest-json.ts
  - packages/@dvt/traceability-service/test/manifestJson.test.ts
  - tools/ci/workflow-pattern-parity.test.mjs
  - traceability.config.json
  - traceability.issue-baseline.json
  - traceability.manifest.json
forbiddenImplementationSurfaces:
  - apps/**
  - specs/contracts/**
  - docs/archive/**
commandQueryRails:
  - name: CheckAdr0TraceabilityRegression
    type: query
    dddOwner: ADR-0000 traceability governance
  - name: ApplyAdr0TraceabilityGate
    type: command
    dddOwner: Repository CI governance baseline
domainObjects:
  - name: TraceabilityIssueBaseline
    type: governance baseline
    owner: ADR-0000 traceability governance
  - name: PrQualityTraceabilityGate
    type: workflow governance command
    owner: Repository CI governance baseline
fowlerSignals:
  - Hidden authority
  - Documentation drift
  - Configuration drift
architectureGuards:
  - pnpm traceability:adr0
  - pnpm test:ci-tools
  - pnpm docs:feature-mechanization:implementation
cypressFlows:
  - N/A - repository governance gate only
completionGate:
  - pnpm traceability:adr0
  - pnpm test:ci-tools
  - pnpm --filter @dvt/contracts test
  - pnpm --filter @dvt/engine test
  - pnpm --filter @dvt/adapter-temporal test
  - pnpm verify:prepush
redGreenCycles:
  - id: adr0-traceability-regression-gate
    redTest: pnpm traceability:adr0
    expectedFailure: Current governed package files produce ADR-0000 metadata issues before remediation.
    patchSurfaces:
      - traceability.config.json
      - traceability.issue-baseline.json
      - traceability.manifest.json
      - packages/@dvt/adapter-temporal/**
      - packages/@dvt/contracts/**
      - packages/@dvt/engine/**
      - packages/@dvt/traceability-service/src/cli.ts
      - packages/@dvt/traceability-service/src/core/manifest-json.ts
      - packages/@dvt/traceability-service/test/manifestJson.test.ts
    greenTest: pnpm traceability:adr0
  - id: pr-quality-traceability-parity
    redTest: pnpm test:ci-tools
    expectedFailure: PR Quality Gate omits pnpm traceability:adr0 from the governed workflow parity check.
    patchSurfaces:
      - .github/workflows/pr-quality-gate.yml
      - tools/ci/workflow-pattern-parity.test.mjs
    greenTest: pnpm test:ci-tools
  - id: feature-mechanization-surface
    redTest: pnpm docs:feature-mechanization:implementation
    expectedFailure: ADR-0000 traceability gate changes are outside allowed implementation surfaces before this plan declares them.
    patchSurfaces:
      - docs/planning/proposals/mandatory/governance-and-docs/adr0-traceability-gate-restoration-plan-20260505.md
      - docs/planning/status/**
    greenTest: pnpm docs:feature-mechanization:implementation
symbols:
  - name: PR_QUALITY_GOVERNANCE_COMMANDS
    path: tools/ci/workflow-pattern-parity.test.mjs
    dddOwner: Repository CI governance baseline
    cqRails:
      - CheckAdr0TraceabilityRegression
    fowlerSignals:
      - Duplicate governance gate
      - Hidden authority
    architectureGuard: tools/ci/workflow-pattern-parity.test.mjs
    cypressCoverage: N/A - repository governance gate only
    unitTests:
      - pnpm test:ci-tools
  - name: TraceabilityIssueBaseline
    path: traceability.issue-baseline.json
    dddOwner: ADR-0000 traceability governance
    cqRails:
      - CheckAdr0TraceabilityRegression
    fowlerSignals:
      - Documentation drift
      - Configuration drift
    architectureGuard: pnpm traceability:adr0
    cypressCoverage: N/A - repository governance gate only
    unitTests:
      - pnpm traceability:adr0
  - name: formatTraceabilityManifestJson
    path: packages/@dvt/traceability-service/src/core/manifest-json.ts
    dddOwner: ADR-0000 traceability governance
    cqRails:
      - CheckAdr0TraceabilityRegression
    fowlerSignals:
      - Configuration drift
      - Hidden authority
    architectureGuard: pnpm traceability:adr0
    cypressCoverage: N/A - repository governance gate only
    unitTests:
      - pnpm --filter @dvt/traceability-service test -- test/manifestJson.test.ts
  - name: jsonPrintWidth
    path: packages/@dvt/traceability-service/src/core/manifest-json.ts
    dddOwner: ADR-0000 traceability governance
    cqRails:
      - CheckAdr0TraceabilityRegression
    fowlerSignals:
      - Configuration drift
    architectureGuard: pnpm traceability:adr0
    cypressCoverage: N/A - repository governance gate only
    unitTests:
      - pnpm --filter @dvt/traceability-service test -- test/manifestJson.test.ts
```
