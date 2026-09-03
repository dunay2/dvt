---
title: AI Work Protocol
status: Active
owner: docs
last_reviewed: 2026-09-03
---

# AI Work Protocol

This document defines the step-by-step workflow AI-assisted changes MUST follow in
this repository. `AGENTS.md` is the behavioral mandate; this document is the
procedure. Both must be respected - they are not alternatives.

## Canonical References

- [AGENTS.md](../../AGENTS.md)
- [PR Preflight And CI Triage](./pr-preflight-and-ci-triage.md)
- [Engineering Playbook](../architecture/atlas/engineering/engineering-playbook.md)
- [ADR-0000: Code Generation With Enforced Normative Traceability](../adr/ADR-0000-Code-generation-with-normative-traceability-required.en.md)
- [ADR-0004: Event Sourcing Strategy](../adr/ADR-0004-event-sourcing-strategy.md)
- [ADR-0005: Contract Formalization Tooling](../adr/ADR-0005-contract-formalization-tooling.md)
- [RunEvents Contract](../architecture/components/engine/contracts/engine/RunEvents.v1.md)
- [Testing and CI Capabilities](./testing-and-ci-capabilities.md)
- [Planning Control Tower](../planning/state/planning-control-tower.md)
- [Command And Query Rail Governance](../architecture/command-query-rail-governance.md)
- [Fowler Opportunity Planning Governance](../architecture/fowler-opportunity-planning-governance.md)

## Startup Router Rule

The mandatory first read remains
[Governance Document And Rule Inventory](../planning/status/governance-document-rule-inventory.md).

Use it in this order:

1. open the inventory;
2. consume the `Quick Start / Startup Card`;
3. classify the task as `code`, `docs`, `planning`, `contracts`, `ci`, or
   `cross-cutting`;
4. open the route-specific canonical surfaces selected by the card;
5. read the deep inventory sections only when the route or risk requires it.

This keeps startup inventory-first without forcing every bounded task to read
the full catalog before it can route itself.

## Planning Update Placement Rule

When a task touches planning material, the agent MUST start from
[Planning Control Tower](../planning/state/planning-control-tower.md) and update
the document surfaces defined there in the same task.

GitHub Issues is the canonical MVP task lifecycle and next-work source.
Planning DB owns architecture and command/query mechanization, not task status.

Minimum rule for every planning-affecting task:

1. update task state, priority, blockers, acceptance, and evidence in the
   governing GitHub issue;
2. update Planning DB through existing command rails when architecture,
   components, capabilities, relations, or command/query rails change;
3. update a governed repository document only when the behavior or architecture
   requires durable documentation beyond the issue;
4. when creating or renaming review files, follow
   [Review Naming Policy](../planning/reviews/review-naming-policy.md).

Do not leave planning changes only in ad hoc notes or PR text when a canonical
planning surface exists.

## GitHub Issue Work Admission Rule

No implementation, fix, refactor, product documentation change, or PR work may
start without an open governing GitHub issue. If no issue exists, create or
request the issue first; no issue means no work.

Before changing the repository, the agent MUST take responsibility for the
issue by assigning itself when repository permissions allow it and recording a
concise claim comment with the intended slice and current branch. If assignment
is unavailable, the claim comment is mandatory and the limitation must be
reported. The agent MUST confirm that the issue remains open, is not already
owned by another active worker, and matches the requested product intent before
proceeding.

One commit or PR may reference related issues, but it MUST name one governing
issue whose acceptance criteria own the active slice. Switching the governing
issue requires updating the previous issue journal first and taking the next
issue before editing its scope.

## GitHub Issue Human Change Journal Rule

A governing GitHub issue is both the canonical task record and the human-facing
change journal. It MUST explain how the product and the proposed solution evolve;
labels, status changes, commits, and PR automation alone are not sufficient.

After every meaningful product increment, and before switching to another issue
or PR, the agent MUST add a concise issue comment that records:

1. the user-visible or architectural advance, linked to commits, PRs, and
   verification evidence when available;
2. the current proposed solution and the reason it remains preferable;
3. behavior, code paths, terminology, or alternatives that are now obsolete or
   explicitly rejected;
4. the remaining work, known limitations, risks, or failed checks without
   presenting partial work as complete;
5. new questions or follow-up topics opened by the increment, including the
   agent's recommended default when a product decision is still needed.

Update the issue body when acceptance criteria, scope, priority, or blockers have
durably changed. Use comments for the chronological reasoning trail. Do not paste
raw command logs or duplicate durable architecture documentation into the issue;
summarize the evidence and link to its canonical source instead.

The final issue comment before closure MUST reconcile the original acceptance
criteria with the delivered behavior, identify any deliberately deferred work,
and link the validation and integration evidence. If this journal is stale, the
task is not ready for closeout even when the code is green.

