# Issue #228 Playbook Draft (Local)

Status: Local draft prepared before publishing any GitHub issue comment.

---

## Template A — Pre-implementation brief

### Suitability

- Issue #228 is suitable for a deterministic static validator in [`scripts/validate-references.cjs`](scripts/validate-references.cjs).
- The repository already has contract validators, so this script fits the same architecture and CI lane.

### Blockers

- No implementation blockers.
- Existing docs currently include deprecated-reference patterns and one version mismatch, so warning-first mode is required initially.

### Opportunities

- Reuse this validator structure for future contracts checks.
- Gradually promote checks from warning mode to hardened mode without redesign.

### WHAT

- Add `validate-references` script to scan markdown links in contracts docs.
- Validate local target existence.
- Validate version alignment when explicit versions are present in both label and target.
- Flag deprecated reference patterns in warning phase.
- Integrate in contracts CI warning path.

### FOR (goal)

- Improve contract documentation integrity and navigability.
- Surface migration/deprecation debt without blocking delivery in phase 1.

### HOW

- Traverse `docs/architecture/engine/contracts/**/*.md`.
- Extract markdown links outside fenced code blocks.
- Ignore external and anchor-only links.
- Resolve local paths from source file location.
- Emit deterministic `file:line:column` findings grouped by category.

### WHY

- Broken or inconsistent references degrade contract reliability.
- Warning-first rollout enables immediate value while minimizing merge friction.

### Scope touched

- [`scripts/validate-references.cjs`](scripts/validate-references.cjs)
- [`package.json`](package.json)
- [`.github/workflows/contracts.yml`](.github/workflows/contracts.yml)
- [`scripts/README.md`](scripts/README.md)

### Risk

- Classification: Low.
- Main risk: false positives on heuristic deprecation detection.

### Risks & Mitigation

- Keep deprecation output in warning mode.
- Restrict hard-fail behavior to broken references only in hardened mode.

### Impact (affected areas)

- Contracts CI observability improved.
- No production runtime impact.

### Validation plan

- Run warning mode via npm script.
- Validate formatting and deterministic output.
- Ensure workflow includes new script and path filters.

### Unknowns / maintainer decisions needed

- Decide cutoff date/version to enforce hardened mode for broken references.
- Decide whether deprecated-reference patterns should later become blocking.

---

## Template B — Final issue close summary (draft)

### Suitability outcome

- The validator approach solved the issue with low risk and reusable structure.

### Blockers encountered

- None during implementation.

### Opportunities identified

- Future consolidation of contracts validators into a shared utility module.

### WHAT changed

- Added [`scripts/validate-references.cjs`](scripts/validate-references.cjs).
- Added npm script [`contracts:references:validate`](package.json:50).
- Added CI invocation in [`contract-validate`](.github/workflows/contracts.yml:383).
- Added detection scope path for the new script in [`detect-changes`](.github/workflows/contracts.yml:47).
- Updated usage docs in [`scripts/README.md`](scripts/README.md).

### WHY this approach

- Fast implementation, deterministic output, clear progression path from warning to hardened mode.

### Acceptance criteria mapping

- [x] Verify local link targets exist.
- [x] Validate version alignment in filenames/links.
- [x] Flag deprecated references in warning phase.
- [x] Include file and link location in output.
- [x] Preserve warning-first strategy for hardened rollout.

### Validation evidence

- `pnpm contracts:references:validate` executed successfully in warning mode.
- `pnpm exec prettier --check` passed on touched files.

### Rollback note

- Revert touched files listed in scope section.

### Residual scope (if any)

- Optional follow-up doc cleanup PR for currently reported warnings.
