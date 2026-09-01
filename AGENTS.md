# AGENTS.md

This repository does not rely on agent memory as a governance mechanism.
The repository itself is the source of truth.

## Mandatory Startup For Every Task

Before analysis, coding, Git actions, or planning, the agent MUST:

1. Read `docs/planning/status/governance-document-rule-inventory.md`.
2. Identify the documents, ADRs, contracts, and workflow rules that apply to
   the task.
3. Start the first user-visible update with this exact sentence:

`*** Plan-driven. Outcome-agnostic.***`

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
- work doc-driven first when the slice changes behavior, architecture,
  contracts, workflows, or planning posture
- produce diagrams of the current state and solution-rationale material before
  implementation when the slice needs design clarification
- start TDD only after the governing documentation, diagrams, and solution
  rationale are materially in place for the active slice

The agent MUST NOT:

- bypass hooks, skip checks, or use `--no-verify` style shortcuts unless the
  user explicitly asks for it and the risk is stated first
- relax lint, type, test, or quality rules just to get green output
- introduce hidden debt, silent rule downgrades, or undeclared process changes
- present partial wiring, placeholders, or fake implementations as complete
  work

## Command And Query Rail Rule

Before implementing or documenting externally observable behavior, the agent
MUST identify the governing command or query rail in the owning bounded context.

If no rail exists, the agent MUST add or update the catalog before
implementation. The catalog entry must name whether the behavior is a command or
query, the owning bounded context, the DDD object or read model, the application
port, the adapter surface, scope and authorization rules, and negative tests.

The canonical repository rule is:

- `docs/architecture/command-query-rail-governance.md`

The agent MUST NOT create parallel commands, queries, services, route handlers,
mock semantics, or documentation names for the same product intent. Reuse the
existing rail when the intent already exists.

## Architecture And Design Consultation Rule

After the mandatory startup and before consulting architecture or design beyond
the governance inventory, the agent MUST query the Planning DB authority:

```bash
pnpm planning:db:query architecture-designs --limit 100
```

The agent must use the returned design identities, component relations, and
canonical evidence paths to select any repository documents it reads next. It
must not treat a filesystem search or a generated documentation page as the
architecture authority. If the existing Planning DB authority is unavailable or
stale, fail closed and report it; do not rebuild it as a side effect of
consultation. `planning:db:import` is an explicit bootstrap or recovery
operation, not a routine startup step.

Documentation publication is an explicit operation. Run `pnpm docs:publish`
only when publication is requested or required by a documentation-publication
gate. `docs:serve` and `docs:build` do not generate documentation; they consume
the previously assembled untracked publication tree and fail if it is absent.

## Operational Playbooks

Use these as procedural complements to this file. They do not override rules in
`AGENTS.md`.

- `docs/guides/ai-work-protocol.md` - phase-based execution procedure.
- `docs/planning/reviews/ci-and-delivery/20260328-lane-c-ai-efficiency-and-cost-review.md` -
  efficiency and cost-reduction playbook (Lane C).
- `scripts/hygiene.ps1` - standard diagnostics/cleanup/preflight helper.

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

Commands that load `vitest`, `vite`, or `esbuild` always require escalated
execution in this repository's agent environment.

Therefore the agent MUST:

- run `vitest`, `vite`, and `esbuild`-backed commands with escalated execution
  directly — never attempt them in sandboxed mode first
- report the escalated run result as the real validation outcome
- not present `spawn EPERM` output as a product defect — it is an environment
  signal, not a code failure

## Required End-Of-Task Validation

For code, config, test, CI, or documentation changes, the agent MUST finish by
running the relevant validation commands for the touched scope and MUST include
the lint/pre-push gate in that closeout baseline.

At minimum, this means:

- package-level tests, lint, and type-check commands for the changed scope
- `pnpm verify:prepush` before claiming the slice is ready, unless the user
  explicitly limits validation and that limit is reported

## Prettier Pre-Commit Behaviour

Prettier runs as part of `lint-staged` inside the **pre-commit** hook, not
pre-push. lint-staged auto-formats staged files and re-stages them. If the
formatter modifies a file after staging, the commit succeeds with the
auto-fixed version — no manual re-stage is needed.

**Do not run a separate `prettier --write` pass before committing.** The hook
handles it. If a push fails citing Prettier, the cause is a file that was
committed while bypassing the pre-commit hook; fix it with a follow-up commit
that runs `pnpm format:changed` (if it exists) or stages and recommits the
affected files.

`pnpm verify:prepush` checks formatting; it does not apply Prettier. For PR
closeout, commit first with the helper so the pre-commit hook can format and
re-stage files, then run `pnpm verify:prepush` against the committed,
hook-normalized tree. "Before PR" does not mean "before commit".

## ARC Requirements For Contracts And Adapter Changes

`.arc-policy.yaml` mandates **ARC-2** (evidence doc + risk register update) for
any PR that touches:

- `packages/@dvt/contracts/**`
- `packages/@dvt/adapter-*/**`
- `packages/@dvt/engine/**`

Before creating a PR that modifies any of these paths, the agent MUST:

1. Run `GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs` to
   check whether `evidenceDoc` and `riskUpdate` are required.
