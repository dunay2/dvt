---
title: API / Entry Domain
status: Draft
owner: Architecture / Docs
last_reviewed: 2026-03-15
---

# API / Entry Domain

## Purpose

Handles HTTP exposure, authentication, routing, and background runtime for the DVT system.

## Boundaries

- apps/api

## Responsibilities

- Expose endpoints for external interaction
- Manage authentication and authorization
- Route signals and requests to the correct domain
- Support background runtime operations

## Example interaction

- Receives signals and exposes endpoints for plan execution and status queries

## Related documentation

- [Domain Map](domain-map.md)
- [Execution Domain](domain-execution.md)
- [Planning Domain](domain-planning.md)

## Status

- Core API features implemented
- See [Current Status Map](domain-map.md#current-status-map) for pending tasks
