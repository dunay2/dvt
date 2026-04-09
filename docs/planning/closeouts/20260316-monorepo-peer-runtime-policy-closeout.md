---
slice: 20260316-monorepo-peer-runtime-policy
date: 2026-03-16
last_reviewed: 2026-03-16
gap: M02
author: AI (GPT-5)
---

# Closeout: M02 - Monorepo peer/runtime policy

## Think-First Analysis

### Problem summary

The monorepo now has an explicit platform baseline, but runtime dependency
resolution policy is still implicit. A concrete failure remains in
`@dvt/adapter-temporal`: `vitest` can load the suite, but runtime module
resolution fails with `Cannot find module 'tslib'` even though `tslib@2.8.1`
is present in the pnpm store and referenced in `pnpm-lock.yaml`.

### Root cause

The repository relies on pnpm defaults rather than an explicit runtime
resolution policy. `tslib` exists only as a transitive dependency inside
`.pnpm`, but Node cannot resolve it from the failing Temporal/memfs runtime
path on Windows. A lockfile entry is not enough if the helper is not exposed in
the runtime-visible dependency graph.

### Constraints and invariants

- `AGENTS.md` requires root-cause repair, not symptom masking.
- `docs/guides/ai-work-protocol.md` requires think-first before config changes.
- `docs/guides/testing-and-ci-capabilities.md` governs the validation commands.
- This slice is `M02`; it must stay inside peer/runtime resolution policy and
  must not mix in script-graph cleanup or TypeScript alias changes from later
  monorepo work.

### Options considered

- Add `tslib` as an explicit root dev dependency and declare peer auto-install
  in `.npmrc`.
  - Accepted. Smallest change that matches the actual runtime requirement
    without changing the whole linker topology.
- Switch pnpm to `node-linker=hoisted`.
  - Rejected. Too broad for the evidence. It would change the entire install
    topology just to surface one known runtime helper.
- Make runtime resolution policy explicit in `.npmrc` and hoist only `tslib`
  publicly while also declaring peer auto-install explicitly.
  - Rejected after validation. Reinstalling with
    `public-hoist-pattern[]=tslib` still left `require.resolve('tslib/package.json')`
    and the Temporal test failing on Windows.
- Do nothing and treat the `tslib` failure as package-local debt.
  - Rejected. The failure is caused by monorepo resolution policy, not package
    logic.

Libraries evaluated:

- None. This slice is pnpm configuration, not library adoption.

### Selected option and rationale

Update the baseline in the smallest way that matches the observed runtime:

- `auto-install-peers=true`
- add `tslib@2.8.1` to root `devDependencies`

This keeps the default isolated linker, makes peer behavior explicit, and
surfaces the helper that the current Temporal/memfs stack already requires at
runtime on Windows.

### Rejected alternatives

- hiding the problem with a broad linker change
- a hoist-only config tweak that was tested and did not fix resolution
- package-local fixes in `@dvt/adapter-temporal` that cannot affect the root
  `.pnpm` runtime path

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - `package.json`
  - `.npmrc`
  - `pnpm-lock.yaml`
  - `docs/planning/closeouts/20260316-monorepo-peer-runtime-policy-closeout.md`
- Expected outcome:
  - pnpm peer/runtime resolution policy becomes explicit
  - `tslib` becomes resolvable from the root runtime path on Windows
  - `@dvt/adapter-temporal` no longer fails immediately on `Cannot find module 'tslib'`
- Risks and mitigations:
  - risk: adding a root helper dependency looks broader than the original
    symptom
  - mitigation: keep it pinned and documented as a runtime helper, not as an
    application library
  - risk: another hidden transitive helper may appear later
  - mitigation: keep this slice minimal and evidence-driven rather than
    over-generalizing the config
- Out-of-scope items:
  - script graph cleanup
  - TypeScript alias cleanup
  - broader linker changes
- Validation plan:
  - `pnpm install --frozen-lockfile`
  - `node -e "console.log(require.resolve('tslib/package.json'))"`
  - `node -e "require('./node_modules/.pnpm/@jsonjoy.com+fs-node@4.56.10_tslib@2.8.1/node_modules/@jsonjoy.com/fs-node/lib/index.js'); console.log('ok')"`
  - `pnpm --filter @dvt/adapter-temporal exec vitest run test/ObservedTemporalAdapter.test.ts`
  - `pnpm lint:md`
- Test coverage plan:
  - negative path is the current `Cannot find module 'tslib'` failure
  - success means that failure disappears; if another runtime error appears
    afterward, that becomes a separate issue
- Libraries evaluated:
  - None

## Changes made

| File                                                                        | Change                                                                                | Why                                                                                                          |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `package.json`                                                              | Added `tslib@2.8.1` to root `devDependencies`                                         | Expose the runtime helper at the root resolution path that the Temporal/memfs stack actually uses on Windows |
| `.npmrc`                                                                    | Added explicit `auto-install-peers=true` and removed the failed hoist-only experiment | Make peer installation policy explicit without keeping a config tweak that did not solve the real failure    |
| `pnpm-lock.yaml`                                                            | Regenerated after adding root `tslib`                                                 | Keep the lockfile aligned with the explicit runtime helper baseline                                          |
| `docs/planning/closeouts/20260316-monorepo-peer-runtime-policy-closeout.md` | Recorded diagnosis, rejected options, work performed, and validation evidence         | Required closeout for `M02`                                                                                  |

## Libraries evaluated

- None.

## Docs synced

- [x] `docs/planning/index.md` - checked via `docs:sync`

## Test evidence

| Command                                                                                                                                                | Result                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `pnpm why tslib`                                                                                                                                       | Passed; confirmed `tslib@2.8.1` existed only as a transitive dependency before the fix |
| `pnpm --filter @dvt/adapter-temporal exec vitest run test/ObservedTemporalAdapter.test.ts`                                                             | Failed before the fix with `Cannot find module 'tslib'`                                |
| `$env:CI='true'; pnpm install --no-frozen-lockfile`                                                                                                    | Passed                                                                                 |
| `pnpm install --frozen-lockfile`                                                                                                                       | Passed                                                                                 |
| `node -e "console.log(require.resolve('tslib/package.json'))"`                                                                                         | Passed after the fix                                                                   |
| `node -e "require('./node_modules/.pnpm/@jsonjoy.com+fs-node@4.56.10_tslib@2.8.1/node_modules/@jsonjoy.com/fs-node/lib/index.js'); console.log('ok')"` | Passed after the fix                                                                   |
| `pnpm --filter @dvt/adapter-temporal exec vitest run test/ObservedTemporalAdapter.test.ts`                                                             | Passed after the fix (`4/4`)                                                           |
| `pnpm lint:md`                                                                                                                                         | Passed                                                                                 |
| `pnpm docs:sync`                                                                                                                                       | Passed                                                                                 |
| `pnpm docs:quality:check`                                                                                                                              | Passed with pre-existing non-English warnings outside this slice                       |
| `pnpm docs:canonical:check`                                                                                                                            | Passed                                                                                 |

## Debt introduced

None.
