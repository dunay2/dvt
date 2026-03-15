# IProviderAdapter Contract (Archived v1.0)

[<- Back to Contracts Registry](../README.md)

**Status**: ARCHIVED - superseded by [IProviderAdapter.v1.1.md](./IProviderAdapter.v1.1.md)
**Version**: 1.0
**Stability**: Historical reference only - do not use for new implementations
**Scope**: Provider adapter boundary between engine core and execution backends
**Superseded by**: [IProviderAdapter.v1.1.md](./IProviderAdapter.v1.1.md) (2026-03-15)
**Phase**: US-1.0 baseline

---

## Purpose

Baseline provider adapter contract covering required lifecycle operations only.

This version did not include:

- Capability declaration (`capabilities?()`).
- Deterministic ref estimation (`estimateRunRef?()`).
- Reverse run lookup (`lookupRunRef?()`).

These were added in v1.1 to support capability gating (ADR-0030 pre-bootstrap
path) and intent reconciliation.

---

## Contract Surface (v1.0)

```ts
export interface IProviderAdapter {
  readonly provider: EngineRunRef['provider'];

  startRun(planRef: PlanRef, ctx: RunContext): Promise<EngineRunRef>;
  cancelRun(runRef: EngineRunRef): Promise<void>;
  getRunStatus(runRef: EngineRunRef): Promise<RunStatusSnapshot>;
  signal(runRef: EngineRunRef, request: SignalRequest): Promise<void>;

  // Optional - health probe
  ping?(): Promise<void>;
}
```

---

## Invariants (v1.0)

- **INV-PA-1**: `provider` is immutable per adapter instance.
- **INV-PA-2**: `startRun` returns `EngineRunRef.provider === adapter.provider`.
- **INV-PA-3**: status mapping is deterministic for the same provider state input.
- **INV-PA-4**: lifecycle methods are safe under retries (idempotent or retry-tolerant at boundary).

---

## Change Log

| Version | Date       | Author      | Summary                                                             |
| ------- | ---------- | ----------- | ------------------------------------------------------------------- |
| 1.0     | 2026-03-15 | Engineering | Initial normative baseline with required lifecycle operations only. |
