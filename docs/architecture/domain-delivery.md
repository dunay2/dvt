---
title: Delivery Domain
status: Draft
owner: Architecture / Docs
last_reviewed: 2026-03-15
---

# Delivery Domain

## Purpose

Handles outbox worker, retry logic, sharding, and delivery ownership in the DVT system.

## Boundaries

- [@dvt/delivery](../contracts/index.md)
- [dvt-outbox-worker](../contracts/index.md)

## Responsibilities

- Publish events
- Manage delivery ownership
- Handle retries and sharding

## Example interaction

- Publishes events, manages ownership, interacts with Execution

## Related documentation

- [Domain Map](domain-map.md)
- [Execution Domain](domain-execution.md)

## Status

- Core delivery features implemented
- See [Current Status Map](domain-map.md#current-status-map) for pending tasks
