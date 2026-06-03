---
title: API Deploy Start Posture Plan
status: Accepted
owner: API / Delivery / Docs
last_reviewed: 2026-05-05
planning_type: mandatory-proposal
---

# API Deploy Start Posture Plan

## Summary

This maintenance slice aligns `dvt-api` deployment entrypoints with the real
monorepo build and start posture.

The API package depends on workspace packages, so deploy configuration must use
repo-root `pnpm` commands instead of isolated `npm` commands.

## Scope

In scope:

- `apps/api/Procfile`;
- root `nixpacks.toml`;
- `apps/api/nixpacks.toml`;
- `apps/api/Dockerfile`;
- `apps/api/README.md`;
- a focused API test guard for deployment command drift;
- closeout and generated governance index refresh.

Out of scope:

- API route behavior;
- protected runtime readiness semantics;
- database pool sizing or lifecycle;
- contracts, adapters, engine, or worker packages.

## Command And Query Rail Impact

This slice does not add product behavior. The only rail represented here is a
governance query used by the API test suite to inspect deployment command
posture.

| Rail                              | Type  | Bounded context            | DDD owner                          | Use                                                                         |
| --------------------------------- | ----- | -------------------------- | ---------------------------------- | --------------------------------------------------------------------------- |
| `ValidateApiDeployCommandPosture` | query | API delivery configuration | `ApiDeployCommandPostureReadModel` | Reads deploy config files and rejects stale isolated `npm` command posture. |

## Acceptance

- `Procfile`, root `nixpacks.toml`, API service `nixpacks.toml`, and
  `Dockerfile` use `pnpm` monorepo commands.
- README deployment instructions match executable config.
- API tests fail if deploy config regresses to `npm run`, `npm ci`, or `npm i`
  as standalone commands.
- No API runtime route, contract, adapter, engine, or database pool behavior is
  changed.

```feature-mechanization
version: 1
featureId: API-DEPLOY-START-POSTURE
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/runtime-and-contracts/api-deploy-start-posture-plan-20260505.md
componentGuides:
  - docs/architecture/components/api/api-current-to-target-architecture.md
  - docs/architecture/components/api/protected-runtime-and-plan-compile-component.md
userStories:
  - docs/planning/proposals/mandatory/runtime-and-contracts/api-deploy-start-posture-plan-20260505.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
allowedImplementationSurfaces:
  - docs/planning/proposals/mandatory/runtime-and-contracts/api-deploy-start-posture-plan-20260505.md
  - docs/planning/closeouts/20260505-api-deploy-start-posture-closeout.md
  - nixpacks.toml
  - apps/api/Procfile
  - apps/api/nixpacks.toml
  - apps/api/Dockerfile
  - apps/api/README.md
  - apps/api/test/app.test.ts
  - docs/planning/status/**
forbiddenImplementationSurfaces:
  - packages/@dvt/contracts/**
  - packages/@dvt/engine/**
  - packages/@dvt/adapter-*/**
  - apps/api/src/entrypoints/http/**
  - apps/api/src/application/**
  - apps/api/src/infrastructure/**
  - apps/api/src/modules/**
  - apps/api/src/routes/**
commandQueryRails:
  - name: ValidateApiDeployCommandPosture
    type: query
    dddOwner: ApiDeployCommandPostureReadModel
domainObjects:
  - name: ApiDeployCommandPostureReadModel
    type: read model
    owner: API delivery configuration
fowlerSignals:
  - Documentation Drift
  - Duplicate Semantics
architectureGuards:
  - pnpm --filter dvt-api test -- app.test.ts
cypressFlows:
  - Not applicable - API deploy configuration only
completionGate:
  - pnpm --filter dvt-api test -- app.test.ts
  - pnpm --filter dvt-api build
  - pnpm --filter dvt-api typecheck
  - pnpm --filter dvt-api test:arch
  - pnpm --filter dvt-api test
  - pnpm docs:sync
  - pnpm docs:feature-mechanization:implementation
  - pnpm verify:prepush
redGreenCycles:
  - id: api-deploy-command-posture-guard
    redTest: pnpm --filter dvt-api test -- app.test.ts
    expectedFailure: New deploy posture guard detects apps/api/Procfile still using npm run start.
    patchSurfaces:
      - apps/api/test/app.test.ts
      - nixpacks.toml
      - apps/api/Procfile
      - apps/api/nixpacks.toml
      - apps/api/Dockerfile
      - apps/api/README.md
    greenTest: pnpm --filter dvt-api test -- app.test.ts
symbols:
  - name: readApiDeployFile
    path: apps/api/test/app.test.ts
    dddOwner: ApiDeployCommandPostureReadModel
    cqRails:
      - ValidateApiDeployCommandPosture
    fowlerSignals:
      - Documentation Drift
    architectureGuard: pnpm --filter dvt-api test -- app.test.ts
    cypressCoverage: Not applicable - API deploy configuration only
    unitTests:
      - pnpm --filter dvt-api test -- app.test.ts
  - name: expectNoNpmCommand
    path: apps/api/test/app.test.ts
    dddOwner: ApiDeployCommandPostureReadModel
    cqRails:
      - ValidateApiDeployCommandPosture
    fowlerSignals:
      - Documentation Drift
    architectureGuard: pnpm --filter dvt-api test -- app.test.ts
    cypressCoverage: Not applicable - API deploy configuration only
    unitTests:
      - pnpm --filter dvt-api test -- app.test.ts
```
