# Engine Documentation Navigation Guide

This guide explains how the engine component map should route readers.

## Navigation rule

The component-map pages under `docs/architecture/components/engine/` are overview
pages. They summarize the engine surface and point readers to the canonical
engine docs under `docs/architecture/engine/`.

They should not duplicate canonical normative or operational content.

## Main component pages

- [index.md](index.md) - component-map entry point
- [core.md](core.md) - summary of orchestration and aggregate responsibilities
- [adapters.md](adapters.md) - adapter directory pointing to canonical adapter specs
- [workflows.md](workflows.md) - workflow and event references
- [security.md](security.md) - security surface summary
- [operations.md](operations.md) - operational reference page
- [contracts.md](contracts.md) - contract directory page
- [capabilities.md](capabilities.md) - capability assets directory page
- [c4-engine.md](c4-engine.md) - component-level C4 view for this slice

## Canonical destinations

- [Canonical engine index](../../engine/index.md)
- [Canonical contract registry](../../engine/contracts/README.md)
- [Canonical versioning policy](../../engine/VERSIONING.md)
- [Canonical security docs](../../engine/security/THREAT_MODEL.md)
- [Canonical operations docs](../../engine/ops/observability.md)

## Component-specific material kept here

- [Delivery gap notes](delivery-gaps/RunPlanWorkflow_Refactor_Analysis.md)
- [Structure placeholders](structure/engine-constraints.md)
- [Local C4 view](c4-engine.md)

## Maintenance rule

When a topic already has canonical documentation under `docs/architecture/engine/`,
link to it from the component map instead of copying it.
