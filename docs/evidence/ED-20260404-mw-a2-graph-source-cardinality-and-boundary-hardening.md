---
title: MW-A2 graph source cardinality and planner boundary hardening
status: Accepted
date: 2026-04-04
owners:
  - '@dvt/contracts'
  - '@dvt/planner'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/PlannerInputEnvelopeV1.schema.json
  - packages/@dvt/planner/src/application/PlannerEnvelopeMapper.ts
  - packages/@dvt/planner/src/application/PlannerFacade.ts
  - packages/@dvt/planner/test/unit/planner-facade.test.ts
  - packages/@dvt/planner/test/unit/graph.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/planner test
    - pnpm verify:prepush
---

# Context

This slice closes a contract/runtime drift in GenericGraphSource cardinality and hardens the planner boundary after mainline merge conflicts.

# Implemented

- JSON schema for `PlannerInputEnvelopeV1.graphSource.nodes` now matches runtime validator cardinality (`minItems: 1`).
- Planner boundary tests were reconciled to `graphSource` canonical input.
- Cycle-detection coverage from mainline was preserved and migrated to the new envelope path.
- Mapper failure normalization and cache-size validation remain covered in facade tests.

# Result

- No split between schema-based clients and runtime parsing on empty graph nodes.
- Planner boundary remains fail-closed for invalid inputs and deterministic for cycle diagnostics.
- ARC-2 evidence and risk registration are explicitly present for this contracts/planner touch set.