## Feature Mechanization Placement Rule

When a slice is non-trivial, changes implementation surfaces, adds top-level
symbols, or is expected to satisfy the feature mechanization gate, the
mechanization manifest is part of the declared pre-implementation route.

The canonical manifest placement is a Markdown file under
`docs/planning/proposals/mandatory/**` using a `feature-mechanization` fenced
block. A closeout may cite that proposal, but it MUST NOT be the only place where
the manifest is declared.

The required sequence is:

1. create or update the mandatory proposal with the Think-First analysis,
   Fowler planning matrix, command/query rail posture, allowed implementation
   surfaces, forbidden surfaces, red/green cycles, and declared symbols;
2. run `pnpm docs:feature-mechanization -- --feature <FEATURE_ID>` before
   production code changes;
3. write the red tests named by the manifest;
4. implement only within `allowedImplementationSurfaces`;
5. if a new file, new top-level symbol, or new scope appears outside the
   manifest, stop implementation, update the proposal manifest, and rerun the
   feature-specific mechanization check before continuing;
6. run `pnpm docs:feature-mechanization:implementation` before closeout and
   before `pnpm verify:prepush`.

This rule is intentionally about declared steps, not just document location. A
passing late manifest does not prove the slice followed the repository workflow
unless the route above was declared before implementation or the closeout records
the deviation and corrective action.

## Governance Refresh Placement Rule

When a task touches governance or planning generated surfaces, keep the early
work focused on content, code, tests, and the governing plan. Do not repeatedly
run the full governance refresh during the inner development loop unless the
next decision depends on generated output.

Before closeout, run the canonical refresh command when any of these changed:

- docs/planning/governance source surfaces;
- governance workflow documentation;
- governance generator or check scripts;
- package scripts that affect docs, planning, or governance validation;
- file additions, deletions, or renames that affect `system-governance-*`
  indexes.

The required final command is:

```bash
pnpm governance:refresh
```

This command owns the final quadrature for docs indexes, docs manifests,
`system-governance-*` indexes, fingerprints, coverage, remediation outputs,
all derived from the current Git inventory. It may record a bounded execution
audit in Planning DB, but it does not import or rebuild Planning DB. It must run
before `pnpm ci:docs` or `pnpm verify:prepush` in affected slices, and it does
not relax either gate.

## Task Modes

Declare the task mode in the Pre-Implementation Brief (Phase 2). The mode
determines which phases are mandatory.

| Mode     | When to use                                                                                              | Required phases                 |
| -------- | -------------------------------------------------------------------------------------------------------- | ------------------------------- |
| **Slim** | Maintenance, refactor, or bug fix - no new API surface, no new artifact, no new external behavior        | 0 -> 1 -> 2 -> 3 -> 6           |
| **Full** | New feature, new contract, new endpoint, new public behavior, or any change that produces a new artifact | 0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6 |

When in doubt, use Full. The cost of extra documentation is lower than a missing
traceability chain.

## Required Workflow

### Phase 0: Check Existing Material

Before starting, do a mechanical check - the goal is to avoid duplicating work
that already exists or reinventing what is already solved:

- confirm whether the repository already contains documentation for the topic
- check whether there are previous tracker entries or reviews that already settled
  the decision
- prefer extending canonical docs instead of creating parallel notes
- check whether a maintained library already covers the need before designing a
  custom implementation - search npm/GitHub for packages that fit the architectural
  constraints (ESM, TypeScript, no framework lock-in)
- check whether the behavior is already represented by a command or query in
  the owning bounded context; reuse that rail instead of inventing a synonym
- for externally observable command or query behavior, run the DB-first
  creation-intent preflight before naming new code:

  ```bash
  pnpm planning:db:query creation-intent --intent "create a run status query" --limit 5
  pnpm planning:db:query creation-intent --intent "create a governance component command" --type command --limit 5
  ```

  Treat `reuse-existing-rail`, `complete-existing-rail-before-creating`, and
  `resolve-duplicate-before-creating` as stop signals for creating a parallel
  rail. Treat `register-new-rail-before-creating` as the signal to update the
  command/query rail catalog before implementation.

- classify relevant findings as Fowler opportunities before implementation:
  boundary drift, responsibility overload, primitive obsession, data clumps,
  feature envy, duplicate semantics, hidden authority, anemic domain,
  test-only confidence, or documentation drift
- look for how comparable production projects solve the same class of problem
  (event sourcing, outbox pattern, hexagonal architecture) - document what was
  found and why it was accepted or rejected in the Think-First options

Do not start implementing until this check is done. If equivalent work exists or a
library covers the need, extend or adopt rather than build from scratch.

### Phase 1: Think-First Analysis

Before touching any code, config, or schema, write a structured analysis and commit
it to its destination. This is the gate between understanding and acting.

