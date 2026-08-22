---
title: Runtime Subsystem
status: Active
owner: Architecture / Runtime
last_reviewed: 2026-05-13
planning_type: architecture
---

# Runtime Subsystem

The runtime subsystem groups the packages that execute, validate, interpret,
persist, move, and inspect run-time behavior. It is not a second component home
for `@dvt/engine` or `@dvt/delivery`; those remain canonical package component
pages. This page explains how the runtime governance module composes those
components.

## Entry Points

- [Runtime root subdivision component guide](./runtime-root-subdivision-component.md)
- [Runtime root subdivision user stories](./runtime-root-subdivision-user-stories.md)

## Current Runtime Component Model

```mermaid
flowchart TB
  Root["SYS-RUNTIME-ROOT<br/>module, no file ownership"]
  Engine["SYS-RUNTIME-ENGINE-CORE<br/>@dvt/engine"]
  RunDomain["SYS-RUNTIME-RUN-DOMAIN<br/>@dvt/run-domain"]
  State["SYS-RUNTIME-STATE-STORE<br/>@dvt/state-store"]
  Delivery["SYS-RUNTIME-DELIVERY<br/>@dvt/delivery"]
  Interpret["SYS-RUNTIME-PLAN-INTERPRETATION<br/>@dvt/plan-interpreter"]
  Verify["SYS-RUNTIME-PLAN-VERIFICATION<br/>@dvt/plan-verifier"]
  Dsl["SYS-RUNTIME-DSL<br/>@dvt/dsl"]
  Canonical["SYS-RUNTIME-DETERMINISM-UTILITIES<br/>@dvt/crypto"]
  Cli["SYS-RUNTIME-CLI-VALIDATION<br/>@dvt/cli and packages/cli"]
  PlanStore["SYS-PLANSTORE-ENGINE-FETCH<br/>plan-ref exception"]

  Root --> Engine
  Root --> RunDomain
  Root --> State
  Root --> Delivery
  Root --> Interpret
  Root --> Verify
  Root --> Dsl
  Root --> Canonical
  Root --> Cli
  Engine -. excludes .-> PlanStore
```

## Canonical Component Homes

- `@dvt/engine`: [component page](../../../components/engine/index.md)
- `@dvt/delivery`: [component page](../../../components/delivery/index.md)
- `@dvt/cli`: [shared CLI page](../../../shared/cli.md)

The remaining runtime package component pages should be added only when a
package needs a single active component home with its own API, invariants, and
consumer map. Until then, this subsystem guide is the authoritative governance
grouping surface.
