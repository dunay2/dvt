## Pre-implementation brief

### Suitability

- This is a focused, test-only alignment task with clear acceptance criteria and low implementation risk.

### Blockers

- None identified for implementation.

### Opportunities

- Improve semantic consistency between glossary contracts and adapter test fixtures.
- Reduce future regressions in idempotency semantics.

### WHAT

- Update temporal adapter tests so idempotency keys no longer vary with `engineAttemptId`.

### FOR (goal)

- Align tests with glossary invariants (`logicalAttemptId` drives idempotency; `engineAttemptId` is diagnostic-only).

### HOW

1. Update the test idempotency builder in `packages/adapter-temporal/test/activities.test.ts`.
2. Replace assertions expecting variance by `engineAttemptId` with glossary-aligned expectations.
3. Run targeted tests for temporal adapter and relevant workspace checks.
4. Open PR with evidence mapped to issue criteria.

### WHY

- Current tests encode contradictory semantics that can reintroduce conceptual drift.

### Scope touched

- `packages/adapter-temporal/test/activities.test.ts` (and only additional test files if strictly required).

### Risk

- Low.

### Risks & Mitigation

- Risk: accidental production behavior changes.
  - Mitigation: confine edits to test code and validate with targeted tests.

### Impact (affected areas)

- Temporal adapter test suite and contract semantics confidence.

### Validation plan

- `pnpm --filter @dvt/adapter-temporal test`
- If needed, `pnpm -r test` for broader confidence.

### Unknowns / maintainer decisions needed

- None at this stage.
