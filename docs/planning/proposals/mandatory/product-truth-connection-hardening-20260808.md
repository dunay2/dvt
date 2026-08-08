# DVT Product Truth and Explicit Connection Hardening

Status: Working proposal
Baseline: `main@32cfaf6d31fa5ca789bdb390def95d27f5d71f59`
Governing epic: #2254
Working issues: #2255, #2256, #2257
Related owners: #2195, #2170, #2171, #2173, #2174, #2176

## 1. Purpose

This proposal freezes the product/architecture intent for the next hardening slice before implementation grows further.

The immediate goal is not to add another provider, orchestration engine, generic form system, or speculative node family. The goal is to make the current product truthfully usable, prove it through live behavior, and separate Project/Environment semantics from Connection/Source semantics.

A capability is not considered Done merely because code exists or CI is green.

```text
implemented
-> automated proof
-> live product proof
-> user acceptance
-> Done
```

## 2. Verified current implementation

### 2.1 Project/workspace switching already exists

Current Web code already exposes granted workspace switching through:

- `apps/web/src/app/components/shell/ShellWorkspaceScopeSelector.tsx`;
- `apps/web/src/app/services/session/workspaceScopeSelectionPort.ts`;
- `apps/web/src/app/stores/sessionStore.ts`.

The selector is rendered inside the Workspace menu, shows technical scope identities, and switches only among server-granted `tenantId/projectId/environmentId` combinations.

Therefore the implementation gap is not "build a project selector from scratch". The remaining product work is:

- make the current selection discoverable and semantically clear;
- decide truthful browser/server selection ownership through #2170;
- prove that switching scope cannot leak stale graph/file/artifact/query data through #2174/#2255.

### 2.2 Source Import already has a connection concept

Current Source Import already requires a `WarehouseConnection` before source-object selection. The Graph Draft import strategy creates `dvt.warehouse-source` / `dvt:source` nodes.

The implementation already uses `connectionId` in some generated identifiers, but persisted/replay semantics still materially use `sourceObjectId`, and the created node metadata does not carry one canonical connection-bound semantic reference.

This means the correct change is convergence, not a second connection catalog.

### 2.3 dbt origin is not execution connection

`apps/web/src/app/views/canvas/dbtAuthoringFieldsModel.ts` derives `originOptions` from upstream graph nodes. It represents graph dependency/source semantics.

It must not be reused or renamed as:

- Project source;
- dbt profile/target;
- execution connection.

These concepts remain separate.

### 2.4 Canvas acceptance remains incomplete

#2195 already identifies the required authoring truth:

```text
focus/identify node
-> inspect authoritative facts
-> edit supported fields
-> validate/apply
-> persist
-> close/reopen or reload
-> observe the same authoritative value
```

#2255 makes this a product acceptance gate rather than optional follow-up polish.

## 3. Target semantic model

```text
Tenant
└─ Project
   ├─ Environment
   ├─ ProjectSource / CodeSource
   │  └─ repo / branch / SHA / working tree
   └─ Canvas
      ├─ ConnectionRef A
      │  ├─ ConnectedSource A1
      │  └─ ConnectedSource A2
      ├─ ConnectionRef B
      │  └─ ConnectedSource B1
      └─ transformations / tests / sinks / future transfer steps
```

### 3.1 Meaning of each concept

**Project**

DVT functional container. It is not a database connection.

**Environment**

Operational scope such as dev/stage/prod. It is not a database connection.

**ProjectSource / CodeSource**

Where project code comes from: repository, branch/SHA, or working tree.

**Connection**

Stable non-secret identity/configuration reference for an external execution/data system.

**ConnectedSource**

A physical source object qualified by the connection through which DVT addresses it.

**Upstream dependency**

Graph dependency between nodes. This is the current dbt `origin` meaning and remains independent of Connection.

## 4. Proposed minimal contracts

For the #2256 slice, the names and versioned shapes below are frozen before TDD.

```ts
type ConnectionRef = Readonly<{
  schemaVersion: 'connection-ref.v1';
  connectionId: string;
  provider: string;
}>;

type ConnectedSourceRef = Readonly<{
  schemaVersion: 'connected-source-ref.v1';
  connectionRef: ConnectionRef;
  sourceObjectId: string;
}>;
```

The first implementation adds only the fields required by current Postgres Source Import. `NodeResourceBinding` and the dbt target binding remain outside this slice so that the product does not acquire a generic resource framework before a real command owns it.

## 5. Required invariants

