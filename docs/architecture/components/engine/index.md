# DVT Engine Architecture Index (v1.0)

**Purpose**: Central navigation for engine specification, implementation, and operations  
**Status**: v1.0 (partition complete)  
**Updated**: 2026-02-11

---

## 📋 Quick Navigation

### 🔴 Normative Contracts (MUST, Versioned, Stable)

These documents define the **engine boundary, semantics, and invariants**. Violations are bugs.

| Document                                                              | Purpose                                                          | Scope             | Version |
| --------------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------- | ------- |
| [IWorkflowEngine.v1.md](contracts/engine/IWorkflowEngine.v1.md)       | Engine interface + signal catalog                                | Boundary contract | 1.0     |
| [ExecutionSemantics.v1.md](contracts/engine/ExecutionSemantics.v1.md) | Core execution semantics (storage/engine-agnostic)               | State machine     | 1.1     |
| [RunEventCatalog.v1.md](contracts/engine/RunEventCatalog.v1.md)       | Canonical run event catalog alias (taxonomy + transitions + ids) | Event taxonomy    | 1.0     |
| [GlossaryContract.v1.md](contracts/engine/GlossaryContract.v1.md)     | Canonical terminology and identifier semantics                   | Terminology       | 1.0.1   |
| [State Store Docs](contracts/state-store/README.md)                   | Canonical entrypoint for overview, ADR, TS port, and adapter     | Persistence layer | live    |
| [VERSIONING.md](./VERSIONING.md)                                      | Policy for versioning contracts (major/minor bumps, deprecation) | Governance        | 1.0     |

### 🟢 Capability Specifications (Executable, JSON)

Validation contracts replaced with code-generatable schemas.

| Document                                                                              | Purpose                             | Scope                               | Usage                       |
| ------------------------------------------------------------------------------------- | ----------------------------------- | ----------------------------------- | --------------------------- |
| [capabilities.schema.json](contracts/capabilities/capabilities.schema.json)           | Universal capability enum           | 12 capabilities across 6 categories | `validatePlan()` input      |
| [adapters.capabilities.json](contracts/capabilities/adapters.capabilities.json)       | Temporal vs Conductor parity matrix | Adapter comparison                  | ReferenceData in validation |
| [validation-report.schema.json](contracts/capabilities/validation-report.schema.json) | Validation report schema            | StartRun output                     | SDK code-gen                |
| [capabilities/README.md](contracts/capabilities/README.md)                            | Integration guide                   | validatePlan() pseudocode           | Developer reference         |

### � Security (Normative + Informative)

Security-by-design documentation: threat model, authorization contracts, and audit requirements.

| Document                                                        | Purpose                                        | Scope       | Version |
| --------------------------------------------------------------- | ---------------------------------------------- | ----------- | ------- |
| [THREAT_MODEL.md](security/THREAT_MODEL.md)                     | Threat actors, attack scenarios, mitigations   | Informative | 1.4     |
| [IAuthorization.v1.md](contracts/security/IAuthorization.v1.md) | Authorization interface (API boundary)         | NORMATIVE   | 1.0     |
| [AuditLog.v1.md](contracts/security/AuditLog.v1.md)             | Audit log schema, retention policy, compliance | NORMATIVE   | 1.0     |

**Key invariants**:

- **INV-SEC-1**: Authorization checks MUST happen at API boundary (never in engine)
- **INV-SEC-2**: Every authorization decision (grant/deny) MUST be audited
- **INV-SEC-3**: tenantId MUST be in every resource identifier
- **INV-SEC-4**: Audit logs are append-only, tamper-proof (7-year retention for compliance)

### �🔵 Adapter Specifications (Normative, Adapter-Specific)

Implementation contracts for orchestration platform adapters and storage backends.

**Execution Engine Adapters**:

