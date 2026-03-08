---
title: SPEC-OUTBOX-TYPES-POLICY v1
status: Draft
owner: architecture
last_reviewed: 2026-03-08
---

# SPEC-OUTBOX-TYPES-POLICY v1

## 1. Problem

Previous drafts risked overusing branded types for simple identifiers
(`TenantId`, `RunId`, `OutboxMessageId`, etc.). In practice, that often leads to:

- noisy constructor code,
- adapter friction,
- `as any` escape hatches,
- type ceremony that does not materially improve correctness in this package.

## 2. Decision

The outbox worker package will use **simple string aliases** for identifiers in
its internal contracts.

```ts
export type TenantId = string;
export type RunId = string;
export type OutboxMessageId = string;
export type WorkerId = string;
```

## 3. Boundary rule

If other packages expose stronger nominal/branded identifier types, adapters may
map them into these aliases at the boundary.

The worker package itself must not introduce new branded identifier types.

## 4. Exception

If a future correctness issue proves that a specific identifier requires a
stronger representation, that must be justified in a separate ADR or contract
revision with concrete evidence.

## 5. Rationale

This package is coordination-heavy and IO-heavy. Most of its correctness comes
from:

- deterministic store updates,
- strict result unions,
- topic registration,
- idempotency discipline,
- integration tests,

not from nominal branding of strings.

## 6. Prohibited practice

The worker package must not rely on `as any` to bridge identifier mismatches.
Boundary mappers must be explicit.
