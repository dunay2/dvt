---
slice: 20260315-review-markdown-relocation
date: 2026-03-15
gap: docs-governance
author: AI (GPT-5)
---

# Closeout: Review Markdown Relocation

## Think-First Analysis

### Problem summary

Several review and architecture-analysis Markdown files still live under
`packages/**/src/**`, which violates the repository policy that prose
documentation must not live inside code directories.

### Root cause

The review documents were written close to the code they discussed before the
markdown-location governance rule was enforced. Later documentation copies were
added under `docs/`, but the original files remained in code paths.

### Constraints and invariants

- `DOCS_README.md` and the governance inventory require canonical documentation
  to live under `docs/`.
- `scripts/check-markdown-locations.cjs` enforces that `.md` files must not live
  under code directory segments such as `src`.
- `AGENTS.md` and `ai-work-protocol.md` require a clean, validated slice with a
  mandatory closeout file.

### Options considered

- Relax the checker to allow review files under `src`.
  Rejected because it defeats the stated governance rule.
- Move the review files to `docs/planning/reviews/` and update references.
  Selected because it matches the canonical docs structure already used for
  non-normative reviews.
- Delete the source-tree reviews without preserving them under `docs/`.
  Rejected because the content is still referenced and useful.

### Selected option and rationale

Keep all review Markdown under `docs/planning/reviews/`, remove duplicates from
code directories, and update any references that still point to `packages/**`.

### Rejected alternatives

- Adding allowlists to the location checker.
- Leaving duplicate copies in both `docs/` and `src/`.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - relocate remaining review `.md` files from code directories to
    `docs/planning/reviews/`
  - update references and review indexes
  - validate the markdown-location checker
- Touched files or paths:
  - `docs/planning/reviews/**`
  - `docs/evidence/**` where references still point to code paths
  - delete matching `packages/**/src/**/*.md` review files
- Expected outcome:
  - no review markdown remains under `src/`
  - the location checker passes
- Risks and mitigations:
  - risk: break references to moved files
    mitigation: repo-wide grep and docs sync after relocation
- Out-of-scope items:
  - changing the review content itself
  - changing code behavior
- Validation plan:
  - `pnpm docs:gov:locations`
  - `pnpm docs:sync`
  - `pnpm docs:quality:check`
  - `pnpm docs:canonical:check`
  - `markdownlint-cli2` on touched docs
- Test coverage plan:
  - negative path covered by the checker itself: moved files should disappear
    from `src` scans
- Libraries evaluated:
  - None; this is a documentation-governance relocation, not a library problem.

## Changes made

| File                                                                       | Change                                    | Why                                                         |
| -------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------- |
| `docs/planning/reviews/PostgresStateStoreAdapter_Refactor_Review.md`       | Added canonical review copy under `docs/` | Remove dependence on code-directory prose                   |
| `docs/planning/reviews/StartRunIntentSchemaManager_Architecture_Review.md` | Added canonical review copy under `docs/` | Keep review content in approved documentation tree          |
| `docs/planning/reviews/RunPlanWorkflow_Architecture_Review.md`             | Added canonical review copy under `docs/` | Keep workflow architecture review outside `src/`            |
| `docs/planning/reviews/WorkflowHelpers_Architecture_Review.md`             | Added canonical review copy under `docs/` | Keep helper architecture review outside `src/`              |
| `docs/planning/reviews/PostgresStartRunIntentStore_QA_Review.md`           | Added canonical review copy under `docs/` | Preserve the QA review while removing `src/` copies locally |
| `docs/planning/reviews/index.md`                                           | Regenerated review index                  | Make the relocated reviews discoverable                     |
| `docs/planning/index.md`                                                   | Regenerated planning index                | Keep planning navigation aligned                            |
| `docs/planning/closeouts/20260315-review-markdown-relocation-closeout.md`  | Added mandatory closeout                  | Record think-first and validation evidence                  |

## Libraries evaluated

None.

## Docs synced

- [x] `docs/planning/reviews/index.md` - review index updated through docs sync
- [x] `docs/planning/index.md` - planning index updated through docs sync
- [x] `docs/planning/closeouts/20260315-review-markdown-relocation-closeout.md` - mandatory closeout recorded

## Test evidence

| Command                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Result                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `pnpm docs:sync`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | PASS                                                           |
| `pnpm exec markdownlint-cli2 "docs/planning/reviews/PostgresStateStoreAdapter_Refactor_Review.md" "docs/planning/reviews/StartRunIntentSchemaManager_Architecture_Review.md" "docs/planning/reviews/RunPlanWorkflow_Architecture_Review.md" "docs/planning/reviews/WorkflowHelpers_Architecture_Review.md" "docs/planning/reviews/PostgresStartRunIntentStore_QA_Review.md" "docs/planning/closeouts/20260315-review-markdown-relocation-closeout.md" --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc` | PASS                                                           |
| `pnpm docs:quality:check`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | PASS with pre-existing non-English warnings outside this slice |
| `pnpm docs:canonical:check`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | PASS                                                           |

## Debt introduced

None.
