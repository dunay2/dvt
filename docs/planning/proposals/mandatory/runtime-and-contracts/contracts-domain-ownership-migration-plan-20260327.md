---
title: Contracts Domain Ownership Migration Plan
status: Accepted
owner: Architecture / Contracts / Engine / Planner / Delivery / Artifacts / Traceability
last_reviewed: 2026-05-14
planning_type: proposal
---

# Contracts Domain Ownership Migration Plan

## Context

The current baseline still centralizes two different kinds of contracts in
`@dvt/contracts`:

1. serializable cross-context types that genuinely belong to the shared kernel
2. behavioral ports and domain policies that belong to one bounded context

Per ADR-0018 and ADR-0034, category 2 should live in the package that owns the
domain. Per ADR-0035, the public planner contracts
`ExecutionPlanV2`, `PlannerInputEnvelopeV2`, and `IExecutionPlanner` remain in
`@dvt/contracts`.

## Objective

Separate physical and semantic ownership so that:

1. `@dvt/contracts` keeps only shared serializable contracts
2. non-shared behavioral ports move to the package that owns the domain
3. the dependency graph reflects real domain ownership instead of historical
   convenience

## Accepted tracker

This document is the accepted canonical proposal for `RC-G1`.

- operational tracker: `docs/planning/state/agent-lane-a.yaml`
- umbrella task: `RC-G1`
- delivered slices:
  - `RC-G1-A`: ownership-matrix freeze
  - `RC-G1-B`: engine ports migration
    - `RC-G1-B1`: docs/contracts-first inventory freeze plus residual-import
      baseline
    - `RC-G1-B2`: owner-package move inside `@dvt/engine`
    - `RC-G1-B3`: downstream import cutover in adapters and state-store
    - `RC-G1-B4`: guards, ARC-2, and closeout validation
  - `RC-G1-C`: delivery / traceability / artifacts migration
  - `RC-G1-D`: planner-private migration plus final shared-kernel cleanup
- parent closure:
  - `RC-G1`: final engine/planner/shared hardcut and truth sync, recorded in
    `docs/planning/closeouts/20260514-rc-g1-contract-ownership-closure-closeout.md`
- completion note:
  - `RC-G1-B` is delivered by
    `docs/evidence/ED-20260411-rc-g1-b4-engine-shared-kernel-hardening.md`
  - `RC-G1-C` is delivered by
    `docs/evidence/ED-20260419-rc-g1-c-owner-package-migration.md`
  - `RC-G1-D` is delivered by
    `docs/evidence/ed-20260427-rc-g1-d-planner-ownership-migration.md`
  - `RC-G1` parent closure is delivered by
    `docs/evidence/ed-20260514-rc-g1-contract-ownership-closure.md`
  - no live `RC-G1` execution remains; future ownership drift must open a new
    task instead of extending this closed migration

Do not open a second proposal for this same migration.

## Classification rule

Move a contract out of `@dvt/contracts` when it:

1. expresses domain behavior such as a port, policy, or workflow contract
2. defines operations and side effects, not only a serializable shape
3. evolves semantically under one bounded-context owner

Keep a contract in `@dvt/contracts` when it:

1. is a serializable cross-context shape such as a DTO, ref, envelope, id, or
   schema
2. acts as a compatibility or boundary-validation contract between contexts
3. is explicitly fixed in the shared kernel by an accepted ADR

## Family taxonomy freeze

| Family                    | Disposition     | Canonical home              | Decision rule                                                             |
| ------------------------- | --------------- | --------------------------- | ------------------------------------------------------------------------- |
| `shared` serializable     | `stay shared`   | `@dvt/contracts`            | DTOs, refs, envelopes, ids, schemas, and public cross-context contracts   |
| `engine` behavioral ports | `move to owner` | `@dvt/engine`               | ports and policies whose semantics belong to engine                       |
| `planner` private ports   | `move to owner` | `@dvt/planner`              | planner-private ports and policies that are not public ADR-0035 contracts |
| `delivery` ports          | `move to owner` | `@dvt/delivery`             | operational outbox and delivery ports that are not pure shared shapes     |
| `traceability` ports      | `move to owner` | `@dvt/traceability-service` | lineage emission and publication ports                                    |
| `artifacts` ports         | `move to owner` | `@dvt/artifacts`            | artifact storage, reader, and writer ports                                |

