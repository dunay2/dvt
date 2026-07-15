---
title: Warehouse Source Import Rails
status: Accepted
date: 2026-05-30
owners:
  - Web
  - API
arc_level: ARC-2
---

# ADR-0058: Warehouse Source Import Rails

## Status

Accepted.

## Context

The Canvas source import wizard has a narrow frontend port,
`IWarehouseSourceImportPort`, but API mode could not use it because no backend
bounded context owned warehouse connection discovery, source-object discovery, or source
registration. The product-visible result was a hardcoded disabled capability
flag and a throw-only API adapter.

That posture violates the command/query rail rule: route and adapter names
looked like product behavior while the domain owner and authorization policy
were missing.

## Decision

Warehouse source import is owned by the protected runtime workspace context.

The accepted rails are:

- `ListWarehouseConnections` query: returns the server-owned
  `WarehouseConnectionCatalog` read model.
- `ListWarehouseConnectionSourceObjects` query: returns a versioned
  `SourceObjectCatalogResponse` for one authorized connection. `SourceObject`
  is provider-neutral and discriminates relation, file, endpoint, and stream
  locators while keeping complete row-count and byte-size evidence explicit.
- `ImportWarehouseSources` command: accepts a non-empty set of unique,
  object-ID-only selections, resolves their authoritative metadata from the
  server catalog, and appends source nodes to the authoritative
  `WorkspaceGraphAuthoringDraft`.

All rails require the existing authenticated protected runtime scope. Reads use
`workspace:source-import:view`; imports use `workspace:source-import:import`.
Tenant, project, and environment scope are taken from the protected runtime
workspace scope on the request.

Authorization and storage scope are the same boundary. `DVT_WORKSPACE_FILES_ROOT`
is a storage namespace, not a workspace. Every workspace-file and warehouse
connection catalog operation must receive the authorized
`tenantId/projectId/environmentId` explicitly and resolve a deterministic child
root before reading or writing. The connection catalog, generated dbt source
YAML, project files, and the dbt project bundle input must all resolve from that
same child root. A successful authorization decision for one scope must never
expose files or connection definitions from another scope.

The rejected current-state dependency was:

```text
authorized scope A ----\
                        +--> global workspace root --> shared catalog/files
authorized scope B ----/
```

The accepted dependency is:

```text
authorized scope A --> scope storage key A --> workspace root A --> catalog/files
authorized scope B --> scope storage key B --> workspace root B --> catalog/files
```

Scope remains an explicit application-port argument. It is not read from an
ambient request context and it is not inferred from a path supplied by the
caller. The local filesystem adapter owns safe scope-key projection and path
containment; HTTP routes own authentication and authorization; application
services own command/query orchestration.

The connector adapter boundary is server-side. Initial implementation may use a
server-owned catalog file or embedded catalog adapter. Browser fixtures,
frontend constants, and mock workspace doubles are not authority for API mode.
External source adapters can replace or complement the initial Postgres
relation adapter without changing the published query response. The current
DBT import strategy is explicitly relation-only: file, endpoint, and stream
objects are rejected before graph or workspace-file side effects.

Import is idempotent with respect to existing node IDs in the draft: selecting
an object whose source node already exists does not duplicate the node.
An idempotency-key replay must never construct its response from a candidate
draft that the store did not apply. When the graph-draft store reports a
deduplicated save, the strategy verifies the requested source-object
postcondition against the persisted authoritative draft and returns those
persisted node identities. If the postcondition no longer holds, the command
fails with a draft conflict and does not compensate a file batch applied by the
original command.
Duplicate selections, malformed input, unknown connection IDs, unknown object
IDs, unsupported locator kinds, unavailable catalog data, missing
authentication, missing scope, and unauthorized actions fail closed.

Cross-scope reads and writes are mandatory negative tests for workspace files,
warehouse connection discovery, source-object discovery, source YAML writes,
and dbt project bundle binding.

The catalog response carries `contractVersion: 1`. Unversioned arrays and
unknown contract versions are invalid at the Web boundary; API and Web consume
the same schemas from `@dvt/contracts`.

## Consequences

The Canvas wizard can run in API mode against backend-owned warehouse metadata
instead of frontend fixture truth. The import command mutates the same graph
draft authority already used by Canvas plan/run workflows, so source nodes are
visible after the authoritative draft refresh.

Postgres is the first relation adapter. Snowflake, BigQuery, Redshift, file,
endpoint, and stream acquisition remain separate adapter work behind the same
provider-neutral contract; their absence is not represented as fake support.

## Validation

- `apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts`
- `apps/api/test/architecture/warehouseSourceImportRails.architecture.test.ts`
- `apps/web/src/app/services/workspace/workspacePorts.api.test.ts`
- `packages/@dvt/contracts/test/source-import/SourceObjectCatalog.v1.test.ts`
