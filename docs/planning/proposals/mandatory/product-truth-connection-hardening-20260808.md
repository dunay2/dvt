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

Names are provisional; semantics are not.

```ts
type ConnectionRef = Readonly<{
  connectionId: string;
  provider: string;
}>;

type ConnectedSourceRef = Readonly<{
  connectionId: string;
  sourceObjectId: string;
}>;

type NodeResourceBinding = Readonly<{
  bindingId: string;
  capability: 'read' | 'write' | 'read-write' | 'dbt-target';
  connectionRef: ConnectionRef;
}>;
```

The first implementation should add only fields required by current Postgres Source Import and the first dbt target vertical. Do not create a generic resource framework.

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

#2256 must choose the smallest truthful rendering.

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