1. Project/Environment scope never identifies a warehouse/database connection.
2. Two connected sources with different `connectionId` are distinct even when catalog/schema/object identity is identical.
3. Secrets/passwords/tokens/connection strings are never persisted in graph metadata or `ExecutionPlan`.
4. A default connection/target may be resolved automatically, but the effective binding must remain visible and inspectable.
5. Unsupported/missing connection bindings must be explicit and fail closed for execution readiness.
6. One resource capability has one authoritative binding; hidden default state must not compete with visible graph state.
7. Workspace/project switching must key/invalidate all scope-dependent cached state by the complete granted scope.
8. A future cross-connection step must declare both source and destination connections explicitly; implicit connection changes are forbidden.

## 6. Canvas representation decision

#2256 chooses the smallest truthful rendering.

### Option A — compact first-class connection node

```text
[Connection: postgres-dev]
      |
      +--> [Source: orders]
      +--> [dbt target]
```

Use this when graph topology, planner analysis, or explicit branch switching gains real value from representing Connection as a node.

### Option B — explicit connection/resource binding card

Keep the Connection as a domain resource and render its binding explicitly in Canvas/Workbench.

Use this when a graph node would add topology without independent behavior.

**Decision for PTH1:** Option B. The selected source node exposes a read-only,
localized Connection fact in the existing Workbench. Source Import remains the
only mutation command. An editable control is forbidden until an authoritative
binding command exists.

A hidden global/default connection is not an allowed third option.

## 7. dbt first vertical

#2257 is the first proof that Project != Connection.

Proposed bounded projection:

```ts
type DbtTargetBinding = Readonly<{
  profileName: string;
  targetName: string;
  connectionRef: ConnectionRef;
  resolution: 'explicit' | 'project-default' | 'environment-default';
}>;
```

Only fields resolved from current authoritative dbt/runtime configuration may be populated.

The UI must show:

- effective profile/target when current code can resolve them;
- effective connection identity;
- whether the value was explicit or defaulted;
- ready/missing/unsupported posture;
- a mutation control only when one authoritative persistence command exists.

The current upstream `origin` selector remains dependency semantics and is not repurposed.

## 8. Planning/runtime boundary

Do not add database/connection values to global `ExecutionPlan.scope`.

Project/security scope remains separate from resource binding.

A dbt execution step may consume a stable reference only where execution needs it, for example:

```text
DBT_RUN
  projectRef
  selection
  dbtTargetBindingRef
      -> connectionRef
```

Runtime resolves secret material through the existing credential/secret boundary.

## 9. Hardening sequence

### P0-A — Product acceptance baseline (#2255)

Prove current product behavior using existing live/service-backed rails, including reload and product-owner acceptance.

### P0-B — Workspace/project isolation (#2170 + #2174)

Use the existing selector. Correct semantic ownership and scope-keyed caches. Prove two workspaces with colliding file/node names cannot cross-contaminate.

### P0-C — Connected-source identity (#2173 + #2256)

Converge current Warehouse Connection/Source Import model on one `ConnectedSourceRef` and explicit visible binding.

### P0-D — Canvas authoring truth (#2195)

Finish selection/focus semantics, editable/read-only truth, persistence/reload and duplicate command-surface convergence.

### P0-E — dbt target binding (#2171 + #2257)

Expose the effective target/connection without hiding it in Environment or upstream origin semantics.

### P1 — runtime capability truth (#2176)

Only after the product surface is stable, make readiness/capability reporting reflect the delivered bindings and runtime.

## 10. Acceptance matrix

The bounded product cannot close #2254 until the current supported flow proves:

- create/open Project;
- switch Project/Environment using the real selector;
- create/open Canvas;
- create/focus/move/double-click node;
- Graph Draft edit -> persist -> reload -> same value;
- dbt file/YAML edit -> persist -> reload -> same source-backed value;
- select/test a supported Connection;
- import Source with connection-bound identity;
- Preview/Run in the selected scope;
- switch to a second granted Project with colliding relative names and observe no stale state;
- switch back and recover original state;
- ES/EN and keyboard behavior on the touched critical path;
- explicit product-owner acceptance recorded.

## 11. Existing issue ownership

This proposal does not replace existing owners:

- #2195 owns Web/Canvas hardening;
- #2170 owns Project/Workspace admission and selection;
- #2171 owns dbt project/source authority;
- #2173 owns Warehouse Connections and Source Import;
- #2174 owns workspace files/cache/history/diff truth;
- #2176 owns API composition/readiness/capability truth;
- #2255 owns acceptance proof;
- #2256 owns cross-cutting explicit connection/resource-binding semantics;
- #2257 owns the first dbt target binding vertical.

