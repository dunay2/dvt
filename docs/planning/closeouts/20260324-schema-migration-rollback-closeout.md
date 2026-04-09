---
slice: 20260324-schema-migration-rollback
date: 2026-03-24
last_reviewed: 2026-03-24
work_item: schema-migration-rollback
status: Done
---

# Closeout: Schema Migration Rollback

## Think-First Analysis

### Problem summary

`PostgresSchemaManager` can migrate forward, but it cannot plan or execute a
rollback to a known safe schema version. That leaves the state-store storage
path recoverable only by manual SQL, which is not an acceptable operational
boundary for the adapter.

### Root cause

Migration steps are modeled as one-way `run()` operations. The schema manager
tracks which versions have been applied, but it carries no reverse action,
target-version validation, or explicit recovery API.

### Constraints and invariants

- `AGENTS.md`: inventory-first workflow, explicit validation, no hidden debt,
  and no placeholder recovery story.
- `docs/guides/ai-work-protocol.md`: public behavior changes require explicit
  think-first analysis, validation, and closeout evidence.
- `docs/planning/state/agent-lane-a.md`: `schema-migration-rollback` is the
  remaining queued lane-A task after the state-store split.
- `docs/planning/archive/reviews/architecture-and-governance/20260324-dvt-architectural-review.md`: the current
  forward-only migration runner is an operational gap and needs a real rollback
  path.
- `docs/adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md`:
  operational infrastructure concerns must stay at the adapter/composition
  boundary, not leak into domain ports.
- `docs/adr/ADR-0039-hexagonal-port-hardening-and-solid-remediation.md`:
  snapshot schema changes are migration events tracked in `schema_migrations`;
  rollback must therefore be expressed against the concrete migration catalog.

### Options considered

- Document a manual SQL rollback runbook only.
  - Rejected because it leaves recovery outside the adapter boundary and does
    not make the storage changes programmatically recoverable.
- Adopt an external migration product in this slice.
  - Rejected because it is a much larger operational migration and not the next
    bounded lane-A task.
- Add reversible migration metadata plus rollback planning/execution to
  `PostgresSchemaManager`, exposed only through the concrete Postgres adapter.
  - Selected because it closes the recovery gap without contaminating engine
    ports with infrastructure-only behavior.
- Put rollback APIs on `IRunStateStore`.
  - Rejected because migration recovery is not a domain/application contract.

### Selected option and rationale

Implement reversible migration steps in `PostgresSchemaManager`, expose
rollback planning/execution on `PostgresStateStoreAdapter`, and cover the new
operational behavior with negative-path tests around invalid targets and
readiness reset.

### Rejected alternatives

- Leaving rollback as operator-only SQL.
- Introducing rollback semantics on engine-facing ports.

## Pre-Implementation Brief

- Mode: Full
- Scope:
  - `packages/@dvt/adapter-postgres/src/PostgresSchemaManager.ts`
  - `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts`
  - `packages/@dvt/adapter-postgres/src/index.ts`
  - `packages/@dvt/adapter-postgres/test/*`
  - `packages/@dvt/adapter-postgres/DESIGN.md`
  - planning state / closeout surfaces for task closure
- Expected outcome:
  - the adapter can describe and execute rollback to a known migration version
  - rollback remains an infrastructure-only capability on the concrete adapter
  - the adapter is not considered ready for runtime traffic after rollback
- Risks and mitigations:
  - Risk: rollback silently restores an invalid target version.
    - Mitigation: validate targets against the known migration catalog and the
      applied-version set.
  - Risk: rollback logic leaks into engine-facing contracts.
    - Mitigation: keep APIs on `PostgresSchemaManager` and
      `PostgresStateStoreAdapter` only.
  - Risk: reverse steps run in the wrong order.
    - Mitigation: build the rollback plan from the applied set and execute in
      reverse migration order under the existing advisory lock.
- Out-of-scope items:
  - external migration tool adoption
  - rollback support for unrelated stores outside the core state-store adapter
  - API/admin HTTP endpoints for schema rollback
- Validation plan:
  - `pnpm --filter @dvt/adapter-postgres test`
  - `pnpm --filter @dvt/adapter-postgres build`
  - `pnpm verify:prepush`
- Test coverage plan:
  - positive plan/rollback path for a known target version
  - negative path for unknown target version
  - negative path for target version that exists in the catalog but is not
    applied in the current schema
  - readiness reset after rollback so runtime use fails closed until migrate is
    called again
- Libraries evaluated:
  - None adopted for this slice; external migration tooling was considered and
    rejected as out of scope for the bounded recovery task.

## Traceability

