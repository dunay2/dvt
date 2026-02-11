# Quality Assurance Summary

This document provides a comprehensive overview of all quality assurance tools and processes configured for the DVT project.

## 🎯 Overview

The DVT project implements a **multi-layered quality assurance strategy** ensuring code quality, consistency, and deterministic behavior across the workflow engine.

---

## 🛠️ Quality Tools Configured

### 1. Code Quality & Linting

#### ESLint
- **Config**: [.eslintrc.json](.eslintrc.json)
- **Purpose**: TypeScript code quality and determinism enforcement
- **Key Rules**:
  - No `Date.now()` in engine code (use `workflow.now()`)
  - No `Math.random()` (use seeded RNG)
  - No `setTimeout`/`setInterval` in workflows
  - Strict type checking
  - Import organization
- **Run**: `npm run lint`

#### Prettier
- **Config**: [.prettierrc.json](.prettierrc.json)
- **Purpose**: Consistent code formatting
- **Features**:
  - Single quotes, 100 char width
  - Trailing commas (ES5)
  - Auto-formatting on commit
- **Run**: `npm run format`

#### Markdownlint
- **Config**: [.markdownlint.json](.markdownlint.json)
- **Purpose**: Documentation quality
- **Run**: `npm run lint:md`

### 2. Testing

#### Vitest (Standard)
- **Coverage Requirements**: 80%+ (lines, statements, functions, branches)
- **Features**:
  - Fast test execution (Vite-powered)
  - Native ESM + TypeScript support
  - Coverage reports (HTML, LCOV, JSON)
- **Run**: 
  - `npm test` - Run all tests
  - `npm run test:coverage` - With coverage
  - `npm run test:watch` - Watch mode

**Exception policy**:
- If a package truly requires Jest, isolate it in its own workspace to avoid duplicated config and tooling drift.

### 3. Type Safety

#### TypeScript
- **Config**: [tsconfig.json](tsconfig.json)
- **Settings**:
  - Strict mode enabled
  - ES2022 target
  - Path aliases (@dvt/engine, @dvt/contracts, @dvt/adapters)
- **Run**: `npm run type-check`

### 4. Git Workflow

#### Husky (Git Hooks)
- **Pre-commit**: Runs lint-staged (ESLint + Prettier)
- **Commit-msg**: Validates conventional commit format
- **Config**: [.husky/](.husky/)

#### Lint-Staged
- **Auto-fixes** TypeScript and formats files before commit
- **Config**: [package.json](package.json) `lint-staged` section

#### Commitlint
- **Config**: [commitlint.config.js](commitlint.config.js)
- **Enforces**: Conventional Commits format
- **Valid types**: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert

### 5. Versioning & Releases

#### Standard-Version
- **Config**: [.versionrc.json](.versionrc.json)
- **Features**:
  - Automated semantic versioning
  - Changelog generation from commits
  - Git tag creation
- **Run**:
  - `npm run release` - Auto-detect version bump
  - `npm run release:major` - Major version
  - `npm run release:minor` - Minor version
  - `npm run release:patch` - Patch version

### 6. Dependency Management

#### Dependabot
- **Config**: [.github/dependabot.yml](.github/dependabot.yml)
- **Features**:
  - Weekly automated dependency updates
  - Grouped updates (TypeScript, testing, linting, Temporal)
  - Ignores major version bumps for critical deps
- **Targets**: npm packages & GitHub Actions

---

## 🔄 GitHub Actions (CI/CD)

### Workflows

| Workflow | Purpose | Triggers | Key Checks |
|----------|---------|----------|------------|
| [test.yml](.github/workflows/test.yml) | Run test suite | PR, push to main | Vitest tests, coverage (Node 18 & 20) |
| [code-quality.yml](.github/workflows/code-quality.yml) | Code quality checks | PR, push to main | ESLint, Prettier, TypeScript, security audit |
| [markdown_lint.yml](.github/workflows/markdown_lint.yml) | Documentation validation | PR, push to main | Markdown linting |
| [determinism.yml](.github/workflows/determinism.yml) | Determinism checks | PR, push to main | Forbidden patterns (Date.now, Math.random) |
| [validate_contracts.yml](.github/workflows/validate_contracts.yml) | Contract validation | PR, push to main | JSON Schema validation |
| [pr-quality-gate.yml](.github/workflows/pr-quality-gate.yml) | PR quality gate | PR opened/updated | PR title, size, description |
| [release.yml](.github/workflows/release.yml) | Create releases | Push to main, manual | Version bump, changelog, GitHub release |

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

- **Config**: [.github/CODEOWNERS](.github/CODEOWNERS)
- **Auto-assigns** reviewers based on file paths
- **High scrutiny** for:
  - `/docs/architecture/engine/contracts/` (normative contracts)
  - `/engine/core/` (determinism-critical code)
  - `/contracts/` (JSON schemas)

---

## 📊 Quality Metrics

### Coverage Requirements

| Metric | Threshold | Current |
|--------|-----------|---------|
| Lines | 80% | TBD (run `npm run test:coverage`) |
| Statements | 80% | TBD |
| Functions | 80% | TBD |
| Branches | 80% | TBD |

### PR Size Guidelines

- ✅ **Small** (< 200 lines): Ideal
- ⚠️ **Medium** (200-500 lines): Acceptable
- ❌ **Large** (> 500 lines): Blocked by PR quality gate

---

## 🚀 Quick Commands

### Development

```bash
# Setup
npm install
npm run prepare              # Setup Git hooks

# Quality checks
npm run lint                 # ESLint
npm run format:check         # Prettier check
npm run type-check           # TypeScript
npm test                     # Run tests

# Auto-fix
npm run lint:fix             # Fix ESLint issues
npm run format               # Format code

# All checks (pre-commit)
./dev.sh check               # Run all quality checks
./dev.sh fix                 # Auto-fix issues
```

### Release

```bash
npm run release:dry-run      # Preview changes
npm run release:patch        # Patch version (0.0.X)
npm run release:minor        # Minor version (0.X.0)
npm run release:major        # Major version (X.0.0)
```

---

## 📝 Documentation

- [Contributing Guide](CONTRIBUTING.md)
- [Commit Convention](.github/COMMIT_CONVENTION.md)
- [Changelog](CHANGELOG.md)

---

## ✅ Checklist for New Contributors

Before submitting your first PR:

- [ ] Read [CONTRIBUTING.md](CONTRIBUTING.md)
- [ ] Setup development environment: `npm install && npm run prepare`
- [ ] Run quality checks: `./dev.sh check`
- [ ] Write tests for new features (maintain 80%+ coverage)
- [ ] Follow [Conventional Commits](.github/COMMIT_CONVENTION.md)
- [ ] Ensure all CI checks pass
- [ ] Keep PR focused (< 500 lines preferred)

---

**Last Updated**: 2026-02-11  
**Maintained By**: @dunay2
