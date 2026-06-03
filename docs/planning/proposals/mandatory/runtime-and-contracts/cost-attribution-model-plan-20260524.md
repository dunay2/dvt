---
title: Cost Attribution Model Plan
status: Active
owner: Product / Architecture / API
last_reviewed: 2026-05-24
planning_type: proposal
---

# Cost Attribution Model Plan

## Owned Concern

`D/cost attribution model` owns the first finance-facing usage attribution read
model for protected runtime data. The slice must not invent monetary costs. It
uses existing tenant-scoped run metadata, snapshots, and run events to expose
attributable usage facts that billing can consume later.

## Think-First Analysis

The root problem is that the product has UI and roadmap language for cost, but
no backend-owned usage facts. Prior reviews explicitly warned against building a
cost dashboard before a real data source exists. The selected slice therefore
adds a protected runtime query over real run events: run count, step counts,
step duration milliseconds, and explicit `null` monetary amount fields until a
warehouse credit capture rail exists.

Rejected alternatives:

- [Task: RUNTIME-PROP-DISP-1] Build or wire the web Cost view first. Rejected because it would keep cost
  semantics mock-driven.
- [Task: RUNTIME-PROP-DISP-1] Add provider-specific Snowflake credit ingestion. Rejected for this slice
  because query tagging and `QUERY_HISTORY` ingestion are not present.
- [Task: RUNTIME-PROP-DISP-1] Store estimated dollars in event payloads. Rejected because that would create
  fake finance data.

## Fowler Analysis

| Scenario                           | Opportunity                       | Fowler pattern                           | DDD owner                         | Command/query rail          | Implementation surfaces          | Tests                        |
| ---------------------------------- | --------------------------------- | ---------------------------------------- | --------------------------------- | --------------------------- | -------------------------------- | ---------------------------- |
| Cost view has no backend authority | Hidden mock semantics             | Replace Magic Number with Explicit Model | Runtime usage read model          | `GetCostAttributionSummary` | Protected API use case and route | API use-case and route tests |
| Billing needs run/step attribution | Data clumps in raw events         | Introduce Parameter Object               | Cost attribution period and scope | `GetCostAttributionSummary` | Runtime DTOs and parser          | Parser/route negative tests  |
| Monetary cost is unavailable       | Primitive obsession around `cost` | Null Object / explicit unavailable state | Cost amount read model            | `GetCostAttributionSummary` | API response model               | Use-case assertions          |

## Command And Query Rail

`GetCostAttributionSummary` is a protected runtime query.

- owning bounded context: Runtime read model
- DDD object/read model: Cost attribution summary read model
- application port: `GetCostAttributionSummaryUseCase`
- adapter surface: `GET /cost/attribution-summary`
- scope and authorization: `run:list`, tenant/project/environment scope
- consistency: derived from current run metadata, latest snapshots, and persisted
  run events available through `IRunStateStoreRead`
- negative tests: missing tenant, invalid tenant, invalid project,
  environment-without-project, invalid limit, and authorization denial through
  the shared protected route authorization path

## Pre-Implementation Brief

Mode: Full.

Scope:

- [Task: RUNTIME-PROP-DISP-1] Add a protected API query and route for cost attribution summary.
- Return only real usage facts from existing runtime stores.
- Keep monetary totals explicit and unavailable (`null`) until provider credit
  capture is implemented.

Out of scope:

- Web Cost view wiring.
- Snowflake `QUERY_TAG` or `QUERY_HISTORY` ingestion.
- Billing invoice creation.
- New public package contracts.

Validation plan:

- `pnpm docs:feature-mechanization -- --feature D-COST-ATTRIBUTION-MODEL-20260524`
- `pnpm --filter dvt-api test -- getCostAttributionSummaryUseCase.test.ts getCostAttributionSummaryRoute.test.ts`
- `pnpm --filter dvt-api typecheck`
- `pnpm docs:sync`
- `pnpm docs:status:generate`
- `pnpm docs:feature-mechanization:implementation -- --feature D-COST-ATTRIBUTION-MODEL-20260524`
- `pnpm verify:prepush`

## Feature Mechanization Manifest

