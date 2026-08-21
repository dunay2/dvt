---
title: Planning DB Component Integrity and Rail Vocabulary Current Contract
status: Accepted
owner: Architecture Governance
last_reviewed: 2026-08-08
planning_type: mandatory-proposal
archived_record: docs/planning/archive/proposals/planning-db-component-integrity-vocabulary-rail-plan-20260612.md
---

# Component integrity and rail vocabulary

Architecture Governance owns the component-integrity, filesystem-coverage,
architecture-drift, rail-vocabulary, duplicate-rail, component-profile,
code-symbol, governed-source-drift, and policy-validation read models. Existing
write rails record architecture relations, tests, observability, contracts,
ports, and component parentage through `scripts/planning-db-operate.cjs`.

Current query names include `ValidateComponentIntegrity`,
`ValidateComponentFilesystemCoverage`,
`ValidateRailVocabulary`, `DetectRailDuplicates`,
`CheckPlanningDbComponentIntegrity`, `InspectCodeSymbolInventory`,
`DetectCodeSymbolDuplicates`, `DetectGovernedSourceDrift`,
`ValidateContractReferences`, and `ValidateRfc2119Language`.

All DDL, functions, and views are declared only in
`tools/planning-db/schema.sql`. Current components, relations, responsibilities,
and rail evidence live only in Planning DB and are read through governed
queries. Validation is
`node --test scripts/planning-db-integrity-check.test.cjs scripts/planning-db-query.test.cjs scripts/planning-db-operate.test.cjs scripts/planning-db-current-schema-policy.test.cjs`
and `pnpm verify:prepush`.

The detailed delivery record is historical and remains at `archived_record`.
