# Contract Tooling Proposal (v1)

## 1) Purpose

Define a practical tooling strategy to maintain contract **stability**, **traceability**, and **terminology consistency** across engine documentation and related artifacts.

This proposal formalizes a **hybrid model**:

- **Mandatory controls in repository/CI** (source of truth)
- **Optional VS Code productivity layer** (authoring support)

---

## 2) Problem Statement

Current contract maintenance risk areas:

- Terminology drift between documents (`runId`, `planId`, `persistedAt`, status enums, etc.)
- Broken cross-contract references
- Inconsistent markdown quality and naming across versions
- Local editor behavior that is not enforceable in CI

Relying only on editor extensions is insufficient for merge quality gates.

---

## 3) Decision Summary

### 3.1 Normative decision

Contract quality MUST be enforced by repo-native automation:

1. Local hooks + scripts
2. CI workflows
3. Versioned schemas/checks under source control

### 3.2 Non-normative decision

VS Code extensions MAY be used to improve author productivity, but MUST NOT be the only line of validation.

---

## 4) Scope

### In scope

- Engine contracts and related documentation under `docs/architecture/engine/contracts/**`
- Contract validation scripts and workflows
- Terminology checks aligned with glossary

### Out of scope (v1)

- Full semantic parser for all Markdown contracts
- Blocking governance based on marketplace-only extensions
- Automatic ADR policy engine

---

## 5) Baseline Controls (Mandatory)

These controls are the enforcement backbone.

### 5.1 Repository scripts

- Keep and extend validation scripts in:
  - `scripts/validate-contracts.cjs`
  - `scripts/run-golden-paths.cjs`
- Use npm/pnpm scripts as execution entry points (single source for local + CI).

### 5.1.1 Glossary-Driven Validation (P0)

All contract validation MUST be driven by the canonical glossary.

- `scripts/validate-glossary-usage.cjs` MUST:
  1. Parse `docs/architecture/engine/contracts/engine/GlossaryContract.v1.md` and extract canonical terms.
  2. Scan contract `.md` files for canonical term usage.
  3. Flag term deviations and canonical-field naming drift.
  4. Validate prohibited synonyms defined in glossary section 10.

- Glossary validation integration:
  - `npm run validate:glossary`
  - `npm run validate:contracts` (MUST include glossary validation)

CI MUST fail if glossary validation reports errors.

### 5.1.2 Idempotency Vector Validation (P0)

- `scripts/validate-idempotency-vectors.cjs` MUST:
  1. Load the version-aligned RunEvents vectors artifact.
  2. Recompute idempotency keys using canonical field order and delimiters.
  3. Verify expected SHA-256 digest equality for all vectors.
  4. Cover edge cases (forbidden delimiter `|`, encoding, normalized step token `RUN`).

- Versioning rule:
  - Vectors MUST be versioned alongside RunEvents contract versions.
  - Example naming:
    - `RunEvents.v1.idempotency_vectors.json`
    - `RunEvents.v2.0.1.idempotency_vectors.json` (when/if that version exists)

CI MUST fail on vector mismatch.

### 5.1.3 Cross-Contract Reference Validation (P0)

- `scripts/validate-references.cjs` MUST:
  1. Parse contract Markdown links.
  2. Verify referenced local files exist.
  3. Validate version alignment between link text and target filename.
  4. Flag references to deprecated contracts (warning in early phases, error in hardened phases).

CI MUST fail on broken references and version mismatch at hardened severity.

### 5.1.4 Automatic Contract Index Generation (P1)

- `scripts/generate-contract-index.cjs` MUST:
  1. Scan `docs/architecture/engine/contracts/**/*.v*.md`.
  2. Extract contract metadata (`status`, `version`, etc.).
  3. Regenerate `docs/architecture/engine/contracts/README.md` matrix deterministically.

- Suggested staged flow for contract-only edits:
  - Generate index
  - Stage regenerated index

### 5.1.5 RFC 2119 Compliance Validation (P1)

