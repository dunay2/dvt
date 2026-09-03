# Engine Adapters

## Purpose

Summarizes adapter integration points for the engine component and links to the
canonical adapter specifications.

Active provider-runtime vocabulary is hard-cut to the implemented runtime.
Temporal is the only provider runtime that may appear in active contracts,
capability matrices, and composition defaults. Future providers need a new
ADR-backed contract line, real adapter package, conformance suite, and
production composition path before they can be documented here.

## Current adapter topology

```mermaid
flowchart LR
  Engine["@dvt/engine"] --> ProviderPort["Provider adapter port"]
  ProviderPort --> Mock["Mock adapter (testing)"]
  ProviderPort --> Temporal["Temporal adapter"]
  Engine --> StatePorts["State-store and intent ports"]
  StatePorts --> Postgres["Postgres state-store adapter"]
  Engine --> PlanPorts["Plan fetch / persistence seam"]
  PlanPorts --> Postgres
```

## Canonical adapter specs

- [Temporal adapter specification](./temporal/temporal-adapter-spec.md)
- [Temporal engine policies](./temporal/engine-policies.md)
- [Postgres state-store adapter](./state-store/postgres/StateStoreAdapter.md)
- [Snowflake state-store adapter](./state-store/snowflake/StateStoreAdapter.md)

Current reading rule:

- treat Temporal as the only implemented provider-runtime adapter surface today;
- do not treat future-provider notes, old drafts, or archived material as active
  runtime vocabulary.

## Related contracts

- [Provider adapter contract](../contracts/engine/IProviderAdapter.v1.md)
- [Capabilities guide](../contracts/capabilities/README.md)
- [Adapter capabilities matrix](../contracts/capabilities/adapters.capabilities.json)

## Navigation

- [Engine component home](../index.md)
- [Core](../architecture/core.md)
- [Workflows](../architecture/workflows.md)
- [Security](../security/index.md)
- [Operations](../ops/index.md)
- [Contracts](../contracts/index.md)
- [Capabilities](../contracts/capabilities/index.md)
- [Canonical C4 architecture](../architecture/c4-engine.md)
