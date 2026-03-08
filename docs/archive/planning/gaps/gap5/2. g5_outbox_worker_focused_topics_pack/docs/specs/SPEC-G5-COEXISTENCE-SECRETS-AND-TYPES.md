---
title: Spec — G5 Coexistence, Secrets, and Naming
status: Draft
owner: docs
last_reviewed: 2026-03-08
---

# Spec — G5 Coexistence, Secrets, and Naming

## 1. Purpose

This specification defines:

- coexistence rules for polling and CDC,
- the secret/config boundary,
- naming rules for G5 documents and code.

---

## 2. Coexistence model

### 2.1 Runtime families

G5 recognizes two runtime families:

- **polling worker runtime**
- **CDC relay/runtime**

These are different runtime families and do not need a shared execution core.

### 2.2 Delivery dimensions

A delivery configuration is identified by:

- `environment`
- `topic`
- `deliveryChannel`
- `sideEffectClass`

```ts
export type DeliveryChannel =
  | 'internal_projection'
  | 'external_publication'
  | 'internal_callback'
  | 'integration_webhook';

export type SideEffectClass =
  | 'state_projection'
  | 'event_bus_publish'
  | 'webhook_delivery'
  | 'materialized_cache_update';
```

### 2.3 Ownership rule

Exactly one production-active owner may exist for the same
`(environment, topic, deliveryChannel, sideEffectClass)` tuple.

### 2.4 Allowed coexistence examples

#### Allowed

| Topic               | Mechanism | Delivery channel     | Side effect       |
| ------------------- | --------- | -------------------- | ----------------- |
| workflow.run.events | polling   | internal_projection  | state_projection  |
| workflow.run.events | CDC       | external_publication | event_bus_publish |

#### Not allowed

| Topic               | Mechanism | Delivery channel     | Side effect       |
| ------------------- | --------- | -------------------- | ----------------- |
| workflow.run.events | polling   | external_publication | event_bus_publish |
| workflow.run.events | CDC       | external_publication | event_bus_publish |

### 2.5 Shadow mode

A mechanism may run in shadow mode when:

- it does not own the side effect,
- it emits only logs, metrics, or comparisons,
- it cannot mutate the target system of record.

---

## 3. Secret boundary

### 3.1 Principle

Secrets are resolved outside the worker core.

### 3.2 Host responsibilities

The host must:

- resolve secrets from the selected source,
- instantiate authenticated adapters,
- sanitize all configuration before logging,
- pass only runtime-safe configuration into the worker.

### 3.3 Worker responsibilities

The worker must:

- accept only ready-to-use ports/adapters,
- avoid logging credentials or secret-bearing strings,
- treat secret retrieval as out of scope.

### 3.4 Dependency shape

```ts
export interface OutboxWorkerHostConfig {
  readonly pollIntervalMs: number;
  readonly maxBatchSize: number;
  readonly orderedModeEnabled: boolean;
}

export interface OutboxWorkerHostDependencies {
  readonly store: IOutboxStore;
  readonly subscriberRegistry: IOutboxSubscriberRegistry;
  readonly telemetry: IOutboxTelemetry;
  readonly logger: ILogger;
  readonly clock: IClock;
}
```

No `SecretProvider` is required in the core package for G5.x.

### 3.5 Redaction rules

The host must redact:

- passwords,
- tokens,
- DSNs with inline credentials,
- private keys,
- secret manager payloads.

Allowed in logs:

- database hostnames without credentials,
- logical secret identifiers,
- adapter names,
- deployment environment.

---

## 4. Naming rules

### 4.1 Canonical vocabulary

Use these names consistently:

- outbox record
- claimed outbox record
- outbox record id
- delivery attempt
- lane lease
- delivery policy
- retry schedule

### 4.2 Forbidden synonyms in this area

Avoid:

- outbox message
- queue item
- event row
- message row

### 4.3 Rationale

This package is about delivery of persisted outbox records.
Using one vocabulary reduces design drift and review noise.