- Baseline ADRs:
  - `ADR-0034`
  - `ADR-0039`
- Canonical planning sources:
  - `docs/planning/state/agent-lane-a.yaml`
  - `docs/planning/state/execution-workboard.md`
  - `docs/planning/archive/reviews/architecture-and-governance/20260324-dvt-architectural-review.md`

## Real Work Performed

- Extended `packages/@dvt/adapter-postgres/src/PostgresSchemaManager.ts` so each
  migration step carries reverse semantics, the manager can build a rollback
  plan for a target version, and rollback executes step-down operations in
  reverse order under the same advisory lock used for forward migration.
- Extended `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts`
  with `planSchemaRollback()` and `rollbackSchemaTo()` while keeping the
  recovery API on the concrete adapter instead of engine-facing ports.
- Exported the rollback-plan types from `packages/@dvt/adapter-postgres/src/index.ts`.
- Added dedicated rollback tests in
  `packages/@dvt/adapter-postgres/test/PostgresSchemaManager.rollback.test.ts`
  and a negative adapter guard test in
  `packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.migrate.test.ts`.
- Updated `packages/@dvt/adapter-postgres/DESIGN.md` to document the new
  rollback planning/execution surface.
- Updated `docs/planning/state/execution-workboard.md`,
  `docs/planning/state/agent-lane-a.yaml`, `docs/planning/closeouts/index.md`,
  and the generated `docs/planning/state/agent-lane-a.md` so the lane and
  closeout surfaces match the delivered slice.

## Governing sources used

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/planning/state/agent-lane-a.md`
- `docs/planning/state/execution-workboard.md`
- `docs/planning/archive/reviews/architecture-and-governance/20260324-dvt-architectural-review.md`
- `docs/adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md`
- `docs/adr/ADR-0039-hexagonal-port-hardening-and-solid-remediation.md`

## Docs synced

- [x] `pnpm docs:sync`

## Validation evidence

- `pnpm --filter @dvt/adapter-postgres exec vitest run test/PostgresSchemaManager.rollback.test.ts` - Failed under sandbox with `spawn EPERM`.
- `pnpm --filter @dvt/adapter-postgres exec vitest run test/PostgresSchemaManager.rollback.test.ts` - Passed when rerun with escalated execution.
- `pnpm --filter @dvt/adapter-postgres build` - Passed.
- `pnpm --filter @dvt/adapter-postgres test` - Passed with escalated execution.
- `pnpm docs:sync` - Passed.
- `pnpm exec eslint packages/@dvt/adapter-postgres/src/PostgresSchemaManager.ts packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts packages/@dvt/adapter-postgres/src/index.ts packages/@dvt/adapter-postgres/test/PostgresSchemaManager.rollback.test.ts packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.migrate.test.ts` - Passed.
- `pnpm exec prettier --check packages/@dvt/adapter-postgres/src/PostgresSchemaManager.ts packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts packages/@dvt/adapter-postgres/src/index.ts packages/@dvt/adapter-postgres/test/PostgresSchemaManager.rollback.test.ts packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.migrate.test.ts packages/@dvt/adapter-postgres/DESIGN.md docs/planning/state/agent-lane-a.md docs/planning/state/agent-lane-a.yaml docs/planning/state/execution-workboard.md docs/planning/closeouts/index.md docs/planning/closeouts/20260324-schema-migration-rollback-closeout.md` - Failed first because Prettier flagged multiple touched files; passed after `pnpm exec prettier --write packages/@dvt/adapter-postgres/src/PostgresSchemaManager.ts packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts packages/@dvt/adapter-postgres/src/index.ts packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.migrate.test.ts docs/planning/state/execution-workboard.md` and rerun.
- `pnpm exec markdownlint-cli2 packages/@dvt/adapter-postgres/DESIGN.md docs/planning/state/agent-lane-a.md docs/planning/state/execution-workboard.md docs/planning/closeouts/index.md docs/planning/closeouts/20260324-schema-migration-rollback-closeout.md --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc` - Failed first on `MD060` table alignment in `docs/planning/state/execution-workboard.md`; passed after the Prettier rewrite and rerun.
- `pnpm verify:prepush` - Failed first because `docs/planning/state/execution-workboard.md` was not Prettier-clean; passed on the final rerun after formatting fixes.

## No-debt evidence

- No rule was disabled or relaxed.
- No hook was bypassed.
- No rollback story was left as manual-only operator folklore.

## No-stub evidence

- The rollback API is executable code on the concrete adapter, not a placeholder
  method or documentation-only promise.
- Negative-path tests cover invalid target handling and fail-closed readiness.
