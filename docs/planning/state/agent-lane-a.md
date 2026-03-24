---
title: Agent Lane A - Contracts And State-Store Boundary
status: Active
owner: Product / Architecture / Delivery / Docs
last_reviewed: 2026-03-24
planning_type: status
---

# Agent Lane A - Contracts And State-Store Boundary

Unassigned lane for parallel work. Use this file when assigning Agent A.

## Goal

Close the state-store boundary and the smallest contract cleanup slice around it.

## Tasks

- `P0` `RC-A6`: align dead-letter signatures with tenant-scoped concrete APIs.
- `P0` `S02`: split `IRunStateStore` into write/read/maintenance roles.
- `P1` schema migration rollback: make storage changes recoverable after `S02`.
- `P1` `S13`: remove duplicate `estimateRunRef` declaration.

## Dependencies

- `S02` depends on `RC-A6`.
- `Schema migration rollback` depends on `S02`.
- `S13` is independent and can run in parallel.

## Expected Outcome

- state-store ownership is explicit
- contract drift is reduced
- migration recovery is defined
