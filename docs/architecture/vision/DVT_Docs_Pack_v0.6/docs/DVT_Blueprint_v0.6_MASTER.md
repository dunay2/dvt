# DVT+ Blueprint — v0.6 MASTER (Canonical, Navigable)

> **Date**: 2026-02-25 (Atlantic/Canary)
> **Canonical entrypoint**: this file is the single source of truth for architecture + repo layout + tooling + enforcement.
> **Annexes**: `docs/standards/development.md` and `docs/lore.md` are normative onboarding/process companions and are part of this blueprint.

---

## Table of Contents

- [DVT+ Blueprint — v0.6 MASTER (Canonical, Navigable)](#dvt-blueprint--v06-master-canonical-navigable)
  - [Table of Contents](#table-of-contents)
  - [How to use this document](#how-to-use-this-document)
  - [Single Source of Truth policy](#single-source-of-truth-policy)
  - [Monorepo structure](#monorepo-structure)
  - [Standard module template](#standard-module-template)
  - [Build orchestration decision: pnpm baseline now, Turbo later](#build-orchestration-decision-pnpm-baseline-now-turbo-later)
  - [Tooling and recommended tools](#tooling-and-recommended-tools)
  - [Architecture overview](#architecture-overview)
  - [Event model: envelope, seq, idempotency](#event-model-envelope-seq-idempotency)
    - [8.1 Envelope schema example](#81-envelope-schema-example)
  - [Gap detection policy for projectors](#gap-detection-policy-for-projectors)
  - [Schema evolution: dual-read default](#schema-evolution-dual-read-default)
    - [10.1 Dual-read coordination protocol](#101-dual-read-coordination-protocol)
  - [Devkits: technical-only rule + enforcement](#devkits-technical-only-rule--enforcement)
  - [CLI smoke: real deps + per-module independence](#cli-smoke-real-deps--per-module-independence)
  - [ADR governance + linkage (with CI example)](#adr-governance--linkage-with-ci-example)
    - [ADR migration plan (avoid double canon)](#adr-migration-plan-avoid-double-canon)
  - [Learning path / onboarding](#learning-path--onboarding)
  - [Annex 19: Development Standard](#annex-19-development-standard)
  - [Annex 20: Lore (D\&D mapping)](#annex-20-lore-dd-mapping)
  - [References](#references)

---

## How to use this document

- Start here for architecture + rules.
- Use `docs/index.md` as the navigation hub.
- Annex 19 (development standard) is normative process/tooling.
- Annex 20 (lore) is onboarding aid and repo mapping mnemonic.

## Single Source of Truth policy

- This MASTER is canonical.
- Any semantic change MUST update this file in the same PR.
- Annexes are part of the canon; changes to annexes MUST be reflected here (reference + summary).

## Monorepo structure

> **Decision (v0.6)**: lore canonical entry is a single file `docs/lore.md`.
> Optional future split to `docs/lore/` is allowed only with explicit migration PR that updates this MASTER and `docs/index.md` in the same change.

```text
repo/
  README.md
  turbo.json
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json

  docs/
    index.md
    DVT_Blueprint_v0.6_MASTER.md
    standards/
      development.md
    lore.md                     # entry point (Annex 20)
    # optional future split:
    # lore/
    #   campaign/
    #   modules/

  docs/adr/
    ADR-0000-template.md
    ADR-0001-*.md

  tooling/
    eslint/
    scripts/

  infra/
    kafka/
      local-compose.yaml
    rds/
      local-compose.yaml

  packages/
    @dvt/
      planner/
      engine/
      run-state-store/
      projector/
      traceability-service/
      devkit-*/                 # technical-only utilities
      adapters-*/

  apps/
    api/
    ui/
```

## Standard module template

```text
packages/@dvt/<module>/
  README.md
  package.json
  tsconfig.json

  docs/
    overview.md
    architecture.md
    adr/
    contracts/
    runbooks/

  schemas/
    envelope/
      RunEventEnvelope.v1.schema.json
    commands/
      <CommandName>.v1.schema.json
    events/
      <EventName>.v1.schema.json

  src/
    index.ts
    generated/
    domain/
    application/
    ports/
    adapters/
    composition/

  test/
    unit/
    contract/
    integration/

  cli/
    src/
      smoke.ts
      validate-schemas.ts
      codegen.ts
```

## Build orchestration decision: pnpm baseline now, Turbo later

**Current baseline (repo reality)**:

- `pnpm-workspace.yaml` + root scripts in `package.json` are authoritative.
- Commands baseline: `pnpm -r build`, `pnpm -r test`, `pnpm -r lint`, `pnpm -r typecheck`.

**TurboRepo policy**:

- Turbo is **recommended**, but **not mandatory now**.
- Adopt Turbo when one of these thresholds is met:
  1. CI duration repeatedly exceeds agreed SLO.
  2. Package graph growth makes affected-only execution materially beneficial.
  3. Team confirms operational ownership for `turbo.json` maintenance.

Optional future `turbo.json` (illustrative):

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "codegen": { "outputs": ["src/generated/**"] },
    "build": { "dependsOn": ["codegen", "^build"], "outputs": ["dist/**", ".tsbuildinfo"] },
    "typecheck": { "dependsOn": ["codegen", "^typecheck"], "outputs": [] },
    "test": { "dependsOn": ["build"], "outputs": ["coverage/**"] },
    "lint": { "outputs": [] },
    "cli:smoke": { "dependsOn": ["build"], "outputs": [] }
  }
}
```

## Tooling and recommended tools

Required:

- pnpm workspaces
- TypeScript strict + ESM
- JSON Schema draft 2020-12 + AJV
- ESLint + Prettier

Recommended:

- TurboRepo (phase 2, when thresholds are met)
- API Extractor (devkit public surface enforcement — see section 11)
- Testcontainers (smoke)
- OpenTelemetry
- ESLint boundaries/no-restricted-imports

Links:

- https://turbo.build/repo/docs
- https://pnpm.io/workspaces
- https://json-schema.org/
- https://ajv.js.org/
- https://api-extractor.com/
- https://node.testcontainers.org/
- https://opentelemetry.io/

## Architecture overview

```mermaid
flowchart LR
  A[Planner (pure)] -->|ExecutionPlan + planId| B[Engine (semantics)]
  B -->|append events tx + outbox| C[(RunStateStore / Postgres)]
  C --> D[Outbox Publisher]
  D --> E[(Event Bus)]
  E --> F[Projectors]
  F --> G[(Read Models)]
  G --> H[UI / Control Plane]
```

## Event model: envelope, seq, idempotency

- Envelope carries `schemaVersion`, `eventType`, `runId`, `seq`, `occurredAt`, `idempotencyKey`, `orderingKey`.
- **`seq` ownership**: generated by RunStateStore at append time; persisted; copied into outbox; published unchanged.
- Consumers use `(runId, seq)` for ordering + dedup; tolerate duplicates and reordering.

### 8.1 Envelope schema example

Canonical JSON Schema (draft 2020-12) for `RunEventEnvelope.v1`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://dvt.internal/schemas/envelope/RunEventEnvelope.v1.schema.json",
  "title": "RunEventEnvelope",
  "description": "Outer envelope for all DVT+ run events published to the event bus.",
  "type": "object",
  "required": [
    "schemaVersion",
    "eventType",
    "runId",
    "seq",
    "occurredAt",
    "idempotencyKey",
    "orderingKey",
    "payload"
  ],
  "additionalProperties": false,
  "properties": {
    "schemaVersion": {
      "type": "string",
      "description": "Schema version of the payload (e.g. '1.0.0').",
      "pattern": "^\\d+\\.\\d+\\.\\d+$"
    },
    "eventType": {
      "type": "string",
      "description": "Fully-qualified event type (e.g. 'dvt.run.RunStarted').",
      "pattern": "^dvt\\.[a-z]+\\.[A-Z][a-zA-Z]+$"
    },
    "runId": {
      "type": "string",
      "format": "uuid",
      "description": "Stable identifier for this dbt run."
    },
    "seq": {
      "type": "integer",
      "minimum": 1,
      "description": "Monotonically increasing sequence number scoped to runId. Generated by RunStateStore."
    },
    "occurredAt": {
      "type": "string",
      "format": "date-time",
      "description": "ISO-8601 UTC timestamp when the event occurred."
    },
    "idempotencyKey": {
      "type": "string",
      "description": "Opaque key for consumer-side deduplication. Format: '<runId>:<seq>'."
    },
    "orderingKey": {
      "type": "string",
      "description": "Kafka/NATS partition key. Typically equals runId to preserve per-run ordering."
    },
    "payload": {
      "type": "object",
      "description": "Event-specific payload. Must conform to the schema referenced by eventType + schemaVersion."
    }
  }
}
```

Example `RunStarted` payload (the `payload` field above):

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://dvt.internal/schemas/events/RunStarted.v1.schema.json",
  "title": "RunStarted",
  "type": "object",
  "required": ["planId", "projectId", "triggeredBy", "models"],
  "additionalProperties": false,
  "properties": {
    "planId": { "type": "string", "format": "uuid" },
    "projectId": { "type": "string" },
    "triggeredBy": {
      "type": "string",
      "enum": ["manual", "schedule", "ci", "api"]
    },
    "models": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1,
      "description": "List of dbt model unique_ids included in this run."
    }
  }
}
```

## Gap detection policy for projectors

When a projector observes a gap in `seq` for a given `runId`:

**Gap classification thresholds** (recommended initial values — tune per environment):

- `Tshort`: **10 seconds** (configurable via `DVT_PROJECTOR_GAP_TSHORT_MS`, default `10000`)
- `Tmax`: **10 minutes** (configurable via `DVT_PROJECTOR_GAP_TMAX_MS`, default `600000`)
- Short vs large gap threshold: **delta ≤ 10** is a short gap; **delta > 10** triggers immediate backfill (configurable via `DVT_PROJECTOR_GAP_LARGE_THRESHOLD`, default `10`)

**Short gaps** (delta ≤ threshold, e.g., last=5, new=7):

- log `WARN` with `runId`, `expectedSeq`, `observedSeq`
- buffer or wait up to `Tshort` for missing seq
- continue processing other runs/partitions

**Large gaps** (delta > threshold, e.g., last=5, new=100):

- log `ERROR`
- trigger **controlled backfill** from RunStateStore for `[expectedSeq..observedSeq-1]`
- mark run projection status as `DEGRADED` until reconciled

**Timeout policy**:

- if missing seq does not arrive within `Tmax`, mark run as `INCONSISTENT`
- emit operational alert and keep retrying backfill with exponential backoff (initial interval 5s, max 5min, factor 2)

Rationale: avoid global stalls while maintaining auditability and correctness.

## Schema evolution: dual-read default

- Default strategy: dual-read projector + write-new-only producers + controlled backfill.
- Snapshot rebuild is fallback only (requires explicit ADR).

### 10.1 Dual-read coordination protocol

The lifecycle of a schema migration has four phases:

**Phase 1 — Prepare**: Add new schema version. Deploy dual-read projectors that handle both `v_old` and `v_new`. Producers still write `v_old`. No cutover yet.

**Phase 2 — Migrate producers**: Deploy producers writing `v_new`. Both versions are live on the bus. Dual-read projectors consume both transparently.

**Phase 3 — Backfill** (if needed): For projectors that need to reprocess historical events in `v_old` format, execute controlled backfill from RunStateStore. Mark affected runs as `BACKFILLING` during this window.

**Phase 4 — Retire old path**: Once all consumers confirm `v_old` traffic has drained (observable via metrics on `schemaVersion` field in envelope), remove the dual-read branch. Gate this behind an ADR approval — the retiring PR MUST include an ADR change or reference.

**Cutover criteria** (minimum):

- Zero `v_old` events observed on the bus for `>= 2 * Tmax` (i.e., all in-flight events have been processed).
- All projector instances report `CONSISTENT` for all runs.
- Backfill jobs for the migration window are complete.

**Who decides to retire**: the team owning the producer module, with sign-off in the ADR.

## Devkits: technical-only rule + enforcement

Devkits MUST NOT export domain concepts (statuses, policies, aggregates, run lifecycle types).

**Enforcement mechanism** (concrete):

1. Each `packages/@dvt/devkit-*` package is configured with [API Extractor](https://api-extractor.com/).
2. A CI step runs `api-extractor run --local` and diffs the generated `.d.ts` rollup against an allowlist of permitted export shapes.
3. A custom ESLint rule (or `eslint-plugin-boundaries`) is configured to block `import` of devkit internals from domain modules and vice versa.
4. The `tooling/scripts/check-devkit-surface.ts` script encodes the allowlist and fails with exit code 1 if domain symbols appear in the public surface.

Any PR that modifies a devkit's `src/index.ts` MUST pass the API surface check in CI before merge.

## CLI smoke: real deps + per-module independence

- `cli:smoke` MUST start real deps (Postgres + Kafka/NATS) and run an end-to-end slice.
- Each runtime module SHOULD have its own smoke to prove independence.
- Local infra is provided by `infra/kafka/local-compose.yaml` and `infra/rds/local-compose.yaml` (see those files for service definitions).

## ADR governance + linkage (with CI example)

- Semantic changes MUST link to an Accepted ADR.
- CI gate enforces ADR linkage for sensitive paths (schemas/contracts/run-state).
- The gate checks for **ADR files changed in the PR diff**. Referencing an ADR only in the PR body description is NOT sufficient to pass the gate — an ADR file under `docs/adr/` must be added or modified.
- Example workflow: `infra/ci/adr-linkage.yml` in this pack.

### ADR migration plan (avoid double canon)

To consolidate scattered decision records under `docs/adr/`:

1. Freeze new ADR creation outside `docs/adr/`.
2. Move legacy ADRs in controlled batches, preserving identifiers.
3. Add redirect pointers in old locations (`README` or short tombstone files).
4. Update all links in docs/CI/scripts to `docs/adr/`.
5. Remove legacy ADR locations only after two release cycles with no broken references.

## Learning path / onboarding

The following links point to canonical module docs within the repo:

- **Week 1**: Planner + Engine — `packages/@dvt/planner/docs/overview.md`, `packages/@dvt/engine/docs/overview.md`
  - Focus: determinism guarantees in Planner; state machine semantics in Engine
- **Week 2**: RunStateStore + outbox — `packages/@dvt/run-state-store/docs/overview.md`
  - Focus: `seq` generation, transactional outbox, idempotency key construction
- **Week 3**: Projectors + read models — `packages/@dvt/projector/docs/overview.md`
  - Focus: CQRS projection, gap detection policy (section 9), dedup via `(runId, seq)`
- **Week 4**: Schema evolution + operations — `docs/standards/development.md`, ADR archive
  - Focus: dual-read protocol (section 10.1), backfill runbooks, smoke test execution

## Annex 19: Development Standard

This annex is maintained in: [`docs/standards/development.md`](./standards/development.md).
**Rule**: it is part of this blueprint; any change to it MUST be reflected in this MASTER (section 15) in the same PR.

## Annex 20: Lore (D&D mapping)

Lore entry point: [`docs/lore.md`](./lore.md).
It is an onboarding tool and mnemonic mapping to modules; treat it as a supported artifact.
If split to folder format (`docs/lore/campaign/`, `docs/lore/modules/`) is needed later, it MUST be done with migration PR updating links and templates in lockstep.

## References

- ADR guide: https://adr.github.io/
- Transactional outbox: https://microservices.io/patterns/data/transactional-outbox.html
- Event sourcing: https://martinfowler.com/eaaDev/EventSourcing.html
- CQRS: https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs
- JSON Schema 2020-12: https://json-schema.org/draft/2020-12/json-schema-core
- API Extractor: https://api-extractor.com/
- Testcontainers: https://node.testcontainers.org/
