---
title: Planning Domain
status: Draft
owner: Architecture / Docs
last_reviewed: 2026-03-15
---

# Planning Domain

## Purpose

Defines the construction, compilation, and integrity validation of plans in the DVT system.

## Boundaries

- [@dvt/planner](../../packages/@dvt/planner/docs/contracts/PlannerContracts.v2.3.1.md)
- [@dvt/plan-verifier](../../contracts/index.md)
- [@dvt/plan-interpreter](../../contracts/index.md)
- [@dvt/dsl](../../contracts/index.md)

## Responsibilities

- Plan creation and editing
- Compilation and validation
- Integrity checks
- Delivery of plans to the Execution domain

## Example interaction

- Delivers plan to Engine for execution

## Related documentation

- [Domain Map](domain-map.md)
- [Execution Domain](domain-execution.md)
- [Contracts](../contracts/index.md)

## Status

- All core planning features implemented.
- See [Current Status Map](domain-map.md#current-status-map) for pending tasks.
