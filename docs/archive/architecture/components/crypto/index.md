---
title: @dvt/crypto
status: Draft
owner: Shared Boundary Domain
last_reviewed: 2026-03-15
---

# @dvt/crypto

## Component Map

```mermaid
flowchart LR
  crypto[@dvt/crypto]
  contracts[@dvt/contracts]
  engine[@dvt/engine]
  crypto --> contracts
  crypto --> engine
```

## Location

- packages/@dvt/crypto

## Domain

- [Shared Boundary Domain](../domain-shared.md)

## Main Responsibilities

- Cryptographic operations
- Root: CryptoAggregate (central crypto model)
- Aggregates: KeyAggregate, HashAggregate
- Ensures secure operations, key and hash management

## Explanation

@dvt/crypto is responsible for cryptographic operations and utilities:

- **Root:** [CryptoAggregate](crypto.md#cryptoaggregate) — represents the central crypto model, owning key and hash management.
- **Aggregates:** [KeyAggregate](crypto.md#keyaggregate), [HashAggregate](crypto.md#hashaggregate).
- **Responsibilities:**
  - Manage cryptographic keys and hashes.
  - Provide secure operations for contracts and engine.
  - Report crypto status to shared boundary.

**Interactions:**

- **[Contracts](contracts.md):** Uses crypto operations for validation.
- **[Engine](engine.md):** Uses crypto for secure workflow execution.

Crypto coordinates these interactions to ensure secure operations and key/hash management.

## CryptoAggregate

Represents the central crypto model, owning key and hash management. Responsible for:

- Managing cryptographic keys
- Managing hash operations
- Reporting crypto status

## KeyAggregate

Represents key management for crypto. Responsible for:

- Storing cryptographic keys
- Managing key operations
- Reporting key status

## HashAggregate

Represents hash management for crypto. Responsible for:

- Storing hash values
- Managing hash operations
- Reporting hash status

## Restrictions

- Must comply with cryptographic standards and contract governance
- Only interacts with Shared Boundary domain, contracts, and engine

## Related Documentation

- [Component Map](../component-map.md)
- [Shared Boundary Domain](../domain-shared.md)

## Detailed Documentation

- [DDD Structure](crypto-ddd.md)
- [Functionalities](crypto-functional.md)
- [Constraints & Invariants](crypto-constraints.md)
- [Sequence Diagrams](crypto-sequence.md)
