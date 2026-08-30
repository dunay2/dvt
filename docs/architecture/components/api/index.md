---
title: apps/api
status: Active
owner: Architecture / API
last_reviewed: 2026-08-10
---

# apps/api

`apps/api` is DVT's authenticated HTTP composition root. It translates HTTP
requests into existing application commands and queries, enforces boundary
authentication and scope, assembles runtime dependencies, and exposes
operational probes. Domain lifecycle semantics remain in their owning bounded
contexts.

## Mandatory authority query

Planning DB, not this page or a TypeScript catalog, owns current component
placement, relations, command/query rails, design decisions, evidence, and
documentation lifecycle. Before architecture or design consultation, run:

```bash
pnpm planning:db:query architecture-designs --limit 100 --no-refresh
pnpm planning:db:query component-profile --component SYS-API-ROOT --no-refresh
pnpm planning:db:query command-query-rails --filter API --no-refresh
pnpm planning:db:query documentation-lifecycle --component SYS-API-ROOT --no-refresh
```

Use the returned identities and evidence paths to select any further source or
document. Generate repository, component, test, and traceability views only on
explicit request with `pnpm docs:publish`; they are disposable projections, not
authority. Consultation is read-only: it fails closed on unavailable or stale
authority instead of importing Planning DB as a side effect.

## Boundary

```mermaid
flowchart LR
  Client[Web, operators, automation] --> HTTP[apps/api HTTP adapter]
  HTTP --> Auth[Authentication and scoped authorization]
  HTTP --> Application[Application ports and use cases]
  Application --> Planner[@dvt/planner]
  Application --> Engine[@dvt/engine]
  Application --> Stores[State, plan, workspace and evidence ports]
  Application --> Providers[Provider adapter factories]
  DB[(Planning DB)] --> Design[Architecture and design queries]
```

The API owns:

- HTTP registration, parsing, status/envelope translation, rate limiting, and
  authenticated tenant/project/environment admission;
- composition of planner, engine, delivery, storage, provider, and
  observability dependencies;
- health, readiness, version, and explicitly enabled administrative surfaces;
- application coordination needed to invoke an existing product rail.

The API does not own:

- run lifecycle or provider execution semantics;
- planner graph semantics or canonical shared contracts;
- database architecture classification, source/test inventories, or document
  disposition;
- browser presentation state or workspace-selection UX.

## Invariants

1. Every externally observable intent reuses a Planning DB command/query rail;
   route code is an adapter, not a second catalog.
2. Authentication, authorization, and effective scope fail closed before a
   command or query reaches its application port.
3. Caller-authored run identity is rejected; accepted start requests receive a
   platform-owned UUIDv7 identity.
4. Preview, compile, import, and start reject legacy or conflicting planner
   ingress and use canonical shared contracts.
5. Workspace file, graph, history, diff, dbt, and source-import operations keep
   authorized scope through their application ports. A UI or route alone is
   not evidence of a supported capability.
6. Runtime resources have explicit construction, migration, readiness, and
   reverse-order close ownership. Optional capabilities remain unavailable
   unless their real dependencies are ready.
7. Behavioral, contract, integration, and dependency tests protect product
   guarantees. Tests do not require Markdown headings, comments, constructor
   placement, historical filenames, or a compiled architecture registry.

## Documentation posture

This is the single authored current API architecture entry. Operational setup
remains in [`apps/api/README.md`](../../../../apps/api/README.md), accepted
cross-context decisions remain in ADRs, and historical plans, reviews,
evidence, and closeouts remain commit-bound history. Git plus Planning DB own
the current file/component/test map.

When a current concern needs a new architectural decision, record it through
the existing Planning DB architecture-design rail before implementation. Do
not add a local component guide, route matrix, test-path inventory, or generated
page under version control.
