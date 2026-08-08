---
title: DBT Project Round-Trip Current Contract
status: Accepted
owner: Web / API / DBT
last_reviewed: 2026-08-08
planning_type: mandatory-proposal
archived_record: docs/planning/archive/proposals/dbt-project-roundtrip-product-plan-20260527.md
---

# DBT project round-trip

The DBT workspace bounded context owns project-file projection and working-tree
synchronization. Current rails are `ProjectDbtGraphFromFiles`,
`ProjectDbtRoundtripCapabilityStatus`, `SaveWorkspaceFileContent`,
`GetWorkspaceFileContent`, and `RunDbtAuthorCodeRunLiveProof`.

Product behavior lives in the DBT application ports and the web/API adapters.
Current capability and architecture facts are exported through
`tools/planning-db/state/canonical-state.json`. Planning DB structure, when
needed by its read models, is declared only in `tools/planning-db/schema.sql`.
The former `ExportDbtProject` rail is retired; file round-trip uses the current
workspace file rails above.
Validation is the DBT round-trip package and web/API tests plus
`scripts/planning-db-dbt-roundtrip-capability-status.test.cjs` and
`pnpm verify:prepush`.

The detailed delivery record is historical and remains at `archived_record`.
