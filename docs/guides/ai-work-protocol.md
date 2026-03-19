---
title: AI Work Protocol
status: Active
owner: docs
last_reviewed: 2026-03-14
---

# AI Work Protocol

This document defines the step-by-step workflow AI-assisted changes MUST follow in
this repository. `AGENTS.md` is the behavioral mandate; this document is the
procedure. Both must be respected — they are not alternatives.

## Canonical References

- [AGENTS.md](../../AGENTS.md)
- [Engineering Playbook](../architecture/atlas/engineering/engineering_playbook.md)
- [ADR-0000: Code Generation With Enforced Normative Traceability](../adr/ADR-0000-Code-generation-with-normative-traceability-required.en.md)
- [ADR-0004: Event Sourcing Strategy](../adr/ADR-0004-event-sourcing-strategy.md)
- [ADR-0005: Contract Formalization Tooling](../adr/ADR-0005-contract-formalization-tooling.md)
- [RunEvents Contract](../architecture/engine/contracts/engine/RunEvents.v1.md)
- [Testing and CI Capabilities](testing-and-ci-capabilities.md)

## Task Modes

Declare the task mode in the Pre-Implementation Brief (Phase 2). The mode
determines which phases are mandatory.

| Mode     | When to use                                                                                              | Required phases           |
| -------- | -------------------------------------------------------------------------------------------------------- | ------------------------- |
| **Slim** | Maintenance, refactor, or bug fix — no new API surface, no new artifact, no new external behavior        | 0 → 1 → 2 → 3 → 6         |
| **Full** | New feature, new contract, new endpoint, new public behavior, or any change that produces a new artifact | 0 → 1 → 2 → 3 → 4 → 5 → 6 |

When in doubt, use Full. The cost of extra documentation is lower than a missing
traceability chain.

## Required Workflow

### Phase 0: Check Existing Material

Before starting, do a mechanical check — the goal is to avoid duplicating work
that already exists or reinventing what is already solved:

- confirm whether the repository already contains documentation for the topic
- check whether there are previous tracker entries or reviews that already settled
  the decision
- prefer extending canonical docs instead of creating parallel notes
- check whether a maintained library already covers the need before designing a
  custom implementation — search npm/GitHub for packages that fit the architectural
  constraints (ESM, TypeScript, no framework lock-in)
- look for how comparable production projects solve the same class of problem
  (event sourcing, outbox pattern, hexagonal architecture) — document what was
  found and why it was accepted or rejected in the Think-First options

Do not start implementing until this check is done. If equivalent work exists or a
library covers the need, extend or adopt rather than build from scratch.

### Phase 1: Think-First Analysis

Before touching any code, config, or schema, write a structured analysis and commit
it to its destination. This is the gate between understanding and acting.

**Destination:**

- Task belongs to an open gap → write in the gap tracker's Stage Detail section.
- No gap tracker exists → write as the first section of the closeout file
  (`docs/planning/closeouts/<task-id>-closeout.md`) before any code is touched.

**Required fields:**

- problem summary
- root cause — why the problem exists, not just what it is
- constraints and invariants — cite the governing ADRs by ID here; this replaces
  Phase 3's ADR discovery step
- options considered — include libraries or patterns evaluated in Phase 0
- selected option and rationale
- rejected alternatives

### Phase 2: Pre-Implementation Brief

After the think-first is written, document the concrete implementation plan:

- **mode**: `Slim` or `Full` (see Task Modes above)
- scope
- touched files or paths
- expected outcome
- risks and mitigations
- out-of-scope items
- validation plan — which commands will confirm the work is correct
- test coverage plan — which negative paths and edge cases will be tested in
  addition to the happy path; a brief stating only the happy path is incomplete
- libraries evaluated — which libraries were assessed in Phase 0 and whether any
  were adopted (`None evaluated — no custom implementation` if not applicable)

### Phase 3: Normative Baseline Verification

Before generating or editing artifacts, verify — not discover — that the ADRs cited
in Phase 1 explicitly authorize the planned output. This is a confirmation step, not
a search step. If Phase 1 was done correctly, the ADRs are already known.

- re-read the specific sections of the cited ADRs that apply
- confirm the planned output is consistent with those decisions
- if a contradiction is found, return to Phase 1 and resolve it before proceeding
- record the verified ADR set in the file headers of generated artifacts

### Phase 4: Traceability and Artifact Recording

_Slim mode: skip this phase._

When a change produces artifacts, make both the artifacts and their relationships
explicit.

