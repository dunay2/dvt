# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.0.0] - 2026-02-11

### ✨ Features

- **engine**: Initial workflow engine architecture documentation
- **contracts**: Core execution semantics and IWorkflowEngine contract
- **adapters**: Temporal and State Store adapter specifications
- **docs**: Comprehensive architecture documentation

### 📝 Documentation

- Added ExecutionSemantics.v1.md with normative event specifications
- Added IWorkflowEngine.v1.md with interface contracts
- Added TemporalAdapter.spec.md with platform-specific policies
- Added Appendix A with detailed RunStarted event schema
- Documented PAUSE limitations in Conductor adapter
- Added strict SHA256 validation requirements for fetchPlan

### 🏗️ Build System

- Initial project setup with npm
- Added markdownlint configuration

### 👷 CI/CD

- Added GitHub Actions workflows for markdown linting
- Added determinism pattern checks
- Added contract validation
- Added CODEOWNERS for automated review routing
