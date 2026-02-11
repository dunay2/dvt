# AuditLog.v1.md - Audit Log Contract

**Version**: 1.0  
**Status**: NORMATIVE (Required Contract)  
**Phase**: Phase 1 (documentation), Phase 3 (implementation)  

---

## Purpose

Define what events must be audited, the audit log schema, retention policy, and compliance requirements.

**Invariant**: Every authorization decision, state mutation, and API call is logged (append-only, tamper-proof).

---

## Audit Event Types

| Event Type | When | Who | Required |
|-----------|------|-----|----------|
| `AUTH_DECISION` | Authorization check (grant or deny) | IAuthorization | ✅ Phase 1 |
| `STATE_MUTATION` | Plan/run state changes | Engine (via RunEventCatalog) | ✅ Phase 1 |
| `SIGNAL_SENT` | PAUSE, RESUME, CANCEL, custom signals | Engine | ✅ Phase 1 |
| `API_CALL` | API request/response | API gateway | ✅ Phase 2 |
| `PLUGIN_INVOKED` | Plugin code execution starts/ends | Plugin runtime | ⏳ Phase 3 |
| `ARTIFACT_ACCESSED` | Read/write artifact data | Engine | ⏳ Phase 2 |
| `CONFIG_CHANGED` | Tenant config, RBAC role assignment | Admin API | ⏳ Phase 4 |
| `BACKPRESSURE_SIGNAL` | BACKPRESSURE_ON/OFF emitted | Engine (Outbox) | ⏳ Phase 1.5 |

---

## Audit Log Schema

```json
{
  "auditId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-02-11T10:30:45.123Z",
  "tenantId": "tenant-abc",
  
  "actor": {
    "id": "user-123",
    "type": "user" | "service-account" | "system",
    "email": "user@example.com"
  },
  
  "action": "RUN_START" | "STATE_MUTATION" | "SIGNAL_SENT" | ...,
  
  "resource": {
    "type": "plan" | "run" | "artifact" | "plugin" | "config",
    "id": "plan-abc" | "run-xyz",
    "name": "My Workflow Plan"  // Human-readable name
  },
  
  "decision": "GRANTED" | "DENIED" | "COMPLETED" | "FAILED",
  
  "reason": {
    "code": "RBAC_POLICY_DENIED",  // Machine-readable
    "message": "User lacks operator role"  // Human-readable
  },
  
  "context": {
    "ip": "203.0.113.45",
    "userAgent": "Mozilla/5.0...",
    "requestId": "req-7890",
    "sessionId": "sess-1234",  // For tracking user sessions
    "sourceModule": "api-gateway" | "engine" | "plugin-runtime"
  },
  
  "details": {
    // Event-specific fields
    "previous_state": { ... },     // For STATE_MUTATION
    "new_state": { ... },          // For STATE_MUTATION
    "signal_type": "PAUSE",        // For SIGNAL_SENT
    "plugin_name": "send-email",   // For PLUGIN_INVOKED
    "artifact_size_bytes": 2048    // For ARTIFACT_ACCESSED
  },
  
  "metadata": {
    "record_version": "1.0",
    "signature": "hmac-sha256:abc123...",  // For tamper detection
    "encrypted": true  // If PII is redacted/encrypted
  }
}
```

---

## Audit Log Guarantees

### G1: Append-Only Storage
- **Never** delete or modify existing audit events
- New events always appended to the end
- Storage: immutable log stream (kafka topic, S3 append-only bucket, database log table)

```sql
-- ✅ GOOD - Append-only table
CREATE TABLE audit_log (
  audit_id UUID PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  tenant_id UUID NOT NULL,
  event_data JSONB NOT NULL,
  
  -- Prevent UPDATEs and DELETEs
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER prevent_audit_modifications
BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW EXECUTE FUNCTION raise_immutability_error();
```

### G2: Cryptographic Integrity
- Each audit event signed with HMAC(secret, event_data)
- Verify signature when reading audit log
- Detects tampering (missing events, modified data)

```typescript
function signEvent(event: AuditEvent, secret: string): string {
  const data = JSON.stringify(event);
  return crypto.createHmac('sha256', secret)
    .update(data)
    .digest('hex');
}

function verifyEvent(event: AuditEvent, signature: string, secret: string): boolean {
  const computed = signEvent(event, secret);
  return crypto.timingSafeEqual(computed, signature);
}
```

