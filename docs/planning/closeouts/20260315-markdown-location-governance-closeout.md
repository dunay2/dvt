---
slice: markdown-location-governance
date: 2026-03-15
last_reviewed: 2026-03-15
gap: docs-governance
author: AI (Codex)
---

# Closeout: Markdown Location Governance

## Think-First Analysis

### Problem summary

The repository does not currently block Markdown files from appearing inside
code directories such as `src/` and `test/`. That allows architecture notes,
reviews, and ad hoc prose to live next to implementation files instead of in
the canonical documentation tree under `docs/`.

### Root cause

Current governance checks focus on files that already live under `docs/`, but
they do not enforce a location policy for Markdown stored under `apps/**` and
`packages/**` code paths.

### Constraints and invariants

- `AGENTS.md`: work must start from the governance inventory, include
  think-first, and close with evidence.
- `docs/guides/ai-work-protocol.md`: canonical docs should be preferred over
  parallel notes; public Markdown belongs in the documentation tree.
- `docs/planning/status/governance-document-rule-inventory.md`: docs rules are
  enforced through repository scripts, package scripts, and GitHub workflows.
- `docs/CONTRIBUTING.md`: docs contributions must pass repository quality gates.

### Options considered

- Add a repo-wide ban on every Markdown file outside `docs/`.
- Add a targeted ban only for Markdown inside code directories, while keeping
  explicit repository-level exceptions such as root `README.md` and GitHub
  templates.
- Rely on convention only and move files manually when reviewers spot them.

### Selected option and rationale

Add a targeted governance check that forbids Markdown files inside code
directories under `apps/**` and `packages/**`, wire it into scripts and CI, and
document the rule. This matches the actual problem without breaking legitimate
repository-level Markdown surfaces.

### Rejected alternatives

Rejecting every Markdown file outside `docs/` would incorrectly block required
repository metadata such as `README.md`, `AGENTS.md`, and `.github/**`. Relying
on convention only would keep the failure mode invisible until after review.

## Pre-Implementation Brief

- Mode: Slim
- Scope: add a docs-governance checker for Markdown in code directories, wire
  it into package scripts and CI, and document the rule
- Touched files or paths: `scripts/check-markdown-locations.cjs`,
  `package.json`, `.github/workflows/ci.yml`,
  `.github/workflows/pr-quality-gate.yml`, `docs/CONTRIBUTING.md`,
  `docs/guides/testing-and-ci-capabilities.md`,
  `docs/planning/status/governance-document-rule-inventory.md`,
  `docs/planning/closeouts/20260315-markdown-location-governance-closeout.md`
- Expected outcome: PRs fail if Markdown appears in `src/`, `test/`, `tests/`,
  `cli/`, `schemas/`, or `generated/` under `apps/` or `packages/`
- Risks and mitigations: false positives on legitimate non-doc assets are
  mitigated by limiting the rule to code-directory segments rather than every
  Markdown file outside `docs/`
- Out-of-scope items: migrating all legacy package docs into `docs/`, changing
  root README policy, or rewriting existing docs structure
- Validation plan: run the new checker directly, run docs governance commands,
  and run `pnpm verify:prepush`
- Test coverage plan: verify the checker passes on the current tree and fails
  for forbidden paths using inline one-off checks against the script logic
- Libraries evaluated: None; a small repository-specific path-policy check is
  sufficient

## Changes made

