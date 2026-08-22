---
title: DBT Authoring Code Run Vertical Current Contract
status: Accepted
owner: Web / Planner / Runtime
last_reviewed: 2026-08-08
planning_type: mandatory-proposal
archived_record: docs/planning/archive/proposals/dbt-authoring-code-run-vertical-plan-20260526.md
---

# DBT authoring code-run vertical

The delivered flow is owned by the DBT authoring bounded context. Its command
rails are `ConfigureCanvasDbtNode`, `SelectDbtModelOrigin`,
`GenerateDbtWorkspaceArtifacts`, `PreviewExecutablePlan`, and `StartRun`; its
read rails are `BuildDbtPlannerGraphSource`, `ListWorkspaceFiles`, and
`GetWorkspaceFileContent`.

Runtime behavior lives in `apps/web`, `apps/api`, and the DBT/planner packages.
Planning DB stores current architectural and rail evidence and exposes it
through governed queries; it does not own runtime data.
Validation is `pnpm --filter @dvt/web test`, the affected API/package tests,
`node --test scripts/planning-db-import.test.cjs scripts/planning-db-query.test.cjs`,
and `pnpm verify:prepush`.

The detailed delivery record is historical and remains at `archived_record`.
