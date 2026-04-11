# Engine Contracts

## Purpose

This is the component-level landing page for engine contract families.

The active engine-runtime boundary is published as one live `v1` pack. Other
contract families under this component may evolve on their own timelines, but
they do not publish a second active engine-runtime truth.

## Engine-runtime contract pack

Read these first for the active runtime boundary:

1. [Contracts registry](./README.md)
2. [Workflow engine interface](./engine/IWorkflowEngine.v1.md)
3. [Run enrichment service](./engine/IRunEnrichmentService.v1.md)
4. [Provider adapter contract](./engine/IProviderAdapter.v1.md)
5. [Run events](./engine/RunEvents.v1.md)
6. [Execution semantics](./engine/ExecutionSemantics.v1.md)
7. [Signals and authorization](./engine/SignalsAndAuth.v1.md)
8. [Versioning policy](./VERSIONING.md)

## Companion entrypoints

- [Engine runtime contracts index](./engine/index.md)
- [Capabilities contracts](./capabilities/README.md)
- [State store docs](./state-store/README.md)
- [Security contracts](./security/IAuthorization.v1.md)
- [Engine glossary](./engine/GlossaryContract.v1.md)

## Canonical schemas and assets

- [Capabilities schema](./capabilities/capabilities.schema.json)
- [Adapter capabilities matrix](./capabilities/adapters.capabilities.json)
- [Validation report schema](./capabilities/validation-report.schema.json)
- [Logical graph schema](./schemas/logical-graph.schema.json)
- [Provenance event schema](./schemas/provenance-event.schema.json)

## Navigation

- [Engine component home](../index.md)
- [Core](../architecture/core.md)
- [Adapters](../adapters/index.md)
- [Workflows](../architecture/workflows.md)
- [Security](../security/index.md)
- [Operations](../ops/index.md)
- [Canonical C4 architecture](../architecture/c4-engine.md)
