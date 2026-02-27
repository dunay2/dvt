---
title: 'fix(determinism): make SequenceClock Date-free to satisfy strict determinism lint'
labels: [engine, determinism, lint, bug]
---

## Problem statement

The `SequenceClock` in `packages/@dvt/engine/src/utils/clock.ts` currently uses JavaScript `Date` APIs (e.g., `Date.parse`, `new Date`, `toISOString`). This violates strict determinism and is flagged by ESLint rules, blocking precommit and CI. Temporal TypeScript workflows and engine-core must not use `Date` for time logic to ensure deterministic replay and cross-platform compatibility.

## WHAT / WHY (mandatory)

### WHAT

- Describe exactly what will change (files/behavior/contracts).

### WHY

- Explain why this approach is preferred and what alternatives were rejected.

## Decision

**Option 1**: Refactor `SequenceClock` to be fully Date-free and deterministic, while keeping the same public API. All time math and ISO string parsing/formatting will be implemented with pure functions and strict validation.

## Acceptance criteria

- [ ] `packages/@dvt/engine/src/utils/clock.ts` contains zero `Date` usage (no `Date.parse`, `new Date`, `toISOString`, etc)
- [ ] `SequenceClock` returns increasing ISO UTC strings based on base + n ms (deterministic, no system time)
- [ ] Base ISO string validation remains strict (rejects invalid format)
- [ ] Leap year and day-of-month validation is correct
- [ ] All tests pass and lint-staged succeeds

## References

- [Temporal TypeScript determinism guidance](https://docs.temporal.io/develop/typescript/core-application)
- [typescript-eslint “project does not include file” explanation](https://tseslint.com/none-of-those-tsconfigs-include-this-file)