| Document                                                                | Adapter                                              | Status    | Target                  |
| ----------------------------------------------------------------------- | ---------------------------------------------------- | --------- | ----------------------- |
| [TemporalAdapter.spec.md](adapters/temporal/TemporalAdapter.spec.md)    | Temporal                                             | NORMATIVE | Temporal 1.0+           |
| [Temporal Engine Policies](adapters/temporal/EnginePolicies.md)         | Temporal-specific policies (continue-as-new, limits) | NORMATIVE | Temporal 1.0+           |
| [ConductorAdapter.spec.md](adapters/conductor/ConductorAdapter.spec.md) | Conductor                                            | DRAFT     | Conductor 3.0+, Phase 2 |

**State Store Adapters**:

| Document                                                                           | Backend        | Status    | Features                                                        |
| ---------------------------------------------------------------------------------- | -------------- | --------- | --------------------------------------------------------------- |
| [Snowflake StateStoreAdapter](adapters/state-store/snowflake/StateStoreAdapter.md) | Snowflake      | NORMATIVE | DDL, MERGE patterns, clustering, stored procedures              |
| [Postgres StateStoreAdapter](adapters/state-store/postgres/StateStoreAdapter.md)   | PostgreSQL 14+ | NORMATIVE | Advisory-lock ordering, JSONB payloads, snapshots, outbox + DLQ |

### 🟠 Operations & Incident Response (Informative, Evolving)

Operational guides for running the engine in production.

| Document                                                           | Purpose                                         | Audience     | SLA         |
| ------------------------------------------------------------------ | ----------------------------------------------- | ------------ | ----------- |
| [observability.md](ops/observability.md)                           | Metrics, traces, logs, alerts, dashboards       | SRE, ops     | Phase 1 MVP |
| [SLOs.md](ops/SLOs.md)                                             | SLO targets, error budgets, cost baseline       | SRE, leads   | Phase 1 MVP |
| [runbooks/severity_matrix.md](ops/runbooks/severity_matrix.md)     | Severity definitions, alert mapping, escalation | On-call, SRE | Phase 1 MVP |
| [runbooks/incident_response.md](ops/runbooks/incident_response.md) | Step-by-step incident procedures                | On-call, SRE | 6 scenarios |

### 🟡 Developer Tooling (Informative, Gating)

Tools & policies for determinism, testing, CI/CD.

| Document                                                 | Purpose                        | Audience               | Enforcement            |
| -------------------------------------------------------- | ------------------------------ | ---------------------- | ---------------------- |
| [dev/determinism-tooling.md](dev/determinism-tooling.md) | Linting, replay tests, CI gate | Plan authors, SDK devs | Pre-commit (mandatory) |

### 🟣 Roadmap (Informative, Forward-Looking)

Phase breakdown, milestones, risks, staffing.

| Document                                             | Purpose                               | Audience                          | Timeline  |
| ---------------------------------------------------- | ------------------------------------- | --------------------------------- | --------- |
| [roadmap/engine-phases.md](roadmap/engine-phases.md) | Phases 1-4 breakdown, success metrics | Executives, PM, engineering leads | 2026-2027 |

---

## 📁 Directory Structure

