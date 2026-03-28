---
title: Tools Functionalities
status: Draft
owner: Infra Domain
last_reviewed: 2026-03-28
---

# Tools Functionalities

## Functionalities

| #   | Functionality         | Description                                                                                                                      |
| --- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Development Tooling   | Provides tools that support local development workflows — code generation, workspace bootstrapping, and local environment setup. |
| 2   | Operations Tooling    | Supplies tools for production and staging operations — database migrations, environment inspection, and deployment helpers.      |
| 3   | CI/CD Support         | Exposes tooling consumed by `scripts/` during CI/CD pipeline execution to perform build-time and deploy-time operations.         |
| 4   | Infra Integration     | Delivers tools used by `infra/` for environment provisioning and infrastructure lifecycle management.                            |
| 5   | Tool Status Reporting | Aggregates and reports the execution status of all managed tools back to the Infra domain for observability.                     |

## Main Methods

- `runDevelopmentTool(tool: DevTool): ToolResult`: Executes a development-facing tool for the specified configuration, returning the execution result.
- `runOperationsTool(tool: OpsTool): ToolResult`: Executes an operations tool for the specified target, returning the execution result.
- `reportToolStatus(): ToolStatus`: Returns the current aggregated status of all managed tools for Infra domain observability.
- `storeOperationTool(tool: Tool): void`: (OperationAggregate) Registers a new operation tool within the aggregate for managed execution.
- `manageOperationLogic(): void`: (OperationAggregate) Coordinates the sequencing and dependency resolution of operation tools.

## Key Files

- `tools/dev/`
- `tools/ops/`
- `tools/lib/`
