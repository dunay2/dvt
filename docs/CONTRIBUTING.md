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

```text
docs/
├── architecture/engine/
│   ├── INDEX.md                    # Navigation hub
│   ├── VERSIONING.md               # Contract evolution policy (MUST READ)
│   ├── contracts/                  # Normative contracts
│   │   ├── engine/
│   │   │   ├── IWorkflowEngine.v1.1.md
│   │   │   └── ExecutionSemantics.v1.md
│   │   ├── adapters/
│   │   └── capabilities/
│   ├── adapters/                   # Platform integrations
│   ├── ops/                        # Operations & observability
│   ├── dev/                        # Developer tooling
│   └── roadmap/                    # Phases & milestones
├── runbooks/                       # SRE procedures
└── decisions/                      # ADRs (Architecture Decision Records)
```

---

## Code Owners & Review Process

### Required Reviewers (Automated via `.github/CODEOWNERS`)

Changes to different documentation areas require specific team approvals:

| Path                                                                 | Required Reviewers                                                 | Rationale                    |
| -------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------- |
| `docs/architecture/engine/contracts/`                                | `@your-org/architecture-team`                                      | Normative contracts          |
| `docs/VERSIONING.md`                                                 | `@your-org/architecture-team`                                      | Contract evolution policy    |
| `docs/architecture/engine/contracts/engine/ExecutionSemantics.v*.md` | `@your-org/architecture-team`<br>`@your-org/engine-leads`          | Core execution semantics     |
| `docs/architecture/engine/contracts/engine/IWorkflowEngine.v*.md`    | `@your-org/architecture-team`<br>`@your-org/sdk-team`              | SDK interface                |
| `docs/architecture/engine/contracts/adapters/`                       | `@your-org/architecture-team`<br>`@your-org/platform-integrations` | Multi-platform compatibility |
| `docs/runbooks/`                                                     | `@your-org/sre-team`<br>`@your-org/architecture-team`              | Operational procedures       |
| `docs/roadmap/`                                                      | `@your-org/product-leads`<br>`@your-org/engineering-leads`         | Strategic planning           |
| `.github/workflows/`                                                 | `@your-org/devops-team`                                            | CI/CD pipeline changes       |

### Setting Up Code Owners

