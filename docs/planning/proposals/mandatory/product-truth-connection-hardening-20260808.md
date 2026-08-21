# DVT Product Truth and Explicit Connection Hardening

Status: Working proposal
Baseline: `main@32cfaf6d31fa5ca789bdb390def95d27f5d71f59`
Governing epic: #2254
Working issues: #2255, #2256, #2257
Related owners: #2195, #2170, #2171, #2173, #2174, #2176
Fowler governance: [Fowler opportunity planning governance](../../../architecture/fowler-opportunity-planning-governance.md)

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

Issue #2195 already identifies the required authoring truth:

```text
focus/identify node
-> inspect authoritative facts
-> edit supported fields
-> validate/apply
-> persist
-> close/reopen or reload
-> observe the same authoritative value
```

Issue #2255 makes this a product acceptance gate rather than optional follow-up polish.

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

Issue #2256 chooses the smallest truthful rendering.

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

Issue #2257 is the first proof that Project != Connection.

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
- #2257 owns the first dbt target binding vertical;
- #2262 and PR #2266 own generic node gesture and Workbench interaction
  convergence. This slice reuses those seams and changes only the exact
  generated-node code authority needed by the protected PTH1 proof;
- #2268 owns first-Canvas entry simplification;
- #2269 owns the later Source Import interaction reduction. This slice keeps
  the current workflow topology and supplies its connection-bound contract,
  bounded scrolling and live collision evidence;
- #2267 owns broad Web retirement analysis; no retirement is inferred here.

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
- Existing studies consumed: #2170, #2171, #2173, #2174, #2176, #2195,
  #2262/#2266, #2267, #2268, and #2269.
- Included: canonical connection-bound source identity; fail-closed handling of
  legacy ambiguous nodes and missing drafts; deterministic JCS hashes; visible
  read-only Canvas binding; command admission before warehouse discovery;
  collision-safe graph node identity; A -> B -> A cache proof with a colliding
  path; and an A -> B -> A live-product proof through two server-granted
  workspace scopes that reuse the same graph title and workspace-file path.
- Deferred: #2257 dbt target binding, runtime capability truth from #2176,
  additional providers, a connection node, and #2255 acceptance slices other
  than the bounded A1/A6 evidence produced here.

### 13.2 Governing command/query rails

Planning DB queries confirm that the intent already has owners; no parallel rail
is introduced:

| Intent                                         | Rail                                            | Kind    | Owner / application boundary           |
| ---------------------------------------------- | ----------------------------------------------- | ------- | -------------------------------------- |
| Persist imported sources in Graph Draft        | `ImportWarehouseSources`                        | command | Warehouse Source Import / API strategy |
| Read the authoritative draft                   | `GetWorkspaceGraphDraft`                        | query   | Workspace Graph Draft read model       |
| Discover source objects through one connection | `ListWarehouseConnectionSourceObjects`          | query   | Warehouse Source Import                |
| Resolve server-granted workspace choices       | `GetEffectiveWorkspaceContext`                  | query   | Protected runtime workspace context    |
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