**Destination:**

- Task belongs to an open gap -> write in the gap tracker's Stage Detail section.
- No gap tracker exists -> write as the first section of the closeout file
  (`docs/planning/closeouts/<task-id>-closeout.md`) before any code is touched.

**Required fields:**

- problem summary
- root cause - why the problem exists, not just what it is
- constraints and invariants - cite the governing ADRs by ID here; this replaces
  Phase 3's ADR discovery step
- options considered - include libraries or patterns evaluated in Phase 0
- selected option and rationale
- rejected alternatives
- Fowler opportunity matrix - for non-trivial slices, record scenario,
  opportunity, Fowler pattern, DDD owner, command/query rail, allowed
  implementation surfaces, unit or package tests, architecture tests,
  user-flow tests, and out-of-scope behavior

### Phase 2: Pre-Implementation Brief

After the think-first is written, document the concrete implementation plan:

- **mode**: `Slim` or `Full` (see Task Modes above)
- scope
- touched files or paths
- expected outcome
- risks and mitigations
- out-of-scope items
- validation plan - which commands will confirm the work is correct
- test coverage plan - which negative paths and edge cases will be tested in
  addition to the happy path; a brief stating only the happy path is incomplete
- libraries evaluated - which libraries were assessed in Phase 0 and whether any
  were adopted (`None evaluated - no custom implementation` if not applicable)
- command/query rail impact - commands or queries added, changed, reused, or
  explicitly out of scope; name the catalog surface that owns each rail
- Fowler planning impact - opportunities addressed, patterns applied, repeated
  semantics removed, drift removed, architecture guards required, and residual
  opportunities left for later

### Phase 3: Normative Baseline Verification

Before generating or editing artifacts, verify - not discover - that the ADRs cited
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

**Traceability headers** - generated artifacts MUST reference the approved baseline
using:

- file headers or module comments: baseline ADR id, implemented decision, affected
  contract or version
- commit messages when relevant
- tests that validate ADR-backed behavior

**Artifact relationship record** - document the artifact set explicitly:

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
- [ ] final commit created with `pnpm commit ...` before final pre-push
      validation, so the pre-commit hook can apply Prettier/lint-staged fixes
- [ ] `pnpm verify:prepush` green after the final commit and before the slice is
      presented as ready, unless the user explicitly limits validation and that
      limit is reported
- [ ] `pnpm governance:refresh` run before final docs/prepush validation when
      governance, planning, docs generated surfaces, package scripts, or file
      inventory changes affect `system-governance-*`
- [ ] no behavior changed outside the scope declared in Phase 2
- [ ] no `as any`, magic values, or unjustified type assertions introduced
- [ ] run the required checks (canonical commands below)
- [ ] links and references resolve
- [ ] documentation reflects the shipped behavior
- [ ] **mandatory closeout file created** - this is the last step and the gate that
      makes the slice officially closed

When the task is about preparing a PR or recovering from a red PR, use
[PR Preflight And CI Triage](./pr-preflight-and-ci-triage.md) as the canonical
recipe for diagnostics, slice checks, `pnpm verify:prepush`, and first-red
failed-job inspection.

Canonical validation commands:

```text
pnpm --filter @dvt/engine test
pnpm --filter @dvt/adapter-postgres test
pnpm --filter @dvt/delivery test
pnpm --filter dvt-api build   # no test runner yet; build = type-check
```

Run commands at the package level, not workspace-wide, unless the task crosses
multiple packages - in that case run each affected package individually.

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
- do not treat `pnpm verify:prepush` as a Prettier fixer; it verifies the
  hook-normalized tree after `pnpm commit ...` has run pre-commit formatting

The mandatory closeout file format is defined in `AGENTS.md`. See
[`docs/planning/closeouts/G7.1-closeout.md`](../planning/closeouts/G7.1-closeout.md) for a
worked example.

## Traceability Example

Example relationship for a contract-backed artifact set:

- ADR baseline: [ADR-0004](../adr/ADR-0004-event-sourcing-strategy.md), [ADR-0005](../adr/ADR-0005-contract-formalization-tooling.md)
- Canonical contract: [RunEvents Contract](../architecture/components/engine/contracts/engine/RunEvents.v1.md)
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
- introduce route, service, adapter, UI, workflow, or Cypress behavior that is
  not mapped to a command or query rail when the behavior is externally
  observable
- implement non-trivial behavior, boundary, workflow, adapter, route, worker,
  plugin, or architecture-test changes that are not present in a planning
  matrix governed by the Fowler Opportunity Planning Governance
- create duplicate command/query names or local synonyms for an existing product
  intent
- cover only the happy path in tests - negative paths are required for any new behavior
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
- Command/query rail impact:
- Fowler opportunity matrix:

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
