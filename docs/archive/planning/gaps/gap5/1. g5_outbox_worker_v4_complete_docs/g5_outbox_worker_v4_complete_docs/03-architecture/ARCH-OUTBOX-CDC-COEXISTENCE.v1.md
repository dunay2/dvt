---
title: ARCH-OUTBOX-CDC-COEXISTENCE v1
status: Draft
owner: architecture
last_reviewed: 2026-03-08
---

# ARCH-OUTBOX-CDC-COEXISTENCE v1

## 1. Scope

This document explains how CDC relates to the polling worker family and how
migration can happen without unsafe dual-active behavior.

## 2. Architectural truth

CDC is a **different delivery family**.

Polling uses:

- explicit record claims,
- explicit lane claims,
- explicit writeback to delivery state.

CDC uses:

- database change capture,
- downstream topic routing,
- consumer-group semantics outside the polling store contract.

Therefore the continuity boundary is not `IOutboxStorePolling`.  
The continuity boundary is the **outbox write shape** and **topic semantics**.

## 3. Stable write shape required for future CDC

The enqueue path must keep these columns stable enough for CDC use:

- `id`
- `tenant_id`
- `topic`
- `event_type`
- `payload`
- `headers`
- `created_at`

Polling-only fields such as `claim_owner`, `claimed_until`, `delivery_state`,
and lane lease metadata are not the CDC continuity boundary.

## 4. Coexistence rule

For a given `(environment, topic)` pair, exactly one of these may be
**production-active**:

- `polling`
- `cdc`

A second mechanism may exist only in **shadow mode**.

## 5. Shadow mode patterns

### 5.1 CDC shadow while polling remains live

Recommended pattern:

- polling remains the production side effect path,
- Debezium/CDC reads the same outbox table,
- CDC output is routed to a **shadow topic** or a **shadow consumer group**,
- counts, latency, schema conformance, and message keys are compared,
- CDC does not trigger the production subscriber side effect.

### 5.2 Polling shadow while CDC is live

Less likely for G5, but symmetrical:

- CDC is live,
- polling may read only canary topics or a shadow topic subset,
- polling does not invoke production subscribers for live-owned topics.

## 6. Why dual-active is rejected

If polling and CDC both perform the production side effect for the same topic,
duplicate delivery is guaranteed sooner or later. Since both families are
at-least-once by nature, dual-active makes duplication structurally expected.

That is rejected.

## 7. Topic ownership registry

Introduce explicit configuration:

```ts
export type DeliveryFamily = 'polling' | 'cdc';

export interface TopicDeliveryMode {
  readonly topic: OutboxTopic;
  readonly deliveryFamily: DeliveryFamily;
  readonly shadowFamily: DeliveryFamily | null;
}
```

This configuration is environment-scoped and must be visible to operators.

## 8. Migration sequence from polling to CDC

1. keep polling live for the target topic,
2. enable CDC in shadow for the same write shape,
3. compare:
   - message count,
   - ordering key preservation,
   - idempotency key preservation,
   - schema version preservation,
   - end-to-end lag,
4. cut traffic by flipping `deliveryFamily` for the topic,
5. keep old family disabled for that topic,
6. observe,
7. remove shadow once stable.

## 9. Constraint

Internal subscribers that depend on direct in-process invocation may remain on
polling permanently. CDC is not mandatory for all topics.
