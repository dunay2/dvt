---
title: Scripts Constraints & Invariants
status: Draft
owner: Infra Domain
last_reviewed: 2026-03-28
---

# Scripts Constraints & Invariants

## Constraints and Invariants

| Constraint / Invariant                                                        | Where Enforced                              | Description                                                                                                                                                 |
| ----------------------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Must comply with CI/CD standards and infrastructure requirements              | ScriptAggregate / CI pipeline governance    | All scripts must pass linting and format checks defined in the CI pipeline before being accepted into the `scripts/` directory.                             |
| Only Infra domain, `infra/`, and `tools/` may be direct dependents            | Architecture boundary policy                | `scripts/` must not take runtime dependencies on application packages (`@dvt/engine`, `@dvt/contracts`, etc.); only infra-level abstractions are permitted. |
| ScriptAggregate is the sole entry point for script execution in the aggregate | ScriptAggregate design invariant            | ValidationAggregates must not be directly invoked by `infra/` or `tools/`; all script execution routes through ScriptAggregate.                             |
| Script outputs must be idempotent for validation scripts                      | ValidationAggregate design invariant        | Running the same validation script against the same target multiple times must produce the same result; side effects are not permitted in validation paths. |
| CI/CD scripts must exit with correct status codes                             | Shell script convention enforced by CI gate | Scripts must exit 0 on success and non-zero on failure so CI pipelines can gate merges and deployments correctly.                                           |

## Validation Examples

- A validation script that mutates source files as a side effect is rejected during review; validation scripts are read-only by convention.
- A CI/CD script that exits 0 despite encountering an error is caught by the CI gate's output inspection step and treated as a failure.
- A script that imports directly from `packages/@dvt/engine` is rejected at architecture boundary review; scripts must not depend on application-layer packages.

## Key Files

- `scripts/ci/`
- `scripts/validate/`
- `scripts/lib/`
