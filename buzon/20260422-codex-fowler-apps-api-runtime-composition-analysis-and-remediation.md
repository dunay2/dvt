---
title: Fowler analysis and remediation for apps/api runtime composition branch work
date: 2026-04-22
author: Codex
status: Active
branch_focus:
  - apps/api protected runtime composition
  - apps/api start-run application component
  - apps/api workspace-graph-draft runtime composition
---

# Fowler analysis and remediation for `apps/api`

## Scope reviewed

This review covers the current branch work around:

- `apps/api/src/modules/buildProtectedRuntimeModule.ts`
- `apps/api/src/modules/protectedRuntime/*`
- `apps/api/src/modules/startRun/buildProtectedStartRunRuntime.ts`
- `apps/api/src/modules/workspaceGraphDraft/buildWorkspaceGraphDraftRuntime.ts`
- the matching local component guides under `apps/api/docs`
- the matching architecture tests under `apps/api/test/modules`,
  `apps/api/test/application/services`, and
  `apps/api/test/entrypoints/http`

## Executive view

From a Fowler point of view, the branch is moving in the right direction.
The strongest improvement is the shift from a single composition-heavy
assembler toward named subcomponents with explicit owned concerns.

The codebase is getting closer to the shape seen in mature systems that use:

- a true composition root
- service-layer orchestration behind explicit ports
- local component guides instead of tribal knowledge
- architecture fitness functions that protect seams

This is closer to the modular style seen in mature Spring Boot, .NET, or
Guice-based backends than to an ad hoc Node service. The remaining gap is not
raw correctness but semantic encapsulation: some component seams are now split
in code before they are equally well named, documented, and mechanically
verified in docs.

## Patterns improved

### 1. Composition root instead of constructor sprawl

`buildProtectedRuntimeModule.ts` is no longer the place where every runtime
cluster is constructed inline. That is a real improvement toward Fowler's
composition-root discipline.

Improvement observed:

- storage construction moved to `buildProtectedRuntimeStorage.ts`
- admission construction moved to `buildProtectedAdmissionRuntime.ts`
- security construction moved to `buildProtectedSecurityRuntime.ts`
- execution construction moved to `buildProtectedExecutionRuntime.ts`
- start-run composition moved to `buildProtectedStartRunRuntime.ts`
- workspace-graph-draft composition moved to
  `buildWorkspaceGraphDraftRuntime.ts`

### 2. Better service-layer boundaries

The start-run path now reads like a proper application-service component:

- authorized facade
- admission gate
- planner-backed orchestration
- engine bridge

That is materially better than mixing command parsing, admission policy,
planner orchestration, and engine translation in one route or one service.

### 3. Local component guides as bounded documentation

The repo already has a stronger pattern than most teams manage:

- local component guides with public API
- invariants
- transitions
- consumers
- architecture tests that treat those guides as governed artifacts

This is a good fit for Fowler-style "narrative architecture plus executable
fitness functions".

### 4. Fitness functions instead of hope

The architecture tests around:

- HTTP runtime error translation
- plan-route response translation
- start-run application component
- start-run runtime composition
- workspace-graph-draft runtime composition

are already acting like lightweight ArchUnit-style checks. That is a mature
pattern.

## Anti-patterns still present

### 1. Semantic documentation is still uneven

The code split is ahead of the documentation split.

Observed gap before this remediation pass:

- `protectedRuntime/*` had real code ownership, but no equally explicit local
  component guide for the builder cluster itself
- some guides validated only section presence, not whether documented files and
  APIs matched real exports
- `workspace-graph-draft-runtime-composition-component.md` lacked the same
  owned-concern section already expected elsewhere

This is a documentation drift risk.

### 2. Some architecture tests are still string-first

The tests are useful, but several still rely on raw `sourceText.includes(...)`
assertions. That is acceptable for transition anchors, but weak for public API
truth.

The stronger target is:

- AST for code truth
- markdown contract checks for doc truth
- explicit mapping between documented API and exported API

### 3. Protected runtime builders were grouped in code more clearly than in docs

The builder cluster behaved like a component but was documented mostly through
the larger `protected-runtime-and-plan-compile-component.md` page. That page is
valuable, but it is broader than the builder cluster itself.

This is a classic "component exists but is not yet named at the right
granularity" smell.

## Repetitions detected

- repeated local-guide scaffold assertions across module architecture tests
- repeated "doc exists + sections + mermaid" logic
- repeated component-guide patterns without one shared semantic check for
  documented file/export coverage

## Opportunities

### Immediate

- treat local component guides as contracts, not prose
- make module-guide tests validate documented file names and exported API
- normalize every local guide to the same headings, including `Owned concern`

### Next

- introduce a machine-readable component-doc block or manifest per local guide
- generate part of the public API tables from AST
- introduce one repo-level checker for local guides similar to ArchUnit/NDepend
  style fitness rules

## Comparison with mature systems

Compared with mature systems, this branch is now stronger in three areas:

1. Better than many Node backends at naming subcomponents explicitly.
2. Closer to Spring/.NET modular backends in composition-root shape.
3. Stronger than average in using architecture tests as regression guards.

Where mature systems still do better:

1. They often have a single convention for component manifests or module
   metadata.
2. Their architecture checks are usually less stringly and more model-driven.
3. Their local docs often derive public API mechanically from source.

## Drift map

### Code vs docs drift that existed

- `protectedRuntime/*` builder cluster lacked its own local guide
- workspace-graph-draft guide lagged the owned-concern convention
- module-guide tests did not fully validate documented API against real module
  exports

### Drift risk still worth watching after this pass

- broad architecture pages under `docs/architecture/components/api` can start
  duplicating local guides if they become too detailed
- raw snippet assertions can drift when implementation is refactored without
  changing meaning

## Remediation applied in this pass

This pass is intended to apply these corrections:

- add a local component guide for the `protectedRuntime/*` dependency-builder
  cluster
- normalize the workspace-graph-draft guide to include an explicit owned
  concern section
- strengthen module architecture tests so they validate documented file/API
  pairs against real exports, not just heading presence
- keep module docblocks explicit about owned concern

## Recommended next slice after this one

If the team continues the Fowler cleanup, the next high-value slice is:

- make local component guides mechanically checkable through a small structured
  manifest or fenced metadata block

That would convert "documentation discipline" into "documentation contract",
which is the natural next maturity step for this repo.
