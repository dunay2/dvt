# Engine Contract Types

TypeScript type definitions extracted from normative contract documentation.

## Overview

This directory contains TypeScript types that implement the interfaces defined in the DVT engine's normative contracts:

- **IWorkflowEngine.v1.md** - Workflow engine interface and operations
- **ExecutionSemantics.v1.md** - Execution semantics and event model
- **State Store Contract** - Storage-agnostic state store interface

## Files

### `contracts.ts`

Core workflow engine types from IWorkflowEngine.v1.md:

- `IWorkflowEngine` - Main workflow engine interface
- `IAuthorization` - Signal authorization interface
- `EngineRunRef` - Polymorphic engine run reference (Temporal/Conductor)
- `SignalType` - Signal type enumeration
- `SignalRequest` - Signal request payload
- `SignalDecisionRecord` - Authorization and audit record
- `RunContext` - Workflow run context
- `PlanRef` - Execution plan reference
- `ExecutionPlan` - Execution plan structure
- `QueryRequest` - Query request payload
- `RunStatus` - Run status enumeration
- `RunStatusSnapshot` - Current run status snapshot
- `ValidationReport` - Plan validation report

### `artifacts.ts`

Artifact and secret types from ExecutionSemantics.v1.md § 2:

- `ArtifactRef` - Reference to externally stored artifact
- `StepOutput` - Output from step execution
- `StepError` - Error information for failed steps
- `SecretRef` - Reference to secret (never contains actual values)
- `ISecretsProvider` - Interface for resolving secret references

### `state-store.ts`

State store types from State Store Contract and ExecutionSemantics.v1.md:

- `IRunStateStore` - Core state store interface
- `StateStoreAdapter` - Type alias for state store implementations
- `SnapshotProjector` - Interface for projecting snapshots from events
- `CanonicalEngineEvent` - Canonical event structure
- `AppendResult` - Result of appending an event (re-exported from core/types.ts)
- `OutboxEvent` - Outbox event for external delivery (re-exported from core/types.ts)
- `RunSnapshot` - Run snapshot projection
- `StepSnapshot` - Step snapshot projection
- `WorkflowState` - Alias for RunSnapshot
- `StepStatus` - Step status enumeration
- `FetchEventsOptions` - Options for fetching events
- `IRunQueueReconciler` - Interface for run queue reconciliation

## Usage

```typescript
import {
  IWorkflowEngine,
  EngineRunRef,
  ExecutionPlan,
  RunContext,
  IRunStateStore,
  CanonicalEngineEvent,
  ArtifactRef,
} from '@dvt/engine';

// Implement workflow engine
class TemporalAdapter implements IWorkflowEngine {
  async startRun(plan: ExecutionPlan, context: RunContext): Promise<EngineRunRef> {
    // Implementation
  }
  // ... other methods
}

// Implement state store adapter
class SnowflakeStateStore implements IRunStateStore {
  async appendEvent(event: CanonicalEngineEvent): Promise<AppendResult> {
    // Implementation
  }
  // ... other methods
}
```

## Contract References

All types include JSDoc documentation with references to the source contract sections:

- `@see IWorkflowEngine.v1.md § X.Y` - Reference to IWorkflowEngine contract
- `@see ExecutionSemantics.v1.md § X` - Reference to Execution Semantics contract
- `@see State Store Contract § X` - Reference to State Store contract

## Versioning

These types follow the version of their source contracts:

- IWorkflowEngine types: v1.0
- Execution Semantics types: v1.1
- State Store types: v1.0

Breaking changes to contracts require a version bump and may result in new type files (e.g., `contracts.v2.ts`).

## Contributing

When updating these types:

1. Ensure changes align with the normative contract documentation
2. Update JSDoc references to point to correct contract sections
3. Run `npm run type-check` to verify TypeScript compilation
4. Run `npm run lint` to verify code style
5. Update this README if adding new files or significant type changes
