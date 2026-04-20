---
slice: 20260420-temporal-worker-runtime-config-shape
date: 2026-04-20
author: AI (GPT-5)
last_reviewed: 2026-04-20
status: Accepted
---

# Closeout: Temporal Worker Runtime Config Shape

## Think-First Analysis

- Problem summary:
  `apps/temporal-worker` no longer type-checks cleanly because its startup path
  still reads `TemporalAdapterConfig.address` even though the canonical config
  contract now stores transport settings under `TemporalAdapterConfig.connection`.
- Root cause:
  The runtime retained a stale flat-property access after the adapter config was
  normalized into nested `connection`, `timeouts`, and `workflowBudget`
  sections. The fallback `NativeConnection.connect()` path was not covered by a
  regression test, so the drift escaped app-level validation until the editor
  surfaced it.
- Constraints and invariants:
  `AGENTS.md`;
  `docs/planning/status/governance-document-rule-inventory.md`;
  `docs/guides/ai-work-protocol.md`;
  `docs/guides/testing-and-ci-capabilities.md`;
  `docs/adr/ADR-0001-temporal-integration-test-policy.md`;
  `docs/adr/ADR-0003-execution-model.md`;
  `packages/@dvt/adapter-temporal/src/config.ts`.
- Options considered:
  1. Reintroduce a flat `address` property on `TemporalAdapterConfig` for
     backward compatibility.
  2. Fix the worker runtime to use the nested canonical config shape and add a
     regression test for the default connection path.
  3. Silence the diagnostic with a cast and leave runtime behavior unchanged.
- Selected option and rationale:
  Option 2. The config contract is already canonical in `@dvt/adapter-temporal`
  and other consumers follow it. The worker should align to that contract at the
  call site instead of widening the shared type or hiding the mismatch.
- Rejected alternatives:
  Option 1 would blur the canonical config boundary and keep stale call sites
  alive. Option 3 would suppress the signal without fixing the real contract
  drift.

## Pre-Implementation Brief

- Mode:
  Slim
- Scope:
  Align `createTemporalWorkerRuntime()` with the current `TemporalAdapterConfig`
  shape and add a focused regression test for the fallback
  `NativeConnection.connect()` path.
- Touched files or paths:
  `apps/temporal-worker/src/runtime/createTemporalWorkerRuntime.ts`,
  `apps/temporal-worker/test/runtime/createTemporalWorkerRuntime.test.ts`,
  `docs/planning/closeouts/20260420-temporal-worker-runtime-config-shape-closeout.md`.
- Expected outcome:
  The worker runtime compiles against the canonical adapter config contract and
  tests prove the default native connection uses `temporalConfig.connection.address`.
- Risks and mitigations:
  Mocking `@temporalio/worker` incorrectly could destabilize unrelated tests in
  the runtime suite. Mitigation: keep the mock surface minimal and only assert
  the fallback connection path.
- Out-of-scope:
  Changes to Temporal adapter config semantics, worker host behavior, or
  unrelated dirty worktree edits outside this slice.
- Validation plan:
  `pnpm --filter dvt-temporal-worker typecheck`;
  `pnpm --filter dvt-temporal-worker test`;
  `pnpm docs:sync`;
  `pnpm verify:prepush`.
- Test coverage plan:
  Keep existing runtime lifecycle tests and add one regression that exercises
  startup without `connectionFactory`, asserting the nested address is passed to
  `NativeConnection.connect()`.
- Libraries evaluated:
  None evaluated - no custom implementation.

## Implementation

- Updated `createTemporalWorkerRuntime()` to read the canonical nested
  `TemporalAdapterConfig.connection.address` field when establishing the default
  Temporal native connection.
- Added a focused runtime regression test that omits `connectionFactory`,
  mocks `NativeConnection.connect()`, and asserts startup uses the nested
  address value produced by `loadTemporalAdapterConfig()`.
- Kept the change surface narrow to the worker app runtime and its local test
  suite; no adapter contract shape was widened and no compatibility shim was
  introduced.

## Validation Evidence

- `pnpm --filter dvt-temporal-worker typecheck` - passed
- `pnpm --filter dvt-temporal-worker test` - passed
- `pnpm docs:sync` - passed
- `pnpm verify:prepush` - passed
  Output note: the repo pre-push script completed successfully, but its
  `changed-only` subchecks reported `No changed files detected` for that run.
  The package-level `typecheck` and `test` commands above are the substantive
  validation evidence for this slice.

## No-Debt / No-Stub Evidence

- No stubs, placeholders, TODOs, fake implementations, or compatibility casts
  were added.
- No hooks or validation rules were bypassed or relaxed.
- The fix corrected the stale contract access at the call site instead of
  mutating the shared config type to preserve legacy behavior.
