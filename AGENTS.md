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

## Git Commit Format Rule

**Always use the commit helper. Never call `git commit -m` directly.**

```bash
pnpm commit <type> <scope> "<Subject>"
```

Valid types: `feat` `fix` `docs` `style` `refactor` `perf` `test` `build` `ci` `chore` `revert`

Valid scopes: `engine` `adapters` `temporal` `conductor` `state-store` `contracts` `planner` `docs` `ci` `deps` `release` `api` `web`

The helper enforces sentence-case, no trailing dot, and max 100-char header automatically.

Examples:

```bash
pnpm commit fix api "Prevent plan-URI leakage to unauthorized callers"
pnpm commit feat engine "Add cancellation support to WorkflowEngine"
pnpm commit chore ci "Upgrade Node to 22.x in workflow files"
pnpm commit docs docs "Add how-to-add-tasks guide"
```

## Git Commit Execution Rule

For this repository's agent execution environment, `git commit` is a known
permission-sensitive command because sandboxed execution does not reliably
create `.git` lock files.

Therefore the agent MUST:

- run `git commit` with escalated execution directly when a commit is required
- not waste a first sandboxed attempt on `git commit`
- keep normal hook execution enabled unless the user explicitly requests
  otherwise and the risk is stated first

This is a repository operational rule for agent-driven execution. It does not
change normal Git usage for human contributors outside the agent environment.

## Sandboxed Validation Execution Rule

For this repository's agent execution environment, commands that load
`vitest`, `vite`, or `esbuild` may fail under sandboxed execution with
`spawn EPERM` even when the code is correct.

Therefore the agent MUST:

- treat `spawn EPERM` from `vitest`/`vite`/`esbuild` as an environment signal
  first, not as a code failure
- rerun the affected validation command with escalated execution directly when
  that failure occurs
- report the escalated rerun result as the real validation outcome
- not present sandbox-only `spawn EPERM` output as a product defect unless the
  escalated rerun confirms it

## Required End-Of-Task Validation

For code, config, test, CI, or documentation changes, the agent MUST finish by
running the relevant validation commands for the touched scope and MUST include
the lint/pre-push gate in that closeout baseline.

At minimum, this means:

- package-level tests, lint, and type-check commands for the changed scope
- `pnpm verify:prepush` before claiming the slice is ready, unless the user
  explicitly limits validation and that limit is reported

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

## Planning State Rule

Agent task assignments live in `docs/planning/state/agent-lane-*.yaml`.

- `execution-workboard.md` and `open-task-route.md` are **generated views** — never edit them directly.
- To add or update a task, edit the relevant `agent-lane-X.yaml`.
- After editing, run `pnpm docs:workboard:generate` to regenerate the views.

Lane ownership:

| Lane | File                | Scope                                                 |
| ---- | ------------------- | ----------------------------------------------------- |
| A    | `agent-lane-a.yaml` | Contracts, state-store boundaries, DDD modularization |
| B    | `agent-lane-b.yaml` | Event contracts, traceability, lineage                |
| C    | `agent-lane-c.yaml` | Runtime safety, admission control, RBAC               |
| D    | `agent-lane-d.yaml` | Scale, retention, GTM                                 |

See `docs/planning/state/how-to-add-tasks.md` for the full task format.

## Canonical Governance Entry Point

The mandatory first document is:

- `docs/planning/status/governance-document-rule-inventory.md`

That inventory is the entry point for the current governance map of this
repository.