```
docs/architecture/engine/
├── contracts/                             # Normative contracts (versionable)
│   ├── engine/
│   │   ├── IWorkflowEngine.v1.1.md         # [NORMATIVE] Interface + signals
│   │   ├── ExecutionSemantics.v1.md      # [NORMATIVE] Core execution semantics (agnostic)
│   │   ├── RunEventCatalog.v1.md         # [NORMATIVE ALIAS] Canonical run event catalog entrypoint
│   │   └── GlossaryContract.v1.md        # [NORMATIVE] Canonical terminology + identifier semantics
│   ├── state-store/
│   │   └── README.md                      # [NORMATIVE] Storage-agnostic State Store contract
│   ├── capabilities/
│   │   ├── capabilities.schema.json       # [EXECUTABLE] Capability enum
│   │   ├── adapters.capabilities.json     # [EXECUTABLE] Adapter matrix
│   │   ├── validation-report.schema.json  # [EXECUTABLE] Report schema
│   │   └── README.md                      # Integration guide
│   └── security/
│       ├── IAuthorization.v1.md          # [NORMATIVE] Authorization interface
│       └── AuditLog.v1.md                # [NORMATIVE] Audit log schema & retention
│
├── adapters/                              # Adapter-specific specs (normative)
│   ├── temporal/
│   │   ├── TemporalAdapter.spec.md       # [NORMATIVE] Temporal adapter
│   │   └── EnginePolicies.md             # [NORMATIVE] Temporal-specific policies (continue-as-new, limits)
│   ├── conductor/
│   │   └── ConductorAdapter.spec.md       # [DRAFT] Conductor adapter (Phase 2)
│   └── state-store/
│       ├── snowflake/
│       │   └── StateStoreAdapter.md       # [NORMATIVE] Snowflake implementation (DDL, MERGE, clustering)
│       └── postgres/
│           └── StateStoreAdapter.md       # [NORMATIVE] Postgres implementation (advisory lock, snapshots, outbox + DLQ)
│
├── security/                              # Security (informative + normative)
│   └── THREAT_MODEL.md                    # [INFORMATIVE] Threat actors, attack scenarios, mitigations
│
├── ops/                                   # Operations (informative, evolving)
│   ├── observability.md                   # Metrics, traces, logs, SLOs
│   ├── SLOs.md                            # SLO targets, error budgets, cost baseline
│   └── runbooks/
│       ├── incident_response.md           # 6 incident scenarios
│       └── severity_matrix.md             # Sev0-Sev3 definitions, alert mapping, escalation
│
├── dev/                                   # Developer tools (informative, gating)
│   └── determinism-tooling.md             # Linting, replay tests, CI gate
│
├── roadmap/                               # Roadmap (informative, forward-looking)
│   └── engine-phases.md                   # Phases 1-4, milestones, risks
│
├── VERSIONING.md                          # [NORMATIVE] Contract versioning policy
│
└── INDEX.md                               # ← You are here
```

---

## 🚀 Getting Started

### Phase 1 MVP (Temporal Only)

**For contract authors & reviewers**:

1. Read [VERSIONING.md](./VERSIONING.md) (versioning policy for contracts)

**For SDK implementers**:

1. Read [VERSIONING.md](./VERSIONING.md) (versioning policy for contracts)
2. Read [IWorkflowEngine.v1.md](contracts/engine/IWorkflowEngine.v1.md) (interface)
3. Read [ExecutionSemantics.v1.md](contracts/engine/ExecutionSemantics.v1.md) (core semantics, storage-agnostic)
4. Read [State Store Docs](contracts/state-store/README.md) (canonical entrypoint)
5. Choose storage backend:
   - [Snowflake StateStoreAdapter](adapters/state-store/snowflake/StateStoreAdapter.md) (DDL, MERGE patterns)
   - [Postgres StateStoreAdapter](adapters/state-store/postgres/StateStoreAdapter.md) (advisory-lock ordering, snapshots, outbox + DLQ)
6. Read [TemporalAdapter.spec.md](adapters/temporal/TemporalAdapter.spec.md) (adapter details)
7. Read [Temporal Engine Policies](adapters/temporal/EnginePolicies.md) (continue-as-new, limits)
8. Implement `IWorkflowEngine` interface
9. Implement interpreter workflow (DAG walker, activity dispatch)

**For plan authors**:

1. **Explore Golden Paths examples** (example pack pending publication in this repo)
   - `plan-minimal` - "Hello World" for the engine
   - `plan-parallel` - Parallel execution and fan-in pattern
   - `plan-cancel-and-resume` - Pause/resume signal handling
2. Read [dev/determinism-tooling.md](dev/determinism-tooling.md) (writing deterministic plans)
3. Read [contracts/capabilities/README.md](contracts/capabilities/README.md) (capability validation)
4. Author plan in plan schema v1.1
5. Run determinism CI gate (pre-commit)

**For SREs**:

