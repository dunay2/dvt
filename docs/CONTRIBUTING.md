# Contributing to DVT Engine Documentation

This guide explains how to contribute to the DVT Workflow Engine documentation,
including normative contracts, runbooks, and architectural decisions.

---

## Table of Contents

1. [Documentation Structure](#documentation-structure)
2. [Code Owners & Review Process](#code-owners--review-process)
3. [CI/CD Quality Gates](#cicd-quality-gates)
4. [Normative Contract Guidelines](#normative-contract-guidelines)
5. [Versioning Policy](#versioning-policy)

---

## Documentation Structure

Markdown documentation MUST live under `docs/` unless it is an explicit
repository-level surface such as the root `README.md`, `AGENTS.md`, or a GitHub
template under `.github/`. Do not place Markdown notes, reviews, or design docs
inside code directories such as `apps/**/src/**`, `apps/**/test/**`,
`packages/**/src/**`, or `packages/**/test/**`; move that prose into the
canonical docs tree instead.

```text
docs/
+-- architecture/
Ã‚Â¦   +-- components/engine/
Ã‚Â¦   Ã‚Â¦   +-- index.md                  # Engine navigation hub
Ã‚Â¦   Ã‚Â¦   +-- contracts/
Ã‚Â¦   Ã‚Â¦   Ã‚Â¦   +-- VERSIONING.md         # Active engine-runtime versioning policy
Ã‚Â¦   Ã‚Â¦   Ã‚Â¦   +-- index.md              # Contract-family landing page
Ã‚Â¦   Ã‚Â¦   Ã‚Â¦   +-- README.md             # Engine-runtime contract pack registry
Ã‚Â¦   Ã‚Â¦   Ã‚Â¦   +-- engine/
Ã‚Â¦   Ã‚Â¦   Ã‚Â¦   Ã‚Â¦   +-- IWorkflowEngine.v1.md
Ã‚Â¦   Ã‚Â¦   Ã‚Â¦   Ã‚Â¦   +-- IProviderAdapter.v1.md
Ã‚Â¦   Ã‚Â¦   Ã‚Â¦   Ã‚Â¦   +-- RunEvents.v1.md
Ã‚Â¦   Ã‚Â¦   Ã‚Â¦   Ã‚Â¦   +-- ExecutionSemantics.v1.md
Ã‚Â¦   Ã‚Â¦   Ã‚Â¦   Ã‚Â¦   +-- SignalsAndAuth.v1.md
Ã‚Â¦   Ã‚Â¦   Ã‚Â¦   +-- capabilities/
Ã‚Â¦   Ã‚Â¦   Ã‚Â¦   +-- state-store/
Ã‚Â¦   Ã‚Â¦   +-- adapters/
Ã‚Â¦   Ã‚Â¦   +-- ops/
Ã‚Â¦   Ã‚Â¦   +-- roadmap/
+-- runbooks/
+-- adr/
```

---

## Code Owners & Review Process

### Required Reviewers (Automated via `.github/CODEOWNERS`)

Changes to different documentation areas require specific team approvals:

- `docs/architecture/components/engine/contracts/`: `@your-org/architecture-team`
  for normative contracts
- `docs/architecture/components/engine/contracts/VERSIONING.md`:
  `@your-org/architecture-team` for contract evolution policy
- `docs/architecture/components/engine/contracts/engine/ExecutionSemantics.v*.md`:
  `@your-org/architecture-team` and `@your-org/engine-leads` for core
  execution semantics
- `docs/architecture/components/engine/contracts/engine/IWorkflowEngine.v*.md`:
  `@your-org/architecture-team` and `@your-org/sdk-team` for the SDK
  interface
- `docs/architecture/components/engine/contracts/adapters/`:
  `@your-org/architecture-team` and `@your-org/platform-integrations` for
  multi-platform compatibility
- `docs/runbooks/`: `@your-org/sre-team` and `@your-org/architecture-team`
  for operational procedures
- `docs/roadmap/`: `@your-org/product-leads` and `@your-org/engineering-leads`
  for strategic planning
- `.github/workflows/`: `@your-org/devops-team` for CI/CD pipeline changes

### Setting Up Code Owners

**First-time setup** (if your org doesn't have GitHub teams yet):

1. Edit `.github/CODEOWNERS`
2. Replace `@your-org/architecture-team` with individual GitHub handles:

   ```text
   /docs/architecture/components/engine/contracts/   @alice @bob @charlie
   ```

3. Commit and push

**For established orgs**:

1. Go to **Settings ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Teams** in your GitHub org
2. Create teams: `architecture-team`, `engine-leads`, `sre-team`, etc.
3. Add members to each team
4. CODEOWNERS will automatically route reviews

---

## CI/CD Quality Gates

Every PR goes through **4 automated validation stages** before merge:

### PR metadata gate (required before rerun)

Before rerunning failed PR checks, verify PR metadata first. The workflow
[`pr-quality-gate.yml`](../.github/workflows/pr-quality-gate.yml) fails if these
rules are not met:

Canonical operator workflow:

- [PR Preflight And CI Triage](./guides/pr-preflight-and-ci-triage.md)

1. **PR title must use Conventional Commits format**
   - Required shape: `<type>: <Subject>`
   - Allowed types are defined in
     [`Check PR title follows Conventional Commits`](../.github/workflows/pr-quality-gate.yml).
   - Current policy requires subject to start with uppercase (pattern `^[A-Z].+$`).
   - Example: `chore: Safe integrate pr85`

1. **PR description must be present and long enough**
   - Minimum body length: 50 characters.
   - Include at least: summary, concrete changes, and validation evidence.

1. **Operational procedure for agents (mandatory order)**
   - Read failed job logs first (do not assume cause).
   - Fix title/body with `gh pr edit`.
   - Re-run checks only after metadata is corrected.
   - Confirm state with `gh pr checks` until all required checks are green.

For local execution, the default path is:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\hygiene.ps1 -BaseBranch main -Preflight -SliceCommand "<slice command>"
powershell -ExecutionPolicy Bypass -File .\scripts\hygiene.ps1 -LogFirstTriage
```

**Tool**: `markdownlint-cli2`  
**Workflow**: `.github/workflows/markdown_lint.yml`  
**Checks**:

- Table formatting
- Heading structure
- Consistent list indentation
- Link syntax

**Fix failures**:

```bash
# Install markdownlint CLI
npm install -g markdownlint-cli2

# Run locally before pushing
markdownlint-cli2 "docs/**/*.md"
```

### 2ÃƒÂ¯Ã‚Â¸Ã‚ÂÃƒÂ¢Ã†â€™Ã‚Â£ TypeScript Code Block Validation

**Tool**: `tsc` (TypeScript compiler)  
**Workflow**: `.github/workflows/markdown_lint.yml` (job: `validate-typescript-blocks`)  
**Checks**:

- Extracts all `\`\`\`ts`and`\`\`\`typescript` blocks from Markdown
- Compiles each with `tsc --noEmit --skipLibCheck`
- Validates syntax (catches typos, missing brackets, etc.)

**Fix failures**:

````bash
# Extract TypeScript blocks manually
sed -n '/```ts/,/```/p' docs/architecture/components/engine/contracts/engine/IWorkflowEngine.v1.md | sed '1d;$d' > /tmp/test.ts

# Validate with tsc
npx tsc --noEmit --skipLibCheck /tmp/test.ts
````

### 3ÃƒÂ¯Ã‚Â¸Ã‚ÂÃƒÂ¢Ã†â€™Ã‚Â£ Internal Link Validation

**Tool**: `markdown-link-check`  
**Workflow**: `.github/workflows/markdown_lint.yml` (job: `validate-internal-links`)  
**Checks**:

- All relative link targets resolve to existing files
- Anchor links (e.g., `#section-heading`) exist in target files

**Fix failures**:

```bash
# Check links locally
npm install -g markdown-link-check
markdown-link-check docs/architecture/components/engine/index.md
```

**Common causes**:

- Typo in filename: `IWorkflowEngine.v1.md` vs `IProviderAdapter.v1.md`
- Incorrect relative path: `../contracts/` vs `../../contracts/`
- Broken anchor: `#section-1` but heading is actually `## Section 1.0`

### 4ÃƒÂ¯Ã‚Â¸Ã‚ÂÃƒÂ¢Ã†â€™Ã‚Â£ Normative Contract Structure Validation

**Tool**: Custom Bash script  
**Workflow**: `.github/workflows/markdown_lint.yml` (job: `validate-normative-contracts`)  
**Checks** (for files matching `*.v[0-9]*.md`):

- ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Has `**Status**:` field
- ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Has `**Version**:` field
- ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Has `## Change Log` section
- ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Has reference to `VERSIONING.md`
- ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Uses normative language (`MUST`, `MUST NOT`)

**Fix failures**:

See [Normative Contract Template](#normative-contract-template) below.

---

## Normative Contract Guidelines

### What is a Normative Contract?

A **normative contract** is a binding specification that:

- Uses RFC 2119 keywords (`MUST`, `SHOULD`, `MAY`)
- Defines invariants, APIs, or behavior that implementations MUST conform to
- Has an explicit version number (e.g., `v1.0`, `v2.1`)
- Tracks changes via a `## Change Log` section

**Examples**:

- ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ `IWorkflowEngine.v1.md` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â defines SDK interface
- ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ `ExecutionSemantics.v1.md` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â defines StateStore model
- ÃƒÂ¢Ã‚ÂÃ…â€™ `observability.md` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â operational guide (informative, not normative)

### Normative Contract Template

When creating a new versioned contract (e.g., `MyContract.v1.md`):

```markdown
# MyContract (Normative v1.0)

**Status**: Normative (MUST / MUST NOT)  
**Version**: 1.0  
**Stability**: [Core | Experimental | Deprecated]  
**Consumers**: [List who depends on this: Engine, SDK, Adapter, etc.]

**References**:
Contract Versioning Policy: `../../VERSIONING.md`  
Related Contract: `./OtherContract.v1.md`

---

## 1) Problem Statement

What problem does this contract solve?

## 2) Normative Requirements

### 2.1 Requirement Category

**MUST**: ...

**MUST NOT**: ...

**SHOULD**: ...

---

## Schema Evolution (Versioning)

Changes to the active engine-runtime contract pack follow the current
pre-stable reset policy (see `../../VERSIONING.md`):

- one live `v1` file per active engine-runtime topic
- semantic changes rewrite that `v1` file in place
- sibling `v1.1`, `v2`, `reference`, and migration companions are removed in
  the same slice

---

## Change Log

| Version | Date       | Change                     |
| ------- | ---------- | -------------------------- |
| 1.0     | YYYY-MM-DD | Initial normative contract |
```

### When to Create a New Version

For the active engine-runtime pack, do not create a second file generation
while the repository remains pre-stable.

Quick reference:

| Change Type                        | File Action                                                                                                      |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Clarify wording                    | Edit `MyContract.v1.md` in place and update the changelog                                                        |
| Add or remove behavior             | Rewrite `MyContract.v1.md` in place and update registries, ADR links, and diagrams in the same slice             |
| Remove or rename methods or events | Rewrite `MyContract.v1.md` in place and remove any sibling file that would preserve a second active reading path |

---

## Versioning Policy

**Critical reading**: [VERSIONING.md](./architecture/components/engine/contracts/VERSIONING.md)

### File Naming Convention

| Filename                 | Meaning                                          |
| ------------------------ | ------------------------------------------------ |
| `IWorkflowEngine.v1.md`  | Single active pre-stable contract for that topic |
| `IProviderAdapter.v1.md` | Single active pre-stable contract for that topic |

### Git history

Pre-stable contract history is preserved by git commits. Do not create parallel
contract generations or deprecation banners inside the active tree.

## Local Development Workflow

### Pre-commit Checklist

Before pushing your branch:

```bash
# 1. Lint Markdown
markdownlint-cli2 "docs/**/*.md"

# 2. Check internal links
markdown-link-check docs/architecture/components/engine/index.md

# 3. Validate TypeScript snippets (if you added code blocks)
# (Extract block manually and run tsc --noEmit)

# 4. Preview rendering (VS Code)
# Open .md file ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Press Ctrl+Shift+V (Windows) or Cmd+Shift+V (Mac)
```

### Troubleshooting: ESLint / TypeScript parser errors ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â

If CI shows errors like `@typescript-eslint/parser` complaining that files listed in `parserOptions.project` cannot be found (for example `packages/engine/legacy-top-level-engine/...`), clean up stale references using the steps below.

---

### Tooling config convention (single-config per tool)

To reduce duplication and prevent CJS/TS mismatch issues, follow these rules:

- One config file per tool per package (e.g. `packages/foo/vitest.config.ts` or `packages/foo/vitest.config.cjs`), not duplicated in CJS + TS.
- Add the actual Vitest config filename (`vitest.config.ts` or `vitest.config.cjs`) to the package `tsconfig.json` `include` when present so ESLint can parse it.
- Prefer a shared `tsconfig.eslint.base.json` (root) and extend it with a small `packages/<pkg>/tsconfig.eslint.json` when package-specific includes are required.
- Do not create multiple runtime/testing configs for the same package (this prevents ESM/CommonJS resolution errors in CI).

Example: `packages/adapter-temporal/tsconfig.json` should include `"vitest.config.cjs"` and a package-level `tsconfig.eslint.json` should `extends` the repo base.

1. Inspect the failing ESLint/TypeScript config referenced in the error log (`parserOptions.project` / `tsconfig.json`).
2. Remove or update any `include` / `files` entries that point to deleted or moved folders (e.g. `legacy-*`).

   Example ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â remove stale legacy entry from `tsconfig.json`:

   ```json
   {
     "include": [
       "packages/*/src/**/*.ts"
       // "packages/engine/legacy-top-level-engine/src/**"  <-- remove stale reference
     ]
   }
   ```

3. Ensure ESLint is not explicitly targeting removed code (check `eslint.config.cjs` / `.eslintrc.*`).
4. Search for lingering imports or test references and update/remove them:

```bash
git grep -n "legacy-top-level-engine" || true
```

1. Run linter auto-fix for ordering/spacing issues and re-run CI:

```bash
pnpm lint --fix
# or
npx eslint . --ext .ts --fix
```

1. Commit the cleanup and re-run CI.

This prevents `@typescript-eslint/parser` from failing when it resolves `tsconfig` file lists and keeps CI green.

### VS Code Extensions (Recommended)

Install these for real-time validation:

- **markdownlint** (`DavidAnson.vscode-markdownlint`) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â highlights Markdown errors
- **Markdown All in One** (`yzhang.markdown-all-in-one`) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â TOC generation, link completion
- **Code Spell Checker** (`streetsidesoftware.code-spell-checker`) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â catches typos

---

## Contract Tooling Workflow (Immediate Policy)

Contract quality is enforced by repository automation first, editor tooling second.

### Mandatory checks for contract changes

For changes under `docs/architecture/components/engine/contracts/**`, contributors MUST run:

```bash
pnpm validate:contracts
```

CI remains authoritative through [`contracts.yml`](../.github/workflows/contracts.yml).

### Approved validator rollout (tracked as issues)

The following validator streams are approved and tracked as dedicated GitHub issues:

- Glossary-driven validation (`validate-glossary-usage`)
- Idempotency vectors validation (`validate-idempotency-vectors`)
- Cross-contract references validation (`validate-references`)
- RFC 2119 compliance validation (`validate-rfc2119`)
- Executable examples validation
- Contract index generation automation

### ADR requirement (semantic contract changes)

Contract semantic changes SHOULD include an ADR in `docs/adr/`.

In hardened phase, semantic changes (required fields, event semantics, deprecations)
MUST include an ADR and will be enforced by CI gate.

Reference policy: [`ADR-0006-contract-tooling-governance.md`](./adr/ADR-0006-contract-tooling-governance.md)

---

## FAQ

### Q: I need to fix a typo in a normative contract. Do I create a new file?

**A**: No.

1. Edit the active `v1` file in place
2. Update the changelog if the contract uses one
3. Keep registries and links aligned in the same slice

### Q: I want to add a new optional method to `IWorkflowEngine.v1.md`. Is that a patch or MINOR?

**A**: Edit the active `IWorkflowEngine.v1.md` in place.

1. Add the method
2. Update the changelog if needed
3. Update registries, ADR references, and affected diagrams in the same slice

### Q: How do I deprecate an old contract version?

**A**: In the current pre-stable engine-runtime pack you do not keep old active
versions. Rewrite the canonical `v1` file in place and remove sibling active
files in the same slice.

### Q: CI failed with "Missing **Version** field". How do I fix?

**A**: Your contract file is missing required metadata. Add:

```markdown
**Status**: Normative (MUST / MUST NOT)  
**Version**: 1.0  
**Stability**: Active pre-stable line - rewrite in place  
**Consumers**: Engine, StateStore, Projector
```

### Q: CI failed with "TypeScript validation failed". But it's pseudocode

**A**: Use a different code block type:

- ÃƒÂ¢Ã‚ÂÃ…â€™ `\`\`\`ts`or`\`\`\`typescript` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â will be validated by tsc
- ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ `\`\`\`text` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â skipped by validator
- ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ `\`\`\`pseudo` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â skipped by validator
- ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Add comment at top: `// @ts-nocheck pseudocode`

---

## Support

- **Questions on versioning policy**: Ping `@architecture-team` in GitHub PR
- **CI/CD issues**: Open issue tagged `ci/cd`
- **CODEOWNERS configuration**: Ping `@devops-team`

---

## Additional Resources

- [VERSIONING.md](./architecture/components/engine/contracts/VERSIONING.md) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Complete contract evolution policy
- [index.md](./architecture/components/engine/index.md) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Navigation hub for all engine docs
- [GitHub CODEOWNERS docs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [RFC 2119 (Normative keywords)](https://www.ietf.org/rfc/rfc2119.txt)
