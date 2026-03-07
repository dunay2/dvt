---
title: ADR-0000c — Modular Traceability & Quality Enforcement (Config-driven, ARC-tiered)
status: Accepted
date: 2026-03-04
owners: Core Architecture / CI Governance / AI Tooling
extends:
  - ADR-0000: Code Generation with Enforced Normative Traceability (Automated)
supersedes:
  - ADR-0000b: Traceability Evidence Pack v2 (ARC tiers + operability gates)
---

# ADR-0000c — Modular Traceability & Quality Enforcement

## 1. Context

ADR-0000 mandates **normative traceability** (machine-verifiable conformance) to prevent architectural drift.

ADR-0000b attempted to operationalize traceability with strict DP/IR documents and path/keyword heuristics. In practice this creates:

- avoidable bureaucracy for small changes,
- brittle coupling to repository layout,
- “compliance theater” docs that pass CI but add no value,
- poor fit for human teams under time constraints, and
- poor fit for AI-assisted workflows (monolithic templates, fragile validators).

This ADR replaces that approach with a modular, config-driven system designed to be:

- **lightweight by default**, heavyweight only where risk demands it,
- **declarative** (policy in YAML, not hardcoded scripts),
- **tooling-first** (use standard analyzers when possible),
- **traceable** (docs ↔ code ↔ CI checks), and
- explicitly aligned to **design quality criteria** (ADR-012).

## 2. Decision (Normative)

We adopt a **Modular Traceability Pack** with these normative elements:

1. **ARC declaration (required)** in PR body using a standardized checklist.
2. **Policy-as-data** in `.arc-policy.yaml` that defines triggers, required artifacts, and required checks.
3. **Evidence Doc (ED)** required only for ARC-2/3 (ARC-1 uses PR checklist + links).
4. **Risk register updates** required for ARC-3, and for ARC-2 when policy triggers apply.
5. **Design quality enforcement** tied to ADR-012 via:
   - PR checklist attestations,
   - automated checks (where feasible),
   - reviewer sign-off for non-automatable criteria.

## 3. Definitions

### 3.1 Architecturally Relevant Change (ARC)

A PR is an ARC if it touches:

- versioned contracts (schemas, public payloads),
- ports/adapters and boundary contracts,
- persistence, ordering, idempotency, replay,
- execution semantics (retries, concurrency, compensation),
- security (authz/tenancy isolation/audit log),
- core invariants (“UI does not execute / Engine does not decide / Planner does not persist”).

### 3.2 ARC levels (tiered rigor)

- **ARC-0**: Not ARC (normal change).
- **ARC-1 (Minor)**: localized architectural impact; no breaking contract; no critical persistence/security/ordering.
- **ARC-2 (Standard)**: contracts/boundaries/semantics change; non-breaking or controlled breaking.
- **ARC-3 (High risk / Breaking)**: breaking contracts, major version bump, critical persistence/security/ordering/execution semantics.

**REQ-ARC-LEVEL-001:** Every PR MUST declare its ARC level in the PR checklist.

**REQ-ARC-LEVEL-002:** `.arc-policy.yaml` MAY override the declared level upward (never downward).

## 4. Required artifacts (by level)

### ARC-0

- PR checklist: minimal (no ARC items required)

### ARC-1

- PR checklist: required ARC declaration + applicable ADR-012 items checked
- No standalone docs required
- Evidence may be references to tests, diffs, or short PR narrative

### ARC-2

- PR checklist: required
- **Evidence Doc (ED)** required: `docs/evidence/ED-YYYYMMDD-<slug>.md`
- Automated checks (as configured) required
- Risk register update required **if policy trigger applies**

### ARC-3

- PR checklist: required
- Evidence Doc (ED): required
- Risk register update: **always required**
- Rollout / compatibility notes: required (in ED)
- Optional (policy-based): split DP/IR if the project demands pre-approval

## 5. Policy-as-data (Normative)

**REQ-POLICY-001:** A repository root file `.arc-policy.yaml` MUST define:

- triggers (globs) → minimum ARC level,
- required docs per ARC level,
- required checks per ARC level,
- risk update requirements.

**REQ-POLICY-002:** CI MUST read `.arc-policy.yaml` to enforce requirements.

## 6. CI enforcement (Normative)

**REQ-CI-001:** CI MUST verify the PR checklist contains ARC level and required acknowledgements.  
**REQ-CI-002:** CI MUST enforce required artifacts based on `.arc-policy.yaml`.  
**REQ-CI-003:** CI MUST validate ED front-matter keys and presence of **evidence links** (not headings rigidity).  
**REQ-CI-004:** CI MUST run required tooling checks listed in policy (lint/test/schema validation/diff checks).  
**REQ-CI-005:** CI MUST fail if required items are missing.

## 7. Design Quality enforcement (ADR-012 integration)

**Guides:** For deeper, domain-specific standards, consult `docs/guides/` (API design, EDA, observability, security, SBOM, 12-factor).

**REQ-QUAL-001:** For ARC-1/2/3, PR checklist MUST declare which ADR-012 criteria apply and how they were verified:

- automated (tool link/output),
- tests (paths),
- reviewer attestation (where tooling cannot prove it).

## 8. Mermaid overview

```mermaid
flowchart TD
  PR[Pull Request] --> DECL[PR Checklist: ARC level + ADR-012 criteria]
  DECL -->|ARC-0| CI0[CI: normal checks]
  DECL -->|ARC-1| CI1[CI: policy checks + required tools]
  DECL -->|ARC-2| ED[Evidence Doc (ED)]
  DECL -->|ARC-3| ED3[Evidence Doc (ED) + Risk update + rollout]
  ED --> CI2[CI: validate ED + run required tools]
  ED3 --> CI3[CI: validate ED + enforce risk register + compatibility/rollout]
  CI2 --> MERGE[Merge]
  CI3 --> MERGE
```

## 9. Consequences

### Positive

- Minimal process for small changes; heavier only when risk justifies it.
- Policy configurable without rewriting ADR text or scripts.
- Lower incentive for fake documents; higher value density.
- Explicit quality criteria via ADR-012 are part of the same workflow.

### Negative / Trade-offs

- Requires maintaining `.arc-policy.yaml` and a few small CI scripts.
- Some criteria remain human-reviewed (cannot be fully automated).

## 10. References

- ADR method: https://adr.github.io/
- Docs-as-code: https://www.writethedocs.org/guide/docs-as-code/
- SOLID: https://en.wikipedia.org/wiki/SOLID
- DDD: https://domainlanguage.com/ddd/
- Hexagonal architecture: https://alistair.cockburn.us/hexagonal-architecture/
- CQRS: https://martinfowler.com/bliki/CQRS.html
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- DRY: https://en.wikipedia.org/wiki/Don%27t_repeat_yourself
