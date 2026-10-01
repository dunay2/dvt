---
title: Temporal retransmission profile admission evidence
status: final
date: 2026-10-01
owners:
  - '@dvt/adapter-temporal'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-temporal/test/integration.start-retransmission.test.ts
  - packages/@dvt/adapter-temporal/package.json
evidence:
  tests:
    - pnpm --filter @dvt/adapter-temporal run prepare:integration
    - pnpm --filter @dvt/adapter-temporal exec vitest run test/integration.start-retransmission.test.ts
    - pnpm --filter @dvt/adapter-temporal test
    - pnpm --filter @dvt/adapter-temporal exec tsc -p tsconfig.json --noEmit
    - pnpm --filter @dvt/adapter-temporal run typecheck:test
    - pnpm --filter @dvt/adapter-temporal run test:integration
    - pnpm verify:prepush
---

# Temporal Retransmission Profile Admission Evidence

## Decision and authority

**The tested profile is not admitted for automatic application redispatch.**
This cut delivers provider-boundary evidence; it does not implement a retry
capability or close #2679. The remaining acceptance is not downgraded.

Governance: ADR-0001, ADR-0030, StartRunProtocol, command/query and Fowler rules,
and Planning DB design `GH-2679-REDISPATCH-PROFILE-ADMISSION` (review). The
[preimplementation matrix and diagram](https://github.com/dunay2/dvt/issues/2679#issuecomment-5929153954)
derive from [ENG1.3-REDISPATCH-STUDY-R1](https://github.com/dunay2/dvt/issues/2679#issuecomment-5926921272).
`IWorkflowEngine.startRun` and maintenance rails are referenced, not changed.
There is no new command, registry, scheduler, store or production branch.

## Reproducible profile and proof

Baseline is `3991aac9809ac92292984c17992737c72e9af9fa` (#3506). Manifests and
lockfile declare SDK 1.24.0; initial local resolution returned 1.23.0.
`pnpm install --frozen-lockfile` repaired that installation without manifest or
lockfile changes. Evidence was then run with the installed declared SDK.

The new full-server test pins Temporal CLI `v1.8.2` and asserts Server `1.31.2`,
namespace retention `86400s`, and non-global namespace mode. This matches the
CLI/server release reported by the CI service image
`temporalio/temporal@sha256:cf86707827fac99e4d1c4a47dc11b105382d796199c7bd41fb3213fb0471628e`;
it does not claim identical operating systems or a production topology.

Three service-backed cases pass:

1. Hold the original application submission at the public SDK interceptor,
   observe missing, release it first, then submit the contender: the retained
   execution rejects the contender and its exact execution identity is unchanged.
2. With the original held and missing observed, submit the contender first,
   then release the original: the contender remains the sole execution.
3. Capture a real SDK start message without substituting provider behavior.
   An exact replay returns the original active execution; a new application
   start has a distinct request ID and is rejected. After termination, a new
   application start is still rejected. Delete only that execution's history,
   wait for a missing observation, and resend the exact original message:
   **a different execution is created with the same workflow ID**.

The arrival barriers control pre-send order, not arbitrary network delays.
Queues are deliberately unpolled: these cases prove start admission, not Activity
effects or business completion. No fake adapter or workflow result is used.
The original integration suite remains responsible for real workflow completion,
Continue-As-New, and cancellation. Its SDK-selected full server is not relabelled
as the pinned profile.

## Storage prerequisite

The existing PostgreSQL tests were run on a new disposable `postgres:16`
container, separate from application and Planning DB containers. The canonical
provisioning command created a non-owner, non-BYPASSRLS application role there.

`pnpm --filter @dvt/adapter-postgres test -- PostgresStartRunIntentStore.ownership.test.ts PostgresStartRunIntentStore.test.ts StartRunIntentSchemaManager.hardcut.test.ts`
passed 16 tests with `DVT_PG_INTEGRATION=1` and URLs pointing only to that container.
This proves existing storage fencing/persistence prerequisites, not a combined
PostgreSQL/Temporal automatic-retry vertical.

## Admission obligations still unproved

The study's sufficient condition `H + L + m < Rmin` is not established: there
is no proved bound `L` covering suspended senders and every old request up to
the remote creation/deduplication decision, nor an enforced identity-preservation
profile. A retry-count limit bounds neither arbitrary suspension nor remote
effects after a caller timeout. A fixed request ID is not a durable tombstone.

The tests do not certify natural retention expiry, transport retry fault
injection, mutable-payload collision rejection, failover/restore, or a durable
redispatch horizon across reclaim. They do not prove exactly-once external
effects. Those remain explicit #2679 obligations before enabling the capability.

## Validation and integrity

The focused three-case proof, existing 244-test Temporal unit suite, production
and test typechecks, and full 15-test integration command passed without skipped
tests in the successful runs. The time-skipping server retains its existing
missing heartbeat-capability warning; this slice does not claim heartbeat
conformance. Final prepush/architecture gates and exact base/head acceptance are
recorded in the governing issue and implementation PR.

The first download attempt used `1.8.2` rather than the required `v1.8.2` release
selector and failed with HTTP 404 before any assertion (three unexecuted tests).
Correcting the pinned selector allowed the real proof; that setup failure is not
reported as a product regression. The initial ESLint missing-return-type warning
was fixed; no rule was relaxed.

Only a test spec, existing test routing and governed evidence/policy/risk are
changed. No production retry, migration, compatibility path, stub, bypassed hook,
new debt entry or removal of existing test coverage is introduced. History
deletion is confined to the owned ephemeral test server. The active application
server and its databases are not modified.
