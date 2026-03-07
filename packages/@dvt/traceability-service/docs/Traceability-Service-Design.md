# Traceability Service (DVT+) - Design

## Objective

Transform ADR traceability from a manual convention into an automated governance subsystem.

## Core responsibilities

- Parse governed file headers (baseline/decision/consequence/version/date)
- Validate against ADR catalog (`docs/adr`) and status `Accepted`
- Generate manifest (module release unit)
- Emit deterministic governance artifacts for CI and release workflows

## Deployment modes

- **CLI-first** for CI (MVP)
- Optional always-on API later (webhooks, dashboard)

## OSS dependencies

- glob scanning: https://www.npmjs.com/package/glob
