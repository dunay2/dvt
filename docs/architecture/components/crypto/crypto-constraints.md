---
title: crypto Constraints & Invariants
status: Draft
owner: Shared Boundary Domain
last_reviewed: 2026-03-28
---

# crypto Constraints & Invariants

## Constraints and Invariants

| Constraint / Invariant                                            | Where Enforced                            | Description                                                                                                                                                                       |
| ----------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Must comply with cryptographic standards and contract governance  | CryptoAggregate / ADR process             | All hash and key operations must use approved algorithms (SHA-256 via `node:crypto`); deviations require an ADR.                                                                  |
| Only interacts with Shared Boundary domain, contracts, and engine | Package boundary (`packages/@dvt/crypto`) | This package must not import from adapter or application packages; it may only depend on `@dvt/contracts` and standard Node.js crypto APIs.                                       |
| Hash values are immutable once computed and stored                | HashAggregate                             | A stored hash value for a given artifact must not be overwritten; re-computation must yield the same result or trigger a `HashVerificationFailed` event.                          |
| Key operations must be auditable                                  | KeyAggregate                              | Every key generation, rotation, and revocation event must be emitted so that key lifecycle changes can be traced.                                                                 |
| Fail-open on hash resolution failure                              | CryptoAggregate (`computedCodeRef` flow)  | If hash resolution fails (e.g., artifact unavailable), the calling component proceeds without the hash rather than blocking execution — the absence is recorded as a lineage gap. |
| LRU cache must not serve stale hashes after key rotation          | HashAggregate / LRU cache invalidation    | The hash cache must be invalidated or scoped to prevent serving cached digests that were computed with a now-rotated key.                                                         |

## Validation Examples

- Calling `verifyHash` with a tampered buffer returns `false` and triggers a `HashVerificationFailed` event, which the engine treats as a lineage integrity alert.
- Attempting to store a key with an unsupported algorithm type raises a `CryptoAlgorithmNotSupportedError` before any key material is persisted.
- A hash miss in the LRU cache triggers a fresh `computeHash` call; the result is cached for subsequent requests to the same artifact.

## Key Files

- `packages/@dvt/crypto/src/CryptoAggregate.ts`
- `packages/@dvt/crypto/src/KeyAggregate.ts`
- `packages/@dvt/crypto/src/HashAggregate.ts`
