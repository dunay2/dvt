---
title: Planner local documentation archive evidence
status: Accepted
date: 2026-06-01
owners:
  - '@dvt/planner'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/planner/docs/PLANNER_IMPLEMENTATION_REVIEW_v2_3_2.md
  - packages/@dvt/planner/docs/adr
  - docs/archive/planner
evidence:
  tests:
    - GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs
    - pnpm docs:sync
    - pnpm docs:status:generate
    - pnpm lint:md:changed
    - pnpm verify:prepush
---

# Summary

This evidence records the archive of historical planner-local documents that
were already classified as archive candidates by the planning documentation
triage. The active planner authority remains in repository-level architecture,
contracts, planning, and governance surfaces.

# Impact

- Historical package-local planner ADR snapshots are moved to
  `docs/archive/planner/`.
- Historical planner contract/schema snapshots are retained under
  `docs/archive/planner/contracts/`.
- Planner package maintainer notes that are not archive candidates remain in
  `packages/@dvt/planner/docs/`.

# Validation Intent

The validation proves that the archive path is discoverable through generated
documentation indexes and that removing the stale package-local copies does not
remove governed planner evidence without ARC traceability.
