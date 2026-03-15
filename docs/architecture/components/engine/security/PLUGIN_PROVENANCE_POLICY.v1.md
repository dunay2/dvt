# PLUGIN_PROVENANCE_POLICY.v1.md - Plugin Supply Chain Security

**Version**: 1.4  
**Date**: 2026-02-12  
**Status**: Normative  
**Location**: docs/architecture/engine/security/PLUGIN_PROVENANCE_POLICY.v1.md

---

## 1. Scope

This document defines **mandatory supply chain security requirements** for DVT Engine plugins. All plugin bundles MUST comply with provenance verification requirements before installation or execution.

**Normative keywords**: Per [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174): MUST, MUST NOT, SHOULD, SHOULD NOT, MAY.

**Deployment Scope Convention**:

- Requirements marked **"Marketplace"** apply only to official marketplace deployments
- **Self-hosted** deployments MAY omit optional requirements unless Trust Tier policy requires them
- Requirements without scope qualifier apply to **all deployments**

---

## 2. Normative Requirements

### 2.1 Verification Contract

**Inputs** (MUST accept):

- Plugin bundle (artifact bytes)
- `plugin.manifest.json` (embedded in bundle)
- SBOM (bundled or external with signature)
- Trust roots configuration
- Revocation feed

**Output** (MUST produce):

```typescript
interface VerificationResult {
  bundleDigest: string; // SHA-256 of artifact bytes
  signerIdentity: {
    issuer: string;
    subject: string;
    claims?: Record<string, string>; // OIDC claims (if present)
  };
  matchedTrustRootId: string; // Trust root ID that matched
  signatureType: 'sigstore' | 'gpg' | 'pki';
  signatureValid: boolean;
  policyVersion: string; // Digest of trust roots at verification time
  timestamp: string; // ISO8601 UTC
  decision: 'ALLOW' | 'DENY';
  reasonCode?: string; // UNSIGNED | UNTRUSTED_SIGNER | DIGEST_MISMATCH | INVALID_MANIFEST | UNSUPPORTED_API_VERSION | MISSING_SBOM | INVALID_SBOM | REVOKED | CRITICAL_CVE | PROHIBITED_DEPENDENCY
}
```

**Verification Phases** (MUST):

- **Install time**: Full signature verification; persist result to catalog
- **Load time**: Full signature verification (once per process lifecycle)
- **Invocation time**: Digest verification MUST (all tiers); full signature re-verification tier/config-dependent (see Trust Tier Matrix, Section 2.9)

**Signature Binding** (MUST verify):

1. Artifact digest (SHA-256 of exact bundle bytes)
2. Trusted identity (issuer + subject from certificate)
3. Timestamp: MUST be derived from verifiable evidence
   - Sigstore: Rekor inclusion proof time (when available) OR bundle timestamp attestation
   - GPG/PKI: Trusted CI attestation timestamp OR RFC3161 TSA (when configured)

**Rejection Criteria** (MUST reject):

- Unsigned bundles
- Unknown issuer/subject (not in trust root allowlist)
- Digest mismatch
- Revoked certificate or identity
- Invalid or missing `plugin.manifest.json`

---

### 2.2 Trust Roots

Engine MUST maintain explicit allowlist of trusted plugin issuers.

**Configuration Schema** (MUST support):

```yaml
pluginTrustRoots:
  - issuer: string                    # OIDC issuer URI
    subjectExact?: string             # Exact subject match (mutually exclusive with subjectPattern)
    subjectPattern?: string           # Anchored regex (^...$) - requires RE2 for SaaS
    claims:                           # Optional OIDC claim constraints
      repository: string              # Exact repository
      workflow: string                # Workflow file path
      ref: string                     # Git ref pattern
    trustLevel: "official" | "partner" | "self-hosted"
```

**Subject Matching** (MUST):

- Provide **either** `subjectExact` (exact string match) **or** `subjectPattern` (regex)
- Multi-tenant SaaS: If `subjectPattern` used, MUST use RE2; if unavailable, reject pattern or use `subjectExact` only

**Regex Safety** (MUST for multi-tenant SaaS):

- Use RE2 or linear-time regex engine
- If unavailable: disable regex matching, use exact subject match or precompiled allowlist
- Maximum pattern length: 1024 characters

---

