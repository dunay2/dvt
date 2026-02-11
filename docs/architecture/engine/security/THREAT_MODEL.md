# THREAT_MODEL.md - DVT Engine Security Analysis

**Version**: 1.0  
**Date**: 2026-02-11  
**Status**: Informative (Living Document)

---

## Executive Summary

The DVT Engine is a **multi-tenant workflow orchestration platform**. This threat model documents:
- Threat actors and their capabilities
- Assets to protect (plans, run state, audit logs)
- Threat scenarios with likelihood/impact assessment
- Security boundaries and mitigations
- Compliance requirements (SOC2, HIPAA, GDPR)

**Design principle**: Security enforced at architectural boundaries (API, Engine, StateStore, Plugin), not as afterthought.

---

## Threat Actors

### 1. External Attacker
- **Goal**: Access other tenant's data or infrastructure
- **Capabilities**: Network-based attacks, credential theft, zero-day exploits
- **Attack surface**: API endpoint, exposed credentials in logs, third-party dependencies
- **Likelihood**: High | **Impact**: Critical

### 2. Malicious Tenant
- **Goal**: Escape sandbox, DoS engine, exfiltrate data from other tenants
- **Capabilities**: Can write arbitrary workflow plans, install plugins, consume resources
- **Attack surface**: Plugin code execution, expensive plans (.e.g infinite loops), resource quotas
- **Likelihood**: Medium | **Impact**: High

### 3. Compromised Plugin
- **Goal**: Steal secrets, escape sandbox, DoS engine, exfiltrate data
- **Capabilities**: Execute code within plugin runtime, access plan secrets, call external APIs
- **Attack surface**: Plugin marketplace (supply chain), plugin code execution
- **Likelihood**: Low | **Impact**: High

### 4. Insider Threat
- **Goal**: Excessive access to sensitive data, audit log tampering
- **Capabilities**: Database access, log access, override controls
- **Attack surface**: Database credentials, operator access, audit log storage
- **Likelihood**: Low | **Impact**: Critical

### 5. Noisy Neighbor / Accidental DoS
- **Goal**: Not malicious, but consumes excessive resources (honest mistake)
- **Capabilities**: Submits expensive plans, creates infinite loops
- **Attack surface**: Resource quotas, plan complexity limits
- **Likelihood**: High | **Impact**: Medium

---

## Assets to Protect

| Asset | Sensitivity | Rationale |
|-------|-------------|-----------|
| **Workflow Plans** | High | May contain business logic, credentials, API keys, PII |
| **Run State** | High | May contain intermediate results with PII, secrets, artifacts |
| **Audit Logs** | Medium | Compliance requirement (SOC2, HIPAA, GDPR), tamper-proof |
| **Infrastructure** | Medium | Compute, storage, network (DoS impact, cost) |
| **Plugin Marketplace** | Medium | Supply chain security, malicious code injection |
| **Tenant Metadata** | Low | Names, contact info, subscription tier |

---

## Threat Scenarios

### High-Risk Scenarios

| # | Threat | Likelihood | Impact | Mitigation |
|---|--------|-----------|--------|-----------|
| **T1** | Tenant A reads Tenant B's plan via API | Medium | **Critical** | **Row-level security (RLS)** on plans table; tenantId in all queries; RBAC authorization at API boundary |
| **T2** | Plugin escapes sandbox, accesses host filesystem | Low | **Critical** | Resource limits (CPU, memory, network, file access); timeout enforcement; seccomp/AppArmor; no symlinks to sensitive paths |
| **T3** | SQL Injection in API (SELECT * FROM plans WHERE id = {id}) | Low | **Critical** | Parameterized queries, ORM, input validation, WAF |
| **T4** | Audit log tampering (delete evidence of breach) | Low | **Critical** | **Append-only storage** (immutable log stream); cryptographic signatures (HMAC); separate audit DB with restricted access |
| **T5** | Credential leak in logs (plan contains API key, logged as-is) | Medium | **High** | Log scrubbing (regex scan for secrets); redact before logging; encryption at rest for logs |
| **T6** | Tenant B DoS engine with expensive plan (infinite loop, recursive calls) | Medium | **Medium** | Cost attribution (charge tenant for CPU/memory); per-tenant quotas (max 1000 concurrent runs); plan complexity limits; timeout enforcement |
| **T7** | Insider access to prod database (engineer deletes customer audit logs) | Low | **Critical** | Encryption at rest; separate audit DB with restricted access; multi-factor authentication; audit log of database access |
| **T8** | Compromised dependency (e.g., Temporal SDK) contains backdoor | Low | **High** | Dependency scanning (Dependabot, Snyk); SBOM verification; supply chain security best practices |

### Medium-Risk Scenarios

| # | Threat | Likelihood | Impact | Mitigation |
|---|--------|-----------|--------|-----------|
| **T9** | Plugin calls external API to exfiltrate data | Medium | **Medium** | Network egress controls (whitelist allowed domains); rate limiting; logging all external calls |
| **T10** | Timing attack on authorization (slow response = resource exists) | Low | **Low** | Constant-time authorization checks; generic error messages |
| **T11** | CSRF attack (malicious website triggers action on behalf of user) | Low | **Medium** | CSRF tokens in forms; SameSite cookies; origin validation |
| **T12** | Replay attack (replay old authorization token or API call) | Low | **High** | JWT expiration (short-lived tokens); request signing with nonce; TLS only |

