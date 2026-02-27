# dvt

[![Tests](https://github.com/dunay2/dvt/actions/workflows/test.yml/badge.svg)](https://github.com/dunay2/dvt/actions/workflows/test.yml)
[![Code Quality](https://github.com/dunay2/dvt/actions/workflows/ci.yml/badge.svg)](https://github.com/dunay2/dvt/actions/workflows/ci.yml)
[![Contracts](https://github.com/dunay2/dvt/actions/workflows/contracts.yml/badge.svg)](https://github.com/dunay2/dvt/actions/workflows/contracts.yml)
[![PR Quality Gate](https://github.com/dunay2/dvt/actions/workflows/pr-quality-gate.yml/badge.svg)](https://github.com/dunay2/dvt/actions/workflows/pr-quality-gate.yml)

Data Value Transform — Multi-adapter orchestration engine.

---

## Immediate Action - First Steps

**New to the project?** Set up the development environment:

```bash
# Install dependencies (pnpm 9+ required)
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

**Installed tools**: Zod (contract validation), PostgreSQL (`pg`, SQL migrations), Vitest (testing).

> See [CONTRIBUTING.md](CONTRIBUTING.md) for the full development setup guide.

---

## Documentation

> **[Documentation Index](docs/INDEX.md)**

### Architecture & Contracts

> **[Engine Architecture Index](docs/architecture/engine/INDEX.md)** — Start here

The engine is documented as **modular, versioned contracts** (not a monolith):

- **Normative contracts** (small, stable, MUST):
  [IWorkflowEngine](docs/architecture/engine/contracts/engine/IWorkflowEngine.v1.md),
  [ExecutionSemantics](docs/architecture/engine/contracts/engine/ExecutionSemantics.v1.md)
- **Adapter specs**: [Temporal](docs/architecture/engine/adapters/temporal/TemporalAdapter.spec.md), [Conductor](docs/architecture/engine/adapters/conductor/ConductorAdapter.spec.md)
- **Capability specs** (executable JSON): [capabilities](docs/architecture/engine/contracts/capabilities/)
- **Operations**: [observability](docs/architecture/engine/ops/observability.md), [incident runbooks](docs/architecture/engine/ops/runbooks/)
- **Developer**: [determinism tooling](docs/architecture/engine/dev/determinism-tooling.md)
- **Roadmap**: [Phases 1-4](docs/architecture/engine/roadmap/engine-phases.md)

### Quick Links

| Role            | Start Here                                                                               | Next Steps                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| SDK implementer | [IWorkflowEngine.v1.md](docs/architecture/engine/contracts/engine/IWorkflowEngine.v1.md) | [TemporalAdapter.spec.md](docs/architecture/engine/adapters/temporal/TemporalAdapter.spec.md) |
| Plan author     | [determinism-tooling.md](docs/architecture/engine/dev/determinism-tooling.md)            | [capabilities](docs/architecture/engine/contracts/capabilities/)                              |
| SRE / On-call   | [observability.md](docs/architecture/engine/ops/observability.md)                        | [incident_response.md](docs/architecture/engine/ops/runbooks/incident_response.md)            |
| Executive / PM  | [engine-phases.md](docs/architecture/engine/roadmap/engine-phases.md)                    | [observability.md](docs/architecture/engine/ops/observability.md) (success metrics)           |

---

## Development Setup

### Prerequisites

- Node.js 18+ or 20+
- pnpm 9+

**Pre-commit validation** (automated via Git hooks):

```bash
# These run automatically on git commit
pnpm lint                 # ESLint
pnpm format:check         # Prettier
pnpm type-check           # TypeScript

# Manual checks
pnpm lint:md              # Markdown linting
pnpm test                 # Run tests
pnpm test:coverage        # Coverage report
```

### Pull Request Process

1. **Follow conventional commits** for all commit messages
2. **Add tests** for new features (maintain 80%+ coverage)
3. **Update documentation** if changing behavior
4. **Keep PRs focused** - one feature/fix per PR (< 500 lines preferred)
5. **All CI checks must pass** before merge

### Code Changes - Determinism Requirements

For engine implementation contributions, ensure:

- No `Date.now()` in workflow code (use `workflow.now()`)
- No `Math.random()` (use seeded RNG)
- No `process.env` in engine core
- All code passes ESLint determinism rules

---

## Monorepo Structure (pnpm workspaces)

The project is organized as a monorepo using pnpm workspaces. The primary packages are located under the `packages/` directory:

- `packages/@dvt/contracts` — Shared contracts and interfaces (`@dvt/contracts`)
- `packages/@dvt/engine` — Orchestration engine core (`@dvt/engine`)
- `packages/@dvt/adapter-postgres` — PostgreSQL adapter (`@dvt/adapter-postgres`)
- `packages/@dvt/adapter-temporal` — Temporal adapter (`@dvt/adapter-temporal`)
- `packages/@dvt/cli` — CLI tools and scripts (`@dvt/cli`)

### Key Commands

Run these commands from the repository root:

```bash
# Install dependencies for all packages
pnpm install

# Build all packages
pnpm build

# Test all packages
pnpm test

# Build/test a specific package
pnpm --filter @dvt/engine build
pnpm --filter @dvt/engine test

# Contract and golden path validation
pnpm validate:contracts
pnpm golden:validate
```

For more details, review each package README in `packages/*/README.md`.

---

## Code Quality Standards

This project enforces high code quality through:

- **ESLint** - TypeScript linting with determinism rules
- **Prettier** - Consistent code formatting
- **Vitest** - Standard unit and integration testing (80%+ coverage required)
- **Conventional Commits** - Semantic versioning automation
- **release-please** - Automated releases, changelogs, and NPM publishing ([workflow](.github/workflows/release.yml))
- **Pre-commit hooks** - Automatic linting and formatting via Husky + lint-staged
- **GitHub Actions** - Comprehensive CI/CD pipelines

---

## Contributing

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/) for semantic versioning:

```bash
feat(engine): add new feature
fix(temporal): correct bug
docs(architecture): update documentation
```

See [.github/COMMIT_CONVENTION.md](.github/COMMIT_CONVENTION.md) for full guidelines.

### Documentation Changes

See [CONTRIBUTING.md](CONTRIBUTING.md) for:

- Code Owners review process (normative contracts require architecture team approval)
- CI/CD quality gates (Markdown linting, TypeScript validation, link checking)
- Versioning policy (MAJOR/MINOR/PATCH bumps, deprecation process)

---

## Project Status

See [ROADMAP.md](./ROADMAP.md) and [engine-phases.md](./docs/architecture/engine/roadmap/engine-phases.md) for implementation roadmap.

## License

ISC

## Acknowledgments

Built with best practices from Temporal, Conductor, and event-sourced systems.
