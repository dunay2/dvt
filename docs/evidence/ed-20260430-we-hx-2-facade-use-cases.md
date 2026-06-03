---
title: WE-HX-2 facade use-case narrowing
status: Accepted
date: 2026-04-30
owners:
  - '@dvt/engine'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/engine/src/core/WorkflowEngine.ts
  - packages/@dvt/engine/src/application/workflow-engine-use-cases/
  - apps/api/src/application/services/WorkflowEngineFactory.ts
evidence:
  tests:
    - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineFacadeUseCases.architecture.test.ts
    - pnpm --filter @dvt/engine typecheck
    - pnpm --filter @dvt/engine test -- test/core/WorkflowEngine.test.ts test/core/WorkflowEngine.planRef.test.ts test/architecture/workflowEngineFacadeUseCases.architecture.test.ts
    - pnpm --filter dvt-api typecheck
    - pnpm --filter @dvt/engine test
---

# WE-HX-2 Facade Use-Case Narrowing

## Summary

`WorkflowEngine` now acts as a compatibility facade that parses and normalizes
public inputs before delegating to explicit facade-facing use cases. Start-run
trace-context construction and observability span handling moved to
`WorkflowStartRunUseCase`, and recovery, cancel, status, and signal behavior are
adapted through named use-case services.

The hard QA follow-up splits those use cases into a component folder, adds local
stories, and records the Fowler mailbox analysis so the component is not just a
thin barrel over a multi-reason module.

## Proof

- Added semantic architecture coverage in
  `packages/@dvt/engine/test/architecture/workflowEngineFacadeUseCases.architecture.test.ts`.
- Added local component documentation in
  `docs/architecture/components/engine/architecture/workflow-engine-facade-use-cases-component.md`.
- Updated API and engine test wiring to construct facade use cases through
  `buildWorkflowEngineUseCases`.
- Added local user stories in
  `docs/architecture/components/engine/architecture/workflow-engine-facade-use-cases-user-stories.md`.
- Added Fowler mailbox analysis in
  `buzon/20260430-codex-fowler-we-hx-2-facade-use-cases-analysis-and-remediation.md`.
