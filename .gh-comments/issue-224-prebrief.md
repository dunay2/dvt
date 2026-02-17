## Think-First Analysis

### Problem summary (facts only)

- The contracts area contains multiple broken internal links and version/path drift.
- Broken links were confirmed with a repository-local markdown link scan limited to `docs/architecture/engine/contracts`.
- Affected files are mostly normative contract docs and contract-adjacent references.

### Constraints and invariants

- Keep scope focused on issue #224 (consistency review), avoid semantic contract rewrites.
- Preserve current normative behavior; fix discoverability/traceability drift only.
- Respect repository versioning policy (patch updates in-place for existing contract files).
- Keep edits reviewable and limited to broken links and path/version consistency.

### Options considered

A) Fix only links that are currently broken.

- Pros: minimal-risk, fast closure of concrete drift.
- Cons: does not fully normalize all naming/version conventions.

B) Fix broken links + normalize all contract versions/headers in one pass.

- Pros: broader cleanup.
- Cons: larger diff, higher risk of accidental semantic drift.

C) Add stub files for missing references (e.g., non-existent draft contracts).

- Pros: preserves existing references.
- Cons: introduces placeholder artifacts without approved content.

### Selected option + rationale

- Selected: **A**.
- Rationale: directly addresses proven inconsistencies with smallest safe change-set and lowest risk.

### Alternatives rejected + why

- Rejected B: exceeds issue-slice objective for this pass and increases review surface.
- Rejected C: would create new normative-looking artifacts without validated content/approval.

### Expected validation evidence

- Re-run local broken-link scan for `docs/architecture/engine/contracts` and confirm zero broken internal links.
- Run markdown lint for touched docs scope.
- Capture command outputs as issue/PR evidence.

---

## Pre-implementation brief

### Suitability

- This approach is suitable because #224 is a consistency review task and the current failures are link/path/version-reference drift.
- It solves concrete navigability defects without changing contract semantics.

### Blockers

- No implementation blockers identified.
- Potential process blocker: whether to create missing draft docs vs. removing unresolved links.

### Opportunities

- Add a reusable markdown-link validation script for contracts docs in CI follow-up.
- Normalize version-reference style in v1/v2 contract families in a separate scoped issue.

### WHAT

- Fix broken internal markdown links in contracts docs.
- Replace non-existent reference links with valid existing references or explicit plain-text pending notes.

### FOR (goal)

- Restore documentation integrity and contract discoverability for engine contracts.

### HOW

1. Patch only broken references detected by scan.
2. Prefer relinking to existing canonical docs.
3. For not-yet-published docs, replace broken links with explicit non-link pending notes.

### WHY

- Chosen for minimal risk and direct acceptance alignment.
- Avoids introducing placeholder documents or broad semantic edits.

### Scope touched

- `docs/architecture/engine/contracts/engine/*.md`
- `docs/architecture/engine/contracts/security/*.md`
- `.gh-comments/issue-224-prebrief.md`

### Risk

- Classification: **Low**.

### Risks & Mitigation

- Risk: accidental semantic wording drift while editing links.
  - Mitigation: change only link targets/text around references.
- Risk: hidden additional broken links outside contracts subtree.
  - Mitigation: keep this issue scoped to contracts; track broader scan separately.

### Impact (affected areas)

- Technical: docs navigation and cross-reference integrity.
- Functional: no runtime behavior impact.
- Operational: easier reviewer and implementer navigation of contract set.

### Validation plan

- Targeted checks: local contracts broken-link scan.
- Broader checks: markdown lint for docs (or touched scope if available).

### Unknowns / maintainer decisions needed

- Whether a dedicated `ApprovalWorkflow` contract should be created as a follow-up issue or kept as pending text until approved.
