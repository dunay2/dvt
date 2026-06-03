---
title: Slice 4 - Planner Artifact Boundary Post-Extraction Stabilization Plan
status: Draft
owner: Core Architecture / Planner / Artifacts
last_reviewed: 2026-03-19
planning_type: proposal
source_inputs:
  - packages/@dvt/artifacts/src/index.ts
  - packages/@dvt/artifacts/src/ports/ICompiledCodeStorage.ts
  - packages/@dvt/planner/src/index.ts
  - packages/@dvt/planner/src/ports/ICompiledCodeStorage.ts
  - packages/@dvt/contracts/src/types/artifacts.ts
  - docs/adr/ADR-0032-compiledcoderef-ownership.md
  - docs/adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md
  - docs/adr/ADR-0035-planner-public-contract-evolution-protocol.md
---

# Slice 4 - Planner Artifact Boundary Post-Extraction Stabilization Plan

## 1. Purpose

Slice 3 narrowed the planner root surface and fixed the architectural position
that compiled-code storage and enrichment are not permanent root concerns of
`@dvt/planner`.

The extraction to `@dvt/artifacts` has already happened. Slice 4 is now a
stabilization slice:

> harden the artifact owner package, clean up residual migration bridges, and
> update docs and validation so the extracted boundary becomes the steady state.

The goal is not to redesign compiled-code enrichment logic. The goal is to make
the post-extraction state explicit, validated, and removable from the planner
root when the compatibility bridge is no longer needed.

## 2. Current Reality

What is true now:

- `@dvt/artifacts` exists and is the owner package for `ICompiledCodeStorage`,
  `computeSha256`, `attachCompiledCodeRefs`, and the concrete storage adapters;
- `@dvt/planner` keeps a transitional compatibility bridge that re-exports
  those symbols from `@dvt/artifacts`;
- planner tests already import the artifact surface from `@dvt/artifacts`;
- docs, ADRs, evidence, and historical planning docs still contain residual
  planner-local references.

That means the remaining work is not package creation. It is stabilization:
validation, migration completion, and removal criteria.

## 3. Governing Constraints

Slice 4 is constrained by these accepted rules:

- ADR-0034: artifacts are their own bounded context and must not remain a
  permanent responsibility of planner or execution roots;
- ADR-0035: planner public contract authority stays with planner semantics and
  `@dvt/contracts`, not with artifact extraction work;
- ADR-0032: compiled-code refs remain legitimate execution-adjacent artifacts,
  but storage and attachment mechanics do not become planner-root ownership by
  default.

Therefore Slice 4 must preserve all of the following:

- `PlannerFacade` remains the planner public entry point;
- `ExecutionPlanV2` and planner boundary contracts remain in
  `@dvt/contracts`;
- artifact write-side logic stays owned by `@dvt/artifacts`;
- planner-root artifact exports remain explicitly transitional until removed.

## 4. Stabilized Owner Surface

The extracted artifact surface is:

- `ICompiledCodeStorage`
- `computeSha256`
- `attachCompiledCodeRefs`
- `AttachCompiledCodeRefsOptions`
- `S3CompiledCodeStorage`
- `MinioCompiledCodeStorage`
- `FileSystemCompiledCodeStorage`
- `InMemoryCompiledCodeStorage`
- `NoopCompiledCodeStorage`

These symbols are a coherent artifact concern:

- they store immutable bytes;
- they materialize or preserve integrity metadata;
- they expose artifact references and storage URIs;
- they are not required to compute the canonical planner output.

`IArtifactResolver` is not part of this move. It remains a planner port because
planner core uses it during plan construction.

## 5. Current Usage Signal

What exists today:

- planner root re-exports the artifact surface as a temporary migration bridge;
- planner tests already consume `@dvt/artifacts` directly;
- docs and evidence still reference planner-local paths in several places;
- there is no strong evidence of large downstream dependence on planner-root
  artifact exports.

This is good news for stabilization:

- the main work is documentation repair and bridge cleanup, not semantic
  redesign;
- the main risk is residual import drift, not broad API blast radius;
- owner-package validation must now be part of the baseline, because the owner
  package is already real.

## 6. Target Steady State

Target ownership split:

