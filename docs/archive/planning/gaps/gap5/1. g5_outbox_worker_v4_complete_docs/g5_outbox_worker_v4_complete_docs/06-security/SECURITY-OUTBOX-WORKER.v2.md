---
title: SECURITY-OUTBOX-WORKER v2
status: Draft
owner: architecture
last_reviewed: 2026-03-08
---

# SECURITY-OUTBOX-WORKER v2

## 1. Security position

Security is handled through adapters, host configuration, and least-privilege
roles. It is not delegated to vague runtime assumptions.

## 2. Worker identity

The standalone worker must run with its own service identity, separate from:

- API process identity,
- planner identity,
- UI identity.

## 3. PostgreSQL access

The worker requires a dedicated database role with only the privileges needed to:

- claim eligible outbox rows,
- update delivery state,
- manage lane leases,
- read lag snapshots.

It must not own broader schema administration rights.

## 4. Secret sources

Secrets may come from:

- environment variables injected by the platform,
- a secrets manager adapter,
- workload identity plus short-lived database credentials.

The worker package does not hardcode secret storage. The host wiring does.

## 5. Rotation

Credential rotation is an operational requirement. The worker host should support
restart-safe rotation through platform rollout or reload, depending on the
deployment model.

## 6. Subscriber authentication

If a subscriber calls an external system, that authentication belongs to the
subscriber adapter, not to the core worker classes.

Examples:

- Kafka client credentials,
- HTTP bearer tokens,
- database credentials for projector targets.

## 7. Logging constraints

Do not log:

- raw secrets,
- full payload bodies by default,
- sensitive headers unless explicitly redacted and approved.

## 8. Network policy

The standalone worker should have outbound access only to:

- PostgreSQL,
- required telemetry endpoints,
- explicit subscriber targets.

## 9. Multi-tenant rule

Every outbox claim and writeback must preserve `tenantId`. A subscriber must not
drop tenant scoping when performing the side effect.

## 10. Security tests

At minimum verify:

- wrong DB credentials fail fast,
- missing secret wiring produces startup failure,
- sensitive configuration is not exposed in logs,
- topic registration cannot be widened by untrusted runtime input.
