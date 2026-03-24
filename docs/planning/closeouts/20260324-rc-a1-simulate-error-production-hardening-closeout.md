---
slice: rc-a1-simulate-error-production-hardening
date: 2026-03-24
author: AI (GPT-5)
last_reviewed: 2026-03-24
---

# Closeout: RC-A1 SimulateError Production Hardening

## Decision

Remove `simulateError` from the runtime step contract entirely.

The runtime activity path now fails closed on unknown step fields, so
`simulateError` is not accepted in production or test-style runtime inputs.
Synthetic failure scenarios live only in test executors, which keeps the
production boundary honest and preserves the DDD boundary between runtime
behavior and test scaffolding.

## Why this is the right shape

- The runtime boundary should not expose a test-only failure hook.
- A `void`/implicit contract that can be mutated by plan content hides domain
  behavior and weakens the execution model.
- Keeping simulation in test executors preserves test coverage without leaking
  the hook into runtime inputs.

## Validation

- `pnpm --filter @dvt/adapter-temporal test` passed
- `pnpm --filter @dvt/adapter-temporal build` passed
- `pnpm verify:prepush` was run for the broader repository state during the
  related slice validation

## Follow-up

- Keep `simulateError` references only in test helpers and historical docs.
- If additional synthetic failure paths are needed, model them as dedicated test
  executors or contract-backed fixtures rather than runtime fields.
