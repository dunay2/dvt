# Contributing to DVT

Thank you for your interest in contributing to DVT! This guide will help you get started.

## Code of Conduct

Be respectful and professional. We're all here to build great software.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/dvt.git`
3. Install dependencies: `pnpm install`
4. Create a branch: `git checkout -b feature/your-feature-name`
5. Make your changes
6. Run tests: `pnpm test`
7. Commit using conventional commits: `git commit -m "feat(scope): your message"`
8. Push: `git push origin feature/your-feature-name`
9. Open a Pull Request

## Development Setup

### Prerequisites

- Node.js 18+ or 20+
- pnpm 9+
- Git

### Installation

```bash
pnpm install
```

### Available Scripts

```bash
# Linting
pnpm lint                 # Run ESLint
pnpm lint:fix             # Auto-fix ESLint issues
pnpm lint:md              # Lint Markdown files
pnpm format               # Format code with Prettier
pnpm format:check         # Check formatting

# Testing
pnpm test                 # Run all tests
pnpm test:coverage        # Generate coverage report

# Type Checking
pnpm type-check           # Run TypeScript compiler

# Build
pnpm build                # Build all packages

# Contract validation
pnpm validate:contracts   # Validate golden JSON fixtures
pnpm golden:validate      # Execute golden paths
```

## Commit Message Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/). See [COMMIT_CONVENTION.md](.github/COMMIT_CONVENTION.md) for details.

**Format**: `<type>(<scope>): <subject>`

**Examples**:

```
feat(engine): add pause/resume support
fix(temporal): correct history size calculation
docs(architecture): update determinism guide
```

## Pull Request Process

1. **Update documentation** if you're changing behavior
2. **Add tests** for new features
3. **Ensure all tests pass**: `pnpm test`
4. **Check code quality**: `pnpm lint && pnpm format:check`
5. **Update CHANGELOG.md** if needed (or let automation handle it)
6. **Keep PRs focused** - one feature/fix per PR
7. **Write a clear PR description** using the template

### PR Size Guidelines

- Small (< 200 lines): Ideal
- Medium (200-500 lines): Acceptable
- Large (> 500 lines): Consider splitting

## Testing Guidelines

### Unit Tests

- Write tests for all new features
- Use descriptive test names: `it('should emit RunStarted event when workflow begins')`
- Aim for 80%+ code coverage

### Determinism Tests

For engine code, ensure:

- No `Date.now()` - use `workflow.now()`
- No `Math.random()` - use seeded RNG
- No `process.env` in core engine
- No network calls in workflow code

## Architecture Guidelines

### Contracts (High Scrutiny)

Changes to `/docs/architecture/engine/contracts/` require:

- Clear rationale
- Backward compatibility analysis
- Version bump consideration (major/minor/patch)
- Review from @dunay2

### Adapters

New adapters should:

- Implement full `IWorkflowEngine` contract
- Document platform-specific limitations
- Include capability matrix
- Provide migration guide

### Documentation

- Use clear, concise language
- Include code examples
- Mark normative sections clearly (MUST/SHOULD/MAY)
- Update cross-references

## Code Style

We use ESLint and Prettier for consistency. Run:

```bash
pnpm lint:fix && pnpm format
```

### Key Rules

- Use TypeScript strict mode
- Prefer explicit types over inference for public APIs
- Use async/await over raw Promises
- Document complex logic with comments

## Review Process

1. **Automated checks** run on every PR
2. **Code owner** auto-assigned based on file paths
3. **At least one approval** required for merge
4. **All CI checks must pass**

## Questions?

- Open a [discussion](https://github.com/dunay2/dvt/discussions)
- Check existing [issues](https://github.com/dunay2/dvt/issues)
- Review [documentation](./docs/)

Thank you for contributing!
