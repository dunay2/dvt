markdown
% DVT+ ADR Implementation Status & Roadmap % Architecture / Engineering
% Version 1.2 % Date: 2026-02-21
    
---

# 1. Document Control

| Field        | Value             |
| ------------ | ----------------- |
| Document ID  | ARCH-ADR-STATUS   |
| Version      | 1.2               |
| Status       | Active            |
| Owner        | Architecture Team |
| Review Cycle | Weekly ADR Sync   |
| Next Review  | 2026-02-28        |

---

# 2. Purpose

This document provides:

- Consolidated implementation status of all ADRs.
- Gap analysis per ADR with specific missing deliverables.
- Phased implementation roadmap with owners.
- Risk and dependency mapping.
- Success metrics and verification criteria.

This document is governance-facing and traceable to individual ADR files
under `docs/adr/`.

---

# 3. Executive Summary

| Area                  | Status         | Next Milestone               | Risk Level |
| --------------------- | -------------- | ---------------------------- | ---------- |
| Core ADRs (0000-0005) | ✅ Defined     | Implement ADR-0000 tooling   | Low        |
| Event Model (0010)    | 🟡 Partial     | Idempotency specification    | Medium     |
| Run Ownership (0011)  | ✅ Implemented | Final verification           | Low        |
| Plan Integrity (0012) | ❌ Not Started | High priority implementation | High       |
| Error Codes (0012a)   | ❌ Not Started | Depends on ADR-0012          | Medium     |
| Bootstrap TX (0013)   | 🟡 Partial     | Outbox verification          | Medium     |

**Legend:** ✅ Complete | 🟡 Partial | ❌ Not Started

---

# 4. ADR Status Dashboard

## 4.1 Foundation ADRs

| ADR      | Title                        | Status   | Implementation                           | Verification         | Dependencies |
| -------- | ---------------------------- | -------- | ---------------------------------------- | -------------------- | ------------ |
| ADR-0000 | Code Generation Traceability | Accepted | 🟡 Initial tooling + manifest generation | ❌ Partial           | None         |
| ADR-0003 | Execution Model Sovereignty  | Accepted | ✅ Architecture principle                | ✅ Documented        | None         |
| ADR-0004 | Event Sourcing Strategy      | Accepted | ✅ TestStateStore                        | ✅ Verified in tests | ADR-0003     |
| ADR-0005 | Contract Formalization       | Accepted | 🟡 Schemas exist                         | 🟡 Missing vectors   | ADR-0004     |

## 4.2 Execution ADRs

| ADR       | Title                    | Status   | Implementation             | Verification                   | Dependencies       |
| --------- | ------------------------ | -------- | -------------------------- | ------------------------------ | ------------------ |
| ADR-0010  | Run Event Envelope Split | Pending  | 🟡 Types exist             | 🟡 Missing idempotency spec    | ADR-0004, ADR-0005 |
| ADR-0011  | RunStarted Ownership     | Proposed | ✅ Implemented in Temporal | ✅ Verified in tests           | ADR-0003, ADR-0010 |
| ADR-0012  | Plan Integrity Ownership | Pending  | ❌ Not implemented         | ❌ No                          | ADR-0003, ADR-0005 |
| ADR-0012a | Canonical Error Codes    | Proposed | ❌ Not implemented         | ❌ No                          | ADR-0012           |
| ADR-0013  | bootstrapRunTx           | Proposed | 🟡 TestStateStore          | 🟡 Missing outbox verification | ADR-0004, ADR-0010 |

---

# 5. Gap Analysis

## 5.1 ADR-0000 — Traceability

**What we have:**

- ✅ Concept defined
- ✅ Graph model designed (Neo4j)
- ✅ Automation guide documented
- ✅ Initial manifest generation and config (`traceability.manifest.json`, `traceability.config.json`) via `@dvt/traceability-service`

**Missing deliverables / Notes:**

