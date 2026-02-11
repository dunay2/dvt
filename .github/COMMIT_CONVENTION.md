# Commit Message Guidelines

This project follows [Conventional Commits](https://www.conventionalcommits.org/) specification.

## Commit Message Format

Each commit message consists of a **header**, a **body**, and a **footer**.

```
<type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

### Type

Must be one of the following:

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **build**: Changes that affect the build system or external dependencies
- **ci**: Changes to our CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files
- **revert**: Reverts a previous commit

### Scope

The scope should be the name of the affected component (optional but recommended):

- `engine` - Engine core changes
- `adapters` - Adapter implementations
- `temporal` - Temporal adapter
- `state-store` - State Store adapter
- `contracts` - Contract changes
- `docs` - Documentation
- `ci` - CI/CD changes
- `deps` - Dependency updates

### Subject

The subject contains a succinct description of the change:

- Use the imperative, present tense: "change" not "changed" nor "changes"
- Start with an uppercase letter
- No period (.) at the end

### Body

The body should include the motivation for the change and contrast this with previous behavior.

### Footer

The footer should contain information about **Breaking Changes** and reference GitHub issues that this commit closes.

**Breaking Changes** should start with the word `BREAKING CHANGE:` with a space or two newlines. The rest of the commit message is then used for this.

## Examples

### Feature

```
feat(engine): add support for dynamic task queues

Add ability to route tasks to different queues based on step configuration.
This enables better resource isolation and workload management.

Closes #123
```

### Bug Fix

```
fix(temporal): correct continue-as-new trigger threshold

The previous implementation checked history size in bytes incorrectly,
leading to premature workflow rotations.

Fixes #456
```

### Breaking Change

```
feat(contracts)!: change PlanRef schema structure

BREAKING CHANGE: PlanRef.uri field is now required instead of optional.
This ensures all plans have a valid storage location.

Migration guide: Update all PlanRef usages to include the uri field.

Refs #789
```

### Documentation

```
docs(architecture): add determinism testing guide

Add comprehensive guide for writing and running determinism tests
with examples and best practices.
```

## Automated Versioning

When commits follow this format, version bumps are automatically determined:

- `fix:` commits → **PATCH** version bump (0.0.X)
- `feat:` commits → **MINOR** version bump (0.X.0)
- `BREAKING CHANGE:` or `!` → **MAJOR** version bump (X.0.0)

The CHANGELOG.md is automatically generated from commit messages.
