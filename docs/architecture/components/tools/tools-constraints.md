---
title: Tools Constraints & Invariants
status: Draft
owner: Infra Domain
last_reviewed: 2026-03-28
---

# Tools Constraints & Invariants

## Constraints and Invariants

| Constraint / Invariant                                                    | Where Enforced                             | Description                                                                                                                                                  |
| ------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Must comply with CI/CD standards and infrastructure requirements          | ToolAggregate / CI pipeline governance     | All tools must conform to the coding and execution standards defined for the Infra domain before being accepted into `tools/`.                               |
| Only Infra domain, `infra/`, and `scripts/` may be direct dependents      | Architecture boundary policy               | `tools/` must not take runtime dependencies on application packages (`@dvt/engine`, `@dvt/contracts`, etc.); only infra-level abstractions are permitted.    |
| ToolAggregate is the sole entry point for tool execution in the aggregate | ToolAggregate design invariant             | OperationAggregates must not be directly invoked by `infra/` or `scripts/`; all tool execution routes through ToolAggregate.                                 |
| Operations tools must be idempotent where possible                        | OperationAggregate design guideline        | Running the same operations tool against the same target multiple times should produce consistent, safe outcomes to support safe retries in CI/CD pipelines. |
| Development tools must not modify production environments                 | ToolAggregate environment safety invariant | Tools in the `dev/` category must check the current environment context and refuse to execute against production targets.                                    |

## Validation Examples

- A development tool that attempts to connect to a production database is blocked by an environment guard check at startup.
- A tool that imports directly from `packages/@dvt/engine` is rejected at architecture boundary review; tools must remain at the infra layer.
- An operations tool that is not idempotent (e.g., inserts duplicate rows without checking for existence) is flagged during code review and must be corrected before merge.

## Key Files

- `tools/dev/`
- `tools/ops/`
- `tools/lib/`
