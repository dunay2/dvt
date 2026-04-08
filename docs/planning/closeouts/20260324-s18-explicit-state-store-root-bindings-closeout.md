---
slice: 20260324-s18-explicit-state-store-root-bindings
date: 2026-03-24
last_reviewed: 2026-03-24
work_item: S18
status: Done
---

# Closeout: S18 Explicit State-Store Root Bindings

## Think-First Analysis

### Problem summary

The API composition roots still bind the state store by repeated aliases
(`stateStoreRead = stateStore`, `stateStoreWrite = stateStore`, etc.), which
keeps the role split correct in practice but still hides the role identity in
local convenience wiring.

### Root cause

The current root code treats the concrete adapter as the primary binding value
and derives the role names afterward. That preserves behavior, but it weakens
the architectural signal that the root owns explicit role binding.

### Constraints and invariants

- `AGENTS.md`: inventory-first work, explicit governance sources, real
  validation, no stubs, no hidden debt.
- `docs/guides/ai-work-protocol.md`: planning updates must be synchronized with
  the workboard and relevant source surfaces; closeouts are required for slices
  that close.
- `docs/planning/proposals/todo.md`: the composition root must expose explicit
  state-store roles and avoid reconstructing the dependency graph by
  intersection or convenience.
- `ADR-0039`: `IRunStateStore` is split into focused roles; production roots
  should bind the exact roles they need.

### Options considered

- Leave the current aliases in place.
  - Rejected because it preserves the convenience shape that the slice is
    trying to remove.
- Introduce a role-binding helper and pass a named role bundle through the API
  runtime roots.
  - Selected because it makes the binding intent explicit without changing the
    underlying adapter behavior.
- Remove the role split entirely and collapse back to one convenience surface.
  - Rejected because it would undo the state-store boundary work already closed
    by S02/S19.

### Selected option and rationale

Use a named state-store role-binding object at the composition root, then pass
that bundle through the API runtime and reconciler runtime. That keeps the
adapter concrete, but makes the role identity visible where the boundary is
actually assembled.

### Rejected alternatives

- Keep alias assignments and rely on naming alone.
- Re-introduce a monolithic state-store convenience shape.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - `apps/api/src/modules/buildProtectedRuntimeModule.ts`
  - `apps/api/src/runtime/intentReconcilerRuntime.ts`
  - `apps/api/src/modules/types.ts`
  - `apps/api/src/app.ts`
  - `apps/api/test/modules.test.ts`
  - planning state surfaces for S18 closure
- Expected outcome:
  - the root names a state-store role bundle explicitly
  - the API runtime consumes `read`, `write`, and `maintenance` roles from that
    bundle
  - the reconciler runtime consumes the exact roles it needs without
    reconstructing them ad hoc
- Risks and mitigations:
  - Risk: break local call sites while changing the module surface.
    - Mitigation: update the small set of `apps/api` consumers in the same
      change.
  - Risk: leave status docs out of sync with the actual closure.
    - Mitigation: update the workboard, open-task route, and lane YAML in the
      same task.
- Out-of-scope items:
  - removing the compatibility alias from engine contracts
  - changing the underlying storage adapter implementation
  - altering maintenance query ownership beyond the S19 closure already done
- Validation plan:
  - `pnpm --filter dvt-api test`
  - `pnpm --filter dvt-api typecheck`
  - `pnpm verify:prepush`
  - `pnpm docs:sync`
- Test coverage plan:
  - explicit role binding helper returns the exact adapter instance in each
    role slot
  - protected runtime module still builds with the explicit bundle surface
  - reconciler runtime still wires read/write roles correctly
- Libraries evaluated:
  - None evaluated - this is a small root-wiring refactor, not a new feature or
    new dependency selection.

## Traceability

- Baseline ADRs:
  - `ADR-0039`
  - `ADR-0034`
  - `ADR-0018`