| Concern                                         | Target home      | Why                                                     |
| ----------------------------------------------- | ---------------- | ------------------------------------------------------- |
| storage port (`ICompiledCodeStorage`)           | `@dvt/artifacts` | artifact bounded-context port; not used by planner core |
| hash helper (`computeSha256`)                   | `@dvt/artifacts` | artifact integrity concern                              |
| plan post-enrichment (`attachCompiledCodeRefs`) | `@dvt/artifacts` | artifact attachment after plan construction             |
| concrete storage adapters                       | `@dvt/artifacts` | concrete infra belongs with artifact concern            |
| shared refs and serializable shapes             | `@dvt/contracts` | cross-context contracts stay in shared kernel           |
| resolver port (`IArtifactResolver`)             | `@dvt/planner`   | planner core port used during plan construction         |

## 7. Migration Shape

Slice 4 should now execute in four stabilization phases.

### Phase 1 - Harden artifact owner validation

Confirm the owner package has:

- local build and test commands that actually pass;
- meaningful tests for the exported artifact surface;
- clear import paths for downstream consumers.

### Phase 2 - Finish internal migration

Update remaining internal and test imports to use `@dvt/artifacts` rather than
planner-local compiled-code paths.

Priority updates:

- planner tests
- composition roots wiring compiled-code storage
- evidence docs and planning docs where canonical path matters

### Phase 3 - Keep the planner bridge explicit and measurable

`@dvt/planner` may keep temporary re-exports while downstream imports still
exist.

Rules for that bridge:

- it must be explicitly marked transitional;
- it must not grow new API;
- new code must import from `@dvt/artifacts`, not from `@dvt/planner`;
- removal criteria must stay declared up front.

### Phase 4 - Remove planner-root artifact exports

Once residual planner-root artifact imports reach zero, remove the bridge from
`@dvt/planner` and close Slice 4.

## 8. Compatibility Rules

Slice 4 uses owner-first compatibility, not dual ownership.

Rules:

1. the canonical import path is `@dvt/artifacts`;
2. `@dvt/planner` may re-export temporarily, but only as a migration bridge;
3. no new consumer should import artifact storage or compiled-code helpers from
   `@dvt/planner`;
4. the compatibility bridge must be deleted after residual imports reach zero.

## 9. Non-Goals

Slice 4 does not:

- redesign `attachCompiledCodeRefs` behavior;
- move artifact refs out of `@dvt/contracts`;
- redesign traceability read-side compiled-code resolution;
- define every future artifact API;
- change planner public contract governance from ADR-0035.

## 10. Risks

Primary risks:

- docs drift: planning and evidence docs still point to planner-local file
  paths;
- hidden compatibility drag: planner-root bridge may linger longer than
  intended;
- validation gaps: owner-package tests or app-level test/typecheck coverage may
  not yet match the new boundary layout.

Mitigations:

- migrate canonical docs in the same slice as canonical code paths;
- keep owner-package tests local and explicit;
- keep the planner bridge narrow and temporary;
- require affected app test/typecheck coverage as part of the stabilization
  baseline.

## 11. Validation Gates

Minimum validation for implementation work under Slice 4:

```bash
pnpm docs:gov
pnpm docs:gov:locations
pnpm --filter @dvt/artifacts build
pnpm --filter @dvt/artifacts test
pnpm --filter @dvt/contracts build
pnpm --filter @dvt/planner test
```

Additional required validation for the post-extraction state:

- affected integration tests in any composition root that wires compiled-code
  storage;
- typecheck for any workspace whose tests or runtime composition changed;
- changed-file lint and pre-push verification.

## 12. Exit Criteria

Slice 4 is complete when all of the following are true:

- compiled-code storage and attachment logic remain owned outside
  `@dvt/planner`;
- `@dvt/planner` root no longer acts as the canonical import home for artifact
  logic;
- compatibility re-exports, if any, are explicitly transitional;
- docs and canonical references point to `@dvt/artifacts` for write-side
  compiled-code logic;
- planner remains facade-first and contract authority remains unchanged.

## 13. Recommended Next Code Slice

The next implementation slice under this plan should stay narrow:

1. harden `@dvt/artifacts` validation and local tests;
2. finish test and documentation migration to the owner package paths;
3. keep planner-root re-exports temporarily;
4. measure residual planner-root imports;
5. defer broader artifact API unification until after the bridge is removable.