1. Read [ops/observability.md](ops/observability.md) (metrics, dashboards)
2. Read [ops/SLOs.md](ops/SLOs.md) (SLO targets, error budgets)
3. Read [ops/runbooks/severity_matrix.md](ops/runbooks/severity_matrix.md) (severity definitions, escalation)
4. Read [ops/runbooks/incident_response.md](ops/runbooks/incident_response.md) (incident playbooks)
5. Deploy Prometheus + Grafana
6. Configure alerts

### Phase 2 (Conductor Adapter)

**Additions**:

1. Read [ConductorAdapter.spec.md](adapters/conductor/ConductorAdapter.spec.md) (DRAFT)
2. Implement DSL generator (plan → Conductor JSON)
3. Deploy Conductor cluster + task workers

### Phase 3+ (Advanced)

See [roadmap/engine-phases.md](roadmap/engine-phases.md) for Phase 3+ roadmap.

---

## ❓ Finding What You Need

### "What is the contract versioning policy?"

→ [VERSIONING.md](./VERSIONING.md)

### "How do I implement the engine interface?"

-> [IWorkflowEngine.v1.md](contracts/engine/IWorkflowEngine.v1.md) (Section 2)

### "What is the StateStore model?"

→ [ExecutionSemantics.v1.md](contracts/engine/ExecutionSemantics.v1.md) (Section 1)

### "What capabilities does Temporal support?"

→ [adapters.capabilities.json](contracts/capabilities/adapters.capabilities.json)

### "How do I write a deterministic plan?"

→ [dev/determinism-tooling.md](dev/determinism-tooling.md) (Section 7)

### "What are the security requirements?"

→ [security/THREAT_MODEL.md](security/THREAT_MODEL.md) (threat scenarios, mitigations)  
→ [contracts/security/IAuthorization.v1.md](contracts/security/IAuthorization.v1.md) (authorization interface)  
→ [contracts/security/AuditLog.v1.md](contracts/security/AuditLog.v1.md) (audit log schema, compliance)

### "What are the SLO targets and error budgets?"

→ [ops/SLOs.md](ops/SLOs.md)

### "What severity level is this incident?"

→ [ops/runbooks/severity_matrix.md](ops/runbooks/severity_matrix.md)

### "How do I respond to a production incident?"

→ [ops/runbooks/incident_response.md](ops/runbooks/incident_response.md)

### "What's the product roadmap?"

→ [roadmap/engine-phases.md](roadmap/engine-phases.md)

### "How do I interpret the dual attempt IDs?"

→ [ExecutionSemantics.v1.md](contracts/engine/ExecutionSemantics.v1.md) (Section 1.3)
→ [GlossaryContract.v1.md](contracts/engine/GlossaryContract.v1.md) (Sections 2-5)

---

## Architecture Views

| Document                     | Purpose                                                            | Scope                | Updated    |
| ---------------------------- | ------------------------------------------------------------------ | -------------------- | ---------- |
| [c4-engine.md](c4-engine.md) | C4 context, container and component views for the engine subsystem | Logical architecture | 2026-03-05 |

### "How do I handle signals (PAUSE, CANCEL, etc.)?"

-> [IWorkflowEngine.v1.md](contracts/engine/IWorkflowEngine.v1.md) (Sections 2.2-2.4)

---

## 🔄 Document Relationships

