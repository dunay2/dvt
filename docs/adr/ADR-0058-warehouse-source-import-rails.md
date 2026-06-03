---
title: Warehouse Source Import Rails
status: Accepted
date: 2026-05-30
owners:
  - Web
  - API
arc_level: ARC-1
---

# ADR-0058: Warehouse Source Import Rails

## Status

Accepted.

## Context

The Canvas source import wizard has a narrow frontend port,
`IWarehouseSourceImportPort`, but API mode could not use it because no backend
bounded context owned warehouse connection discovery, table discovery, or source
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
- `ListWarehouseConnectionTables` query: returns tables for one authorized
  warehouse connection.
- `ImportWarehouseSources` command: validates selected tables against the
  catalog and appends source nodes to the authoritative
  `WorkspaceGraphAuthoringDraft`.

All rails require the existing authenticated protected runtime scope. Reads use
`workspace:source-import:view`; imports use `workspace:source-import:import`.
Tenant, project, and environment scope are taken from the protected runtime
workspace scope on the request.

The connector adapter boundary is server-side. Initial implementation may use a
server-owned catalog file or embedded catalog adapter. Browser fixtures,
frontend constants, and mock workspace doubles are not authority for API mode.
External warehouse drivers can replace the catalog adapter later without
changing the route or frontend port contract.

Import is idempotent with respect to existing node IDs in the draft: selecting
a table whose source node already exists does not duplicate the node. Malformed
input, unknown connection IDs, unknown tables, unavailable catalog data, missing
authentication, missing scope, and unauthorized actions fail closed.

## Consequences

The Canvas wizard can run in API mode against backend-owned warehouse metadata
instead of frontend fixture truth. The import command mutates the same graph
draft authority already used by Canvas plan/run workflows, so source nodes are
visible after the authoritative draft refresh.

The initial slice does not select or configure Snowflake, BigQuery, Redshift,
or Postgres drivers. Those adapters remain future infrastructure work behind
the same server-side connector port.

## Validation

- `apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts`
- `apps/api/test/architecture/warehouseSourceImportRails.architecture.test.ts`
- `apps/web/src/app/services/workspace/workspacePorts.api.test.ts`
