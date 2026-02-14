# AI Issue Resolution Playbook

> Document control
>
> - Version: `v1.6.2`
> - Status: `active`
> - Last updated (UTC): `2026-02-14`
> - Owner: `Engineering / AI Delivery Governance`

## Purpose

This guide defines a standard, auditable process for AI agents resolving repository issues.

**Non-negotiable principle**: **Think first** before implementing. Always prefer proven patterns and validated solutions over ad-hoc approaches.

This explicitly means: no "quick-and-dirty" fixes to just unblock, and no trial-and-error coding without prior technical reasoning.

## Scope

- Applies to all issue-driven work (code, docs, tests, CI, operations docs).
- Applies whether the issue already exists or must be created for traceability.
- Working language is **English** for all deliverables (code comments, docs, issue/PR text, status updates), unless a maintainer explicitly requests another language.

## Mandatory workflow

1. **Understand and classify the issue**
   - Read issue title/body and acceptance criteria.
   - Classify effort/risk: low, medium, high.
   - Identify if it is implementation, documentation, or mixed.
   - Perform think-first analysis: list candidate approaches and justify the selected one.
   - Record a **structured Think-First Analysis** in the issue before implementation, at minimum:
     - Problem summary (facts only)
     - Constraints and invariants
     - Options considered (A/B/C)
     - Selected option + rationale
     - Alternatives rejected + why
     - Expected validation evidence

2. **Research documented, updated, and compatible solutions first (mandatory)**
   - Prioritize official, documented patterns from the current libraries/frameworks used in this repository.
   - Prefer **primary sources**: official product docs, upstream repositories, maintainer guidance, and project-internal normative docs.
   - Ensure the selected approach is up-to-date and aligned with pinned versions and current project tooling.
   - Ensure compatibility with existing contracts, runtime constraints, integration boundaries, and supported toolchain versions in this repo.
   - Review previously generated repository information first (issues, status docs, runbooks, prior decisions) and reuse existing patterns when possible.
   - Do not start coding experiments "to see what happens"; first define expected behavior, constraints, and acceptance evidence.

3. **Design complete end-to-end solution coverage (mandatory)**
   - Proposed solution must cover the full flow, not only a partial segment.
   - Explicitly account for: input, processing, state transitions, output, error paths, rollback path, and observability.
   - Ensure the result fits expected application behavior and acceptance criteria.

4. **Map scope to repository paths**
   - Identify exact files expected to change.
   - Prefer canonical active paths (`packages/*`, `docs/*`).
   - Record out-of-scope areas explicitly.

5. **Create/confirm traceability**
   - If no issue exists, create one before coding.
   - Add a short execution plan in issue comments (what, where, validation).

6. **Risk & impact briefing before implementation (mandatory)**
   - Before touching code/docs, publish a short pre-implementation brief **in the issue comments** with:
     - suitability (is this the right solution for this issue/context?),
     - blockers (what can block implementation/release/validation),
     - opportunities (secondary improvements worth capturing),
     - what will change,
     - what for (intended objective/outcome),
     - how the change will be implemented,
     - expected files to change,
     - affected components/surfaces,
     - identified risks and possible side effects,
     - risk mitigation actions,
     - why the proposed approach is chosen,
     - validation plan,
     - explicit unknowns/questions for maintainers.
   - Wait for maintainer confirmation if business rules, policy interpretation, or operational behavior may be affected.

7. **Clarify business rules and decisions first (mandatory)**
   - If implementation could encode business decisions (for example: lifecycle transitions, adapter fallback behavior, auth policy, version compatibility), ask for explicit confirmation before coding.
   - Treat the following as **business-rule-sensitive** by default:
     - lifecycle transitions (`RunStatus` / `StepStatus`) and retry/idempotency semantics,
     - authorization/RBAC policy, rate limits, retention/deletion rules,
     - adapter fallback, routing, or execution-target selection behavior,
     - persisted artifacts/state shape and meaning.
   - Record approved decisions in issue comments and relevant docs.
   - If there is ambiguity, **stop and ask** before implementation.
   - If documentation is missing, unclear, or outdated for the target behavior, **stop and ask** before implementation.
   - If following any playbook step appears to conflict with issue goals, acceptance criteria, or documented constraints, **stop and ask maintainer clarification** before proceeding.