## 12. Non-goals

- Conductor or another workflow provider;
- generic JSON-schema form engine;
- generic ResourceManager/registry;
- placeholder Snowflake/BigQuery/Redshift adapters;
- cross-connection transfer implementation before #2256/#2257 are proven;
- secret storage in graph or plan;
- replacing current domain owners with a new subsystem.

## 13. PTH1 bounded implementation brief

### 13.1 Mode, baseline, and exact slice

- Think-First mode: Full.
- Baseline: `main@32cfaf6d31fa5ca789bdb390def95d27f5d71f59`.
- Feature ID: `PTH1-CONNECTED-SOURCE-TRUTH`.
- Primary issue: #2256, under #2254.
- Existing studies consumed: #2170, #2171, #2173, #2174, #2176, and #2195.
- Included: canonical connection-bound source identity; fail-closed handling of
  legacy ambiguous nodes and missing drafts; deterministic JCS hashes; visible
  read-only Canvas binding; A -> B -> A cache proof with a colliding path.
- Deferred: #2257 dbt target binding, runtime capability truth from #2176,
  additional providers, a connection node, and the complete #2255 product
  acceptance suite.

### 13.2 Governing command/query rails

Planning DB queries confirm that the intent already has owners; no parallel rail
is introduced:

| Intent                                         | Rail                                            | Kind    | Owner / application boundary           |
| ---------------------------------------------- | ----------------------------------------------- | ------- | -------------------------------------- |
| Persist imported sources in Graph Draft        | `ImportWarehouseSources`                        | command | Warehouse Source Import / API strategy |
| Read the authoritative draft                   | `GetWorkspaceGraphDraft`                        | query   | Workspace Graph Draft read model       |
| Discover source objects through one connection | `ListWarehouseConnectionSourceObjects`          | query   | Warehouse Source Import                |
| Change active granted scope                    | `SelectWorkspaceScope`                          | command | Web session scope selection            |
| Read scope-bound workspace files               | `ListWorkspaceFiles`, `GetWorkspaceFileContent` | query   | Workspace Files                        |

The import command owns all mutation. Canvas/Workbench projects the persisted
reference; it does not infer or mutate it.

### 13.3 Current and target flow

```text
CURRENT
connection selection
  -> sourceObjectId
  -> Graph Draft metadata.sourceObjectId
  -> replay/dedup by sourceObjectId alone
  -> two connections can alias one node
```

```text
TARGET
WarehouseConnection + SourceObject
  -> ConnectedSourceRef(connectionId, provider, sourceObjectId)
  -> strict contract validation (no unknown/secret fields)
  -> Graph Draft metadata.connectedSourceRef
  -> replay/dedup by canonical JCS identity
  -> Workbench shows the effective connection
  -> missing/legacy ambiguous identity fails closed before mutation
```

```text
WORKSPACE CACHE PROOF
scope A / models/orders.sql = A
  -> select scope B / models/orders.sql = B
  -> select scope A / models/orders.sql = A
  -> no key, cache, file, graph, or artifact state crosses scope
```

### 13.4 Decision rationale

1. **Option B, read-only Workbench fact, selected.** A first-class connection
   node would add topology without independent behavior. The existing import
   rail is authoritative and the binding must still be visible.
2. **Canonical nested value objects, selected.** A `ConnectedSourceRef` contains
   a `ConnectionRef`; loose `connectionId`/`sourceObjectId` string pairs would
   preserve primitive obsession and permit provider drift.
3. **Strict versioned schemas, selected.** Unknown properties are rejected so
   passwords, tokens, and connection strings cannot silently enter graph
   metadata through this contract.
4. **Fail closed, selected.** A node carrying only the former
   `metadata.sourceObjectId` is not upgraded, guessed, or treated as compatible.
   There are no database migrations or compatibility state. Re-import requires
   unambiguous canonical identity.
5. **Shared JCS hashing, selected.** Request and identity hashes reuse the
   repository canonicalizer instead of local `JSON.stringify` order.
6. **No initial-draft fallback, selected.** Import cannot manufacture a draft
   when the requested Canvas is absent; it returns the existing typed not-found
   error before writing files or calling the external source.
