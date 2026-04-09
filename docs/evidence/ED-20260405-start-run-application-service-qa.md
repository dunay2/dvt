---
title: StartRunApplicationService extraction QA artifact
status: Accepted
date: 2026-04-05
owners:
  - '@dvt/engine'
  - 'dvt-api'
planning_type: evidence
qa_artifact: true
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/engine/src/application/StartRunApplicationService.ts
  - packages/@dvt/engine/src/core/WorkflowEngine.ts
  - packages/@dvt/engine/src/index.ts
  - apps/api/src/application/services/WorkflowEngineFactory.ts
  - apps/api/test/application/services/WorkflowEngineFactory.test.ts
  - packages/@dvt/engine/test/services/StartRunApplicationService.test.ts
  - apps/api/test/integration/plannerEngineContract.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/engine build
    - pnpm --filter dvt-api typecheck
    - pnpm --filter @dvt/engine test
    - pnpm --filter dvt-api test
    - docker compose -f infra/docker/postgres/docker-compose.yml up -d
    - DATABASE_URL=postgresql://dvt:dvt@localhost:5432/dvt pnpm --filter dvt-api test -- protectedRuntime.integration
    - pnpm --filter dvt-api test -- planRoutes
    - pnpm --filter dvt-api test -- plannerEngineContract
    - pnpm verify:prepush
---

# StartRunApplicationService QA Closeout

## Markdown Artifact Path Suggestion

### Markdown Artifact Path Suggestion

- docs/evidence/ED-20260405-start-run-application-service-qa.md

## Summary

This artifact captures QA alignment for extracting `StartRunApplicationService`
from `WorkflowEngine` and reducing engine `startRun` to delegation.

Addendum (2026-04-07): this document now also records hard-QA documentary
evidence for protected-runtime integration under Docker and the follow-up test
stabilization required after plan-integrity ownership hardening.

Canonical execution tracking remains in:

- docs/planning/state/agent-lane-c.yaml
- docs/architecture/system-delivery-status.md

## Governing Sources

- docs/planning/status/governance-document-rule-inventory.md
- AGENTS.md
- docs/guides/ai-work-protocol.md
- docs/adr/ADR-0039-hexagonal-port-hardening-and-solid-remediation.md
- docs/guides/testing-and-ci-capabilities.md

## Findings

### High

- No high findings.

### Medium

- No medium findings.

### Low

- No low findings.

If there are no critical findings, say `No critical findings` and still report residual risks and follow-up work.
No critical findings.

## Risks and Opportunities

- Opportunity implemented: compatibility alias removed from engine public
  surface and internal dependency seam.
- Opportunity implemented: composition-root anti-alias test added in
  `WorkflowEngineFactory.test.ts` to prevent wiring regression.
- Opportunity implemented: start-run metrics emission assertions added in
  `StartRunApplicationService.test.ts` for regression visibility.

## Alignment

- Doc vs code: aligned for start-run ownership and delegation seam.
- Promise vs implementation: `WorkflowEngine.startRun` delegates to application service.
- Tests vs claims: application-service and engine wiring covered by package tests.
- Current truth vs planned truth: matches ADR extraction intent for this slice.
- Documentation update status: evidence doc created and indexed.
- Evidence and risk-doc status when applicable: ARC evidence present; risk update closed at `docs/risk-register/quality/R-20260405-START-RUN-ALIAS-DEPRECATION.yaml`.

## Architecture Assessment

- SRP: improved by separating orchestration from engine facade.
- DDD: use-case orchestration isolated in application layer.
- Hexagonal: composition-root dependency wiring preserved.
- CQRS if relevant: unchanged.
- Complexity: reduced inside `WorkflowEngine`.
- Modularity: improved with explicit start-run seam.

## Test Assessment