8. **Implement in minimal safe increments**
   - Keep changes focused on acceptance criteria.
   - Avoid unrelated refactors in the same patch.
   - Preserve backward compatibility unless issue explicitly requests a break.

9. **Validate technically**
   - Run the smallest relevant checks first (package-level test/build/lint).
   - Then run broader checks if the change touches shared contracts/core.
   - Capture evidence (command + pass/fail summary).

10. **Document outcomes**

- Update affected docs/runbooks/indexes.
- Record execution evidence (impact, validation, decisions, rollback) in the **issue comments** as default audit trail.
- Do **not** create standalone status docs for issue execution notes unless the issue explicitly requires new technical documentation.
- In docs and issue comments, include an explicit **WHAT / WHY** summary for every non-trivial change.
- If behavior changed, add a short "why" note in status docs.
- Link changed files in the issue comment.

1. **Close loop on issue**

- Post final comment with:
  - what changed,
  - why this approach was selected,
  - validation evidence,
  - remaining scope (if any).
- Open a Pull Request for the implemented scope and reference the issue (`Closes #X` / `Refs #X`).
- Ensure issue comment links to the PR before closure.
- Close issue only when all acceptance criteria are met.

## Quality gates (must pass before close)

- Acceptance criteria explicitly checked one-by-one.
- No hidden TODO/FIXME left for required scope.
- Validation evidence provided.
- Documentation/indexes updated if discoverability changed.
- Docs and issue both contain explicit WHAT / WHY notes.
- Impact/evidence trail recorded in issue comments unless new technical docs were explicitly required.
- Issue includes explicit WHAT / FOR / HOW, touched scope, risks, and affected surfaces.
- Issue includes explicit Suitability / Blockers / Opportunities / Risks & Mitigation.
- Pre-implementation risk/impact briefing recorded and acknowledged.
- Business-rule-sensitive decisions explicitly confirmed and documented.
- Think-first analysis recorded (selected option + rationale + alternatives rejected).
- Solution demonstrates complete flow coverage (including error and rollback paths).
- Documented sources and pattern compatibility are explicit.
- Ambiguity or missing clarity triggered stop-and-ask before coding.

## Risk classification guide (low / medium / high)

Use this baseline to reduce subjectivity in step 1:

- **Low**
  - Docs-only/test-only updates, formatting, or non-behavioral refactor in a leaf package.
  - No contract boundary, auth behavior, or workflow-semantics impact.
  - Validation typically limited to targeted lint/test/docs checks.

- **Medium**
  - Behavior change behind an existing contract, or touches shared utilities.
  - Requires test-suite updates and/or CI config changes for one scoped area.
  - No broad cross-package contract migration.

- **High**
  - Cross-cutting change across multiple packages or core contracts.
  - Affects auth policy, lifecycle/state-machine semantics, retention/deletion, billing/cost logic, or cross-adapter execution semantics.
  - Requires migration strategy and has elevated risk to determinism, compatibility, security boundaries, or rollback complexity.

## Standard templates (copy/paste)

### Template A — Pre-implementation brief

```markdown
## Pre-implementation brief

### Suitability

- Why this approach is suitable for this issue/context:
- Constraints considered:

### Blockers

- Current blockers (technical/process/decision):
- Required unblocks / owner:

### Opportunities

- Adjacent improvements identified (not mandatory for this scope):
- Recommendation (now vs follow-up issue):

### WHAT

- Scope summary:
- Expected files/paths:

### FOR (goal)

- Why this change is needed:
- Expected outcome:

### HOW

- Planned implementation approach:
- Sequence/strategy:

### WHY

- Selected approach:
- Alternatives rejected:

### Scope touched

- Components/packages/workflows affected:
- Explicit out-of-scope:

### Risk

- Classification: Low | Medium | High
- Main risks / side effects:

### Risks & Mitigation

- Risk 1:
  - Mitigation:
- Risk 2:
  - Mitigation:

### Impact (affected areas)

- What this affects (technical/functional/operational):
- Compatibility impact (if any):
- CI/runtime/observability impact (if any):

### Validation plan

- Targeted checks:
- Broader checks (if shared/core touched):

### Unknowns / maintainer decisions needed

-
```

### Template B — Final close comment

