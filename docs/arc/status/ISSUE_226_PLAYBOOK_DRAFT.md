# Issue #226 Playbook Draft (Local)

Status: Local draft prepared before publishing to GitHub comments.

---

## Template A — Pre-implementation brief

### Suitability

- Issue #226 is suitable for a deterministic static validator in [`scripts/validate-glossary-usage.cjs`](scripts/validate-glossary-usage.cjs).
- The canonical source already exists in [`GlossaryContract.v1.md`](docs/architecture/engine/contracts/engine/GlossaryContract.v1.md), including the prohibited-synonyms table.

### Blockers

- No implementation blockers.
- Existing docs contain many non-canonical terms, so warning-first mode is required for initial rollout.

### Opportunities

- Reuse the same validator architecture used by [`validate-rfc2119.cjs`](scripts/validate-rfc2119.cjs) and [`validate-references.cjs`](scripts/validate-references.cjs).
- Promote to hardened mode later via env toggle without redesign.

### WHAT

- Add glossary usage validator.
- Parse prohibited synonyms from glossary contract.
- Detect non-canonical terms in contracts markdown prose.
- Add npm scripts (`contracts:glossary:validate`, `validate:glossary`) and wire into `validate:contracts`.
- Integrate validator into contracts CI warning phase.

### FOR (goal)

- Improve terminology consistency across contracts.
- Make glossary policy measurable in CI output.

### HOW

- Traverse `docs/architecture/engine/contracts/**/*.md`.
- Ignore fenced blocks and inline code.
- Parse section `## 10) Prohibited Synonyms` from glossary source.
- Report deterministic findings with `file:line:column` and canonical replacement.

### WHY

- Terminology drift degrades contract readability and policy clarity.
- Warning-first preserves delivery flow while exposing debt.

### Scope touched

- [`scripts/validate-glossary-usage.cjs`](scripts/validate-glossary-usage.cjs)
- [`package.json`](package.json)
- [`.github/workflows/contracts.yml`](.github/workflows/contracts.yml)
- [`scripts/README.md`](scripts/README.md)

### Risk

- Classification: Low.
- Main risk: high finding volume due to broad synonyms map.

### Risks & Mitigation

- Keep default in warning mode.
- Restrict enforcement mode activation to explicit hardened phase.

### Impact (affected areas)

- Contract CI reporting quality improves.
- No runtime impact.

### Validation plan

- Run glossary validator in warning mode.
- Verify formatting/lint checks on touched files.
- Ensure workflow and path filters include the new validator.

### Unknowns / maintainer decisions needed

- Decide timing and threshold for hardened failures.

---

## Template B — Final issue close summary (draft)

### Suitability outcome

- Validator approach solved issue requirements with low-risk integration.

### Blockers encountered

- No technical blockers.

### Opportunities identified

- Add optional scoped mode later (for specific sections/files) if needed.

### WHAT changed

- Added glossary validator in [`scripts/validate-glossary-usage.cjs`](scripts/validate-glossary-usage.cjs).
- Added scripts [`contracts:glossary:validate`](package.json:51) and [`validate:glossary`](package.json:52).
- Updated [`validate:contracts`](package.json:35) to invoke glossary validation.
- Added CI path trigger and execution step in [`.github/workflows/contracts.yml`](.github/workflows/contracts.yml).
- Updated docs in [`scripts/README.md`](scripts/README.md).

### WHY this approach

- Keeps validation deterministic, transparent, and aligned with existing contracts tooling.

### Acceptance criteria mapping

- [x] Parse canonical terms from glossary contract source.
- [x] Detect prohibited synonyms in contracts docs.
- [x] Expose via `pnpm validate:glossary`.
- [x] Integrate into `validate:contracts`.
- [x] Deterministic CI output with location details.

### Validation evidence

- `pnpm contracts:glossary:validate` executed and reported deterministic findings.
- `pnpm validate:glossary` alias executed.
- `prettier --check` passed for modified files.

### Rollback note

- Revert touched files listed in scope section.

### Residual scope (if any)

- Optional follow-up doc cleanup to reduce warning volume before hardened mode.