- Negative paths present: service tests cover authorization/rate-limit/recovery branches.
- Negative paths missing: none identified in touched scope.
- Regression status: no regression detected in touched suites.
- Determinism: unaffected by this refactor.
- Local suite vs meaningful global confidence: package + API integration scope validated.
- Global system view applied: yes, composition root and API integration included.
- Harness or shared fixture need: current fixtures sufficient.
- Test grouping by type (`unit` / `integration` / `contract` / `e2e` / regression) and rationale: unit/service tests plus API integration were sufficient for the seam change.

## Quality Gates

- Commands executed:
  - `pnpm --filter @dvt/engine build`
  - `pnpm --filter dvt-api typecheck`
  - `pnpm --filter @dvt/engine test`
  - `pnpm --filter dvt-api test`
  - `pnpm --filter @dvt/engine test -- StartRunApplicationService`
  - `pnpm --filter dvt-api test -- WorkflowEngineFactory`
  - `docker compose -f infra/docker/postgres/docker-compose.yml up -d`
  - `DATABASE_URL=postgresql://dvt:dvt@localhost:5432/dvt pnpm --filter dvt-api test -- protectedRuntime.integration`
  - `pnpm --filter dvt-api test -- planRoutes`
  - `pnpm --filter dvt-api test -- plannerEngineContract`
  - `pnpm docs:sync`
  - `pnpm verify:prepush`
- What passed:
  - `pnpm --filter dvt-api test -- protectedRuntime.integration` with Docker DB after test remediation (11 passed, 0 failed, 0 skipped).
  - `pnpm --filter dvt-api test -- planRoutes`.
  - `pnpm --filter dvt-api test -- plannerEngineContract`.
  - `pnpm verify:prepush`.
- What failed:
  - First Docker-backed run of `protectedRuntime.integration` failed with 2 tests (`500` vs expected `202`) due `PLAN_NOT_FOUND` and then `PLAN_STORE_CONFLICT`.
- What could not be verified:
  - none for the active protected-runtime scope once Docker-backed rerun passed.

## 2026-04-07 Runtime QA Addendum (Documentary Evidence)

### Scope

- `apps/api/src/entrypoints/http/planRoutes.ts`
- `apps/api/test/entrypoints/http/planRoutes.test.ts`
- `apps/api/test/integration/protectedRuntime.integration.test.ts`

### Observed failure and correction

1. Docker-backed integration removed the previous `skipped` state and exposed
   real regressions in two integration tests.
2. Root causes found in test setup:
   - stale start-run payload shape using a fixed unresolved `planRef`;
   - plan-store collision between tests reusing identical planner graph input.
3. Remediation applied in
   `apps/api/test/integration/protectedRuntime.integration.test.ts`:
   - migrated affected tests to planner-backed payloads (`graphSource`);
   - separated graph node ids per test to avoid cross-test plan collisions.
4. Rerun against Docker-backed Postgres finished green: 11/11 passed.

## Unblock Roadmap

### Wave 0 - Truth and documentation baseline

Tasks: `TASK-1`, `TASK-2`

Target:

- current-state ownership language remains explicit;
- ADR/service naming remains consistent across docs and exports.

### Wave 1 - Boundary and ownership hardening

Tasks: `TASK-3`, `TASK-4`

Target:

- complete consumer migration away from compatibility alias;
- keep engine as minimal facade.

### Wave 2 - Runtime and regression closure

Tasks: `TASK-5`, `TASK-6`

Target:

- ensure no adapter/runtime regressions after alias removal;
- close with updated evidence and validation.

## Action Artifact

### Task Checklist

- [x] `TASK-1` Update current-state documentation and diagrams
- [x] `TASK-2` Reconcile contract, error-code, and naming truth
- [x] `TASK-3` Extract or harden the ownership seam
- [x] `TASK-4` Add missing negative and regression tests
- [x] `TASK-5` Add or update evidence / risk docs if governance requires them
- [x] `TASK-6` Re-run validation and close the slice with evidence

### Task Details

#### `TASK-1` Update current-state documentation and diagrams

