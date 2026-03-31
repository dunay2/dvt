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

The agent MUST NOT:

- bypass hooks, skip checks, or use `--no-verify` style shortcuts unless the
  user explicitly asks for it and the risk is stated first
- relax lint, type, test, or quality rules just to get green output
- introduce hidden debt, silent rule downgrades, or undeclared process changes
- present partial wiring, placeholders, or fake implementations as complete
  work

## Architecture Attribution Rule

When the agent describes a design as `SOLID`, `DDD`, `hexagonal`, or
`Fowler-aligned`, it MUST distinguish between:

- design goals or quality criteria
- primary documentary evidence

The agent MUST treat `SOLID` as a design-quality shorthand for concerns such as:

- single responsibility
- extensibility without repeated modification of stable code
- substitutable contracts
- interface segregation
- dependency inversion

The agent MUST NOT attribute `SOLID` to Martin Fowler or present it as a
Fowler taxonomy.

If the primary evidence comes from Martin Fowler sources, the agent MUST say so
explicitly and use wording equivalent to:

- `SOLID-compatible design, evidenced by Fowler patterns/articles`
- `Architecture aligned with SOLID goals, with primary evidence grounded in Fowler`

When citing Fowler as evidence, the agent MUST:

- cite the exact Fowler article, pattern, or book page when available
- distinguish direct source support from repository-local policy
- avoid implying that a frontend-specific contract or term was authored by
  Fowler when it is a local design derived from his patterns

For architectural concepts and contracts, the agent MUST use Fowler as the
primary architectural reference when a real, materially applicable Fowler
source exists.

The agent MUST NOT skip an applicable Fowler source in favor of a more
convenient, looser, or tool-specific citation.

Only when no real and materially applicable Fowler source exists MAY the agent
use a non-Fowler primary reference.

In that case, the alternative reference MUST be:

- real and publicly verifiable
- auditable through an official page, API reference, product documentation, or
  canonical book/author site
- from a mature, production-proven system, platform, or framework
- directly relevant to the exact mechanism or boundary being justified

For any non-Fowler primary reference, the agent MUST state explicitly:

1. that no materially applicable Fowler source was found for that exact concept
2. why the chosen source is authoritative
3. whether it is exact precedent or compatible precedent

The agent MUST NOT use the following as canonical architectural evidence when a
stronger primary source is expected:

- generic blog posts
- forum threads
- issue comments
- marketing pages
- AI-generated summaries
- secondary paraphrases of Fowler

## Canonical Contract Evidence Rule

For canonical architecture contracts, architectural inference is not permitted
as evidence.

When the agent defines or justifies a canonical contract such as a frontend
shared-kernel model, port, boundary, or orchestration seam, it MUST use one of
these evidence modes explicitly:

- exact precedent
- compatible precedent
- local canonical policy

Required meaning:

- `exact precedent`: the same or materially equivalent concept is documented in
  a primary source of recognized architectural or platform authority
- `compatible precedent`: the exact contract name is local, but the pattern is
  directly supported by a reputable primary source and the compatibility is
  explained precisely
- `local canonical policy`: the repository is making a deliberate policy choice
  that extends documented precedents; this must be labeled as local policy, not
  as source-authored fact

The agent MUST NOT justify canonical contracts in canonical documents with
wording such as:

- `architectural inference`
- `reasonable inference from Fowler`
- `implied by the literature`

Those phrases MAY appear only when explicitly rejecting insufficient evidence
in review commentary or governance rules. They MUST NOT be used as positive
support and MUST NOT be "repaired" afterward by adding citations.

For canonical contracts, the agent MUST prefer primary sources of proven
prestige such as:

- Martin Fowler articles, catalog entries, or canonical book pages when
  materially applicable
- official platform or API documentation
- accepted ADRs in this repository
- canonical architecture books or author sites
- official framework documentation for the exact mechanism being adopted

For `exact precedent`, the citation MUST resolve to the specific API type,
mechanism, section, or page that documents the materially equivalent concept. A
broad landing page or top-level index is not sufficient unless that page is
itself the authoritative section.

For each canonical contract the agent documents, it MUST make explicit:

1. the cited source
2. whether the source is exact precedent or compatible precedent
3. which parts are repository-local policy

## Operational Playbooks

Use these as procedural complements to this file. They do not override rules in
`AGENTS.md`.

- `docs/guides/ai-work-protocol.md` - phase-based execution procedure.
- `docs/planning/reviews/20260328-lane-c-ai-efficiency-and-cost-review.md` -
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

This replicates the `amannn/action-semantic-pull-request` check in CI exactly.
A failed validation here means a failed CI check — fix the title before creating the PR.

**Full PR creation sequence:**

```bash
pnpm verify:prepush
pnpm pr:validate-title "<title>"
gh pr create --title "<title>" --body "..."
```

Use `gh pr create` with an explicit `--body`. Never open a PR with an empty or one-line description.

## Generated Docs Rule

Whenever source files are added or removed from any workspace, `docs/planning/status/generated-code-state.md` goes stale and CI fails. Always run:

```bash
pnpm docs:status:generate
```

and commit the result before pushing. Required after any structural change to `apps/` or `packages/`.

Whenever any file under `docs/` is added, removed, or renamed, the documentation index files go stale and CI fails. Always run:

```bash
pnpm docs:sync
```

and commit the result before pushing. This updates all `docs/*/index.md` files and `mkdocs.yml`. This is **not** automatic — it does not run on pre-commit. The agent is responsible for running it manually whenever docs structure changes.

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

## MCP AVAILABILITY

If needed use

- Context7
- markitdown
