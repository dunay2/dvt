---
title: GH-2904 stable logical identity and physical binding hard cut
status: Approved
owner: Architecture / Contracts / API / Web / Planner
last_reviewed: 2026-09-06
planning_type: implementation-plan
task_id: GH-2904
---

# GH-2904 stable logical identity and physical binding hard cut

## Governing sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- Planning DB architecture/component/command-query records
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/adr/ADR-0064-substrait-semantic-reference-and-bounded-logical-profile.md`
- `docs/adr/ADR-0060-dbt-project-authoring-authority.md`
- `docs/adr/ADR-0058-warehouse-source-import-rails.md`
- GitHub `#2904`

## Baseline and integration sequence

`#2992` merged the independent first hard cut: imported warehouse Sources now receive
opaque persisted DVT node IDs, `ConnectedSourceRef` is physical binding only, and the
obsolete manifest-to-Planner identity bridge is deleted.

`#2936` is now closed. Its allocator work makes the former Canvas exclusion obsolete.
The final #2904 cut therefore owns the remaining semantic mutation fallback and the
explicit physical Source rebind behavior.

PR #3001 started from `main@cf292cd6018c868cc14528adf035c8bf09e1a705` and is validated
against the current PR base. Main-only #2996 changes the composition menu and #2999 is
bounded documentation research; neither owns a surface in this cut.

## Invariant

```text
logical identity
!= display name
!= physical connection/relation/path
!= output ordinal
```

One persisted `RelationId` / `FieldId` is the authority for an existing semantic
relation/output. A physical Source rebind changes only binding/provenance coordinates
when the discovered target is schema-compatible.

## Identity and binding classification

| Surface                               | Classification                 | Rule                                                        |
| ------------------------------------- | ------------------------------ | ----------------------------------------------------------- |
| Workspace graph `node.id`             | logical identity               | stable through physical rebind                              |
| `RelationId`                          | logical identity               | stable; assigned once                                       |
| `FieldId`                             | logical identity               | stable; existing semantic mutation resolves by this ID only |
| `field.name` / `displayName`          | presentation/projection naming | never fallback identity                                     |
| `sourceFieldName`                     | physical/provenance field name | never fallback for an existing FieldId                      |
| `ConnectedSourceRef`                  | physical connected binding     | replaceable only by the governed rebind command             |
| database/schema/table/identifier      | physical/projection binding    | mutable without reminting logical identity                  |
| `outputOrdinal`                       | structural binding             | reorder only                                                |
| dbt `unique_id`                       | external dbt identity          | provenance/round-trip, not native DVT identity              |
| `GenericGraphSource.nodeId/dependsOn` | logical identity/reference     | admitted verbatim by Planner                                |

## Hard cut A — Canvas FieldId-only semantic mutation

Existing semantic outputs are no longer found through `fieldId || name`, name equality,
or a source-column name repair path.

- `canvasColumnMappingAuthoring.ts` edits an existing output only through `outputId -> fieldId`.
- `canvasColumnOutputAuthoring.ts` toggles/reorders existing outputs only through `fieldId`.
- `canvasColumnProjectionAuthority.ts` refuses a display-name collision instead of resolving
  that name to an existing semantic output.
- `canvasDvtSourceSemanticAuthoring.ts` no longer repairs persisted semantic field identity
  or order from physical column names.
- `canvasAuthoringGraphProjection.ts` is a projection only; it does not mutate semantic
  authority while reading it.

Names remain valid before semantic identity exists, for example when selecting a physical
source column to create a new output. Creation allocates a fresh opaque `FieldId`; after
creation, the `FieldId` is the only mutation identity.

## Hard cut B — explicit physical Source rebind

A dedicated protected command is introduced:

```text
PATCH /workspace/sources/:nodeId/binding
Authorization: workspace:source-import:rebind
Application owner: RebindWarehouseSourceUseCase
```

The caller supplies only the logical Source node ID plus the requested target
`connectionId` and `sourceObjectId`. The server discovers the target and owns all
compatibility checks.

### Verification rules

1. the Source must be one canonical imported `dvt.warehouse-source` with one
   `ConnectedSourceRef`;
2. persisted Source column schema must be complete and unambiguous;
3. the target must be a discovered relational object with complete schema evidence;
4. column names, normalized types and nullability must match independent of presentation
   order;
