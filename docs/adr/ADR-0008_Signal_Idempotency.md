# ADR-0008: Signal Idempotency Key Derivation

- **Status**: Proposed (Hardened)
- **Date**: 2026-02-21
- **Owners**: Engine Domain
- **Related**:
  - ADR-0007: Run Cancellation Semantics (cross-references this ADR for signal-based cancel)
  - ADR-0004: Event Sourcing Strategy
  - RunEvents.v2.0.1.md (envelope split — tenantId excluded from derivation)

---

## Context

Signals are used to send out-of-band instructions to running workflows
(PAUSE, RESUME, CANCEL, RETRY_STEP, RETRY_RUN).

Without a deterministic idempotency key:

- Duplicate signal deliveries may trigger duplicate state transitions.
- Adapters may apply the same signal multiple times across retries.
- No cross-adapter consistency guarantee for signal processing.

The key MUST be deterministic from the signal's logical identity, not
from infrastructure-level identifiers (message IDs, delivery timestamps).

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
- INV-SIGNAL-004: tenantId MUST NOT influence hash

## Documents to Update (Normative Impact)

1. **`packages/@dvt/engine/src/core/idempotency.ts`**
   - Replace `signalKey` implementation: current plain-string join including `tenantId`
     is non-compliant. MUST use SHA256 with the formula above, excluding `tenantId`.

## Required Tests (mandatory CI)

- `test/idempotency/signal-idempotency-golden.test.ts`
  - MUST verify all three golden vectors exactly.
  - A failing golden test indicates the formula was changed without an ADR update.
- `test/idempotency/signal-tenant-id-excluded.test.ts`
  - Two signals differing only in tenantId MUST produce the same hash.
- `test/idempotency/signal-schema-version-excluded.test.ts`
  - Two signals differing only in schemaVersion MUST produce the same hash.

---

End of ADR-0008