### G3: Complete Audit Trail
- Every authorization decision logged (grant AND deny)
- No gaps in sequence (events have sequential id or monotonic timestamp)
- All mutations tracked with before/after state

### G4: Tamper Evidence
- Detect if event was added, deleted, or modified
- Alert on signature mismatch
- Immutable storage prevents deletion

---

## Retention Policy

### Hot Storage (0-90 days)
- **Purpose**: Fast queries, real-time alerts
- **Storage**: Primary database (PostgreSQL, MongoDB)
- **Query patterns**: "Show my actions in last 7 days"
- **Accessible**: Full team (with RBAC)

### Warm Storage (90 days - 2 years)
- **Purpose**: Compliance investigation, audit, trend analysis
- **Storage**: Archive database or data warehouse (slower, cheaper)
- **Query patterns**: "Show all access to plan X in last year"
- **Accessible**: Compliance/audit team only

### Cold Storage (2-7 years)
- **Purpose**: Long-term compliance (SOC2, HIPAA, GDPR)
- **Storage**: Immutable archive (S3, Azure Blob, GCS) with Object Lock
- **Query patterns**: Rare (subpoena, audit)
- **Accessible**: Restricted to compliance team + senior leadership

### Deletion Policy
- **GDPR Right to be Forgotten**: Delete user's data + related audit events (subject to retention)
- **SOC2**: Retain for 7 years after deletion
- **HIPAA**: Retain for 6 years; can also retain indefinitely for audit
- **Implementation**: Use soft-delete flag (mark deleted, keep for 7 years, then hard-delete)

```sql
-- Soft-delete user data
UPDATE audit_log
SET is_deleted = true, deletion_reason = 'GDPR_RTF'
WHERE actor_id = 'user-123'
  AND is_deleted = false
  AND timestamp < NOW() - INTERVAL '7 years';

-- Hard-delete after 7-year grace period (separate batch job)
DELETE FROM audit_log
WHERE is_deleted = true
  AND deletion_time < NOW() - INTERVAL '7 years';
```

---

## Compliance Requirements

### SOC2 Type II
- **CC6.1**: Logical access control - log all access to sensitive data
- **CC6.2**: Prior to issuing system security credentials, perform...
- **CC7.2**: Monitor system components for anomalies - detect unauthorized access attempts (DENIED decisions)

**Implementation**:
- Log all AUTH_DECISION events (grant + deny)
- Log all STATE_MUTATION events (plan changes, run starts)
- Retention: 1 year hot, 6 years cold
- Monthly audit reports: "Summary of access denials"

### HIPAA
- **164.308(a)(5)(ii)(A)**: Implement methods and procedures to ensure that audit controls work...
- **164.312(b)**: Implement policies and procedures to record and examine PHI access

**Implementation**:
- Log all read/write of PHI-containing artifacts
- PHI audit events encrypted at rest, redacted in logs
- Retention: 6 years
- Query capability: "Show all access to patient record XYZ"

### GDPR
- **Article 5(1)(f)**: Data subjects have rights regarding their personal data
- **Article 17**: Right to erasure ("right to be forgotten")
- **Article 7(3)**: Withdrawal of consent

**Implementation**:
- Audit events marked with data type (PII, PHI, financial, etc.)
- Right to be Forgotten: soft-delete user events, hard-delete after 7 years
- Right to Access: user can query their own audit events
- Purpose limitation: only audit for stated purposes (not secondary use)

---

## Query Patterns

### Q1: User Activity (for fraud detection)
```sql
SELECT * FROM audit_log
WHERE actor_id = 'user-123'
  AND timestamp > NOW() - INTERVAL '30 days'
ORDER BY timestamp DESC;
-- Returns: All actions by user in last 30 days
```

### Q2: Resource Access (for breach investigation)
```sql
SELECT * FROM audit_log
WHERE resource_type = 'plan'
  AND resource_id = 'plan-abc'
  AND tenant_id = 'tenant-1'
ORDER BY timestamp DESC;
-- Returns: Who accessed plan-abc and when
```

### Q3: Authorization Denials (for security monitoring)
```sql
SELECT * FROM audit_log
WHERE decision = 'DENIED'
  AND tenant_id = 'tenant-1'
  AND timestamp > NOW() - INTERVAL '7 days'
ORDER BY timestamp DESC;
-- Returns: All failed authorization attempts (brute force detection)
```