5. another logical Source in the Canvas must not already own the requested binding;
6. the target connection must expose the governed database user required by the dbt source
   metadata;
7. changing source-level database/schema through a single-Source rebind is rejected when
   the dbt source group contains sibling tables.

Any unverifiable or incompatible case fails closed. There is no old-name lookup, dual read,
dual write, schema coercion or compatibility alias.

### Atomicity and identity preservation

The command plans the dbt source artifact and graph draft before mutation. It applies the
artifact with revision CAS, then saves the graph with draft CAS. If graph CAS loses the
race, the artifact mutation is compensated with its own revision-checked rollback.

The rebind preserves:

- logical Source `node.id`;
- `nodeIds`, graph edges and downstream dependency targets;
- persisted Source column identity/order;
- Substrait semantic Plan bytes;
- sidecar `RelationId` and `FieldId`.

Only the exact matching semantic `sourceRef` and physical dbt/source metadata change.
`rebindDvtSubstraitSemanticSourceRefV1()` is the single contract operation that performs
that sidecar binding substitution and re-validates the document.

## Planner boundary retained from #2992

Planner continues to accept only canonical `GenericGraphSource` with explicit logical
`nodeId` / `dependsOn`. The deleted manifest bridge remains deleted. Planner does not mint,
repair or infer DVT identity from dbt names, paths or provider coordinates.

## Rejected options

1. Keep name lookup as fallback for old semantic outputs — rejected: permanent dual authority.
2. Re-key existing Source/Field IDs during rebind — rejected: destroys logical identity.
3. Trust client-supplied target schema — rejected: the server discovery boundary owns facts.
4. Require the old physical source to remain reachable — rejected: rebind must recover from a
   replaced/unavailable old binding; persisted logical schema is the comparison authority.
5. Mutate a shared dbt source group silently — rejected: would alter sibling bindings.
6. Add a generic identity/rebind service or second IR — rejected: existing graph and Substrait
   sidecar already own identity.
7. Restore the retired dbt Canvas profile to make the old E2E pass — rejected; #2994 owns that
   separate test-story reconciliation.

## Command/query and DDD ownership

| Rail                         | Type       | DDD owner                       | Responsibility                                                          |
| ---------------------------- | ---------- | ------------------------------- | ----------------------------------------------------------------------- |
| `ImportWarehouseSources`     | command    | Warehouse source import         | create a new opaque logical Source and physical binding                 |
| `RebindWarehouseSource`      | command    | Warehouse source import         | replace one verified physical binding without changing logical identity |
| `StartRun`                   | command    | Run command application service | consume canonical graph identity without reminting it                   |
| Workspace semantic admission | validation | Workspace graph authoring       | validate one stable Substrait sidecar authority                         |

## Test strategy

The final cut requires executable witnesses for:

- display-name collision cannot resolve an existing semantic output;
- legacy Source semantic repair by physical name is absent/fail-closed;
- compatible physical rebind preserves node ID, edges and persisted field order;
- reordered target discovery columns remain compatible;
- field type/nullability/name drift fails before writes;
- shared dbt source-group database/schema mutation fails closed;
- graph CAS failure rolls the artifact back;
- semantic `sourceRef` rebind preserves Plan bytes, RelationIds and FieldIds;
- protected HTTP authorization and error translation remain fail closed;
- project onboarding and the coordinated local protected runtime grant the dedicated rebind action.

`#2994` remains a separate E2E repair for the retired dbt Canvas profile. It is not an
identity compatibility mechanism and does not block the #2904 architectural hard cut once
the new command and identity witnesses are green.

## Completion gates

- affected workspace build/lint/typecheck;
- contracts and API/Web focused tests;
- Contracts & Determinism;
- PR Quality / ARC / feature mechanization;
- CodeQL and dependency review when Ready;
- `pnpm verify:prepush` on the final integrated head;
- current-main overlap and review-thread audit before squash merge.

## Feature mechanization

