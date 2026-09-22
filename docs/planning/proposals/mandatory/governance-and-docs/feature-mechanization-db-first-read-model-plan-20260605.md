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
valid. Pre-merge validation supplies explicit base and head commit identities;
local pre-push additionally includes staged, unstaged, and untracked files.
Neither mode may interpret a Git failure as successful empty evidence.

## Single-team validation boundary

The approved single-team posture in
[#2957](https://github.com/dunay2/dvt/issues/2957#issuecomment-5777984750) keeps
Planning DB local and authoritative. Before merge, the operator runs
`pnpm docs:feature-mechanization:implementation` against that existing DB with
explicit `GIT_BASE` and `GIT_HEAD` commit SHAs and a clean worktree. The PR must
record those SHAs, command and result. A changed candidate or comparison base
requires revalidation. An unavailable DB or invalid Git evidence blocks local
acceptance; a cached pre-push stamp alone is not fresh DB evidence.

CI validates repository manifests, tests, lint, types and its other governed
checks. It does not invoke DB-authoritative implementation validation or claim
that imported repository evidence restores DB-authored decisions. Disposable
DB preparation remains only for other checks that require repository-derived
DB projections. No snapshot, tunnel, runner or authority transport is introduced.

GitHub does not independently enforce the local architecture check. This is an
explicitly accepted delivery limitation, not equivalent remote assurance. Review
this boundary before independent teams or unattended merging are introduced.

Validation is `pnpm docs:feature-mechanization:implementation`,
`node --test scripts/planning-db-import.test.cjs scripts/planning-db-query.test.cjs scripts/planning-db-operate.test.cjs`,
and `pnpm verify:prepush`.
