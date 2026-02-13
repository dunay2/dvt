# Quality Assurance Summary

This document provides a comprehensive overview of all quality assurance tools and processes configured for the DVT project.

## 🎯 Overview

The DVT project implements a **multi-layered quality assurance strategy** ensuring code quality, consistency, and deterministic behavior across the workflow engine.

---

## 🛠️ Quality Tools Configured

### 1. Code Quality & Linting

#### ESLint

- **Config**: [`.eslintrc.json`](../../.eslintrc.json)
- **Purpose**: TypeScript code quality and determinism enforcement
- **Key Rules**:
  - No `Date.now()` in engine code (use `workflow.now()`)
  - No `Math.random()` (use seeded RNG)
  - No `setTimeout`/`setInterval` in workflows
  - Strict type checking
  - Import organization
- **Run**: `pnpm lint`

#### Prettier

- **Config**: [`.prettierrc.json`](../../.prettierrc.json)
- **Purpose**: Consistent code formatting
- **Features**:
  - Single quotes, 100 char width
  - Trailing commas (ES5)
  - Auto-formatting on commit
- **Run**: `pnpm format`

#### Markdownlint

- **Config**: [`.markdownlint.json`](../../.markdownlint.json)
- **Purpose**: Documentation quality
- **Run**: `pnpm lint:md`

### 2. Testing

#### Vitest

- **Config**: [`vitest.config.ts`](../../vitest.config.ts)
- **Coverage Requirements**: 80%+ (lines, statements, functions, branches)
- **Features**:
  - Native TypeScript and ESM support
  - Fast execution with Vite-powered transforms
  - Mock Temporal SDK for determinism tests
  - Coverage reports (HTML, LCOV, JSON) via v8 provider
- **Run**:
  - `pnpm test` - Run all tests
  - `pnpm test:coverage` - With coverage
  - `pnpm test:watch` - Watch mode
  - `pnpm test:engine` - Run engine tests (includes determinism)

**Exception policy**:

- If a package truly requires Jest, isolate it in its own workspace to avoid duplicated config and tooling drift.

### 3. Type Safety

#### TypeScript

- **Config**: [`tsconfig.json`](../../tsconfig.json)
- **Settings**:
  - Strict mode enabled
  - ES2022 target
  - Path aliases (@dvt/engine, @dvt/contracts, @dvt/adapters)
- **Run**: `pnpm type-check`

### 4. Git Workflow

#### Husky (Git Hooks)

- **Pre-commit**: Runs lint-staged (ESLint + Prettier)
- **Commit-msg**: Validates conventional commit format
- **Config**: [`.husky/`](../../.husky/)

#### Lint-Staged

- **Auto-fixes** TypeScript and formats files before commit
- **Config**: [`package.json`](../../package.json) `lint-staged` section

#### Commitlint

- **Config**: [`commitlint.config.cjs`](../../commitlint.config.cjs)
- **Enforces**: Conventional Commits format
- **Valid types**: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert

### 5. Versioning & Releases

#### Standard-Version

- **Config**: [`.versionrc.json`](../../.versionrc.json)
- **Features**:
  - Automated semantic versioning
  - Changelog generation from commits
  - Git tag creation
- **Run**:
  - `pnpm release` - Auto-detect version bump
  - `pnpm release:major` - Major version
  - `pnpm release:minor` - Minor version
  - `pnpm release:patch` - Patch version

### 6. Dependency Management

#### Dependabot

- **Config**: [`.github/dependabot.yml`](../../.github/dependabot.yml)
- **Features**:
  - Weekly automated dependency updates
  - Grouped updates (TypeScript, testing, linting, Temporal)
  - Ignores major version bumps for critical deps
- **Targets**: npm packages & GitHub Actions

---

## 🔄 GitHub Actions (CI/CD)

### Workflows

