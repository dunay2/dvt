# AGENTS.md

This repository does not rely on agent memory as a governance mechanism.
The repository itself is the source of truth.

## Mandatory Startup For Every Task

Before analysis, coding, Git actions, or planning, the agent MUST:

1. Read `docs/planning/status/governance-document-rule-inventory.md`.
2. Identify the documents, ADRs, contracts, and workflow rules that apply to
   the task.
3. Start the first user-visible update with this exact sentence:

`OPERATING UNDER AGENTS.MD.`

1. Immediately after that sentence, name the governing sources being used for
   the task.

If the agent has not read the inventory first, it MUST stop and do that before
continuing.

## Operational Quick-Reference

| I need to...                        | Go to                                                        |
| ----------------------------------- | ------------------------------------------------------------ |
| Follow the step-by-step protocol    | `docs/guides/ai-work-protocol.md`                            |
| Identify governing ADRs for a layer | ADR Quick-Reference By Layer — below                         |
| Know which test commands to run     | `docs/guides/testing-and-ci-capabilities.md`                 |
| Write a closeout file               | Mandatory Closeout File — below                              |
| Find the full governance map        | `docs/planning/status/governance-document-rule-inventory.md` |

## Working Standard

The agent MUST work from canonical repo governance, not from convenience or
local shortcuts.

The agent MUST:

- treat ADRs, contracts, execution-model rules, CI rules, and documentation
  structure as part of the requirement
- prefer root-cause analysis over symptom masking
- keep docs, config, code, tests, and CI behavior aligned
- work on the real affected system, not on a reduced local story that hides
  integration impact

The agent MUST NOT:

- bypass hooks, skip checks, or use `--no-verify` style shortcuts unless the
  user explicitly asks for it and the risk is stated first
- relax lint, type, test, or quality rules just to get green output
- introduce hidden debt, silent rule downgrades, or undeclared process changes
- present partial wiring, placeholders, or fake implementations as complete
  work

## Prior Art And Library Research

Before designing a solution, the agent MUST check whether the problem is already
solved — either by an existing library or by a proven pattern in comparable projects.
This check happens before Think-First, as its findings shape the options considered
in Phase 1.

The agent MUST:

- search for established libraries that cover the need before writing custom
  implementations — prefer a maintained dependency over an in-house solution that
  must be tested, documented, and evolved
- look for how similar problems are solved in production projects with the same
  constraints (event sourcing, hexagonal architecture, outbox pattern, etc.)
- document in the Think-First "options considered" section which libraries or
  patterns were evaluated and why they were accepted or rejected

The agent MUST NOT:

- implement from scratch when a mature, well-tested library exists that fits the
  architectural constraints of this repo
- skip this check because the problem "seems simple" — the cost of a missed library
  is not visible until maintenance begins

## Think-First Before Every Implementation

Before writing any code, config, or schema change, the agent MUST produce a
written think-first analysis. This requirement cannot be skipped regardless of
how small or obvious the task appears.

**Where to write it:**

- Task belongs to an open gap → write it in the gap tracker's Stage Detail
  section before the first code edit.
- No gap tracker exists → write it as the first section of the closeout file
  (`docs/planning/closeouts/<task-id>-closeout.md`) before touching any code.

**Required fields** (schema defined in `docs/guides/ai-work-protocol.md`):

- problem summary
- root cause
- constraints and invariants — cite governing ADRs by ID
- options considered (including libraries evaluated in Phase 0)
- selected option and rationale
- rejected alternatives

A task that proceeds to code without a written think-first analysis has
violated this standard, regardless of whether the resulting code is correct.

## No Debt And No Stub Policy

By default, every task is expected to close without creating new debt.

The agent MUST NOT create:

- stubs
- placeholders
- fake adapters
- fake success paths
- TODO/FIXME markers that hide unfinished work
- "temporary" bypasses without explicit user approval
- silent scope expansion with unrelated edits
- `as any` or unjustified type assertions — use proper types or extend contracts
- magic values without a named constant (no unexplained literals in logic paths)

If a real implementation cannot be completed without creating debt, the agent
MUST stop and report:

1. the root cause
1. why the work cannot be completed cleanly
1. the standards-compliant options
1. the exact debt that would be introduced

The agent MUST wait for explicit approval before introducing that debt.

