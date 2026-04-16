---
title: Freeze TF-A2 workspace graph-draft persistence boundary
status: Accepted
date: 2026-04-16
owners:
  - packages/@dvt/contracts
  - docs
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/WorkspaceGraphDraft.v1.ts
  - packages/@dvt/contracts/src/schema-packs/workspace-graph-draft.ts
  - packages/@dvt/contracts/src/validation/planner.ts
  - packages/@dvt/contracts/test/validation/workspace-graph-draft.ts
  - docs/contracts/planner/WorkspaceGraphDraftPersistence.v1.md
  - docs/planning/state/agent-lane-a.yaml
evidence:
  tests:
    - pnpm --filter @dvt/contracts schema:verify
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/contracts build
    - pnpm lint:md
    - pnpm docs:sync
    - pnpm docs:workboard:generate
    - pnpm docs:status:generate
    - pnpm docs:planning:generated:check
    - pnpm docs:gov:locations
    - pnpm verify:prepush
---

## Summary

This evidence closes the contract-freeze portion of `TF-A2` by publishing one
shared workspace graph-draft persistence boundary in `@dvt/contracts`.

## Outcome

- Editable graph drafts now have one typed read/write contract family.
- The boundary freezes scope, capability posture, CAS revision semantics, and
  logical retry idempotency.
- Caller-visible audit and format-evolution envelopes are explicit before Lane C
  and Lane E implementation work continues.

## Notes

The slice is intentionally contract-first. It does not implement the protected
API/store path (`TF-C4`) or Canvas adoption (`TF-E2-A`); it gives those lanes a
shared boundary they must preserve.
