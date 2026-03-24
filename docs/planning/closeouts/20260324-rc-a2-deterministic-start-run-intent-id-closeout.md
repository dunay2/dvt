---
slice: rc-a2-deterministic-start-run-intent-id
date: 2026-03-24
author: AI (GPT-5)
last_reviewed: 2026-03-24
---

# Closeout: RC-A2 Deterministic StartRun Intent ID

## Decision

Keep `startRun` intent identity deterministic and explicit at the engine
boundary. The active implementation derives the intent ID from the logical
identity of the start-run request, and the tests prove that the same request
produces the same intent ID while distinct logical inputs produce distinct IDs.

## Why this is DDD-shaped

- The intent log is a domain boundary, not an infrastructure detail.
- Identity must be stable for crash recovery and idempotent retries.
- The builder exposes the deterministic derivation directly instead of relying on
  a random UUID or hidden state.

## Evidence already in the repo

- [`packages/@dvt/engine/src/core/idempotency.ts`](../../../packages/@dvt/engine/src/core/idempotency.ts)
  provides `startRunIntentId(...)`.
- [`packages/@dvt/engine/src/core/WorkflowEngine.ts`](../../../packages/@dvt/engine/src/core/WorkflowEngine.ts)
  uses that deterministic ID when creating start-run intents.
- [`packages/@dvt/engine/test/core/WorkflowEngine.intent-id-deterministic.test.ts`](../../../packages/@dvt/engine/test/core/WorkflowEngine.intent-id-deterministic.test.ts)
  covers deterministic derivation and crash-recovery intent identity.
- [`packages/@dvt/contracts/src/contracts/engine/IStartRunIntentStore.v1.ts`](../../../packages/@dvt/contracts/src/contracts/engine/IStartRunIntentStore.v1.ts)
  documents the invariant that callers must derive the intent ID deterministically.

## Outcome

- `RC-A2` is treated as implemented and closed in planning.
- The execution workboard now reflects the deterministic intent ID baseline as
  `Done`.
- Open-task routing no longer presents `RC-A2` as actionable work.

## Follow-up guidance

- Preserve the deterministic intent identity shape in future refactors.
- If the identity contract changes, update the store contract, builder, runtime,
  and tests together.
