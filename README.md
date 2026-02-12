# dvt

[![CI](https://github.com/dunay2/dvt/actions/workflows/test.yml/badge.svg)](https://github.com/dunay2/dvt/actions/workflows/test.yml)
[![Code Quality](https://github.com/dunay2/dvt/actions/workflows/code-quality.yml/badge.svg)](https://github.com/dunay2/dvt/actions/workflows/code-quality.yml)
[![Markdown Lint](https://github.com/dunay2/dvt/actions/workflows/markdown_lint.yml/badge.svg)](https://github.com/dunay2/dvt/actions/workflows/markdown_lint.yml)
[![Determinism](https://github.com/dunay2/dvt/actions/workflows/determinism.yml/badge.svg)](https://github.com/dunay2/dvt/actions/workflows/determinism.yml)

Data Value Transform — Multi-adapter orchestration engine.

---

## 🚀 Acción Inmediata - Primeros Pasos

**¿Nuevo en el proyecto?** Instala las herramientas prioritarias para desbloquear Issues #2, #6 y #10:

```powershell
# Windows
.\scripts\setup-immediate-tools.ps1

# Linux/macOS
bash scripts/setup-immediate-tools.sh
```

**Luego sigue**: [docs/IMMEDIATE_ACTION_PLAN.md](docs/IMMEDIATE_ACTION_PLAN.md) para completar el setup inicial.

**Herramientas instaladas**: Zod (validación de contratos), Prisma (DB migrations), Docker Compose (dev environment).

→ **Tiempo estimado**: 2-3 horas para tener un entorno de desarrollo completamente funcional.

---

## 📚 Documentation

### Architecture & Contracts

→ **[Engine Architecture Index](docs/architecture/engine/INDEX.md)** ← Start here

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

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+ or 20+
- npm 9+

### Installation, determinism checks)

- Versioning policy (MAJOR/MINOR/PATCH bumps, deprecation process)
- Git workflow and branch protection rules

**Pre-commit validation** (automated via Git hooks):

```bash
# These run automatically on git commit
npm run lint              # ESLint
npm run format:check      # Prettier
npm run type-check        # TypeScript

# Manual checks
npm run lint:md           # Markdown linting
npm test                  # Run tests
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

## 🗂️ Estructura Monorepo (pnpm workspaces)

The project is now organized as a monorepo using pnpm workspaces. The primary packages are located under the `packages/` directory:

- `packages/contracts` — Contratos e interfaces compartidas
- `packages/engine` — Núcleo del motor de orquestación
- `packages/adapter-postgres` — Adapter para Postgres
- `packages/adapter-temporal` — Adapter para Temporal
- `packages/cli` — Herramientas CLI y scripts

### Comandos clave

Run these commands from the repository root:

```bash
# Instalar dependencias de todos los paquetes
pnpm install

# Build de todos los paquetes
pnpm build

# Test de todos los paquetes
pnpm test

# Build/test de un paquete específico
pnpm --filter @dvt/engine build
pnpm --filter @dvt/engine test
```

Para más detalles, revisa los README de cada paquete en `packages/*/README.md`.

---

## 📋 Project Status

See [ROADMAP.md](./ROADMAP.md) and [engine-phases.md](./docs/architecture/engine/roadmap/engine-phases.md) for implementation roadmap.

## 📄 License

ISC

## 🙏 Acknowledgments

Built with best practices from Temporal, Conductor, and event-sourced systems.
npm run lint:md # Lint Markdown files

## Formatting

npm run format # Format all files with Prettier
npm run format:check # Check if files are formatted

## Testing

npm test # Run all tests
npm run test:watch # Run tests in watch mode
npm run test:coverage # Generate coverage report

## Type Checking

npm run type-check # Run TypeScript compiler

## Build

npm run build # Build the project

---

### Code Quality Standards

This project enforces high code quality through:

- ✅ **ESLint** - TypeScript linting with determinism rules
- ✅ **Prettier** - Consistent code formatting
- ✅ **Vitest** - Standard unit and integration testing (80%+ coverage required)
- ✅ **Conventional Commits** - Semantic versioning automation
- ✅ **Pre-commit hooks** - Automatic linting and formatting
- ✅ **GitHub Actions** - Comprehensive CI/CD pipelines
- ✅ **Dependabot** - Automated dependency updates

---

## 🤝 Contributing

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

## Quick pre-commit checks

```bash
# Lint Markdown
markdownlint-cli2 "docs/**/*.md"

# Check internal links
markdown-link-check docs/architecture/engine/INDEX.md
```

### Code Changes - Contributing Guidelines

(Coming soon: Engine implementation contribution guidelines)
