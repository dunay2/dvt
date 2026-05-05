---
title: ADR-0000 traceability gate restoration
status: Accepted
date: 2026-05-05
owners:
  - '@dvt/contracts'
  - '@dvt/engine'
  - '@dvt/adapter-temporal'
  - ci
arc_level: ARC-2
breaking: false
code_refs:
  - .github/workflows/pr-quality-gate.yml
  - tools/ci/workflow-pattern-parity.test.mjs
  - traceability.config.json
  - traceability.issue-baseline.json
  - traceability.manifest.json
  - packages/@dvt/contracts/src/contracts/planner/
  - packages/@dvt/engine/src/application/workflow-engine-use-cases/
  - packages/@dvt/adapter-temporal/src/temporalPlanRefCapacitySlaPolicy.ts
evidence:
  tests:
    - pnpm traceability:adr0
    - pnpm test:ci-tools
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/engine test
    - pnpm --filter @dvt/adapter-temporal test
    - pnpm verify:prepush
---

# ADR-0000 Traceability Gate Restoration

## Summary

This evidence records the CI slice that restores `pnpm traceability:adr0` as a
PR quality governance command and closes the traceability regressions that would
have made the gate fail on current `main`.

## Scope

- Added the ADR-0000 traceability command to the PR quality workflow and its
  workflow parity test.
- Added normative ADR-0000 headers, decisions, consequences, and versions to
  current governed files that were missing traceability metadata.
- Extended ADR catalog matching to recognize current `adr-0052` filename casing.
- Regenerated the tracked traceability manifest after the gate passed.
- Recorded reverse-coverage baseline entries for ADRs implemented outside the
  current `traceability.config.json` governed package scope.

## Validation

The closeout must include the exact validation command outcomes. This evidence
names the required proof set for the ARC-2 PR.