## Required Evidence In Every Closeout

Every task closeout MUST include evidence for all of the following:

1. Governing sources used
   - Which ADRs, docs, contracts, workflows, or config files governed the work.
1. Real work performed
   - Which files were actually changed and which systems were affected.
1. Validation evidence
   - Exact commands run.
   - Whether they passed or failed.
1. No-debt evidence
   - No new debt entry created unless explicitly approved.
   - No rules disabled or relaxed.
   - No hooks bypassed.
   - No skipped checks hidden from the user.
1. No-stub evidence
   - No added stub, placeholder, fake implementation, or unfinished branch.

If any item above is not true, the agent MUST say so explicitly and MUST NOT
frame the task as cleanly complete.

## Mandatory Closeout File

Every implementation slice or task MUST produce a closeout file before the
work is declared complete. A task is NOT complete if this file does not exist.

**Location:** `docs/planning/closeouts/<SLICE_OR_TASK_ID>-closeout.md`

**Example:** `docs/planning/closeouts/G7.1-closeout.md`

**Required sections:**

```markdown
---
slice: <id>
date: <YYYY-MM-DD>
gap: <gap id or task label>
author: AI (<model name>)
---

# Closeout: <slice title>

## Changes made

| File | Change | Why |

## Libraries evaluated

<None, or: library-name — reason accepted / reason rejected>

## Docs synced

- [ ] <tracker or status doc> — <what was updated>

## Test evidence

| Command | Result |

## Debt introduced

<None, or explicit description>
```

The "Docs synced" section is a checklist. Every doc that the governing
protocol requires to be updated (tracker, GAP_EXECUTION_PLANS.md,
system-delivery-status.md) MUST appear as a checked item before the file is
committed. An unchecked item means the sync was not done.

## Definition Of Acceptable Completion

A task is only complete when all of the following are true:

- the governing sources were identified first
- the implementation matches those sources
- the affected validations were actually run
- no hidden debt or stub was introduced
- the final report includes concrete evidence, not reassurance

## Canonical Governance Entry Point

The mandatory first document is:

- `docs/planning/status/governance-document-rule-inventory.md`

That inventory is the entry point for the current governance map of this
repository.

## ADR Quick-Reference By Layer

Use this table to identify which ADRs govern a task without reading the full
inventory. The table maps code layers to their primary normative decisions.
For complete rule text, read the linked ADR.

| Layer                            | Primary ADRs                           | What they govern                                                                                                  |
| -------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Event sourcing / storage         | ADR-0004, ADR-0013                     | Append-only log, runSeq authority, projection separation, `bootstrapRunTx` atomicity                              |
| Tenant isolation                 | ADR-0031                               | All adapter reads and writes must be scoped by `tenantId`; cross-tenant leaks are blocked at the adapter boundary |
| Read models / snapshots          | ADR-0015                               | `getRunStatus` uses projected snapshot, not live workflow query; `listEvents` is recovery-only                    |
| Provider adapters                | ADR-0003, ADR-0014, ADR-0019           | Execution model sovereignty, run-driven adapter contract, equivalence and maintenance boundary                    |
| Temporal adapter                 | ADR-0001, ADR-0003                     | Integration test lifecycle discipline, workflow primitive delegation                                              |
| Event envelopes and contracts    | ADR-0005, ADR-0006, ADR-0010           | Contract formalization, tooling governance, envelope split, idempotency, duplicate handling                       |
| Run lifecycle and signals        | ADR-0007, ADR-0008, ADR-0011, ADR-0016 | Cancellation semantics, signal idempotency, `RunStarted` ownership, `logicalAttemptId`                            |
| Outbox                           | ADR-0009                               | Publication ordering guarantees                                                                                   |
| Plan integrity                   | ADR-0012, ADR-0012A, ADR-0017          | Plan ownership, error code strategy, `ExecutionPlan` schema versioning                                            |
| Intent log / crash consistency   | ADR-0029, ADR-0030                     | `RunMaintenanceService` extraction, pre-dispatch intent log, orphan reconciliation                                |
| Shared kernel (`@dvt/contracts`) | ADR-0018                               | Ownership governance, change propagation rules for the shared kernel                                              |
| `compiledCodeRef`                | ADR-0032                               | Artifact reference in `StepStarted` payload, storage, fail-open semantics                                         |
