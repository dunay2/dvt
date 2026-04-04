# dvt

[![Tests](https://github.com/dunay2/dvt/actions/workflows/test.yml/badge.svg)](https://github.com/dunay2/dvt/actions/workflows/test.yml)
[![Code Quality](https://github.com/dunay2/dvt/actions/workflows/ci.yml/badge.svg)](https://github.com/dunay2/dvt/actions/workflows/ci.yml)
[![Contracts](https://github.com/dunay2/dvt/actions/workflows/contracts.yml/badge.svg)](https://github.com/dunay2/dvt/actions/workflows/contracts.yml)
[![PR Quality Gate](https://github.com/dunay2/dvt/actions/workflows/pr-quality-gate.yml/badge.svg)](https://github.com/dunay2/dvt/actions/workflows/pr-quality-gate.yml)

Data Value Transform - multi-adapter orchestration engine and surrounding
planning, execution, observability, and traceability tooling.

---

## Immediate Action - First Steps

**New to the project?** Set up the development environment:

```bash
# Install dependencies (pnpm 10+ required)
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

**Installed tools**: Zod (contract validation), PostgreSQL (`pg`, SQL
migrations), Vitest (testing).

> See [CONTRIBUTING.md](CONTRIBUTING.md) for the full development setup guide.

---

## Useful Commands

Run these commands from the repository root.

### Documentation And Zensical

```bash
# Serve the docs locally with zensical
pnpm docs:serve

# Build the docs site
pnpm docs:build

# Run the docs governance and quality baseline
pnpm docs:ci
```

### Frontend

```bash
# Start the web app in local dev mode
pnpm dev:web

# Alternative explicit filter form
pnpm --filter @dvt/web dev

# Type-check or build only the frontend app
pnpm --filter @dvt/web typecheck
pnpm --filter @dvt/web build
```

### Backend

```bash
# Start the API in watch mode
pnpm --filter dvt-api dev

# Start the compiled API build
pnpm --filter dvt-api start

# Validate or build only the API
pnpm --filter dvt-api typecheck
pnpm --filter dvt-api build
pnpm --filter dvt-api test
pnpm --filter dvt-api test:integration
```

### Workers

```bash
# Outbox worker
pnpm --filter dvt-outbox-worker dev
pnpm --filter dvt-outbox-worker start

# Projector worker
pnpm --filter dvt-projector-worker dev
pnpm --filter dvt-projector-worker start

# Lineage worker
pnpm --filter dvt-lineage-worker dev
pnpm --filter dvt-lineage-worker start
```

### Repo-Wide Validation

```bash
# Install dependencies
pnpm install

# Build and test the workspace
pnpm build
pnpm test

# Type-check the repository baseline
pnpm type-check

# Type-check and build the app layer only
pnpm type-check:apps
pnpm build:apps

# Contracts, golden paths, and pre-push gate
pnpm validate:contracts
pnpm golden:validate
pnpm verify:prepush
```

### Package-Focused Examples

```bash
# Engine
pnpm --filter @dvt/engine build
pnpm --filter @dvt/engine test

# Planner
pnpm --filter @dvt/planner build
pnpm --filter @dvt/planner test

# Postgres adapter
pnpm --filter @dvt/adapter-postgres build
pnpm --filter @dvt/adapter-postgres test
pnpm --filter @dvt/adapter-postgres test:integration

# Temporal adapter
pnpm --filter @dvt/adapter-temporal build
pnpm --filter @dvt/adapter-temporal test
pnpm --filter @dvt/adapter-temporal test:integration
```

---

## Documentation

> **[Documentation Index](docs/index.md)**

### Start Here

- **Understand the system**:
  [Concepts](docs/concepts/index.md),
  [Glossary](docs/concepts/glossary.md),
  [System Map](docs/concepts/system-map.md)
- **Read technical structure and invariants**:
  [Architecture](docs/architecture/index.md),
  [Shared Package Architecture](docs/architecture/shared/index.md),
  [Contracts](docs/contracts/index.md)
- **See current state and active work**:
  [System Delivery Status](docs/architecture/system-delivery-status.md),
  [Planning](docs/planning/index.md),
  [Roadmap Of Record](docs/planning/roadmap/index.md),
  [Planning Gaps](docs/planning/gaps/index.md)
- **Operate and review risk**:
  [Runbooks](docs/runbooks/index.md),
  [Risk Register](docs/risk-register/index.md),
  [Evidence](docs/evidence/index.md)

Do not start with `engine` by default. Start with concepts, current status, and
shared package surfaces first; use engine docs when the task is specifically
about runtime behavior, adapter semantics, or execution invariants.

### Engine Deep Dive

The engine remains documented as modular, versioned contracts:

- **Normative contracts**:
  [IWorkflowEngine](docs/architecture/engine/contracts/engine/IWorkflowEngine.v2.0.md),
  [ExecutionSemantics](docs/architecture/engine/contracts/engine/ExecutionSemantics.v2.0.md)
- **Adapter specs**:
  [Temporal](docs/architecture/engine/adapters/temporal/TemporalAdapter.spec.md),
  [Conductor](docs/architecture/engine/adapters/conductor/ConductorAdapter.spec.md)
- **Capability specs**:
  [capabilities](docs/architecture/engine/contracts/capabilities/)
- **Operations**:
  [observability](docs/architecture/engine/ops/observability.md),
  [incident runbooks](docs/architecture/engine/ops/runbooks/)
- **Developer**:
  [determinism tooling](docs/architecture/engine/dev/determinism-tooling.md)

### Quick Links

- New contributor: [docs/index.md](docs/index.md) ->
  [docs/concepts/index.md](docs/concepts/index.md)
- SDK implementer:
  [IWorkflowEngine.v2.0.md](docs/architecture/engine/contracts/engine/IWorkflowEngine.v2.0.md) ->
  [TemporalAdapter.spec.md](docs/architecture/engine/adapters/temporal/TemporalAdapter.spec.md)
- Plan author: [docs/concepts/glossary.md](docs/concepts/glossary.md) ->
  [determinism-tooling.md](docs/architecture/engine/dev/determinism-tooling.md)
- SRE / On-call: [docs/runbooks/index.md](docs/runbooks/index.md) ->
  [incident_response.md](docs/architecture/engine/ops/runbooks/incident_response.md)
- Executive / PM: [docs/planning/index.md](docs/planning/index.md) ->
  [System Delivery Status](docs/architecture/system-delivery-status.md)

---

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm 10+

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
4. **Keep PRs focused** - one feature or fix per PR (< 500 lines preferred)
5. **All CI checks must pass** before merge

### Code Changes - Determinism Requirements

For engine implementation contributions, ensure:

- No `Date.now()` in workflow code (use `workflow.now()`)
- No `Math.random()` (use seeded RNG)
- No `process.env` in engine core
- All code passes ESLint determinism rules

---

## Monorepo Structure (pnpm workspaces)

The project is organized as a monorepo using pnpm workspaces. The primary
packages are located under the `packages/` directory:

- `packages/@dvt/contracts` - shared contracts and interfaces (`@dvt/contracts`)
- `packages/@dvt/engine` - orchestration engine core (`@dvt/engine`)
- `packages/@dvt/adapter-postgres` - PostgreSQL adapter (`@dvt/adapter-postgres`)
- `packages/@dvt/adapter-temporal` - Temporal adapter (`@dvt/adapter-temporal`)
- `packages/@dvt/cli` - CLI tools and scripts (`@dvt/cli`)

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
- **release-please** - Automated release PRs, changelogs, and tags for the
  repository ([workflow](.github/workflows/release.yml))
- **Pre-commit hooks** - Automatic linting and formatting via Husky +
  lint-staged
- **GitHub Actions** - Comprehensive CI/CD pipelines

---

## Contributing

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/) for semantic
versioning:

```bash
feat(engine): add new feature
fix(temporal): correct bug
docs(architecture): update documentation
```

See [.github/COMMIT_CONVENTION.md](.github/COMMIT_CONVENTION.md) for full
guidelines.

### Documentation Changes

See [CONTRIBUTING.md](CONTRIBUTING.md) for:

- Code Owners review process (normative contracts require architecture team
  approval)
- CI/CD quality gates (Markdown linting, TypeScript validation, link checking)
- Versioning policy (MAJOR, MINOR, and PATCH bumps; deprecation process)

---

## Project Status

Use [docs/planning/roadmap/index.md](docs/planning/roadmap/index.md),
[docs/planning/index.md](docs/planning/index.md), and
[docs/planning/gaps/index.md](docs/planning/gaps/index.md) as planning entry
points, and
[docs/architecture/system-delivery-status.md](docs/architecture/system-delivery-status.md)
as the current status entry point for implementation truth.

## License

ISC

## Acknowledgments

Built with practices learned from Temporal, Conductor, and event-sourced
systems.
