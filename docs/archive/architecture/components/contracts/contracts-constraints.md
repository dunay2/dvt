---
title: contracts Constraints & Invariants
status: Draft
owner: Shared Boundary Domain
last_reviewed: 2026-03-28
---

# contracts Constraints & Invariants

## Constraints and Invariants

| Constraint / Invariant                                          | Where Enforced                               | Description                                                                                                                                              |
| --------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Must comply with contract governance and versioning             | ADR process / file naming convention         | All contract files must carry an explicit version suffix (e.g., `.v1.ts`); breaking changes require a new version file and ADR documentation.            |
| Must not leak domain-specific logic                             | Package boundary (`packages/@dvt/contracts`) | This package may only export interface definitions, types, enums, and Zod schemas — no business logic, service classes, or adapter code may reside here. |
| Used by multiple domains without creating circular dependencies | TypeScript project references                | Contracts is a dependency of engine, api, and web; none of those packages may be imported back into contracts.                                           |
| Event schemas must remain backwards-compatible within a version | EventContract Zod schema                     | Adding optional fields to an existing versioned event schema is allowed; removing or changing required fields requires a new version.                    |
| All public exports must be re-exported from the package index   | `packages/@dvt/contracts/src/index.ts`       | Consuming packages must be able to import everything through the package root, not through deep internal paths.                                          |

## Validation Examples

- Passing a `StepStarted` payload missing the required `stepId` field to the Zod schema raises a `ContractSchemaViolation` with field-level error details.
- Importing a domain service class from `@dvt/contracts` is a lint/type-check violation that is caught in CI.
- Creating a new breaking change to `IRunStateStore` without creating a `IRunStateStore.v2.ts` file is flagged in the ADR review process.

## Key Files

- `packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts`
- `packages/@dvt/contracts/src/events/`
- `packages/@dvt/contracts/src/index.ts`
