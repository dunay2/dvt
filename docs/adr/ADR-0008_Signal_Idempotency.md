# ADR-0008: Signal Idempotency Key Derivation

- **Status**: Proposed (Hardened)
- **Date**: 2026-02-21
- **Owners**: Engine Domain

---

## Decision

Signal idempotency key MUST be derived as:

SHA256(
  runId + '|' +
  'SIGNAL' + '|' +
  signalType + '|' +
  signalId + '|' +
  logicalAttemptId + '|' +
  planId + '|' +
  planVersion +
  (stepId ? '|' + stepId : '')
)

### Notes

- `tenantId` is part of the event envelope and MUST NOT be included in idempotency derivation.
- `schemaVersion` MUST NOT influence the hash.
- All fields MUST be UTF-8 encoded exactly as provided (no trimming, normalization, or case changes).

### Golden Vectors

Implementations MUST match these SHA256 outputs exactly:

- `run-1|SIGNAL|CANCEL|sig-1|1|plan-abc|3`  
  → `f416e54fb621cf612b2e00ddc80b77427c7a4e9161477e0e3c0b87be8cf6968d`
- `run-42|SIGNAL|RETRY_STEP|sig-999|2|plan-sales|7|model.orders`  
  → `2378af3967a757ac180e92def46f181a813315290373d03a6d906ad26f2bfeb5`
- `run-prod|SIGNAL|PAUSE|sig-pause|1|plan-prod|12`  
  → `94fcc1967da2e5db233eb936e54bbf67645cc36947cdcfaf88ec487d5793d187`

---

## Invariants
- INV-SIGNAL-001: Same inputs → same hash
- INV-SIGNAL-002: Different signalId → different hash
- INV-SIGNAL-003: schemaVersion MUST NOT influence hash

---
End of ADR-0008
