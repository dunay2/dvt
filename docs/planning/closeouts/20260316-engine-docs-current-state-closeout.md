---
slice: engine-docs-current-state
date: 2026-03-16
gap: docs-alignment
author: AI (GPT-5)
last_reviewed: 2026-03-16
---

# Closeout: Align engine architecture docs with current code

## Think-First Analysis

### Problem summary

Current public engine docs still describe `RunAggregate`,
`StartRunCoordinator`, `RunStatusReader`, `RunSignalService`, and
`EngineHealthReporter` as if they were active code in `main`. In the real merged
code, `WorkflowEngine` remains the public engine facade, `SnapshotProjector`
delegates to `@dvt/run-domain`, and those extracted service classes are not
present.

### Root cause

Documentation slices describing planned or partial refactors were merged ahead
of the final code shape, then later code changes landed without a matching docs
cleanup pass. The result is a drift between current code truth and public
architecture docs.

### Constraints and invariants

- `ADR-0003`: lifecycle semantics stay owned by DVT and must be documented at
  the engine boundary truthfully.
- `ADR-0004`: event projection and replay semantics must remain explicit and
  deterministic.
- `ADR-0015`: read-model status comes from projected state, not live provider
  queries on the default path.
- `AGENTS.md`: think-first before edits, no fake completion, evidence-based
  closeout.

### Options considered

- Leave the docs as-is and rely on code references.
  Rejected: public architecture docs would remain false.
- Update only `docs/architecture/components/engine.md`.
  Rejected: `system-delivery-status.md` would still present nonexistent classes
  as current implementation.
- Update the active public docs only, leaving reviews/proposals/historical
  material untouched.
  Selected: smallest truthful slice.

### Selected option and rationale

Align the active public engine docs to the current code: describe
`WorkflowEngine`, `SnapshotProjector`, `@dvt/run-domain`, `RunAccessPolicy`,
and provider adapters as they exist now, and remove current-state diagrams that
present unmerged decomposition classes as live implementation.

### Rejected alternatives

- Editing review docs, proposals, and historical closeouts in the same slice.
- Re-introducing planned decomposition classes only to make the docs true.

## Pre-Implementation Brief

- Mode: `Slim`
- Scope:
  - update `docs/architecture/components/engine.md`
  - update `docs/architecture/system-delivery-status.md`
  - add this closeout
- Touched files or paths:
  - `docs/architecture/components/engine.md`
  - `docs/architecture/system-delivery-status.md`
  - `docs/planning/closeouts/20260316-engine-docs-current-state-closeout.md`
- Expected outcome:
  - public docs match the actual merged code in `main`
- Risks and mitigations:
  - risk: over-correcting by removing useful future-oriented context
  - mitigation: keep future/refactor material in reviews/proposals; only active
    public docs are normalized here
- Out-of-scope items:
  - any engine code refactor
  - review/proposal/history cleanup
  - contract changes
- Validation plan:
  - `pnpm docs:sync`
  - `pnpm exec markdownlint-cli2 ...`
  - `pnpm docs:quality:check`
  - `pnpm docs:canonical:check`
- Test coverage plan:
  - docs-only slice; negative path is link/drift validation through docs gates
- Libraries evaluated:
  - None. This is documentation alignment only.

## Changes made

| File                                                                     | Change                                                                                                                              | Why                                                                     |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `docs/architecture/components/engine.md`                                 | Rewritten to describe the current merged engine shape (`WorkflowEngine`, `SnapshotProjector`, `RunAccessPolicy`, `@dvt/run-domain`) | Remove false claims about `RunAggregate` as live current implementation |
| `docs/architecture/system-delivery-status.md`                            | Replaced stale current-state diagrams that referenced nonexistent extracted services                                                | Keep the status doc aligned with the real merged code                   |
| `docs/planning/closeouts/20260316-engine-docs-current-state-closeout.md` | Added think-first and evidence                                                                                                      | Close the slice under AGENTS.md rules                                   |

## Libraries evaluated

None.

## Docs synced

- [x] `docs/architecture/components/engine.md` - updated to reflect current implementation
- [x] `docs/architecture/system-delivery-status.md` - removed current-state drift
- [x] `docs/planning/closeouts/20260316-engine-docs-current-state-closeout.md` - closeout created and completed
- [x] `docs/planning/index.md` - checked through `docs:sync` and already current

## Test evidence

| Command                     | Result                                                                                                            |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `pnpm docs:sync`            | Passed                                                                                                            |
| `pnpm docs:quality:check`   | Passed with pre-existing non-English warnings outside this slice                                                  |
| `pnpm docs:canonical:check` | Passed                                                                                                            |
| `pnpm docs:doctor`          | Passed with pre-existing closeout-frontmatter warnings outside this slice; added `last_reviewed` to this closeout |
| `pnpm lint:md`              | Passed outside sandbox                                                                                            |
| `pnpm verify:prepush`       | Passed outside sandbox                                                                                            |

## Debt introduced

None.
