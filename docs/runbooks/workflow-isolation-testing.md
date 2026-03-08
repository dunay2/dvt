---
title: Workflow Isolation Testing Strategy
status: Active
owner: Platform / CI
last_reviewed: 2026-03-08
---

# Workflow Isolation Testing Strategy

Use this runbook when CI behavior is unclear because multiple GitHub Actions
workflows are failing or interfering at the same time.

The goal is to isolate one workflow, validate it independently, and avoid
changing several pipelines blindly.

## When To Use It

- a failing PR has multiple workflow failures at once;
- one workflow change may be masking another failure;
- a docs, contracts, or test workflow was recently modified and the blast radius
  is unclear.

## Procedure

1. Identify the first failing workflow and read its logs before editing
   anything.
2. Classify the failure:
   - metadata or policy failure;
   - docs structure failure;
   - test or build failure;
   - environment or credentials failure.
3. Reproduce the narrowest local command that matches that workflow.
4. Fix only that workflow path first.
5. Re-run or re-check only after the failure mode is understood.
6. Move to the next workflow only when the current one is either fixed or
   explicitly ruled out.

## Minimum Local Checks

- docs changes: `pnpm docs:sync`, `pnpm docs:quality:check`, `pnpm docs:doctor`
- contract changes: `pnpm validate:contracts`
- engine changes: `pnpm test:engine`
- adapter changes: `pnpm test:adapter-temporal` or `pnpm test:adapter-postgres`

## Exit Criteria

- one workflow failure has a named root cause;
- the local reproduction command is known;
- the corrective change is scoped to that workflow path;
- no speculative multi-workflow cleanup is bundled into the same fix.