### Q4: PHI/Sensitive Data Access (for compliance audit)
```sql
SELECT * FROM audit_log
WHERE details->>'is_phi' = 'true'
  AND timestamp > NOW() - INTERVAL '1 year'
ORDER BY timestamp DESC;
-- Returns: All access to protected health information
```

### Q5: Audit Event Integrity Check (for tamper detection)
```sql
SELECT COUNT(*) as breaches
FROM audit_log
WHERE signature != HMAC_SHA256(event_data, secret)
  AND timestamp > NOW() - INTERVAL '30 days';
-- Returns: Number of tampered events (should be 0)
```

---

## Implementation Requirements (Phase 3)

1. **Must implement append-only storage**
   - No UPDATEs or DELETEs on existing events
   - Prevention: database triggers or immutable storage

2. **Must implement HMAC signing**
   - Sign each event before persist
   - Verify signature when reading

3. **Must implement retention policy**
   - Move events from hot → warm → cold automatically
   - Implement soft-delete for GDPR compliance

4. **Must be queryable**
   - Index on: actor_id, resource_id, timestamp, decision
   - Support Q1-Q5 query patterns above

5. **Must be integrated with authorization**
   - IAuthorization.auditAuthDecision() populates this log
   - Every auth check → audit event

---

## Event Examples

### Example 1: Authorization Granted
```json
{
  "auditId": "550e8400-e29b-41d4-a716-446655440001",
  "timestamp": "2026-02-11T10:30:45.123Z",
  "tenantId": "tenant-abc",
  "actor": {
    "id": "user-123",
    "type": "user",
    "email": "alice@company.com"
  },
  "action": "RUN_START",
  "resource": {
    "type": "plan",
    "id": "plan-abc",
    "name": "Daily data sync"
  },
  "decision": "GRANTED",
  "context": {
    "ip": "203.0.113.45",
    "requestId": "req-7890",
    "sourceModule": "api-gateway"
  }
}
```

### Example 2: Authorization Denied (Insufficient Permissions)
```json
{
  "auditId": "550e8400-e29b-41d4-a716-446655440002",
  "timestamp": "2026-02-11T10:31:12.456Z",
  "tenantId": "tenant-abc",
  "actor": {
    "id": "user-456",
    "type": "user",
    "email": "bob@company.com"
  },
  "action": "PLAN_DELETE",
  "resource": {
    "type": "plan",
    "id": "plan-abc",
    "name": "Daily data sync"
  },
  "decision": "DENIED",
  "reason": {
    "code": "RBAC_POLICY_DENIED",
    "message": "User role 'viewer' lacks permission for PLAN_DELETE"
  },
  "context": {
    "ip": "203.0.113.46",
    "requestId": "req-7891",
    "sourceModule": "api-gateway"
  }
}
```

### Example 3: State Mutation (Run Started)
```json
{
  "auditId": "550e8400-e29b-41d4-a716-446655440003",
  "timestamp": "2026-02-11T10:32:00.789Z",
  "tenantId": "tenant-abc",
  "actor": {
    "id": "engine-system",
    "type": "system"
  },
  "action": "STATE_MUTATION",
  "resource": {
    "type": "run",
    "id": "run-xyz",
    "name": "Daily data sync - 2026-02-11"
  },
  "decision": "COMPLETED",
  "context": {
    "sourceModule": "engine"
  },
  "details": {
    "mutation_type": "RUN_STARTED",
    "previous_state": { "status": "PENDING", "startedAt": null },
    "new_state": { "status": "RUNNING", "startedAt": "2026-02-11T10:32:00Z" }
  }
}
```

---

## References

- [THREAT_MODEL.md](../THREAT_MODEL.md) - Threat scenarios (T4: audit tampering)
- [IAuthorization.v1.md](IAuthorization.v1.md) - Auth decision source
- [ExecutionSemantics.v1.md](../../../contracts/engine/ExecutionSemantics.v1.md) - State mutation source
- SOC2 Trust Services Criteria: https://www.aicpa.org/interestareas/informationsystemssecurity/pages/trust-services-criteria.aspx
- HIPAA Security Rule: https://www.hhs.gov/hipaa/for-professionals/security/index.html
- GDPR Article 5: https://gdpr-info.eu/art-5-gdpr/

---

_Last updated: 2026-02-11_
