# Glossary Contract (Normative v1)

[<- Back to Contracts Registry](../README.md)

**Status**: NORMATIVE - active pre-stable line
**Version**: 1.0
**Stability**: Pre-stable single live line; rewrite in place until stabilization
**Consumers**: Engine, adapters, planner, state store, UI, contract authors
**Related Contracts**: [IWorkflowEngine.v1.md](./IWorkflowEngine.v1.md), [IProviderAdapter.v1.md](./IProviderAdapter.v1.md), [ExecutionSemantics.v1.md](./ExecutionSemantics.v1.md), [RunEvents.v1.md](./RunEvents.v1.md), [SignalsAndAuth.v1.md](./SignalsAndAuth.v1.md)

---

## Purpose and scope

This glossary defines canonical terminology and identifier semantics for the
active engine-runtime contract line.

- terms in this document are normative when marked as MUST or MUST NOT
- this glossary standardizes naming and term meaning; it does not replace full
  behavioral contracts
- git carries historical change context; the active docs tree carries one live
  truth only

## Canonical core terms

- **Run**: one workflow execution instance identified by `runId`
- **Plan**: declarative definition of workflow steps and execution logic
- **PlanRef**: opaque reference to externally stored execution plan plus
  integrity metadata
- **EngineRunRef**: provider-specific run handle used for commands and lookup,
  not the canonical read model
- **Run Event**: append-only lifecycle event persisted by append authority
- **Event Envelope**: canonical event metadata wrapper for correlation,
  sequencing, idempotency, attempts, and timestamps
- **Append Authority**: persistence authority that assigns `runSeq` and
  enforces append and idempotency constraints
- **Run Snapshot**: projected internal state for a run derived from the event
  stream
- **CanonicalRunStatus**: caller-visible run status projected from the event
  log plus snapshot; the only canonical lifecycle truth object
- **ProviderRunStatusView**: provider-live diagnostic observation used for
  enrichment only; not canonical lifecycle truth
- **RunStatusEnrichment**: engine-owned composition of `CanonicalRunStatus`
  plus `ProviderRunStatusView`
- **Signal**: external, operator, or system command requesting run mutation
- **SignalDecisionRecord**: persisted authorization and audit record for a
  signal request

## Canonical identifiers and semantics

### Correlation identifiers

The following identifiers are canonical across contracts and events:

- `tenantId`: tenant isolation boundary
- `projectId`: project scope within tenant
- `environmentId`: runtime environment scope
- `runId`: globally unique run identifier
- `signalId`: caller-supplied signal idempotency key component

Identifier rules:

- canonical identifier fields MUST be non-empty strings
- identifiers SHOULD be trimmed at transport boundaries
- identifiers MUST be treated as case-sensitive unless explicitly documented
  otherwise

### Attempt identifiers

- `logicalAttemptId` is the business-level retry counter and MUST drive
  idempotency derivation
- `engineAttemptId` is the infrastructure retry or restart counter and MUST NOT
  affect idempotency derivation

### Event sequencing and identity

- `runSeq` is the canonical monotonic sequence per `runId`
- `runSeq` MUST be assigned by append authority
- `idempotencyKey` is the canonical deduplication key for event append

## Status-model terms

### `CanonicalRunStatus`

- owned by the canonical read plane
- derived from persisted events and snapshot projection
- contains canonical `RunStatus` and canonical `RunSubstatus` only
- MUST NOT embed provider-scoped status tokens

### `ProviderRunStatusView`

- owned by the provider diagnostics plane
- contains provider-native diagnostic tokens such as `providerStatus`
- MUST NOT be treated as caller-visible lifecycle truth

### `RunStatusEnrichment`

- owned by the engine read boundary
- composes canonical truth plus provider diagnostics
- MUST NOT replace or rewrite canonical lifecycle meaning

## Naming policies

### Event naming

- event names MUST use PascalCase, for example `RunStarted` and `StepFailed`
- event names MUST NOT use transport- or handler-oriented prefixes

### Timestamp naming

- producer time MUST be named `emittedAt`
- append-authority time MUST be named `persistedAt`
- timestamps MUST be RFC 3339 UTC strings

### Identifier naming

- canonical identifier fields MUST use lowerCamelCase with `Id` suffix when the
  field is an identifier

### Status naming

Canonical run-status values are:

- `PENDING`
- `APPROVED`
- `RUNNING`
- `PAUSED`
- `COMPLETED`
- `FAILED`
- `CANCELLED`

Canonical run-substatus values are defined by the active contract line and
remain distinct from provider-native diagnostic strings.

## Contract invariants

1. canonical status truth comes from the event log plus snapshot projector
2. provider-live diagnostics never override canonical lifecycle truth
3. enrichment is explicit and opt-in
4. signal idempotency depends on canonical identifiers, not provider-local
   observation
5. event ordering authority is `runSeq`, not timestamp order

## Change log

- **1.0 (2026-04-11)**: Rewrote the active glossary line to define the three-model status boundary explicitly.