```
IWorkflowEngine.v1.1.md
  ├─ references: ExecutionSemantics.v1.md (state model)
  ├─ references: TemporalAdapter.spec.md (implementation)
  └─ references: contracts/capabilities/ (validation)

ExecutionSemantics.v1.md
  ├─ defines: runSeq, events, snapshots, projector rules
  └─ references: TemporalAdapter.spec.md (continueAsNew policy)

TemporalAdapter.spec.md
  ├─ implements: IWorkflowEngine.v1.1.md (interpreter workflow)
  ├─ depends on: ExecutionSemantics.v1.md (state model)
  └─ references: dev/determinism-tooling.md (versioning)

ConductorAdapter.spec.md (DRAFT, Phase 2)
  ├─ implements: IWorkflowEngine.v1.1.md (emulated)
  ├─ depends on: ExecutionSemantics.v1.md (state model)
  └─ references: contracts/capabilities/adapters.capabilities.json (parity)

observability.md
  ├─ monitors: IWorkflowEngine.v1.1.md (interface health)
  ├─ monitors: ExecutionSemantics.v1.md (StateStore health)
  ├─ references: SLOs.md (target thresholds)
  └─ references: runbooks/incident_response.md (alerts → procedures)

SLOs.md
  ├─ defines: SLO targets per subsystem
  ├─ references: observability.md (metrics definitions)
  └─ references: runbooks/severity_matrix.md (breach → severity)

severity_matrix.md
  ├─ maps: observability.md alerts → severity levels
  ├─ references: SLOs.md (SLO ↔ severity relationship)
  └─ references: runbooks/incident_response.md (procedures)

determinism-tooling.md
  ├─ enforces: ExecutionSemantics.v1.md (determinism invariant)
  ├─ validates: TemporalAdapter.spec.md (getVersion pattern)
  └─ gates: Pre-commit + CI/CD

engine-phases.md
  ├─ includes: All contracts + specs above
  └─ defines: Timeline + success criteria for each phase
```

---

## 📝 Document Standards

### Normative Contracts (`v1.x`)

- **Immutable core**: MUST sections never change without major version bump.
- **Backward compatible**: v1.1 extends v1.0 without breaking.
- **Small & focused**: 1-5 pages, tight prose, numbered sections.
- **Examples included**: Code snippets, schemas, pseudocode.

**How to version**:

- Bug fix or clarification → v1.1 (minor bump)
- New optional capability → v1.2 (minor bump)
- Breaking change → v2.0 (major bump, multi-month deprecation window)

### Adapter Specifications

- **Status label**: NORMATIVE (Phase 1+) or DRAFT (Phase 2+)
- **Scope**: Adapter-specific implementation details + invariants
- **Limits documented**: Timeouts, payload sizes, concurrency

**How to extend**:

- New feature (e.g., custom task queue) → update spec, version bump
- Limitation discovered → document, update parity matrix, consider emulation

### Operational Guides (Informative)

- **Purpose**: "How to operate, debug, respond to incidents"
- **Audience**: SRE, ops, plan authors
- **Stability**: Evolve freely (no versioning needed)

**Maintenance**:

- Update based on incident learnings
- Refresh metrics/dashboards quarterly

---

## 🔗 Cross-Document Links

All internal references use **relative markdown links** (portable, versionable).

```markdown
# Example: Linking from ConductorAdapter.spec.md to capability matrix

→ See [parity matrix](contracts/capabilities/adapters.capabilities.json)

# Example: Linking from incident_response.md to observability

→ Check [alert rules](ops/observability.md#2-key-metrics-phase-1)
```

---

## ✅ Checklist: Document Maintenance

**Monthly**:

- [ ] Review incident postmortems; update runbooks (ops/)
- [ ] Check Temporal + Conductor version updates; update adapter specs if needed
- [ ] Verify observability dashboards still functional

**Quarterly**:

- [ ] Performance analysis; update SLOs if needed (ops/observability.md)
- [ ] Roadmap review; update roadmap/engine-phases.md with progress
- [ ] Capability matrix review; any new adapters or platforms?

**Annually**:

- [ ] Full contract review (contracts/); any deprecated features to retire?
- [ ] Determinism rulebase review (dev/); add rules discovered from incidents?
- [ ] Deprecation timeline; any v1.x contracts approaching v2.0?

---

## 📊 Document Metrics

