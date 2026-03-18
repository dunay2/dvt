---
slice: contracts-generated-artifact-cleanup
date: 2026-03-18
gap: monorepo-platform
author: AI (Codex)
---

# Closeout: Contracts Generated Artifact Cleanup

## Think-First

### Problem summary

`packages/@dvt/contracts` contains generated `.js` and `.d.ts` artifacts under
`src/**`, plus modified tracked `index.js` / `index.d.ts` at the package root.
Those files do not belong to the package source tree.

### Root cause

An earlier TypeScript compile ran with outputs landing outside `dist/`, which
left generated JavaScript and declaration files mixed into source paths.

### Constraints and invariants

- `AGENTS.md` requires evidence-based cleanup and no hidden debt.
- `docs/guides/ai-work-protocol.md` requires think-first before edits.
- `packages/@dvt/contracts/tsconfig.json` defines `outDir: "dist"` and
  `rootDir: "src"`, so generated outputs in `src/**` are outside the intended
  build boundary.
- `packages/@dvt/contracts/package.json` publishes from `dist/**`, not `src/**`.

### Options considered

1. Leave the generated files in place.
   Rejected: they are residual artifacts and pollute the source tree.
2. Delete only the untracked `src/**/*.js` and `src/**/*.d.ts`, but keep the
   modified tracked root files.
   Rejected: the modified tracked root files are part of the same accidental
   emit.
3. Remove all untracked generated source-tree artifacts and restore the tracked
   root generated files from `HEAD`.
   Selected: restores the package to the declared build layout without changing
   intended source.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - delete generated `.js` / `.d.ts` residues from `packages/@dvt/contracts/src`
  - restore tracked `packages/@dvt/contracts/index.js` and
    `packages/@dvt/contracts/index.d.ts`
- Touched files or paths:
  - `packages/@dvt/contracts/src/**/*.js`
  - `packages/@dvt/contracts/src/**/*.d.ts`
  - `packages/@dvt/contracts/index.js`
  - `packages/@dvt/contracts/index.d.ts`
  - this closeout
- Risks and mitigations:
  - risk: deleting a real source file by mistake
  - mitigation: only target generated extensions under `src/**`, after
    confirming they are untracked and inconsistent with `outDir`
- Out-of-scope items:
  - rebuilding `@dvt/contracts`
  - changes to contract source
  - broader monorepo tsconfig migration
- Validation plan:
  - `git status --short -- packages/@dvt/contracts`
  - confirm the untracked generated files are gone and tracked root files are
    restored
- Test coverage plan:
  - no runtime behavior changes; workspace cleanliness check is the acceptance
    gate
- Libraries evaluated:
  - None added

## Changes made

| File                                                                                | Change                                                             | Why                                                      |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------- |
| `packages/@dvt/contracts/src/**/*.js`                                               | Deleted generated JavaScript artifacts from the source tree.       | They were accidental compiler outputs outside `dist/`.   |
| `packages/@dvt/contracts/src/**/*.d.ts`                                             | Deleted generated declaration artifacts from the source tree.      | They were accidental compiler outputs outside `dist/`.   |
| `packages/@dvt/contracts/src/**/*.js.map`                                           | Deleted generated source maps from the source tree.                | They were residual build outputs and not package source. |
| `packages/@dvt/contracts/src/**/*.d.ts.map`                                         | Deleted generated declaration maps from the source tree.           | They were residual build outputs and not package source. |
| `packages/@dvt/contracts/index.js`                                                  | Restored the tracked generated entrypoint file from `HEAD`.        | It had been modified by the same accidental emit.        |
| `packages/@dvt/contracts/index.d.ts`                                                | Restored the tracked generated declaration entrypoint from `HEAD`. | It had been modified by the same accidental emit.        |
| `docs/planning/closeouts/20260318-contracts-generated-artifact-cleanup-closeout.md` | Recorded analysis and evidence.                                    | Required by repo governance.                             |

## Docs synced

- [x] `docs/planning/closeouts/20260318-contracts-generated-artifact-cleanup-closeout.md`
- [x] `docs/contracts/engine/index.md`
- [x] `docs/contracts/planner/index.md`
- [x] `docs/contracts/shared/index.md`

## Test evidence

| Command                                                                                                                     | Result                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `git status --short -- 'packages/@dvt/contracts'`                                                                           | Confirmed initial residual generated artifacts under `src/**` plus modified tracked `index.js` / `index.d.ts`. |
| `Get-ChildItem 'packages/@dvt/contracts/src' -Recurse -File -Include *.js,*.d.ts,*.js.map,*.d.ts.map`                       | Confirmed the residual files were generated outputs in the source tree.                                        |
| `git restore --source=HEAD -- 'packages/@dvt/contracts/index.js' 'packages/@dvt/contracts/index.d.ts'`                      | Passed for `index.js`; `index.d.ts` was later re-run separately outside the sandbox and restored.              |
| `Get-ChildItem 'packages/@dvt/contracts/src' -Recurse -File -Include *.js,*.d.ts,*.js.map,*.d.ts.map \| Remove-Item -Force` | Partially passed in sandbox; `.js` and `.d.ts` were removed, but `.map` deletions failed with access denied.   |
| Escalated `Get-ChildItem 'packages/@dvt/contracts/src' -Recurse -File -Include *.js.map,*.d.ts.map \| Remove-Item -Force`   | Passed.                                                                                                        |
| Escalated `git restore --source=HEAD -- 'packages/@dvt/contracts/index.d.ts'`                                               | Passed.                                                                                                        |
| `git status --short -- 'packages/@dvt/contracts/index.d.ts' 'packages/@dvt/contracts/src'`                                  | Final state clean for `packages/@dvt/contracts/src`; no residual generated source-tree artifacts remained.     |
| `pnpm docs:sync`                                                                                                            | Passed.                                                                                                        |

## No-debt evidence

- No new debt entry was created.
- No rules were relaxed.
- No hooks were bypassed.
- No checks were hidden from the user.

## No-stub evidence

No stubs, placeholders, fake implementations, or unfinished branches were
added.