- `scripts/validate-rfc2119.cjs` MUST:
  1. Detect normative keywords (`MUST`, `MUST NOT`, `SHOULD`, `SHOULD NOT`, `MAY`).
  2. Flag lowercase normative usage.
  3. Report per-file consistency findings.

Goal: preserve unambiguous normative language.

### 5.1.6 Executable Examples Validation (P1)

- Extract TypeScript code blocks from contracts (`ts`, `typescript`).
- Validate parse/compile correctness in CI.
- In advanced phase, execute approved examples in sandbox tests.

CI MUST fail when example blocks are syntactically invalid.

### 5.2 Pre-commit and pre-push policy

- Keep `lint-staged` + deterministic checks in local commit flow.
- Add contract-focused checks without introducing excessive developer friction.

### 5.3 CI quality gates

- Continue using contract workflow gates in:
  - `.github/workflows/contracts.yml`
- Ensure changed-scope filtering remains to reduce unnecessary CI cost.

### 5.4 Documentation quality controls

- Maintain markdown normalization (`prettier`, markdown linting where applicable).
- Keep canonical references synchronized (e.g., `RunEvents.v1.md`, `GlossaryContract.v1.md`).

---

## 6) VS Code Layer (Optional but Recommended)

Editor tooling should accelerate authoring, not replace enforcement.

### 6.1 Recommended extensions (team baseline)

- `streetsidesoftware.code-spell-checker`
- `davidanson.vscode-markdownlint`
- `yzhang.markdown-all-in-one`
- `bierner.markdown-mermaid`
- `redhat.vscode-yaml`
- `eamodio.gitlens`
- `mhutchie.git-graph`

### 6.2 Optional domain-specific extensions

- Contextive (for glossary-hover and domain term guidance)
- Any spec-assist extension can be adopted as non-blocking support if it does not conflict with repo standards.

---

## 7) Proposed Implementation (Phased)

## Phase 1 — Foundation (Week 1)

1. Add workspace recommendations:
   - `.vscode/extensions.json`
2. Add workspace settings for contract authoring defaults:
   - `.vscode/settings.json`
3. Add canonical dictionary entries for contract terms:
   - `.cspell.json`
4. Introduce validation severity matrix as warnings-first rollout baseline.
5. Add contributor quick-start documentation.

Deliverable: consistent local authoring defaults.

## Phase 2 — Validation Expansion (Week 2)

1. Implement `scripts/validate-glossary-usage.cjs` and wire into `validate:contracts`.
2. Implement `scripts/validate-idempotency-vectors.cjs` and wire into CI.
3. Implement `scripts/validate-references.cjs`.
4. Implement `scripts/generate-contract-index.cjs`.
5. Implement `scripts/validate-rfc2119.cjs`.
6. Add optional JSON schemas for contract metadata and vectors (non-breaking introduction).

Deliverable: stronger automated consistency validation.

## Phase 3 — CI Hardening (Week 3)

1. Integrate new contract checks into `.github/workflows/contracts.yml`.
2. Keep scope-based execution to avoid unnecessary full runs.
3. Add clear failure messages with actionable remediation.
4. Add ADR gate for contract semantic changes.
5. Promote selected warnings to errors per severity transition policy.

Deliverable: enforceable, readable CI contract gates.

## Phase 4 — Operationalization (Week 4)

1. Document maintenance runbook for contract contributors.
2. Add KPI tracking (see section 9).
3. Calibrate false positives and reduce noise.
4. Track validation time SLO and optimize slow checks.

Deliverable: stable long-term workflow.

---

## 8) Governance Rules

1. **Repo automation is authoritative**; editor tooling is supportive.
2. **Canonical glossary terms prevail** in case of ambiguity.
3. Any new validator MUST be:
   - deterministic
   - documented
   - runnable in CI and locally
4. Validation severity split:
   - Error: blocks merge
   - Warning: advisory only (with migration plan)

### 8.4 Validation Severity Matrix

