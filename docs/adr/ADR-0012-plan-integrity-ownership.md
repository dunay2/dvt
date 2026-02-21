# ADR-0012 — Plan Integrity Ownership

Status: Pending Implementation
Date: 2026-02-20 (updated: 2026-02-21)

---

## 1. Context

The engine currently performs `planIntegrity.fetchAndValidate(...)` before invoking adapters, while adapters may also validate.  
This causes double fetch, unclear ownership, and topology inconsistency.

In a run-driven execution model, validation must occur in the same runtime context where execution happens (e.g., Temporal worker).

---

## 2. Problem

We must define:

- Where plan bytes are fetched
- Where integrity (SHA-256) is enforced
- Where schema + semantic validation occur
- How to avoid responsibility drift

The solution must preserve architectural boundaries and deterministic execution.

---

## 3. Alternatives Considered

### A. Engine owns fetch + validation

Rejected because:

- Violates Ports & Adapters separation (engine performs infrastructure IO)
- Increases trusted surface of core domain
- Breaks execution-context validation principle

Reference:

- Hexagonal Architecture (Cockburn)
  https://alistair.cockburn.us/hexagonal-architecture/

---

### B. Both engine and adapter validate

Rejected because:

- Double network fetch
- Drift risk between layers
- Higher latency
- No clear ownership

Reference:

- Single Responsibility Principle
  https://martinfowler.com/bliki/SingleResponsibilityPrinciple.html

---

### C. Embed plan bytes in workflow input

Not chosen as baseline because:

- Payload size limits (Temporal)
- Logging/security risks
- Still unclear integrity ownership

Reference:

- Temporal Workflow Execution & Payload Best Practices
  https://docs.temporal.io/

---

### D. Adapter owns byte-level integrity (Chosen)

Accepted because:

- Validation occurs where execution occurs
- Engine remains metadata-only
- Eliminates duplicate validation paths
- Aligns with distributed system execution boundaries

Reference:

- Temporal execution model
  https://docs.temporal.io/workflows
- Clean Architecture boundary enforcement
  https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html

---

## 4. Decision

### Engine Responsibilities (Metadata Only)

MUST:

- Validate URI scheme/host allowlist
- Validate schema version compatibility (string-level only)
- Validate required PlanRef fields

MUST NOT:

- Fetch plan bytes
- Parse plan bytes
- Compute SHA-256 over plan content

If metadata validation fails → reject startRun().

---

### Adapter Responsibilities (Full Integrity)

Adapters MUST:

1. Fetch bytes from PlanRef.uri
2. Verify sha256(bytes) == PlanRef.sha256
3. Parse plan
4. Verify identity (planId/version/tenant match)
5. Validate schema
6. Validate semantic invariants
7. Apply provider-specific constraints

Failure → RunFailed with canonical PlanErrorCode.

Integrity is computed over raw downloaded bytes (not re-serialized JSON).

Reference:

- Supply chain integrity principles (SLSA)
  https://slsa.dev/
- OWASP Logging Guidelines (sanitized audit logging)
  https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html

---

## 5. Architectural Rationale

This decision enforces:

- Execution-context validation
- Clear trust boundary definition
- Deterministic replay compatibility
- Reduced engine IO coupling

Reference:

- Deterministic workflow execution principles (Temporal)
  https://docs.temporal.io/workflows
- Ports and Adapters pattern
  https://alistair.cockburn.us/hexagonal-architecture/

---

## 6. Shared Verifier Requirement

To prevent drift across adapters, introduce:

`@dvt/plan-verifier`

Responsibilities:

- Hash validation
- Schema validation
- Identity validation
- Canonical error emission

All adapters MUST use it.

---

## 7. Consequences

Positive:

- Cleaner engine boundary
- Reduced hot-path IO
- Clear integrity ownership

Negative:

- Adapter rigor increases
- Migration effort required

---

## 8. Acceptance Criteria

- Engine performs no plan byte fetch
- Adapters use shared verifier
- Canonical error codes enforced
- Contract tests validate behavior
