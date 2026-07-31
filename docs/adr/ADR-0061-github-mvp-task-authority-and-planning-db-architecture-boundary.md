---
title: ADR-0061 - GitHub MVP task authority and Planning DB architecture boundary
status: Accepted
date: 2026-07-31
owners:
  - product
  - architecture
  - delivery
---

# ADR-0061 - GitHub MVP Task Authority And Planning DB Architecture Boundary

## Context

MVP work was represented simultaneously in GitHub Issues, Planning DB task
rows, local lane YAML snapshots, generated workboards, and a DB-to-GitHub
projection. Those representations duplicated lifecycle state and could
disagree about priority, progress, blockers, or completion.

Planning DB also contains architecture knowledge that GitHub Issues do not
replace: components, capabilities, relationships, command/query rails, feature
mechanization, and evidence.

## Decision

GitHub Issues is the only authority for MVP task identity and lifecycle:
priority, status, dependencies, assignment, blockers, acceptance, and closure.
PRs provide implementation review and evidence links.

Planning DB remains authoritative for architecture and mechanization:

- components and their source ownership;
- capabilities and component relationships;
- command/query rails and their ports and adapters;
- feature mechanization and governance evidence;
- deterministic architecture-state export for recovery and review.

The repository must not maintain local lane files, generated task workboards,
Planning DB task commands or queries, or automatic Planning DB-to-GitHub task
projection.

## Consequences

- An MVP task is created, updated, and closed directly in GitHub.
- Planning DB records change only when architecture or mechanization changes.
- Architecture exports cannot create or mutate GitHub task state.
- Historical documents can mention the former workflow as evidence, but active
  instructions and executable guards must use this authority split.

## Supersedes

- [ADR-0055](./adr-0055-planning-db-canonical-operational-source.md) for task
  lifecycle authority.

ADR-0055's Planning DB architecture and deterministic export rationale remains
valid only within the narrower boundary defined here.