- ✅ Manifest generation added (initial tooling produces `traceability.manifest.json`) — implemented in this phase
- ❌ Header validation script (`tools/traceability/validate-headers.js`) — required to fix missing baselines
- ❌ Reverse coverage validator (`tools/traceability/validate-adr-coverage.js`)
- ❌ CI workflow deployment (workflow file may be referenced in docs but needs to be added under `.github/workflows` to enable PR gating)
- ❌ Neo4j publisher (requires secrets and CI enable; `--no-publish` mode used to avoid blocking)

**Observed validation output:** Local run produced multiple `MISSING_BASELINE` errors and `ADR_NOT_ACCEPTED` entries (ver `traceability-check.log`). Recomendación: crear follow-up para corregir cabeceras faltantes y desplegar el workflow en CI.

## 5.2 ADR-0005 — Contract Formalization

**What we have:**

- ✅ Zod schemas for core types
- ✅ Type inference working
- ✅ Discriminated unions for providers

**Missing deliverables:**

- ❌ `RunEventWrite` schema
- ❌ `RunEventRecord` schema
- ❌ `OutboxRecord` schema
- ❌ Conformance vectors (positive/negative tests)
- ❌ Property-based idempotency tests
- ❌ JSON Schema export
- ❌ CI validation gate

## 5.3 ADR-0010 — Event Envelope Split

**What we have:**

- ✅ `RunEventInput` / `RunEventPersisted` types
- ✅ Two-variant stepId union
- ✅ `AppendResult` with appended/deduped

**Missing deliverables:**

- ❌ Idempotency key specification (Section 3.3)
- ❌ Centralized `IdempotencyKeyBuilder`
- ❌ Canonical serialization implementation
- ❌ Contract tests for idempotency

## 5.4 ADR-0012 — Plan Integrity Ownership

**What we have:**

- ✅ ADR finalized with shared verifier requirement

**Missing deliverables:**

- ❌ Engine metadata-only validation
- ❌ Removal of `planFetcher` from `WorkflowEngineDeps`
- ❌ `@dvt/plan-verifier` package
- ❌ Adapter implementations using verifier
- ❌ Contract tests for hash mismatch, schema failure

## 5.5 ADR-0013 — bootstrapRunTx

**What we have:**

- ✅ `TestStateStore.bootstrapRunTx()` implemented
- ✅ `appendAndEnqueueTx()` exists
- ✅ Basic outbox simulation in tests

**Missing deliverables:**

- ❌ Proper `TestOutbox` with `OutboxRecord`
- ❌ Atomic append+enqueue verification
- ❌ Crash recovery tests
- ❌ PostgreSQL production integration

---

# 6. Implementation Roadmap

## Phase 1 — Traceability Foundation (Weeks 1-2)

**Owner:** DevEx Team

| Deliverable                | Description                             | Due    |
| -------------------------- | --------------------------------------- | ------ |
| `validate-headers.js`      | Script to validate ADR headers in files | Week 1 |
| `generate-manifest.js`     | Generate traceability manifest          | Week 1 |
| `validate-adr-coverage.js` | Reverse coverage validation             | Week 2 |
| CI workflow                | GitHub Actions for PR validation        | Week 2 |
| Neo4j initial graph        | Seed graph with ADR nodes               | Week 2 |

## Phase 2 — Contract Completion (Weeks 3-4)

**Owner:** Contracts Team

| Deliverable               | Description                     | Due    |
| ------------------------- | ------------------------------- | ------ |
| `run-event-write` schema  | Zod schema for event writes     | Week 3 |
| `run-event-record` schema | Zod schema for persisted events | Week 3 |
| `outbox-record` schema    | Zod schema for outbox           | Week 3 |
| Conformance vectors       | Positive/negative test cases    | Week 4 |
| Property-based tests      | fast-check for idempotency      | Week 4 |
| JSON Schema export        | Generate JSON Schema from Zod   | Week 4 |

## Phase 3 — Plan Integrity (Weeks 5-6)

**Owner:** Engine Team + Adapters Team

| Deliverable                | Description                   | Due    |
| -------------------------- | ----------------------------- | ------ |
| `@dvt/plan-verifier`       | Shared verification library   | Week 5 |
| Engine metadata validation | Update `WorkflowEngine`       | Week 5 |
| Plan error codes           | `PlanErrorCode` enum          | Week 6 |
| Adapter error mapping      | Map legacy to canonical       | Week 6 |
| Contract tests             | Hash mismatch, schema failure | Week 6 |