| Validation                     | Severity (Phase 1) | Severity (Phase 2) | Severity (Phase 3+)     | Rationale                    |
| ------------------------------ | ------------------ | ------------------ | ----------------------- | ---------------------------- |
| Glossary term usage            | WARNING            | ERROR              | ERROR                   | Core terminology consistency |
| Prohibited synonyms            | WARNING            | ERROR              | ERROR                   | Prevents naming drift        |
| Idempotency vectors            | WARNING            | ERROR              | ERROR                   | Runtime correctness          |
| Cross-reference existence      | WARNING            | ERROR              | ERROR                   | Broken docs/links            |
| Markdown formatting            | WARNING            | WARNING            | WARNING/ERROR by policy | Style quality                |
| Link text/version alignment    | WARNING            | WARNING            | ERROR                   | Version continuity           |
| Deprecated contract references | WARNING            | WARNING            | ERROR (planned)         | Migration governance         |
| RFC 2119 keyword casing        | WARNING            | WARNING            | ERROR (planned)         | Normative language precision |

Transition policy:

- Phase 1: warning-first baseline.
- Phase 2: critical correctness checks become blocking.
- Phase 3+: hardened merge gates for full consistency.

### 8.5 ADR Requirement for Contract Semantic Changes

Any PR that changes contract semantics SHOULD include an ADR under `docs/decisions/`.

PRs that:

- modify required fields,
- alter event semantics,
- deprecate/replace contract versions,

MUST include an ADR (enforced in hardened phase).

---

## 9) Success Metrics

- Reduction in PR review comments about terminology inconsistency
- Reduction in broken Markdown references in contracts
- Time-to-review improvement for contract-only PRs
- Zero regressions in required canonical fields for run events

Target after 30 days from rollout:

- ≥50% reduction in terminology-related review findings
- ≥90% contract PRs passing validation on first CI run

### 9.1 Performance Metrics

- Local contract validation target: < 5 seconds (typical contract-only delta).
- CI contract validation target with caching: < 2 minutes.
- Contract-only PR end-to-end validation target: < 30 seconds for lightweight checks.

If thresholds are exceeded, team MUST optimize validators before expanding blocking scope.

---

## 10) Risks and Mitigations

- **Risk**: Too many blocking checks reduce velocity.
  - Mitigation: phased rollout, warning-first for new rules.

- **Risk**: Extension fragmentation across contributors.
  - Mitigation: publish workspace recommendations, keep CI authoritative.

- **Risk**: Validator false positives.
  - Mitigation: regression fixtures + explicit allowlist patterns.

---

## 11) Immediate Next Actions

1. Create `.vscode/extensions.json` with team recommendations.
2. Create `.vscode/settings.json` for markdown/cspell defaults.
3. Add `.cspell.json` canonical words for engine contract vocabulary.
4. Add `scripts/validate-glossary-usage.cjs`.
5. Add `scripts/validate-idempotency-vectors.cjs`.
6. Add `scripts/validate-references.cjs`.
7. Add `scripts/generate-contract-index.cjs`.
8. Add `scripts/validate-rfc2119.cjs`.
9. Wire these checks into `.github/workflows/contracts.yml` with phase-based severities.

---

## 12) Quick Start for Contract Contributors

### First-time setup

```bash
pnpm install
pnpm validate:contracts
```

### Daily workflow

1. Update contract `.md` files.
2. Run local validation.
3. Commit (hooks run automatically).
4. Open PR (CI contract gates enforce policy).

### Common remediation

- Terminology issue: fix against glossary canonical terms.
- Broken link: update path/versioned filename.
- Idempotency mismatch: update vectors or formula implementation per RunEvents contract.

---

## 13) References

- `package.json`
- `scripts/validate-contracts.cjs`
- `.github/workflows/contracts.yml`
- `docs/architecture/engine/contracts/engine/GlossaryContract.v1.md`
- `docs/architecture/engine/contracts/engine/RunEvents.v1.md`
- `docs/architecture/engine/contracts/engine/IWorkflowEngine.v1.md`
