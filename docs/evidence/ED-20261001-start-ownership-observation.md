---
title: Exclusive start ownership and observation-only reconciliation
status: Draft
date: 2026-10-01
owners:
  - '@dvt/engine'
  - '@dvt/adapter-postgres'
  - '@dvt/adapter-temporal'
arc_level: ARC-2
breaking: true
code_refs:
  - packages/@dvt/engine/src/ports/IStartRunIntentStore.ts
  - packages/@dvt/engine/src/domain/startRunReconciliationPolicy.ts
  - packages/@dvt/engine/src/services/runMaintenance/StartRunIntentReconciliationPolicy.ts
  - packages/@dvt/engine/src/services/runMaintenance/StartRunIntentReconciliationEffects.ts
  - packages/@dvt/adapter-postgres/src/PostgresStartRunIntentPersistence.ts
  - packages/@dvt/adapter-postgres/src/PostgresRunStateCoordinator.ts
  - packages/@dvt/adapter-temporal/src/TemporalAdapter.ts
  - apps/api/src/application/services/runStartDispatchResolver.ts
evidence:
  tests:
    - pnpm --filter @dvt/engine exec vitest run --coverage
    - pnpm --filter @dvt/adapter-postgres exec vitest run
    - pnpm --filter @dvt/adapter-temporal test
    - pnpm --filter @dvt/adapter-temporal test:integration
    - pnpm --filter dvt-api test:unit
    - pnpm arch:deps
    - pnpm lint:determinism
---

# Exclusive Start Ownership And Observation-Only Reconciliation

## Authority And Scope

Governance: ADR-0030, ADR-0031, ADR-0001, StartRunProtocol, the command/query
rail rule, `.arc-policy.yaml`, the AI work protocol and preflight playbook.
Planning DB design `GH-2678-START-OWNERSHIP-PROTOCOL` remains in review.
The user approved the
[observation-only supplement](https://github.com/dunay2/dvt/issues/2679#issuecomment-5920617269)
before this behavior was implemented. That supplement records the rationale,
diagram, alternatives and negative scenarios on the existing start/maintenance
rails. No new public command or automatic redispatch is introduced.

The complete committed diff was classified by `node tools/ci/arc-check.mjs`
with `GIT_BASE=origin/main GIT_HEAD=HEAD`: ARC-2, evidence and risk required,
lint/test/schema-validate/contract-golden required. The existing
`R-20260906-ENG1-START-MUTATION-AUTHORITY` risk remains open.

## Implementation Boundaries

| Owner              | Change                                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Intent aggregate   | Exclusive receipt, CAS reclaim, durable unknown before RPC, sticky compensation and bounded retry/escalation                                            |
| Canonical stores   | Bootstrap/bind/failure retain the ownership fence through commit; canonical terminal events override stale snapshots                                    |
| PostgreSQL adapter | Conflict reread under READ COMMITTED; independent connections share a row-level fence; hard-cut initialization rejects old schema without converting it |
| Maintenance        | One observation coordinator, pure decision table and effect executor replace the separate PENDING/DISPATCHED policies                                   |
| Temporal adapter   | Typed exact-execution observation; cancellation targets the observed execution ID; acknowledgement is not confirmation                                  |
| API                | Recovery and dispatch resolver do not confirm unknown, compensated or escalated starts                                                                  |

There is no parallel DTO, second reconciler, lease table, compatibility alias or
versioned replacement. The retired lookup method and old policy tests are
replaced by the current observation contract and negative lifecycle scenarios.

## Executed Proofs

- Engine complete suite: 543 tests passed, including the final three adversarial
  cases. Coverage passed unchanged thresholds: 90.75% lines/statements,
  87.53% branches and 93.27% functions.
- Final adversarial slice: 17 tests passed. Two cases run the real Engine
  coordinator through timeout, early missing observation and late provider
  completion. Estimated starts adopt the observed run; non-estimated orphans
  retain compensation. Both send exactly one start request and no false RunFailed.
- The third adversarial case failed before its correction: rejected canonical
  adoption did not consume the bounded retry budget. Only missing/stale authority
  now exits without retry persistence; other rejected effects back off and escalate.
- PostgreSQL complete suite: 305 tests passed with integration enabled. Two
  independent clients and a non-owner application role prove claim races,
  stale-receipt rejection, canonical transaction fencing and RLS. Separate
  readers observe durable compensation; incompatible schemas remain unchanged.
- Temporal unit suite: 244 tests passed. The complete integration command passed
  12 tests with real disposable test servers, including retained-ID rejection,
  deletion allowing a new execution, and cancel acknowledgement while still active.
- API unit suite: 1,254 tests passed; 27 existing conditional tests were omitted
  by this unit invocation. This is not API PostgreSQL integration acceptance.
- Source TypeScript passed for Engine, PostgreSQL, Temporal and API; Temporal
  test TypeScript and API test TypeScript also passed. Scoped ESLint,
  determinism pre-commit and `pnpm arch:deps` passed.
- `pnpm docs:feature-mechanization:implementation` passed against the existing
  Planning DB (439 manifests). Final clean-tree exact-SHA acceptance remains a
  separate closeout obligation, not implied by this working-tree result.
- Contract fixtures passed 25 checks; their existing missing glossary source was
  reported, not validated. Golden hashes matched three implemented and two
  preserved deprecated cases; the existing unimplemented retry case was skipped.
  Both workflow-routed schemas compiled with draft2020; an initial draft7
  invocation for the OpenLineage schema was incorrect and was rerun correctly.
  Its existing ignored URI-format warning remains visible.
- The focused replay invocation passed eight matching tests; the other 535 were
  outside that filter and passed in the complete Engine suite. The determinism
  scanner found no violations.

PostgreSQL writes were confined to generated test schemas in the disposable
`dvt-2678-ownership-test` container on host port 60941. No shared application
database or shared Temporal service was modified. Temporal integration reports
the test server's existing missing heartbeat-capability warning; heartbeat
conformance is not claimed.

An additional noncanonical Engine `tsconfig.test.json` check failed: it inherits
a source-only root/composite project and includes test fixtures with invalid
branded values. No configuration or type rule was weakened. That diagnostic is
not represented as a passing test-typecheck gate.

## Deployment And Remaining Acceptance

This is an incompatible hard cut, not an automatic migration. Stop old writers
and maintenance, back up/classify existing intents and provider effects, obtain
their explicit disposition, and deploy schema/Engine/API/worker together.
Do not reset a shared database or turn old uncertainty into invented ownership.

The initializer verifies schema identity, column types and RLS flags. It is not
a comprehensive detector for arbitrary administrator modifications to all
constraints, indexes or policies. These tests assume the installed declared
schema and do not claim protection against a privileged schema rewrite.

Issue #2679 remains open for positive safe-redispatch acceptance. This cut never
resends automatically. Independent final review, final prepush and required PR
gates must be recorded before integration; no completed merge or issue closure
is claimed here.

No new debt entry, stub, placeholder, production fake, disabled rule or bypassed
hook is introduced. Pre-commit uses the repository commit helper and performs
its own formatting. Existing scope skips and unsuccessful diagnostics are
reported above rather than counted as validation.
