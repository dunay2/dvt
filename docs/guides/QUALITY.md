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

#### Testing quality practices & tooling backlog

These practices were identified to improve test reliability, signal quality, and confidence in CI.

- **Coverage gates in CI (per package and global)**
  - **Goal**: Enforce minimum coverage thresholds in CI (not only local guidance).
  - **Practice**: Require line/branch/function thresholds and block merges on regressions.
- **Mutation testing (Stryker)**
  - **Goal**: Measure test effectiveness (not just code coverage).
  - **Practice**: Start with engine core and adapter boundary modules.
- **Flaky test detection and quarantine workflow**
  - **Goal**: Detect nondeterministic tests early.
  - **Practice**: Retry matrix + flaky tagging + mandatory follow-up issue.
- **Contract test expansion (consumer/provider boundaries)**
  - **Goal**: Guarantee compatibility between engine, adapters, and CLI-facing contracts.
  - **Practice**: Validate schema evolution and backward compatibility on pull requests.
- **Test data builders and deterministic fixtures**
  - **Goal**: Reduce brittle tests and improve readability.
  - **Practice**: Prefer reusable builders over ad-hoc inline fixtures.
- **Time-control policy for async/integration tests**
  - **Goal**: Prevent race conditions and lifecycle leaks in Temporal/time-skipping tests.
  - **Practice**: Standardize worker/client teardown and explicit clock control.

#### Suggested adoption order (testing)

1. CI coverage gates + regression blocking
2. Flaky test detection workflow
3. Deterministic fixture/builders standard
4. Contract test expansion in adapter boundaries
5. Mutation testing on critical modules

#### Fit assessment: proposed practices and toolchain

| Proposal                                | Fit for DVT | Recommendation                 | Notes                                                                     |
| --------------------------------------- | ----------- | ------------------------------ | ------------------------------------------------------------------------- |
| Trunk-Based Development + small PRs     | High        | Adopt now                      | Aligns with current PR quality gate and reduces merge drift/conflicts.    |
| Conventional Commits + SemVer           | High        | Keep and enforce               | Already aligned with commitlint and release governance.                   |
| ADRs for architecture decisions         | High        | Adopt now                      | Add a lightweight ADR template and link it from architecture docs.        |
| DORA metrics + SLO/error budget mindset | Medium-High | Adopt in hardening phase       | Start with lead time and change failure rate using CI/deploy data.        |
| Husky + lint-staged + commitlint        | High        | Keep                           | Already configured in repository workflow.                                |
| Changesets for monorepo releases        | Medium      | Defer (decision needed)        | Current direction is release-please; avoid dual release systems.          |
| Renovate for dependency updates         | Medium-High | Optional migration             | Dependabot is active; migrate only if advanced grouping/rules are needed. |
| pnpm workspaces                         | High        | Keep                           | Already foundational in this monorepo.                                    |
| Nx/Turborepo (cache/distributed tasks)  | Medium      | Defer                          | Introduce when CI duration/package graph complexity justifies it.         |
| Playwright for E2E/UI                   | High        | Adopt now                      | Strong fit for golden-path browser validation.                            |
| MSW for network mocking                 | High        | Adopt now                      | Improves realism and isolation for frontend/integration tests.            |
| OpenTelemetry                           | High        | Adopt by stages                | Already in observability backlog; define minimum instrumentation first.   |
| OWASP ASVS                              | High        | Adopt now (checklist baseline) | Use as verification baseline for app/service security controls.           |
| SLSA                                    | Medium-High | Adopt incrementally            | Start with provenance and build integrity controls.                       |
| Sigstore                                | Medium-High | Adopt with release hardening   | Pair with SLSA milestones for artifact signing and verification.          |

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

### 7. Security, Auditability & Governance Tooling Backlog

This section tracks recommended tooling to strengthen secure delivery, auditable releases, and architecture governance.

#### Priority A (Immediate)

- **release-please**
  - **Goal**: Replace legacy release flow and standardize changelog/release automation.
  - **Status**: Planned migration (see repo issues).
- **CodeQL**
  - **Goal**: Static application security testing (SAST) in CI.
- **gitleaks**
  - **Goal**: Detect credential/secret leaks in commits and pull requests.
- **Trivy** or **OSV-Scanner**
  - **Goal**: Dependency vulnerability scanning with CI gate support.

#### Priority B (Near-term hardening)

- **dependency-cruiser**
  - **Goal**: Enforce module/layer boundaries and prevent forbidden imports.
- **Semgrep**
  - **Goal**: Add custom security and determinism rules for engine/runtime code.
- **Syft + Grype**
  - **Goal**: Generate SBOM and scan generated inventories for vulnerabilities.

#### Priority C (Maintainability)

- **knip**
  - **Goal**: Detect unused files/exports/dependencies and reduce dead code.
- **markdown-link-check**
  - **Goal**: Catch broken links in docs.
- **cspell**
  - **Goal**: Improve documentation quality and reduce review noise.

#### Telemetry & Observability backlog

- **OpenTelemetry (OTel SDK + Collector)**
  - **Goal**: Unified traces, metrics, and logs across engine/adapters/CLI.
- **Prometheus + Grafana**
  - **Goal**: Time-series monitoring dashboards and SLO/SLA tracking.
- **Loki + Tempo**
  - **Goal**: Correlate logs and traces with run/tenant/correlation IDs.
- **Sentry**
  - **Goal**: Error tracking with release-aware alerting and stack trace grouping.
- **Alertmanager**
  - **Goal**: Route and deduplicate alerts by severity and ownership.

#### Telemetry minimum standard (when enabled)

- Trace IDs and correlation IDs MUST be propagated across API → Engine → Adapter boundaries.
- Metrics MUST include, at minimum: error rate, latency p95/p99, throughput, queue lag, and retry counts.
- Logs MUST be structured and tenant-safe (no secrets/PII leakage).
- Dashboards and alerts MUST map to runbooks and severity policy.

#### Suggested rollout order

1. `release-please`
2. `CodeQL` + `gitleaks` + (`Trivy` or `OSV-Scanner`)
3. `dependency-cruiser` + `Semgrep`
4. `OpenTelemetry` + `Prometheus/Grafana`
5. `Loki/Tempo` + `Alertmanager` + `Sentry`
6. `Syft + Grype`
7. `knip` + `markdown-link-check` + `cspell`

#### Notes

- Treat this section as a governance backlog for quality/security tooling.
- Promote each tool from backlog to "configured" only after CI integration and documented usage.

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
