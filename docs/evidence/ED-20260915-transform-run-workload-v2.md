---
title: Terminal Transform Run workload v2
status: Accepted
date: 2026-09-15
owners:
  - '@dvt/contracts'
  - '@dvt/postgres-projection'
  - dvt-api
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/DvtOperationalWorkload.v2.ts
  - packages/@dvt/contracts/src/contracts/planner/DvtPostgresOutputSchema.v1.ts
  - packages/@dvt/postgres-projection/src/dvtPostgresOutputSchema.ts
  - apps/api/src/application/services/dvtOperationalWorkloadProjector.ts
  - apps/api/src/application/services/dvtPostgresTargetProjectionPublisher.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/postgres-projection test
    - pnpm --filter dvt-api test
    - pnpm --filter dvt-api typecheck
    - pnpm --filter dvt-api lint
    - DVT_PG_URL=local pnpm --filter dvt-api exec vitest run --config vitest.integration.config.ts test/integration/dvtProtectedPreview.integration.test.ts
    - pnpm docs:feature-mechanization:implementation -- --feature DVT-TRANSFORM-RUN-WORKLOAD-V2-2524
    - pnpm arch:deps
    - pnpm verify:prepush
---

# Terminal Transform Run workload v2

## Authority and boundary

Issues #2524 and #3115, ADR-0064, ADR-0066 and the approved
[Run workload contract](../contracts/planner/dvt-operational-run-workload-v2.md)
govern this slice. Planning DB design `GH-2524-TRANSFORM-RUN-WORKLOAD-V2` and
feature `DVT-TRANSFORM-RUN-WORKLOAD-V2-2524` preceded implementation. The
existing `PreviewPlan` rail remains authoritative.

`dvt-operational-workload.v1` remains Preview-only. V2 adds explicit Run
intent, one `table` Transform result, its exact PostgreSQL target, the expected
output-schema digest and an explicit empty publication-boundary list. The
canonical step kind and missing runtime capability remain unchanged.

## Proof

- Contract tests preserve V1 and reject mismatched target connections,
  unsupported dispositions, implicit publication and unknown members.
- PostgreSQL projection maps only admitted semantic types into one ordered,
  deterministic schema value; unknown types, broken ordinals and duplicate
  names cannot produce a digest.
- API tests prove that unconfigured Transforms still lower to V1, while a
  configured `table` lowers to V2 and incomplete durable intent fails closed.
- The PostgreSQL-backed integration persists and replays one two-input JOIN as
  one V2 plan through the real protected Preview path and CAS.

## No-debt posture

No executor, publication side effect, fake success, fallback workload, new
rail, worker capability, stub or TODO is introduced. #2723 remains the sole
owner of provider effects and result evidence. Hooks and quality rules remain
enabled.
