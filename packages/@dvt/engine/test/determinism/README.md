# Determinism Enforcement

This directory contains determinism-related tests and documentation for the DVT engine.

## Overview

The DVT engine requires **deterministic execution** to guarantee workflow replay correctness.
The following APIs are **forbidden** inside `packages/@dvt/engine/src/` and `packages/@dvt/adapter-temporal/src/workflows/`:

| Forbidden API        | Reason                          | Alternative                      |
| -------------------- | ------------------------------- | -------------------------------- |
| `Date.now()`         | Non-deterministic timestamp     | Injected `IClock` interface      |
| `new Date()`         | Non-deterministic timestamp     | Injected `IClock` interface      |
| `Math.random()`      | Non-deterministic random number | Injected seeded RNG              |
| `process.env`        | Implicit external dependency    | Explicit configuration injection |
| `crypto.randomBytes` | Non-deterministic randomness    | Deterministic UUID generation    |

Additionally, inside **Temporal workflow files** (`packages/@dvt/adapter-temporal/src/workflows/`):

| Forbidden API                | Reason                       | Alternative             |
| ---------------------------- | ---------------------------- | ----------------------- |
| `setTimeout` / `setInterval` | Non-deterministic timers     | `workflow.sleep()`      |
| `setImmediate`               | Non-deterministic scheduling | Not needed in workflows |
| `import 'fs'` / `'http'` etc | I/O side effects             | Delegate to activities  |

## Running Determinism Checks

```bash
# Run determinism linting (ESLint rules)
pnpm lint:determinism

# Run determinism tests (Vitest)
pnpm test:determinism
```

## Local Hook Enforcement

Determinism linting is also enforced at commit time through [`pnpm run precommit`](package.json:34), which runs `lint-staged` and then [`pnpm lint:determinism`](package.json:12).

## ESLint Rules

Determinism is enforced via ESLint rules in `eslint.config.cjs`:

- **`no-restricted-syntax`**: Catches `new Date()` and `process.env` via AST selectors
- **`no-restricted-properties`**: Catches `Date.now`, `Math.random`, `crypto.randomBytes`
- **`no-restricted-globals`**: Catches `setTimeout`, `setInterval`, `setImmediate` (workflow files only)
- **`no-restricted-imports`**: Catches `fs`, `http`, `net`, `child_process` imports (workflow files only)

### Scoping

| Scope          | Files                                                  | Rules Applied                                                                    |
| -------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Engine source  | `packages/@dvt/engine/src/**/*.ts`                     | `new Date()`, `Date.now()`, `Math.random()`, `process.env`, `crypto.randomBytes` |
| Workflow files | `packages/@dvt/adapter-temporal/src/workflows/**/*.ts` | All engine rules + `setTimeout`, `setInterval`, I/O imports                      |
| Test files     | `**/*.test.ts`, `**/test/**/*.ts`                      | All determinism rules **disabled**                                               |

### Exceptions

If a legitimate use of a forbidden API is needed (e.g., configuration loading at initialization time), use an `eslint-disable-next-line` comment with justification:

```typescript
// eslint-disable-next-line no-restricted-syntax -- config injection: callers can override env
env: Record<string, string | undefined> = process.env,
```

## CI Integration

Determinism linting runs in two CI workflows:

1. **`contracts.yml`** — `pnpm lint:determinism` (blocking, runs on every PR)
2. **`test.yml`** — `pnpm test:determinism` (runs when engine/adapter files change)

## References

- [Temporal Determinism Constraints](https://docs.temporal.io/workflows#deterministic-constraints)
- [determinism-tooling.md](../../../docs/architecture/engine/dev/determinism-tooling.md)
- [CLAUDE.md](../../../CLAUDE.md) — "Determinism Rules" section