```feature-mechanization
version: 1
featureId: D-COST-ATTRIBUTION-MODEL-20260524
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/runtime-and-contracts/cost-attribution-model-plan-20260524.md
componentGuides:
  - docs/architecture/components/api/cost-attribution-summary-component.md
userStories:
  - docs/architecture/components/api/cost-attribution-summary-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/planning/roadmap/strategic-product-roadmap.md
allowedImplementationSurfaces:
  - docs/planning/proposals/mandatory/runtime-and-contracts/cost-attribution-model-plan-20260524.md
  - docs/architecture/components/api/cost-attribution-summary-component.md
  - docs/architecture/components/api/cost-attribution-summary-user-stories.md
  - docs/architecture/components/api/index.md
  - apps/api/src/application/ports/runtime.ts
  - apps/api/src/application/ports/protectedRuntimeRailVocabulary.ts
  - apps/api/src/application/ports/protectedRuntimeRunRailVocabulary.ts
  - apps/api/src/application/ports/protectedRuntimeRunCommandQueryRails.ts
  - apps/api/src/application/services/getCostAttributionSummaryUseCase.ts
  - apps/api/src/entrypoints/http/costAttributionSummaryRoute.ts
  - apps/api/src/entrypoints/http/costAttributionSummaryRouteParser.ts
  - apps/api/src/entrypoints/http/costAttributionSummaryRouteParser.constants.ts
  - apps/api/src/entrypoints/http/protectedRuntimeRunRoutes.ts
  - apps/api/src/entrypoints/http/protectedRuntimeRouteDependencies.ts
  - apps/api/src/entrypoints/http/runtimeRoutes.constants.ts
  - apps/api/test/application/services/getCostAttributionSummaryUseCase.test.ts
  - apps/api/test/entrypoints/http/getCostAttributionSummaryRoute.test.ts
  - apps/api/test/entrypoints/http/protectedRuntimeRouteGroup.architecture.test.ts
forbiddenImplementationSurfaces:
  - apps/web/**
  - packages/@dvt/contracts/**
  - packages/@dvt/engine/**
  - packages/@dvt/adapter-*/**
commandQueryRails:
  - name: GetCostAttributionSummary
    type: query
    dddOwner: Runtime usage read model
domainObjects:
  - name: CostAttributionSummary
    type: read model
    owner: Runtime read model
fowlerSignals:
  - Hidden mock cost semantics
  - Billing facts absent from backend
  - Fake monetary attribution risk
architectureGuards:
  - pnpm docs:feature-mechanization:implementation -- --feature D-COST-ATTRIBUTION-MODEL-20260524
cypressFlows:
  - N/A - protected API read model only
completionGate:
  - pnpm docs:feature-mechanization -- --feature D-COST-ATTRIBUTION-MODEL-20260524
  - pnpm --filter dvt-api test -- getCostAttributionSummaryUseCase.test.ts getCostAttributionSummaryRoute.test.ts
  - pnpm --filter dvt-api typecheck
  - pnpm docs:sync
  - pnpm docs:status:generate
  - pnpm docs:feature-mechanization:implementation -- --feature D-COST-ATTRIBUTION-MODEL-20260524
  - pnpm verify:prepush
redGreenCycles:
  - id: cost-attribution-summary-query
    redTest: pnpm --filter dvt-api test -- getCostAttributionSummaryUseCase.test.ts getCostAttributionSummaryRoute.test.ts
    expectedFailure: Cost attribution summary use case and route do not exist.
    patchSurfaces:
      - apps/api/src/application/services/getCostAttributionSummaryUseCase.ts
      - apps/api/src/entrypoints/http/costAttributionSummaryRoute.ts
      - apps/api/src/entrypoints/http/costAttributionSummaryRouteParser.ts
    greenTest: pnpm --filter dvt-api test -- getCostAttributionSummaryUseCase.test.ts getCostAttributionSummaryRoute.test.ts
symbols:
  - name: GetCostAttributionSummaryQuery
    path: apps/api/src/application/ports/runtime.ts
    dddOwner: Runtime usage read model
    cqRails: [GetCostAttributionSummary]
    fowlerSignals: [Billing facts absent from backend]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    unitTests: [pnpm --filter dvt-api typecheck]
    cypressCoverage: N/A - protected API read model only
  - name: CostAttributionObservedWindowDto
    path: apps/api/src/application/ports/runtime.ts
    dddOwner: Runtime usage read model
    cqRails: [GetCostAttributionSummary]
    fowlerSignals: [Explicit attribution window]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    unitTests: [pnpm --filter dvt-api typecheck]
    cypressCoverage: N/A - protected API read model only
  - name: CostAttributionRunDto
    path: apps/api/src/application/ports/runtime.ts
    dddOwner: Runtime usage read model
    cqRails: [GetCostAttributionSummary]
    fowlerSignals: [Per-run billing facts]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    unitTests: [pnpm --filter dvt-api typecheck]
    cypressCoverage: N/A - protected API read model only
  - name: CostAttributionStepDto
    path: apps/api/src/application/ports/runtime.ts
    dddOwner: Runtime usage read model
    cqRails: [GetCostAttributionSummary]
    fowlerSignals: [Per-step billing facts]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    unitTests: [pnpm --filter dvt-api typecheck]
    cypressCoverage: N/A - protected API read model only
  - name: GetCostAttributionSummaryResult
    path: apps/api/src/application/ports/runtime.ts
    dddOwner: Runtime usage read model
    cqRails: [GetCostAttributionSummary]
    fowlerSignals: [Explicit unavailable monetary cost]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    unitTests: [pnpm --filter dvt-api typecheck]
    cypressCoverage: N/A - protected API read model only
  - name: IGetCostAttributionSummaryUseCase
    path: apps/api/src/application/ports/runtime.ts
    dddOwner: Runtime usage read model
    cqRails: [GetCostAttributionSummary]
    fowlerSignals: [Application port for usage facts]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    unitTests: [pnpm --filter dvt-api typecheck]
    cypressCoverage: N/A - protected API read model only
  - name: AttributableStepEvent
    path: apps/api/src/application/services/getCostAttributionSummaryUseCase.ts
    dddOwner: Runtime usage read model
    cqRails: [GetCostAttributionSummary]
    fowlerSignals: [Explicit event subset]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    unitTests: [pnpm --filter dvt-api test -- getCostAttributionSummaryUseCase.test.ts]
    cypressCoverage: N/A - protected API read model only
  - name: GetCostAttributionSummaryUseCase
    path: apps/api/src/application/services/getCostAttributionSummaryUseCase.ts
    dddOwner: Runtime usage read model
    cqRails:
      - GetCostAttributionSummary
    fowlerSignals:
      - Billing facts absent from backend
    architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature D-COST-ATTRIBUTION-MODEL-20260524
    unitTests:
      - pnpm --filter dvt-api test -- getCostAttributionSummaryUseCase.test.ts
    cypressCoverage: N/A - protected API read model only
  - name: isInAuthorizedScope
    path: apps/api/src/application/services/getCostAttributionSummaryUseCase.ts
    dddOwner: Runtime usage read model
    cqRails: [GetCostAttributionSummary]
    fowlerSignals: [Tenant/project/environment filtering]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    unitTests: [pnpm --filter dvt-api test -- getCostAttributionSummaryUseCase.test.ts]
    cypressCoverage: N/A - protected API read model only
  - name: isAttributableStepEvent
    path: apps/api/src/application/services/getCostAttributionSummaryUseCase.ts
    dddOwner: Runtime usage read model
    cqRails: [GetCostAttributionSummary]
    fowlerSignals: [Explicit event subset]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    unitTests: [pnpm --filter dvt-api test -- getCostAttributionSummaryUseCase.test.ts]
    cypressCoverage: N/A - protected API read model only
  - name: readDurationMs
    path: apps/api/src/application/services/getCostAttributionSummaryUseCase.ts
    dddOwner: Runtime usage read model
    cqRails: [GetCostAttributionSummary]
    fowlerSignals: [Duration extraction without monetary inference]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    unitTests: [pnpm --filter dvt-api test -- getCostAttributionSummaryUseCase.test.ts]
    cypressCoverage: N/A - protected API read model only
  - name: isRecord
    path: apps/api/src/application/services/getCostAttributionSummaryUseCase.ts
    dddOwner: Runtime usage read model
    cqRails: [GetCostAttributionSummary]
    fowlerSignals: [Payload validation]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    unitTests: [pnpm --filter dvt-api test -- getCostAttributionSummaryUseCase.test.ts]
    cypressCoverage: N/A - protected API read model only
  - name: earlierIso
    path: apps/api/src/application/services/getCostAttributionSummaryUseCase.ts
    dddOwner: Runtime usage read model
    cqRails: [GetCostAttributionSummary]
    fowlerSignals: [Observation window calculation]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    unitTests: [pnpm --filter dvt-api test -- getCostAttributionSummaryUseCase.test.ts]
    cypressCoverage: N/A - protected API read model only
  - name: laterIso
    path: apps/api/src/application/services/getCostAttributionSummaryUseCase.ts
    dddOwner: Runtime usage read model
    cqRails: [GetCostAttributionSummary]
    fowlerSignals: [Observation window calculation]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    unitTests: [pnpm --filter dvt-api test -- getCostAttributionSummaryUseCase.test.ts]
    cypressCoverage: N/A - protected API read model only
  - name: sumDurations
    path: apps/api/src/application/services/getCostAttributionSummaryUseCase.ts
    dddOwner: Runtime usage read model
    cqRails: [GetCostAttributionSummary]
    fowlerSignals: [Run-level duration rollup]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    unitTests: [pnpm --filter dvt-api test -- getCostAttributionSummaryUseCase.test.ts]
    cypressCoverage: N/A - protected API read model only
  - name: COST_ATTRIBUTION_SUMMARY_LIMIT
    path: apps/api/src/entrypoints/http/costAttributionSummaryRouteParser.constants.ts
    dddOwner: Protected runtime HTTP adapter
    cqRails: [GetCostAttributionSummary]
    fowlerSignals: [Route input bounds]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    unitTests: [pnpm --filter dvt-api test -- getCostAttributionSummaryRoute.test.ts]
    cypressCoverage: N/A - protected API read model only
  - name: COST_ATTRIBUTION_SUMMARY_ACTION
    path: apps/api/src/entrypoints/http/costAttributionSummaryRouteParser.constants.ts
    dddOwner: Protected runtime HTTP adapter
    cqRails: [GetCostAttributionSummary]
    fowlerSignals: [Reused run list authorization]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    unitTests: [pnpm --filter dvt-api test -- getCostAttributionSummaryRoute.test.ts]
    cypressCoverage: N/A - protected API read model only
  - name: ParsedCostAttributionSummaryRequest
    path: apps/api/src/entrypoints/http/costAttributionSummaryRouteParser.ts
    dddOwner: Protected runtime HTTP adapter
    cqRails: [GetCostAttributionSummary]
    fowlerSignals: [Typed request parse result]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    unitTests: [pnpm --filter dvt-api test -- getCostAttributionSummaryRoute.test.ts]
    cypressCoverage: N/A - protected API read model only
  - name: ParsedCostAttributionSummaryResult
    path: apps/api/src/entrypoints/http/costAttributionSummaryRouteParser.ts
    dddOwner: Protected runtime HTTP adapter
    cqRails: [GetCostAttributionSummary]
    fowlerSignals: [Typed parse result]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    unitTests: [pnpm --filter dvt-api test -- getCostAttributionSummaryRoute.test.ts]
    cypressCoverage: N/A - protected API read model only
  - name: ParsedCostAttributionSummaryScope
    path: apps/api/src/entrypoints/http/costAttributionSummaryRouteParser.ts
    dddOwner: Protected runtime HTTP adapter
    cqRails: [GetCostAttributionSummary]
    fowlerSignals: [Typed tenant/project/environment scope]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    unitTests: [pnpm --filter dvt-api test -- getCostAttributionSummaryRoute.test.ts]
    cypressCoverage: N/A - protected API read model only
  - name: parseCostAttributionSummaryRequest
    path: apps/api/src/entrypoints/http/costAttributionSummaryRouteParser.ts
    dddOwner: Protected runtime HTTP adapter
    cqRails: [GetCostAttributionSummary]
    fowlerSignals: [Fail-closed request parser]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    unitTests: [pnpm --filter dvt-api test -- getCostAttributionSummaryRoute.test.ts]
    cypressCoverage: N/A - protected API read model only
  - name: parseCostAttributionSummaryScope
    path: apps/api/src/entrypoints/http/costAttributionSummaryRouteParser.ts
    dddOwner: Protected runtime HTTP adapter
    cqRails: [GetCostAttributionSummary]
    fowlerSignals: [Scope parser extraction]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    unitTests: [pnpm --filter dvt-api test -- getCostAttributionSummaryRoute.test.ts]
    cypressCoverage: N/A - protected API read model only
  - name: parseCostAttributionSummaryLimit
    path: apps/api/src/entrypoints/http/costAttributionSummaryRouteParser.ts
    dddOwner: Protected runtime HTTP adapter
    cqRails: [GetCostAttributionSummary]
    fowlerSignals: [Limit bounds parser]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    unitTests: [pnpm --filter dvt-api test -- getCostAttributionSummaryRoute.test.ts]
    cypressCoverage: N/A - protected API read model only
  - name: parseCostAttributionSummaryTenantId
    path: apps/api/src/entrypoints/http/costAttributionSummaryRouteParser.ts
    dddOwner: Protected runtime HTTP adapter
    cqRails: [GetCostAttributionSummary]
    fowlerSignals: [Tenant scope parser]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    unitTests: [pnpm --filter dvt-api test -- getCostAttributionSummaryRoute.test.ts]
    cypressCoverage: N/A - protected API read model only
  - name: parseCostAttributionSummaryProjectId
    path: apps/api/src/entrypoints/http/costAttributionSummaryRouteParser.ts
    dddOwner: Protected runtime HTTP adapter
    cqRails: [GetCostAttributionSummary]
    fowlerSignals: [Project scope parser]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    unitTests: [pnpm --filter dvt-api test -- getCostAttributionSummaryRoute.test.ts]
    cypressCoverage: N/A - protected API read model only
  - name: parseCostAttributionSummaryEnvironmentId
    path: apps/api/src/entrypoints/http/costAttributionSummaryRouteParser.ts
    dddOwner: Protected runtime HTTP adapter
    cqRails: [GetCostAttributionSummary]
    fowlerSignals: [Environment scope parser]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    unitTests: [pnpm --filter dvt-api test -- getCostAttributionSummaryRoute.test.ts]
    cypressCoverage: N/A - protected API read model only
  - name: buildCostAttributionSummaryScope
    path: apps/api/src/entrypoints/http/costAttributionSummaryRouteParser.ts
    dddOwner: Protected runtime HTTP adapter
    cqRails: [GetCostAttributionSummary]
    fowlerSignals: [Scope builder]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    unitTests: [pnpm --filter dvt-api test -- getCostAttributionSummaryRoute.test.ts]
    cypressCoverage: N/A - protected API read model only
  - name: costAttributionSummaryRoute
    path: apps/api/src/entrypoints/http/costAttributionSummaryRoute.ts
    dddOwner: Protected runtime HTTP adapter
    cqRails:
      - GetCostAttributionSummary
    fowlerSignals:
      - Hidden mock cost semantics
    architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature D-COST-ATTRIBUTION-MODEL-20260524
    unitTests:
      - pnpm --filter dvt-api test -- getCostAttributionSummaryRoute.test.ts
    cypressCoverage: N/A - protected API read model only
  - name: queryContext
    path: apps/api/test/application/services/getCostAttributionSummaryUseCase.test.ts
    dddOwner: Cost attribution use-case test fixture
    cqRails: [GetCostAttributionSummary]
    fowlerSignals: [Tenant-scoped test context]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    unitTests: [pnpm --filter dvt-api test -- getCostAttributionSummaryUseCase.test.ts]
    cypressCoverage: N/A - test helper
  - name: createReply
    path: apps/api/test/entrypoints/http/getCostAttributionSummaryRoute.test.ts
    dddOwner: Cost attribution route test fixture
    cqRails: [GetCostAttributionSummary]
    fowlerSignals: [HTTP reply test double]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    unitTests: [pnpm --filter dvt-api test -- getCostAttributionSummaryRoute.test.ts]
    cypressCoverage: N/A - test helper
  - name: httpError
    path: apps/api/test/entrypoints/http/getCostAttributionSummaryRoute.test.ts
    dddOwner: Cost attribution route test fixture
    cqRails: [GetCostAttributionSummary]
    fowlerSignals: [HTTP error expectation helper]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    unitTests: [pnpm --filter dvt-api test -- getCostAttributionSummaryRoute.test.ts]
    cypressCoverage: N/A - test helper
  - name: createDeps
    path: apps/api/test/entrypoints/http/getCostAttributionSummaryRoute.test.ts
    dddOwner: Cost attribution route test fixture
    cqRails: [GetCostAttributionSummary]
    fowlerSignals: [Route dependency test double]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    unitTests: [pnpm --filter dvt-api test -- getCostAttributionSummaryRoute.test.ts]
    cypressCoverage: N/A - test helper
```