**Traceability headers** — generated artifacts MUST reference the approved baseline
using:

- file headers or module comments: baseline ADR id, implemented decision, affected
  contract or version
- commit messages when relevant
- tests that validate ADR-backed behavior

**Artifact relationship record** — document the artifact set explicitly:

- canonical contract doc
- generated schema or machine-readable artifact path
- generated source path
- validation or conformance test path

If those artifacts live outside `docs/`, record them as code paths or plain
literals. Do not create Markdown links to paths that are not published in the
documentation tree.

### Phase 5: Documentation Update

_Slim mode: only required if existing public documentation is affected by the
change._

Update the relevant index, guide, ADR reference, or status doc so readers can find:

- the governing ADRs
- the active contract
- the generated artifact set
- the validation evidence

### Phase 6: Validation And Closeout

Before closing the work, verify all acceptance criteria:

- [ ] tests pass in every touched package (happy path AND negative paths)
- [ ] at least one negative-path test added if the slice introduces new behavior
- [ ] lint and typecheck green in every touched package
- [ ] `pnpm verify:prepush` green before the slice is presented as ready, unless
      the user explicitly limits validation and that limit is reported
- [ ] no behavior changed outside the scope declared in Phase 2
- [ ] no `as any`, magic values, or unjustified type assertions introduced
- [ ] run the required checks (canonical commands below)
- [ ] links and references resolve
- [ ] documentation reflects the shipped behavior
- [ ] **mandatory closeout file created** — this is the last step and the gate that
      makes the slice officially closed

Canonical validation commands:

```text
pnpm --filter @dvt/engine test
pnpm --filter @dvt/adapter-postgres test
pnpm --filter @dvt/delivery test
pnpm --filter dvt-api build   # no test runner yet; build = type-check
```

Run commands at the package level, not workspace-wide, unless the task crosses
multiple packages — in that case run each affected package individually.

Sandbox execution rule for validation commands:

- if a `vitest`, `vite`, or `esbuild`-backed command fails with `spawn EPERM`
  under sandboxed execution, re-run that command with escalated execution
  before classifying the result as a real failure
- record both the sandbox failure and the escalated rerun outcome in the
  closeout when this happens

Operational Git rule for the agent environment:

- when a task requires `git commit`, run it with escalated execution directly
- do not spend a first failing sandbox attempt on `git commit`, because this
  environment does not reliably create `.git` lock files under sandboxed
  execution
- this rule does not relax hooks or validation expectations

The mandatory closeout file format is defined in `AGENTS.md`. See
[`docs/planning/closeouts/G7.1-closeout.md`](../planning/closeouts/G7.1-closeout.md) for a
worked example.

## Traceability Example

Example relationship for a contract-backed artifact set:

- ADR baseline: [ADR-0004](../adr/ADR-0004-event-sourcing-strategy.md), [ADR-0005](../adr/ADR-0005-contract-formalization-tooling.md)
- Canonical contract: [RunEvents Contract](../architecture/engine/contracts/engine/RunEvents.v1.md)
- Generated artifacts: `schemas/run-events.schema.json`, `src/run-events.types.ts`, `test/run-events.conformance.test.ts`

The artifact paths above are examples of code or build outputs. They should be
documented as paths unless those artifacts are actually published under `docs/`.

## Minimum Quality Bar

AI-assisted work MUST NOT:

- bypass an existing ADR or contract
- introduce non-canonical duplicate docs
- add broken Markdown links
- point readers at generated `site/` output
- leave implementation changes without matching documentation when the behavior changed
- implement from scratch when a maintained library fits the architectural constraints
- cover only the happy path in tests — negative paths are required for any new behavior
- introduce `as any`, unjustified type assertions, or unexplained magic values

## Suggested Issue Skeleton

```text
Think-First Analysis
- Problem summary:
- Root cause:
- Constraints and invariants (ADRs: ADR-XXXX, ADR-XXXX):
- Options considered (including libraries evaluated in Phase 0):
- Selected option and rationale:
- Rejected alternatives:

Pre-Implementation Brief
- Mode: Slim | Full
- Scope:
- Touched files or paths:
- Risks and mitigations:
- Out-of-scope items:
- Validation plan:
- Test coverage plan (negative paths and edge cases):
- Libraries evaluated:

Traceability (Full mode only)
- Baseline ADRs (verified in Phase 3):
- Canonical contract:
- Generated artifacts:
```

## Final Rule

When in doubt, prefer:

1. one canonical document
2. one canonical contract target
3. explicit ADR traceability
4. plain path literals instead of fake links