The only allowed binary decision for each affected contract is:

1. `stay shared`
2. `move to owner`

There are no intermediate categories, "semi-shared" contracts, or permanent
convenience wrappers.

## What moves

### Non-shared contracts to relocate

| Current contract                                  | Current physical home | Target owner                | Why it moves                                               |
| ------------------------------------------------- | --------------------- | --------------------------- | ---------------------------------------------------------- |
| `src/adapters/IProviderAdapter.v1.ts`             | `@dvt/contracts`      | `@dvt/engine`               | behavioral execution port, not a shared DTO                |
| `src/engine/IRunStateStore.v1.ts`                 | `@dvt/contracts`      | `@dvt/engine`               | run aggregate write/read/maintenance port                  |
| `src/engine/IRunSnapshotStalenessQuery.v1.ts`     | `@dvt/contracts`      | `@dvt/engine`               | engine operational read port, not a cross-context contract |
| `src/contracts/engine/IStartRunIntentStore.v1.ts` | `@dvt/contracts`      | `@dvt/engine`               | crash-consistency and start-run intent lifecycle port      |
| `src/contracts/engine/StartRunIntentPolicy.v1.ts` | `@dvt/contracts`      | `@dvt/engine`               | domain policy for intent transitions                       |
| `src/contracts/engine/IProjector.v1.ts`           | `@dvt/contracts`      | `@dvt/engine`               | projection port coupled to the execution model             |
| `src/contracts/engine/IOutboxStorage.v1.ts`       | `@dvt/contracts`      | `@dvt/delivery`             | delivery/outbox worker operational port                    |
| `src/contracts/lineage/ILineageSink.v1.ts`        | `@dvt/contracts`      | `@dvt/traceability-service` | traceability publication port                              |
| `src/ports/artifact-store.ts`                     | `@dvt/contracts`      | `@dvt/artifacts`            | artifact storage port family                               |
| `IPlanExecutabilityValidator`                     | `@dvt/contracts`      | `@dvt/planner`              | planner-owned executability validation behavior            |
| `IExecutionBindingVerifier`                       | `@dvt/contracts`      | `@dvt/planner`              | planner-owned binding verification behavior                |
| `IPlanValidationLifecycleStore`                   | `@dvt/contracts`      | `@dvt/planner`              | planner validation lifecycle store                         |
| `ICustomPolicyNamespaceRegistry`                  | `@dvt/contracts`      | `@dvt/planner`              | planner-owned policy namespace registry                    |

### Contracts that do not move

| Contract                 | Why it stays shared                                                                |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `ExecutionPlanV2`        | public cross-context planner contract; ADR-0035 fixes its home in `@dvt/contracts` |
| `PlannerInputEnvelopeV2` | public planner boundary contract; ADR-0035 fixes its home in `@dvt/contracts`      |
| `IExecutionPlanner`      | public integration contract; ADR-0035 fixes its home in `@dvt/contracts`           |

## Where

### Source and target paths

| Domain             | Source paths                                                        | Target paths                                         |
| ------------------ | ------------------------------------------------------------------- | ---------------------------------------------------- |
| Engine             | `packages/@dvt/contracts/src/{adapters,engine,contracts/engine}/*`  | `packages/@dvt/engine/src/{adapters,ports,domain}/*` |
| Planner non-public | planner behavior-port interfaces named above                        | `packages/@dvt/planner/src/contracts/*`              |
| Delivery           | `packages/@dvt/contracts/src/contracts/engine/IOutboxStorage.v1.ts` | `packages/@dvt/delivery/src/contracts/*`             |
| Traceability       | `packages/@dvt/contracts/src/contracts/lineage/ILineageSink.v1.ts`  | `packages/@dvt/traceability-service/src/contracts/*` |
| Artifacts          | `packages/@dvt/contracts/src/ports/artifact-store.ts`               | `packages/@dvt/artifacts/src/ports/*`                |

