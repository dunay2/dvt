---
title: Scripts Sequence
status: Draft
owner: Infra Domain
last_reviewed: 2026-03-28
---

# Scripts Sequence

## Main Flow: CI/CD Pipeline Execution

```mermaid
sequenceDiagram
  participant CI as CI/CD Pipeline (GitHub Actions)
  participant ScriptAggregate as scripts/ ScriptAggregate
  participant ValidationAggregate
  participant Tools as tools/
  participant Infra as infra/

  CI->>ScriptAggregate: runCICDScript(pipeline)
  ScriptAggregate->>ValidationAggregate: runValidationScript(target)
  ValidationAggregate-->>ScriptAggregate: ValidationResult
  ScriptAggregate->>Tools: invoke tooling support
  Tools-->>ScriptAggregate: tool output
  ScriptAggregate->>Infra: report environment readiness
  Infra-->>ScriptAggregate: ack
  ScriptAggregate-->>CI: ScriptResult (exit code + output)
```

## Global Flow Position

`scripts/` sits in the Infra domain as the automation backbone for CI/CD and validation workflows. It is invoked by the CI/CD pipeline (e.g., GitHub Actions workflows in `.github/`) during build, test, lint, and deploy phases. It calls into `tools/` for developer tooling operations and reports environment readiness to `infra/`. It has no runtime relationship with application-layer packages such as `@dvt/engine` or `@dvt/contracts` — it operates purely at the infrastructure and automation layer. The `infra/` layer provisions environments based on script-reported outcomes.

## Key Files

- `scripts/ci/`
- `scripts/validate/`
- `scripts/lib/`
- `.github/workflows/`