```markdown
## Final issue close summary

### Suitability outcome

- Was the selected approach suitable in practice? Why:

### Blockers encountered

- Blockers found during execution:
- How they were resolved:

### Opportunities identified

- Follow-up opportunities discovered:
- Proposed follow-up issue(s):

### WHAT changed

-

### WHY this approach

-

### Acceptance criteria mapping

- [ ] AC1 → change + evidence
- [ ] AC2 → change + evidence

### Validation evidence

- Command:
- Result:

### Rollback note

-

### Residual scope (if any)

-
```

## PR hygiene checklist

- Conventional commit message valid.
- Diff is focused and reviewable.
- Includes issue reference (`Closes #X` / `Refs #X`).
- Opening a PR is mandatory for implementation scope (no direct done-without-PR closure).
- PR description MUST be at least 50 characters and clearly describe WHAT/FOR/HOW.
- PR total changed lines MUST stay under 1000; if exceeded, split before review.
- Issue/PR text MUST render as proper Markdown (no escaped literal `\n` sequences in final visible content).
- Includes risk note and rollback note for non-trivial changes.
- Before opening a PR, compile, tests, and lint MUST pass for affected scope (and broader scope when shared/core contracts are touched).
- Do not treat warning suppression as a final fix; solve root cause first. Hiding warnings is only acceptable with explicit maintainer approval and written rationale.
- Within each PR, keep commits logical and atomic (for example: implementation, tests, docs as separate coherent commits).
- If PR exceeds size threshold, split by a deterministic strategy:
  - contracts vs implementation vs docs, or
  - per-package slices, or
  - config-only PR first, then behavior/code PR.

## Tooling and automation guidance

- Treat this playbook as machine-checkable policy where practical.
- Require a pre-implementation issue template block (Think-First + risk + validation plan) before coding starts.
- Enforce quality-gate checks in CI (e.g., PR gate + lint/test/build + docs consistency where applicable).
- If automation and maintainers disagree, pause and resolve policy interpretation explicitly in the issue.
- Require template completeness checks (Template A before coding, Template B before closing) where automation is available.
- Add/keep checks or bot reminders when implementation issues do not have a linked PR.

## Planned technical migration (approved before implementation)

### Objective

Unify TypeScript project resolution using a references-based graph, without suppressing warnings as a final solution.

### Planned phases

1. Root graph definition
   - Add and validate `references` in [`tsconfig.json`](tsconfig.json) toward active package configurations and test scope.
   - Align test scope in [`tsconfig.test.json`](tsconfig.test.json).

1. ESLint alignment
   - Align `parserOptions.project` and resolver project settings in [`eslint.config.cjs`](eslint.config.cjs) with the references graph.
   - Evaluate `parserOptions.projectService` as the preferred scalable typed-linting option for larger monorepos; keep `project` where compatibility constraints require it.
   - Keep `import/order` enforcement active for tests and source files.

1. Precommit and CI hardening
   - Keep staged lint+format coverage for both `src` and `test` files via [`lint-staged`](package.json).
   - Clarify that `lint-staged` executes tasks on staged files; ignore behavior must be configured in task/tool configuration, not by assuming global scope skipping.
   - For references-based typechecking in CI, prefer `tsc -b` / `tsc --build` workflow over ad-hoc per-file type invocations.
   - Preserve PR quality gate constraints, especially max-size guard in [`.github/workflows/pr-quality-gate.yml`](.github/workflows/pr-quality-gate.yml).

### Risks and controls

- Risk: incomplete references causing type-resolution failures across packages.
  - Control: incremental rollout (root -> active packages -> tests) with `eslint` + `tsc --noEmit` at each step.
- Risk: unrelated legacy areas failing after config tightening.
  - Control: scope migration to active paths first and document deferred legacy alignment explicitly.

## Anti-patterns to avoid

- Closing issues based on partial implementation without residual scope note.
- Mixing unrelated cleanups with issue scope.
- Skipping documentation when behavior/process changes.
- Relying only on local editor state instead of git-tracked reality.
- Implementing before surfacing risks and expected touched files.
- Encoding implicit business rules without maintainer confirmation.
- Implementing ad-hoc solutions without checking updated official documentation.
- Delivering partial fixes that do not cover full expected flow.
- Continuing implementation when requirements or documentation are ambiguous (must stop and ask).
- Ignoring prior repository decisions/patterns and reinventing behavior without rationale.
- Trial-and-error implementation without an upfront plan and expected outcomes.
- Shipping temporary "just make it pass" fixes as final solutions.
- Silencing warnings/errors to pass CI instead of fixing the underlying issue.
- Submitting oversized PRs that exceed reviewable limits instead of splitting by scope.

