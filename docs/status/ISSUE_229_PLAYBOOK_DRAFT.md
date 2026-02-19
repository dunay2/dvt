# Issue #229 Playbook Draft (Local)

Status: Draft prepared locally before publishing to GitHub comments.

---

## Template A — Pre-implementation brief

### Suitability

- Issue #229 is a good fit for a deterministic static-analysis script in [`scripts/validate-rfc2119.cjs`](scripts/validate-rfc2119.cjs).
- The repository already contains contract-validation utilities in [`scripts/`](scripts), so adding one more script keeps consistency.
- Scope is bounded to markdown contracts under [`docs/architecture/engine/contracts`](docs/architecture/engine/contracts).

### Blockers

- No hard blockers identified.
- Existing docs already contain lowercase normative words, so strict mode would fail initially by design.

### Opportunities

- Add warning-first enforcement now and promote to blocking mode later without script redesign.
- Reuse the same reporting shape for upcoming validation scripts (#228, #226, #227).

### WHAT

- Add RFC 2119 validator script.
- Add npm script entry.
- Integrate warning-mode execution in contracts workflow.
- Document usage and strict-mode promotion path.

### FOR (goal)

- Improve contract quality by surfacing lowercase normative wording.
- Keep CI deterministic and non-disruptive in phase 1 (warning mode).

### HOW

- Recursively scan `*.md` files in contracts docs.
- Ignore fenced blocks and inline code fragments.
- Report per-file findings with line/column and uppercase replacement.
- Support mode toggle (`warn` default, `error` promoted mode).

### WHY

- RFC 2119 language should be explicit and machine-auditable in normative sections.
- Warning-first rollout avoids blocking active work while still creating visibility.

### Scope touched

- [`scripts/validate-rfc2119.cjs`](scripts/validate-rfc2119.cjs)
- [`package.json`](package.json)
- [`.github/workflows/contracts.yml`](.github/workflows/contracts.yml)
- [`scripts/README.md`](scripts/README.md)

### Risk

- Classification: Low.
- Main risk: false positives in code snippets and examples.

### Risks & Mitigation

- Mitigation: ignore fenced code blocks and inline backtick segments.
- Mitigation: default to warning mode and make strict mode opt-in.

### Impact (affected areas)

- Contracts CI observability improves.
- No runtime production behavior affected.

### Validation plan

- Run warning mode through npm script.
- Run strict mode to verify promotable failure behavior.
- Confirm workflow references and trigger scope include the new script.

### Unknowns / maintainer decisions needed

- Decide when to switch `RFC2119_MODE=error` in CI.

---

## Template B — Final issue close summary (draft)

### Suitability outcome

- The static script approach solved the issue with minimal surface area and clear CI integration.

### Blockers encountered

- No implementation blockers.

### Opportunities identified

- Next scripts can share this reporting model for consistency.

### WHAT changed

- Added RFC 2119 validator in [`scripts/validate-rfc2119.cjs`](scripts/validate-rfc2119.cjs).
- Added npm entry [`contracts:rfc2119:validate`](package.json:49).
- Added workflow step in [`contract-validate`](.github/workflows/contracts.yml:377) and scope detection path in [`detect-changes`](.github/workflows/contracts.yml:47).
- Updated usage docs in [`scripts/README.md`](scripts/README.md).

### WHY this approach

- Provides immediate value in warning mode and a no-redesign path to strict enforcement.

### Acceptance criteria mapping

- [x] Detect RFC 2119 keywords (lowercase normative usage detection)
- [x] Flag lowercase normative wording
- [x] Report per-file findings
- [x] Warning mode first, promotable to error
- [x] CI-compatible deterministic output

### Validation evidence

- `pnpm contracts:rfc2119:validate` prints deterministic warning report.
- `node scripts/validate-rfc2119.cjs --mode error` returns non-zero when findings exist.

### Rollback note

- Remove added script and workflow invocation; revert [`package.json`](package.json) and [`scripts/README.md`](scripts/README.md).

### Residual scope (if any)

- Optional follow-up normalization PR to uppercase currently flagged prose across contracts docs.