---

## Security Boundaries

### 1. API Boundary (Trust Line)
**Location**: API gateway / REST endpoint  
**Responsibility**: 
- Authentication (verify identity)
- Authorization (verify permission via RBAC)
- Input validation (schema validation, size limits)
- Rate limiting (per-tenant quotas)
- TLS enforcement

**Assumption**: Everything past this boundary is trusted (engine received pre-authorized commands)

---

### 2. Engine Boundary (Compute Trust Line)
**Location**: IWorkflowEngine interface  
**Responsibility**:
- Assume commands are pre-authorized
- Enforce tenant isolation (only execute commands for correct tenant)
- Enforce determinism (no side effects)
- Emit events to outbox (not direct side effects)

**Assumption**: Engine does NOT do authorization; API already did that

---

### 3. StateStore Boundary (Data Trust Line)
**Location**: IStateStoreAdapter interface  
**Responsibility**:
- Enforce row-level security (RLS) - tenant A cannot read tenant B's rows
- Enforce ACID on state mutations
- Audit all writes (via outbox)
- Encrypt sensitive data at rest

**Guarantees**:
- tenantId must be in every row identifier
- Query results filtered by tenantId (at DB level, not application level)
- All writes transactional with audit event

---

### 4. Plugin Boundary (Sandbox)
**Location**: Plugin execution environment  
**Responsibility**:
- Resource limits (CPU, memory, network, file I/O)
- Timeout enforcement (max execution time)
- No access to host filesystem (except sandbox directory)
- No network access (except whitelisted domains)
- No access to other tenant's data (even if plugin runs for multiple tenants)

**Technologies**:
- Docker containers (process isolation)
- cgroups (CPU/memory limits)
- seccomp / AppArmor (syscall filtering)
- Timeout enforcement (kill process after N seconds)

---

## Design Principles

### 1. Defense in Depth
Multiple layers of security:
- API boundary (RBAC)
- Database level (RLS, encryption)
- Plugin sandbox (resource limits)
- Audit trail (compliance)

### 2. Security by Design
Security decisions made **in Phase 1 documentation**, not bolted on in Phase 3.

### 3. Auditability First
**Every** authorization decision, state mutation, and API call is audited.

### 4. Least Privilege
- Plugins run with minimal permissions
- Service accounts have role-specific access
- Operators cannot override authorization

### 5. Tenant Isolation Invariant
**Invariant**: Tenant A cannot read, write, or infer Tenant B's data.

## Compliance Requirements

### SOC2 Type II
- **Audit Log**: All access to sensitive data logged, searchable, tamper-proof
- **Access Control**: Documented RBAC, tested authorization
- **Change Management**: Audit trail of configuration changes
- **Incidence Response**: Plan for breach detection (via audit logs)

### HIPAA
- **PHI Access Logging**: All access to Protected Health Information audited
- **Encryption**: At-rest and in-transit encryption
- **Audit Log Retention**: 6 years
- **Data Deletion**: Right to be forgotten (delete PHI and related audit logs)

### GDPR
- **Right to Access**: User can query audit logs for their data access
- **Right to be Forgotten**: Delete user's data and audit logs (subject to retention)
- **Data Minimization**: Don't log unnecessary PII
- **Purpose Limitation**: Only audit for purposes disclosed in privacy policy

---

## Mitigation Summary

| Control | Implemented | Phase |
|---------|-------------|-------|
| **API Authentication** | JWT, OAuth2 | Phase 0 (assumed) |
| **RBAC Authorization** | IAuthorization.v1.md contract | Phase 1 (docs), Phase 4 (impl) |
| **Row-Level Security (RLS)** | DB-enforced tenant isolation | Phase 2 (#6 StateStoreAdapter) |
| **Log Scrubbing** | Regex scan for secrets | Phase 1.5 (docs), Phase 2 (impl) |
| **Audit Log (append-only)** | AuditLog.v1.md contract + immutable stream | Phase 1 (docs), Phase 3 (impl) |
| **Encryption at Rest** | StateStore adapter responsibility | Phase 2 (#6) |
| **Plugin Sandbox** | Resource limits + seccomp | Phase 3 (epic) |
| **Cost Attribution** | Per-tenant quotas, metering | Phase 3 (epic) |
| **Dependency Scanning** | Dependabot, Snyk in CI | Phase 1.5 (docs), Phase 2 (impl) |

---

## References

- [IAuthorization.v1.md](contracts/security/IAuthorization.v1.md) - Normative authorization interface
- [AuditLog.v1.md](contracts/security/AuditLog.v1.md) - Normative audit log schema
- [Product Definition](../../../README.md#product-definition) - Multi-tenant, auditability
- [design_principles.md](../design_principles.md) - Architecture principles

---

_Last updated: 2026-02-11_
