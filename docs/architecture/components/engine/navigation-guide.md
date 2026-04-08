# Engine Documentation Navigation Guide

This subtree is a supporting map for the engine area. It should route readers to
canonical pages, not recreate parallel design packs.

## Main component pages

- [index.md](index.md) - component-map entry point
- [core.md](core.md) - shipped core responsibilities
- [adapters.md](adapters.md) - adapter directory pointing to canonical specs
- [workflows.md](workflows.md) - workflow and event references
- [security.md](security.md) - security surface summary
- [operations.md](operations.md) - operational reference page
- [contracts.md](contracts.md) - contract directory page
- [capabilities.md](capabilities.md) - capability assets directory page

## Canonical destinations

- [Canonical engine index](../../engine/index.md)
- [WorkflowEngine subsystem context](../../engine/workflow-engine-subsystem-context.md)
- [WorkflowEngine target architecture v1](../../engine/workflow-engine-target-architecture.v1.md)
- [Canonical C4 architecture](../../engine/c4-engine.md)
- [Canonical contract registry](../../engine/contracts/README.md)
- [Canonical security docs](../../engine/security/THREAT_MODEL.md)
- [Canonical operations docs](../../engine/ops/observability.md)

## Maintenance rule

If a topic already has a canonical home under `docs/architecture/engine/`, link
to that page instead of rebuilding local structure notes, local C4 diagrams, or
delivery-gap scratch packs in this subtree.

If a supporting page here becomes stale, either retarget it to the canonical
engine surface or archive it. Do not restore deleted placeholder packs.