| File                                                                                                                            | Change                                                                      | Why                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [scripts/check-markdown-locations.cjs](../../../scripts/check-markdown-locations.cjs)                                           | Added code-directory Markdown location gate                                 | Block prose from living under `apps/**` and `packages/**` code paths |
| [package.json](../../../package.json)                                                                                           | Added `docs:gov:locations` and wired it into `docs:ci` and `verify:prepush` | Enforce the rule locally and in standard validation flows            |
| [.github/workflows/ci.yml](../../../.github/workflows/ci.yml)                                                                   | Added Markdown location policy step                                         | Fail CI when Markdown appears in code directories                    |
| [.github/workflows/pr-quality-gate.yml](../../../.github/workflows/pr-quality-gate.yml)                                         | Added Markdown location policy step                                         | Keep manual PR quality gate aligned with local enforcement           |
| [docs/CONTRIBUTING.md](../../CONTRIBUTING.md)                                                                                   | Documented the rule and allowed repository-level exceptions                 | Make contributor expectations explicit                               |
| [docs/guides/testing-and-ci-capabilities.md](../../guides/testing-and-ci-capabilities.md)                                       | Added `pnpm docs:gov:locations`                                             | Expose the command in the canonical validation guide                 |
| [docs/planning/status/governance-document-rule-inventory.md](../status/governance-document-rule-inventory.md)                   | Recorded the new enforcement surface                                        | Keep the governance inventory aligned with active gates              |
| [docs/archive/working-notes/engine-source-tree-placeholders.md](../../archive/working-notes/engine-source-tree-placeholders.md) | Preserved removed engine placeholder README content                         | Keep the information under `docs/` while clearing code directories   |
| [docs/architecture/engine/dev/determinism-tooling.md](../../architecture/engine/dev/determinism-tooling.md)                     | Absorbed useful determinism README content                                  | Preserve active guidance in the canonical doc                        |
| `packages/@dvt/engine/cli/src/README.md`                                                                                        | Removed from code directory                                                 | Code directories must stay prose-free                                |
| `packages/@dvt/engine/schemas/commands/README.md`                                                                               | Removed from code directory                                                 | Code directories must stay prose-free                                |
| `packages/@dvt/engine/schemas/envelope/README.md`                                                                               | Removed from code directory                                                 | Code directories must stay prose-free                                |
| `packages/@dvt/engine/schemas/events/README.md`                                                                                 | Removed from code directory                                                 | Code directories must stay prose-free                                |
| `packages/@dvt/engine/src/composition/README.md`                                                                                | Removed from code directory                                                 | Code directories must stay prose-free                                |
| `packages/@dvt/engine/src/domain/README.md`                                                                                     | Removed from code directory                                                 | Code directories must stay prose-free                                |
| `packages/@dvt/engine/src/generated/README.md`                                                                                  | Removed from code directory                                                 | Code directories must stay prose-free                                |
| `packages/@dvt/engine/test/determinism/README.md`                                                                               | Removed from code directory                                                 | Code directories must stay prose-free                                |

## Libraries evaluated

None.

## Docs synced

- [x] [docs/planning/status/governance-document-rule-inventory.md](../status/governance-document-rule-inventory.md) - recorded the new enforcement surface
- [x] [docs/CONTRIBUTING.md](../../CONTRIBUTING.md) - documented the location rule for contributors
- [x] [docs/guides/testing-and-ci-capabilities.md](../../guides/testing-and-ci-capabilities.md) - added the new validation command
- [x] [docs/planning/closeouts/20260315-markdown-location-governance-closeout.md](./20260315-markdown-location-governance-closeout.md) - recorded the slice evidence

## Test evidence

| Command                                                                                                                                                                                                                                                                                                                                                                                                                              | Result                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| `pnpm docs:sync`                                                                                                                                                                                                                                                                                                                                                                                                                     | Passed                                               |
| `pnpm docs:sync:check`                                                                                                                                                                                                                                                                                                                                                                                                               | Passed                                               |
| `pnpm docs:gov:locations`                                                                                                                                                                                                                                                                                                                                                                                                            | Passed                                               |
| `node scripts/check-markdown-locations.cjs` with temporary `temp-md-check/packages/@dvt/example/src/forbidden.md`                                                                                                                                                                                                                                                                                                                    | Failed as expected, then temp directory removed      |
| `pnpm docs:quality:check`                                                                                                                                                                                                                                                                                                                                                                                                            | Passed with pre-existing warnings outside this slice |
| `pnpm docs:canonical:check`                                                                                                                                                                                                                                                                                                                                                                                                          | Passed                                               |
| `pnpm exec markdownlint-cli2 "docs/planning/closeouts/20260315-markdown-location-governance-closeout.md" "docs/CONTRIBUTING.md" "docs/guides/testing-and-ci-capabilities.md" "docs/planning/status/governance-document-rule-inventory.md" "docs/archive/working-notes/engine-source-tree-placeholders.md" "docs/architecture/engine/dev/determinism-tooling.md" --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc` | Passed                                               |
| `pnpm verify:prepush`                                                                                                                                                                                                                                                                                                                                                                                                                | Passed                                               |

## Debt introduced

None.
