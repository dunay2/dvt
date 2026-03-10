# AGENTS.md

This repository does not rely on agent memory as a governance mechanism.
The repository itself is the source of truth.

## Mandatory Startup For Every Task

Before analysis, coding, Git actions, or planning, the agent MUST:

1. Read `docs/planning/status/governance-document-rule-inventory.md`.
2. Identify the documents, ADRs, contracts, and workflow rules that apply to
   the task.
3. Start the first user-visible update with this exact sentence:

`ME ESTOY GUIANDO POR EL AGENT.`

1. Immediately after that sentence, name the governing sources being used for
   the task.

If the agent has not read the inventory first, it MUST stop and do that before
continuing.

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
