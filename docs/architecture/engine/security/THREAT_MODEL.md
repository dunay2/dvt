# THREAT_MODEL.md - DVT Engine Security Analysis

**Version**: 1.5  
**Date**: 2026-02-12  
**Status**: Informative (Living Document)  
**Location**: docs/architecture/engine/security/THREAT_MODEL.md

---

## Executive Summary

The DVT Engine is a multi-tenant workflow orchestration platform. This threat model documents:

- Threat actors and their capabilities
- Assets to protect (plans, run state, audit logs)
- Threat scenarios with likelihood/impact assessment (**descriptive**: what can go wrong and why)
- Security boundaries and mitigations (with visual trust lines)
- Compliance requirements (SOC2, HIPAA, GDPR)
- Plugin security model
- Execution Semantics v1.9 alignment

**Key Distinction**: This document is **descriptive** (threat scenarios, risk analysis). **Normative requirements** are in **[SECURITY_INVARIANTS.v1.md](SECURITY_INVARIANTS.v1.md)** and **[TENANT_ISOLATION_TESTS.v1.md](TENANT_ISOLATION_TESTS.v1.md)** (must satisfy all invariants; violations = security incidents). Mitigations mentioned here are informative; see normative contracts for implemention requirements.

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
- **Attack surface**: Plugin code execution, expensive plans (e.g., infinite loops), resource quotas
- **Likelihood**: Medium | **Impact**: High

### 3. Compromised Plugin

- **Goal**: Steal secrets, escape sandbox, DoS engine, exfiltrate data
- **Capabilities**: Execute code within plugin runtime, access plan secrets, call external APIs
- **Attack surface**: Plugin marketplace (supply chain), unsigned or unverified plugin bundles, plugin code execution
- **Likelihood**: Medium (unsigned plugins) / Low (signed but compromised) | **Impact**: Critical
- **Key Mitigation**: Cryptographic signature verification (INV-PLUGIN-01), reject unsigned/unknown provenance, SBOM + vulnerability scanning (T13)

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

| Asset                  | Sensitivity | Rationale                                                                                           |
| ---------------------- | ----------- | --------------------------------------------------------------------------------------------------- |
| **Workflow Plans**     | High        | May reference secrets (secret IDs), contain business logic, and encode PII-relevant transformations |
| **Run State**          | High        | May contain intermediate results with PII, secret references, artifacts                             |
| **Audit Logs**         | Medium      | Compliance requirement (SOC2, HIPAA, GDPR), tamper-proof                                            |
| **Infrastructure**     | Medium      | Compute, storage, network (DoS impact, cost)                                                        |
| **Plugin Marketplace** | Medium      | Supply chain security, malicious code injection                                                     |
| **Tenant Metadata**    | Low         | Names, contact info, subscription tier                                                              |

---

Deployment Modes

The security posture varies significantly depending on deployment architecture. This threat model applies to all modes but with mode-specific constraints:

| Mode                            | Tenant Isolation                    | Trust Tier 3                              | Audit Log Access                                       | Quota Enforcement            | Sandbox Tier                             |
| ------------------------------- | ----------------------------------- | ----------------------------------------- | ------------------------------------------------------ | ---------------------------- | ---------------------------------------- |
| **Multi-Tenant SaaS**           | Cryptographic + DB RLS              | ❌ Explicitly forbidden (INV-PLUGIN-04)   | Auditor role only; tenant cannot read own logs in prod | Mandatory (T6 DoS risk)      | Tier 1 (gVisor) default                  |
| **Dedicated Tenant Isolation**  | Physical/virtual isolation + RLS    | ⚠️ Allowed with strong audit + monitoring | Auditor access only; may delegate to tenant operator   | Mandatory per SLA            | Tier 1/2 recommended                     |
| **Single-Tenant / Self-Hosted** | Application-layer scope enforcement | ✅ Allowed; operator has root access      | Full access (logs == internal system logs)             | Not required (single tenant) | Any (Tier 3 acceptable if self-operated) |

**Implication for this threat model**:

