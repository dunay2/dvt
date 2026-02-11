# dvt

Data Value Transform — Multi-adapter orchestration engine.

## 📚 Documentation

### Architecture & Contracts

→ **[Engine Architecture Index](docs/architecture/engine/INDEX.md)** ← Start here

The engine is documented as **modular, versioned contracts** (not a monolith):

- **Normative contracts** (small, stable, MUST): [IWorkflowEngine](docs/architecture/engine/contracts/engine/IWorkflowEngine.v1.md), [ExecutionSemantics](docs/architecture/engine/contracts/engine/ExecutionSemantics.v1.md)
- **Adapter specs**: [Temporal](docs/architecture/engine/adapters/temporal/TemporalAdapter.spec.md), [Conductor](docs/architecture/engine/adapters/conductor/ConductorAdapter.spec.md)
- **Capability specs** (executable JSON): [capabilities](docs/architecture/engine/contracts/capabilities/)
- **Operations**: [observability](docs/architecture/engine/ops/observability.md), [incident runbooks](docs/architecture/engine/ops/runbooks/)
- **Developer**: [determinism tooling](docs/architecture/engine/dev/determinism-tooling.md)
- **Roadmap**: [Phases 1-4](docs/architecture/engine/roadmap/engine-phases.md)

### Quick Links

| Role | Start Here | Next Steps |
|------|-----------|-----------|
| SDK implementer | [IWorkflowEngine.v1.md](docs/architecture/engine/contracts/engine/IWorkflowEngine.v1.md) | [TemporalAdapter.spec.md](docs/architecture/engine/adapters/temporal/TemporalAdapter.spec.md) |
| Plan author | [determinism-tooling.md](docs/architecture/engine/dev/determinism-tooling.md) | [capabilities](docs/architecture/engine/contracts/capabilities/) |
| SRE / On-call | [observability.md](docs/architecture/engine/ops/observability.md) | [incident_response.md](docs/architecture/engine/ops/runbooks/incident_response.md) |
| Executive / PM | [engine-phases.md](docs/architecture/engine/roadmap/engine-phases.md) | [observability.md](docs/architecture/engine/ops/observability.md) (success metrics) |

---

## 🤝 Contributing

### Documentation Changes

See **[CONTRIBUTING.md](docs/CONTRIBUTING.md)** for:
- Code Owners review process (normative contracts require architecture team approval)
- CI/CD quality gates (Markdown linting, TypeScript validation, link checking)
- Versioning policy (MAJOR/MINOR/PATCH bumps, deprecation process)

**Quick pre-commit checks**:
```bash
# Lint Markdown
markdownlint-cli2 "docs/**/*.md"

# Check internal links
markdown-link-check docs/architecture/engine/INDEX.md
```

### Code Changes

(Coming soon: Engine implementation contribution guidelines)
