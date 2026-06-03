---
title: Slice 3 - Planner Physical Reorganization Plan
status: Draft
owner: Core Architecture / Planner
last_reviewed: 2026-03-18
planning_type: proposal
source_inputs:
  - packages/@dvt/planner/src/index.ts
  - packages/@dvt/planner/src/application/PlannerFacade.ts
  - packages/@dvt/planner/src/domain/Planner.ts
  - packages/@dvt/planner/src/domain/errors.ts
  - packages/@dvt/planner/src/domain/types.ts
  - packages/@dvt/planner/src/ports/IArtifactResolver.ts
  - packages/@dvt/contracts/src/index.ts
  - docs/adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md
  - docs/adr/ADR-0035-planner-public-contract-evolution-protocol.md
---

# Slice 3 - Planner Physical Reorganization Plan

## 1. Purpose

This slice converts the corrected planner baseline into a concrete physical
reorganization plan.

It does not re-open Stage 1.1 contract ownership. That ownership is already
frozen by Stage 1.1 and ADR-0035.

This slice answers the next question:

> given the current `@dvt/planner` public surface, what stays, what moves, what
> becomes internal, and in what order?

## 2. Governing Position

The plan in this document is constrained by these accepted rules:

- ADR-0034: bounded contexts communicate through contracts, refs, messages, and
  composition roots, not by leaking peer-domain internals;
- ADR-0035: planner public contract semantics are planner-authored, but the
  canonical public contract home is `@dvt/contracts`;
- the reference architecture keeps planner deterministic, infrastructure behind
  ports, and artifact concerns outside core planning semantics.

This means Slice 3 must preserve all three of these truths:

- `PlannerFacade` remains the public planner boundary;
- public planner contracts remain authored by planner and physically hosted in
  `@dvt/contracts`;
- compiled-code and artifact-storage concerns do not remain permanent
  co-owners of the planner root surface.

## 3. Current Surface To Reorganize

The current root export surface of `@dvt/planner` contains five different
concerns:

1. public planner boundary
2. contract re-exports
3. planner-core seams
4. planner-internal leakage
5. artifact and adapter exports

That mixed surface was acceptable during Stage 1.1 transition, but it is not a
stable end state.

## 4. Slice 3 Decisions

### 4.1 Stable root surface

The long-term root surface of `@dvt/planner` should stay small and boundary-led.

Keep at the package root:

- `PlannerFacade`
- `PlannerFacadeOptions`
- `IArtifactResolver`
- `StepFactory`
- `PlannerLimits`
- `PlannerError`
- `PlannerErrorCode`

The root should continue to represent the planner boundary and the minimum
explicit extension seams around that boundary.

### 4.2 Transitional contract re-exports

The root may continue to re-export planner boundary contracts from
`@dvt/contracts` during migration, but these re-exports are compatibility
aliases, not ownership statements.

Transitional re-exports:

- `DbtManifestLike`
- `ExecutionPlanV2`
- `ExecutionStepV2`
- `GraphNode`
- `IPlanner`
- `IExecutionPlanner`
- `PlanCore`
- `PlannerBuildResultV2`
- `PlannerInputEnvelopeV2`
- `PlannerSelection`
- `StepKind`
- `ExecutionPlan` alias

Target posture:

- `IPlanner`, `PlannerInputEnvelopeV2`, and `PlannerBuildResultV2` remain the
  public logical boundary, but the canonical import home becomes
  `@dvt/contracts`;
- `ExecutionPlan` alias is deprecated first;
- the rest remain only until downstream imports are migrated.

### 4.3 Internalize planner leakage

The following should stop being root exports:

- `ResolvedPolicies`
- `PlannerMetrics`

These are not stable boundary contracts. They are implementation-facing planner
details.

`ResolvedPolicies` may continue to exist internally as a planner-core type.
`PlannerMetrics` may continue to exist internally or move later to an
observability-facing seam, but it should not remain part of the root planner
API.

### 4.4 Separate artifact concern from planner root

The following should leave the planner root surface:

- `ICompiledCodeStorage`
- `computeSha256`
- `attachCompiledCodeRefs`
- `AttachCompiledCodeRefsOptions`
- `S3CompiledCodeStorage`
- `MinioCompiledCodeStorage`
- `FileSystemCompiledCodeStorage`
- `InMemoryCompiledCodeStorage`
- `NoopCompiledCodeStorage`

These exports belong to the artifact concern, not to the planner boundary.

Their target home is the artifact bounded context identified in ADR-0034. Until
that package exists as a stable owner, they may live behind an explicit
compatibility subpath, but they should not remain permanent root exports of
`@dvt/planner`.

### 4.5 Do not reopen the public entry point

`Planner` remains internal. Slice 3 does not restore `Planner` as a public API.

The package stays facade-first.

## 5. Target Home Matrix

