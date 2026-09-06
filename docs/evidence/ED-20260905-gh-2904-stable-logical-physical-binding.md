---
title: GH-2904 stable logical identity and physical binding evidence
status: Accepted
date: 2026-09-05
owners:
  - packages/@dvt/contracts
  - packages/@dvt/planner
  - apps/api
planning_type: evidence
arc_level: ARC-2
breaking: true
code_refs:
  - packages/@dvt/contracts/src/contracts/source-import/ConnectedSourceRef.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitFieldBindingHierarchy.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/ExecutionBindingVerification.v1.ts
  - packages/@dvt/contracts/test/dvt-substrait-semantic-document-decoding.contract.test.ts
  - packages/@dvt/planner/src/application/PlannerFacade.ts
  - packages/@dvt/planner/src/domain/Planner.ts
  - packages/@dvt/planner/test/unit/determinism.test.ts
  - apps/api/src/application/services/graphDraftWarehouseSourceImportStrategy.ts
  - apps/api/test/application/services/graphDraftWarehouseSourceImportStrategy.test.ts
  - apps/api/test/integration/plannerEngineContract.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter @dvt/planner test
    - pnpm --filter @dvt/planner typecheck
    - pnpm --filter dvt-api test
    - pnpm --filter dvt-api typecheck
    - pnpm docs:feature-mechanization:implementation -- --feature GH-2904-STABLE-LOGICAL-PHYSICAL-BINDING
    - GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs
    - pnpm verify:prepush
---

# GH-2904 stable logical identity and physical binding evidence

## Scope

PR #2992 implements the independent first hard cut of #2904. It separates DVT
logical identity from mutable connected-source and structural binding without
creating a second IR, identity store, compatibility alias, fallback lookup or
dual mode.

The final review baseline is
`main@6d14a3db8894a00a116b0f52478ac176952ce180`. The intervening #2979 Source
Inspector merge changes only Web/Inspector surfaces and has no file overlap with
this PR. The active #2936 stacked PRs own Canvas-side `RelationId` / `FieldId`
allocation, so this cut changes no `apps/web/**` production file and does not
compete with that owner.

## Source import proof

`GraphDraftWarehouseSourceImportStrategy` no longer derives a graph node ID from
`connectionId`, catalog, schema, table, provider or `sourceObjectId`. New Sources
receive an opaque `dvt_src_<uuidv7>` logical ID from `@dvt/crypto`; the persisted
`ConnectedSourceRef` remains the separate physical binding used for exact
import deduplication and later resolution.

The focused API tests prove:

- generated logical IDs contain none of the physical relation coordinates;
- the same physical relation reached through two connections gets distinct
  logical IDs rather than a binding-derived collision suffix;
- idempotent replay returns the already-persisted logical ID;
- duplicate connected-source bindings and legacy loose binding metadata fail
  closed before mutation.

## Planner boundary proof

The obsolete `derivePlannerGraphSourceFromManifest()` / `ManifestGraphDeriver`
public bridge is deleted together with its compatibility-only test surface.
`PlannerFacade` admits only canonical `GenericGraphSource`, and Planner uses
explicit `nodeId` / `dependsOn` values without reminting identity from dbt
manifest keys, names, paths or provider coordinates.

Planner determinism tests prove that provenance/display-only changes preserve
`stepId`, `inputHashSha256` and `planId` when logical identity and execution
semantics remain unchanged.

## Substrait identity proof

The semantic-document contract tests prove that:

- relation rename and connected-source physical rebinding preserve `RelationId`
  and `FieldId`;
- structural field reorder changes `outputOrdinal` without reminting `FieldId`;
- deterministic serialization/reload preserves the exact semantic document;
- duplicate or unbound identities continue to reject fail closed.

The contracts explicitly state that `outputOrdinal` is a structural position,
`ConnectedSourceRef` is a physical binding, and execution binding verification
has no authority to mint or repair logical identity.

## Breaking posture

This is intentionally a hard cut. The deleted Planner manifest bridge was a
public export, so the ARC record declares `breaking: true`; repository search
found no production consumer before deletion. No forwarding export, adapter,
feature flag or legacy alias is retained.

## Independent audit and residual

The complete PR delta contains no `apps/web/**` file. Planning DB reports no
Canvas command/query rail drift from this slice. One forbidden name fallback
remains on current main in `canvasSourceColumnOrder.ts`; that file is inside the
active #2936 semantic-identity work zone. #2904 therefore remains open after
this PR so that residual can be reconciled against the merged #2936 result
rather than creating two competing identity authorities.

The GitHub validation results for the final PR head are the executable closeout
baseline; superseded workflow runs are not counted as final evidence.

## Integration witnesses

The HTTP route regressions compare response IDs with the actual draft save,
require opaque UUIDv7 Source identity, and verify distinct IDs for distinct
physical objects. They failed at four name-derived expectations before
reconciliation and pass afterward (44 route/strategy tests).

The new shared-Canvas identity browser witness covers real import, row/byte
evidence, distinct connected bindings and identity retained after reload.
Execution outcomes and the separate legacy dbt-profile proof blocker #2994
are recorded in GitHub #2904; this evidence does not claim that old flow passes.
