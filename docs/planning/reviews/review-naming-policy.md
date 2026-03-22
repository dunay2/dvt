---
title: Review Naming Policy
status: Active
owner: Product / Architecture / Docs
last_reviewed: 2026-03-22
planning_type: review
---

# Review Naming Policy

Normative naming rule for files under `docs/planning/reviews/`.

## Required File Pattern

Every review filename MUST follow:

`YYYYMMDD-<topic>-review.md`

Where:

- `YYYYMMDD` is the effective review date.
- `<topic>` is lowercase kebab-case and concise.
- `review` is a mandatory suffix for discoverability and filtering.

Examples:

- `20260322-ddd-hexagonal-port-audit-review.md`
- `20260315-workflow-helpers-architecture-review.md`
- `20260307-architecture-doc-consolidation-matrix-review.md`

## Migration Rule

Legacy names with uppercase, symbols, underscores, or mixed date formats must
be renamed to this pattern and all references updated in the same PR.

## Indexing Rule

After renaming or adding reviews, run:

- `pnpm docs:sync`

to regenerate `docs/planning/reviews/index.md`.
