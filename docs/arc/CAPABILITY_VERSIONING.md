# Capability versioning policy (CAPABILITY_VERSIONING.md)

This document contains the normative Capability Governance & Versioning Policy extracted from the DVT+ Engine & Temporal quality pack.

## Purpose

Define how capabilities are introduced, versioned, declared by adapters, and gated by Planner/UI to prevent adapter drift and ensure controlled evolution.

## Definitions (Normative)

- CapabilityId: stable identifier (string), e.g. `signal.pause`, `cancel.cooperative`.
- CapabilityVersion: `vMAJOR.MINOR` (patch omitted by policy), e.g. `v1.1`, `v2.0`.
- SupportLevel: `native | emulated | degraded | unsupported`.
- Stage: `proposed | experimental | stable | deprecated | removed`.

## Lifecycle (Normative)

- proposed: RFC stage; no implementation required.
- experimental: ≥1 adapter implements; may change.
- stable: contract frozen; conformance required.
- deprecated: scheduled removal; migration guide required.
- removed: no longer supported; plans MUST be rejected.

## Versioning rules (Normative)

- Breaking change → bump MAJOR (`v2.0`).
- Backward-compatible → bump MINOR (`v1.2`).
- Adapter declaring `vX.Y` MUST be compatible with `vX.0..vX.Y` unless documented as `degraded`.

## Adapter declarations & registry (Normative)

Adapters MUST declare supported capabilities with `{ capability, version, support, limitations? }`.
Planner/UI MUST validate required capabilities against adapter declarations.

## Deprecation policy (Normative)

- Minimum 12 months notice before removal.
- Migration guide required.
- UI must surface warnings for deprecated capabilities.

## Enforcement & CI hooks (Normative)

- CI MUST validate capability registry schema and adapter declarations.
- Provide conformance tests and gating logic for Planner.

## Governance

- New capability requires Engineering Lead approval and (when security-sensitive) a security review.
- Artifacts required: spec, registry update, conformance tests, migration guide.

(For full examples, validation functions and reference shapes, see the original quality pack companion.)
