---
title: contracts Functionalities
status: Draft
owner: Shared Boundary Domain
last_reviewed: 2026-03-28
---

# contracts Functionalities

## Functionalities

| #   | Functionality            | Description                                                                                                                          |
| --- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Interface Definition     | Declares TypeScript interfaces (e.g., `IRunStateStore`, `ILineageSink`) that are implemented by adapter and domain packages.         |
| 2   | Event Schema Validation  | Provides Zod schemas for each versioned domain event, enabling runtime validation of event payloads at system boundaries.            |
| 3   | Type Sharing             | Exports shared types, enums, and value objects used consistently across engine, API, adapters, and web packages.                     |
| 4   | Contract Versioning      | Maintains explicit version suffixes (e.g., `.v1.ts`) on contract files to enable safe evolution without breaking existing consumers. |
| 5   | Cross-Domain Consistency | Enforces a single source of truth for all shared data shapes, preventing divergence between domains.                                 |

## Main Methods

- `validate(schema: ZodSchema, payload: unknown): ParsedPayload`: Validates a raw payload against the supplied Zod schema and returns the parsed, type-safe result or throws a `ContractSchemaViolation`.
- `registerInterface<T>(token: symbol, contract: T): void`: Registers a typed interface contract under a DI token for use by consuming packages.
- `resolveInterface<T>(token: symbol): T`: Resolves a previously registered interface contract by DI token, ensuring the correct implementation is used at runtime.

## Key Files

- `packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts`
- `packages/@dvt/contracts/src/events/`
- `packages/@dvt/contracts/src/index.ts`