**First-time setup** (if your org doesn't have GitHub teams yet):

1. Edit `.github/CODEOWNERS`
2. Replace `@your-org/architecture-team` with individual GitHub handles:

   ```text
   /docs/architecture/engine/contracts/   @alice @bob @charlie
   ```

3. Commit and push

**For established orgs**:

1. Go to **Settings → Teams** in your GitHub org
2. Create teams: `architecture-team`, `engine-leads`, `sre-team`, etc.
3. Add members to each team
4. CODEOWNERS will automatically route reviews

---

## CI/CD Quality Gates

Every PR goes through **4 automated validation stages** before merge:

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

### 2️⃣ TypeScript Code Block Validation

**Tool**: `tsc` (TypeScript compiler)  
**Workflow**: `.github/workflows/markdown_lint.yml` (job: `validate-typescript-blocks`)  
**Checks**:

- Extracts all `\`\`\`ts`and`\`\`\`typescript` blocks from Markdown
- Compiles each with `tsc --noEmit --skipLibCheck`
- Validates syntax (catches typos, missing brackets, etc.)

**Fix failures**:

````bash
# Extract TypeScript blocks manually
sed -n '/```ts/,/```/p' docs/architecture/engine/contracts/engine/IWorkflowEngine.v1.1.md | sed '1d;$d' > /tmp/test.ts

# Validate with tsc
npx tsc --noEmit --skipLibCheck /tmp/test.ts
````

### 3️⃣ Internal Link Validation

**Tool**: `markdown-link-check`  
**Workflow**: `.github/workflows/markdown_lint.yml` (job: `validate-internal-links`)  
**Checks**:

- All `[text](relative/path.md)` links resolve to existing files
- Anchor links (e.g., `#section-heading`) exist in target files

**Fix failures**:

```bash
# Check links locally
npm install -g markdown-link-check
markdown-link-check docs/architecture/engine/INDEX.md
```

**Common causes**:

- Typo in filename: `IWorkflowEngine.v1.1.md` vs `IWorkflowEngine.v1.0.md`
- Incorrect relative path: `../contracts/` vs `../../contracts/`
- Broken anchor: `#section-1` but heading is actually `## Section 1.0`

### 4️⃣ Normative Contract Structure Validation

**Tool**: Custom Bash script  
**Workflow**: `.github/workflows/markdown_lint.yml` (job: `validate-normative-contracts`)  
**Checks** (for files matching `*.v[0-9]*.md`):

- ✅ Has `**Status**:` field
- ✅ Has `**Version**:` field
- ✅ Has `## Change Log` section
- ✅ Has reference to `VERSIONING.md`
- ✅ Uses normative language (`MUST`, `MUST NOT`)

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

- ✅ `IWorkflowEngine.v1.1.md` — defines SDK interface
- ✅ `ExecutionSemantics.v1.md` — defines StateStore model
- ❌ `observability.md` — operational guide (informative, not normative)

### Normative Contract Template

When creating a new versioned contract (e.g., `MyContract.v1.md`):

```markdown
# MyContract (Normative v1.0)

**Status**: Normative (MUST / MUST NOT)  
**Version**: 1.0  
**Stability**: [Core | Experimental | Deprecated]  
**Consumers**: [List who depends on this: Engine, SDK, Adapter, etc.]

**References**:
[Contract Versioning Policy](../../VERSIONING.md)  
 [Related Contract](./OtherContract.v1.md)

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

Changes to this contract follow **Semantic Versioning** (see [VERSIONING.md](../../VERSIONING.md)):

**MINOR Bump (v1.0 → v1.1)**: Backward-compatible additions

- ...

**MAJOR Bump (v1.0 → v2.0)**: Breaking changes

- ...

**Patch Update (v1.0.1, v1.0.2, etc.)**: Clarifications only

- ...

---

## Change Log

| Version | Date       | Change                     |
| ------- | ---------- | -------------------------- |
| 1.0     | YYYY-MM-DD | Initial normative contract |
```

### When to Create a New Version

See **[VERSIONING.md](architecture/engine/VERSIONING.md)** for the complete policy. Quick reference:

| Change Type                          | Version Bump | Example       | File Action                               |
| ------------------------------------ | ------------ | ------------- | ----------------------------------------- |
| Add optional field/method            | MINOR        | v1.0 → v1.1   | Create `MyContract.v1.1.md` (keep v1.0)   |
| Clarify wording (no semantic change) | PATCH        | v1.0 → v1.0.1 | Edit in place, update changelog, git tag  |
| Remove required field                | MAJOR        | v1.0 → v2.0   | Create `MyContract.v2.md`, deprecate v1.0 |
| Rename method                        | MAJOR        | v1.0 → v2.0   | Create `MyContract.v2.md`, deprecate v1.0 |

**Deprecation policy**:

- 90-day grace period (clock starts at release tag, not merge to main)
- Add deprecation notice to old version file
- Update `INDEX.md` to point to new version

---

## Versioning Policy

**Critical reading**: [VERSIONING.md](architecture/engine/VERSIONING.md)

### File Naming Convention

| Filename                        | Meaning                                    |
| ------------------------------- | ------------------------------------------ |
| `IWorkflowEngine.v1.1.md`       | MAJOR.MINOR series (v1 = v1.x)             |
| `IWorkflowEngine.v1.1.md`       | MINOR bump (backward-compatible additions) |
| `IWorkflowEngine.v2.md`         | MAJOR bump (breaking changes)              |
| `IWorkflowEngine.v2.0-DRAFT.md` | Draft (targets v2.0 release)               |

### Git Tagging for Patches

**Patch updates** (v1.0 → v1.0.1) do NOT get new files. Instead:

1. Edit `MyContract.v1.md` in place
2. Update `## Change Log` section
3. Increment `**Version**: 1.0.1`
4. Commit with message: `docs: patch ExecutionSemantics.v1 to v1.0.1 (clarify non-contiguous semantics)`
5. Create git tag: `git tag engine/ExecutionSemantics@v1.0.1`
6. Push: `git push origin engine/ExecutionSemantics@v1.0.1`

This keeps file proliferation low while preserving patch history via git tags.

---

## Local Development Workflow

### Pre-commit Checklist

Before pushing your branch:

```bash
# 1. Lint Markdown
markdownlint-cli2 "docs/**/*.md"

# 2. Check internal links
markdown-link-check docs/architecture/engine/INDEX.md

# 3. Validate TypeScript snippets (if you added code blocks)
# (Extract block manually and run tsc --noEmit)

# 4. Preview rendering (VS Code)
# Open .md file → Press Ctrl+Shift+V (Windows) or Cmd+Shift+V (Mac)
```

### Troubleshooting: ESLint / TypeScript parser errors ⚠️

If CI shows errors like `@typescript-eslint/parser` complaining that files listed in `parserOptions.project` cannot be found (for example `packages/engine/legacy-top-level-engine/...`), clean up stale references using the steps below.

---

### Tooling config convention (single-config per tool)

To reduce duplication and prevent CJS/TS mismatch issues, follow these rules:

- One config file per tool per package (e.g. `packages/foo/vitest.config.ts`), not duplicated in CJS + TS.
- Add `vitest.config.ts` to the package `tsconfig.json` `include` when present so ESLint can parse it.
- Prefer a shared `tsconfig.eslint.base.json` (root) and extend it with a small `packages/<pkg>/tsconfig.eslint.json` when package-specific includes are required.
- Do not create multiple runtime/testing configs for the same package (this prevents ESM/CommonJS resolution errors in CI).

Example: `packages/adapter-temporal/tsconfig.json` should include `"vitest.config.ts"` and a package-level `tsconfig.eslint.json` should `extends` the repo base.

1. Inspect the failing ESLint/TypeScript config referenced in the error log (`parserOptions.project` / `tsconfig.json`).
2. Remove or update any `include` / `files` entries that point to deleted or moved folders (e.g. `legacy-*`).

   Example — remove stale legacy entry from `tsconfig.json`:

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

5. Run linter auto-fix for ordering/spacing issues and re-run CI:

```bash
pnpm lint --fix
# or
npx eslint . --ext .ts --fix
```

6. Commit the cleanup and re-run CI.

This prevents `@typescript-eslint/parser` from failing when it resolves `tsconfig` file lists and keeps CI green.

### VS Code Extensions (Recommended)

Install these for real-time validation:

- **markdownlint** (`DavidAnson.vscode-markdownlint`) — highlights Markdown errors
- **Markdown All in One** (`yzhang.markdown-all-in-one`) — TOC generation, link completion
- **Code Spell Checker** (`streetsidesoftware.code-spell-checker`) — catches typos

---

## FAQ

### Q: I need to fix a typo in a normative contract. Do I create a new file?

**A**: No. Typos are **patch updates**:

1. Edit in place
2. Update `**Version**:` field (e.g., `1.0` → `1.0.1`)
3. Add entry to `## Change Log`
4. Git tag: `engine/MyContract@v1.0.1`

### Q: I want to add a new optional method to `IWorkflowEngine.v1.1.md`. Is that a patch or MINOR?

**A**: **MINOR bump** (backward-compatible addition).

1. Create new file: `IWorkflowEngine.v1.1.md`
2. Copy content from `v1.md`
3. Add new method
4. Update `**Version**:` to `1.1`
5. Add changelog entry
6. Update `INDEX.md` to reference both `v1.md` and `v1.1.md`

### Q: How do I deprecate an old contract version?

**A**: See [VERSIONING.md § Deprecation Process](architecture/engine/VERSIONING.md#deprecation-process):

1. Add deprecation banner to old file:

   ```markdown
   > **⚠️ DEPRECATED**: This contract is deprecated as of 2026-02-01.
   > Use [MyContract.v2.md](./MyContract.v2.md) instead.
   > Support ends: 2026-05-01 (90 days after release tag).
   ```

2. Create git tag: `engine/MyContract@v2.0`
3. Grace period: 90 days from tag date
4. After grace period: Remove old file, keep migration guide

### Q: CI failed with "Missing **Version** field". How do I fix?

**A**: Your contract file is missing required metadata. Add:

```markdown
**Status**: Normative (MUST / MUST NOT)  
**Version**: 1.0  
**Stability**: Core semantics — breaking changes require version bump  
**Consumers**: Engine, StateStore, Projector
```

### Q: CI failed with "TypeScript validation failed". But it's pseudocode

**A**: Use a different code block type:

- ❌ `\`\`\`ts`or`\`\`\`typescript` — will be validated by tsc
- ✅ `\`\`\`text` — skipped by validator
- ✅ `\`\`\`pseudo` — skipped by validator
- ✅ Add comment at top: `// @ts-nocheck pseudocode`

---

## Support

- **Questions on versioning policy**: Ping `@architecture-team` in GitHub PR
- **CI/CD issues**: Open issue tagged `ci/cd`
- **CODEOWNERS configuration**: Ping `@devops-team`

---

## Additional Resources

- [VERSIONING.md](architecture/engine/VERSIONING.md) — Complete contract evolution policy
- [INDEX.md](architecture/engine/INDEX.md) — Navigation hub for all engine docs
- [GitHub CODEOWNERS docs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [RFC 2119 (Normative keywords)](https://www.ietf.org/rfc/rfc2119.txt)
