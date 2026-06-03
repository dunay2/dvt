---
title: Engine runtime contracts
status: Active
owner: Architecture / Engine
last_reviewed: 2026-04-13
---

# Engine runtime contracts

## Active pack

- [IWorkflowEngine.v1](./IWorkflowEngine.v1.md)
- [IProviderAdapter.v1](./IProviderAdapter.v1.md)
- [StartRunBoundary.v1](./start-run-boundary.v1.md)
- [StartRunProtocol.v1](./StartRunProtocol.v1.md)
- [RunEvents.v1](./RunEvents.v1.md)
- [ExecutionSemantics.v1](./ExecutionSemantics.v1.md)
- [SignalsAndAuth.v1](./SignalsAndAuth.v1.md)
- [Runtime provider vocabulary component](./runtime-provider-vocabulary-component.md)

Canonical consumer import for `IWorkflowEngine`:
`import type { IWorkflowEngine } from '@dvt/engine'`

Capability admission posture:
if a run requires capabilities and the target adapter omits
`capabilities()`, active engine admission rejects rather than degrades open.

## Related pages

- [Contracts registry](../README.md)
- [Run enrichment service](./IRunEnrichmentService.v1.md)
- [Start-run boundary component](./start-run-boundary-component.md)
- [Engine glossary](./GlossaryContract.v1.md)
- [Capabilities contracts](../capabilities/README.md)
- [Engine component home](../../index.md)
- [Event schemas](./events/index.md)
