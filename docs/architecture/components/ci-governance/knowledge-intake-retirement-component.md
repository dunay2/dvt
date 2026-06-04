---
title: Knowledge Intake Retirement Component
status: Active
owner: Architecture / Planning DB
last_reviewed: 2026-06-04
planning_type: architecture
---

# Knowledge Intake Retirement Component

## Owned Concern

This component owns the DB-first read model used to retire analysis intake files
without keeping `buzon/` as a second authority system.

The component does not delete intake files. It classifies each tracked intake
document into a retirement posture that planning and docs agents can query
before moving or removing files.

## Command And Query Rails

| Rail                            | Type  | DDD owner                            | Read model                          | Negative guard                                                    |
| ------------------------------- | ----- | ------------------------------------ | ----------------------------------- | ----------------------------------------------------------------- |
| `ListKnowledgeIntakeRetirement` | query | `KnowledgeIntakeRetirementReadModel` | `knowledge_intake_retirement_query` | Query must read DB rows and must not parse `buzon/*.md` directly. |

## Retirement States

| State          | Meaning                                                                          |
| -------------- | -------------------------------------------------------------------------------- |
| `canonized`    | The intake document names a canonical disposition in frontmatter.                |
| `open-actions` | The intake document still has open extracted knowledge action rows.              |
| `referenced`   | Governed docs still reference the intake document but no open action is present. |
| `unclassified` | No disposition, action, or inbound governed reference is visible in DB.          |

## Query Surface

```bash
pnpm planning:db:query knowledge-intake --state unclassified --limit 30
pnpm planning:db:query knowledge-intake --state open-actions --limit 30
pnpm planning:db:query knowledge-intake --path buzon/example.md --limit 5
```

## Invariants

- `buzon/` is an intake import source, not a canonical planning queue.
- Retirement state is derived from Planning DB knowledge tables and links.
- Generated literature must use this DB read model or a later DB projection,
  not raw directory traversal as authority.
- Physical deletion is allowed only after the DB state shows a safe
  disposition and active docs/tests no longer require the raw file.

## Flow

```mermaid
flowchart LR
  Buzon["Tracked intake files"] --> Importer["Planning DB knowledge import"]
  Importer --> Knowledge["knowledge_documents / links / actions"]
  Knowledge --> Retirement["knowledge_intake_retirement_query"]
  Retirement --> Agents["planning:db:query knowledge-intake"]
  Retirement --> Literature["regenerated literature"]
  Agents --> CanonicalDocs["canonical docs / tasks / risk"]
```

## Validation

- `node --test scripts/planning-db-query.test.cjs`
- `node --test scripts/planning-db-migrate.test.cjs`
