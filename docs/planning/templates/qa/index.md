---
title: QA Prompt Templates
status: Active
owner: Product / Architecture / QA / Docs
last_reviewed: 2026-04-04
planning_type: reference
---

# QA Prompt Templates

Reusable prompt templates for hard, evidence-first QA reviews.

## Index

- [Global System QA Check Prompt](TEMPLATE_QA_GLOBAL_CHECK_PROMPT.md)
- [Current Task QA Check Prompt](TEMPLATE_QA_CURRENT_TASK_CHECK_PROMPT.md)
- [QA Artifact Example Template](TEMPLATE_QA_ARTIFACT_EXAMPLE.md)

## Usage Rule

- `TEMPLATE_QA_ARTIFACT_EXAMPLE.md` is the default artifact shape for outputs
  produced from the QA prompt templates in this folder unless a stricter
  governed destination format overrides it.
- QA reviews should assess tests with a global system view and decide
  explicitly whether harnesses or grouping by test type are needed for
  meaningful confidence.

## Validation

- `pnpm qa:artifact:check` validates changed QA artifact docs in governed paths.
- `pnpm verify:prepush` now includes `qa:artifact:check` in the local readiness gate.
