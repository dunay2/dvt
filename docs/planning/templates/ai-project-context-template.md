---
title: AI Project Context Template
status: Active
owner: Architecture / Docs / Delivery
last_reviewed: 2026-06-02
planning_type: template
---

# AI Project Context Template

Use this template shape for DB-first project-state briefings before an AI worker
creates commands, queries, components, documents, or implementation work.

The canonical render command is:

```bash
pnpm planning:db:query ai-project-context --format markdown
```

The command reads the planning DB and writes the rendered brief to stdout. If a
review artifact is needed, redirect stdout to a deliberately named file. The
redirected file is a review artifact, not a new source of truth.

## Template Shape

```text
# DB-first AI project context

Generated: <iso timestamp>
Source authority: database

## Project state

Use this DB-first context before creating new commands, queries, components,
docs, or implementation work.

## Counts

| Metric | Value |
| --- | --- |
| planningTasks | <count> |
| reviewTasks | <count> |
| repositoryCommands | <count> |
| realWorkItems | <count> |
| realWorkOpenItems | <count> |
| commandQueryRails | <count> |
| commandQueryRailGaps | <count> |
| commandQueryRailDuplicates | <count> |
| openIncidentsAndDebt | <count> |
| governanceComponents | <count> |
| governanceDriftFiles | <count> |
| blockingPrReadinessChecks | <count> |

## Open incidents and debt

<risk/debt rows sampled from planning_query_store.risk_debt_query>

## Existing command/query rails

<rail rows sampled from planning_query_store.command_query_rail_query>

## Existing components

<component rows sampled from planning_query_store.governance_component_query>

## Current real work

<work rows sampled from planning_query_store.planning_real_work_query>

## Repository commands

<command rows sampled from planning_query_store.repository_command_query>

## PR readiness

<readiness rows sampled from planning_query_store.pr_readiness_query>

## Recommended follow-up queries

<DB-first query commands to continue investigation>
```

## Invariants

- The brief is rendered from DB rows only.
- The query must not create or mutate files.
- Generated review artifacts must not become planning authority.
- New project-state fields should extend the aggregate query rail instead of
  creating a parallel status script.