```feature-mechanization
{
  "version": 1,
  "featureId": "GH-2904-STABLE-LOGICAL-PHYSICAL-BINDING",
  "userStories": [
    "Existing semantic outputs mutate only by stable FieldId",
    "A compatible physical Source rebind preserves logical graph and Substrait identity"
  ],
  "cypressFlows": [
    "apps/web/cypress/e2e/canvas/canvas-source-identity-live.cy.ts",
    "N/A - the new rebind command is covered at contract/application/HTTP boundaries; #2994 separately owns the retired dbt-profile E2E"
  ],
  "domainObjects": [
    "Workspace graph Source identity",
    "ConnectedSourceRef physical binding",
    "DVT Substrait identity sidecar",
    "Semantic FieldId",
    "GenericGraphSource"
  ],
  "fowlerSignals": [
    "Hidden authority",
    "Primitive obsession",
    "Duplicate semantics",
    "Boundary drift",
    "Test-only confidence"
  ],
  "symbols": [
    {
      "name": "RebindWarehouseSourceUseCase",
      "path": "apps/api/src/application/services/rebindWarehouseSourceUseCase.ts",
      "cqRails": ["RebindWarehouseSource"],
      "dddOwner": "Warehouse source import",
      "unitTests": ["pnpm --filter dvt-api test:unit"],
      "fowlerSignals": ["Hidden authority", "Boundary drift"],
      "cypressCoverage": "apps/web/cypress/e2e/canvas/canvas-source-identity-live.cy.ts",
      "architectureGuard": "pnpm docs:feature-mechanization:implementation -- --feature GH-2904-STABLE-LOGICAL-PHYSICAL-BINDING"
    },
    {
      "name": "rebindDvtSubstraitSemanticSourceRefV1",
      "path": "packages/@dvt/contracts/src/contracts/planner/DvtSubstraitSemanticDocument.v1.ts",
      "cqRails": ["RebindWarehouseSource"],
      "dddOwner": "Warehouse source import",
      "unitTests": ["pnpm --filter @dvt/contracts test"],
      "fowlerSignals": ["Duplicate semantics", "Boundary drift"],
      "cypressCoverage": "apps/web/cypress/e2e/canvas/canvas-source-identity-live.cy.ts",
      "architectureGuard": "pnpm docs:feature-mechanization:implementation -- --feature GH-2904-STABLE-LOGICAL-PHYSICAL-BINDING"
    },
    {
      "name": "resolveCanvasColumnMappingTarget",
      "path": "apps/web/src/app/views/canvas/canvasColumnProjectionAuthority.ts",
      "cqRails": [],
      "dddOwner": "Canvas semantic authoring",
      "unitTests": ["pnpm --filter @dvt/web test"],
      "fowlerSignals": ["Hidden authority", "Primitive obsession"],
      "cypressCoverage": "apps/web/cypress/e2e/canvas/canvas-source-identity-live.cy.ts",
      "architectureGuard": "pnpm docs:feature-mechanization:implementation -- --feature GH-2904-STABLE-LOGICAL-PHYSICAL-BINDING"
    },
    {
      "name": "PlannerFacade",
      "path": "packages/@dvt/planner/src/application/PlannerFacade.ts",
      "cqRails": ["StartRun"],
      "dddOwner": "Run command application service",
      "unitTests": ["pnpm --filter @dvt/planner test"],
      "fowlerSignals": ["Boundary drift"],
      "cypressCoverage": "apps/web/cypress/e2e/canvas/canvas-source-identity-live.cy.ts",
      "architectureGuard": "pnpm docs:feature-mechanization:implementation -- --feature GH-2904-STABLE-LOGICAL-PHYSICAL-BINDING"
    }
  ],
  "completionGate": [
    "pnpm --filter @dvt/contracts test",
    "pnpm --filter @dvt/contracts typecheck",
    "pnpm --filter dvt-api test",
    "pnpm --filter dvt-api typecheck",
    "pnpm --filter @dvt/web test",
    "pnpm --filter @dvt/web typecheck",
    "GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs",
    "pnpm docs:feature-mechanization:implementation -- --feature GH-2904-STABLE-LOGICAL-PHYSICAL-BINDING",
    "pnpm verify:prepush"
  ],
  "redGreenCycles": [
    {
      "id": "fieldid-only-semantic-mutation",
      "redTest": "pnpm --filter @dvt/web test",
      "greenTest": "pnpm --filter @dvt/web test",
      "patchSurfaces": [
        "apps/web/src/app/views/canvas/canvasColumnMappingAuthoring.ts",
        "apps/web/src/app/views/canvas/canvasColumnOutputAuthoring.ts",
        "apps/web/src/app/views/canvas/canvasColumnProjectionAuthority.ts",
        "apps/web/src/app/views/canvas/canvasDvtSourceSemanticAuthoring.ts",
        "apps/web/src/app/views/canvas/canvasAuthoringGraphProjection.ts",
        "apps/web/src/app/views/canvas/canvasColumnProjectionAuthority.identity.test.ts",
        "apps/web/src/app/views/canvas/canvasDvtSourceSemanticAuthoring.test.ts"
      ],
      "expectedFailure": "Existing semantic output is incorrectly recoverable by display/physical name or legacy Source repair"
    },
    {
      "id": "verified-source-rebind",
      "redTest": "pnpm --filter dvt-api test",
      "greenTest": "pnpm --filter @dvt/contracts test && pnpm --filter dvt-api test",
      "patchSurfaces": [
        "packages/@dvt/contracts/src/contracts/source-import/SourceRebindOperations.v1.ts",
        "packages/@dvt/contracts/src/contracts/source-import/index.ts",
        "packages/@dvt/contracts/src/contracts/planner/DvtSubstraitSemanticDocument.v1.ts",
        "packages/@dvt/contracts/test/dvt-substrait-source-rebind.contract.test.ts",
        "apps/api/src/application/ports/accessDecisionActions.ts",
        "apps/api/src/application/ports/warehouseSourceRebind.ts",
        "apps/api/src/application/services/projectOnboardingPolicy.ts",
        "apps/api/src/application/services/rebindWarehouseSourceUseCase.ts",
        "apps/api/src/application/services/warehouseSourceRebindPlan.ts",
        "apps/api/src/application/services/warehouseSourceRebindArtifactTransaction.ts",
        "apps/api/src/entrypoints/http/runtimeRoutes.constants.ts",
        "apps/api/src/entrypoints/http/warehouseSourceImportRouteGroup.ts",
        "apps/api/src/entrypoints/http/warehouseSourceRebindRoute.ts",
        "apps/api/test/application/ports/accessDecision.test.ts",
        "apps/api/test/application/services/createProjectUseCase.test.ts",
        "apps/api/test/application/services/rebindWarehouseSourceUseCase.test.ts",
        "apps/api/test/entrypoints/http/warehouseSourceRebindRoute.test.ts",
        "scripts/run-dev-stack.auth.cjs",
        "scripts/run-dev-stack.source-rebind.auth.test.cjs",
    "docs/adr/ADR-0058-warehouse-source-import-rails.md",
        "docs/evidence/ED-20260905-gh-2904-stable-logical-physical-binding.md",
        "docs/risk-register/quality/R-20260905-GH-2904-STABLE-LOGICAL-PHYSICAL-BINDING.yaml"
      ],
      "expectedFailure": "Physical binding cannot be changed through one verified command while preserving logical identity"
    }
  ],
  "componentGuides": [
    "docs/architecture/system/subsystems/semantic-transformation/index.md"
  ],
  "governingSources": [
    "AGENTS.md",
    "docs/adr/ADR-0064-substrait-semantic-reference-and-bounded-logical-profile.md",
    "docs/adr/ADR-0058-warehouse-source-import-rails.md",
    "docs/architecture/command-query-rail-governance.md",
    "docs/architecture/fowler-opportunity-planning-governance.md"
  ],
  "commandQueryRails": [
    {
      "name": "ImportWarehouseSources",
      "type": "command",
      "status": "implemented",
      "dddOwner": "Warehouse source import",
      "negativeTests": ["duplicate connected binding fails closed"],
      "adapterSurface": "warehouse Source Import HTTP rail",
      "applicationPort": "ImportWarehouseSourcesUseCase",
      "authorizationScope": "tenant/project/environment source-import command"
    },
    {
      "name": "RebindWarehouseSource",
      "type": "command",
      "status": "implemented",
      "dddOwner": "Warehouse source import",
      "negativeTests": [
        "schema drift fails before mutation",
        "duplicate target binding fails closed",
        "shared dbt source-group physical move fails closed",
        "graph CAS failure compensates artifact mutation"
      ],
      "adapterSurface": "PATCH /workspace/sources/:nodeId/binding",
      "applicationPort": "RebindWarehouseSourceUseCase",
      "authorizationScope": "workspace:source-import:rebind"
    },
    {
      "name": "StartRun",
      "type": "command",
      "status": "implemented",
      "dddOwner": "Run command application service",
      "negativeTests": ["invalid or duplicate logical graph IDs reject"],
      "adapterSurface": "protected StartRun HTTP command",
      "applicationPort": "PlannerBackedStartRunUseCase",
      "authorizationScope": "tenant/project/environment run-start command"
    }
  ],
  "architectureGuards": [
    "pnpm docs:feature-mechanization:implementation -- --feature GH-2904-STABLE-LOGICAL-PHYSICAL-BINDING",
    "GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs"
  ],
  "implementationPlan": "docs/planning/proposals/mandatory/runtime-and-contracts/gh-2904-stable-logical-physical-binding-hardcut-20260905.md",
  "mechanizationStatus": "implemented",
  "noHumanDecisionsRemaining": true,
  "allowedImplementationSurfaces": [
    "packages/@dvt/contracts/src/contracts/source-import/ConnectedSourceRef.v1.ts",
    "packages/@dvt/contracts/src/contracts/source-import/SourceRebindOperations.v1.ts",
    "packages/@dvt/contracts/src/contracts/source-import/index.ts",
    "packages/@dvt/contracts/src/contracts/planner/DvtSubstraitSemanticDocument.v1.ts",
    "packages/@dvt/contracts/src/contracts/planner/DvtSubstraitFieldBindingHierarchy.v1.ts",
    "packages/@dvt/contracts/src/contracts/planner/ExecutionBindingVerification.v1.ts",
    "packages/@dvt/contracts/test/**",
    "packages/@dvt/planner/**",
    "apps/api/src/application/ports/accessDecisionActions.ts",
    "apps/api/src/application/ports/warehouseSourceRebind.ts",
    "apps/api/src/application/services/projectOnboardingPolicy.ts",
    "apps/api/src/application/services/graphDraftWarehouseSourceImportStrategy.ts",
    "apps/api/src/application/services/rebindWarehouseSourceUseCase.ts",
    "apps/api/src/application/services/warehouseSourceRebindPlan.ts",
    "apps/api/src/application/services/warehouseSourceRebindArtifactTransaction.ts",
    "apps/api/src/entrypoints/http/runtimeRoutes.constants.ts",
    "apps/api/src/entrypoints/http/warehouseSourceImportRouteGroup.ts",
    "apps/api/src/entrypoints/http/warehouseSourceRebindRoute.ts",
    "apps/api/test/**",
    "apps/web/src/app/views/canvas/canvasColumnMappingAuthoring.ts",
    "apps/web/src/app/views/canvas/canvasColumnOutputAuthoring.ts",
    "apps/web/src/app/views/canvas/canvasColumnProjectionAuthority.ts",
    "apps/web/src/app/views/canvas/canvasDvtSourceSemanticAuthoring.ts",
    "apps/web/src/app/views/canvas/canvasAuthoringGraphProjection.ts",
    "apps/web/src/app/views/canvas/canvasColumnProjectionAuthority.identity.test.ts",
    "apps/web/src/app/views/canvas/canvasDvtSourceSemanticAuthoring.test.ts",
    "apps/web/cypress/e2e/canvas/canvas-source-identity-live.cy.ts",
    "apps/web/cypress/support/liveWarehouseSourceImport.ts",
    "scripts/run-canvas-source-import-live-proof.cjs",
    "scripts/run-canvas-source-import-live-proof.test.cjs",
    "scripts/run-dev-stack.auth.cjs",
    "scripts/run-dev-stack.source-rebind.auth.test.cjs",
    "docs/adr/ADR-0058-warehouse-source-import-rails.md",
    "docs/architecture/**",
    "docs/.manifest.json",
    "docs/evidence/ED-20260905-gh-2904-stable-logical-physical-binding.md",
    "docs/guides/generic-graph-source-technical-manual-20260404.md",
    "docs/risk-register/quality/R-20260905-GH-2904-STABLE-LOGICAL-PHYSICAL-BINDING.yaml",
    "docs/planning/proposals/mandatory/runtime-and-contracts/gh-2904-stable-logical-physical-binding-hardcut-20260905.md"
  ],
  "forbiddenImplementationSurfaces": [
    "packages/@dvt/engine/**",
    "new identity stores, second IRs, compatibility aliases, feature flags, name/physical fallback paths or dual lookup modes"
  ]
}
```
