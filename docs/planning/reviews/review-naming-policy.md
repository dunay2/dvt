---
title: Review Naming Policy
status: Active
owner: Product / Architecture / Docs
last_reviewed: 2026-09-15
planning_type: review
---

# Review Naming Policy

Normative naming rule for files under `docs/planning/reviews/`.

## Domain Folder Rule

Active reviews may be grouped under domain subdirectories inside
`docs/planning/reviews/` when the grouping reflects the canonical planning
domains or an operational review cluster.

Examples:

- `docs/planning/reviews/ci-and-delivery/20260401-ci-process-review.md`
- `docs/planning/reviews/execution-runtime/20260326-s03-hard-qa-review.md`

Delete reviews that no longer serve an active responsibility after reconciling
consumers and current evidence obligations. Git preserves their history; do not
move them to a documentation archive or create a historical replacement page.

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

Rename legacy names only for reviews that remain active. Update all references
in the same PR. Delete obsolete reviews instead of renaming them for retention.

## Indexing Rule

After renaming, adding, or deleting reviews, run:

- `pnpm docs:sync`

to regenerate `docs/planning/reviews/index.md`.

That reviews index is a generated local/CI artifact and must not be committed.