| Workflow                                                             | Purpose                 | Triggers             | Key Checks                                               |
| -------------------------------------------------------------------- | ----------------------- | -------------------- | -------------------------------------------------------- |
| [`test.yml`](../../.github/workflows/test.yml)                       | Run test suite          | PR, push to main     | Vitest tests, coverage (Node 18 & 20), determinism tests |
| [`ci.yml`](../../.github/workflows/ci.yml)                           | Code quality checks     | PR, push to main     | ESLint, Prettier, TypeScript, markdown lint              |
| [`contracts.yml`](../../.github/workflows/contracts.yml)             | Contracts & determinism | PR, push to main     | Schema validation, determinism scan, golden paths        |
| [`golden-paths.yml`](../../.github/workflows/golden-paths.yml)       | Golden path validation  | Path-triggered, push | Contract fixture and plan validation                     |
| [`pr-quality-gate.yml`](../../.github/workflows/pr-quality-gate.yml) | PR quality gate         | PR opened/updated    | PR title, size, description                              |
| [`release.yml`](../../.github/workflows/release.yml)                 | Create releases         | Push to main, manual | Version bump, changelog, GitHub release                  |

### Branch Protection (Recommended Setup)

Configure in GitHub Settings → Branches → Add rule:

- ✅ Require pull request before merging
- ✅ Require status checks to pass:
  - `test` (Run Tests)
  - `eslint` (ESLint)
  - `prettier` (Prettier Format Check)
  - `typescript` (TypeScript Type Check)
  - `markdown-lint` (Lint Markdown Syntax)
  - `determinism-lint` (Determinism Linting Rules)
- ✅ Require conversation resolution before merging
- ✅ Do not allow bypassing the above settings

### Code Owners

- **Config**: [`.github/CODEOWNERS`](../../.github/CODEOWNERS)
- **Auto-assigns** reviewers based on file paths
- **High scrutiny** for:
  - `/docs/architecture/engine/contracts/` (normative contracts)
  - `/packages/engine/src/` (determinism-critical code)
  - `/packages/contracts/` (shared contract package)

---

## 📊 Quality Metrics

### Coverage Requirements

| Metric     | Threshold | Current                        |
| ---------- | --------- | ------------------------------ |
| Lines      | 80%       | TBD (run `pnpm test:coverage`) |
| Statements | 80%       | TBD                            |
| Functions  | 80%       | TBD                            |
| Branches   | 80%       | TBD                            |

### PR Size Guidelines

- ✅ **Small** (< 200 lines): Ideal
- ⚠️ **Medium** (200-500 lines): Acceptable
- ❌ **Large** (> 500 lines): Blocked by PR quality gate

---

## 🚀 Quick Commands

### Development

```bash
# Setup
pnpm install
pnpm prepare              # Setup Git hooks

# Quality checks
pnpm lint                 # ESLint
pnpm format:check         # Prettier check
pnpm type-check           # TypeScript
pnpm test                     # Run tests

# Auto-fix
pnpm lint:fix             # Fix ESLint issues
pnpm format               # Format code

# All checks (pre-commit)
./dev.sh check               # Run all quality checks
./dev.sh fix                 # Auto-fix issues
```

### Release

```bash
pnpm release:dry-run      # Preview changes
pnpm release:patch        # Patch version (0.0.X)
pnpm release:minor        # Minor version (0.X.0)
pnpm release:major        # Major version (X.0.0)
```

---

## 📝 Documentation

- [`Contributing Guide`](../../CONTRIBUTING.md)
- [`Commit Convention`](../../.github/COMMIT_CONVENTION.md)
- [`Changelog`](../../CHANGELOG.md)

---

## ✅ Checklist for New Contributors

Before submitting your first PR:

- [ ] Read [`CONTRIBUTING.md`](../../CONTRIBUTING.md)
- [ ] Setup development environment: `pnpm install && pnpm prepare`
- [ ] Run quality checks: `./dev.sh check`
- [ ] Write tests for new features (maintain 80%+ coverage)
- [ ] Follow [`COMMIT_CONVENTION.md`](../../.github/COMMIT_CONVENTION.md)
- [ ] Ensure all CI checks pass
- [ ] Keep PR focused (< 500 lines preferred)

---

**Last Updated**: 2026-02-13
**Maintained By**: @dunay2
