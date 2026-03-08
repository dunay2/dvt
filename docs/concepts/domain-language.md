---
title: DVT Domain Language
status: Active
owner: Docs / Architecture
last_reviewed: 2026-03-08
---

# DVT Domain Language

This page defines the naming discipline for repository-wide documentation.

The objective is simple: the same thing should not be called by three different
names depending on whether the reader is in planning, code, or architecture.

## Language Rules

- Use `DVT` for the whole repository-wide system.
- Use `engine` only for the execution core, not for the full product.
- Use `planner` only for plan construction concerns.
- Use `adapter` for runtime- or backend-specific integration boundaries.
- Use `run` for one execution instance.
- Use `status` for current state, never for target design.
- Use `roadmap of record` for the single repository-wide planning entry point.
- Use `canonical spec` for the governing behavior document of a topic.
- Use `status doc` for the document that states current implementation truth.
- Use `reference-only` when a doc or package surface is visible but not
  accepted as normative.
- Use `workspace` for a monorepo unit such as an app or package.
- Use `roadmap` for future sequencing.
- Use `evidence` for proof of validation.
- Use `risk` for unresolved or partially accepted debt.

## Discipline Rules

- Do not call the whole repository `engine`.
- Do not call a roadmap a status board.
- Do not call a status snapshot a design spec.
- Do not treat a local package README as canonical if the accepted surface lives
  in `docs/`.

## Related Surfaces

- [Glossary](glossary.md)
- [System Map](system-map.md)
- [Repository Map](repository-map.md)

## Do Not Collapse Distinct Concepts

Avoid these common failures:

- treating `engine` and `DVT` as synonyms;
- treating `roadmap` and `status` as the same document type;
- treating `planning` and `architecture` as interchangeable;
- treating a package README as a canonical doc just because it exists;
- treating an ADR as a user guide or a status board.

## Repository-Wide Distinctions

### DVT vs engine

- `DVT` is the full system and documentation surface.
- `engine` is one subsystem inside DVT.

### roadmap vs status

- `roadmap` answers what should happen next;
- `status` answers what is true now.

### concepts vs reference

- `concepts` explain what the terms mean and how the system is mentally
  organized;
- `reference` defines technical contracts, schemas, APIs, and invariants.

### operations vs evidence

- `operations` tells you how to run or recover the system;
- `evidence` proves that a change or closure was validated.

## Writing Rule For Active Docs

For active documents, the first mention of a critical shared term should link to
its canonical concept page when that improves reader orientation.

Examples:

- `roadmap` -> [Planning](../planning/index.md)
- `status` -> [System Delivery Status](../architecture/system-delivery-status.md)
- `risk` -> [Risk Register](../risk-register/index.md)
- `evidence` -> [Evidence](../evidence/index.md)
