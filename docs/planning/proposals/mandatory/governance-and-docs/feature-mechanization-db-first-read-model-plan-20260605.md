---
title: Feature Mechanization Read Model Current Contract
status: Accepted
owner: Architecture Governance
last_reviewed: 2026-09-22
planning_type: mandatory-proposal
---

# Feature mechanization read model

Architecture Governance owns the verified `RecordFeatureMechanizationRail` and
`ValidateFeatureMechanizationImplementation` commands plus the existing
feature-mechanization list queries. Markdown manifests are imported evidence;
DB-authored current decisions remain authoritative.

DDL and read views live only in `tools/planning-db/schema.sql`. Current
DB-authored decisions live only in Planning DB and are read through governed
queries.

## Candidate evidence

Implementation validation requires an available Git comparison, not merely an
empty list of changed paths. A missing base, missing head, unavailable merge
base, or failed Git command rejects validation. A verified empty diff remains
valid. CI supplies explicit base and head identities and validates committed
content; local pre-push additionally includes staged, unstaged, and untracked
files. Neither mode may interpret a Git failure as successful empty evidence.
Manual CI implementation validation requires a caller-supplied comparison base;
it must not default to comparing the candidate with itself.

The CI authority gap is tracked in
[#2957](https://github.com/dunay2/dvt/issues/2957). Repository import alone cannot
restore DB-authored decisions. An import-only CI database is not evidence of
complete authority. No additional publication infrastructure is part of this
Git-evidence correction.

Validation is `pnpm docs:feature-mechanization:implementation`,
`node --test scripts/planning-db-import.test.cjs scripts/planning-db-query.test.cjs scripts/planning-db-operate.test.cjs`,
and `pnpm verify:prepush`.