### 2.3 Plugin Manifest

Every plugin bundle MUST include `plugin.manifest.json` at archive root.

**Required Fields** (MUST):

- `pluginId`: Scoped package name
- `version`: Semantic version
- `apiVersion`: DVT plugin API version (e.g., `v1`)
- `entrypoint`: Relative path to main executable
- `permissions`: Declared capability requests (network/filesystem/environment/subprocess)

**Optional Fields** (SHOULD):

- `sbom.path`: Relative path to SBOM within bundle
- `sbom.digest`: SHA-256 of SBOM content
- `attestations[]`: Linked provenance artifacts

**Enforcement** (MUST):

- Reject if `apiVersion` not supported by runtime
- Compute **effective permissions** = requested ∩ allowedByTierPolicy ∩ enforceableBySandbox
- Fail closed if requested permission category unenforceable by sandbox
- Store in catalog: `apiVersion`, requested permissions, effective permissions, `sbom.digest`

---

### 2.4 Catalog Integrity

Catalog entries MUST be **tamper-evident** (satisfies INV-PLUGIN-05 in [SECURITY_INVARIANTS.v1.md](SECURITY_INVARIANTS.v1.md)).

**Invariant** (MUST):

- Catalog entries append-only OR every mutation emits immutable audit event
- Store: bundleDigest, signerIdentity, rekorEntryId, sbomDigest, policyVersion

**Verification API** (MUST provide):

```typescript
interface CatalogIntegrityProof {
  catalogRootHash: string; // Merkle root or hash chain head
  entryCount: number;
  lastMutationTime: string; // ISO8601 UTC
  auditLogDigest?: string; // SHA-256 of audit log
}
```

---

### 2.5 Revocation Model

Engine MUST support revocation mechanisms.

**Denylist Types** (MUST):

1. **Digest denylist**: Blocklist of SHA-256 artifact digests
2. **Identity denylist**: Revoked (issuer, subject) pairs
3. **Cutoff timestamps**: Block signatures from (issuer, subject) after `cutoffTime`

**Revocation Feed Interface** (MUST for marketplace):

```typescript
interface RevocationFeed {
  feedVersion: string; // Monotonic version
  feedSignature: string; // Signature over feed content
  digestDenylist: string[]; // SHA-256 digests
  identityDenylist: Array<{
    issuer: string;
    subject: string;
    revokedAt: string; // ISO8601 UTC
  }>;
  identityCutoffs: Array<{
    issuer: string;
    subject: string;
    cutoffTime: string; // ISO8601 UTC
  }>;
}
```

**Feed Requirements** (MUST):

- Poll at configured interval (default: hourly for marketplace, daily for self-hosted)
- Reject unsigned/invalid feeds
- Apply updates immediately (trigger catalog re-validation)
- Cache last-known-good feed

**Fallback Policy** (MUST for multi-tenant SaaS Tier 1/2):

- MUST NOT fail open
- MUST fail closed after grace window (default: 6 hours) using cached feed

**Self-hosted** (MAY):

- Configure fail open or fail closed

---

### 2.6 SBOM Requirements

All plugins MUST include SBOM (CycloneDX or SPDX format).

**Distribution Modes** (MUST support):

1. **Bundled**: SBOM in signed bundle, path declared in manifest
2. **External**: SBOM distributed separately with cryptographic signature

**Required Fields** (MUST):

- Component name, version, publisher
- Dependencies (direct + transitive) with package URLs (purl) and hashes (SHA-256 minimum)

**Enforcement** (MUST):

- Reject if SBOM missing/unverifiable for Tier 1/2
- Verify SBOM digest matches manifest declaration (bundled mode)
- Verify SBOM signature (external mode): **External SBOM signature MUST bind SBOM digest to the same signer identity policy OR to an explicitly configured SBOM trust root**

---

### 2.7 Vulnerability Scanning

**Marketplace** (MUST):

- Scan plugin dependencies for known vulnerabilities
- Use CVSS v3.1 Base Score with documented thresholds
- Record vulnerability DB metadata (timestamp, digest, version)

**Approval Thresholds**:

- Critical (CVSS ≥ 9.0): MUST block plugin release
- High (CVSS ≥ 7.0): MUST require remediation plan or ADR exception (≤90 days)

**Exception Process** (MAY):

