---
title: VS Code Productivity Tooling (Standardized)
status: Guide
---

# VS Code Productivity Tooling (Standardized)

This document defines recommended tooling to standardize and automate workflows.
Other documents in this bundle reference these tools explicitly.

## 1) Core editing & formatting

- **ESLint** (official)
  - Purpose: lint rules, architectural boundaries, import rules, code quality.
  - Ref: https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint
- **Prettier** (official)
  - Purpose: formatting consistency.
  - Ref: https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode
- **EditorConfig**
  - Purpose: consistent whitespace/indentation across editors.
  - Ref: https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig

## 2) Markdown & documentation

- **Markdown All in One**
  - Purpose: TOC, shortcuts, formatting productivity.
  - Ref: https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one
- **Markdownlint**
  - Purpose: Markdown style checks.
  - Ref: https://marketplace.visualstudio.com/items?itemName=DavidAnson.vscode-markdownlint
- **Mermaid Markdown Syntax Highlighting** (or Mermaid preview)
  - Purpose: render Mermaid diagrams in docs.
  - Ref: https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid

## 3) Git & PR workflow

- **GitLens**
  - Purpose: blame, history, code ownership signals.
  - Ref: https://marketplace.visualstudio.com/items?itemName=eamodio.gitlens
- **GitHub Pull Requests and Issues**
  - Purpose: PR review inside VS Code.
  - Ref: https://marketplace.visualstudio.com/items?itemName=GitHub.vscode-pull-request-github

## 4) Testing & quality signals

- **Jest** (if using Jest)
  - Purpose: test runner integration.
  - Ref: https://marketplace.visualstudio.com/items?itemName=Orta.vscode-jest
- **SonarLint** (local feedback)
  - Purpose: catch maintainability issues early (pairs well with SonarQube).
  - Ref: https://marketplace.visualstudio.com/items?itemName=SonarSource.sonarlint-vscode

## 5) YAML / JSON / schema support

- **YAML** (Red Hat)
  - Purpose: `.arc-policy.yaml` editing + validation.
  - Ref: https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml
- **JSON Tools**
  - Purpose: format/inspect JSON artifacts.
  - Ref: https://marketplace.visualstudio.com/items?itemName=eriklynd.json-tools

## 6) Recommended workspace settings (example)

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "eslint.validate": ["typescript", "typescriptreact", "javascript"],
  "markdownlint.config": {
    "MD013": false
  }
}
```

## 7) Tool references used elsewhere in this pack

- `ADR-012` references: ESLint, SonarLint/SonarQube, Markdownlint.
- `GUIDE-ci-implementation` references: Ajv schema validation, OSV Scanner.
- `ADR-0000c` relies on Mermaid preview for docs readability.

## 8) API tooling (optional, if you use OpenAPI)

- **OpenAPI/Swagger Viewer** (varies by preference)
  - Browse options: https://openapi.tools/
  - Goal: preview OpenAPI specs and navigate schemas quickly.

## 9) Local parity scripts (recommended)

Add scripts so developers run CI-like checks locally:

- `validate:arc` (ARC policy + docs validation)
- `risk:index` (generate risk index)

See `README.md` and `GUIDE-ci-implementation.md`.

## 10) TypeScript strictness (team norm)

- Enforce `no any` via ESLint and strict tsconfig.
- See `docs/guides/GUIDE-typescript-strictness.md`.

References:

- TypeScript strict: https://www.typescriptlang.org/tsconfig#strict
- typescript-eslint: https://typescript-eslint.io/