## Impact

### Technical impact: current consumer counts

| Contract                                                 | Consumer files |
| -------------------------------------------------------- | -------------- |
| `IRunStateStore`                                         | `44`           |
| `IProviderAdapter`                                       | `38`           |
| `IOutboxStorage`                                         | `19`           |
| `IStartRunIntentStore`                                   | `14`           |
| `IRunSnapshotStalenessQuery`                             | `10`           |
| `IEventBus`                                              | `9`            |
| `IPlanExecutabilityValidator`                            | `6`            |
| `ILineageSink`                                           | `5`            |
| `ILineageOutboxStore`                                    | `5`            |
| `IStepTypeRegistry`                                      | `5`            |
| `IPlanValidationLifecycleStore`                          | `4`            |
| `IProjector`                                             | `2`            |
| `IExecutionBindingVerifier`                              | `2`            |
| `ICustomPolicyNamespaceRegistry`                         | `2`            |
| `IArtifactStore` / `IArtifactReader` / `IArtifactWriter` | `1` each       |

### System impact

| System                                                | Expected impact                                                |
| ----------------------------------------------------- | -------------------------------------------------------------- |
| `@dvt/engine`                                         | high: main receiver of behavioral ports                        |
| `@dvt/adapter-postgres`                               | high: implements engine, delivery, and planner lifecycle ports |
| `@dvt/adapter-temporal`                               | medium-high: implements `IProviderAdapter` and policy mappers  |
| `apps/api`                                            | medium: wiring and plan-validation use cases                   |
| `@dvt/delivery` and `apps/outbox-worker`              | medium: consolidates outbox contract ownership                 |
| `@dvt/traceability-service` and `apps/lineage-worker` | medium: owns lineage sink and outbox contracts                 |
| `@dvt/artifacts`                                      | medium: owns artifact-store ports                              |

## How

### Phase 0 - preparation and move-and-cut baseline

- inventory current imports and freeze the destination owner package before the
  cut
- ensure structural-equivalence tests and package-level validation exist for
  touched packages
- disallow dual `owner + shared` exports in the engine-ownership slice

### Phase 1 - engine ownership

- move `IProviderAdapter`, `IRunStateStore`, `IStartRunIntentStore`,
  `IRunSnapshotStalenessQuery`, `IProjector`, and `StartRunIntentPolicy` into
  `@dvt/engine`
- treat that list as the minimum mandatory scope of `RC-G1-B`
- migrate internal engine imports to owner-local paths
- migrate implementations in `adapter-postgres`, `adapter-temporal`, and
  `state-store`

### Phase 2 - delivery / traceability / artifacts ownership

- move outbox ports to `@dvt/delivery`
- move lineage ports to `@dvt/traceability-service`
- move artifact-store ports to `@dvt/artifacts`
- keep serializable DTOs such as `EventEnvelope`, `OutboxRecord`, refs, and
  event shapes in the shared kernel

### Phase 3 - planner non-shared ownership

- move `IPlanExecutabilityValidator`, `IExecutionBindingVerifier`,
  `IPlanValidationLifecycleStore`, and `ICustomPolicyNamespaceRegistry` into
  `@dvt/planner`
- keep the three ADR-0035 public contracts in `@dvt/contracts`

### Phase 4 - hardening and closure

- restrict imports with guards such as `no-restricted-imports` or equivalent
  architecture tests
- adjust package exports so only approved surfaces remain public
- close the source package with residual references equal to zero for the moved
  behavioral-port set
- confirm `@dvt/contracts` is limited to truly shared DTOs, schemas, parsers,
  refs, and event shapes

## Executable sub-slices for `RC-G1-B`

### `RC-G1-B1` - docs/contracts-first inventory freeze

**Objective**

- freeze the exact inventory of engine-owned ports leaving `@dvt/contracts`
- fix source-path to owner-path targets
- measure the residual-import baseline that later slices must drive to zero

**Frozen mandatory scope manifest**

