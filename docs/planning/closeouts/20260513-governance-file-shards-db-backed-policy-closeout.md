---
title: Governance File Shards DB-backed Policy Closeout
status: Review
owner: Engineering / CI Governance / Docs
last_reviewed: 2026-05-13
planning_type: closeout
---

# Governance File Shards DB-backed Policy Closeout

## Outcome

`GOV-SHARD-DB-1` changes the generated-docs policy gate so oversized local
`governance-files/*.files.yaml` inspection shards can be exempted from
`maxBytes` only when the artifact class declares its DB-backed projection.

The accepted projection is `planning_query_store.governance_file_query`, with
`pnpm governance:db:import` as the import rail and `pnpm governance:db:check`
as the drift-check rail.

## Changed Surfaces

- `scripts/check-generated-docs-policy.cjs`: exports testable helpers and
  validates `dbBackedArtifacts` metadata before applying size exemptions.
- `scripts/check-generated-docs-policy.test.cjs`: proves valid DB-backed shards
  pass, missing metadata fails, non-DB artifacts still fail, and bad commands
  fail closed.
- `docs/generated-docs-policy.json`: declares the DB-backed governance-file
  shard projection without raising `maxBytes`.
- `docs/architecture/components/ci-governance/system-governance-generation-workflow-component.md`
  and `docs/planning/status/db-surface-inventory.md`: document the new policy
  contract.

## Validation

- `node --test scripts/check-generated-docs-policy.test.cjs`
- `pnpm test:verify-prepush`
- `pnpm docs:gov:generated-policy`
- `pnpm lint:md:changed`
- `pnpm docs:sync:check`
- `pnpm governance:refresh`
- `pnpm verify:prepush`

## No Debt

No generated `.generated-docs` artifact is committed. The fix does not raise
`maxBytes`; it makes the DB-backed exception explicit and fail-closed.