- Time-bounded approval (≤90 days)
- Requires security review + justification
- Audited in catalog metadata

---

### 2.8 Prohibited Dependencies

**vm2** (MUST reject all tiers):

- Package has history of critical sandbox escape vulnerabilities

**Native Addons** (MUST for Tier 1; SHOULD for Tier 2/3):

- Tier 1: MUST reject always
- Tier 2/3: MUST reject unless approved via ADR with:
  - Source code audit
  - Runtime permission constraints (filesystem/network/syscall allowlist)
  - Time-bounded approval (≤180 days, renewable)

---

### 2.9 Trust Tier Matrix

| Trust Tier | Signature (install+load) | Invocation Time                    | Trust Root             | SBOM    | Vuln Scan | vm2            | Native Addons   |
| ---------- | ------------------------ | ---------------------------------- | ---------------------- | ------- | --------- | -------------- | --------------- |
| **Tier 1** | ✅ MUST                  | Digest MUST + sig SHOULD (TTL≤24h) | Official + OIDC claims | ✅ MUST | ✅ MUST   | ❌ MUST reject | ❌ MUST reject  |
| **Tier 2** | ✅ MUST                  | Digest MUST + sig cached (TTL≤24h) | Official + Partner     | ✅ MUST | ✅ MUST   | ❌ MUST reject | ⚠️ ADR required |
| **Tier 3** | ✅ MUST                  | Digest MUST\*                      | Self-hosted            | SHOULD  | SHOULD    | ❌ MUST reject | ⚠️ ADR required |

\***Tier 3 Invocation Time**: Digest verification MUST; full signature re-verification configurable (default: digest-only).

**Tier 1 Invocation Time Detail**:

- MUST verify bundle digest on every call (SHA-256 comparison)
- SHOULD re-verify full signature on TTL ≤24h or policy update

---

### 2.10 Transparency Log

**Marketplace** (SHOULD):

- Record signatures in public transparency log (e.g., Sigstore Rekor)
- Enables tamper detection and audit trail

**Air-gapped Deployments** (MUST):

- Ship Cosign bundle (signature + certificate + inclusion proof)
- Engine verifies offline using bundled Sigstore trust materials (Fulcio roots, Rekor public key)

---

## 3. Non-normative Guidance

**All non-normative content** (rationale, examples, implementation notes, workflows, checklists, compliance references) has been moved to a separate document for clarity and stability:

**→ [PLUGIN_PROVENANCE_POLICY.APPENDICES.md](PLUGIN_PROVENANCE_POLICY.APPENDICES.md)**

This separation enables:

- **Stable normative core**: Requirements change rarely; implementations can rely on stable contract
- **Evolving guidance**: Implementation patterns and tooling can update without affecting normative compliance
- **Clear scope**: CI/compliance tools validate against compact normative document only

---

## Change Log

### Version 1.4 - 2026-02-12

**Physical separation of normative core from non-normative guidance:**

1. **Created separate appendices document**: [PLUGIN_PROVENANCE_POLICY.APPENDICES.md](PLUGIN_PROVENANCE_POLICY.APPENDICES.md)
   - All Section 3 content (Appendices A-F) moved to dedicated file
   - Includes: Rationale, Examples, Implementation Notes, Workflows, Checklists, Compliance References
   - Status: Non-normative (Informative)

2. **Benefits of separation**:
   - **Stability**: Normative core rarely changes; appendices can evolve with tooling/patterns
   - **Clarity**: Implementers read focused ~270-line normative contract without distraction
   - **CI/Testability**: Compliance tools validate against stable, compact normative document
   - **Independent versioning**: Appendices can update examples/tooling without bumping normative version

**Normative content unchanged**: All MUST/SHOULD/MAY requirements remain identical to v1.3. This is purely a documentation structure improvement.

---

### Version 1.3 - 2026-02-12

**Precision improvements for machine-checkable contracts (6 focused adjustments):**

**Precision improvements for machine-checkable contracts (6 focused adjustments):**

1. **Canonical reasonCode set** (Section 2.1 + Appendix E):
   - Expanded from 6 to 10 codes: `UNSIGNED`, `UNTRUSTED_SIGNER`, `DIGEST_MISMATCH`, `INVALID_MANIFEST`, `UNSUPPORTED_API_VERSION`, `MISSING_SBOM`, `INVALID_SBOM`, `REVOKED`, `CRITICAL_CVE`, `PROHIBITED_DEPENDENCY`
   - Consistent usage across VerificationResult interface and enforcement checklist
   - Enables automated compliance validation