## Additional safeguards recommended for high quality

- **Invariants checklist per change**: list which invariants must remain true (for example determinism, idempotency, auth boundaries).
- **Decision log snippet**: add a short "Decision / Rationale / Alternatives rejected" note in issue comments for non-trivial changes.
- **Negative-path testing**: add at least one failure/deny-path assertion for behavior changes.
- **Rollback note**: include a concise revert strategy in PR description for non-trivial updates.

## Suggested quality standards to adopt (practical baseline)

Use these as a consistent gate before merge:

1. **Risk-first delivery standard**
   - Every non-trivial change MUST include pre-implementation risk briefing + affected files + validation plan.

1. **Acceptance traceability standard**
   - Every acceptance criterion MUST map to at least one code/doc change and one validation proof.

1. **Contract safety standard**
   - Any contract/API change MUST include compatibility note (backward-compatible, additive, or breaking) and migration impact.

1. **Determinism and idempotency standard**
   - Workflow/runtime changes MUST preserve determinism invariants.
   - Side-effect paths MUST demonstrate idempotency behavior under retries.

1. **Negative-path test standard**
   - Add at least one explicit deny/failure test for changed behavior.
   - Reject "happy-path only" PRs in behavior-sensitive areas.

1. **Observability minimum standard**
   - Changes affecting execution flow MUST define expected log/event/signal outcomes and failure visibility.

1. **Documentation freshness standard**
   - If behavior/process changes, update runbook/status/index in the same PR.
   - No merge with stale operational docs for touched behavior.

1. **Small-diff maintainability standard**
   - Prefer focused, reviewable diffs.
   - Split mixed concerns into separate commits/PRs when possible.
   - Ensure commits are atomic, each representing one logical change unit with clear intent.

1. **Decision log standard**
   - For non-trivial trade-offs, include a short decision record in issue/PR:
     - decision,
     - rationale,
     - alternatives rejected,
     - rollback option.

1. **Merge readiness standard**
   - Mandatory checks green for affected scope (lint/tests/build/docs lint where relevant).
   - Issue comment updated with final evidence and residual scope (if any).

## Change history

| Date (UTC) | Version | Change                                                                                                                                                                                                                               | Author       |
| ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| 2026-02-14 | v1.6.2  | Added mandatory PR description minimum length (>=50 chars) and explicit max changed-lines rule (<1000, split if exceeded).                                                                                                           | AI assistant |
| 2026-02-14 | v1.6.1  | Added explicit rule that issue/PR content must render as valid Markdown (avoid escaped literal `\n` in visible text).                                                                                                                | AI assistant |
| 2026-02-14 | v1.6.0  | Added mandatory sections for Suitability, Blockers, Opportunities, and Risks & Mitigation in pre-implementation briefing, quality gates, and issue-close template.                                                                   | AI assistant |
| 2026-02-14 | v1.5.0  | Added mandatory WHAT/FOR/HOW, touched-scope, and impact (risks + affected surfaces) requirements in the pre-implementation process and templates.                                                                                    | AI assistant |
| 2026-02-14 | v1.4.0  | Clarified that issue comments are the default audit trail for execution notes (unless new technical docs are required) and made PR creation/linking mandatory before issue closure.                                                  | AI assistant |
| 2026-02-14 | v1.3.0  | Added concrete risk rubric, business-rule-sensitive list, pre/final templates, primary-source guidance, TS projectService/`tsc -b` guidance, enforceable split strategy, lint-staged clarification, and explicit workflow numbering. | AI assistant |
| 2026-02-14 | v1.2.0  | Added structured Think-First record, risk classification guide, playbook-conflict safeguard, automation guidance, and atomic-commit rule.                                                                                            | AI assistant |
| 2026-02-14 | v1.1.0  | Added document-control signature, anti-warning rule, PR-size guard, and planned TS references migration section.                                                                                                                     | AI assistant |
| 2026-02-14 | v1.0.0  | Initial baseline playbook with mandatory workflow, quality gates, and anti-patterns.                                                                                                                                                 | AI assistant |
