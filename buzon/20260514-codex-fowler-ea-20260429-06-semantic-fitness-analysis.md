---
title: EA-20260429-06 Semantic Architecture Fitness Analysis
status: Accepted
date: 2026-05-14
owner: Codex
planning_type: analysis
---

# EA-20260429-06 Semantic Architecture Fitness Analysis

## Fowler Architecture Analysis

The root opportunity is `test-only confidence`: some engine architecture tests
used string containment to prove facade ownership. That can catch obvious drift,
but it also couples the test to formatting and token spelling rather than to the
TypeScript structure that owns the boundary.

## Planning Matrix

| Scenario                                     | Opportunity          | Fowler pattern            | DDD owner              | Command/query rail                        | Implementation surfaces                     | Unit or package test                              | Architecture test                                                   | User-flow test | Out of scope                              |
| -------------------------------------------- | -------------------- | ------------------------- | ---------------------- | ----------------------------------------- | ------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------- | -------------- | ----------------------------------------- |
| `WorkflowEngine` facade dependency ownership | Test-only confidence | Semantic fitness function | Engine facade boundary | none - internal architecture fitness only | `packages/@dvt/engine/test/architecture/**` | `engineArchitectureTestSupport.test.ts` red/green | `workflowEngineFacadeUseCases.architecture.test.ts` uses AST helper | none           | replacing every textual docs/import guard |

## Mature-System Comparison

Mature systems keep textual checks for documentation and import-policy
constraints, but use AST or dependency graph checks for code structure. This
slice adds a reusable TypeScript AST helper and migrates one facade-boundary
assertion away from incidental source strings.

## Applied Fixes

- Added AST support for extracting constructor parameter properties by class.
- Added a red/green helper test so the AST support is executable, not only
  implied by an architecture test.
- Migrated the `WorkflowEngine` facade dependency check to assert the
  constructor parameter-property structure semantically.

## Future Lessons

- Do not test architecture by copying a phrase from an old proposal.
- Prefer AST-backed checks when the invariant is TypeScript structure.
- Keep string checks only when the invariant is truly textual, such as docs
  sections, import path bans, or explicit module-header policy.
