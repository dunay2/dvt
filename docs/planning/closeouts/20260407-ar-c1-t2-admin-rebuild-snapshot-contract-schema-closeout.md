---
title: AR-C1-T2 Admin Rebuild Snapshot Contract Schema Closeout
status: Review
owner: Product / Architecture / Delivery / Docs
last_reviewed: 2026-04-07
planning_type: closeout
---

# AR-C1-T2 Admin Rebuild Snapshot Contract Schema Closeout

## Think-First Analysis

- Problem summary:
  `AR-C1-T2` requires negative contract coverage for
  `AdminRebuildSnapshotAccess`, but the canonical machine-readable schema named
  by the lane did not exist in the repository.
- Root cause:
  `AR-C1` shipped route behavior and positive tests first, while the governed
  contract artifact for required admin action and access pipeline ordering was
  left implicit in test constants and technical-manual prose.
- Constraints and invariants:
  `AGENTS.md`;
  `docs/planning/status/governance-document-rule-inventory.md`;
  `docs/guides/ai-work-protocol.md`;
  `docs/adr/ADR-0005-contract-formalization-tooling.md`;
  `docs/adr/ADR-0006-contract-tooling-governance.md`;
  `docs/planning/state/planning-control-tower.md`;
  `docs/planning/state/how-to-add-tasks.md`;
  `docs/planning/state/agent-lane-c.yaml`;
  `docs/guides/admin-rebuild-snapshot-technical-manual-20260405.md`.
- Options considered:
  1. Add only one more positive route assertion in
     `adminRebuildSnapshotAccessContract.test.ts`.
  2. Create the missing schema artifact and validate a canonical contract object
     plus negative mutations against it.
  3. Skip the schema and encode contract shape only in Markdown prose.
- Selected option and rationale:
  Option 2. `ADR-0005` requires executable contract assets, and the lane
  explicitly names `AdminRebuildSnapshotAccess.v1.schema.json`. A repo-local
  schema plus AJV validation closes the governance gap and lets negative tests
  detect weakening of `requiredAction` or pipeline-order invariants.
- Rejected alternatives:
  Option 1 leaves the schema path nonexistent and still ties governance to
  route-local constants. Option 3 preserves prose but cannot fail automatically
  on invalid drift.

## Pre-Implementation Brief

- Mode:
  Full
- Scope:
  Introduce the canonical admin rebuild snapshot access contract doc/schema,
  validate it offline from the API contract suite, and update planning/manual
  surfaces to reference the governed artifact.
- Touched files or paths:
  `docs/contracts/shared/AdminRebuildSnapshotAccess.v1.md`,
  `docs/contracts/shared/AdminRebuildSnapshotAccess.v1.schema.json`,
  `apps/api/test/contracts/adminRebuildSnapshotAccessContract.test.ts`,
  `docs/guides/admin-rebuild-snapshot-technical-manual-20260405.md`,
  `docs/planning/closeouts/20260407-ar-c1-t2-admin-rebuild-snapshot-contract-schema-closeout.md`,
  `docs/planning/state/agent-lane-c.yaml`.
- Expected outcome:
  The repo contains one canonical executable contract artifact for admin rebuild
  snapshot access; the API contract suite validates the intended contract and at
  least two invalid mutations; planning can mark `AR-C1-T2` complete.
- Risks and mitigations:
  Risk: the schema could become so loose that negative mutations still validate.
  Mitigation: encode `requiredAction`, `adminActionPrefix`, and the full
  pipeline sequence with exact-const semantics and assert invalid mutations in
  tests.
  Risk: the schema could become so rigid that harmless wording changes churn it.
  Mitigation: constrain only machine-verifiable invariants and keep explanatory
  prose in the Markdown companion/manual.
- Out-of-scope:
  Protected-runtime composition closure (`AR-C1-T3`), shared snapshot test
  fixtures (`AR-C1-T4`), and production route behavior changes.
- Validation plan:
  `pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/contracts/adminRebuildSnapshotAccessContract.test.ts`
  `pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/entrypoints/http/adminRoutes.test.ts test/contracts/adminRebuildSnapshotAccessContract.test.ts`
  `pnpm docs:sync`
  `pnpm docs:workboard:generate`
  `pnpm verify:prepush`
- Test coverage plan:
  Keep the existing HTTP envelope assertions, add offline schema validation for
  the canonical contract object, and add negative mutations for invalid
  `requiredAction.name` and invalid pipeline ordering.
- Libraries evaluated:
  Reuse existing repo-standard `ajv` / `Ajv2020`; no new library required.
