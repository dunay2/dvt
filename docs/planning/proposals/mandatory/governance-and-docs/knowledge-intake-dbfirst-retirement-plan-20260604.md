---
title: Knowledge Intake Retirement Current Contract
status: Accepted
owner: Documentation Governance
last_reviewed: 2026-08-08
planning_type: mandatory-proposal
archived_record: docs/planning/archive/proposals/knowledge-intake-dbfirst-retirement-plan-20260604.md
---

# Knowledge intake retirement

Documentation Governance owns `ListKnowledgeIntakeRetirement`,
`ListDocumentationLifecycleFacts`, and `CheckBuzonIntakeRetirement`. These rails
classify governed documents and references; they do not create or maintain
delivery tasks.

DDL and read views live only in `tools/planning-db/schema.sql`; document facts
are rebuilt by `scripts/planning-db-import.cjs`. Validation is
`node --test scripts/planning-db-import.test.cjs scripts/planning-db-query.test.cjs tools/planning-db/knowledge/documentSnapshot.test.cjs`
and `pnpm verify:prepush`.

The detailed delivery record is historical and remains at `archived_record`.
