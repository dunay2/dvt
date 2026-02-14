# Issue #93 — Contracts CI Hardening (`continue-on-error` review)

Date (UTC): 2026-02-14
Scope: `.github/workflows/contracts.yml`

## Pre-implementation brief (WHAT / WHY)

### WHAT

- Make contract-critical checks explicitly blocking in the Contracts workflow.
- Remove silent pass behavior from JSON schema compilation.
- Keep only documented non-blocking exceptions:
  - Scope gating on PRs when files are not relevant.
  - JSON schema step skip only when no `*.schema.json` files exist.

### WHY

- Issue #93 requires avoiding false-green CI from tolerant error handling.
- Contract checks are quality gates and must fail fast when validation or hash comparison fails.

### Risk classification

- **Medium**: CI behavior change in one workflow; can surface previously hidden failures.

### Impact analysis

- Affected path: `.github/workflows/contracts.yml`.
- No runtime/production code behavior change.
- Expected effect: stricter CI outcomes for contract jobs.

### Validation plan

- Verify workflow diff removes `continue-on-error` from hash comparison.
- Verify schema validation step no longer masks errors (`|| true` removed, strict shell enabled).
- Verify YAML remains syntactically valid and logically consistent with existing gating.

## Issue comment draft (for GitHub issue #93)

```md
## Update — Contracts CI hardening (WHAT / WHY)

### WHAT

- Enforced blocking behavior for snapshot hash comparison in `contracts.yml`.
- Removed tolerant schema compile path that could hide AJV failures.
- Added explicit workflow policy comment documenting allowed exceptions.

### WHY

- Prevent false-green CI and align with issue #93 goal: contract checks must block merge on real failures.

### Validation evidence

- Workflow diff confirms:
  - `continue-on-error` removed from hash comparison step.
  - `set -euo pipefail` added to schema/hash run blocks.
  - `npx ajv ...` no longer masked by `|| true`.

### Risk / rollback

- Risk: CI may fail on latent contract/schema issues previously hidden.
- Rollback: revert workflow commit if emergency unblock needed, then open follow-up with targeted fix.
```