7. **Platform-resolvable live browser proof, selected.** The protected-runtime
   proof keeps Docker Cypress on POSIX hosts and uses the repository's native
   Cypress execution boundary on Windows. Windows pnpm dependencies are NTFS
   junctions that do not resolve inside a Linux bind mount; native execution
   changes no product service, fixture, assertion, authorization, or cleanup
   semantic and makes the same live gate executable instead of skipping it.
8. **Visible and accessible connection truth, selected.** The live proof checks
   that the canonical connection is both rendered without truncation in the
   source Workbench and free of serious or critical WCAG 2.0/2.1 A/AA findings.

### 13.5 Fowler opportunity matrix

| Scenario                                          | Smell / risk                                 | Fowler move                                     | Required proof                                                  |
| ------------------------------------------------- | -------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------- |
| Connection and object travel as loose strings     | Primitive obsession / data clump             | Introduce Value Object                          | Strict `ConnectionRef` and `ConnectedSourceRef` contract tests  |
| Same object ID exists through connections A and B | Hidden authority / identity collision        | Replace derived identity with explicit identity | Two distinct nodes and stable replay per connection             |
| Legacy node lacks connection identity             | Hidden authority / speculative compatibility | Introduce Assertion / Guard Clause              | Import fails before any mutation; no inference or migration     |
| Canvas hides the effective source connection      | Hidden authority                             | Introduce Presentation Model                    | Localized read-only Workbench row names the connection          |
| Scope A and B share a relative path               | Identity Map leakage                         | Make scope key explicit                         | A -> B -> A returns A, B, A for the same path                   |
| Missing Canvas triggers initial-draft creation    | Divergent change / boundary drift            | Separate creation from import                   | Typed not-found with zero file/external writes                  |
| Graph metadata accepts secret-shaped extras       | Inappropriate intimacy / boundary drift      | Preserve Whole Object with strict DTO           | Strict schemas reject credential fields                         |
| Windows Docker cannot resolve pnpm junctions      | Environment coupling / false-negative gate   | Encapsulate platform execution strategy         | Unit proof selects native Cypress on Windows; live proof passes |

### 13.6 DoR for the bounded slice

- [x] Product outcome and negative behavior are stated.
- [x] Existing related studies and current code were inspected.
- [x] Owning command/query rails were queried from Planning DB and reused.
- [x] Current and target flows are diagrammed.
- [x] Fowler opportunities and rejected alternatives are recorded.
- [x] No human design decision remains for the declared patch surfaces.
- [x] Red tests, green tests, architecture guard, and live proof are named below.
- [x] No migration, compatibility layer, provider placeholder, or new subsystem is allowed.

### 13.7 DoD for the bounded slice

- [ ] Canonical contracts reject ambiguous or secret-bearing payloads.
- [ ] Import persists/replays using the complete connected-source identity.
- [ ] Two connections exposing the same object ID never alias.
- [ ] Missing/legacy ambiguous state fails closed before mutation.
- [ ] Canvas Workbench exposes the effective connection in ES and EN.
- [ ] A -> B -> A with the same relative path proves cache isolation.
- [ ] Existing live Source Import proof passes without reducing its assertions.
- [ ] Package test, lint, type-check, ARC-2, mechanization, and pre-push gates pass.
- [ ] No debt, stub, skipped check, disabled rule, or migration is introduced.

## 14. Feature mechanization