| Current export group                    | Current home                  | Target home                                                      | Final posture                                |
| --------------------------------------- | ----------------------------- | ---------------------------------------------------------------- | -------------------------------------------- |
| `PlannerFacade`, `PlannerFacadeOptions` | `@dvt/planner` root           | `@dvt/planner` root                                              | stable public boundary                       |
| `IArtifactResolver`                     | `@dvt/planner` root           | `@dvt/planner` root                                              | stable public application port               |
| `StepFactory`, `PlannerLimits`          | `@dvt/planner` root           | `@dvt/planner` root                                              | stable seam, narrow surface                  |
| `PlannerError`, `PlannerErrorCode`      | `@dvt/planner` root           | `@dvt/planner` root                                              | planner-owned boundary error surface         |
| public planner contracts                | `@dvt/planner` root re-export | `@dvt/contracts`                                                 | canonical home, temporary planner alias only |
| `ExecutionPlan` alias                   | `@dvt/planner` root re-export | `@dvt/contracts`                                                 | deprecated compatibility alias               |
| `ResolvedPolicies`                      | `@dvt/planner` root           | internal planner core                                            | remove from public root                      |
| `PlannerMetrics`                        | `@dvt/planner` root           | internal planner core or observability seam                      | remove from public root                      |
| compiled-code helpers and storage port  | `@dvt/planner` root           | artifact owner package                                           | remove from planner root                     |
| compiled-code adapters                  | `@dvt/planner` root           | artifact adapter package or artifact owner compatibility subpath | remove from planner root                     |

## 6. Compatibility Posture

Slice 3 uses owner-controlled compatibility, not silent breakage.

Rules:

1. `@dvt/contracts` becomes the documented import path for public planner
   contracts immediately.
2. `@dvt/planner` may keep temporary re-exports while consumers migrate.
3. compatibility aliases must be explicitly marked as transitional in comments
   and release notes;
4. no new consumer should be encouraged to import planner contracts from
   `@dvt/planner`;
5. the planner root must not add new artifact or adapter exports during the
   transition.

This keeps migration legal under ADR-0034's transitional duplication rule
without creating a fake new owner.

## 7. Migration Order

### Phase 1 - Freeze the root boundary

- declare the stable root surface;
- stop adding new root exports unrelated to boundary or core seam;
- update docs to point contract consumers to `@dvt/contracts`.

### Phase 2 - Remove root leakage

- remove `ResolvedPolicies` from the root;
- remove `PlannerMetrics` from the root;
- update any internal imports that depended on root-barrel leakage.

### Phase 3 - Extract artifact exports from the root

- stop exporting compiled-code storage and helpers from the planner root;
- introduce an explicit compatibility path if needed during transition;
- migrate direct consumers away from the root artifact exports.

### Phase 4 - Retire planner contract aliases

- deprecate `ExecutionPlan` alias first;
- migrate direct imports to `@dvt/contracts`;
- remove residual root contract re-exports once downstream references reach
  zero.

### Phase 5 - Optional deeper package split

Only after root-surface cleanup is complete should the repository decide
whether to physically split additional planner concerns, for example:

- a dedicated artifact owner package;
- a planner-dbt package;
- narrower public export subpaths.

This keeps Slice 3 focused on reorganization with immediate value instead of
turning it into a speculative package explosion.

## 8. Explicit Non-Goals

Slice 3 does not:

- redesign planner algorithms;
- change Stage 1.1 contract ownership;
- redefine planner semantics already governed by ADR-0035;
- require immediate extraction of a new `@dvt/planner-core` package;
- force `IArtifactResolver` into `@dvt/contracts`.

`IArtifactResolver` is a planner-boundary application port today. Slice 3 keeps
it there unless a later cross-context artifact API makes a better owner
necessary.

## 9. Validation Gates

Any implementation slice under this plan should validate at least:

- docs governance and doc location checks;
- planner package type-check and tests;
- contracts package type-check and tests when planner contract aliases change;
- affected consumer workspaces that import `@dvt/planner`.

Minimum command baseline for implementation work:

```bash
pnpm docs:gov
pnpm --filter @dvt/planner test
pnpm --filter @dvt/contracts build
```

Add affected-workspace validation whenever root exports are removed or import
paths are migrated.

## 10. Exit Criteria

Slice 3 is complete when all of the following are true:

- `@dvt/planner` root exports only planner-boundary symbols, explicit planner
  seams, and temporary compatibility aliases;
- `ResolvedPolicies` and `PlannerMetrics` are no longer root exports;
- compiled-code storage/helpers/adapters are no longer root exports;
- planner contract imports are documented against `@dvt/contracts`;
- the compatibility alias removal order is declared before deleting the aliases.

## 11. Recommended First Implementation Slice

The first code slice under this plan should be the lowest-risk one:

1. document `@dvt/contracts` as the canonical import path for planner
   contracts;
2. remove `ResolvedPolicies` and `PlannerMetrics` from the planner root;
3. leave artifact extraction and contract alias retirement for the following
   slice.

That sequence narrows the planner root immediately without coupling the first
change to a new artifact package or a breaking alias removal.
