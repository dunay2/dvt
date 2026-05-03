---
title: Web SonarQube Findings Debt Plan
status: Proposed
owner: Frontend / Architecture
last_reviewed: 2026-05-03
planning_type: proposal
---

# Web SonarQube Findings Debt Plan

## Debt Summary

The current web slice has pending static-analysis debt across Cypress tests,
Canvas view logic, and CI support scripts. The debt is known and intentionally
tracked for a follow-up hardening cut.

## Findings Captured

| File                                                                               | Finding family                      | Debt                                  |
| ---------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------- |
| `apps/web/cypress/e2e/canvas/canvas-draft-access-posture.cy.ts`                    | complexity / duplication / ordering | test script too broad and fragile     |
| `apps/web/cypress/e2e/shell/startup-route-readiness.cy.ts`                         | complexity / duplication            | scenario orchestration overload       |
| `apps/web/src/app/views/canvas/canvasActiveGraphStrategy.ts`                       | cognitive complexity                | function branch load above policy     |
| `apps/web/src/app/views/canvas/canvasDraftAuthoringComponent.architecture.test.ts` | comparator determinism              | sort semantics not explicit           |
| `apps/web/src/app/views/canvas/canvasRouteInteractionState.ts`                     | nested ternary                      | reduced readability / maintainability |
| `apps/web/src/app/views/canvas/canvasStartupAndDraftRecovery.architecture.test.ts` | replaceAll / comparator             | avoidable string/comparator drift     |
| `tools/ci/architecture-dependency-guard.test.mjs`                                  | string raw / replaceAll             | maintainability/style debt            |
| `tools/ci/run-web-cypress-native.mjs`                                              | promise chain posture               | top-level flow style inconsistency    |

## Fowler Classification

| Signal              | Finding                                                             |
| ------------------- | ------------------------------------------------------------------- |
| Large method        | Cypress specs and strategy logic carry too many execution branches. |
| Primitive obsession | string operations and ad-hoc comparators repeat local semantics.    |
| Readability drift   | nested ternary and chained async patterns reduce intent clarity.    |
| Test fragility risk | architecture tests rely on low-signal string mechanics.             |

## C&Q / DDD Ownership

| Rail                                    | Type  | Owner                                 |
| --------------------------------------- | ----- | ------------------------------------- |
| `EvaluateCanvasDraftAccessPostureFlow`  | query | `CanvasDraftAccessPosture` read model |
| `EvaluateStartupRouteReadinessFlow`     | query | `StartupRouteReadiness` read model    |
| `EvaluateCanvasActiveGraphStrategy`     | query | `CanvasGraphStrategyPolicy`           |
| `ValidateWebStaticAnalysisDebtBaseline` | query | `WebQualityDebtLedger`                |

## Closure Intent

Next fix slice should:

1. split complex Cypress flows into scenario helpers
2. reduce `canvasActiveGraphStrategy` branch complexity
3. remove nested ternary in route interaction state
4. standardize comparator and string replacement helpers in tests
5. align CI helper async style and escape handling

```feature-mechanization
version: 1
featureId: WEB-SONARQUBE-FINDINGS-DEBT
mechanizationStatus: closed
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/web-sonarqube-findings-debt-plan-20260503.md
componentGuides:
  - docs/planning/proposals/mandatory/frontend-and-ux/web-sonarqube-findings-debt-plan-20260503.md
userStories:
  - docs/planning/proposals/mandatory/frontend-and-ux/web-sonarqube-findings-debt-plan-20260503.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
allowedImplementationSurfaces:
  - docs/planning/proposals/mandatory/frontend-and-ux/web-sonarqube-findings-debt-plan-20260503.md
forbiddenImplementationSurfaces:
  - .github/**
  - apps/**
  - packages/**
  - scripts/**
  - specs/**
commandQueryRails:
  - name: EvaluateCanvasDraftAccessPostureFlow
    type: query
    dddOwner: CanvasDraftAccessPosture read model
  - name: EvaluateStartupRouteReadinessFlow
    type: query
    dddOwner: StartupRouteReadiness read model
  - name: EvaluateCanvasActiveGraphStrategy
    type: query
    dddOwner: CanvasGraphStrategyPolicy
  - name: ValidateWebStaticAnalysisDebtBaseline
    type: query
    dddOwner: WebQualityDebtLedger
domainObjects:
  - name: WebQualityDebtLedger
    type: quality debt ledger
    owner: Web Architecture
  - name: CanvasGraphStrategyPolicy
    type: policy
    owner: Canvas
  - name: CanvasDraftAccessPosture
    type: read model
    owner: Canvas
fowlerSignals:
  - Large method
  - Primitive obsession
  - Readability drift
  - Test fragility risk
architectureGuards:
  - pnpm docs:feature-mechanization:implementation
cypressFlows:
  - N/A - debt registration only
completionGate:
  - pnpm exec markdownlint-cli2 docs/planning/proposals/mandatory/frontend-and-ux/web-sonarqube-findings-debt-plan-20260503.md --config .markdownlint-cli2.jsonc
  - pnpm docs:feature-mechanization:implementation
  - pnpm verify:prepush
redGreenCycles:
  - id: web-sonar-findings-debt-registration
    redTest: pnpm docs:feature-mechanization:implementation
    expectedFailure: New web Sonar debt plan is outside allowedImplementationSurfaces before this manifest exists.
    patchSurfaces:
      - docs/planning/proposals/mandatory/frontend-and-ux/web-sonarqube-findings-debt-plan-20260503.md
    greenTest: pnpm docs:feature-mechanization:implementation
symbols:
  - name: WebSonarQubeFindingsDebtPlan
    path: docs/planning/proposals/mandatory/frontend-and-ux/web-sonarqube-findings-debt-plan-20260503.md
    dddOwner: Web quality debt governance
    cqRails:
      - EvaluateCanvasDraftAccessPostureFlow
      - EvaluateStartupRouteReadinessFlow
      - EvaluateCanvasActiveGraphStrategy
      - ValidateWebStaticAnalysisDebtBaseline
    fowlerSignals:
      - Large method
      - Primitive obsession
      - Readability drift
      - Test fragility risk
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - debt registration only
    unitTests:
      - pnpm docs:feature-mechanization:implementation
```
