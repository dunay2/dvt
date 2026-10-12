---
title: Web Physical Module Decomposition Current Contract
status: Accepted
owner: Web / Governance
last_reviewed: 2026-08-08
planning_type: mandatory-proposal
---

# Web physical module decomposition

The web bounded context owns its physical modules. Governance reads current
evidence through the existing `DetectCodeSymbolDuplicates`,
`ReadComponentProfile`, and `CheckPlanningDbComponentIntegrity` rails.
Remediation delivery state belongs in GitHub Issues.

Current component evidence lives in Planning DB and is read through governed
queries; the query structures are declared in `tools/planning-db/schema.sql`.
Validation is the affected web tests,
`node --test scripts/planning-db-integrity-check.test.cjs scripts/planning-db-query.test.cjs`,
and `pnpm verify:prepush`.
