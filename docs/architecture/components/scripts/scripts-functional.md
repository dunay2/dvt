---
title: Scripts Functionalities
status: Draft
owner: Infra Domain
last_reviewed: 2026-03-28
---

# Scripts Functionalities

## Functionalities

| #   | Functionality             | Description                                                                                                                     |
| --- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | CI/CD Pipeline Scripts    | Provides shell and Node.js scripts that automate build, test, lint, and deploy steps in the CI/CD pipeline.                     |
| 2   | Validation Scripts        | Supplies scripts that validate code, contracts, migrations, and configuration against defined standards before merge or deploy. |
| 3   | Infra Environment Support | Delivers scripts consumed by the `infra/` layer for environment provisioning, setup, and teardown tasks.                        |
| 4   | Tooling Integration       | Integrates with `tools/` to expose combined developer-facing workflows that chain validation and CI/CD steps.                   |
| 5   | Script Status Reporting   | Aggregates and reports the execution status of all managed scripts back to the Infra domain for observability.                  |

## Main Methods

- `runCICDScript(pipeline: CIPipeline): ScriptResult`: Executes a CI/CD pipeline script for the specified pipeline configuration, returning the execution result.
- `runValidationScript(target: string): ValidationResult`: Runs the appropriate validation script for a given target (e.g., contract file, migration, config), returning pass/fail with detail.
- `reportScriptStatus(): ScriptStatus`: Returns the current aggregated status of all managed scripts for Infra domain observability.
- `storeValidationScript(script: Script): void`: (ValidationAggregate) Registers a new validation script within the aggregate for managed execution.
- `manageValidationOperations(): void`: (ValidationAggregate) Coordinates the sequencing and dependency resolution of validation scripts.

## Key Files

- `scripts/ci/`
- `scripts/validate/`
- `scripts/lib/`
