# Engine Contracts Registry

Source path: `docs/architecture/components/engine/contracts`

This registry publishes one live engine-runtime contract pack.

## Active engine-runtime contract pack

Read these in order:

1. [IWorkflowEngine.v1](./engine/IWorkflowEngine.v1.md)
2. [IProviderAdapter.v1](./engine/IProviderAdapter.v1.md)
3. [RunEvents.v1](./engine/RunEvents.v1.md)
4. [ExecutionSemantics.v1](./engine/ExecutionSemantics.v1.md)
5. [SignalsAndAuth.v1](./engine/SignalsAndAuth.v1.md)

## Companion entrypoints

- [Contracts landing page](./index.md)
- [Engine core contracts index](./engine/index.md)
- [Run enrichment service](./engine/IRunEnrichmentService.v1.md)
- [Event schemas](./engine/events/index.md)
- [Capabilities contracts](./capabilities/README.md)
- [State store docs](./state-store/README.md)
- [Engine component home](../index.md)

## Operating rule

The repository is pre-stable for this boundary:

- one live `v1` line only
- no redirect, `reference`, `v1.1`, `v2`, or migration companion for the same
  active engine-runtime topic
- git keeps the history; the active docs tree keeps one truth

## Generated contract inventory

This inventory is derived from current files. The active pack and operating
rule above remain the entrypoints; each document retains its own lifecycle.

<!-- contract-index:start -->

