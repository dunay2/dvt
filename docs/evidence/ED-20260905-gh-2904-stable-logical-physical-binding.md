---
title: GH-2904 stable logical identity and physical binding evidence
status: Accepted
date: 2026-09-06
owners:
  - packages/@dvt/contracts
  - packages/@dvt/planner
  - apps/api
  - apps/web
planning_type: evidence
arc_level: ARC-2
breaking: true
code_refs:
  - packages/@dvt/contracts/src/contracts/source-import/ConnectedSourceRef.v1.ts
  - packages/@dvt/contracts/src/contracts/source-import/SourceRebindOperations.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitSemanticDocument.v1.ts
  - packages/@dvt/planner/src/application/PlannerFacade.ts
  - apps/api/src/application/services/graphDraftWarehouseSourceImportStrategy.ts
  - apps/api/src/application/services/rebindWarehouseSourceUseCase.ts
  - apps/api/src/application/services/projectOnboardingPolicy.ts
  - apps/api/src/application/services/warehouseSourceRebindPlan.ts
  - apps/api/src/entrypoints/http/warehouseSourceRebindRoute.ts
  - apps/web/src/app/views/canvas/canvasColumnProjectionAuthority.ts
  - apps/web/src/app/views/canvas/canvasDvtSourceSemanticAuthoring.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter @dvt/planner test
    - pnpm --filter dvt-api test
    - pnpm --filter dvt-api typecheck
    - pnpm --filter @dvt/web test
    - pnpm --filter @dvt/web typecheck
    - pnpm docs:feature-mechanization:implementation -- --feature GH-2904-STABLE-LOGICAL-PHYSICAL-BINDING
    - GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs
    - pnpm verify:prepush
---

# GH-2904 stable logical identity and physical binding evidence

## Scope

Issue #2904 is implemented as two integration stages rather than one competing rewrite.
PR #2992 performed the ingress/Planner hard cut. PR #3001 completes the Canvas
FieldId-only mutation boundary and introduces the explicit physical Source rebind
command.

No identity store, second IR, compatibility alias, dual lookup or name/physical
fallback is introduced.

## Stage 1 — opaque Source identity and Planner ingress

`GraphDraftWarehouseSourceImportStrategy` allocates opaque `dvt_src_<uuidv7>`
logical node IDs independent of connection/catalog/schema/table/provider facts.
`ConnectedSourceRef` remains the connected physical binding.

The obsolete `derivePlannerGraphSourceFromManifest()` / `ManifestGraphDeriver`
public bridge is deleted. `PlannerFacade` admits canonical `GenericGraphSource`
with explicit `nodeId` / `dependsOn`; Planner does not remint identity from dbt
manifest keys, paths or names.

The #2992 HTTP regressions compare returned IDs with the actual persisted draft,
require opaque Source identity, and prove distinct physical imports receive
distinct logical IDs. The shared-Canvas live witness proves persistence through
reload.

## Stage 2A — FieldId-only Canvas semantic mutation

Issue #2936 completed opaque RelationId/FieldId allocation before this final cut. The
remaining mutation/read fallback is now removed:

- existing projection outputs resolve by `fieldId` only;
- a display-name collision is rejected rather than treated as an identity alias;
- output toggle/reorder and mapping edit use the persisted FieldId;
- `canvasDvtSourceSemanticAuthoring.ts` no longer repairs semantic identity/order
  from physical column names;
- graph projection no longer mutates semantic authority while reading it.

Names remain physical/presentation facts before an output receives semantic
identity. New output creation allocates a fresh FieldId; after creation, no name
fallback is retained.

## Stage 2B — governed physical Source rebind

The protected command rail is:

```text
RebindWarehouseSource
PATCH /workspace/sources/:nodeId/binding
workspace:source-import:rebind
```

Existing project creators retain this additive action only when their complete governed
creator grant is present; partial grants remain denied.

The client identifies the logical Source and requested physical target. Server
side discovery owns target facts. The command rejects:

- missing or ambiguous persisted Source schema evidence;
- missing/ambiguous target schema evidence;
- column name/type/nullability drift;
- non-relational targets;
- duplicate target `ConnectedSourceRef` ownership in one Canvas;
- missing governed target database user;
- a single-table rebind that would change shared dbt source-group database/schema;
- invalid reachable semantic authority;
- file or graph revision conflicts.

The dbt source artifact is written with revision CAS before the graph CAS. A graph
CAS failure triggers revision-checked compensation of the artifact. There is no
dual-write steady state.

## Identity preservation proof

`rebindDvtSubstraitSemanticSourceRefV1()` is the single contract operation for
replacing an exact matching semantic `sourceRef`. Its contract witness proves the
following remain byte/ID stable:

- semantic Substrait Plan bytes and digest;
- `RelationId` values;
- `FieldId` values.

The application witness additionally proves that a compatible rebind preserves
the Source node ID, node list, graph edges and persisted Source column order even
when discovery returns the target columns in a different presentation order.
Schema drift fails before any file or graph write, and a lost graph CAS exercises
the compensation path.

## Breaking posture

This is intentionally a HARD CUT. The manifest-to-Planner bridge remains deleted,
legacy Source semantic repair is removed, and existing semantic outputs cannot be
recovered through their display or physical name. No forwarding export, adapter,
feature flag, alias or compatibility lookup is retained.

Persisted historical opaque IDs themselves are not re-keyed: preserving an
already-persisted ID is the required stable-identity behavior, not backward
compatibility machinery.

## Residual classification

The old `canvasSourceColumnOrder.ts` residual cited by #2992 disappeared as part
of completed #2936. #3001 reconciles the surviving FieldId/name mutation paths
against that merged authority.

Issue #2994 remains open only for the older monolithic live E2E that still assumes a
retired dbt Canvas profile and implicit dbt model generation. Restoring that
profile would contradict the current product architecture; #2994 is not an
identity fallback and is not part of the #2904 hard-cut authority.

Final closeout uses the GitHub checks on the final PR head plus current-main
conflict/review audit; superseded workflow runs are not counted as final evidence.
