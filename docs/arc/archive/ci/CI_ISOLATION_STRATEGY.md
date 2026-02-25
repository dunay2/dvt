# CI Workflow Isolation Strategy (Archive)

This archived note documents the historical workflow-isolation approach used to debug CI failures incrementally.

## Historical Context

At that time, workflows were enabled one by one to isolate failures:

1. `ci.yml`
2. `test.yml`
3. `contracts.yml`
4. `golden-paths.yml`

## Historical Procedure

1. Run/observe one workflow in GitHub Actions.
2. If it fails, inspect logs and fix locally.
3. Re-enable the next workflow only after the current one passes.
4. Repeat until all workflows are active and green.

## Notes

- This document is retained for historical traceability.
- Current CI behavior should be verified from active workflows under `.github/workflows/`.