| Area         | Contract                                                                                          | Version | Lifecycle | Type      | Path                                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------- | ------- | --------- | --------- | ---------------------------------------------------------------------------------------------------------------- |
| capabilities | [Adapters Capabilities](./capabilities/adapters.capabilities.json)                                | v1      | DRAFT     | Schema    | [capabilities/adapters.capabilities.json](./capabilities/adapters.capabilities.json)                             |
| capabilities | [Capability Enum](./capabilities/capabilities.schema.json)                                        | v1      | DRAFT     | Schema    | [capabilities/capabilities.schema.json](./capabilities/capabilities.schema.json)                                 |
| capabilities | [Engine Capabilities](./capabilities/index.md)                                                    | v1      | DRAFT     | Core      | [capabilities/index.md](./capabilities/index.md)                                                                 |
| capabilities | [ValidationReport](./capabilities/validation-report.schema.json)                                  | v1      | DRAFT     | Schema    | [capabilities/validation-report.schema.json](./capabilities/validation-report.schema.json)                       |
| engine       | [Engine runtime contracts](./engine/index.md)                                                     | v1      | DRAFT     | Core      | [engine/index.md](./engine/index.md)                                                                             |
| engine       | [Execution Semantics](./engine/ExecutionSemantics.v1.md)                                          | v1.0    | ACTIVE    | Core      | [engine/ExecutionSemantics.v1.md](./engine/ExecutionSemantics.v1.md)                                             |
| engine       | [Glossary](./engine/GlossaryContract.v1.md)                                                       | v1.0    | ACTIVE    | Core      | [engine/GlossaryContract.v1.md](./engine/GlossaryContract.v1.md)                                                 |
| engine       | [IProviderAdapter](./engine/IProviderAdapter.v1.md)                                               | v1.0    | ACTIVE    | Core      | [engine/IProviderAdapter.v1.md](./engine/IProviderAdapter.v1.md)                                                 |
| engine       | [IRunEnrichmentService](./engine/IRunEnrichmentService.v1.md)                                     | v1.0    | ACTIVE    | Core      | [engine/IRunEnrichmentService.v1.md](./engine/IRunEnrichmentService.v1.md)                                       |
| engine       | [IWorkflowEngine](./engine/IWorkflowEngine.v1.md)                                                 | v1.0    | ACTIVE    | Core      | [engine/IWorkflowEngine.v1.md](./engine/IWorkflowEngine.v1.md)                                                   |
| engine       | [Run Events](./engine/RunEvents.v1.md)                                                            | v1.0    | ACTIVE    | Core      | [engine/RunEvents.v1.md](./engine/RunEvents.v1.md)                                                               |
| engine       | [Run Execution Policy](./engine/RunExecutionPolicy.v1.md)                                         | v1      | ACTIVE    | Core      | [engine/RunExecutionPolicy.v1.md](./engine/RunExecutionPolicy.v1.md)                                             |
| engine       | [Runtime Provider Vocabulary Component](./engine/runtime-provider-vocabulary-component.md)        | v1      | DRAFT     | Core      | [engine/runtime-provider-vocabulary-component.md](./engine/runtime-provider-vocabulary-component.md)             |
| engine       | [Signals and Authorization](./engine/SignalsAndAuth.v1.md)                                        | v1      | ACTIVE    | Core      | [engine/SignalsAndAuth.v1.md](./engine/SignalsAndAuth.v1.md)                                                     |
| engine       | [Start-run boundary component](./engine/start-run-boundary-component.md)                          | v1      | DRAFT     | Core      | [engine/start-run-boundary-component.md](./engine/start-run-boundary-component.md)                               |
| engine       | [StartRun Boundary](./engine/start-run-boundary.v1.md)                                            | v1.0    | ACTIVE    | Core      | [engine/start-run-boundary.v1.md](./engine/start-run-boundary.v1.md)                                             |
| engine       | [StartRun Protocol](./engine/StartRunProtocol.v1.md)                                              | v1      | ACTIVE    | Core      | [engine/StartRunProtocol.v1.md](./engine/StartRunProtocol.v1.md)                                                 |
| extensions   | [Engine extension contracts](./extensions/index.md)                                               | v1      | DRAFT     | Extension | [extensions/index.md](./extensions/index.md)                                                                     |
| extensions   | [Plugin Sandbox](./extensions/PluginSandbox.v1.md)                                                | v1      | DRAFT     | Extension | [extensions/PluginSandbox.v1.md](./extensions/PluginSandbox.v1.md)                                               |
| schemas      | [CanvasState](./schemas/canvas-state.schema.json)                                                 | v1      | DRAFT     | Schema    | [schemas/canvas-state.schema.json](./schemas/canvas-state.schema.json)                                           |
| schemas      | [Engine contract schemas](./schemas/index.md)                                                     | v1      | DRAFT     | Schema    | [schemas/index.md](./schemas/index.md)                                                                           |
| schemas      | [LogicalGraph (GCM)](./schemas/logical-graph.schema.json)                                         | v0.1    | DRAFT     | Schema    | [schemas/logical-graph.schema.json](./schemas/logical-graph.schema.json)                                         |
| schemas      | [ProvenanceEvent](./schemas/provenance-event.schema.json)                                         | v1      | DRAFT     | Schema    | [schemas/provenance-event.schema.json](./schemas/provenance-event.schema.json)                                   |
| security     | [Audit Log](./security/AuditLog.v1.md)                                                            | v1      | DRAFT     | Core      | [security/AuditLog.v1.md](./security/AuditLog.v1.md)                                                             |
| security     | [Authorization](./security/IAuthorization.v1.md)                                                  | v1      | DRAFT     | Core      | [security/IAuthorization.v1.md](./security/IAuthorization.v1.md)                                                 |
| security     | [Engine security contracts](./security/index.md)                                                  | v1      | DRAFT     | Core      | [security/index.md](./security/index.md)                                                                         |
| state-store  | [Engine state-store contracts](./state-store/index.md)                                            | v1      | DRAFT     | Core      | [state-store/index.md](./state-store/index.md)                                                                   |
| state-store  | [IRunStateStore](./state-store/IRunStateStore.v1.md)                                              | v1      | DRAFT     | Core      | [state-store/IRunStateStore.v1.md](./state-store/IRunStateStore.v1.md)                                           |
| state-store  | [IRunStateStore](./state-store/IRunStateStore.v2.0.md)                                            | v2.0.0  | ACTIVE    | Core      | [state-store/IRunStateStore.v2.0.md](./state-store/IRunStateStore.v2.0.md)                                       |
| state-store  | [Snapshot Rebuild Concurrency Component](./state-store/snapshot-rebuild-concurrency-component.md) | v1      | DRAFT     | Core      | [state-store/snapshot-rebuild-concurrency-component.md](./state-store/snapshot-rebuild-concurrency-component.md) |
| state-store  | [State Store Docs](./state-store/README.md)                                                       | v1      | DRAFT     | Core      | [state-store/README.md](./state-store/README.md)                                                                 |
| state-store  | [State Store Overview](./state-store/overview.md)                                                 | v1      | DRAFT     | Core      | [state-store/overview.md](./state-store/overview.md)                                                             |

<!-- contract-index:end -->
