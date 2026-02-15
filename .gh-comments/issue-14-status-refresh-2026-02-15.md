Status refresh (2026-02-15) based on active-path implementation evidence.

Current code evidence:

- Engine API is implemented in `packages/engine/src/core/WorkflowEngine.ts` with current methods:
  - `startRun(planRef, context)`
  - `cancelRun(engineRunRef)`
  - `getRunStatus(engineRunRef)`
  - `signal(engineRunRef, request)`
- Snapshot projection logic exists in `packages/engine/src/core/SnapshotProjector.ts`.
- Contract/core test coverage exists in:
  - `packages/engine/test/core/WorkflowEngine.test.ts`
  - `packages/engine/test/contracts/engine.test.ts`

Checklist drift note:

- This issue body still references legacy method names (`submit/getStatus/pause/resume/cancel`).
- Active implementation uses the current API surface above.

Proposed tracking update:

1. Keep issue open for checklist normalization against current API naming and explicit acceptance mapping.
2. After checklist normalization is merged, close residual deltas (if any) or close issue if fully satisfied.