| Symbol                       | Source path                                                               | Owner path target                                              | Residual imports | Package split                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------- |
| `IProviderAdapter`           | `packages/@dvt/contracts/src/adapters/IProviderAdapter.v1.ts`             | `packages/@dvt/engine/src/adapters/IProviderAdapter.ts`        | `31`             | `@dvt/engine: 22`, `@dvt/adapter-temporal: 2`, `apps/api: 6`, `@dvt/contracts: 1`                             |
| `IRunStateStore`             | `packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts`                 | `packages/@dvt/engine/src/ports/IRunStateStore.ts`             | `24`             | `@dvt/engine: 14`, `@dvt/adapter-postgres: 3`, `@dvt/adapter-temporal: 1`, `apps/api: 5`, `@dvt/contracts: 1` |
| `IStartRunIntentStore`       | `packages/@dvt/contracts/src/contracts/engine/IStartRunIntentStore.v1.ts` | `packages/@dvt/engine/src/ports/IStartRunIntentStore.ts`       | `11`             | `@dvt/engine: 8`, `@dvt/adapter-postgres: 1`, `@dvt/contracts: 2`                                             |
| `IRunSnapshotStalenessQuery` | `packages/@dvt/contracts/src/engine/IRunSnapshotStalenessQuery.v1.ts`     | `packages/@dvt/engine/src/ports/IRunSnapshotStalenessQuery.ts` | `5`              | `@dvt/adapter-postgres: 3`, `@dvt/engine: 2`                                                                  |
| `IProjector`                 | `packages/@dvt/contracts/src/contracts/engine/IProjector.v1.ts`           | `packages/@dvt/engine/src/ports/IProjector.ts`                 | `0` downstream   | owner-local path already exists; shared export still had to be retired                                        |
| `StartRunIntentPolicy`       | `packages/@dvt/contracts/src/contracts/engine/StartRunIntentPolicy.v1.ts` | `packages/@dvt/engine/src/domain/startRunIntentPolicy.ts`      | `2`              | `@dvt/engine: 1`, `@dvt/contracts: 1`                                                                         |

**Residual-import baseline method**

- scan scope: `packages/**` and `apps/**`
- included files: `*.ts`
- excluded files: `dist/**` and `node_modules/**`
- counting rule: a file counts when it imports from `@dvt/contracts` and
  references the symbol name
- closure rule: `RC-G1-B3` closes only when that residual baseline reaches `0`
  outside the permitted shared-kernel surfaces

### `RC-G1-B2` - owner-package move in `@dvt/engine`

**Definition of done**

- the mandatory ports physically live in `@dvt/engine`
- `@dvt/engine` no longer imports them from `@dvt/contracts`
- no dual owner/shared aliases remain

**Current repo-state closure note**

- all mandatory owner-local targets already exist
- no TypeScript file under `packages/@dvt/engine/src/**` imports the moved port
  set from `@dvt/contracts`
- consequence: `RC-G1-B2` is materially satisfied; remaining work is closure of
  the legacy shared publication surface in `RC-G1-B4`

### `RC-G1-B3` - downstream import cutover

**Definition of done**

- adapters, state-store, and governed consumers import from `@dvt/engine`
- residual imports of the moved engine-owned port set from `@dvt/contracts`
  equal `0`
- the shared kernel no longer acts as the physical host for those ports

**Current repo-state closure note**

- no TypeScript file under `packages/@dvt/adapter-postgres/src/**`,
  `packages/@dvt/adapter-temporal/src/**`, `packages/@dvt/state-store/src/**`,
  or `apps/api/src/**` imports the moved engine-owned port set from
  `@dvt/contracts`
- consequence: governed downstream consumers are already cut over to
  `@dvt/engine`; remaining work is hardening and legacy export removal in
  `RC-G1-B4`

### `RC-G1-B4` - hardening and closeout

**Definition of done**

- no legacy exports remain for the moved ports or their equivalent
  engine-owned behavioral ports