- Canonical planning sources:
  - `docs/planning/proposals/todo.md`
  - `docs/planning/state/execution-workboard.md`
  - `docs/planning/state/open-task-route.md`
  - `docs/planning/state/agent-lane-a.yaml`

## Real Work Performed

- Added `apps/api/src/modules/stateStoreRoles.ts` with a named
  `StateStoreRoleBindings` value object and `bindStateStoreRoles()` helper.
- Changed `apps/api/src/modules/types.ts` so `ProtectedRuntimeModule` exposes a
  single explicit `stateStore` role bundle instead of three loose aliases.
- Updated `apps/api/src/modules/buildProtectedRuntimeModule.ts` to bind the
  state-store roles explicitly at the root and pass the bundle into the engine
  and provider-adapter wiring.
- Updated `apps/api/src/runtime/intentReconcilerRuntime.ts` to use the same
  explicit role bundle for adapter construction and maintenance wiring.
- Updated `apps/api/src/app.ts` to consume `protectedModule.stateStore.read`
  and `protectedModule.stateStore.maintenance`.
- Added a regression test in `apps/api/test/modules.test.ts` that verifies the
  role bundle returns the same adapter instance for read, write, and
  maintenance.
- Updated `docs/planning/state/agent-lane-a.yaml` and regenerated
  `docs/planning/state/agent-lane-a.md` so S18 is closed in the lane view.
- Updated `docs/planning/state/execution-workboard.md`,
  `docs/planning/state/open-task-route.md`, and
  `docs/planning/closeouts/index.md` so the visible planning surfaces match the
  code closure.

## Governing sources used

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/planning/proposals/todo.md`
- `docs/planning/state/execution-workboard.md`
- `docs/planning/state/open-task-route.md`
- `docs/planning/state/agent-lane-a.yaml`
- `docs/planning/closeouts/index.md`
- `docs/adr/ADR-0039-hexagonal-port-hardening-and-solid-remediation.md`
- `docs/adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md`
- `docs/adr/ADR-0018_Shared_Kernel_Ownership_Governance.md`

## Docs synced

- [x] `pnpm docs:sync`

## Validation evidence

- `pnpm --filter dvt-api typecheck` - Passed.
- `pnpm --filter dvt-api test` - Passed.
- `pnpm exec eslint apps/api/src/app.ts apps/api/src/modules/buildProtectedRuntimeModule.ts apps/api/src/modules/types.ts apps/api/src/modules/stateStoreRoles.ts apps/api/src/runtime/intentReconcilerRuntime.ts apps/api/test/modules.test.ts` - Passed.
- `pnpm exec prettier --check apps/api/src/app.ts apps/api/src/modules/buildProtectedRuntimeModule.ts apps/api/src/modules/types.ts apps/api/src/modules/stateStoreRoles.ts apps/api/src/runtime/intentReconcilerRuntime.ts apps/api/test/modules.test.ts docs/planning/state/agent-lane-a.md docs/planning/state/agent-lane-a.yaml docs/planning/state/execution-workboard.md docs/planning/state/open-task-route.md docs/planning/closeouts/20260324-s18-explicit-state-store-root-bindings-closeout.md` - Passed.
- `pnpm exec markdownlint-cli2 docs/planning/closeouts/index.md docs/planning/closeouts/20260324-s18-explicit-state-store-root-bindings-closeout.md docs/planning/state/agent-lane-a.md docs/planning/state/execution-workboard.md docs/planning/state/open-task-route.md --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc` - Passed.
- `pnpm docs:sync` - Passed and regenerated `docs/planning/state/agent-lane-a.md`.
- `pnpm verify:prepush` - Passed.

## No-debt evidence

- No rule was disabled or relaxed.
- No hook was bypassed.
- No TODO/FIXME or placeholder implementation was introduced.
- The breaking surface change was intentional and fully wired through the API
  root, tests, and planning state.

## No-stub evidence

- No fake adapter, fake success path, or placeholder role binding was added.
- The helper returns the concrete adapter instance in each explicit role slot.
