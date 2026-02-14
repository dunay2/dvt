# Capability Governance & Versioning Policy (Normative)

Status: **NORMATIVE / POLICY**

This document defines how capabilities are introduced, versioned, declared by adapters, and gated by planner/UI.

## 1) Purpose

Prevent adapter drift and enable controlled capability evolution across providers.

## 2) Definitions

- **CapabilityId**: stable identifier (for example `signal.pause`, `cancel.cooperative`).
- **CapabilityVersion**: `vMAJOR.MINOR` (policy omits patch).
- **SupportLevel**: `native | emulated | degraded | unsupported`.
- **LifecycleStage**: `proposed | experimental | stable | deprecated | removed`.

## 3) Lifecycle (normative)

`proposed -> experimental -> stable -> deprecated -> removed`

- **proposed**: RFC only, no production use.
- **experimental**: at least one adapter implementation + tests.
- **stable**: frozen contract with multi-adapter confidence (or equivalent parity evidence).
- **deprecated**: scheduled removal with migration guide.
- **removed**: capability no longer allowed.

## 4) Versioning rules (normative)

- Breaking change => MAJOR bump (`v2.0`).
- Backward-compatible change => MINOR bump (`v1.2`).
- An adapter declaring `v1.2` is expected to satisfy `v1.0..v1.2` semantics unless explicitly marked `degraded` with documented limitations.

## 5) Support levels (normative)

- `native`: direct provider primitive.
- `emulated`: supported through a documented workaround.
- `degraded`: partial support with explicit limitations.
- `unsupported`: unavailable (plan rejected or warned according to policy).

## 6) Adapter declaration shape (normative minimum)

```json
{
  "capability": "signal.pause",
  "version": "v1.1",
  "support": "native",
  "limitations": [],
  "notes": "Maps to provider primitive"
}
```

## 7) Governance process (normative)

- Engineering lead approval required to add new capability IDs.
- Security review required for security-sensitive capabilities.
- Required artifacts:
  - capability spec,
  - declaration update,
  - conformance tests,
  - usage/limitations documentation.
- RFC period: minimum 2 weeks before promotion to experimental.

## 8) Planner/UI gating (normative)

Planner/UI MUST:

- reject unknown capabilities,
- reject unsupported capabilities when required,
- reject version-too-old declarations,
- warn on `emulated`, `degraded`, and `deprecated` capabilities.

## 9) Deprecation policy (normative)

- Minimum notice: 12 months before removal.
- Migration guide required.
- UI MUST show deprecation warnings.
- Removed capabilities MUST be rejected at validation time.

## 10) Migration example (normative example)

If `signal.pause` moves from `v1.x` to `v2.0` with a breaking payload requirement:

- plans requiring `v2.0` MUST be rejected by adapters supporting only `v1.x`,
- UI controls for `v2` behavior MUST be gated on adapter capability declarations,
- a migration guide MUST be published during deprecation window.
