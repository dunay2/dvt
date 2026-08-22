---
title: Shared Package Architecture
status: Active
owner: Architecture / Platform
last_reviewed: 2026-08-22
---

# Shared Package Architecture

This section covers the small cross-cutting packages that shape repository-wide
behavior.

They are easy to ignore because they are smaller than engine, adapters, or API.
That is a mistake. If these packages drift, the rest of the system drifts
silently.

## Packages Covered Here

- [CLI Package](./cli.md)
- [Gateway DSL Package](./dsl.md)
- [Plan Interpreter Package](./plan-interpreter.md)
- [Crypto Package](./crypto.md)

## Why This Section Exists

- `@dvt/cli` looked larger in naming than in reality and had no honest landing
  page.
- `@dvt/dsl` existed in code but had no canonical package surface explaining
  what it can and cannot do.
- `@dvt/plan-interpreter` carried deterministic scheduling semantics without a
  visible documentation entry point.
- `@dvt/crypto` centralizes portable primitives without taking ownership of
  domain-specific identity preimages.

## Reading Order

1. [Plan Interpreter Package](./plan-interpreter.md)
2. [Gateway DSL Package](./dsl.md)
3. [Crypto Package](./crypto.md)
4. [CLI Package](./cli.md)

## Current Posture

| Package                 | Role                                            | Current posture                                                           |
| ----------------------- | ----------------------------------------------- | ------------------------------------------------------------------------- |
| `@dvt/plan-interpreter` | Deterministic DAG analysis                      | Useful and tested, but previously under-documented                        |
| `@dvt/dsl`              | Gateway condition parsing and evaluation        | Implemented as a very small deterministic DSL, not a rich policy language |
| `@dvt/crypto`           | Portable crypto and canonicalization primitives | Single physical and package-name authority                                |
| `@dvt/cli`              | Validation and golden-path script surface       | Script-driven and still not a real exported CLI surface                   |

## Rules

- Every package page in this section must say what the package really does
  today, not what it may do later.
- Package-local READMEs must point back to the canonical page in this section.
- If a package remains weak, document the weakness explicitly instead of hiding
  it behind a generic "tooling" label.

## Related Surfaces

- [Repository Map](../../concepts/repository-map.md)
- [Canonical Doc Code Matrix](../../planning/status/canonical-doc-code-matrix.md)
- [System Delivery Status](../system-delivery-status.md)
