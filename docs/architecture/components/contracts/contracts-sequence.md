---
title: contracts Sequence
status: Draft
owner: Shared Boundary Domain
last_reviewed: 2026-03-28
---

# contracts Sequence

## Main Flow: Event Payload Validation at a Domain Boundary

```mermaid
sequenceDiagram
  participant Engine as @dvt/engine
  participant Contracts as @dvt/contracts (EventContract)
  participant Adapter as @dvt/adapter-postgres

  Engine->>Contracts: validate(StepStartedSchema, rawPayload)
  Contracts->>Contracts: ZodSchema.safeParse(rawPayload)
  alt Payload valid
    Contracts-->>Engine: ParsedStepStartedEvent
    Engine->>Adapter: persistEvent(parsedEvent)
    Adapter-->>Engine: OK
  else Payload invalid
    Contracts-->>Engine: ContractSchemaViolation (field errors)
    Engine-->>Engine: reject and log violation
  end
```

## Global Flow Position

`@dvt/contracts` is a shared foundation package that flows outward to all other DVT components. It does not call any other DVT package — it has no runtime dependencies within the monorepo. Every package that needs to exchange typed data (engine, api, adapter-postgres, adapter-temporal, web) imports from contracts. It is the root of the dependency graph for shared types and sits upstream of all domain implementations.

## Key Files

- `packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts`
- `packages/@dvt/contracts/src/events/`
- `packages/@dvt/contracts/src/index.ts`
