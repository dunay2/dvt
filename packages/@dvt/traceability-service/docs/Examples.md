# Examples

## Example header (governed artifact)

```ts
/**
 * @file packages/@dvt/contracts/src/idempotency/key-builder.ts
 * @baseline ADR-0010: Run Event Envelope Split
 * @decision Section 3.3 — Idempotency derivation rules
 * @decision Section 3.4 — Canonical serialization
 * @consequence Engine retries do not alter idempotency key
 * @version 1.0.0
 * @date 2026-02-21
 */
```

## Example test header

```ts
/**
 * @baseline ADR-0010
 * @verifies Section 3.3 — Idempotency excludes engineAttemptId
 * @verifies Section 3.4 — Canonical serialization
 */
```

## Canonical Neo4j relationship

```cypher
MERGE (a:ADR {number:"ADR-0010"})
MERGE (f:File {path:"packages/@dvt/contracts/src/idempotency/key-builder.ts"})
MERGE (f)-[:BASELINED_ON]->(a)
```

## “Implemented by” derived query

```cypher
MATCH (a:ADR {number:$adr})<-[:BASELINED_ON]-(f:File)
RETURN f.path;
```
