---
title: ADR-0055 - Planning DB canonical operational source
status: Superseded
date: 2026-05-10
owners:
  - docs
  - governance
  - planning
superseded_by: ADR-0061
---

# ADR-0055 - Planning DB Canonical Operational Source

## Status

Superseded by
[ADR-0061](./ADR-0061-github-mvp-task-authority-and-planning-db-architecture-boundary.md).

## Context

Planning work has moved from occasional human edits to repeated agent and
operator queries, claims, status updates, task creation, and task deletion.
Large lane YAML files remain useful as a reviewable export format, but they are
not a good coordination backend:

- agents need narrow queries for next work, dependencies, evidence, drift, and
  ownership;
- local edits to YAML make task lifecycle changes hard to audit;
- generated workboard and governance artifacts need a single deterministic
  source for closeout;
- task create/delete needs idempotency, optimistic revision checks, and durable
  audit rows.

The existing GOV-S3 query-store work already proved that Postgres can import the
same planning and governance projections deterministically, preserve source
hashes, expose read models, and export reviewable generated artifacts.

## Decision

The local planning Postgres database is the canonical operational source for
planning and governance coordination.

Git remains the review and bootstrap boundary for repository-owned inputs. It
does not recover DB-authored architecture, mechanization, overlays, or audit
rows. Daily planning operations must use the DB command/query rails:

- `planning:db:query` for task, dependency, evidence, status, artifact,
  repository command, PR readiness, and governance inspection;
- `planning:db:operate` for task lifecycle operations;
- `planning:db:export` and `governance:db:export` only when a deterministic,
  reviewable derived publication is explicitly requested;
- `planning:db:check` and `governance:db:check` as routine closeout gates.

Implicit YAML fallback is no longer the default for generated workboards.
Derived YAML can be requested explicitly for human review, but normal
generation must fail closed if the canonical DB is unavailable or stale.

## Consequences

- Agents stop treating lane YAML files as the daily write backend.
- Task dependencies, evidence refs, status events, and generated artifacts are
  queryable through normalized DB read models.
- Governance generated artifacts can be exported from DB-held raw source
  documents; raw text is retained for byte-stable export while `jsonb` remains
  available for query projections.
- Repository command and PR readiness inspection can use imported DB rows
  instead of re-walking command catalogs or ARC policy state for operator
  output.
- Routine closeout runs only DB import and check gates.
- Derived publication occurs only in response to an explicit operator request.
- A database reset is an explicit destructive operator action. Git can
  reconstruct repository projections, but not DB-authored authority.

## Non-Goals

- This ADR does not introduce product runtime storage.
- This ADR does not make GitHub Issues canonical.
- This ADR does not commit the Postgres data directory or database dumps.
- This ADR does not remove reviewable YAML/doc exports.