2. **Timestamp binding specificity** (Section 2.1):
   - Clarified timestamp derivation per signature scheme:
     - Sigstore: Rekor inclusion proof time (when available) OR bundle timestamp attestation
     - GPG/PKI: Trusted CI attestation timestamp OR RFC3161 TSA (when configured)
   - Prevents ambiguity in multi-scheme deployments
   - References: [Rekor](https://docs.sigstore.dev/rekor/overview/), [Cosign](https://docs.sigstore.dev/cosign/overview/), RFC3161

3. **Trust root exact match support** (Section 2.2):
   - Added `subjectExact` field (mutually exclusive with `subjectPattern`)
   - Enables deployments without RE2 to use exact string matching instead of regex
   - Multi-tenant SaaS MUST use RE2 if `subjectPattern` enabled; otherwise fall back to `subjectExact`
   - Resolves contradiction between "MUST support subjectPattern" and "disable regex if no RE2"
   - References: [RE2](https://github.com/google/re2), [OWASP ReDoS](https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS)

4. **SBOM external signature binding** (Section 2.6):
   - Added normative rule: "External SBOM signature MUST bind SBOM digest to the same signer identity policy OR to an explicitly configured SBOM trust root"
   - Prevents SBOM signature bypass attacks (e.g., signed by untrusted party)
   - References: [CycloneDX](https://cyclonedx.org/specification/overview/), [SPDX](https://spdx.dev/specifications/)

5. **Deployment scope convention** (Section 1):
   - Added explicit convention: "Marketplace" requirements apply only to official marketplace; self-hosted MAY omit unless Tier policy requires
   - Prevents misinterpretation that all MUST requirements apply to all deployment modes
   - Clarifies vulnerability scanning, revocation feed, transparency log as marketplace-specific

6. **Invocation time digest clarification** (Section 2.1):
   - Changed "Invocation time: See Trust Tier Matrix" to "Digest verification MUST (all tiers); full signature re-verification tier/config-dependent"
   - Aligns Section 2.1 with Trust Tier Matrix (Section 2.9) for consistency
   - Emphasizes that digest verification is non-negotiable across all tiers

**Impact**: These adjustments improve contract precision and testability without expanding normative surface. All changes maintain backward compatibility with v1.2 implementations.

**References**:

- [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) - Normative keywords
- [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174) - Ambiguity of RFC 2119 keywords

---

### Version 1.2 - 2026-02-12

**Restructured for normative clarity per RFC 2119/8174 guidance:**

1. **Separated normative core from non-normative appendices**:
   - Normative Requirements (Section 2): Only MUST/SHOULD/MAY rules, inputs/outputs, invariants, tier matrix (3 pages)
   - Non-normative Appendices (Section 3): Rationale, examples, implementation notes, workflows, checklists, compliance references

2. **Compacted normative surface**:
   - Removed embedded explanations, examples, and tooling specifics from requirements
   - Focused on testable contracts (VerificationResult, CatalogIntegrityProof interfaces)
   - Clear rejection criteria with stable reasonCodes

3. **Improved stability**:
   - Normative rules independent of specific tool versions (Trivy, npm audit)
   - Implementation patterns moved to appendices (can evolve without breaking contract)
   - Tier matrix remains stable anchor for enforcement

4. **Enhanced testability**:
   - All MUST/SHOULD statements map to testable outcomes
   - Structured interfaces for verification results and catalog integrity
   - Checklist format in Appendix E for CI validation

**Rationale**: Large normative documents with embedded explanations, tool versioning, and operational details become brittle and hard to test. Separating "what MUST be done" (normative) from "why and how" (non-normative) creates stable, implementable contracts per RFC 2119 best practices.

### Version 1.1 - 2026-02-12

[Previous changelog content from v1.1]

---

_Last updated: 2026-02-12_  
_Version: 1.4_  
_Status: Normative (core requirements only; non-normative guidance in [APPENDICES.md](PLUGIN_PROVENANCE_POLICY.APPENDICES.md))_
