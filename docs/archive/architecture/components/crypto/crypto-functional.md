---
title: crypto Functionalities
status: Draft
owner: Shared Boundary Domain
last_reviewed: 2026-03-28
---

# crypto Functionalities

## Functionalities

| #   | Functionality                | Description                                                                                                                                                           |
| --- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | SHA-256 Hash Computation     | Computes SHA-256 digests of arbitrary byte buffers, used primarily for `CompiledCodeRef` integrity verification.                                                      |
| 2   | Cryptographic Key Management | Generates, stores, rotates, and revokes cryptographic keys used for signing and verification operations across the system.                                            |
| 3   | Hash Verification            | Compares a provided hash value against a recomputed digest to verify data integrity.                                                                                  |
| 4   | Secure Operation Provision   | Provides a stable API surface that `@dvt/contracts` and `@dvt/engine` consume for all cryptographic needs, avoiding direct use of `node:crypto` outside this package. |
| 5   | LRU-Cached Hash Lookups      | Caches recently computed hash values using an LRU cache to avoid redundant recomputation of frequently accessed artifacts.                                            |

## Main Methods

- `manageKeys(): Promise<void>`: Initialises the key management lifecycle, loading or generating keys as required.
- `manageHashes(): void`: Initialises the hash management subsystem, including the LRU cache configuration.
- `computeHash(buffer: Buffer): string`: Computes and returns the hex-encoded SHA-256 digest of the supplied buffer.
- `verifyHash(buffer: Buffer, expected: string): boolean`: Recomputes the SHA-256 digest of `buffer` and compares it to `expected`; returns `true` if they match.
- `storeKey(key: CryptoKey): Promise<void>`: Persists a cryptographic key in the key aggregate store.
- `reportCryptoStatus(): CryptoStatus`: Returns the current operational status of the crypto subsystem, including key availability and cache health.

## Key Files

- `packages/@dvt/crypto/src/CryptoAggregate.ts`
- `packages/@dvt/crypto/src/KeyAggregate.ts`
- `packages/@dvt/crypto/src/HashAggregate.ts`
