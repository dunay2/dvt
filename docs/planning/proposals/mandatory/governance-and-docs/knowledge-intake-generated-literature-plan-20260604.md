---
title: Knowledge Intake Generated Literature Current Contract
status: Accepted
owner: Documentation Governance
last_reviewed: 2026-08-08
planning_type: mandatory-proposal
archived_record: docs/planning/archive/proposals/knowledge-intake-generated-literature-plan-20260604.md
---

# Knowledge intake generated literature

Documentation Governance owns `GenerateKnowledgeIntakeLiterature` and
`ListKnowledgeIntakeRetirement`. Generated literature is a deterministic
projection of governed knowledge and never a parallel task authority.

The generator and query adapter are under `scripts`; Planning DB read
structures live only in `tools/planning-db/schema.sql`. Validation is
`node --test scripts/planning-db-import.test.cjs scripts/planning-db-query.test.cjs`
and `pnpm verify:prepush`.

The detailed delivery record is historical and remains at `archived_record`.
