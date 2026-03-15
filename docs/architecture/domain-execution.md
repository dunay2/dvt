---
title: Execution Domain
status: Draft
owner: Architecture / Docs
last_reviewed: 2026-03-15
---

# Execution Domain

## Purpose

Orchestrates workflows, manages adapters, and handles persistence in the DVT system.

## Boundaries

- [@dvt/engine](../contracts/index.md)
- [@dvt/adapter-temporal](../contracts/index.md)
- [@dvt/adapter-postgres](../contracts/index.md)

## Responsibilities

- Execute plans received from Planning
- Manage workflow orchestration
- Integrate with adapters (Temporal, Postgres)
- Update and persist run state

## Example interaction

- Executes plan, updates state, interacts with adapters

## Related documentation

- [Domain Map](domain-map.md)
- [Planning Domain](domain-planning.md)
- [Delivery Domain](domain-delivery.md)

## Status

- Core execution features implemented
- See [Current Status Map](domain-map.md#current-status-map) for pending tasks
