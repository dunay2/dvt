---
title: QUALITY G5 — Crash Hook Safety Addendum
status: Draft
owner: docs
last_reviewed: 2026-03-08
---

# QUALITY G5 — Crash Hook Safety Addendum

## 1. Goal

Prevent accidental or malicious activation of crash-window hooks in production.

## 2. Required safeguards

- Production composition roots must bind `NoopCrashWindowTestHook` only.
- Test harnesses may bind a non-noop implementation.
- Runtime code must not expose HTTP, CLI, or config toggles that swap the hook dynamically.
- A startup invariant test must fail if `NODE_ENV=production` and the bound hook is not noop.

## 3. Example invariant test

```ts
it('rejects non-noop crash hook in production host', () => {
  process.env.NODE_ENV = 'production';

  expect(() =>
    createHost({
      crashWindowTestHook: new ThrowingCrashHook(),
    }),
  ).toThrow(/crash hook is not allowed in production/i);
});
```