| Document                 | Size             | Type     | Stability      | Audience         |
| ------------------------ | ---------------- | -------- | -------------- | ---------------- |
| IWorkflowEngine.v1.1.md  | 120 lines        | Contract | HIGH           | SDK devs         |
| ExecutionSemantics.v1.md | 280 lines        | Contract | HIGH           | Engine impl      |
| VERSIONING.md            | 320 lines        | Policy   | HIGH           | Contract authors |
| TemporalAdapter.spec.md  | 300 lines        | Adapter  | HIGH           | Temporal SDK     |
| ConductorAdapter.spec.md | 220 lines        | Adapter  | MEDIUM (DRAFT) | Conductor SDK    |
| observability.md         | 280 lines        | Guide    | MEDIUM         | SRE              |
| SLOs.md                  | 180 lines        | Guide    | MEDIUM         | SRE, leads       |
| severity_matrix.md       | 200 lines        | Guide    | MEDIUM         | On-call, SRE     |
| incident_response.md     | 350 lines        | Guide    | MEDIUM         | On-call          |
| determinism-tooling.md   | 320 lines        | Guide    | LOW            | Plan authors     |
| engine-phases.md         | 350 lines        | Roadmap  | LOW            | Execs            |
| capabilities/ (4 files)  | 400 lines        | Schemas  | HIGH           | Validation       |
| THREAT_MODEL.md          | 517 lines        | Guide    | MEDIUM         | Security eng     |
| IAuthorization.v1.md     | 359 lines        | Contract | HIGH           | API devs         |
| AuditLog.v1.md           | 425 lines        | Contract | HIGH           | Compliance       |
| **TOTAL**                | **~4,741 lines** | Mixed    | -              | -                |

**Previous monolith (WORKFLOW_ENGINE.md)**: 3,227 lines (47% expansion for security + clarity ✅)

---

## 📞 Support & Questions

- **Contract questions?** → File issue in engine-contracts project
- **Implementation help?** → Check relevant adapter spec + runbooks
- **Incident response?** → Follow runbooks/incident_response.md
- **Roadmap updates?** → Reach out to PM (@engine-roadmap-owner)

---

## 🔐 Approval & Ownership

| Document                 | Owner              | Last Reviewed | Next Review |
| ------------------------ | ------------------ | ------------- | ----------- |
| IWorkflowEngine.v1.1.md  | @engine-lead       | 2026-02-11    | 2026-05-11  |
| ExecutionSemantics.v1.md | @engine-lead       | 2026-02-11    | 2026-05-11  |
| VERSIONING.md            | @architecture-lead | 2026-02-11    | 2026-12-11  |
| TemporalAdapter.spec.md  | @temporal-lead     | 2026-02-11    | 2026-05-11  |
| ConductorAdapter.spec.md | @conductor-lead    | 2026-02-11    | 2026-06-11  |
| observability.md         | @sre-lead          | 2026-02-11    | 2026-03-11  |
| SLOs.md                  | @sre-lead          | 2026-02-15    | 2026-05-15  |
| severity_matrix.md       | @sre-oncall        | 2026-02-15    | 2026-05-15  |
| incident_response.md     | @sre-oncall        | 2026-02-11    | 2026-02-18  |
| determinism-tooling.md   | @qa-lead           | 2026-02-11    | 2026-04-11  |
| engine-phases.md         | @pm-lead           | 2026-02-11    | 2026-05-11  |
| THREAT_MODEL.md          | @security-lead     | 2026-02-11    | 2026-05-11  |
| IAuthorization.v1.md     | @security-lead     | 2026-02-11    | 2026-08-11  |
| AuditLog.v1.md           | @security-lead     | 2026-02-11    | 2026-08-11  |

---

## Version History

| Version | Date       | Change                                                        |
| ------- | ---------- | ------------------------------------------------------------- |
| 0.1     | 2026-02-11 | Partition WORKFLOW_ENGINE.md into 8 modular documents         |
| 1.0     | 2026-02-11 | First stable index (Phase 1 MVP complete)                     |
| 1.1     | 2026-02-11 | Add VERSIONING.md (contract versioning policy)                |
| 1.2     | 2026-02-12 | Add Security section (THREAT_MODEL, IAuthorization, AuditLog) |
