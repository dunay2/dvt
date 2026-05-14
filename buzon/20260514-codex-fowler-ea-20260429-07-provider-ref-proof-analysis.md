---
title: Fowler analysis for EA-20260429-07 start-run providerRef proof
status: Active
date: 2026-05-14
owner: codex
---

# Fowler Analysis For EA-20260429-07 Start-Run ProviderRef Proof

## Finding

The engine already implements the intended no-estimate `startRun` ordering:
`adapter.startRun` returns an `EngineRunRef`, the intent store records it as
`DISPATCHED`, and `bootstrapRunTx` persists metadata with that same provider
reference. On bootstrap failure, compensation uses `adapter.cancelRun` against
the returned provider reference and resolves the intent best-effort.

The missing piece was proof strength. Existing tests asserted compensation with
a boolean flag and intent state, but they did not assert that the provider
reference persisted or cancelled was exactly the adapter-returned value.

## Fowler View

This is a `Compensating Transaction` around an external side effect. The engine
cannot make the provider start and local bootstrap one atomic transaction, so it
uses ADR-0030's intent log plus a compensating cancel operation. Mature systems
make the compensation target explicit and test it as part of the distributed
boundary contract.

## Applied Decision

No production code change is needed. The selected slice strengthens the
semantic proof:

- no-estimate bootstrap stores the exact provider reference returned by
  `adapter.startRun`;
- bootstrap failure cancels the exact returned provider reference;
- failed bootstrap leaves no local metadata residue;
- the intent reaches `RESOLVED` with the returned provider reference recorded.

## Future Lesson

Boolean compensation assertions are weak around distributed side effects. Tests
should assert the identity of the compensated object, not only that a
compensation hook ran.
