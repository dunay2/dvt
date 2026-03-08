---
title: DVT+ Blueprint v0.6 Historical Snapshot
status: Archived
owner: Architecture / Delivery / Docs
last_reviewed: 2026-03-08
---

# DVT+ Blueprint v0.6 Historical Snapshot

## Status

This file is a curated historical snapshot retained because some active planning
docs still use it as background context.

It is not a canonical architecture or planning source.

Use current docs under `docs/architecture/`, `docs/adr/`, `docs/planning/`,
and `docs/runbooks/` for the active repository truth.

## What Was Worth Keeping

The original pack added value in only three areas:

1. a target monorepo shape for domain-first packages;
2. a push toward stricter module boundaries and curated public exports;
3. a reminder that schemas, tests, and tooling should be explicit parts of each
   module contract.

Everything else in the pack was either stale, duplicated elsewhere, overly
speculative, or not aligned with the current documentation system.

## Historical Target Shape

The v0.6 snapshot pushed modules toward a layout like:

```text
docs/
schemas/
src/{generated,domain,application,ports,adapters,composition}
test/{unit,contract,integration}
cli/src/
```

This remains useful as a migration reference for package-structure planning,
especially in engine refactors.

## Historical Architectural Intent

- `planner` stays deterministic and free of runtime I/O.
- `engine` owns execution semantics, not vendor implementations.
- contracts and schemas should be explicit and versioned.
- technical wiring should be separated from domain behavior.
- tests should be split by unit, contract, and integration intent.

## What Was Removed From The Original Pack

The original pack also contained lore, mixed-language annexes, local infra
compose files, helper workflow fragments, and pending scratch notes.

Those artifacts were removed because they were not reliable sources of truth and
were competing with current repository docs.

## How To Use This Snapshot

- Use it only as historical context for migration discussions.
- Do not create new links to removed annexes or deleted helper files.
- If a current doc and this snapshot disagree, the current doc wins.
