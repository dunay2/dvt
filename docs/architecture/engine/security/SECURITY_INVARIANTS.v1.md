# SECURITY_INVARIANTS.v1.md - DVT Engine Security Invariants

**Version**: 1.1  
**Date**: 2026-02-12  
**Status**: Normative  
**Location**: docs/architecture/engine/security/SECURITY_INVARIANTS.v1.md

**Changelog**:

- **v1.1** (2026-02-12): Normative-grade improvements for mechanical enforcement:
  - Added **Definitions** section (TenantScope, RunScope, DeploymentMode, TrustTier, SecretRef)
  - Added **INV-AUTHZ-\*** category (Default Deny, Centralized Enforcement, No Confused Deputy)
  - Added **INV-RATE-01** (per-tenant quotas), **INV-RET-01/02** (retention), **INV-CRYPTO-03/04** (key separation & rotation), **INV-SUPPLY-01/02** (SBOM & provenance)
  - Strengthened testability: INV-SCOPE-03 (timing test method), INV-AUDIT-02 (strict Decision Record requirements), INV-ENGINE-01 (import denylist)
  - Replaced "panic/fail-fast" with boundary-specific contract language
- **v1.0** (initial): Core security invariants

---

## Purpose

This document defines **testable security invariants** that MUST be satisfied by every DVT Engine deployment. Violations are considered **security incidents** requiring immediate remediation.

These invariants are **normative**: implementations MUST conform. Divergence requires explicit architectural decision record (ADR) with security review.

---

## Definitions

These canonical types are reused throughout this document and referenced contracts:

### TenantScope

```typescript
interface TenantScope {
  tenantId: string; // Immutable tenant identifier (UUID)
  projectId: string; // Immutable project identifier within tenant
  environmentId: string; // Immutable environment identifier (dev/staging/prod)
}
```

**Usage**: All state-accessing operations MUST include `TenantScope`. See [IStateStoreAdapter.v1.md](../contracts/state-store/IStateStoreAdapter.v1.md) for enforcement requirements.

### RunScope

```typescript
interface RunScope {
  runId: string; // Unique execution instance identifier
  attemptId: string; // Retry/recovery attempt number (monotonic)
  repoSha: string; // Git commit SHA for plan definition provenance
}
```

**Usage**: Correlation identifiers for observability and audit trails. See [dvt_workflow_engine_artifact](../../engine/README.md) for scope + correlation patterns.

### DeploymentMode

```typescript
type DeploymentMode =
  | 'SAAS_MULTI_TENANT' // Shared control plane + shared data plane (strict isolation required)
  | 'DEDICATED_TENANT' // Dedicated control plane OR dedicated data plane per tenant
  | 'SINGLE_TENANT_SELF_HOSTED'; // Customer-managed infrastructure (single tenant only)
```

**Clarification**:

- **SAAS_MULTI_TENANT**: Multiple tenants share API servers, Engine workers, StateStore instances (logical isolation via RLS/scope enforcement)
- **DEDICATED_TENANT**: Physical isolation (dedicated Kubernetes namespace/cluster/VMs per tenant); Tier 3 plugins MAY be allowed with enhanced audit
- **SINGLE_TENANT_SELF_HOSTED**: Customer controls entire stack; security responsibility shared

**Impact**: INV-PLUGIN-04 (Tier 3 restrictions), INV-RATE-01 (quota enforcement), INV-CRYPTO-03 (key isolation) vary by mode.

### TrustTier

Plugin execution sandbox levels (from strongest to weakest isolation):

```typescript
type TrustTier =
  | 'TIER_1' // gVisor/isolated-vm (zero egress, strongest isolation)
  | 'TIER_2' // Container sandbox (allowlist egress)
  | 'TIER_3'; // Host process (unrestricted; SaaS multi-tenant MUST NOT allow)
```

**Reference**: [PluginSandbox.v1.0.md](../contracts/extensions/PluginSandbox.v1.0.md)

### SecretRef

```typescript
interface SecretRef {
  secretId: string; // Opaque identifier (no plaintext value)
  version?: string; // Optional version for rotation
}
```

**Usage**: Plans and state MUST store `SecretRef` only, never plaintext. Secrets resolved at runtime via [ISecretsProvider.v1.md](../contracts/security/ISecretsProvider.v1.md).

---

## Invariant Categories

Invariants are organized by scope using namespace prefixes:

- **INV-SCOPE-\***: Tenant scope enforcement
- **INV-SECRETS-\***: Secrets management
- **INV-AUDIT-\***: Audit logging and tamper-evidence
- **INV-PLUGIN-\***: Plugin security and supply chain
- **INV-ENGINE-\***: Engine determinism and boundaries
- **INV-CRYPTO-\***: Encryption and cryptographic requirements

---

## Scope Enforcement Invariants

### INV-SCOPE-01: Immutable Tenant Context

**Invariant**: Every command and event includes `TenantScope` (as defined in Definitions section) as immutable scope identifiers; validated at every boundary that accesses tenant-scoped data.

**Rationale**: Prevents privilege escalation and cross-tenant data access. Tenant scope MUST be cryptographically bound to authentication context via one of:

- **JWT claims**: `TenantScope` tuple derived from validated JWT claims (e.g., `tenantId`, `projectId` claims); server-side scope MUST equal JWT claims (see [RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519))
- **mTLS certificate**: Scope extracted from client certificate subject DN
- **Signed context envelope**: API→Engine communication uses signed scope envelope with HMAC verification

**Enforcement Points**:

- **API boundary**: MUST return `400 Bad Request` if scope malformed, `401 Unauthorized` if JWT invalid, `403 Forbidden` if scope mismatch
- **Core→Adapter boundary**: MUST reject with typed error (`ScopeValidationError`) if scope missing or malformed

**Verification**:

- Code audit: All entry points validate scope parameter presence
- Penetration test: Attempt to modify `tenantId` in authenticated request → 403 Forbidden
- Unit test: Missing scope parameter → API returns 400; adapter rejects with `ScopeValidationError`

**References**:

- [IWorkflowEngine.v1.md](../contracts/engine/IWorkflowEngine.v1.md) - Tenant scope requirements
- [IStateStoreAdapter.v1.md](../contracts/state-store/IStateStoreAdapter.v1.md) - StateStore scope enforcement
- [DVT Product Principle](../../DVT_Product_Definition_V0.md) - "State Store persists reality" with scope immutability

---

### INV-SCOPE-02: StateStore Scope Parameter Required

**Invariant**: All StateStore methods require a `TenantScope` parameter; adapter denies by default if scope missing or malformed.

**Rationale**: "Deny by default" prevents accidental cross-tenant queries. No default tenant assumption.

**Verification**:

- Unit test: Call StateStore method without scope → error
- DB RLS validation: PostgreSQL RLS policies enforce `tenant_id` filter
- Integration test: Cross-tenant query attempt returns zero rows

**References**:

- [IStateStoreAdapter.v1.md](../contracts/state-store/IStateStoreAdapter.v1.md) - Scope parameter requirements

---

### INV-SCOPE-03: No Cross-Tenant Inference

**Invariant**: Tenant A cannot read, write, or **infer existence** of Tenant B's data via any channel (direct access, timing, error messages, resource limits, quota exhaustion).