- regression guards prevent those imports from returning
- ARC-2 evidence and risk updates are committed
- docs, contracts, and planning surfaces remain in sync
- `pnpm verify:prepush` closes green

**Current repo-state closure note**

- `packages/@dvt/contracts/src/index.ts` no longer re-exports
  `IPlanFetcher`, `IPlanIntegrityValidator`, `IProviderAdapter`,
  `IRunStateStore`, `RunStateCommandPort`, `IClock`, or
  `IIdempotencyKeyBuilder`
- `packages/@dvt/contracts/src/adapters/IProviderAdapter.v1.ts`,
  `packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts`, and
  `packages/@dvt/contracts/src/contracts/engine/IProjector.v1.ts` are removed
  from the shared kernel
- `packages/@dvt/contracts/src/contracts/engine/RunStateVocabulary.v1.ts`
  retains only shared serializable run-state vocabulary such as events,
  snapshots, artifact refs, metadata, and idempotency input shapes
- `packages/@dvt/contracts/src/contracts/engine/ExecutionSemantics.v1.ts`
  no longer re-exports `IClock`, `IIdempotencyKeyBuilder`, `IPlanFetcher`, or
  `IPlanIntegrityValidator`
- the last direct TypeScript consumer of an equivalent engine-owned behavioral
  port from `@dvt/contracts`
  (`packages/@dvt/adapter-temporal/test/integration.time-skipping.shared.ts`
  importing `RunStateCommandPort`) is already cut over to `@dvt/engine`
- `eslint.config.cjs` now blocks imports of the moved engine-owned ports and
  equivalent behavioral ports from `@dvt/contracts` in `@dvt/engine`,
  `@dvt/adapter-postgres`, `@dvt/adapter-temporal`, `@dvt/state-store`, and
  `apps/api`
- consequence:
  - `RC-G1-B4` is closed
  - `RC-G1-B` is closed
  - `RC-G1-D` subsequently closed planner-private ownership
  - `RC-G1` parent closure removed the residual physical shared-kernel engine
    behavior files and legacy root artifact

## Executable sub-slices for `RC-G1-C`

### `RC-G1-C1` - delivery ownership cutover

**Definition of done**

- `@dvt/delivery` physically owns `IOutboxStorage`, `IEventBus`,
  `OutboxWorkerObserver`, `OutboxTickResult`, `OutboxClaimSelection`,
  `OutboxFailureDisposition`, and `MAX_OUTBOX_ATTEMPTS`
- `@dvt/contracts` retains only shared delivery shapes such as `EventEnvelope`,
  `OutboxRecord`, and `DeadLetterRecord`
- governed delivery consumers import the moved behavioral ports from
  `@dvt/delivery`, not `@dvt/contracts`
- no legacy root export remains for delivery-owned behavioral ports under
  `@dvt/contracts`

**Frozen implementation rule**

- do not move `EventEnvelope`, `OutboxRecord`, or `DeadLetterRecord` out of the
  shared kernel in this slice
- treat the move as an owner-package cutover, not as a delivery DTO rewrite

### `RC-G1-C2` - lineage and traceability ownership cutover

**Definition of done**

- `@dvt/traceability-service` physically owns `ILineageSink`,
  `ILineageOutboxStore`, `LineagePublishPayload`, `LineageFailureDisposition`,
  `LineageOutboxRecord`, `LineageDeadLetterRecord`, and
  `MAX_LINEAGE_ATTEMPTS`
- `LineageWorkerRuntime` and `LineageOutboxObserver` live in
  `@dvt/traceability-service`, not in `@dvt/delivery`
- `apps/lineage-worker`, `@dvt/adapter-postgres`, and lineage tests import the
  lineage runtime and lineage ports from `@dvt/traceability-service`
- `@dvt/contracts` no longer exports lineage-owned behavioral ports

**Frozen implementation rule**

- `@dvt/delivery` remains the owner of generic outbox delivery only
- lineage-specific runtime or policy MUST NOT remain in `@dvt/delivery` after
  this cut completes

### `RC-G1-C3` - artifacts retirement and hardening

**Definition of done**