```feature-mechanization
version: 1
featureId: PTH1-CONNECTED-SOURCE-TRUTH
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/product-truth-connection-hardening-20260808.md
componentGuides:
  - docs/architecture/components/source-import.md
  - docs/architecture/components/workspace-graph-draft.md
  - docs/architecture/components/web/frontend-component-inventory.md
userStories:
  - As a Canvas author I can see which connection qualifies an imported source.
  - As a workspace user I can switch between scopes with colliding paths without stale data.
  - As an operator I get an explicit failure instead of guessed legacy connection state.
governingSources:
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/adr/0061-server-owned-effective-workspace-context.md
  - docs/adr/0058-warehouse-source-import.md
  - docs/adr/0060-dbt-project-source-authority.md
allowedImplementationSurfaces:
  - docs/planning/proposals/mandatory/product-truth-connection-hardening-20260808.md
  - packages/@dvt/contracts/src/contracts/source-import/**
  - packages/@dvt/contracts/test/source-import/ConnectedSourceRef.v1.test.ts
  - apps/api/src/application/services/graphDraftWarehouseSourceImportStrategy.ts
  - apps/api/src/application/services/warehouseSourceYamlIdentity.ts
  - apps/api/test/application/services/graphDraftWarehouseSourceImportStrategy.test.ts
  - apps/api/test/application/services/warehouseSourceYaml.test.ts
  - apps/web/src/app/components/inspector/nodePropertiesReadModel.ts
  - apps/web/src/app/components/inspector/nodePropertiesReadModel.test.ts
  - apps/web/src/app/plugins/graph/graphNodeTitlePresentation.ts
  - apps/web/src/app/plugins/graph/graphNodeTitlePresentation.test.ts
  - apps/web/src/app/views/canvas/canvasNodePresentationCopy.ts
  - apps/web/src/app/queries/workspaceQueries.scope.test.tsx
  - apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts
  - scripts/run-canvas-source-import-live-proof.cjs
  - scripts/run-canvas-source-import-live-proof.test.cjs
  - docs/guides/canvas-authoring-user-manual-20260501.md
  - docs/evidence/**
  - docs/risk-register/quality/**
  - docs/**/index.md
  - docs/concepts/repository-map.md
  - docs/planning/status/**
forbiddenImplementationSurfaces:
  - database migrations or migration-state compatibility
  - packages/@dvt/engine/**
  - packages/@dvt/planner/**
  - packages/@dvt/adapter-*/**
  - new API routes, services, providers, registries, or fake adapters
  - dbt target binding or runtime connection resolution from issue 2257
commandQueryRails:
  - name: ImportWarehouseSources
    type: command
    dddOwner: Warehouse Source Import
  - name: GetWorkspaceGraphDraft
    type: query
    dddOwner: Workspace Graph Draft
  - name: SelectWorkspaceScope
    type: command
    dddOwner: Web session workspace selection
  - name: GetWorkspaceFileContent
    type: query
    dddOwner: Workspace Files
domainObjects:
  - ConnectionRef
  - ConnectedSourceRef
  - WarehouseConnection
  - SourceObject
  - WorkspaceGraphDraft
fowlerSignals:
  - Primitive obsession
  - Data clump
  - Hidden authority
  - Identity Map leakage
  - Boundary drift
architectureGuards:
  - pnpm docs:feature-mechanization:implementation -- --feature PTH1-CONNECTED-SOURCE-TRUTH
  - GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs
cypressFlows:
  - apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts
completionGate:
  - pnpm docs:feature-mechanization -- --feature PTH1-CONNECTED-SOURCE-TRUTH
  - pnpm --filter @dvt/contracts test
  - pnpm --filter @dvt/contracts typecheck
  - pnpm --filter dvt-api test -- graphDraftWarehouseSourceImportStrategy.test.ts
  - pnpm --filter dvt-api lint
  - pnpm --filter dvt-api typecheck
  - pnpm --filter @dvt/web test:canvas
  - pnpm --filter @dvt/web lint
  - pnpm --filter @dvt/web typecheck
  - node --test scripts/run-canvas-source-import-live-proof.test.cjs
  - pnpm --filter @dvt/web test:e2e:source-import:live
  - pnpm verify:prepush
redGreenCycles:
  - id: connection-reference-contract
    redTest: pnpm --filter @dvt/contracts test -- ConnectedSourceRef.v1.test.ts
    expectedFailure: ConnectionRefSchema and ConnectedSourceRefSchema are not exported.
    patchSurfaces:
      - packages/@dvt/contracts/src/contracts/source-import/ConnectedSourceRef.v1.ts
      - packages/@dvt/contracts/src/contracts/source-import/index.ts
    greenTest: pnpm --filter @dvt/contracts test -- ConnectedSourceRef.v1.test.ts
  - id: connection-qualified-import
    redTest: pnpm --filter dvt-api test -- graphDraftWarehouseSourceImportStrategy.test.ts
    expectedFailure: Import aliases identical source object IDs across connections and accepts legacy ambiguous metadata.
    patchSurfaces:
      - apps/api/src/application/services/graphDraftWarehouseSourceImportStrategy.ts
    greenTest: pnpm --filter dvt-api test -- graphDraftWarehouseSourceImportStrategy.test.ts
  - id: canonical-identity-consumers
    redTest: pnpm --filter dvt-api test -- warehouseSourceYaml.test.ts && pnpm --filter @dvt/web test:canvas -- graphNodeTitlePresentation.test.ts
    expectedFailure: YAML binding identity and card title projection still consume loose object or connection type fields.
    patchSurfaces:
      - apps/api/src/application/services/warehouseSourceYamlIdentity.ts
      - apps/web/src/app/plugins/graph/graphNodeTitlePresentation.ts
    greenTest: pnpm --filter dvt-api test -- warehouseSourceYaml.test.ts && pnpm --filter @dvt/web test:canvas -- graphNodeTitlePresentation.test.ts
  - id: visible-connection-binding
    redTest: pnpm --filter @dvt/web test:canvas -- nodePropertiesReadModel.test.ts
    expectedFailure: The Workbench read model and localized copy do not expose Connection.
    patchSurfaces:
      - apps/web/src/app/components/inspector/nodePropertiesReadModel.ts
      - apps/web/src/app/views/canvas/canvasNodePresentationCopy.ts
    greenTest: pnpm --filter @dvt/web test:canvas -- nodePropertiesReadModel.test.ts
  - id: workspace-colliding-path-isolation
    redTest: pnpm --filter @dvt/web test -- workspaceQueries.scope.test.tsx
    expectedFailure: Existing proof does not exercise the same relative path across A and B.
    patchSurfaces:
      - apps/web/src/app/queries/workspaceQueries.scope.test.tsx
    greenTest: pnpm --filter @dvt/web test -- workspaceQueries.scope.test.tsx
  - id: windows-live-proof-dependency-resolution
    redTest: node --test scripts/run-canvas-source-import-live-proof.test.cjs
    expectedFailure: The live proof always selects a Linux Docker bind mount even when Windows pnpm dependencies are NTFS junctions.
    patchSurfaces:
      - scripts/run-canvas-source-import-live-proof.cjs
    greenTest: node --test scripts/run-canvas-source-import-live-proof.test.cjs
symbols:
  - { name: CONNECTION_REF_SCHEMA_VERSION, path: packages/@dvt/contracts/src/contracts/source-import/ConnectedSourceRef.v1.ts, dddOwner: ConnectionRef, cqRails: [ImportWarehouseSources], fowlerSignals: [Introduce Value Object], architectureGuard: pnpm docs:feature-mechanization:implementation, cypressCoverage: apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts, unitTests: [pnpm --filter @dvt/contracts test -- ConnectedSourceRef.v1.test.ts] }
  - { name: CONNECTED_SOURCE_REF_SCHEMA_VERSION, path: packages/@dvt/contracts/src/contracts/source-import/ConnectedSourceRef.v1.ts, dddOwner: ConnectedSourceRef, cqRails: [ImportWarehouseSources], fowlerSignals: [Introduce Value Object], architectureGuard: pnpm docs:feature-mechanization:implementation, cypressCoverage: apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts, unitTests: [pnpm --filter @dvt/contracts test -- ConnectedSourceRef.v1.test.ts] }
  - { name: ConnectionRefSchema, path: packages/@dvt/contracts/src/contracts/source-import/ConnectedSourceRef.v1.ts, dddOwner: ConnectionRef, cqRails: [ImportWarehouseSources], fowlerSignals: [Replace Primitive with Object], architectureGuard: pnpm docs:feature-mechanization:implementation, cypressCoverage: apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts, unitTests: [pnpm --filter @dvt/contracts test -- ConnectedSourceRef.v1.test.ts] }
  - { name: ConnectionRef, path: packages/@dvt/contracts/src/contracts/source-import/ConnectedSourceRef.v1.ts, dddOwner: ConnectionRef, cqRails: [ImportWarehouseSources], fowlerSignals: [Replace Primitive with Object], architectureGuard: pnpm docs:feature-mechanization:implementation, cypressCoverage: apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts, unitTests: [pnpm --filter @dvt/contracts test -- ConnectedSourceRef.v1.test.ts] }
  - { name: ConnectedSourceRefSchema, path: packages/@dvt/contracts/src/contracts/source-import/ConnectedSourceRef.v1.ts, dddOwner: ConnectedSourceRef, cqRails: [ImportWarehouseSources], fowlerSignals: [Replace Primitive with Object], architectureGuard: pnpm docs:feature-mechanization:implementation, cypressCoverage: apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts, unitTests: [pnpm --filter @dvt/contracts test -- ConnectedSourceRef.v1.test.ts] }
  - { name: ConnectedSourceRef, path: packages/@dvt/contracts/src/contracts/source-import/ConnectedSourceRef.v1.ts, dddOwner: ConnectedSourceRef, cqRails: [ImportWarehouseSources], fowlerSignals: [Replace Primitive with Object], architectureGuard: pnpm docs:feature-mechanization:implementation, cypressCoverage: apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts, unitTests: [pnpm --filter @dvt/contracts test -- ConnectedSourceRef.v1.test.ts] }
```
