# AI Issue Resolution Playbook

> Document control
>
> - Version: `v1.1.0`
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

1. **Research documented, updated, and compatible solutions first (mandatory)**
   - Prioritize official, documented patterns from the current libraries/frameworks used in this repository.
   - Ensure the selected approach is up-to-date and aligned with pinned versions and current project tooling.
   - Ensure compatibility with existing contracts, runtime constraints, and integration boundaries.
   - Review previously generated repository information first (issues, status docs, runbooks, prior decisions) and reuse existing patterns when possible.
   - Do not start coding experiments "to see what happens"; first define expected behavior, constraints, and acceptance evidence.

1. **Design complete end-to-end solution coverage (mandatory)**
   - Proposed solution must cover the full flow, not only a partial segment.
   - Explicitly account for: input, processing, state transitions, output, error paths, rollback path, and observability.
   - Ensure the result fits expected application behavior and acceptance criteria.

1. **Map scope to repository paths**
   - Identify exact files expected to change.
   - Prefer canonical active paths (`packages/*`, `docs/*`).
   - Record out-of-scope areas explicitly.

1. **Create/confirm traceability**
   - If no issue exists, create one before coding.
   - Add a short execution plan in issue comments (what, where, validation).

1. **Risk & impact briefing before implementation (mandatory)**
   - Before touching code/docs, publish a short pre-implementation brief with:
     - expected files to change,
     - identified risks and possible side effects,
     - why the proposed approach is chosen,
     - validation plan,
     - explicit unknowns/questions for maintainers.
   - Wait for maintainer confirmation if business rules, policy interpretation, or operational behavior may be affected.

1. **Clarify business rules and decisions first (mandatory)**
   - If implementation could encode business decisions (for example: lifecycle transitions, adapter fallback behavior, auth policy, version compatibility), ask for explicit confirmation before coding.
   - Record approved decisions in issue comments and relevant docs.
   - If there is ambiguity, **stop and ask** before implementation.
   - If documentation is missing, unclear, or outdated for the target behavior, **stop and ask** before implementation.

1. **Implement in minimal safe increments**
   - Keep changes focused on acceptance criteria.
   - Avoid unrelated refactors in the same patch.
   - Preserve backward compatibility unless issue explicitly requests a break.

1. **Validate technically**
   - Run the smallest relevant checks first (package-level test/build/lint).
   - Then run broader checks if the change touches shared contracts/core.
   - Capture evidence (command + pass/fail summary).

1. **Document outcomes**
   - Update affected docs/runbooks/indexes.
   - If behavior changed, add a short "why" note in status docs.
   - Link changed files in the issue comment.

1. **Close loop on issue**
   - Post final comment with:
     - what changed,
     - validation evidence,
     - remaining scope (if any).
   - Close issue only when all acceptance criteria are met.

## Quality gates (must pass before close)

- Acceptance criteria explicitly checked one-by-one.
- No hidden TODO/FIXME left for required scope.
- Validation evidence provided.
- Documentation/indexes updated if discoverability changed.
- Pre-implementation risk/impact briefing recorded and acknowledged.
- Business-rule-sensitive decisions explicitly confirmed and documented.
- Think-first analysis recorded (selected option + rationale + alternatives rejected).
- Solution demonstrates complete flow coverage (including error and rollback paths).
- Documented sources and pattern compatibility are explicit.
- Ambiguity or missing clarity triggered stop-and-ask before coding.

## PR hygiene checklist

- Conventional commit message valid.
- Diff is focused and reviewable.
- Includes issue reference (`Closes #X` / `Refs #X`).
- Includes risk note and rollback note for non-trivial changes.
- Before opening a PR, compile, tests, and lint MUST pass for affected scope (and broader scope when shared/core contracts are touched).
- Do not treat warning suppression as a final fix; solve root cause first. Hiding warnings is only acceptable with explicit maintainer approval and written rationale.
- Keep PR size under quality-gate threshold (max 1000 changed lines). If exceeded, split into smaller, focused PRs.

## Planned technical migration (approved before implementation)

### Objective

Unify TypeScript project resolution using a references-based graph, without suppressing warnings as a final solution.

### Planned phases

1. Root graph definition
   - Add and validate `references` in [`tsconfig.json`](tsconfig.json) toward active package configurations and test scope.
   - Align test scope in [`tsconfig.test.json`](tsconfig.test.json).

1. ESLint alignment
   - Align `parserOptions.project` and resolver project settings in [`eslint.config.cjs`](eslint.config.cjs) with the references graph.
   - Keep `import/order` enforcement active for tests and source files.

1. Precommit and CI hardening
   - Keep staged lint+format coverage for both `src` and `test` files via [`lint-staged`](package.json).
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

| Date (UTC) | Version | Change                                                                                                           | Author       |
| ---------- | ------- | ---------------------------------------------------------------------------------------------------------------- | ------------ |
| 2026-02-14 | v1.1.0  | Added document-control signature, anti-warning rule, PR-size guard, and planned TS references migration section. | AI assistant |
| 2026-02-14 | v1.0.0  | Initial baseline playbook with mandatory workflow, quality gates, and anti-patterns.                             | AI assistant |