- Objective: reflect current ownership truth after extraction.
- Scope: evidence and service naming references.
- Recommended owner: engine maintainers.
- Dependencies: none.
- Documentation impact: evidence artifact added and indexed.
- Evidence / risk-doc impact: evidence direct, risk unchanged.
- Comment with rationale: documentation must match implemented architecture.
- Definition of Done:
  - docs state the current start-run ownership;
  - evidence references updated files and validations.

#### `TASK-2` Reconcile contract, error-code, and naming truth

- Objective: keep service naming and behavior terminology consistent.
- Scope: exports, tests, and API wiring.
- Recommended owner: engine + api maintainers.
- Dependencies: `TASK-1`.
- Documentation impact: QA artifact and references aligned.
- Evidence / risk-doc impact: evidence commands recorded.
- Comment with rationale: naming drift increases integration and review error risk.
- Definition of Done:
  - `StartRunApplicationService` is the primary term;
  - compatibility alias called out explicitly as temporary.

#### `TASK-3` Extract or harden the ownership seam

- Objective: enforce application service as start-run orchestrator.
- Scope: engine core delegation and factory composition.
- Recommended owner: engine maintainers.
- Dependencies: `TASK-2`.
- Documentation impact: architecture intent reflected in evidence.
- Evidence / risk-doc impact: covered by validation evidence.
- Comment with rationale: explicit ownership seam reduces facade drift.
- Definition of Done:
  - `WorkflowEngine.startRun` delegates;
  - orchestration lives in application service.

#### `TASK-4` Add missing negative and regression tests

- Objective: preserve confidence after refactor.
- Scope: service tests and API integration coverage.
- Recommended owner: engine + api maintainers.
- Dependencies: `TASK-2`, `TASK-3`.
- Documentation impact: test evidence listed in quality gates.
- Evidence / risk-doc impact: direct.
- Comment with rationale: refactor safety depends on branch coverage and wiring verification.
- Definition of Done:
  - touched negative paths are asserted;
  - integration wiring remains validated.

#### `TASK-5` Add or update evidence / risk docs if governance requires them

- Objective: satisfy ARC/evidence governance for touched scope.
- Scope: docs/evidence and docs/risk-register when required.
- Recommended owner: PR author.
- Dependencies: governance check.
- Documentation impact: evidence present; risk unchanged.
- Evidence / risk-doc impact: direct.
- Comment with rationale: missing governance artifacts causes CI rejection.
- Definition of Done:
  - evidence exists and is indexed;
  - risk doc added only if required by trigger outcome.

#### `TASK-6` Re-run validation and close the slice with evidence

- Objective: finalize this artifact with full gate evidence.
- Scope: repo-level prepush and QA artifact checks.
- Recommended owner: PR author.
- Dependencies: `TASK-1` through `TASK-5`.
- Documentation impact: closeout status updated after final gate.
- Evidence / risk-doc impact: direct.
- Comment with rationale: closure requires real post-edit validation.
- Definition of Done:
  - `pnpm verify:prepush` passes after this file update;
  - artifact reflects final command outcome.

## Mermaid Diagram

### Current-state dependency map

```mermaid
flowchart LR
  Engine[WorkflowEngine] --> Service[StartRunApplicationService]
  Service --> Policy[Policy assertion]
  Service --> Intent[Intent store]
  Service --> Dispatch[Adapter dispatch]
  Service --> Recovery[Compensation path]
  Service --> Obs[Tracing and metrics]
```

### Unblock sequence

```mermaid
flowchart LR
  A[Finalize QA artifact] --> B[Run verify prepush]
  B --> C[Update PR evidence]
```

## Validation Baseline For Each Execution Slice

1. touched package validation for `@dvt/engine` and `dvt-api`;
2. `pnpm docs:sync` when docs structure or indexes change;
3. ARC evidence/risk checks when trigger paths require them;
4. `pnpm verify:prepush` before final readiness claim.

## Final Verdict

Ready.