```text
LIVE WORKSPACE PROOF
server grants scope A and scope B
  -> author/import same physical source into A
  -> SelectWorkspaceScope(B) through the visible product control
  -> B starts without A graph/file presentation
  -> author/import same physical source and same YAML path into B
  -> SelectWorkspaceScope(A) through the visible product control
  -> A recovers its original graph and file while B remains distinct
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
9. **Discoverable bounded-dialog overflow, selected.** Source review may exceed
   the available viewport, so its content region exposes an always-visible
   scrollbar while the Cancel and attach actions remain fixed and reachable.
   Browser proof must reach the selected object through that governed region;
   shrinking or deleting review content is rejected.
10. **Exact node-code authority, selected.** A graph-draft model without a
    persisted workspace file must open its node-owned generated/authoring code
    surface. Fabricating `models/<name>.sql` and silently falling back to an
    unrelated existing file is rejected. The project-file Workbench remains
    authoritative only when the node exposes a real workspace-file path.
11. **Single explicit edge as origin, selected.** When a dbt model has exactly
    one compatible incoming edge, that edge is the complete origin decision for
    both artifact generation and authoring validation; requiring a duplicate
    hidden `selectedSourceId` would create two sources of truth. Zero compatible
    origins, multiple unselected origins, or an explicit selection that is not
    connected continue to fail closed.
12. **Two real connections for collision proof, selected.** The protected live
    flow creates two independently identified Postgres connections that expose
    the same `relation/dvt/public/source_1`, imports through both, and reads the
    persisted draft back. Two distinct canonical refs and nodes are required;
    an in-memory collision test alone is insufficient for #2256 acceptance.
13. **Authority admission before external discovery, selected.** The complete
    `ImportWarehouseSources` rail resolves the persisted Canvas authoring
    authority before probing a connection or reading source objects. A missing
    Canvas therefore fails without an external provider call; a strategy-only
    test is not sufficient evidence of command ordering.
14. **Reserved node identifiers fail closed, selected.** If both a readable
    stable ID and its connection-qualified collision-resistant ID are already
    owned by another identity, import raises a draft conflict. It never reports
    the foreign node as selected and never searches for an ungoverned suffix.
15. **Canonical boundary strings, selected.** Connection, provider and physical
    object identifiers reject leading or trailing whitespace rather than
    trimming it after admission. JCS therefore cannot treat visually identical
    values as distinct identities, and the contract performs no silent repair.
16. **Overlay-safe Fit view, selected.** The visible React Flow control receives
    the same governed fit options as initial layout, with enough padding to
    keep node actions outside the persistent Add Component overlay. Browser
    proof must double-click both imported sources without forced interaction.
17. **Viewport and cancellation matrix, selected.** The live Add Source dialog
    and connected-source Workbench remain visible and axe-clean at 1440x900,
    1280x720, 1000x660 and a 500x330 CSS viewport that exercises the layout
    pressure produced by 200% zoom from the 1000x660 baseline. Add Source stays
    scrollable and cancellable; Cancel must close the dialog without importing
    a third source. Viewport pressure never authorizes hidden actions or clipped
    product truth.
18. **Two real granted scopes, selected.** The protected live runner grants two
    projects to the same authenticated principal and exposes both through
    `GetEffectiveWorkspaceContext`. Cypress must change scope only through the
    visible `SelectWorkspaceScope` control, author the same physical source and
    `models/sources/src_public.yml` path in both scopes, then return A -> B -> A.
    Direct storage seeding, browser-only scope invention, or an API-only switch
    is rejected because it would not prove the product interaction or query
    invalidation boundary.
19. **Workbench owns destructive keystrokes, selected.** The SQL textarea uses
    React Flow's `nokey` boundary and contains keydown/keyup. More importantly,
    while any contextual Workbench is active, the Canvas passes
    `deleteKeyCode=null` to React Flow. `Backspace` and `Delete` remain editing
    input even if an event escapes; explicit Canvas deletion outside a
    Workbench remains governed by the existing graph command surface.
20. **Localized keyboard scope presentation, selected.** The visible workspace
    selector activates an explicitly granted option with `Enter` or space in
    English and Spanish. The protected proof must also open the colliding YAML
    in Project Code for B and A, reject the other scope's identity, and run axe
    against both selector and Workbench surfaces.
21. **One command per product intent, selected.** Node code opens only from the
    selected-node floating toolbar; the More/right-click menus keep Workbench
    and modeler actions but cannot repeat `Open node code`. Add Component opens
    only from the Canvas right-click menu, so no fixed primary button competes
    with the graph or duplicates the contextual command.
22. **One qualified identity at every binding boundary, selected.** Warehouse
    source YAML bindings and Graph Draft node projection must address the same
    `sourceObjectIdentity(connectionId, sourceObjectId)` key. Looking up a
    qualified binding by raw `sourceObjectId` is forbidden because normalized
    name collisions can make the persisted node point at a different or
    nonexistent YAML path. Collision detection spans the complete import batch,
    because dbt resolves `source(source_name, table_name)` without using the YAML
    path as a namespace.
23. **Duplicate persisted identities fail closed, selected.** A Graph Draft
    containing more than one warehouse node with the same valid
    `ConnectedSourceRef` is conflicting state. Import must raise
    `WarehouseSourceImportDraftConflictError` before file or draft mutation;
    last-write-wins indexing and arbitrary clone selection are forbidden.

### 13.5 Fowler opportunity matrix

| Scenario                                            | Smell / risk                                 | Fowler move                                     | Required proof                                                        |
| --------------------------------------------------- | -------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------- |
| Connection and object travel as loose strings       | Primitive obsession / data clump             | Introduce Value Object                          | Strict `ConnectionRef` and `ConnectedSourceRef` contract tests        |
| Same object ID exists through connections A and B   | Hidden authority / identity collision        | Replace derived identity with explicit identity | Live import persists two distinct nodes and refs for the same object  |
| Legacy node lacks connection identity               | Hidden authority / speculative compatibility | Introduce Assertion / Guard Clause              | Import fails before any mutation; no inference or migration           |
| Canvas hides the effective source connection        | Hidden authority                             | Introduce Presentation Model                    | Localized read-only Workbench row names the connection                |
| Scope A and B share a relative path                 | Identity Map leakage                         | Make scope key explicit                         | A -> B -> A returns A, B, A for the same path                         |
| Missing Canvas triggers initial-draft creation      | Divergent change / boundary drift            | Separate creation from import                   | Typed not-found with zero file/external writes                        |
| Graph metadata accepts secret-shaped extras         | Inappropriate intimacy / boundary drift      | Preserve Whole Object with strict DTO           | Strict schemas reject credential fields                               |
| Windows Docker cannot resolve pnpm junctions        | Environment coupling / false-negative gate   | Encapsulate platform execution strategy         | Unit proof selects native Cypress on Windows; live proof passes       |
| Source review extends below a bounded dialog        | Hidden content / inaccessible navigation     | Expose bounded scrolling region                 | Visible scrollbar, reachable selected object, fixed Cancel            |
| Missing node file falls back to another file        | Hidden authority / semantic substitution     | Replace guessed path with explicit strategy     | Generated model opens node code; persisted path opens Workbench       |
| One edge still requires hidden selected-source ID   | Data clump / duplicated decision             | Derive from the single explicit relationship    | One edge generates and validates; zero or ambiguous edges fail closed |
| Display metadata makes an unbound source executable | Hidden authority / fail-open readiness       | Guard clause at artifact projection             | Missing, legacy or unsupported binding returns no executable artifact |
| External probe precedes Canvas admission            | Temporal coupling / misplaced responsibility | Move statements before extraction               | Missing authority performs zero source-object reads                   |
| Derived node ID is owned by another identity        | Identity collision / false idempotency       | Guard Clause                                    | Conflict occurs before file or draft mutation                         |
| Identity differs only by exterior whitespace        | Primitive ambiguity / duplicate value        | Introduce Assertion                             | Strict contract rejects exterior-whitespace variants                  |
| Fit view places a node under Add Component          | Presentation collision / hidden interaction  | Move shared options to the action owner         | Both live source nodes remain actionable after Fit view               |
| Add Source clips actions under viewport pressure    | Hidden command / inaccessible cancellation   | Introduce Parameter Object for viewport proof   | Four-size live matrix keeps Cancel visible and closes without import  |
| A and B reuse graph/file names in one live session  | Hidden authority / Identity Map leakage      | Make scope key explicit at query boundaries     | Visible A -> B -> A switch recovers distinct graph and YAML state     |
| Backspace in Workbench removes the selected node    | Event leakage / feature envy                 | Encapsulate event ownership at shortcut owner   | React Flow delete is disabled while Workbench owns keyboard input     |
| Scope changes only by pointer or API                | Inaccessible command / hidden presentation   | Expose command through accessible presentation  | EN/ES keyboard A -> B -> A plus visible isolated YAML and axe         |
| Code appears in toolbar and contextual menus        | Duplicated command / divergent behavior      | Consolidate conditional expression              | Only the selected-node floating toolbar exposes node code             |
| Add Component appears fixed and on right-click      | Duplicated command / cluttered interface     | Remove dead UI and keep contextual command      | No fixed button; right-click opens the governed catalog               |
| Graph projection retrieves a binding by object ID   | Split identity / divergent change            | Replace derived identity with explicit identity | Node metadata and YAML use the same qualified collision-safe binding  |
| Draft repeats one valid connected-source identity   | Silent overwrite / false idempotency         | Introduce Assertion / Guard Clause              | Import rejects duplicate refs before file or draft mutation           |
| Separate YAML files reuse one dbt logical key       | Hidden namespace / ambiguous reference       | Make logical identity explicit                  | Colliding schemas produce distinct source/table keys across the batch |

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

- [x] Canonical contracts reject ambiguous or secret-bearing payloads.
- [x] Import persists/replays using the complete connected-source identity.
- [x] Two connections exposing the same object ID never alias.
- [x] Missing/legacy ambiguous state fails closed before mutation.
- [x] Canvas Workbench exposes the effective connection in ES and EN.
- [x] A -> B -> A with the same relative path proves cache isolation.
- [x] A -> B -> A through two real granted scopes proves live graph/file isolation.
- [x] The EN/ES selector supports pointer, `Enter` and space, and Project Code visibly presents the isolated YAML in both scopes with axe-clean surfaces.
- [x] Workbench text editing cannot leak `Backspace` or `Delete` into graph-node deletion.
- [x] Node code has one visible entry in the selected-node toolbar, and Add Component is available only from the Canvas right-click menu.
- [x] Live Source Import persists the same physical object through two distinct real connections without reducing its existing assertions.
- [x] Add Source and connected-source Workbench remain visible, axe-clean and cancellable across the governed viewport matrix.
- [x] Package test, lint, type-check, ARC-2, mechanization, and pre-push gates pass.
- [x] No debt, stub, skipped check, disabled rule, or migration is introduced.
- [x] Graph node projection retrieves source YAML bindings only by the complete
      connection-qualified identity and preserves collision-safe names and paths.
- [x] A persisted draft containing duplicate valid `ConnectedSourceRef` values
      fails with `WarehouseSourceImportDraftConflictError` before mutation.
- [x] Focused regression tests pass for qualified binding lookup, global dbt
      logical-key uniqueness and duplicate-ref rejection.
- [x] Warehouse-source artifact projection rejects missing, legacy-competing or
      unsupported connection bindings before publication and Preview.
- [x] Both blocking P1 review threads are resolved and the unrelated Temporal
      CI blocker is integrated through #2276; final merge remains protected by
      the required remote checks.

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
  - docs/adr/ADR-0062-server-owned-effective-workspace-context.md
  - docs/adr/ADR-0058-warehouse-source-import-rails.md
  - docs/adr/ADR-0060-dbt-project-authoring-authority.md
allowedImplementationSurfaces:
  - docs/planning/proposals/mandatory/product-truth-connection-hardening-20260808.md
  - packages/@dvt/contracts/src/contracts/source-import/**
  - packages/@dvt/contracts/test/source-import/ConnectedSourceRef.v1.test.ts
  - apps/api/src/application/services/graphDraftWarehouseSourceImportStrategy.ts
  - apps/api/src/application/services/importWarehouseSourcesUseCase.ts
  - apps/api/src/application/services/warehouseSourceYamlBindings.ts
  - apps/api/src/application/services/warehouseSourceYamlIdentity.ts
  - apps/api/test/application/services/graphDraftWarehouseSourceImportStrategy.test.ts
  - apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts
  - apps/api/test/application/services/warehouseSourceYaml.test.ts
  - apps/web/src/app/components/inspector/nodePropertiesReadModel.ts
  - apps/web/src/app/components/inspector/nodePropertiesReadModel.test.ts
  - apps/web/src/app/components/canvas/DbtNodeComponent.tsx
  - apps/web/src/app/components/canvas/canvasNodeContextMenuModel.ts
  - apps/web/src/app/components/canvas/canvasNodeContextMenuModel.test.ts
  - apps/web/src/app/components/shell/ShellWorkspaceScopeSelector.tsx
  - apps/web/src/app/components/shell/ShellWorkspaceScopeSelector.test.tsx
  - apps/web/src/app/plugins/graph/graphNodeTitlePresentation.ts
  - apps/web/src/app/plugins/graph/graphNodeTitlePresentation.test.ts
  - apps/web/src/app/views/canvas/canvasNodePresentationCopy.ts
  - apps/web/src/app/queries/workspaceQueries.scope.test.tsx
  - apps/web/src/app/components/sourceImportWizard/ConnectionStep.tsx
  - apps/web/src/app/components/sourceImportWizard/SourceImportWizardFrame.tsx
  - apps/web/src/app/components/sourceImportWizard/SourceImportWizardFrame.focus.test.tsx
  - apps/web/src/app/views/canvas/CanvasShell.tsx
  - apps/web/src/app/views/canvas/CanvasShell.graphSurface.test.tsx
  - apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.ts
  - apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.test.ts
  - apps/web/src/app/views/canvas/canvasDbtWorkspaceArtifacts.test.ts
  - apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx
  - apps/web/src/app/views/canvas/dbtAuthoringFieldsModel.test.ts
  - apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.ts
  - apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts
  - apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx
  - apps/web/src/app/views/canvas/CanvasViewport.tsx
  - apps/web/src/app/views/canvas/CanvasViewport.test.tsx
  - apps/web/src/app/views/canvas/CanvasViewport.contextMenu.test.tsx
  - apps/web/src/app/views/canvas/canvasNodeMapper.ts
  - apps/web/src/app/views/canvas/canvasViewportXyflowTestAdapter.tsx
  - apps/web/src/app/views/canvas/DbtModelCodeAuthoringSection.tsx
  - apps/web/src/app/views/canvas/DbtModelCodeAuthoringSection.test.tsx
  - apps/web/cypress/support/liveWarehouseSourceImport.ts
  - apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts
  - scripts/run-canvas-source-import-live-proof.cjs
  - scripts/run-canvas-source-import-live-proof.test.cjs
  - docs/guides/canvas-authoring-user-manual-20260501.md
  - docs/guides/canvas-workbench-user-manual-20260806.md
  - docs/evidence/**
  - docs/risk-register/quality/**
  - docs/**/index.md
  - docs/.manifest.json
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
  - name: GetEffectiveWorkspaceContext
    type: query
    dddOwner: Protected runtime workspace context
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
  - pnpm --filter dvt-api test -- graphDraftWarehouseSourceImportStrategy.test.ts warehouseSourceYaml.test.ts
  - pnpm --filter dvt-api lint
  - pnpm --filter dvt-api typecheck
  - pnpm --filter @dvt/web exec vitest run --config vitest.canvas.config.ts --maxWorkers=2 --minWorkers=2
  - pnpm --filter @dvt/web test:shell-session -- ShellWorkspaceScopeSelector.test.tsx
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
  - id: qualified-yaml-binding-lookup
    redTest: pnpm --filter dvt-api test -- graphDraftWarehouseSourceImportStrategy.test.ts
    expectedFailure: Graph Draft projection looks up a connection-qualified YAML binding by raw sourceObjectId and loses collision-safe names or paths.
    patchSurfaces:
      - apps/api/src/application/services/graphDraftWarehouseSourceImportStrategy.ts
      - apps/api/test/application/services/graphDraftWarehouseSourceImportStrategy.test.ts
    greenTest: pnpm --filter dvt-api test -- graphDraftWarehouseSourceImportStrategy.test.ts
  - id: global-dbt-logical-source-key
    redTest: pnpm --filter dvt-api test -- warehouseSourceYaml.test.ts
    expectedFailure: Colliding physical schemas split across YAML paths still reuse one ambiguous dbt source_name.table_name key.
    patchSurfaces:
      - apps/api/src/application/services/warehouseSourceYamlBindings.ts
      - apps/api/test/application/services/warehouseSourceYaml.test.ts
    greenTest: pnpm --filter dvt-api test -- warehouseSourceYaml.test.ts
  - id: duplicate-connected-source-ref-conflict
    redTest: pnpm --filter dvt-api test -- graphDraftWarehouseSourceImportStrategy.test.ts
    expectedFailure: Existing warehouse nodes with the same valid ConnectedSourceRef overwrite one another in the identity index and import selects an arbitrary clone.
    patchSurfaces:
      - apps/api/src/application/services/graphDraftWarehouseSourceImportStrategy.ts
      - apps/api/test/application/services/graphDraftWarehouseSourceImportStrategy.test.ts
    greenTest: pnpm --filter dvt-api test -- graphDraftWarehouseSourceImportStrategy.test.ts
  - id: canonical-identity-boundary-strings
    redTest: pnpm --filter @dvt/contracts test -- ConnectedSourceRef.v1.test.ts
    expectedFailure: Non-blank identifiers with exterior whitespace are admitted and hash as distinct product identities.
    patchSurfaces:
      - packages/@dvt/contracts/src/contracts/source-import/ConnectedSourceRef.v1.ts
    greenTest: pnpm --filter @dvt/contracts test -- ConnectedSourceRef.v1.test.ts
  - id: command-admission-before-discovery
    redTest: pnpm --filter dvt-api test -- importWarehouseSourcesUseCase.test.ts
    expectedFailure: A missing Canvas authority still calls the external source-object reader before failing.
    patchSurfaces:
      - apps/api/src/application/services/importWarehouseSourcesUseCase.ts
    greenTest: pnpm --filter dvt-api test -- importWarehouseSourcesUseCase.test.ts
  - id: reserved-source-node-identity
    redTest: pnpm --filter dvt-api test -- graphDraftWarehouseSourceImportStrategy.test.ts
    expectedFailure: A collision-resistant node ID owned by a different canonical ref is returned as if it were the imported node.
    patchSurfaces:
      - apps/api/src/application/services/graphDraftWarehouseSourceImportStrategy.ts
    greenTest: pnpm --filter dvt-api test -- graphDraftWarehouseSourceImportStrategy.test.ts
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
  - id: live-granted-workspace-scope-isolation
    redTest: pnpm --filter @dvt/web test:e2e:source-import:live
    expectedFailure: The protected proof grants only one real workspace scope and cannot exercise the visible A -> B -> A selector path with colliding graph and file identities.
    patchSurfaces:
      - scripts/run-canvas-source-import-live-proof.cjs
      - scripts/run-canvas-source-import-live-proof.test.cjs
      - apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts
    greenTest: pnpm --filter @dvt/web test:e2e:source-import:live
  - id: workspace-selector-keyboard-activation
    redTest: pnpm --filter @dvt/web test:shell-session -- ShellWorkspaceScopeSelector.test.tsx
    expectedFailure: The visible granted-scope option does not dispatch SelectWorkspaceScope from Enter or Space.
    patchSurfaces:
      - apps/web/src/app/components/shell/ShellWorkspaceScopeSelector.tsx
      - apps/web/src/app/components/shell/ShellWorkspaceScopeSelector.test.tsx
      - apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts
    greenTest: pnpm --filter @dvt/web test:shell-session -- ShellWorkspaceScopeSelector.test.tsx && pnpm --filter @dvt/web test:e2e:source-import:live
  - id: single-node-code-command-entry
    redTest: pnpm --filter @dvt/web test:canvas -- canvasNodeContextMenuModel.test.ts
    expectedFailure: Open node code is duplicated in the selected-node toolbar and contextual More/right-click menus.
    patchSurfaces:
      - apps/web/src/app/components/canvas/canvasNodeContextMenuModel.ts
      - apps/web/src/app/components/canvas/canvasNodeContextMenuModel.test.ts
      - apps/web/src/app/components/canvas/DbtNodeComponent.tsx
      - apps/web/src/app/views/canvas/canvasNodeMapper.ts
    greenTest: pnpm --filter @dvt/web test:canvas -- canvasNodeContextMenuModel.test.ts
  - id: context-only-add-component-command
    redTest: pnpm --filter @dvt/web test:canvas -- CanvasViewport.contextMenu.test.tsx CanvasViewport.test.tsx
    expectedFailure: Canvas renders a fixed Add Component button in addition to the governed right-click catalog command.
    patchSurfaces:
      - apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx
      - apps/web/src/app/views/canvas/CanvasViewport.contextMenu.test.tsx
      - apps/web/src/app/views/canvas/CanvasViewport.test.tsx
    greenTest: pnpm --filter @dvt/web test:canvas -- CanvasViewport.contextMenu.test.tsx CanvasViewport.test.tsx
  - id: workbench-editor-destructive-key-isolation
    redTest: pnpm --filter @dvt/web test:canvas -- DbtModelCodeAuthoringSection.test.tsx
    expectedFailure: Backspace in the focused SQL editor bubbles to React Flow and deletes the selected model node.
    patchSurfaces:
      - apps/web/src/app/views/canvas/DbtModelCodeAuthoringSection.tsx
      - apps/web/src/app/views/canvas/DbtModelCodeAuthoringSection.test.tsx
      - apps/web/src/app/views/canvas/CanvasViewport.tsx
      - apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx
      - apps/web/src/app/views/canvas/CanvasViewport.test.tsx
      - apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts
    greenTest: pnpm --filter @dvt/web test:canvas -- DbtModelCodeAuthoringSection.test.tsx CanvasViewport.test.tsx && pnpm --filter @dvt/web test:e2e:source-import:live
  - id: windows-live-proof-dependency-resolution
    redTest: node --test scripts/run-canvas-source-import-live-proof.test.cjs
    expectedFailure: The live proof always selects a Linux Docker bind mount even when Windows pnpm dependencies are NTFS junctions.
    patchSurfaces:
      - scripts/run-canvas-source-import-live-proof.cjs
    greenTest: node --test scripts/run-canvas-source-import-live-proof.test.cjs
  - id: live-connected-source-collision
    redTest: pnpm --filter @dvt/web test:e2e:source-import:live
    expectedFailure: The protected flow imports one real connection only, so two connection-qualified references to the same physical object are not proven end to end.
    patchSurfaces:
      - apps/web/cypress/support/liveWarehouseSourceImport.ts
      - apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts
    greenTest: pnpm --filter @dvt/web test:e2e:source-import:live
  - id: overlay-safe-fit-view
    redTest: pnpm --filter @dvt/web test:canvas -- CanvasViewport.test.tsx
    expectedFailure: The visible Fit view control uses default padding and places an imported node beneath Add Component.
    patchSurfaces:
      - apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx
    greenTest: pnpm --filter @dvt/web test:canvas -- CanvasViewport.test.tsx
  - id: bounded-source-review-visibility
    redTest: pnpm --filter @dvt/web test:presentation -- SourceImportWizardFrame.focus.test.tsx
    expectedFailure: The bounded review region does not expose a persistent scrolling affordance.
    patchSurfaces:
      - apps/web/src/app/components/sourceImportWizard/SourceImportWizardFrame.tsx
      - apps/web/cypress/support/liveWarehouseSourceImport.ts
    greenTest: pnpm --filter @dvt/web test:presentation -- SourceImportWizardFrame.focus.test.tsx
  - id: live-source-dialog-viewport-matrix
    redTest: pnpm --filter @dvt/web test:e2e:source-import:live
    expectedFailure: The live proof checks only the default viewport and never proves that Cancel stays reachable under 200-percent layout pressure.
    patchSurfaces:
      - apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts
      - apps/web/src/app/components/sourceImportWizard/ConnectionStep.tsx
      - apps/web/src/app/components/sourceImportWizard/SourceImportWizardFrame.tsx
    greenTest: pnpm --filter @dvt/web test:e2e:source-import:live
  - id: live-connection-workbench-viewport-matrix
    redTest: pnpm --filter @dvt/web test:e2e:source-import:live
    expectedFailure: The live proof checks connected-source Workbench visibility only at the default viewport.
    patchSurfaces:
      - apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts
    greenTest: pnpm --filter @dvt/web test:e2e:source-import:live
  - id: exact-node-code-authority
    redTest: pnpm --filter @dvt/web test:canvas -- CanvasShell.graphSurface.test.tsx
    expectedFailure: A dbt model without a persisted path fabricates a file name and opens an unrelated workspace file.
    patchSurfaces:
      - apps/web/src/app/views/canvas/CanvasShell.tsx
    greenTest: pnpm --filter @dvt/web test:canvas -- CanvasShell.graphSurface.test.tsx
  - id: single-connected-dbt-origin
    redTest: pnpm --filter @dvt/web test:canvas -- canvasDbtModelArtifactProjection.test.ts canvasInspectorAuthoringModel.test.ts
    expectedFailure: One explicit compatible incoming edge still requires a duplicate selectedSourceId in generation or authoring validation.
    patchSurfaces:
      - apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.ts
      - apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.ts
    greenTest: pnpm --filter @dvt/web test:canvas -- canvasDbtModelArtifactProjection.test.ts canvasInspectorAuthoringModel.test.ts
  - id: connected-source-execution-readiness
    redTest: pnpm --filter @dvt/web exec vitest run --config vitest.canvas.config.ts src/app/views/canvas/canvasDbtModelArtifactProjection.test.ts
    expectedFailure: Missing or unsupported connected-source bindings still project executable DBT source artifacts from display metadata.
    patchSurfaces:
      - apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.ts
      - apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.test.ts
      - apps/web/src/app/views/canvas/canvasDbtWorkspaceArtifacts.test.ts
      - apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx
      - apps/web/src/app/views/canvas/dbtAuthoringFieldsModel.test.ts
    greenTest: pnpm --filter @dvt/web exec vitest run --config vitest.canvas.config.ts src/app/views/canvas/canvasDbtModelArtifactProjection.test.ts
symbols:
  - { name: CONNECTION_REF_SCHEMA_VERSION, path: packages/@dvt/contracts/src/contracts/source-import/ConnectedSourceRef.v1.ts, dddOwner: ConnectionRef, cqRails: [ImportWarehouseSources], fowlerSignals: [Introduce Value Object], architectureGuard: pnpm docs:feature-mechanization:implementation, cypressCoverage: apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts, unitTests: [pnpm --filter @dvt/contracts test -- ConnectedSourceRef.v1.test.ts] }
  - { name: CONNECTED_SOURCE_REF_SCHEMA_VERSION, path: packages/@dvt/contracts/src/contracts/source-import/ConnectedSourceRef.v1.ts, dddOwner: ConnectedSourceRef, cqRails: [ImportWarehouseSources], fowlerSignals: [Introduce Value Object], architectureGuard: pnpm docs:feature-mechanization:implementation, cypressCoverage: apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts, unitTests: [pnpm --filter @dvt/contracts test -- ConnectedSourceRef.v1.test.ts] }
  - { name: ConnectionRefSchema, path: packages/@dvt/contracts/src/contracts/source-import/ConnectedSourceRef.v1.ts, dddOwner: ConnectionRef, cqRails: [ImportWarehouseSources], fowlerSignals: [Replace Primitive with Object], architectureGuard: pnpm docs:feature-mechanization:implementation, cypressCoverage: apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts, unitTests: [pnpm --filter @dvt/contracts test -- ConnectedSourceRef.v1.test.ts] }
  - { name: ConnectionRef, path: packages/@dvt/contracts/src/contracts/source-import/ConnectedSourceRef.v1.ts, dddOwner: ConnectionRef, cqRails: [ImportWarehouseSources], fowlerSignals: [Replace Primitive with Object], architectureGuard: pnpm docs:feature-mechanization:implementation, cypressCoverage: apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts, unitTests: [pnpm --filter @dvt/contracts test -- ConnectedSourceRef.v1.test.ts] }
  - { name: ConnectedSourceRefSchema, path: packages/@dvt/contracts/src/contracts/source-import/ConnectedSourceRef.v1.ts, dddOwner: ConnectedSourceRef, cqRails: [ImportWarehouseSources], fowlerSignals: [Replace Primitive with Object], architectureGuard: pnpm docs:feature-mechanization:implementation, cypressCoverage: apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts, unitTests: [pnpm --filter @dvt/contracts test -- ConnectedSourceRef.v1.test.ts] }
  - { name: ConnectedSourceRef, path: packages/@dvt/contracts/src/contracts/source-import/ConnectedSourceRef.v1.ts, dddOwner: ConnectedSourceRef, cqRails: [ImportWarehouseSources], fowlerSignals: [Replace Primitive with Object], architectureGuard: pnpm docs:feature-mechanization:implementation, cypressCoverage: apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts, unitTests: [pnpm --filter @dvt/contracts test -- ConnectedSourceRef.v1.test.ts] }
  - { name: assertNoSeriousAccessibilityViolations, path: apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts, dddOwner: ConnectedSourceRefVisibilityProof, cqRails: [GetWorkspaceGraphDraft], fowlerSignals: [Extract Function], architectureGuard: pnpm docs:feature-mechanization:implementation, cypressCoverage: apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts, unitTests: [pnpm --filter @dvt/web test:e2e:source-import:live] }
  - { name: expectedLivePostgresSourceName, path: apps/web/cypress/support/liveWarehouseSourceImport.ts, dddOwner: ConnectedSourceRefLiveProof, cqRails: [ImportWarehouseSources], fowlerSignals: [Extract Function], architectureGuard: pnpm docs:feature-mechanization:implementation, cypressCoverage: apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts, unitTests: [pnpm --filter @dvt/web test:e2e:source-import:live] }
  - { name: createLivePostgresConnection, path: apps/web/cypress/support/liveWarehouseSourceImport.ts, dddOwner: ConnectedSourceRefLiveProof, cqRails: [ImportWarehouseSources], fowlerSignals: [Extract Function], architectureGuard: pnpm docs:feature-mechanization:implementation, cypressCoverage: apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts, unitTests: [pnpm --filter @dvt/web test:e2e:source-import:live] }
  - { name: CANVAS_FIT_VIEW_OPTIONS, path: apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx, dddOwner: CanvasViewportPresentation, cqRails: [GetWorkspaceGraphDraft], fowlerSignals: [Move Function], architectureGuard: pnpm docs:feature-mechanization:implementation, cypressCoverage: apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts, unitTests: [pnpm --filter @dvt/web test:canvas -- CanvasViewport.test.tsx] }
  - { name: Controls, path: apps/web/src/app/views/canvas/canvasViewportXyflowTestAdapter.tsx, dddOwner: CanvasViewportPresentationProof, cqRails: [GetWorkspaceGraphDraft], fowlerSignals: [Introduce Assertion], architectureGuard: pnpm docs:feature-mechanization:implementation, cypressCoverage: apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts, unitTests: [pnpm --filter @dvt/web test:canvas -- CanvasViewport.test.tsx] }
```
