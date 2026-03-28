---
title: infra Constraints & Invariants
status: Draft
owner: Infra Domain
last_reviewed: 2026-03-28
---

# infra Constraints & Invariants

## Constraints and Invariants

| Constraint / Invariant                               | Where Enforced          | Description                                                                                                       |
| ---------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Must comply with infrastructure standards            | InfraAggregate          | All provisioning and CI/CD operations must conform to the established infrastructure standards of the DVT system. |
| Only interacts with Infra Domain, scripts, and tools | InfraAggregate boundary | InfraAggregate must not reach into other domains; cross-domain communication is forbidden.                        |
| Scripts must be stored before execution              | ScriptAggregate         | A script cannot be run unless it has been registered and stored within the ScriptAggregate.                       |
| Tools must be registered before use                  | ToolAggregate           | A tool must be registered via `storeTool` before it can be managed or its status queried.                         |
| Infra status must reflect current provisioning state | InfraAggregate          | Reported status must always be derived from the live state of the environment, not cached or stale data.          |

## Validation Examples

- Attempting to execute an unregistered script raises a `ScriptNotFoundError` from ScriptAggregate.
- Calling `reportToolStatus` on an unregistered toolId returns a `ToolNotRegisteredError` rather than a partial result.
- Provisioning operations that fail mid-way must leave the environment in a known, recoverable state — partial provisioning is not considered valid.
- CI/CD pipeline scripts must pass linting before being stored in ScriptAggregate.

## Key Files

- `infra/scripts/` — Script storage and validation
- `infra/tools/` — Tool registry and status management
