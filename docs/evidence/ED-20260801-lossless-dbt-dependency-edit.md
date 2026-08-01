---
title: Lossless selected dbt dependency edit
status: Accepted
date: 2026-08-01
owners:
  - '@dvt/contracts'
  - dvt-api
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/dbt-project/DbtDependencyEdit.v1.ts
  - apps/api/src/application/services/dbtDependencyEdit/ApplySelectedDbtDependencyEditCommand.ts
  - apps/api/src/application/services/dbtDependencyEdit/dbtDependencyEditDecisionModel.ts
  - apps/api/src/application/services/dbtDependencyEdit/dbtSemanticRegionPatchPlanner.ts
  - apps/api/src/infrastructure/dbt/DbtCliProjectCandidateAnalyzer.ts
  - apps/api/src/entrypoints/http/dbtDependencyEditRoutes.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter @dvt/contracts lint
    - pnpm --filter dvt-api test:ci
    - pnpm --filter dvt-api typecheck
    - pnpm --filter dvt-api lint
    - pnpm docs:feature-mechanization:implementation
    - pnpm verify:prepush
---

# Summary

`ApplySelectedDbtDependencyEdit` retargets one server-proven literal dbt `ref`
or `source` region while preserving every unrelated project byte.

# Decision

- The request carries semantic identities and revision hashes, never replacement source.
- The server accepts only a supported region owned by the selected model.
- A pure patch planner changes only literal argument bytes and preserves whitespace,
  quote style, comments, Jinja, macros, YAML sources/tests, and unrelated files.
- An isolated candidate project must pass the installed dbt analyzer and resolve to
  the requested identity before publication.
- Atomic CAS preflights every analyzed file and writes only the target file.
- Stale evidence, overlap, `code_only`, invalid dbt, semantic mismatch, CAS conflict,
  and idempotency misuse fail through typed outcomes.

# Scope Boundary

The MVP supports dependency retargeting only. Structural model creation, arbitrary
source rewriting, whole-file regeneration, and browser-side parsing are absent from
the production path.
