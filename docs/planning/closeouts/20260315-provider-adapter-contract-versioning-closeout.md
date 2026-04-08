---
slice: provider-adapter-contract-versioning
date: 2026-03-15
last_reviewed: 2026-03-15
gap: contract-versioning
author: AI (Codex)
---

# Closeout: Version IProviderAdapter Contract

## Think-First Analysis

### Problem summary

`IProviderAdapter.v1.md` in docs still described a single draft contract even
though the repo now distinguishes between the original lifecycle-only baseline
and an extended shape with `capabilities()`, `estimateRunRef()`, and
`lookupRunRef()`.

### Root cause

The contract doc evolved in place without a clean historical split, so readers
cannot tell which surface is archived baseline versus current normative shape.

### Constraints and invariants

- `docs/architecture/engine/VERSIONING.md`: major lines must remain explicit and
  active lines must be discoverable.
- `docs/CONTRIBUTING.md`: docs changes must keep references and structure valid.
- `docs/guides/ai-work-protocol.md`: think-first is required before changing the
  governed artifact.

### Options considered

- Keep `IProviderAdapter.v1.md` as a single evolving file.
- Split into archived `v1.0`, active `v1.1`, and keep `v1.md` as redirect.

### Selected option and rationale

Split the contract into `v1.0` and `v1.1`, and turn `v1.md` into a redirect.
That preserves historical baseline while making the current normative line
explicit.

### Rejected alternatives

Keeping a single `v1.md` would continue to hide the contract evolution and make
cross-references ambiguous.

## Changes made

| File                                                                                                                                      | Change                                      | Why                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------- |
| [docs/architecture/engine/contracts/engine/IProviderAdapter.v1.md](../../architecture/engine/contracts/engine/IProviderAdapter.v1.md)     | Replaced monolithic content with redirect   | Preserve existing references while pointing readers to the right active version |
| [docs/architecture/engine/contracts/engine/IProviderAdapter.v1.0.md](../../architecture/engine/contracts/engine/IProviderAdapter.v1.0.md) | Added archived baseline                     | Preserve the historical lifecycle-only contract                                 |
| [docs/architecture/engine/contracts/engine/IProviderAdapter.v1.1.md](../../architecture/engine/contracts/engine/IProviderAdapter.v1.1.md) | Added current normative contract            | Make optional adapter capabilities and consumers explicit                       |
| [docs/architecture/engine/contracts/README.md](../../architecture/engine/contracts/README.md)                                             | Updated registry entry and historical table | Keep contract discoverability aligned with the new version split                |

## Libraries evaluated

None.

## Docs synced

- [x] [docs/architecture/engine/contracts/README.md](../../architecture/engine/contracts/README.md) - registry updated for active and archived lines
- [x] [docs/contracts/engine/index.md](../../contracts/engine/index.md) - validated as current generated index without further changes
- [x] [docs/planning/closeouts/20260315-provider-adapter-contract-versioning-closeout.md](./20260315-provider-adapter-contract-versioning-closeout.md) - closeout and evidence recorded

## Test evidence

| Command                                                                                                                                                                                                                                                                                                                                                                                                                                           | Result                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `pnpm docs:sync`                                                                                                                                                                                                                                                                                                                                                                                                                                  | Passed                                               |
| `pnpm docs:quality:check`                                                                                                                                                                                                                                                                                                                                                                                                                         | Passed with pre-existing warnings outside this slice |
| `pnpm docs:canonical:check`                                                                                                                                                                                                                                                                                                                                                                                                                       | Passed                                               |
| `pnpm exec markdownlint-cli2 "docs/architecture/engine/contracts/engine/IProviderAdapter.v1.md" "docs/architecture/engine/contracts/engine/IProviderAdapter.v1.0.md" "docs/architecture/engine/contracts/engine/IProviderAdapter.v1.1.md" "docs/architecture/engine/contracts/README.md" "docs/planning/closeouts/20260315-provider-adapter-contract-versioning-closeout.md" --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc` | Passed                                               |

## Debt introduced

None.