**Rationale**: Information leakage via timing side-channels or error messages can reveal sensitive metadata (e.g., "plan exists but access denied" vs. "plan not found"). See [OWASP Timing Attacks](https://owasp.org/www-community/attacks/Timing_Attack).

**Generic Error Policy** (MUST choose one per endpoint class):

- **Option 1 (Recommended)**: All cross-tenant access returns `404 Not Found` with constant message `"Not found"` (masks permission as "does not exist")
- **Option 2**: All cross-tenant access returns `403 Forbidden` with constant message `"Access denied"` (masks existence as "no permission")

**Critical requirement**: Response MUST avoid **observable differences** (timing, headers, body schema) beyond configured tolerances for both "exists-but-forbidden" and "nonexistent" cases. Implementation MAY use "always perform authz evaluation + always execute scoped DB query" (preferred pattern). Implementation MUST NOT short-circuit based on existence check before authorization decision.

**Timing Test Requirements** (mechanically enforceable):

- **Statistical method**: Mann-Whitney U test (non-parametric, no normality assumption) OR Kolmogorov-Smirnov test
- **Sample size**: N ≥ 200 per case (CI baseline); N ≥ 1000 for controlled performance environment / penetration testing
- **Pass criteria**: p-value ≥ 0.01 (no statistically significant difference at 99% confidence level)
- **Acceptable delta**: Median difference ≤ 25ms (calibrated for same-host CI; adjust via ADR for distributed environments)
- **Test execution environment**: CI nightly (N=200, p≥0.01) + quarterly pentest (N=1000, controlled environment)
- **CI stability requirements**: MUST use fixed CPU allocation or same runner type for timing tests; MUST record and compare distributions with stored baseline; MUST fail if drift exceeds threshold (calibrated per environment); see [Mann-Whitney U test](https://en.wikipedia.org/wiki/Mann%E2%80%93Whitney_U_test) for statistical methodology

**Enforcement Points**:

- **API boundary**: MUST return generic error per policy (no resource-specific hints in message, headers, or body schema)
- **Authorization logic**: MUST always query resource existence (no early exit) AND perform full RBAC evaluation

**Verification**:

- Automated RLS test suite: Verify zero cross-tenant rows (see [TENANT_ISOLATION_TESTS.v1.md](TENANT_ISOLATION_TESTS.v1.md))
- **Timing analysis (CI gate)**: Mann-Whitney U test with N=200, p≥0.01 across "exists-but-forbidden" vs "nonexistent" scenarios
- Error message audit: Body schema identical (same keys), status code per policy, no `X-Resource-*` headers
- Quota test: Tenant A resource exhaustion does not reveal Tenant B quotas or usage

**References**:

- [TENANT_ISOLATION_TESTS.v1.md](TENANT_ISOLATION_TESTS.v1.md) - Inference test suite (ISOL-TIMING-001, ISOL-ERROR-001, ISOL-ORACLE-001/002/003)
- [OWASP Timing Attacks](https://owasp.org/www-community/attacks/Timing_Attack) - Statistical analysis methodology

---

## Secrets Management Invariants

### INV-SECRETS-01: No Plaintext Secrets

**Invariant**: No plaintext secrets in plans, state, or logs; only secret references (IDs) via `ISecretsProvider`; engine never sees secret values.

**Rationale**: Ensures secrets are resolved at runtime in Activity execution context only, never logged or persisted in cleartext.

**Verification**:

- Secret scanner in CI: Regex patterns detect accidental secret leaks
- Runtime log scrubbing: Redaction filters in observability pipeline
- History exclusion: Secrets MUST NOT be persisted in any workflow-engine execution history; adapter MUST ensure exclusion

**References**:

- [ISecretsProvider.v1.md](../contracts/security/ISecretsProvider.v1.md) - Secrets resolution interface
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) - Secrets logging guidance

---

### INV-SECRETS-02: No Secret Exfiltration via Artifacts/State

**Invariant**: Secrets MUST NOT be exfiltrated via artifacts or state writes that are readable by plugins or untrusted components. Any write path accessible to plugins MUST be treated as an **untrusted sink** with DLP/redaction enforcement.

**Rationale**: Even if secrets are not directly logged, they could be written to artifacts (build logs, test outputs) by Activities, then read by malicious plugins with `READ_ARTIFACT` permission. Defense in depth requires treating plugin-accessible storage as untrusted.

**Enforcement Points**:

- **Artifact storage**: Before persisting artifacts in plugin-accessible namespaces, MUST apply secret redaction filters (regex patterns for API keys, tokens, credentials)
- **State writes**: Activities writing to StateStore fields accessible via plugin APIs MUST NOT include secret values (only `SecretRef`)
- **DLP policy**: Known secret patterns (AWS keys, GCP tokens, passwords) MUST be detected and redacted or rejected before persistence

**Verification**:

- Secret leakage test: Activity writes secret to artifact → artifact stored with redacted value (`[REDACTED]` or error)
- Plugin read test: Plugin with `READ_ARTIFACT` attempts to read artifact containing secret pattern → redacted output
- DLP detection test: CI secret scanner detects patterns in artifact storage → alert triggered

**References**:

- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) - Secrets redaction patterns
- [ISecretsProvider.v1.md](../contracts/security/ISecretsProvider.v1.md) - Secrets resolution interface

---

## Authorization Invariants

### INV-AUTHZ-01: Default Deny

**Invariant**: Every protected action is **denied by default** unless an explicit allow rule matches (RBAC policy + TenantScope validation).

**Rationale**: Fail-safe authorization - no implicit grants. Aligns with "UI does not execute / Engine does not decide / Planner does not persist" separation principle (see [DVT Product Definition](../../DVT_Product_Definition_V0.md)).

**Enforcement Points**:

- **API boundary**: MUST return `403 Forbidden` if no matching RBAC policy
- **Authorization service**: MUST have NO default-allow rules; policy evaluation returns `DENY` if no explicit `ALLOW` match

**Verification**:

- Policy test suite: Remove all RBAC policies → all protected actions denied
- Unit test: New resource type with no policies → 403 Forbidden
- Integration test: Authenticated user with no roles → 403 on all endpoints except health check

**References**:

- [IAuthorization.v1.md](../contracts/security/IAuthorization.v1.md) - Authorization interface with default-deny semantics

---

### INV-AUTHZ-02: Defense in Depth Enforcement

**Invariant**: Authorization enforcement occurs at **multiple boundaries**: API boundary (MUST) AND Engine/StateStore internal boundaries (MUST). Removing API enforcement MUST NOT bypass internal checks.

**Rationale**: Defense in depth - API layer compromise (e.g., SSRF, misconfiguration) does not grant unrestricted internal access. Aligns with layered security model.

**Authorization Model**:

- **API boundary** = authoritative policy decision point (RBAC evaluation)
- **Engine boundary** = validates authorization envelope integrity + TenantScope + required claims (does NOT re-evaluate RBAC for normal user calls if envelope valid)
- **Engine MAY re-authorize** for operator actions or privileged operations (e.g., `PAUSE`, `FORCE_RETRY`)
- **StateStore boundary** = enforces RLS policies (PostgreSQL) or application-level scope filtering

**Enforcement Points**:

- **API boundary**: HTTP middleware validates JWT + RBAC; produces signed **authorization envelope** (HMAC or JWT with authz claims per [RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519))
- **Engine boundary**: Validates envelope signature + TenantScope binding + expiration; trusts RBAC decision from API for normal calls; MAY re-evaluate for privileged operations
- **StateStore boundary**: Adapter enforces RLS policies (PostgreSQL) or application-level scope filtering

**Verification**:

- Bypass test: Directly call Engine API bypassing HTTP layer (e.g., in-process) → still requires valid TenantScope + authorization envelope
- Envelope tampering test: Modify scope in envelope → signature verification fails → 403 Forbidden
- RLS test: Direct SQL query without RLS context → zero rows (PostgreSQL) or error (other stores)
- Unit test: Engine method with missing authorization context → typed error (`AuthorizationRequiredError`)

**References**:

- [IAuthorization.v1.md](../contracts/security/IAuthorization.v1.md) - Multi-layer enforcement pattern
- [IStateStoreAdapter.v1.md](../contracts/state-store/IStateStoreAdapter.v1.md) - RLS + scope filtering requirements

---

### INV-AUTHZ-03: No Confused Deputy

**Invariant**: Plugins MUST NOT call privileged internal APIs by reusing engine credentials. All plugin-initiated calls are **re-authenticated and re-authorized** with plugin identity (namespace + version + trust tier) + manifest permissions.

**Rationale**: Prevents plugins from acting as "confused deputy" to escalate privileges. Plugin permissions are explicitly granted via manifest, not inherited from engine.

**Enforcement Points**:

- **Plugin sandbox**: Plugins receive **per-plugin invocation credential** minted by Engine at plugin load time, cryptographically bound to `{bundleDigest, pluginId, trustTier, TenantScope}` and rotated per process/session
- **API gateway (internal)**: All plugin→Engine calls MUST be authenticated with the invocation credential (e.g., signed JWT, mTLS client cert); headers alone (`X-Plugin-ID`, `X-Plugin-Tier`) MUST NOT be trusted without cryptographic authentication
- **Authorization service**: Evaluates plugin identity + manifest permissions separately from user/operator context; verifies credential binding to installed bundle digest (provenance chain per [Sigstore](https://docs.sigstore.dev/cosign/overview/))

**Verification**:

- Confused deputy test: Plugin attempts to call `StateStore.savePlan()` directly → 403 Forbidden (manifest does not grant `WRITE_STATE` permission)
- Permission test: Plugin with `READ_ARTIFACT` permission can fetch artifacts but not secrets
- Tier enforcement: Tier 1 plugin cannot make network egress even if manifest declares `NETWORK_EGRESS` (tier restriction overrides manifest)

**References**:

- [PluginSandbox.v1.0.md](../contracts/extensions/PluginSandbox.v1.0.md) - Plugin identity + permission model
- [OWASP Confused Deputy](https://owasp.org/www-community/attacks/Confused_Deputy) - Attack pattern description

---

## Audit Invariants

### INV-AUDIT-01: Append-Only Audit Log

**Invariant**: Audit log is append-only and tamper-evident (cryptographic signatures, write-once storage); **event envelope remains immutable**; PII fields MAY be cryptographically erased by deleting the PII encryption key, leaving envelope structure intact.

**Rationale**: Compliance requirements (SOC2, HIPAA, GDPR per [ICO GDPR guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/)) mandate immutable audit trails. Cryptographic erasure satisfies "right to be forgotten" without destroying audit trail integrity (see [NIST SP 800-88r1](https://csrc.nist.gov/publications/detail/sp/800-88/rev-1/final)).

**Verification**:

- Integration test: Attempt to DELETE audit record → permission error
- HMAC verification: Detect tampered audit entry via signature mismatch
- Cryptographic erasure test: After PII key deletion, ciphertext remains but is irrecoverable
- Key rotation audit: KMS key deletion events logged for provenance

**References**:

- [AuditLog.v1.md](../contracts/security/AuditLog.v1.md) - Audit log schema + immutability guarantees

---

### INV-AUDIT-02: All State Mutations Audited

**Invariant**: All authorization decisions, state mutations, and API calls are audited with immutable, timestamped records; operator actions include mandatory Decision Records.

**Rationale**: "Auditability first" principle - every security-relevant action must leave an audit trail.

**Decision Record Requirements** for operator-initiated high-risk operations:

- **Operations requiring justification**: `PAUSE`, `CANCEL`, `RESTART`, `FORCE_RETRY`, `MANUAL_OVERRIDE`, `QUOTA_ADJUSTMENT`, `TIER_3_PLUGIN_ENABLE`
- **Minimum fields** (MUST be present):
  - `actorId`: Authenticated operator identity (email or service principal)
  - `justificationText`: Human-readable reason (min 20 chars, max 2000 chars)
  - `approvalTicketId`: Reference to approval system (e.g., Jira ticket, PagerDuty incident)
  - `timestamp`: ISO8601 UTC timestamp (trusted source per INV-AUDIT-03)
- **Retention policy**: 7 years minimum (compliance requirement per SOC2/HIPAA)
- **Enforcement**: API MUST reject operation if Decision Record incomplete (400 Bad Request with specific missing field)

**Enforcement Points**:

- **API boundary**: MUST validate Decision Record schema before accepting high-risk operations
- **Audit log**: MUST emit event with `decisionRecord` field populated (append-only, tamper-evident per INV-AUDIT-01)
- **Alerting**: Missing or incomplete justification MUST trigger security incident alert

**Verification**:

- Audit log integration test: Verify event emission for each state mutation
- Decision Record validation test: PAUSE without `justificationText` → 400 Bad Request
- Alerting test: Missing `approvalTicketId` triggers alert within 60 seconds
- Retention test: Query audit logs for records > 7 years old (MUST exist unless deletion policy explicit)

**References**:

- [AuditLog.v1.md](../contracts/security/AuditLog.v1.md) - Event types specification
- [DecisionRecord.v1.md](../contracts/operations/DecisionRecord.v1.md) - Operator justification schema
- [SOC2 Trust Services Criteria](https://www.aicpa.org/topic/audit-assurance/trust-services) - CC7.2 (audit logging)

---

### INV-AUDIT-03: Trusted Timestamp Source

**Invariant**: All audit timestamps MUST be derived from a trusted time source (NTP-synchronized wall clock, see [NTP documentation](https://www.ntp.org/documentation.html)) and recorded in UTC; ordering verifiable via sequence number or monotonic counter.

**Rationale**: Prevents timestamp manipulation attacks. Distributed systems cannot guarantee strictly increasing timestamps due to parallel writes, clock skew, and retries.

**Verification**:

- NTP sync validation: System clock drift < 1 second (configurable threshold)
- Ordering guarantee: Use `(wall_clock_utc, sequence_number_per_writer)` tuple OR append monotonic counter per partition to enable ordering verification without requiring strictly increasing wall clock timestamps
- UTC enforcement: All timestamps use ISO8601 UTC format

---

## Plugin Security Invariants

### INV-PLUGIN-01: Cryptographic Signature Verification

**Invariant**: All plugin bundles are cryptographically signed; signature verified at install/load time; verification MUST bind signature → artifact digest and trusted identity (issuer/subject), rejecting unsigned/unknown provenance.

**Rationale**: Supply chain security - prevents malicious plugin injection. Trust must be explicitly granted via signature verification.

**Verification**:

- CI enforcement: Unsigned plugin bundle rejected by CI pipeline
- Runtime check: Plugin load fails if signature invalid or missing
- Provenance binding: Sigstore/Cosign verification includes issuer identity check

**References**:

- [PLUGIN_PROVENANCE_POLICY.v1.md](PLUGIN_PROVENANCE_POLICY.v1.md) - Signature verification requirements

---

### INV-PLUGIN-02: Network Egress Allowlist

**Invariant**: All network egress from plugins is restricted to configured allowlist; denied by default; untrusted tier (Tier 1) = zero egress.

**Rationale**: Prevents data exfiltration via external API calls. Defense in depth: even if plugin compromised, network isolation limits damage.

**Verification**:

- Integration test: Tier 1 plugin network egress attempt blocked
- Allowlist validation: Tier 2 plugin can only reach declared domains
- Audit logging: All external calls logged with destination URL

**References**:

- [PluginSandbox.v1.0.md](../contracts/extensions/PluginSandbox.v1.0.md) - Trust Tier specification

---

### INV-PLUGIN-03: Permission Manifest Enforcement

**Invariant**: Plugin runtime enforces explicit allowlist permissions + Trust Tiers (v1.9); no capability granted by default.

**Rationale**: Least privilege - plugins declare required permissions in manifest; runtime enforces deny-by-default policy.

**Verification**:

- Permission manifest validation: Plugin without READ_ARTIFACT permission cannot read artifacts
- Tier enforcement test: Tier 1 plugin denied filesystem access
- E2E test: Permission violation throws runtime error

**References**:

- [PluginSandbox.v1.0.md](../contracts/extensions/PluginSandbox.v1.0.md) - Permission model

---

### INV-PLUGIN-04: Tier 3 Disabled in Multi-Tenant SaaS

**Invariant**: Tier 3 (host process) plugins MUST NOT be enabled in multi-tenant SaaS deployments; allowed only in single-tenant/self-hosted or dedicated-tenant isolation with explicit operator override + enhanced audit.

**Rationale**: Tier 3 plugins run as host processes with unrestricted access, incompatible with multi-tenant security model. Escape from Tier 3 sandbox = full host compromise.

**Dedicated-tenant isolation minimum requirements** (if Tier 3 allowed):

- **Isolated compute**: Dedicated namespace/cluster/VMs (no shared control plane)
- **Isolated secrets**: Separate secrets store or KMS key domain per tenant
- **Network boundary**: Independent rate-limits + egress controls per tenant
- **Independent audit**: Separate audit log partition per tenant
- **Blast radius containment**: Compromise of one tenant's Tier 3 plugin MUST NOT affect other tenants

See [gVisor isolation context](https://gvisor.dev/) for reference isolation model.

**Verification**:

- Configuration test: Multi-tenant SaaS config rejects Tier 3 plugin installation
- Runtime enforcement: Tier 3 plugin invocation blocked in SaaS mode
- Audit logging: Tier 3 override attempts logged with operator justification
- Documentation: Deployment guide explicitly states "Tier 3 = single-tenant only"

**References**:

- [gVisor](https://gvisor.dev/) - Strong sandboxing alternative for untrusted code
- [vm2 security note](https://github.com/patriksimek/vm2#security) - Historical example of sandbox escape (vm2 prohibited per INV-PLUGIN-01)
- [PluginSandbox.v1.0.md](../contracts/extensions/PluginSandbox.v1.0.md) - Trust Tier specification

---

### INV-PLUGIN-05: Plugin Catalog Integrity (Tamper-Evident)

**Invariant**: The plugin catalog (installed plugins + bundle digests + signer identities + SBOM digests + transparency evidence) MUST be **tamper-evident** and auditable. The system MUST be able to detect unauthorized mutation of catalog records and MUST fail closed on integrity failure.

**Minimum integrity mechanisms** (MUST implement at least one):

- **Append-only catalog event stream** (PluginInstalled/PluginUpdated/PluginRemoved) with immutable history, OR
- **Hash-chained records** (`entryHash = H(entry || prevHash)`) with verified head, OR
- **Merkle tree** with periodically signed root hash, OR
- **WORM storage** preventing UPDATE/DELETE at the storage layer.

**Rationale**: The catalog is the canonical source of truth for "what code is allowed to execute". If an attacker can rewrite digests or signer identity records, provenance checks can be bypassed retroactively.

**Verification**:

- Integration test: Attempt to UPDATE/DELETE catalog record → denied (or produces immutable history entry)
- Tamper-evidence test: Mutate record out-of-band → detection via hash chain / Merkle root mismatch
- Startup enforcement test: If catalog integrity verification fails, engine blocks plugin load/invocation and emits security incident audit event
- Audit test: Every install/update/remove emits append-only audit event including `{actorId, reason, pluginId, pluginVersion, oldBundleDigest, newBundleDigest, signerIdentity}`

**References**:

- [PLUGIN_PROVENANCE_POLICY.v1.md](PLUGIN_PROVENANCE_POLICY.v1.md) - Catalog persistence + integrity requirements
- [AuditLog.v1.md](../contracts/security/AuditLog.v1.md) - Append-only, tamper-evident logging
- [NIST SSDF](https://csrc.nist.gov/projects/ssdf) - Secure development + integrity controls

---

### INV-PLUGIN-06: Provenance Verification Audit Trail

**Invariant**: Every plugin provenance verification (signature check, bundle digest validation, signer identity verification) MUST emit a structured **VerificationResult** record to the audit log.

**Rationale**: Makes plugin installation and loading decisions auditable and testable. Enables detection of policy violations, failed verifications, or compromised plugin supply chain. Supports forensic investigation and compliance auditing.

**VerificationResult Schema** (MUST include in audit event):

- `bundleDigest`: SHA-256 digest of plugin bundle
- `signerIdentity`: Verified signer identity (issuer + subject from certificate or OIDC token)
- `policyVersion`: Version of provenance policy applied (e.g., `PLUGIN_PROVENANCE_POLICY.v1.0`)
- `decision`: `ALLOW` or `DENY`
- `reasonCodes`: Array of pass/fail reasons (e.g., `["SIGNATURE_VALID", "SIGNER_TRUSTED"]` or `["SIGNATURE_INVALID"]`)
- `timestamp`: ISO8601 UTC timestamp (trusted source per INV-AUDIT-03)
- `transparencyLogEntry`: Optional reference to Sigstore Rekor transparency log entry

**Enforcement Points**:

- **Plugin installer**: Emits `PluginVerificationResult` audit event on every install/update attempt (success or failure)
- **Plugin loader**: Emits audit event on plugin activation (runtime verification)
- **Audit log**: `VerificationResult` events are append-only, tamper-evident per INV-AUDIT-01

**Verification**:

- Audit completeness test: Install plugin → verify `PluginVerificationResult` event emitted with all required fields
- Policy evolution test: Update provenance policy version → new installs reference new `policyVersion` in audit log
- Forensic test: Query audit log for all plugins installed by specific `actorId` or with `decision: DENY`

**References**:

- [PLUGIN_PROVENANCE_POLICY.v1.md](PLUGIN_PROVENANCE_POLICY.v1.md) - Signature verification requirements
- [Sigstore Rekor](https://docs.sigstore.dev/rekor/overview/) - Transparency log for artifact signatures
- [AuditLog.v1.md](../contracts/security/AuditLog.v1.md) - Append-only audit schema

---

## Engine Boundary Invariants

### INV-ENGINE-01: Determinism Enforcement

**Invariant**: Engine Core code is deterministic and has no side-effect I/O ports (network, filesystem) except via explicit Plugin or Adapter boundaries.

**Rationale**: Ensures reproducibility and testability. Side effects must be isolated at boundaries for observability and control. Aligns with "Engine does not decide" principle (see [DVT Product Definition](../../DVT_Product_Definition_V0.md)).

**Import Denylist** (MUST enforce via static analysis / build-time lint):

```typescript
// Forbidden direct imports in Engine Core (`engine/src/core/**`)
const DENIED_IMPORTS = [
  'fs',
  'fs/promises',
  'node:fs', // Filesystem
  'net',
  'http',
  'https',
  'http2',
  'node:http', // Network
  'child_process',
  'node:child_process', // Process spawning
  'dns',
  'node:dns', // DNS resolution
  '@aws-sdk/*',
  '@google-cloud/*',
  '@azure/*', // Cloud SDKs (use adapters)
  'axios',
  'node-fetch',
  'got',
  'request', // HTTP clients
];
```

**Allowed imports**: Pure functions, type definitions, adapter interfaces (e.g., `IStateStoreAdapter`, `ISecretsProvider`)

**Enforcement Points**:

- **Build-time**: ESLint rule or TypeScript compiler plugin rejects denied imports → build fails
- **Dependency audit**: CI checks `engine/core/package.json` for disallowed dependencies
- **Architecture test**: Automated test verifies Core imports only from `../adapters/**`, `../contracts/**`, `../types/**`

**Verification**:

- Static analysis: `eslint --rule 'no-restricted-imports: [error, {patterns: DENIED_IMPORTS}]'` on `engine/src/core/**`
- Dependency review: All I/O dependencies confined to `engine/src/adapters/**`
- Determinism test: Same plan input → same event sequence output (see [Determinism testing](../../determinism/README.md))

**References**:

- [dvt_workflow_engine_artifact](../../engine/README.md) - Core/Adapter boundary specification
- [Determinism testing](../../determinism/README.md) - Determinism test suite specification

---

### INV-ENGINE-02: No Default Tenant

**Invariant**: Engine methods reject malformed scope; no default tenant; explicit scope required. Scope validation failures MUST use boundary-specific error handling and MUST NOT crash the process.

**Rationale**: Fail-safe design - never assume implicit tenant context. Explicit scope prevents accidental cross-tenant operations. Aligns with availability requirements (SOC2, SLA commitments).

**Enforcement Points**:

- **API boundary**: MUST return `400 Bad Request` if scope malformed, `401 Unauthorized` if authentication invalid, `403 Forbidden` if scope mismatch or authorization denied
- **Internal boundary** (Core→Adapter, Engine→StateStore): MUST reject with typed errors (`ScopeValidationError`, `AuthorizationRequiredError`) and MUST NOT crash process

**Verification**:

- API error test: Missing `tenantId` → 400 Bad Request; invalid JWT → 401 Unauthorized
- Internal error test: Adapter called with malformed scope → typed error (no process crash)
- Integration test: Tenant A cannot access Tenant B resources (403 Forbidden)

---

## Encryption Invariants

### INV-CRYPTO-01: Encryption at Rest

**Invariant**: StateStore adapter encrypts sensitive fields at rest using organization-approved cryptography, with KMS-backed key management and rotation. Keys MUST be tenant-safe (no cross-tenant key reuse without envelope encryption) and rotation MUST be auditable.

**Rationale**: Defense in depth - even if database compromised, ciphertext cannot be decrypted without keys.

**Verification**:

- Database dump test: Shows encrypted ciphertext (not plaintext secrets)
- Key rotation audit: KMS logs key version changes
- Tenant-safe keys: Envelope encryption or per-tenant key derivation

**References**:

- [IStateStoreAdapter.v1.md](../contracts/state-store/IStateStoreAdapter.v1.md) - Encryption requirements

---

### INV-CRYPTO-03: Key Separation (Tenant-Safe Keying)

**Invariant**: Encryption keys MUST be **tenant-safe**: no cross-tenant key reuse without envelope encryption. Each tenant's data is encrypted with a logically isolated key.

**Rationale**: Key compromise for Tenant A MUST NOT expose Tenant B's data. Supports cryptographic erasure per tenant (GDPR "right to be forgotten").

**Keying Strategies** (MUST implement one):

- **Per-tenant DEKs (Data Encryption Keys)** with KMS-managed KEK (Key Encryption Key) envelope
- **Derived keys**: `DEK_tenant = HKDF(masterKEK, tenantId || "encryption" || context)`
- **Separate KMS key domains**: Each tenant assigned dedicated KMS key ARN/ID

**Key Hierarchy Example**:

```
KMS Root Key (HSM-backed)
  └─ Tenant A KEK (envelope key)
       └─ DEK for database encryption
       └─ DEK for artifact storage
  └─ Tenant B KEK (isolated)
       └─ DEK for database encryption
       └─ DEK for artifact storage
```

**DeploymentMode considerations**:

- **SAAS_MULTI_TENANT**: MUST use envelope encryption or derived keys (shared KMS, logical separation)
- **DEDICATED_TENANT**: SHOULD use separate KMS key ARNs per tenant (physical separation)
- **SINGLE_TENANT_SELF_HOSTED**: Customer-managed keys

**Enforcement Points**:

- **StateStore encryption**: Each tenant's row encrypted with tenant-specific DEK
- **KMS integration**: Key usage audited per tenant (CloudTrail/StackDriver logs)

**Verification**:

- Key isolation test: Decrypt Tenant A ciphertext with Tenant B DEK → failure
- Cryptographic erasure test: Delete Tenant A KEK → Tenant A ciphertext irrecoverable, Tenant B unaffected
- Audit test: KMS logs show key usage tagged with `tenantId`

**References**:

- [NIST SP 800-57 Part 1](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final) - Key management recommendations
- [ICO GDPR Guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/) - Cryptographic erasure for GDPR compliance

---

### INV-CRYPTO-04: Key Rotation Policy

**Invariant**: Encryption keys MUST be rotated on a defined cadence (maximum 90 days for DEKs, 365 days for KEKs) with automatic re-encryption or re-wrapping.

**Rationale**: Limits blast radius of key compromise. Regular rotation is a security best practice and supports risk-based compliance controls (HIPAA Security Rule §164.308(a)(2), SOC2 CC6.7).

**Rotation Strategy**:

- **KEK rotation**: Envelope encryption allows KEK rotation without re-encrypting data (re-wrap DEKs only)
- **DEK rotation**: Full re-encryption required (can be deferred for cold data)
- **Cadence policy**: MUST define a rotation cadence (product defaults: DEK ≤ 90 days for hot data, KEK ≤ 365 days) OR justify different cadence via risk assessment ADR

**Process Requirements**:

1. KMS creates new key version (old version remains for decryption)
2. New writes use new key version
3. Background job re-encrypts existing data (SLA: 30 days for hot data, 180 days for cold data)
4. Old key version deprecated after re-encryption complete
5. Audit log records rotation events (`KeyRotationStarted`, `KeyRotationCompleted`)

**Enforcement Points**:

- **KMS**: Automatic rotation enabled (AWS KMS, GCP KMS, Azure Key Vault)
- **StateStore**: Tracks key version per encrypted field; background worker re-encrypts on rotation

**Verification**:

- Rotation test: Trigger manual rotation → new writes use new key version within 5 minutes
- Re-encryption test: After rotation, query old data → decrypts successfully (dual-version support)
- Audit test: Rotation events logged with timestamps + key versions
- SLA test: 95% of hot data re-encrypted within 30 days (monitor via metrics)

**References**:

- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html) - §164.308(a)(2) key rotation requirements
- [AWS KMS Key Rotation](https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html) - Automatic rotation patterns

---

## Rate Limiting & Resource Quotas

### INV-RATE-01: Per-Tenant Quota Enforcement

**Invariant**: Per-tenant quotas (API rate limits, concurrent runs, storage) MUST be enforced at API boundary AND engine submission boundary. Tenant A exhausting their quota MUST NOT impact Tenant B's ability to use their quota.

**Rationale**: Prevents "noisy neighbor" attacks and resource exhaustion DoS. Ties to INV-SCOPE-03 (no cross-tenant inference - quota exhaustion reveals nothing about other tenants).

**Quota Dimensions** (MUST enforce independently):

- **API rate limit**: Requests per second (RPS) per tenant (e.g., 100 RPS for standard tier)
- **Concurrent runs**: Maximum active workflow executions per tenant (e.g., 50 concurrent)
- **Storage quota**: Maximum StateStore + artifact storage per tenant (e.g., 100 GB)
- **Compute quota**: Maximum CPU/memory allocation per tenant (e.g., 10 vCPU aggregated)

**Enforcement Points**:

- **API gateway**: Token bucket per `tenantId` (Redis-backed for distributed environments)
- **Engine scheduler**: Queue depth per tenant; backpressure if tenant exceeds concurrent run limit
- **StateStore**: Storage quota check before write; reject with `507 Insufficient Storage` if exceeded

**DeploymentMode considerations**:

- **SAAS_MULTI_TENANT**: Strict enforcement required (MUST)
- **DEDICATED_TENANT**: Soft limits with alerting (SHOULD)
- **SINGLE_TENANT_SELF_HOSTED**: Customer-configured

**Verification**:

- Noisy neighbor test: Tenant A sends 10x their rate limit → 429 Too Many Requests; Tenant B requests succeed (< 5% error rate)
- Concurrency test: Tenant A starts 100 runs (quota: 50) → 50 queued; Tenant B starts 10 runs → all execute immediately
- Quota independence: See [TENANT_ISOLATION_TESTS.v1.md](TENANT_ISOLATION_TESTS.v1.md) ISOL-QUOTA-002, ISOL-QUOTA-003

**References**:

- [TENANT_ISOLATION_TESTS.v1.md](TENANT_ISOLATION_TESTS.v1.md) - ISOL-QUOTA-002 (rate limiting independence), ISOL-QUOTA-003 (concurrency test)
- [RFC 6585](https://www.rfc-editor.org/rfc/rfc6585.html) - HTTP 429 Too Many Requests

---

## Data Retention & Deletion

### INV-RET-01: Audit Log Retention

**Invariant**: Audit logs MUST be retained for **minimum 7 years** (product policy aligned to audit/compliance needs; configurable per compliance framework context: HIPAA 6 years for documentation retention per [45 CFR §164.316(b)(2)](https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164), GDPR 7 years for financial records). Deletion before retention period MUST require explicit operator Decision Record with legal approval.

**Rationale**: Long-term audit trail retention supports compliance obligations and incident investigation. Premature deletion can violate regulatory requirements.

**Retention Tiers**:

- **Hot storage** (0-90 days): Queryable via API, indexed for fast search
- **Warm storage** (90 days - 2 years): Archive to object storage (S3 Glacier, GCS Archive), queryable with higher latency
- **Cold storage** (2-7 years): Compliance archive, restore-on-demand only

**Enforcement Points**:

- **Audit log service**: Automatic tiering policy based on record age
- **Deletion API**: Rejects deletion requests for records < 7 years old unless Decision Record includes `legalApprovalTicketId`

**Verification**:

- Retention test: Query audit logs for records 5 years old (MUST exist)
- Premature deletion test: Attempt to delete 3-year-old record without legal approval → 403 Forbidden
- Tiering test: After 90 days, audit events automatically moved to warm storage (verify via storage class tags)

**References**:

- [SOC2 Trust Services Criteria](https://www.aicpa.org/topic/audit-assurance/trust-services) - CC7.2 (7-year retention)
- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html) - 6-year retention requirement

---

### INV-RET-02: Run State Retention vs Artifact Retention

**Invariant**: Run state (execution history, events) and artifacts (output files, logs) MUST have **separate retention policies**. Default: run state 90 days, artifacts 365 days (both configurable per tenant).

**Rationale**: Run state is high-volume, low-value after completion. Artifacts (build outputs, test results) have longer-term value. Independent retention reduces storage costs.

**Retention Policies** (per-tenant configurable):

- **Run state**: Completed run events, state snapshots (default: 90 days hot, 365 days warm, then delete)
- **Artifacts**: Build outputs, logs, test results (default: 365 days hot, 7 years cold for compliance-relevant artifacts)
- **Exception**: Failed runs retained longer (180 days default) for debugging

**Lifecycle Example**:

```
Run completes (day 0)
  └─ Run state: hot storage (queryable via API)
  └─ Artifacts: hot storage (direct download)
Day 90: Run state → warm storage (higher latency queries)
Day 365: Run state deleted (unless tagged for compliance)
Day 365: Artifacts → cold storage (restore-on-demand)
Day 2555 (7 years): Compliance artifacts deleted (after retention period)
```

**Enforcement Points**:

- **StateStore**: TTL policies per record type (`run_events` vs `artifacts`)
- **Artifact storage**: Lifecycle policy based on object tags (`RetentionClass: compliance | standard`)

**Verification**:

- Run state lifecycle test: Completed run older than 90 days → moved to warm storage (verify storage class)
- Artifact retention test: Compliance-tagged artifact older than 365 days → still accessible (cold storage)
- Deletion test: Non-compliance run state older than 365 days → deleted (query returns 404)

**References**:

- [IStateStoreAdapter.v1.md](../contracts/state-store/IStateStoreAdapter.v1.md) - TTL policy requirements

---

## Supply Chain Security

### INV-SUPPLY-01: Core Build Provenance (SLSA)

**Invariant**: All DVT Engine core artifacts (binaries, container images, npm packages) MUST be built from CI with **provenance attestation** (SLSA Level 2+ equivalent) and **SBOM** produced and stored.

**Rationale**: Supply chain attacks (SolarWinds, Codecov) demonstrate need for verifiable build integrity. Provenance allows detection of tampered builds.

**Provenance Requirements** (MUST include in build attestation):

- **Source commit SHA**: Exact Git commit used for build (immutable)
- **Build system identity**: CI system + job ID (e.g., GitHub Actions workflow, CircleCI pipeline)
- **Build parameters**: Environment variables, build flags (reproducible builds)
- **Builder identity**: Build agent + timestamp + signature
- **Output artifacts**: Digest (SHA-256) of each artifact produced

**SBOM Requirements** (MUST produce for each release):

- **Format**: SPDX 2.3+ or CycloneDX 1.4+
- **Contents**: All dependencies (direct + transitive) with versions + licenses
- **Storage**: SBOM signed with release key, published to artifact registry alongside binaries

**Enforcement Points**:

- **CI pipeline**: Build job generates provenance attestation (sigstore/cosign, GitHub OIDC)
- **Release process**: Unsigned artifacts rejected during release promotion
- **Deployment**: Verify provenance signature before deploying (Kubernetes admission controller, Sigstore verification)

**Verification**:

- Provenance test: Build artifact locally with different commit SHA → provenance verification fails (digest mismatch)
- SBOM completeness test: Parse SBOM, verify all `package.json` dependencies present
- Signature test: Verify artifact signature with Sigstore/Rekor transparency log

**References**:

- [SLSA Framework](https://slsa.dev/) - Supply chain levels for software artifacts
- [Sigstore](https://www.sigstore.dev/) - Keyless signing with OIDC + transparency log
- [NIST SSDF](https://csrc.nist.gov/projects/ssdf) - Secure Software Development Framework (PO.3.2: provenance)

---

### INV-SUPPLY-02: Dependency Pinning & Vulnerability Gate

**Invariant**: All production dependencies MUST be **pinned to exact versions** (no `^` or `~` ranges). CI MUST enforce vulnerability gate: block build if critical/high CVEs detected.

**Rationale**: Version ranges introduce non-determinism and risk of malicious package updates. Vulnerability gate prevents shipping known-vulnerable dependencies.

**Dependency Pinning Requirements**:

- **Lockfile enforcement**: Production builds MUST be reproducible from committed lockfile (`pnpm-lock.yaml` / `package-lock.json`); CI MUST fail if lockfile changes unexpectedly (enforce `npm ci` or `pnpm install --frozen-lockfile`)
- **package.json**: SHOULD use exact versions (recommended: `"lodash": "4.17.21"`); MUST NOT allow unbounded ranges (`*`, `latest`, `x`)
- **Container base images**: Pin to digest, not tag (e.g., `node:20-alpine@sha256:abc123...`, not `node:20-alpine`)

**Vulnerability Gate** (CI enforcement):

- **Tool**: Snyk, npm audit, or OWASP Dependency-Check
- **Severity threshold**: Block on Critical + High CVEs (CVSS ≥ 7.0)
- **Exception process**: Security team approval required via Decision Record + compensating controls documented
- **Cadence**: Run on every PR + nightly scan of `main` branch

**Enforcement Points**:

- **CI pipeline**: Vulnerability scan fails build if high/critical CVEs detected
- **Renovate / Dependabot**: Automated PR creation for dependency updates (manual review required)
- **Pre-commit hook**: Lint `package.json` for version ranges (warn if detected)

**Verification**:

- Pinning test: Audit `package.json` for `^` or `~` characters → none allowed
- Vulnerability test: Introduce dependency with known CVE (e.g., lodash 4.17.19) → CI build fails
- Exception test: Override vulnerability gate with Decision Record → build passes but alerts security team

**References**:

- [npm Lockfiles](https://docs.npmjs.com/cli/v9/configuring-npm/package-lock-json) - Deterministic dependency resolution
- [OWASP Dependency-Check](https://owasp.org/www-project-dependency-check/) - Vulnerability scanning tool
- [Snyk Vulnerability Database](https://snyk.io/vuln/) - CVE tracking for open-source dependencies

---

### INV-CRYPTO-02: TLS Enforcement

**Invariant**: TLS 1.3+ enforced for all external APIs; TLS 1.2 or lower connections rejected.

**Rationale**: Modern TLS versions eliminate known vulnerabilities (POODLE, BEAST, etc.). Strict enforcement prevents downgrade attacks.

**Enforcement Points**:

- **API gateway**: TLS termination with minimum version TLS 1.3
- \*Enforcement Matrix

This matrix specifies **where** each invariant is enforced and **how** it fails:

| Invariant      | Enforcement Point(s)             | Failure Mode                                      | Test Type                         |
| -------------- | -------------------------------- | ------------------------------------------------- | --------------------------------- |
| INV-SCOPE-01   | API, Core→Adapter                | 400 (API), `ScopeValidationError` (internal)      | Unit, Integration, Pentest        |
| INV-SCOPE-02   | StateStore Adapter               | Typed error (`ScopeRequiredError`)                | Unit, Integration                 |
| INV-SCOPE-03   | API, Authorization               | Generic error (403/404 per policy)                | E2E, Statistical timing (CI gate) |
| INV-AUTHZ-01   | Authorization Service            | 403 Forbidden                                     | Unit, Policy test suite           |
| INV-AUTHZ-02   | API, Engine, StateStore          | 403 Forbidden (multi-layer)                       | Bypass test, Integration          |
| INV-AUTHZ-03   | Plugin Sandbox, API Gateway      | 403 Forbidden (permission denied)                 | E2E, Confused deputy test         |
| INV-SECRETS-01 | Secrets Provider, Log Scrubber   | Redaction (logs), runtime error (plan validation) | Unit, Secret scanner (CI)         |
| INV-AUDIT-01   | Audit Service, Storage           | Permission denied (delete/update)                 | Integration, HMAC verification    |
| INV-AUDIT-02   | API, Audit Service               | 400 Bad Request (missing Decision Record)         | Integration, Alerting test        |
| INV-AUDIT-03   | Audit Service                    | Timestamp validation error                        | Unit, NTP sync test               |
| INV-PLUGIN-01  | Plugin Loader                    | Runtime error (`SignatureInvalidError`)           | Unit, CI enforcement              |
| INV-PLUGIN-02  | Plugin Sandbox, Network Policy   | Network error (egress blocked)                    | Integration, E2E                  |
| INV-PLUGIN-03  | Plugin Sandbox                   | Runtime error (`PermissionDeniedError`)           | E2E, Permission test              |
| INV-PLUGIN-04  | Config Validation, Plugin Loader | Config error (deployment mode check)              | Unit, Runtime enforcement         |
| INV-PLUGIN-05  | Plugin Catalog Service           | Integrity check failure (security incident event) | Integration, Tamper test          |
| INV-ENGINE-01  | Build (ESLint), Dependency Audit | Build failure (denied import detected)            | Static analysis, CI               |
| INV-ENGINE-02  | API, Core                        | 400 Bad Request (API), typed error (internal)     | Unit, Integration                 |
| INV-CRYPTO-01  | StateStore Adapter               | Ciphertext returned (not plaintext)               | Database dump test                |
| INV-CRYPTO-02  | API Gateway, TLS Termination     | Handshake failure (TLS 1.2 rejected)              | TLS version test                  |
| INV-CRYPTO-03  | Encryption Service, KMS          | Decryption failure (wrong tenant DEK)             | Key isolation test                |
| INV-CRYPTO-04  | KMS, Background Worker           | Automatic rotation (policy-driven)                | Rotation test, Audit log          |
| INV-RATE-01    | API Gateway, Engine Scheduler    | 429 Too Many Requests                             | Integration, Noisy neighbor test  |
| INV-RET-01     | Audit Service, Storage Policy    | 403 Forbidden (premature deletion)                | Retention test, Lifecycle test    |
| INV-RET-02     | StateStore, Artifact Storage     | Automatic tiering/deletion (TTL)                  | Lifecycle test, Cold storage test |
| INV-SUPPLY-01  | CI Build, Release Pipeline       | Build rejection (missing provenance)              | Provenance verify, SBOM test      |
| INV-SUPPLY-02  | CI Vulnerability Scan            | Build failure (CVE detected)                      | Dependency scan, Pinning test     |

**Legend**:

- **Enforcement Point**: Where the invariant is checked/enforced (can be multiple boundaries)
- **Failure Mode**: What happens when invariant violated (error code, exception type, or security incident)
- **Test Type**: How to verify enforcement (unit/integration/e2e/static analysis/pentest)

---

## Status of Dependencies

This document references several contracts and supporting documents. Status:

### REQUIRED (MUST exist for enforcement)

- ✅ **[IWorkflowEngine.v1.md](../contracts/engine/IWorkflowEngine.v1.md)** - Tenant scope requirements (INV-SCOPE-01)
- ✅ **[IStateStoreAdapter.v1.md](../contracts/state-store/IStateStoreAdapter.v1.md)** - Scope parameter + encryption (INV-SCOPE-02, INV-CRYPTO-01)
- ✅ **[IAuthorization.v1.md](../contracts/security/IAuthorization.v1.md)** - Authorization interface (INV-AUTHZ-01/02)
- ✅ **[ISecretsProvider.v1.md](../contracts/security/ISecretsProvider.v1.md)** - Secrets resolution (INV-SECRETS-01)
- ✅ **[AuditLog.v1.md](../contracts/security/AuditLog.v1.md)** - Audit log schema (INV-AUDIT-01/02)
- ✅ **[PluginSandbox.v1.0.md](../contracts/extensions/PluginSandbox.v1.0.md)** - Trust Tiers + permissions (INV-PLUGIN-02/03/04, INV-AUTHZ-03)
- ✅ **[PLUGIN_PROVENANCE_POLICY.v1.md](PLUGIN_PROVENANCE_POLICY.v1.md)** - Signature verification (INV-PLUGIN-01/05)
- ✅ **[TENANT_ISOLATION_TESTS.v1.md](TENANT_ISOLATION_TESTS.v1.md)** - Inference tests (INV-SCOPE-03)
- ✅ **[THREAT_MODEL.md](THREAT_MODEL.md)** - Threat scenarios + mitigations

### REQUIRED (schema/operational)

- ✅ **[DecisionRecord.v1.md](../contracts/operations/DecisionRecord.v1.md)** - Operator justification schema (INV-AUDIT-02)
- 🟡 **[dvt_workflow_engine_artifact](../../engine/README.md)** - Core/Adapter boundary (INV-ENGINE-01) _(verify path)_
- 🟡 **[Determinism testing](../../determinism/README.md)** - Determinism test suite (INV-ENGINE-01) _(planned)_

### INFORMATIVE (external references)

- ✅ **[DVT Product Definition](../../DVT_Product_Definition_V0.md)** - Separation principles ("UI does not execute...")
- ✅ **External standards**: RFC 7519 (JWT), OWASP, NIST, SOC2, HIPAA, GDPR (all linked in text)

**Legend**:

- ✅ Exists and referenced
- 🟡 Path verification needed or planned implementation
- ❌ Missing (blocks enforcement if REQUIRED)

---

## \*Internal services\*\*: mTLS with TLS 1.3 (service mesh or explicit configuration)

**Verification**:

- TLS version test: TLS 1.2 connection attempt rejected (handshake failure)
- Cipher suite validation: Only approved ciphers (ECDHE + AES-GCM, no RC4/DES/3DES)
- Certificate validation: Verify full chain, reject self-signed in production

**References**:

- [TLS 1.3 RFC 8446](https://www.rfc-editor.org/rfc/rfc8446.html) - Standard specification
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/) - Recommended TLS settings

---

## Implementation Validation Checklist

Use this checklist during code review to validate invariant implementation:

### Scope Enforcement

- [ ] INV-SCOPE-01: All commands include immutable `TenantScope` (JWT/mTLS binding)
- [ ] INV-SCOPE-02: StateStore methods require `TenantScope` parameter
- [ ] INV-SCOPE-03: Cross-tenant inference tests pass (timing test p≥0.01, generic errors per policy, no oracle)

### Authorization

- [ ] INV-AUTHZ-01: Default deny policy (no explicit allow → 403 Forbidden)
- [ ] INV-AUTHZ-02: Multi-layer enforcement (API + Engine + StateStore boundaries)
- [ ] INV-AUTHZ-03: No confused deputy (plugins use scoped credentials, not engine privileges)

### Secrets Management

- [ ] INV-SECRETS-01: No plaintext secrets in logs, state, or plans (only `SecretRef`)
- [ ] INV-SECRETS-02: Secrets not exfiltrated via artifacts/state (DLP enforcement on plugin-accessible storage)

### Audit

- [ ] INV-AUDIT-01: Audit log append-only (envelope immutable, PII crypto-erasable)
- [ ] INV-AUDIT-02: All state mutations emit audit events + Decision Records for high-risk operations
- [ ] INV-AUDIT-03: Timestamps from NTP source (UTC) + sequence ordering

### Plugin Security

- [ ] INV-PLUGIN-01: Plugin signature verification on install + load
- [ ] INV-PLUGIN-02: Network egress blocked for Tier 1 plugins (allowlist for Tier 2)
- [ ] INV-PLUGIN-03: Permission manifest enforced (deny by default)
- [ ] INV-PLUGIN-04: Tier 3 disabled in `SAAS_MULTI_TENANT` mode
- [ ] INV-PLUGIN-05: Plugin catalog tamper-evident (immutable or hash-chained)
- [ ] INV-PLUGIN-06: Provenance verification emits VerificationResult audit events

### Engine Boundaries

- [ ] INV-ENGINE-01: No side-effect I/O in engine core (import denylist enforced)
- [ ] INV-ENGINE-02: Missing/malformed tenant scope → 400 Bad Request (API) or typed error (internal)

### Encryption

- [ ] INV-CRYPTO-01: Database dump shows ciphertext (not plaintext)
- [ ] INV-CRYPTO-02: TLS 1.2 connection rejected (TLS 1.3+ only)
- [ ] INV-CRYPTO-03: Tenant-safe keying (envelope encryption or per-tenant DEKs)
- [ ] INV-CRYPTO-04: Key rotation enabled (≤90 days DEK, ≤365 days KEK)

### Rate Limiting & Quotas

- [ ] INV-RATE-01: Per-tenant quotas enforced (noisy neighbor test passes)

### Data Retention

- [ ] INV-RET-01: Audit logs retained ≥7 years (deletion requires legal approval)
- [ ] INV-RET-02: Run state vs artifact retention policies independent (default: 90d vs 365d)

### Supply Chain

- [ ] INV-SUPPLY-01: Core artifacts built with provenance (SLSA L2+) + SBOM
- [ ] INV-SUPPLY-02: Dependencies pinned (exact versions), vulnerability gate (CVSS≥7.0 blocks build)

---

## Compliance Mapping

**Regulatory References**:

- **SOC2**: [AICPA Trust Services Criteria](https://www.aicpa.org/topic/audit-assurance/trust-services) - Security, availability, confidentiality
- **HIPAA**: [45 CFR Part 164](https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164) - Security and Privacy Rules
- **GDPR**: [ICO GDPR Guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/) - UK GDPR implementation
- **NIST**: [SP 800-53 Rev. 5](https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final) - Security and Privacy Controls

| Invariant                        | SOC2                      | HIPAA                                      | GDPR                           | NIST 800-53                           |
| -------------------------------- | ------------------------- | ------------------------------------------ | ------------------------------ | ------------------------------------- |
| **Scope & Authorization**        |                           |                                            |                                |                                       |
| INV-SCOPE-01                     | ✅ Access Control (CC6.1) | ✅ Technical Safeguards (§164.312)         | ✅ Art. 32 (Security)          | ✅ AC-3 (Access Enforcement)          |
| INV-SCOPE-03                     | ✅ Monitoring (CC7.2)     | ✅ PHI Protection (§164.308)               | ✅ Art. 32 (Security)          | ✅ AC-4 (Information Flow)            |
| INV-AUTHZ-01                     | ✅ Access Control (CC6.1) | ✅ Access Control (§164.312(a)(1))         | ✅ Art. 32 (Security)          | ✅ AC-3 (Access Enforcement)          |
| INV-AUTHZ-02                     | ✅ Security (CC6.6)       | ✅ Defense in Depth                        | ✅ Art. 32 (Security)          | ✅ SC-3 (Security Function Isolation) |
| INV-AUTHZ-03                     | ✅ Access Control (CC6.1) | ✅ Authentication (§164.312(d))            | ✅ Art. 32 (Security)          | ✅ AC-3 (Access Enforcement)          |
| **Secrets & Encryption**         |                           |                                            |                                |                                       |
| INV-SECRETS-01                   | ✅ Encryption (CC6.7)     | ✅ Encryption (§164.312(a)(2)(iv))         | ✅ Art. 32 (Security)          | ✅ SC-12 (Crypto Key Mgmt)            |
| INV-CRYPTO-01                    | ✅ Encryption (CC6.7)     | ✅ At-Rest Encryption (§164.312(a)(2)(iv)) | ✅ Art. 32 (Security)          | ✅ SC-28 (Data at Rest)               |
| INV-CRYPTO-02                    | ✅ Transmission (CC6.7)   | ✅ In-Transit Encryption (§164.312(e)(1))  | ✅ Art. 32 (Security)          | ✅ SC-8 (Data in Transit)             |
| INV-CRYPTO-03                    | ✅ Encryption (CC6.7)     | ✅ Key Management (§164.312(a)(2)(iv))     | ✅ Art. 17 (Right to Erasure)  | ✅ SC-12 (Crypto Key Mgmt)            |
| INV-CRYPTO-04                    | ✅ Key Rotation (CC6.7)   | ✅ Key Management (§164.308(a)(2))         | ✅ Art. 32 (Security)          | ✅ SC-12 (Crypto Key Mgmt)            |
| **Audit & Retention**            |                           |                                            |                                |                                       |
| INV-AUDIT-01                     | ✅ Logging (CC7.2)        | ✅ Audit Logs (§164.312(b))                | ✅ Art. 30 (Records)           | ✅ AU-9 (Audit Protection)            |
| INV-AUDIT-02                     | ✅ Monitoring (CC7.2)     | ✅ Access Logging (§164.312(b))            | ✅ Art. 30 (Records)           | ✅ AU-3 (Audit Content)               |
| INV-RET-01                       | ✅ Retention (CC7.3)      | ✅ Retention (§164.316(b)(2))              | ✅ Art. 30 (Records)           | ✅ AU-11 (Audit Record Retention)     |
| INV-RET-02                       | ✅ Data Lifecycle (CC6.5) | ✅ Retention Policies                      | ✅ Art. 5 (Storage Limitation) | ✅ SI-12 (Data Handling)              |
| **Plugin Security**              |                           |                                            |                                |                                       |
| INV-PLUGIN-01                    | ✅ Change Mgmt (CC8.1)    | ✅ Security Mgmt (§164.308(a)(8))          | ✅ Art. 32 (Security)          | ✅ CM-7 (Least Functionality)         |
| INV-PLUGIN-02                    | ✅ Security (CC6.6)       | ✅ Technical Safeguards                    | ✅ Art. 32 (Security)          | ✅ SC-7 (Boundary Protection)         |
| INV-PLUGIN-04                    | ✅ Security (CC6.6)       | ✅ Technical Safeguards                    | ✅ Art. 32 (Security)          | ✅ SC-7 (Boundary Protection)         |
| INV-PLUGIN-05                    | ✅ Change Mgmt (CC8.1)    | ✅ Security Mgmt (§164.308(a)(8))          | ✅ Art. 32 (Security)          | ✅ CM-3 (Config Mgmt)                 |
| **Rate Limiting & Supply Chain** |                           |                                            |                                |                                       |
| INV-RATE-01                      | ✅ Availability (A1.3)    | ✅ Availability (§164.308(a)(7))           | ✅ Art. 32 (Security)          | ✅ SC-5 (DoS Protection)              |
| INV-SUPPLY-01                    | ✅ Change Mgmt (CC8.1)    | ✅ Security Mgmt                           | ✅ Art. 32 (Security)          | ✅ SA-15 (Development)                |
| INV-SUPPLY-02                    | ✅ Change Mgmt (CC8.1)    | ✅ Security Mgmt                           | ✅ Art. 32 (Security)          | ✅ SA-11 (Developer Security Testing) |

---

## References

### Security Contracts & Policies

- [THREAT_MODEL.md](THREAT_MODEL.md) - Threat scenarios and mitigations
- [PLUGIN_PROVENANCE_POLICY.v1.md](PLUGIN_PROVENANCE_POLICY.v1.md) - Plugin signature verification requirements (INV-PLUGIN-01/05)
- [TENANT_ISOLATION_TESTS.v1.md](TENANT_ISOLATION_TESTS.v1.md) - Isolation test suite (INV-SCOPE-03, INV-RATE-01)
- [IAuthorization.v1.md](../contracts/security/IAuthorization.v1.md) - Authorization interface (INV-AUTHZ-01/02/03)
- [AuditLog.v1.md](../contracts/security/AuditLog.v1.md) - Audit log schema (INV-AUDIT-01/02)
- [ISecretsProvider.v1.md](../contracts/security/ISecretsProvider.v1.md) - Secrets resolution interface (INV-SECRETS-01)
- [DecisionRecord.v1.md](../contracts/operations/DecisionRecord.v1.md) - Operator justification schema (INV-AUDIT-02)
- [PluginSandbox.v1.0.md](../contracts/extensions/PluginSandbox.v1.0.md) - Trust Tiers + permissions (INV-PLUGIN-02/03/04, INV-AUTHZ-03)
- [IStateStoreAdapter.v1.md](../contracts/state-store/IStateStoreAdapter.v1.md) - Scope enforcement + encryption (INV-SCOPE-02, INV-CRYPTO-01, INV-RET-02)
- [IWorkflowEngine.v1.md](../contracts/engine/IWorkflowEngine.v1.md) - Tenant scope requirements (INV-SCOPE-01)

### Product & Architecture Principles

- [DVT Product Definition](../../DVT_Product_Definition_V0.md) - "UI does not execute / Engine does not decide / Planner does not persist" separation
- [dvt_workflow_engine_artifact](../../engine/README.md) - Core/Adapter boundary specification
- [Determinism testing](../../determinism/README.md) - Determinism test suite

### Standards & Frameworks

- [RFC 7519 (JWT)](https://datatracker.ietf.org/doc/html/rfc7519) - JSON Web Token standard
- [RFC 6585 (HTTP 429)](https://www.rfc-editor.org/rfc/rfc6585.html) - Too Many Requests status code
- [RFC 8446 (TLS 1.3)](https://www.rfc-editor.org/rfc/rfc8446.html) - Transport Layer Security
- [OWASP Timing Attacks](https://owasp.org/www-community/attacks/Timing_Attack) - Statistical analysis methodology
- [OWASP Confused Deputy](https://owasp.org/www-community/attacks/Confused_Deputy) - Attack pattern description
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) - Secrets logging guidance
- [OWASP Dependency-Check](https://owasp.org/www-project-dependency-check/) - Vulnerability scanning
- [SLSA Framework](https://slsa.dev/) - Supply chain levels for software artifacts
- [Sigstore](https://www.sigstore.dev/) - Keyless signing with OIDC + transparency log

### Compliance & Regulatory

- [AICPA Trust Services Criteria](https://www.aicpa.org/topic/audit-assurance/trust-services) - SOC2 security, availability, confidentiality
- [45 CFR Part 164](https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164) - HIPAA Security and Privacy Rules
- [ICO GDPR Guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/) - UK GDPR implementation
- [NIST SP 800-53 Rev. 5](https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final) - Security and Privacy Controls
- [NIST SP 800-57 Part 1](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final) - Key management recommendations
- [NIST SP 800-88r1](https://csrc.nist.gov/publications/detail/sp/800-88/rev-1/final) - Media sanitization (cryptographic erasure)
- [NIST SSDF](https://csrc.nist.gov/projects/ssdf) - Secure Software Development Framework
- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html) - Technical safeguards

### Tools & Technologies

- [gVisor](https://gvisor.dev/) - Strong sandboxing alternative for untrusted code
- [AWS KMS Key Rotation](https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html) - Automatic rotation patterns
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/) - Recommended TLS settings
- [npm Lockfiles](https://docs.npmjs.com/cli/v9/configuring-npm/package-lock-json) - Deterministic dependency resolution
- [Snyk Vulnerability Database](https://snyk.io/vuln/) - CVE tracking for open-source dependencies

---

_Last updated: 2026-02-12_  
_Version: 1.1_  
_Status: Normative - MUST comply_  
_Invariants: 28 (Scope: 3, Authorization: 3, Secrets: 2, Audit: 3, Plugin: 6, Engine: 2, Crypto: 4, Rate: 1, Retention: 2, Supply Chain: 2)_
