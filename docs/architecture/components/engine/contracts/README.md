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
- [Capabilities contracts](./capabilities/README.md)
- [State store docs](./state-store/README.md)
- [Engine component home](../index.md)

## Operating rule

The repository is pre-stable for this boundary:

- one live `v1` line only
- no redirect, `reference`, `v1.1`, `v2`, or migration companion for the same
  active engine-runtime topic
- git keeps the history; the active docs tree keeps one truth
