# ADR-0012a — Canonical Plan Error Code Strategy

Status: Accepted
Date: 2026-02-21

---

## Context

Adapters previously emitted provider-specific error codes.
Unified integrity ownership requires canonical error semantics.

---

## Decision

Canonical `PlanErrorCode` enum defined in `@dvt/contracts`.

Allowed external codes:

- PLAN_REF_INVALID_URI
- PLAN_REF_UNSUPPORTED_SCHEMA_VERSION
- PLAN_FETCH_FAILED
- PLAN_HASH_MISMATCH
- PLAN_PARSE_FAILED
- PLAN_IDENTITY_MISMATCH
- PLAN_SCHEMA_INVALID
- PLAN_SEMANTIC_INVALID
- PLAN_PROVIDER_CONSTRAINT

Only these codes may cross the engine boundary.

---

## Migration Strategy

Adapters MAY maintain internal legacy codes.

Before emitting RunFailed:

- MUST map to canonical PlanErrorCode
- MAY include temporary adapterErrorCode for telemetry only

Deprecation window: two minor releases.

---

## Versioning Policy

- Breaking change to canonical codes → MAJOR bump in @dvt/contracts
- Additive change → MINOR bump
- plan-verifier must remain semver-compatible

Reference:

- Semantic Versioning
  https://semver.org/

---

## Rationale

- Stable observability
- Uniform UX handling
- Cross-adapter semantic consistency
- Reduced long-term drift

---

## Acceptance Criteria

- Engine consumes only canonical PlanErrorCode
- Explicit mapping exists in adapters
- Contract tests assert canonical emission