- `packages/@dvt/contracts/src/ports/artifact-store.ts` is retired from the
  active shared-kernel surface
- `validateArtifactIntegrity` lives in `@dvt/artifacts` and all live callers
  import it from the owner package
- `ArtifactStoreError` remains in `@dvt/contracts` for this slice
- the generic `IArtifactStore`, `IArtifactReader`, and `IArtifactWriter`
  contracts are not recreated under `@dvt/artifacts`
- lint guards prevent the generic artifact-store contract from being
  reintroduced as an active shared behavioral surface

**Frozen implementation rule**

- `@dvt/artifacts` continues to prefer its current specific owner-local ports
  such as `ICompiledCodeStorage`, `IPlanStoreReader`, `IPlanStoreWriter`,
  `IDbtProjectBundleReader`, and `IRunExecutionContextReader`
- this slice retires the obsolete generic abstraction; it does not broaden into
  a larger shared error-contract migration

## Executable sub-slices for `RC-G1-D`

### `RC-G1-D1` - planner behavior-port ownership split

**Definition of done**

- `@dvt/planner` physically owns `IPlanExecutabilityValidator`,
  `IExecutionBindingVerifier`, `IPlanValidationLifecycleStore`, and
  `ICustomPolicyNamespaceRegistry`
- `@dvt/contracts` no longer exports those behavior-port names from its root
  barrel
- shared serializable planner vocabulary remains in `@dvt/contracts`, including
  executability rejection codes, validation result shapes, binding result
  shapes, validation state/record shapes, and custom policy serializable
  namespace vocabulary
- `@dvt/contracts` does not import `@dvt/planner`

**Frozen implementation rule**

- Do not move `ExecutionPlan`, `PlannerInputEnvelope`, or `IExecutionPlanner`;
  ADR-0035 keeps those public planner contracts in `@dvt/contracts`
- Do not move serializable rejection/result/state DTOs if they are consumed by
  shared contracts, schema packs, records, or boundary responses

### `RC-G1-D2` - consumer cutover and dependency declaration

**Definition of done**

- `apps/api` imports the moved planner behavior ports from `@dvt/planner`
- `@dvt/adapter-postgres` imports `IPlanValidationLifecycleStore` from
  `@dvt/planner` and declares the planner dependency explicitly
- no production TypeScript file imports the moved planner behavior ports from
  `@dvt/contracts`
- API and adapter package builds remain green

### `RC-G1-D3` - guards, ARC-2, and closure

**Definition of done**

- architecture tests prove the moved behavior ports are absent from
  `@dvt/contracts` and present in `@dvt/planner`
- planner-side architecture tests validate semantic encapsulation for moved
  behavior-port modules: owned-concern docblocks, type-only shared-vocabulary
  imports, no local DTO vocabulary exports, and no peer-domain or concrete
  adapter imports
- the planner component guide documents public API, invariants, transitions,
  consumers, and extension rules for the moved behavior-port component
- lint guards prevent governed consumers from reintroducing planner-private
  behavior-port imports through `@dvt/contracts`
- ARC-2 evidence and risk register updates are published
- docs, generated planning views, and status surfaces are synchronized
- `pnpm verify:prepush` closes green

## Execution tracker

This document acts as the dedicated tracker for the work governed by ADR-0034.

- `RC-G1-A`
  - owner: Architecture + Contracts + Docs
  - target date: `2026-04-02`
  - touched scope: `docs/planning/proposals`, `docs/planning/reviews`,
    `docs/planning/state`, `docs/contracts`
  - validation baseline: `pnpm docs:sync`, `pnpm docs:workboard:generate`,
    `pnpm verify:prepush`
  - rollback note: not applicable; docs and tracker freeze only
- `RC-G1-B`
  - owner: Engine + Contracts
  - target date: `2026-04-03`
  - touched scope: `@dvt/engine`, `@dvt/contracts`, `@dvt/adapter-postgres`,
    `@dvt/adapter-temporal`, `@dvt/state-store`
  - validation baseline: ARC-2 evidence, touched-package tests, and
    `pnpm verify:prepush`
  - rollback note: revert the full slice if the cutover does not close cleanly
  - execution order: `RC-G1-B1 -> RC-G1-B2 -> RC-G1-B3 -> RC-G1-B4`
