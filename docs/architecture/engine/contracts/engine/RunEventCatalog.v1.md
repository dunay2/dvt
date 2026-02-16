# Run Event Catalog (Normative Alias v1)

[← Back to Contracts Registry](../README.md)

**Status**: DRAFT alias (single source of truth preserved)
**Purpose**: Provide the roadmap/issue #9 canonical catalog entrypoint name without duplicating contract content.

---

## Canonical Source of Truth

The normative event taxonomy, required envelope fields, state transition mapping,
illegal transition handling, and idempotency rules are defined in:

- [RunEvents.v1.md](./RunEvents.v1.md)

This alias exists to align naming with roadmap/issue terminology (`RunEventCatalog.v1.md`) while avoiding parallel, divergent specifications.

---

## Coverage mapping (Issue #9)

The following issue requirements are covered by the canonical contract:

- Event type enumeration → [RunEvents.v1.md §1.1](./RunEvents.v1.md)
- Required fields per event → [RunEvents.v1.md §2.1](./RunEvents.v1.md)
- State transition table → [RunEvents.v1.md §3](./RunEvents.v1.md)
- Illegal transitions / terminal-state protections → [RunEvents.v1.md §3](./RunEvents.v1.md)
- Idempotency rules and collision behavior → [RunEvents.v1.md §2.2](./RunEvents.v1.md)
- Versioned event envelope schema → [RunEvents.v1.md §4](./RunEvents.v1.md)

---

## Governance rule

- `RunEvents.v1.md` MUST remain the only normative body for run-event semantics.
- `RunEventCatalog.v1.md` MUST only act as a stable alias/entrypoint and MUST NOT introduce conflicting rules.
