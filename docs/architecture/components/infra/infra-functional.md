---
title: infra Functionalities
status: Draft
owner: Infra Domain
last_reviewed: 2026-03-28
---

# infra Functionalities

## Functionalities

| #   | Functionality            | Description                                                                                               |
| --- | ------------------------ | --------------------------------------------------------------------------------------------------------- |
| 1   | Environment Provisioning | Sets up and configures the DVT runtime environment, ensuring all services and dependencies are available. |
| 2   | CI/CD Support            | Provides scripts and tooling to support continuous integration and continuous delivery pipelines.         |
| 3   | Script Management        | Stores, organises, and executes infra-level scripts for validation and automation tasks.                  |
| 4   | Tool Management          | Registers and manages development and operations tools consumed by the infra layer.                       |
| 5   | Infra Status Reporting   | Reports the current provisioning and operational status back to the Infra Domain.                         |

## Main Methods

- `InfraAggregate.provisionEnvironment()`: Triggers full environment setup, coordinating scripts and tools.
- `InfraAggregate.manageCICD()`: Configures and maintains CI/CD pipeline support resources.
- `InfraAggregate.reportInfraStatus()`: Collects and publishes the current infra health and status.
- `ScriptAggregate.storeScript(script)`: Persists a new CI/CD or validation script.
- `ScriptAggregate.runScript(scriptId)`: Executes a stored script and captures its output.
- `ScriptAggregate.reportScriptStatus(scriptId)`: Returns the current execution status for a given script.
- `ToolAggregate.storeTool(tool)`: Registers a development or operations tool in the aggregate.
- `ToolAggregate.manageTool(toolId)`: Updates or removes a registered tool.
- `ToolAggregate.reportToolStatus(toolId)`: Returns the operational status of a registered tool.

## Key Files

- `infra/scripts/` — Script storage and execution managed by ScriptAggregate
- `infra/tools/` — Tool registry managed by ToolAggregate