- `RC-G1-C`
  - owner: Delivery + Traceability + Artifacts + Contracts
  - target date: `2026-04-19`
  - touched scope: `@dvt/delivery`, `@dvt/traceability-service`,
    `@dvt/artifacts`, `@dvt/contracts`, `apps/outbox-worker`,
    `apps/lineage-worker`
  - validation baseline: ARC-2 evidence, touched-package tests, and
    `pnpm verify:prepush`
  - rollback note: revert the active owner-package cut as one bounded slice if
    the residual-import closure does not finish cleanly
  - execution order: `RC-G1-C1 -> RC-G1-C2 -> RC-G1-C3`
- `RC-G1-D`
  - owner: Planner + Contracts + API + Adapter-postgres
  - target date: `2026-04-24`
  - touched scope: `@dvt/planner`, `@dvt/contracts`, `apps/api`,
    `@dvt/adapter-postgres`, and docs governance
  - validation baseline: ARC-2 evidence, touched-package tests, and
    `pnpm verify:prepush`
  - rollback note: preserve dual exports only until the full closure is ready
- `RC-G1`
  - owner: Architecture + Contracts + Engine + Planner
  - target date: `2026-05-14`
  - touched scope: `@dvt/contracts`, architecture tests, active architecture
    docs, ARC evidence, risk register, and planning DB state
  - validation baseline: ARC-2 evidence, contracts build/test/typecheck,
    docs sync/status generation, planning DB closure, and `pnpm verify:prepush`
  - rollback note: revert the parent closure if any removed shared-kernel
    behavior port still has a governed consumer

## Risks and mitigations

- broken cross-package imports
  - severity: high
  - mitigation: pre-migration inventory, atomic cutover, residual imports closed
    to `0`
- ownership drift between docs and code
  - severity: medium
  - mitigation: update contracts and planning docs by phase and force
    `docs:sync`
- wrapper or satellite packages being reintroduced
  - severity: medium
  - mitigation: enforce ADR-0034 posture and review export maps explicitly
- accidental semantic change while moving types
  - severity: high
  - mitigation: structural-equivalence checks plus package-level behavioral
    validation

## Closure criteria

1. Every listed non-shared port lives in its owner package.
2. `@dvt/contracts` keeps only truly shared cross-package DTOs, schemas,
   boundary parsers, refs, and event shapes.
3. No invalid residual imports remain between bounded contexts.
4. Slice validations and `pnpm verify:prepush` pass.
5. Contract and planning documentation stay in sync with no drift.

## Parent Closure - 2026-05-14

`RC-G1` is closed as of 2026-05-14.

The final parent slice removed residual physical drift that remained after the
sub-slice evidence:

- `IProviderAdapter` exists only under `@dvt/engine`.
- `IRunStateStore`, `RunStateCommandPort`, `IClock`, and
  `IIdempotencyKeyBuilder` exist only as engine-owned behavior ports.
- shared run-state DTOs now live in
  `packages/@dvt/contracts/src/contracts/engine/RunStateVocabulary.v1.ts`.
- `IProjector` exists only under `@dvt/engine`.
- the tracked legacy `packages/@dvt/contracts/index.js` entrypoint delegates to
  the canonical source barrel instead of re-exporting removed adapter files.

The closure guard is:

- `packages/@dvt/contracts/test/provider-adapter.architecture.test.ts`
- `packages/@dvt/contracts/test/run-state-store-maintenance-concurrency.architecture.test.ts`

No compatibility alias or rollback seam remains in `@dvt/contracts` for the
retired engine-owned behavior ports.

## References

- `docs/adr/ADR-0018_Shared_Kernel_Ownership_Governance.md`
- `docs/adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md`
- `docs/adr/ADR-0035-planner-public-contract-evolution-protocol.md`
- `docs/contracts/index.md`
- `docs/planning/status/governance-document-rule-inventory.md`