## Phase 4 — Bootstrap & Outbox (Weeks 7-8)

**Owner:** Adapters Team

| Deliverable           | Description                          | Due    |
| --------------------- | ------------------------------------ | ------ |
| Complete `TestOutbox` | Full `IOutboxStorage` implementation | Week 7 |
| Atomicity tests       | Verify append+enqueue atomic         | Week 7 |
| Crash recovery suite  | Simulate crashes during tx           | Week 8 |
| PostgreSQL store      | Production-ready implementation      | Week 8 |

## Phase 5 — Verification & Acceptance (Weeks 9-10)

**Owner:** Architecture Team

| Deliverable                | Description                   | Due     |
| -------------------------- | ----------------------------- | ------- |
| ADR status updates         | Mark all as **Implemented**   | Week 9  |
| Full traceability          | 100% header coverage          | Week 9  |
| Neo4j implementation graph | Complete graph with all files | Week 10 |
| Architecture review        | Final validation of all ADRs  | Week 10 |

---

# 7. Critical Dependencies

```mermaid
graph TD
    A[ADR-0000: Traceability] --> B[ADR-0005: Contract Schemas]
    B --> C[ADR-0010: Event Envelope]
    B --> D[ADR-0012: Plan Integrity]

    C --> E[ADR-0011: RunStarted Ownership]
    D --> F[ADR-0012a: Error Codes]

    A --> G[ADR-0013: bootstrapRunTx]

    style A fill:#f9f,stroke:#333,stroke-width:4px
    style B fill:#bbf,stroke:#333
    style D fill:#fbb,stroke:#333
Hard Constraints:

Phase 3 requires Phase 1 (traceability) and Phase 2 (schemas)

ADR-0012a requires ADR-0012 implementation

ADR-0011 depends on ADR-0010 event types

8. Risk Assessment
Risk	Impact	Probability	Mitigation	Owner
ADR-0012 delays due to adapter changes	High	Medium	Pilot with InMemory adapter first	Adapters Lead
Idempotency drift across services	Medium	Low	Central builder + contract tests	Contracts Lead
Outbox atomicity bugs in production	High	Medium	Crash recovery tests + Transactional outbox pattern	Engine Lead
Traceability overhead rejected by devs	Low	Medium	Full automation, make it CI-enforced	DevEx Lead
Missing deadlines due to scope creep	Medium	Medium	Strict phase gates, weekly sync	Architecture Lead
9. Success Metrics
Metric	Current	Target	Measurement Method	Owner
ADR Implementation coverage	~30%	100%	validate-adr-coverage.js	Architecture
Files with traceability headers	0%	100%	validate-headers.js	DevEx
Contract test coverage	~40%	90%	Jest coverage reports	Contracts
CI validation time	N/A	< 2 min	GitHub Actions timing	DevEx
Adapters passing contract tests	1/3	3/3	Contract test suite	Adapters
Neo4j graph freshness	N/A	< 1 hour	Last updated timestamp	DevEx
10. Validation Criteria
This document is considered complete when:

Each ADR has an implementation reference in code headers.

Each ADR has automated verification in CI.

validate-adr-coverage.js reports 100% coverage of Accepted ADRs.

CI enforces header + coverage checks on every PR.

Neo4j graph contains all relationships (:File)-[:BASELINED_ON]->(:ADR).

All adapters pass contract test suite for their implemented ADRs.

11. References
ADR methodology: https://adr.github.io/

C4 Model: https://c4model.com/

Temporal: https://temporal.io/

Conductor: https://conductor.netflix.com/

Zod: https://zod.dev/

JSON Schema: https://json-schema.org/

Neo4j: https://neo4j.com/

OpenTelemetry: https://opentelemetry.io/

12. Document Sign-off
Role	Name	Date	Signature
Architecture Lead
Engineering Manager
DevEx Lead
Contracts Lead
End of Document
```
