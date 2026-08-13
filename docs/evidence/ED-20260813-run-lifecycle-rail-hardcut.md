---
title: Canonical run lifecycle rail hard-cut
status: Accepted
date: 2026-08-13
owners:
  - apps/api
  - packages/@dvt/contracts
  - packages/@dvt/engine
  - packages/@dvt/adapter-postgres
arc_level: ARC-2
breaking: true
code_refs:
  - apps/api/src/entrypoints/http/protectedRuntimeRunRoutes.ts
  - packages/@dvt/contracts/src/contracts/engine/RunControlBoundary.v1.ts
  - packages/@dvt/engine/src/core/WorkflowEngine.ts
  - packages/@dvt/adapter-postgres/src/PostgresStartRunIntentStore.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/engine test
    - pnpm --filter dvt-api test:unit
    - pnpm --filter dvt-api test:integration:ci
    - DVT_PG_INTEGRATION=1 pnpm --filter @dvt/adapter-postgres test -- PostgresStartRunIntentStore.test.ts
    - DVT_PG_URL=<postgres> TEMPORAL_ADDRESS=<temporal> pnpm --filter dvt-api exec vitest run --config vitest.integration.config.ts test/integration/protectedRuntime.integration.test.ts
    - pnpm verify:prepush
---

Issue #2169 now reaches the seven existing protected run routes through their
canonical command/query rails. Cancellation is an engine command, recovery
eligibility is owned by the engine, PAUSE and RESUME remain the only signal
vocabulary, scoped list filtering precedes limits, and public control payloads
are parsed by the shared contract.

The duplicate API run-control coordinator, start facade, local receipt parser
and generic cancellation signal were removed. Real PostgreSQL and Temporal
integration proves Start, List, Get, Events, Signal, Cancel and Recover without
compatibility fallbacks or a second authority path.

## Measured reduction

The comparison uses `origin/main@8911ef5ceb9b3cee9e55f96a70465322960bb8ff`
as the fixed before-state and the issue branch as the after-state.

| Surface                                  |                 Before |                  After | Result                                     |
| ---------------------------------------- | ---------------------: | ---------------------: | ------------------------------------------ |
| Changed API production files             | 33 files / 3,954 lines | 27 files / 3,498 lines | 6 files and 456 lines removed              |
| Changed API test files                   | 38 files / 9,493 lines | 34 files / 8,656 lines | 4 files and 837 lines removed              |
| Changed Web control files                |  6 files / 1,053 lines |  5 files / 1,008 lines | duplicate receipt parser removed           |
| Shared engine/contract/persistence files | 22 files / 6,368 lines | 24 files / 6,864 lines | one versioned contract plus focused tests  |
| Changed current documentation            |  9 files / 1,666 lines | 11 files / 1,775 lines | only the two mandatory ARC-2 records added |
| Protected lifecycle routes               |                      7 |                      7 | all real routes retained                   |
| Generic Signal operations                |  PAUSE, RESUME, CANCEL |          PAUSE, RESUME | duplicate CANCEL retired                   |
| CANCEL compatibility flags               |                      1 |                      0 | no compatibility branch                    |
| Signal constants indirection files       |                      2 |                      0 | direct canonical vocabulary                |

Across the complete branch there are 4 added, 11 deleted and 2 renamed files.
The only new documentation files are this mandatory ARC-2 evidence record and
its mandatory risk record; architecture and design authority remains in the
Planning DB.

## Executed proof

| Validation                                   | Result                                                                          |                      Duration |
| -------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------: |
| Contracts full suite                         | 445 passed                                                                      |          recorded package run |
| Engine full suite                            | 463 passed                                                                      |          recorded package run |
| API full suite                               | 985 passed; 2 infrastructure groups skipped by their declared environment gates |          recorded package run |
| PostgreSQL start/recovery intent integration | 6 passed against real PostgreSQL                                                |          recorded focused run |
| Protected API lifecycle integration          | 18 passed against real PostgreSQL and Temporal                                  | 14.88 s Vitest / 16.79 s wall |
| `pnpm verify:prepush`                        | passed                                                                          |                       268.4 s |

The protected integration sends PAUSE and RESUME to the real Temporal workflow,
uses the canonical PostgreSQL state adapter to represent worker-realized
lifecycle events, dispatches cancellation, and starts a recovery workflow. A
second Recover delivery with the same idempotency key returns the same
server-owned recovery identity and receipt.
