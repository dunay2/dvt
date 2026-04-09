---
title: crypto Sequence
status: Draft
owner: Shared Boundary Domain
last_reviewed: 2026-03-28
---

# crypto Sequence

## Main Flow: Computing and Caching a SHA-256 Hash for CompiledCodeRef

```mermaid
sequenceDiagram
  participant Engine as @dvt/engine
  participant Crypto as CryptoAggregate
  participant Hash as HashAggregate
  participant Cache as LRU Cache
  participant NodeCrypto as node:crypto

  Engine->>Crypto: computeHash(artifactBuffer)
  Crypto->>Hash: manageHashOperations(artifactBuffer)
  Hash->>Cache: get(artifactKey)
  alt Cache hit
    Cache-->>Hash: cachedDigest
    Hash-->>Crypto: cachedDigest
  else Cache miss
    Cache-->>Hash: undefined
    Hash->>NodeCrypto: createHash("sha256").update(buffer).digest("hex")
    NodeCrypto-->>Hash: hexDigest
    Hash->>Cache: set(artifactKey, hexDigest)
    Hash-->>Crypto: hexDigest
  end
  Crypto-->>Engine: hexDigest
```

## Global Flow Position

`@dvt/crypto` sits in the Shared Boundary Domain alongside `@dvt/contracts`. It is called by `@dvt/engine` when computing `CompiledCodeRef` SHA-256 digests and by `@dvt/contracts` for payload integrity operations. It does not call any other DVT package at runtime; its only runtime dependency is `node:crypto` and the `lru-cache` library. Upstream callers: `@dvt/engine` and `@dvt/contracts`. Downstream: Node.js standard library only.

## Key Files

- `packages/@dvt/crypto/src/CryptoAggregate.ts`
- `packages/@dvt/crypto/src/KeyAggregate.ts`
- `packages/@dvt/crypto/src/HashAggregate.ts`