- **T6** (Noisy Neighbor DoS): Relevant only in multi-tenant SaaS; less critical in dedicated isolation
- **T7** (Insider threat): Critical in SaaS + dedicated; managed differently in single-tenant
- **T14** (Operator justification): Mandatory in all modes; enforcement differs (regulatory in SaaS, internal in self-hosted)
- **Audit retention**: Multi-tenant SaaS = 6-7 years (regulatory); single-tenant = policy-driven
- **Tier 3 prohibition**: See INV-PLUGIN-04; multi-tenant SaaS Monly, TLS 1.2 rejected (INV-CRYPTO-02) | [SECURITY_INVARIANTS.v1.md](SECURITY_INVARIANTS.v1.md#encryption-invariants) |

**Note on TLS 1.3+ Requirement**: This is a deliberate product stance: **TLS 1.2 connections MUST be rejected**. Rationale: TLS 1.2 has deprecated cipher suites, requires stronger operational discipline, and is end-of-life for most cloud providers. Organizations requiring legacy TLS 1.2 support must be declined or deployed on isolated infrastructure. See [OWASP Transport Layer Protection Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html) for technical rationale.

---

## 🔐 Security Invariants (Testable)

Every DVT Engine deployment MUST satisfy these invariants. Violations are considered security incidents.

**For complete invariant specifications, see the normative contract**: **[SECURITY_INVARIANTS.v1.md](SECURITY_INVARIANTS.v1.md)**

### Invariant Summary

| Category               | Key Invariants                                                                                                                                  | Reference                                                                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Scope Enforcement**  | Immutable tenant context (INV-SCOPE-01); StateStore scope required (INV-SCOPE-02); No cross-tenant inference (INV-SCOPE-03)                     | [SECURITY_INVARIANTS.v1.md](SECURITY_INVARIANTS.v1.md#scope-enforcement-invariants)                                                                 |
| **Secrets Management** | No plaintext secrets (INV-SECRETS-01); ISecretsProvider only                                                                                    | [SECURITY_INVARIANTS.v1.md](SECURITY_INVARIANTS.v1.md#secrets-management-invariants)                                                                |
| **Audit Logging**      | Append-only audit log (INV-AUDIT-01); All state mutations audited (INV-AUDIT-02); Trusted timestamps (INV-AUDIT-03)                             | [SECURITY_INVARIANTS.v1.md](SECURITY_INVARIANTS.v1.md#audit-invariants)                                                                             |
| **Plugin Security**    | Cryptographic signature verification (INV-PLUGIN-01); Network egress allowlist (INV-PLUGIN-02); Permission manifest enforcement (INV-PLUGIN-03) | [SECURITY_INVARIANTS.v1.md](SECURITY_INVARIANTS.v1.md#plugin-security-invariants), [PLUGIN_PROVENANCE_POLICY.v1.md](PLUGIN_PROVENANCE_POLICY.v1.md) |
| **Engine Boundaries**  | Determinism enforcement (INV-ENGINE-01); No default tenant (INV-ENGINE-02)                                                                      | [SECURITY_INVARIANTS.v1.md](SECURITY_INVARIANTS.v1.md#engine-boundary-invariants)                                                                   |
| **Encryption**         | Encryption at rest (INV-CRYPTO-01); TLS 1.3+ enforcement (INV-CRYPTO-02)                                                                        | [SECURITY_INVARIANTS.v1.md](SECURITY_INVARIANTS.v1.md#encryption-invariants)                                                                        |

**Related Normative Contracts**:

- **[PLUGIN_PROVENANCE_POLICY.v1.md](PLUGIN_PROVENANCE_POLICY.v1.md)**: Plugin supply chain security requirements
- **[TENANT_ISOLATION_TESTS.v1.md](TENANT_ISOLATION_TESTS.v1.md)**: Mandatory isolation test suite

---

## Security Boundaries & Trust Lines

### Visual Trust Model (Illustrative)

Diagram is illustrative; normative requirements are defined in **Security Invariants** and **normative contracts**.  
This diagram visualizes trust boundaries but does not replace the text specification.

```mermaid
graph LR
    subgraph Internet
        User((User/Client))
    end

    subgraph API_Gateway [API Boundary - Trust Line 1]
        direction TB
        AuthN[Authentication JWT/mTLS]
        AuthZ{IAuthorization RBAC}
        Validate[Input Validation]
        RateLimit[Rate Limiting]
    end

    subgraph Core_Engine [Engine Boundary - Trust Line 2]
        direction TB
        Workflow[Workflow Orchestrator]
        ScopeCheck[Tenant Scope Enforcement]
        Determinism[Determinism Enforcer]
        State[(StateStore RLS + TenantScope)]
    end
TenantScope + CorrelationIds + (optional) SignedAuthzDecisionEnvelope
    subgraph Audit_System [Audit Boundary - Trust Line 3]
        direction TB
        AuditLog[(Immutable Audit Store)]
        DecisionRec[Decision Records v1.9]
        Sign[HMAC Signer - KMS/HSM]
    end

    subgraph Sandbox [Plugin Boundary - Sandbox]
        direction TB
        Tier1[[Trust Tier 1: gVisor/isolated-vm]]
        Tier2[[Trust Tier 2: Container]]
        Tier3[[Trust Tier 3: Host Process]]
        Code[Plugin Code]
    end

    User -->|JWT/TLS| API_Gateway

    API_Gateway -->|Authorized Plan + Tenant Context| Core_Engine

    Core_Engine -->|Limited Context + TenantScope| Sandbox
    Core_Engine -->|State Reads/Writes| State

    State -.->|Audit Events| Audit_System
    Core_Engine -.->|Operator Actions + Justification| Audit_System
    API_Gateway -.->|AuthZ Decisions| Audit_System

    Sandbox -->|Egress Allowlist| Internet

    style AuthZ fill:#ff9900,stroke:#333
    style ScopeCheck fill:#ff9900,stroke:#333
    style AuditLog fill:#6c757d,stroke:#333
    style Tier1 fill:#28a745,stroke:#333
    style Tier2 fill:#ffc107,stroke:#333
    style Tier3 fill:#dc3545,stroke:#333
```

---

| **T20** | Signer key compromise → attacker forges audit entries or auth decisions | Low | **Critical** | **Key separation + HSM/KMS**: HMAC signer key isolated from write-only log service; asymmetric signing (RSA/ECDSA) optional for non-repudiation; key export requires dual control + admin approval; rotation + alerting on key access; KMS audit log tracks all key operations; see [NIST SSDF](https://csrc.nist.gov/projects/ssdf) |

## Threat Scenarios

**Descriptive vs. Prescriptive Distinction**:

- **Threat scenarios** (this section): Descriptive analysis of what can go wrong, likelihood, impact assessment, and mitigation approaches
- **Security Invariants** ([SECURITY_INVARIANTS.v1.md](SECURITY_INVARIANTS.v1.md)): Normative, testable requirements that implementations MUST satisfy
- **Test Suite** ([TENANT_ISOLATION_TESTS.v1.md](TENANT_ISOLATION_TESTS.v1.md)): Validation procedures for invariants

This document identifies risks; normative contracts define what MUST hold. Treat mitigations mentioned here as guidance, not implementation specifications.

**Threat Modeling Methodology**: See [OWASP Threat Modeling Guide](https://owasp.org/www-community/Threat_Modeling) for principles of risk analysis, attack surface identification, and mitigation prioritization.

**Note**: Threat IDs are stable; gaps in numbering exist due to retired or consolidated threats from earlier versions.

### High-Risk Scenarios

**Masking mode + cache control**: Per [TENANT_ISOLATION_TESTS.v1.md](TENANT_ISOLATION_TESTS.v1.md) ISOL-TIMING/ISOL-ORACLE, masked endpoints return **403 Forbidden** (not 404) for cross-tenant access attempts; constant-time checks; generic error messages; **Cache-Control: no-store** header on all masked endpoints (per [RFC 9111](https://www.rfc-editor.org/rfc/rfc9111.html) § 5.2.2.1) to prevent cache oracles; conditional request validation (ETags must not leak existence); AuthZ decision cached per-request only (not shared across requests)
| # | Threat | Likelihood | Impact | Mitigation |
| ------- | ------------------------------------------------------------------------ | ---------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **T1** | Tenant A reads Tenant B's plan via API | Medium | **Critical** | **Row-level security (RLS)** on plans table; `tenantId` in all queries (INV-SCOPE-01, INV-SCOPE-02, INV-SCOPE-03); RBAC authorization at API boundary per `IAuthorization.v1.md`; SQL-level tenant binding with session scope; no cross-tenant inference via timing/errors |
| **T2** | Plugin escapes sandbox, accesses host filesystem | Low | **Critical** | **Trust Tier enforcement** (Tier 1 gVisor: zero FS access; Tier 2/3: scoped temp only); resource limits (CPU, memory, network per tier); timeout enforcement; seccomp/AppArmor; no symlinks to sensitive paths; plugin manifest permission checks |
| **T3** | SQL Injection in API (SELECT \* FROM plans WHERE id = {id}) | Low | **Critical** | Parameterized queries; ORM usage; input validation at API boundary; WAF; belt + suspenders: RLS prevents cross-tenant data exposure even if SQLi succeeds |
| **T17** | Confused deputy: plugin uses engine identity to access resources (artifacts, state) it shouldn't; or operator uses admin identity to access cross-tenant audit logs | Medium | **High** | **Distinct plugin principal**: Plugin identity isolated from engine/operator identity; every internal resource access (artifact, state, log read) authorized against plugin principal + tier + manifest; plugin claims in JWT bound to `pluginId` + `executionId` (non-transferable); see [OWASP API Security #5 (BOLA)](https://owasp.org/www-project-api-security/) |
| **T18** | SSRF via plugin egress allowlist: even with DNS allowlist, plugin reaches internal metadata endpoints (169.254.x.x, link-local) or does DNS rebinding | Medium | **Medium** | **Egress proxy mandatory for Tier 2/3**: Block RFC1918 (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16), 127.0.0.0/8, 169.254.0.0/16, 224.0.0.0/4 to egress allowlist; DNS rebinding protection (DNSSEC, response validation, TTL limits); per-tier granularity (Tier 1 = zero egress blocks this) |
| **T19** | Log/metric exfiltration channel: even if plugin egress blocked, logs/metrics leak data (tenants read own logs, structured data carries PII, log retention too long) | Medium | **Medium** | **Log scrubbing + payload controls**: Redact PII/secret patterns in logs; classify logs (public/internal/pii); size limits per log entry (1KB default, configurable); tenant access to logs limited (read own, or auditor only); retention policy enforces deletion (see Retention Policy Summary); see [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) |
| **T4** | Audit log tampering (delete evidence of breach) | Low | **Critical** | **Append-only storage** (INV-AUDIT-01); cryptographic signatures (HMAC-SHA256) per entry; separate credentials for write-only signer vs. read-only auditor; immutable storage backend (S3 Object Lock, immutable table); KMS-backed HMAC key rotation |
| **T5** | Secret leak in logs (plan contains API key, logged as-is) | Medium | **High** | **ISecretsProvider**: Engine never logs secret values, only secret IDs; log scrubbing (regex scan for secret patterns); secrets MUST NOT be persisted in any workflow-engine execution history; adapters MUST ensure exclusion; encryption at rest for logs; redaction filters in observability pipeline (see [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)) |
| **T6** | Tenant B DoS engine with expensive plan (infinite loop, recursive calls) | Medium | **Medium** | Cost attribution (charge tenant for CPU/memory); per-tenant quotas (max 1000 concurrent runs); plan complexity limits; timeout enforcement per plugin tier; circuit breakers; rate limiting at API boundary (per deployment policy) |
| **T7** | Insider access to prod database (engineer deletes customer audit logs) | Low | **Critical** | Encryption at rest (INV-CRYPTO-01); separate audit DB with restricted access; multi-factor authentication for admin; audit log of database access; **Decision Records** (INV-AUDIT-02): All operator actions logged with actorId + justification; no anonymous admin operations |
| **T8** | Compromised dependency (e.g., Temporal SDK) contains backdoor | Low | **High** | Dependency scanning (Dependabot, Snyk); **SBOM generation** (CycloneDX); supply chain controls: all plugin bundles signed (Sigstore/Cosign); verification at install + load; SLSA Build Track L2 goal for official marketplace; provenance verification |
| **T13** | Malicious plugin unsigned or unknown provenance installed | Medium | **Critical** | **Supply chain enforcement**: All plugin bundles MUST be cryptographically signed (INV-PLUGIN-01); verification binds signature → digest + trusted issuer; plugin catalog tamper-evident (INV-PLUGIN-05); reject unsigned/unknown provenance per [PLUGIN_PROVENANCE_POLICY.v1.md](PLUGIN_PROVENANCE_POLICY.v1.md); official marketplace enforces SBOM + vulnerability scan in CI; deny Tier 3 in multi-tenant SaaS by default (INV-PLUGIN-04) |
| **T14** | Operator cancels workflow without justification (unauditable action) | Medium | **High** | **Decision Records mandatory** (INV-AUDIT-02): All PAUSE, CANCEL, RESTART operations emit Decision Record with `actorId` + `justificationText`; audit system flags missing justifications; alerting on anonymous operator actions; retention per compliance policy |

### Medium-Risk Scenarios

| #       | Threat                                                                                                                                                                  | Likelihood | Impact     | Mitigation                                                                                                                                                                                                                                                                                                                                       |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **T9**  | Plugin calls external API to exfiltrate data                                                                                                                            | Medium     | **Medium** | **Tier-based network egress** (Tier 1: zero egress; Tier 2: allowlist only; Tier 3: monitored/audited); plugin manifest declares NET_EGRESS permission; runtime enforcement; logging all external calls; rate limiting per plugin                                                                                                                |
| **T10** | Timing attack / cache oracle on authorization (response time / ETag / cache headers reveal resource existence across tenant boundary)                                   | Low        | **Medium** | Statistical timing analysis mitigation (see [TENANT_ISOLATION_TESTS.v1.md](TENANT_ISOLATION_TESTS.v1.md) ISOL-TIMING/ISOL-ORACLE); MASKING_MODE policy (403 vs 404); constant-time checks; generic errors; no cache headers leaking tenant data (per [RFC 9111](https://www.rfc-editor.org/rfc/rfc9111.html)); AuthZ decision cached per request |
| **T11** | CSRF attack (malicious website triggers action on behalf of user)                                                                                                       | Low        | **Medium** | CSRF tokens in forms; SameSite cookies (Strict/Lax); origin validation; double-submit cookie pattern; state parameter for OAuth flows                                                                                                                                                                                                            |
| **T12** | Replay attack (replay old authorization token or API call)                                                                                                              | Low        | **High**   | JWT expiration (short-lived tokens ≤15min); refresh token rotation; request signing with nonce (optional per API); TLS only (no plaintext); token revocation support via deny-list or version increment                                                                                                                                          |
| **T15** | Secret rotation breaks running workflows (stale credentials)                                                                                                            | Low        | **Medium** | **ISecretsProvider** design: Activities resolve secret references at runtime (not at plan creation); version-aware secret retrieval (use latest unless pinned); graceful secret expiry handling; audit secret access per workflow run                                                                                                            |
| **T16** | Plugin abuses artifact APIs to stage data exfiltration or cross-boundary leakage (write sensitive data to shared artifact namespace, read later from different context) | Medium     | **High**   | Scoped artifact namespaces per tenant; content classification + data loss prevention (DLP) scanning; per-tenant artifact quotas; audit all READ_ARTIFACT/WRITE_ARTIFACT operations; deny cross-tenant artifact access (enforce tenant scope in artifact store adapter); rate limiting on artifact uploads                                        |

**References**:

- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/) - Data exposure risks
- [OWASP Threat Modeling](https://owasp.org/www-community/Threat_Modeling) - Threat modeling methodology

---

### 1. API Boundary (Authentication + Authorization)

**Location**: API gateway / REST endpoint  
**Trust Line**: Internet → Trusted Internal Network

**Responsibilities**:

- Authentication: Verify identity (JWT, OAuth2, mTLS)
- Authorization: Evaluate RBAC policy per `IAuthorization.v1.md` contract
- Principle\*\*: Defense-in-depth—Engine MUST NOT rely solely on API authorization decisions for tenant isolation. Even if API AuthZ is bypassed, Engine MUST enforce scope invariants independently.

**Responsibilities**:

- **Scope enforcement (primary)**: MUST validate `tenantId` matches authenticated context; validate scope immutability; reject cross-tenant payloads via fail-fast checks (INV-SCOPE-01/02). This is **not delegated to API**; Engine owns this guarantee.
- **RBAC re-check (optional)**: If Engine needs user-level authorization beyond scope, validate against signed authorization decision envelope from API (signed JWT claims + decision record). Without signed envelope, deny by default.
- **Determinism**: No side-effect I/O except via explicit Plugin/Adapter boundaries (INV-ENGINE-01)
- **Event emission**: Emit events to outbox (not direct side effects)
- **Scope validation**: Panic/fail-fast on malformed scope, missing `tenantId`, or default tenant assumptions

**v1.9 Alignment**:

- **Secrets**: Engine never sees secret values; Activities resolve references at runtime via `ISecretsProvider`
- **History**: Secrets MUST NOT be persisted in any workflow-engine execution history; adapters MUST ensure exclusion (see [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html))
- **Decision Records**: All operator actions (PAUSE, CANCEL) emit mandatory Decision Records with `actorId` + justification string

**Note on API trust model**: Signed authorization decision envelopes (e.g., JWT with `scope`, `tenantId`, `claims`) may be used to reduce re-checks, but ONLY if:

1. Signature verified against API key (public key in HSM/KMS)
2. Claims include immutable scope binding (`tenantId`, `projectId`)
3. Expiry + nonce prevent replay (see T12 mitigation)
   See [RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519) for JWT best practices.

### 2. Engine Boundary (Tenant Scope Enforcement)

**Location**: `IWorkflowEngine` interface  
**Trust Line**: Authorized Request → Tenant-Isolated Execution

**Responsibilities**:

- Assume commands are pre-authorized (RBAC complete at API)
- Enforce tenant-scope invariants: Never process cross-tenant payloads; validate `tenantId` matches authenticated context
- Enforce determinism: No side-effect I/O except via explicit Plugin/Adapter boundaries
- Emit events to outbox (not direct side effects)
- Reject malformed scope: No default tenant; explicit scope required; panic/fail-fast on validation failure

**v1.9 Alignment**:

- Secrets: Engine never sees secret values; Activities resolve references at runtime via `ISecretsProvider`
- History: Secrets MUST NOT be persisted in any workflow-engine execution history; adapters MUST ensure exclusion (see [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html))
- Decision Records: All operator actions (PAUSE, CANCEL) emit mandatory Decision Records with `actorId` + justification string

---

### 3. StateStore Boundary (Row-Level Security + Scope Parameter)

**Location**: `IStateStoreAdapter` interface  
**Trust Line**: Engine → Persistent Storage
or asymmetric) per entry or batch

- Write-only service identity: Log writer cannot read logs
- Read path separate: Auditor role with distinct credentials; multi-tenant SaaS: tenant cannot read own audit logs outside of formal audit requests
- Key management: HMAC/signing keys in KMS/HSM; signer service has sign-only permissions; regular rotation with auditability; dual-control for key export
- Trusted time: All audit timestamps MUST be derived from trusted NTP source + monotonic clock, recorded in UTC

**Trust Assumption (HMAC-based)**: HMAC-SHA256 provides tamper-evidence **only if the signer key remains confidential**. Compromise of the key (T20) allows forged entries. Mitigations for T20:

- **Key isolation**: Signer key never exported; only the log writer service holds it
- **Dual control**: Key export requires approval from two independent operators (SOC2 access control)
- **HSM/KMS enforcement**: Key never touches application memory; signing operations in hardware module
- **Rotation + alerting**: Periodic key rotation (e.g., quarterly); alerting on any key access/export/rotation events
- **Asymmetric option**: For non-repudiation (audit cannot be forged even if HMAC key later compromised), use RSA-3072/ECDSA-384 instead of HMAC. Trade-off: higher CPU cost, but stronger guarantees.
- **Key audit trail**: KMS logs MUST record all key operations (access, rotation, export denial); retain per compliance window

**Storage Options**:

- Immutable database table (no DELETE/UPDATE grants; RLS ensures cross-tenant isolation)
- S3/Object storage with Object Lock (WORM enforcement)
- Dedicated audit log service (e.g., SysLog with TLS + append-only + signature)

**References**:

- [NIST SSDF](https://csrc.nist.gov/projects/ssdf) - Secure software development framework (key management practices)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html) - Key management best practices
  **Implementation Example (Non-Normative)**:  
  PostgreSQL RLS policy using `USING (tenant_id = current_setting('app.current_tenant')::TEXT)` with the application setting `app.current_tenant` per connection/transaction.  
  Equivalent mechanisms exist for other datastores (native RLS, tenant-scoped partitions, policy-enforced access controls).

---

### 4. Audit Boundary (Immutable Record)

**Location**: `AuditLog.v1.md` contract implementation  
**Trust Line**: System Components → Tamper-Evident Storage

**Responsibilities**:

- Append-only: No deletion, no mutation; write-once semantics
- Tamper-evident: Cryptographic signatures (HMAC-SHA256) per entry or batch
- Write-only service identity: Log writer cannot read logs
- Read path separate: Auditor role with distinct credentials
- Key management: HMAC keys stored in KMS/HSM; signer service has sign-only permissions; regular rotation, auditable
- Trusted time: All audit timestamps MUST be derived from a trusted time source (e.g., NTP-synchronized wall clock + monotonic clock) and recorded in UTC

**Cryptographic integrity note**: HMAC-SHA256 provides tamper-evidence assuming key confidentiality; optional asymmetric signing (e.g., RSA, ECDSA) may be used for stronger non-repudiation guarantees (audit log cannot be forged even if HMAC key is later compromised).

**Storage Options**:

- Immutable database table (no DELETE/UPDATE grants)
- S3/Object storage with Object Lock (WORM)
- Dedicated audit log service

**References**:

- [NIST SSDF](https://csrc.nist.gov/projects/ssdf) - Secure software development framework

**v1.9 Alignment**:

- Decision Records: All operator-initiated state changes include mandatory justification fields
- Retention tagging: PII/PHI flagged for pseudonymization at retention boundaries

---

### 5. Plugin Boundary (Trust Tiers + Permission Model)

**Location**: Plugin execution environment  
**Trust Line**: Sandboxed Code → Isolated Runtime

**Trust Tiers (v1.9)**:

| Tier   | Isolation Level      | Network Egress     | Filesystem    | Deployment Constraint                                                                                                                                                                                                                                                                           |
| ------ | -------------------- | ------------------ | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tier 1 | gVisor / isolated-vm | ❌ Zero by default | ❌ None       | Default for untrusted plugins; multi-tenant SaaS                                                                                                                                                                                                                                                |
| Tier 2 | Container (Docker)   | ✅ Allowlist only  | ✅ Temp dir   | Trusted partner plugins                                                                                                                                                                                                                                                                         |
| Tier 3 | Host process         | ✅ Unrestricted    | ✅ Restricted | MUST be disabled by default in multi-tenant SaaS deployments; permitted only in single-tenant/self-hosted or strongly isolated dedicated tenants. **Tier 3 implies host trust**: restrictions are policy/ops-enforced (audit, monitoring), not sandbox-enforced. Escape = full host compromise. |

#### Supply Chain Controls (Pre-Install)

**Provenance verification** (before plugin execution):

- All plugin bundles MUST be cryptographically signed (Sigstore/Cosign, GPG, or equivalent)
- Verification MUST bind signature → artifact digest and trustSee note below |
  | FILESYSTEM_TEMP | ❌ Denied | ✅ 100MB | ✅ 1GB | Ephemeral scratch space |
  | EXEC | ❌ Denied | ❌ Denied | ⚠️ Audit | Subprocess execution (audited) |

**Note on SECRETS_ACCESS**: Plugins never receive **raw secret values** directly. Instead, plugins declare required secrets via manifest; the engine resolves secret IDs to values at **runtime** using `ISecretsProvider`. Secrets are injected into the plugin execution environment in a **non-persisted way** with **strict redaction** in logs and audit trails. The `ISecretsProvider` interface ensures secrets are never shared with plugins as persistent objects, preventing accidental exposure in execution history or inter-process communication.

- Dependency provenance verification: SLSA v1.2 Build Track L2 minimum for official marketplace artifacts (policy goal)

**vm2 Prohibition**: The `vm2` npm package is **PROHIBITED** in all plugin dependencies due to known sandbox escape vulnerabilities (CVE-2023-30547, CVE-2023-32313, CVE-2023-37466). See [PLUGIN_PROVENANCE_POLICY.v1.md](PLUGIN_PROVENANCE_POLICY.v1.md#vm2-prohibition) for migration guidance to `isolated-vm`, `worker_threads`, or gVisor sandboxing.

**References**:

- [Sigstore Documentation](https://docs.sigstore.dev/) - Keyless signing + transparency log
- [SLSA Framework](https://slsa.dev/) - Supply chain levels for software artifacts

#### Runtime Isolation Controls (Execution)

**Sandbox enforcement** (during plugin invocation):

- **Resource limits**: CPU, memory, disk, file descriptors, process count
- **Timeout enforcement**: Kill process after N seconds (configurable per tier)
- **Filesystem**: Tier 1 = none; Tier 2-3 = scoped temp directory (per-invocation, auto-cleaned)
- **Network**: Tier 1 = zero egress; Tier 2 = explicit allowlist; Tier 3 = monitored unrestricted (SaaS: disabled)
- **Secrets**: No direct access; only via `ISecretsProvider` with scoped secret IDs
- **Permission manifest**: Plugin declares required capabilities; runtime enforces per tier

**References**:

- [gVisor](https://gvisor.dev/) - Application kernel for containers (strong isolation)
- [PluginSandbox.v1.0.md](contracts/extensions/PluginSandbox.v1.0.md) - Trust Tier specification

---

## Plugin Permission Model

Plugins declare required permissions in manifest; runtime enforces deny-by-default + tier constraints.

| Permission |    Tier 1 |       Tier 2 |          Tier 3 | Description                         |
| ---------- | --------: | -----------: | --------------: | ----------------------------------- |
| NET_EGRESS | ❌ Denied | ✅ Allowlist | ✅ Unrestricted | Outbound HTTP(S) to allowed domains |

**Reference**: [AICPA Trust Services Criteria](https://www.aicpa.org/topic/audit-assurance/trust-services) - Security (CC), Availability (A), Confidentiality (C)

- **Audit Log (CC6.1/CC7.2)**: All access to sensitive data logged (INV-AUDIT-01), tamper-proof (HMAC signatures per T4 mitigation), searchable; cryptographic evidence of integrity
- **Access Control (CC6.2)**: Documented RBAC per `IAuthorization.v1.md`; tested authorization; decision logs (INV-AUDIT-02); MFA for admin; role-based privilege separation
- **Change Management (CC7.3/CC7.5)**: Audit trail of configuration changes; Decision Records + justification for operator actions; no anonymous/emergency access without investigation
- **Incident Response (A1.3)**: Plan for breach detection via audit logs; alerting on suspicious patterns (failed authorization, multiple access denials); immutable log retention for forensic analysis
  | FILESYSTEM_TEMP | ❌ Denied | ✅ 100MB | ✅ 1GB | Ephemeral scratch space |
  **Reference**: [45 CFR Part 164](https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164) - Security and Privacy Ru; immutable append-only structure with cryptographic integrity (HMAC/asymmetric signatures)
- **Encryption**: At-rest (INV-CRYPTO-01: AES-256, KMS-backed keys with key rotation) and in-transit (TLS 1.3+ per INV-CRYPTO-02); encryption key management with authentication and monitoring
- **Audit Log Retention**: **6 years minimum** (45 CFR § 164.530(j)(2)) for audit logs containing PHI access records; immutable storage; no deletion except via cryptographic erasure
- **Data Deletion**: Right to be forgotten implemented via **pseudonymization** (replace PHI with hash) or **cryptographic erasure** (delete keys); PHI tags enable selective erasure; no unencrypted PHI in backups
- **Access Controls**: Role-based access control; MFA for administrative access; audit all authorization decisions; no shared credentials; emergency procedures with audit trail

### 1. Defense in Depth

Multiple layers of security:

**Reference**: [GDPR Regulation (EU) 2016/679](https://eur-lex.europa.eu/eli/reg/2016/679/oj); [ICO GDPR Guide](https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/)

- **Right to Access** (Art. 15): User can query audit logs for their data access history (personal data access report); provide within 30 days
- **Right to be Forgotten** (Art. 17): Erasure applies to PII fields within audit records; audit envelopes remain immutable for compliance; implement via **cryptographic erasure** (delete PII encryption keys, rendering ciphertext irrecoverable per [NIST SP 800-88r1](https://csrc.nist.gov/publications/detail/sp/800-88/rev-1/final)) or **pseudonymization** (replace PII with irreversible hash); retention obligations (financial records, legal holds) may override erasure requests within defined retention window
- **Data Minimization** (Art. 5(1)(c)): Don't log unnecessary PII; secret IDs instead of values; redact sensitive fields in audit logs; scope audit access per role (tenant cannot read audit logs in multi-tenant SaaS)
- **Purpose Limitation** (Art. 5(1)(b)): Only audit for purposes disclosed in privacy policy (security, compliance, law enforcement); do not repurpose audit data for secondary uses without consent
- **Storage Limitation** (Art. 5(1)(e)): Define maximum retention periods per data category (see Retention Policy); enforce deletion at boundary via cryptographic erasure or anonymization
- **Accountability** (Art. 5(2)): Maintain Data Processing Agreement (DPA), conduct Data Protection Impact Assessments (DPIA), document processing activities (Article 30 records)

### HIPAA (US Healthcare)

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

**Reference**: [AICPA Trust Services Criteria](https://www.aicpa.org/topic/audit-assurance/trust-services) - Security (CC), Availability (A), Confidentiality (C)

- **Audit Log (CC6.1/CC7.2)**: All access to sensitive data logged (INV-AUDIT-01), tamper-proof (HMAC signatures), searchable; cryptographic evidence of integrity
- **Access Control (CC6.2)**: Documented RBAC per `IAuthorization.v1.md`; tested authorization; decision logs (INV-AUDIT-02); MFA for admin; privilege separation
- **Change Management (CC7.3/CC7.5)**: Audit trail of configuration changes; Decision Records + justification for operator actions
- **Incident Response**: Plan for breach detection via audit logs; alerting on suspicious patterns; immutable log retention

### HIPAA (Healthcare)

- **PHI Access Logging**: All access to Protected Health Information audited per `AuditLog.v1.md`; actor identification; timestamp
- **Encryption**: At-rest (INV-CRYPTO-01: AES-256, KMS-backed keys) and in-transit (TLS 1.3+ per INV-CRYPTO-02)
- **Audit Log Retention**: **6 years minimum** (45 CFR § 164.530(j)(2)); immutable storage; no deletion except cryptographic erasure at retention boundary
- **Data Deletion**: Right to be forgotten implemented via **pseudonymization** (replace PII with cryptographic hash) or **cryptographic erasure** (delete encryption keys, rendering data irrecoverable); PHI tags in audit records enable selective erasure; retain metadata for compliance audits
- **Access Controls**: Role-based access control; MFA for admin; audit all authorization decisions

### GDPR (EU Data Protection)

- **Right to Access** (Art. 15): User can query audit logs for their data access history (personal data access report)
- **Right to be Forgotten** (Art. 17): Erasure applies to PII fields within audit records; audit envelopes remain immutable; implement via **cryptographic erasure** (delete PII encryption keys, rendering ciphertext irrecoverable per [NIST SP 800-88r1](https://csrc.nist.gov/publications/detail/sp/800-88/rev-1/final)) or **pseudonymization** (replace PII with irreversible hash); retention obligations (financial records, legal holds) may override erasure requests
- **Data Minimization** (Art. 5(1)(c)): Don't log unnecessary PII; secret IDs instead of values; redact sensitive fields in audit logs
- **Purpose Limitation** (Art. 5(1)(b)): Only audit for purposes disclosed in privacy policy (security, compliance, debugging); no secondary use without consent
- **Retention Limits**: Define maximum retention periods per data category; enforce automated deletion at retention boundary unless legal hold applies

### Retention Policy Summary

| Data Type                  | Retention Period                 | Erasure Method                           | Regulatory Basis                   |
| -------------------------- | -------------------------------- | ---------------------------------------- | ---------------------------------- |
| Audit logs (non-PHI)       | 7 years                          | Cryptographic erasure (KMS key deletion) | SOC2, GDPR Art. 5(1)(e)            |
| Audit logs (PHI)           | 6 years                          | Cryptographic erasure + pseudonymization | HIPAA 45 CFR § 164.530(j)(2)       |
| Workflow execution history | 90 days (default)                | Soft delete (tombstone) → hard delete    | Business policy, GDPR minimization |
| Decision Records           | 3 years (operator actions)       | Immutable retention (no deletion)        | SOC2, internal audit               |
| User PII (non-regulated)   | Account deletion + 30 days       | Hard delete (GDPR erasure request)       | GDPR Art. 17                       |
| Financial records          | 7 years (varies by jurisdiction) | No deletion (legal hold)                 | Tax law, SOX                       |

**Cryptographic Erasure Definition**: Delete the encryption key used to encrypt data at rest, rendering ciphertext irrecoverable without the key. Equivalent to secure data deletion for compliance purposes (NIST SP 800-88r1). KMS audit logs MUST retain key deletion events for provenance.

---

## Implementation Validation Checklist

**For complete validation checklists, see**:

- **[SECURITY_INVARIANTS.v1.md](SECURITY_INVARIANTS.v1.md#implementation-validation-checklist)** - Security invariant implementation checklist
- **[TENANT_ISOLATION_TESTS.v1.md](TENANT_ISOLATION_TESTS.v1.md)** - Mandatory tenant isolation test suite
- **[PLUGIN_PROVENANCE_POLICY.v1.md](PLUGIN_PROVENANCE_POLICY.v1.md#enforcement-checklist)** - Plugin provenance enforcement checklist

### Quick Reference Checklist

**Scope Enforcement**:

- [ ] All commands include immutable tenant scope (INV-SCOPE-01)
- [ ] StateStore methods require TenantScope parameter (INV-SCOPE-02)
- [ ] Cross-tenant inference tests pass (INV-SCOPE-03, see [TENANT_ISOLATION_TESTS.v1.md](TENANT_ISOLATION_TESTS.v1.md))

**Audit Logging**:

- [ ] Audit log append-only (INV-AUDIT-01)
- [ ] All state mutations audited (INV-AUDIT-02)
- [ ] Trusted timestamps from NTP source (INV-AUDIT-03)

**Plugin Security**:

- [ ] Plugin signature verification on install + load (INV-PLUGIN-01)
- [ ] Network egress blocked for Tier 1 plugins (INV-PLUGIN-02)
- [ ] Permission manifest enforced (INV-PLUGIN-03)
- [ ] Tier 3 disabled in multi-tenant SaaS (INV-PLUGIN-04)
- [ ] Plugin catalog tamper-evident + audited (INV-PLUGIN-05)
- [ ] vm2 package prohibited (see [PLUGIN_PROVENANCE_POLICY.v1.md](PLUGIN_PROVENANCE_POLICY.v1.md#vm2-prohibition))

**Encryption**:

- [ ] Database dump shows ciphertext (INV-CRYPTO-01)
- [ ] TLS 1.2 connection rejected (INV-CRYPTO-02)

---

## Normative Contracts

The following contracts define security-critical interfaces and policies. Implementations MUST conform to these contracts; divergence requires explicit architectural decision record (ADR) with security review.

### Security Invariants and Policies

- **[SECURITY_INVARIANTS.v1.md](SECURITY_INVARIANTS.v1.md)**: Testable security invariants (MUST satisfy all)
- **[PLUGIN_PROVENANCE_POLICY.v1.md](PLUGIN_PROVENANCE_POLICY.v1.md)**: Plugin supply chain security requirements
- **[TENANT_ISOLATION_TESTS.v1.md](TENANT_ISOLATION_TESTS.v1.md)**: Mandatory tenant isolation test suite

### Interface Contracts

- **[IAuthorization.v1.md](contracts/security/IAuthorization.v1.md)**: Authorization interface (RBAC evaluation)
- **[AuditLog.v1.md](contracts/security/AuditLog.v1.md)**: Audit log schema + immutability guarantees
- **[ISecretsProvider.v1.md](contracts/security/ISecretsProvider.v1.md)**: Secrets resolution interface (reference → value at runtime)
- **[DecisionRecord.v1.md](contracts/operations/DecisionRecord.v1.md)**: Operator action justification schema

---

## Mitigation Summary

| Control                      | Implemented                                | Phase                            |
| ---------------------------- | ------------------------------------------ | -------------------------------- |
| **API Authentication**       | JWT, OAuth2                                | Phase 0 (assumed)                |
| **RBAC Authorization**       | IAuthorization.v1.md contract              | Phase 1 (docs), Phase 4 (impl)   |
| **Row-Level Security (RLS)** | DB-enforced tenant isolation               | Phase 2 (#6 StateStoreAdapter)   |
| **Log Scrubbing**            | Regex scan for secrets                     | Phase 1.5 (docs), Phase 2 (impl) |
| **Audit Log (append-only)**  | AuditLog.v1.md contract + immutable stream | Phase 1 (docs), Phase 3 (impl)   |
| **Encryption at Rest**       | StateStore adapter responsibility          | Phase 2 (#6)                     |
| **Plugin Sandbox**           | Resource limits + seccomp                  | Phase 3 (epic)                   |
| **Cost Attribution**         | Per-tenant quotas, metering                | Phase 3 (epic)                   |
| **Dependency Scanning**      | Dependabot, Snyk in CI                     | Phase 1.5 (docs), Phase 2 (impl) |

---

## References

### Security Documentation

- [SECURITY_INVARIANTS.v1.md](SECURITY_INVARIANTS.v1.md) - Normative security invariants
- [PLUGIN_PROVENANCE_POLICY.v1.md](PLUGIN_PROVENANCE_POLICY.v1.md) - Plugin supply chain security policy
- [TENANT_ISOLATION_TESTS.v1.md](TENANT_ISOLATION_TESTS.v1.md) - Tenant isolation test suite

### Interface Contracts

- [IAuthorization.v1.md](contracts/security/IAuthorization.v1.md) - Authorization interface (RBAC evaluation)
- [AuditLog.v1.md](contracts/security/AuditLog.v1.md) - Audit log schema + cryptographic signature requirements
- [ISecretsProvider.v1.md](contracts/security/ISecretsProvider.v1.md) - Secrets resolution interface (no secrets in logs/history)
- [DecisionRecord.v1.md](contracts/operations/DecisionRecord.v1.md) - Operator action justification schema
- [IWorkflowEngine.v1.md](contracts/engine/IWorkflowEngine.v1.md) - Core engine interface with tenant scope requirements

### Architecture Documentation

- [Product Definition](../../../README.md#product-definition) - Multi-tenant, auditability requirements
- [design_principles.md](../design_principles.md) - Architecture principles (security by design)
- [PluginSandbox.v1.0.md](contracts/extensions/PluginSandbox.v1.0.md) - Plugin isolation + Trust Tier specification

### Regulatory References

- **HIPAA**: [45 CFR Part 164](https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164) - Security and Privacy Rules (PHI protection, audit log retention 6 years)
- **GDPR**: [ICO Guide to GDPR](https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/) - Right to access (Art. 15), right to erasure (Art. 17), data minimization (Art. 5)
- **NIST SP 800-88r1**: [Guidelines for Media Sanitization](https://csrc.nist.gov/publications/detail/sp/800-88/rev-1/final) - Cryptographic erasure equivalent to secure deletion
- **SOC2**: [AICPA Trust Services Criteria](https://www.aicpa.org/topic/audit-assurance/trust-services) - Security, availability, confidentiality controls

### Supply Chain Security

- **SLSA Framework**: [SLSA Build Track v1.2](https://slsa.dev/) - Supply chain security levels (L2 target for official marketplace)
- **Sigstore**: [Sigstore Documentation](https://docs.sigstore.dev/) - Keyless signing + transparency log for software artifacts
- **CycloneDX**: [SBOM Standard](https://cyclonedx.org/) - Software Bill of Materials format (plugin dependency tracking)
- **OWASP Dependency-Check**: [Dependency Scanning](https://owasp.org/www-project-dependency-check/) - Vulnerability detection in dependencies

---

_Last updated: 2026-02-12_  
_Version: 1.5_  
_Status: Living document - see [GitHub Issue #63](https://github.com/dunay2/dvt/issues/63) for v1.5 changes_
