---
title: Temporal retained start identity rejection
status: final
date: 2026-09-30
owners:
  - '@dvt/adapter-temporal'
arc_level: ARC-2
breaking: true
code_refs:
  - packages/@dvt/adapter-temporal/src/TemporalAdapter.ts
  - packages/@dvt/adapter-temporal/test/TemporalAdapter.startRun.test.ts
  - packages/@dvt/adapter-temporal/test/integration.start-identity.test.ts
  - packages/@dvt/adapter-temporal/package.json
evidence:
  tests:
    - pnpm --filter @dvt/adapter-temporal test
    - pnpm --filter @dvt/adapter-temporal typecheck
    - pnpm --filter @dvt/adapter-temporal run prepare:integration
    - pnpm --filter @dvt/adapter-temporal run test:integration
    - pnpm arch:deps
    - pnpm lint:determinism
    - node tools/ci/check-determinism.mjs
    - pnpm verify:prepush
---

# Temporal Retained Start Identity Rejection

## Governed Claim

The existing `IWorkflowEngine.startRun` rail retains its admission and ownership
boundaries. Its Temporal gateway explicitly rejects reuse of a retained closed
workflow ID and conflicts with an active workflow ID. It neither replaces the
winner nor converts a duplicate error into successful dispatch. A distinct
logical child ID remains admissible.

Governance: ADR-0001, ADR-0014, ADR-0030, ADR-0031, command/query and Fowler
rules. The
[preimplementation plan](https://github.com/dunay2/dvt/issues/2679#issuecomment-5917064313)
records the diagram, rationale, negative tests and bounded surfaces. Planning DB
design `GH-2679-TEMPORAL-START-IDENTITY` references the implemented start rail;
it does not introduce a new command or port.

## Root Cause And RED/GREEN

The adapter previously supplied only workflow ID, task queue and input. Temporal's
default permits another execution after the first closes; a deterministic ID
alone is not sufficient. The implementation adds the installed SDK's
`WorkflowIdReusePolicy.REJECT_DUPLICATE` and `WorkflowIdConflictPolicy.FAIL`.

Before the production edit, the unit regression failed because those two options
were absent. With the unchanged main adapter in a disposable Linux snapshot,
the actual Temporal test server then reproduced the defect: the second start
after completion **resolved** instead of rejecting. The running-duplicate
control passed. See the
[recorded RED result](https://github.com/dunay2/dvt/issues/2679#issuecomment-5917247974).

After the three-line production change, the service-backed regression passes:

- Start without a worker; duplicate while RUNNING is rejected.
- Execute the real workflow to COMPLETED; duplicate is rejected and the original
  Temporal execution ID, complete history and recorded DVT events are unchanged.
- Admit a new child logical ID on an unpolled queue; terminate that execution;
  duplicate is rejected and its execution ID is unchanged.

The child case proves provider dispatch admission, not the entire Engine/API
recovery use case. The workflow and Temporal server are real; the existing
integration harness uses test activity dependencies and an in-memory event store.
This is not PostgreSQL canonical-write fencing evidence.

## Validation And Environment

The Temporal unit suite passes 28 files / 244 tests. Typecheck includes production
and test TypeScript. Scoped ESLint, `arch:deps`, `lint:determinism` and the
determinism scanner pass. The focused Engine replay/determinism invocation passes
11 matching tests; its other 516 tests are explicitly outside that invocation.
The complete Temporal integration command passes two files / 10 tests, including
all nine existing scenarios and the new identity regression, with zero skips.
The test server reports its existing missing activity-heartbeat capability
warning; this slice claims start-identity behavior, not heartbeat conformance.

The original Windows integration attempt could not download the ephemeral
server (`Access denied`), before running any product assertion. The service-backed
RED/GREEN proof runs in a disposable Linux Node 22 container with frozen-lockfile
installation and the canonical explicit prepare/integration commands. The host
repository is mounted read-only; tracked files are copied into the container.
No shared Temporal service or application database is used or modified.

Contract fixtures pass 25 checks; their existing missing glossary source is
reported, not validated. Golden comparison matches the three implemented cases,
retains two deprecated baselines and skips the pre-existing unimplemented retry
fixture. Both workflow-routed JSON schemas compile with the existing AJV
settings; the existing URI-format warning is unchanged.

The complete-diff evaluator requires ARC-2 evidence/risk. The risk entry remains
open. Final hook-normalized prepush, integration-suite and exact-SHA Planning DB
results are recorded on the implementation PR and governing issue.

## Limits And Integrity

This is a provider prerequisite for #2679, not closure of #2678/#2679. Rejection
depends on Temporal retaining the workflow identity; deletion or retention expiry
is not eternal deduplication. No generic redispatch capability is enabled.

Exclusive claim/reclaim, atomic canonical-write fencing, durable pre-RPC unknown
outcomes, typed observations, confirmed compensation and retry/escalation remain
required. The independently unsafe PostgreSQL visibility candidate in #3504 is
not included. No independent full-protocol review is claimed.

No schema migration, compatibility alias, new debt entry, production fake,
disabled rule or bypassed hook is introduced. The new small integration spec is
wired into the existing integration command and excluded only from the existing
unit-only command. No test coverage or CI job is removed.