2. If required, create:
   - `docs/evidence/ED-YYYYMMDD-<slug>.md` (see existing files for format)
   - `docs/risk-register/quality/R-YYYYMMDD-<SLUG>.yaml` (see existing files)
3. Run `pnpm docs:sync` and commit the updated index files.
4. Commit the evidence and risk files before pushing.

Skipping this causes `DOCS-VALIDATION-FAIL: Risk update required but no changes
under docs/risk-register` in the `ARC docs / evidence validate` CI step.

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

## ARC Policy Rule

Any PR that touches the paths below triggers ARC-2 and requires **both** an evidence doc and a risk register entry before CI will pass.

| Trigger        | Glob                                                 |
| -------------- | ---------------------------------------------------- |
| `engine-core`  | `packages/@dvt/engine/**`                            |
| `contracts`    | `packages/@dvt/contracts/**` or `specs/contracts/**` |
| `adapters`     | `packages/@dvt/adapter-*/**`                         |
| `planner-core` | `packages/@dvt/planner/**`                           |

**Evidence doc** — create a file under `docs/evidence/` with this frontmatter:

```yaml
---
title: <short description>
status: Accepted
date: YYYY-MM-DD
owners:
  - <package name>
arc_level: ARC-2
breaking: false
code_refs:
  - <file or function changed>
evidence:
  tests:
    - <pnpm command or validation that proves correctness>
---
```

**Risk register entry** — create a file under `docs/risk-register/quality/` (or the relevant subdirectory) with:

```yaml
---
id: R-YYYYMMDD-<SHORT-ID>
title: <one-line description>
status: Open
date: YYYY-MM-DD
owners:
  - <package>
severity: Low | Medium | High
probability: Low | Medium | High
---
```

If either file is missing, the `ARC docs / evidence validate` step in `PR Quality Checks` will fail.

## PR Rules

PR title must follow Conventional Commits — same format as commits:

```
<type>(<scope>): <Subject starting with uppercase>
```

PR body must be at least 50 characters or CI will reject it.

**Before running `gh pr create`, always validate the title locally:**

```bash
pnpm pr:validate-title "<title>"
```

This runs the same canonical validator used by the CI title check. A failed
validation here means a failed CI check — fix the title before creating the PR.

**Full PR creation sequence:**

```bash
git add <intended files>
pnpm commit <type> <scope> "<Subject>"
pnpm verify:prepush
pnpm pr:validate-title "<title>"
gh pr create --title "<title>" --body "..."
```

Use `gh pr create` with an explicit `--body`. Never open a PR with an empty or one-line description.

## Generated Docs Rule

Whenever source files are added or removed from any workspace, refresh the
DB-free local code-state inventory with:

```bash
pnpm docs:status:generate --code-state-only
```

Repository Map is an untracked, DB-backed publication artifact. Do not generate
or commit a tracked copy. When an operator explicitly requests a documentation
publication, run:

```bash
pnpm docs:publish
```

The code-state command is deliberately DB-free. The publication command queries
the existing Planning DB authority, invokes the declared generators, and
assembles the disposable Zensical input. It does not import or rebuild the
database. `docs:serve` and `docs:build` do not generate it.

Whenever any file under `docs/` is added, removed, or renamed, the documentation index files go stale and CI fails. Always run:

```bash
pnpm docs:sync
```

and commit the result before pushing. This updates all `docs/*/index.md` files and the governed docs navigation surfaces. This is **not** automatic — it does not run on pre-commit. The agent is responsible for running it manually whenever docs structure changes.

## Governance Refresh Rule

When a task changes docs/planning/governance source surfaces, governance
workflow documentation, governance generator/check scripts, package scripts, or
adds/removes files that affect `system-governance-*` indexes, the agent MUST
run:

```bash
pnpm governance:refresh
```

Run it near final closeout, after the content/code slice is materially done and
before `pnpm ci:docs` or `pnpm verify:prepush`. The command owns the final
quadrature for docs indexes, docs manifests, `system-governance-*` indexes,
fingerprints, coverage, and remediation outputs derived from the current Git
inventory. It may record its bounded execution audit in Planning DB, but it
MUST NOT import, rebuild, or replace Planning DB projections.

`pnpm governance:refresh` is not a replacement for `pnpm verify:prepush`; it is
the canonical refresh sequence that makes the later gates meaningful.

## Planning State Rule

MVP task creation, assignment, priority, status, blockers, acceptance, and
closure live in GitHub Issues. Pull requests carry implementation review and
merge state.

Planning DB remains canonical for architecture components, capabilities,
relations, ownership, command/query rails, feature mechanization, and governed
evidence. Do not create local task rows, `agent-lane-*` files, workboards,
open-task routes, or DB-to-GitHub task projections.

Git remains canonical for the physical repository inventory: tracked paths,
contents, hashes, symbols, documentation structure, and Git-derived local
indexes. Routine docs sync, governance refresh, closeout, and validation MUST
NOT rebuild Planning DB from that inventory. Explicit imports are reserved for
bootstrap or recovery workflows that declare that intent.

See `docs/planning/state/github-mvp-issue-workflow.md` for the delivery flow.

## Canonical Governance Entry Point

The mandatory first document is:

- `docs/planning/status/governance-document-rule-inventory.md`

That inventory is the entry point for the current governance map of this
repository.
